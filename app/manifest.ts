import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TRACE Artist Receipt Logger',
    short_name: 'TRACE',
    description: 'Transparent Record of Authorship in Creative Environments',
    start_url: '/receipt/new',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1A3D2B',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
