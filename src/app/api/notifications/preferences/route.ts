/*
 * SQL migration (run in Supabase SQL Editor — do not run automatically):
 *
 * CREATE TABLE IF NOT EXISTS notification_preferences (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *   UNIQUE(user_id),
 *   submission_reviewed BOOLEAN DEFAULT true,
 *   design_request BOOLEAN DEFAULT true,
 *   expiry_alert BOOLEAN DEFAULT true,
 *   comment_added BOOLEAN DEFAULT true,
 *   new_submission BOOLEAN DEFAULT true,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now()
 * );
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'
import type { ApiResponse } from '@/types'

const DEFAULT_PREFS = {
  submission_reviewed: true,
  design_request: true,
  expiry_alert: true,
  comment_added: true,
  new_submission: true,
}

const prefsSchema = z.object({
  submission_reviewed: z.boolean().optional(),
  design_request: z.boolean().optional(),
  expiry_alert: z.boolean().optional(),
  comment_added: z.boolean().optional(),
  new_submission: z.boolean().optional(),
})

// GET /api/notifications/preferences
export async function GET(_req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification preferences:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return existing or defaults
    return NextResponse.json({ data: data || { ...DEFAULT_PREFS } })
  } catch (err) {
    console.error('Preferences GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/notifications/preferences
export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = prefsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', data: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert(
        {
          user_id: session.user.id,
          ...parsed.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error upserting notification preferences:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Preferences saved.' })
  } catch (err) {
    console.error('Preferences PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
