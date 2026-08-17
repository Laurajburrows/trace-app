'use client'

import SignoffQueue from './SignoffQueue'

export default function HODQueue() {
  return (
    <SignoffQueue
      tier="hod"
      receiptStatuses="PENDING_HOD_AUTH,PENDING_AUTH"
      queueLabel="HOD Sign-off"
      signerPlaceholder="Your full name — HOD or Lead Creative"
      signerSubLabel="Stage 2 — HOD Sign-off"
      storageKey="trace_hod_viewer"
    />
  )
}
