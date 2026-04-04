'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Device, DevicePlatform } from '@/types'
import { DeviceCard } from './DeviceCard'

const addDeviceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  location: z.string().max(200).optional(),
  platform: z.enum(['unifi', 'google_slides', 'other'] as const),
  device_type: z.string().max(50).optional(),
  max_resolution: z
    .string()
    .regex(/^\d+[xX]\d+$/, 'Format: WIDTHxHEIGHT e.g. 1920x1080')
    .optional()
    .or(z.literal('')),
  max_file_size_mb: z.coerce.number().int().positive().max(1000).optional().or(z.literal('')),
  supported_formats_str: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

type AddDeviceValues = z.infer<typeof addDeviceSchema>

const COMMON_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'mp4', 'mov']

export function DevicesManager() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddDeviceValues>({
    resolver: zodResolver(addDeviceSchema),
    defaultValues: { platform: 'unifi' },
  })

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/devices?active=${showInactive ? 'false' : 'true'}`)
      const json = await res.json()
      setDevices(json.data || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const onAddDevice = async (values: AddDeviceValues) => {
    setAddError(null)
    try {
      const formatsStr = values.supported_formats_str || ''
      const supported_formats = formatsStr
        .split(',')
        .map((s) => s.trim().toLowerCase().replace('.', ''))
        .filter(Boolean)

      const payload = {
        name: values.name,
        location: values.location || undefined,
        platform: values.platform as DevicePlatform,
        device_type: values.device_type || undefined,
        max_resolution: values.max_resolution || undefined,
        max_file_size_mb: values.max_file_size_mb ? Number(values.max_file_size_mb) : undefined,
        supported_formats: supported_formats.length > 0 ? supported_formats : undefined,
        notes: values.notes || undefined,
      }

      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok) {
        setAddError(json.error || 'Failed to add device')
        return
      }

      reset()
      setShowAddForm(false)
      fetchDevices()
    } catch {
      setAddError('Unexpected error')
    }
  }

  const activeDevices = devices.filter((d) => d.is_active)
  const inactiveDevices = devices.filter((d) => !d.is_active)

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {activeDevices.length} active device{activeDevices.length !== 1 ? 's' : ''}
            {inactiveDevices.length > 0 && `, ${inactiveDevices.length} inactive`}
          </span>
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-[#1a1a2e] focus:ring-[#1a1a2e]"
            />
            Show inactive
          </label>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-white text-sm font-medium rounded-lg hover:bg-[#16213e] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {showAddForm ? 'Cancel' : 'Add Device'}
        </button>
      </div>

      {/* Add device form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Device</h3>
          <form onSubmit={handleSubmit(onAddDevice)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  placeholder="e.g. Break Room TV"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  {...register('location')}
                  placeholder="e.g. Second Floor East Wing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('platform')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                >
                  <option value="unifi">UniFi (UC Cast)</option>
                  <option value="google_slides">Google Slides</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
                <input
                  {...register('device_type')}
                  placeholder="e.g. uc_cast, uc_cast_lite"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Resolution
                </label>
                <input
                  {...register('max_resolution')}
                  placeholder="e.g. 1920x1080"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
                {errors.max_resolution && (
                  <p className="mt-1 text-xs text-red-500">{errors.max_resolution.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max File Size (MB)
                </label>
                <input
                  {...register('max_file_size_mb')}
                  type="number"
                  placeholder="e.g. 20"
                  min={1}
                  max={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supported Formats
                </label>
                <input
                  {...register('supported_formats_str')}
                  placeholder="e.g. jpg, png, mp4, mov (comma separated)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {COMMON_FORMATS.map((fmt) => (
                    <span
                      key={fmt}
                      className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded"
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Any notes about this device..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] resize-none"
                />
              </div>
            </div>

            {addError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {addError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-white text-sm font-medium rounded-lg hover:bg-[#16213e] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add Device'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); reset(); setAddError(null) }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Device grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400 gap-2 text-sm">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          Loading devices...
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No devices found. Add your first device above.</p>
        </div>
      ) : (
        <>
          {activeDevices.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Active Devices
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDevices.map((device) => (
                  <DeviceCard key={device.id} device={device} onUpdated={fetchDevices} />
                ))}
              </div>
            </div>
          )}

          {showInactive && inactiveDevices.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Inactive Devices
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactiveDevices.map((device) => (
                  <DeviceCard key={device.id} device={device} onUpdated={fetchDevices} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
