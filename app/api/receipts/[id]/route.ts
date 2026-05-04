import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: params.id },
  })

  if (!receipt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(receipt)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const { auth_signer } = body

  if (!auth_signer || typeof auth_signer !== 'string' || !auth_signer.trim()) {
    return NextResponse.json({ error: 'auth_signer is required' }, { status: 400 })
  }

  const existing = await prisma.receipt.findUnique({ where: { id: params.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (existing.status === 'AUTH_COMPLETE') {
    return NextResponse.json({ error: 'Receipt already signed off' }, { status: 409 })
  }

  const updated = await prisma.receipt.update({
    where: { id: params.id },
    data: {
      auth_signer: auth_signer.trim(),
      auth_timestamp: new Date(),
      status: 'AUTH_COMPLETE',
    },
  })

  const hash = createHash('sha256')
    .update(JSON.stringify(updated, Object.keys(updated).sort()))
    .digest('hex')

  const withHash = await prisma.receipt.update({
    where: { id: params.id },
    data: { twin_lock_hash: hash },
  })

  return NextResponse.json(withHash)
}
