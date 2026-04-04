'use client'

import { useState } from 'react'
import Image from 'next/image'
import { format, formatDistanceToNow } from 'date-fns'
import type { Submission } from '@/types'
import { StatusBadge } from './StatusBadge'
import { formatFileSize } from '@/lib/validation/media-validator'

interface SubmissionCardProps {
  submission: Submission
  isAdmin?: boolean
  onReview?: (submission: Submission) => void
  onDelete?: (id: string) => void
}

export function SubmissionCard({ submission, isAdmin, onReview, onDelete }: SubmissionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isImage = submission.content_type === 'image'
  const isVideo = submission.content_type === 'video'

  // Non-admins can only delete their own rejected/expired submissions
  // Users can pull back anything that hasn't been published yet
  const canDelete = isAdmin || !['approved', 'live'].includes(submission.status)

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(true)
  }

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleting(true)
    try {
      const res = await fetch(`/api/submissions/${submission.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDelete?.(submission.id)
      }
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(false)
  }

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-150 ${
        onReview ? 'hover:border-gray-300 hover:shadow-sm cursor-pointer' : ''
      }`}
      onClick={onReview ? () => onReview(submission) : undefined}
    >
      <div className="flex gap-0">
        {/* Thumbnail */}
        <div className="w-40 h-32 bg-gray-100 shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-0">
            {isVideo ? (
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-1">
                  <svg className="w-6 h-6 text-gray-400 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-400">Video</span>
              </div>
            ) : (
              <div className="text-center">
                <svg className="w-8 h-8 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            )}
          </div>

          {isImage && submission.file_url && (
            <Image
              src={submission.file_url}
              alt={submission.title}
              fill
              className="object-cover z-10"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}

          <div className="absolute top-2 left-2 z-20">
            <span className="inline-block px-1.5 py-0.5 bg-black/60 text-white text-xs rounded capitalize">
              {submission.content_type}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{submission.title}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge status={submission.status} />
              {canDelete && onDelete && !confirmDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete submission"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Inline delete confirmation */}
          {confirmDelete && (
            <div
              className="flex items-center gap-2 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-xs text-red-700 flex-1">Delete permanently?</span>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? '...' : 'Delete'}
              </button>
              <button
                onClick={handleCancelDelete}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {isAdmin && submission.user && (
            <p className="text-sm text-gray-500 mb-1.5">
              by {submission.user.name || submission.user.email}
            </p>
          )}

          {submission.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-1">{submission.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <span title={format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}>
              {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
            </span>

            {submission.file_size_bytes && (
              <span>{formatFileSize(submission.file_size_bytes)}</span>
            )}

            {submission.width && submission.height && (
              <span>{submission.width}×{submission.height}</span>
            )}

            {submission.schedule_start && (
              <span className="text-blue-500">
                Goes live: {format(new Date(submission.schedule_start), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {/* Publish platform status indicators */}
          {(submission.unifi_publish_status || submission.google_publish_status) && (
            <div className="flex gap-2 mt-2">
              {submission.unifi_publish_status && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  submission.unifi_publish_status === 'published' ? 'bg-green-50 text-green-700'
                  : submission.unifi_publish_status === 'failed' ? 'bg-red-50 text-red-700'
                  : 'bg-gray-50 text-gray-500'
                }`}>
                  UniFi: {submission.unifi_publish_status}
                </span>
              )}
              {submission.google_publish_status && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  submission.google_publish_status === 'published' ? 'bg-green-50 text-green-700'
                  : submission.google_publish_status === 'failed' ? 'bg-red-50 text-red-700'
                  : 'bg-gray-50 text-gray-500'
                }`}>
                  Slides: {submission.google_publish_status}
                </span>
              )}
            </div>
          )}

          {/* Rejection feedback */}
          {submission.status === 'rejected' && submission.admin_feedback && (
            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
              <span className="font-medium">Feedback: </span>
              {submission.admin_feedback}
            </div>
          )}

          {/* Click hint for admin */}
          {isAdmin && onReview && (
            <div className="mt-2">
              <span className="text-xs text-gray-400">
                {submission.status === 'pending' ? 'Click to review' : 'Click to view details'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
