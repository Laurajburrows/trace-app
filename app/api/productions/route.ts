export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [fromProductions, fromReceipts] = await Promise.all([
    prisma.production.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.receipt.findMany({
      select: { production_name: true },
      distinct: ['production_name'],
      orderBy: { production_name: 'asc' },
    }),
  ])

  const merged = Array.from(
    new Set([...fromProductions.map((p) => p.name), ...fromReceipts.map((r) => r.production_name)])
  ).sort()

  return NextResponse.json(merged)
}
