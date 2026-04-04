'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { DesignRequest, DesignRequestStatus } from '@/types'

interface Props {
  currentUserId: string
  currentUserName: string | null
}

const STATUS_LABELS: Record<DesignRequestStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_COLORS: Record<DesignRequestStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  submitted: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function DesignRequestQueue({ currentUserId, currentUserName }: Props) {
  const router = useRouter()
  const [requests, setRequests] = useState<DesignRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<DesignRequestStatus | 'all'>('all')
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    try {
      const url = filter === 'all' ? '/api/design-requests' : `/api/design-requests?status=${filter}`
      const res = await fetch(url)
      const json = await res.json()
      setRequests(json.data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    fetchRequests()
  }, [fetchRequests])

  const handleClaim = async (requestId: string) => {
    setClaimingId(requestId)
    try {
      const res = await fetch(`/api/design-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in_progress',
          claimed_by: currentUserId,
          claimed_at: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        await fetchRequests()
      }
    } finally {
      setClaimingId(null)
    }
  }

  const handleSubmitForApproval = (requestId: string) => {
    router.push(`/dashboard/submit?request_id=${requestId}`)
  }

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter)

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'new', 'in_progress', 'submitted', 'approved'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === s
                ? 'bg-[#1a1a2e] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          Loading requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No design requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isClaimedByMe = req.claimed_by === currentUserId
            const isClaimedByOther = req.claimed_by && !isClaimedByMe
            const claimerName = req.claimer?.name || req.claimer?.email || 'Someone'

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 p-5 space-y-3"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{req.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      {req.email && <span>{req.email}</span>}
                      {req.phone && <span>{req.phone}</span>}
                      <span>{timeAgo(req.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 leading-relaxed">{req.message}</p>
                </div>

                {/* Dates */}
                {(req.go_live_date || req.end_date) && (
                  <div className="flex gap-4 text-xs text-gray-500">
                    {req.go_live_date && (
                      <span>Go-live: <span className="font-medium text-gray-700">{formatDate(req.go_live_date)}</span></span>
                    )}
                    {req.end_date && (
                      <span>Ends: <span className="font-medium text-gray-700">{formatDate(req.end_date)}</span></span>
                    )}
                  </div>
                )}

                {/* Action row */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    {isClaimedByMe && (
                      <span className="text-amber-600 font-medium">You started this project</span>
                    )}
                    {isClaimedByOther && (
                      <span>In progress by <span className="font-medium text-gray-600">{claimerName}</span></span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {req.status === 'new' && (
                      <button
                        onClick={() => handleClaim(req.id)}
                        disabled={claimingId === req.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] text-white text-xs font-semibold rounded-lg hover:bg-[#16213e] disabled:opacity-50 transition-all"
                      >
                        {claimingId === req.id ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          </svg>
                        )}
                        Start Project
                      </button>
                    )}
                    {req.status === 'in_progress' && isClaimedByMe && (
                      <button
                        onClick={() => handleSubmitForApproval(req.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Submit for Approval
                      </button>
                    )}
                    {req.status === 'submitted' && req.submission_id && (
                      <span className="text-xs text-purple-600 font-medium">Awaiting review</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
