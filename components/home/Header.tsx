'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HOME_STATE_KEY } from '@/lib/home'

export default function Header() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    getUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => { listener.subscription.unsubscribe() }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const menuItems = [
    { label: '고객사 현황', onClick: () => { sessionStorage.removeItem(HOME_STATE_KEY); window.location.href = '/' } },
    { label: '활동 현황', onClick: () => router.push('/activity') },
    { label: '견적서', onClick: () => router.push('/quote') },
    { label: '자료실', onClick: () => router.push('/library') },
  ]

  return (
    <>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 20px',
        borderBottom: '1px solid #e5e5e5',
        background: '#fff',
        minHeight: 44,
      }}>
        {/* 왼쪽 - 로고 + PC메뉴 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img
            src="/headerlogo.png"
            alt="logo"
            style={{ height: 24, cursor: 'pointer' }}
            onClick={() => router.push('/')}
          />

          {/* PC 메뉴 - 모바일에서 숨김 */}
          <div style={{ display: 'flex', gap: 20 }} className="pc-menu">
            {menuItems.map((item) => (
              <span
                key={item.label}
                onClick={item.onClick}
                style={{ fontSize: 16, fontWeight: 700, color: '#111111', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* 오른쪽 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 계정 */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setIsOpen(!isOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#234ea2', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700,
              }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ fontSize: 13 }} className="pc-only">
                {user?.email || 'loading...'}
              </div>
            </div>

            {isOpen && (
          <div style={{
            position: 'absolute', right: 0, top: 40, zIndex: 10000,
            background: '#ffffff', border: '1px solid #e5e5e5',
            borderRadius: 12, padding: 8, width: 150,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          }}>
            <div
              onClick={() => { router.push('/account'); setIsOpen(false) }}
              style={{
                padding: '10px 12px', cursor: 'pointer', color: '#111111',
                fontWeight: 600, fontSize: 14, borderRadius: 8,
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              정보 수정
            </div>
            <div
              onClick={handleLogout}
              style={{
                padding: '10px 12px', cursor: 'pointer', color: '#dc2626',
                fontWeight: 600, fontSize: 14, borderRadius: 8,
              }}
            >
              로그아웃
            </div>
          </div>
        )}
          </div>

          {/* 햄버거 버튼 - 모바일에서만 표시 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="mobile-menu-btn"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, padding: 4, color: '#111111',
              display: 'none',
            }}
          >
            ☰
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {isMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'fixed', top: 44, left: 0, right: 0,
            background: '#fff', borderBottom: '1px solid #e5e5e5',
            zIndex: 9998, padding: '8px 0',
          }}
        >
          {menuItems.map((item) => (
            <div
              key={item.label}
              onClick={() => { item.onClick(); setIsMenuOpen(false) }}
              style={{
                padding: '14px 24px', fontSize: 16, fontWeight: 700,
                color: '#111111', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .pc-menu { display: none !important; }
          .pc-only { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </>
  )
}