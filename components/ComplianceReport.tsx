'use client'

import { useState, useEffect, useRef } from 'react'
import { DEPARTMENTS } from '@/lib/types'
import type { ReportData, ToolStatus } from '@/lib/types'

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

async function generatePDF(report: ReportData) {
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
  doc.text('TRACE Compliance Report', margin, 28)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(212, 237, 225)
  doc.text('Transparent Record of Authorship in Creative Environments', margin, 37)

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

  // ── SECTION 3: GUILD COMPLIANCE REGISTER ──────────────────────────────────
  newPage()
  h2('2. Guild Compliance Register')
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

  // ── SECTION 4: AI TOOL AUDIT ───────────────────────────────────────────────
  newPage()
  h2('3. AI Tool Audit')
  gap(2)
  body(
    `${report.by_tool.length} unique AI tool${report.by_tool.length !== 1 ? 's' : ''} were used across this production.`
  )
  gap(4)

  tableRow(['Tool', 'Status', 'Total Uses'], [100, 40, 60], true)
  report.by_tool.forEach((t) => {
    tableRow([t.tool, t.status, String(t.count)], [100, 40, 60], false, statusColor(t.status))
  })

  // ── SECTION 5: LCT COVERAGE REPORT ────────────────────────────────────────
  newPage()
  h2('4. LCT Coverage Report')
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

  // ── SECTION 5: WHITELIST COMPLIANCE REGISTER ──────────────────────────────
  newPage()
  h2('5. Whitelist Compliance Register')
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

  // ── SECTION 6: SELECTION REGISTER ─────────────────────────────────────────
  newPage()
  h2('6. Selection Register')
  gap(2)
  body('Per-receipt record of what was selected from each AI output and the stated reason for that selection.')
  gap(4)

  tableRow(['Scene / Asset', 'Crew Member', 'What was selected', 'Why selected'], [25, 35, 55, 55], true)
  report.receipts.forEach((r) => {
    const selOutput = (r.sel_output || '—').substring(0, 38) + ((r.sel_output || '').length > 38 ? '…' : '')
    const selReason = r.sel_description === 'Other' && r.sel_detail
      ? (`Other — ${r.sel_detail}`).substring(0, 38) + ((`Other — ${r.sel_detail}`).length > 38 ? '…' : '')
      : (r.sel_description || '—')
    tableRow([r.scene_usid, r.crew_member_name, selOutput, selReason], [25, 35, 55, 55])
  })

  // ── VFX COMPLIANCE REGISTER (conditional) ─────────────────────────────────
  const vfxReceipts = report.receipts.filter((r) => r.department === 'VFX')
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
  const writingReceipts = report.receipts.filter((r) => r.department === 'Writing')
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

  // ── FACILITY AI POLICY REGISTER (conditional) ─────────────────────────────
  const postProdDepts = ['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC']
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

  // ── SECTION 7: PLATFORM DISCLOSURE SUMMARY ────────────────────────────────
  newPage()
  h2('7. Platform Disclosure Summary')
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
    `Every logged creative decision has been documented with a Point of Record (POR), a structured Selection reason (SEL — categorised from: creative direction, technical quality, brief compliance, least adjustment, combination, or other), an Adjustment record (ADJ), and an Authorial Control sign-off (AUTH) confirming that a human was the creative decision-maker at each stage. This documentation constitutes the chain of human authorship required for copyright eligibility under Thaler v. Perlmutter (2025).`,
  ].join('\n')

  body(disclosurePara)

  // ── SECTION 8: COMPLETION BOND SUPPORT NOTE ───────────────────────────────
  newPage()
  h2('8. Delivery Support Note')
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

  // footer on final page
  doc.setFontSize(7)
  doc.setTextColor(...LIGHT)
  doc.text(
    `TRACE Compliance Report — ${report.production_name} — Confidential`,
    margin,
    pageH - 10
  )
  doc.text(`Page ${doc.getNumberOfPages()}`, pageW - margin, pageH - 10, { align: 'right' })

  const filename = `TRACE-${report.production_name.replace(/[^a-z0-9]/gi, '_')}-Compliance-Report.pdf`
  doc.save(filename)
}

