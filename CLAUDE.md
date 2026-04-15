# Huntington Steel CMS — Project Notes & Handoff
_Last updated: 2026-04-15 (wake trigger, stuck-job reset, filename fix, OAuth scope reduction)_

---

## What This Is
An internal digital signage content management system for Huntington Steel. Users upload content (images, video) through a web app, a lead/admin reviews and approves it, and approved content gets pushed automatically to the UniFi display.

---

## Key People
- **Admin:** Eric Maloney — emaloney@huntingtonsteel.com
- **Lead:** Heather Pittman — hpittman@huntingtonsteel.com
- **Users:** 2 active, expanding to 3–5. All have @huntingtonsteel.com Google accounts.

---

## Current Display Hardware
| Device | Model | Max Resolution | Platform |
|---|---|---|---|
| UC Cast | Ubiquiti UC-Cast | 4K | UniFi Connect |
| UC Cast Lite | Ubiquiti UC-Cast-Lite | 1080p | UniFi Connect |

- Both TVs share a single playlist: **"Announcements and Info"** (ID: `2abbed8c-9280-46a4-958e-3318aa40bdfb`)
- UniFi controller: **10.0.30.2** (local Cloud Key, self-signed cert, no 2FA on service account)

---

## Supported Media (per UniFi specs)
| Type | Formats | Max File Size | Max Resolution |
|---|---|---|---|
| Images | jpg, jpeg, png, gif, bmp | 20 MB | 8K |
| Audio | m4a, mp3, wav | 1 GB | — |
| Video | mp4, mov (and others) | 1 GB | 4K (Cast) / 1080p (Cast Lite) |

---

## Tech Stack
| Layer | Technology | Notes |
|---|---|---|
| Frontend + API | Next.js 14 (App Router, TypeScript) | |
| Database + Storage | Supabase (PostgreSQL + Storage) | Free tier |
| Authentication | NextAuth.js v4 + Google OAuth | Restricted to @huntingtonsteel.com |
| Email | Nodemailer + Gmail SMTP | App Password on emaloney@huntingtonsteel.com |
| Styling | TailwindCSS + shadcn/ui | |
| UniFi publishing | Playwright (local Mac launchd worker) | Vercel can't run Playwright — runs on Mac |
| Google Drive | googleapis (drive scope) | Community uploads mirrored to Drive folder |
| Google Chat | Incoming webhook | Alerts to "CMS Alerts" space |
| Hosting | Vercel | https://hunting-cms.vercel.app |

---

## Project Location
```
/Users/ericmaloney/projects/hss-internal-content/huntington-cms/
```
Local dev: **http://localhost:3001**
Vercel: **https://hunting-cms.vercel.app**
GitHub: **https://github.com/EricMaloney/hunting-cms**

---

