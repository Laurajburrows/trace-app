'use client'

import { useEffect } from 'react'

const styles = `
@page { size: A4 portrait; margin: 11mm 13mm 10mm 13mm; }

@media print {
  nav, .no-print { display: none !important; }
  body { background: white !important; margin: 0 !important; padding: 0 !important; }
  .lct-scroll { overflow: visible !important; padding: 0 !important; }
  .lct-sheet { box-shadow: none !important; width: auto !important; margin: 0 !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}

.lct-sheet {
  --bg: #F5F0E8;
  --green-dark: #1A3D2B;
  --green-mid: #2D6A4F;
  --text: #1C1C1C;
  --row-alt: rgba(45, 106, 79, 0.08);
  font-family: 'Calibri', system-ui, -apple-system, sans-serif;
  font-size: 9.5pt;
  color: var(--text);
  background: var(--bg);
  width: 210mm;
  margin: 0 auto;
  padding: 11mm 13mm 10mm 13mm;
}

@media screen { .lct-sheet { min-height: 297mm; box-shadow: 0 2px 24px rgba(0,0,0,0.18); } }

/* Top bar */
.lct-sheet .top-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4mm; }
.lct-sheet .logo-name { font-size: 16pt; font-weight: 700; color: var(--green-dark); letter-spacing: 0.14em; line-height: 1; }
.lct-sheet .logo-tagline { font-size: 6.5pt; color: var(--green-mid); letter-spacing: 0.06em; margin-top: 1.2mm; font-weight: 400; }
.lct-sheet .prod-ref { font-size: 7.5pt; color: var(--green-mid); text-align: right; line-height: 1.7; }
.lct-sheet .prod-ref strong { display: block; color: var(--green-dark); font-weight: 700; margin-bottom: 0.5mm; }

/* Doc title & instruction */
.lct-sheet .doc-title { font-size: 13pt; font-weight: 700; color: var(--green-dark); text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 2px solid var(--green-dark); padding-bottom: 2.5mm; margin-bottom: 1.5mm; line-height: 1.2; }
.lct-sheet .instruction { font-size: 7.5pt; color: var(--green-mid); font-style: italic; margin-bottom: 3.5mm; line-height: 1.5; }

/* Meta rows */
.lct-sheet .meta-row { display: flex; gap: 5mm; align-items: flex-end; margin-bottom: 2.5mm; }
.lct-sheet .fld { display: flex; flex-direction: column; gap: 1mm; flex: 1; }
.lct-sheet .fld.wide { flex: 2.4; }
.lct-sheet .fld.medium { flex: 1.5; }
.lct-sheet .fld label { font-size: 9px; font-weight: 700; color: var(--green-mid); text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
.lct-sheet .fline { border-bottom: 1px solid var(--green-mid); height: 5.5mm; }
.lct-sheet .fline-date { display: flex; align-items: center; border-bottom: 1px solid var(--green-mid); height: 5.5mm; font-size: 9px; font-weight: 600; color: var(--text); letter-spacing: 0.04em; padding-left: 2px; }
.lct-sheet .fline.editable { cursor: text; display: flex; align-items: center; font-size: 9px; color: var(--text); padding: 0 2px; outline: none; }
@media screen {
  .lct-sheet .fline.editable:focus { background: rgba(45,106,79,0.06); }
  .lct-sheet .fline.editable:empty::before { content: 'click to type…'; color: #c8c8c8; font-size: 8px; font-style: italic; font-weight: 400; }
}
@media print { .lct-sheet .fline.editable:empty::before { content: none; } }
.lct-sheet .header-block { margin-bottom: 4mm; }

/* Section label */
.lct-sheet .section-label { font-size: 8pt; font-weight: 700; color: var(--green-mid); text-transform: uppercase; letter-spacing: 0.09em; border-bottom: 1px solid var(--green-mid); padding-bottom: 1.5mm; margin-bottom: 2mm; }

/* Flag key */
.lct-sheet .flag-key { font-size: 7pt; color: var(--green-mid); margin-bottom: 2.5mm; letter-spacing: 0.02em; }
.lct-sheet .flag-key strong { color: var(--green-dark); }

/* Performer table */
.lct-sheet .performer-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.5pt; margin-bottom: 4mm; }
.lct-sheet .performer-table col.c-name   { width: 20%; }
.lct-sheet .performer-table col.c-lct    { width: 13%; }
.lct-sheet .performer-table col.c-replica { width: 11%; }
.lct-sheet .performer-table col.c-voice  { width: 11%; }
.lct-sheet .performer-table col.c-deep   { width: 11%; }
.lct-sheet .performer-table col.c-expiry { width: 10%; }
.lct-sheet .performer-table col.c-init   { width: 8%; }
.lct-sheet .performer-table col.c-scene  { width: 16%; }
.lct-sheet .performer-table thead th { background-color: var(--green-dark); color: #fff; font-size: 8.5px; font-weight: 700; letter-spacing: 0.02em; padding: 2.5mm 2mm; border: none; border-right: 1px solid rgba(255,255,255,0.15); vertical-align: middle; text-align: center; line-height: 1.35; }
.lct-sheet .performer-table thead th:last-child { border-right: none; }
.lct-sheet .performer-table thead th.tl { text-align: left; padding-left: 2.5mm; }
.lct-sheet .performer-table tbody tr.p-row td { border: none; border-bottom: 1px solid rgba(45,106,79,0.3); border-right: 1px solid rgba(45,106,79,0.15); padding: 1mm 2mm; height: 8mm; vertical-align: middle; text-align: center; color: var(--text); }
.lct-sheet .performer-table tbody tr.p-row td:last-child { border-right: none; }
.lct-sheet .performer-table tbody tr.p-row td.tl { text-align: left; padding-left: 2.5mm; }
.lct-sheet .performer-table tbody tr.p-row td:nth-child(2) { font-family: 'Courier New', Courier, monospace; font-size: 7pt; letter-spacing: 0.03em; }
.lct-sheet .performer-table tbody tr.p-row td.flag { font-size: 8px; font-weight: 600; color: var(--green-mid); letter-spacing: 0.06em; }
.lct-sheet .performer-table tbody tr.p-row.even td,
.lct-sheet .performer-table tbody tr.n-row.even td { background-color: var(--row-alt); }
.lct-sheet .performer-table tbody tr.n-row td { border: none; border-bottom: 1.5px solid rgba(45,106,79,0.4); padding: 1.5mm 2.5mm; height: 10mm; vertical-align: top; text-align: left; font-size: 7pt; font-style: italic; color: #888; }

/* Footer */
.lct-sheet .footer-row { display: flex; gap: 5mm; margin-bottom: 3mm; }
.lct-sheet .footer-box { flex: 1; border: 1.5px solid var(--green-dark); padding: 2.5mm 3mm; }
.lct-sheet .footer-box h3 { font-size: 7.5pt; font-weight: 700; color: var(--green-mid); text-transform: uppercase; letter-spacing: 0.09em; border-bottom: 1px solid var(--green-mid); padding-bottom: 1.5mm; margin-bottom: 2.5mm; }
.lct-sheet .exc-lines { list-style: none; }
.lct-sheet .exc-lines li { border-bottom: 1px solid var(--green-mid); height: 6.5mm; margin-bottom: 1.5mm; }
.lct-sheet .exc-lines li:last-child { margin-bottom: 0; }
.lct-sheet .signoff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 5mm; }
.lct-sheet .sg { display: flex; flex-direction: column; gap: 0.8mm; }
.lct-sheet .sg.span2 { grid-column: 1 / -1; }
.lct-sheet .sg label { font-size: 9px; font-weight: 700; color: var(--green-mid); text-transform: uppercase; letter-spacing: 0.08em; }
.lct-sheet .sg .fline { height: 5.5mm; }

/* Watermark */
.lct-sheet .watermark { display: none; pointer-events: none; user-select: none; }
@media print {
  .lct-sheet .watermark { display: block; position: fixed; top: 148mm; left: 105mm; transform: translate(-50%,-50%) rotate(-35deg); font-size: 54pt; font-weight: 700; color: #888; opacity: 0.08; white-space: nowrap; letter-spacing: 0.15em; z-index: 0; }
}

/* Fine print & footer */
.lct-sheet .fine-print { font-size: 6.5pt; color: var(--green-mid); text-align: center; border-top: 1px solid var(--green-mid); padding-top: 2mm; font-style: italic; line-height: 1.5; letter-spacing: 0.02em; }
.lct-sheet .page-footer { font-size: 8px; color: #999; text-align: right; margin-top: 2mm; }
`