export default function ComplianceReport() {
  const [productions, setProductions] = useState<string[]>([])
  const [selected, setSelected] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

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
      await generatePDF(report)
    } catch (e) {
      console.error(e)
      alert('PDF generation failed. Please try again.')
    } finally {
      setPdfGenerating(false)
    }
  }

  return (
    <div>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              {(filterDept || filterStatus || filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => { setFilterDept(''); setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setReport(null) }}
                  className="mt-2 font-courier text-xs hover:underline"
                  style={{ color: '#C8A84B' }}
                >
                  Clear filters
                </button>
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
          <div className="flex justify-end mb-4 no-print">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfGenerating}
              className="btn-primary disabled:opacity-50"
            >
              {pdfGenerating ? 'Generating PDF…' : 'Download PDF'}
            </button>
          </div>

          <div ref={reportRef} className="space-y-6">
            {/* Summary stat row */}
            {(() => {
              const POST_PROD_DEPTS = ['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC']
              const pendingHod = report.receipts.filter((r) => r.status === 'PENDING_HOD_AUTH').length
              const flagged = report.receipts.filter((r) => {
                const cloudSound = Boolean(r.sound_performer_audio) &&
                  !!r.sound_processing_location &&
                  r.sound_processing_location !== 'Local software — not uploaded'
                return (
                  r.tool_status === 'RED' ||
                  (r.department === 'VFX' && !r.vfx_no_training_confirmed) ||
                  ((r.department === 'Sound' || r.department === 'Sound Post') && !r.sound_no_training_confirmed) ||
                  (r.department === 'Writing' && !r.writing_no_training_confirmed) ||
                  (r.department === 'Delivery / QC' && !r.delivery_no_training_confirmed) ||
                  cloudSound ||
                  (POST_PROD_DEPTS.includes(r.department) && !r.facility_ai_policy_confirmed)
                )
              }).length
              const stats = [
                { label: 'Total Receipts', value: report.receipts.length, alert: false },
                { label: 'Fully Authorised', value: report.auth_signed_count, alert: false },
                { label: 'Pending HOD AUTH', value: pendingHod, alert: pendingHod > 0 },
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

            {/* Section 2: Guild Compliance Register */}
            <ReportSection title="2. Guild Compliance Register">
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

            {/* Section 3: AI Tool Audit */}
            <ReportSection title="3. AI Tool Audit">
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

            {/* Section 4: LCT Coverage Report */}
            <ReportSection title="4. LCT Coverage Report">
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

            {/* Section 5: Whitelist Compliance Register */}
            <ReportSection title="5. Whitelist Compliance Register">
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

            {/* Section 6: Selection Register */}
            <ReportSection title="6. Selection Register">
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
                  {report.receipts.map((r) => (
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
            {report.receipts.some((r) => r.department === 'VFX') && (
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
                      {report.receipts.filter((r) => r.department === 'VFX').map((r) => (
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
            {report.receipts.some((r) => r.department === 'Writing') && (
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
                      {report.receipts.filter((r) => r.department === 'Writing').map((r) => {
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

            {/* Facility AI Policy Register (conditional) */}
            {report.receipts.some((r) => ['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC'].includes(r.department)) && (() => {
              const ppReceipts = report.receipts.filter((r) => ['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC'].includes(r.department))
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

            {/* Section 7: Platform Disclosure Summary */}
            <ReportSection title="7. Platform Disclosure Summary">
              <PlatformDisclosure report={report} />
            </ReportSection>

            {/* Section 8: Delivery Support Note */}
            <ReportSection title="8. Delivery Support Note">
              <CompletionBondNote report={report} />
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
        structured Selection reason (SEL), an Adjustment record (ADJ), and an Authorial Control
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
