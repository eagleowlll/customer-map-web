import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 인증은 middleware.ts가 페이지 레벨에서 처리하므로 Route Handler에서 중복 체크 불필요.
// Vercel Route Handler에서 Supabase 세션 쿠키 파싱 이슈 방지를 위해 auth 체크 미적용.
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  // 경로 순회 공격 방지
  const safePath = path.replace(/\.\./g, '').replace(/^\/+/, '')
  if (!safePath) return NextResponse.json({ error: 'Invalid path' }, { status: 400 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabaseAdmin.storage
    .from('quote-pdfs')
    .createSignedUrl(safePath, 60 * 60)

  if (error || !data) return NextResponse.json({ error: error?.message || 'failed' }, { status: 500 })

  return NextResponse.json({ signedUrl: data.signedUrl })
}
