export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const entries = await prisma.whitelistEntry.findMany({
    orderBy: [{ department: 'asc' }, { displayName: 'asc' }],
  })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Bulk import: { import: true, entries: [...] }
  if (body.import && Array.isArray(body.entries)) {
    await prisma.whitelistEntry.deleteMany()
    const created = await prisma.whitelistEntry.createMany({
      data: body.entries.map((e: { toolName: string; displayName: string; department?: string; status: string; condition?: string | null; requiresLCT?: boolean; carbonIntensity?: string }) => ({
        toolName: e.toolName.toLowerCase().trim(),
        displayName: e.displayName,
        department: e.department || 'General',
        status: e.status,
        condition: e.condition || null,
        requiresLCT: Boolean(e.requiresLCT),
        carbonIntensity: e.carbonIntensity || 'Medium',
      })),
    })
    return NextResponse.json({ count: created.count })
  }

  // Single create
  const entry = await prisma.whitelistEntry.create({
    data: {
      toolName: body.toolName.toLowerCase().trim(),
      displayName: body.displayName,
      department: body.department || 'General',
      status: body.status,
      condition: body.condition || null,
      requiresLCT: Boolean(body.requiresLCT),
      carbonIntensity: body.carbonIntensity || 'Medium',
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
