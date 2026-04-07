/**
 * Google Chat — CMS Alerts webhook notifications
 *
 * Posts card messages to the "CMS Alerts" space whenever action is needed.
 * All functions are fire-and-forget — failures are logged but never throw.
 */

const WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL

async function postToChat(payload: object): Promise<void> {
  if (!WEBHOOK_URL) {
    console.warn('[Chat] GOOGLE_CHAT_WEBHOOK_URL not set — skipping')
    return
  }
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`[Chat] Webhook returned ${res.status}: ${text}`)
    }
  } catch (err) {
    console.error('[Chat] Failed to post notification:', err)
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hunting-cms.vercel.app'

// ── New submission pending review ─────────────────────────────────────────────
export async function notifyNewSubmission(opts: {
  submitterName: string
  title: string
  submissionId: string
  contentType: string
}): Promise<void> {
  await postToChat({
    cardsV2: [{
      cardId: 'new-submission',
      card: {
        header: {
          title: '📋 New Submission — Review Needed',
          subtitle: `From ${opts.submitterName}`,
        },
        sections: [{
          widgets: [
            {
              decoratedText: {
                topLabel: 'Title',
                text: opts.title,
              },
            },
            {
              decoratedText: {
                topLabel: 'Type',
                text: opts.contentType.charAt(0).toUpperCase() + opts.contentType.slice(1),
              },
            },
            {
              buttonList: {
                buttons: [{
                  text: 'Review Now →',
                  onClick: {
                    openLink: { url: `${APP_URL}/dashboard/admin` },
                  },
                }],
              },
            },
          ],
        }],
      },
    }],
  })
}

// ── New design request ────────────────────────────────────────────────────────
export async function notifyNewDesignRequest(opts: {
  requesterName: string
  message: string
  requestId: string
  urgency?: string | null
}): Promise<void> {
  const urgencyLabel = opts.urgency === 'asap' ? '🔴 ASAP'
    : opts.urgency === 'by_date' ? '🟡 By Date'
    : '🟢 Flexible'

  await postToChat({
    cardsV2: [{
      cardId: 'new-design-request',
      card: {
        header: {
          title: '🎨 New Design Request',
          subtitle: `From ${opts.requesterName}`,
        },
        sections: [{
          widgets: [
            {
              decoratedText: {
                topLabel: 'Request',
                text: opts.message.length > 120 ? opts.message.slice(0, 120) + '…' : opts.message,
                wrapText: true,
              },
            },
            {
              decoratedText: {
                topLabel: 'Urgency',
                text: urgencyLabel,
              },
            },
            {
              buttonList: {
                buttons: [{
                  text: 'View Request →',
                  onClick: {
                    openLink: { url: `${APP_URL}/dashboard/design-requests` },
                  },
                }],
              },
            },
          ],
        }],
      },
    }],
  })
}

// ── Submission approved ───────────────────────────────────────────────────────
export async function notifySubmissionApproved(opts: {
  submitterName: string
  title: string
  reviewerName: string
}): Promise<void> {
  await postToChat({
    cardsV2: [{
      cardId: 'submission-approved',
      card: {
        header: {
          title: '✅ Submission Approved',
          subtitle: `Reviewed by ${opts.reviewerName}`,
        },
        sections: [{
          widgets: [{
            decoratedText: {
              topLabel: 'Content',
              text: `"${opts.title}" by ${opts.submitterName}`,
            },
          }],
        }],
      },
    }],
  })
}

// ── Submission rejected ───────────────────────────────────────────────────────
export async function notifySubmissionRejected(opts: {
  submitterName: string
  title: string
  feedback: string | null
  reviewerName: string
}): Promise<void> {
  await postToChat({
    cardsV2: [{
      cardId: 'submission-rejected',
      card: {
        header: {
          title: '❌ Submission Rejected',
          subtitle: `Reviewed by ${opts.reviewerName}`,
        },
        sections: [{
          widgets: [
            {
              decoratedText: {
                topLabel: 'Content',
                text: `"${opts.title}" by ${opts.submitterName}`,
              },
            },
            ...(opts.feedback ? [{
              decoratedText: {
                topLabel: 'Feedback',
                text: opts.feedback,
                wrapText: true,
              },
            }] : []),
          ],
        }],
      },
    }],
  })
}
