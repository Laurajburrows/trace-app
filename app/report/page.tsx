import ComplianceReport from '@/components/ComplianceReport'

export const metadata = {
  title: 'TRACE — Compliance Report',
}

export default function ReportPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8 no-print">
        <h1 className="font-garamond text-3xl mb-1" style={{ color: '#F0EBE0' }}>Compliance Report</h1>
        <p className="text-sm" style={{ color: '#8BB5A0' }}>
          Select a production to generate a TRACE Compliance Report. View in-browser or download as a PDF.
        </p>
      </div>
      <ComplianceReport />
    </div>
  )
}
