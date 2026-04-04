'use client'

import { useState } from 'react'

export default function DesignRequestPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [goLiveDate, setGoLiveDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!email && !phone) {
      setFieldErrors({ email: ['Provide at least an email address or phone number'] })
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
