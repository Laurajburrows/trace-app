export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.customRole.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.customRole.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
