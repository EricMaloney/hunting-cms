import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { SubmissionList } from '@/components/submissions/SubmissionList'

export default async function SubmissionsPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role || 'user'
  const userId = session?.user?.id

  const supabase = getSupabaseAdmin()

  // Stats for this user only
  const { data: rows } = await supabase
    .from('submissions')
    .select('status, schedule_end, created_at')
    .eq('user_id', userId ?? '')

  const now = new Date()
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const allRows = rows || []
  const liveCount = allRows.filter((r) => r.status === 'live').length
  const pendingCount = allRows.filter((r) => r.status === 'pending').length
  const expiringSoon = allRows.filter((r) => {
    if (r.status !== 'live' || !r.schedule_end) return false
    const end = new Date(r.schedule_end)
    return end >= now && end <= sevenDaysOut
  }).length
  const thisMonth = allRows.filter((r) => new Date(r.created_at) >= startOfMonth).length

  const stats = [
    { label: 'Live Now', value: liveCount, color: 'text-green-600 bg-green-50 border-green-200' },
    { label: 'Pending Review', value: pendingCount, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Expiring Soon', value: expiringSoon, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { label: 'This Month', value: thisMonth, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
        <p className="text-gray-500 mt-1">
          Track the status of your submitted content for the digital signage displays.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-xl border px-4 py-3 ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Expiring soon banner */}
      {expiringSoon > 0 && (
        <div className="mb-5 flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <svg className="w-5 h-5 text-yellow-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-yellow-800 font-medium">
            You have {expiringSoon} piece{expiringSoon !== 1 ? 's' : ''} of content expiring within 7 days.
          </p>
        </div>
      )}

      <SubmissionList
        userId={userId}
        isAdmin={false}
        currentUserId={userId || ''}
        currentUserName={session?.user?.name ?? null}
      />
    </div>
  )
}
