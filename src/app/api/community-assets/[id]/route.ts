// Legacy route — deprecated. Use /api/community-uploads/[id] instead.
import { NextResponse } from 'next/server'

export async function DELETE() {
  return NextResponse.json({ error: 'This endpoint is deprecated. Use /api/community-uploads/[id].' }, { status: 410 })
}
