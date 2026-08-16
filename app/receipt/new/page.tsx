import ReceiptForm from '@/components/ReceiptForm'

export const metadata = {
  title: 'TRACE — Artist Receipt',
}

export default function ReceiptPage() {
  return (
    <div className="lt-page">
      <div className="lt-doc">
        <div className="mb-8">
          <p className="font-courier mb-1" style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#2D6A4F' }}>
            TRACE© Artist Receipt
          </p>
          <h1 className="font-garamond" style={{ fontSize: '1.9rem', color: '#1A3D2B', lineHeight: 1.2, fontWeight: 500 }}>Artist Receipt</h1>
          <p className="font-courier mt-2" style={{ fontSize: '0.75rem', color: '#5A8A72', fontStyle: 'italic' }}>
            Complete a receipt for every AI-assisted creative decision. All fields are required unless marked optional.
          </p>
        </div>
        <ReceiptForm />
      </div>
    </div>
  )
}
