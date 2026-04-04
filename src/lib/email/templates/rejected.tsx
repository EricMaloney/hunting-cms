/**
 * Email template: Content Rejected
 * Sent to the submitter when their content is rejected with feedback.
 */

import type { Submission, User } from '@/types'

interface RejectedEmailProps {
  submission: Submission
  user: Pick<User, 'email' | 'name'>
  feedback: string
  appUrl: string
}

export function RejectedEmail({ submission, user, feedback, appUrl }: RejectedEmailProps) {
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
        <h2 style={{ color: '#1a1a2e', marginTop: 0 }}>Your content needs revision</h2>
        <p style={{ color: '#64748b' }}>
          Hi {name}, your submission has been reviewed and requires some changes before it can be
          approved.
        </p>

        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '16px',
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
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Rejected
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            backgroundColor: '#fffbeb',
            borderLeft: '4px solid #f59e0b',
            padding: '16px 20px',
            marginBottom: '24px',
            borderRadius: '0 8px 8px 0',
          }}
        >
          <p
            style={{
              margin: '0 0 4px',
              color: '#92400e',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Feedback from reviewer
          </p>
          <p style={{ margin: 0, color: '#78350f', fontSize: '14px' }}>{feedback}</p>
        </div>

        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Please make the requested changes and submit a new version of your content.
        </p>

        <a
          href={`${appUrl}/dashboard/submit`}
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
          Submit Revised Content
        </a>
      </div>
    </div>
  )
}
