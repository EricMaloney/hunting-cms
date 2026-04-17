/**
 * UniFi Connect Publisher — Pure API (no Playwright)
 *
 * Uploads media and manages the "Announcements and Info" playlist via the
 * UniFi Connect REST + TUS APIs. No browser automation required.
 *
 * Upload flow (discovered via CDP header capture 2026-04-17):
 *  1. POST /proxy/connect/api/v2/assets  (TUS init)
 *     Headers: Tus-Resumable, Upload-Length, Upload-Metadata
 *     Metadata keys: filename, digest (base64 of MD5 hex), mime, service, deviceIds, folderId
 *     Returns 201 + Location: /api/v2/assets/upload/{assetId}
 *  2. PATCH /proxy/connect/api/v2/assets/upload/{assetId}  (TUS upload)
 *     Headers: Content-Type: application/offset+octet-stream, Upload-Offset: 0, Tus-Resumable
 *     Body: raw file bytes
 *     Returns 204
 *  3. GET  /proxy/connect/api/v2/playlists/{id}  — read current contents
 *  4. PUT  /proxy/connect/api/v2/playlists/{id}  — write back with new asset appended,
 *     duplicates removed, duration set correctly
 *
 * Authentication: POST /api/auth/login → deviceToken (Bearer) + session cookie + CSRF from JWT
 */

import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import * as crypto from 'crypto'

export interface PublishResult {
  success: boolean
  message: string
  error?: string
}

const PLAYLIST_ID = '2abbed8c-9280-46a4-958e-3318aa40bdfb'
const CONTROLLER = '10.0.30.2'

// ─── Auth ─────────────────────────────────────────────────────────────────────

interface UnifiSession {
  token: string
  cookie: string
  csrf: string
}

function unifiLogin(): Promise<UnifiSession> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      username: process.env.UNIFI_EMAIL,
      password: process.env.UNIFI_PASSWORD,
    })
    const req = https.request(
      {
        hostname: CONTROLLER, port: 443, path: '/api/auth/login', method: 'POST',
        rejectUnauthorized: false,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (res) => {
        let data = ''
        const setCookies: string[] = (res.headers['set-cookie'] as string[]) ?? []
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as { deviceToken?: string }
            if (!parsed.deviceToken) return reject(new Error('UniFi login: no deviceToken'))
            const cookie = setCookies.map((c) => c.split(';')[0]).join('; ')
            const tokenCookie = setCookies.find((c) => c.startsWith('TOKEN='))
            let csrf = ''
            if (tokenCookie) {
              const jwt = tokenCookie.split('=')[1].split(';')[0]
              const b64 = jwt.split('.')[1]
              const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
              csrf = (JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { csrfToken?: string }).csrfToken ?? ''
            }
            resolve({ token: parsed.deviceToken, cookie, csrf })
          } catch (e) { reject(e) }
        })
      }
    )
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

// ─── Generic API request ──────────────────────────────────────────────────────

interface ApiResponse { status: number; body: string; headers: Record<string, string | string[]> }

