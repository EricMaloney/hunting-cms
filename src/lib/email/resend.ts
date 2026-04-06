import nodemailer from 'nodemailer'
import type { Submission, User } from '@/types'

const GMAIL_USER = process.env.GMAIL_USER || 'emaloney@huntingtonsteel.com'
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''
const FROM = `Huntington Steel CMS <${GMAIL_USER}>`
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'emaloney@huntingtonsteel.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  })
}

// ============================================================
// Email: Submission Received (to submitter)
// ============================================================
export async function sendSubmissionReceivedEmail(
  submission: Submission,
  user: Pick<User, 'email' | 'name'>
) {
  try {
    await getTransporter().sendMail({
      from: FROM,
      to: user.email,
      subject: `Content Submitted: "${submission.title}" is under review`,
      html: buildSubmissionReceivedHtml(submission, user),
    })
    return { success: true }
  } catch (err) {
    console.error('Error sending submission received email:', err)
    return { success: false, error: String(err) }
  }
}

// ============================================================
// Email: Admin Review Notification (to admin)
// ============================================================
export async function sendAdminReviewEmail(
  submission: Submission,
  submitter: Pick<User, 'email' | 'name'>
) {
  try {
    await getTransporter().sendMail({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `New Content Awaiting Review: "${submission.title}"`,
      html: buildAdminReviewHtml(submission, submitter),
    })
    return { success: true }
  } catch (err) {
    console.error('Error sending admin review email:', err)
    return { success: false, error: String(err) }
  }
}

// ============================================================
// Email: Content Approved (to submitter)
// ============================================================
export async function sendApprovedEmail(
  submission: Submission,
  user: Pick<User, 'email' | 'name'>
) {
  try {
    await getTransporter().sendMail({
      from: FROM,
      to: user.email,
      subject: `Approved: "${submission.title}" will go live`,
      html: buildApprovedHtml(submission, user),
    })
    return { success: true }
  } catch (err) {
    console.error('Error sending approved email:', err)
    return { success: false, error: String(err) }
  }
}

// ============================================================
// Email: Content Rejected (to submitter)
// ============================================================
export async function sendRejectedEmail(
  submission: Submission,
  user: Pick<User, 'email' | 'name'>,
  feedback: string
) {
  try {
    await getTransporter().sendMail({
      from: FROM,
      to: user.email,
      subject: `Action Required: "${submission.title}" needs revision`,
      html: buildRejectedHtml(submission, user, feedback),
    })
    return { success: true }
  } catch (err) {
    console.error('Error sending rejected email:', err)
    return { success: false, error: String(err) }
  }
}

// ============================================================
// Email: Design Request Notification (to Eric + Heather)
// ============================================================
const DESIGNER_EMAIL = process.env.DESIGNER_EMAIL || 'hpittman@huntingtonsteel.com'

export interface DesignRequestPayload {
  name: string
  email?: string | null
  phone?: string | null
  message: string
  go_live_date?: string | null
  end_date?: string | null
  content_category?: string | null
  urgency?: 'asap' | 'by_date' | 'flexible' | null
  audience?: string[] | null
  reference_url?: string | null
}

export async function sendDesignRequestEmail(payload: DesignRequestPayload) {
  const transporter = getTransporter()
  const html = buildDesignRequestHtml(payload)
  try {
    // Send to both Eric and Heather simultaneously
    await Promise.all([
      transporter.sendMail({
        from: FROM,
        to: ADMIN_EMAIL,
        subject: `New Design Request from ${payload.name}`,
        html,
      }),
      transporter.sendMail({
        from: FROM,
        to: DESIGNER_EMAIL,
        subject: `New Design Request from ${payload.name}`,
        html,
      }),
    ])
    return { success: true }
  } catch (err) {
    console.error('Error sending design request email:', err)
    return { success: false, error: String(err) }
  }
}

