import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendSubmissionReceivedEmail, sendAdminReviewEmail } from '@/lib/email/resend'
import { notifyNewSubmission } from '@/lib/notifications/google-chat'
import { z } from 'zod'
import type { ApiResponse, Submission } from '@/types'

const createSubmissionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  content_type: z.enum(['image', 'video', 'audio']),
  file_url: z.string().url('Invalid file URL'),
  file_name: z.string().min(1),
  file_size_bytes: z.number().optional(),
  file_type: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration_seconds: z.number().optional(),
  target_devices: z.array(z.string().uuid()).min(1, 'Select at least one target device'),
  schedule_start: z.string().datetime().optional().nullable(),
  schedule_end: z.string().datetime().optional().nullable(),
  reviewer_notes: z.string().max(1000).optional(),
  design_request_id: z.string().uuid().optional().nullable(),
}).refine(
  (d) => {
    if (d.schedule_start && d.schedule_end) {
      return new Date(d.schedule_start) < new Date(d.schedule_end)
    }
    return true
  },
  { message: 'schedule_end must be after schedule_start', path: ['schedule_end'] }
)

// GET /api/submissions - list submissions
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20', 10)))
  const offset = (page - 1) * perPage

  try {
    let query = supabaseAdmin
      .from('submissions')
      .select(
        `
        *,
        user:users!submissions_user_id_fkey(id, email, name, image),
        reviewer:users!submissions_reviewed_by_fkey(id, email, name),
        submission_tags(tag_id, tags(*))
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    // Only users with elevated roles see all submissions; regular users see only their own
    if (session.user.role === 'user') {
      query = query.eq('user_id', session.user.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching submissions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        submissions: data as Submission[],
        total: count || 0,
        page,
        per_page: perPage,
      },
    })
  } catch (error) {
    console.error('Submissions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/submissions - create new submission
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = createSubmissionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', data: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Validate that target devices exist and are active
    const { data: devices, error: devicesError } = await supabaseAdmin
      .from('devices')
      .select('id, name')
      .in('id', data.target_devices)
      .eq('is_active', true)

    if (devicesError) {
      return NextResponse.json({ error: devicesError.message }, { status: 500 })
    }

    if (!devices || devices.length !== data.target_devices.length) {
      return NextResponse.json(
        { error: 'One or more selected devices are invalid or inactive' },
        { status: 400 }
      )
    }

    // Create the submission
    const { data: submission, error: insertError } = await supabaseAdmin
      .from('submissions')
      .insert({
        user_id: session.user.id,
        title: data.title,
        description: data.description || null,
        content_type: data.content_type,
        file_url: data.file_url,
        file_name: data.file_name,
        file_size_bytes: data.file_size_bytes || null,
        file_type: data.file_type || null,
        width: data.width || null,
        height: data.height || null,
        duration_seconds: data.duration_seconds || null,
        target_devices: data.target_devices,
        schedule_start: data.schedule_start || null,
        schedule_end: data.schedule_end || null,
        reviewer_notes: data.reviewer_notes || null,
        design_request_id: data.design_request_id || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting submission:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Log to audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: session.user.id,
      action: 'submit',
      entity_type: 'submission',
      entity_id: submission.id,
      details: { title: submission.title, content_type: submission.content_type },
    })

    // Send notification emails (non-blocking)
    const userInfo = { email: session.user.email, name: session.user.name }
    sendSubmissionReceivedEmail(submission as Submission, userInfo).catch((e) =>
      console.error('Failed to send submission received email:', e)
    )
    sendAdminReviewEmail(submission as Submission, userInfo).catch((e) =>
      console.error('Failed to send admin review email:', e)
    )

    // Google Chat alert — awaited so Vercel doesn't kill it before it fires
    await notifyNewSubmission({
      submitterName: session.user.name || session.user.email,
      title: submission.title,
      submissionId: submission.id,
      contentType: submission.content_type,
    }).catch((e) => console.error('Failed to send Chat notification:', e))

    return NextResponse.json(
      { data: submission, message: 'Submission created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Submissions POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
