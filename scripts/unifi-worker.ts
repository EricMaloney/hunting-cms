/**
 * UniFi Publish Worker
 *
 * Runs locally on the Mac (same network as the UniFi controller at 10.0.30.2).
 * Polls the Supabase publish_queue table for pending jobs and publishes them.
 *
 * Run manually:  node --env-file=.env.local node_modules/.bin/tsx scripts/unifi-worker.ts
 * Runs via launchd automatically every 5 minutes (see scripts/com.huntington.unifi-worker.plist)
 */

import { createClient } from '@supabase/supabase-js'
import { publishToUnifi } from '../src/lib/unifi/publisher'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  console.log(`[Worker] ${new Date().toISOString()} — checking publish queue...`)

  // Fetch pending jobs
  const { data: jobs, error } = await supabase
    .from('publish_queue')
    .select('*')
    .eq('status', 'pending')
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

  console.log(`[Worker] Found ${jobs.length} pending job(s)`)

  for (const job of jobs) {
    console.log(`[Worker] Processing job ${job.id}: "${job.title}"`)

    // Mark as processing so parallel runs don't double-publish
    await supabase
      .from('publish_queue')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id)

    try {
      const result = await publishToUnifi(
        job.file_url,
        job.file_name,
        job.content_type,
        job.duration_seconds ?? undefined
      )

      if (result.success) {
        console.log(`[Worker] ✅ Job ${job.id} published successfully`)
        await supabase
          .from('publish_queue')
          .update({
            status: 'published',
            completed_at: new Date().toISOString(),
            error: null,
          })
          .eq('id', job.id)

        // Update the submission's unifi_publish_status
        await supabase
          .from('submissions')
          .update({ unifi_publish_status: 'published', unifi_publish_error: null })
          .eq('id', job.submission_id)
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

      await supabase
        .from('submissions')
        .update({ unifi_publish_status: 'failed', unifi_publish_error: errMsg })
        .eq('id', job.submission_id)
    }
  }

  console.log('[Worker] Done.')
  process.exit(0)
}

run().catch((err) => {
  console.error('[Worker] Fatal error:', err)
  process.exit(1)
})
