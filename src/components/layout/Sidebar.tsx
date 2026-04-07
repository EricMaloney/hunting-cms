'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { UserRole } from '@/types'
import { cn } from '@/lib/utils'

interface SidebarProps {
  userRole: UserRole
  isOpen?: boolean
  onClose?: () => void
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
  adminOnly?: boolean
  elevatedOnly?: boolean // visible to lead + admin
  leadOnly?: boolean     // visible to lead only (not admin)
  external?: boolean
}

function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
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

function ExternalLinkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  )
}

function ChartBarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function PhotoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

const navItems: NavItem[] = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: <HomeIcon />,
  },
  {
    label: 'My Submissions',
    href: '/dashboard/submissions',
    icon: <MonitorIcon />,
  },
  {
    label: 'Submit Content',
    href: '/dashboard/submit',
    icon: <PlusCircleIcon />,
  },
  {
    label: 'Calendar',
    href: '/dashboard/calendar',
    icon: <CalendarIcon />,
  },
  {
    label: 'Design Requests',
    href: '/dashboard/design-requests',
    icon: <PaletteIcon />,
  },
  {
    label: 'Request Content',
    href: '/request',
    icon: <ExternalLinkIcon />,
    external: true,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <SettingsIcon />,
  },
  {
    label: 'All Submissions',
    href: '/dashboard/admin',
    icon: <ClipboardIcon />,
    leadOnly: true,
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
  {
    label: 'Analytics',
    href: '/dashboard/admin/analytics',
    icon: <ChartBarIcon />,
    adminOnly: true,
  },
  {
    label: 'Library',
    href: '/dashboard/admin/library',
    icon: <PhotoIcon />,
    elevatedOnly: true,
  },
  {
    label: 'Submit a Photo',
    href: '/community',
    icon: <ExternalLinkIcon />,
    external: true,
  },
]

export function Sidebar({ userRole, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = userRole === 'admin'
  const [pendingCount, setPendingCount] = useState(0)

  // Close sidebar when route changes (mobile navigation)
  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      onClose?.()
    }
  }, [pathname, onClose])

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
    const interval = setInterval(fetchPending, 60000)
    return () => clearInterval(interval)
  }, [isAdmin])

  const isLead = userRole === 'lead'
  const isElevated = isAdmin || isLead
  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin
    if (item.leadOnly) return isLead          // lead only — keeps "All Submissions" off admin view
    if (item.elevatedOnly) return isElevated  // lead + admin — Library, etc.
    return true
  })

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Mobile: fixed drawer sliding in from left
          'fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a2e] flex flex-col transition-transform duration-300 ease-in-out',
          // Desktop: static, always visible
          'md:static md:z-auto md:translate-x-0 md:transition-none md:shrink-0',
          // Mobile open/close
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
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

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-white/50 hover:text-white rounded-lg transition-colors"
            aria-label="Close navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Home — unlabeled, sits above everything */}
          <div className="mb-3">
            <NavLink
              item={visibleItems.find((i) => i.href === '/dashboard' && i.label === 'Home')!}
              pathname={pathname}
            />
          </div>

          {/* Content section */}
          <div className="px-3 mb-2">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Content</p>
          </div>
          <div className="space-y-1 mb-2">
            {visibleItems
              .filter((item) => !item.adminOnly && !item.elevatedOnly && !item.leadOnly && item.label !== 'Home' && item.label !== 'Settings')
              .map((item) => (
                <NavLink key={item.label} item={item} pathname={pathname} />
              ))}
          </div>

          {/* Admin / Lead section */}
          {isElevated && (
            <div className="mt-4">
              <div className="px-3 mb-2">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  {isAdmin ? 'Admin' : 'Lead'}
                </p>
              </div>
              <div className="space-y-1">
                {visibleItems
                  .filter((item) => item.elevatedOnly || item.adminOnly || item.leadOnly)
                  .map((item) => (
                    <NavLink
                      key={item.label}
                      item={{
                        ...item,
                        badge: item.href === '/dashboard/admin' && isAdmin && pendingCount > 0 ? pendingCount : undefined,
                      }}
                      pathname={pathname}
                    />
                  ))}
              </div>
            </div>
          )}
        </nav>

        {/* Settings + Version — pinned to bottom */}
        <div className="px-3 pb-3 border-t border-white/10 pt-3">
          <NavLink
            item={visibleItems.find((i) => i.label === 'Settings')!}
            pathname={pathname}
          />
          <p className="text-slate-600 text-xs px-3 mt-3">v1.0.0</p>
        </div>
      </aside>
    </>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.external ? false :
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.href || pathname.startsWith(item.href + '/')

  const className = cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
    isActive
      ? 'bg-white/15 text-white'
      : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
  )

  const content = (
    <>
      <span className={cn(isActive ? 'text-white' : 'text-slate-500')}>{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="ml-auto bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {item.badge}
        </span>
      ) : null}
      {item.external && (
        <svg className="w-3 h-3 text-slate-600 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      )}
    </>
  )

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    )
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  )
}
