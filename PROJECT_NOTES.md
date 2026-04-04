# Huntington Steel CMS — Project Notes & Handoff
_Last updated: 2026-03-23_

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
- Future TV screens (location TBD) may use different platforms — the app is designed to handle this.
- **Google Slides** is a secondary output platform (not yet set up — app has a stub for the API integration).

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
| Email | Resend | Free tier, 100 emails/day |
| Styling | TailwindCSS + shadcn/ui | |
| Hosting (future) | Vercel | Free tier, deploy from this folder |
| SMS (future) | Twilio | Not yet implemented, ~20 lines to add |
| Google Slides (future) | Google Slides API | Stub exists in approve route |
| UniFi API (future) | UniFi Connect API | Placeholder in approve route |

---

## Project Location
```
/Users/ericmaloney/hss-internal-content/huntington-cms/
```

---

## What Was Built (41 files)
- ✅ Google OAuth login (restricted to @huntingtonsteel.com, auto-assigns admin to emaloney@)
- ✅ Content upload form (drag-and-drop, image preview, device targeting, schedule start/end, aspect ratio + dimension validation)
- ✅ Approval workflow (pending → approved / rejected with feedback)
- ✅ Email notifications (4 templates: submitted, admin alert, approved, rejected with feedback)
- ✅ Admin dashboard (all submissions by status, slide-in review panel with file preview + device compat check)
- ✅ Device management (pre-loaded UC Cast + UC Cast Lite, add/edit/deactivate future devices)
- ✅ Content scheduling (go-live date, expiry date for time-limited content)
- ✅ Audit log table in DB
- ✅ Supabase schema (users, devices, submissions, audit_log)
- ✅ UniFi API placeholder (clearly commented, ready to wire up)
- ✅ Google Slides API placeholder (in approve route)

---

## Where We Left Off
The dev server is **running** at `http://localhost:3000`.
The login page loads correctly.
The **Sign in with Google button does not work yet** — waiting on 3 credentials to be filled into `.env.local`.

### .env.local status
File exists at:
```
/Users/ericmaloney/hss-internal-content/huntington-cms/.env.local
```

| Variable | Status |
|---|---|
| NEXTAUTH_SECRET | ✅ Already generated and filled in |
| NEXTAUTH_URL | ✅ Set to http://localhost:3000 |
| GOOGLE_CLIENT_ID | ❌ Placeholder — needs real value |
| GOOGLE_CLIENT_SECRET | ❌ Placeholder — needs real value |
| NEXT_PUBLIC_SUPABASE_URL | ❌ Placeholder — needs real value |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ❌ Placeholder — needs real value |
| SUPABASE_SERVICE_ROLE_KEY | ❌ Placeholder — needs real value |
| RESEND_API_KEY | ❌ Placeholder — needs real value |
| ADMIN_EMAIL | ✅ emaloney@huntingtonsteel.com |

---

## Next Session To-Do (in order)

### 1. Supabase (~5 min)
1. Go to supabase.com → New Project → name it `huntington-cms`
2. SQL Editor → paste full contents of `supabase/schema.sql` → Run
3. Storage → New Bucket → name: `submissions` → Public → Save
4. Project Settings → API → copy Project URL, anon key, service_role key → paste into `.env.local`

### 2. Google OAuth (~5 min)
1. Go to console.cloud.google.com (sign in as emaloney@huntingtonsteel.com)
2. New Project → "Huntington CMS"
3. APIs & Services → OAuth consent screen → External → fill in app name + email → Save through all steps
4. Credentials → Create Credentials → OAuth Client ID → Web Application
5. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID + Secret → paste into `.env.local`
7. OAuth consent screen → Test users → add emaloney@huntingtonsteel.com (and any other users)

### 3. Resend (~2 min)
1. Go to resend.com → Sign up (free)
2. API Keys → Create API Key → copy → paste into `.env.local` as RESEND_API_KEY

### 4. Restart server and test
```bash
# Stop current server (Ctrl+C in terminal), then:
cd /Users/ericmaloney/hss-internal-content/huntington-cms
npm run dev
```
Open http://localhost:3000 → Sign in with Google → confirm admin dashboard loads.

---

## Future Work (not yet built — save for later)
- [ ] Wire up UniFi Connect API for direct one-click publishing (need API key from UniFi console)
- [ ] Wire up Google Slides API for auto-updating a presentation
- [ ] Add Twilio SMS notifications
- [ ] Add usage stats / analytics dashboard
- [ ] Add content tagging / categories
- [ ] Production deploy to Vercel (when ready to go live)
- [ ] When adding more users: add their emails to Google OAuth "Test users" list in Cloud Console

---

## How to Resume Tomorrow
1. Open terminal → `cd /Users/ericmaloney/hss-internal-content/huntington-cms`
2. Start fresh Claude Code session
3. Tell Claude: _"Read PROJECT_NOTES.md and let's pick up where we left off"_
4. Claude will read this file and have full context instantly.
