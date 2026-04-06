import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import { uploadToCommunityDrive } from '@/lib/google/drive'
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

    // Read file once — reuse buffer for both Supabase and Drive
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // ── 1. Upload to Supabase (primary store / fast CDN) ──────────────────────
    const ext = file.name.split('.').pop() || 'bin'
    const safeName = submitterName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)
    const storagePath = `${safeName}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('community')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('community').getPublicUrl(storagePath)
    const fileUrl = urlData.publicUrl

    // ── 2. Mirror to Google Drive (secondary store — non-blocking on failure) ─
    // Drive upload can be slow for large files; run but don't block the response
    // For videos this may hit Vercel's timeout — Drive link will be null in that case
    const driveResult = await uploadToCommunityDrive(file.name, file.type, buffer)

    // ── 3. Insert into DB ─────────────────────────────────────────────────────
    const { data: row, error: dbError } = await supabaseAdmin
      .from('community_uploads')
      .insert({
        submitter_name: submitterName,
        caption,
        file_url: fileUrl,
        file_name: file.name,
        file_size_bytes: file.size,
        content_type: contentType,
        google_drive_file_id: driveResult?.fileId ?? null,
        google_drive_url: driveResult?.driveUrl ?? null,
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