function unifiRequest(
  method: string,
  urlPath: string,
  body: unknown,
  session: UnifiSession,
  extraHeaders: Record<string, string> = {}
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const req = https.request(
      {
        hostname: CONTROLLER, port: 443, path: urlPath, method,
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
          Cookie: session.cookie,
          'X-CSRF-Token': session.csrf,
          ...extraHeaders,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve({ status: res.statusCode!, body: data, headers: res.headers as Record<string, string | string[]> }))
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// ─── TUS upload ───────────────────────────────────────────────────────────────

interface UnifiContent {
  id: string
  asset: { id: string; name?: string }
  mute: boolean
  duration: number
  transition: number
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  const map: Record<string, string> = {
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp',
    '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  }
  return map[ext] ?? 'application/octet-stream'
}

async function tusUpload(session: UnifiSession, fileBuffer: Buffer, fileName: string): Promise<string> {
  const mimeType = getMimeType(fileName)
  const md5Hex = crypto.createHash('md5').update(fileBuffer).digest('hex')

  // Get the primary media folder ID
  const foldersRes = await unifiRequest('GET', '/proxy/connect/api/v2/folders', null, session)
  const folders = (JSON.parse(foldersRes.body) as { data?: Array<{ id: string; spaceType?: string }> }).data ?? []
  const mediaFolder = folders.find((f) => f.spaceType === 'primary') ?? folders[0]
  const folderId = mediaFolder?.id ?? ''

  // TUS metadata — exact format from CDP capture
  const b64 = (s: string) => Buffer.from(s).toString('base64')
  const metadata = [
    `filename ${b64(fileName)}`,
    `digest ${b64(md5Hex)}`,
    `mime ${b64(mimeType)}`,
    `service ${b64('media')}`,
    `deviceIds `,
    `folderId ${b64(folderId)}`,
  ].join(',')

  // Step 1: TUS init
  const initRes = await unifiRequest('POST', '/proxy/connect/api/v2/assets', null, session, {
    'Tus-Resumable': '1.0.0',
    'Upload-Length': String(fileBuffer.length),
    'Upload-Metadata': metadata,
    'Content-Length': '0',
  })

  if (initRes.status !== 201) {
    throw new Error(`TUS init failed (${initRes.status}): ${initRes.body}`)
  }

  const location = (initRes.headers['location'] as string) ?? ''
  const assetId = location.split('/').pop()
  if (!assetId) throw new Error(`No asset ID in Location header: ${location}`)

  log(`TUS init OK — assetId: ${assetId}`)

  // Step 2: TUS upload — raw bytes
  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname: CONTROLLER, port: 443,
        path: `/proxy/connect/api/v2/assets/upload/${assetId}`,
        method: 'PATCH',
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/offset+octet-stream',
          'Content-Length': fileBuffer.length,
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': '0',
          Authorization: `Bearer ${session.token}`,
          Cookie: session.cookie,
          'X-CSRF-Token': session.csrf,
        },
      },
      (res) => {
        res.resume()
        res.on('end', () => {
          if (res.statusCode === 204) { resolve() }
          else { reject(new Error(`TUS upload failed: ${res.statusCode}`)) }
        })
      }
    )
    req.on('error', reject)
    req.write(fileBuffer)
    req.end()
  })

  log(`TUS upload OK — ${fileBuffer.length} bytes sent`)
  return assetId
}

// ─── Playlist operations ──────────────────────────────────────────────────────

const MAX_DURATION = 120

async function addAssetToPlaylist(
  session: UnifiSession,
  assetId: string,
  fileName: string,
  durationSeconds: number
): Promise<void> {
  const res = await unifiRequest('GET', `/proxy/connect/api/v2/playlists/${PLAYLIST_ID}`, null, session)
  const playlist = (JSON.parse(res.body) as { data?: { name: string; contents: UnifiContent[] } }).data
  if (!playlist) throw new Error('Could not fetch playlist')

  const targetBase = path.basename(fileName, path.extname(fileName)).toLowerCase()

  // Remove any existing items with the same filename (de-duplicate)
  const deduped = playlist.contents.filter((c) => {
    const assetBase = path.basename((c.asset?.name ?? '').toLowerCase(), path.extname((c.asset?.name ?? '').toLowerCase()))
    return assetBase !== targetBase
  })

  const removed = playlist.contents.length - deduped.length
  if (removed > 0) log(`Removed ${removed} duplicate(s) of "${fileName}"`)

  // Append new asset at the end
  const updated = [
    ...deduped.map((c) => ({
      id: c.asset.id,
      mute: c.mute,
      duration: Math.min(c.duration, MAX_DURATION),
      transition: c.transition,
    })),
    { id: assetId, mute: false, duration: durationSeconds, transition: 0 },
  ]

  const putRes = await unifiRequest(
    'PUT',
    `/proxy/connect/api/v2/playlists/${PLAYLIST_ID}`,
    { name: playlist.name, contents: updated },
    session
  )

  if (putRes.status !== 200) {
    throw new Error(`Playlist PUT failed (${putRes.status}): ${putRes.body}`)
  }

  log(`Playlist updated — ${updated.length} items, last item duration=${durationSeconds}s`)
}

