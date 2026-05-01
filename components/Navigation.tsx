'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/receipt/new', label: 'Receipt Form' },
  { href: '/log', label: 'Receipt Log' },
  { href: '/report', label: 'Compliance Report' },
  { href: '/lct', label: 'LCT Check Sheet' },
  { href: '/admin', label: 'OAS Admin' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-trace-forest text-white no-print">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight text-white">TRACE</span>
            <span className="text-trace-pale text-xs font-medium tracking-widest uppercase hidden sm:block">
              Artist Receipt Logger
            </span>
          </div>

          <div className="flex items-center gap-1">
            {links.map((link) => {
              const active =
                link.href === '/receipt/new'
                  ? pathname === '/receipt/new' || pathname === '/'
                  : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors duration-150 ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'text-trace-pale hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
