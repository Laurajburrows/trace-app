'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { DEPARTMENTS } from '@/lib/types'
import type { Receipt, Department, ToolStatus, SessionToolEntry } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  GREEN: 'status-green',
  AMBER: 'status-amber',
  YELLOW: 'status-amber',
  RED: 'status-red',
  UNVERIFIED: 'status-red',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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

function exportCSV(receipts: Receipt[]) {
  const cols = [
    'id', 'production_name', 'date', 'department', 'crew_member_name', 'crew_role',
    'scene_usid', 'ai_tool_used', 'tool_status', 'por_description',
    'sel_output', 'sel_description', 'sel_detail',
    'arr_description', 'auth_signer', 'auth_timestamp', 'lct_required', 'lct_reference', 'notes',
  ]

  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return `"${s.replace(/"/g, '""')}"`
  }

  const rows = [
    cols.join(','),
    ...receipts.map((r) =>
      cols.map((c) => esc(r[c as keyof Receipt])).join(',')
    ),
  ].join('\n')

  const blob = new Blob([rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `TRACE-Receipt-Log-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReceiptLog() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    production: '',
    department: '' as Department | '',
    status: '' as ToolStatus | '',
    dateFrom: '',
    dateTo: '',
    authSigner: '',
  })

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.production) params.set('production', filters.production)
    if (filters.department) params.set('department', filters.department)
    if (filters.status) params.set('status', filters.status)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (filters.authSigner) params.set('authSigner', filters.authSigner)

    const res = await fetch(`/api/receipts?${params}`)
    const data = await res.json()
    setReceipts(data)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  function setFilter(k: keyof typeof filters, v: string) {
    setFilters((prev) => ({ ...prev, [k]: v }))
  }

  function clearFilters() {
    setFilters({ production: '', department: '', status: '', dateFrom: '', dateTo: '', authSigner: '' })
  }

  const hasFilters = Object.values(filters).some((v) => v !== '')

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg p-4" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="label">Production</label>
            <input
              className="input"
              placeholder="Filter…"
              value={filters.production}
              onChange={(e) => setFilter('production', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Department</label>
            <select
              className="select"
              value={filters.department}
              onChange={(e) => setFilter('department', e.target.value as Department | '')}
            >
              <option value="">All</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tool Status</label>
            <select
              className="select"
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value as ToolStatus | '')}
            >
              <option value="">All</option>
              {(['GREEN', 'AMBER', 'RED'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date From</label>
            <input
              type="date"
              className="input"
              value={filters.dateFrom}
              onChange={(e) => setFilter('dateFrom', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Date To</label>
            <input
              type="date"
              className="input"
              value={filters.dateTo}
              onChange={(e) => setFilter('dateTo', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Auth Signer</label>
            <input
              className="input"
              placeholder="Filter…"
              value={filters.authSigner}
              onChange={(e) => setFilter('authSigner', e.target.value)}
            />
          </div>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="mt-3 font-courier text-xs hover:underline"
            style={{ color: '#C8A84B' }}
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Table actions */}
      <div className="flex items-center justify-between">
        <p className="font-courier text-xs" style={{ color: '#5A8A72' }}>
          {loading ? 'Loading…' : `${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => exportCSV(receipts)}
          disabled={receipts.length === 0}
          className="btn-secondary text-xs py-1.5 px-4 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
        {loading ? (
          <div className="py-16 text-center font-courier text-sm" style={{ color: '#5A8A72' }}>Loading receipts…</div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center font-courier text-sm" style={{ color: '#5A8A72' }}>
            No receipts found.{' '}
            {hasFilters ? (
              <button onClick={clearFilters} className="hover:underline" style={{ color: '#C8A84B' }}>
                Clear filters
              </button>
            ) : (
              <a href="/receipt/new" className="hover:underline" style={{ color: '#C8A84B' }}>
                Submit the first receipt.
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2D6A4F', backgroundColor: '#122E1F' }}>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Date</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Dept</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Crew Member</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Scene / Asset</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>AI Tool</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Status</th>
                  <th className="text-left px-4 py-3 font-courier text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: '#8BB5A0' }}>Auth Signer</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid rgba(45,106,79,0.4)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(45,106,79,0.15)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-courier text-xs" style={{ color: '#8BB5A0' }}>{fmt(r.date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-courier text-xs" style={{ color: '#8BB5A0' }}>{r.department}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-garamond text-base" style={{ color: '#F0EBE0' }}>{r.crew_member_name}</span>
                        <span className="block font-courier text-[10px] mt-0.5" style={{ color: '#5A8A72' }}>{r.crew_role}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-courier text-xs" style={{ color: '#8BB5A0' }}>{r.scene_usid}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: '#D4EDE1' }}>
                        {r.is_session && Array.isArray(r.session_tool_entries) && (r.session_tool_entries as SessionToolEntry[]).length > 1 ? (
                          <span className="flex items-center gap-2">
                            <span>{r.ai_tool_used}</span>
                            <span className="font-courier text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5" style={{ background: 'rgba(45,106,79,0.3)', color: '#8BB5A0' }}>
                              +{(r.session_tool_entries as SessionToolEntry[]).length - 1}
                            </span>
                          </span>
                        ) : r.ai_tool_used}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`status-badge ${STATUS_COLORS[r.tool_status]}`}>
                          {r.tool_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.status === 'AUTH_COMPLETE' ? (
                          <span className="text-sm" style={{ color: '#D4EDE1' }}>{r.auth_signer}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-courier text-xs font-semibold" style={{ color: '#C8A84B' }}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C8A84B' }} />
                            Pending sign-off
                          </span>
                        )}
                      </td>
                    </tr>

                    {expanded === r.id && (
                      <tr style={{ backgroundColor: '#0F2419' }}>
                        <td colSpan={7} className="px-6 py-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-4">
                              <div>
                                <p className="label">Receipt ID</p>
                                <p className="font-courier text-xs break-all mt-1" style={{ color: '#5A8A72' }}>{r.id}</p>
                              </div>
                              <div>
                                <p className="label">POR — Point of Record</p>
                                <p className="whitespace-pre-wrap mt-1" style={{ color: '#D4EDE1' }}>{r.por_description}</p>
                              </div>
                              <div>
                                <p className="label">SEL — Selection</p>
                                <div className="space-y-2 mt-1">
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>What was selected</p>
                                    <p style={{ color: '#D4EDE1' }}>{r.sel_output || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Why selected</p>
                                    <p style={{ color: '#8BB5A0' }}>{r.sel_description || '—'}</p>
                                    {r.sel_detail && (
                                      <p className="text-xs italic mt-0.5" style={{ color: '#5A8A72' }}>{r.sel_detail}</p>
                                    )}
                                  </div>
                                </div>
                                <p className="font-courier text-xs mt-2" style={{ color: '#5A8A72' }}>Recorded: {fmtDateTime(r.created_at)}</p>
                              </div>
                              <div>
                                <p className="label">ARR — Where did you end up?</p>
                                <p className="whitespace-pre-wrap mt-1" style={{ color: '#D4EDE1' }}>{r.arr_description}</p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <p className="label">Stage 1 — Crew Confirmed</p>
                                <p className="font-courier text-xs mt-1" style={{ color: '#5A8A72' }}>
                                  {r.crew_confirmed_at ? fmtDateTime(r.crew_confirmed_at) : fmtDateTime(r.created_at)}
                                </p>
                              </div>
                              <div>
                                <p className="label">Stage 2 — AUTH Signature</p>
                                {r.status === 'AUTH_COMPLETE' ? (
                                  <>
                                    <p className="mt-1" style={{ color: '#D4EDE1' }}>{r.auth_signer}</p>
                                    <p className="font-courier text-xs" style={{ color: '#5A8A72' }}>{r.auth_timestamp ? fmtDateTime(r.auth_timestamp) : '—'}</p>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-courier text-xs font-semibold mt-1" style={{ color: '#C8A84B' }}>
                                    <span className="w-2 h-2 rounded-full" style={{ background: '#C8A84B' }} />
                                    Pending HOD sign-off
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="label">LCT Required</p>
                                <p className="mt-1" style={{ color: '#D4EDE1' }}>{r.lct_required ? 'Yes' : 'No'}</p>
                                {r.lct_required && r.lct_reference && (
                                  <p className="font-courier text-xs mt-0.5" style={{ color: '#5A8A72' }}>Ref: {r.lct_reference}</p>
                                )}
                                {r.lct_required && r.lct_child_performer && (
                                  <div className="mt-2 rounded px-3 py-2" style={{ background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.35)' }}>
                                    <p className="font-courier text-xs font-semibold uppercase tracking-wide" style={{ color: '#C8A84B' }}>Child performer — under 18</p>
                                    {r.lct_child_age_bracket && (
                                      <p className="text-xs mt-0.5" style={{ color: '#C8A84B', opacity: 0.85 }}>Age bracket: {r.lct_child_age_bracket}</p>
                                    )}
                                    {r.lct_guardian_name && (
                                      <p className="text-xs" style={{ color: '#C8A84B', opacity: 0.85 }}>Guardian: {r.lct_guardian_name}</p>
                                    )}
                                    {r.lct_guardian_consent_ref && (
                                      <p className="text-xs" style={{ color: '#C8A84B', opacity: 0.85 }}>Consent ref: {r.lct_guardian_consent_ref}</p>
                                    )}
                                    {r.lct_performance_licence_ref && (
                                      <p className="text-xs" style={{ color: '#C8A84B', opacity: 0.85 }}>Licence ref: {r.lct_performance_licence_ref}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                              {r.notes && (
                                <div>
                                  <p className="label">Notes</p>
                                  <p className="whitespace-pre-wrap mt-1" style={{ color: '#D4EDE1' }}>{r.notes}</p>
                                </div>
                              )}
                              {r.twin_lock_hash ? (
                                <div>
                                  <p className="label">TRACE Twin Lock — SHA-256</p>
                                  <div className="rounded px-3 py-2 mt-1" style={{ background: '#0A1C10', border: '1px solid #2D6A4F' }}>
                                    <p className="font-courier text-xs break-all" style={{ color: '#F0EBE0', lineHeight: 1.7 }}>
                                      {r.twin_lock_hash}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="label">TRACE Twin Lock — SHA-256</p>
                                  <p className="font-courier text-xs italic mt-1" style={{ color: '#5A8A72' }}>Generated on HOD sign-off</p>
                                </div>
                              )}
                            </div>
                          </div>
                          {r.is_session && Array.isArray(r.session_tool_entries) && (r.session_tool_entries as SessionToolEntry[]).length > 1 && (
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                              <p className="label mb-3">Session Tool Log — {(r.session_tool_entries as SessionToolEntry[]).length} tools</p>
                              <div className="space-y-3">
                                {(r.session_tool_entries as SessionToolEntry[]).map((entry, i) => (
                                  <div key={i} className="rounded px-4 py-3" style={{ background: '#0F2419', border: '1px solid rgba(45,106,79,0.4)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Tool {i + 1}</p>
                                      <span className={`status-badge ${STATUS_COLORS[entry.tool_status] || 'status-red'}`}>{entry.tool_status}</span>
                                    </div>
                                    <p className="text-sm font-medium mb-2" style={{ color: '#F0EBE0' }}>{entry.ai_tool_used}</p>
                                    {(entry.input_file_version || entry.output_file_version) && (
                                      <div className="flex gap-6 mt-1">
                                        {entry.input_file_version && (
                                          <div>
                                            <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Input version</p>
                                            <p className="font-courier text-xs mt-0.5" style={{ color: '#8BB5A0' }}>{entry.input_file_version}</p>
                                          </div>
                                        )}
                                        {entry.output_file_version && (
                                          <div>
                                            <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Output version</p>
                                            <p className="font-courier text-xs mt-0.5" style={{ color: '#8BB5A0' }}>{entry.output_file_version}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.department === 'VFX' && (
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                              <p className="label mb-3">VFX — Additional Compliance</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Software and version</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.vfx_software || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Data processed</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.vfx_data_location || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Input type</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.vfx_input_type || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Output type</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.vfx_output_type || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>No model training confirmed</p>
                                  <p className={r.vfx_no_training_confirmed ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                    {r.vfx_no_training_confirmed ? 'Confirmed' : 'Not confirmed'}
                                  </p>
                                </div>
                                {r.vfx_input_type === 'Plate footage containing performers' && (
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>LCT verified</p>
                                    <p className={r.vfx_lct_confirmed ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                      {r.vfx_lct_confirmed ? 'Confirmed' : 'Not confirmed'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {(r.department === 'Sound' || r.department === 'Sound Post') && (() => {
                            const cloudFlag = r.sound_performer_audio && r.sound_processing_location !== 'Local software — not uploaded'
                            return (
                              <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                                <p className="label mb-3">{r.department} — Additional Compliance</p>
                                {cloudFlag && (
                                  <div className="mb-3 rounded px-3 py-2" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.35)' }}>
                                    <p className="font-courier text-xs font-semibold uppercase tracking-wide" style={{ color: '#f87171' }}>Cloud processing flag — performer dialogue</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#f87171', opacity: 0.85 }}>Performer audio sent to cloud. Verify consent and data security policy compliance.</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Processing location</p>
                                    <p style={{ color: '#D4EDE1' }}>{r.sound_processing_location || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Type of processing</p>
                                    <p style={{ color: '#D4EDE1' }}>{r.sound_processing_type || '—'}</p>
                                  </div>
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Performer dialogue</p>
                                    <p style={{ color: '#D4EDE1' }}>{r.sound_performer_audio ? 'Yes' : 'No'}</p>
                                  </div>
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>No model training confirmed</p>
                                    <p className={r.sound_no_training_confirmed ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                      {r.sound_no_training_confirmed ? 'Confirmed' : 'Not confirmed'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                          {r.department === 'Writing' && (
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                              <p className="label mb-3">Writing — Additional Compliance</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Stage</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.writing_stage || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Material submitted</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.writing_submitted_material || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Processing location</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.writing_processing_location || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Guild status</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.writing_guild_status || '—'}</p>
                                </div>
                                {r.writing_guild_status === 'WGA' && (
                                  <>
                                    <div>
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Writers in session</p>
                                      <p style={{ color: '#D4EDE1' }}>{r.writing_wga_writers_count ?? '—'}</p>
                                    </div>
                                    <div>
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>WGA registration</p>
                                      <p style={{ color: '#D4EDE1' }}>{r.writing_wga_registration || '—'}</p>
                                    </div>
                                  </>
                                )}
                                {r.writing_guild_status === 'WGGB' && (
                                  <>
                                    <div>
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Writing context</p>
                                      <p style={{ color: '#D4EDE1' }}>{r.writing_wggb_context || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Paternity asserted (CDPA s.77)</p>
                                      <p className={r.writing_wggb_paternity ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                        {r.writing_wggb_paternity ? 'Confirmed' : 'Not confirmed'}
                                      </p>
                                    </div>
                                  </>
                                )}
                                <div className="sm:col-span-2">
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>AI contribution</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.writing_ai_contribution || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>No model training confirmed</p>
                                  <p className={r.writing_no_training_confirmed ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                    {r.writing_no_training_confirmed ? 'Confirmed' : 'Not confirmed — flagged'}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Authorship declared</p>
                                  <p className={r.writing_authorship_declared ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                    {r.writing_authorship_declared ? 'Confirmed' : 'Not confirmed'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          {['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC'].includes(r.department) && (
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}>
                              <p className="label mb-3">Post-Production Facility</p>
                              {!r.facility_ai_policy_confirmed && (
                                <div className="mb-3 rounded px-3 py-2" style={{ background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.35)' }}>
                                  <p className="font-courier text-xs font-semibold uppercase tracking-wide" style={{ color: '#C8A84B' }}>Facility AI policy — unconfirmed</p>
                                  <p className="text-xs mt-0.5" style={{ color: '#C8A84B', opacity: 0.85 }}>No written AI policy confirmation on record. Obtain written confirmation from the facility before delivery.</p>
                                </div>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                {r.facility_name && (
                                  <div>
                                    <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Facility</p>
                                    <p style={{ color: '#D4EDE1' }}>{r.facility_name}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Render / processing location</p>
                                  <p style={{ color: '#D4EDE1' }}>{r.render_processing_location || '—'}</p>
                                </div>
                                <div>
                                  <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Facility AI policy confirmed</p>
                                  <p className={r.facility_ai_policy_confirmed ? 'text-status-green font-medium' : 'text-status-red font-medium'}>
                                    {r.facility_ai_policy_confirmed ? 'Confirmed' : 'Not confirmed — flagged'}
                                  </p>
                                </div>
                                {(r.input_file_version || r.output_file_version) && (
                                  <>
                                    {r.input_file_version && (
                                      <div>
                                        <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Input file version</p>
                                        <p className="font-courier text-xs mt-0.5" style={{ color: '#D4EDE1' }}>{r.input_file_version}</p>
                                      </div>
                                    )}
                                    {r.output_file_version && (
                                      <div>
                                        <p className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#5A8A72' }}>Output file version</p>
                                        <p className="font-courier text-xs mt-0.5" style={{ color: '#D4EDE1' }}>{r.output_file_version}</p>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
