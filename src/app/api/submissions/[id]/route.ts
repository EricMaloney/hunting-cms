import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface RouteParams {
  params: { id: string }
}

// GET /api/submissions/[id] - get a single submission
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: submission, error } = await supabaseAdmin
      .from('submissions')
      .select(
        `
        *,
        user:users!submissions_user_id_fkey(id, email, name, image),
        reviewer:users!submissions_reviewed_by_fkey(id, email, name)
      `
      )
      .eq('id', params.id)
      .single()

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Non-admins can only view their own submissions
    if (session.user.role !== 'admin' && submission.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data: submission })
  } catch (error) {
    console.error('Submission GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/submissions/[id] - update a submission (limited fields for users)
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // First check the submission exists and user owns it (or is admin)
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('id, user_id, status')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (session.user.role !== 'admin' && existing.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Users can only edit pending submissions
    if (session.user.role !== 'admin' && existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot edit a submission that has already been reviewed' },
        { status: 400 }
      )
    }

    const body = await req.json()

    // Whitelist updatable fields for regular users
    const allowedFields = ['title', 'description', 'reviewer_notes', 'schedule_start', 'schedule_end']
    const adminFields = ['status', 'admin_feedback', 'published_at']

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    if (session.user.role === 'admin') {
      for (const field of adminFields) {
        if (field in body) updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('submissions')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated, message: 'Submission updated' })
  } catch (error) {
    console.error('Submission PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/submissions/[id] — admin can delete any, users can delete own rejected/expired
export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('id, user_id, status, file_url, google_slides_slide_id, google_publish_status')
      .eq('id', params.id)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'admin'
    const isOwner = submission.user_id === session.user.id
    // Users can retract anything not yet published (approved/live)
    const isPublished = ['approved', 'live'].includes(submission.status)

    if (!isAdmin && !(isOwner && !isPublished)) {
      return NextResponse.json(
        { error: 'You cannot delete a submission that is already approved or live' },
        { status: 403 }
      )
    }

    // Remove the file from Supabase storage
    if (submission.file_url) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const storagePrefix = `${supabaseUrl}/storage/v1/object/public/Submissions/`
      const storagePath = submission.file_url.startsWith(storagePrefix)
        ? submission.file_url.slice(storagePrefix.length)
        : null

      if (storagePath) {
        const { error: storageError } = await supabaseAdmin.storage
          .from('Submissions')
          .remove([storagePath])
        if (storageError) {
          console.warn('[Delete] Storage removal warning:', storageError.message)
        }
      }
    }

    // Delete the DB record (cascades handle audit_log if configured; otherwise silent)
    const { error: deleteError } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('[Delete] DB delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Submission deleted' })
  } catch (error) {
    console.error('Submission DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
