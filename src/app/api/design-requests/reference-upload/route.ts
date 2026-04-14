import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

// POST /api/design-requests/reference-upload — public (no auth, part of public form)
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileObj = file as File

    if (!ALLOWED_TYPES.includes(fileObj.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.' },
        { status: 400 }
      )
    }

    if (fileObj.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    const sanitizedName = fileObj.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `references/${Date.now()}-${sanitizedName}`

    const arrayBuffer = await fileObj.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('design-request-references')
      .upload(storagePath, buffer, {
        contentType: fileObj.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Reference upload error:', uploadError)
      return NextResponse.json({ error: 'File upload failed. Please try again.' }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('design-request-references')
      .getPublicUrl(storagePath)

    return NextResponse.json({
      data: {
        url: publicUrlData.publicUrl,
        name: fileObj.name,
        size: fileObj.size,
      },
    })
  } catch (err) {
    console.error('Reference upload error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
