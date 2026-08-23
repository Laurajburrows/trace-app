'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError('Incorrect password. Please try again.')
        setPassword('')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f2318',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              fontFamily: 'var(--font-garamond), Georgia, serif',
              fontSize: '2.5rem',
              color: '#F0EBE0',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            TRACE
            <sup style={{ fontSize: '0.45em', color: '#C8A84B', verticalAlign: 'super' }}>©</sup>
          </div>
          <div
            style={{
              fontSize: '9px',
              fontFamily: 'monospace',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#5A8A72',
              marginTop: '6px',
            }}
          >
            Artist Receipt Logger
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            backgroundColor: '#1A3D2B',
            border: '1px solid #2D6A4F',
            borderTop: '3px solid #C8A84B',
            borderRadius: '8px',
            padding: '32px',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-garamond), Georgia, serif',
              fontSize: '1.4rem',
              color: '#F0EBE0',
              margin: '0 0 6px 0',
            }}
          >
            Access required
          </h1>
          <p
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#8BB5A0',
              margin: '0 0 24px 0',
              lineHeight: 1.5,
            }}
          >
            This system is confidential. Enter the access password to continue.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              style={{
                width: '100%',
                backgroundColor: '#122E1F',
                border: '1px solid #2D6A4F',
                borderRadius: '4px',
                padding: '10px 12px',
                fontSize: '14px',
                color: '#F0EBE0',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '12px',
                fontFamily: 'monospace',
              }}
            />

            {error && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#f87171',
                  fontFamily: 'monospace',
                  margin: '0 0 12px 0',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%',
                backgroundColor: loading || !password ? '#2D6A4F' : '#C8A84B',
                color: loading || !password ? '#8BB5A0' : '#122E1F',
                border: 'none',
                borderRadius: '4px',
                padding: '11px',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: loading || !password ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#2D6A4F',
            marginTop: '24px',
            letterSpacing: '0.05em',
          }}
        >
          TRACE© — Confidential beta. Access by invitation only.
        </p>
      </div>
    </div>
  )
}
