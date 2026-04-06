'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { CommunityUpload } from '@/types'

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ upload, onClose }: { upload: CommunityUpload; onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const copyUrl = () => navigator.clipboard.writeText(upload.file_url)

  const download = () => {
    const a = document.createElement('a')
    a.href = upload.file_url
    a.download = upload.file_name
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        <div className="relative bg-gray-950 flex items-center justify-center" style={{ minHeight: 320, maxHeight: '65vh' }}>
          {upload.content_type === 'image' ? (
            <img
              src={upload.file_url}
              alt={upload.caption || upload.submitter_name}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: '65vh' }}
            />
          ) : (
            <video
              src={upload.file_url}
              controls
              className="max-w-full"
              style={{ maxHeight: '65vh' }}
            />
          )}
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Details + actions */}
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{upload.submitter_name}</p>
            {upload.caption && <p className="text-sm text-gray-500 mt-0.5">{upload.caption}</p>}
            <p className="text-xs text-gray-400 mt-1 capitalize">
              {upload.content_type} · {upload.file_name}
              {upload.file_size_bytes ? ` · ${(upload.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Open in new tab */}
            <a
              href={upload.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Open
            </a>
            {/* Copy URL */}
            <CopyButton url={upload.file_url} />
            {/* Download */}
            <button
              onClick={download}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1a1a2e] hover:bg-[#16213e] text-white text-xs font-medium rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          Copy URL
        </>
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LibraryManager() {
  const [uploads, setUploads] = useState<CommunityUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CommunityUpload | null>(null)

  const fetchUploads = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/community-uploads')
      const json = await res.json()
      setUploads(json.data || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { fetchUploads() }, [])

  const handleRemove = async (id: string) => {
    await fetch(`/api/community-uploads/${id}`, { method: 'DELETE' })
    setUploads((prev) => prev.filter((u) => u.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const closeModal = useCallback(() => setSelected(null), [])

  const filtered = search.trim()
    ? uploads.filter(
        (u) =>
          u.submitter_name.toLowerCase().includes(search.toLowerCase()) ||
          (u.caption ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : uploads

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/community`
    : '/community'

  return (
    <div className="space-y-6">
      {selected && <Lightbox upload={selected} onClose={closeModal} />}

      {/* Share link banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-900">Employee submission link</p>
          <p className="text-xs text-blue-700 mt-0.5">Share this with anyone to let them submit photos directly to the library.</p>
        </div>
        <a
          href="/community"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Open form
        </a>
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          Copy link
        </button>
      </div>

      {/* Stats + search */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{uploads.length}</span>{' '}
          photo{uploads.length !== 1 ? 's' : ''} submitted
        </p>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or caption..."
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] w-56"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-gray-400 text-sm py-12 text-center">Loading submissions...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-gray-200">
          <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <p className="text-gray-400 text-sm">
            {search ? 'No photos match your search.' : 'No photos submitted yet.'}
          </p>
          {!search && <p className="text-gray-400 text-xs mt-1">Share the link above with employees to get started.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((upload) => (
            <div key={upload.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden group relative">
              {/* Thumbnail — click to open lightbox */}
              <button
                type="button"
                onClick={() => setSelected(upload)}
                className="block w-full text-left focus:outline-none"
              >
                <div className="relative w-full aspect-video bg-gray-100">
                  {upload.content_type === 'image' ? (
                    <Image
                      src={upload.file_url}
                      alt={upload.caption || upload.submitter_name}
                      fill
                      className="object-cover group-hover:opacity-90 transition-opacity"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-900">
                      <svg className="w-10 h-10 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-gray-900 text-xs font-medium px-2.5 py-1 rounded-full shadow">
                      View
                    </span>
                  </div>
                </div>
              </button>

              {/* Info row */}
              <div className="px-3 py-2">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{upload.submitter_name}</p>
                    {upload.caption && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{upload.caption}</p>
                    )}
                  </div>
                  {/* Quick actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={upload.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in new tab"
                      className="p-1 text-gray-400 hover:text-gray-700 transition-colors rounded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(upload.id) }}
                      title="Remove photo"
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
