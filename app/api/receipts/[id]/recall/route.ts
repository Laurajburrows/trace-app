import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await prisma.receipt.findUnique({ where: { id: params.id } })

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (existing.status !== 'PENDING_HOD_AUTH' && existing.status !== 'PENDING_AUTH') {
    return NextResponse.json(
      { error: 'Only receipts pending HOD authorisation can be recalled.' },
      { status: 409 }
    )
  }

  const updated = await prisma.receipt.update({
    where: { id: params.id },
    data: {
      status: 'RECALLED',
      recalled_at: new Date(),
    },
  })

  return NextResponse.json(updated)
}
