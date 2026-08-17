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
  amberLeftBorder?: boolean
  sub?: string
}

function StatCard({ label, value, amberLeftBorder, sub }: StatCardProps) {
  const showAmber = amberLeftBorder && value > 0
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderLeft: showAmber ? '4px solid #B8860B' : '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#2D6A4F',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '2.4rem',
          lineHeight: 1,
          color: '#111827',
          fontFamily: 'var(--font-garamond), Georgia, serif',
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{sub}</span>
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
      <div style={{ padding: '64px 0', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' }}>
        Loading production data…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
        }}
        className="sm:grid-cols-4-override"
      >
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
          amberLeftBorder
          sub={flagged > 0 ? 'require attention' : undefined}
        />
      </div>

      {/* Department breakdown */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Section header */}
        <div
          style={{
            padding: '16px 24px 12px',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <h2
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#2D6A4F',
              margin: 0,
            }}
          >
            By Department
          </h2>
        </div>

        {deptRows.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <p style={{ color: '#374151', fontWeight: 500, marginBottom: '4px' }}>No receipts yet</p>
            <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
              Receipts will appear here once crew members begin submitting.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Department', 'Total', 'Pending HOD', 'Flags', 'Authorised'].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#2D6A4F',
                      textAlign: 'left',
                      padding: '10px 24px',
                    }}
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
                    backgroundColor: '#FFFFFF',
                    borderBottom: i < deptRows.length - 1 ? '1px solid #F3F4F6' : 'none',
                  }}
                >
                  <td style={{ padding: '12px 24px', color: '#111827', fontWeight: 500 }}>
                    {row.department}
                  </td>
                  <td style={{ padding: '12px 24px', color: '#6B7280' }}>
                    {row.total}
                  </td>
                  <td style={{ padding: '12px 24px' }}>
                    {row.pendingHod > 0 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: '#FFF8E1',
                          color: '#B8860B',
                          border: '1px solid #E5C46A',
                        }}
                      >
                        {row.pendingHod}
                      </span>
                    ) : (
                      <span style={{ color: '#D1D5DB' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 24px' }}>
                    {row.flagged > 0 ? (
                      <span style={{ color: '#C62828', fontWeight: 600 }}>{row.flagged}</span>
                    ) : (
                      <span style={{ color: '#D1D5DB' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 24px' }}>
                    {row.authorised > 0 ? (
                      <span style={{ color: '#2E7D32', fontWeight: 600 }}>{row.authorised}</span>
                    ) : (
                      <span style={{ color: '#D1D5DB' }}>—</span>
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
