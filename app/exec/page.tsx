import ExecQueue from '@/components/ExecQueue'

export const metadata = { title: 'Exec Sign-off — TRACE' }

export default function ExecPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-garamond text-3xl" style={{ color: '#F0EBE0' }}>Exec / OAS Sign-off Queue</h1>
        <p className="text-sm mt-1" style={{ color: '#8BB5A0' }}>
          Review receipts submitted by Producers and apply the final AUTH signature. This is the top tier of the TRACE approval chain.
        </p>
      </div>
      <ExecQueue />
    </div>
  )
}
