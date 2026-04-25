export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const results = await prisma.receipt.findMany({
    select: { production_name: true },
    distinct: ['production_name'],
    orderBy: { production_name: 'asc' },
  })

  return NextResponse.json(results.map((r) => r.production_name))
}