// ============================================================
// HTML Templates
// ============================================================

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Huntington Steel CMS</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Huntington Steel</h1>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Digital Signage Content Management</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-radius:0 0 8px 8px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                Huntington Steel CMS &bull; This is an automated notification
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function buildSubmissionReceivedHtml(
  submission: Submission,
  user: Pick<User, 'email' | 'name'>
): string {
  const name = user.name || user.email.split('@')[0]
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;">Your content has been submitted</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hi ${name}, your content is now under review by our admin team.</p>

    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;width:140px;">Title</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;font-weight:600;">${submission.title}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Type</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;text-transform:capitalize;">${submission.content_type}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Status</td>
          <td style="padding:4px 0;">
            <span style="background-color:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600;">Pending Review</span>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Submitted</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${new Date(submission.created_at).toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">
      You'll receive another email when your content is reviewed. Typically within 1-2 business days.
    </p>

    <a href="${APP_URL}/dashboard" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
      View My Submissions
    </a>
  `)
}

function buildAdminReviewHtml(
  submission: Submission,
  submitter: Pick<User, 'email' | 'name'>
): string {
  const submitterName = submitter.name || submitter.email
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;">New content awaiting your review</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">A new submission requires your approval before it goes live on the displays.</p>

    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;width:140px;">Title</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;font-weight:600;">${submission.title}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Submitted by</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${submitterName} (${submitter.email})</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Content type</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;text-transform:capitalize;">${submission.content_type}</td>
        </tr>
        ${submission.description ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Description</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${submission.description}</td>
        </tr>
        ` : ''}
        ${submission.schedule_start ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Schedule start</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${new Date(submission.schedule_start).toLocaleString()}</td>
        </tr>
        ` : ''}
        ${submission.schedule_end ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Schedule end</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${new Date(submission.schedule_end).toLocaleString()}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Submitted</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${new Date(submission.created_at).toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <a href="${APP_URL}/dashboard/admin" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
      Review in Admin Panel
    </a>
  `)
}

function buildApprovedHtml(
  submission: Submission,
  user: Pick<User, 'email' | 'name'>
): string {
  const name = user.name || user.email.split('@')[0]
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;">Your content has been approved!</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hi ${name}, great news — your content has been reviewed and approved.</p>

    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;width:140px;">Title</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;font-weight:600;">${submission.title}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Status</td>
          <td style="padding:4px 0;">
            <span style="background-color:#dcfce7;color:#166534;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600;">Approved</span>
          </td>
        </tr>
        ${submission.schedule_start ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Goes live</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${new Date(submission.schedule_start).toLocaleString()}</td>
        </tr>
        ` : `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Goes live</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">Immediately</td>
        </tr>
        `}
        ${submission.schedule_end ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Expires</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${new Date(submission.schedule_end).toLocaleString()}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Approved at</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleString() : 'Now'}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">
      Your content will appear on the designated display screens as scheduled.
    </p>

    <a href="${APP_URL}/dashboard" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
      View My Submissions
    </a>
  `)
}

function buildRejectedHtml(
  submission: Submission,
  user: Pick<User, 'email' | 'name'>,
  feedback: string
): string {
  const name = user.name || user.email.split('@')[0]
  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;">Your content needs revision</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hi ${name}, your submission has been reviewed and requires some changes before it can be approved.</p>

    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;width:140px;">Title</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;font-weight:600;">${submission.title}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Status</td>
          <td style="padding:4px 0;">
            <span style="background-color:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600;">Rejected</span>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Reviewed at</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleString() : 'Now'}</td>
        </tr>
      </table>
    </div>

    <div style="background-color:#fffbeb;border-left:4px solid #f59e0b;padding:16px 20px;margin-bottom:24px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 4px;color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Feedback from reviewer</p>
      <p style="margin:0;color:#78350f;font-size:14px;">${feedback}</p>
    </div>

    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">
      Please make the requested changes and submit a new version of your content.
    </p>

    <a href="${APP_URL}/dashboard/submit" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
      Submit Revised Content
    </a>
  `)
}

function buildDesignRequestHtml(payload: DesignRequestPayload): string {
  const urgencyLabel = payload.urgency === 'asap' ? 'ASAP'
    : payload.urgency === 'by_date' ? 'By go-live date'
    : payload.urgency === 'flexible' ? 'Flexible'
    : null

  return emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;">New Design Request</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Someone needs content created for the digital displays.</p>

    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;width:140px;">From</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;font-weight:600;">${payload.name}</td>
        </tr>
        ${payload.email ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Email</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${payload.email}</td>
        </tr>
        ` : ''}
        ${payload.phone ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Phone</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${payload.phone}</td>
        </tr>
        ` : ''}
        ${payload.content_category ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Category</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${payload.content_category}</td>
        </tr>
        ` : ''}
        ${urgencyLabel ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Urgency</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${urgencyLabel}</td>
        </tr>
        ` : ''}
        ${payload.audience && payload.audience.length > 0 ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Audience</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${payload.audience.join(', ')}</td>
        </tr>
        ` : ''}
        ${payload.go_live_date ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Desired go-live</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${new Date(payload.go_live_date).toLocaleDateString()}</td>
        </tr>
        ` : ''}
        ${payload.end_date ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">End date</td>
          <td style="padding:4px 0;color:#1a1a2e;font-size:13px;">${new Date(payload.end_date).toLocaleDateString()}</td>
        </tr>
        ` : ''}
        ${payload.reference_url ? `
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Reference</td>
          <td style="padding:4px 0;font-size:13px;"><a href="${payload.reference_url}" style="color:#1a1a2e;">View uploaded reference</a></td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background-color:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px 20px;margin-bottom:24px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 4px;color:#0c4a6e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
      <p style="margin:0;color:#075985;font-size:14px;">${payload.message}</p>
    </div>

    <a href="${APP_URL}/dashboard/design-requests" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
      View in CMS
    </a>
  `)
}

