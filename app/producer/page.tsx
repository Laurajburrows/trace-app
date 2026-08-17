import ProducerOverview from '@/components/ProducerOverview'

export const metadata = { title: 'Producer Overview — TRACE' }

export default function ProducerPage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px', backgroundColor: '#F3F4F6', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: 0, marginBottom: '4px' }}>
          Production Overview
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          Production-wide summary of AI usage receipts, authorisation status, and compliance flags.
        </p>
      </div>
      <ProducerOverview />
    </div>
  )
}
