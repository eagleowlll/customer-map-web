//header wrapper 컴포넌트 - 로그인 페이지에서는 헤더를 숨기기 위해 사용
'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/home/Header'

export default function HeaderWrapper() {
  const pathname = usePathname()

  if (pathname === '/login') return null

  return <Header />
}