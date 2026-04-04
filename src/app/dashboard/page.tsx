import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { SubmissionList } from '@/components/submissions/SubmissionList'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
        <p className="text-gray-500 mt-1">
          Track the status of your submitted content for digital signage displays.
        </p>
      </div>

      <SubmissionList userId={session?.user.id} isAdmin={false} />
    </div>
  )
}
