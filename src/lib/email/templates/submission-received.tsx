/**
 * Email template: Submission Received
 * Sent to the user who submitted content, confirming receipt.
 *
 * Note: This file exports React components for use with Resend's React email
 * renderer if you choose to use @react-email/components in the future.
 * Currently the app uses plain HTML strings from resend.ts.
 */

import type { Submission, User } from '@/types'

interface SubmissionReceivedProps {
  submission: Submission
  user: Pick<User, 'email' | 'name'>
  appUrl: string
}

export function SubmissionReceivedEmail({ submission, user, appUrl }: SubmissionReceivedProps) {
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
        <h2 style={{ color: '#1a1a2e', marginTop: 0 }}>Your content has been submitted</h2>
        <p style={{ color: '#64748b' }}>
          Hi {name}, your content is now under review by our admin team.
        </p>

        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
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
                <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px' }}>Type</td>
                <td style={{ padding: '4px 0', color: '#1a1a2e', fontSize: '13px' }}>
                  {submission.content_type}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px' }}>Status</td>
                <td style={{ padding: '4px 0' }}>
                  <span
                    style={{
                      backgroundColor: '#fef9c3',
                      color: '#854d0e',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Pending Review
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ color: '#64748b', fontSize: '14px' }}>
          You&apos;ll receive another email when your content is reviewed.
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
