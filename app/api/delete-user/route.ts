import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  // 인증 확인
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 권한 확인 (superadmin 또는 manager만 허용)
  const { data: caller } = await supabase
    .from('engineers')
    .select('permission_level')
    .eq('email', user.email!)
    .single()
  if (!caller || !['superadmin', 'manager'].includes(caller.permission_level)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { engineer_id, email } = body

  // 필수 입력값 검증
  if (!engineer_id || !email?.trim()) {
    return NextResponse.json({ error: 'engineer_id와 email은 필수입니다.' }, { status: 400 })
  }

  // 자기 자신은 삭제 불가
  if (user.email === email.trim()) {
    return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다.' }, { status: 400 })
  }

  // 삭제 대상 권한 확인 — manager는 superadmin 또는 다른 manager 삭제 불가
  const { data: target } = await supabase
    .from('engineers')
    .select('permission_level')
    .eq('engineer_id', engineer_id)
    .single()

  if (target && ['superadmin', 'manager'].includes(target.permission_level)) {
    if (caller.permission_level !== 'superadmin') {
      return NextResponse.json({ error: '해당 계정을 삭제할 권한이 없습니다.' }, { status: 403 })
    }
  }

  // 1. Auth에서 유저 찾기
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  const targetUser = users.users.find(u => u.email === email.trim())

  // 2. Auth 계정 삭제
  if (targetUser) {
    await supabaseAdmin.auth.admin.deleteUser(targetUser.id)
  }

  // 3. engineers 테이블에서 삭제
  await supabaseAdmin.from('engineers').delete().eq('engineer_id', engineer_id)

  return NextResponse.json({ success: true })
}
