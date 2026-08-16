'use client'

import { useState, useEffect, useRef } from 'react'
import { DEPARTMENTS, SEL_REASONS, VFX_DATA_LOCATIONS, VFX_INPUT_TYPES, VFX_OUTPUT_TYPES, SOUND_PROCESSING_LOCATIONS, SOUND_PROCESSING_TYPES, WRITING_STAGES, WRITING_SUBMITTED_MATERIALS, WRITING_PROCESSING_LOCATIONS, WRITING_GUILD_STATUSES, WRITING_AI_CONTRIBUTIONS, WGA_SCRIPT_REGISTRATION_STATUSES, WGGB_WRITING_CONTEXTS, LCT_AGE_BRACKETS, SUBMITTER_ROLES } from '@/lib/types'
import type { Department, WhitelistEntry, SelReason, SubmitterRole } from '@/lib/types'

const today = new Date().toISOString().split('T')[0]

const emptyForm = {
  production_name: '',
  date: today,
  department: '' as Department | '',
  crew_member_name: '',
  crew_role: '',
  submitter_role: 'crew' as SubmitterRole,
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
  lct_child_performer: false,
  lct_child_age_bracket: '',
  lct_guardian_name: '',
  lct_guardian_consent_ref: '',
  lct_performance_licence_ref: '',
  notes: '',
  script_date: '',
  vfx_software: '',
  vfx_data_location: '',
  vfx_no_training_confirmed: false,
  vfx_input_type: '',
  vfx_output_type: '',
  vfx_lct_confirmed: false,
  sound_processing_location: '',
  sound_processing_type: '',
  sound_performer_audio: false,
  sound_no_training_confirmed: false,
  writing_stage: '',
  writing_submitted_material: '',
  writing_processing_location: '',
  writing_guild_status: '',
  writing_ai_contribution: '',
  writing_no_training_confirmed: false,
  writing_authorship_declared: false,
  writing_wga_writers_count: '' as string,
  writing_wga_registration: '',
  writing_wggb_context: '',
  writing_wggb_paternity: false,
}

type FormState = typeof emptyForm

interface Confirmation {
  id: string
  hash: string
  production_name: string
  selfAuth: boolean
  routedTo: 'hod' | 'producer' | 'exec' | 'self'
}

