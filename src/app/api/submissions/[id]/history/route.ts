import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { ApiResponse, SubmissionStatusHistory } from '@/types'

interface RouteParams {
  params: { id: string }
}

export async function GET(
  _req: Request,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<SubmissionStatusHistory[]>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('submission_status_history')
      .select(`
        *,
        changed_by:users!submission_status_history_changed_by_user_id_fkey(id, email, name)
      `)
      .eq('submission_id', params.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error('History GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
