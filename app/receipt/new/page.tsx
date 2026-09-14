import ReceiptForm from '@/components/ReceiptForm'

export const metadata = {
  title: 'TRACE — Artist Receipt',
}

export default function ReceiptPage({ searchParams }: { searchParams: { supersedes?: string } }) {
  const supersedeId = searchParams.supersedes

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-trace-forest mb-1">
          {supersedeId ? 'Supersede Receipt' : 'Artist Receipt'}
        </h1>
        <p className="text-sm text-gray-500">
          {supersedeId
            ? 'Create a superseding receipt. All fields are pre-populated from the original — update as needed and provide a reason for superseding.'
            : 'Complete a receipt for every AI-assisted creative decision. All fields are required unless marked optional.'}
        </p>
      </div>
      <ReceiptForm mode={supersedeId ? 'supersede' : undefined} supersedeId={supersedeId} />
    </div>
  )
}
