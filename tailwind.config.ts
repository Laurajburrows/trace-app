import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        trace: {
          forest: '#1A3D2B',
          moss: '#2D6A4F',
          pale: '#D4EDE1',
          'pale-dark': '#B8DDC8',
        },
        status: {
          green: '#2E7D32',
          'green-bg': '#E8F5E9',
          yellow: '#C8841A',
          'yellow-bg': '#FFF8E1',
          red: '#C62828',
          'red-bg': '#FFEBEE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
