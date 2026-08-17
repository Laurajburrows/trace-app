import ReceiptLog from '@/components/ReceiptLog'

export const metadata = {
  title: 'TRACE — Receipt Log',
}

export default function LogPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="font-garamond text-3xl mb-1" style={{ color: '#F0EBE0' }}>Receipt Log</h1>
        <p className="text-sm" style={{ color: '#8BB5A0' }}>
          All submitted Artist Receipts. Filter by production, department, date range, tool status, or authorising signatory.
        </p>
      </div>
      <ReceiptLog />
    </div>
  )
}
