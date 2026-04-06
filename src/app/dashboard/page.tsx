import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { StatusBadge } from '@/components/submissions/StatusBadge'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DashboardHomePage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role || 'user'
  const isAdmin = role === 'admin'
  const isLead = role === 'lead'
  const isElevated = isAdmin || isLead
  const userId = session?.user?.id
  const firstName = session?.user?.name?.split(' ')[0] || 'there'

  const supabase = getSupabaseAdmin()

  // Fetch stats
  let statsQuery = supabase.from('submissions').select('status, schedule_end, created_at')
  if (!isElevated && userId) {
    statsQuery = statsQuery.eq('user_id', userId)
  }
  const { data: allRows } = await statsQuery

  const rows = allRows || []
  const now = new Date()
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const liveCount = rows.filter((r) => r.status === 'live').length
  const pendingCount = rows.filter((r) => r.status === 'pending').length
  const expiringSoon = rows.filter((r) => {
    if (r.status !== 'live' || !r.schedule_end) return false
    const end = new Date(r.schedule_end)
    return end >= now && end <= sevenDaysOut
  }).length
  const thisMonth = rows.filter((r) => new Date(r.created_at) >= startOfMonth).length

  // Fetch recent submissions (last 4)
  let recentQuery = supabase
    .from('submissions')
    .select('id, title, status, content_type, created_at, file_url, user_id')
    .order('created_at', { ascending: false })
    .limit(4)
  if (!isElevated && userId) {
    recentQuery = recentQuery.eq('user_id', userId)
  }
  const { data: recentSubmissions } = await recentQuery

  const stats = [
    { label: 'Live Now', value: liveCount, color: 'text-green-600 bg-green-50 border-green-200', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    )},
    { label: 'Pending Review', value: pendingCount, color: 'text-amber-600 bg-amber-50 border-amber-200', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { label: 'Expiring Soon', value: expiringSoon, color: 'text-orange-600 bg-orange-50 border-orange-200', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    )},
    { label: 'This Month', value: thisMonth, color: 'text-blue-600 bg-blue-50 border-blue-200', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    )},
  ]

  const quickActions = [
    {
      label: 'Submit Content',
      description: 'Upload a new image or video for the displays',
      href: '/dashboard/submit',
      color: 'bg-[#1a1a2e] hover:bg-[#16213e] text-white',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      ),
    },
    {
      label: 'Request Design',
      description: 'Ask the design team to create something new',
      href: '/request',
      external: true,
      color: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      ),
    },
    {
      label: 'View Calendar',
      description: 'See scheduled content across all displays',
      href: '/dashboard/calendar',
      color: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    ...(isAdmin ? [{
      label: 'Review Queue',
      description: `${pendingCount} submission${pendingCount !== 1 ? 's' : ''} waiting for approval`,
      href: '/dashboard/admin',
      color: pendingCount > 0
        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
        : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
        </svg>
      ),
      badge: pendingCount > 0 ? pendingCount : undefined,
    }] : []),
    ...(isLead ? [{
      label: 'All Submissions',
      description: 'Browse all submitted content across the team',
      href: '/dashboard/admin',
      color: 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    }] : []),
  ]

  return (
    <div className="space-y-8">
      <WelcomeBanner userName={firstName} submissionCount={rows.length} />
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-gray-500 mt-1">
          {format(new Date(), 'EEEE, MMMM d')} · Here&apos;s what&apos;s going on with your content.
        </p>
      </div>

      {/* Expiring soon banner */}
      {expiringSoon > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <svg className="w-5 h-5 text-yellow-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-yellow-800 font-medium flex-1">
            {expiringSoon} piece{expiringSoon !== 1 ? 's' : ''} of content {expiringSoon !== 1 ? 'are' : 'is'} expiring within 7 days.
          </p>
          <Link href="/dashboard/calendar" className="text-xs font-semibold text-yellow-700 underline underline-offset-2 shrink-0">
            View calendar
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-xl border px-4 py-4 ${stat.color}`}>
            <div className="flex items-center justify-between mb-2 opacity-60">
              {stat.icon}
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) =>
            action.external ? (
              <a
                key={action.label}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`relative flex items-start gap-4 p-4 rounded-xl transition-all ${action.color}`}
              >
                <div className="shrink-0 mt-0.5">{action.icon}</div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{action.label}</p>
                  <p className="text-xs mt-0.5 opacity-70 leading-relaxed">{action.description}</p>
                </div>
                <svg className="w-3.5 h-3.5 shrink-0 mt-1 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            ) : (
              <Link
                key={action.label}
                href={action.href}
                className={`relative flex items-start gap-4 p-4 rounded-xl transition-all ${action.color}`}
              >
                <div className="shrink-0 mt-0.5">{action.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{action.label}</p>
                    {'badge' in action && action.badge ? (
                      <span className="bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                        {action.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs mt-0.5 opacity-70 leading-relaxed">{action.description}</p>
                </div>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Recent submissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Submissions</h2>
          <Link
            href="/dashboard/submissions"
            className="text-xs font-medium text-[#1a1a2e] hover:underline"
          >
            View all →
          </Link>
        </div>

        {!recentSubmissions || recentSubmissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
            <p className="text-gray-400 text-sm">No submissions yet.</p>
            <Link
              href="/dashboard/submit"
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-[#1a1a2e] text-white text-xs font-medium rounded-lg hover:bg-[#16213e] transition-colors"
            >
              Submit your first piece
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSubmissions.map((sub) => (
              <Link
                key={sub.id}
                href="/dashboard/submissions"
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                {/* Type indicator */}
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  {sub.content_type === 'video' ? (
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{sub.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                  </p>
                </div>

                <StatusBadge status={sub.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
