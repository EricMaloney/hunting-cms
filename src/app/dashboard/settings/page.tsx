'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Prefs {
  submission_reviewed: boolean
  design_request: boolean
  expiry_alert: boolean
  comment_added: boolean
  new_submission: boolean
}

const DEFAULT_PREFS: Prefs = {
  submission_reviewed: true,
  design_request: true,
  expiry_alert: true,
  comment_added: true,
  new_submission: true,
}

interface ToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 mr-4">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
          checked ? 'bg-[#1a1a2e]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const role = session?.user?.role || 'user'
  const isAdmin = role === 'admin'
  const isElevated = isAdmin || role === 'lead'

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setPrefs({ ...DEFAULT_PREFS, ...json.data })
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to save preferences.')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save. Check your connection.')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof Prefs) => (val: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: val }))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
        <p className="text-gray-500 mt-1">Choose which email notifications you receive.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-xl">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
            Loading preferences...
          </div>
        ) : (
          <>
            <Toggle
              label="My submission reviewed"
              description="Get emailed when your submission is approved or rejected."
              checked={prefs.submission_reviewed}
              onChange={set('submission_reviewed')}
            />
            <Toggle
              label="Expiring content alerts"
              description="Get emailed when your live content is expiring within 7 days."
              checked={prefs.expiry_alert}
              onChange={set('expiry_alert')}
            />
            <Toggle
              label="Comment notifications"
              description="Get emailed when someone comments on your submission."
              checked={prefs.comment_added}
              onChange={set('comment_added')}
            />
            {isElevated && (
              <Toggle
                label="Design request notifications"
                description="Get emailed when a new design request is submitted."
                checked={prefs.design_request}
                onChange={set('design_request')}
              />
            )}
            {isAdmin && (
              <Toggle
                label="New submission notifications"
                description="Get emailed when any user submits new content for review."
                checked={prefs.new_submission}
                onChange={set('new_submission')}
              />
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-white text-sm font-semibold rounded-lg hover:bg-[#16213e] disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                Save Preferences
              </button>
              {saved && (
                <span className="text-sm text-green-600 font-medium">Saved!</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
