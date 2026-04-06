'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SessionManager() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const updateLastActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString())
    }

  localStorage.setItem('lastActivity', Date.now().toString())

    window.addEventListener('click', updateLastActivity)
    window.addEventListener('keydown', updateLastActivity)
    window.addEventListener('mousemove', updateLastActivity)

    return () => {
      window.removeEventListener('click', updateLastActivity)
      window.removeEventListener('keydown', updateLastActivity)
      window.removeEventListener('mousemove', updateLastActivity)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      const last = localStorage.getItem('lastActivity')
      if (!last) return

      const diff = Date.now() - Number(last)

      if (diff > 1800000) {
        await supabase.auth.signOut()
        alert('30분 동안 활동이 없어 자동 로그아웃 됩니다.')
        router.push('/login')
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [router, supabase])

  return null
}