import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { engineer_id, email } = await req.json()

  // 1. Auth에서 유저 찾기
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  const user = users.users.find(u => u.email === email)

  // 2. Auth 계정 삭제
  if (user) {
    await supabaseAdmin.auth.admin.deleteUser(user.id)
  }

  // 3. engineers 테이블에서 삭제
  await supabaseAdmin.from('engineers').delete().eq('engineer_id', engineer_id)

  return NextResponse.json({ success: true })
}