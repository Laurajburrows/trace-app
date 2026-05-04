'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEPARTMENTS } from '@/lib/types'
import type { Receipt, Department, ToolStatus } from '@/lib/types'

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
    'scene_usid', 'ai_tool_used', 'tool_status', 'por_description', 'sel_description',
    'adj_description', 'auth_signer', 'auth_timestamp', 'lct_required', 'lct_reference', 'notes',
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
      <div className="bg-white border border-gray-200 rounded-lg p-4">
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
          <button onClick={clearFilters} className="mt-3 text-xs text-trace-moss hover:underline">
            Clear all filters
          </button>
        )}
      </div>

      {/* Table actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
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
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading receipts…</div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No receipts found.{' '}
            {hasFilters ? (
              <button onClick={clearFilters} className="text-trace-moss hover:underline">
                Clear filters
              </button>
            ) : (
              <a href="/receipt/new" className="text-trace-moss hover:underline">
                Submit the first receipt.
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">Dept</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide whitespace-nowrap">Crew Member</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide whitespace-nowrap">Scene / Asset</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide whitespace-nowrap">AI Tool</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide whitespace-nowrap">Auth Signer</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="border-b border-gray-100 hover:bg-trace-pale/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{fmt(r.date)}</td>
                      <td className="px-4 py-3 text-gray-600">{r.department}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{r.crew_member_name}</span>
                        <span className="block text-xs text-gray-400">{r.crew_role}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.scene_usid}</td>
                      <td className="px-4 py-3 text-gray-700">{r.ai_tool_used}</td>
                      <td className="px-4 py-3">
                        <span className={`status-badge ${STATUS_COLORS[r.tool_status]}`}>
                          {r.tool_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.auth_signer}</td>
                    </tr>

                    {expanded === r.id && (
                      <tr key={`${r.id}-expanded`} className="bg-trace-pale/20">
                        <td colSpan={7} className="px-6 py-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-4">
                              <div>
                                <p className="label">Receipt ID</p>
                                <p className="font-mono text-xs text-gray-500 break-all">{r.id}</p>
                              </div>
                              <div>
                                <p className="label">POR — Point of Record</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{r.por_description}</p>
                              </div>
                              <div>
                                <p className="label">SEL — Selection</p>
                                {r.sel_output && (
                                  <p className="text-gray-700 mb-0.5">{r.sel_output}</p>
                                )}
                                <p className="text-xs text-gray-500">{r.sel_description || '—'}</p>
                                {r.sel_detail && (
                                  <p className="text-xs text-gray-500 italic mt-0.5">{r.sel_detail}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">Recorded: {fmtDateTime(r.created_at)}</p>
                              </div>
                              <div>
                                <p className="label">ADJ — Adjustment</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{r.adj_description}</p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <p className="label">AUTH — Signatory</p>
                                <p className="text-gray-700">{r.auth_signer}</p>
                                <p className="text-xs text-gray-400">{fmtDateTime(r.auth_timestamp)}</p>
                              </div>
                              <div>
                                <p className="label">LCT Required</p>
                                <p className="text-gray-700">{r.lct_required ? 'Yes' : 'No'}</p>
                                {r.lct_required && r.lct_reference && (
                                  <p className="text-xs text-gray-500 mt-0.5">Ref: {r.lct_reference}</p>
                                )}
                              </div>
                              {r.notes && (
                                <div>
                                  <p className="label">Notes</p>
                                  <p className="text-gray-700 whitespace-pre-wrap">{r.notes}</p>
                                </div>
                              )}
                              {r.twin_lock_hash && (
                                <div>
                                  <p className="label">TRACE Twin Lock — SHA-256</p>
                                  <p className="font-mono text-xs text-gray-500 break-all bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                                    {r.twin_lock_hash}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
