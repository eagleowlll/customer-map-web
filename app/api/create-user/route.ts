import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { email, password, name, position, teams, initials } = await req.json()

  // 1. Auth 계정 생성
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // 이미 engineers 테이블에 있으면 update, 없으면 insert
  const { error: dbError } = await supabaseAdmin.from('engineers').upsert({
    name, position, teams, initials, email,
  }, { onConflict: 'email' })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}