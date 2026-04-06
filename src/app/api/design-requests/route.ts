import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendDesignRequestEmail } from '@/lib/email/resend'
import { z } from 'zod'
import type { ApiResponse } from '@/types'

const createSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().min(7, 'Enter a valid phone number').max(30).optional().or(z.literal('')),
    message: z.string().min(1, 'Message is required').max(2000),
    go_live_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    content_category: z.string().optional(),
    urgency: z.enum(['asap', 'by_date', 'flexible']).optional(),
    audience: z.array(z.string()).optional(),
    reference_url: z.string().url().optional().nullable(),
  })
  .refine((d) => (d.email && d.email.length > 0) || (d.phone && d.phone.length > 0), {
    message: 'Provide at least an email address or phone number',
    path: ['email'],
  })

// POST /api/design-requests — public, no auth required
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', data: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const d = parsed.data

    const { data: record, error } = await supabaseAdmin
      .from('design_requests')
      .insert({
        name: d.name,
        email: d.email || null,
        phone: d.phone || null,
        message: d.message,
        go_live_date: d.go_live_date || null,
        end_date: d.end_date || null,
        content_category: d.content_category || null,
        urgency: d.urgency || null,
        audience: d.audience || null,
        reference_url: d.reference_url || null,
        status: 'new',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating design request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send notification to Eric + Heather (non-blocking)
    sendDesignRequestEmail({
      name: d.name,
      email: d.email || null,
      phone: d.phone || null,
      message: d.message,
      go_live_date: d.go_live_date || null,
      end_date: d.end_date || null,
      content_category: d.content_category || null,
      urgency: d.urgency || null,
      audience: d.audience || null,
      reference_url: d.reference_url || null,
    }).catch((e) => console.error('Failed to send design request email:', e))

    return NextResponse.json(
      { data: record, message: 'Request submitted successfully.' },
      { status: 201 }
    )
  } catch (err) {
    console.error('Design requests POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/design-requests — authenticated, all roles
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  try {
    let query = supabaseAdmin
      .from('design_requests')
      .select(
        `
        *,
        claimer:users!design_requests_claimed_by_fkey(id, email, name)
      `
      )
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching design requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Design requests GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