const performers = ['odd', 'even', 'odd', 'even', 'odd', 'even'] as const

export default function LCTSheet() {
  useEffect(() => {
    const el = document.getElementById('doc-date')
    if (el) {
      const d = new Date()
      el.textContent = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="no-print max-w-5xl mx-auto px-4 pt-4 pb-3 flex justify-end">
        <button onClick={() => window.print()} className="btn-secondary text-xs py-1.5 px-4">
          Print / Save as PDF
        </button>
      </div>

      <div className="lct-scroll" style={{ overflowX: 'auto', padding: '0 16px 40px' }}>
        <div className="lct-sheet">

          <div className="watermark" aria-hidden="true">TRACE© COMPLIANCE DOCUMENT</div>

          <div className="top-bar">
            <div>
              <div className="logo-name">TRACE©</div>
              <div className="logo-tagline">Transparent Record of Authorship in Creative Environments</div>
            </div>
            <div className="prod-ref">
              <strong>FORM: TRACE©-LCT-CS-01</strong>
              Production Reference:&nbsp;_________________________
            </div>
          </div>

          <div className="header-block">
            <div className="doc-title">TRACE© Likeness Consent Token — Daily Check Sheet</div>
            <p className="instruction">
              Completed each morning by the OAS or compliance lead before camera rolls, using the LCT register in the GAL.
              One row per performer called to set today. All flags must be confirmed before any AI-assisted work involving
              that performer&apos;s likeness or voice can begin. File with daily production records and reference against all
              Artist Receipts involving the above performers.
            </p>

            <div className="meta-row">
              <div className="fld wide">
                <label>Production Title</label>
                <div className="fline editable" contentEditable={true} spellCheck={false} />
              </div>
              <div className="fld medium">
                <label>Call Sheet No.</label>
                <div className="fline editable" contentEditable={true} spellCheck={false} />
              </div>
              <div className="fld medium">
                <label>Shoot Date</label>
                <div className="fline" />
              </div>
              <div className="fld medium">
                <label>Document Reference</label>
                <div className="fline-date"><span id="doc-date" /></div>
              </div>
            </div>

            <div className="meta-row">
              <div className="fld wide">
                <label>Scene Numbers Covered Today</label>
                <div className="fline editable" contentEditable={true} spellCheck={false} />
              </div>
              <div className="fld medium">
                <label>Checked By — Name</label>
                <div className="fline" />
              </div>
              <div className="fld medium">
                <label>Signature</label>
                <div className="fline" />
              </div>
            </div>
          </div>

          <div className="section-label">Performer Likeness Consent Verification</div>

          <p className="flag-key">
            <strong>Flag key:</strong>&nbsp;&nbsp;
            <strong>Y</strong> = Yes, authorised &nbsp;·&nbsp;
            <strong>N</strong> = Not authorised &nbsp;·&nbsp;
            <strong>L</strong> = Limited (see Notes) &nbsp;·&nbsp;
            Leave blank if not applicable to today&apos;s work
          </p>

          <table className="performer-table">
            <colgroup>
              <col className="c-name" />
              <col className="c-lct" />
              <col className="c-replica" />
              <col className="c-voice" />
              <col className="c-deep" />
              <col className="c-expiry" />
              <col className="c-init" />
              <col className="c-scene" />
            </colgroup>
            <thead>
              <tr>
                <th className="tl">Performer Name</th>
                <th>LCT Reference</th>
                <th>Replica<br />Authorised</th>
                <th>Voice Synth<br />Authorised</th>
                <th>Deepfake<br />Recon</th>
                <th>Expiry<br />Today?</th>
                <th>Initials</th>
                <th className="tl">Scenes / AI Work Today</th>
              </tr>
            </thead>
            <tbody>
              {performers.map((parity, i) => (
                <>
                  <tr key={`p-${i}`} className={`p-row ${parity}`}>
                    <td className="tl" />
                    <td />
                    <td className="flag" />
                    <td className="flag" />
                    <td className="flag" />
                    <td className="flag" />
                    <td />
                    <td className="tl" />
                  </tr>
                  <tr key={`n-${i}`} className={`n-row ${parity}`}>
                    <td colSpan={8} style={{ paddingLeft: '2.5mm', fontStyle: 'italic', color: '#aaa', fontSize: '7pt' }}>Notes:</td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>

          <div className="footer-row">
            <div className="footer-box">
              <h3>LCT Exceptions Raised Today</h3>
              <ul className="exc-lines">
                <li /><li /><li /><li />
              </ul>
            </div>
            <div className="footer-box">
              <h3>OAS / Compliance Officer Sign-off</h3>
              <div className="signoff-grid">
                <div className="sg"><label>Name</label><div className="fline" /></div>
                <div className="sg"><label>Role</label><div className="fline" /></div>
                <div className="sg span2"><label>Signature</label><div className="fline" /></div>
                <div className="sg"><label>Time</label><div className="fline" /></div>
              </div>
            </div>
          </div>

          <p className="fine-print">
            This sheet forms part of the TRACE© Compliance Log. Retain with daily production records.
            Reference against Artist Receipts for all AI-assisted work involving the above performers.
            LCT references are held in the Global Asset Library (GAL). Contact production legal if any flag is unclear before work begins.
          </p>

          <div className="page-footer">TRACE© Protocol — LCT-CS-v2 — © Laura Burrows 2026</div>

        </div>
      </div>
    </>
  )
}
