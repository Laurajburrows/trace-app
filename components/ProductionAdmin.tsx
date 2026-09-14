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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove production "${name}" from the system? This does not delete any receipts.`)) return
    await fetch(`/api/admin/productions/${id}`, { method: 'DELETE' })
    await fetchProductions()
  }

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
            return (
              <div
                key={prod.id}
                className="rounded-lg p-5"
                style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-garamond text-lg" style={{ color: '#F0EBE0' }}>{prod.name}</p>
                    <p className="font-courier text-[10px] mt-0.5" style={{ color: '#5A8A72' }}>{prod.id.slice(0, 8)}</p>
                    {prod.activated_at && (
                      <p className="font-courier text-[10px] mt-0.5" style={{ color: '#5A8A72' }}>Added: {fmtDateTime(prod.activated_at)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(prod.id, prod.name)}
                    className="font-courier text-xs hover:underline flex-shrink-0"
                    style={{ color: '#5A8A72' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
