import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

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
  themeColor: '#1A3D2B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="w-full bg-[#0f2318] text-[#c8ddd1] text-[11px] text-center px-4 py-2 leading-snug font-bold">
          Confidential beta — for evaluation purposes only. TRACE© and all associated materials are the intellectual property of Laura Burrows (or her licensors) © 2026. Access to this application is by invitation. Contents are confidential and may not be reproduced or disclosed without permission.{' '}
          For more information visit{' '}
          <a href="https://traceprotocol.ai/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            traceprotocol.ai
          </a>
          .
        </div>
        <Navigation />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}
