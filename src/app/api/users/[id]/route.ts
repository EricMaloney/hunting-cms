import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { ApiResponse, UserRole } from '@/types'

interface RouteParams {
  params: { id: string }
}

// PATCH /api/users/[id] — admin only, update role
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Prevent admins from changing their own role
  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role' },
      { status: 400 }
    )
  }

  try {
    const body = await req.json()
    const { role } = body

    if (!role || !['admin', 'lead', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role: role as UserRole })
      .eq('id', params.id)
      .select('id, email, name, image, role, created_at, last_login')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ data, message: `Role updated to ${role}` })
  } catch (err) {
    console.error('User PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