## What's Built
- ✅ Google OAuth login (restricted to @huntingtonsteel.com, auto-assigns admin to emaloney@)
- ✅ Three-tier roles: user / lead / admin (Heather = lead)
- ✅ Content upload form (drag-and-drop, image preview, device targeting, schedule start/end)
- ✅ Approval workflow (pending → approved / rejected with feedback)
- ✅ Email notifications (submission received, admin review needed, approved, rejected)
- ✅ Google Chat notifications (new submission, new design request, approved, rejected) → CMS Alerts space
- ✅ Admin dashboard with stats bar (pending/approved/rejected/expired counts)
- ✅ Pending badge on sidebar Review Queue (auto-refreshes every minute)
- ✅ Device management (UC Cast + UC Cast Lite pre-loaded)
- ✅ Content scheduling (go-live date, expiry date)
- ✅ Content expiry cron — `/api/cron/expire?secret=8vVeZtdFLHA6SUT6cVEeQ`
- ✅ UniFi publish queue — approval inserts to `publish_queue` (with `schedule_start`, `schedule_end`, `action`); local Mac worker picks it up
- ✅ UniFi launchd worker — polls every 5 min; respects schedule_start (won't publish early); supports `action: unpublish` to remove items from playlist
- ✅ Expire cron queues UniFi `unpublish` jobs when `schedule_end` passes — worker removes content from playlist automatically
- ✅ Stuck-job auto-reset — worker resets jobs stuck in `processing` >10 min back to `pending` on each run
- ✅ Wake-on-sleep trigger — launchd WatchPaths on `/private/var/run/resolv.conf` fires worker on Mac wake
- ✅ Nightly Mac wake — recurring Calendar event at 12:04 AM wakes Mac for midnight content scheduling (hidden iCloud calendar, not on iPhone)
- ✅ Community library — public photo submission form at `/community` (no login required)
- ✅ Community uploads stored in Supabase "community" bucket + mirrored to Google Drive folder
- ✅ Library Manager — lead/admin browse grid with lightbox, open/download/copy/Drive buttons
- ✅ Design requests — users can submit design briefs; lead/admin manage them
- ✅ Sidebar: role-aware nav (Submit a Photo link for all, Library/All Submissions for lead+, admin-only sections)

---

## Current Status
App is fully operational on **Vercel** at https://hunting-cms.vercel.app
Local dev runs at **http://localhost:3001**

### Roles
| Role | Access |
|---|---|
| `user` | Submit content, design requests, community photo submissions, own submission history |
| `lead` | Everything above + review queue, library, all submissions, community uploads |
| `admin` | Everything above + user management, devices, full admin panel |

### Environment Variables
All set in both `.env.local` and Vercel production:

| Variable | Notes |
|---|---|
| NEXTAUTH_SECRET | Auth signing key |
| NEXTAUTH_URL | https://hunting-cms.vercel.app (Vercel) / http://localhost:3001 (local) |
| GOOGLE_CLIENT_ID / SECRET | OAuth app |
| NEXT_PUBLIC_SUPABASE_URL | https://otmhxnmkpujpopkaesff.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Public Supabase key |
| SUPABASE_SERVICE_ROLE_KEY | Server-side admin key |
| GMAIL_USER / GMAIL_APP_PASSWORD | Email notifications |
| ADMIN_EMAIL | emaloney@huntingtonsteel.com |
| UNIFI_EMAIL / UNIFI_PASSWORD | Service account "Claude" on local Cloud Key (no 2FA) |
| UNIFI_CONTROLLER_URL | https://10.0.30.2 |
| UNIFI_PLAYLIST_NAME | Announcements and Info |
| CRON_SECRET | 8vVeZtdFLHA6SUT6cVEeQ |
| GOOGLE_DRIVE_COMMUNITY_FOLDER_ID | 1-Os8xnyp9Ny3BSMuip1_H7z5g-XhmTDe |
| GOOGLE_CHAT_WEBHOOK_URL | Incoming webhook for CMS Alerts space |

---

## UniFi Publishing Architecture
Playwright cannot run on Vercel serverless. Flow:

1. Admin/lead approves submission → API inserts row into `publish_queue` (status: pending, action: publish, schedule_start, schedule_end)
2. Local Mac launchd agent (`~/Library/LaunchAgents/com.huntington.unifi-worker.plist`) runs every 5 min
3. Worker script (`scripts/unifi-worker.ts`) polls queue — **only picks up publish jobs where `schedule_start` is null or has arrived**
4. For `action: publish` — Playwright: login → navigate to playlist → upload file → remove duplicates → save → fix duration via API PUT
5. For `action: unpublish` — direct API only (no Playwright): GET playlist → filter out matching filename → PUT updated contents
6. Worker marks job `published` or `failed`, updates submission's `unifi_publish_status`
7. When `schedule_end` passes, expire cron inserts an `action: unpublish` job → worker removes it on next tick

**Worker script location:** `scripts/unifi-worker.ts`
**Shell wrapper:** `scripts/run-unifi-worker.sh` — sets PATH and `cd`s to project dir; **must be updated if project is moved**
**Worker logs:** `/tmp/unifi-worker.log`
**Error screenshots:** `/tmp/unifi-error-*.png`
**Key gotcha:** UniFi UI never reaches `networkidle` after Add or Save — use `waitForTimeout(3000/4000)` instead.
**Stuck-job recovery:** Worker auto-resets any job in `processing` for >10 min back to `pending` at the start of each run. Handles Mac sleep interruptions mid-Playwright.
**Wake trigger:** `~/Library/LaunchAgents/com.huntington.unifi-worker-wake.plist` watches `/private/var/run/resolv.conf` (updated on network wake). Worker fires within seconds of Mac waking. Nightly Mac wake via Calendar recurring event at 12:04 AM (see Troubleshooting).
**Filename matching:** `removeFromUnifi()` uses exact base-name equality (not substring) to avoid "file.mp4" accidentally matching "file (1).mp4".
**Duration corruption guard:** `fixDurationViaApi` caps all preserved durations at 120s — prevents partial-save from corrupting item durations (root cause of 2026-04-07 display freeze where item [0] got set to 54015s).
**If display appears frozen:** Check playlist via API — a corrupted duration on item [0] will make the display appear stuck. Fix by PUTting the playlist with corrected durations.
**If content isn't publishing:** Check `/tmp/unifi-worker.log`. Common causes: (1) worker path mismatch after project move — update `scripts/run-unifi-worker.sh` and `~/Library/LaunchAgents/com.huntington.unifi-worker.plist`; (2) `schedule_start` in the future (intentional); (3) job stuck in `processing` — Mac slept mid-job; worker will auto-reset on next run; OR manually: `UPDATE publish_queue SET status='pending', started_at=NULL WHERE status='processing'`; (4) Mac was asleep at scheduled time and Calendar wake isn't set up — verify Calendar event exists at 12:04 AM in iCloud (hidden from iPhone).

---

## Supabase Notes
- Storage bucket: **"Submissions"** (capital S) — do not rename
- Storage bucket: **"community"** (lowercase) — public, for community uploads
- Key tables: `submissions`, `users`, `devices`, `publish_queue`, `community_uploads`, `audit_log`, `design_requests`

---

## Google Drive
- Community uploads mirrored to folder: `1-Os8xnyp9Ny3BSMuip1_H7z5g-XhmTDe`
- Uses admin OAuth refresh token stored in `users` table (admin's Google account)
- Scope: `drive` (full, needed to write to pre-existing folders)
- Files are made publicly readable after upload (`reader` + `anyone` permission)

---

## Google Chat Notifications
- Webhook URL in env: `GOOGLE_CHAT_WEBHOOK_URL`
- Space: CMS Alerts (Eric + Heather are members)
- Triggers: new submission, new design request, submission approved, submission rejected
- All notifications are `await`ed (not fire-and-forget) so Vercel doesn't kill them before they fire
- `process.env` is read inside `postToChat()` — not at module level — to avoid stale values after hot-reload

---

## Security Notes
- `.env.local` is gitignored — secrets never committed to source
- Cron secret comparison uses `crypto.timingSafeEqual` (timing-attack safe)
- Design requests GET: regular users only see their own; leads/admins see all
- Submissions PATCH: full Zod schema validation — no untyped field writes
- Pagination capped at 100 per page — no unbounded result sets
- Schedule end/start validated at API level (end must be after start)
- UniFi `ignoreHTTPSErrors: true` is intentional — controller is on trusted local network only
- Google refresh token stored plaintext in Supabase `users` table — acceptable for internal tool; Supabase encrypts at rest
- Google OAuth scopes: login requests `openid email profile` only. Drive/Slides scopes were removed — they alarmed users with unnecessary permissions. Admin refresh token (for Drive mirroring + Slides) is already stored in `users` table and remains valid.

## Future Enhancements (if desired)
- Content tagging / categories
- Analytics dashboard (basic stats are already surfacing in the admin panel)
- Additional users (add via Google Cloud Console → OAuth consent screen → Test users)

---

## How to Resume
1. `cd /Users/ericmaloney/projects/hss-internal-content/huntington-cms`
2. `npm run dev` (runs on port 3001)
3. Start Claude Code session from **this directory** — Claude reads this file automatically and has full project context.

> ⚠️ If you open Claude from a different directory (e.g. `~/hss-internal-content` or `~`), Claude won't load this file and won't know what project you're talking about. Always open from the project root.
