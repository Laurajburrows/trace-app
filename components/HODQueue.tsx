'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Receipt } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  GREEN: 'status-green',
  AMBER: 'status-amber',
  YELLOW: 'status-amber',
  RED: 'status-red',
  UNVERIFIED: 'status-red',
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface SignoffState {
  name: string
  submitting: boolean
  done: boolean
  hash: string | null
  error: string | null
}

export default function HODQueue() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [signoff, setSignoff] = useState<Record<string, SignoffState>>({})

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/receipts?receiptStatus=PENDING_AUTH')
    const data = await res.json()
    setReceipts(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  function getSignoff(id: string): SignoffState {
    return signoff[id] ?? { name: '', submitting: false, done: false, hash: null, error: null }
  }

  function updateSignoff(id: string, patch: Partial<SignoffState>) {
    setSignoff((prev) => ({ ...prev, [id]: { ...getSignoff(id), ...patch } }))
  }

  async function handleSignoff(receipt: Receipt) {
    const state = getSignoff(receipt.id)
    if (!state.name.trim()) {
      updateSignoff(receipt.id, { error: 'Please enter your full name.' })
      return
    }

    updateSignoff(receipt.id, { submitting: true, error: null })

    try {
      const res = await fetch(`/api/receipts/${receipt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_signer: state.name.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Sign-off failed')
      }

      const updated = await res.json()
      updateSignoff(receipt.id, {
        submitting: false,
        done: true,
        hash: updated.twin_lock_hash ?? null,
      })

      // Remove from pending list after short delay
      setTimeout(() => {
        setReceipts((prev) => prev.filter((r) => r.id !== receipt.id))
      }, 4000)
    } catch (e) {
      updateSignoff(receipt.id, {
        submitting: false,
        error: e instanceof Error ? e.message : 'Something went wrong.',
      })
    }
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading queue…</div>
  }

  if (receipts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg py-16 text-center">
        <p className="text-sm font-medium text-trace-forest mb-1">Queue is clear</p>
        <p className="text-xs text-gray-400">No receipts are currently awaiting AUTH sign-off.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''} awaiting sign-off</p>

      {receipts.map((r) => {
        const state = getSignoff(r.id)
        const isExpanded = expanded === r.id

        return (
          <div key={r.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Header row */}
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : r.id)}
              className="w-full flex items-start justify-between px-6 py-4 text-left hover:bg-trace-pale/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{r.crew_member_name}</span>
                  <span className="text-xs text-gray-400">{r.crew_role}</span>
                  <span className={`status-badge ${STATUS_COLORS[r.tool_status]}`}>{r.tool_status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {r.production_name} · {r.scene_usid} · {r.ai_tool_used}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Submitted {fmtDateTime(r.crew_confirmed_at ?? r.created_at)}
                </p>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 ml-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded detail + sign-off */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-6 py-5 space-y-5">
                {/* Receipt detail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div className="space-y-4">
                    <div>
                      <p className="label">POR — Point of Record</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{r.por_description}</p>
                    </div>
                    <div>
                      <p className="label">SEL — Selection</p>
                      {r.sel_output && <p className="text-gray-700 mb-0.5">{r.sel_output}</p>}
                      <p className="text-xs text-gray-500">{r.sel_description || '—'}</p>
                      {r.sel_detail && <p className="text-xs text-gray-500 italic mt-0.5">{r.sel_detail}</p>}
                    </div>
                    <div>
                      <p className="label">ADJ — Where did you end up?</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{r.adj_description}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="label">Production</p>
                      <p className="text-gray-700">{r.production_name}</p>
                    </div>
                    <div>
                      <p className="label">Department / Role</p>
                      <p className="text-gray-700">{r.department} · {r.crew_role}</p>
                    </div>
                    <div>
                      <p className="label">Scene / Asset</p>
                      <p className="font-mono text-xs text-gray-600">{r.scene_usid}</p>
                    </div>
                    <div>
                      <p className="label">Script Date & Version</p>
                      <p className="text-gray-700">{r.script_date || '—'}</p>
                    </div>
                    {r.lct_required && (
                      <div>
                        <p className="label">LCT Required</p>
                        <p className="text-gray-700">Yes{r.lct_reference ? ` — Ref: ${r.lct_reference}` : ''}</p>
                      </div>
                    )}
                    {r.notes && (
                      <div>
                        <p className="label">Notes</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{r.notes}</p>
                      </div>
                    )}
                    <div>
                      <p className="label">Receipt ID</p>
                      <p className="font-mono text-xs text-gray-500 break-all">{r.id}</p>
                    </div>
                  </div>
                </div>

                {/* Sign-off form */}
                {state.done ? (
                  <div className="rounded border border-green-200 bg-green-50 px-4 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full bg-status-green flex-shrink-0" />
                      <span className="text-sm font-bold text-status-green">AUTH signature applied</span>
                    </div>
                    {state.hash && (
                      <>
                        <p className="text-xs text-gray-500 mb-1">TRACE Twin Lock — SHA-256</p>
                        <p className="font-mono text-xs text-gray-600 bg-white border border-green-200 rounded px-2 py-1.5 break-all">
                          {state.hash}
                        </p>
                      </>
                    )}
                    <p className="text-xs text-gray-400 mt-2">This receipt will be removed from the queue shortly.</p>
                  </div>
                ) : (
                  <div className="rounded border border-trace-pale-dark bg-trace-pale px-4 py-4">
                    <p className="text-sm font-semibold text-trace-forest mb-1">Stage 2 — HOD AUTH Sign-off</p>
                    <p className="text-xs text-gray-600 mb-3">
                      By signing off, you confirm that a human exercised authorial control over this AI-assisted creative decision.
                      This applies the authoritative AUTH signature and generates the TRACE Twin Lock hash.
                    </p>
                    <div className="flex gap-2 items-start">
                      <input
                        className="input flex-1"
                        placeholder="Your full name — HOD or Lead Creative"
                        value={state.name}
                        onChange={(e) => updateSignoff(r.id, { name: e.target.value, error: null })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSignoff(r)}
                        disabled={state.submitting}
                      />
                      <button
                        type="button"
                        onClick={() => handleSignoff(r)}
                        disabled={state.submitting || !state.name.trim()}
                        className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {state.submitting ? 'Signing…' : 'Apply AUTH Signature'}
                      </button>
                    </div>
                    {state.error && (
                      <p className="text-xs text-red-600 mt-2">{state.error}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
