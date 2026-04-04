import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import { UsersManager } from '@/components/admin/UsersManager'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">
          View all users and manage their access levels. Users are provisioned automatically on first login.
        </p>
      </div>

      <UsersManager currentUserId={session.user.id} />
    </div>
  )
}
