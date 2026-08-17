import HODQueue from '@/components/HODQueue'

export const metadata = { title: 'HOD Sign-off — TRACE' }

export default function HODPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-garamond text-3xl" style={{ color: '#F0EBE0' }}>HOD Sign-off Queue</h1>
        <p className="text-sm mt-1" style={{ color: '#8BB5A0' }}>
          Review receipts submitted by crew and apply the AUTH signature to finalise each record.
        </p>
      </div>
      <HODQueue />
    </div>
  )
}
