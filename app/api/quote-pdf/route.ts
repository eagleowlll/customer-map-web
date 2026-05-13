import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  console.log('path:', path)
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.storage
    .from('quote-pdfs')
    .createSignedUrl(path, 60 * 60)

  console.log('data:', data)
  console.log('error:', error)

  if (error || !data) return NextResponse.json({ error: error?.message || 'failed' }, { status: 500 })

  return NextResponse.json({ signedUrl: data.signedUrl })
}