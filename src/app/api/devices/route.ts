import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'
import type { ApiResponse } from '@/types'

const createDeviceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  location: z.string().max(200).optional(),
  platform: z.enum(['unifi', 'google_slides', 'other']),
  device_type: z.string().max(50).optional(),
  max_resolution: z
    .string()
    .regex(/^\d+[xX]\d+$/, 'Resolution must be in format WIDTHxHEIGHT (e.g. 1920x1080)')
    .optional(),
  max_file_size_mb: z.number().int().positive().max(1000).optional(),
  supported_formats: z.array(z.string().min(1).max(10)).optional(),
  notes: z.string().max(1000).optional(),
})

const updateDeviceSchema = createDeviceSchema.partial().extend({
  is_active: z.boolean().optional(),
})

// GET /api/devices - list all devices
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active') !== 'false'

  try {
    let query = supabaseAdmin
      .from('devices')
      .select('*')
      .order('created_at', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Devices GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/devices - create a new device (admin only)
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = createDeviceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', data: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .insert({
        ...parsed.data,
        supported_formats: parsed.data.supported_formats || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating device:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log to audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: session.user.id,
      action: 'device_create',
      entity_type: 'device',
      entity_id: device.id,
      details: { name: device.name, platform: device.platform },
    })

    return NextResponse.json({ data: device, message: 'Device created successfully' }, { status: 201 })
  } catch (error) {
    console.error('Devices POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/devices?id=xxx - update a device (admin only)
export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const deviceId = searchParams.get('id')

  if (!deviceId) {
    return NextResponse.json({ error: 'Device ID required' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const parsed = updateDeviceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', data: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .update(parsed.data)
      .eq('id', deviceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log to audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: session.user.id,
      action: 'device_update',
      entity_type: 'device',
      entity_id: deviceId,
      details: parsed.data,
    })

    return NextResponse.json({ data: device, message: 'Device updated successfully' })
  } catch (error) {
    console.error('Devices PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
