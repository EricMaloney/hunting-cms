import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export default async function RootPage() {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      redirect('/dashboard')
    }
  } catch {
    // Config not ready yet — fall through to login
  }

  redirect('/login')
}
