/**
 * Email template: Admin Review Notification
 * Sent to the admin when new content is submitted for review.
 */

import type { Submission, User } from '@/types'

interface AdminReviewProps {
  submission: Submission
  submitter: Pick<User, 'email' | 'name'>
  appUrl: string
}

export function AdminReviewEmail({ submission, submitter, appUrl }: AdminReviewProps) {
  const submitterName = submitter.name || submitter.email

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#1a1a2e', padding: '24px', borderRadius: '8px 8px 0 0' }}>
        <h1 style={{ color: '#ffffff', margin: 0, fontSize: '20px' }}>Huntington Steel</h1>
        <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: '13px' }}>
          Digital Signage Content Management
        </p>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px' }}>
        <h2 style={{ color: '#1a1a2e', marginTop: 0 }}>New content awaiting your review</h2>
        <p style={{ color: '#64748b' }}>
          A new submission requires your approval before it goes live on the displays.
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
                <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px' }}>
                  Submitted by
                </td>
                <td style={{ padding: '4px 0', color: '#1a1a2e', fontSize: '13px' }}>
                  {submitterName} ({submitter.email})
                </td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px' }}>
                  Content type
                </td>
                <td style={{ padding: '4px 0', color: '#1a1a2e', fontSize: '13px' }}>
                  {submission.content_type}
                </td>
              </tr>
              {submission.description && (
                <tr>
                  <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px' }}>
                    Description
                  </td>
                  <td style={{ padding: '4px 0', color: '#1a1a2e', fontSize: '13px' }}>
                    {submission.description}
                  </td>
                </tr>
              )}
              {submission.reviewer_notes && (
                <tr>
                  <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px' }}>
                    Notes for reviewer
                  </td>
                  <td
                    style={{
                      padding: '4px 0',
                      color: '#1a1a2e',
                      fontSize: '13px',
                      fontStyle: 'italic',
                    }}
                  >
                    {submission.reviewer_notes}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <a
          href={`${appUrl}/dashboard/admin`}
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
          Review in Admin Panel
        </a>
      </div>
    </div>
  )
}
