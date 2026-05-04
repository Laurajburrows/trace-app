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
      ['Scene / Asset', 'Crew Member', 'Tool', 'LCT Reference'],
      [50, 45, 45, 60],
      true
    )
    report.lct_receipts.forEach((r) => {
      tableRow(
        [r.scene_usid, r.crew_member_name, r.ai_tool_used, r.lct_reference || '— not provided —'],
        [50, 45, 45, 60],
        false,
        r.lct_reference ? undefined : RED_C
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

  // ── SECTION 6: PLATFORM DISCLOSURE SUMMARY ────────────────────────────────
  newPage()
  h2('6. Platform Disclosure Summary')
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

  // ── SECTION 7: COMPLETION BOND SUPPORT NOTE ───────────────────────────────
  newPage()
  h2('7. Delivery Support Note')
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
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 no-print">
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
            <div className="input text-gray-400">
              No productions logged yet.{' '}
              <a href="/receipt/new" className="text-trace-moss hover:underline">
                Submit a receipt first.
              </a>
            </div>
          )}
        </div>

        {selected && (
          <>
            <div className="border-t border-gray-100 pt-4 mb-4">
              <p className="label mb-3">Filter Report <span className="normal-case font-normal text-gray-400">(optional — leave blank for full production report)</span></p>
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
                  className="mt-2 text-xs text-trace-moss hover:underline"
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
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
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
            {/* Cover */}
            <div className="bg-trace-forest text-white rounded-lg p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-trace-pale mb-2">
                TRACE Compliance Report
              </p>
              <h2 className="text-2xl font-bold mb-1">{report.production_name}</h2>
              <p className="text-trace-pale text-sm">
                {fmt(report.date_range.from)} — {fmt(report.date_range.to)}
              </p>
              {report.filter_description && (
                <p className="mt-2 text-xs bg-white/10 rounded px-3 py-1.5 text-trace-pale inline-block">
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
                  <div key={s.label} className="bg-white/10 rounded p-3">
                    <p className="text-xs text-trace-pale uppercase tracking-wide">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 1: Chain of Title Summary */}
            <ReportSection title="1. Chain of Title Summary">
              <p className="text-sm text-gray-600 mb-4">
                {report.receipts.length} Artist Receipt{report.receipts.length !== 1 ? 's' : ''} logged across {Object.keys(report.by_department).length} department{Object.keys(report.by_department).length !== 1 ? 's' : ''}. All {report.auth_signed_count} receipts carry AUTH sign-off. {report.green_pct}% record use of GREEN-status tools.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-trace-pale">
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Department</th>
                    <th className="text-right px-3 py-2 text-xs font-bold uppercase text-trace-moss">Receipts</th>
                    <th className="text-right px-3 py-2 text-xs font-bold uppercase text-trace-moss">%</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(report.by_department)
                    .sort((a, b) => b[1] - a[1])
                    .map(([dept, count]) => (
                      <tr key={dept} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-700">{dept}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{count}</td>
                        <td className="px-3 py-2 text-right text-gray-500">
                          {Math.round((count / report.receipts.length) * 100)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </ReportSection>

            {/* Section 2: Guild Compliance Register */}
            <ReportSection title="2. Guild Compliance Register">
              <p className="text-sm text-gray-600 mb-4">
                Every AI tool used on this production, its status, and department usage. RED and YELLOW status tools are flagged.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-trace-pale">
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Tool</th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Status</th>
                    <th className="text-right px-3 py-2 text-xs font-bold uppercase text-trace-moss">Uses</th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Departments</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_tool.map((t) => (
                    <tr
                      key={t.tool}
                      className={`border-t border-gray-100 ${t.status !== 'GREEN' ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="px-3 py-2 text-gray-800 font-medium">{t.tool}</td>
                      <td className="px-3 py-2">
                        <span className={`status-badge ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{t.count}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{t.departments.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>

            {/* Section 3: AI Tool Audit */}
            <ReportSection title="3. AI Tool Audit">
              <p className="text-sm text-gray-600 mb-4">
                {report.by_tool.length} unique AI tool{report.by_tool.length !== 1 ? 's' : ''} used across this production.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-trace-pale">
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Tool</th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Status</th>
                    <th className="text-right px-3 py-2 text-xs font-bold uppercase text-trace-moss">Total Uses</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_tool.map((t) => (
                    <tr key={t.tool} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-800">{t.tool}</td>
                      <td className="px-3 py-2">
                        <span className={`status-badge ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{t.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>

            {/* Section 4: LCT Coverage Report */}
            <ReportSection title="4. LCT Coverage Report">
              {report.lct_receipts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No receipts on this production flagged performer likeness or voice (LCT) use.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    {report.lct_receipts.length} receipt{report.lct_receipts.length !== 1 ? 's' : ''} involve performer likeness or voice.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-trace-pale">
                        <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Scene / Asset</th>
                        <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Crew Member</th>
                        <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Tool</th>
                        <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">LCT Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.lct_receipts.map((r) => (
                        <tr key={r.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-mono text-xs text-gray-600">{r.scene_usid}</td>
                          <td className="px-3 py-2 text-gray-700">{r.crew_member_name}</td>
                          <td className="px-3 py-2 text-gray-700">{r.ai_tool_used}</td>
                          <td className="px-3 py-2">
                            {r.lct_reference ? (
                              <span className="font-mono text-xs text-gray-600">{r.lct_reference}</span>
                            ) : (
                              <span className="text-xs text-red-600 font-medium">Not provided</span>
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
              <p className="text-sm text-gray-600 mb-4">
                Whitelist status of each AI tool at the time of submission.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-trace-pale">
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Tool</th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Status</th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Condition at Submission</th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {report.receipts.map((r) => (
                    <tr key={r.id} className={`border-t border-gray-100 ${r.tool_status !== 'GREEN' ? 'bg-yellow-50/30' : ''}`}>
                      <td className="px-3 py-2 text-gray-800 font-medium">{r.ai_tool_used}</td>
                      <td className="px-3 py-2">
                        <span className={`status-badge ${STATUS_COLORS[r.tool_status] || 'status-red'}`}>
                          {r.tool_status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 italic">
                        {r.whitelist_condition || '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmt(r.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>

            {/* Section 6: Platform Disclosure Summary */}
            <ReportSection title="6. Platform Disclosure Summary">
              <PlatformDisclosure report={report} />
            </ReportSection>

            {/* Section 7: Delivery Support Note */}
            <ReportSection title="7. Delivery Support Note">
              <CompletionBondNote report={report} />
            </ReportSection>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-trace-pale px-6 py-3 border-b border-trace-pale-dark">
        <h3 className="text-xs font-bold uppercase tracking-widest text-trace-forest">{title}</h3>
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
    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
      <p>
        During the production of <strong>{report.production_name}</strong>, a total of{' '}
        <strong>{report.receipts.length}</strong> AI-assisted creative decision{report.receipts.length !== 1 ? 's' : ''} were
        logged via the TRACE Artist Receipt system, spanning{' '}
        <strong>{depts.length}</strong> department{depts.length !== 1 ? 's' : ''}: {depts.join(', ')}.
      </p>
      <p>
        The following AI tools were used:{' '}
        <strong>{uniqueTools.join(', ')}</strong>.{' '}
        {greenTools.length > 0 ? (
          <>
            Of these, <strong>{greenTools.join(', ')}</strong>{' '}
            {greenTools.length === 1 ? 'was' : 'were'} classified as GREEN (vetted for production use)
            and all uses are fully documented with four-point Artist Receipts.
          </>
        ) : (
          'No tools were classified as GREEN status on this production.'
        )}
      </p>
      {nonGreenTools.length > 0 && (
        <p>
          <strong>{nonGreenTools.map((t) => `${t.tool} (${t.status})`).join(', ')}</strong>{' '}
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
    <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
      <p className="font-semibold text-gray-900">TO WHOM IT MAY CONCERN</p>
      <p>
        This note is issued in support of Delivery documentation for the production{' '}
        <strong>{report.production_name}</strong>.
      </p>
      <p>
        The TRACE Artist Receipt Logger has recorded a total of{' '}
        <strong>{report.receipts.length}</strong> Artist Receipt{report.receipts.length !== 1 ? 's' : ''} for this
        production, covering AI-assisted creative decisions made between{' '}
        <strong>{fmt(report.date_range.from)}</strong> and{' '}
        <strong>{fmt(report.date_range.to)}</strong>.
      </p>
      <p>
        All <strong>{report.auth_signed_count}</strong> receipts carry an Authorial Control (AUTH)
        sign-off from a named Head of Department or Lead Creative, confirming that a qualified human
        professional exercised creative control over each AI-assisted decision. Authorising
        signatories include: <strong>{signers.join(', ')}</strong>.
      </p>
      <p>
        These records demonstrate that all AI-assisted creative work on this production was
        conducted under documented human authorial oversight.
      </p>
      <p className="text-gray-500 text-xs pt-2 border-t border-gray-100">
        This report is issued by the TRACE Artist Receipt Logger on {fmt(report.generated_at)}.
      </p>
    </div>
  )
}
