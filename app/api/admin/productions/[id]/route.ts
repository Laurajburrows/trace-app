export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const { declaration_briefed, declaration_logged, declaration_consented } = body

  const existing = await prisma.production.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const allConfirmed = Boolean(declaration_briefed) && Boolean(declaration_logged) && Boolean(declaration_consented)
  const wasActivated = Boolean(existing.activated_at)

  const updated = await prisma.production.update({
    where: { id: params.id },
    data: {
      declaration_briefed: Boolean(declaration_briefed),
      declaration_logged: Boolean(declaration_logged),
      declaration_consented: Boolean(declaration_consented),
      declaration_timestamp: allConfirmed && !wasActivated ? new Date() : existing.declaration_timestamp,
      activated_at: allConfirmed && !wasActivated ? new Date() : existing.activated_at,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await prisma.production.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.production.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
