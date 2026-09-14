export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // Return activated productions first, then fall back to any receipt-based production names
  const [activated, fromReceipts] = await Promise.all([
    prisma.production.findMany({
      where: { activated_at: { not: null } },
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.receipt.findMany({
      select: { production_name: true },
      distinct: ['production_name'],
      orderBy: { production_name: 'asc' },
    }),
  ])

  const receiptNames = fromReceipts.map((r) => r.production_name)

  // Include activated productions + any legacy receipt-based ones not yet in Production model
  const merged = Array.from(new Set([...activated.map((p) => p.name), ...receiptNames])).sort()

  return NextResponse.json(merged)
}
