'use client'

import { signOut } from 'next-auth/react'
import Image from 'next/image'
import type { UserRole } from '@/types'

interface HeaderProps {
  user: {
    name: string | null
    email: string
    image: string | null
    role: UserRole
  }
}

export function Header({ user }: HeaderProps) {
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      {/* Left side - could hold breadcrumbs in future */}
      <div className="flex items-center gap-2">
        {user.role === 'admin' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1a1a2e] text-white text-xs font-medium rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Admin
          </span>
        )}
      </div>

      {/* Right side - user info */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user.name || 'User'}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>

        {/* Avatar */}
        <div className="relative">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || 'User'}
              width={36}
              height={36}
              className="rounded-full ring-2 ring-gray-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#1a1a2e] flex items-center justify-center ring-2 ring-gray-200">
              <span className="text-white text-sm font-semibold">{initials}</span>
            </div>
          )}
        </div>

        {/* Sign out button */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="ml-1 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
          title="Sign out"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Sign out
        </button>
      </div>
    </header>
  )
}
