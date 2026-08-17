'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

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

export default function Navigation() {
  const pathname = usePathname()
  const [hodCount, setHodCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/receipts?receiptStatus=PENDING_HOD_AUTH')
        if (res.ok) {
          const data = await res.json()
          setHodCount(Array.isArray(data) ? data.length : 0)
        }
      } catch {
        // silent fail — badge just won't show
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
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
                    className="relative px-3 py-1.5 rounded font-courier font-medium transition-colors duration-150"
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
                    {link.label}
                    {link.href === '/hod' && hodCount > 0 && (
                      <span
                        className="absolute flex items-center justify-center font-courier font-bold"
                        style={{
                          top: '2px',
                          right: '2px',
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
                        {hodCount > 99 ? '99+' : hodCount}
                      </span>
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
