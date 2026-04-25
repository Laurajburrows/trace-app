import type { Metadata } from 'next'
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
        <Navigation />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}
