import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendRejectedEmail } from '@/lib/email/resend'
import { createNotification } from '@/lib/notifications/create-notification'
import { notifySubmissionRejected } from '@/lib/notifications/google-chat'
import { z } from 'zod'
import type { ApiResponse, Submission } from '@/types'

interface RouteParams {
  params: { id: string }
}

const rejectSchema = z.object({
  feedback: z
    .string()
    .min(10, 'Please provide at least 10 characters of feedback')
    .max(1000, 'Feedback too long'),
})

// POST /api/submissions/[id]/reject
export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)

  // Admin only
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = rejectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { feedback } = parsed.data

    // Fetch the submission with user info
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select(
        `
        *,
        user:users!submissions_user_id_fkey(id, email, name)
      `
      )
      .eq('id', params.id)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot reject a submission with status "${submission.status}"` },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Update submission to rejected
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'rejected',
        admin_feedback: feedback,
        reviewed_by: session.user.id,
        reviewed_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error rejecting submission:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log to audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: session.user.id,
      action: 'reject',
      entity_type: 'submission',
      entity_id: params.id,
      details: {
        title: submission.title,
        submitter_email: submission.user?.email,
        feedback,
      },
    })

    // Log to status history
    await supabaseAdmin.from('submission_status_history').insert({
      submission_id: params.id,
      old_status: 'pending',
      new_status: 'rejected',
      changed_by_user_id: session.user.id,
      note: feedback,
    })

    // In-app notification for submitter
    if (submission.user_id) {
      await createNotification(
        submission.user_id,
        'rejected',
        'Submission Rejected',
        `"${submission.title}" was not approved. Feedback: ${feedback.substring(0, 100)}${feedback.length > 100 ? '...' : ''}`,
        params.id
      )
    }

    // Send rejection email to submitter (non-blocking)
    if (submission.user) {
      sendRejectedEmail(
        updated as Submission,
        { email: submission.user.email, name: submission.user.name },
        feedback
      ).catch((e) => console.error('Failed to send rejection email:', e))
    }

    // Google Chat alert — awaited so Vercel doesn't kill it before it fires
    await notifySubmissionRejected({
      submitterName: submission.user?.name || submission.user?.email || 'Unknown',
      title: submission.title,
      feedback,
      reviewerName: session.user.name || session.user.email,
    }).catch((e) => console.error('Failed to send Chat rejection notification:', e))

    return NextResponse.json({
      data: updated,
      message: 'Submission rejected and submitter notified.',
    })
  } catch (error) {
    console.error('Reject route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
