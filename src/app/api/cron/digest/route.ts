import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendWeeklyDigestEmail } from '@/lib/email/resend'
import type { Submission } from '@/types'

export async function GET(req: NextRequest) {
  // Auth: accept ?secret= or Authorization: Bearer header
  const secret = req.nextUrl.searchParams.get('secret') ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Content that went live this week
    const { data: liveThisWeek } = await supabase
      .from('submissions')
      .select('id, title, status, published_at')
      .in('status', ['live', 'approved'])
      .gte('published_at', weekAgo)

    // Pending count
    const { count: pendingCount } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Expiring in next 7 days
    const { count: expiringCount } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['live', 'approved'])
      .gte('schedule_end', now.toISOString())
      .lte('schedule_end', weekAhead)

    // New users this week
    const { count: newUsersCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo)

    await sendWeeklyDigestEmail({
      liveThisWeek: (liveThisWeek || []) as Submission[],
      pendingCount: pendingCount || 0,
      expiringCount: expiringCount || 0,
      newUsersCount: newUsersCount || 0,
    })

    return NextResponse.json({
      message: 'Digest sent',
      stats: {
        liveThisWeek: liveThisWeek?.length || 0,
        pendingCount: pendingCount || 0,
        expiringCount: expiringCount || 0,
        newUsersCount: newUsersCount || 0,
      },
    })
  } catch (err) {
    console.error('Digest cron error:', err)
    return NextResponse.json({ error: 'Failed to send digest' }, { status: 500 })
  }
}
