'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { CommunityUpload } from '@/types'

interface Props {
  onSelect: (upload: CommunityUpload) => void
  selectedId?: string
}

export function LibraryPicker({ onSelect, selectedId }: Props) {
  const [uploads, setUploads] = useState<CommunityUpload[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/community-uploads')
      .then((r) => r.json())
      .then((json) => setUploads(json.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
        Loading library...
      </div>
    )
  }

  if (uploads.length === 0) {
    return (
      <div className="py-12 text-center rounded-xl border border-dashed border-gray-200">
        <p className="text-gray-400 text-sm">No photos in the library yet.</p>
        <p className="text-gray-400 text-xs mt-1">Employees can submit photos at <strong>/community</strong>.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {uploads.map((upload) => {
        const isSelected = upload.id === selectedId
        return (
          <button
            key={upload.id}
            type="button"
            onClick={() => onSelect(upload)}
            className={`relative rounded-xl border-2 overflow-hidden transition-all text-left ${
              isSelected
                ? 'border-[#1a1a2e] shadow-md'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            {/* Thumbnail */}
            <div className="relative w-full aspect-video bg-gray-100">
              {upload.content_type === 'image' ? (
                <Image
                  src={upload.file_url}
                  alt={upload.caption || upload.submitter_name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Label */}
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-gray-900 truncate">{upload.submitter_name}</p>
              {upload.caption && (
                <p className="text-xs text-gray-500 truncate">{upload.caption}</p>
              )}
              <p className="text-xs text-gray-400 capitalize">{upload.content_type}</p>
            </div>

            {/* Selected check */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-[#1a1a2e] rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
