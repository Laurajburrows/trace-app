'use client'

import { useState, useEffect, useRef } from 'react'
import { DEPARTMENTS, SEL_REASONS } from '@/lib/types'
import type { Department, WhitelistEntry, SelReason } from '@/lib/types'


const today = new Date().toISOString().split('T')[0]

const emptyForm = {
  production_name: '',
  date: today,
  department: '' as Department | '',
  crew_member_name: '',
  crew_role: '',
  scene_usid: '',
  ai_tool_used: '',
  tool_status: '' as string,
  whitelist_condition: '' as string,
  por_description: '',
  sel_output: '',
  sel_description: '' as SelReason | '',
  sel_detail: '',
  adj_description: '',
  lct_required: false,
  lct_reference: '',
  notes: '',
  script_date: '',
}

type FormState = typeof emptyForm

interface Confirmation {
  id: string
  hash: string
  production_name: string
}


function StatusBadge({ status, condition, requiresLCT }: {
  status: 'GREEN' | 'AMBER' | 'RED' | 'UNVERIFIED' | ''
  condition?: string | null
  requiresLCT?: boolean
}) {
  if (!status) return null

  if (status === 'GREEN') {
    return (
      <div className="rounded border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-status-green flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide text-status-green">GREEN — Approved for production use</span>
        </div>
        {condition && <p className="text-xs text-green-700 italic mt-1 ml-5">{condition}</p>}
      </div>
    )
  }

  if (status === 'AMBER') {
    return (
      <div className="rounded border border-yellow-300 bg-yellow-50 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-status-amber flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide text-status-amber">AMBER — Conditional approval</span>
        </div>
        {condition && <p className="text-xs text-yellow-800 italic ml-5">{condition}</p>}
        {requiresLCT && (
          <div className="ml-5 flex items-center gap-1.5">
            <span className="text-status-amber text-xs">⚠</span>
            <span className="text-xs font-semibold text-status-amber">LCT required before use</span>
          </div>
        )}
      </div>
    )
  }

  if (status === 'RED') {
    return (
      <div className="rounded border border-red-300 bg-red-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-status-red flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide text-status-red">RED — Not approved for production use</span>
        </div>
        <p className="text-xs text-red-700 mt-1 ml-5">This tool is on the blocked list. Contact the OAS before proceeding.</p>
      </div>
    )
  }

  if (status === 'UNVERIFIED') {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-status-red flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide text-status-red">UNVERIFIED — Not on production whitelist</span>
        </div>
        <p className="text-xs text-red-700 mt-1 ml-5">Tool not found on production whitelist — refer to OAS before proceeding.</p>
      </div>
    )
  }

  return null
}

