'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'white',
      borderBottom: '1px solid #E5E5E5',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <Link href="/">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🌿</span>
          <span style={{ fontSize: '18px', fontWeight: '700' }}>
            <span style={{ color: '#1A1A1A' }}>eco</span>
            <span style={{ color: '#E55A2B' }}>cart</span>
          </span>
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link href="/store" style={{ fontSize: '14px', color: '#444', fontWeight: '500' }}>
          Green Store
        </Link>
        <Link href="/groups" style={{ fontSize: '14px', color: '#444', fontWeight: '500' }}>
          Group Buys
        </Link>
        {user ? (
          <>
            <Link href="/dashboard" style={{ fontSize: '14px', color: '#444', fontWeight: '500' }}>
              Dashboard
            </Link>
            <button onClick={signOut} style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #E5E5E5',
              background: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#444'
            }}>
              Sign out
            </button>
          </>
        ) : (
          <Link href="/login">
            <button style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#1D9E75',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              Sign in
            </button>
          </Link>
        )}
      </div>
    </nav>
  )
}