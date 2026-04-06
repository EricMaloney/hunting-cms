'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import type { Submission, SubmissionStatus } from '@/types'
import { SubmissionCard } from './SubmissionCard'
import { ApprovalPanel } from '@/components/admin/ApprovalPanel'

interface SubmissionListProps {
  userId?: string
  isAdmin: boolean
  isLead?: boolean
  currentUserId?: string
  currentUserName?: string | null
}

const STATUS_TABS: { label: string; value: SubmissionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Live', value: 'live' },
  { label: 'Expired', value: 'expired' },
]

const CLEARABLE_STATUSES: (SubmissionStatus | 'all')[] = ['rejected', 'expired']

type SortField = 'date_desc' | 'date_asc' | 'title_asc'

interface Filters {
  userId: string
  contentType: string
  dateFrom: string
  dateTo: string
  sort: SortField
}

const DEFAULT_FILTERS: Filters = {
  userId: '',
  contentType: '',
  dateFrom: '',
  dateTo: '',
  sort: 'date_desc',
}

function FiltersBar({
  filters,
  onChange,
  submitters,
  resultCount,
  totalCount,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  submitters: { id: string; name: string | null; email: string }[]
  resultCount: number
  totalCount: number
}) {
  const [open, setOpen] = useState(false)
  const hasActiveFilters =
    filters.userId || filters.contentType || filters.dateFrom || filters.dateTo || filters.sort !== 'date_desc'

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            hasActiveFilters
              ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          Filter & Sort
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear filters
          </button>
        )}

        {hasActiveFilters && resultCount !== totalCount && (
          <span className="text-xs text-gray-400">
            Showing {resultCount} of {totalCount}
          </span>
        )}
      </div>

      {open && (
        <div className="mt-2 p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* User filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Submitted by</label>
              <select
                value={filters.userId}
                onChange={(e) => onChange({ ...filters, userId: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] bg-white"
              >
                <option value="">All users</option>
                {submitters.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Content type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Content type</label>
              <select
                value={filters.contentType}
                onChange={(e) => onChange({ ...filters, contentType: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] bg-white"
              >
                <option value="">All types</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Sort by</label>
            <div className="flex gap-2">
              {([
                { value: 'date_desc', label: 'Newest first' },
                { value: 'date_asc', label: 'Oldest first' },
                { value: 'title_asc', label: 'Title A–Z' },
              ] as { value: SortField; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ ...filters, sort: opt.value })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    filters.sort === opt.value
                      ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SubmissionList({ isAdmin, isLead = false, currentUserId, currentUserName }: SubmissionListProps) {
  const canSeeAll = isAdmin || isLead
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SubmissionStatus | 'all'>('all')
  const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null)
  const [bulkClearing, setBulkClearing] = useState(false)
  const [confirmBulkClear, setConfirmBulkClear] = useState(false)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ per_page: '200' })
      if (activeTab !== 'all') params.set('status', activeTab)

      const res = await fetch(`/api/submissions?${params}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to load submissions')
        return
      }

      setSubmissions(json.data?.submissions || [])
    } catch {
      setError('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  // Reset filters when switching tabs
  useEffect(() => {
    setFilters(DEFAULT_FILTERS)
    setConfirmBulkClear(false)
  }, [activeTab])

  const handleDelete = (id: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id))
  }

  const handleReviewComplete = () => {
    setReviewingSubmission(null)
    fetchSubmissions()
  }

  // Unique submitters extracted from current result set (admin/lead)
  const submitters = useMemo(() => {
    if (!canSeeAll) return []
    const seen = new Map<string, { id: string; name: string | null; email: string }>()
    for (const s of submissions) {
      if (s.user && !seen.has(s.user.id)) {
        seen.set(s.user.id, { id: s.user.id, name: s.user.name, email: s.user.email })
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      (a.name || a.email).localeCompare(b.name || b.email)
    )
  }, [submissions, canSeeAll])

  // Apply filters + sort
  const filteredSubmissions = useMemo(() => {
    let list = [...submissions]

    // Status sort (pending first) when no custom sort
    if (canSeeAll && filters.sort === 'date_desc') {
      list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (b.status === 'pending' && a.status !== 'pending') return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    if (filters.userId) {
      list = list.filter((s) => s.user?.id === filters.userId)
    }

    if (filters.contentType) {
      list = list.filter((s) => s.content_type === filters.contentType)
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom)
      from.setHours(0, 0, 0, 0)
      list = list.filter((s) => new Date(s.created_at) >= from)
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59, 999)
      list = list.filter((s) => new Date(s.created_at) <= to)
    }

    // Apply sort (skip if already sorted above)
    if (filters.sort === 'date_asc') {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (filters.sort === 'title_asc') {
      list.sort((a, b) => a.title.localeCompare(b.title))
    }

    return list
  }, [submissions, filters, canSeeAll])

  const handleBulkClear = async () => {
    setBulkClearing(true)
    setConfirmBulkClear(false)
    const toDelete = filteredSubmissions.map((s) => s.id)
    await Promise.allSettled(
      toDelete.map((id) => fetch(`/api/submissions/${id}`, { method: 'DELETE' }))
    )
    setSubmissions((prev) => prev.filter((s) => !toDelete.includes(s.id)))
    setBulkClearing(false)
  }

  const countByStatus = submissions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {})

  const canBulkClear =
    isAdmin && CLEARABLE_STATUSES.includes(activeTab) && filteredSubmissions.length > 0

  return (
    <>
      {/* Status tabs + bulk action */}
      <div className="flex items-center justify-between gap-4 mb-4 border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const count = tab.value === 'all' ? submissions.length : countByStatus[tab.value] || 0
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative -mb-px border-b-2 whitespace-nowrap ${
                  activeTab === tab.value
                    ? 'text-[#1a1a2e] border-[#1a1a2e] bg-white'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {count > 0 && tab.value !== 'all' && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.value ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {canBulkClear && (
          <div className="shrink-0 pb-px flex items-center gap-2">
            {confirmBulkClear ? (
              <>
                <span className="text-xs text-red-600">
                  Delete {filteredSubmissions.length} {activeTab}?
                </span>
                <button
                  onClick={handleBulkClear}
                  disabled={bulkClearing}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {bulkClearing ? 'Clearing...' : 'Yes, delete all'}
                </button>
                <button
                  onClick={() => setConfirmBulkClear(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmBulkClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Clear all {activeTab}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter bar for admin + lead */}
      {canSeeAll && !loading && submissions.length > 0 && (
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          submitters={submitters}
          resultCount={filteredSubmissions.length}
          totalCount={submissions.length}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            Loading submissions...
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={fetchSubmissions} className="ml-2 underline">Try again</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredSubmissions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h3 className="text-gray-500 font-medium mb-1">
            {submissions.length === 0
              ? activeTab === 'all' ? 'No submissions yet' : `No ${activeTab} submissions`
              : 'No results match your filters'}
          </h3>
          {submissions.length > 0 && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-sm text-[#1a1a2e] underline mt-1"
            >
              Clear filters
            </button>
          )}
          {!isAdmin && activeTab === 'all' && submissions.length === 0 && (
            <p className="text-gray-400 text-sm mb-4">Submit your first piece of content to get started.</p>
          )}
          {!isAdmin && (
            <Link
              href="/dashboard/submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-white text-sm font-medium rounded-lg hover:bg-[#16213e] transition-colors mt-3"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Submit Content
            </Link>
          )}
        </div>
      )}

      {/* List */}
      {!loading && !error && filteredSubmissions.length > 0 && (
        <div className="space-y-3">
          {filteredSubmissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              isAdmin={isAdmin}
              isLead={isLead}
              currentUserId={currentUserId}
              onReview={isAdmin ? setReviewingSubmission : undefined}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Approval / Detail panel */}
      {reviewingSubmission && (
        <ApprovalPanel
          submission={reviewingSubmission}
          onClose={() => setReviewingSubmission(null)}
          onComplete={handleReviewComplete}
          onDelete={(id) => {
            handleDelete(id)
            setReviewingSubmission(null)
          }}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}
    </>
  )
}
