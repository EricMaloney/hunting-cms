import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import { isAcceptedMediaType, getContentType } from '@/lib/validation/media-validator'
import type { ApiResponse } from '@/types'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB hard limit

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // Auth check
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // MIME type check
    if (!isAcceptedMediaType(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not supported. Please upload an image or video.` },
        { status: 400 }
      )
    }

    const contentType = getContentType(file.type)
    if (!contentType) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    // Generate storage path: userId/timestamp-filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${session.user.id}/${timestamp}-${sanitizedName}`

    // Convert File to ArrayBuffer then Buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('Submissions')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL (or signed URL for private buckets)
    // Using getPublicUrl - if bucket is private, use createSignedUrl instead
    const { data: urlData } = supabaseAdmin.storage
      .from('Submissions')
      .getPublicUrl(storagePath)

    return NextResponse.json({
      data: {
        url: urlData.publicUrl,
        path: storagePath,
        name: file.name,
        size: file.size,
        type: file.type,
        contentType,
      },
      message: 'File uploaded successfully',
    })
  } catch (error) {
    console.error('Upload route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