// ─── File download ────────────────────────────────────────────────────────────

function downloadToBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadToBuffer(res.headers.location!).then(resolve).catch(reject)
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Publish a media file to the UniFi playlist.
 * Downloads the file from Supabase storage, uploads via TUS API, appends to playlist.
 */
export async function publishToUnifi(
  fileUrl: string,
  fileName: string,
  contentType: 'image' | 'video' | 'audio',
  durationSeconds?: number
): Promise<PublishResult> {
  const username = process.env.UNIFI_EMAIL
  const password = process.env.UNIFI_PASSWORD
  if (!username || !password) {
    return { success: false, message: 'Missing UNIFI_EMAIL or UNIFI_PASSWORD', error: 'Missing credentials' }
  }

  try {
    log(`Step 1: Downloading "${fileName}" from storage...`)
    const fileBuffer = await downloadToBuffer(fileUrl)
    log(`Downloaded ${fileBuffer.length} bytes`)

    log('Step 2: Logging in to UniFi controller...')
    const session = await unifiLogin()
    log('Login OK')

    log('Step 3: Uploading via TUS API...')
    const assetId = await tusUpload(session, fileBuffer, fileName)

    log('Step 4: Adding to playlist...')
    const targetDuration = contentType === 'image' ? (durationSeconds ?? 15) : (durationSeconds ?? 15)
    await addAssetToPlaylist(session, assetId, fileName, targetDuration)

    log('✅ Published successfully')
    return { success: true, message: 'Content published to UniFi Connect successfully.' }
  } catch (err) {
    const errMsg = String(err)
    log('❌ Publish failed:', errMsg)
    return { success: false, message: 'UniFi publish failed.', error: errMsg }
  }
}

/**
 * Remove all playlist items whose asset name exactly matches `fileName`.
 * Uses API only — no Playwright.
 */
export async function removeFromUnifi(fileName: string): Promise<PublishResult> {
  try {
    const session = await unifiLogin()
    log(`removeFromUnifi: API session ok, removing "${fileName}"`)

    const res = await unifiRequest('GET', `/proxy/connect/api/v2/playlists/${PLAYLIST_ID}`, null, session) as { body: string }
    const playlist = (JSON.parse(res.body) as { data?: { name: string; contents: (UnifiContent & { asset: { id: string; name?: string } })[] } }).data
    if (!playlist?.contents) {
      return { success: false, message: 'Could not fetch playlist', error: 'Empty playlist response' }
    }

    const targetBase = path.basename(fileName, path.extname(fileName)).toLowerCase()
    const before = playlist.contents.length
    const filtered = playlist.contents.filter((c) => {
      const assetName = (c.asset?.name ?? '').toLowerCase()
      const assetBase = path.basename(assetName, path.extname(assetName))
      return assetBase !== targetBase
    })

    if (filtered.length === before) {
      log(`No items matching "${fileName}" found — nothing to remove`)
      return { success: true, message: `"${fileName}" not found in playlist — already removed or never published.` }
    }

    const updated = filtered.map((c) => ({
      id: c.asset.id,
      mute: c.mute,
      duration: Math.min(c.duration, MAX_DURATION),
      transition: c.transition,
    }))

    const putRes = await unifiRequest(
      'PUT',
      `/proxy/connect/api/v2/playlists/${PLAYLIST_ID}`,
      { name: playlist.name, contents: updated },
      session
    ) as { status: number; body: string }

    if ((putRes as ApiResponse).status && (putRes as ApiResponse).status !== 200) {
      return { success: false, message: 'PUT failed during removal', error: (putRes as ApiResponse).body }
    }

    const removed = before - filtered.length
    log(`✅ Removed ${removed} item(s) matching "${fileName}" from playlist`)
    return { success: true, message: `Removed ${removed} item(s) matching "${fileName}" from UniFi playlist.` }
  } catch (err) {
    return { success: false, message: 'UniFi remove failed', error: String(err) }
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function log(...args: unknown[]) {
  console.log('[UniFi Publisher]', ...args)
}
