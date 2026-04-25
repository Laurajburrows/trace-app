import ReceiptForm from '@/components/ReceiptForm'

export const metadata = {
  title: 'TRACE — Artist Receipt',
}

export default function ReceiptPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-trace-forest mb-1">Artist Receipt</h1>
        <p className="text-sm text-gray-500">
          Complete a receipt for every AI-assisted creative decision. All fields are required
          unless marked optional.
        </p>
      </div>
      <ReceiptForm />
    </div>
  )
}
