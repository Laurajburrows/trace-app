export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ToolEntry, ReportData } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const production = searchParams.get('production')
  const department = searchParams.get('department')
  const toolStatus = searchParams.get('toolStatus')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  if (!production) {
    return NextResponse.json({ error: 'production required' }, { status: 400 })
  }

  const where: Record<string, unknown> = { production_name: production }
  if (department) where.department = department
  if (toolStatus) where.tool_status = toolStatus
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom)
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      ;(where.date as Record<string, unknown>).lte = to
    }
  }

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: { date: 'asc' },
  })

  if (receipts.length === 0) {
    return NextResponse.json({ error: 'No receipts found' }, { status: 404 })
  }

  const dates = receipts.map((r) => new Date(r.date))
  const dateRange = {
    from: new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString(),
    to: new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString(),
  }

  const byDepartment: Record<string, number> = {}
  receipts.forEach((r) => {
    byDepartment[r.department] = (byDepartment[r.department] || 0) + 1
  })

  const toolMap: Record<string, ToolEntry> = {}
  receipts.forEach((r) => {
    if (!toolMap[r.ai_tool_used]) {
      toolMap[r.ai_tool_used] = {
        tool: r.ai_tool_used,
        status: r.tool_status as ToolEntry['status'],
        count: 0,
        departments: [],
      }
    }
    toolMap[r.ai_tool_used].count++
    if (!toolMap[r.ai_tool_used].departments.includes(r.department)) {
      toolMap[r.ai_tool_used].departments.push(r.department)
    }
  })

  const byTool = Object.values(toolMap).sort((a, b) => b.count - a.count)

  const greenCount = receipts.filter((r) => r.tool_status === 'GREEN').length
  const greenPct = Math.round((greenCount / receipts.length) * 100)

  const lctReceipts = receipts.filter((r) => r.lct_required)

  const allSigners = Array.from(
    new Set(receipts.map((r) => r.auth_signer).filter((s): s is string => !!s))
  )

  const serializeReceipt = (r: (typeof receipts)[number]) => ({
    ...r,
    date: r.date.toISOString(),
    crew_confirmed_at: r.crew_confirmed_at?.toISOString() ?? null,
    auth_timestamp: r.auth_timestamp?.toISOString() ?? null,
    created_at: r.created_at.toISOString(),
  })

  // Build a human-readable filter description for the cover page
  const filterParts: string[] = []
  if (department) filterParts.push(`Department: ${department}`)
  if (toolStatus) filterParts.push(`Tool Status: ${toolStatus}`)
  if (dateFrom) filterParts.push(`From: ${dateFrom}`)
  if (dateTo) filterParts.push(`To: ${dateTo}`)

  const report: ReportData = {
    production_name: production,
    receipts: receipts.map(serializeReceipt) as unknown as ReportData['receipts'],
    generated_at: new Date().toISOString(),
    date_range: dateRange,
    by_department: byDepartment,
    by_tool: byTool,
    auth_signed_count: receipts.filter((r) => r.status === 'AUTH_COMPLETE').length,
    green_pct: greenPct,
    lct_receipts: lctReceipts.map(serializeReceipt) as unknown as ReportData['lct_receipts'],
    all_signers: allSigners,
    filter_description: filterParts.length > 0 ? filterParts.join(' · ') : null,
  }

  return NextResponse.json(report)
}
