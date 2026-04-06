import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { ApiResponse, Tag } from '@/types'

interface RouteParams { params: { id: string } }

export async function GET(_req: Request, { params }: RouteParams): Promise<NextResponse<ApiResponse<Tag[]>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('submission_tags')
    .select('tag:tags(*)')
    .eq('submission_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const tags = (data || []).map((row: unknown) => (row as { tag: Tag }).tag).filter(Boolean)
  return NextResponse.json({ data: tags })
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tag_ids } = await req.json()
  if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
    return NextResponse.json({ error: 'tag_ids array required' }, { status: 400 })
  }

  const rows = tag_ids.map((tag_id: string) => ({ submission_id: params.id, tag_id }))
  const { error } = await supabaseAdmin.from('submission_tags').upsert(rows, { onConflict: 'submission_id,tag_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Tags applied' })
}

export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tag_id } = await req.json()
  const { error } = await supabaseAdmin
    .from('submission_tags')
    .delete()
    .eq('submission_id', params.id)
    .eq('tag_id', tag_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Tag removed' })
}
