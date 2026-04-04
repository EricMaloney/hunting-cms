'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Image from 'next/image'
import type { Submission, Device, ValidationResult } from '@/types'
import { StatusBadge } from '@/components/submissions/StatusBadge'
import { validateFileForDevice, formatFileSize, parseResolution } from '@/lib/validation/media-validator'

interface ApprovalPanelProps {
  submission: Submission
  onClose: () => void
  onComplete: () => void
  onDelete?: (id: string) => void
}

export function ApprovalPanel({ submission, onClose, onComplete, onDelete }: ApprovalPanelProps) {
  const [action, setAction] = useState<'approve' | 'reject' | 'delete' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [allDevices, setAllDevices] = useState<Device[]>([])
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>(submission.target_devices || [])
  const [deviceValidations, setDeviceValidations] = useState<
    Record<string, ValidationResult>
  >({})

  // Fetch all devices (for targeting editor) and validate selected ones
  useEffect(() => {
    fetch('/api/devices?active=false')
      .then((r) => r.json())
      .then((json) => {
        const fetched: Device[] = json.data || []
        setAllDevices(fetched)

        const targetDevices = fetched.filter((d) => selectedDeviceIds.includes(d.id))
        setDevices(targetDevices)

        const validations: Record<string, ValidationResult> = {}
        for (const device of targetDevices) {
          validations[device.id] = validateFileForDevice(
            {
              name: submission.file_name,
              size: submission.file_size_bytes || 0,
              type: submission.file_type || '',
              width: submission.width || undefined,
              height: submission.height || undefined,
            },
            device
          )
        }
        setDeviceValidations(validations)
      })
      .catch(console.error)
  }, [submission, selectedDeviceIds])

  const handleApprove = async () => {
    if (selectedDeviceIds.length === 0) {
      setError('Select at least one target display before approving')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/submissions/${submission.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_devices: selectedDeviceIds }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to approve')
        return
      }
      onComplete()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/submissions/${submission.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to delete')
        return
      }
      onDelete?.(submission.id)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!feedback.trim() || feedback.trim().length < 10) {
      setError('Please provide at least 10 characters of feedback')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/submissions/${submission.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to reject')
        return
      }
      onComplete()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const isImage = submission.content_type === 'image'
  const isVideo = submission.content_type === 'video'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">
              {submission.status === 'pending' ? 'Review Submission' : 'Submission Details'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{submission.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Preview */}
          <div className="bg-gray-900">
            {isImage ? (
              <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                <Image
                  src={submission.file_url}
                  alt={submission.title}
                  fill
                  className="object-contain"
                />
              </div>
            ) : isVideo ? (
              <video
                src={submission.file_url}
                controls
                className="w-full"
                style={{ maxHeight: '300px' }}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400">
                Preview not available
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            {/* Status + meta */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{submission.title}</h3>
                {submission.description && (
                  <p className="text-gray-600 text-sm mt-1">{submission.description}</p>
                )}
              </div>
              <StatusBadge status={submission.status} />
            </div>

            {/* Submitter info */}
            {submission.user && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Submitted by
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a2e] flex items-center justify-center text-white text-sm font-medium">
                    {(submission.user.name || submission.user.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {submission.user.name || submission.user.email}
                    </p>
                    <p className="text-xs text-gray-500">{submission.user.email}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Submitted {format(new Date(submission.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>
            )}

            {/* File details */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                File Details
              </p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Filename</span>
                  <span className="text-gray-900 font-medium truncate ml-2 max-w-40">
                    {submission.file_name}
                  </span>
                </div>
                {submission.file_size_bytes && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Size</span>
                    <span className="text-gray-900 font-medium">
                      {formatFileSize(submission.file_size_bytes)}
                    </span>
                  </div>
                )}
                {submission.width && submission.height && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Resolution</span>
                    <span className="text-gray-900 font-medium">
                      {submission.width}×{submission.height}
                    </span>
                  </div>
                )}
                {submission.width && submission.height && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Aspect Ratio</span>
                    <span className="text-gray-900 font-medium">
                      {(submission.width / submission.height).toFixed(3)}
                      {Math.abs(submission.width / submission.height - 16/9) < 0.05 ? ' (16:9)' : ''}
                    </span>
                  </div>
                )}
                {submission.duration_seconds && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration</span>
                    <span className="text-gray-900 font-medium">
                      {submission.duration_seconds}s
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="text-gray-900 font-medium capitalize">
                    {submission.content_type}
                  </span>
                </div>
              </div>
            </div>

            {/* Schedule */}
            {(submission.schedule_start || submission.schedule_end) && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Schedule
                </p>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  {submission.schedule_start && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Start</span>
                      <span className="text-gray-900 font-medium">
                        {format(new Date(submission.schedule_start), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  )}
                  {submission.schedule_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">End</span>
                      <span className="text-gray-900 font-medium">
                        {format(new Date(submission.schedule_end), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reviewer notes */}
            {submission.reviewer_notes && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Notes from Submitter
                </p>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-800 italic">
                  {submission.reviewer_notes}
                </div>
              </div>
            )}

            {/* Device targeting — admin can change before approving */}
            {allDevices.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Target Displays
                </p>
                <div className="space-y-2">
                  {allDevices.map((device) => {
                    const isChecked = selectedDeviceIds.includes(device.id)
                    return (
                      <label
                        key={device.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isChecked ? 'border-[#1a1a2e] bg-slate-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedDeviceIds((prev) =>
                              e.target.checked
                                ? [...prev, device.id]
                                : prev.filter((id) => id !== device.id)
                            )
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-[#1a1a2e] focus:ring-[#1a1a2e]"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{device.name}</span>
                          {device.location && (
                            <span className="text-xs text-gray-400 ml-2">{device.location}</span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
                {selectedDeviceIds.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">Select at least one display to approve.</p>
                )}
              </div>
            )}

            {/* Device compatibility checks */}
            {devices.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Device Compatibility
                </p>
                <div className="space-y-2">
                  {devices.map((device) => {
                    const v = deviceValidations[device.id]
                    const maxRes = device.max_resolution ? parseResolution(device.max_resolution) : null
                    return (
                      <div
                        key={device.id}
                        className={`p-3 rounded-xl border ${
                          !v
                            ? 'border-gray-200 bg-gray-50'
                            : v.valid && v.warnings.length === 0
                            ? 'border-green-200 bg-green-50'
                            : v.valid
                            ? 'border-yellow-200 bg-yellow-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">
                              {device.name}
                            </span>
                            <span className="text-xs text-gray-400">{device.location}</span>
                          </div>
                          {v && (
                            <span
                              className={`text-xs font-medium ${
                                v.valid ? (v.warnings.length > 0 ? 'text-yellow-600' : 'text-green-600') : 'text-red-600'
                              }`}
                            >
                              {v.valid
                                ? v.warnings.length > 0
                                  ? 'Compatible (with warnings)'
                                  : 'Compatible'
                                : 'Incompatible'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {maxRes && (
                            <div className="flex items-center gap-1.5">
                              <span>Max resolution: {device.max_resolution}</span>
                              {submission.width && submission.height && (
                                <span
                                  className={
                                    submission.width <= maxRes.width &&
                                    submission.height <= maxRes.height
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }
                                >
                                  {submission.width <= maxRes.width &&
                                  submission.height <= maxRes.height
                                    ? '✓'
                                    : '✗'}
                                </span>
                              )}
                            </div>
                          )}
                          {device.max_file_size_mb && submission.file_size_bytes && (
                            <div className="flex items-center gap-1.5">
                              <span>
                                File size limit: {device.max_file_size_mb}MB (file is{' '}
                                {(submission.file_size_bytes / 1024 / 1024).toFixed(1)}MB)
                              </span>
                              <span
                                className={
                                  submission.file_size_bytes <= device.max_file_size_mb * 1024 * 1024
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }
                              >
                                {submission.file_size_bytes <=
                                device.max_file_size_mb * 1024 * 1024
                                  ? '✓'
                                  : '✗'}
                              </span>
                            </div>
                          )}
                        </div>
                        {v && (
                          <>
                            {v.errors.map((err, i) => (
                              <p key={i} className="text-xs text-red-600 mt-1">{err}</p>
                            ))}
                            {v.warnings.map((warn, i) => (
                              <p key={i} className="text-xs text-yellow-700 mt-1">{warn}</p>
                            ))}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action panel - fixed at bottom */}
        <div className="border-t border-gray-200 p-6 shrink-0 bg-white space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Reject feedback */}
          {action === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback for submitter <span className="text-red-500">*</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="Explain what needs to be changed before this content can be approved..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {feedback.length} / 1000 characters (minimum 10)
              </p>
            </div>
          )}

          {/* Delete confirmation */}
          {action === 'delete' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              This will permanently delete the submission and its file. This cannot be undone.
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Pending: Approve + Reject */}
            {submission.status === 'pending' && action === null && (
              <>
                <button
                  onClick={() => setAction('approve')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
                {onDelete && (
                  <button
                    onClick={() => setAction('delete')}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-xl transition-colors"
                    title="Delete submission"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </>
            )}

            {/* Non-pending: just show delete */}
            {submission.status !== 'pending' && action === null && onDelete && (
              <>
                <div className="flex-1" />
                <button
                  onClick={() => setAction('delete')}
                  className="flex items-center gap-2 px-4 py-2.5 text-red-500 border border-red-200 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete Submission
                </button>
              </>
            )}

            {action === 'approve' && (
              <>
                <button
                  onClick={() => setAction(null)}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Approving...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Confirm Approve</>
                  )}
                </button>
              </>
            )}

            {action === 'reject' && (
              <>
                <button
                  onClick={() => { setAction(null); setFeedback(''); setError(null) }}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || feedback.trim().length < 10}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Rejecting...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Confirm Reject</>
                  )}
                </button>
              </>
            )}

            {action === 'delete' && (
              <>
                <button
                  onClick={() => { setAction(null); setError(null) }}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>Delete Permanently</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
