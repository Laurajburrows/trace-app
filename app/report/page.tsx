import ComplianceReport from '@/components/ComplianceReport'

export const metadata = {
  title: 'TRACE — Compliance Report',
}

export default function ReportPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8 no-print">
        <h1 className="text-2xl font-bold text-trace-forest mb-1">Compliance Report</h1>
        <p className="text-sm text-gray-500">
          Select a production to generate a TRACE Compliance Report. The report can be viewed
          in-browser or downloaded as a PDF.
        </p>
      </div>
      <ComplianceReport />
    </div>
  )
}
