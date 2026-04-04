/**
 * GET /api/cron/expire
 * Finds approved submissions whose schedule_end has passed,
 * marks them as 'expired', and removes their Google Slides slide if applicable.
 *
 * Protected by CRON_SECRET. Call this endpoint on a schedule
 * (e.g. every 15 minutes via Vercel Cron or an external scheduler).
 *
 * Local testing: GET http://localhost:3000/api/cron/expire?secret=YOUR_CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { removeSlide } from '@/lib/google/slides'

export async function GET(req: NextRequest) {
  // Support both Vercel Cron (Authorization header) and manual calls (?secret=)
  const authHeader = req.headers.get('authorization')
  const querySecret = req.nextUrl.searchParams.get('secret')
  const validSecret = process.env.CRON_SECRET

  const authorized =
    authHeader === `Bearer ${validSecret}` || querySecret === validSecret

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  // Find approved submissions whose end date has passed
  const { data: expired, error } = await supabase
    .from('submissions')
    .select('id, title, google_slides_slide_id, target_devices')
    .eq('status', 'approved')
    .not('schedule_end', 'is', null)
    .lt('schedule_end', now)

  if (error) {
    console.error('[Expire Cron] Error fetching expired submissions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ message: 'No expired submissions found.', expired: 0 })
  }

  let expiredCount = 0
  let slidesRemovedCount = 0
  const errors: string[] = []

  for (const submission of expired) {
    try {
      // Mark as expired
      await supabase
        .from('submissions')
        .update({ status: 'expired' })
        .eq('id', submission.id)

      // Remove Google Slide if one was created
      if (submission.google_slides_slide_id) {
        try {
          // Get admin's refresh token
          const { data: adminUser } = await supabase
            .from('users')
            .select('google_refresh_token')
            .eq('email', process.env.ADMIN_EMAIL || 'emaloney@huntingtonsteel.com')
            .single()

          if (adminUser?.google_refresh_token) {
            // Get the Google Slides device to find presentation ID
            const { data: devices } = await supabase
              .from('devices')
              .select('device_id')
              .eq('platform', 'google_slides')
              .eq('is_active', true)
              .limit(1)
              .single()

            if (devices?.device_id) {
              await removeSlide(
                adminUser.google_refresh_token,
                devices.device_id,
                submission.google_slides_slide_id
              )
              slidesRemovedCount++
            }
          }
        } catch (slideErr) {
          console.error(`[Expire Cron] Failed to remove slide for submission ${submission.id}:`, slideErr)
          errors.push(`Slide removal failed for "${submission.title}"`)
        }
      }

      // Log to audit trail
      await supabase.from('audit_log').insert({
        action: 'expire',
        entity_type: 'submission',
        entity_id: submission.id,
        details: { title: submission.title },
      })

      expiredCount++
      console.log(`[Expire Cron] Expired: "${submission.title}" (${submission.id})`)
    } catch (err) {
      console.error(`[Expire Cron] Failed to expire submission ${submission.id}:`, err)
      errors.push(`Failed to expire "${submission.title}"`)
    }
  }

  return NextResponse.json({
    message: `Expired ${expiredCount} submission(s). Removed ${slidesRemovedCount} slide(s).`,
    expired: expiredCount,
    slidesRemoved: slidesRemovedCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
