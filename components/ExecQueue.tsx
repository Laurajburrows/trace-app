'use client'

import SignoffQueue from './SignoffQueue'

export default function ExecQueue() {
  return (
    <SignoffQueue
      tier="exec"
      receiptStatuses="PENDING_EXEC_AUTH"
      queueLabel="Exec / OAS Sign-off"
      signerPlaceholder="Your full name — Executive Producer or OAS"
      signerSubLabel="Stage 4 — Exec / OAS Sign-off"
      storageKey="trace_exec_viewer"
    />
  )
}
