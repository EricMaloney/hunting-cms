'use client'

import { useState } from 'react'
import type { Device, DevicePlatform } from '@/types'

interface DeviceCardProps {
  device: Device
  onUpdated: () => void
}

const platformLabels: Record<DevicePlatform, string> = {
  unifi: 'UniFi',
  google_slides: 'Google Slides',
  other: 'Other',
}

const platformColors: Record<DevicePlatform, string> = {
  unifi: 'bg-blue-100 text-blue-700',
  google_slides: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-600',
}

export function DeviceCard({ device, onUpdated }: DeviceCardProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: device.name,
    location: device.location || '',
    notes: device.notes || '',
    is_active: device.is_active,
  })

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/devices?id=${device.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to save')
        return
      }
      setEditing(false)
      onUpdated()
    } catch {
      setError('Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/devices?id=${device.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !device.is_active }),
      })
      if (res.ok) onUpdated()
    } catch {
      // Ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`bg-white rounded-xl border p-5 transition-all ${
        device.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{device.name}</h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${platformColors[device.platform]}`}
            >
              {platformLabels[device.platform]}
            </span>
            {!device.is_active && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                Inactive
              </span>
            )}
          </div>
          {device.location && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {device.location}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-xs"
          >
            {editing ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Specs */}
      {!editing && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-3">
          {device.device_type && (
            <div>
              <span className="text-gray-400 text-xs">Type</span>
              <p className="text-gray-700 capitalize">{device.device_type.replace(/_/g, ' ')}</p>
            </div>
          )}
          {device.max_resolution && (
            <div>
              <span className="text-gray-400 text-xs">Max Resolution</span>
              <p className="text-gray-700">{device.max_resolution}</p>
            </div>
          )}
          {device.max_file_size_mb && (
            <div>
              <span className="text-gray-400 text-xs">Max File Size</span>
              <p className="text-gray-700">{device.max_file_size_mb}MB</p>
            </div>
          )}
          {device.supported_formats && device.supported_formats.length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-400 text-xs">Supported Formats</span>
              <p className="text-gray-700">{device.supported_formats.join(', ')}</p>
            </div>
          )}
        </div>
      )}

      {device.notes && !editing && (
        <p className="text-xs text-gray-400 italic mt-2">{device.notes}</p>
      )}

      {/* Edit form */}
      {editing && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Display Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Main Floor, Break Room"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] text-white text-xs font-medium rounded-lg hover:bg-[#16213e] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => { setEditing(false); setError(null) }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toggle active */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleToggleActive}
          disabled={saving}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            device.is_active
              ? 'text-red-600 hover:bg-red-50'
              : 'text-green-600 hover:bg-green-50'
          }`}
        >
          {device.is_active ? 'Deactivate Device' : 'Activate Device'}
        </button>
      </div>
    </div>
  )
}