// Light-theme status badge
function StatusBadge({ status, condition, requiresLCT }: {
  status: 'GREEN' | 'AMBER' | 'RED' | 'UNVERIFIED' | ''
  condition?: string | null
  requiresLCT?: boolean
}) {
  if (!status) return null

  if (status === 'GREEN') {
    return (
      <div style={{ background: 'rgba(22,101,52,0.08)', border: '1px solid rgba(22,101,52,0.3)', borderRadius: '3px', padding: '0.625rem 0.875rem' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#166534' }} />
          <span className="font-courier font-bold uppercase tracking-widest" style={{ fontSize: '0.6rem', color: '#166534' }}>GREEN — Approved for production use</span>
        </div>
        {condition && <p className="text-xs italic mt-1" style={{ color: '#166534', opacity: 0.8, paddingLeft: '1rem' }}>{condition}</p>}
      </div>
    )
  }
  if (status === 'AMBER') {
    return (
      <div style={{ background: 'rgba(146,100,12,0.08)', border: '1px solid rgba(146,100,12,0.3)', borderRadius: '3px', padding: '0.625rem 0.875rem' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#92640c' }} />
          <span className="font-courier font-bold uppercase tracking-widest" style={{ fontSize: '0.6rem', color: '#92640c' }}>AMBER — Conditional approval</span>
        </div>
        {condition && <p className="text-xs italic mt-1.5" style={{ color: '#92640c', opacity: 0.9, paddingLeft: '1rem' }}>{condition}</p>}
        {requiresLCT && (
          <div className="flex items-center gap-1.5 mt-1" style={{ paddingLeft: '1rem' }}>
            <span style={{ color: '#92640c', fontSize: '0.8rem' }}>⚠</span>
            <span className="font-courier font-semibold uppercase tracking-wider" style={{ fontSize: '0.6rem', color: '#92640c' }}>LCT required before use</span>
          </div>
        )}
      </div>
    )
  }
  if (status === 'RED') {
    return (
      <div style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: '3px', padding: '0.625rem 0.875rem' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#b91c1c' }} />
          <span className="font-courier font-bold uppercase tracking-widest" style={{ fontSize: '0.6rem', color: '#b91c1c' }}>RED — Not approved for production use</span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#b91c1c', opacity: 0.85, paddingLeft: '1rem' }}>This tool is on the blocked list. Contact the OAS before proceeding.</p>
      </div>
    )
  }
  if (status === 'UNVERIFIED') {
    return (
      <div style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: '3px', padding: '0.625rem 0.875rem' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#b91c1c' }} />
          <span className="font-courier font-bold uppercase tracking-widest" style={{ fontSize: '0.6rem', color: '#b91c1c' }}>UNVERIFIED — Not on production whitelist</span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#b91c1c', opacity: 0.85, paddingLeft: '1rem' }}>Tool not found on production whitelist — refer to OAS before proceeding.</p>
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

    if (form.department === 'VFX') {
      if (!form.vfx_software.trim()) return setError('VFX: Please enter the software name and version.')
      if (!form.vfx_data_location) return setError('VFX: Please select where data was processed.')
      if (!form.vfx_no_training_confirmed) return setError('VFX: Please confirm the training data policy.')
      if (!form.vfx_input_type) return setError('VFX: Please select what was submitted to the AI tool.')
      if (!form.vfx_output_type) return setError('VFX: Please select what the AI generated.')
      if (form.vfx_input_type === 'Plate footage containing performers' && !form.vfx_lct_confirmed) {
        return setError('VFX: Please confirm a valid LCT exists for all performers in this footage.')
      }
    }

    if (form.department === 'Sound') {
      if (!form.sound_processing_location) return setError('Sound: Please select where audio was processed.')
      if (!form.sound_processing_type) return setError('Sound: Please select the type of processing.')
      if (!form.sound_no_training_confirmed) return setError('Sound: Please confirm the training data policy.')
    }

    if (form.department === 'Writing') {
      if (!form.writing_stage) return setError('Writing: Please select the stage of development.')
      if (!form.writing_submitted_material) return setError('Writing: Please select what script material was submitted.')
      if (!form.writing_processing_location) return setError('Writing: Please select where this was processed.')
      if (!form.writing_guild_status) return setError('Writing: Please select writer guild status.')
      if (form.writing_guild_status === 'WGA') {
        if (!form.writing_wga_writers_count || Number(form.writing_wga_writers_count) < 1) return setError('Writing: Please enter the number of writers in this session.')
        if (!form.writing_wga_registration) return setError('Writing: Please select the WGA script registration status.')
      }
      if (form.writing_guild_status === 'WGGB') {
        if (!form.writing_wggb_context) return setError('Writing: Please select your writing context.')
        if (!form.writing_wggb_paternity) return setError('Writing: Please confirm your right of paternity assertion (CDPA s.77).')
      }
      if (!form.writing_ai_contribution) return setError('Writing: Please select what the AI contributed.')
      if (!form.writing_no_training_confirmed) return setError('Writing: Please confirm the training data policy.')
      if (!form.writing_authorship_declared) return setError('Writing: Please confirm your authorship declaration.')
    }

    if (form.lct_required && form.lct_child_performer) {
      if (!form.lct_child_age_bracket) return setError('LCT: Please select the child performer age bracket.')
      if (!form.lct_guardian_name.trim()) return setError('LCT: Please enter the parent or legal guardian name.')
      if (!form.lct_guardian_consent_ref.trim()) return setError('LCT: Please enter the guardian consent reference number.')
    }

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
      const selfAuth = form.department === 'Writing' && form.writing_stage === 'Development'
      const routedTo: Confirmation['routedTo'] = selfAuth
        ? 'self'
        : form.submitter_role === 'hod'
        ? 'producer'
        : form.submitter_role === 'producer'
        ? 'exec'
        : 'hod'
      setConfirmation({ id: receipt.id, hash: receipt.twin_lock_hash || '', production_name: receipt.production_name, selfAuth, routedTo })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Confirmation screen ──────────────────────────────────────────
  if (confirmation) {
    const queueLabel = confirmation.routedTo === 'producer'
      ? 'Producer Sign-off'
      : confirmation.routedTo === 'exec'
      ? 'Exec / OAS Sign-off'
      : 'HOD Sign-off'
    const queueHref = confirmation.routedTo === 'producer'
      ? '/producer'
      : confirmation.routedTo === 'exec'
      ? '/exec'
      : '/hod'

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={confirmation.selfAuth
              ? { background: 'rgba(22,101,52,0.12)', border: '1.5px solid rgba(22,101,52,0.3)' }
              : { background: 'rgba(200,168,75,0.12)', border: '1.5px solid rgba(200,168,75,0.4)' }
            }
          >
            {confirmation.selfAuth ? (
              <svg className="w-5 h-5" style={{ color: '#166534' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" style={{ color: '#92640c' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="font-garamond" style={{ fontSize: '1.4rem', color: '#1A3D2B', lineHeight: 1.25 }}>
              {confirmation.selfAuth
                ? 'Receipt submitted — self-authorised'
                : `Receipt submitted — pending ${queueLabel}`}
            </h2>
            <p className="font-courier mt-0.5" style={{ fontSize: '0.7rem', color: '#5A8A72' }}>Production: {confirmation.production_name}</p>
          </div>
        </div>

        {confirmation.selfAuth ? (
          <div className="mb-6 rounded" style={{ background: 'rgba(22,101,52,0.07)', border: '1px solid rgba(22,101,52,0.25)', padding: '0.75rem 1rem' }}>
            <p className="text-sm" style={{ color: '#166534' }}>
              This Development stage receipt has been self-authorised and locked. It will be acknowledged by the OAS when the project enters production.
            </p>
          </div>
        ) : (
          <div className="mb-6 rounded" style={{ background: 'rgba(146,100,12,0.07)', border: '1px solid rgba(146,100,12,0.3)', padding: '0.75rem 1rem' }}>
            <p className="text-sm" style={{ color: '#92640c' }}>
              This receipt is locked and queued for AUTH sign-off. A {queueLabel.replace(' Sign-off', '')} can review and sign it from the{' '}
              <strong>{queueLabel}</strong> page.
            </p>
          </div>
        )}

        <div className="mb-8 space-y-4">
          <div>
            <p className="lt-label">Receipt ID</p>
            <p className="font-courier rounded px-3 py-2 break-all mt-1" style={{ fontSize: '0.7rem', background: '#F5F0E8', border: '1px solid rgba(45,106,79,0.2)', color: '#2D6A4F' }}>
              {confirmation.id}
            </p>
          </div>
          {confirmation.selfAuth && confirmation.hash ? (
            <div>
              <p className="lt-label">TRACE Twin Lock</p>
              <div className="rounded px-4 py-3 mt-1" style={{ background: '#FAF8F4', border: '1px solid rgba(45,106,79,0.25)' }}>
                <p className="font-courier uppercase tracking-widest mb-2" style={{ fontSize: '0.55rem', color: '#2D6A4F' }}>SHA-256</p>
                <p className="font-courier break-all" style={{ fontSize: '0.7rem', color: '#1A3D2B', lineHeight: 1.7 }}>
                  {confirmation.hash}
                </p>
              </div>
            </div>
          ) : (
            <p className="font-courier" style={{ fontSize: '0.75rem', color: '#5A8A72', fontStyle: 'italic' }}>
              The TRACE Twin Lock hash is generated once your {queueLabel.replace(' Sign-off', '')} applies the AUTH signature.
            </p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              setConfirmation(null)
              setNewProduction(false)
              setToolQuery('')
              setSelectedEntry(null)
              setForm({ ...emptyForm, production_name: form.production_name })
              fetch('/api/productions').then(r => r.json()).then(setProductions).catch(() => {})
            }}
            className="lt-btn-primary"
          >
            Log Another Receipt
          </button>
          <a href={queueHref} className="lt-btn-secondary">
            {queueLabel} Queue
          </a>
        </div>
      </div>
    )
  }

  // ── Routing hint for AUTH section ────────────────────────────────
  const routingLabel = form.submitter_role === 'hod'
    ? 'Producer'
    : form.submitter_role === 'producer'
    ? 'Exec / OAS'
    : 'HOD'
  const isWritingDev = form.department === 'Writing' && form.writing_stage === 'Development'

  // ── Submit label ─────────────────────────────────────────────────
  const submitLabel = submitting
    ? 'Submitting…'
    : isWritingDev
    ? 'Confirm and self-authorise'
    : `Confirm and send to ${routingLabel}`

  return (
    <form onSubmit={handleSubmit}>

      {/* Production Details ──────────────────────── */}
      <section className="mb-8">
        <h2 className="lt-section-heading">Production Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div className="sm:col-span-2">
            <label className="lt-label" htmlFor="production_name">Production Name</label>
            {!newProduction && productions.length > 0 ? (
              <div className="flex gap-3 items-end">
                <select
                  id="production_name"
                  className="lt-select flex-1"
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
                  className="lt-btn-secondary text-xs px-3 whitespace-nowrap"
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.6rem' }}
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-3 items-end">
                <input
                  id="production_name"
                  className="lt-input flex-1"
                  required
                  placeholder="e.g. The Meridian — Series 1"
                  value={form.production_name}
                  onChange={(e) => set('production_name', e.target.value)}
                />
                {productions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setNewProduction(false); set('production_name', '') }}
                    className="lt-btn-secondary whitespace-nowrap"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.6rem' }}
                  >
                    Select existing
                  </button>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="lt-label" htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              className="lt-input"
              required
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div>
            <label className="lt-label" htmlFor="department">Department</label>
            <select
              id="department"
              className="lt-select"
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

      <hr className="lt-divider" />

      {/* Crew Member ─────────────────────────────── */}
      <section className="mb-8">
        <h2 className="lt-section-heading">Crew Member</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <label className="lt-label" htmlFor="crew_member_name">Name</label>
            <input
              id="crew_member_name"
              className="lt-input"
              required
              placeholder="Full name"
              value={form.crew_member_name}
              onChange={(e) => set('crew_member_name', e.target.value)}
            />
          </div>
          <div>
            <label className="lt-label" htmlFor="crew_role">Role</label>
            <input
              id="crew_role"
              className="lt-input"
              required
              placeholder="e.g. VFX Supervisor, Colourist"
              value={form.crew_role}
              onChange={(e) => set('crew_role', e.target.value)}
            />
          </div>
          <div>
            <label className="lt-label" htmlFor="scene_usid">Scene / Asset Reference</label>
            <input
              id="scene_usid"
              className="lt-input"
              required
              placeholder="e.g. Scene 12B, Concept_Art_007"
              value={form.scene_usid}
              onChange={(e) => set('scene_usid', e.target.value)}
            />
          </div>
          <div>
            <label className="lt-label" htmlFor="script_date">Script Date &amp; Version</label>
            <input
              id="script_date"
              className="lt-input"
              required
              placeholder="e.g. 14 Apr 2026, Pink Draft v3"
              value={form.script_date}
              onChange={(e) => set('script_date', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 pt-1">
            <label className="lt-label">Your position on this production</label>
            <p className="font-courier mb-3" style={{ fontSize: '0.7rem', color: '#5A8A72', fontStyle: 'italic' }}>
              Determines which sign-off queue this receipt routes to.
            </p>
            <div className="flex flex-wrap gap-5">
              {SUBMITTER_ROLES.map((r) => (
                <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="submitter_role"
                    value={r.value}
                    checked={form.submitter_role === r.value}
                    onChange={() => set('submitter_role', r.value as SubmitterRole)}
                    className="h-4 w-4"
                  />
                  <span className="font-courier" style={{ fontSize: '0.75rem', color: '#1A3D2B' }}>{r.label}</span>
                </label>
              ))}
            </div>
            {form.submitter_role !== 'crew' && (
              <p className="font-courier mt-2 uppercase tracking-wide" style={{ fontSize: '0.6rem', color: '#92640c' }}>
                → Routes to {form.submitter_role === 'hod' ? 'Producer' : 'Exec / OAS'} Sign-off Queue
              </p>
            )}
          </div>
        </div>
      </section>

      <hr className="lt-divider" />

      {/* AI Tool ─────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="lt-section-heading">AI Tool</h2>
        <div className="mb-5" ref={toolRef}>
          <label className="lt-label" htmlFor="ai_tool_used">Tool Name</label>
          <p className="font-courier mb-2" style={{ fontSize: '0.7rem', color: '#5A8A72', fontStyle: 'italic' }}>Start typing to search the production whitelist. Status is set automatically.</p>
          <div className="relative">
            <input
              id="ai_tool_used"
              className="lt-input"
              required
              autoComplete="off"
              placeholder="e.g. Adobe Firefly, Runway Gen-3, Eleven Labs…"
              value={toolQuery}
              onChange={(e) => handleToolInput(e.target.value)}
              onFocus={() => toolQuery.length >= 1 && setShowSuggestions(suggestions.length > 0)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 top-full mt-1 rounded shadow-lg max-h-56 overflow-y-auto" style={{ background: '#fff', border: '1.5px solid #2D6A4F' }}>
                {suggestions.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                      style={{ borderBottom: '1px solid rgba(45,106,79,0.15)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(45,106,79,0.07)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onMouseDown={(e) => { e.preventDefault(); selectEntry(entry) }}
                    >
                      <span className="font-garamond text-sm" style={{ color: '#1A3D2B' }}>{entry.displayName}</span>
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
            <p className="font-courier mt-2 font-bold uppercase tracking-wide" style={{ fontSize: '0.6rem', color: '#b91c1c' }}>
              Tool not found on production whitelist — refer to OAS before proceeding.
            </p>
          )}
        </div>
        <div>
          <p className="lt-label mb-2">Tool Status <span className="normal-case font-normal" style={{ color: '#5A8A72' }}>(auto-populated from whitelist)</span></p>
          {derivedStatus ? (
            <StatusBadge status={derivedStatus} condition={selectedEntry?.condition} requiresLCT={selectedEntry?.requiresLCT} />
          ) : (
            <div className="rounded font-courier uppercase tracking-wider" style={{ background: '#FAF8F4', border: '1px solid rgba(45,106,79,0.25)', padding: '0.625rem 0.875rem', fontSize: '0.6rem', color: '#5A8A72' }}>
              Enter a tool name above to check whitelist status.
            </div>
          )}
        </div>
      </section>

      <hr className="lt-divider" />

      {/* TRACE Four-Point Log ───────────────────── */}
      <section className="mb-8">
        <h2 className="lt-section-heading">TRACE Four-Point Log</h2>

        {/* POR */}
        <div className="mb-7" style={{ borderLeft: '2px solid #1A3D2B', paddingLeft: '1.25rem' }}>
          <div className="mb-2">
            <span className="font-garamond" style={{ display: 'block', fontSize: '1.75rem', color: '#1A3D2B', lineHeight: 1, fontWeight: 500 }}>POR</span>
            <span className="font-courier" style={{ display: 'block', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#2D6A4F', marginTop: '2px', fontWeight: 700 }}>Point of Record</span>
          </div>
          <p className="mb-3" style={{ fontSize: '0.8rem', color: '#5A8A72', fontStyle: 'italic' }}>What did the AI produce? Include the prompt used and describe the output.</p>
          <textarea
            id="por_description"
            className="lt-textarea"
            rows={4}
            required
            placeholder="Describe the AI output: what was prompted, and what the system produced…"
            value={form.por_description}
            onChange={(e) => set('por_description', e.target.value)}
          />
        </div>

        {/* SEL */}
        <div className="mb-7" style={{ borderLeft: '2px solid #1A3D2B', paddingLeft: '1.25rem' }}>
          <div className="mb-2">
            <span className="font-garamond" style={{ display: 'block', fontSize: '1.75rem', color: '#1A3D2B', lineHeight: 1, fontWeight: 500 }}>SEL</span>
            <span className="font-courier" style={{ display: 'block', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#2D6A4F', marginTop: '2px', fontWeight: 700 }}>Selection</span>
          </div>
          <div className="space-y-4 mt-3">
            <div>
              <label className="lt-label" htmlFor="sel_output">What did you select?</label>
              <input
                id="sel_output"
                className="lt-input"
                required
                placeholder="Identify the specific output chosen from the AI…"
                value={form.sel_output}
                onChange={(e) => set('sel_output', e.target.value)}
              />
            </div>
            <div>
              <label className="lt-label" htmlFor="sel_description">Why did you select it?</label>
              <select
                id="sel_description"
                className="lt-select"
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
                <label className="lt-label" htmlFor="sel_detail">Describe your reason</label>
                <input
                  id="sel_detail"
                  className="lt-input"
                  required
                  placeholder="Describe your selection reasoning…"
                  value={form.sel_detail}
                  onChange={(e) => set('sel_detail', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* ADJ */}
        <div className="mb-2" style={{ borderLeft: '2px solid #1A3D2B', paddingLeft: '1.25rem' }}>
          <div className="mb-2">
            <span className="font-garamond" style={{ display: 'block', fontSize: '1.75rem', color: '#1A3D2B', lineHeight: 1, fontWeight: 500 }}>ADJ</span>
            <span className="font-courier" style={{ display: 'block', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#2D6A4F', marginTop: '2px', fontWeight: 700 }}>Where did you end up?</span>
          </div>
          <p className="mb-3" style={{ fontSize: '0.8rem', color: '#5A8A72', fontStyle: 'italic' }}>The final version after working with the AI output — not a description of every change, just where you ended up.</p>
          <textarea
            id="adj_description"
            className="lt-textarea"
            rows={3}
            required
            placeholder="Describe where you ended up after working with the AI output…"
            value={form.adj_description}
            onChange={(e) => set('adj_description', e.target.value)}
          />
        </div>
      </section>

      {/* AUTH ────────────────────────────────────── */}
      <section className="mb-8">
        <div style={{ borderLeft: '3px solid #C8A84B', paddingLeft: '1.25rem' }}>
          <div className="mb-2">
            <span className="font-garamond" style={{ display: 'block', fontSize: '1.75rem', color: '#1A3D2B', lineHeight: 1, fontWeight: 500 }}>AUTH</span>
            <span className="font-courier" style={{ display: 'block', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#2D6A4F', marginTop: '2px', fontWeight: 700 }}>Authorial Control</span>
          </div>

          {authBlocked && derivedStatus !== '' ? (
            <div className="rounded mt-3" style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.3)', padding: '0.75rem 1rem' }}>
              <p className="font-courier font-bold uppercase tracking-wide mb-1" style={{ fontSize: '0.6rem', color: '#b91c1c' }}>Cannot proceed.</p>
              <p className="text-xs" style={{ color: '#b91c1c', opacity: 0.85 }}>
                This tool has not been approved for production use. Contact the OAS before proceeding.
              </p>
            </div>
          ) : isWritingDev ? (
            <div className="rounded mt-3" style={{ background: 'rgba(22,101,52,0.07)', border: '1px solid rgba(22,101,52,0.25)', padding: '0.75rem 1rem' }}>
              <p className="font-courier font-bold uppercase tracking-wide mb-1" style={{ fontSize: '0.6rem', color: '#166534' }}>Self-authorised — Development stage</p>
              <p className="text-xs" style={{ color: '#166534', opacity: 0.8 }}>
                Development stage receipts are self-authorised and will be acknowledged by the OAS when the project enters production.
              </p>
            </div>
          ) : (
            <div className="rounded mt-3" style={{ background: '#FAF8F4', border: '1px solid rgba(200,168,75,0.4)', padding: '0.75rem 1rem' }}>
              <p className="font-courier font-bold uppercase tracking-wide mb-1" style={{ fontSize: '0.6rem', color: '#92640c' }}>
                Stage 1 — Crew confirmation → {routingLabel} sign-off
              </p>
              <p className="text-xs" style={{ color: '#5A8A72' }}>
                Submitting this receipt locks it and sends it to {routingLabel} for review. AUTH signature applied from the {routingLabel} Sign-off queue.
              </p>
            </div>
          )}
        </div>
      </section>

      <hr className="lt-divider" />

      {/* VFX ─────────────────────────────────────── */}
      {form.department === 'VFX' && (
        <>
          <section className="mb-8">
            <h2 className="lt-section-heading">VFX — Additional Compliance</h2>
            <div className="space-y-5">
              <div>
                <label className="lt-label" htmlFor="vfx_software">Software and version used</label>
                <input id="vfx_software" className="lt-input" required placeholder="e.g. Nuke 14.0, Runway Gen-3, Topaz Video AI 4.2" value={form.vfx_software} onChange={(e) => set('vfx_software', e.target.value)} />
              </div>
              <div>
                <label className="lt-label" htmlFor="vfx_data_location">Where was data processed?</label>
                <select id="vfx_data_location" className="lt-select" required value={form.vfx_data_location} onChange={(e) => set('vfx_data_location', e.target.value)}>
                  <option value="">Select location…</option>
                  {VFX_DATA_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex items-start gap-3">
                <input id="vfx_no_training_confirmed" type="checkbox" className="mt-0.5 h-4 w-4" checked={form.vfx_no_training_confirmed} onChange={(e) => set('vfx_no_training_confirmed', e.target.checked)} />
                <label htmlFor="vfx_no_training_confirmed" className="cursor-pointer text-sm" style={{ color: '#1A3D2B' }}>
                  I confirm this tool does not use submitted material for model training, or I have written vendor confirmation that it does not
                </label>
              </div>
              <div>
                <label className="lt-label" htmlFor="vfx_input_type">What was submitted to the AI tool?</label>
                <select id="vfx_input_type" className="lt-select" required value={form.vfx_input_type} onChange={(e) => set('vfx_input_type', e.target.value)}>
                  <option value="">Select input type…</option>
                  {VFX_INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {form.vfx_input_type === 'Plate footage containing performers' && (
                <div className="flex items-start gap-3 rounded" style={{ background: 'rgba(146,100,12,0.07)', border: '1px solid rgba(146,100,12,0.3)', padding: '0.75rem 1rem' }}>
                  <input id="vfx_lct_confirmed" type="checkbox" className="mt-0.5 h-4 w-4 flex-shrink-0" checked={form.vfx_lct_confirmed} onChange={(e) => set('vfx_lct_confirmed', e.target.checked)} />
                  <label htmlFor="vfx_lct_confirmed" className="cursor-pointer text-sm" style={{ color: '#92640c' }}>
                    I have verified a valid Likeness Consent Token exists for all performers in this footage before submitting this receipt
                  </label>
                </div>
              )}
              <div>
                <label className="lt-label" htmlFor="vfx_output_type">What did the AI generate?</label>
                <select id="vfx_output_type" className="lt-select" required value={form.vfx_output_type} onChange={(e) => set('vfx_output_type', e.target.value)}>
                  <option value="">Select output type…</option>
                  {VFX_OUTPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </section>
          <hr className="lt-divider" />
        </>
      )}

      {/* Sound ───────────────────────────────────── */}
      {form.department === 'Sound' && (
        <>
          <section className="mb-8">
            <h2 className="lt-section-heading">Sound — Additional Compliance</h2>
            <div className="space-y-5">
              <div>
                <label className="lt-label" htmlFor="sound_processing_location">Where was audio processed?</label>
                <select id="sound_processing_location" className="lt-select" required value={form.sound_processing_location} onChange={(e) => set('sound_processing_location', e.target.value)}>
                  <option value="">Select location…</option>
                  {SOUND_PROCESSING_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="lt-label" htmlFor="sound_processing_type">Type of processing</label>
                <select id="sound_processing_type" className="lt-select" required value={form.sound_processing_type} onChange={(e) => set('sound_processing_type', e.target.value)}>
                  <option value="">Select type…</option>
                  {SOUND_PROCESSING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-start gap-3">
                <input id="sound_performer_audio" type="checkbox" className="mt-0.5 h-4 w-4" checked={form.sound_performer_audio} onChange={(e) => set('sound_performer_audio', e.target.checked)} />
                <label htmlFor="sound_performer_audio" className="cursor-pointer text-sm" style={{ color: '#1A3D2B' }}>
                  This audio contains identifiable performer dialogue
                </label>
              </div>
              {form.sound_performer_audio && form.sound_processing_location !== '' && form.sound_processing_location !== 'Local software — not uploaded' && (
                <div className="rounded" style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.3)', padding: '0.75rem 1rem' }}>
                  <p className="font-courier font-bold uppercase tracking-wide mb-1" style={{ fontSize: '0.6rem', color: '#b91c1c' }}>Cloud processing — consent check required</p>
                  <p className="text-xs" style={{ color: '#b91c1c', opacity: 0.85 }}>
                    This audio has been cloud-processed. Verify this is within scope of performer consent and your production data security policy. This will be flagged in the Compliance Report.
                  </p>
                </div>
              )}
              <div className="flex items-start gap-3">
                <input id="sound_no_training_confirmed" type="checkbox" className="mt-0.5 h-4 w-4" checked={form.sound_no_training_confirmed} onChange={(e) => set('sound_no_training_confirmed', e.target.checked)} />
                <label htmlFor="sound_no_training_confirmed" className="cursor-pointer text-sm" style={{ color: '#1A3D2B' }}>
                  I confirm this tool does not use submitted audio for model training, or I have written vendor confirmation that it does not
                </label>
              </div>
            </div>
          </section>
          <hr className="lt-divider" />
        </>
      )}

      {/* Writing ─────────────────────────────────── */}
      {form.department === 'Writing' && (
        <>
          <section className="mb-8">
            <h2 className="lt-section-heading">Writing — Additional Compliance</h2>
            <div className="space-y-5">
              <div>
                <label className="lt-label" htmlFor="writing_stage">Stage</label>
                <select id="writing_stage" className="lt-select" required value={form.writing_stage} onChange={(e) => set('writing_stage', e.target.value)}>
                  <option value="">Select stage…</option>
                  {WRITING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="lt-label" htmlFor="writing_submitted_material">What script material was submitted?</label>
                <select id="writing_submitted_material" className="lt-select" required value={form.writing_submitted_material} onChange={(e) => set('writing_submitted_material', e.target.value)}>
                  <option value="">Select material…</option>
                  {WRITING_SUBMITTED_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="lt-label" htmlFor="writing_processing_location">Where was this processed?</label>
                <select id="writing_processing_location" className="lt-select" required value={form.writing_processing_location} onChange={(e) => set('writing_processing_location', e.target.value)}>
                  <option value="">Select location…</option>
                  {WRITING_PROCESSING_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="lt-label" htmlFor="writing_guild_status">Writer guild status</label>
                <select id="writing_guild_status" className="lt-select" required value={form.writing_guild_status} onChange={(e) => set('writing_guild_status', e.target.value)}>
                  <option value="">Select guild status…</option>
                  {WRITING_GUILD_STATUSES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {form.writing_guild_status === 'WGA' && (
                <div className="space-y-4 rounded" style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)', padding: '1rem' }}>
                  <div>
                    <label className="lt-label" htmlFor="writing_wga_writers_count">Number of writers present in this session</label>
                    <input id="writing_wga_writers_count" type="number" min={1} className="lt-input" required placeholder="1" value={form.writing_wga_writers_count} onChange={(e) => set('writing_wga_writers_count', e.target.value)} />
                  </div>
                  <div>
                    <label className="lt-label" htmlFor="writing_wga_registration">WGA script registration status</label>
                    <select id="writing_wga_registration" className="lt-select" required value={form.writing_wga_registration} onChange={(e) => set('writing_wga_registration', e.target.value)}>
                      <option value="">Select registration status…</option>
                      {WGA_SCRIPT_REGISTRATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <p className="font-courier italic" style={{ fontSize: '0.7rem', color: 'rgba(37,99,235,0.8)' }}>
                    By submitting this receipt you confirm disclosure of AI tool use as required under the WGA 2026 Minimum Basic Agreement.
                  </p>
                </div>
              )}

              {form.writing_guild_status === 'WGGB' && (
                <div className="space-y-4 rounded" style={{ background: 'rgba(22,101,52,0.06)', border: '1px solid rgba(22,101,52,0.2)', padding: '1rem' }}>
                  <div>
                    <label className="lt-label" htmlFor="writing_wggb_context">Writing context</label>
                    <select id="writing_wggb_context" className="lt-select" required value={form.writing_wggb_context} onChange={(e) => set('writing_wggb_context', e.target.value)}>
                      <option value="">Select context…</option>
                      {WGGB_WRITING_CONTEXTS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-start gap-3">
                    <input id="writing_wggb_paternity" type="checkbox" className="mt-0.5 h-4 w-4" checked={form.writing_wggb_paternity} onChange={(e) => set('writing_wggb_paternity', e.target.checked)} />
                    <label htmlFor="writing_wggb_paternity" className="cursor-pointer text-sm" style={{ color: '#1A3D2B' }}>
                      I assert my right of paternity in this work under CDPA s.77 as the human author who directed and shaped this material
                    </label>
                  </div>
                  <p className="font-courier italic" style={{ fontSize: '0.7rem', color: '#2D6A4F' }}>
                    By submitting this receipt I confirm transparency of AI tool use as required under the WGGB AI principles.
                  </p>
                </div>
              )}

              {form.writing_guild_status === 'BECTU' && (
                <div className="rounded" style={{ background: '#FAF8F4', border: '1px solid rgba(45,106,79,0.25)', padding: '0.75rem 1rem' }}>
                  <p className="font-courier italic" style={{ fontSize: '0.7rem', color: '#5A8A72' }}>
                    By submitting this receipt I confirm transparency of AI tool use in accordance with BECTU guidelines.
                  </p>
                </div>
              )}

              {(form.writing_guild_status === 'Neither' || form.writing_guild_status === 'Unknown') && (
                <div className="rounded" style={{ background: '#FAF8F4', border: '1px solid rgba(45,106,79,0.25)', padding: '0.75rem 1rem' }}>
                  <p className="text-xs" style={{ color: '#5A8A72' }}>
                    No guild disclosure obligation applies. This receipt is your forensic record of human authorship for copyright purposes.
                  </p>
                </div>
              )}

              <div>
                <label className="lt-label" htmlFor="writing_ai_contribution">What did the AI contribute?</label>
                <select id="writing_ai_contribution" className="lt-select" required value={form.writing_ai_contribution} onChange={(e) => set('writing_ai_contribution', e.target.value)}>
                  <option value="">Select contribution level…</option>
                  {WRITING_AI_CONTRIBUTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-start gap-3">
                  <input id="writing_no_training_confirmed" type="checkbox" className="mt-0.5 h-4 w-4" checked={form.writing_no_training_confirmed} onChange={(e) => set('writing_no_training_confirmed', e.target.checked)} />
                  <label htmlFor="writing_no_training_confirmed" className="cursor-pointer text-sm" style={{ color: '#1A3D2B' }}>
                    I confirm this tool does not use submitted script material for model training, or I have written vendor confirmation that it does not
                  </label>
                </div>
                {!form.writing_no_training_confirmed && (
                  <p className="font-courier rounded mt-2 ml-7" style={{ fontSize: '0.7rem', color: '#92640c', background: 'rgba(146,100,12,0.07)', border: '1px solid rgba(146,100,12,0.25)', padding: '0.4rem 0.75rem' }}>
                    Unconfirmed training data use will be flagged in the Compliance Report.
                  </p>
                )}
              </div>
              <div className="flex items-start gap-3">
                <input id="writing_authorship_declared" type="checkbox" className="mt-0.5 h-4 w-4" checked={form.writing_authorship_declared} onChange={(e) => set('writing_authorship_declared', e.target.checked)} />
                <label htmlFor="writing_authorship_declared" className="cursor-pointer text-sm" style={{ color: '#1A3D2B' }}>
                  I confirm that the material I am submitting for production represents my own creative authorship, shaped and directed by me, with AI used as a tool under my creative control
                </label>
              </div>
            </div>
          </section>
          <hr className="lt-divider" />
        </>
      )}

      {/* LCT ─────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="lt-section-heading">Likeness &amp; Voice (LCT)</h2>
        <div className="flex items-start gap-3 mb-4">
          <input id="lct_required" type="checkbox" className="mt-0.5 h-4 w-4" checked={form.lct_required} onChange={(e) => set('lct_required', e.target.checked)} />
          <label htmlFor="lct_required" className="cursor-pointer text-sm" style={{ color: '#1A3D2B' }}>
            This AI use involves a performer likeness, voice, or identity
          </label>
        </div>

        {form.lct_required && (
          <div className="pl-7 space-y-4">
            <div>
              <label className="lt-label" htmlFor="lct_reference">
                LCT Token Reference <span className="normal-case font-normal" style={{ color: '#5A8A72' }}>(optional)</span>
              </label>
              <input id="lct_reference" className="lt-input" placeholder="LCT token reference, if applicable" value={form.lct_reference} onChange={(e) => set('lct_reference', e.target.value)} />
            </div>
            <div className="flex items-start gap-3">
              <input id="lct_child_performer" type="checkbox" className="mt-0.5 h-4 w-4" checked={form.lct_child_performer} onChange={(e) => set('lct_child_performer', e.target.checked)} />
              <label htmlFor="lct_child_performer" className="cursor-pointer text-sm" style={{ color: '#1A3D2B' }}>
                This is a child performer (under 18)
              </label>
            </div>

            {form.lct_child_performer && (
              <div className="space-y-4">
                <div className="rounded text-xs" style={{ background: 'rgba(146,100,12,0.08)', border: '1px solid rgba(146,100,12,0.4)', padding: '0.75rem 1rem', color: '#92640c' }}>
                  Child performer LCTs are subject to additional legal protections. All AI use flags default to restricted until explicitly authorised by production legal and guardian. This LCT expires at the end of principal photography unless explicitly extended.
                </div>
                <div>
                  <label className="lt-label" htmlFor="lct_child_age_bracket">Age bracket</label>
                  <select id="lct_child_age_bracket" className="lt-select" required value={form.lct_child_age_bracket} onChange={(e) => set('lct_child_age_bracket', e.target.value)}>
                    <option value="">Select age bracket…</option>
                    {LCT_AGE_BRACKETS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lt-label" htmlFor="lct_guardian_name">Parent or legal guardian name</label>
                  <input id="lct_guardian_name" className="lt-input" required placeholder="Full name of parent or legal guardian" value={form.lct_guardian_name} onChange={(e) => set('lct_guardian_name', e.target.value)} />
                </div>
                <div>
                  <label className="lt-label" htmlFor="lct_guardian_consent_ref">Guardian consent reference number</label>
                  <input id="lct_guardian_consent_ref" className="lt-input" required placeholder="Consent form reference number" value={form.lct_guardian_consent_ref} onChange={(e) => set('lct_guardian_consent_ref', e.target.value)} />
                </div>
                <div>
                  <label className="lt-label" htmlFor="lct_performance_licence_ref">
                    UK local authority performance licence reference <span className="normal-case font-normal" style={{ color: '#5A8A72' }}>(optional)</span>
                  </label>
                  <p className="font-courier mb-1.5" style={{ fontSize: '0.7rem', color: '#5A8A72', fontStyle: 'italic' }}>Required for UK productions.</p>
                  <input id="lct_performance_licence_ref" className="lt-input" placeholder="Local authority licence reference, if applicable" value={form.lct_performance_licence_ref} onChange={(e) => set('lct_performance_licence_ref', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <hr className="lt-divider" />

      {/* Notes ───────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="lt-section-heading">
          Notes <span className="normal-case font-normal" style={{ color: '#5A8A72' }}>(optional)</span>
        </h2>
        <textarea
          id="notes"
          className="lt-textarea"
          rows={3}
          placeholder="Any additional context or notes for this receipt…"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </section>

      {error && (
        <div className="rounded mb-6" style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.3)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* Submit bar ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap" style={{ borderTop: '1px solid rgba(45,106,79,0.18)', paddingTop: '1.5rem' }}>
        <p className="font-courier" style={{ fontSize: '0.7rem', color: '#5A8A72', fontStyle: 'italic' }}>
          {isWritingDev
            ? 'This Development stage receipt will be self-authorised and locked.'
            : `Submitting locks this receipt and routes it to ${routingLabel} for AUTH sign-off.`}
        </p>
        <button
          type="submit"
          disabled={submitting || (authBlocked && derivedStatus !== '')}
          className="lt-btn-primary"
          style={{ opacity: (submitting || (authBlocked && derivedStatus !== '')) ? 0.45 : 1 }}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
