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

interface Props {
  tier: 'hod' | 'producer' | 'exec'
  receiptStatuses: string
  queueLabel: string
  signerPlaceholder: string
  signerSubLabel: string
  storageKey: string
}

export default function SignoffQueue({
  tier,
  receiptStatuses,
  queueLabel,
  signerPlaceholder,
  signerSubLabel,
  storageKey,
}: Props) {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [signoff, setSignoff] = useState<Record<string, SignoffState>>({})
  const [viewerName, setViewerName] = useState('')
  const [viewerSet, setViewerSet] = useState(false)
  const [viewerInput, setViewerInput] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
      setViewerName(stored)
      setViewerSet(true)
    }
  }, [storageKey])

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ receiptStatus: receiptStatuses })
    if (viewerName.trim()) params.set('viewerName', viewerName.trim())
    const res = await fetch(`/api/receipts?${params}`)
    const data = await res.json()
    setReceipts(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [receiptStatuses, viewerName])

  useEffect(() => {
    if (viewerSet) fetchPending()
  }, [fetchPending, viewerSet])

  function handleSetViewer(e: React.FormEvent) {
    e.preventDefault()
    if (!viewerInput.trim()) return
    const name = viewerInput.trim()
    sessionStorage.setItem(storageKey, name)
    setViewerName(name)
    setViewerSet(true)
  }

  function handleClearViewer() {
    sessionStorage.removeItem(storageKey)
    setViewerName('')
    setViewerSet(false)
    setViewerInput('')
    setReceipts([])
  }

  function getSignoff(id: string): SignoffState {
    return signoff[id] ?? { name: viewerName, submitting: false, done: false, hash: null, error: null }
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
      updateSignoff(receipt.id, { submitting: false, done: true, hash: updated.twin_lock_hash ?? null })

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

  // Identity gate
  if (!viewerSet) {
    return (
      <div className="max-w-sm mx-auto mt-8">
        <div className="rounded-lg p-6" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F', borderLeft: '3px solid #C8A84B' }}>
          <p className="font-courier text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8BB5A0' }}>
            {queueLabel}
          </p>
          <h2 className="font-garamond text-xl mb-3" style={{ color: '#F0EBE0' }}>Identify yourself</h2>
          <p className="font-courier text-xs mb-4" style={{ color: '#8BB5A0' }}>
            Enter your name to load your queue. Receipts you submitted will not appear — this is a compliance control.
          </p>
          <form onSubmit={handleSetViewer} className="space-y-3">
            <input
              className="input"
              placeholder="Your full name"
              value={viewerInput}
              onChange={(e) => setViewerInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary w-full" disabled={!viewerInput.trim()}>
              Load Queue
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Viewer identity bar */}
      <div className="rounded px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: '#122E1F', border: '1px solid #2D6A4F' }}>
        <div>
          <span className="font-courier text-[10px] uppercase tracking-widest mr-2" style={{ color: '#5A8A72' }}>Viewing as</span>
          <span className="font-courier text-xs font-semibold" style={{ color: '#C8A84B' }}>{viewerName}</span>
          <span className="font-courier text-[10px] ml-2" style={{ color: '#5A8A72' }}>— your own receipts are hidden</span>
        </div>
        <button onClick={handleClearViewer} className="font-courier text-xs hover:underline" style={{ color: '#8BB5A0' }}>
          Change
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center font-courier text-sm" style={{ color: '#5A8A72' }}>Loading queue…</div>
      ) : receipts.length === 0 ? (
        <div className="rounded-lg py-16 text-center" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
          <p className="font-garamond text-lg mb-1" style={{ color: '#F0EBE0' }}>Queue is clear</p>
          <p className="font-courier text-xs" style={{ color: '#5A8A72' }}>No receipts are currently awaiting {queueLabel.toLowerCase()} sign-off.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-courier text-xs" style={{ color: '#5A8A72' }}>
            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} awaiting sign-off
          </p>

          {receipts.map((r) => {
            const state = getSignoff(r.id)
            const isExpanded = expanded === r.id

            return (
              <div key={r.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : r.id)}
                  className="w-full flex items-start justify-between px-6 py-4 text-left transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(45,106,79,0.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-garamond text-lg" style={{ color: '#F0EBE0' }}>{r.crew_member_name}</span>
                      <span className="font-courier text-[10px]" style={{ color: '#5A8A72' }}>{r.crew_role}</span>
                      <span className={`status-badge ${STATUS_COLORS[r.tool_status] ?? 'status-red'}`}>{r.tool_status}</span>
                      {r.submitter_role && r.submitter_role !== 'crew' && (
                        <span className="font-courier text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(200,168,75,0.12)', color: '#C8A84B', border: '1px solid rgba(200,168,75,0.3)' }}>
                          {r.submitter_role.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="font-courier text-xs mt-0.5" style={{ color: '#8BB5A0' }}>
                      {r.production_name} · {r.scene_usid} · {r.ai_tool_used}
                    </p>
                    <p className="font-courier text-xs mt-0.5" style={{ color: '#5A8A72' }}>
                      Submitted {fmtDateTime(r.crew_confirmed_at ?? r.created_at)}
                    </p>
                  </div>
                  <svg
                    className={`w-4 h-4 flex-shrink-0 mt-1 ml-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    style={{ color: '#5A8A72' }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-6 py-5 space-y-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                      <div className="space-y-4">
                        <div>
                          <p className="label">POR — Point of Record</p>
                          <p className="whitespace-pre-wrap mt-1" style={{ color: '#D4EDE1' }}>{r.por_description}</p>
                        </div>
                        <div>
                          <p className="label">SEL — Selection</p>
                          <div className="space-y-1.5 mt-1">
                            <div>
                              <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>What was selected</p>
                              <p style={{ color: '#D4EDE1' }}>{r.sel_output || '—'}</p>
                            </div>
                            <div>
                              <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Why selected</p>
                              <p style={{ color: '#8BB5A0' }}>
                                {r.sel_description || '—'}
                                {r.sel_detail && <span className="block text-xs italic mt-0.5" style={{ color: '#5A8A72' }}>{r.sel_detail}</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="label">ARR — Where did you end up?</p>
                          <p className="whitespace-pre-wrap mt-1" style={{ color: '#D4EDE1' }}>{r.arr_description}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="label">Production</p>
                          <p className="mt-1" style={{ color: '#D4EDE1' }}>{r.production_name}</p>
                        </div>
                        <div>
                          <p className="label">Department / Role</p>
                          <p className="mt-1" style={{ color: '#D4EDE1' }}>{r.department} · {r.crew_role}</p>
                        </div>
                        <div>
                          <p className="label">Scene / Asset</p>
                          <p className="font-courier text-xs mt-1" style={{ color: '#8BB5A0' }}>{r.scene_usid}</p>
                        </div>
                        <div>
                          <p className="label">Script Date &amp; Version</p>
                          <p className="mt-1" style={{ color: '#D4EDE1' }}>{r.script_date || '—'}</p>
                        </div>
                        {r.lct_required && (
                          <div>
                            <p className="label">LCT Required</p>
                            <p className="mt-1" style={{ color: '#D4EDE1' }}>Yes{r.lct_reference ? ` — Ref: ${r.lct_reference}` : ''}</p>
                          </div>
                        )}
                        {r.notes && (
                          <div>
                            <p className="label">Notes</p>
                            <p className="whitespace-pre-wrap mt-1" style={{ color: '#D4EDE1' }}>{r.notes}</p>
                          </div>
                        )}
                        <div>
                          <p className="label">Submitted by</p>
                          <p className="mt-1" style={{ color: '#D4EDE1' }}>
                            {r.crew_member_name}
                            {r.submitter_role && (
                              <span className="font-courier text-[10px] ml-2 uppercase" style={{ color: '#8BB5A0' }}>({r.submitter_role})</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="label">Receipt ID</p>
                          <p className="font-courier text-xs break-all mt-1" style={{ color: '#5A8A72' }}>{r.id}</p>
                        </div>
                      </div>
                    </div>

                    {state.done ? (
                      <div className="rounded px-4 py-4" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#4ade80' }} />
                          <span className="font-courier text-xs font-bold uppercase tracking-widest" style={{ color: '#4ade80' }}>AUTH signature applied</span>
                        </div>
                        {state.hash && (
                          <>
                            <p className="font-courier text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8BB5A0' }}>TRACE Twin Lock — SHA-256</p>
                            <div className="rounded px-3 py-2" style={{ background: '#0A1C10', border: '1px solid #2D6A4F' }}>
                              <p className="font-courier text-xs break-all" style={{ color: '#F0EBE0', lineHeight: 1.7 }}>{state.hash}</p>
                            </div>
                          </>
                        )}
                        <p className="font-courier text-xs mt-2" style={{ color: '#5A8A72' }}>This receipt will be removed from the queue shortly.</p>
                      </div>
                    ) : (
                      <div className="rounded px-4 py-4" style={{ backgroundColor: '#122E1F', border: '1px solid #2D6A4F', borderLeft: '3px solid #C8A84B' }}>
                        <div className="mb-1">
                          <span className="block font-garamond leading-none" style={{ fontSize: '1.5rem', color: '#F0EBE0' }}>AUTH</span>
                          <span className="block font-courier text-[9px] uppercase tracking-widest mt-0.5" style={{ color: '#8BB5A0' }}>{signerSubLabel}</span>
                        </div>
                        <p className="text-xs mb-3 mt-2" style={{ color: '#8BB5A0' }}>
                          By signing off, you confirm that a human exercised authorial control over this AI-assisted creative decision.
                          This applies the AUTH signature and generates the TRACE Twin Lock hash.
                        </p>
                        <div className="flex gap-2 items-start">
                          <input
                            className="input flex-1"
                            placeholder={signerPlaceholder}
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
                          <p className="font-courier text-xs mt-2" style={{ color: '#f87171' }}>{state.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
