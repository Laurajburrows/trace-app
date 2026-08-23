'use client'

import { useState, useEffect, useRef } from 'react'
import { DEPARTMENTS, SEL_REASONS, VFX_DATA_LOCATIONS, VFX_INPUT_TYPES, VFX_OUTPUT_TYPES, SOUND_PROCESSING_LOCATIONS, SOUND_PROCESSING_TYPES, WRITING_STAGES, WRITING_SUBMITTED_MATERIALS, WRITING_PROCESSING_LOCATIONS, WRITING_GUILD_STATUSES, WRITING_AI_CONTRIBUTIONS, WGA_SCRIPT_REGISTRATION_STATUSES, WGGB_WRITING_CONTEXTS, LCT_AGE_BRACKETS, SUBMITTER_ROLES, COLOUR_GRADING_SYSTEMS, EDITORIAL_EDITING_SYSTEMS, EDITORIAL_AI_TOOL_TYPES, DELIVERY_AI_TOOL_TYPES, DELIVERY_FORMATS, RENDER_PROCESSING_LOCATIONS } from '@/lib/types'
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
  arr_description: '',
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
  colour_grading_system: '',
  colour_ai_grading: false,
  colour_performer_footage: false,
  colour_lct_confirmed: false,
  editorial_editing_system: '',
  editorial_ai_tool_type: '',
  editorial_performer_footage: false,
  editorial_lct_confirmed: false,
  delivery_ai_tool_type: '',
  delivery_format: '',
  delivery_no_training_confirmed: false,
  facility_name: '',
  render_processing_location: '',
  facility_ai_policy_confirmed: false,
  input_file_version: '',
  output_file_version: '',
}

type FormState = typeof emptyForm

interface Confirmation {
  id: string
  hash: string
  production_name: string
  selfAuth: boolean
  routedTo: 'hod' | 'producer' | 'exec' | 'self'
}

// --- Session log mode types ---

interface ToolEntryFormState {
  // UI state (not persisted)
  toolQuery: string
  selectedEntry: WhitelistEntry | null
  suggestions: WhitelistEntry[]
  showSuggestions: boolean
  // Persisted fields
  input_file_version: string
  output_file_version: string
  vfx_software: string
  vfx_data_location: string
  vfx_no_training_confirmed: boolean
  vfx_input_type: string
  vfx_output_type: string
  vfx_lct_confirmed: boolean
  colour_grading_system: string
  colour_ai_grading: boolean
  colour_performer_footage: boolean
  colour_lct_confirmed: boolean
  editorial_editing_system: string
  editorial_ai_tool_type: string
  editorial_performer_footage: boolean
  editorial_lct_confirmed: boolean
  sound_processing_location: string
  sound_processing_type: string
  sound_performer_audio: boolean
  sound_no_training_confirmed: boolean
  delivery_ai_tool_type: string
  delivery_format: string
  delivery_no_training_confirmed: boolean
}

function makeEmptyEntry(): ToolEntryFormState {
  return {
    toolQuery: '', selectedEntry: null, suggestions: [], showSuggestions: false,
    input_file_version: '', output_file_version: '',
    vfx_software: '', vfx_data_location: '', vfx_no_training_confirmed: false,
    vfx_input_type: '', vfx_output_type: '', vfx_lct_confirmed: false,
    colour_grading_system: '', colour_ai_grading: false,
    colour_performer_footage: false, colour_lct_confirmed: false,
    editorial_editing_system: '', editorial_ai_tool_type: '',
    editorial_performer_footage: false, editorial_lct_confirmed: false,
    sound_processing_location: '', sound_processing_type: '',
    sound_performer_audio: false, sound_no_training_confirmed: false,
    delivery_ai_tool_type: '', delivery_format: '', delivery_no_training_confirmed: false,
  }
}

