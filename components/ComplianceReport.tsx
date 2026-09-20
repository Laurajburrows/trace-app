'use client'

import { useState, useEffect, useRef } from 'react'
import { DEPARTMENTS } from '@/lib/types'
import type { ReportData, Receipt, ToolStatus, AdditionalToolEntry, CrewConsent } from '@/lib/types'

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
    month: 'long',
    year: 'numeric',
  })
}

function buildPdfFilterLabel(filterDescription: string): string {
  return filterDescription
    .split(' · ')
    .map((part) => {
      const colon = part.indexOf(': ')
      if (colon === -1) return part
      const key = part.slice(0, colon)
      const val = part.slice(colon + 2)
      if (key === 'Department') return `${val} Department`
      if (key === 'Scene') return `Scene ${val}`
      if (key === 'Tool Status') return `${val} Tools`
      if (key === 'From') return `From ${val}`
      if (key === 'To') return `To ${val}`
      return part
    })
    .join(' — ')
}

const CARBON_KWH_RANGES: Record<string, [number, number]> = {
  Low: [0.001, 0.01],
  Medium: [0.002, 0.05],
  High: [0.1, 1.0],
  'Very High': [100, 1000],
}
const CO2E_PER_KWH = 0.2
const CARBON_INTENSITY_COLORS_REPORT: Record<string, string> = {
  Low: '#4ade80',
  Medium: '#C8A84B',
  High: '#fb923c',
  'Very High': '#f87171',
}

interface CarbonRow {
  tool: string
  count: number
  intensity: string
  kwhMin: number
  kwhMax: number
  co2Min: number
  co2Max: number
  isExample?: boolean
}

function fmtNum(v: number): string {
  if (v === 0) return '0'
  if (v < 0.001) return v.toFixed(5)
  if (v < 1) return v.toFixed(3)
  if (v < 10) return v.toFixed(2)
  if (v < 1000) return v.toFixed(1)
  return v.toLocaleString('en-GB', { maximumFractionDigits: 0 })
}

function buildCarbonRows(receipts: Receipt[]): { rows: CarbonRow[]; isExample: boolean } {
  const withCarbon = receipts.filter((r) => r.tool_carbon_intensity)
  if (withCarbon.length === 0) {
    const examples = [
      { tool: 'Claude', intensity: 'Low', count: 12 },
      { tool: 'Midjourney', intensity: 'Medium', count: 8 },
      { tool: 'Runway', intensity: 'High', count: 5 },
    ]
    return {
      rows: examples.map((e) => {
        const range = CARBON_KWH_RANGES[e.intensity]
        return {
          tool: e.tool, count: e.count, intensity: e.intensity,
          kwhMin: range[0] * e.count, kwhMax: range[1] * e.count,
          co2Min: range[0] * e.count * CO2E_PER_KWH, co2Max: range[1] * e.count * CO2E_PER_KWH,
          isExample: true,
        }
      }),
      isExample: true,
    }
  }
  const groups: Record<string, { count: number; intensity: string }> = {}
  for (const r of withCarbon) {
    const key = r.ai_tool_used
    if (!groups[key]) groups[key] = { count: 0, intensity: r.tool_carbon_intensity! }
    groups[key].count++
  }
  const order = ['Very High', 'High', 'Medium', 'Low']
  const rows: CarbonRow[] = Object.entries(groups).map(([tool, { count, intensity }]) => {
    const range = CARBON_KWH_RANGES[intensity] || [0.001, 0.01]
    return {
      tool, count, intensity,
      kwhMin: range[0] * count, kwhMax: range[1] * count,
      co2Min: range[0] * count * CO2E_PER_KWH, co2Max: range[1] * count * CO2E_PER_KWH,
    }
  }).sort((a, b) => order.indexOf(a.intensity) - order.indexOf(b.intensity))
  return { rows, isExample: false }
}

