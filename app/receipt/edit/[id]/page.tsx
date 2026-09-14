import ReceiptForm from '@/components/ReceiptForm'

export const metadata = {
  title: 'TRACE — Edit Receipt',
}

export default function EditReceiptPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-trace-forest mb-1">Edit Receipt</h1>
        <p className="text-sm text-gray-500">
          Update your recalled receipt and resubmit to the HOD queue.
        </p>
      </div>
      <ReceiptForm mode="edit" preloadId={params.id} />
    </div>
  )
}
