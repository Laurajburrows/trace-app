export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const production = searchParams.get('production')
  const department = searchParams.get('department')
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const authSigner = searchParams.get('authSigner')

  const where: Record<string, unknown> = {}

  if (production) where.production_name = { contains: production }
  if (department) where.department = department
  if (status) where.tool_status = status
  if (authSigner) where.auth_signer = { contains: authSigner }
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
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json(receipts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const receipt = await prisma.receipt.create({
    data: {
      production_name: body.production_name,
      date: new Date(body.date),
      department: body.department,
      crew_member_name: body.crew_member_name,
      crew_role: body.crew_role,
      scene_usid: body.scene_usid,
      script_date: body.script_date,
      ai_tool_used: body.ai_tool_used,
      tool_status: body.tool_status,
      por_description: body.por_description,
      sel_output: body.sel_output || null,
      sel_description: body.sel_description,
      sel_detail: body.sel_detail || null,
      adj_description: body.adj_description,
      whitelist_condition: body.whitelist_condition || null,
      auth_signer: body.auth_signer,
      auth_timestamp: new Date(),
      lct_required: Boolean(body.lct_required),
      lct_reference: body.lct_reference || null,
      notes: body.notes || null,
    },
  })

  const hash = createHash('sha256')
    .update(JSON.stringify(receipt, Object.keys(receipt).sort()))
    .digest('hex')

  const withHash = await prisma.receipt.update({
    where: { id: receipt.id },
    data: { twin_lock_hash: hash },
  })

  return NextResponse.json(withHash, { status: 201 })
}
