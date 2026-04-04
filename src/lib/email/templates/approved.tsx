/**
 * Email template: Content Approved
 * Sent to the submitter when their content is approved.
 */

import type { Submission, User } from '@/types'

interface ApprovedEmailProps {
  submission: Submission
  user: Pick<User, 'email' | 'name'>
  appUrl: string
}

export function ApprovedEmail({ submission, user, appUrl }: ApprovedEmailProps) {
  const name = user.name || user.email.split('@')[0]

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#1a1a2e', padding: '24px', borderRadius: '8px 8px 0 0' }}>
        <h1 style={{ color: '#ffffff', margin: 0, fontSize: '20px' }}>Huntington Steel</h1>
        <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: '13px' }}>
          Digital Signage Content Management
        </p>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px' }}>
        <h2 style={{ color: '#1a1a2e', marginTop: 0 }}>Your content has been approved!</h2>
        <p style={{ color: '#64748b' }}>
          Hi {name}, great news — your content has been reviewed and approved.
        </p>

        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px', width: '140px' }}>
                  Title
                </td>
                <td style={{ padding: '4px 0', color: '#1a1a2e', fontSize: '13px', fontWeight: 600 }}>
                  {submission.title}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px' }}>Status</td>
                <td style={{ padding: '4px 0' }}>
                  <span
                    style={{
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Approved
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px' }}>Goes live</td>
                <td style={{ padding: '4px 0', color: '#1a1a2e', fontSize: '13px' }}>
                  {submission.schedule_start
                    ? new Date(submission.schedule_start).toLocaleString()
                    : 'Immediately'}
                </td>
              </tr>
              {submission.schedule_end && (
                <tr>
                  <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px' }}>Expires</td>
                  <td style={{ padding: '4px 0', color: '#1a1a2e', fontSize: '13px' }}>
                    {new Date(submission.schedule_end).toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Your content will appear on the designated display screens as scheduled.
        </p>

        <a
          href={`${appUrl}/dashboard`}
          style={{
            display: 'inline-block',
            backgroundColor: '#1a1a2e',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          View My Submissions
        </a>
      </div>
    </div>
  )
}
