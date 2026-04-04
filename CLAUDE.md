# Huntington Steel CMS — Project Notes & Handoff
_Last updated: 2026-03-30_

---

## What This Is
An internal digital signage content management system for Huntington Steel. Users upload content (images, video) through a web app, an admin reviews and approves it, and approved content gets pushed to the appropriate display platform.

---

## Key People
- **Admin / Final Approver:** Eric Maloney — emaloney@huntingtonsteel.com
- **Users:** Currently 1 additional, expanding to 3–5. All have @huntingtonsteel.com Google accounts.

---

## Current Display Hardware
| Device | Model | Max Resolution | Platform |
|---|---|---|---|
| UC Cast | Ubiquiti UC-Cast | 4K | UniFi Connect (online) |
| UC Cast Lite | Ubiquiti UC-Cast-Lite | 1080p | UniFi Connect (online) |

- Eric accesses UniFi Connect through the **online platform** (unifi.ui.com) as a **"media manager"** role.
- Both TVs share a single playlist: **"Announcements and Info"**
- **Google Slides** is a secondary output — presentation auto-created on first approved submission to a Google Slides device.

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
| UniFi automation | Playwright (Chromium) | Built, blocked by 2FA — needs service account |
| Google Slides | googleapis npm package | Built and wired in |
| Hosting (future) | Vercel | Free tier |

---

## Project Location
```
/Users/ericmaloney/hss-internal-content/huntington-cms/
```

---

## What's Built
- ✅ Google OAuth login (restricted to @huntingtonsteel.com, auto-assigns admin to emaloney@)
- ✅ Content upload form (drag-and-drop, image preview, device targeting, schedule start/end, aspect ratio validation)
- ✅ Approval workflow (pending → approved / rejected with feedback)
- ✅ Email notifications (4 templates via Gmail SMTP)
- ✅ Admin dashboard with stats bar (pending/approved/rejected/expired counts)
- ✅ Pending badge on sidebar Review Queue (auto-refreshes every minute)
- ✅ Device management (UC Cast + UC Cast Lite pre-loaded)
- ✅ Content scheduling (go-live date, expiry date)
- ✅ Content expiry cron — `/api/cron/expire?secret=8vVeZtdFLHA6SUT6cVEeQ`
- ✅ UniFi Playwright automation (built + wired — service account credentials updated 2026-03-30)
- ✅ Google Slides integration (built + wired — needs sign-out/sign-in to capture refresh token)
- ✅ Content expiry cron — `/api/cron/expire?secret=8vVeZtdFLHA6SUT6cVEeQ`
- ✅ Relative timestamps on cards, publish status indicators, fixed image z-index

---

## Current Status
App is fully operational locally at **http://localhost:3000**

### .env.local — ALL COMPLETE
| Variable | Status |
|---|---|
| NEXTAUTH_SECRET | ✅ |
| NEXTAUTH_URL | ✅ http://localhost:3000 |
| GOOGLE_CLIENT_ID | ✅ |
| GOOGLE_CLIENT_SECRET | ✅ |
| NEXT_PUBLIC_SUPABASE_URL | ✅ https://otmhxnmkpujpopkaesff.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | ✅ |
| GMAIL_USER | ✅ emaloney@huntingtonsteel.com |
| GMAIL_APP_PASSWORD | ✅ |
| ADMIN_EMAIL | ✅ emaloney@huntingtonsteel.com |
| UNIFI_EMAIL | ✅ Claude (service account — no 2FA) |
| UNIFI_PASSWORD | ✅ |
| UNIFI_SITE_NAME | ✅ Huntington Steel Cloud Key Gen 2 |
| UNIFI_PLAYLIST_NAME | ✅ Announcements and Info |
| CRON_SECRET | ✅ 8vVeZtdFLHA6SUT6cVEeQ |

### Supabase notes
- Storage bucket: **"Submissions"** (capital S) — code uses this exact name. Do not change.
- DB table: **"submissions"** (lowercase) — do not change.
- Pending SQL migration (run in Supabase SQL Editor if not done yet):
```sql
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS google_slides_slide_id TEXT,
  ADD COLUMN IF NOT EXISTS google_publish_status TEXT CHECK (google_publish_status IN ('pending', 'published', 'failed'));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS device_id TEXT;
```

---

## Next Steps (Priority Order)
1. **Run SQL migration** — Open Supabase SQL Editor and run the 3 ALTER TABLE statements above (submissions, users, devices). One-time operation.
2. **Test UniFi automation** — Submit + approve a test piece of content. Watch server logs for `[UniFi Publisher]` lines to confirm the service account (Claude) logs in and publishes without hitting 2FA.
3. **Activate Google Slides** — First add a Google Slides device in the Devices page. Then sign out of the CMS and sign back in — this captures the Slides/Drive OAuth refresh token. After that, approving an image to the Slides device auto-publishes it.
4. **Add 2nd user** — Get their @huntingtonsteel.com email → console.cloud.google.com → Huntington CMS project → OAuth consent screen → Test users → Add.

---

## UniFi Automation Details
- Script: `src/lib/unifi/publisher.ts`
- Wired into: `src/app/api/submissions/[id]/approve/route.ts`
- Credentials updated to service account **User: Claude** (no 2FA) — needs live test to confirm
- If it fails, check screenshots dumped to `/tmp/unifi-error-*.png`

## Google Slides Details
- Module: `src/lib/google/slides.ts`
- Presentation auto-created on first use, ID saved to the Google Slides device record
- Only images are published as slides (videos not supported by Slides API image endpoint)
- Slide ID stored per submission so it can be deleted when content expires
- **Requires:** Eric to sign out + sign back in once to capture the Google refresh token

## Content Expiry
- Endpoint: `GET /api/cron/expire?secret=8vVeZtdFLHA6SUT6cVEeQ`
- Marks expired submissions, removes their Google Slides slide
- Run on a schedule when deployed to Vercel (Vercel Cron — free tier supports this)

---

## Future Work
- [ ] SMS notifications via Twilio
- [ ] Usage stats / analytics dashboard
- [ ] Content tagging / categories
- [ ] Production deploy to Vercel (update NEXTAUTH_URL + Google OAuth redirect URI + add Vercel Cron for expiry)

---

## How to Resume
1. Open terminal → `cd /Users/ericmaloney/hss-internal-content/huntington-cms`
2. Start fresh Claude Code session
3. Say "let's pick up where we left off" — Claude reads this file automatically.
