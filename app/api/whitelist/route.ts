export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_WHITELIST } from '@/lib/whitelist-defaults'

export async function GET() {
  const entries = await prisma.whitelistEntry.findMany({
    orderBy: { displayName: 'asc' },
  })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Bulk import: { import: true, entries: [...] }
  if (body.import && Array.isArray(body.entries)) {
    await prisma.whitelistEntry.deleteMany()
    const created = await prisma.whitelistEntry.createMany({
      data: body.entries.map((e: { toolName: string; displayName: string; status: string; condition?: string | null; requiresLCT?: boolean }) => ({
        toolName: e.toolName.toLowerCase().trim(),
        displayName: e.displayName,
        status: e.status,
        condition: e.condition || null,
        requiresLCT: Boolean(e.requiresLCT),
      })),
    })
    return NextResponse.json({ count: created.count })
  }

  // Seed defaults
  if (body.seedDefaults) {
    await prisma.whitelistEntry.deleteMany()
    await prisma.whitelistEntry.createMany({
      data: DEFAULT_WHITELIST.map((e) => ({
        toolName: e.toolName,
        displayName: e.displayName,
        status: e.status,
        condition: e.condition,
        requiresLCT: e.requiresLCT,
      })),
    })
    const entries = await prisma.whitelistEntry.findMany({ orderBy: { displayName: 'asc' } })
    return NextResponse.json(entries)
  }

  // Single create
  const entry = await prisma.whitelistEntry.create({
    data: {
      toolName: body.toolName.toLowerCase().trim(),
      displayName: body.displayName,
      status: body.status,
      condition: body.condition || null,
      requiresLCT: Boolean(body.requiresLCT),
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
