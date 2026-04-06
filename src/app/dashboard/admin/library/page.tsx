import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import { LibraryManager } from '@/components/admin/LibraryManager'

export default async function LibraryPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  // Lead and admin can access the library
  if (!session?.user || (role !== 'admin' && role !== 'lead')) redirect('/dashboard')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Community Library</h1>
        <p className="text-gray-500 mt-1">
          Employee-submitted photos and videos available to use in content submissions.
        </p>
      </div>
      <LibraryManager />
    </div>
  )
}
