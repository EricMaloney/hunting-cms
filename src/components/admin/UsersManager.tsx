'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { formatDistanceToNow, format } from 'date-fns'
import type { User, UserRole } from '@/types'

interface ManagedUser extends Pick<User, 'id' | 'email' | 'name' | 'image' | 'role' | 'created_at' | 'last_login'> {}

interface Props {
  currentUserId: string
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
      role === 'admin'
        ? 'bg-[#1a1a2e] text-white'
        : 'bg-gray-100 text-gray-600'
    }`}>
      {role === 'admin' ? 'Admin' : 'User'}
    </span>
  )
}

function UserAvatar({ user }: { user: ManagedUser }) {
  const initials = (user.name || user.email).slice(0, 1).toUpperCase()

  if (user.image) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden relative shrink-0 bg-gray-100">
        <Image
          src={user.image}
          alt={user.name || user.email}
          fill
          className="object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>
    )
  }

  return (
    <div className="w-10 h-10 rounded-full bg-[#1a1a2e] flex items-center justify-center shrink-0">
      <span className="text-white text-sm font-semibold">{initials}</span>
    </div>
  )
}

export function UsersManager({ currentUserId }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null)
  const [feedback, setFeedback] = useState<{ id: string; message: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((json) => {
        setUsers(json.data || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load users')
        setLoading(false)
      })
  }, [])

  const initiateRoleChange = (user: ManagedUser, newRole: UserRole) => {
    setConfirmId(user.id)
    setPendingRole(newRole)
    setFeedback(null)
  }

  const cancelRoleChange = () => {
    setConfirmId(null)
    setPendingRole(null)
  }

  const confirmRoleChange = async (userId: string) => {
    if (!pendingRole) return
    setUpdatingId(userId)
    setConfirmId(null)

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: pendingRole }),
      })
      const json = await res.json()

      if (!res.ok) {
        setFeedback({ id: userId, message: json.error || 'Failed to update role', ok: false })
        return
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: pendingRole } : u))
      )
      setFeedback({ id: userId, message: `Role changed to ${pendingRole}`, ok: true })
    } catch {
      setFeedback({ id: userId, message: 'An error occurred', ok: false })
    } finally {
      setUpdatingId(null)
      setPendingRole(null)
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-gray-400 py-10">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
        Loading users...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
    )
  }

  const admins = users.filter((u) => u.role === 'admin')
  const standardUsers = users.filter((u) => u.role === 'user')

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Total Users</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-[#1a1a2e]">{admins.length}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Admins</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-gray-600">{standardUsers.length}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Standard Users</p>
        </div>
      </div>

      {/* User list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All Users</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Users are created automatically on first login. You cannot change your own role.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId
            const isConfirming = confirmId === user.id
            const isUpdating = updatingId === user.id
            const thisFeedback = feedback?.id === user.id ? feedback : null

            return (
              <div key={user.id} className="px-5 py-4">
                <div className="flex items-center gap-4">
                  <UserAvatar user={user} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">
                        {user.name || 'No name'}
                      </span>
                      <RoleBadge role={user.role} />
                      {isCurrentUser && (
                        <span className="text-xs text-gray-400 italic">you</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-400">
                      <span>
                        Joined{' '}
                        <span className="text-gray-500">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </span>
                      </span>
                      {user.last_login && (
                        <span>
                          Last login{' '}
                          <span className="text-gray-500">
                            {formatDistanceToNow(new Date(user.last_login), { addSuffix: true })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role action */}
                  {!isCurrentUser && (
                    <div className="shrink-0 flex items-center gap-2">
                      {thisFeedback && (
                        <span className={`text-xs font-medium ${thisFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
                          {thisFeedback.message}
                        </span>
                      )}

                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">
                            Make {pendingRole === 'admin' ? 'admin' : 'standard user'}?
                          </span>
                          <button
                            onClick={() => confirmRoleChange(user.id)}
                            className="px-3 py-1.5 bg-[#1a1a2e] text-white text-xs font-medium rounded-lg hover:bg-[#16213e] transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={cancelRoleChange}
                            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : isUpdating ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                          Updating...
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            initiateRoleChange(user, user.role === 'admin' ? 'user' : 'admin')
                          }
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            user.role === 'admin'
                              ? 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              : 'text-[#1a1a2e] border-[#1a1a2e]/30 hover:bg-[#1a1a2e]/5'
                          }`}
                        >
                          {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
