import ReceiptLog from '@/components/ReceiptLog'

export const metadata = {
  title: 'TRACE — Receipt Log',
}

export default function LogPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-trace-forest mb-1">Receipt Log</h1>
        <p className="text-sm text-gray-500">
          All submitted Artist Receipts. Filter by production, department, date range, tool status,
          or authorising signatory.
        </p>
      </div>
      <ReceiptLog />
    </div>
  )
}
