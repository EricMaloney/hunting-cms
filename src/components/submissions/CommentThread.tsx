'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface CommentUser {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface Comment {
  id: string
  message: string
  created_at: string
  user: CommentUser
}

interface CommentThreadProps {
  submissionId: string
  currentUserId: string
  currentUserName: string | null
}

export function CommentThread({ submissionId, currentUserId, currentUserName }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [message, setMessage] = useState('')
  const [postError, setPostError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/submissions/${submissionId}/comments`)
      .then((r) => r.json())
      .then((json) => setComments(json.data || []))
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false))
  }, [submissionId])

  const handlePost = async () => {
    if (!message.trim()) return
    setPostError(null)

    // Optimistic update
    const optimistic: Comment = {
      id: `optimistic-${Date.now()}`,
      message: message.trim(),
      created_at: new Date().toISOString(),
      user: { id: currentUserId, name: currentUserName, email: '', image: null },
    }
    setComments((prev) => [...prev, optimistic])
    setMessage('')
    setPosting(true)

    try {
      const res = await fetch(`/api/submissions/${submissionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: optimistic.message }),
      })
      const json = await res.json()

      if (!res.ok) {
        // Rollback optimistic update
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id))
        setPostError(json.error || 'Failed to post comment')
        setMessage(optimistic.message)
        return
      }

      // Replace optimistic comment with real one
      setComments((prev) => prev.map((c) => (c.id === optimistic.id ? json.data : c)))
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id))
      setPostError('Failed to post comment. Check your connection.')
      setMessage(optimistic.message)
    } finally {
      setPosting(false)
    }
  }

  function getInitial(user: CommentUser) {
    return (user.name || user.email || '?')[0].toUpperCase()
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Comments {comments.length > 0 && `(${comments.length})`}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          Loading...
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No comments yet. Be the first to add one.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isMe = comment.user.id === currentUserId
            return (
              <div key={comment.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#1a1a2e] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {getInitial(comment.user)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${isMe ? 'text-[#1a1a2e]' : 'text-gray-900'}`}>
                      {isMe ? 'You' : (comment.user.name || comment.user.email)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{comment.message}</p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Add a comment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-transparent resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handlePost()
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{message.length}/1000</span>
          <button
            type="button"
            onClick={handlePost}
            disabled={posting || message.trim().length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a2e] text-white text-xs font-semibold rounded-lg hover:bg-[#16213e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {posting ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
            Post Comment
          </button>
        </div>
        {postError && (
          <p className="text-xs text-red-500">{postError}</p>
        )}
      </div>
    </div>
  )
}
