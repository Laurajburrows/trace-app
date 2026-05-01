'use client'

import { useState, useEffect } from 'react'
import WhitelistAdmin from '@/components/WhitelistAdmin'

const CORRECT_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '1234'
const SESSION_KEY = 'trace_admin_unlocked'

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      setUnlocked(true)
    }
    setChecked(true)
  }, [])

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setUnlocked(true)
      setError('')
    } else {
      setError('Incorrect PIN. Please try again.')
      setPin('')
    }
  }

  function handleLock() {
    sessionStorage.removeItem(SESSION_KEY)
    setUnlocked(false)
    setPin('')
  }

  if (!checked) return null

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto mt-24">
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-trace-pale flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-trace-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-trace-forest">OAS / Production Admin</h1>
            <p className="text-sm text-gray-500 mt-1">Enter the admin PIN to manage the production whitelist.</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="label" htmlFor="pin">Admin PIN</label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                className="input text-center tracking-widest text-lg"
                placeholder="••••"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError('') }}
                maxLength={8}
                autoComplete="off"
                autoFocus
              />
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>
            <button type="submit" className="btn-primary w-full">
              Unlock
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Default PIN: 1234 — change per production via <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_ADMIN_PIN</code> env var.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-end mb-4">
        <button onClick={handleLock} className="btn-secondary text-xs">
          Lock Admin
        </button>
      </div>
      <WhitelistAdmin />
    </div>
  )
}
