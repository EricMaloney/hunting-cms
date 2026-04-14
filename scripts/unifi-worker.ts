/**
 * UniFi Publish Worker
 *
 * Runs locally on the Mac (same network as the UniFi controller at 10.0.30.2).
 * Polls the Supabase publish_queue table for pending jobs and publishes or
 * removes content depending on the job's `action` field.
 *
 * Run manually:  node --env-file=.env.local node_modules/.bin/tsx scripts/unifi-worker.ts
 * Runs via launchd automatically every 5 minutes (see scripts/com.huntington.unifi-worker.plist)
 */

import { createClient } from '@supabase/supabase-js'
import { publishToUnifi, removeFromUnifi } from '../src/lib/unifi/publisher'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const now = new Date().toISOString()
  console.log(`[Worker] ${now} — checking publish queue...`)

  // Fetch pending jobs that are either:
  //  - unpublish actions (remove immediately regardless of schedule)
  //  - publish actions whose schedule_start has arrived (or has no schedule)
  const { data: jobs, error } = await supabase
    .from('publish_queue')
    .select('*')
    .eq('status', 'pending')
    .or(`action.eq.unpublish,and(action.eq.publish,or(schedule_start.is.null,schedule_start.lte.${now}))`)
    .order('created_at', { ascending: true })
    .limit(5)

  if (error) {
    console.error('[Worker] Failed to fetch queue:', error.message)
    process.exit(1)
  }

  if (!jobs || jobs.length === 0) {
    console.log('[Worker] Queue empty — nothing to do.')
    process.exit(0)
  }

  console.log(`[Worker] Found ${jobs.length} job(s) ready to process`)

  for (const job of jobs) {
    console.log(`[Worker] Processing job ${job.id} [${job.action}]: "${job.title}"`)

    // Mark as processing so parallel runs don't double-process
    await supabase
      .from('publish_queue')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id)

    try {
      let result

      if (job.action === 'unpublish') {
        result = await removeFromUnifi(job.file_name)
      } else {
        result = await publishToUnifi(
          job.file_url,
          job.file_name,
          job.content_type,
          job.duration_seconds ?? undefined
        )
      }

      if (result.success) {
        console.log(`[Worker] ✅ Job ${job.id} completed: ${result.message}`)
        await supabase
          .from('publish_queue')
          .update({
            status: 'published',
            completed_at: new Date().toISOString(),
            error: null,
          })
          .eq('id', job.id)

        if (job.action === 'publish') {
          await supabase
            .from('submissions')
            .update({ unifi_publish_status: 'published', unifi_publish_error: null })
            .eq('id', job.submission_id)
        }
      } else {
        throw new Error(result.error || result.message)
      }
    } catch (err) {
      const errMsg = String(err)
      console.error(`[Worker] ❌ Job ${job.id} failed:`, errMsg)

      await supabase
        .from('publish_queue')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: errMsg,
          attempts: (job.attempts || 0) + 1,
        })
        .eq('id', job.id)

      if (job.action === 'publish') {
        await supabase
          .from('submissions')
          .update({ unifi_publish_status: 'failed', unifi_publish_error: errMsg })
          .eq('id', job.submission_id)
      }
    }
  }

  console.log('[Worker] Done.')
  process.exit(0)
}

run().catch((err) => {
  console.error('[Worker] Fatal error:', err)
  process.exit(1)
})