export default function ReceiptForm() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [productions, setProductions] = useState<string[]>([])
  const [newProduction, setNewProduction] = useState(false)

  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([])
  const [toolQuery, setToolQuery] = useState('')
  const [suggestions, setSuggestions] = useState<WhitelistEntry[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<WhitelistEntry | null>(null)
  const toolRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/productions').then((r) => r.json()).then(setProductions).catch(() => {})
    fetch('/api/whitelist').then((r) => r.json()).then(setWhitelist).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolRef.current && !toolRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function set(field: keyof FormState, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleToolInput(value: string) {
    setToolQuery(value)
    setSelectedEntry(null)
    set('ai_tool_used', value)
    set('tool_status', '')
    set('whitelist_condition', '')

    if (value.trim().length >= 1) {
      const q = value.toLowerCase()
      const matches = whitelist.filter(
        (e) => e.displayName.toLowerCase().includes(q) || e.toolName.includes(q)
      )
      setSuggestions(matches)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  function selectEntry(entry: WhitelistEntry) {
    setSelectedEntry(entry)
    setToolQuery(entry.displayName)
    set('ai_tool_used', entry.displayName)
    set('tool_status', entry.status)
    set('whitelist_condition', entry.condition || '')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const derivedStatus: 'GREEN' | 'AMBER' | 'RED' | 'UNVERIFIED' | '' = selectedEntry
    ? (selectedEntry.status as 'GREEN' | 'AMBER' | 'RED')
    : toolQuery.trim().length >= 3
    ? 'UNVERIFIED'
    : ''

  const authBlocked =
    derivedStatus === 'RED' ||
    derivedStatus === 'UNVERIFIED' ||
    derivedStatus === ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.department) return setError('Please select a department.')
    if (!form.ai_tool_used) return setError('Please enter the AI tool name.')
    if (authBlocked) return setError('Cannot submit: tool is not approved. Resolve tool status before proceeding.')

    setSubmitting(true)

    try {
      const payload = {
        ...form,
        tool_status: selectedEntry?.status || 'RED',
        whitelist_condition: selectedEntry?.condition || null,
      }
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Submission failed')

      const receipt = await res.json()
      setConfirmation({ id: receipt.id, hash: '', production_name: receipt.production_name })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-status-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-trace-forest">Receipt submitted — pending HOD sign-off</h2>
            <p className="text-sm text-gray-500">Production: {confirmation.production_name}</p>
          </div>
        </div>

        <div className="rounded border border-yellow-200 bg-yellow-50 px-4 py-3 mb-6">
          <p className="text-sm text-yellow-800">
            This receipt is locked and queued for AUTH sign-off. Your HOD can review and sign it from the <strong>HOD Sign-off</strong> page.
          </p>
        </div>

        <div className="mb-8">
          <p className="label">Receipt ID</p>
          <p className="font-mono text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all">
            {confirmation.id}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            The TRACE Twin Lock hash is generated once your HOD applies the AUTH signature.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setConfirmation(null)
              setNewProduction(false)
              setToolQuery('')
              setSelectedEntry(null)
              setForm({ ...emptyForm, production_name: form.production_name })
              fetch('/api/productions').then(r => r.json()).then(setProductions).catch(() => {})
            }}
            className="btn-primary"
          >
            Log Another Receipt
          </button>
          <a href="/hod" className="btn-secondary">
            HOD Sign-off Queue
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Production Details */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="section-heading">Production Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="production_name">Production Name</label>
            {!newProduction && productions.length > 0 ? (
              <div className="flex gap-2">
                <select
                  id="production_name"
                  className="select flex-1"
                  required
                  value={form.production_name}
                  onChange={(e) => set('production_name', e.target.value)}
                >
                  <option value="">Select production…</option>
                  {productions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setNewProduction(true); set('production_name', '') }}
                  className="btn-secondary text-xs px-3 whitespace-nowrap"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  id="production_name"
                  className="input flex-1"
                  required
                  placeholder="e.g. The Meridian — Series 1"
                  value={form.production_name}
                  onChange={(e) => set('production_name', e.target.value)}
                />
                {productions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setNewProduction(false); set('production_name', '') }}
                    className="btn-secondary text-xs px-3 whitespace-nowrap"
                  >
                    Select existing
                  </button>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              className="input"
              required
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="department">Department</label>
            <select
              id="department"
              className="select"
              required
              value={form.department}
              onChange={(e) => set('department', e.target.value as Department)}
            >
              <option value="">Select department…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Crew */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="section-heading">Crew Member</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="crew_member_name">Name</label>
            <input
              id="crew_member_name"
              className="input"
              required
              placeholder="Full name"
              value={form.crew_member_name}
              onChange={(e) => set('crew_member_name', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="crew_role">Role</label>
            <input
              id="crew_role"
              className="input"
              required
              placeholder="e.g. VFX Supervisor, Colourist"
              value={form.crew_role}
              onChange={(e) => set('crew_role', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="scene_usid">Scene / Asset Reference</label>
            <input
              id="scene_usid"
              className="input"
              required
              placeholder="e.g. Scene 12B, Concept_Art_007"
              value={form.scene_usid}
              onChange={(e) => set('scene_usid', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="script_date">Script Date &amp; Version</label>
            <input
              id="script_date"
              className="input"
              required
              placeholder="e.g. 14 Apr 2026, Pink Draft v3"
              value={form.script_date}
              onChange={(e) => set('script_date', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* AI Tool */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="section-heading">AI Tool</h2>

        <div className="mb-4" ref={toolRef}>
          <label className="label" htmlFor="ai_tool_used">Tool Name</label>
          <p className="text-xs text-gray-400 mb-1.5">Start typing to search the production whitelist. Status is set automatically.</p>
          <div className="relative">
            <input
              id="ai_tool_used"
              className="input"
              required
              autoComplete="off"
              placeholder="e.g. Adobe Firefly, Runway Gen-3, Eleven Labs…"
              value={toolQuery}
              onChange={(e) => handleToolInput(e.target.value)}
              onFocus={() => toolQuery.length >= 1 && setShowSuggestions(suggestions.length > 0)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {suggestions.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-trace-pale text-left transition-colors"
                      onMouseDown={(e) => { e.preventDefault(); selectEntry(entry) }}
                    >
                      <span className="text-sm font-medium text-gray-800">{entry.displayName}</span>
                      <span className={`status-badge ml-3 flex-shrink-0 ${
                        entry.status === 'GREEN' ? 'status-green' :
                        entry.status === 'AMBER' ? 'status-amber' : 'status-red'
                      }`}>
                        {entry.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {toolQuery.trim().length >= 3 && !selectedEntry && suggestions.length === 0 && (
            <p className="text-xs text-red-600 mt-2 font-medium">
              Tool not found on production whitelist — refer to OAS before proceeding.
            </p>
          )}
        </div>

        <div>
          <p className="label mb-2">Tool Status <span className="normal-case font-normal text-gray-400">(auto-populated from whitelist)</span></p>
          {derivedStatus ? (
            <StatusBadge
              status={derivedStatus}
              condition={selectedEntry?.condition}
              requiresLCT={selectedEntry?.requiresLCT}
            />
          ) : (
            <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-400">
              Enter a tool name above to check whitelist status.
            </div>
          )}
        </div>
      </section>

      {/* TRACE Four-Point Log */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="section-heading">TRACE Four-Point Log</h2>
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="por_description">
              POR — Point of Record
            </label>
            <p className="text-xs text-gray-400 mb-1">What did the AI produce? Include the prompt used and describe the output.</p>
            <textarea
              id="por_description"
              className="textarea"
              rows={4}
              required
              placeholder="Describe the AI output: what was prompted, and what the system produced…"
              value={form.por_description}
              onChange={(e) => set('por_description', e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="sel_output">
              SEL — Selection
            </label>
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="sel_output">What did you select?</label>
                <input
                  id="sel_output"
                  className="input"
                  required
                  placeholder="Identify the specific output chosen from the AI…"
                  value={form.sel_output}
                  onChange={(e) => set('sel_output', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="sel_description">Why did you select it?</label>
                <select
                  id="sel_description"
                  className="select"
                  required
                  value={form.sel_description}
                  onChange={(e) => set('sel_description', e.target.value as SelReason)}
                >
                  <option value="">Select a reason…</option>
                  {SEL_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {form.sel_description === 'Other' && (
                <div>
                  <label className="label" htmlFor="sel_detail">Describe your reason</label>
                  <input
                    id="sel_detail"
                    className="input"
                    placeholder="Describe your selection reasoning…"
                    value={form.sel_detail}
                    onChange={(e) => set('sel_detail', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="adj_description">
              ADJ — Where did you end up?
            </label>
            <p className="text-xs text-gray-400 mb-1">The final version after working with the AI output — not a description of every change, just where you ended up. The gap between this and POR is the evidence of human authorship.</p>
            <textarea
              id="adj_description"
              className="textarea"
              rows={3}
              required
              placeholder="The final version after working with the AI output — not a description of every change, just where you ended up. The gap between this and POR is the evidence of human authorship."
              value={form.adj_description}
              onChange={(e) => set('adj_description', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* AUTH — Stage 1 info */}
      <section className={`bg-white rounded-lg p-6 ${
        authBlocked && derivedStatus !== ''
          ? 'border-2 border-red-400'
          : 'border border-gray-200'
      }`}>
        <h2 className="section-heading">AUTH — Authorial Control</h2>

        {authBlocked && derivedStatus !== '' ? (
          <div className="rounded bg-red-50 border border-red-300 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 mb-1">Cannot proceed.</p>
            <p className="text-xs text-red-600">
              This tool has not been approved for production use. Contact the OAS before proceeding.
            </p>
          </div>
        ) : (
          <div className="rounded bg-trace-pale border border-gray-200 px-4 py-3">
            <p className="text-sm font-medium text-trace-forest mb-1">Stage 1 of 2 — Crew confirmation</p>
            <p className="text-xs text-gray-600">
              Submitting this receipt locks it and sends it to your HOD for review. Your HOD will apply the AUTH signature from the HOD Sign-off queue.
            </p>
          </div>
        )}
      </section>

      {/* LCT */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="section-heading">Likeness & Voice (LCT)</h2>
        <div className="flex items-start gap-3 mb-4">
          <input
            id="lct_required"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss"
            checked={form.lct_required}
            onChange={(e) => set('lct_required', e.target.checked)}
          />
          <label htmlFor="lct_required" className="text-sm text-gray-700 cursor-pointer">
            This AI use involves a performer likeness, voice, or identity
          </label>
        </div>

        {form.lct_required && (
          <div className="pl-7">
            <label className="label" htmlFor="lct_reference">
              LCT Token Reference <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              id="lct_reference"
              className="input"
              placeholder="LCT token reference, if applicable"
              value={form.lct_reference}
              onChange={(e) => set('lct_reference', e.target.value)}
            />
          </div>
        )}
      </section>

      {/* Notes */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="section-heading">Notes <span className="normal-case font-normal text-gray-400">(optional)</span></h2>
        <textarea
          id="notes"
          className="textarea"
          rows={3}
          placeholder="Any additional context or notes for this receipt…"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Submitting locks this receipt and sends it to your HOD for AUTH sign-off.
        </p>
        <button
          type="submit"
          disabled={submitting || (authBlocked && derivedStatus !== '')}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : 'Confirm and send to HOD'}
        </button>
      </div>
    </form>
  )
}
