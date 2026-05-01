export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const entry = await prisma.whitelistEntry.update({
    where: { id: params.id },
    data: {
      toolName: body.toolName.toLowerCase().trim(),
      displayName: body.displayName,
      status: body.status,
      condition: body.condition || null,
      requiresLCT: Boolean(body.requiresLCT),
    },
  })
  return NextResponse.json(entry)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.whitelistEntry.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
