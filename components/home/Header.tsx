//header 컴포넌트
'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HOME_STATE_KEY } from '@/lib/home'  // 상단에 추가


export default function Header() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
  const getUser = async () => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
  }

  getUser()

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null)
    }
  )

  return () => {
    listener.subscription.unsubscribe()
  }
}, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div
      style={{
        position: 'sticky',   
    top: 0,               
    zIndex: 9999,         
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 20px',
        borderBottom: '1px solid #e5e5e5',
        background: '#fff',
      }}
    >
      {/* 왼쪽 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <img
          src="/headerlogo.png"
          alt="logo"
          style={{ height: 24, cursor: 'pointer' }}
          onClick={() => router.push('/')}
        />

        <div style={{ display: 'flex', gap: 20 }}>
          <span
  onClick={() =>{ 
    sessionStorage.removeItem(HOME_STATE_KEY)
     window.location.href = '/' 
  }}
  style={{
    fontSize: 16,
    fontWeight: 700,
    color: '#111111',
    cursor: 'pointer',
  }}
>
  고객사 현황
</span>

<span
  onClick={() => router.push('/library')}
  style={{
    fontSize: 16,
    fontWeight: 700,
    color: '#111111',
    cursor: 'pointer',
  }}
>
  자료실
</span>
<span
  onClick={() => router.push('/engineers')}
  style={{ fontSize: 16, fontWeight: 700, color: '#111111', cursor: 'pointer' }}
>
  직원 현황
</span>

<span
  onClick={() => router.push('/activity')}
  style={{ fontSize: 16, fontWeight: 700, color: '#111111', cursor: 'pointer' }}
>
  활동 현황
</span>
        </div>
      </div>

      {/* 오른쪽 (계정) */}
      <div style={{ position: 'relative' }}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#234ea2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>

          <div style={{ fontSize: 13 }}>
            {user?.email || 'loading...'}
          </div>
        </div>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 40,
              zIndex: 10000,  
              background: '#1e1f23',
              border: '1px solid #333',
              borderRadius: 8,
              padding: 8,
              width: 120,
            }}
          >
            <div
              onClick={handleLogout}
              style={{
                padding: 8,
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              로그아웃
            </div>
          </div>
        )}
      </div>
    </div>
  )
}