async function generatePDF(report: ReportData, mode: 'summary' | 'audit' = 'summary') {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const pageW = 210
  const pageH = 297
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  const FOREST = [26, 61, 43] as [number, number, number]
  const MOSS = [45, 106, 79] as [number, number, number]
  const DARK = [30, 30, 30] as [number, number, number]
  const MID = [80, 80, 80] as [number, number, number]
  const LIGHT = [140, 140, 140] as [number, number, number]
  const GREEN_C = [46, 125, 50] as [number, number, number]
  const YELLOW_C = [200, 132, 26] as [number, number, number]
  const RED_C = [198, 40, 40] as [number, number, number]

  function statusColor(s: string): [number, number, number] {
    if (s === 'GREEN') return GREEN_C
    if (s === 'AMBER' || s === 'YELLOW') return YELLOW_C
    return RED_C
  }

  function newPage() {
    doc.addPage()
    y = margin
    // footer on each page
    doc.setFontSize(7)
    doc.setTextColor(...LIGHT)
    doc.text(
      `TRACE Compliance Report — ${report.production_name} — Confidential`,
      margin,
      pageH - 10
    )
    doc.text(`Page ${doc.getNumberOfPages()}`, pageW - margin, pageH - 10, { align: 'right' })
  }

  function checkPage(needed: number) {
    if (y + needed > pageH - 16) newPage()
  }

  function h1(text: string) {
    checkPage(14)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...FOREST)
    doc.text(text, margin, y)
    y += 10
  }

  function h2(text: string) {
    checkPage(12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MOSS)
    doc.text(text.toUpperCase(), margin, y)
    // underline
    doc.setDrawColor(...MOSS)
    doc.setLineWidth(0.3)
    doc.line(margin, y + 1, pageW - margin, y + 1)
    y += 8
  }

  function h3(text: string) {
    checkPage(8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(text, margin, y)
    y += 6
  }

  function body(text: string, indent = 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    const lines = doc.splitTextToSize(text, contentW - indent)
    checkPage(lines.length * 4.5 + 2)
    doc.text(lines, margin + indent, y)
    y += lines.length * 4.5 + 2
  }

  function kv(label: string, value: string) {
    checkPage(6)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(label + ':', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    const lines = doc.splitTextToSize(value, contentW - 45)
    doc.text(lines, margin + 45, y)
    y += Math.max(5, lines.length * 4.5) + 1
  }

  function gap(n = 4) {
    y += n
  }

  function rule() {
    checkPage(4)
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageW - margin, y)
    y += 4
  }

  function tableRow(
    cols: string[],
    widths: number[],
    isHeader = false,
    rowColor?: [number, number, number]
  ) {
    const rowH = 7
    checkPage(rowH + 2)

    if (isHeader) {
      doc.setFillColor(240, 248, 244)
      doc.rect(margin, y - 5, contentW, rowH, 'F')
    }

    let x = margin
    cols.forEach((col, i) => {
      doc.setFontSize(8)
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal')
      doc.setTextColor(...(rowColor ?? (isHeader ? FOREST : MID)))
      const lines = doc.splitTextToSize(col, widths[i] - 2)
      doc.text(lines[0] || '', x + 1, y)
      x += widths[i]
    })

    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.1)
    doc.line(margin, y + 2, pageW - margin, y + 2)
    y += rowH
  }

  // ── PAGE 1: COVER ──────────────────────────────────────────────────────────
  doc.setFillColor(...FOREST)
  doc.rect(0, 0, pageW, 60, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text('TRACE Compliance Report', margin, 26)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(212, 237, 225)
  doc.text('Transparent Record of Authorship in Creative Environments', margin, 35)

  if (report.filter_description) {
    const filterLabel = buildPdfFilterLabel(report.filter_description)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(200, 168, 75)
    doc.text(`— ${filterLabel}`, margin, 45)
  }

  y = 70

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(report.production_name, margin, y)
  y += 8

  kv('Date Range', `${fmt(report.date_range.from)} — ${fmt(report.date_range.to)}`)
  kv('Total Receipts', String(report.receipts.length))
  kv('AUTH-Signed Receipts', String(report.auth_signed_count))
  kv('GREEN Tool Use', `${report.green_pct}%`)
  kv('Report Generated', fmt(report.generated_at))
  if (report.filter_description) kv('Filtered By', report.filter_description)

  gap(6)
  rule()
  body(
    'This report was generated by the TRACE Artist Receipt Logger. It constitutes a documentary record of human authorial control over AI-assisted creative decisions made during the above production. It is prepared in accordance with the principles established in Thaler v. Perlmutter (2025).'
  )

  // ── SECTION 2: CHAIN OF TITLE SUMMARY ─────────────────────────────────────
  newPage()
  h2('1. Chain of Title Summary')
  gap(2)

  body(
    `This production has ${report.receipts.length} logged Artist Receipt${report.receipts.length !== 1 ? 's' : ''}, covering ${Object.keys(report.by_department).length} department${Object.keys(report.by_department).length !== 1 ? 's' : ''}. All ${report.auth_signed_count} receipts carry an AUTH signature confirming human authorial control. ${report.green_pct}% of receipts record use of GREEN-status (vetted) AI tools.`
  )
  gap(4)

  h3('Receipts by Department')
  tableRow(['Department', 'Receipt Count', '%'], [90, 50, 60], true)
  Object.entries(report.by_department)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dept, count]) => {
      const pct = Math.round((count / report.receipts.length) * 100)
      tableRow([dept, String(count), `${pct}%`], [90, 50, 60])
    })

  gap(6)
  h3('Authorising Signatories')
  const signers = Array.from(new Set(report.receipts.map((r) => r.auth_signer).filter((s): s is string => !!s)))
  signers.forEach((s) => {
    const count = report.receipts.filter((r) => r.auth_signer === s).length
    tableRow([s, `${count} receipt${count !== 1 ? 's' : ''}`], [120, 80])
  })

  // ── SECTION 3: AI CARBON ESTIMATE ─────────────────────────────────────────
  newPage()
  h2('2. AI Carbon Estimate')
  gap(2)
  {
    const { rows, isExample } = buildCarbonRows(report.receipts)
    if (isExample) {
      body('No carbon intensity data found for current receipts. The following figures are example data for demonstration purposes.')
      gap(2)
    }
    tableRow(['Tool', 'Receipts', 'Intensity', 'Est. kWh Range', 'Est. CO₂e Range'], [50, 22, 25, 48, 48], true)
    const totalCount = rows.reduce((s, r) => s + r.count, 0)
    const totalKwhMin = rows.reduce((s, r) => s + r.kwhMin, 0)
    const totalKwhMax = rows.reduce((s, r) => s + r.kwhMax, 0)
    const totalCo2Min = rows.reduce((s, r) => s + r.co2Min, 0)
    const totalCo2Max = rows.reduce((s, r) => s + r.co2Max, 0)
    rows.forEach((row) => {
      tableRow(
        [row.tool + (row.isExample ? ' [Ex]' : ''), String(row.count), row.intensity, `${fmtNum(row.kwhMin)}–${fmtNum(row.kwhMax)} kWh`, `${fmtNum(row.co2Min)}–${fmtNum(row.co2Max)} kg`],
        [50, 22, 25, 48, 48]
      )
    })
    tableRow(['Total', String(totalCount), '', `${fmtNum(totalKwhMin)}–${fmtNum(totalKwhMax)} kWh`, `${fmtNum(totalCo2Min)}–${fmtNum(totalCo2Max)} kg`], [50, 22, 25, 48, 48], false, MOSS)
    gap(4)
    body('Carbon estimates are based on published academic research. AI tool providers do not publish per-query energy data. These figures are order-of-magnitude estimates, not precise measurements.')
  }

  // ── SECTION 4: GUILD COMPLIANCE REGISTER ──────────────────────────────────
  newPage()
  h2('3. Guild Compliance Register')
  gap(2)
  body(
    'The following table lists every AI tool used on this production, its compliance status, the number of uses, and the departments in which it was used. Any RED or YELLOW status tool is flagged for review.'
  )
  gap(4)

  tableRow(['Tool', 'Status', 'Uses', 'Departments'], [70, 30, 20, 80], true)
  report.by_tool.forEach((t) => {
    const isFlag = t.status === 'RED' || t.status === 'YELLOW'
    tableRow(
      [t.tool, t.status, String(t.count), t.departments.join(', ')],
      [70, 30, 20, 80],
      false,
      isFlag ? statusColor(t.status) : undefined
    )
  })

  const flagged = report.by_tool.filter((t) => t.status !== 'GREEN')
  if (flagged.length > 0) {
    gap(6)
    h3('Flagged Tool Use')
    body(
      `${flagged.length} tool${flagged.length !== 1 ? 's' : ''} with non-GREEN status ${flagged.length !== 1 ? 'were' : 'was'} recorded: ${flagged.map((t) => `${t.tool} (${t.status})`).join(', ')}. These uses are documented in the receipts below and carry AUTH signatures confirming that human oversight was maintained.`
    )
  }

  // ── SECTION 5: AI TOOL AUDIT ───────────────────────────────────────────────
  newPage()
  h2('4. AI Tool Audit')
  gap(2)
  body(
    `${report.by_tool.length} unique AI tool${report.by_tool.length !== 1 ? 's' : ''} were used across this production.`
  )
  gap(4)

  tableRow(['Tool', 'Status', 'Total Uses'], [100, 40, 60], true)
  report.by_tool.forEach((t) => {
    tableRow([t.tool, t.status, String(t.count)], [100, 40, 60], false, statusColor(t.status))
  })

  // ── SECTION 6: LCT COVERAGE REPORT ────────────────────────────────────────
  newPage()
  h2('5. LCT Coverage Report')
  gap(2)

  if (report.lct_receipts.length === 0) {
    body('No receipts on this production flagged performer likeness or voice (LCT) use.')
  } else {
    body(
      `${report.lct_receipts.length} receipt${report.lct_receipts.length !== 1 ? 's' : ''} involve performer likeness or voice. The following table records each instance and whether an LCT token reference was provided.`
    )
    gap(4)
    tableRow(
      ['Scene / Asset', 'Crew Member', 'Tool', 'LCT Reference', 'Child'],
      [46, 40, 40, 50, 24],
      true
    )
    report.lct_receipts.forEach((r) => {
      tableRow(
        [r.scene_usid, r.crew_member_name, r.ai_tool_used, r.lct_reference || '— not provided —', r.lct_child_performer ? 'CHILD' : '—'],
        [46, 40, 40, 50, 24],
        false,
        r.lct_child_performer ? YELLOW_C : (r.lct_reference ? undefined : RED_C)
      )
    })
  }

  // ── SECTION 6: WHITELIST COMPLIANCE REGISTER ──────────────────────────────
  newPage()
  h2('6. Whitelist Compliance Register')
  gap(2)
  body('The following table records the whitelist status of every AI tool at the time each receipt was submitted.')
  gap(4)

  tableRow(['Tool', 'Whitelist Status', 'Condition at Submission', 'Date'], [50, 30, 70, 30], true)
  report.receipts.forEach((r) => {
    const cond = r.whitelist_condition ? r.whitelist_condition.substring(0, 50) + (r.whitelist_condition.length > 50 ? '…' : '') : '—'
    tableRow(
      [r.ai_tool_used, r.tool_status, cond, new Date(r.date).toLocaleDateString('en-GB')],
      [50, 30, 70, 30],
      false,
      r.tool_status !== 'GREEN' ? statusColor(r.tool_status) : undefined
    )
  })

  // ── SECTION 7: SELECTION REGISTER ─────────────────────────────────────────
  newPage()
  h2('7. Selection Register')
  gap(2)
  body('Per-receipt record of what was selected from each AI output and the stated reason for that selection.')
  gap(4)

  tableRow(['Scene / Asset', 'Crew Member', 'What was selected', 'Why selected'], [25, 35, 55, 55], true)
  report.receipts.filter((r) => (r.sel_output || '').trim() || r.sel_description).forEach((r) => {
    const selOutput = (r.sel_output || '—').substring(0, 38) + ((r.sel_output || '').length > 38 ? '…' : '')
    const selReason = r.sel_description === 'Other' && r.sel_detail
      ? (`Other — ${r.sel_detail}`).substring(0, 38) + ((`Other — ${r.sel_detail}`).length > 38 ? '…' : '')
      : (r.sel_description || '—')
    tableRow([r.scene_usid, r.crew_member_name, selOutput, selReason], [25, 35, 55, 55])
  })

  // ── VFX COMPLIANCE REGISTER (conditional) ─────────────────────────────────
  const vfxReceipts = report.receipts.filter((r) => r.department === 'VFX Post')
  if (vfxReceipts.length > 0) {
    newPage()
    h2('VFX Compliance Register')
    gap(2)
    body(`${vfxReceipts.length} VFX receipt${vfxReceipts.length !== 1 ? 's' : ''} recorded on this production.`)
    gap(4)

    tableRow(['Scene', 'Crew', 'Software', 'Data Location', 'Input', 'Output', 'No Train', 'LCT'], [20, 28, 30, 28, 28, 24, 16, 12], true)
    vfxReceipts.forEach((r) => {
      const noTrain = r.vfx_no_training_confirmed ? 'Yes' : 'No'
      const lct = r.vfx_input_type === 'Plate footage containing performers'
        ? (r.vfx_lct_confirmed ? 'Yes' : 'No')
        : 'N/A'
      tableRow(
        [
          r.scene_usid.substring(0, 8),
          r.crew_member_name.substring(0, 12),
          (r.vfx_software || '—').substring(0, 16),
          (r.vfx_data_location || '—').substring(0, 14),
          (r.vfx_input_type || '—').substring(0, 14),
          (r.vfx_output_type || '—').substring(0, 12),
          noTrain,
          lct,
        ],
        [20, 28, 30, 28, 28, 24, 16, 12],
        false,
        !r.vfx_no_training_confirmed ? RED_C : undefined
      )
    })
  }

  // ── SOUND COMPLIANCE REGISTER (conditional) ───────────────────────────────
  const soundReceipts = report.receipts.filter((r) => r.department === 'Sound' || r.department === 'Sound Post')
  if (soundReceipts.length > 0) {
    newPage()
    h2('Sound / Sound Post Compliance Register')
    gap(2)
    body(`${soundReceipts.length} Sound receipt${soundReceipts.length !== 1 ? 's' : ''} recorded on this production.`)
    gap(4)

    tableRow(['Scene', 'Crew', 'Location', 'Type', 'Performer', 'Cloud Flag', 'No Train'], [20, 28, 32, 28, 18, 20, 18], true)
    soundReceipts.forEach((r) => {
      const cloudFlag = r.sound_performer_audio && r.sound_processing_location !== 'Local software — not uploaded'
      tableRow(
        [
          r.scene_usid.substring(0, 8),
          r.crew_member_name.substring(0, 12),
          (r.sound_processing_location || '—').substring(0, 16),
          (r.sound_processing_type || '—').substring(0, 14),
          r.sound_performer_audio ? 'Yes' : 'No',
          cloudFlag ? 'FLAGGED' : '—',
          r.sound_no_training_confirmed ? 'Yes' : 'No',
        ],
        [20, 28, 32, 28, 18, 20, 18],
        false,
        cloudFlag ? RED_C : undefined
      )
    })
  }

  // ── WRITING COMPLIANCE REGISTER (conditional) ─────────────────────────────
  const writingReceipts = report.receipts.filter((r) => r.department === 'Development and Writing')
  if (writingReceipts.length > 0) {
    newPage()
    h2('Writing Compliance Register')
    gap(2)
    body(`${writingReceipts.length} Writing receipt${writingReceipts.length !== 1 ? 's' : ''} recorded on this production.`)
    gap(4)

    tableRow(['Scene', 'Writer', 'Stage', 'Guild', 'AI Contribution', 'No Train', 'Auth'], [18, 28, 24, 14, 50, 16, 14], true)
    writingReceipts.forEach((r) => {
      const flagged = !r.writing_no_training_confirmed
      tableRow(
        [
          r.scene_usid.substring(0, 8),
          r.crew_member_name.substring(0, 14),
          (r.writing_stage || '—').substring(0, 12),
          (r.writing_guild_status || '—'),
          (r.writing_ai_contribution || '—').substring(0, 28),
          r.writing_no_training_confirmed ? 'Yes' : 'FLAGGED',
          r.writing_authorship_declared ? 'Yes' : 'No',
        ],
        [18, 28, 24, 14, 50, 16, 14],
        false,
        flagged ? YELLOW_C : undefined
      )
    })

    const wgaReceipts = writingReceipts.filter((r) => r.writing_guild_status === 'WGA')
    if (wgaReceipts.length > 0) {
      gap(5)
      h3('WGA — Additional Disclosure Detail')
      tableRow(['Scene / Asset', 'Writers in Session', 'Registration Status'], [50, 40, 74], true)
      wgaReceipts.forEach((r) => {
        tableRow(
          [r.scene_usid.substring(0, 18), r.writing_wga_writers_count != null ? String(r.writing_wga_writers_count) : '—', r.writing_wga_registration || '—'],
          [50, 40, 74]
        )
      })
    }

    const wggbReceipts = writingReceipts.filter((r) => r.writing_guild_status === 'WGGB')
    if (wggbReceipts.length > 0) {
      gap(5)
      h3('WGGB — Additional Disclosure Detail')
      tableRow(['Scene / Asset', 'Writing Context', 'Paternity (CDPA s.77)'], [50, 70, 44], true)
      wggbReceipts.forEach((r) => {
        tableRow(
          [r.scene_usid.substring(0, 18), r.writing_wggb_context || '—', r.writing_wggb_paternity ? 'Asserted' : 'Not asserted'],
          [50, 70, 44],
          false,
          !r.writing_wggb_paternity ? YELLOW_C : undefined
        )
      })
    }
  }

  // ── THIRD-PARTY LICENCE REGISTER (conditional) ───────────────────────────
  const tpReceipts = report.receipts.filter((r) => Boolean(r.third_party_asset))
  if (tpReceipts.length > 0) {
    newPage()
    h2('Third-Party Licence Register')
    gap(2)
    const uncleared = tpReceipts.filter((r) => !r.third_party_licence_confirmed)
    if (uncleared.length > 0) {
      body(
        `${uncleared.length} receipt${uncleared.length !== 1 ? 's' : ''} involve third-party assets where licence clearance for AI processing has NOT been confirmed. Legal review required before delivery.`
      )
    } else {
      body('All third-party asset receipts have producer-confirmed licence clearance for AI processing.')
    }
    gap(4)
    tableRow(['Date', 'Dept', 'Crew', 'Scene', 'Tool', 'Licence Confirmed'], [22, 26, 32, 26, 40, 34], true)
    tpReceipts.forEach((r) => {
      const confirmed = r.third_party_licence_confirmed
      tableRow(
        [
          new Date(r.date).toLocaleDateString('en-GB'),
          r.department.substring(0, 14),
          r.crew_member_name.substring(0, 16),
          r.scene_usid.substring(0, 12),
          r.ai_tool_used.substring(0, 20),
          confirmed ? 'Yes' : 'NOT CONFIRMED',
        ],
        [22, 26, 32, 26, 40, 34],
        false,
        !confirmed ? YELLOW_C : undefined
      )
    })
  }

  // ── FACILITY AI POLICY REGISTER (conditional) ─────────────────────────────
  const postProdDepts = ['VFX Post', 'Colour', 'Editorial', 'Sound Post', 'Delivery']
  const facilityReceipts = report.receipts.filter((r) => postProdDepts.includes(r.department))
  if (facilityReceipts.length > 0) {
    newPage()
    h2('Facility AI Policy Register')
    gap(2)
    const unconfirmed = facilityReceipts.filter((r) => !r.facility_ai_policy_confirmed)
    body(
      `${facilityReceipts.length} post-production receipt${facilityReceipts.length !== 1 ? 's' : ''} recorded. ${unconfirmed.length > 0 ? `${unconfirmed.length} receipt${unconfirmed.length !== 1 ? 's' : ''} without facility AI policy confirmation — flagged for follow-up before delivery.` : 'All post-production facilities have provided AI policy confirmation.'}`
    )
    gap(4)
    tableRow(['Dept', 'Crew', 'Facility', 'Render Location', 'Input Ver.', 'Output Ver.', 'Policy'], [26, 28, 28, 36, 20, 20, 22], true)
    facilityReceipts.forEach((r) => {
      tableRow(
        [
          r.department,
          r.crew_member_name.substring(0, 12),
          (r.facility_name || 'In-house / remote').substring(0, 16),
          (r.render_processing_location || '—').substring(0, 20),
          r.input_file_version || '—',
          r.output_file_version || '—',
          r.facility_ai_policy_confirmed ? 'Yes' : 'NO',
        ],
        [26, 28, 28, 36, 20, 20, 22],
        false,
        !r.facility_ai_policy_confirmed ? YELLOW_C : undefined
      )
    })
  }

  // ── CREW CONSENT REGISTER ─────────────────────────────────────────────────
  newPage()
  h2('Crew Consent Register')
  gap(2)

  if (report.crew_consents.length === 0) {
    body('No crew consent records have been recorded for this production.')
  } else {
    body(`${report.crew_consents.length} crew member${report.crew_consents.length !== 1 ? 's' : ''} have confirmed their TRACE© consent declaration.`)
    gap(4)
    tableRow(['Name', 'Role', 'Consented At'], [70, 60, 50], true)
    report.crew_consents.forEach((c) => {
      tableRow(
        [c.crew_member_name, c.crew_role, new Date(c.consented_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
        [70, 60, 50],
        false
      )
    })
  }

  if (report.unconsented_crew.length > 0) {
    gap(6)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...YELLOW_C)
    checkPage(6)
    doc.text('⚑ AMBER FLAG — Crew with activity but no consent record:', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    report.unconsented_crew.forEach((name) => {
      checkPage(5)
      doc.text(`  • ${name}`, margin, y)
      y += 4
    })
  }

  // ── SECTION 8: PLATFORM DISCLOSURE SUMMARY ────────────────────────────────
  newPage()
  h2('8. Platform Disclosure Summary')
  gap(4)

  const uniqueTools = Array.from(new Set(report.receipts.map((r) => r.ai_tool_used)))
  const depts = Object.keys(report.by_department)
  const greenTools = report.by_tool.filter((t) => t.status === 'GREEN').map((t) => t.tool)
  const nonGreenTools = report.by_tool.filter((t) => t.status !== 'GREEN')

  const disclosurePara = [
    `During the production of "${report.production_name}", a total of ${report.receipts.length} AI-assisted creative decisions were logged via the TRACE Artist Receipt system, spanning ${depts.length} department${depts.length !== 1 ? 's' : ''}: ${depts.join(', ')}.`,
    '',
    `The following AI tools were used: ${uniqueTools.join(', ')}. Of these, ${greenTools.length > 0 ? `${greenTools.join(', ')} ${greenTools.length === 1 ? 'was' : 'were'} classified as GREEN (vetted for production use) and all uses are fully documented with four-point Artist Receipts` : 'no tools were classified as GREEN status'}.`,
    '',
    nonGreenTools.length > 0
      ? `${nonGreenTools.map((t) => `${t.tool} (${t.status})`).join(', ')} ${nonGreenTools.length === 1 ? 'was' : 'were'} used under restricted or flagged status. All such uses carry full TRACE documentation and AUTH sign-off from the relevant Head of Department.`
      : 'All tool use on this production was GREEN-status (fully vetted).',
    '',
    `Every logged creative decision has been documented with a Point of Record (POR), a structured Selection reason (SEL — categorised from: creative direction, technical quality, brief compliance, least adjustment, combination, or other), an Arrival record (ARR), and an Authorial Control sign-off (AUTH) confirming that a human was the creative decision-maker at each stage. This documentation constitutes the chain of human authorship required for copyright eligibility under Thaler v. Perlmutter (2025).`,
  ].join('\n')

  body(disclosurePara)

  // ── SECTION 9: COMPLETION BOND SUPPORT NOTE ───────────────────────────────
  newPage()
  h2('9. Delivery Support Note')
  gap(4)

  const bondPara = [
    `TO WHOM IT MAY CONCERN`,
    '',
    `This note is issued in support of Delivery documentation for the production "${report.production_name}".`,
    '',
    `The TRACE Artist Receipt Logger has recorded a total of ${report.receipts.length} Artist Receipt${report.receipts.length !== 1 ? 's' : ''} for this production, covering AI-assisted creative decisions made between ${fmt(report.date_range.from)} and ${fmt(report.date_range.to)}.`,
    '',
    `All ${report.auth_signed_count} receipts carry an Authorial Control (AUTH) sign-off from a named Head of Department or Lead Creative, confirming that a qualified human professional exercised creative control over each AI-assisted decision. Authorising signatories include: ${signers.join(', ')}.`,
    '',
    `These records demonstrate that all AI-assisted creative work on this production was conducted under documented human authorial oversight.`,
    '',
    `This report is issued by the TRACE Artist Receipt Logger on ${fmt(report.generated_at)}.`,
  ].join('\n')

  body(bondPara)

  gap(10)
  rule()
  body(
    'Laura Burrows, NFTS AI Diploma, April 2026. This report is generated automatically from Artist Receipts submitted to the TRACE system.'
  )

  // ── SECTION 10: FULL AUDIT RECEIPT LOG (audit mode only) ──────────────────
  if (mode === 'audit') {
    newPage()
    h2('10. Complete Receipt Log — Full Audit Detail')
    gap(2)
    body(
      `Full four-point log for all ${report.receipts.length} receipt${report.receipts.length !== 1 ? 's' : ''} in this report. Each entry includes Point of Record (POR), Selection (SEL), Arrival (ARR), Authorisation (AUTH), tool details, and any compliance flags.`
    )
    gap(4)

    const auditKv = (label: string, value: string) => {
      checkPage(14)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text(label, margin, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MID)
      const lines = doc.splitTextToSize(value, contentW - 6)
      checkPage(lines.length * 4 + 2)
      doc.text(lines, margin + 6, y)
      y += lines.length * 4 + 3
    }

    report.receipts.forEach((r, i) => {
      checkPage(50)
      if (i > 0) {
        gap(3)
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.15)
        doc.line(margin, y, pageW - margin, y)
        y += 4
      }

      // Receipt header line
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...FOREST)
      const num = String(i + 1).padStart(2, '0')
      checkPage(7)
      doc.text(
        `${num}. ${r.crew_member_name} — ${r.department} — ${r.scene_usid} — ${new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        margin, y
      )
      y += 5

      // Status badge inline
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      const sc = statusColor(r.tool_status)
      doc.setTextColor(...sc)
      checkPage(5)
      doc.text(`[${r.tool_status}]  ${r.status === 'AUTH_COMPLETE' ? '✓ AUTH COMPLETE' : '⏳ AUTH PENDING'}`, margin, y)
      y += 5

      // Hash
      if (r.twin_lock_hash) {
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...LIGHT)
        checkPage(4)
        doc.text(`SHA-256: ${r.twin_lock_hash}`, margin, y)
        y += 4
      }
      gap(1)

      // Tool
      auditKv('AI Tool', `${r.ai_tool_used}${r.tool_version ? ` (v${r.tool_version})` : ''}`)
      if (r.whitelist_condition) auditKv('Risk / Condition at Submission', r.whitelist_condition)

      // Four-point log
      auditKv('POR — Prompt of Record', r.por_description)
      auditKv(
        'SEL — Selection',
        [r.sel_output, r.sel_description, r.sel_detail].filter(Boolean).join(' · ')
      )
      auditKv('ARR — Arrival', r.arr_description)
      auditKv(
        'AUTH — Authorisation',
        r.status === 'AUTH_COMPLETE' && r.auth_signer
          ? `${r.auth_signer}${r.auth_timestamp ? ' — ' + new Date(r.auth_timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}`
          : 'Pending'
      )
      auditKv('Submitted', new Date(r.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))

      // Compliance flags
      const flags: string[] = []
      if (r.lct_required) flags.push(`LCT required — ref: ${r.lct_reference || 'not provided'}`)
      if (Boolean(r.third_party_asset) && !r.third_party_licence_confirmed) flags.push('Third-party licence clearance not confirmed')
      if (r.department === 'Development and Writing' && r.writing_consent_confirmed === false) flags.push('Writer consent not confirmed')
      if (r.tool_status === 'RED' || r.tool_status === 'UNVERIFIED') flags.push(`Tool status: ${r.tool_status}`)
      if (flags.length > 0) {
        checkPage(6)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...YELLOW_C)
        doc.text('⚑ ' + flags.join('  ·  '), margin, y)
        y += 5
      }
    })
  }

  // footer on final page
  doc.setFontSize(7)
  doc.setTextColor(...LIGHT)
  doc.text(
    `TRACE Compliance Report — ${report.production_name} — Confidential`,
    margin,
    pageH - 10
  )
  doc.text(`Page ${doc.getNumberOfPages()}`, pageW - margin, pageH - 10, { align: 'right' })

  const filename = `TRACE-${report.production_name.replace(/[^a-z0-9]/gi, '_')}-Compliance-Report${mode === 'audit' ? '-FullAudit' : ''}.pdf`
  doc.save(filename)
}

async function generateBondSummaryPDF(report: ReportData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const pageW = 210
  const pageH = 297
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  const FOREST = [26, 61, 43] as [number, number, number]
  const MOSS = [45, 106, 79] as [number, number, number]
  const DARK = [30, 30, 30] as [number, number, number]
  const MID = [80, 80, 80] as [number, number, number]
  const LIGHT = [140, 140, 140] as [number, number, number]
  const GREEN_C = [46, 125, 50] as [number, number, number]
  const AMBER_C = [200, 132, 26] as [number, number, number]
  const RED_C = [198, 40, 40] as [number, number, number]

  function rule() {
    doc.setDrawColor(...MOSS)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 5
  }
  function gap(n = 4) { y += n }

  function body(text: string) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    const lines = doc.splitTextToSize(text, contentW)
    if (y + lines.length * 5 > pageH - 20) { doc.addPage(); y = margin }
    doc.text(lines, margin, y)
    y += lines.length * 5 + 3
  }

  function bold(text: string, color: [number, number, number] = DARK, size = 10) {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, contentW)
    if (y + lines.length * 5 > pageH - 20) { doc.addPage(); y = margin }
    doc.text(lines, margin, y)
    y += lines.length * 5 + 2
  }

  function kv(label: string, value: string, valueColor: [number, number, number] = MID) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(label + ':', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...valueColor)
    doc.text(value, margin + 55, y)
    y += 6
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  // Header
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...FOREST)
  doc.text('TRACE©', margin, y)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text('INSURANCE & BOND SUMMARY', margin + 34, y - 1)
  y += 10

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text('ARTIST RECEIPT LOGGER — COMPLIANCE REPORT', margin, y)
  y += 7
  rule()
  gap(2)

  bold(`Production: ${report.production_name}`, DARK, 12)
  gap(1)
  body(`Period covered: ${fmt(report.date_range.from)} – ${fmt(report.date_range.to)}`)
  body(`Report generated: ${fmt(report.generated_at)}`)
  gap(4)
  rule()
  gap(3)

  // ── TRAFFIC LIGHT SUMMARY ──────────────────────────────────────────────────
  bold('INSURANCE & BOND COMPLIANCE SUMMARY', FOREST, 11)
  gap(3)

  const total = report.receipts.length
  const greenCount = report.receipts.filter(r => r.tool_status === 'GREEN').length
  const amberCount = report.receipts.filter(r => r.tool_status === 'AMBER' || r.tool_status === 'YELLOW').length
  const redCount = report.receipts.filter(r => r.tool_status === 'RED').length
  const unverifiedCount = report.receipts.filter(r => r.tool_status === 'UNVERIFIED').length
  const authComplete = report.receipts.filter(r => r.status === 'AUTH_COMPLETE').length
  const authPct = total > 0 ? Math.round((authComplete / total) * 100) : 0
  const lctCount = report.receipts.filter(r => r.lct_required).length
  const lctReferenced = report.receipts.filter(r => r.lct_required && r.lct_reference?.trim()).length

  kv('Total Artist Receipts', String(total))
  kv('AUTH sign-off complete', `${authComplete} / ${total}  (${authPct}%)`, authPct === 100 ? GREEN_C : authPct >= 80 ? AMBER_C : RED_C)
  gap(3)

  // Traffic light rows
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Tool status breakdown:', margin, y)
  y += 6

  const tlRows: [string, number, [number, number, number]][] = [
    ['GREEN — fully vetted tools', greenCount, GREEN_C],
    ['AMBER — conditional approval', amberCount, AMBER_C],
    ['RED — not approved', redCount, RED_C],
    ['UNVERIFIED — not on whitelist', unverifiedCount, AMBER_C],
  ]
  tlRows.forEach(([label, count, color]) => {
    const barW = total > 0 ? Math.min((count / total) * (contentW - 80), contentW - 80) : 0
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    doc.text(label, margin + 4, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    doc.text(String(count), margin + 90, y)
    if (barW > 0) {
      doc.setFillColor(...color)
      doc.rect(margin + 98, y - 3.5, barW, 4, 'F')
    }
    y += 6
  })

  gap(3)
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageW - margin, y)
  y += 4

  kv('LCT checks logged', lctCount > 0 ? `${lctReferenced} / ${lctCount} with reference number` : 'None required', lctCount > 0 && lctReferenced < lctCount ? AMBER_C : GREEN_C)

  const writingReceipts = report.receipts.filter(r => r.department === 'Development and Writing')
  const writingWithGuild = writingReceipts.filter(r => r.guild_affiliation && r.guild_affiliation !== 'None / Non-union').length
  if (writingReceipts.length > 0) {
    kv('Writing guild documentation', `${writingWithGuild} / ${writingReceipts.length} receipts carry guild affiliation`, writingWithGuild < writingReceipts.length ? AMBER_C : GREEN_C)
  }

  gap(3)

  // Key concerns
  const concerns: string[] = []
  if (redCount > 0) concerns.push(`${redCount} receipt${redCount > 1 ? 's' : ''} used RED-status (non-approved) tools`)
  if (unverifiedCount > 0) concerns.push(`${unverifiedCount} receipt${unverifiedCount > 1 ? 's' : ''} used unverified tools not on the production whitelist`)
  if (authComplete < total) concerns.push(`${total - authComplete} receipt${total - authComplete > 1 ? 's' : ''} ${total - authComplete > 1 ? 'are' : 'is'} pending AUTH sign-off`)
  if (lctCount > 0 && lctReferenced < lctCount) concerns.push(`${lctCount - lctReferenced} LCT flag${lctCount - lctReferenced > 1 ? 's' : ''} without reference number`)
  if (writingReceipts.length > 0 && writingWithGuild < writingReceipts.length) concerns.push(`${writingReceipts.length - writingWithGuild} writing receipt${writingReceipts.length - writingWithGuild > 1 ? 's' : ''} without guild affiliation documented`)

  if (concerns.length > 0) {
    bold('Items Requiring Attention', AMBER_C, 9)
    y += 1
    concerns.forEach(c => {
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...AMBER_C)
      doc.text('• ' + c, margin + 2, y)
      y += 5.5
    })
    gap(3)
  } else {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN_C)
    doc.text('✓  No compliance concerns identified in this period.', margin, y)
    y += 7
    gap(2)
  }

  rule()
  gap(2)

  // ── DELIVERY SUPPORT NOTE ──────────────────────────────────────────────────
  bold('DELIVERY SUPPORT NOTE', FOREST, 10)
  gap(3)

  const signers = Array.from(new Set(report.receipts.map(r => r.auth_signer).filter((s): s is string => !!s)))

  body('TO WHOM IT MAY CONCERN')
  gap(2)
  body(`This note is issued in support of Delivery documentation for the production "${report.production_name}".`)
  gap(2)
  body(`The TRACE Artist Receipt Logger has recorded a total of ${total} Artist Receipt${total !== 1 ? 's' : ''} for this production, covering AI-assisted creative decisions made between ${fmt(report.date_range.from)} and ${fmt(report.date_range.to)}.`)
  gap(2)
  body(`All ${authComplete} receipt${authComplete !== 1 ? 's' : ''} carry an Authorial Control (AUTH) sign-off from a named Head of Department or Lead Creative, confirming that a qualified human professional exercised creative control over each AI-assisted decision.${signers.length > 0 ? ` Authorising signatories include: ${signers.join(', ')}.` : ''}`)
  gap(2)
  body('These records demonstrate that all AI-assisted creative work on this production was conducted under documented human authorial oversight.')
  gap(4)
  rule()
  body('This report is issued by the TRACE Artist Receipt Logger. Generated automatically from Artist Receipts submitted to the TRACE system.')

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(...LIGHT)
  doc.text(`TRACE© Insurance & Bond Summary — ${report.production_name} — Confidential`, margin, pageH - 10)
  doc.text(`Generated ${fmt(report.generated_at)}`, pageW - margin, pageH - 10, { align: 'right' })

  const filename = `TRACE-${report.production_name.replace(/[^a-z0-9]/gi, '_')}-Bond-Summary.pdf`
  doc.save(filename)
}

async function generateAIStatement(report: ReportData) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const pageW = 210
  const pageH = 297
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  const FOREST = [26, 61, 43] as [number, number, number]
  const MOSS = [45, 106, 79] as [number, number, number]
  const DARK = [30, 30, 30] as [number, number, number]
  const MID = [80, 80, 80] as [number, number, number]
  const LIGHT = [140, 140, 140] as [number, number, number]
  const GOLD = [200, 168, 75] as [number, number, number]

  function rule() {
    doc.setDrawColor(...MOSS)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 5
  }

  function gap(n = 4) { y += n }

  function para(text: string, color: [number, number, number] = MID, size = 10) {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, contentW)
    if (y + lines.length * 5 > pageH - 20) { doc.addPage(); y = margin }
    doc.text(lines, margin, y)
    y += lines.length * 5 + 3
  }

  function bold(text: string, color: [number, number, number] = DARK, size = 10) {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, contentW)
    if (y + lines.length * 5 > pageH - 20) { doc.addPage(); y = margin }
    doc.text(lines, margin, y)
    y += lines.length * 5 + 2
  }

  // Header
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...FOREST)
  doc.text('TRACE©', margin, y)
  y += 10

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text('PRODUCTION AI STATEMENT', margin, y)
  y += 8
  rule()
  gap(2)

  bold(`Production: ${report.production_name}`, DARK, 12)
  gap(1)
  para(`Period covered: ${new Date(report.date_range.from).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} – ${new Date(report.date_range.to).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`)
  para(`Statement generated: ${new Date(report.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`)
  gap(4)
  rule()
  gap(2)

  bold('1. Purpose of this Statement', FOREST, 11)
  gap(2)
  para(
    'This statement is produced automatically from the TRACE© Artist Receipt system. It provides a plain-language summary of AI tool use on this production, and confirms that human authorship was documented at every point of AI use in accordance with the TRACE© protocol.'
  )
  gap(4)

  bold('2. AI Tool Use — Summary by Department', FOREST, 11)
  gap(2)

  const depts = Object.entries(report.by_department)
  if (depts.length === 0) {
    para('No departmental AI use recorded for this period.')
  } else {
    para(`AI tools were used across ${depts.length} department${depts.length > 1 ? 's' : ''} on this production:`)
    gap(2)
    for (const [dept, count] of depts) {
      const deptReceipts = report.receipts.filter(r => r.department === dept)
      const toolNames = Array.from(new Set(deptReceipts.map(r => r.ai_tool_used))).join(', ')
      bold(`${dept}  (${count} receipt${count > 1 ? 's' : ''})`, DARK)
      para(`Tools used: ${toolNames}`)
      gap(2)
    }
  }

  gap(2)
  rule()
  gap(2)

  bold('3. Human Authorship — Confirmation', FOREST, 11)
  gap(2)

  const total = report.receipts.length
  const authorised = report.auth_signed_count
  const pct = total > 0 ? Math.round((authorised / total) * 100) : 0

  para(
    `Of ${total} AI use receipt${total !== 1 ? 's' : ''} recorded during this period, ${authorised} (${pct}%) have been fully authorised through the TRACE© chain of custody — signed by the relevant crew member and countersigned by the Head of Department or Producer.`
  )
  gap(2)
  para(
    'Each TRACE© Artist Receipt documents: the specific AI prompt used (Point of Record), the human selection made from the AI output (Selection), the human modifications applied (Arrival), and the countersigning authorisation of a senior creative (AUTH). This four-point log establishes an unbroken chain of human authorial control at every AI-assisted decision point.'
  )
  gap(4)

  if (report.all_signers.length > 0) {
    bold('4. Authorising Signatories', FOREST, 11)
    gap(2)
    para('The following individuals applied AUTH signatures during this period:')
    gap(1)
    for (const signer of report.all_signers) {
      bold(`• ${signer}`, DARK)
    }
    gap(4)
    rule()
    gap(2)
  } else {
    rule()
    gap(2)
  }

  bold('5. Compliance Basis', FOREST, 11)
  gap(2)
  para(
    'This statement is generated under the TRACE© Protocol, designed to meet the human authorship documentation requirements arising from Thaler v. Perlmutter (2025) and equivalent international copyright rulings. It confirms that AI tools were used as assistive instruments under direct human creative direction, and that no AI-generated output was incorporated without documented human selection, modification, and sign-off.'
  )
  gap(6)

  // Footer bar
  doc.setFillColor(...FOREST)
  doc.rect(margin, y, contentW, 0.5, 'F')
  gap(5)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text('TRACE© Protocol — Production AI Statement — Confidential', margin, y)
  doc.setTextColor(...GOLD)
  doc.text('© Laura Burrows 2026', pageW - margin, y, { align: 'right' })

  const filename = `TRACE-${report.production_name.replace(/[^a-z0-9]/gi, '_')}-AI-Statement.pdf`
  doc.save(filename)
}

function downloadJSON(report: ReportData) {
  const rows = report.receipts.map(r => ({
    receipt_id: r.id,
    sha256_hash: r.twin_lock_hash ?? null,
    timestamp: r.created_at,
    department: r.department,
    tool_name: r.ai_tool_used,
    tool_version: r.tool_version ?? r.vfx_software ?? null,
    crew_member: r.crew_member_name,
    hod_auth_timestamp: r.auth_timestamp ?? null,
    auth_signer: r.auth_signer ?? null,
    status: r.status,
    tool_status: r.tool_status,
  }))
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `TRACE-${report.production_name.replace(/[^a-z0-9]/gi, '_')}-GAL.json`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadCSV(report: ReportData) {
  const headers = ['receipt_id', 'sha256_hash', 'timestamp', 'department', 'tool_name', 'tool_version', 'crew_member', 'hod_auth_timestamp', 'auth_signer', 'status', 'tool_status']
  const escape = (v: string | null | undefined) => {
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = report.receipts.map(r => [
    r.id,
    r.twin_lock_hash ?? '',
    r.created_at,
    r.department,
    r.ai_tool_used,
    r.tool_version ?? r.vfx_software ?? '',
    r.crew_member_name,
    r.auth_timestamp ?? '',
    r.auth_signer ?? '',
    r.status,
    r.tool_status,
  ].map(escape).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `TRACE-${report.production_name.replace(/[^a-z0-9]/gi, '_')}-GAL.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ComplianceReport() {
  const [productions, setProductions] = useState<string[]>([])
  const [selected, setSelected] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [bondPdfGenerating, setBondPdfGenerating] = useState(false)
  const [statementGenerating, setStatementGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const [viewMode, setViewMode] = useState<'summary' | 'audit'>('summary')
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set())

  function toggleReceipt(id: string) {
    setExpandedReceipts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const [filterDept, setFilterDept] = useState('')
  const [filterScene, setFilterScene] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const [aiStatement, setAiStatement] = useState<string | null>(null)
  const [aiStatementLoading, setAiStatementLoading] = useState(false)
  const [aiStatementError, setAiStatementError] = useState<string | null>(null)
  const [aiStatementCopied, setAiStatementCopied] = useState(false)

  const [showArticle50Modal, setShowArticle50Modal] = useState(false)
  const [article50Copied, setArticle50Copied] = useState(false)

  function getArticle50Receipts(): Receipt[] {
    if (!report) return []
    return report.receipts.filter(
      (r) => r.eu_ai_act_real_person === true || r.eu_ai_act_synthetic_voice === true
    )
  }

  function buildArticle50Text(): string {
    const receipts = getArticle50Receipts()
    const lines: string[] = [
      `TRACE© — EU AI ACT ARTICLE 50 DISCLOSURE`,
      `Production: ${report?.production_name ?? ''}`,
      `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      ``,
      `This document lists all Artist Receipts for this production where AI-generated output`,
      `contains a realistic depiction of a real person or a synthetic voice based on a real`,
      `person's voice, as required under EU AI Act Article 50.`,
      ``,
      `─────────────────────────────────────────────────────────`,
      ``,
    ]
    receipts.forEach((r, i) => {
      const ref = r.scene_asset_reference || r.scene_usid || '—'
      const hodAuth = r.auth_signer
        ? `${r.auth_signer} (${r.auth_timestamp ? new Date(r.auth_timestamp).toLocaleDateString('en-GB') : 'date unknown'})`
        : r.status === 'AUTH_COMPLETE' ? 'AUTH COMPLETE' : 'PENDING'
      lines.push(`Receipt ${i + 1}`)
      lines.push(`  Shot / Asset Reference : ${ref}`)
      lines.push(`  Department             : ${r.department}`)
      lines.push(`  Tool Used              : ${r.ai_tool_used}`)
      lines.push(`  Type of AI Use         : ${r.sel_description || '—'}`)
      lines.push(`  Date                   : ${fmt(r.date)}`)
      lines.push(`  HOD AUTH               : ${hodAuth}`)
      lines.push(`  Article 50 Flags       :`)
      if (r.eu_ai_act_real_person) lines.push(`    ✓ Realistic AI-generated depiction of a real person`)
      if (r.eu_ai_act_synthetic_voice) lines.push(`    ✓ Synthetic voice based on a real person's voice`)
      lines.push(``)
    })
    if (receipts.length === 0) {
      lines.push(`No receipts on this production carry Article 50 flags.`)
      lines.push(``)
    }
    lines.push(`─────────────────────────────────────────────────────────`)
    lines.push(`TRACE© Protocol — Article50-v1 — © Laura Burrows 2026`)
    return lines.join('\n')
  }

  function copyArticle50() {
    const text = buildArticle50Text()
    navigator.clipboard.writeText(text).then(() => {
      setArticle50Copied(true)
      setTimeout(() => setArticle50Copied(false), 2000)
    })
  }

  async function handleGenerateAIStatement() {
    if (!selected) return
    setAiStatementLoading(true)
    setAiStatementError(null)
    setAiStatement(null)
    try {
      const res = await fetch(`/api/statement?production=${encodeURIComponent(selected)}`)
      const data = await res.json()
      if (!res.ok) {
        setAiStatementError(data.error ?? 'Failed to generate statement. Please try again.')
        return
      }
      setAiStatement(data.statement)
    } catch {
      setAiStatementError('Something went wrong. Please try again.')
    } finally {
      setAiStatementLoading(false)
    }
  }

  function copyAIStatement() {
    if (!aiStatement) return
    navigator.clipboard.writeText(aiStatement).then(() => {
      setAiStatementCopied(true)
      setTimeout(() => setAiStatementCopied(false), 2000)
    })
  }



  useEffect(() => {
    fetch('/api/productions')
      .then((r) => r.json())
      .then(setProductions)
      .catch(() => {})
  }, [])

  async function loadReport() {
    if (!selected) return
    setLoading(true)
    setError(null)
    setReport(null)

    const params = new URLSearchParams({ production: selected })
    if (filterDept) params.set('department', filterDept)
    if (filterScene) params.set('scene', filterScene)
    if (filterStatus) params.set('toolStatus', filterStatus)
    if (filterDateFrom) params.set('dateFrom', filterDateFrom)
    if (filterDateTo) params.set('dateTo', filterDateTo)

    const res = await fetch(`/api/report?${params}`)
    if (!res.ok) {
      setError('No receipts found for this selection.')
      setLoading(false)
      return
    }

    const data: ReportData = await res.json()
    setReport(data)
    setLoading(false)
  }

  async function handleDownloadPDF() {
    if (!report) return
    setPdfGenerating(true)
    try {
      await generatePDF(report, viewMode)
    } catch (e) {
      console.error(e)
      alert('PDF generation failed. Please try again.')
    } finally {
      setPdfGenerating(false)
    }
  }

  async function handleDownloadBondPDF() {
    if (!report) return
    setBondPdfGenerating(true)
    try {
      await generateBondSummaryPDF(report)
    } catch (e) {
      console.error(e)
      alert('Bond summary PDF generation failed. Please try again.')
    } finally {
      setBondPdfGenerating(false)
    }
  }

  async function handleDownloadStatement() {
    if (!report) return
    setStatementGenerating(true)
    try {
      await generateAIStatement(report)
    } catch (e) {
      console.error(e)
      alert('Statement generation failed. Please try again.')
    } finally {
      setStatementGenerating(false)
    }
  }

  return (
    <div>
      {/* AI Statement Modal */}
      {(aiStatementLoading || aiStatement || aiStatementError) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(10,25,16,0.88)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setAiStatement(null); setAiStatementError(null) } }}
        >
          <div className="w-full max-w-xl rounded-xl p-8 space-y-5" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-courier text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8BB5A0' }}>TRACE© — Production AI Statement</p>
                <p className="font-garamond text-xl" style={{ color: '#F0EBE0' }}>{selected}</p>
              </div>
              <button
                onClick={() => { setAiStatement(null); setAiStatementError(null) }}
                className="font-courier text-xs flex-shrink-0"
                style={{ color: '#5A8A72' }}
              >
                Close
              </button>
            </div>

            {aiStatementLoading && (
              <div className="py-8 flex items-center justify-center gap-3">
                <svg className="animate-spin w-4 h-4" style={{ color: '#8BB5A0' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <p className="font-courier text-xs" style={{ color: '#8BB5A0' }}>Generating statement…</p>
              </div>
            )}

            {aiStatementError && (
              <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.4)' }}>
                <p className="font-courier text-xs" style={{ color: '#f87171' }}>{aiStatementError}</p>
              </div>
            )}

            {aiStatement && (
              <>
                <div className="rounded-lg px-5 py-4 space-y-3" style={{ backgroundColor: '#0F2419', border: '1px solid rgba(45,106,79,0.5)' }}>
                  {aiStatement.split(/\n\n+/).filter(Boolean).map((para, i) => (
                    <p key={i} className="font-courier text-xs leading-relaxed" style={{ color: '#D4EDE1' }}>{para}</p>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={copyAIStatement}
                    className="btn-secondary text-xs"
                  >
                    {aiStatementCopied ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                  <p className="font-courier text-[10px]" style={{ color: '#5A8A72' }}>
                    Generated {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Article 50 Disclosure Modal */}
      {showArticle50Modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(10,25,16,0.88)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowArticle50Modal(false) }}
        >
          <div className="w-full max-w-2xl rounded-xl p-8 space-y-5 max-h-[90vh] flex flex-col" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div className="flex items-start justify-between gap-4 flex-shrink-0">
              <div>
                <p className="font-courier text-[10px] uppercase tracking-widest mb-1" style={{ color: '#C8A84B' }}>TRACE© — EU AI Act Article 50 Disclosure</p>
                <p className="font-garamond text-xl" style={{ color: '#F0EBE0' }}>{selected}</p>
                <p className="font-courier text-xs mt-1" style={{ color: '#8BB5A0' }}>
                  {getArticle50Receipts().length === 0
                    ? 'No Article 50 flags on this production.'
                    : `${getArticle50Receipts().length} receipt${getArticle50Receipts().length !== 1 ? 's' : ''} with Article 50 flags`}
                </p>
              </div>
              <button
                onClick={() => setShowArticle50Modal(false)}
                className="font-courier text-xs flex-shrink-0"
                style={{ color: '#5A8A72' }}
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 rounded-lg" style={{ backgroundColor: '#0F2419', border: '1px solid rgba(45,106,79,0.5)' }}>
              {getArticle50Receipts().length === 0 ? (
                <p className="font-courier text-xs p-5 leading-relaxed" style={{ color: '#8BB5A0' }}>
                  No receipts on this production carry Article 50 flags. The Article 50 disclosure document will reflect this.
                </p>
              ) : (
                <table className="w-full text-xs font-courier">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(45,106,79,0.5)' }}>
                      {['Shot / Asset Ref', 'Dept', 'Tool', 'Type of AI Use', 'Date', 'HOD AUTH', 'Flags'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-bold uppercase tracking-wider" style={{ color: '#C8A84B', fontSize: 9 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getArticle50Receipts().map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(45,106,79,0.3)' }}>
                        <td className="px-4 py-3" style={{ color: '#D4EDE1' }}>{r.scene_asset_reference || r.scene_usid || '—'}</td>
                        <td className="px-4 py-3" style={{ color: '#D4EDE1' }}>{r.department}</td>
                        <td className="px-4 py-3" style={{ color: '#D4EDE1' }}>{r.ai_tool_used}</td>
                        <td className="px-4 py-3" style={{ color: '#D4EDE1' }}>{r.sel_description || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{fmt(r.date)}</td>
                        <td className="px-4 py-3" style={{ color: r.auth_signer ? '#4ade80' : '#C8A84B' }}>
                          {r.auth_signer || (r.status === 'AUTH_COMPLETE' ? 'AUTH' : 'Pending')}
                        </td>
                        <td className="px-4 py-3">
                          {r.eu_ai_act_real_person && (
                            <span className="block" style={{ color: '#C8A84B' }}>Real person depiction</span>
                          )}
                          {r.eu_ai_act_synthetic_voice && (
                            <span className="block" style={{ color: '#C8A84B' }}>Synthetic voice</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={copyArticle50}
                className="btn-secondary text-xs"
              >
                {article50Copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
              <p className="font-courier text-[10px]" style={{ color: '#5A8A72' }}>
                For delivery to broadcaster or distributor — EU AI Act Article 50 compliance
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Production Selector + Filters */}
      <div className="rounded-lg p-6 mb-6 no-print" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
        <div className="mb-4">
          <label className="label" htmlFor="production-select">Select Production</label>
          {productions.length > 0 ? (
            <select
              id="production-select"
              className="select"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value)
                setReport(null)
                setError(null)
              }}
            >
              <option value="">Choose a production…</option>
              {productions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          ) : (
            <div className="input" style={{ color: '#5A8A72' }}>
              No productions logged yet.{' '}
              <a href="/receipt/new" className="hover:underline" style={{ color: '#C8A84B' }}>
                Submit a receipt first.
              </a>
            </div>
          )}
        </div>

        {selected && (
          <>
            <div className="pt-4 mb-4" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
              <p className="label mb-3">Filter Report <span className="normal-case font-normal" style={{ color: '#5A8A72' }}>(optional — leave blank for full production report)</span></p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <label className="label" htmlFor="filter-dept">Department</label>
                  <select
                    id="filter-dept"
                    className="select"
                    value={filterDept}
                    onChange={(e) => { setFilterDept(e.target.value); setReport(null) }}
                  >
                    <option value="">All departments</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="filter-scene">Scene</label>
                  <input
                    id="filter-scene"
                    className="input"
                    placeholder="e.g. 42, 12A…"
                    value={filterScene}
                    onChange={(e) => { setFilterScene(e.target.value); setReport(null) }}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="filter-status">Tool Status</label>
                  <select
                    id="filter-status"
                    className="select"
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setReport(null) }}
                  >
                    <option value="">All statuses</option>
                    <option value="GREEN">GREEN</option>
                    <option value="AMBER">AMBER</option>
                    <option value="YELLOW">YELLOW (legacy)</option>
                    <option value="RED">RED</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="filter-from">Date From</label>
                  <input
                    id="filter-from"
                    type="date"
                    className="input"
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setReport(null) }}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="filter-to">Date To</label>
                  <input
                    id="filter-to"
                    type="date"
                    className="input"
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setReport(null) }}
                  />
                </div>
              </div>
              {(filterDept || filterScene || filterStatus || filterDateFrom || filterDateTo) && (
                <div className="flex items-center flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(45,106,79,0.3)' }}>
                  {filterDept && (
                    <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(45,106,79,0.25)', color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}>
                      Dept: {filterDept}
                    </span>
                  )}
                  {filterScene && (
                    <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(200,168,75,0.15)', color: '#C8A84B', border: '1px solid rgba(200,168,75,0.4)' }}>
                      Scene: {filterScene}
                    </span>
                  )}
                  {filterStatus && (
                    <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(45,106,79,0.25)', color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}>
                      Status: {filterStatus}
                    </span>
                  )}
                  {filterDateFrom && (
                    <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(45,106,79,0.25)', color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}>
                      From: {filterDateFrom}
                    </span>
                  )}
                  {filterDateTo && (
                    <span className="inline-flex items-center gap-1 font-courier text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(45,106,79,0.25)', color: '#8BB5A0', border: '1px solid rgba(45,106,79,0.5)' }}>
                      To: {filterDateTo}
                    </span>
                  )}
                  <button
                    onClick={() => { setFilterDept(''); setFilterScene(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setReport(null) }}
                    className="font-courier text-xs hover:underline ml-auto"
                    style={{ color: '#C8A84B' }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <div />
          <button
            onClick={loadReport}
            disabled={!selected || loading}
            className="btn-primary disabled:opacity-40"
          >
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
        {error && <p className="font-courier text-sm mt-3" style={{ color: '#f87171' }}>{error}</p>}
      </div>

      {/* Report */}
      {report && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: '#122E1F', border: '1px solid #2D6A4F' }}>
              <button
                onClick={() => setViewMode('summary')}
                className="font-courier text-xs px-3 py-1.5 rounded transition-colors"
                style={viewMode === 'summary'
                  ? { backgroundColor: '#2D6A4F', color: '#F0EBE0' }
                  : { color: '#5A8A72' }}
              >
                Summary View
              </button>
              <button
                onClick={() => { setViewMode('audit'); setExpandedReceipts(new Set()) }}
                className="font-courier text-xs px-3 py-1.5 rounded transition-colors"
                style={viewMode === 'audit'
                  ? { backgroundColor: '#C8A84B', color: '#0F2419' }
                  : { color: '#5A8A72' }}
              >
                Full Audit View
              </button>
            </div>

            {/* Download actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowArticle50Modal(true)}
                className="btn-secondary"
                style={{ borderColor: '#C8A84B', color: '#C8A84B' }}
              >
                Generate Article 50 Disclosure
              </button>
              <button
                onClick={handleGenerateAIStatement}
                disabled={aiStatementLoading}
                className="btn-secondary disabled:opacity-50"
              >
                {aiStatementLoading ? 'Generating…' : 'Generate Production AI Statement'}
              </button>
              <button
                onClick={handleDownloadStatement}
                disabled={statementGenerating}
                className="btn-secondary disabled:opacity-50"
              >
                {statementGenerating ? 'Generating…' : 'AI Statement PDF'}
              </button>
              <div className="relative group">
                <button
                  disabled
                  className="btn-secondary opacity-40 cursor-not-allowed"
                >
                  Export to Albert
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs font-courier whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10" style={{ backgroundColor: '#122E1F', color: '#8BB5A0', border: '1px solid #2D6A4F' }}>
                  AI carbon footprint reporting — coming in Build 2. Integrates with Albert.
                </div>
              </div>
              <div className="relative group">
                <button
                  disabled
                  className="btn-secondary opacity-40 cursor-not-allowed"
                >
                  Export CSV
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs font-courier whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10" style={{ backgroundColor: '#122E1F', color: '#8BB5A0', border: '1px solid #2D6A4F' }}>
                  Coming in Build 1
                </div>
              </div>
              <div className="relative group">
                <button
                  disabled
                  className="btn-secondary opacity-40 cursor-not-allowed"
                >
                  Export JSON
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs font-courier whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10" style={{ backgroundColor: '#122E1F', color: '#8BB5A0', border: '1px solid #2D6A4F' }}>
                  Coming in Build 1
                </div>
              </div>
              <button
                onClick={handleDownloadBondPDF}
                disabled={bondPdfGenerating}
                className="btn-secondary disabled:opacity-50"
              >
                {bondPdfGenerating ? 'Generating…' : 'Export Bond Summary PDF'}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={pdfGenerating}
                className="btn-primary disabled:opacity-50"
              >
                {pdfGenerating ? 'Generating PDF…' : 'Export PDF'}
              </button>
            </div>
          </div>

          <div ref={reportRef} className="space-y-6">
            {/* Summary stat row */}
            {(() => {
              const POST_PROD_DEPTS = ['VFX Post', 'Colour', 'Editorial', 'Sound Post', 'Delivery']
              const pendingAuth = report.receipts.filter((r) =>
                r.status.startsWith('PENDING_') || r.status === 'RECALLED'
              ).length
              const flagged = report.receipts.filter((r) => {
                const cloudSound = Boolean(r.sound_performer_audio) &&
                  !!r.sound_processing_location &&
                  r.sound_processing_location !== 'Local software — not uploaded'
                return (
                  r.tool_status === 'RED' ||
                  (r.department === 'VFX Post' && !r.vfx_no_training_confirmed) ||
                  ((r.department === 'Sound' || r.department === 'Sound Post') && !r.sound_no_training_confirmed) ||
                  (r.department === 'Development and Writing' && !r.writing_no_training_confirmed) ||
                  (r.department === 'Delivery' && !r.delivery_no_training_confirmed) ||
                  cloudSound ||
                  (POST_PROD_DEPTS.includes(r.department) && !r.facility_ai_policy_confirmed) ||
                  (Boolean(r.third_party_asset) && !r.third_party_licence_confirmed) ||
                  (Array.isArray(r.additional_tools) && (r.additional_tools as AdditionalToolEntry[]).some(at => at.tool_status === 'RED' || at.tool_status === 'UNVERIFIED'))
                )
              }).length
              const stats = [
                { label: 'Total Receipts', value: report.receipts.length, alert: false },
                { label: 'Fully Authorised', value: report.auth_signed_count, alert: false },
                { label: 'Pending / Recalled', value: pendingAuth, alert: pendingAuth > 0 },
                { label: 'Compliance Flags', value: flagged, alert: flagged > 0 },
              ]
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: '#1A3D2B',
                        border: s.alert ? '1px solid rgba(200,168,75,0.5)' : '1px solid #2D6A4F',
                      }}
                    >
                      <p className="font-courier text-[9px] uppercase tracking-widest mb-1" style={{ color: s.alert ? '#C8A84B' : '#8BB5A0' }}>{s.label}</p>
                      <p className="font-garamond text-3xl" style={{ color: s.alert ? '#C8A84B' : '#F0EBE0' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Cover */}
            <div className="rounded-lg p-8" style={{ backgroundColor: '#122E1F', border: '1px solid #2D6A4F', borderLeft: '3px solid #C8A84B' }}>
              <p className="font-courier text-[10px] uppercase tracking-widest mb-2" style={{ color: '#8BB5A0' }}>
                TRACE Compliance Report
              </p>
              <h2 className="font-garamond text-3xl mb-1" style={{ color: '#F0EBE0' }}>{report.production_name}</h2>
              <p className="font-courier text-xs" style={{ color: '#8BB5A0' }}>
                {fmt(report.date_range.from)} — {fmt(report.date_range.to)}
              </p>
              {report.filter_description && (
                <p className="mt-2 font-courier text-xs inline-block rounded px-3 py-1.5" style={{ background: 'rgba(45,106,79,0.3)', color: '#8BB5A0' }}>
                  Filtered: {report.filter_description}
                </p>
              )}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Receipts', value: report.receipts.length },
                  { label: 'AUTH-Signed', value: report.auth_signed_count },
                  { label: 'GREEN Tool Use', value: `${report.green_pct}%` },
                  { label: 'Departments', value: Object.keys(report.by_department).length },
                ].map((s) => (
                  <div key={s.label} className="rounded p-3" style={{ backgroundColor: '#0F2419', border: '1px solid #2D6A4F' }}>
                    <p className="font-courier text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8BB5A0' }}>{s.label}</p>
                    <p className="font-garamond text-2xl" style={{ color: '#F0EBE0' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 1: Chain of Title Summary */}
            <ReportSection title="1. Chain of Title Summary">
              <p className="text-sm mb-4" style={{ color: '#8BB5A0' }}>
                {report.receipts.length} Artist Receipt{report.receipts.length !== 1 ? 's' : ''} logged across {Object.keys(report.by_department).length} department{Object.keys(report.by_department).length !== 1 ? 's' : ''}. All {report.auth_signed_count} receipts carry AUTH sign-off. {report.green_pct}% record use of GREEN-status tools.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Department</th>
                    <th className="text-right px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Receipts</th>
                    <th className="text-right px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.by_department)
                    .sort((a, b) => b[1] - a[1])
                    .map(([dept, count]) => (
                      <tr key={dept} style={{ borderTop: '1px solid rgba(45,106,79,0.3)' }}>
                        <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>{dept}</td>
                        <td className="px-3 py-2 text-right" style={{ color: '#D4EDE1' }}>{count}</td>
                        <td className="px-3 py-2 text-right" style={{ color: '#8BB5A0' }}>
                          {Math.round((count / report.receipts.length) * 100)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </ReportSection>

            {/* Crew Consent Register */}
            <ReportSection title="Crew Consent Register">
              {report.crew_consents.length === 0 ? (
                <p className="font-courier text-sm" style={{ color: '#5A8A72' }}>No consent records found for this production.</p>
              ) : (
                <>
                  <p className="text-sm mb-4" style={{ color: '#8BB5A0' }}>
                    {report.crew_consents.length} crew member{report.crew_consents.length !== 1 ? 's' : ''} have confirmed their TRACE© consent declaration.
                  </p>
                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Name</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Role</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Consented At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.crew_consents.map((c: CrewConsent) => (
                        <tr key={c.id} style={{ borderTop: '1px solid rgba(45,106,79,0.3)' }}>
                          <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>{c.crew_member_name}</td>
                          <td className="px-3 py-2" style={{ color: '#8BB5A0' }}>{c.crew_role}</td>
                          <td className="px-3 py-2 font-courier text-xs" style={{ color: '#5A8A72' }}>
                            {new Date(c.consented_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {report.unconsented_crew.length > 0 && (
                <div className="rounded px-4 py-3" style={{ background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.4)' }}>
                  <p className="font-courier text-xs font-semibold mb-2" style={{ color: '#C8A84B' }}>
                    ⚑ AMBER — Crew with activity but no consent record
                  </p>
                  <ul className="space-y-1">
                    {report.unconsented_crew.map((name) => (
                      <li key={name} className="font-courier text-xs" style={{ color: '#C8A84B' }}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </ReportSection>

            {/* Section 2: AI Carbon Estimate */}
            {(() => {
              const { rows, isExample } = buildCarbonRows(report.receipts)
              const totalCount = rows.reduce((s, r) => s + r.count, 0)
              const totalKwhMin = rows.reduce((s, r) => s + r.kwhMin, 0)
              const totalKwhMax = rows.reduce((s, r) => s + r.kwhMax, 0)
              const totalCo2Min = rows.reduce((s, r) => s + r.co2Min, 0)
              const totalCo2Max = rows.reduce((s, r) => s + r.co2Max, 0)
              return (
                <ReportSection title="2. AI Carbon Estimate">
                  {isExample && (
                    <div className="rounded px-4 py-2 mb-4 font-courier text-xs" style={{ backgroundColor: 'rgba(200,168,75,0.12)', border: '1px solid rgba(200,168,75,0.4)', color: '#C8A84B' }}>
                      No carbon intensity data found for current receipts. Showing example data for demonstration purposes.
                    </div>
                  )}
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Tool Name</th>
                          <th className="text-right px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Receipts Logged</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Carbon Intensity</th>
                          <th className="text-right px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Est. kWh Range</th>
                          <th className="text-right px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Est. CO₂e Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.tool} style={{ borderTop: '1px solid rgba(45,106,79,0.3)' }}>
                            <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>
                              {row.tool}{row.isExample && <span className="ml-2 font-courier text-[10px]" style={{ color: '#C8A84B' }}>[Example]</span>}
                            </td>
                            <td className="px-3 py-2 text-right" style={{ color: '#D4EDE1' }}>{row.count}</td>
                            <td className="px-3 py-2">
                              <span className="font-courier text-xs font-semibold" style={{ color: CARBON_INTENSITY_COLORS_REPORT[row.intensity] || '#C8A84B' }}>{row.intensity}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-courier text-xs" style={{ color: '#8BB5A0' }}>{fmtNum(row.kwhMin)}–{fmtNum(row.kwhMax)} kWh</td>
                            <td className="px-3 py-2 text-right font-courier text-xs" style={{ color: '#8BB5A0' }}>{fmtNum(row.co2Min)}–{fmtNum(row.co2Max)} kg</td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: '2px solid #2D6A4F', backgroundColor: '#0F2419' }}>
                          <td className="px-3 py-2 font-semibold" style={{ color: '#F0EBE0' }}>Total</td>
                          <td className="px-3 py-2 text-right font-semibold" style={{ color: '#F0EBE0' }}>{totalCount}</td>
                          <td className="px-3 py-2" />
                          <td className="px-3 py-2 text-right font-courier text-xs font-semibold" style={{ color: '#D4EDE1' }}>{fmtNum(totalKwhMin)}–{fmtNum(totalKwhMax)} kWh</td>
                          <td className="px-3 py-2 text-right font-courier text-xs font-semibold" style={{ color: '#D4EDE1' }}>{fmtNum(totalCo2Min)}–{fmtNum(totalCo2Max)} kg</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="font-courier text-[10px] leading-relaxed mb-4" style={{ color: '#5A8A72' }}>
                    Carbon estimates are based on published academic research. AI tool providers do not publish per-query energy data. These figures are order-of-magnitude estimates, not precise measurements.
                  </p>
                  <div className="group relative inline-block">
                    <button
                      disabled
                      className="btn-secondary text-sm opacity-40 cursor-not-allowed"
                    >
                      Export to Albert
                    </button>
                    <div className="absolute left-0 top-full mt-2 w-64 rounded-lg p-3 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ backgroundColor: '#0D2418', border: '1px solid #2D6A4F', color: '#D4EDE1' }}>
                      <p className="font-courier text-[10px] leading-relaxed">Albert integration — coming in Build 2.</p>
                    </div>
                  </div>
                </ReportSection>
              )
            })()}

            {/* Section 3: Guild Compliance Register */}
            <ReportSection title="3. Guild Compliance Register">
              <p className="text-sm mb-4" style={{ color: '#8BB5A0' }}>
                Every AI tool used on this production, its status, and department usage. RED and YELLOW status tools are flagged.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Tool</th>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Status</th>
                    <th className="text-right px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Uses</th>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Departments</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_tool.map((t) => (
                    <tr
                      key={t.tool}
                      style={{
                        borderTop: '1px solid rgba(45,106,79,0.3)',
                        backgroundColor: t.status !== 'GREEN' ? 'rgba(248,113,113,0.05)' : 'transparent',
                      }}
                    >
                      <td className="px-3 py-2 font-medium" style={{ color: '#F0EBE0' }}>{t.tool}</td>
                      <td className="px-3 py-2">
                        <span className={`status-badge ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="px-3 py-2 text-right" style={{ color: '#8BB5A0' }}>{t.count}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: '#8BB5A0' }}>{t.departments.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>

            {/* Section 4: AI Tool Audit */}
            <ReportSection title="4. AI Tool Audit">
              <p className="text-sm mb-4" style={{ color: '#8BB5A0' }}>
                {report.by_tool.length} unique AI tool{report.by_tool.length !== 1 ? 's' : ''} used across this production.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Tool</th>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Status</th>
                    <th className="text-right px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Total Uses</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_tool.map((t) => (
                    <tr key={t.tool} style={{ borderTop: '1px solid rgba(45,106,79,0.3)' }}>
                      <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>{t.tool}</td>
                      <td className="px-3 py-2">
                        <span className={`status-badge ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="px-3 py-2 text-right" style={{ color: '#8BB5A0' }}>{t.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>

            {/* Section 5: LCT Coverage Report */}
            <ReportSection title="5. LCT Coverage Report">
              {report.lct_receipts.length === 0 ? (
                <p className="text-sm" style={{ color: '#5A8A72' }}>
                  No receipts on this production flagged performer likeness or voice (LCT) use.
                </p>
              ) : (
                <>
                  <p className="text-sm mb-4" style={{ color: '#8BB5A0' }}>
                    {report.lct_receipts.length} receipt{report.lct_receipts.length !== 1 ? 's' : ''} involve performer likeness or voice.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Scene / Asset</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Crew Member</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Tool</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>LCT Reference</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Child</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.lct_receipts.map((r) => (
                        <tr key={r.id} style={{
                          borderTop: '1px solid rgba(45,106,79,0.3)',
                          backgroundColor: r.lct_child_performer ? 'rgba(200,168,75,0.06)' : 'transparent',
                        }}>
                          <td className="px-3 py-2 font-courier text-xs" style={{ color: '#8BB5A0' }}>{r.scene_usid}</td>
                          <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>{r.crew_member_name}</td>
                          <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>{r.ai_tool_used}</td>
                          <td className="px-3 py-2">
                            {r.lct_reference ? (
                              <span className="font-courier text-xs" style={{ color: '#8BB5A0' }}>{r.lct_reference}</span>
                            ) : (
                              <span className="font-courier text-xs font-medium" style={{ color: '#f87171' }}>Not provided</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {r.lct_child_performer ? (
                              <span className="font-courier text-xs font-semibold" style={{ color: '#C8A84B' }}>Yes — {r.lct_child_age_bracket || 'age not set'}</span>
                            ) : (
                              <span className="text-xs" style={{ color: '#2D6A4F' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </ReportSection>

            {/* Section 6: Whitelist Compliance Register */}
            <ReportSection title="6. Whitelist Compliance Register">
              <p className="text-sm mb-4" style={{ color: '#8BB5A0' }}>
                Whitelist status of each AI tool at the time of submission.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Tool</th>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Status</th>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Condition at Submission</th>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {report.receipts.map((r) => (
                    <tr key={r.id} style={{
                      borderTop: '1px solid rgba(45,106,79,0.3)',
                      backgroundColor: r.tool_status !== 'GREEN' ? 'rgba(200,168,75,0.05)' : 'transparent',
                    }}>
                      <td className="px-3 py-2 font-medium" style={{ color: '#F0EBE0' }}>{r.ai_tool_used}</td>
                      <td className="px-3 py-2">
                        <span className={`status-badge ${STATUS_COLORS[r.tool_status] || 'status-red'}`}>
                          {r.tool_status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs italic" style={{ color: '#8BB5A0' }}>
                        {r.whitelist_condition || '—'}
                      </td>
                      <td className="px-3 py-2 font-courier text-xs" style={{ color: '#5A8A72' }}>{fmt(r.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>

            {/* Section 7: Selection Register */}
            <ReportSection title="7. Selection Register">
              <p className="text-sm mb-4" style={{ color: '#8BB5A0' }}>
                Per-receipt record of what was selected from each AI output and the stated reason for that selection.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Scene / Asset</th>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Crew Member</th>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>What was selected</th>
                    <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Why selected</th>
                  </tr>
                </thead>
                <tbody>
                  {report.receipts
                    .filter((r) => (r.sel_output || '').trim() || r.sel_description)
                    .map((r) => (
                      <tr key={r.id} className="align-top" style={{ borderTop: '1px solid rgba(45,106,79,0.3)' }}>
                        <td className="px-3 py-2 font-courier text-xs whitespace-nowrap" style={{ color: '#8BB5A0' }}>{r.scene_usid}</td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>
                          {r.crew_member_name}
                          <span className="block font-courier text-[10px] mt-0.5" style={{ color: '#5A8A72' }}>{r.crew_role}</span>
                        </td>
                        <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>{r.sel_output || '—'}</td>
                        <td className="px-3 py-2" style={{ color: '#8BB5A0' }}>
                          {r.sel_description || '—'}
                          {r.sel_detail && (
                            <span className="block text-xs italic mt-0.5" style={{ color: '#5A8A72' }}>{r.sel_detail}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </ReportSection>

            {/* VFX Compliance Register (conditional) */}
            {report.receipts.some((r) => r.department === 'VFX Post') && (
              <ReportSection title="VFX Compliance Register">
                <p className="text-sm mb-4" style={{ color: '#8BB5A0' }}>
                  Per-receipt VFX compliance data: software used, data processing location, input and output types, and training data confirmation.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Scene / Asset</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Crew Member</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Software</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Data Location</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Input</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Output</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>No Training</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>LCT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.receipts.filter((r) => r.department === 'VFX Post').map((r) => (
                        <tr key={r.id} className="align-top" style={{ borderTop: '1px solid rgba(45,106,79,0.3)' }}>
                          <td className="px-3 py-2 font-courier text-xs whitespace-nowrap" style={{ color: '#8BB5A0' }}>{r.scene_usid}</td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{r.crew_member_name}</td>
                          <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>{r.vfx_software || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{r.vfx_data_location || '—'}</td>
                          <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>{r.vfx_input_type || '—'}</td>
                          <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>{r.vfx_output_type || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`font-courier text-xs font-semibold ${r.vfx_no_training_confirmed ? 'text-status-green' : 'text-status-red'}`}>
                              {r.vfx_no_training_confirmed ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {r.vfx_input_type === 'Plate footage containing performers' ? (
                              <span className={`font-courier text-xs font-semibold ${r.vfx_lct_confirmed ? 'text-status-green' : 'text-status-red'}`}>
                                {r.vfx_lct_confirmed ? 'Yes' : 'No'}
                              </span>
                            ) : (
                              <span className="font-courier text-xs" style={{ color: '#2D6A4F' }}>N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReportSection>
            )}

            {/* Sound / Sound Post Compliance Register (conditional) */}
            {report.receipts.some((r) => r.department === 'Sound' || r.department === 'Sound Post') && (
              <ReportSection title="Sound / Sound Post Compliance Register">
                <p className="text-sm mb-4" style={{ color: '#8BB5A0' }}>
                  Per-receipt Sound compliance data: processing location, type of processing, performer dialogue, and training data confirmation. Receipts with a cloud-processing flag are highlighted.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Scene / Asset</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Crew Member</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Processing Location</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Type</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Performer Dialogue</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Cloud Flag</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>No Training</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.receipts.filter((r) => r.department === 'Sound' || r.department === 'Sound Post').map((r) => {
                        const cloudFlag = r.sound_performer_audio && r.sound_processing_location !== 'Local software — not uploaded'
                        return (
                          <tr key={r.id} className="align-top" style={{
                            borderTop: '1px solid rgba(45,106,79,0.3)',
                            backgroundColor: cloudFlag ? 'rgba(248,113,113,0.06)' : 'transparent',
                          }}>
                            <td className="px-3 py-2 font-courier text-xs whitespace-nowrap" style={{ color: '#8BB5A0' }}>{r.scene_usid}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{r.crew_member_name}</td>
                            <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>{r.sound_processing_location || '—'}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{r.sound_processing_type || '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`font-courier text-xs font-semibold ${r.sound_performer_audio ? 'text-status-amber' : ''}`} style={!r.sound_performer_audio ? { color: '#5A8A72' } : {}}>
                                {r.sound_performer_audio ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {cloudFlag ? (
                                <span className="font-courier text-xs font-semibold text-status-red">FLAGGED</span>
                              ) : (
                                <span className="font-courier text-xs" style={{ color: '#2D6A4F' }}>—</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`font-courier text-xs font-semibold ${r.sound_no_training_confirmed ? 'text-status-green' : 'text-status-red'}`}>
                                {r.sound_no_training_confirmed ? 'Yes' : 'No'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </ReportSection>
            )}

            {/* Writing Compliance Register (conditional) */}
            {report.receipts.some((r) => r.department === 'Development and Writing') && (
              <ReportSection title="Writing Compliance Register">
                <p className="text-sm mb-4" style={{ color: '#8BB5A0' }}>
                  Per-receipt Writing compliance data. Unconfirmed training data use and missing authorship declarations are highlighted.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Scene / Asset</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Writer</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Stage</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Material</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Guild</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>AI Contribution</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>No Training</th>
                        <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Authorship</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.receipts.filter((r) => r.department === 'Development and Writing').map((r) => {
                        const flagged = !r.writing_no_training_confirmed || !r.writing_authorship_declared
                        return (
                          <tr key={r.id} className="align-top" style={{
                            borderTop: '1px solid rgba(45,106,79,0.3)',
                            backgroundColor: flagged ? 'rgba(200,168,75,0.05)' : 'transparent',
                          }}>
                            <td className="px-3 py-2 font-courier text-xs whitespace-nowrap" style={{ color: '#8BB5A0' }}>{r.scene_usid}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{r.crew_member_name}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{r.writing_stage || '—'}</td>
                            <td className="px-3 py-2 text-xs" style={{ color: '#D4EDE1' }}>{r.writing_submitted_material || '—'}</td>
                            <td className="px-3 py-2" style={{ color: '#D4EDE1' }}>
                              <span className="whitespace-nowrap">{r.writing_guild_status || '—'}</span>
                              {r.writing_guild_status === 'WGA' && (
                                <span className="block font-courier text-[10px] mt-0.5" style={{ color: '#5A8A72' }}>
                                  {r.writing_wga_writers_count != null ? `${r.writing_wga_writers_count} writer${Number(r.writing_wga_writers_count) !== 1 ? 's' : ''}` : ''}
                                  {r.writing_wga_registration ? ` · ${r.writing_wga_registration}` : ''}
                                </span>
                              )}
                              {r.writing_guild_status === 'WGGB' && (
                                <span className="block font-courier text-[10px] mt-0.5" style={{ color: '#5A8A72' }}>
                                  {r.writing_wggb_context || ''}
                                  {r.writing_wggb_paternity ? ' · Paternity asserted' : ' · Paternity not asserted'}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs" style={{ color: '#D4EDE1' }}>{r.writing_ai_contribution || '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`font-courier text-xs font-semibold ${r.writing_no_training_confirmed ? 'text-status-green' : 'text-status-red'}`}>
                                {r.writing_no_training_confirmed ? 'Yes' : 'FLAGGED'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`font-courier text-xs font-semibold ${r.writing_authorship_declared ? 'text-status-green' : 'text-status-red'}`}>
                                {r.writing_authorship_declared ? 'Yes' : 'No'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </ReportSection>
            )}

            {/* Third-Party Licence Register (conditional) */}
            {report.receipts.some((r) => Boolean(r.third_party_asset)) && (() => {
              const tpReceipts = report.receipts.filter((r) => Boolean(r.third_party_asset))
              const uncleared = tpReceipts.filter((r) => !r.third_party_licence_confirmed)
              return (
                <ReportSection title="Third-Party Licence Register">
                  {uncleared.length > 0 && (
                    <div className="mb-4 rounded px-4 py-3" style={{ background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.35)', borderLeft: '3px solid #C8A84B' }}>
                      <p className="font-courier text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#C8A84B' }}>
                        {uncleared.length} receipt{uncleared.length !== 1 ? 's' : ''} — third-party licence clearance not confirmed
                      </p>
                      <p className="text-xs" style={{ color: '#C8A84B', opacity: 0.85 }}>
                        Third-party licence clearance not confirmed — legal review required before delivery.
                      </p>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Date</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Dept</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Crew Member</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Scene / Asset</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>AI Tool</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Licence Confirmed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tpReceipts.map((r) => (
                          <tr
                            key={r.id}
                            className="align-top"
                            style={{
                              borderTop: '1px solid rgba(45,106,79,0.3)',
                              backgroundColor: !r.third_party_licence_confirmed ? 'rgba(200,168,75,0.05)' : 'transparent',
                            }}
                          >
                            <td className="px-3 py-2 font-courier text-xs whitespace-nowrap" style={{ color: '#8BB5A0' }}>{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{r.department}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{r.crew_member_name}</td>
                            <td className="px-3 py-2 font-courier text-xs whitespace-nowrap" style={{ color: '#8BB5A0' }}>{r.scene_usid}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{r.ai_tool_used}</td>
                            <td className="px-3 py-2">
                              {r.third_party_licence_confirmed ? (
                                <span className="font-courier text-xs font-semibold text-status-green">Confirmed</span>
                              ) : (
                                <span className="font-courier text-xs font-semibold text-status-amber">NOT CONFIRMED</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReportSection>
              )
            })()}

            {/* Facility AI Policy Register (conditional) */}
            {report.receipts.some((r) => ['VFX Post', 'Colour', 'Editorial', 'Sound Post', 'Delivery'].includes(r.department)) && (() => {
              const ppReceipts = report.receipts.filter((r) => ['VFX Post', 'Colour', 'Editorial', 'Sound Post', 'Delivery'].includes(r.department))
              const unconfirmed = ppReceipts.filter((r) => !r.facility_ai_policy_confirmed)
              return (
                <ReportSection title="Facility AI Policy Register">
                  {unconfirmed.length > 0 && (
                    <div className="mb-4 rounded px-4 py-3" style={{ background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.35)', borderLeft: '3px solid #C8A84B' }}>
                      <p className="font-courier text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#C8A84B' }}>
                        {unconfirmed.length} unconfirmed facility AI {unconfirmed.length === 1 ? 'policy' : 'policies'}
                      </p>
                      <p className="text-xs" style={{ color: '#C8A84B', opacity: 0.85 }}>
                        Obtain written AI policy confirmation from {unconfirmed.length === 1 ? 'this facility' : 'these facilities'} before delivery. Unconfirmed items are highlighted below.
                      </p>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: '#0F2419', borderBottom: '1px solid #2D6A4F' }}>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Dept</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Crew Member</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Facility</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Render / Processing Location</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Input Version</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Output Version</th>
                          <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Policy Confirmed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ppReceipts.map((r) => (
                          <tr
                            key={r.id}
                            className="align-top"
                            style={{
                              borderTop: '1px solid rgba(45,106,79,0.3)',
                              backgroundColor: !r.facility_ai_policy_confirmed ? 'rgba(200,168,75,0.05)' : 'transparent',
                            }}
                          >
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>
                              {r.department}
                              {r.is_session && (
                                <span className="ml-1.5 font-courier text-[9px] uppercase tracking-wide rounded-full px-1.5 py-0.5" style={{ background: 'rgba(45,106,79,0.3)', color: '#8BB5A0' }}>session</span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: '#D4EDE1' }}>{r.crew_member_name}</td>
                            <td className="px-3 py-2 text-xs" style={{ color: r.facility_name ? '#D4EDE1' : '#5A8A72' }}>
                              {r.facility_name || 'In-house / remote'}
                            </td>
                            <td className="px-3 py-2 text-xs" style={{ color: '#D4EDE1' }}>{r.render_processing_location || '—'}</td>
                            <td className="px-3 py-2 font-courier text-xs" style={{ color: r.input_file_version ? '#D4EDE1' : '#5A8A72' }}>
                              {r.input_file_version || '—'}
                            </td>
                            <td className="px-3 py-2 font-courier text-xs" style={{ color: r.output_file_version ? '#D4EDE1' : '#5A8A72' }}>
                              {r.output_file_version || '—'}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`font-courier text-xs font-semibold ${r.facility_ai_policy_confirmed ? 'text-status-green' : 'text-status-red'}`}>
                                {r.facility_ai_policy_confirmed ? 'Confirmed' : 'NOT CONFIRMED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReportSection>
              )
            })()}

            {/* Section 8: Platform Disclosure Summary */}
            <ReportSection title="8. Platform Disclosure Summary">
              <PlatformDisclosure report={report} />
            </ReportSection>

            {/* Section 9: Delivery Support Note */}
            <ReportSection title="9. Delivery Support Note">
              <CompletionBondNote report={report} />
            </ReportSection>

            {/* Section 10: Complete Receipt Log */}
            <ReportSection title={`10. Complete Receipt Log${viewMode === 'audit' ? ' — Full Audit View' : ''}`}>
              <div className="flex items-center justify-between mb-4 no-print">
                <p className="text-sm" style={{ color: '#8BB5A0' }}>
                  {report.receipts.length} receipt{report.receipts.length !== 1 ? 's' : ''}.{' '}
                  {viewMode === 'summary'
                    ? 'Click any row to expand the full four-point log.'
                    : 'All receipts expanded — full audit detail.'}
                </p>
                {viewMode === 'summary' && report.receipts.length > 0 && (
                  <button
                    onClick={() => {
                      if (expandedReceipts.size === report.receipts.length) {
                        setExpandedReceipts(new Set())
                      } else {
                        setExpandedReceipts(new Set(report.receipts.map((r) => r.id)))
                      }
                    }}
                    className="font-courier text-xs hover:underline ml-4 flex-shrink-0"
                    style={{ color: '#C8A84B' }}
                  >
                    {expandedReceipts.size === report.receipts.length ? 'Collapse all' : 'Expand all'}
                  </button>
                )}
              </div>
              <div className="rounded overflow-hidden" style={{ border: '1px solid rgba(45,106,79,0.4)' }}>
                {report.receipts.map((r, i) => (
                  <ReceiptAuditRow
                    key={r.id}
                    receipt={r}
                    index={i}
                    expanded={viewMode === 'audit' || expandedReceipts.has(r.id)}
                    onToggle={() => toggleReceipt(r.id)}
                  />
                ))}
              </div>
            </ReportSection>

            {/* Footer */}
            <div className="text-center font-courier text-xs py-4" style={{ color: '#5A8A72', borderTop: '1px solid rgba(45,106,79,0.4)' }}>
              TRACE Compliance Report generated {fmt(report.generated_at)} &bull; Laura Burrows, NFTS AI Diploma, April 2026
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ReceiptAuditRow({
  receipt: r,
  index,
  expanded,
  onToggle,
}: {
  receipt: Receipt
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const fmtD = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtDT = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const hasFlags =
    (Boolean(r.third_party_asset) && !r.third_party_licence_confirmed) ||
    (r.lct_required && !r.lct_reference) ||
    r.tool_status === 'RED' ||
    r.tool_status === 'UNVERIFIED' ||
    (r.department === 'Development and Writing' && r.writing_consent_confirmed === false)

  return (
    <div style={{ borderBottom: index > 0 ? '1px solid rgba(45,106,79,0.25)' : undefined }}>
      {/* Summary row */}
      <div
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.backgroundColor = 'rgba(45,106,79,0.08)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = expanded ? 'rgba(45,106,79,0.06)' : 'transparent' }}
        style={{ backgroundColor: expanded ? 'rgba(45,106,79,0.06)' : 'transparent' }}
      >
        <span className="font-courier text-xs flex-shrink-0 w-3" style={{ color: '#C8A84B' }}>
          {expanded ? '▾' : '▸'}
        </span>
        <span className="font-courier text-xs flex-shrink-0 w-20 whitespace-nowrap" style={{ color: '#5A8A72' }}>
          {fmtD(r.date)}
        </span>
        <span className="font-courier text-xs flex-shrink-0 w-28 truncate" style={{ color: '#8BB5A0' }}>
          {r.department}
        </span>
        <span className="font-garamond text-base flex-shrink-0 w-40 truncate" style={{ color: '#F0EBE0' }}>
          {r.crew_member_name}
        </span>
        <span className="font-courier text-xs flex-shrink-0 w-20 truncate" style={{ color: '#8BB5A0' }}>
          {r.scene_usid}
        </span>
        <span className="flex-1 text-sm truncate" style={{ color: '#D4EDE1' }}>{r.ai_tool_used}</span>
        <span className={`status-badge flex-shrink-0 ${STATUS_COLORS[r.tool_status] || 'status-red'}`}>
          {r.tool_status}
        </span>
        <span className="font-courier text-[10px] flex-shrink-0 whitespace-nowrap" style={{ color: r.status === 'AUTH_COMPLETE' ? '#4CAF50' : '#C8A84B' }}>
          {r.status === 'AUTH_COMPLETE' ? '✓ AUTH' : '⏳ Pending'}
        </span>
        {hasFlags && (
          <span className="font-courier text-[10px] font-semibold flex-shrink-0" style={{ color: '#C8A84B' }}>⚑</span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 pt-3" style={{ backgroundColor: '#0F2419', borderTop: '1px solid rgba(45,106,79,0.25)' }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>
                {r.department} · {r.crew_member_name} · {r.crew_role}{r.guild_affiliation && r.guild_affiliation !== 'None / Non-union' ? ` · ${r.guild_affiliation === 'Other' ? (r.guild_affiliation_other || 'Other') : r.guild_affiliation}` : ''} · {fmtD(r.date)}
              </p>
              {r.twin_lock_hash && (
                <p className="font-courier text-[9px] mt-1 break-all" style={{ color: '#2D6A4F' }}>
                  SHA-256: {r.twin_lock_hash}
                </p>
              )}
              {!r.twin_lock_hash && (
                <p className="font-courier text-[9px] mt-0.5" style={{ color: '#5A8A72' }}>No hash — receipt not yet finalised</p>
              )}
            </div>
            <span className={`status-badge ml-3 flex-shrink-0 ${STATUS_COLORS[r.tool_status] || 'status-red'}`}>
              {r.tool_status}
            </span>
          </div>

          {/* Compliance flags */}
          {hasFlags && (
            <div className="mb-4 rounded px-3 py-2.5" style={{ background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.35)' }}>
              <p className="font-courier text-[10px] uppercase tracking-widest mb-1" style={{ color: '#C8A84B' }}>Compliance flags</p>
              <div className="space-y-0.5">
                {r.tool_status === 'RED' && (
                  <p className="font-courier text-xs" style={{ color: '#C8A84B' }}>⚑ RED status tool — requires auth sign-off review</p>
                )}
                {r.tool_status === 'UNVERIFIED' && (
                  <p className="font-courier text-xs" style={{ color: '#C8A84B' }}>⚑ UNVERIFIED tool — OAS assessment required</p>
                )}
                {r.lct_required && !r.lct_reference && (
                  <p className="font-courier text-xs" style={{ color: '#C8A84B' }}>⚑ LCT required — reference not provided</p>
                )}
                {Boolean(r.third_party_asset) && !r.third_party_licence_confirmed && (
                  <p className="font-courier text-xs" style={{ color: '#C8A84B' }}>⚑ Third-party licence clearance not confirmed — legal review required before delivery</p>
                )}
                {r.department === 'Development and Writing' && r.writing_consent_confirmed === false && (
                  <p className="font-courier text-xs" style={{ color: '#C8A84B' }}>⚑ Writer consent not confirmed</p>
                )}
              </div>
            </div>
          )}

          {/* Four-point log */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {[
              { label: 'POR — Prompt of Record', content: <p className="text-sm leading-relaxed" style={{ color: '#D4EDE1' }}>{r.por_description}</p> },
              { label: 'SEL — Selection', content: (
                <>
                  {r.sel_output && <p className="text-xs font-medium mb-1" style={{ color: '#D4EDE1' }}>{r.sel_output}</p>}
                  <p className="text-sm" style={{ color: '#8BB5A0' }}>{r.sel_description}</p>
                  {r.sel_detail && <p className="text-xs italic mt-0.5" style={{ color: '#5A8A72' }}>{r.sel_detail}</p>}
                </>
              )},
              { label: 'ARR — Arrival', content: <p className="text-sm leading-relaxed" style={{ color: '#D4EDE1' }}>{r.arr_description}</p> },
              { label: 'AUTH — Authorisation', content: r.status === 'AUTH_COMPLETE' ? (
                <>
                  <p className="text-sm font-medium" style={{ color: '#D4EDE1' }}>{r.auth_signer}</p>
                  <p className="font-courier text-xs mt-0.5" style={{ color: '#5A8A72' }}>
                    {r.auth_timestamp ? fmtDT(r.auth_timestamp) : '—'}
                  </p>
                </>
              ) : (
                <p className="font-courier text-xs" style={{ color: '#C8A84B' }}>Pending sign-off</p>
              )},
            ].map(({ label, content }) => (
              <div key={label} className="rounded p-3" style={{ background: 'rgba(45,106,79,0.1)', border: '1px solid rgba(45,106,79,0.25)' }}>
                <p className="font-courier text-[10px] uppercase tracking-widest mb-2" style={{ color: '#5A8A72' }}>{label}</p>
                {content}
              </div>
            ))}
          </div>

          {/* Tool details */}
          <div className="rounded p-3 mb-3" style={{ background: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.2)' }}>
            <p className="font-courier text-[10px] uppercase tracking-widest mb-2" style={{ color: '#5A8A72' }}>Tool Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="font-courier text-[10px] mb-0.5" style={{ color: '#5A8A72' }}>Tool Name</p>
                <p style={{ color: '#D4EDE1' }}>{r.ai_tool_used}</p>
              </div>
              <div>
                <p className="font-courier text-[10px] mb-0.5" style={{ color: '#5A8A72' }}>Version</p>
                <p style={{ color: r.tool_version ? '#D4EDE1' : '#5A8A72' }}>{r.tool_version || '—'}</p>
              </div>
              <div>
                <p className="font-courier text-[10px] mb-0.5" style={{ color: '#5A8A72' }}>Approval Category</p>
                <span className={`status-badge ${STATUS_COLORS[r.tool_status] || 'status-red'}`}>{r.tool_status}</span>
              </div>
              <div>
                <p className="font-courier text-[10px] mb-0.5" style={{ color: '#5A8A72' }}>Scene / Asset</p>
                <p className="font-courier" style={{ color: '#8BB5A0' }}>{r.scene_usid}</p>
              </div>
            </div>
            {r.whitelist_condition && (
              <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(45,106,79,0.2)' }}>
                <p className="font-courier text-[10px] mb-1" style={{ color: '#5A8A72' }}>Risk Attributes / Condition at Submission</p>
                <p className="text-xs italic" style={{ color: '#8BB5A0' }}>{r.whitelist_condition}</p>
              </div>
            )}
          </div>

          {/* Additional tools */}
          {Array.isArray(r.additional_tools) && (r.additional_tools as AdditionalToolEntry[]).length > 0 && (
            <div className="rounded p-3 mb-3" style={{ background: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.2)' }}>
              <p className="font-courier text-[10px] uppercase tracking-widest mb-2" style={{ color: '#5A8A72' }}>
                Additional Tools — {(r.additional_tools as AdditionalToolEntry[]).length} further tool{(r.additional_tools as AdditionalToolEntry[]).length !== 1 ? 's' : ''} in this session
              </p>
              <div className="space-y-2">
                {(r.additional_tools as AdditionalToolEntry[]).map((at, j) => (
                  <div key={j} className="rounded px-3 py-2" style={{ background: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.15)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium" style={{ color: '#D4EDE1' }}>{at.ai_tool_used}</span>
                      {at.tool_version && <span className="font-courier text-[10px]" style={{ color: '#5A8A72' }}>v{at.tool_version}</span>}
                      <span className={`status-badge ml-auto ${STATUS_COLORS[at.tool_status] || 'status-red'}`}>{at.tool_status}</span>
                    </div>
                    <p className="font-courier text-[10px] mb-0.5" style={{ color: '#5A8A72' }}>POR: <span className="normal-case not-italic font-normal" style={{ color: '#8BB5A0' }}>{at.por_description}</span></p>
                    <p className="font-courier text-[10px] mb-0.5" style={{ color: '#5A8A72' }}>SEL: <span className="normal-case not-italic font-normal" style={{ color: '#8BB5A0' }}>{at.sel_output} — {at.sel_description}</span></p>
                    <p className="font-courier text-[10px]" style={{ color: '#5A8A72' }}>ARR: <span className="normal-case not-italic font-normal" style={{ color: '#8BB5A0' }}>{at.arr_description}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LCT details */}
          {r.lct_required && (
            <div className="rounded px-3 py-2 mb-3" style={{ background: 'rgba(200,168,75,0.06)', border: '1px solid rgba(200,168,75,0.3)' }}>
              <p className="font-courier text-[10px] uppercase tracking-widest mb-1" style={{ color: '#C8A84B' }}>LCT — Performer Likeness / Voice</p>
              <p className="font-courier text-xs" style={{ color: '#C8A84B' }}>
                Ref: {r.lct_reference || 'not provided'}
                {r.lct_child_performer && ` · Child performer — ${r.lct_child_age_bracket || 'age not set'}`}
              </p>
            </div>
          )}

          {/* Meta row */}
          <div className="font-courier text-[10px] flex flex-wrap gap-x-4 gap-y-1 pt-2" style={{ color: '#2D6A4F', borderTop: '1px solid rgba(45,106,79,0.15)' }}>
            <span>Submitted: {fmtDT(r.created_at)}</span>
            <span>Receipt ID: {r.id}</span>
            {r.notes && <span>Notes: {r.notes}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
      <div className="px-6 py-3" style={{ backgroundColor: '#122E1F', borderBottom: '1px solid #2D6A4F' }}>
        <h3 className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function PlatformDisclosure({ report }: { report: ReportData }) {
  const uniqueTools = Array.from(new Set(report.receipts.map((r) => r.ai_tool_used)))
  const depts = Object.keys(report.by_department)
  const greenTools = report.by_tool.filter((t) => t.status === 'GREEN').map((t) => t.tool)
  const nonGreenTools = report.by_tool.filter((t) => t.status !== 'GREEN')

  return (
    <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#D4EDE1' }}>
      <p>
        During the production of <strong style={{ color: '#F0EBE0' }}>{report.production_name}</strong>, a total of{' '}
        <strong style={{ color: '#F0EBE0' }}>{report.receipts.length}</strong> AI-assisted creative decision{report.receipts.length !== 1 ? 's' : ''} were
        logged via the TRACE Artist Receipt system, spanning{' '}
        <strong style={{ color: '#F0EBE0' }}>{depts.length}</strong> department{depts.length !== 1 ? 's' : ''}: {depts.join(', ')}.
      </p>
      <p>
        The following AI tools were used:{' '}
        <strong style={{ color: '#F0EBE0' }}>{uniqueTools.join(', ')}</strong>.{' '}
        {greenTools.length > 0 ? (
          <>
            Of these, <strong style={{ color: '#F0EBE0' }}>{greenTools.join(', ')}</strong>{' '}
            {greenTools.length === 1 ? 'was' : 'were'} classified as GREEN (vetted for production use)
            and all uses are fully documented with four-point Artist Receipts.
          </>
        ) : (
          'No tools were classified as GREEN status on this production.'
        )}
      </p>
      {nonGreenTools.length > 0 && (
        <p>
          <strong style={{ color: '#F0EBE0' }}>{nonGreenTools.map((t) => `${t.tool} (${t.status})`).join(', ')}</strong>{' '}
          {nonGreenTools.length === 1 ? 'was' : 'were'} used under restricted or flagged status.
          All such uses carry full TRACE documentation and AUTH sign-off from the relevant Head of
          Department.
        </p>
      )}
      <p>
        Every logged creative decision has been documented with a Point of Record (POR), a
        structured Selection reason (SEL), an Arrival record (ARR), and an Authorial Control
        sign-off (AUTH) confirming that a human was the creative decision-maker at each stage.
        SEL is recorded as a categorised reason: creative direction, technical quality, brief
        compliance, least adjustment needed, combination of the above, or other. This documentation
        constitutes the chain of human authorship required for copyright eligibility under{' '}
        <em>Thaler v. Perlmutter</em> (2025).
      </p>
    </div>
  )
}

function CompletionBondNote({ report }: { report: ReportData }) {
  const signers = Array.from(new Set(report.receipts.map((r) => r.auth_signer).filter((s): s is string => !!s)))

  return (
    <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#D4EDE1' }}>
      <p className="font-courier text-xs font-semibold uppercase tracking-widest" style={{ color: '#F0EBE0' }}>TO WHOM IT MAY CONCERN</p>
      <p>
        This note is issued in support of Delivery documentation for the production{' '}
        <strong style={{ color: '#F0EBE0' }}>{report.production_name}</strong>.
      </p>
      <p>
        The TRACE Artist Receipt Logger has recorded a total of{' '}
        <strong style={{ color: '#F0EBE0' }}>{report.receipts.length}</strong> Artist Receipt{report.receipts.length !== 1 ? 's' : ''} for this
        production, covering AI-assisted creative decisions made between{' '}
        <strong style={{ color: '#F0EBE0' }}>{fmt(report.date_range.from)}</strong> and{' '}
        <strong style={{ color: '#F0EBE0' }}>{fmt(report.date_range.to)}</strong>.
      </p>
      <p>
        All <strong style={{ color: '#F0EBE0' }}>{report.auth_signed_count}</strong> receipts carry an Authorial Control (AUTH)
        sign-off from a named Head of Department or Lead Creative, confirming that a qualified human
        professional exercised creative control over each AI-assisted decision. Authorising
        signatories include: <strong style={{ color: '#F0EBE0' }}>{signers.join(', ')}</strong>.
      </p>
      <p>
        These records demonstrate that all AI-assisted creative work on this production was
        conducted under documented human authorial oversight.
      </p>
      <p className="font-courier text-xs pt-2" style={{ color: '#5A8A72', borderTop: '1px solid rgba(45,106,79,0.4)' }}>
        This report is issued by the TRACE Artist Receipt Logger on {fmt(report.generated_at)}.
      </p>
    </div>
  )
}
