'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { Receipt } from '@/lib/types'

const POST_PROD = ['VFX', 'Colour / DI', 'Editorial', 'Sound Post', 'Delivery / QC']

function isComplianceFlagged(r: Receipt): boolean {
  const cloudSound = Boolean(r.sound_performer_audio) &&
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

const links = [
  { href: '/receipt/new', label: 'Receipt Form' },
  { href: '/hod', label: 'HOD' },
  { href: '/producer', label: 'Producer' },
  { href: '/exec', label: 'Exec' },
  { href: '/log', label: 'Receipt Log' },
  { href: '/report', label: 'Compliance Report' },
  { href: '/lct', label: 'LCT Check Sheet' },
  { href: '/admin', label: 'OAS Admin' },
]

function NavBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span
      className="flex-shrink-0 flex items-center justify-center font-courier font-bold"
      style={{
        minWidth: '14px',
        height: '14px',
        fontSize: '0.5rem',
        lineHeight: 1,
        padding: '0 3px',
        borderRadius: '999px',
        backgroundColor: '#C8A84B',
        color: '#122E1F',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function Navigation() {
  const pathname = usePathname()
  const [hodCount, setHodCount] = useState(0)
  const [flagCount, setFlagCount] = useState(0)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch('/api/receipts')
        if (res.ok) {
          const data: Receipt[] = await res.json()
          setHodCount(data.filter((r) => r.status === 'PENDING_HOD_AUTH').length)
          setFlagCount(data.filter(isComplianceFlagged).length)
        }
      } catch {
        // silent fail
      }
    }
    fetchCounts()
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <nav
      className="no-print"
      style={{ backgroundColor: '#1A3D2B', borderBottom: '1px solid #2D6A4F' }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          <div className="flex items-center gap-3">
            <span
              className="text-xl tracking-tight leading-none"
              style={{ color: '#F0EBE0', fontFamily: 'var(--font-garamond), Georgia, serif' }}
            >
              TRACE
              <sup
                style={{
                  color: '#C8A84B',
                  fontSize: '0.5em',
                  verticalAlign: 'super',
                  fontFamily: 'var(--font-garamond)',
                }}
              >
                ©
              </sup>
            </span>
            <span
              className="hidden sm:block font-courier text-[9px] uppercase"
              style={{ color: '#8BB5A0', letterSpacing: '0.18em' }}
            >
              Artist Receipt Logger
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {links.map((link) => {
              const active =
                link.href === '/receipt/new'
                  ? pathname === '/receipt/new' || pathname === '/'
                  : pathname.startsWith(link.href)

              const isFirstSignoff = link.href === '/hod'
              const isLastSignoff = link.href === '/exec'

              const showHodBadge = (link.href === '/hod' || link.href === '/producer') && hodCount > 0
              const showAdminBadges = link.href === '/admin' && (hodCount > 0 || flagCount > 0)

              return (
                <div key={link.href} className="flex items-center">
                  {isFirstSignoff && (
                    <div className="flex items-center mr-0.5" style={{ borderLeft: '1px solid rgba(45,106,79,0.6)', height: '1.5rem', marginLeft: '4px' }} />
                  )}
                  {isFirstSignoff && (
                    <span className="font-courier mr-0.5" style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2D6A4F', whiteSpace: 'nowrap' }}>Sign-off:</span>
                  )}
                  <Link
                    href={link.href}
                    className="flex items-center gap-1 px-3 py-1.5 rounded font-courier font-medium transition-colors duration-150"
                    style={{
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: active ? '#C8A84B' : '#8BB5A0',
                      backgroundColor: active ? 'rgba(200,168,75,0.10)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = '#F0EBE0'
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = '#8BB5A0'
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <span>{link.label}</span>
                    {showHodBadge && <NavBadge count={hodCount} />}
                    {showAdminBadges && (
                      <>
                        <NavBadge count={hodCount} />
                        <NavBadge count={flagCount} />
                      </>
                    )}
                  </Link>
                  {isLastSignoff && (
                    <div className="flex items-center ml-0.5" style={{ borderLeft: '1px solid rgba(45,106,79,0.6)', height: '1.5rem', marginRight: '4px' }} />
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </nav>
  )
}
