'use client'

import { useState, useEffect } from 'react'
import type { Production } from '@/lib/types'

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ProductionAdmin() {
  const [productions, setProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  async function fetchProductions() {
    setLoading(true)
    const res = await fetch('/api/admin/productions')
    const data = await res.json()
    setProductions(data)
    setLoading(false)
  }

  useEffect(() => { fetchProductions() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)
    try {
      const res = await fetch('/api/admin/productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create production.')
        return
      }
      setNewName('')
      await fetchProductions()
    } finally {
      setCreating(false)
    }
  }

  async function handleDeclaration(prod: Production, field: 'declaration_briefed' | 'declaration_logged' | 'declaration_consented', value: boolean) {
    setSaving(prod.id)
    try {
      const patch = {
        declaration_briefed: field === 'declaration_briefed' ? value : prod.declaration_briefed,
        declaration_logged: field === 'declaration_logged' ? value : prod.declaration_logged,
        declaration_consented: field === 'declaration_consented' ? value : prod.declaration_consented,
      }
      const res = await fetch(`/api/admin/productions/${prod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) await fetchProductions()
    } finally {
      setSaving(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove production "${name}" from the system? This does not delete any receipts.`)) return
    await fetch(`/api/admin/productions/${id}`, { method: 'DELETE' })
    await fetchProductions()
  }

  const allDeclared = (p: Production) => p.declaration_briefed && p.declaration_logged && p.declaration_consented

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-garamond text-2xl mb-1" style={{ color: '#F0EBE0' }}>Production Setup</h2>
        <p className="font-courier text-xs" style={{ color: '#8BB5A0' }}>
          Register productions and confirm the Production AI Crew Declaration before activating. Each production must have all three declarations confirmed before crew can select it on receipt forms.
        </p>
      </div>

      {/* Add new production */}
      <div className="rounded-lg p-5" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
        <p className="font-courier text-xs uppercase tracking-widest mb-3" style={{ color: '#8BB5A0' }}>Add New Production</p>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Production name — e.g. The Meridian Series 1"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setCreateError(null) }}
          />
          <button
            type="submit"
            disabled={!newName.trim() || creating}
            className="btn-primary text-sm px-4 disabled:opacity-40"
          >
            {creating ? 'Adding…' : 'Add'}
          </button>
        </form>
        {createError && (
          <p className="font-courier text-xs mt-2" style={{ color: '#f87171' }}>{createError}</p>
        )}
      </div>

      {/* Production list */}
      {loading ? (
        <p className="font-courier text-sm" style={{ color: '#5A8A72' }}>Loading…</p>
      ) : productions.length === 0 ? (
        <p className="font-courier text-sm" style={{ color: '#5A8A72' }}>No productions registered yet.</p>
      ) : (
        <div className="space-y-4">
          {productions.map((prod) => {
            const activated = Boolean(prod.activated_at)
            const allDone = allDeclared(prod)
            const isSaving = saving === prod.id
            return (
              <div
                key={prod.id}
                className="rounded-lg p-5"
                style={{
                  backgroundColor: '#1A3D2B',
                  border: `1px solid ${activated ? '#2D6A4F' : 'rgba(200,168,75,0.4)'}`,
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-garamond text-lg" style={{ color: '#F0EBE0' }}>{prod.name}</p>
                    <p className="font-courier text-[10px] mt-0.5" style={{ color: '#5A8A72' }}>{prod.id.slice(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activated ? (
                      <span className="font-courier text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ background: 'rgba(45,106,79,0.3)', color: '#8BB5A0' }}>
                        Active
                      </span>
                    ) : (
                      <span className="font-courier text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ background: 'rgba(200,168,75,0.12)', color: '#C8A84B', border: '1px solid rgba(200,168,75,0.3)' }}>
                        Not activated
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(prod.id, prod.name)}
                      className="font-courier text-xs hover:underline"
                      style={{ color: '#5A8A72' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Declaration section */}
                <div className="rounded px-4 py-4" style={{ background: '#0F2419', border: '1px solid rgba(45,106,79,0.4)' }}>
                  <p className="font-courier text-[10px] uppercase tracking-widest mb-3" style={{ color: '#8BB5A0' }}>
                    Production AI Crew Declaration
                  </p>
                  {!activated && (
                    <p className="font-courier text-xs mb-4" style={{ color: '#C8A84B' }}>
                      All three declarations must be confirmed before this production can be activated.
                    </p>
                  )}
                  <div className="space-y-3">
                    {([
                      { field: 'declaration_briefed' as const, label: 'All crew have been briefed on AI use on this production.' },
                      { field: 'declaration_logged' as const, label: 'All crew have been informed that AI use will be logged through TRACE©.' },
                      { field: 'declaration_consented' as const, label: 'All crew have consented to work under the TRACE© framework as a condition of their engagement.' },
                    ]).map(({ field, label }) => (
                      <div key={field} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`${prod.id}-${field}`}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-trace-moss focus:ring-trace-moss flex-shrink-0"
                          checked={Boolean(prod[field])}
                          disabled={isSaving || activated}
                          onChange={(e) => handleDeclaration(prod, field, e.target.checked)}
                        />
                        <label
                          htmlFor={`${prod.id}-${field}`}
                          className="font-courier text-xs cursor-pointer"
                          style={{ color: prod[field] ? '#D4EDE1' : '#8BB5A0' }}
                        >
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                  {activated && prod.declaration_timestamp && (
                    <p className="font-courier text-[10px] mt-3" style={{ color: '#5A8A72' }}>
                      Declaration confirmed and production activated: {fmtDateTime(prod.declaration_timestamp)}
                    </p>
                  )}
                  {!activated && allDone && (
                    <p className="font-courier text-xs mt-3 font-semibold" style={{ color: '#C8A84B' }}>
                      Save complete — production will activate once you confirm the last checkbox.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
