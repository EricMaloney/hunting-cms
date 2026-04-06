'use client'

import { useState, useRef } from 'react'

const CONTENT_CATEGORIES = [
  'Announcement',
  'Safety Reminder',
  'Recognition',
  'Event',
  'Training',
  'Promotion',
  'General Info',
]

const URGENCY_OPTIONS: { value: 'asap' | 'by_date' | 'flexible'; label: string; desc: string }[] = [
  { value: 'asap', label: 'ASAP', desc: 'As soon as possible' },
  { value: 'by_date', label: 'By go-live date', desc: 'Ready by the date specified' },
  { value: 'flexible', label: 'Flexible', desc: 'No rush, whenever works' },
]

const AUDIENCE_OPTIONS = [
  { value: 'Huntington Office', label: 'Huntington Office', enabled: true },
  { value: 'Huntington Shop', label: 'Huntington Shop', enabled: true },
  { value: 'Annex', label: 'Annex', enabled: false },
  { value: 'Pikeville', label: 'Pikeville', enabled: false },
  { value: 'Morgantown', label: 'Morgantown', enabled: false },
]

interface ReferenceFile {
  url: string
  name: string
  size: number
}

export default function DesignRequestPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [goLiveDate, setGoLiveDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [contentCategory, setContentCategory] = useState('')
  const [urgency, setUrgency] = useState<'asap' | 'by_date' | 'flexible' | ''>('')
  const [audience, setAudience] = useState<string[]>([])
  const [referenceFile, setReferenceFile] = useState<ReferenceFile | null>(null)
  const [uploadingRef, setUploadingRef] = useState(false)
  const [refUploadError, setRefUploadError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleAudience = (val: string) => {
    setAudience((prev) =>
      prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val]
    )
  }

  const handleReferenceUpload = async (file: File) => {
    setRefUploadError(null)
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) {
      setRefUploadError('Only images and PDFs are allowed.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setRefUploadError('File must be 10MB or less.')
      return
    }
    setUploadingRef(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/design-requests/reference-upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setRefUploadError(json.error || 'Upload failed.')
        return
      }
      setReferenceFile(json.data)
    } catch {
      setRefUploadError('Upload failed. Please try again.')
    } finally {
      setUploadingRef(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleReferenceUpload(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!email && !phone) {
      setFieldErrors({ email: ['Provide at least an email address or phone number'] })
      return
    }
    if (!contentCategory) {
      setFieldErrors({ content_category: ['Please select a content category'] })
      return
    }
    if (!urgency) {
      setFieldErrors({ urgency: ['Please select an urgency level'] })
      return
    }
    if (audience.length === 0) {
      setFieldErrors({ audience: ['Please select at least one audience'] })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/design-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email || undefined,
          phone: phone || undefined,
          message,
          go_live_date: goLiveDate || null,
          end_date: hasEndDate && endDate ? endDate : null,
          content_category: contentCategory,
          urgency,
          audience,
          reference_url: referenceFile?.url || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.data?.fieldErrors) {
          setFieldErrors(json.data.fieldErrors)
        } else {
          setError(json.error || 'Something went wrong. Please try again.')
        }
        return
      }
      setSuccess(true)
    } catch {
      setError('Unable to submit. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-500 text-sm">
            Your design request has been received. Our team will reach out if we have any questions.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#1a1a2e] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 leading-tight">Huntington Steel</p>
              <p className="text-gray-500 text-xs">Digital Signage</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Request Display Content</h1>
          <p className="text-gray-500 text-sm mt-2">
            Need something on the screens? Tell us what you&apos;re thinking and our team will create it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="John Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent"
            />
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Contact Info <span className="text-red-500">*</span>
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Provide at least one — we&apos;ll use this only if we have questions about your request.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@huntingtonsteel.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent"
                />
              </div>
            </div>
            {fieldErrors.email && (
              <p className="mt-2 text-xs text-red-500">{fieldErrors.email[0]}</p>
            )}
          </div>

          {/* Content Category */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Category <span className="text-red-500">*</span>
            </label>
            <select
              value={contentCategory}
              onChange={(e) => setContentCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent bg-white"
            >
              <option value="">Select a category...</option>
              {CONTENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {fieldErrors.content_category && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.content_category[0]}</p>
            )}
          </div>

          {/* Urgency */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Urgency <span className="text-red-500">*</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUrgency(opt.value)}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 text-center transition-all ${
                    urgency === opt.value
                      ? 'border-[#1a1a2e] bg-slate-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xs font-semibold text-gray-900">{opt.label}</span>
                  <span className="text-xs text-gray-400 mt-0.5 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
            {fieldErrors.urgency && (
              <p className="mt-2 text-xs text-red-500">{fieldErrors.urgency[0]}</p>
            )}
          </div>

          {/* Audience */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Audience <span className="text-red-500">*</span>
            </h3>
            <p className="text-xs text-gray-400 mb-3">Select all locations where this content should display.</p>
            <div className="space-y-2">
              {AUDIENCE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    opt.enabled
                      ? audience.includes(opt.value)
                        ? 'border-[#1a1a2e] bg-slate-50 cursor-pointer'
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={opt.enabled && audience.includes(opt.value)}
                    onChange={() => opt.enabled && toggleAudience(opt.value)}
                    disabled={!opt.enabled}
                    className="w-4 h-4 rounded border-gray-300 text-[#1a1a2e] focus:ring-[#1a1a2e]"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                  {!opt.enabled && (
                    <span className="text-xs text-gray-400 italic">(coming soon)</span>
                  )}
                </label>
              ))}
            </div>
            {fieldErrors.audience && (
              <p className="mt-2 text-xs text-red-500">{fieldErrors.audience[0]}</p>
            )}
          </div>

          {/* Message */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              What do you need? <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Describe the message, announcement, or content you&apos;d like displayed. Be as specific as you can.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              placeholder="e.g. Safety reminder about wearing PPE in the shop — something bold and easy to read at a distance..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent resize-none"
            />
          </div>

          {/* Reference Upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Reference (optional)</h3>
            <p className="text-xs text-gray-400 mb-3">
              Upload an image or PDF to give us visual context — a photo, example, or sketch.
            </p>

            {referenceFile ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-sm text-gray-700 truncate">{referenceFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReferenceFile(null)}
                  className="shrink-0 ml-2 text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-[#1a1a2e] bg-slate-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleReferenceUpload(file)
                  }}
                />
                {uploadingRef ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm text-gray-500 font-medium">Drag & drop or click to upload</p>
                    <p className="text-xs text-gray-400 mt-0.5">Images or PDF · Max 10MB</p>
                  </>
                )}
              </div>
            )}
            {refUploadError && (
              <p className="mt-2 text-xs text-red-500">{refUploadError}</p>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Timing (optional)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Desired go-live date</label>
                <input
                  type="date"
                  value={goLiveDate}
                  onChange={(e) => setGoLiveDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent"
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(e) => {
                      setHasEndDate(e.target.checked)
                      if (!e.target.checked) setEndDate('')
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#1a1a2e] focus:ring-[#1a1a2e]"
                  />
                  <div>
                    <span className="text-xs font-medium text-gray-700">Set an end date</span>
                    <p className="text-xs text-gray-400">Content will be removed automatically after this date.</p>
                  </div>
                </label>
                {hasEndDate && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#1a1a2e] text-white text-sm font-semibold rounded-xl hover:bg-[#16213e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
