'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function CommunityUploadPage() {
  const [name, setName] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    const isImage = f.type.startsWith('image/')
    const isVideo = f.type.startsWith('video/')
    if (!isImage && !isVideo) {
      setErrorMsg('Only image and video files are supported.')
      return
    }
    const maxMB = isImage ? 20 : 500
    if (f.size > maxMB * 1024 * 1024) {
      setErrorMsg(`File is too large. Max size is ${maxMB} MB.`)
      return
    }
    setErrorMsg(null)
    setFile(f)
    if (isImage) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setErrorMsg('Please enter your name.'); return }
    if (!file) { setErrorMsg('Please select a photo or video to upload.'); return }
    setErrorMsg(null)
    setState('uploading')

    const fd = new FormData()
    fd.append('file', file)
    fd.append('submitter_name', name.trim())
    if (caption.trim()) fd.append('caption', caption.trim())

    try {
      const res = await fetch('/api/community-uploads', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error || 'Upload failed. Please try again.')
        setState('error')
        return
      }
      setState('success')
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setState('error')
    }
  }

  const reset = () => {
    setName('')
    setCaption('')
    setFile(null)
    setPreview(null)
    setErrorMsg(null)
    setState('idle')
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanks, {name}!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your photo has been added to the Huntington Steel community library. Heather may use it in upcoming content on our displays.
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#1a1a2e] text-white text-sm font-medium rounded-lg hover:bg-[#16213e] transition-colors"
          >
            Submit another photo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="w-12 h-12 bg-[#1a1a2e]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-[#1a1a2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Share a Photo</h1>
          <p className="text-gray-500 text-sm mt-1.5">
            Submit a project photo, job site shot, or team moment to be featured on our digital displays.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Your Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last name"
              required
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent placeholder:text-gray-300"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Caption <span className="text-gray-300 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's in this photo? Where was it taken?"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent placeholder:text-gray-300"
            />
          </div>

          {/* File drop zone */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Photo or Video <span className="text-red-400">*</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors ${
                isDragging ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {file ? (
                <div className="p-4">
                  {preview ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 mb-3">
                      <Image src={preview} alt="Preview" fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 py-6 text-[#1a1a2e]">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900 truncate max-w-[220px]">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null) }}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center px-4">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">Drag & drop or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, MP4, MOV — Images up to 20 MB, Videos up to 500 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={state === 'uploading' || !file || !name.trim()}
            className="w-full py-3 bg-[#1a1a2e] text-white font-semibold text-sm rounded-xl hover:bg-[#16213e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {state === 'uploading' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              'Submit Photo'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
