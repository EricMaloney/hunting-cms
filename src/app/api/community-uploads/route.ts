import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { ApiResponse, CommunityUpload } from '@/types'

// GET — authenticated (lead/admin) browse
export async function GET(): Promise<NextResponse<ApiResponse<CommunityUpload[]>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isElevated = session.user.role === 'admin' || session.user.role === 'lead'
  if (!isElevated) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('community_uploads')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

// POST — public (no auth required) — employees submit photos
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<CommunityUpload>>> {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const submitterName = (formData.get('submitter_name') as string | null)?.trim()
    const caption = (formData.get('caption') as string | null)?.trim() || null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!submitterName) return NextResponse.json({ error: 'Submitter name is required' }, { status: 400 })

    // Determine content type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Only images and videos are supported' }, { status: 400 })
    }
    const contentType: 'image' | 'video' = isImage ? 'image' : 'video'

    // Max sizes: 20 MB images, 500 MB videos
    const maxBytes = isImage ? 20 * 1024 * 1024 : 500 * 1024 * 1024
    if (file.size > maxBytes) {
      return NextResponse.json({ error: `File too large (max ${isImage ? '20 MB' : '500 MB'})` }, { status: 400 })
    }

    // Upload to Supabase "community" bucket
    const ext = file.name.split('.').pop() || 'bin'
    const safeName = submitterName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)
    const storagePath = `${safeName}-${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from('community')
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from('community').getPublicUrl(storagePath)
    const fileUrl = urlData.publicUrl

    // Insert into DB
    const { data: row, error: dbError } = await supabaseAdmin
      .from('community_uploads')
      .insert({
        submitter_name: submitterName,
        caption,
        file_url: fileUrl,
        file_name: file.name,
        file_size_bytes: file.size,
        content_type: contentType,
      })
      .select()
      .single()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    return NextResponse.json({ data: row }, { status: 201 })
  } catch (err) {
    console.error('[Community Upload] error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
