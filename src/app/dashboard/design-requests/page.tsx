import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import { DesignRequestQueue } from '@/components/design-requests/DesignRequestQueue'

export default async function DesignRequestsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Design Requests</h1>
          <p className="text-gray-500 mt-1">
            Incoming content requests from the team. Claim a project to start working on it.
          </p>
        </div>
        <a
          href="/request"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Public Form
        </a>
      </div>

      <DesignRequestQueue
        currentUserId={session.user.id}
        currentUserName={session.user.name}
        isAdmin={session.user.role === 'admin'}
      />
    </div>
  )
}