// --- StatusBadge ---

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

  // Session log mode state
  const [toolEntries, setToolEntries] = useState<ToolEntryFormState[]>([makeEmptyEntry()])
  const toolRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    fetch('/api/productions').then((r) => r.json()).then(setProductions).catch(() => {})
    fetch('/api/whitelist').then((r) => r.json()).then(setWhitelist).catch(() => {})
  }, [])

  // Reset toolEntries and VFX-only fields when department changes
  useEffect(() => {
    setToolEntries([makeEmptyEntry()])
    if (form.department !== 'VFX') set('scene_usid', '')
  }, [form.department])

  // Click-outside: handles both single toolRef and all session toolRefs
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolRef.current && !toolRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
      toolRefs.current.forEach((ref, i) => {
        if (ref && !ref.contains(e.target as Node)) {
          setToolEntries(prev => {
            if (!prev[i]?.showSuggestions) return prev
            return prev.map((entry, idx) => idx === i ? { ...entry, showSuggestions: false } : entry)
          })
        }
      })
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

  // Session log helpers
  function updateEntry(index: number, updates: Partial<ToolEntryFormState>) {
    setToolEntries(prev => prev.map((e, i) => i === index ? { ...e, ...updates } : e))
  }

  function handleEntryToolInput(index: number, value: string) {
    const q = value.toLowerCase()
    const matches = value.trim().length >= 1
      ? whitelist.filter(e => e.displayName.toLowerCase().includes(q) || e.toolName.includes(q))
      : []
    updateEntry(index, { toolQuery: value, selectedEntry: null, suggestions: matches, showSuggestions: matches.length > 0 && value.trim().length >= 1 })
  }

  function selectEntryFromWhitelist(index: number, entry: WhitelistEntry) {
    updateEntry(index, { toolQuery: entry.displayName, selectedEntry: entry, suggestions: [], showSuggestions: false })
  }

  function addEntry() {
    if (toolEntries.length < 10) setToolEntries(prev => [...prev, makeEmptyEntry()])
  }

  function removeEntry(index: number) {
    setToolEntries(prev => prev.filter((_, i) => i !== index))
  }

  // Derived values — single tool (non-post-prod)
  const derivedStatus: 'GREEN' | 'AMBER' | 'RED' | 'UNVERIFIED' | '' = selectedEntry
    ? (selectedEntry.status as 'GREEN' | 'AMBER' | 'RED')
    : toolQuery.trim().length >= 3
    ? 'UNVERIFIED'
    : ''

  const authBlocked =
    derivedStatus === 'RED' ||
    derivedStatus === 'UNVERIFIED' ||
    derivedStatus === ''

  // Derived values — session log mode
  function entryDerivedStatus(e: ToolEntryFormState): 'GREEN' | 'AMBER' | 'RED' | 'UNVERIFIED' | '' {
    return e.selectedEntry
      ? (e.selectedEntry.status as 'GREEN' | 'AMBER' | 'RED')
      : e.toolQuery.trim().length >= 3 ? 'UNVERIFIED' : ''
  }

  const POST_PROD_DEPTS = ['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC']
  const isPostProd = POST_PROD_DEPTS.includes(form.department)

  const sessionAuthBlocked = toolEntries.some(e => {
    const s = entryDerivedStatus(e)
    return s === 'RED' || s === 'UNVERIFIED' || s === ''
  })

  const sessionHasInput = toolEntries.some(e => e.toolQuery.trim().length >= 1)

  const effectiveAuthBlockedForDisplay = isPostProd
    ? (sessionAuthBlocked && sessionHasInput)
    : (authBlocked && derivedStatus !== '')

  const routingLabel = form.submitter_role === 'hod'
    ? 'Producer'
    : form.submitter_role === 'producer'
    ? 'Exec / OAS'
    : 'HOD'
  const isWritingDev = form.department === 'Writing' && form.writing_stage === 'Development'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.department) return setError('Please select a department.')

    if (isPostProd) {
      // a. Validate render/processing location
      if (!form.render_processing_location) {
        return setError('Please select the render / processing location.')
      }

      // b. Per-entry validation
      for (let i = 0; i < toolEntries.length; i++) {
        const entry = toolEntries[i]
        const label = toolEntries.length > 1 ? ` (Tool ${i + 1})` : ''
        const eStatus = entryDerivedStatus(entry)

        if (!entry.toolQuery.trim()) return setError(`Please enter the AI tool name${label}.`)
        if (eStatus === 'RED' || eStatus === 'UNVERIFIED' || eStatus === '') {
          return setError(`Cannot submit: tool${label} is not approved. Resolve tool status before proceeding.`)
        }

        if (form.department === 'VFX') {
          if (!entry.vfx_software.trim()) return setError(`VFX: Please enter the software name and version${label}.`)
          if (!entry.vfx_data_location) return setError(`VFX: Please select where data was processed${label}.`)
          if (!entry.vfx_no_training_confirmed) return setError(`VFX: Please confirm the training data policy${label}.`)
          if (!entry.vfx_input_type) return setError(`VFX: Please select what was submitted to the AI tool${label}.`)
          if (!entry.vfx_output_type) return setError(`VFX: Please select what the AI generated${label}.`)
          if (entry.vfx_input_type === 'Plate footage containing performers' && !entry.vfx_lct_confirmed) {
            return setError(`VFX: Please confirm a valid LCT exists for all performers in this footage${label}.`)
          }
        }

        if (form.department === 'Sound Post') {
          if (!entry.sound_processing_location) return setError(`Sound Post: Please select where audio was processed${label}.`)
          if (!entry.sound_processing_type) return setError(`Sound Post: Please select the type of processing${label}.`)
          if (!entry.sound_no_training_confirmed) return setError(`Sound Post: Please confirm the training data policy${label}.`)
        }

        if (form.department === 'Colour / DI') {
          if (!entry.colour_grading_system) return setError(`Colour / DI: Please select the grading system${label}.`)
          if (entry.colour_performer_footage && !entry.colour_lct_confirmed) {
            return setError(`Colour / DI: Please confirm LCT verification for footage containing performers${label}.`)
          }
        }

        if (form.department === 'Editorial') {
          if (!entry.editorial_editing_system) return setError(`Editorial: Please select the editing system${label}.`)
          if (!entry.editorial_ai_tool_type) return setError(`Editorial: Please select the type of AI editing tool${label}.`)
          if (entry.editorial_performer_footage && !entry.editorial_lct_confirmed) {
            return setError(`Editorial: Please confirm LCT verification for footage containing performers${label}.`)
          }
        }

        if (form.department === 'Delivery / QC') {
          if (!entry.delivery_ai_tool_type) return setError(`Delivery / QC: Please select the type of AI tool used${label}.`)
          if (!entry.delivery_format) return setError(`Delivery / QC: Please select the delivery format${label}.`)
          if (!entry.delivery_no_training_confirmed) return setError(`Delivery / QC: Please confirm the training data policy${label}.`)
        }
      }

      // c. Validate LCT (form-level)
      if (form.lct_required && form.lct_child_performer) {
        if (!form.lct_child_age_bracket) return setError('LCT: Please select the child performer age bracket.')
        if (!form.lct_guardian_name.trim()) return setError('LCT: Please enter the parent or legal guardian name.')
        if (!form.lct_guardian_consent_ref.trim()) return setError('LCT: Please enter the guardian consent reference number.')
      }

      setSubmitting(true)

      try {
        // d. Build payload with first entry in flat columns, is_session and session_tool_entries
        const first = toolEntries[0]
        const isSession = toolEntries.length > 1
        const payload = {
          ...form,
          ai_tool_used: first.selectedEntry!.displayName,
          tool_status: first.selectedEntry!.status,
          whitelist_condition: first.selectedEntry?.condition || null,
          input_file_version: first.input_file_version || null,
          output_file_version: first.output_file_version || null,
          vfx_software: first.vfx_software || null,
          vfx_data_location: first.vfx_data_location || null,
          vfx_no_training_confirmed: first.vfx_no_training_confirmed,
          vfx_input_type: first.vfx_input_type || null,
          vfx_output_type: first.vfx_output_type || null,
          vfx_lct_confirmed: first.vfx_lct_confirmed,
          colour_grading_system: first.colour_grading_system || null,
          colour_ai_grading: first.colour_ai_grading,
          colour_performer_footage: first.colour_performer_footage,
          colour_lct_confirmed: first.colour_lct_confirmed,
          editorial_editing_system: first.editorial_editing_system || null,
          editorial_ai_tool_type: first.editorial_ai_tool_type || null,
          editorial_performer_footage: first.editorial_performer_footage,
          editorial_lct_confirmed: first.editorial_lct_confirmed,
          sound_processing_location: first.sound_processing_location || null,
          sound_processing_type: first.sound_processing_type || null,
          sound_performer_audio: first.sound_performer_audio,
          sound_no_training_confirmed: first.sound_no_training_confirmed,
          delivery_ai_tool_type: first.delivery_ai_tool_type || null,
          delivery_format: first.delivery_format || null,
          delivery_no_training_confirmed: first.delivery_no_training_confirmed,
          is_session: isSession,
          session_tool_entries: isSession ? toolEntries.map(e => ({
            ai_tool_used: e.selectedEntry!.displayName,
            tool_status: e.selectedEntry!.status,
            whitelist_condition: e.selectedEntry?.condition || null,
            input_file_version: e.input_file_version || null,
            output_file_version: e.output_file_version || null,
            vfx_software: e.vfx_software || null,
            vfx_data_location: e.vfx_data_location || null,
            vfx_no_training_confirmed: e.vfx_no_training_confirmed,
            vfx_input_type: e.vfx_input_type || null,
            vfx_output_type: e.vfx_output_type || null,
            vfx_lct_confirmed: e.vfx_lct_confirmed,
            colour_grading_system: e.colour_grading_system || null,
            colour_ai_grading: e.colour_ai_grading,
            colour_performer_footage: e.colour_performer_footage,
            colour_lct_confirmed: e.colour_lct_confirmed,
            editorial_editing_system: e.editorial_editing_system || null,
            editorial_ai_tool_type: e.editorial_ai_tool_type || null,
            editorial_performer_footage: e.editorial_performer_footage,
            editorial_lct_confirmed: e.editorial_lct_confirmed,
            sound_processing_location: e.sound_processing_location || null,
            sound_processing_type: e.sound_processing_type || null,
            sound_performer_audio: e.sound_performer_audio,
            sound_no_training_confirmed: e.sound_no_training_confirmed,
            delivery_ai_tool_type: e.delivery_ai_tool_type || null,
            delivery_format: e.delivery_format || null,
            delivery_no_training_confirmed: e.delivery_no_training_confirmed,
          })) : null,
        }

        // e. Submit
        const res = await fetch('/api/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error('Submission failed')

        const receipt = await res.json()
        const selfAuth = false
        const routedTo: Confirmation['routedTo'] = form.submitter_role === 'hod'
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

      return
    }

    // Non-post-prod path
    if (!form.ai_tool_used) return setError('Please enter the AI tool name.')
    if (authBlocked) return setError('Cannot submit: tool is not approved. Resolve tool status before proceeding.')

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
        is_session: false,
        session_tool_entries: null,
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
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${confirmation.selfAuth ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            {confirmation.selfAuth ? (
              <svg className="w-5 h-5 text-status-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-status-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-trace-forest">
              {confirmation.selfAuth
                ? 'Receipt submitted — self-authorised'
                : `Receipt submitted — pending ${queueLabel}`}
            </h2>
            <p className="text-sm text-gray-500">Production: {confirmation.production_name}</p>
          </div>
        </div>

        {confirmation.selfAuth ? (
          <div className="rounded border border-green-200 bg-green-50 px-4 py-3 mb-6">
            <p className="text-sm text-green-800">
              This Development stage receipt has been self-authorised and locked. It will be acknowledged by the OAS when the project enters production.
            </p>
          </div>
        ) : (
          <div className="rounded border border-yellow-200 bg-yellow-50 px-4 py-3 mb-6">
            <p className="text-sm text-yellow-800">
              This receipt is locked and queued for AUTH sign-off. A {queueLabel.replace(' Sign-off', '')} can review and sign it from the <strong>{queueLabel}</strong> page.
            </p>
          </div>
        )}

        <div className="mb-8">
          <p className="label">Receipt ID</p>
          <p className="font-mono text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all">
            {confirmation.id}
          </p>
          {confirmation.selfAuth && confirmation.hash ? (
            <>
              <p className="label mt-4">TRACE Twin Lock — SHA-256</p>
              <p className="font-mono text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 break-all text-gray-600 mt-1">
                {confirmation.hash}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
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
              setToolEntries([makeEmptyEntry()])
              setForm({ ...emptyForm, production_name: form.production_name })
              fetch('/api/productions').then(r => r.json()).then(setProductions).catch(() => {})
            }}
            className="btn-primary"
          >
            Log Another Receipt
          </button>
          <a href={queueHref} className="btn-secondary">
            {queueLabel} Queue
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
          {form.department === 'VFX' && (
            <div>
              <label className="label" htmlFor="scene_usid">Shot Reference</label>
              <p className="text-xs text-gray-400 mb-1.5">The VFX shot code for this work — e.g. VFX_0023, SC23_045A, or your production&apos;s shot identifier.</p>
              <input
                id="scene_usid"
                className="input"
                placeholder="e.g. VFX_0023, SC23_045A"
                value={form.scene_usid}
                onChange={(e) => set('scene_usid', e.target.value)}
              />
            </div>
          )}
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
          <div className="sm:col-span-2 pt-1">
            <p className="label mb-1">Your position on this production</p>
            <p className="text-xs text-gray-400 mb-3">Determines which sign-off queue this receipt routes to.</p>
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
                  <span className="text-sm text-gray-700">{r.label}</span>
                </label>
              ))}
            </div>
            {form.submitter_role !== 'crew' && (
              <p className="text-xs mt-2 font-medium text-status-amber uppercase tracking-wide">
                → Routes to {form.submitter_role === 'hod' ? 'Producer' : 'Exec / OAS'} Sign-off Queue
              </p>
            )}
          </div>

          {isPostProd && (
            <>
              <div className="sm:col-span-2 pt-4" style={{ borderTop: '1px solid #E5E7EB' }}>
                <label className="label" htmlFor="facility_name">
                  Facility name <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <p className="text-xs text-gray-400 mb-1.5">
                  The post production facility where this work was carried out — leave blank if working remotely or in-house.
                </p>
                <input
                  id="facility_name"
                  className="input"
                  placeholder="e.g. Framestore, Goldcrest, or leave blank if in-house"
                  value={form.facility_name}
                  onChange={(e) => set('facility_name', e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="render_processing_location">Render / processing location</label>
                <select
                  id="render_processing_location"
                  className="select"
                  required
                  value={form.render_processing_location}
                  onChange={(e) => set('render_processing_location', e.target.value)}
                >
                  <option value="">Select location…</option>
                  {RENDER_PROCESSING_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-start gap-3">
                  <input
                    id="facility_ai_policy_confirmed"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss"
                    checked={form.facility_ai_policy_confirmed}
                    onChange={(e) => set('facility_ai_policy_confirmed', e.target.checked)}
                  />
                  <div>
                    <label htmlFor="facility_ai_policy_confirmed" className="text-sm text-gray-700 cursor-pointer font-medium">
                      Facility AI policy confirmed
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Confirm the facility has provided written confirmation of their AI tool use policy — including which tools are used on production materials, where data is processed and stored, and that production material will not be used for model training. If no written confirmation has been obtained, leave unchecked — this will be flagged in the Compliance Report.
                    </p>
                  </div>
                </div>
                {!form.facility_ai_policy_confirmed && (
                  <div className="mt-2 ml-7 rounded border border-yellow-300 bg-yellow-50 px-4 py-3">
                    <p className="text-xs text-yellow-800">
                      No facility AI policy confirmation on record. This will appear as an unconfirmed item in the Compliance Report. Obtain written confirmation from the facility before delivery.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* AI Tool — session log mode for post-prod, single tool for all others */}
      {isPostProd ? (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="section-heading">AI Tool{toolEntries.length > 1 ? 's' : ''}</h2>
            {toolEntries.length > 1 && (
              <span className="text-xs font-semibold text-trace-forest bg-trace-pale px-2.5 py-0.5 rounded-full">
                Session — {toolEntries.length} tools
              </span>
            )}
          </div>
          {toolEntries.length > 1 && (
            <p className="text-xs text-gray-400 mb-5">
              Session receipt — logging {toolEntries.length} tool interactions. The POR, SEL, ARR, and AUTH fields below apply to this session as a whole.
            </p>
          )}

          {toolEntries.map((entry, index) => {
            const eStatus = entryDerivedStatus(entry)
            return (
              <div key={index} className={index > 0 ? 'mt-8 pt-6 border-t-2 border-dashed border-gray-200' : ''}>
                {toolEntries.length > 1 && (
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Tool {index + 1}</p>
                    {index > 0 && (
                      <button type="button" onClick={() => removeEntry(index)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                        Remove this tool
                      </button>
                    )}
                  </div>
                )}

                {/* Tool Name */}
                <div className="mb-4" ref={(el) => { toolRefs.current[index] = el }}>
                  <label className="label" htmlFor={`ai_tool_${index}`}>Tool Name</label>
                  <p className="text-xs text-gray-400 mb-1.5">Start typing to search the production whitelist. Status is set automatically.</p>
                  <div className="relative">
                    <input
                      id={`ai_tool_${index}`}
                      className="input"
                      autoComplete="off"
                      placeholder="e.g. Adobe Firefly, Runway Gen-3, Eleven Labs…"
                      value={entry.toolQuery}
                      onChange={(e) => handleEntryToolInput(index, e.target.value)}
                      onFocus={() => entry.toolQuery.length >= 1 && updateEntry(index, { showSuggestions: entry.suggestions.length > 0 })}
                    />
                    {entry.showSuggestions && entry.suggestions.length > 0 && (
                      <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {entry.suggestions.map((sug) => (
                          <li key={sug.id}>
                            <button
                              type="button"
                              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-trace-pale text-left transition-colors"
                              onMouseDown={(e) => { e.preventDefault(); selectEntryFromWhitelist(index, sug) }}
                            >
                              <span className="text-sm font-medium text-gray-800">{sug.displayName}</span>
                              <span className={`status-badge ml-3 flex-shrink-0 ${sug.status === 'GREEN' ? 'status-green' : sug.status === 'AMBER' ? 'status-amber' : 'status-red'}`}>
                                {sug.status}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {entry.toolQuery.trim().length >= 3 && !entry.selectedEntry && entry.suggestions.length === 0 && (
                    <p className="text-xs text-red-600 mt-2 font-medium">Tool not found on production whitelist — refer to OAS before proceeding.</p>
                  )}
                </div>

                {/* Tool Status */}
                <div className="mb-4">
                  <p className="label mb-2">Tool Status <span className="normal-case font-normal text-gray-400">(auto-populated from whitelist)</span></p>
                  {eStatus ? (
                    <StatusBadge status={eStatus} condition={entry.selectedEntry?.condition} requiresLCT={entry.selectedEntry?.requiresLCT} />
                  ) : (
                    <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-400">
                      Enter a tool name above to check whitelist status.
                    </div>
                  )}
                </div>

                {/* File versions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-2" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <div>
                    <label className="label" htmlFor={`input_ver_${index}`}>
                      Input file version <span className="normal-case font-normal text-gray-400">(recommended)</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-1.5">The version of the file submitted to the AI tool.</p>
                    <input
                      id={`input_ver_${index}`}
                      className="input"
                      placeholder="e.g. v003, VFX_0023_comp_v012"
                      value={entry.input_file_version}
                      onChange={(e) => updateEntry(index, { input_file_version: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor={`output_ver_${index}`}>
                      Output file version <span className="normal-case font-normal text-gray-400">(recommended)</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-1.5">The version produced after AI processing.</p>
                    <input
                      id={`output_ver_${index}`}
                      className="input"
                      placeholder="e.g. v004, VFX_0023_comp_v013"
                      value={entry.output_file_version}
                      onChange={(e) => updateEntry(index, { output_file_version: e.target.value })}
                    />
                  </div>
                </div>

                {/* VFX-specific fields */}
                {form.department === 'VFX' && (
                  <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">VFX — Tool Compliance</p>
                    <div>
                      <label className="label" htmlFor={`vfx_sw_${index}`}>Software and version used</label>
                      <input id={`vfx_sw_${index}`} className="input" placeholder="e.g. Nuke 14.0, Runway Gen-3, Topaz Video AI 4.2" value={entry.vfx_software} onChange={(e) => updateEntry(index, { vfx_software: e.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`vfx_loc_${index}`}>Where was data processed?</label>
                      <select id={`vfx_loc_${index}`} className="select" value={entry.vfx_data_location} onChange={(e) => updateEntry(index, { vfx_data_location: e.target.value })}>
                        <option value="">Select location…</option>
                        {VFX_DATA_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="flex items-start gap-3">
                      <input id={`vfx_train_${index}`} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={entry.vfx_no_training_confirmed} onChange={(e) => updateEntry(index, { vfx_no_training_confirmed: e.target.checked })} />
                      <label htmlFor={`vfx_train_${index}`} className="text-sm text-gray-700 cursor-pointer">
                        I confirm this tool does not use submitted material for model training, or I have written vendor confirmation that it does not
                      </label>
                    </div>
                    <div>
                      <label className="label" htmlFor={`vfx_in_${index}`}>What was submitted to the AI tool?</label>
                      <select id={`vfx_in_${index}`} className="select" value={entry.vfx_input_type} onChange={(e) => updateEntry(index, { vfx_input_type: e.target.value, vfx_lct_confirmed: false })}>
                        <option value="">Select input type…</option>
                        {VFX_INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    {entry.vfx_input_type === 'Plate footage containing performers' && (
                      <div className="flex items-start gap-3 rounded border border-yellow-300 bg-yellow-50 px-4 py-3">
                        <input id={`vfx_lct_${index}`} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={entry.vfx_lct_confirmed} onChange={(e) => updateEntry(index, { vfx_lct_confirmed: e.target.checked })} />
                        <label htmlFor={`vfx_lct_${index}`} className="text-sm text-gray-700 cursor-pointer">
                          I have verified a valid Likeness Consent Token exists for all performers in this footage before submitting this receipt
                        </label>
                      </div>
                    )}
                    <div>
                      <label className="label" htmlFor={`vfx_out_${index}`}>What did the AI generate?</label>
                      <select id={`vfx_out_${index}`} className="select" value={entry.vfx_output_type} onChange={(e) => updateEntry(index, { vfx_output_type: e.target.value })}>
                        <option value="">Select output type…</option>
                        {VFX_OUTPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Sound Post specific */}
                {form.department === 'Sound Post' && (
                  <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Sound Post — Tool Compliance</p>
                    <div>
                      <label className="label" htmlFor={`snd_loc_${index}`}>Where was audio processed?</label>
                      <select id={`snd_loc_${index}`} className="select" value={entry.sound_processing_location} onChange={(e) => updateEntry(index, { sound_processing_location: e.target.value })}>
                        <option value="">Select location…</option>
                        {SOUND_PROCESSING_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`snd_type_${index}`}>Type of processing</label>
                      <select id={`snd_type_${index}`} className="select" value={entry.sound_processing_type} onChange={(e) => updateEntry(index, { sound_processing_type: e.target.value })}>
                        <option value="">Select type…</option>
                        {SOUND_PROCESSING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex items-start gap-3">
                      <input id={`snd_perf_${index}`} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={entry.sound_performer_audio} onChange={(e) => updateEntry(index, { sound_performer_audio: e.target.checked })} />
                      <label htmlFor={`snd_perf_${index}`} className="text-sm text-gray-700 cursor-pointer">This audio contains identifiable performer dialogue</label>
                    </div>
                    {entry.sound_performer_audio && entry.sound_processing_location !== '' && entry.sound_processing_location !== 'Local software — not uploaded' && (
                      <div className="rounded border border-red-300 bg-red-50 px-4 py-3">
                        <p className="text-sm font-semibold text-red-700 mb-1">Cloud processing — consent check required</p>
                        <p className="text-xs text-red-600">This audio has been cloud-processed. Verify this is within scope of performer consent and your production data security policy.</p>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <input id={`snd_train_${index}`} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={entry.sound_no_training_confirmed} onChange={(e) => updateEntry(index, { sound_no_training_confirmed: e.target.checked })} />
                      <label htmlFor={`snd_train_${index}`} className="text-sm text-gray-700 cursor-pointer">I confirm this tool does not use submitted audio for model training, or I have written vendor confirmation that it does not</label>
                    </div>
                  </div>
                )}

                {/* Colour/DI specific */}
                {form.department === 'Colour / DI' && (
                  <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Colour / DI — Tool Compliance</p>
                    <div>
                      <label className="label" htmlFor={`col_sys_${index}`}>Grading system</label>
                      <select id={`col_sys_${index}`} className="select" value={entry.colour_grading_system} onChange={(e) => updateEntry(index, { colour_grading_system: e.target.value })}>
                        <option value="">Select grading system…</option>
                        {COLOUR_GRADING_SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-start gap-3">
                      <input id={`col_ai_${index}`} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={entry.colour_ai_grading} onChange={(e) => updateEntry(index, { colour_ai_grading: e.target.checked })} />
                      <label htmlFor={`col_ai_${index}`} className="text-sm text-gray-700 cursor-pointer">AI-assisted grading tools used</label>
                    </div>
                    <div className="flex items-start gap-3">
                      <input id={`col_perf_${index}`} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={entry.colour_performer_footage} onChange={(e) => updateEntry(index, { colour_performer_footage: e.target.checked, colour_lct_confirmed: false })} />
                      <label htmlFor={`col_perf_${index}`} className="text-sm text-gray-700 cursor-pointer">This grade was applied to footage containing performers</label>
                    </div>
                    {entry.colour_performer_footage && (
                      <div className="flex items-start gap-3 rounded border border-yellow-300 bg-yellow-50 px-4 py-3">
                        <input id={`col_lct_${index}`} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={entry.colour_lct_confirmed} onChange={(e) => updateEntry(index, { colour_lct_confirmed: e.target.checked })} />
                        <label htmlFor={`col_lct_${index}`} className="text-sm text-gray-700 cursor-pointer">I have verified a valid Likeness Consent Token exists for all performers in this footage before submitting this receipt</label>
                      </div>
                    )}
                  </div>
                )}

                {/* Editorial specific */}
                {form.department === 'Editorial' && (
                  <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Editorial — Tool Compliance</p>
                    <div>
                      <label className="label" htmlFor={`ed_sys_${index}`}>Editing system</label>
                      <select id={`ed_sys_${index}`} className="select" value={entry.editorial_editing_system} onChange={(e) => updateEntry(index, { editorial_editing_system: e.target.value })}>
                        <option value="">Select editing system…</option>
                        {EDITORIAL_EDITING_SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`ed_tool_${index}`}>Type of AI editing tool used</label>
                      <select id={`ed_tool_${index}`} className="select" value={entry.editorial_ai_tool_type} onChange={(e) => updateEntry(index, { editorial_ai_tool_type: e.target.value })}>
                        <option value="">Select tool type…</option>
                        {EDITORIAL_AI_TOOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex items-start gap-3">
                      <input id={`ed_perf_${index}`} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={entry.editorial_performer_footage} onChange={(e) => updateEntry(index, { editorial_performer_footage: e.target.checked, editorial_lct_confirmed: false })} />
                      <label htmlFor={`ed_perf_${index}`} className="text-sm text-gray-700 cursor-pointer">AI tool applied to footage containing performers</label>
                    </div>
                    {entry.editorial_performer_footage && (
                      <div className="flex items-start gap-3 rounded border border-yellow-300 bg-yellow-50 px-4 py-3">
                        <input id={`ed_lct_${index}`} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={entry.editorial_lct_confirmed} onChange={(e) => updateEntry(index, { editorial_lct_confirmed: e.target.checked })} />
                        <label htmlFor={`ed_lct_${index}`} className="text-sm text-gray-700 cursor-pointer">I have verified a valid Likeness Consent Token exists for all performers in this footage before submitting this receipt</label>
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery/QC specific */}
                {form.department === 'Delivery / QC' && (
                  <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Delivery / QC — Tool Compliance</p>
                    <div>
                      <label className="label" htmlFor={`del_tool_${index}`}>Type of AI tool used at delivery</label>
                      <select id={`del_tool_${index}`} className="select" value={entry.delivery_ai_tool_type} onChange={(e) => updateEntry(index, { delivery_ai_tool_type: e.target.value })}>
                        <option value="">Select tool type…</option>
                        {DELIVERY_AI_TOOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`del_fmt_${index}`}>Delivery format</label>
                      <select id={`del_fmt_${index}`} className="select" value={entry.delivery_format} onChange={(e) => updateEntry(index, { delivery_format: e.target.value })}>
                        <option value="">Select format…</option>
                        {DELIVERY_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="flex items-start gap-3">
                      <input id={`del_train_${index}`} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={entry.delivery_no_training_confirmed} onChange={(e) => updateEntry(index, { delivery_no_training_confirmed: e.target.checked })} />
                      <label htmlFor={`del_train_${index}`} className="text-sm text-gray-700 cursor-pointer">I confirm this tool does not use submitted material for model training, or I have written vendor confirmation that it does not</label>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add another tool button */}
          {toolEntries.length < 10 ? (
            <button
              type="button"
              onClick={addEntry}
              className="mt-6 w-full py-3 rounded border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-trace-moss hover:text-trace-moss transition-colors"
            >
              + Add another tool to this session
            </button>
          ) : (
            <p className="mt-4 text-xs text-gray-400 text-center">Maximum of 10 tools per session reached.</p>
          )}
        </section>
      ) : (
        /* Single tool — non-post-prod */
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
      )}

      {/* TRACE Four-Point Log */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="section-heading">TRACE Four-Point Log</h2>

        {/* Sequence indicator */}
        <div className="flex items-center gap-1.5 mb-5 flex-wrap">
          {['POR', 'SEL', 'ARR', 'AUTH'].map((step, i) => (
            <div key={step} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-xs text-gray-300 select-none">›</span>
              )}
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ color: '#2D6A4F', backgroundColor: '#F0FAF4', border: '1px solid #D4EDE1' }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="por_description">POR — Prompt of Record</label>
            <p className="text-xs text-gray-400 mb-1">What did you ask the AI to do? Describe your prompt — then describe what the AI produced.</p>
            <textarea
              id="por_description"
              className="textarea"
              rows={4}
              required
              placeholder="Describe your prompt and what the AI produced in response…"
              value={form.por_description}
              onChange={(e) => set('por_description', e.target.value)}
            />
          </div>

          <div>
            <p className="label">SEL — Selection</p>
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
                    required
                    placeholder="Describe your selection reasoning…"
                    value={form.sel_detail}
                    onChange={(e) => set('sel_detail', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="arr_description">ARR — Where did you end up?</label>
            <p className="text-xs text-gray-400 mb-1">The final version after working with the AI output — not a description of every change, just where you ended up.</p>
            <textarea
              id="arr_description"
              className="textarea"
              rows={3}
              required
              placeholder="Describe where you ended up after working with the AI output…"
              value={form.arr_description}
              onChange={(e) => set('arr_description', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* AUTH */}
      <section className={`bg-white rounded-lg p-6 ${effectiveAuthBlockedForDisplay ? 'border-2 border-red-400' : 'border border-gray-200'}`}>
        <h2 className="section-heading">AUTH — Authorial Control</h2>

        {effectiveAuthBlockedForDisplay ? (
          <div className="rounded bg-red-50 border border-red-300 px-4 py-3">
            <p className="text-sm font-semibold text-red-700 mb-1">Cannot proceed.</p>
            <p className="text-xs text-red-600">
              {isPostProd
                ? 'One or more tools have not been approved for production use. Resolve all tool statuses before proceeding.'
                : 'This tool has not been approved for production use. Contact the OAS before proceeding.'}
            </p>
          </div>
        ) : isWritingDev ? (
          <div className="rounded bg-green-50 border border-green-200 px-4 py-3">
            <p className="text-sm font-medium text-trace-forest mb-1">Self-authorised — Development stage</p>
            <p className="text-xs text-gray-600">
              Development stage receipts are self-authorised and will be acknowledged by the OAS when the project enters production.
            </p>
          </div>
        ) : (
          <div className="rounded bg-trace-pale border border-gray-200 px-4 py-3">
            <p className="text-sm font-medium text-trace-forest mb-1">Stage 1 of 2 — Crew confirmation → {routingLabel} sign-off</p>
            <p className="text-xs text-gray-600">
              Submitting this receipt locks it and sends it to {routingLabel} for review. {routingLabel} will apply the AUTH signature from the sign-off queue.
            </p>
          </div>
        )}
      </section>

      {/* Sound — non-post-prod Sound only */}
      {form.department === 'Sound' && (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="section-heading">Sound — Additional Compliance</h2>
          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="sound_processing_location">Where was audio processed?</label>
              <select id="sound_processing_location" className="select" required value={form.sound_processing_location} onChange={(e) => set('sound_processing_location', e.target.value)}>
                <option value="">Select location…</option>
                {SOUND_PROCESSING_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sound_processing_type">Type of processing</label>
              <select id="sound_processing_type" className="select" required value={form.sound_processing_type} onChange={(e) => set('sound_processing_type', e.target.value)}>
                <option value="">Select type…</option>
                {SOUND_PROCESSING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-start gap-3">
              <input id="sound_performer_audio" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={form.sound_performer_audio} onChange={(e) => set('sound_performer_audio', e.target.checked)} />
              <label htmlFor="sound_performer_audio" className="text-sm text-gray-700 cursor-pointer">
                This audio contains identifiable performer dialogue
              </label>
            </div>
            {form.sound_performer_audio && form.sound_processing_location !== '' && form.sound_processing_location !== 'Local software — not uploaded' && (
              <div className="rounded border border-red-300 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-700 mb-1">Cloud processing — consent check required</p>
                <p className="text-xs text-red-600">
                  This audio has been cloud-processed. Verify this is within scope of performer consent and your production data security policy. This will be flagged in the Compliance Report.
                </p>
              </div>
            )}
            <div className="flex items-start gap-3">
              <input id="sound_no_training_confirmed" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={form.sound_no_training_confirmed} onChange={(e) => set('sound_no_training_confirmed', e.target.checked)} />
              <label htmlFor="sound_no_training_confirmed" className="text-sm text-gray-700 cursor-pointer">
                I confirm this tool does not use submitted audio for model training, or I have written vendor confirmation that it does not
              </label>
            </div>
          </div>
        </section>
      )}

      {/* Writing */}
      {form.department === 'Writing' && (
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="section-heading">Writing — Additional Compliance</h2>
          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="writing_stage">Stage</label>
              <select id="writing_stage" className="select" required value={form.writing_stage} onChange={(e) => set('writing_stage', e.target.value)}>
                <option value="">Select stage…</option>
                {WRITING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="writing_submitted_material">What script material was submitted?</label>
              <select id="writing_submitted_material" className="select" required value={form.writing_submitted_material} onChange={(e) => set('writing_submitted_material', e.target.value)}>
                <option value="">Select material…</option>
                {WRITING_SUBMITTED_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="writing_processing_location">Where was this processed?</label>
              <select id="writing_processing_location" className="select" required value={form.writing_processing_location} onChange={(e) => set('writing_processing_location', e.target.value)}>
                <option value="">Select location…</option>
                {WRITING_PROCESSING_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="writing_guild_status">Writer guild status</label>
              <select id="writing_guild_status" className="select" required value={form.writing_guild_status} onChange={(e) => set('writing_guild_status', e.target.value)}>
                <option value="">Select guild status…</option>
                {WRITING_GUILD_STATUSES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {form.writing_guild_status === 'WGA' && (
              <div className="space-y-4 rounded border border-blue-200 bg-blue-50/40 px-4 py-4">
                <div>
                  <label className="label" htmlFor="writing_wga_writers_count">Number of writers present in this session</label>
                  <input id="writing_wga_writers_count" type="number" min={1} className="input" required placeholder="1" value={form.writing_wga_writers_count} onChange={(e) => set('writing_wga_writers_count', e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="writing_wga_registration">WGA script registration status</label>
                  <select id="writing_wga_registration" className="select" required value={form.writing_wga_registration} onChange={(e) => set('writing_wga_registration', e.target.value)}>
                    <option value="">Select registration status…</option>
                    {WGA_SCRIPT_REGISTRATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <p className="text-xs text-blue-800 italic">
                  By submitting this receipt you confirm disclosure of AI tool use as required under the WGA 2026 Minimum Basic Agreement.
                </p>
              </div>
            )}

            {form.writing_guild_status === 'WGGB' && (
              <div className="space-y-4 rounded border border-trace-forest/20 bg-trace-pale/50 px-4 py-4">
                <div>
                  <label className="label" htmlFor="writing_wggb_context">Writing context</label>
                  <select id="writing_wggb_context" className="select" required value={form.writing_wggb_context} onChange={(e) => set('writing_wggb_context', e.target.value)}>
                    <option value="">Select context…</option>
                    {WGGB_WRITING_CONTEXTS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-start gap-3">
                  <input id="writing_wggb_paternity" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={form.writing_wggb_paternity} onChange={(e) => set('writing_wggb_paternity', e.target.checked)} />
                  <label htmlFor="writing_wggb_paternity" className="text-sm text-gray-700 cursor-pointer">
                    I assert my right of paternity in this work under CDPA s.77 as the human author who directed and shaped this material
                  </label>
                </div>
                <p className="text-xs text-trace-forest italic">
                  By submitting this receipt I confirm transparency of AI tool use as required under WGGB AI principles and my contractual obligations.
                </p>
              </div>
            )}

            {(form.writing_guild_status === 'Neither' || form.writing_guild_status === 'Unknown') && (
              <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-600">
                  No guild disclosure obligation applies. This receipt is your forensic record of human authorship for copyright and contractual purposes.
                </p>
              </div>
            )}

            <div>
              <label className="label" htmlFor="writing_ai_contribution">What did the AI contribute?</label>
              <select id="writing_ai_contribution" className="select" required value={form.writing_ai_contribution} onChange={(e) => set('writing_ai_contribution', e.target.value)}>
                <option value="">Select contribution level…</option>
                {WRITING_AI_CONTRIBUTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-start gap-3">
                <input id="writing_no_training_confirmed" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={form.writing_no_training_confirmed} onChange={(e) => set('writing_no_training_confirmed', e.target.checked)} />
                <label htmlFor="writing_no_training_confirmed" className="text-sm text-gray-700 cursor-pointer">
                  I confirm this tool does not use submitted script material for model training, or I have written vendor confirmation that it does not
                </label>
              </div>
              {!form.writing_no_training_confirmed && (
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mt-2 ml-7">
                  Unconfirmed training data use will be flagged in the Compliance Report.
                </p>
              )}
            </div>
            <div className="flex items-start gap-3">
              <input id="writing_authorship_declared" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={form.writing_authorship_declared} onChange={(e) => set('writing_authorship_declared', e.target.checked)} />
              <label htmlFor="writing_authorship_declared" className="text-sm text-gray-700 cursor-pointer">
                I confirm that the material I am submitting for production represents my own creative authorship, shaped and directed by me, with AI used as a tool under my creative control
              </label>
            </div>
          </div>
        </section>
      )}

      {/* LCT */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="section-heading">Likeness &amp; Voice (LCT)</h2>
        <div className="flex items-start gap-3 mb-4">
          <input id="lct_required" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={form.lct_required} onChange={(e) => set('lct_required', e.target.checked)} />
          <label htmlFor="lct_required" className="text-sm text-gray-700 cursor-pointer">
            This AI use involves a performer likeness, voice, or identity
          </label>
        </div>

        {form.lct_required && (
          <div className="pl-7 space-y-4">
            <div>
              <label className="label" htmlFor="lct_reference">LCT Token Reference <span className="normal-case font-normal">(optional)</span></label>
              <input id="lct_reference" className="input" placeholder="LCT token reference, if applicable" value={form.lct_reference} onChange={(e) => set('lct_reference', e.target.value)} />
            </div>
            <div className="flex items-start gap-3">
              <input id="lct_child_performer" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss" checked={form.lct_child_performer} onChange={(e) => set('lct_child_performer', e.target.checked)} />
              <label htmlFor="lct_child_performer" className="text-sm text-gray-700 cursor-pointer">
                This is a child performer (under 18)
              </label>
            </div>
            {form.lct_child_performer && (
              <div className="space-y-4">
                <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Child performer LCTs are subject to additional legal protections. All AI use flags default to restricted until explicitly authorised by production legal and guardian. This LCT expires at the end of principal photography unless explicitly extended.
                </div>
                <div>
                  <label className="label" htmlFor="lct_child_age_bracket">Age bracket</label>
                  <select id="lct_child_age_bracket" className="select" required value={form.lct_child_age_bracket} onChange={(e) => set('lct_child_age_bracket', e.target.value)}>
                    <option value="">Select age bracket…</option>
                    {LCT_AGE_BRACKETS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="lct_guardian_name">Parent or legal guardian name</label>
                  <input id="lct_guardian_name" className="input" required placeholder="Full name of parent or legal guardian" value={form.lct_guardian_name} onChange={(e) => set('lct_guardian_name', e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="lct_guardian_consent_ref">Guardian consent reference number</label>
                  <input id="lct_guardian_consent_ref" className="input" required placeholder="Consent form reference number" value={form.lct_guardian_consent_ref} onChange={(e) => set('lct_guardian_consent_ref', e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="lct_performance_licence_ref">UK local authority performance licence reference <span className="normal-case font-normal">(optional)</span></label>
                  <p className="text-xs text-gray-400 mb-1.5">Required for UK productions.</p>
                  <input id="lct_performance_licence_ref" className="input" placeholder="Local authority licence reference, if applicable" value={form.lct_performance_licence_ref} onChange={(e) => set('lct_performance_licence_ref', e.target.value)} />
                </div>
              </div>
            )}
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

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-gray-400">
          {isWritingDev
            ? 'This Development stage receipt will be self-authorised and locked.'
            : `Submitting locks this receipt and routes it to ${routingLabel} for AUTH sign-off.`}
        </p>
        <button
          type="submit"
          disabled={submitting || effectiveAuthBlockedForDisplay}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? 'Submitting…'
            : isWritingDev
            ? 'Confirm and self-authorise'
            : `Confirm and send to ${routingLabel}`}
        </button>
      </div>
    </form>
  )
}
