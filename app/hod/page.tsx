import HODQueue from '@/components/HODQueue'

export const metadata = { title: 'HOD Sign-off — TRACE' }

export default function HODPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-trace-forest">HOD Sign-off Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review receipts submitted by crew and apply the AUTH signature to finalise each record.
        </p>
      </div>
      <HODQueue />
    </div>
  )
}
