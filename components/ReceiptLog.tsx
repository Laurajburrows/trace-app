'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { DEPARTMENTS } from '@/lib/types'
import type { Receipt, Department, ToolStatus, SessionToolEntry, AdditionalToolEntry } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  GREEN: 'status-green',
  AMBER: 'status-amber',
  YELLOW: 'status-amber',
  RED: 'status-red',
  UNVERIFIED: 'status-red',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function exportCSV(receipts: Receipt[]) {
  const cols = [
    'id', 'production_name', 'date', 'department', 'crew_member_name', 'crew_role',
    'scene_usid', 'ai_tool_used', 'tool_status', 'por_description',
    'sel_output', 'sel_description', 'sel_detail',
    'arr_description', 'auth_signer', 'auth_timestamp', 'lct_required', 'lct_reference', 'notes',
  ]

  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return `"${s.replace(/"/g, '""')}"`
  }

  const rows = [
    cols.join(','),
    ...receipts.map((r) =>
      cols.map((c) => esc(r[c as keyof Receipt])).join(',')
    ),
  ].join('\n')

  const blob = new Blob([rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `TRACE-Receipt-Log-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function computeSubmissionHash(r: Receipt): Promise<string> {
  const exclude = new Set([
    'auth_signer', 'auth_timestamp', 'twin_lock_hash', 'status',
    'resubmitted_at', 'superseded_at', 'superseded_by', 'recalled_at',
  ])
  const payload: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(r)) {
    if (!exclude.has(k)) payload[k] = v
  }
  const sorted = Object.fromEntries(Object.entries(payload).sort())
  const json = JSON.stringify(sorted)
  const buf = new TextEncoder().encode(json)
  const hashBuf = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function exportReceiptJSON(r: Receipt) {
  const submissionHash = await computeSubmissionHash(r)
  const recDate = new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const output = {
    trace_document: 'TRACE© Artist Receipt',
    schema_version: '1.0',
    exported_at: new Date().toISOString(),
    receipt: {
      id: r.id,
      production: {
        production_name: r.production_name,
        date: r.date,
        formatted_date: recDate,
        script_date: r.script_date ?? null,
      },
      crew: {
        crew_member_name: r.crew_member_name,
        crew_role: r.crew_role,
        submitter_role: r.submitter_role ?? null,
      },
      department: r.department,
      scene: {
        scene_usid: r.scene_usid,
        scene_asset_reference: r.scene_asset_reference ?? null,
        reel: r.reel ?? null,
        timecode_range: r.timecode_range ?? null,
        session_file_reference: r.session_file_reference ?? null,
        deliverable_name: r.deliverable_name ?? null,
        writing_script_reference: r.writing_script_reference ?? null,
        writing_scene_number: r.writing_scene_number ?? null,
      },
      ai_tool: {
        ai_tool_used: r.ai_tool_used,
        tool_version: r.tool_version ?? null,
        tool_status: r.tool_status,
        whitelist_condition: r.whitelist_condition ?? null,
        tool_carbon_intensity: r.tool_carbon_intensity ?? null,
        is_session: r.is_session ?? false,
        session_tool_entries: r.session_tool_entries ?? null,
        additional_tools: r.additional_tools ?? null,
        input_file_version: r.input_file_version ?? null,
        output_file_version: r.output_file_version ?? null,
      },
      compliance: {
        por_description: r.por_description,
        sel_output: r.sel_output ?? null,
        sel_description: r.sel_description,
        sel_detail: r.sel_detail ?? null,
        arr_description: r.arr_description,
      },
      auth: {
        status: r.status,
        auth_signer: r.auth_signer ?? null,
        auth_timestamp: r.auth_timestamp ?? null,
        routed_to_tier: r.routed_to_tier ?? null,
        crew_confirmed_at: r.crew_confirmed_at ?? null,
      },
      lct: {
        lct_required: r.lct_required,
        lct_reference: r.lct_reference ?? null,
        lct_child_performer: r.lct_child_performer ?? false,
        lct_child_age_bracket: r.lct_child_age_bracket ?? null,
        lct_guardian_name: r.lct_guardian_name ?? null,
        lct_guardian_consent_ref: r.lct_guardian_consent_ref ?? null,
        lct_performance_licence_ref: r.lct_performance_licence_ref ?? null,
      },
      department_fields: {
        vfx: r.department === 'VFX' ? {
          vfx_software: r.vfx_software ?? null,
          vfx_data_location: r.vfx_data_location ?? null,
          vfx_no_training_confirmed: r.vfx_no_training_confirmed ?? false,
          vfx_input_type: r.vfx_input_type ?? null,
          vfx_output_type: r.vfx_output_type ?? null,
          vfx_lct_confirmed: r.vfx_lct_confirmed ?? false,
          vfx_sequence: (r as Receipt & { vfx_sequence?: string | null }).vfx_sequence ?? null,
          vfx_shot_version: (r as Receipt & { vfx_shot_version?: string | null }).vfx_shot_version ?? null,
          vfx_asset_type: (r as Receipt & { vfx_asset_type?: string | null }).vfx_asset_type ?? null,
          vfx_element_processed: (r as Receipt & { vfx_element_processed?: string | null }).vfx_element_processed ?? null,
        } : null,
        sound: (r.department === 'Sound' || r.department === 'Sound Post') ? {
          sound_processing_location: r.sound_processing_location ?? null,
          sound_processing_type: r.sound_processing_type ?? null,
          sound_performer_audio: r.sound_performer_audio ?? false,
          sound_no_training_confirmed: r.sound_no_training_confirmed ?? false,
        } : null,
        writing: r.department === 'Writing' ? {
          writing_stage: r.writing_stage ?? null,
          writing_submitted_material: r.writing_submitted_material ?? null,
          writing_processing_location: r.writing_processing_location ?? null,
          writing_guild_status: r.writing_guild_status ?? null,
          writing_ai_contribution: r.writing_ai_contribution ?? null,
          writing_no_training_confirmed: r.writing_no_training_confirmed ?? false,
          writing_authorship_declared: r.writing_authorship_declared ?? false,
          writing_wga_writers_count: r.writing_wga_writers_count ?? null,
          writing_wga_registration: r.writing_wga_registration ?? null,
          writing_wggb_context: r.writing_wggb_context ?? null,
          writing_wggb_paternity: r.writing_wggb_paternity ?? false,
        } : null,
        colour: r.department === 'Colour / DI' ? {
          colour_grading_system: r.colour_grading_system ?? null,
          colour_ai_grading: r.colour_ai_grading ?? false,
          colour_performer_footage: r.colour_performer_footage ?? false,
          colour_lct_confirmed: r.colour_lct_confirmed ?? false,
        } : null,
        editorial: r.department === 'Editorial' ? {
          editorial_editing_system: r.editorial_editing_system ?? null,
          editorial_ai_tool_type: r.editorial_ai_tool_type ?? null,
          editorial_performer_footage: r.editorial_performer_footage ?? false,
          editorial_lct_confirmed: r.editorial_lct_confirmed ?? false,
        } : null,
        delivery: r.department === 'Delivery / QC' ? {
          delivery_ai_tool_type: r.delivery_ai_tool_type ?? null,
          delivery_format: r.delivery_format ?? null,
          delivery_no_training_confirmed: r.delivery_no_training_confirmed ?? false,
        } : null,
        post_prod_facility: ['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC'].includes(r.department) ? {
          facility_name: r.facility_name ?? null,
          render_processing_location: r.render_processing_location ?? null,
          facility_ai_policy_confirmed: r.facility_ai_policy_confirmed ?? false,
        } : null,
      },
      third_party: {
        third_party_asset: r.third_party_asset ?? false,
        third_party_licence_confirmed: r.third_party_licence_confirmed ?? false,
      },
      notes: r.notes ?? null,
      supersession: {
        supersedes: r.supersedes ?? null,
        superseded_by: r.superseded_by ?? null,
        superseded_at: r.superseded_at ?? null,
        supersede_reason: r.supersede_reason ?? null,
      },
      timestamps: {
        created_at: r.created_at,
        crew_confirmed_at: r.crew_confirmed_at ?? null,
        auth_timestamp: r.auth_timestamp ?? null,
        recalled_at: r.recalled_at ?? null,
        resubmitted_at: r.resubmitted_at ?? null,
      },
      hashes: {
        submission_hash_sha256: submissionHash,
        auth_hash_sha256: r.twin_lock_hash ?? null,
        hash_note: 'submission_hash covers crew-submitted fields (excludes auth_signer, auth_timestamp, twin_lock_hash, status). auth_hash (TRACE Twin Lock) covers the complete authorised record as signed by HOD.',
      },
    },
  }

  const safeProd = r.production_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30)
  const dateStr = new Date(r.date).toISOString().split('T')[0]
  const shortId = r.id.slice(0, 8).toUpperCase()
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `TRACE-Receipt-${shortId}-${safeProd}-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportReceiptPDF(r: Receipt) {
  const submissionHash = await computeSubmissionHash(r)
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 15
  const cw = pageW - 2 * margin
  const col = cw / 2 - 3
  const lineH = 4.8
  let y = margin

  const shortId = r.id.slice(0, 8).toUpperCase()
  const recDate = new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const authDate = r.auth_timestamp
    ? new Date(r.auth_timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  function ensureSpace(needed: number) {
    if (y + needed > pageH - 18) {
      doc.addPage()
      y = margin
    }
  }

  function sectionBand(title: string) {
    ensureSpace(12)
    doc.setFillColor('#1A3D2B')
    doc.rect(margin, y, cw, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor('#F5F0E8')
    doc.text(title, margin + 3, y + 5)
    y += 9
  }

  function twoCol(pairs: [string, string | null | undefined][]) {
    const items = pairs.filter(([, v]) => v !== null && v !== undefined && v !== '')
    let i = 0
    while (i < items.length) {
      const [labelA, valA] = items[i]
      const [labelB, valB] = items[i + 1] ?? ['', null]
      const linesA = doc.splitTextToSize(String(valA ?? '—'), col)
      const linesB = valB ? doc.splitTextToSize(String(valB), col) : []
      const rowH = Math.max(linesA.length, linesB.length || 0) * lineH + 8
      ensureSpace(rowH)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor('#2D6A4F')
      doc.text(labelA.toUpperCase(), margin, y)
      if (valB) doc.text(labelB.toUpperCase(), margin + col + 6, y)
      y += 4

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor('#1C1C1C')
      doc.text(linesA, margin, y)
      if (linesB.length > 0) doc.text(linesB, margin + col + 6, y)
      y += Math.max(linesA.length, linesB.length || 0) * lineH + 2
      i += 2
    }
  }

  function fullField(label: string, value: string | null | undefined) {
    if (!value) return
    const lines = doc.splitTextToSize(value, cw)
    ensureSpace(lines.length * lineH + 10)
    if (label) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor('#2D6A4F')
      doc.text(label.toUpperCase(), margin, y)
      y += 4
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor('#1C1C1C')
    doc.text(lines, margin, y)
    y += lines.length * lineH + 2
  }

  function hashBox(hash: string) {
    ensureSpace(14)
    doc.setFillColor('#0A1C10')
    doc.rect(margin, y, cw, 10, 'F')
    doc.setFont('courier', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor('#F0EBE0')
    doc.text(hash || '—', margin + 3, y + 6.5)
    y += 13
  }

  // ── PAGE HEADER ──────────────────────────────────────────────────
  doc.setFillColor('#1A3D2B')
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor('#F5F0E8')
  doc.text('TRACE© ARTIST RECEIPT', margin, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor('#8BB5A0')
  doc.text(r.production_name, margin, 22)
  doc.setFontSize(8.5)
  doc.text(`Receipt ${shortId}   ·   ${recDate}   ·   AUTH COMPLETE`, pageW - margin, 22, { align: 'right' })
  y = 37

  // ── PRODUCTION & CREW ────────────────────────────────────────────
  sectionBand('Production & Crew')
  twoCol([
    ['Production', r.production_name],
    ['Date', recDate],
    ['Department', r.department],
    ['Script Date', r.script_date],
    ['Crew Member', r.crew_member_name],
    ['Role', r.crew_role],
    ['Shot / Scene Reference', r.scene_usid || null],
    ['Scene / Asset Reference', r.scene_asset_reference || null],
  ])
  if (r.department === 'VFX') {
    twoCol([
      ['VFX Sequence', (r as Receipt & { vfx_sequence?: string | null }).vfx_sequence || null],
      ['Shot Version', (r as Receipt & { vfx_shot_version?: string | null }).vfx_shot_version || null],
      ['Asset Type', (r as Receipt & { vfx_asset_type?: string | null }).vfx_asset_type || null],
      ['Element Processed', (r as Receipt & { vfx_element_processed?: string | null }).vfx_element_processed || null],
    ])
  }
  if (r.department === 'Writing') {
    twoCol([['Script Reference', r.writing_script_reference || null], ['Scene Number', r.writing_scene_number || null]])
  }
  if (r.department === 'Colour / DI' || r.department === 'Editorial') {
    twoCol([['Reel', r.reel || null], ['Timecode Range', r.timecode_range || null]])
  }
  if (r.department === 'Sound Post' && r.session_file_reference) {
    twoCol([['Session File Reference', r.session_file_reference], ['', null]])
  }
  if (r.department === 'Delivery / QC' && r.deliverable_name) {
    twoCol([['Deliverable Name', r.deliverable_name], ['', null]])
  }

  y += 2

  // ── AI TOOL ──────────────────────────────────────────────────────
  sectionBand('AI Tool')
  if (r.is_session && Array.isArray(r.session_tool_entries) && (r.session_tool_entries as SessionToolEntry[]).length > 0) {
    ;(r.session_tool_entries as SessionToolEntry[]).forEach((entry, i) => {
      ensureSpace(22)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor('#2D6A4F')
      doc.text(`TOOL ${i + 1} — ${entry.ai_tool_used}  (${entry.tool_status})`, margin, y)
      y += 5
      twoCol([
        ['Input Version', entry.input_file_version || null],
        ['Output Version', entry.output_file_version || null],
      ])
    })
  } else {
    twoCol([
      ['Tool Name', r.ai_tool_used],
      ['Version', r.tool_version || null],
      ['Status', r.tool_status],
      ['Carbon Intensity', r.tool_carbon_intensity || null],
    ])
    if (r.whitelist_condition) fullField('Whitelist Condition', r.whitelist_condition)
    if (r.input_file_version || r.output_file_version) {
      twoCol([['Input File Version', r.input_file_version || null], ['Output File Version', r.output_file_version || null]])
    }
  }

  y += 2

  // ── POR / SEL / ARR ──────────────────────────────────────────────
  sectionBand('POR — Point of Record')
  fullField('', r.por_description)

  y += 1
  sectionBand('SEL — Selection')
  twoCol([['What was selected', r.sel_output || null], ['Why selected', r.sel_description || null]])
  if (r.sel_detail) fullField('Selection Detail', r.sel_detail)

  y += 1
  sectionBand('ARR — Where did you end up?')
  fullField('', r.arr_description)

  y += 2

  // ── AUTH SIGN-OFF ────────────────────────────────────────────────
  sectionBand('AUTH Sign-Off')
  twoCol([
    ['AUTH Signer', r.auth_signer || null],
    ['AUTH Timestamp', authDate],
    ['Routing Tier', r.routed_to_tier || null],
    ['Receipt Status', 'AUTH COMPLETE'],
  ])

  y += 2

  // ── LCT ──────────────────────────────────────────────────────────
  if (r.lct_required) {
    sectionBand('Likeness Consent Token (LCT)')
    twoCol([['LCT Required', 'Yes'], ['LCT Reference', r.lct_reference || null]])
    if (r.lct_child_performer) {
      twoCol([
        ['Child Performer', 'Yes — under 18'],
        ['Age Bracket', r.lct_child_age_bracket || null],
        ['Guardian Name', r.lct_guardian_name || null],
        ['Consent Reference', r.lct_guardian_consent_ref || null],
        ['Performance Licence Ref', r.lct_performance_licence_ref || null],
        ['', null],
      ])
    }
    y += 2
  }

  // ── DEPARTMENT-SPECIFIC ──────────────────────────────────────────
  if (r.department === 'VFX') {
    sectionBand('VFX — Pipeline Compliance')
    twoCol([
      ['Software & Version', r.vfx_software || null],
      ['Data Processed At', r.vfx_data_location || null],
      ['Input Type', r.vfx_input_type || null],
      ['Output Type', r.vfx_output_type || null],
      ['No Training Confirmed', r.vfx_no_training_confirmed ? 'Confirmed' : 'Not confirmed'],
      ['LCT Verified', r.vfx_lct_confirmed ? 'Confirmed' : 'Not required / not confirmed'],
    ])
    y += 2
  }

  if (r.department === 'Sound' || r.department === 'Sound Post') {
    sectionBand(`${r.department} — Compliance`)
    twoCol([
      ['Processing Location', r.sound_processing_location || null],
      ['Type of Processing', r.sound_processing_type || null],
      ['Performer Dialogue', r.sound_performer_audio ? 'Yes' : 'No'],
      ['No Training Confirmed', r.sound_no_training_confirmed ? 'Confirmed' : 'Not confirmed'],
    ])
    y += 2
  }

  if (r.department === 'Writing') {
    sectionBand('Writing — Compliance')
    twoCol([
      ['Stage', r.writing_stage || null],
      ['Material Submitted', r.writing_submitted_material || null],
      ['Processing Location', r.writing_processing_location || null],
      ['Guild Status', r.writing_guild_status || null],
      ['AI Contribution', r.writing_ai_contribution || null],
      ['Writers in Session', r.writing_wga_writers_count != null ? String(r.writing_wga_writers_count) : null],
      ['WGA Registration', r.writing_wga_registration || null],
      ['WGGB Context', r.writing_wggb_context || null],
      ['Paternity Asserted', r.writing_wggb_paternity ? 'Confirmed (CDPA s.77)' : null],
      ['No Training Confirmed', r.writing_no_training_confirmed ? 'Confirmed' : 'Not confirmed'],
      ['Authorship Declared', r.writing_authorship_declared ? 'Confirmed' : 'Not confirmed'],
      ['', null],
    ])
    y += 2
  }

  if (r.department === 'Colour / DI') {
    sectionBand('Colour / DI — Compliance')
    twoCol([
      ['Grading System', r.colour_grading_system || null],
      ['AI-Assisted Grading', r.colour_ai_grading ? 'Yes' : 'No'],
      ['Performer Footage', r.colour_performer_footage ? 'Yes' : 'No'],
      ['LCT Verified', r.colour_lct_confirmed ? 'Confirmed' : r.colour_performer_footage ? 'Not confirmed' : 'N/A'],
    ])
    y += 2
  }

  if (r.department === 'Editorial') {
    sectionBand('Editorial — Compliance')
    twoCol([
      ['Editing System', r.editorial_editing_system || null],
      ['AI Tool Type', r.editorial_ai_tool_type || null],
      ['Performer Footage', r.editorial_performer_footage ? 'Yes' : 'No'],
      ['LCT Verified', r.editorial_lct_confirmed ? 'Confirmed' : r.editorial_performer_footage ? 'Not confirmed' : 'N/A'],
    ])
    y += 2
  }

  if (r.department === 'Delivery / QC') {
    sectionBand('Delivery / QC — Compliance')
    twoCol([
      ['AI Tool Type', r.delivery_ai_tool_type || null],
      ['Delivery Format', r.delivery_format || null],
      ['No Training Confirmed', r.delivery_no_training_confirmed ? 'Confirmed' : 'Not confirmed'],
    ])
    y += 2
  }

  if (['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC'].includes(r.department)) {
    sectionBand('Post-Production Facility')
    twoCol([
      ['Facility or Vendor', r.facility_name || null],
      ['Processing Location', r.render_processing_location || null],
      ['AI Policy Confirmed', r.facility_ai_policy_confirmed ? 'Confirmed' : 'Not confirmed'],
    ])
    y += 2
  }

  if (Array.isArray(r.additional_tools) && (r.additional_tools as AdditionalToolEntry[]).length > 0) {
    sectionBand('Additional Tools')
    ;(r.additional_tools as AdditionalToolEntry[]).forEach((at, i) => {
      ensureSpace(40)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor('#2D6A4F')
      doc.text(`ADDITIONAL TOOL ${i + 1} — ${at.ai_tool_used}  (${at.tool_status})`, margin, y)
      y += 5
      if (at.tool_version) twoCol([['Version', at.tool_version], ['', null]])
      fullField('POR', at.por_description)
      twoCol([['SEL — Selected', at.sel_output || null], ['Why selected', at.sel_description || null]])
      if (at.sel_detail) fullField('Selection Detail', at.sel_detail)
      fullField('ARR', at.arr_description)
      y += 2
    })
  }

  if (r.third_party_asset) {
    sectionBand('Third-Party Asset')
    twoCol([
      ['Third-Party Asset', 'Yes'],
      ['Licence Clearance', r.third_party_licence_confirmed ? 'Confirmed' : 'Not confirmed — review required'],
    ])
    y += 2
  }

  if (r.notes) {
    sectionBand('Notes')
    fullField('', r.notes)
    y += 2
  }

  if (r.supersedes || r.superseded_by) {
    sectionBand('Supersession')
    twoCol([
      r.supersedes ? ['Supersedes Receipt', r.supersedes.slice(0, 8).toUpperCase()] : ['', null],
      r.superseded_by ? ['Superseded By', r.superseded_by.slice(0, 8).toUpperCase()] : ['', null],
    ])
    if (r.supersede_reason) fullField('Reason', r.supersede_reason)
    y += 2
  }

  // ── INTEGRITY HASHES ─────────────────────────────────────────────
  sectionBand('TRACE© Twin Lock — Integrity Hashes')

  ensureSpace(42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor('#2D6A4F')
  doc.text('SUBMISSION HASH (SHA-256)', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#5A8A72')
  doc.text('Covers crew-submitted fields — excludes auth data', pageW - margin, y, { align: 'right' })
  y += 4.5
  hashBox(submissionHash)

  ensureSpace(24)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor('#2D6A4F')
  doc.text('AUTH HASH — TRACE TWIN LOCK (SHA-256)', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#5A8A72')
  doc.text('Covers complete authorised record including HOD sign-off', pageW - margin, y, { align: 'right' })
  y += 4.5
  hashBox(r.twin_lock_hash || '—')

  // ── FOOTERS ON ALL PAGES ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPages: number = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor('#2D6A4F')
    doc.setLineWidth(0.3)
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor('#5A8A72')
    doc.text('TRACE© Protocol — Artist Receipt — © Laura Burrows 2026', margin, pageH - 7)
    doc.text(`Receipt ${shortId} — Page ${p} of ${totalPages}`, pageW - margin, pageH - 7, { align: 'right' })
  }

  const safeProd = r.production_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30)
  const dateStr = new Date(r.date).toISOString().split('T')[0]
  doc.save(`TRACE-Receipt-${shortId}-${safeProd}-${dateStr}.pdf`)
}

export default function ReceiptLog() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [recallConfirming, setRecallConfirming] = useState<string | null>(null)
  const [recalling, setRecalling] = useState(false)
  const [discardConfirming, setDiscardConfirming] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState(false)
  const [pdfExporting, setPdfExporting] = useState<string | null>(null)
  const [jsonExporting, setJsonExporting] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    production: '',
    department: '' as Department | '',
    scene: '',
    status: '' as ToolStatus | '',
    dateFrom: '',
    dateTo: '',
    authSigner: '',
  })

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.production) params.set('production', filters.production)
    if (filters.department) params.set('department', filters.department)
    if (filters.scene) params.set('scene', filters.scene)
    if (filters.status) params.set('status', filters.status)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (filters.authSigner) params.set('authSigner', filters.authSigner)

    const res = await fetch(`/api/receipts?${params}`)
    const data = await res.json()
    setReceipts(data)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  function setFilter(k: keyof typeof filters, v: string) {
    setFilters((prev) => ({ ...prev, [k]: v }))
  }

  function clearFilters() {
    setFilters({ production: '', department: '', scene: '', status: '', dateFrom: '', dateTo: '', authSigner: '' })
  }

  const hasFilters = Object.values(filters).some((v) => v !== '')

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg p-4" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <div>
            <label className="label">Production</label>
            <input
              className="input"
              placeholder="Filter…"
              value={filters.production}
              onChange={(e) => setFilter('production', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Department</label>
            <select
              className="select"
              value={filters.department}
              onChange={(e) => setFilter('department', e.target.value as Department | '')}
            >
              <option value="">All</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Scene</label>
            <input
              className="input"
              placeholder="e.g. 42, 12A…"
              value={filters.scene}
              onChange={(e) => setFilter('scene', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Tool Status</label>
            <select
              className="select"
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value as ToolStatus | '')}
            >
              <option value="">All</option>
              {(['GREEN', 'AMBER', 'RED'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date From</label>
            <input
              type="date"
              className="input"
              value={filters.dateFrom}
              onChange={(e) => setFilter('dateFrom', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Date To</label>
            <input
              type="date"
              className="input"
              value={filters.dateTo}
              onChange={(e) => setFilter('dateTo', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Auth Signer</label>
            <input
              className="input"
              placeholder="Filter…"
              value={filters.authSigner}
              onChange={(e) => setFilter('authSigner', e.target.value)}
            />
          </div>
        </div>

        {hasFilters && (
          <div className="flex items-center flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(45,106,79,0.3)' }}>
            {filters.production && (
              <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(45,106,79,0.25)', color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}>
                Production: {filters.production}
                <button onClick={() => setFilter('production', '')} className="ml-0.5 hover:opacity-70" aria-label="Remove">✕</button>
              </span>
            )}
            {filters.department && (
              <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(45,106,79,0.25)', color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}>
                Dept: {filters.department}
                <button onClick={() => setFilter('department', '')} className="ml-0.5 hover:opacity-70" aria-label="Remove">✕</button>
              </span>
            )}
            {filters.scene && (
              <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(200,168,75,0.15)', color: '#C8A84B', border: '1px solid rgba(200,168,75,0.4)' }}>
                Scene: {filters.scene}
                <button onClick={() => setFilter('scene', '')} className="ml-0.5 hover:opacity-70" aria-label="Remove">✕</button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(45,106,79,0.25)', color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}>
                Status: {filters.status}
                <button onClick={() => setFilter('status', '')} className="ml-0.5 hover:opacity-70" aria-label="Remove">✕</button>
              </span>
            )}
            {filters.dateFrom && (
              <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(45,106,79,0.25)', color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}>
                From: {filters.dateFrom}
                <button onClick={() => setFilter('dateFrom', '')} className="ml-0.5 hover:opacity-70" aria-label="Remove">✕</button>
              </span>
            )}
            {filters.dateTo && (
              <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(45,106,79,0.25)', color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}>
                To: {filters.dateTo}
                <button onClick={() => setFilter('dateTo', '')} className="ml-0.5 hover:opacity-70" aria-label="Remove">✕</button>
              </span>
            )}
            {filters.authSigner && (
              <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(45,106,79,0.25)', color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}>
                Signer: {filters.authSigner}
                <button onClick={() => setFilter('authSigner', '')} className="ml-0.5 hover:opacity-70" aria-label="Remove">✕</button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="font-courier text-xs hover:underline ml-auto"
              style={{ color: '#C8A84B' }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Table actions */}
      <div className="flex items-center justify-between">
        <p className="font-courier text-xs" style={{ color: '#5A8A72' }}>
          {loading ? 'Loading…' : `${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => exportCSV(receipts)}
          disabled={receipts.length === 0}
          className="btn-secondary text-xs py-1.5 px-4 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
        {loading ? (
          <div className="py-16 text-center font-courier text-sm" style={{ color: '#5A8A72' }}>Loading receipts…</div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center font-courier text-sm" style={{ color: '#5A8A72' }}>
            No receipts found.{' '}
            {hasFilters ? (
              <button onClick={clearFilters} className="hover:underline" style={{ color: '#C8A84B' }}>
                Clear filters
              </button>
            ) : (
              <a href="/receipt/new" className="hover:underline" style={{ color: '#C8A84B' }}>
                Submit the first receipt.
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2D6A4F', backgroundColor: '#122E1F' }}>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Date</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Dept</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Crew Member</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Scene / Asset</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>AI Tool</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Status</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Auth Signer</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid rgba(45,106,79,0.4)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(45,106,79,0.15)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-courier text-xs" style={{ color: '#8BB5A0' }}>{fmt(r.date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-courier text-xs" style={{ color: '#8BB5A0' }}>{r.department}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-garamond text-base" style={{ color: '#F0EBE0' }}>{r.crew_member_name}</span>
                        <span className="block font-courier text-[10px] mt-0.5" style={{ color: '#5A8A72' }}>{r.crew_role}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-courier text-xs" style={{ color: '#8BB5A0' }}>{r.scene_usid}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: '#D4EDE1' }}>
                        {(() => {
                          const extraSession = r.is_session && Array.isArray(r.session_tool_entries) ? Math.max(0, (r.session_tool_entries as SessionToolEntry[]).length - 1) : 0
                          const extraAdditional = Array.isArray(r.additional_tools) ? (r.additional_tools as AdditionalToolEntry[]).length : 0
                          const extra = extraSession + extraAdditional
                          return extra > 0 ? (
                            <span className="flex items-center gap-2">
                              <span>{r.ai_tool_used}</span>
                              <span className="font-courier text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5" style={{ background: 'rgba(45,106,79,0.3)', color: '#8BB5A0' }}>
                                +{extra}
                              </span>
                            </span>
                          ) : r.ai_tool_used
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`status-badge ${STATUS_COLORS[r.tool_status]}`}>
                            {r.tool_status}
                          </span>
                          {Boolean(r.third_party_asset) && !r.third_party_licence_confirmed && (
                            <span
                              className="font-courier text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(200,168,75,0.15)', color: '#C8A84B', border: '1px solid rgba(200,168,75,0.4)' }}
                              title="Third-party licence clearance not confirmed — legal review required before delivery"
                            >
                              3P⚑
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.status === 'AUTH_COMPLETE' ? (
                          <span className="text-sm" style={{ color: '#D4EDE1' }}>{r.auth_signer}</span>
                        ) : r.status === 'SUPERSEDED' ? (
                          <div>
                            <span className="text-sm" style={{ color: '#8BB5A0' }}>{r.auth_signer}</span>
                            <span className="block font-courier text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#5A8A72' }}>Superseded</span>
                          </div>
                        ) : r.status === 'RECALLED' ? (
                          <span className="inline-flex items-center gap-1 font-courier text-xs font-semibold" style={{ color: '#C8A84B' }}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C8A84B' }} />
                            Recalled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-courier text-xs font-semibold" style={{ color: '#C8A84B' }}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C8A84B' }} />
                            Pending sign-off
                          </span>
                        )}
                      </td>
                    </tr>

                    {expanded === r.id && (
                      <tr style={{ backgroundColor: '#0F2419' }}>
                        <td colSpan={7} className="px-6 py-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-4">
                              <div>
                                <p className="label">Receipt ID</p>
                                <p className="font-courier text-xs break-all mt-1" style={{ color: '#5A8A72' }}>{r.id}</p>
                              </div>
                              <div>
                                <p className="label">POR — Point of Record</p>
                                <p className="whitespace-pre-wrap mt-1" style={{ color: '#D4EDE1' }}>{r.por_description}</p>
                              </div>
                              <div>
                                <p className="label">SEL — Selection</p>
                                <div className="space-y-2 mt-1">
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>What was selected</p>
                                    <p style={{ color: '#D4EDE1' }}>{r.sel_output || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Why selected</p>
                                    <p style={{ color: '#8BB5A0' }}>{r.sel_description || '—'}</p>
                                    {r.sel_detail && (
                                      <p className="text-xs italic mt-0.5" style={{ color: '#5A8A72' }}>{r.sel_detail}</p>
                                    )}
                                  </div>
                                </div>
                                <p className="font-courier text-xs mt-2" style={{ color: '#5A8A72' }}>Recorded: {fmtDateTime(r.created_at)}</p>
                              </div>
                              <div>
                                <p className="label">ARR — Where did you end up?</p>
                                <p className="whitespace-pre-wrap mt-1" style={{ color: '#D4EDE1' }}>{r.arr_description}</p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <p className="label">Stage 1 — Crew Confirmed</p>
                                <p className="font-courier text-xs mt-1" style={{ color: '#5A8A72' }}>
                                  {r.crew_confirmed_at ? fmtDateTime(r.crew_confirmed_at) : fmtDateTime(r.created_at)}
                                </p>
                                {r.recalled_at && (
                                  <p className="font-courier text-xs mt-1" style={{ color: '#C8A84B' }}>
                                    Recalled: {fmtDateTime(r.recalled_at)}
                                  </p>
                                )}
                                {r.resubmitted_at && (
                                  <p className="font-courier text-xs mt-1" style={{ color: '#5A8A72' }}>
                                    Resubmitted: {fmtDateTime(r.resubmitted_at)}
                                  </p>
                                )}
                                {r.status === 'PENDING_HOD_AUTH' && (
                                  <div className="mt-3">
                                    {recallConfirming === r.id ? (
                                      <div className="space-y-2">
                                        <p className="font-courier text-xs" style={{ color: '#C8A84B' }}>Are you sure you want to recall this receipt? It will be removed from the HOD queue and returned to draft.</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <button
                                            disabled={recalling}
                                            onClick={async () => {
                                              setRecalling(true)
                                              try {
                                                const res = await fetch(`/api/receipts/${r.id}/recall`, { method: 'PATCH' })
                                                if (!res.ok) throw new Error()
                                                window.location.href = `/receipt/edit/${r.id}`
                                              } catch {
                                                alert('Unable to recall this receipt. Please try again.')
                                                setRecallConfirming(null)
                                              } finally {
                                                setRecalling(false)
                                              }
                                            }}
                                            className="font-courier text-xs px-2 py-1 rounded"
                                            style={{ color: '#C8A84B', border: '1px solid rgba(200,168,75,0.4)' }}
                                          >
                                            {recalling ? 'Recalling…' : 'Confirm recall'}
                                          </button>
                                          <button
                                            onClick={() => setRecallConfirming(null)}
                                            className="font-courier text-xs px-2 py-1 rounded"
                                            style={{ color: '#5A8A72', border: '1px solid rgba(90,138,114,0.4)' }}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setRecallConfirming(r.id)}
                                        className="font-courier text-xs px-2 py-1 rounded"
                                        style={{ color: '#C8A84B', border: '1px solid rgba(200,168,75,0.4)' }}
                                      >
                                        Recall this receipt
                                      </button>
                                    )}
                                  </div>
                                )}
                                {(r.status === 'RECALLED' || r.status.startsWith('PENDING_')) && (
                                  <div className="mt-3">
                                    {discardConfirming === r.id ? (
                                      <div className="space-y-2">
                                        <p className="font-courier text-xs" style={{ color: '#E05252' }}>This will permanently delete this receipt. This action cannot be undone.</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <button
                                            disabled={discarding}
                                            onClick={async () => {
                                              setDiscarding(true)
                                              try {
                                                const res = await fetch(`/api/receipts/${r.id}`, { method: 'DELETE' })
                                                if (!res.ok) throw new Error()
                                                await fetchReceipts()
                                                setDiscardConfirming(null)
                                              } catch {
                                                alert('Unable to discard this receipt. Please try again.')
                                                setDiscardConfirming(null)
                                              } finally {
                                                setDiscarding(false)
                                              }
                                            }}
                                            className="font-courier text-xs px-2 py-1 rounded"
                                            style={{ color: '#E05252', border: '1px solid rgba(224,82,82,0.4)' }}
                                          >
                                            {discarding ? 'Discarding…' : 'Confirm discard'}
                                          </button>
                                          <button
                                            onClick={() => setDiscardConfirming(null)}
                                            className="font-courier text-xs px-2 py-1 rounded"
                                            style={{ color: '#5A8A72', border: '1px solid rgba(90,138,114,0.4)' }}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setDiscardConfirming(r.id)}
                                        className="font-courier text-xs px-2 py-1 rounded"
                                        style={{ color: '#E05252', border: '1px solid rgba(224,82,82,0.4)' }}
                                      >
                                        Discard receipt
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="label">Stage 2 — AUTH Signature</p>
                                {r.status === 'AUTH_COMPLETE' ? (
                                  <>
                                    <p className="mt-1" style={{ color: '#D4EDE1' }}>{r.auth_signer}</p>
                                    <p className="font-courier text-xs" style={{ color: '#5A8A72' }}>{r.auth_timestamp ? fmtDateTime(r.auth_timestamp) : '—'}</p>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-courier text-xs font-semibold mt-1" style={{ color: '#C8A84B' }}>
                                    <span className="w-2 h-2 rounded-full" style={{ background: '#C8A84B' }} />
                                    Pending HOD sign-off
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="label">LCT Required</p>
                                <p className="mt-1" style={{ color: '#D4EDE1' }}>{r.lct_required ? 'Yes' : 'No'}</p>
                                {r.lct_required && r.lct_reference && (
                                  <p className="font-courier text-xs mt-0.5" style={{ color: '#5A8A72' }}>Ref: {r.lct_reference}</p>
                                )}
                                {r.lct_required && r.lct_child_performer && (
                                  <div className="mt-2 rounded px-3 py-2" style={{ background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.35)' }}>
                                    <p className="font-courier text-xs font-semibold uppercase tracking-wide" style={{ color: '#C8A84B' }}>Child performer — under 18</p>
                                    {r.lct_child_age_bracket && (
                                      <p className="text-xs mt-0.5" style={{ color: '#C8A84B', opacity: 0.85 }}>Age bracket: {r.lct_child_age_bracket}</p>
                                    )}
                                    {r.lct_guardian_name && (
                                      <p className="text-xs" style={{ color: '#C8A84B', opacity: 0.85 }}>Guardian: {r.lct_guardian_name}</p>
                                    )}
                                    {r.lct_guardian_consent_ref && (
                                      <p className="text-xs" style={{ color: '#C8A84B', opacity: 0.85 }}>Consent ref: {r.lct_guardian_consent_ref}</p>
                                    )}
                                    {r.lct_performance_licence_ref && (
                                      <p className="text-xs" style={{ color: '#C8A84B', opacity: 0.85 }}>Licence ref: {r.lct_performance_licence_ref}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                              {Boolean(r.third_party_asset) && (
                                <div>
                                  <p className="label">Third-Party Asset</p>
                                  {r.third_party_licence_confirmed ? (
                                    <p className="font-courier text-xs mt-1 font-semibold" style={{ color: '#8BB5A0' }}>
                                      Licence clearance confirmed by producer
                                    </p>
                                  ) : (
                                    <div className="mt-1 rounded px-3 py-2" style={{ background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.35)' }}>
                                      <p className="font-courier text-xs font-semibold uppercase tracking-wide" style={{ color: '#C8A84B' }}>Third-party licence clearance not confirmed</p>
                                      <p className="text-xs mt-0.5" style={{ color: '#C8A84B', opacity: 0.85 }}>Legal review required before delivery.</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {r.notes && (
                                <div>
                                  <p className="label">Notes</p>
                                  <p className="whitespace-pre-wrap mt-1" style={{ color: '#D4EDE1' }}>{r.notes}</p>
                                </div>
                              )}
                              {r.twin_lock_hash ? (
                                <div>
                                  <p className="label">TRACE Twin Lock — AUTH Hash (SHA-256)</p>
                                  <div className="rounded px-3 py-2 mt-1" style={{ background: '#0A1C10', border: '1px solid #2D6A4F' }}>
                                    <p className="font-courier text-xs break-all" style={{ color: '#F0EBE0', lineHeight: 1.7 }}>
                                      {r.twin_lock_hash}
                                    </p>
                                  </div>
                                  {r.status === 'AUTH_COMPLETE' && !r.superseded_by && (
                                    <div className="mt-2">
                                      <a
                                        href={`/receipt/new?supersedes=${r.id}`}
                                        className="font-courier text-xs"
                                        style={{ color: '#5A8A72' }}
                                      >
                                        Supersede this receipt
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <p className="label">TRACE Twin Lock — SHA-256</p>
                                  <p className="font-courier text-xs italic mt-1" style={{ color: '#5A8A72' }}>Generated on HOD sign-off</p>
                                </div>
                              )}
                              {r.superseded_by && (
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Superseded by receipt</p>
                                  <p className="font-courier text-xs mt-0.5" style={{ color: '#8BB5A0' }}>{r.superseded_by.slice(0, 8)}</p>
                                </div>
                              )}
                              {r.supersedes && (
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Supersedes receipt</p>
                                  <p className="font-courier text-xs mt-0.5" style={{ color: '#8BB5A0' }}>{r.supersedes.slice(0, 8)}</p>
                                  {r.supersede_reason && (
                                    <div className="mt-2">
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Reason for superseding</p>
                                      <p className="text-xs mt-0.5 whitespace-pre-wrap" style={{ color: '#D4EDE1' }}>{r.supersede_reason}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {r.is_session && Array.isArray(r.session_tool_entries) && (r.session_tool_entries as SessionToolEntry[]).length > 1 && (
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                              <p className="label mb-3">Session Tool Log — {(r.session_tool_entries as SessionToolEntry[]).length} tools</p>
                              <div className="space-y-3">
                                {(r.session_tool_entries as SessionToolEntry[]).map((entry, i) => (
                                  <div key={i} className="rounded px-4 py-3" style={{ background: '#0F2419', border: '1px solid rgba(45,106,79,0.4)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Tool {i + 1}</p>
                                      <span className={`status-badge ${STATUS_COLORS[entry.tool_status] || 'status-red'}`}>{entry.tool_status}</span>
                                    </div>
                                    <p className="text-sm font-medium mb-2" style={{ color: '#F0EBE0' }}>{entry.ai_tool_used}</p>
                                    {(entry.input_file_version || entry.output_file_version) && (
                                      <div className="flex gap-6 mt-1">
                                        {entry.input_file_version && (
                                          <div>
                                            <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Input version</p>
                                            <p className="font-courier text-xs mt-0.5" style={{ color: '#8BB5A0' }}>{entry.input_file_version}</p>
                                          </div>
                                        )}
                                        {entry.output_file_version && (
                                          <div>
                                            <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Output version</p>
                                            <p className="font-courier text-xs mt-0.5" style={{ color: '#8BB5A0' }}>{entry.output_file_version}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {Array.isArray(r.additional_tools) && (r.additional_tools as AdditionalToolEntry[]).length > 0 && (
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                              <p className="label mb-3">Additional Tools — {(r.additional_tools as AdditionalToolEntry[]).length} tool{(r.additional_tools as AdditionalToolEntry[]).length !== 1 ? 's' : ''} in this session</p>
                              <div className="space-y-4">
                                {(r.additional_tools as AdditionalToolEntry[]).map((at, i) => (
                                  <div key={i} className="rounded px-4 py-4" style={{ background: '#0F2419', border: '1px solid rgba(45,106,79,0.4)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Tool {i + 1}</p>
                                      <span className={`status-badge ${STATUS_COLORS[at.tool_status] || 'status-red'}`}>{at.tool_status}</span>
                                    </div>
                                    <p className="text-sm font-medium mb-1" style={{ color: '#F0EBE0' }}>{at.ai_tool_used}</p>
                                    {at.tool_version && (
                                      <p className="font-courier text-xs mb-3" style={{ color: '#5A8A72' }}>Version: {at.tool_version}</p>
                                    )}
                                    <div className="space-y-3 mt-3">
                                      <div>
                                        <p className="font-courier text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#5A8A72' }}>POR</p>
                                        <p className="text-sm whitespace-pre-wrap" style={{ color: '#D4EDE1' }}>{at.por_description}</p>
                                      </div>
                                      <div>
                                        <p className="font-courier text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#5A8A72' }}>SEL</p>
                                        <p style={{ color: '#D4EDE1' }}>{at.sel_output}</p>
                                        <p className="text-xs mt-0.5" style={{ color: '#8BB5A0' }}>
                                          {at.sel_description}{at.sel_detail ? ` — ${at.sel_detail}` : ''}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="font-courier text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#5A8A72' }}>ARR</p>
                                        <p className="text-sm whitespace-pre-wrap" style={{ color: '#D4EDE1' }}>{at.arr_description}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.department === 'VFX' && (
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                              <p className="label mb-3">VFX — Pipeline Compliance</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                {(r as Receipt & { vfx_sequence?: string | null }).vfx_sequence && (
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>VFX Sequence</p>
                                    <p style={{ color: '#D4EDE1' }}>{(r as Receipt & { vfx_sequence?: string | null }).vfx_sequence}</p>
                                  </div>
                                )}
                                {(r as Receipt & { vfx_shot_version?: string | null }).vfx_shot_version && (
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Shot Version</p>
                                    <p style={{ color: '#D4EDE1' }}>{(r as Receipt & { vfx_shot_version?: string | null }).vfx_shot_version}</p>
                                  </div>
                                )}
                                {(r as Receipt & { vfx_asset_type?: string | null }).vfx_asset_type && (
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Asset Type</p>
                                    <p style={{ color: '#D4EDE1' }}>{(r as Receipt & { vfx_asset_type?: string | null }).vfx_asset_type}</p>
                                  </div>
                                )}
                                {(r as Receipt & { vfx_element_processed?: string | null }).vfx_element_processed && (
                                  <div className="sm:col-span-2">
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Element Processed</p>
                                    <p style={{ color: '#D4EDE1' }}>{(r as Receipt & { vfx_element_processed?: string | null }).vfx_element_processed}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Software and version</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.vfx_software || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Data processed</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.vfx_data_location || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Input type</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.vfx_input_type || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widests" style={{ color: '#5A8A72' }}>Output type</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.vfx_output_type || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>No training on production footage</p>
                                  <p className={r.vfx_no_training_confirmed ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                    {r.vfx_no_training_confirmed ? 'Confirmed' : 'Not confirmed'}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>LCT verified</p>
                                  <p className={r.vfx_lct_confirmed ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                    {r.vfx_lct_confirmed ? 'Confirmed' : r.vfx_input_type === 'Plate footage containing performers' ? 'Not confirmed' : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          {(r.department === 'Sound' || r.department === 'Sound Post') && (() => {
                            const cloudFlag = r.sound_performer_audio && r.sound_processing_location !== 'Local software — not uploaded'
                            return (
                              <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                                <p className="label mb-3">{r.department} — Additional Compliance</p>
                                {cloudFlag && (
                                  <div className="mb-3 rounded px-3 py-2" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.35)' }}>
                                    <p className="font-courier text-xs font-semibold uppercase tracking-wide" style={{ color: '#f87171' }}>Cloud processing flag — performer dialogue</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#f87171', opacity: 0.85 }}>Performer audio sent to cloud. Verify consent and data security policy compliance.</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Processing location</p>
                                    <p style={{ color: '#D4EDE1' }}>{r.sound_processing_location || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Type of processing</p>
                                    <p style={{ color: '#D4EDE1' }}>{r.sound_processing_type || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Performer dialogue</p>
                                    <p style={{ color: '#D4EDE1' }}>{r.sound_performer_audio ? 'Yes' : 'No'}</p>
                                  </div>
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>No model training confirmed</p>
                                    <p className={r.sound_no_training_confirmed ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                      {r.sound_no_training_confirmed ? 'Confirmed' : 'Not confirmed'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                          {r.department === 'Writing' && (
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                              <p className="label mb-3">Writing — Additional Compliance</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Stage</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.writing_stage || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Material submitted</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.writing_submitted_material || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Processing location</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.writing_processing_location || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Guild status</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.writing_guild_status || '—'}</p>
                                </div>
                                {r.writing_guild_status === 'WGA' && (
                                  <>
                                    <div>
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Writers in session</p>
                                      <p style={{ color: '#D4EDE1' }}>{r.writing_wga_writers_count ?? '—'}</p>
                                    </div>
                                    <div>
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>WGA registration</p>
                                      <p style={{ color: '#D4EDE1' }}>{r.writing_wga_registration || '—'}</p>
                                    </div>
                                  </>
                                )}
                                {r.writing_guild_status === 'WGGB' && (
                                  <>
                                    <div>
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Writing context</p>
                                      <p style={{ color: '#D4EDE1' }}>{r.writing_wggb_context || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Paternity asserted (CDPA s.77)</p>
                                      <p className={r.writing_wggb_paternity ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                        {r.writing_wggb_paternity ? 'Confirmed' : 'Not confirmed'}
                                      </p>
                                    </div>
                                  </>
                                )}
                                <div className="sm:col-span-2">
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>AI contribution</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.writing_ai_contribution || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>No model training confirmed</p>
                                  <p className={r.writing_no_training_confirmed ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                    {r.writing_no_training_confirmed ? 'Confirmed' : 'Not confirmed — flagged'}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Authorship declared</p>
                                  <p className={r.writing_authorship_declared ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                    {r.writing_authorship_declared ? 'Confirmed' : 'Not confirmed'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          {r.status === 'AUTH_COMPLETE' && (
                            <div className="mt-5 pt-5 flex items-center gap-3 flex-wrap" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                              <button
                                onClick={async () => {
                                  setPdfExporting(r.id)
                                  try { await exportReceiptPDF(r) } finally { setPdfExporting(null) }
                                }}
                                disabled={pdfExporting === r.id}
                                className="inline-flex items-center gap-2 font-courier text-xs px-4 py-2 rounded transition-opacity disabled:opacity-60"
                                style={{ background: '#1A3D2B', color: '#F5F0E8', border: '1px solid #2D6A4F' }}
                              >
                                {pdfExporting === r.id ? 'Generating…' : 'Export PDF'}
                              </button>
                              <button
                                onClick={async () => {
                                  setJsonExporting(r.id)
                                  try { await exportReceiptJSON(r) } finally { setJsonExporting(null) }
                                }}
                                disabled={jsonExporting === r.id}
                                className="inline-flex items-center gap-2 font-courier text-xs px-4 py-2 rounded transition-opacity disabled:opacity-60"
                                style={{ color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}
                              >
                                {jsonExporting === r.id ? 'Exporting…' : 'Export JSON'}
                              </button>
                            </div>
                          )}
                          {['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC'].includes(r.department) && (
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                              <p className="label mb-3">Post-Production Facility</p>
                              {!r.facility_ai_policy_confirmed && (
                                <div className="mb-3 rounded px-3 py-2" style={{ background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.35)' }}>
                                  <p className="font-courier text-xs font-semibold uppercase tracking-wide" style={{ color: '#C8A84B' }}>Facility AI policy — unconfirmed</p>
                                  <p className="text-xs mt-0.5" style={{ color: '#C8A84B', opacity: 0.85 }}>No written AI policy confirmation on record. Obtain written confirmation from the facility before delivery.</p>
                                </div>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                {r.facility_name && (
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Facility</p>
                                    <p style={{ color: '#D4EDE1' }}>{r.facility_name}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Render / processing location</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.render_processing_location || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Facility AI policy confirmed</p>
                                  <p className={r.facility_ai_policy_confirmed ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                    {r.facility_ai_policy_confirmed ? 'Confirmed' : 'Not confirmed — flagged'}
                                  </p>
                                </div>
                                {(r.input_file_version || r.output_file_version) && (
                                  <>
                                    {r.input_file_version && (
                                      <div>
                                        <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Input file version</p>
                                        <p className="font-courier text-xs mt-0.5" style={{ color: '#D4EDE1' }}>{r.input_file_version}</p>
                                      </div>
                                    )}
                                    {r.output_file_version && (
                                      <div>
                                        <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Output file version</p>
                                        <p className="font-courier text-xs mt-0.5" style={{ color: '#D4EDE1' }}>{r.output_file_version}</p>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
