import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendApprovedEmail } from '@/lib/email/resend'
import { publishToUnifi } from '@/lib/unifi/publisher'
import { getOrCreatePresentation, addImageSlide, getPresentationUrl } from '@/lib/google/slides'
import type { ApiResponse, Submission } from '@/types'

interface RouteParams {
  params: { id: string }
}

// POST /api/submissions/[id]/approve
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
        { error: `Cannot approve a submission with status "${submission.status}"` },
        { status: 400 }
      )
    }

    // Admin can override target_devices at approval time
    const body = await req.json().catch(() => ({}))
    const targetDevicesOverride: string[] | undefined = Array.isArray(body.target_devices)
      ? body.target_devices
      : undefined

    const now = new Date().toISOString()

    // Update submission status to approved (and apply any device override)
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'approved',
        reviewed_by: session.user.id,
        reviewed_at: now,
        published_at: submission.schedule_start || now,
        ...(targetDevicesOverride ? { target_devices: targetDevicesOverride } : {}),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving submission:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log to audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: session.user.id,
      action: 'approve',
      entity_type: 'submission',
      entity_id: params.id,
      details: {
        title: submission.title,
        submitter_email: submission.user?.email,
        target_devices: submission.target_devices,
      },
    })

    // Log to status history
    await supabaseAdmin.from('submission_status_history').insert({
      submission_id: params.id,
      old_status: 'pending',
      new_status: 'approved',
      changed_by_user_id: session.user.id,
      note: null,
    })

    // Send approval email to submitter (non-blocking)
    if (submission.user) {
      sendApprovedEmail(updated as Submission, {
        email: submission.user.email,
        name: submission.user.name,
      }).catch((e) => console.error('Failed to send approval email:', e))
    }

    // ============================================================
    // UniFi Connect — Playwright Automation
    // ============================================================
    // Check if this submission targets any UniFi devices.
    // If so, kick off the browser automation in the background (non-blocking).
    // The result is logged but does not block the approval response.
    const targetDevices: string[] = targetDevicesOverride || submission.target_devices || []

    if (targetDevices.length > 0) {
      const { data: devices } = await supabaseAdmin
        .from('devices')
        .select('id, name, platform')
        .in('id', targetDevices)

      const hasUnifi = devices?.some((d) => d.platform === 'unifi')

      if (hasUnifi && submission.file_url && submission.file_name) {
        // Run non-blocking so the admin gets an instant response
        publishToUnifi(
          submission.file_url,
          submission.file_name,
          submission.content_type as 'image' | 'video' | 'audio'
        )
          .then((result) => {
            console.log('[Approve] UniFi publish result:', result)
            // Update submission with publish status
            supabaseAdmin
              .from('submissions')
              .update({
                unifi_publish_status: result.success ? 'published' : 'failed',
                unifi_publish_error: result.error || null,
              })
              .eq('id', params.id)
              .then(() => { /* status logged */ })
          })
          .catch((e) => console.error('[Approve] UniFi publish error:', e))
      }
    }
    // ============================================================
    // Google Slides — publish image as a new slide (non-blocking)
    // ============================================================
    if (targetDevices.length > 0) {
      const { data: allDevices } = await supabaseAdmin
        .from('devices')
        .select('id, name, platform, device_id')
        .in('id', targetDevices)

      const slidesDevice = allDevices?.find((d) => d.platform === 'google_slides')

      if (slidesDevice && submission.file_url && submission.content_type === 'image') {
        ;(async () => {
          try {
            // Get admin's Google refresh token
            const { data: adminUser } = await supabaseAdmin
              .from('users')
              .select('google_refresh_token')
              .eq('email', process.env.ADMIN_EMAIL || 'emaloney@huntingtonsteel.com')
              .single()

            if (!adminUser?.google_refresh_token) {
              console.warn('[Approve] No Google refresh token — sign out and sign back in to grant Slides access.')
              return
            }

            // Get or create the presentation
            const { presentationId, isNew } = await getOrCreatePresentation(
              adminUser.google_refresh_token,
              slidesDevice.device_id || null
            )

            // If new presentation, save the ID to the device record
            if (isNew) {
              await supabaseAdmin
                .from('devices')
                .update({ device_id: presentationId })
                .eq('id', slidesDevice.id)
              console.log(`[Approve] Created new Google Slides presentation: ${getPresentationUrl(presentationId)}`)
            }

            // Add the image as a new slide
            const slideId = await addImageSlide(
              adminUser.google_refresh_token,
              presentationId,
              submission.file_url
            )

            // Store the slide ID so we can remove it on expiry
            await supabaseAdmin
              .from('submissions')
              .update({ google_slides_slide_id: slideId, google_publish_status: 'published' })
              .eq('id', params.id)

            console.log(`[Approve] Google Slides: added slide ${slideId} to presentation ${presentationId}`)
          } catch (err) {
            console.error('[Approve] Google Slides publish error:', err)
            await supabaseAdmin
              .from('submissions')
              .update({ google_publish_status: 'failed' })
              .eq('id', params.id)
          }
        })()
      }
    }
    // ============================================================

    return NextResponse.json({
      data: updated,
      message: 'Submission approved successfully.',
    })
  } catch (error) {
    console.error('Approve route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
