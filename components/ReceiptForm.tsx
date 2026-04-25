'use client'

import { useState, useEffect } from 'react'
import { DEPARTMENTS, TOOL_STATUSES } from '@/lib/types'
import type { Department, ToolStatus } from '@/lib/types'

const STATUS_CONFIG = {
  GREEN: {
    label: 'GREEN — Vetted',
    color: '#2E7D32',
    bg: '#E8F5E9',
    border: '#A5D6A7',
    description: 'Tool has been reviewed and approved for production use',
  },
  YELLOW: {
    label: 'YELLOW — Restricted',
    color: '#C8841A',
    bg: '#FFF8E1',
    border: '#FFE082',
    description: 'Tool is permitted with restrictions — check with HOD',
  },
  RED: {
    label: 'RED — Prohibited',
    color: '#C62828',
    bg: '#FFEBEE',
    border: '#EF9A9A',
    description: 'Tool is not authorised for use on this production',
  },
}

async function sha256(data: object): Promise<string> {
  const text = JSON.stringify(data, Object.keys(data).sort())
  const buffer = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

const today = new Date().toISOString().split('T')[0]

const emptyForm = {
  production_name: '',
  date: today,
  department: '' as Department | '',
  crew_member_name: '',
  crew_role: '',
  scene_usid: '',
  ai_tool_used: '',
  tool_status: '' as ToolStatus | '',
  por_description: '',
  sel_description: '',
  adj_description: '',
  auth_signer: '',
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

export default function ReceiptForm() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [productions, setProductions] = useState<string[]>([])
  const [newProduction, setNewProduction] = useState(false)

  useEffect(() => {
    fetch('/api/productions')
      .then((r) => r.json())
      .then(setProductions)
      .catch(() => {})
  }, [])

  function set(field: keyof FormState, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.department) return setError('Please select a department.')
    if (!form.tool_status) return setError('Please select a tool status.')

    setSubmitting(true)

    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) throw new Error('Submission failed')

      const receipt = await res.json()
      const hash = await sha256(receipt)

      setConfirmation({ id: receipt.id, hash, production_name: receipt.production_name })
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
          <div className="w-10 h-10 rounded-full bg-status-green-bg flex items-center justify-center">
            <svg className="w-5 h-5 text-status-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-trace-forest">Receipt Logged</h2>
            <p className="text-sm text-gray-500">Production: {confirmation.production_name}</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <p className="label">Receipt ID</p>
            <p className="font-mono text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all">
              {confirmation.id}
            </p>
          </div>
          <div>
            <p className="label">TRACE Twin Lock — SHA-256</p>
            <p className="font-mono text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all text-gray-600">
              {confirmation.hash}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This hash is a cryptographic fingerprint of the submitted record. Retain for audit purposes.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setConfirmation(null)
              setNewProduction(false)
              setForm({ ...emptyForm, production_name: form.production_name })
              fetch('/api/productions').then(r => r.json()).then(setProductions).catch(() => {})
            }}
            className="btn-primary"
          >
            Log Another Receipt
          </button>
          <a href="/log" className="btn-secondary">
            View Receipt Log
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
        <div className="mb-4">
          <label className="label" htmlFor="ai_tool_used">Tool Name</label>
          <input
            id="ai_tool_used"
            className="input"
            required
            placeholder="e.g. Midjourney v6, ChatGPT-4o, Adobe Firefly"
            value={form.ai_tool_used}
            onChange={(e) => set('ai_tool_used', e.target.value)}
          />
        </div>

        <div>
          <p className="label">Tool Status</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TOOL_STATUSES.map((status) => {
              const cfg = STATUS_CONFIG[status]
              const selected = form.tool_status === status
              return (
                <label
                  key={status}
                  className="relative flex flex-col gap-1 p-3 rounded border-2 cursor-pointer transition-all duration-150"
                  style={{
                    borderColor: selected ? cfg.color : '#E5E7EB',
                    backgroundColor: selected ? cfg.bg : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name="tool_status"
                    value={status}
                    checked={selected}
                    onChange={() => set('tool_status', status)}
                    className="sr-only"
                    required
                  />
                  <span
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: cfg.color }}
                  >
                    {status}
                  </span>
                  <span className="text-xs text-gray-500">{cfg.description}</span>
                  {selected && (
                    <span
                      className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: cfg.color }}
                    >
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </label>
              )
            })}
          </div>
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
            <label className="label" htmlFor="sel_description">
              SEL — Selection
            </label>
            <p className="text-xs text-gray-400 mb-1">What did the human choose from the AI output, and why?</p>
            <textarea
              id="sel_description"
              className="textarea"
              rows={3}
              required
              placeholder="Describe what was selected from the AI output and the creative reasoning behind that selection…"
              value={form.sel_description}
              onChange={(e) => set('sel_description', e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="adj_description">
              ADJ — Adjustment
            </label>
            <p className="text-xs text-gray-400 mb-1">How did the human modify the AI output? Describe the delta between AI output and final version.</p>
            <textarea
              id="adj_description"
              className="textarea"
              rows={3}
              required
              placeholder="Describe modifications made: what changed, what was added, what was removed…"
              value={form.adj_description}
              onChange={(e) => set('adj_description', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* AUTH */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="section-heading">AUTH — Authorial Control</h2>
        <p className="text-xs text-gray-400 mb-4">
          This sign-off confirms that a human exercised authorial control over this creative act.
          This field must be completed by the Head of Department or Lead Creative.
        </p>
        <div>
          <label className="label" htmlFor="auth_signer">HOD / Lead Creative Signatory</label>
          <input
            id="auth_signer"
            className="input"
            required
            placeholder="Full name of authorising HOD or Lead Creative"
            value={form.auth_signer}
            onChange={(e) => set('auth_signer', e.target.value)}
          />
        </div>
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
          Submission is logged with a SHA-256 TRACE Twin Lock hash for audit purposes.
        </p>
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
          {submitting ? 'Logging receipt…' : 'Submit Receipt'}
        </button>
      </div>
    </form>
  )
}
