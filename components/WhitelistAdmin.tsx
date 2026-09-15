'use client'

import { useState, useEffect, useRef } from 'react'
import type { WhitelistEntry } from '@/lib/types'

type Status = 'GREEN' | 'AMBER' | 'RED'

const STATUS_LABEL: Record<Status, string> = {
  GREEN: 'status-green',
  AMBER: 'status-amber',
  RED: 'status-red',
}

type CarbonIntensity = 'Low' | 'Medium' | 'High' | 'Very High'

const CARBON_LABELS: Record<CarbonIntensity, string> = {
  Low: 'Low — text-based AI',
  Medium: 'Medium — image generation',
  High: 'High — video generation',
  'Very High': 'Very High — large-scale / bespoke pipeline',
}

const CARBON_COLORS: Record<CarbonIntensity, string> = {
  Low: '#4ade80',
  Medium: '#C8A84B',
  High: '#fb923c',
  'Very High': '#f87171',
}

const emptyForm = {
  displayName: '',
  department: 'General',
  status: 'GREEN' as Status,
  condition: '',
  requiresLCT: false,
  carbonIntensity: 'Medium' as CarbonIntensity,
}

function EntryRow({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: WhitelistEntry
  onUpdate: (id: string, data: Partial<WhitelistEntry>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    displayName: entry.displayName,
    department: entry.department || 'General',
    status: entry.status as Status,
    condition: entry.condition || '',
    requiresLCT: entry.requiresLCT,
    carbonIntensity: (entry.carbonIntensity || 'Medium') as CarbonIntensity,
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onUpdate(entry.id, {
      ...form,
      toolName: form.displayName,
    })
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <tr style={{ borderTop: '1px solid rgba(45,106,79,0.4)', backgroundColor: '#122E1F' }}>
        <td className="px-3 py-3" colSpan={7}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label text-xs">Tool Name</label>
              <input
                className="input text-sm"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-xs">Department</label>
              <input
                className="input text-sm"
                placeholder="e.g. VFX, Writing, Sound Post"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-xs">Status</label>
              <select
                className="select text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}
              >
                <option value="GREEN">GREEN</option>
                <option value="AMBER">AMBER</option>
                <option value="RED">RED</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label text-xs">Rationale / Condition <span className="normal-case font-normal" style={{ color: '#5A8A72' }}>(shown to crew when tool is selected)</span></label>
              <input
                className="input text-sm"
                placeholder="e.g. Local deployment only. No cloud upload of production data."
                value={form.condition}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id={`lct-${entry.id}`}
                className="h-4 w-4 rounded"
                style={{ accentColor: '#C8A84B' }}
                checked={form.requiresLCT}
                onChange={(e) => setForm((f) => ({ ...f, requiresLCT: e.target.checked }))}
              />
              <label htmlFor={`lct-${entry.id}`} className="text-sm cursor-pointer" style={{ color: '#D4EDE1' }}>
                Requires LCT token
              </label>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="label text-xs">Carbon Intensity</label>
                <div className="group relative cursor-default">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5A8A72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <div className="absolute left-0 top-full mt-1.5 w-64 rounded-lg p-3 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ backgroundColor: '#0D2418', border: '1px solid #2D6A4F', color: '#D4EDE1' }}>
                    <p className="font-courier text-[10px] leading-relaxed">Used to estimate AI carbon footprint for Albert integration — coming in Build 2.</p>
                  </div>
                </div>
              </div>
              <select
                className="select text-sm"
                value={form.carbonIntensity}
                onChange={(e) => setForm((f) => ({ ...f, carbonIntensity: e.target.value as CarbonIntensity }))}
              >
                <option value="Low">Low — text-based AI (Claude, ChatGPT, transcription tools)</option>
                <option value="Medium">Medium — image generation (Midjourney, Firefly, DALL-E)</option>
                <option value="High">High — video generation (Runway, Sora, Pika)</option>
                <option value="Very High">Very High — large-scale model runs or bespoke AI pipeline</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1.5 px-4">
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr
      style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(45,106,79,0.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <td className="px-3 py-2.5 text-sm font-medium" style={{ color: '#F0EBE0' }}>{entry.displayName}</td>
      <td className="px-3 py-2.5 font-courier text-xs" style={{ color: '#8BB5A0' }}>{entry.department || '—'}</td>
      <td className="px-3 py-2.5">
        <span className={`status-badge ${STATUS_LABEL[entry.status as Status] || 'status-red'}`}>
          {entry.status}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs max-w-xs" style={{ color: '#8BB5A0' }}>
        {entry.condition ? (
          <span className="italic">{entry.condition}</span>
        ) : (
          <span style={{ color: '#2D6A4F' }}>—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        {entry.requiresLCT ? (
          <span className="font-courier text-xs font-semibold" style={{ color: '#C8A84B' }}>⚠ LCT</span>
        ) : (
          <span className="text-xs" style={{ color: '#2D6A4F' }}>—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {entry.carbonIntensity ? (
          <span className="font-courier text-xs font-semibold" style={{ color: CARBON_COLORS[(entry.carbonIntensity as CarbonIntensity)] || '#C8A84B' }}>
            {entry.carbonIntensity}
          </span>
        ) : (
          <span className="text-xs" style={{ color: '#2D6A4F' }}>—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setEditing(true)}
            className="font-courier text-xs hover:underline"
            style={{ color: '#C8A84B' }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="font-courier text-xs hover:underline"
            style={{ color: '#f87171' }}
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function WhitelistAdmin() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newForm, setNewForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [filterDept, setFilterDept] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/whitelist')
    const data = await r.json()
    setEntries(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName: newForm.displayName,
        displayName: newForm.displayName,
        department: newForm.department,
        status: newForm.status,
        condition: newForm.condition || null,
        requiresLCT: newForm.requiresLCT,
        carbonIntensity: newForm.carbonIntensity,
      }),
    })
    setNewForm(emptyForm)
    setAdding(false)
    setSaving(false)
    await load()
  }

  async function handleUpdate(id: string, data: Partial<WhitelistEntry>) {
    await fetch(`/api/whitelist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this tool from the whitelist?')) return
    await fetch(`/api/whitelist/${id}`, { method: 'DELETE' })
    await load()
  }

  function handleExport() {
    const json = JSON.stringify(
      entries.map(({ id, createdAt, updatedAt, ...rest }) => rest),
      null,
      2
    )
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'TRACE-whitelist.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(parsed)) throw new Error('Expected a JSON array')
        await fetch('/api/whitelist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ import: true, entries: parsed }),
        })
        await load()
      } catch (err) {
        setImportError('Import failed: ' + (err as Error).message)
      }
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.readAsText(file)
  }

  // Group entries by department
  const departments = Array.from(new Set(entries.map((e) => e.department || 'General'))).sort()
  const filtered = filterDept
    ? entries.filter((e) => (e.department || 'General') === filterDept)
    : entries

  // Group filtered entries by department
  const grouped: Record<string, WhitelistEntry[]> = {}
  filtered.forEach((e) => {
    const dept = e.department || 'General'
    if (!grouped[dept]) grouped[dept] = []
    grouped[dept].push(e)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg px-6 py-5" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F', borderLeft: '3px solid #C8A84B' }}>
        <p className="font-courier text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8BB5A0' }}>
          OAS / Production Admin
        </p>
        <h1 className="font-garamond text-2xl" style={{ color: '#F0EBE0' }}>Whitelist Management</h1>
        <p className="font-courier text-xs mt-2" style={{ color: '#8BB5A0' }}>
          Changes take effect immediately for all users. Tools not on the whitelist default to UNVERIFIED — OAS assessment required before use.
        </p>
      </div>

      {/* Non-endorsement notice */}
      <div className="rounded-lg px-5 py-4" style={{ backgroundColor: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.4)' }}>
        <p className="font-courier text-[10px] uppercase tracking-widest mb-1" style={{ color: '#C8A84B' }}>Important Notice</p>
        <p className="text-sm leading-relaxed" style={{ color: '#D4EDE1' }}>
          TRACE© does not endorse or approve any specific AI tool. Your production&apos;s AI tool whitelist should be agreed with your legal team, completion bond provider, and relevant guild representatives before principal photography begins.
        </p>
      </div>

      {/* Actions bar */}
      <div className="rounded-lg px-6 py-4" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setAdding(true)} className="btn-primary text-sm">
            + Add Tool
          </button>
          <button onClick={handleExport} className="btn-secondary text-sm">
            Export JSON
          </button>
          <label className="btn-secondary text-sm cursor-pointer">
            Import JSON
            <input ref={fileRef} type="file" accept=".json" className="sr-only" onChange={handleImportFile} />
          </label>
        </div>
        {importError && <p className="font-courier text-xs mt-2" style={{ color: '#f87171' }}>{importError}</p>}
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-lg p-6" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
          <h3 className="section-heading">Add Tool to Whitelist</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Tool Name</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Adobe Firefly"
                  value={newForm.displayName}
                  onChange={(e) => setNewForm((f) => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Department</label>
                <input
                  className="input"
                  placeholder="e.g. VFX, Writing, Sound Post"
                  value={newForm.department}
                  onChange={(e) => setNewForm((f) => ({ ...f, department: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="select"
                  value={newForm.status}
                  onChange={(e) => setNewForm((f) => ({ ...f, status: e.target.value as Status }))}
                >
                  <option value="GREEN">GREEN — Approved</option>
                  <option value="AMBER">AMBER — Conditional</option>
                  <option value="RED">RED — Blocked</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Rationale / Condition <span className="normal-case font-normal" style={{ color: '#5A8A72' }}>(shown to crew when tool is selected)</span></label>
                <input
                  className="input"
                  placeholder="e.g. Local deployment only. No cloud upload of production data."
                  value={newForm.condition}
                  onChange={(e) => setNewForm((f) => ({ ...f, condition: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="new-lct"
                  className="h-4 w-4 rounded"
                  style={{ accentColor: '#C8A84B' }}
                  checked={newForm.requiresLCT}
                  onChange={(e) => setNewForm((f) => ({ ...f, requiresLCT: e.target.checked }))}
                />
                <label htmlFor="new-lct" className="text-sm cursor-pointer" style={{ color: '#D4EDE1' }}>
                  Requires LCT token
                </label>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="label">Carbon Intensity</label>
                  <div className="group relative cursor-default">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5A8A72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <div className="absolute left-0 top-full mt-1.5 w-64 rounded-lg p-3 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ backgroundColor: '#0D2418', border: '1px solid #2D6A4F', color: '#D4EDE1' }}>
                      <p className="font-courier text-[10px] leading-relaxed">Used to estimate AI carbon footprint for Albert integration — coming in Build 2.</p>
                    </div>
                  </div>
                </div>
                <select
                  className="select"
                  value={newForm.carbonIntensity}
                  onChange={(e) => setNewForm((f) => ({ ...f, carbonIntensity: e.target.value as CarbonIntensity }))}
                >
                  <option value="Low">Low — text-based AI (Claude, ChatGPT, transcription tools)</option>
                  <option value="Medium">Medium — image generation (Midjourney, Firefly, DALL-E)</option>
                  <option value="High">High — video generation (Runway, Sora, Pika)</option>
                  <option value="Very High">Very High — large-scale model runs or bespoke AI pipeline</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Adding…' : 'Add Tool'}
              </button>
              <button type="button" onClick={() => { setAdding(false); setNewForm(emptyForm) }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter + count */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="font-courier text-xs uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Filter by dept</label>
          <select
            className="select text-sm py-1"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <span className="font-courier text-xs ml-auto" style={{ color: '#C8A84B' }}>
          {filtered.length} / {entries.length} tools
        </span>
      </div>

      {/* Whitelist table — grouped by department */}
      {loading ? (
        <div className="rounded-lg px-6 py-8 font-courier text-sm" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F', color: '#5A8A72' }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg px-6 py-8 font-courier text-sm" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F', color: '#5A8A72' }}>
          No tools on the whitelist yet. Use &ldquo;+ Add Tool&rdquo; to build the whitelist for this production.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dept, deptEntries]) => (
            <div key={dept} className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
              <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: '#122E1F', borderBottom: '1px solid #2D6A4F' }}>
                <h3 className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>
                  {dept}
                </h3>
                <span className="font-courier text-xs" style={{ color: '#C8A84B' }}>{deptEntries.length} tool{deptEntries.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#122E1F', borderBottom: '1px solid rgba(45,106,79,0.4)' }}>
                      <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Tool</th>
                      <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Dept</th>
                      <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Status</th>
                      <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Rationale / Condition</th>
                      <th className="text-center px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>LCT</th>
                      <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Carbon</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {deptEntries.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
