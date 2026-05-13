import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.storage
    .from('quote-pdfs')
    .createSignedUrl(path, 60 * 60) // 1시간 유효

  if (error || !data) return NextResponse.json({ error: 'failed' }, { status: 500 })

  return NextResponse.json({ signedUrl: data.signedUrl })
}