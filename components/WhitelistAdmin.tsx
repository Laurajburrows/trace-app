'use client'

import { useState, useEffect, useRef } from 'react'
import type { WhitelistEntry } from '@/lib/types'

type Status = 'GREEN' | 'AMBER' | 'RED'

const STATUS_LABEL: Record<Status, string> = {
  GREEN: 'status-green',
  AMBER: 'status-amber',
  RED: 'status-red',
}

const emptyForm = {
  displayName: '',
  status: 'GREEN' as Status,
  condition: '',
  requiresLCT: false,
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
    status: entry.status as Status,
    condition: entry.condition || '',
    requiresLCT: entry.requiresLCT,
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
      <tr className="border-t border-gray-100 bg-trace-pale/30">
        <td className="px-3 py-3" colSpan={5}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label text-xs">Display Name</label>
              <input
                className="input text-sm"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
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
              <label className="label text-xs">Condition <span className="normal-case font-normal text-gray-400">(optional)</span></label>
              <input
                className="input text-sm"
                placeholder="e.g. LCT required. Voice synthesis consent must be verified before use."
                value={form.condition}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id={`lct-${entry.id}`}
                className="h-4 w-4 rounded border-gray-300 text-trace-moss"
                checked={form.requiresLCT}
                onChange={(e) => setForm((f) => ({ ...f, requiresLCT: e.target.checked }))}
              />
              <label htmlFor={`lct-${entry.id}`} className="text-sm text-gray-700 cursor-pointer">
                Requires LCT token
              </label>
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
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2.5 text-sm font-medium text-gray-800">{entry.displayName}</td>
      <td className="px-3 py-2.5">
        <span className={`status-badge ${STATUS_LABEL[entry.status as Status] || 'status-red'}`}>
          {entry.status}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-xs">
        {entry.condition ? (
          <span className="italic">{entry.condition}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        {entry.requiresLCT ? (
          <span className="text-status-amber text-xs font-semibold">⚠ LCT</span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-trace-moss hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="text-xs text-red-500 hover:underline"
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
  const [seeding, setSeeding] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
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
        status: newForm.status,
        condition: newForm.condition || null,
        requiresLCT: newForm.requiresLCT,
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

  async function handleSeedDefaults() {
    if (!confirm('This will replace the entire whitelist with the default entries. Continue?')) return
    setSeeding(true)
    await fetch('/api/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seedDefaults: true }),
    })
    setSeeding(false)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-trace-forest text-white rounded-lg px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-trace-pale mb-1">
          OAS / Production Admin
        </p>
        <h1 className="text-xl font-bold">Whitelist Management</h1>
        <p className="text-sm text-trace-pale mt-2">
          Changes to the whitelist take effect immediately for all users on this production.
        </p>
      </div>

      {/* Actions bar */}
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-4">
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
          <button onClick={handleSeedDefaults} disabled={seeding} className="btn-secondary text-sm disabled:opacity-50 ml-auto">
            {seeding ? 'Seeding…' : 'Load TRACE Defaults'}
          </button>
        </div>
        {importError && <p className="text-xs text-red-600 mt-2">{importError}</p>}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white border border-trace-pale-dark rounded-lg p-6">
          <h3 className="section-heading">Add Tool to Whitelist</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Tool Display Name</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Adobe Firefly"
                  value={newForm.displayName}
                  onChange={(e) => setNewForm((f) => ({ ...f, displayName: e.target.value }))}
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
                <label className="label">Condition <span className="normal-case font-normal text-gray-400">(optional — shown for AMBER tools)</span></label>
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
                  className="h-4 w-4 rounded border-gray-300 text-trace-moss"
                  checked={newForm.requiresLCT}
                  onChange={(e) => setNewForm((f) => ({ ...f, requiresLCT: e.target.checked }))}
                />
                <label htmlFor="new-lct" className="text-sm text-gray-700 cursor-pointer">
                  Requires LCT token
                </label>
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

      {/* Whitelist table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-trace-pale px-6 py-3 border-b border-trace-pale-dark flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-trace-forest">
            Production Whitelist
          </h3>
          <span className="text-xs text-trace-moss font-medium">{entries.length} tools</span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-sm text-gray-400">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-400">
            No tools on the whitelist yet.{' '}
            <button onClick={handleSeedDefaults} className="text-trace-moss hover:underline">
              Load TRACE defaults
            </button>{' '}
            to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Tool</th>
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Status</th>
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase text-trace-moss">Condition</th>
                  <th className="text-center px-3 py-2 text-xs font-bold uppercase text-trace-moss">LCT</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
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
        )}
      </div>
    </div>
  )
}
