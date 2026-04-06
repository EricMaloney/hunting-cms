import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

// GET /api/users — admin only, list all users
export async function GET(): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, image, role, created_at, last_login')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Fetch submission counts per user
    const userIds = users.map((u) => u.id)
    const { data: submissionRows } = await supabaseAdmin
      .from('submissions')
      .select('user_id')
      .in('user_id', userIds)

    const countMap: Record<string, number> = {}
    for (const row of submissionRows || []) {
      if (row.user_id) {
        countMap[row.user_id] = (countMap[row.user_id] || 0) + 1
      }
    }

    const data = users.map((u) => ({
      ...u,
      submission_count: countMap[u.id] || 0,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Users GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
