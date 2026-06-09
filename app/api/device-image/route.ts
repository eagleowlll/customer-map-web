import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const safePath = path.replace(/\.\./g, '').replace(/^\/+/, '')
  if (!safePath || safePath.includes('/'))
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })

  // 해당 경로가 실제 장비 이미지인지 DB 확인 (RLS 적용)
  const { count } = await supabase
    .from('devices')
    .select('device_id', { count: 'exact', head: true })
    .eq('image_url', safePath)
  if (!count || count === 0)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin.storage
    .from('device-images')
    .createSignedUrl(safePath, 60 * 60)

  if (error || !data) return NextResponse.json({ error: error?.message || 'failed' }, { status: 500 })
  return NextResponse.json({ signedUrl: data.signedUrl })
}
