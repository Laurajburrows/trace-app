export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const productions = await prisma.production.findMany({
    orderBy: { created_at: 'desc' },
  })
  return NextResponse.json(productions)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = body.name?.trim()

  if (!name) {
    return NextResponse.json({ error: 'Production name is required.' }, { status: 400 })
  }

  const existing = await prisma.production.findUnique({ where: { name } })
  if (existing) {
    return NextResponse.json({ error: 'A production with that name already exists.' }, { status: 409 })
  }

  const production = await prisma.production.create({ data: { name } })
  return NextResponse.json(production, { status: 201 })
}
