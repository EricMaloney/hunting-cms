import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const supabase = getSupabaseAdmin()
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id, status, content_type, created_at, reviewed_at,
      user:users!submissions_user_id_fkey(id, name, email)
    `)
    .order('created_at', { ascending: true })

  const rows = submissions || []

  // Status breakdown
  const statusCounts: Record<string, number> = {}
  for (const r of rows) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
  }
  const totalSubs = rows.length
  const statusOrder = ['pending', 'approved', 'rejected', 'live', 'expired']
  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    live: 'bg-blue-500',
    expired: 'bg-gray-400',
  }

  // Last 6 months
  const now = new Date()
  const months: { label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const count = rows.filter((r) => {
      const created = new Date(r.created_at)
      return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth()
    }).length
    months.push({ label, count })
  }
  const maxMonthCount = Math.max(...months.map((m) => m.count), 1)

  // Top submitters
  const submitterMap = new Map<string, { name: string; email: string; count: number }>()
  for (const r of rows) {
    const u = Array.isArray(r.user) ? r.user[0] : r.user as { id: string; name: string | null; email: string } | null
    if (!u) continue
    const key = u.email
    if (!submitterMap.has(key)) {
      submitterMap.set(key, { name: u.name || u.email, email: u.email, count: 0 })
    }
    submitterMap.get(key)!.count++
  }
  const topSubmitters = Array.from(submitterMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxSubmitterCount = Math.max(...topSubmitters.map((s) => s.count), 1)

  // Average review time (hours)
  const reviewedRows = rows.filter((r) => r.reviewed_at && r.created_at)
  const avgReviewHours = reviewedRows.length
    ? reviewedRows.reduce((sum, r) => {
        const diff = new Date(r.reviewed_at).getTime() - new Date(r.created_at).getTime()
        return sum + diff / (1000 * 60 * 60)
      }, 0) / reviewedRows.length
    : null

  // Approval rate
  const reviewed = rows.filter((r) => r.status === 'approved' || r.status === 'rejected').length
  const approved = statusCounts['approved'] || 0
  const approvalRate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : null

  // Most common content type
  const typeCounts: Record<string, number> = {}
  for (const r of rows) {
    typeCounts[r.content_type] = (typeCounts[r.content_type] || 0) + 1
  }
  const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Overview of content submission activity across all users.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-3xl font-bold text-gray-900">{totalSubs}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Total Submissions</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-3xl font-bold text-green-600">
            {approvalRate !== null ? `${approvalRate}%` : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Approval Rate</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-3xl font-bold text-blue-600">
            {avgReviewHours !== null ? `${avgReviewHours.toFixed(1)}h` : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Avg Review Time</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-3xl font-bold text-purple-600 capitalize">
            {mostCommonType ? mostCommonType[0] : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Top Content Type</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Submissions by Status</h2>
          <div className="space-y-3">
            {statusOrder.map((status) => {
              const count = statusCounts[status] || 0
              const pct = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 capitalize">{status}</span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${STATUS_COLORS[status] || 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monthly chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Submissions per Month (last 6)</h2>
          <div className="flex items-end gap-2 h-32">
            {months.map(({ label, count }) => {
              const heightPct = maxMonthCount > 0 ? (count / maxMonthCount) * 100 : 0
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">{count}</span>
                  <div className="w-full bg-gray-100 rounded-t overflow-hidden flex items-end" style={{ height: '80px' }}>
                    <div
                      className="w-full bg-[#1a1a2e] rounded-t transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top submitters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Submitters</h2>
        {topSubmitters.length === 0 ? (
          <p className="text-sm text-gray-400">No data yet.</p>
        ) : (
          <div className="space-y-3">
            {topSubmitters.map((submitter, i) => {
              const widthPct = (submitter.count / maxSubmitterCount) * 100
              const initial = (submitter.name || submitter.email)[0].toUpperCase()
              return (
                <div key={submitter.email} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-[#1a1a2e] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-800 font-medium truncate">{submitter.name}</span>
                      <span className="text-sm font-bold text-gray-900 ml-2">{submitter.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1a1a2e] rounded-full"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
