'use client'

import SignoffQueue from './SignoffQueue'

export default function ProducerQueue() {
  return (
    <SignoffQueue
      tier="producer"
      receiptStatuses="PENDING_PRODUCER_AUTH"
      queueLabel="Producer Sign-off"
      signerPlaceholder="Your full name — Producer"
      signerSubLabel="Stage 3 — Producer Sign-off"
      storageKey="trace_producer_viewer"
    />
  )
}
