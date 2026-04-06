import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { ContentCalendar } from '@/components/calendar/ContentCalendar'
import type { Submission } from '@/types'

export default async function CalendarPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }

  const supabase = getSupabaseAdmin()
  const isElevated = session.user.role === 'admin' || session.user.role === 'lead'

  let query = supabase
    .from('submissions')
    .select(`
      *,
      user:users!submissions_user_id_fkey(id, email, name, image)
    `)
    .in('status', ['approved', 'live', 'pending'])
    .not('schedule_start', 'is', null)
    .order('schedule_start', { ascending: true })

  if (!isElevated) {
    query = query.eq('user_id', session.user.id)
  }

  const { data } = await query
  const submissions = (data || []) as Submission[]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
        <p className="text-gray-500 mt-1">
          {isElevated
            ? 'View all scheduled content across the team.'
            : 'View your scheduled content.'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <ContentCalendar submissions={submissions} />
      </div>
    </div>
  )
}
