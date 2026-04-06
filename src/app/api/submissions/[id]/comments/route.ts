/*
 * SQL migration (run in Supabase SQL Editor — do not run automatically):
 *
 * CREATE TABLE IF NOT EXISTS submission_comments (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
 *   user_id UUID NOT NULL REFERENCES users(id),
 *   message TEXT NOT NULL CHECK (length(message) >= 1 AND length(message) <= 1000),
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendCommentNotificationEmail } from '@/lib/email/resend'
import { z } from 'zod'
import type { ApiResponse } from '@/types'

interface RouteParams {
  params: { id: string }
}

// GET /api/submissions/[id]/comments
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check the submission exists and user has permission
    const { data: submission, error: subError } = await supabaseAdmin
      .from('submissions')
      .select('id, user_id')
      .eq('id', params.id)
      .single()

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const isElevated = session.user.role === 'admin' || session.user.role === 'lead'
    if (!isElevated && submission.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: comments, error } = await supabaseAdmin
      .from('submission_comments')
      .select(`
        id,
        message,
        created_at,
        user:users!submission_comments_user_id_fkey(id, name, email, image)
      `)
      .eq('submission_id', params.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: comments || [] })
  } catch (err) {
    console.error('Comments GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const commentSchema = z.object({
  message: z.string().min(1).max(1000),
})

// POST /api/submissions/[id]/comments
export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = commentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', data: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Check submission + permission
    const { data: submission, error: subError } = await supabaseAdmin
      .from('submissions')
      .select(`
        id, user_id,
        title,
        owner:users!submissions_user_id_fkey(id, email, name)
      `)
      .eq('id', params.id)
      .single()

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const isElevated = session.user.role === 'admin' || session.user.role === 'lead'
    if (!isElevated && submission.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: comment, error: insertError } = await supabaseAdmin
      .from('submission_comments')
      .insert({
        submission_id: params.id,
        user_id: session.user.id,
        message: parsed.data.message,
      })
      .select(`
        id,
        message,
        created_at,
        user:users!submission_comments_user_id_fkey(id, name, email, image)
      `)
      .single()

    if (insertError) {
      console.error('Error inserting comment:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Send email notification
    const owner = Array.isArray(submission.owner) ? submission.owner[0] : submission.owner as { id: string; email: string; name: string | null } | null
    if (owner && owner.id !== session.user.id) {
      // Commenter is not the owner — notify owner
      sendCommentNotificationEmail(
        submission.title as string,
        session.user.name || session.user.email,
        parsed.data.message,
        owner.email,
        owner.name,
        params.id
      ).catch((e) => console.error('Failed to send comment notification:', e))
    } else if (owner && owner.id === session.user.id) {
      // Owner commented — notify admin
      sendCommentNotificationEmail(
        submission.title as string,
        session.user.name || session.user.email,
        parsed.data.message,
        process.env.ADMIN_EMAIL || 'emaloney@huntingtonsteel.com',
        'Admin',
        params.id
      ).catch((e) => console.error('Failed to send admin comment notification:', e))
    }

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (err) {
    console.error('Comments POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
