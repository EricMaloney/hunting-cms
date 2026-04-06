import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

interface RouteParams { params: { id: string } }

// DELETE — soft-delete (lead or admin only)
export async function DELETE(_req: Request, { params }: RouteParams): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isElevated = session.user.role === 'admin' || session.user.role === 'lead'
  if (!isElevated) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('community_uploads')
    .update({ is_active: false })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Photo removed from library' })
}