// ============================================================
// Email: Publish Failure Notification (to admin)
// ============================================================
export async function sendPublishFailureEmail(
  submission: Submission,
  deviceName: string,
  errorMessage: string
): Promise<void> {
  const html = emailWrapper(`
    <h2 style="color:#dc2626;margin:0 0 16px">⚠️ Publish Failed</h2>
    <p style="margin:0 0 12px">A submission failed to publish to a display device.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:8px;background:#f9fafb;font-weight:600;width:140px">Submission</td><td style="padding:8px">${submission.title}</td></tr>
      <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Device</td><td style="padding:8px">${deviceName}</td></tr>
      <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Error</td><td style="padding:8px;color:#dc2626">${errorMessage}</td></tr>
    </table>
    <a href="${process.env.NEXTAUTH_URL}/dashboard/admin" style="display:inline-block;background:#1a1a2e;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to Review Queue</a>
  `)

  await getTransporter().sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `⚠️ Publish failed: ${submission.title}`,
    html,
  })
}

// ============================================================
// Email: Weekly Digest (to admin)
// ============================================================
interface DigestData {
  liveThisWeek: Submission[]
  pendingCount: number
  expiringCount: number
  newUsersCount: number
}

export async function sendWeeklyDigestEmail(data: DigestData): Promise<void> {
  const { liveThisWeek, pendingCount, expiringCount, newUsersCount } = data

  const liveRows = liveThisWeek.length === 0
    ? '<p style="color:#6b7280;font-style:italic">None this week.</p>'
    : liveThisWeek.map(s => `<li style="margin-bottom:4px">${s.title}</li>`).join('')

  const html = emailWrapper(`
    <h2 style="margin:0 0 4px">Weekly Content Summary</h2>
    <p style="color:#6b7280;margin:0 0 24px">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#16a34a">${liveThisWeek.length}</div>
        <div style="font-size:12px;color:#16a34a;font-weight:600">Went Live</div>
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#d97706">${pendingCount}</div>
        <div style="font-size:12px;color:#d97706;font-weight:600">Pending Review</div>
      </div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#ea580c">${expiringCount}</div>
        <div style="font-size:12px;color:#ea580c;font-weight:600">Expiring This Week</div>
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#2563eb">${newUsersCount}</div>
        <div style="font-size:12px;color:#2563eb;font-weight:600">New Users</div>
      </div>
    </div>

    <h3 style="margin:0 0 8px;color:#1a1a2e">Content Live This Week</h3>
    ${liveThisWeek.length > 0 ? `<ul style="margin:0 0 24px;padding-left:20px">${liveRows}</ul>` : liveRows}

    ${pendingCount > 0 ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:16px">
      <strong>${pendingCount} submission${pendingCount !== 1 ? 's' : ''} awaiting your review.</strong>
      <br/><a href="${process.env.NEXTAUTH_URL}/dashboard/admin" style="color:#d97706">Review now →</a>
    </div>` : ''}

    <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#1a1a2e;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open Dashboard</a>
  `)

  await getTransporter().sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `📊 Weekly Content Summary — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    html,
  })
}

// ============================================================
// Email: Comment Notification
// ============================================================
export async function sendCommentNotificationEmail(
  submissionTitle: string,
  commenterName: string,
  commentMessage: string,
  toEmail: string,
  toName: string | null,
  submissionId: string
) {
  const name = toName || toEmail.split('@')[0]
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;">New comment on your submission</h2>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hi ${name}, ${commenterName} left a comment on <strong>${submissionTitle}</strong>.</p>

    <div style="background-color:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px 20px;margin-bottom:24px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 4px;color:#0c4a6e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${commenterName}</p>
      <p style="margin:0;color:#075985;font-size:14px;">${commentMessage}</p>
    </div>

    <a href="${APP_URL}/dashboard?submission=${submissionId}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
      View Submission
    </a>
  `)

  try {
    await getTransporter().sendMail({
      from: FROM,
      to: toEmail,
      subject: `New comment on "${submissionTitle}"`,
      html,
    })
    return { success: true }
  } catch (err) {
    console.error('Error sending comment notification email:', err)
    return { success: false, error: String(err) }
  }
}
