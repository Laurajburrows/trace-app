import ProducerOverview from '@/components/ProducerOverview'

export const metadata = { title: 'Producer Overview — TRACE' }

export default function ProducerPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-garamond text-3xl" style={{ color: '#F0EBE0' }}>
          Production Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8BB5A0' }}>
          Production-wide summary of AI usage receipts, authorisation status, and compliance flags.
        </p>
      </div>
      <ProducerOverview />
    </div>
  )
}
