'use client'

import { useState, useEffect } from 'react'
import { DEPARTMENTS } from '@/lib/types'
import type { CustomRole } from '@/lib/types'

export default function CustomRoleAdmin() {
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [department, setDepartment] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/custom-roles')
    const data = await r.json()
    setRoles(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    const res = await fetch('/api/custom-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_name: roleName, department }),
    })
    if (res.status === 409) {
      setFormError('A role with that name already exists.')
      setSaving(false)
      return
    }
    if (!res.ok) {
      setFormError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setRoleName('')
    setDepartment('')
    setAdding(false)
    setSaving(false)
    await load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/custom-roles/${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    await load()
  }

  const grouped: Record<string, CustomRole[]> = {}
  roles.forEach((r) => {
    if (!grouped[r.department]) grouped[r.department] = []
    grouped[r.department].push(r)
  })

  return (
    <div className="space-y-6">
      <div className="rounded-lg px-6 py-5" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F', borderLeft: '3px solid #C8A84B' }}>
        <p className="font-courier text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8BB5A0' }}>
          OAS / Production Admin
        </p>
        <h1 className="font-garamond text-2xl" style={{ color: '#F0EBE0' }}>Custom Roles</h1>
        <p className="font-courier text-xs mt-2" style={{ color: '#8BB5A0' }}>
          Add production-specific roles that appear in the Artist Receipt role dropdown alongside the standard role list. Each custom role must be assigned a department.
        </p>
      </div>

      <div className="rounded-lg px-6 py-4" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
        <button onClick={() => { setAdding(true); setFormError(null) }} className="btn-primary text-sm">
          + Add custom role
        </button>
      </div>

      {adding && (
        <div className="rounded-lg p-6" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
          <h3 className="section-heading">Add custom role</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Role name</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. Pipeline TD, LIDAR Artist"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Department</label>
                <select
                  className="select"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            {formError && (
              <p className="font-courier text-xs" style={{ color: '#f87171' }}>{formError}</p>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Adding…' : 'Add role'}
              </button>
              <button type="button" onClick={() => { setAdding(false); setRoleName(''); setDepartment(''); setFormError(null) }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg px-6 py-8 font-courier text-sm" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F', color: '#5A8A72' }}>Loading…</div>
      ) : roles.length === 0 ? (
        <div className="rounded-lg px-6 py-8 font-courier text-sm" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F', color: '#5A8A72' }}>
          No custom roles yet. Use &ldquo;+ Add custom role&rdquo; to add production-specific roles.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dept, deptRoles]) => (
            <div key={dept} className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}>
              <div className="px-6 py-3 flex items-center justify-between" style={{ backgroundColor: '#122E1F', borderBottom: '1px solid #2D6A4F' }}>
                <h3 className="font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>
                  {dept}
                </h3>
                <span className="font-courier text-xs" style={{ color: '#C8A84B' }}>{deptRoles.length} role{deptRoles.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#122E1F', borderBottom: '1px solid rgba(45,106,79,0.4)' }}>
                      <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Role</th>
                      <th className="text-left px-3 py-2 font-courier text-[10px] uppercase tracking-widest" style={{ color: '#8BB5A0' }}>Department</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {deptRoles.map((role) => (
                      <tr
                        key={role.id}
                        style={{ borderTop: '1px solid rgba(45,106,79,0.4)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(45,106,79,0.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td className="px-3 py-2.5 text-sm font-medium" style={{ color: '#F0EBE0' }}>{role.role_name}</td>
                        <td className="px-3 py-2.5 font-courier text-xs" style={{ color: '#8BB5A0' }}>{role.department}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-2 justify-end">
                            {confirmDelete === role.id ? (
                              <>
                                <button
                                  onClick={() => handleDelete(role.id)}
                                  className="font-courier text-xs hover:underline"
                                  style={{ color: '#f87171' }}
                                >
                                  Confirm delete
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="font-courier text-xs hover:underline"
                                  style={{ color: '#8BB5A0' }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(role.id)}
                                className="font-courier text-xs hover:underline"
                                style={{ color: '#f87171' }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
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
