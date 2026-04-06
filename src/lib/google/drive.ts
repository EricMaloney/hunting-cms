/**
 * Google Drive — Community Upload Mirror
 *
 * Uploads community photos/videos to a shared Drive folder so they're
 * preserved long-term and accessible outside the CMS.
 *
 * Uses the admin's OAuth refresh token (stored in the users table).
 * Requires drive.file scope — already present in the OAuth config.
 */

import { google } from 'googleapis'
import { Readable } from 'stream'
import { supabaseAdmin } from '@/lib/supabase/server'

function createDriveClient(refreshToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: refreshToken })
  return google.drive({ version: 'v3', auth })
}

/** Fetch the admin's stored refresh token from the users table */
async function getAdminRefreshToken(): Promise<string | null> {
  const adminEmail = process.env.ADMIN_EMAIL || 'emaloney@huntingtonsteel.com'
  const { data } = await supabaseAdmin
    .from('users')
    .select('google_refresh_token')
    .eq('email', adminEmail)
    .single()
  return data?.google_refresh_token ?? null
}

export interface DriveUploadResult {
  fileId: string
  driveUrl: string
}

/**
 * Upload a file buffer to the community Drive folder.
 * Returns { fileId, driveUrl } on success, null on failure (non-fatal).
 */
export async function uploadToCommunityDrive(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<DriveUploadResult | null> {
  const folderId = process.env.GOOGLE_DRIVE_COMMUNITY_FOLDER_ID
  if (!folderId) {
    console.warn('[Drive] GOOGLE_DRIVE_COMMUNITY_FOLDER_ID not set — skipping Drive mirror')
    return null
  }

  try {
    const refreshToken = await getAdminRefreshToken()
    if (!refreshToken) {
      console.warn('[Drive] No admin refresh token found — skipping Drive mirror')
      return null
    }

    const drive = createDriveClient(refreshToken)

    // Upload the file
    const stream = Readable.from(buffer)
    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id,webViewLink',
    })

    const fileId = res.data.id
    if (!fileId) throw new Error('Drive upload returned no file ID')

    // Make viewable by anyone with the link
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    // Build a direct view URL
    const driveUrl = `https://drive.google.com/file/d/${fileId}/view`
    console.log(`[Drive] Mirrored to Drive: ${driveUrl}`)
    return { fileId, driveUrl }
  } catch (err) {
    // Non-fatal — Supabase is the primary store
    console.error('[Drive] Mirror failed (non-fatal):', err)
    return null
  }
}
