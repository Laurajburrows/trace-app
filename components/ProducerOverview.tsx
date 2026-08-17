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

function StatCard({
  label,
  value,
  alert,
  sub,
}: {
  label: string
  value: number
  alert?: boolean
  sub?: string
}) {
  return (
    <div
      className="rounded-lg px-5 py-4 flex flex-col gap-1"
      style={{
        backgroundColor: '#122E1F',
        border: `1px solid ${alert && value > 0 ? 'rgba(200,168,75,0.5)' : '#2D6A4F'}`,
        borderLeft: `3px solid ${alert && value > 0 ? '#C8A84B' : '#2D6A4F'}`,
      }}
    >
      <span
        className="font-courier text-[10px] uppercase tracking-widest"
        style={{ color: '#5A8A72' }}
      >
        {label}
      </span>
      <span
        className="font-garamond leading-none"
        style={{
          fontSize: '2.2rem',
          color: alert && value > 0 ? '#C8A84B' : '#F0EBE0',
        }}
      >
        {value}
      </span>
      {sub && (
        <span className="font-courier text-[10px]" style={{ color: '#5A8A72' }}>
          {sub}
        </span>
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
      <div className="py-16 text-center font-courier text-sm" style={{ color: '#5A8A72' }}>
        Loading production data…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Receipts" value={total} />
        <StatCard label="Fully Authorised" value={authorised} />
        <StatCard
          label="Pending HOD Auth"
          value={pendingHod}
          alert
          sub={pendingHod > 0 ? 'awaiting sign-off' : undefined}
        />
        <StatCard
          label="Compliance Flags"
          value={flagged}
          alert
          sub={flagged > 0 ? 'require attention' : undefined}
        />
      </div>

      {/* Department breakdown */}
      {deptRows.length === 0 ? (
        <div
          className="rounded-lg py-16 text-center"
          style={{ backgroundColor: '#1A3D2B', border: '1px solid #2D6A4F' }}
        >
          <p className="font-garamond text-lg mb-1" style={{ color: '#F0EBE0' }}>
            No receipts yet
          </p>
          <p className="font-courier text-xs" style={{ color: '#5A8A72' }}>
            Receipts will appear here once crew members begin submitting.
          </p>
        </div>
      ) : (
        <div>
          <h2
            className="font-courier text-[10px] uppercase tracking-widest mb-3"
            style={{ color: '#5A8A72' }}
          >
            By Department
          </h2>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid #2D6A4F' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#122E1F', borderBottom: '1px solid #2D6A4F' }}>
                  {['Department', 'Total', 'Pending HOD', 'Flags', 'Authorised'].map((h) => (
                    <th
                      key={h}
                      className="font-courier text-[10px] uppercase tracking-widest text-left px-4 py-3"
                      style={{ color: '#5A8A72' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptRows.map((row, i) => (
                  <tr
                    key={row.department}
                    style={{
                      backgroundColor: i % 2 === 0 ? '#1A3D2B' : 'transparent',
                      borderBottom: '1px solid rgba(45,106,79,0.3)',
                    }}
                  >
                    <td className="px-4 py-3 font-courier text-xs" style={{ color: '#F0EBE0' }}>
                      {row.department}
                    </td>
                    <td className="px-4 py-3 font-courier text-xs" style={{ color: '#8BB5A0' }}>
                      {row.total}
                    </td>
                    <td className="px-4 py-3">
                      {row.pendingHod > 0 ? (
                        <span
                          className="inline-flex items-center justify-center font-courier text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#C8A84B', color: '#122E1F' }}
                        >
                          {row.pendingHod}
                        </span>
                      ) : (
                        <span className="font-courier text-xs" style={{ color: '#2D6A4F' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.flagged > 0 ? (
                        <span
                          className="font-courier text-xs font-bold"
                          style={{ color: '#f87171' }}
                        >
                          {row.flagged}
                        </span>
                      ) : (
                        <span className="font-courier text-xs" style={{ color: '#2D6A4F' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-courier text-xs" style={{ color: '#4ade80' }}>
                      {row.authorised > 0 ? row.authorised : (
                        <span style={{ color: '#2D6A4F' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
