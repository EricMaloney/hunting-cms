import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import { DevicesManager } from '@/components/admin/DevicesManager'

export default async function DevicesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Device Management</h1>
        <p className="text-gray-500 mt-1">
          Manage display devices and their specifications for content routing.
        </p>
      </div>

      <DevicesManager />
    </div>
  )
}
