export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const production = searchParams.get('production')
  const department = searchParams.get('department')
  const status = searchParams.get('status')
  const receiptStatus = searchParams.get('receiptStatus')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const authSigner = searchParams.get('authSigner')

  const viewerName = searchParams.get('viewerName')

  const where: Record<string, unknown> = {}

  if (production) where.production_name = { contains: production }
  if (department) where.department = department
  if (status) where.tool_status = status
  if (receiptStatus) {
    const statuses = receiptStatus.split(',').map((s) => s.trim()).filter(Boolean)
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses }
  }
  if (authSigner) where.auth_signer = { contains: authSigner }
  if (viewerName?.trim()) {
    where.NOT = { crew_member_name: { equals: viewerName.trim(), mode: 'insensitive' } }
  }
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

  const isWritingDevelopment = body.department === 'Writing' && body.writing_stage === 'Development'
  const submitterRole: string = body.submitter_role || 'crew'
  const now = new Date()

  let initialStatus: string
  let routedToTier: string

  if (isWritingDevelopment) {
    initialStatus = 'AUTH_COMPLETE'
    routedToTier = 'self'
  } else if (submitterRole === 'hod') {
    initialStatus = 'PENDING_PRODUCER_AUTH'
    routedToTier = 'producer'
  } else if (submitterRole === 'producer') {
    initialStatus = 'PENDING_EXEC_AUTH'
    routedToTier = 'exec'
  } else {
    initialStatus = 'PENDING_HOD_AUTH'
    routedToTier = 'hod'
  }

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
      status: initialStatus,
      submitter_role: submitterRole,
      routed_to_tier: routedToTier,
      crew_confirmed_at: now,
      auth_signer: isWritingDevelopment ? body.crew_member_name : null,
      auth_timestamp: isWritingDevelopment ? now : null,
      lct_required: Boolean(body.lct_required),
      lct_reference: body.lct_reference || null,
      lct_child_performer: Boolean(body.lct_child_performer),
      lct_child_age_bracket: body.lct_child_age_bracket || null,
      lct_guardian_name: body.lct_guardian_name || null,
      lct_guardian_consent_ref: body.lct_guardian_consent_ref || null,
      lct_performance_licence_ref: body.lct_performance_licence_ref || null,
      notes: body.notes || null,
      vfx_software: body.vfx_software || null,
      vfx_data_location: body.vfx_data_location || null,
      vfx_no_training_confirmed: Boolean(body.vfx_no_training_confirmed),
      vfx_input_type: body.vfx_input_type || null,
      vfx_output_type: body.vfx_output_type || null,
      vfx_lct_confirmed: Boolean(body.vfx_lct_confirmed),
      sound_processing_location: body.sound_processing_location || null,
      sound_processing_type: body.sound_processing_type || null,
      sound_performer_audio: Boolean(body.sound_performer_audio),
      sound_no_training_confirmed: Boolean(body.sound_no_training_confirmed),
      writing_stage: body.writing_stage || null,
      writing_submitted_material: body.writing_submitted_material || null,
      writing_processing_location: body.writing_processing_location || null,
      writing_guild_status: body.writing_guild_status || null,
      writing_ai_contribution: body.writing_ai_contribution || null,
      writing_no_training_confirmed: Boolean(body.writing_no_training_confirmed),
      writing_authorship_declared: Boolean(body.writing_authorship_declared),
      writing_wga_writers_count: body.writing_wga_writers_count ? parseInt(body.writing_wga_writers_count, 10) : null,
      writing_wga_registration: body.writing_wga_registration || null,
      writing_wggb_context: body.writing_wggb_context || null,
      writing_wggb_paternity: Boolean(body.writing_wggb_paternity),
      colour_grading_system: body.colour_grading_system || null,
      colour_ai_grading: Boolean(body.colour_ai_grading),
      colour_performer_footage: Boolean(body.colour_performer_footage),
      colour_lct_confirmed: Boolean(body.colour_lct_confirmed),
      editorial_editing_system: body.editorial_editing_system || null,
      editorial_ai_tool_type: body.editorial_ai_tool_type || null,
      editorial_performer_footage: Boolean(body.editorial_performer_footage),
      editorial_lct_confirmed: Boolean(body.editorial_lct_confirmed),
      delivery_ai_tool_type: body.delivery_ai_tool_type || null,
      delivery_format: body.delivery_format || null,
      delivery_no_training_confirmed: Boolean(body.delivery_no_training_confirmed),
      facility_name: body.facility_name || null,
      render_processing_location: body.render_processing_location || null,
      facility_ai_policy_confirmed: Boolean(body.facility_ai_policy_confirmed),
      input_file_version: body.input_file_version || null,
      output_file_version: body.output_file_version || null,
    },
  })

  // For Writing + Development, generate the twin lock hash immediately (self-auth)
  if (isWritingDevelopment) {
    const hash = createHash('sha256')
      .update(JSON.stringify(receipt, Object.keys(receipt).sort()))
      .digest('hex')
    const withHash = await prisma.receipt.update({
      where: { id: receipt.id },
      data: { twin_lock_hash: hash },
    })
    return NextResponse.json(withHash, { status: 201 })
  }

  return NextResponse.json(receipt, { status: 201 })
}
