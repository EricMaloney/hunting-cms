import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { SubmissionList } from '@/components/submissions/SubmissionList'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  // Fetch status counts for the stats bar
  const supabase = getSupabaseAdmin()
  const { data: counts } = await supabase.from('submissions').select('status')

  const stats = (counts || []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})

  const statCards = [
    { label: 'Pending Review', value: stats.pending || 0, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Approved', value: stats.approved || 0, color: 'text-green-600 bg-green-50 border-green-200' },
    { label: 'Rejected', value: stats.rejected || 0, color: 'text-red-600 bg-red-50 border-red-200' },
    { label: 'Expired', value: stats.expired || 0, color: 'text-gray-500 bg-gray-50 border-gray-200' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Review</h1>
        <p className="text-gray-500 mt-1">
          Review and approve or reject submitted content before it goes live on display screens.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statCards.map((stat) => (
          <div key={stat.label} className={`rounded-xl border px-4 py-3 ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      <SubmissionList isAdmin={true} />
    </div>
  )
}
