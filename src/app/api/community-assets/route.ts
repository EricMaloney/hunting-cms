// Legacy redirect — community assets are now community-uploads
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.redirect(new URL('/api/community-uploads', 'http://localhost'), { status: 308 })
}

export async function POST() {
  return NextResponse.json({ error: 'This endpoint is deprecated. Use /api/community-uploads.' }, { status: 410 })
}
