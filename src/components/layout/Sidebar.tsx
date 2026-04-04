'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { UserRole } from '@/types'
import { cn } from '@/lib/utils'

interface SidebarProps {
  userRole: UserRole
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
  adminOnly?: boolean
}

function MonitorIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
    </svg>
  )
}

function PlusCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function DocumentCheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
    </svg>
  )
}

function ServerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function PaletteIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  )
}

const navItems: NavItem[] = [
  {
    label: 'My Submissions',
    href: '/dashboard',
    icon: <MonitorIcon />,
  },
  {
    label: 'Submit Content',
    href: '/dashboard/submit',
    icon: <PlusCircleIcon />,
  },
  {
    label: 'Design Requests',
    href: '/dashboard/design-requests',
    icon: <PaletteIcon />,
  },
  {
    label: 'Review Queue',
    href: '/dashboard/admin',
    icon: <DocumentCheckIcon />,
    adminOnly: true,
  },
  {
    label: 'Devices',
    href: '/dashboard/admin/devices',
    icon: <ServerIcon />,
    adminOnly: true,
  },
  {
    label: 'Users',
    href: '/dashboard/admin/users',
    icon: <UsersIcon />,
    adminOnly: true,
  },
]

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = userRole === 'admin'
  const [pendingCount, setPendingCount] = useState(0)

  // Poll for pending submissions count (admin only)
  useEffect(() => {
    if (!isAdmin) return
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/submissions?status=pending&per_page=100')
        const json = await res.json()
        setPendingCount(json.data?.total || json.data?.submissions?.length || 0)
      } catch { /* silent */ }
    }
    fetchPending()
    const interval = setInterval(fetchPending, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [isAdmin])

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside className="w-64 bg-[#1a1a2e] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Huntington Steel</p>
            <p className="text-slate-400 text-xs">Content CMS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* User section */}
        <div className="px-3 mb-2">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Content</p>
        </div>

        {visibleItems
          .filter((item) => !item.adminOnly)
          .map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}

        {isAdmin && (
          <>
            <div className="px-3 mt-5 mb-2">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Admin</p>
            </div>
            {visibleItems
              .filter((item) => item.adminOnly)
              .map((item) => (
                <NavLink
                  key={item.href}
                  item={{
                    ...item,
                    badge: item.href === '/dashboard/admin' && pendingCount > 0 ? pendingCount : undefined,
                  }}
                  pathname={pathname}
                />
              ))}
          </>
        )}
      </nav>

      {/* Version */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-slate-600 text-xs">v1.0.0</p>
      </div>
    </aside>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-white/15 text-white'
          : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
      )}
    >
      <span className={cn(isActive ? 'text-white' : 'text-slate-500')}>{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="ml-auto bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}
