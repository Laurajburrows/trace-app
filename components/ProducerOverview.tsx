'use client'

import { useState, useEffect } from 'react'
import type { Receipt } from '@/lib/types'

const POST_PROD = ['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC']

function isComplianceFlagged(r: Receipt): boolean {
  const cloudSound =
    Boolean(r.sound_performer_audio) &&
    !!r.sound_processing_location &&
    r.sound_processing_location !== 'Local software — not uploaded'
  return (
    r.tool_status === 'RED' ||
    (r.department === 'VFX' && !r.vfx_no_training_confirmed) ||
    ((r.department === 'Sound' || r.department === 'Sound Post') && !r.sound_no_training_confirmed) ||
    (r.department === 'Writing' && !r.writing_no_training_confirmed) ||
    (r.department === 'Delivery / QC' && !r.delivery_no_training_confirmed) ||
    cloudSound ||
    (POST_PROD.includes(r.department) && !r.facility_ai_policy_confirmed)
  )
}

interface StatCardProps {
  label: string
  value: number
  amberBorderWhenNonZero?: boolean
  sub?: string
}

function StatCard({ label, value, amberBorderWhenNonZero, sub }: StatCardProps) {
  const flagged = amberBorderWhenNonZero && value > 0
  return (
    <div
      className="bg-white rounded-lg p-5 flex flex-col gap-1"
      style={{
        border: '1px solid #E5E7EB',
        borderLeft: flagged ? '4px solid #B8860B' : '1px solid #E5E7EB',
      }}
    >
      <span className="text-xs font-bold uppercase tracking-widest text-trace-moss">
        {label}
      </span>
      <span
        className="font-garamond leading-none"
        style={{ fontSize: '2.4rem', color: '#111827' }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs text-gray-400">{sub}</span>
      )}
    </div>
  )
}

interface DeptRow {
  department: string
  total: number
  pendingHod: number
  flagged: number
  authorised: number
}

export default function ProducerOverview() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/receipts')
        if (res.ok) {
          const data: Receipt[] = await res.json()
          setReceipts(data)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const total = receipts.length
  const pendingHod = receipts.filter((r) => r.status === 'PENDING_HOD_AUTH').length
  const flagged = receipts.filter(isComplianceFlagged).length
  const authorised = receipts.filter((r) => r.status === 'AUTH_COMPLETE').length

  const deptMap = new Map<string, DeptRow>()
  for (const r of receipts) {
    const dept = r.department || 'Unknown'
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { department: dept, total: 0, pendingHod: 0, flagged: 0, authorised: 0 })
    }
    const row = deptMap.get(dept)!
    row.total++
    if (r.status === 'PENDING_HOD_AUTH') row.pendingHod++
    if (isComplianceFlagged(r)) row.flagged++
    if (r.status === 'AUTH_COMPLETE') row.authorised++
  }

  const deptRows = Array.from(deptMap.values()).sort((a, b) => b.total - a.total)

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        Loading production data…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Receipts" value={total} />
        <StatCard label="Fully Authorised" value={authorised} />
        <StatCard
          label="Pending HOD Auth"
          value={pendingHod}
          sub={pendingHod > 0 ? 'awaiting sign-off' : undefined}
        />
        <StatCard
          label="Compliance Flags"
          value={flagged}
          amberBorderWhenNonZero
          sub={flagged > 0 ? 'require attention' : undefined}
        />
      </div>

      {/* Department breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-5 pb-3 border-b border-trace-pale">
          <h2 className="text-xs font-bold uppercase tracking-widest text-trace-moss">
            By Department
          </h2>
        </div>

        {deptRows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-700 font-medium mb-1">No receipts yet</p>
            <p className="text-sm text-gray-400">
              Receipts will appear here once crew members begin submitting.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                {['Department', 'Total', 'Pending HOD', 'Flags', 'Authorised'].map((h) => (
                  <th
                    key={h}
                    className="text-xs font-bold uppercase tracking-widest text-trace-moss text-left px-6 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deptRows.map((row) => (
                <tr
                  key={row.department}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <td className="px-6 py-3 text-gray-900 font-medium">
                    {row.department}
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {row.total}
                  </td>
                  <td className="px-6 py-3">
                    {row.pendingHod > 0 ? (
                      <span
                        className="inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#FFF8E1', color: '#B8860B', border: '1px solid #e5c46a' }}
                      >
                        {row.pendingHod}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {row.flagged > 0 ? (
                      <span className="font-semibold text-status-red">
                        {row.flagged}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {row.authorised > 0 ? (
                      <span className="font-semibold text-status-green">
                        {row.authorised}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
