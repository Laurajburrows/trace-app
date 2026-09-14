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
  const scene = searchParams.get('scene')

  if (!production) {
    return NextResponse.json({ error: 'production required' }, { status: 400 })
  }

  const where: Record<string, unknown> = { production_name: production }
  if (department) where.department = department
  if (toolStatus) where.tool_status = toolStatus
  if (scene) where.scene_usid = { contains: scene, mode: 'insensitive' }
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom)
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      ;(where.date as Record<string, unknown>).lte = to
    }
  }

  const [receipts, crewConsents] = await Promise.all([
    prisma.receipt.findMany({ where, orderBy: { date: 'asc' } }),
    prisma.crewConsent.findMany({
      where: { production_name: production },
      orderBy: { consented_at: 'asc' },
    }),
  ])

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
  function addToToolMap(toolName: string, toolStatus: string, department: string) {
    if (!toolMap[toolName]) {
      toolMap[toolName] = { tool: toolName, status: toolStatus as ToolEntry['status'], count: 0, departments: [] }
    }
    toolMap[toolName].count++
    if (!toolMap[toolName].departments.includes(department)) {
      toolMap[toolName].departments.push(department)
    }
  }
  receipts.forEach((r) => {
    addToToolMap(r.ai_tool_used, r.tool_status, r.department)
    if (Array.isArray(r.additional_tools)) {
      (r.additional_tools as { ai_tool_used: string; tool_status: string }[]).forEach((at) => {
        addToToolMap(at.ai_tool_used, at.tool_status, r.department)
      })
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

  const consentedNames = new Set(crewConsents.map((c) => c.crew_member_name))
  const allCrewNames = Array.from(new Set(receipts.map((r) => r.crew_member_name)))
  const unconsentedCrew = allCrewNames.filter((name) => !consentedNames.has(name))

  // Build a human-readable filter description for the cover page
  const filterParts: string[] = []
  if (department) filterParts.push(`Department: ${department}`)
  if (scene) filterParts.push(`Scene: ${scene}`)
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
    crew_consents: crewConsents.map((c) => ({ ...c, consented_at: c.consented_at.toISOString() })),
    unconsented_crew: unconsentedCrew,
  }

  return NextResponse.json(report)
}
