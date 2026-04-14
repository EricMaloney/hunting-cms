/**
 * UniFi Connect Publisher
 * Uses Playwright to automate uploading and adding content to the
 * "Announcements and Info" playlist on the local Cloud Key at 10.0.30.2.
 *
 * Targets the local controller directly (not unifi.ui.com) so no 2FA is required.
 * Self-signed cert is bypassed via ignoreHTTPSErrors.
 *
 * Workflow:
 *  1. Log in to https://10.0.30.2
 *  2. Navigate directly to the playlist URL
 *  3. Add Slides → Upload Media → upload file → Add
 *  4. Remove duplicate items with the same filename
 *  5. Save (commits the new item; duration defaults to 5s)
 *  6. PUT playlist via API: set the last item's duration to 15s (images) or video length
 *
 * Duration fix: The UI Save button sends PUT (not PATCH) to the playlist endpoint
 * with the full contents array {id, mute, duration, transition}. UniFi regenerates
 * ALL content IDs on every save, so before/after ID comparison doesn't work.
 * Instead: newly uploaded items are always appended last, so we target index [-1].
 */

import { chromium, type Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as https from 'https'
import * as http from 'http'

export interface PublishResult {
  success: boolean
  message: string
  error?: string
  screenshotPath?: string
}

// Playlist ID for "Announcements and Info" (discovered via API exploration)
const PLAYLIST_ID = '2abbed8c-9280-46a4-958e-3318aa40bdfb'
const CONTROLLER_URL = process.env.UNIFI_CONTROLLER_URL || 'https://10.0.30.2'

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Remove all playlist items whose asset name matches `fileName`.
 * Uses the UniFi API directly (no Playwright) — works from Vercel or locally.
 */
export async function removeFromUnifi(fileName: string): Promise<PublishResult> {
  try {
    const session = await unifiLogin()
    log(`removeFromUnifi: API session ok, removing "${fileName}"`)

    const res = (await unifiRequest(
      'GET',
      `/proxy/connect/api/v2/playlists/${PLAYLIST_ID}`,
      null,
      session
    )) as { data?: { name?: string; contents?: Array<UnifiContent & { asset: { id: string; name?: string } }> } }

    const playlist = res?.data
    if (!playlist?.contents) {
      return { success: false, message: 'Could not fetch playlist', error: 'Empty playlist response' }
    }

    const baseName = path.basename(fileName, path.extname(fileName)).toLowerCase()
    const before = playlist.contents.length
    const filtered = playlist.contents.filter(
      (c) => !(c.asset?.name ?? '').toLowerCase().includes(baseName)
    )

    if (filtered.length === before) {
      log(`No items matching "${fileName}" found in playlist — nothing to remove`)
      return { success: true, message: `"${fileName}" not found in playlist — already removed or never published.` }
    }

    const MAX_DURATION = 120
    const updated = filtered.map((c) => ({
      id: c.asset.id,
      mute: c.mute,
      duration: Math.min(c.duration, MAX_DURATION),
      transition: c.transition,
    }))

    const putRes = (await unifiRequest(
      'PUT',
      `/proxy/connect/api/v2/playlists/${PLAYLIST_ID}`,
      { name: playlist.name, contents: updated },
      session
    )) as { err?: unknown }

    if (putRes.err) {
      return { success: false, message: 'PUT failed during removal', error: JSON.stringify(putRes.err) }
    }

    const removed = before - filtered.length
    log(`✅ Removed ${removed} item(s) matching "${fileName}" from playlist`)
    return { success: true, message: `Removed ${removed} item(s) matching "${fileName}" from UniFi playlist.` }
  } catch (err) {
    return { success: false, message: 'UniFi remove failed', error: String(err) }
  }
}

export async function publishToUnifi(
  fileUrl: string,
  fileName: string,
  contentType: 'image' | 'video' | 'audio',
  durationSeconds?: number
): Promise<PublishResult> {
  const username = process.env.UNIFI_EMAIL
  const password = process.env.UNIFI_PASSWORD
  const playlistName = process.env.UNIFI_PLAYLIST_NAME || 'Announcements and Info'

  if (!username || !password) {
    return {
      success: false,
      message: 'UniFi credentials not configured.',
      error: 'Missing UNIFI_EMAIL or UNIFI_PASSWORD in .env.local',
    }
  }

  let tempFilePath: string | null = null
  try {
    tempFilePath = await downloadToTemp(fileUrl, fileName)
  } catch (err) {
    return {
      success: false,
      message: 'Failed to download file from storage before publishing.',
      error: String(err),
    }
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true, // local Cloud Key uses a self-signed cert
  })
  const page = await context.newPage()

  let screenshotPath: string | undefined

  try {
    log('Step 1: Logging in to local Cloud Key')
    await login(page, username, password)

    log('Step 2: Navigating to playlist')
    await navigateToPlaylist(page, PLAYLIST_ID)

    log('Step 3: Uploading media file')
    await uploadMedia(page, tempFilePath, fileName)

    log('Step 4: Removing duplicates')
    await removeDuplicates(page, fileName)

    log('Step 5: Saving playlist')
    await savePlaylist(page)

    log('Step 6: Fixing duration via API PUT')
    const targetSeconds = contentType === 'image' ? 15 : (durationSeconds ?? 15)
    await fixDurationViaApi(targetSeconds)

    log('✅ Published successfully')
    return { success: true, message: 'Content published to UniFi Connect successfully.' }
  } catch (err) {
    const errMsg = String(err)
    log('❌ Error during automation:', errMsg)

    try {
      screenshotPath = path.join(os.tmpdir(), `unifi-error-${Date.now()}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true })
      log(`Debug screenshot saved to: ${screenshotPath}`)
    } catch {
      // ignore screenshot errors
    }

    return {
      success: false,
      message: 'UniFi automation failed. Check server logs for details.',
      error: errMsg,
      screenshotPath,
    }
  } finally {
    await browser.close()
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
      // Clean up the temp directory too
      const tempDir = path.dirname(tempFilePath)
      if (tempDir.includes('unifi-upload-')) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    }
  }
}

// ─── Step functions ───────────────────────────────────────────────────────────

async function login(page: Page, username: string, password: string) {
  await page.goto(`${CONTROLLER_URL}/`, { waitUntil: 'networkidle' })

  // Wait for the username field (label text is "Email or Username")
  await page.waitForSelector('input', { timeout: 15000 })

  // Fill username — first visible input
  const usernameInput = page.locator('input').first()
  await usernameInput.waitFor({ state: 'visible', timeout: 15000 })
  await usernameInput.click()
  await usernameInput.fill(username)

  // Fill password
  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 })
  await passwordInput.click()
  await passwordInput.fill(password)

  // Click Sign In button explicitly
  const signInBtn = page.locator('button:has-text("Sign In"), button[type="submit"]').first()
  await signInBtn.waitFor({ state: 'visible', timeout: 5000 })
  await signInBtn.click()

  // The root URL IS the login page — wait for it to navigate away to a different path
  await page.waitForURL(
    (url) => {
      const u = url.toString()
      // After login, UniFi OS redirects to /network/, /connect/, /users/, etc.
      return u.includes('/network') || u.includes('/connect') || u.includes('/users') || u.includes('/settings')
    },
    { timeout: 30000 }
  )
  await page.waitForLoadState('networkidle')
  log('Login successful')
}

async function navigateToPlaylist(page: Page, playlistId: string) {
  await page.goto(`${CONTROLLER_URL}/connect/contents/playlists/${playlistId}`, {
    waitUntil: 'networkidle',
  })
  await page.waitForLoadState('networkidle')
  log(`Navigated to playlist ${playlistId}`)
}

async function uploadMedia(page: Page, filePath: string, fileName: string) {
  // Click "Add Slides" button on the playlist page
  const addSlidesBtn = page.locator('button:has-text("Add Slides")').first()
  await addSlidesBtn.waitFor({ timeout: 15000 })
  await addSlidesBtn.click()
  await page.waitForTimeout(1500)

  // The Add Slides dialog opens showing existing media.
  // The upload button is an icon-only button wrapping a hidden file input.
  // Its container has class "Upload__StyledTooltip" — target the file input directly.
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.waitFor({ state: 'attached', timeout: 10000 })

  // Trigger the file chooser by clicking the upload icon button (parent of the file input)
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      if (input) input.click()
    }),
  ])
  await fileChooser.setFiles(filePath)
  log(`File selected: ${fileName}`)

  // Wait for the upload progress to complete — the "Add" button in the modal
  // becomes enabled once the file is processed
  await page.waitForTimeout(3000)

  // After upload, click "Add" to add to the playlist
  const addBtn = page.locator('button:has-text("Add")').last()
  await addBtn.waitFor({ timeout: 30000 })
  // Wait for it to be enabled
  await page.waitForFunction(
    () => {
      const btns = Array.from(document.querySelectorAll('button'))
      const addBtn = btns.find((b) => b.textContent?.trim() === 'Add')
      return addBtn && !addBtn.disabled
    },
    { timeout: 30000 }
  )
  await addBtn.click()

  // UniFi UI doesn't reach networkidle after Add — use a fixed wait instead
  await page.waitForTimeout(3000)
  log('Media uploaded and added to playlist')
}

// ─── UniFi API helpers (Node.js https — no browser context needed) ────────────

interface UnifiContent {
  id: string
  asset: { id: string; name?: string }
  mute: boolean
  duration: number
  transition: number
}

interface UnifiSession {
  token: string
  cookie: string
  csrf: string
}

// Login and capture the deviceToken, session cookie, AND csrf token.
// The Cloud Key requires all three for write (PUT) API calls.
function unifiLogin(): Promise<UnifiSession> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      username: process.env.UNIFI_EMAIL,
      password: process.env.UNIFI_PASSWORD,
    })
    const req = https.request(
      {
        hostname: '10.0.30.2',
        port: 443,
        path: '/api/auth/login',
        method: 'POST',
        rejectUnauthorized: false,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (res) => {
        let data = ''
        const setCookies: string[] = (res.headers['set-cookie'] as string[]) ?? []
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as { deviceToken?: string }
            if (!parsed.deviceToken) return reject(new Error('UniFi login: no deviceToken'))
            // Cookie string for subsequent requests (name=value pairs only)
            const cookie = setCookies.map((c) => c.split(';')[0]).join('; ')
            // CSRF token is embedded in the TOKEN cookie's JWT payload
            const tokenCookie = setCookies.find((c) => c.startsWith('TOKEN='))
            let csrf = ''
            if (tokenCookie) {
              const jwt = tokenCookie.split('=')[1].split(';')[0]
              const payloadB64 = jwt.split('.')[1]
              const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4)
              const jwtPayload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { csrfToken?: string }
              csrf = jwtPayload.csrfToken ?? ''
            }
            resolve({ token: parsed.deviceToken, cookie, csrf })
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

function unifiRequest(
  method: string,
  urlPath: string,
  body: unknown,
  session: UnifiSession
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const req = https.request(
      {
        hostname: '10.0.30.2',
        port: 443,
        path: urlPath,
        method,
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
          Cookie: session.cookie,
          'X-CSRF-Token': session.csrf,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try { resolve(JSON.parse(data)) } catch { resolve(data) }
        })
      }
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// After save, set the last playlist item's duration to the target.
// Key findings:
// - PUT (not PATCH) to /proxy/connect/api/v2/playlists/{id} with full contents array
// - contents[].id must be asset.id (stable media ID), NOT the playlist content slot id
//   (content slot IDs are regenerated on every save)
// - Requires X-CSRF-Token header extracted from TOKEN cookie JWT
// - Newly uploaded items are always appended last in the playlist
async function fixDurationViaApi(seconds: number) {
  try {
    const session = await unifiLogin()
    log(`API session ok, csrf=${session.csrf ? 'present' : 'missing'}`)

    const res = (await unifiRequest('GET', `/proxy/connect/api/v2/playlists/${PLAYLIST_ID}`, null, session)) as {
      data?: { name?: string; contents?: Array<UnifiContent & { asset: { id: string } }> }
    }
    const playlist = res?.data
    if (!playlist?.contents?.length) throw new Error('Could not fetch playlist or playlist is empty')

    const contents = playlist.contents
    log(`Playlist has ${contents.length} items, last item duration=${contents[contents.length - 1].duration}s`)

    // Build PUT body using asset.id (stable), not the content slot id (changes each save).
    // Also cap any corrupted durations (e.g. from a failed partial save) to MAX_DURATION.
    const MAX_DURATION = 120 // seconds — anything beyond 2 min is a data error
    const updated = contents.map((c, i) => ({
      id: c.asset.id,
      mute: c.mute,
      duration: i === contents.length - 1 ? seconds : Math.min(c.duration, MAX_DURATION),
      transition: c.transition,
    }))

    const putRes = (await unifiRequest(
      'PUT',
      `/proxy/connect/api/v2/playlists/${PLAYLIST_ID}`,
      { name: playlist.name, contents: updated },
      session
    )) as { err?: unknown; data?: unknown }

    if (putRes.err) {
      log(`Warning: PUT returned error:`, JSON.stringify(putRes.err))
    } else {
      log(`✅ Duration fixed via API: last item set to ${seconds}s`)
    }
  } catch (err) {
    log(`Warning: Could not fix duration via API:`, String(err))
  }
}

async function removeDuplicates(page: Page, fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName)).toLowerCase()

  try {
    // Items use class "item" — skip index 0 which is the header row
    const allItems = await page.locator('div.item').all()
    log(`Found ${allItems.length} items in playlist, scanning for duplicates of "${baseName}"`)

    const matchingIndices: number[] = []
    for (let i = 0; i < allItems.length; i++) {
      const text = ((await allItems[i].textContent()) || '').toLowerCase()
      if (text.includes(baseName)) {
        matchingIndices.push(i)
      }
    }

    if (matchingIndices.length <= 1) {
      log('No duplicates found')
      return
    }

    log(`Found ${matchingIndices.length} items matching "${baseName}" — removing ${matchingIndices.length - 1} older duplicate(s)`)

    // Keep the LAST match (most recently added), remove the earlier ones
    const toRemove = matchingIndices.slice(0, -1)

    // Remove in reverse order so indices don't shift
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const item = allItems[toRemove[i]]

      // Hover to reveal actions
      await item.hover()
      await page.waitForTimeout(300)

      // Click the three-dots menu icon inside .actions
      const menuIcon = item.locator('.actions .PopoverMenu__MoreIconWrapper-sc-18im7p4-1, .actions [class*="MoreIconWrapper"]').first()
      await menuIcon.waitFor({ state: 'visible', timeout: 5000 })
      await menuIcon.click()
      await page.waitForTimeout(400)

      // Click "Remove from this playlist"
      const removeOption = page.locator('li:has-text("Remove from this playlist"), [class*="menu-item"]:has-text("Remove from this playlist")').first()
      await removeOption.waitFor({ timeout: 5000 })
      await removeOption.click()
      await page.waitForTimeout(500)
      log(`Removed duplicate at index ${toRemove[i]}`)
    }
  } catch (err) {
    log('Warning: Duplicate detection issue — check manually.', String(err))
  }
}

async function savePlaylist(page: Page) {
  const saveBtn = page.locator('button:has-text("Save")').first()
  await saveBtn.waitFor({ timeout: 10000 })
  await saveBtn.click()
  // UniFi UI doesn't reach networkidle after Save — use a fixed wait instead
  await page.waitForTimeout(4000)
  log('Playlist saved')
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function downloadToTemp(url: string, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use a unique temp directory but keep the original filename so UniFi displays it correctly
    const tempDir = path.join(os.tmpdir(), `unifi-upload-${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })
    const tempPath = path.join(tempDir, fileName)
    const file = fs.createWriteStream(tempPath)

    const client = url.startsWith('https') ? https : http
    client
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close()
          fs.unlinkSync(tempPath)
          downloadToTemp(response.headers.location!, fileName).then(resolve).catch(reject)
          return
        }
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve(tempPath)
        })
      })
      .on('error', (err) => {
        fs.unlinkSync(tempPath)
        reject(err)
      })
  })
}

function log(...args: unknown[]) {
  console.log('[UniFi Publisher]', ...args)
}
