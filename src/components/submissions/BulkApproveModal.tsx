'use client'

import { useState, useEffect } from 'react'
import type { Device, BulkApproveResult } from '@/types'

interface Props {
  selectedIds: string[]
  onClose: () => void
  onComplete: (result: BulkApproveResult) => void
}

export function BulkApproveModal({ selectedIds, onClose, onComplete }: Props) {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkApproveResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/devices?active=true')
      .then((r) => r.json())
      .then((json) => {
        const d: Device[] = json.data || []
        setDevices(d)
        setSelectedDeviceIds(d.map((dev) => dev.id)) // pre-select all
      })
      .catch(console.error)
  }, [])

  const toggleDevice = (id: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const handleApprove = async () => {
    if (selectedDeviceIds.length === 0) {
      setError('Select at least one display device.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/submissions/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, target_devices: selectedDeviceIds }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed'); return }
      setResult(json.data)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={result ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {result ? (
          <>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Bulk Approve Complete</h3>
              <p className="text-gray-500 text-sm mt-1">
                {result.approved} submission{result.approved !== 1 ? 's' : ''} approved successfully.
              </p>
              {result.errors.length > 0 && (
                <div className="mt-3 text-left p-3 bg-red-50 rounded-lg">
                  <p className="text-xs font-semibold text-red-700 mb-1">{result.errors.length} failed:</p>
                  {result.errors.map((e) => (
                    <p key={e.id} className="text-xs text-red-600">{e.error}</p>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => onComplete(result)}
              className="w-full py-2.5 bg-[#1a1a2e] text-white text-sm font-semibold rounded-xl hover:bg-[#16213e] transition-colors"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Approve {selectedIds.length} Submissions</h3>
              <p className="text-gray-500 text-sm mt-1">Choose which displays to publish to. All selected submissions will be approved together.</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Target Displays</p>
              <div className="space-y-2">
                {devices.map((device) => (
                  <label key={device.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedDeviceIds.includes(device.id) ? 'border-[#1a1a2e] bg-slate-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedDeviceIds.includes(device.id)}
                      onChange={() => toggleDevice(device.id)}
                      className="w-4 h-4 rounded text-[#1a1a2e] focus:ring-[#1a1a2e]"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{device.name}</p>
                      {device.location && <p className="text-xs text-gray-400">{device.location}</p>}
                    </div>
                  </label>
                ))}
              </div>
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={loading || selectedDeviceIds.length === 0}
                className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Approving...' : `Approve ${selectedIds.length}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
