import type { Metadata, Viewport } from 'next'
import { EB_Garamond, Courier_Prime } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-garamond',
  display: 'swap',
})

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-courier',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TRACE — Artist Receipt Logger',
  description:
    'Transparent Record of Authorship in Creative Environments. Document human authorship in AI-assisted film and television production.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TRACE',
  },
}

export const viewport: Viewport = {
  themeColor: '#0F2419',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${garamond.variable} ${courierPrime.variable}`}>
        <div
          className="no-print w-full text-center px-4 py-2 leading-snug"
          style={{
            backgroundColor: '#0A1C10',
            color: '#D4EDE1',
            borderBottom: '1px solid #1A3D2B',
            fontSize: '10px',
            fontFamily: 'var(--font-courier), "Courier New", monospace',
            letterSpacing: '0.04em',
          }}
        >
          <span style={{ color: '#C8A84B', marginRight: '0.5em' }}>●</span>
          Confidential beta — for evaluation purposes only. TRACE© and all associated materials are the intellectual property of and belongs to Laura Burrows (or her licensors) © 2026. Access is by invitation. Contents may not be reproduced or disclosed without permission.{' '}
          <a
            href="https://traceprotocol.ai/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#C8A84B', textDecoration: 'underline' }}
          >
            traceprotocol.ai
          </a>
        </div>
        <Navigation />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}
