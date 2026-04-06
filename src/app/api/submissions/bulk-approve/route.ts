import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendApprovedEmail } from '@/lib/email/resend'
import { createNotification } from '@/lib/notifications/create-notification'
import type { ApiResponse, BulkApproveResult, Submission } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<BulkApproveResult>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { ids, target_devices } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 })
  }
  if (!Array.isArray(target_devices) || target_devices.length === 0) {
    return NextResponse.json({ error: 'target_devices array required' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const errors: { id: string; error: string }[] = []
  let approved = 0

  for (const id of ids) {
    try {
      // Fetch submission
      const { data: submission, error: fetchErr } = await supabaseAdmin
        .from('submissions')
        .select('*, user:users!submissions_user_id_fkey(id, email, name)')
        .eq('id', id)
        .eq('status', 'pending')
        .single()

      if (fetchErr || !submission) {
        errors.push({ id, error: 'Not found or not pending' })
        continue
      }

      // Update status
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('submissions')
        .update({
          status: 'approved',
          reviewed_by: session.user.id,
          reviewed_at: now,
          published_at: submission.schedule_start || now,
          target_devices,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateErr) {
        errors.push({ id, error: updateErr.message })
        continue
      }

      // Audit log
      await supabaseAdmin.from('audit_log').insert({
        user_id: session.user.id,
        action: 'bulk_approve',
        entity_type: 'submission',
        entity_id: id,
        details: { title: submission.title, target_devices },
      })

      // Status history
      await supabaseAdmin.from('submission_status_history').insert({
        submission_id: id,
        old_status: 'pending',
        new_status: 'approved',
        changed_by_user_id: session.user.id,
        note: 'Bulk approved',
      })

      // In-app notification
      if (submission.user_id) {
        await createNotification(
          submission.user_id,
          'approved',
          'Submission Approved',
          `"${submission.title}" has been approved and will go live soon.`,
          id
        )
      }

      // Email (non-blocking)
      if (submission.user) {
        sendApprovedEmail(updated as Submission, {
          email: submission.user.email,
          name: submission.user.name,
        }).catch(console.error)
      }

      approved++
    } catch (err) {
      errors.push({ id, error: String(err) })
    }
  }

  return NextResponse.json({
    data: { approved, errors },
    message: `Approved ${approved} of ${ids.length} submissions.${errors.length > 0 ? ' Some failed — check errors.' : ''}`,
  })
}
