import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const quoteId = formData.get('quoteId') as string | null
  const quoteNumber = formData.get('quoteNumber') as string | null
  const action = formData.get('action') as string | null

  if (!quoteId) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })

  const { data: sender } = await supabaseAdmin
    .from('engineers')
    .select('engineer_id, name')
    .eq('email', user.email!)
    .single()

  // 발주서 업로드
  if (action === 'upload') {
    if (!file || !quoteNumber) return NextResponse.json({ error: '파일 또는 견적번호 누락' }, { status: 400 })

    const fileName = `${quoteNumber}_${Date.now()}.pdf`
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from('purchase_orders')
      .upload(fileName, arrayBuffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const deliveryMethod = formData.get('deliveryMethod') as string | null

    await supabaseAdmin.from('quotes').update({
      status: '발주(주문 대기)',
      purchase_order_url: `purchase_orders/${fileName}`,
      purchase_order_at: new Date().toISOString(),
      delivery_method: deliveryMethod || null,
    }).eq('quote_id', Number(quoteId))

    // 영업관리팀 + superadmin 알림
    const { data: allEng } = await supabaseAdmin
      .from('engineers')
      .select('engineer_id, teams, permission_level')

    const targets = (allEng || []).filter((e: { engineer_id: number; teams: string | null; permission_level: string }) =>
      e.teams === '영업관리' || e.permission_level === 'superadmin'
    )

    if (targets.length > 0) {
      await supabaseAdmin.from('notifications').insert(
        targets.map((m: { engineer_id: number }) => ({
          engineer_id: m.engineer_id,
          title: '📦 발주서 등록',
          message: `${sender?.name || user.email}이(가) 발주서를 등록했습니다. [${quoteNumber}]`,
          type: 'purchase_order',
          link: '/purchase',
          is_read: false,
        }))
      )
    }
    return NextResponse.json({ success: true })
  }

  // 주문완료 처리
  if (action === 'complete_order') {
    const shippingDate = formData.get('shippingDate') as string | null
    const orderMemo = formData.get('orderMemo') as string | null

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('quote_number, engineer_id')
      .eq('quote_id', Number(quoteId))
      .single()

    await supabaseAdmin.from('quotes').update({
      status: '주문완료',
      shipping_date: shippingDate || null,
      order_memo: orderMemo || null,
      order_completed_at: new Date().toISOString(),
    }).eq('quote_id', Number(quoteId))

    // 견적 발행자에게 알림
    if (quote?.engineer_id) {
      await supabaseAdmin.from('notifications').insert({
        engineer_id: quote.engineer_id,
        title: '✅ 주문 완료',
        message: `[${quote.quote_number}] 주문이 완료되었습니다.${shippingDate ? ` 출하 예정: ${shippingDate}` : ''}`,
        type: 'order_completed',
        link: '/sales',
        is_read: false,
      })
    }
    return NextResponse.json({ success: true })
  }

  // 세금계산서 발행 요청
  if (action === 'request_tax') {
    const taxDate = formData.get('taxDate') as string | null

    await supabaseAdmin.from('quotes').update({
      status: '세금계산서 요청',
      tax_invoice_date: taxDate || null,
      tax_invoice_requested_at: new Date().toISOString(),
    }).eq('quote_id', Number(quoteId))

    const { data: taxAllEng } = await supabaseAdmin
      .from('engineers')
      .select('engineer_id, teams, permission_level')

    const taxTargets = (taxAllEng || []).filter((e: { engineer_id: number; teams: string | null; permission_level: string }) =>
      e.teams === '영업관리' || e.permission_level === 'superadmin'
    )

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('quote_number')
      .eq('quote_id', Number(quoteId))
      .single()

    if (taxTargets.length > 0) {
      await supabaseAdmin.from('notifications').insert(
        taxTargets.map((m: { engineer_id: number }) => ({
          engineer_id: m.engineer_id,
          title: '🧾 세금계산서 발행 요청',
          message: `${sender?.name || user.email}이(가) 세금계산서 발행을 요청했습니다. [${quote?.quote_number}]${taxDate ? ` 요청일: ${taxDate}` : ''}`,
          type: 'tax_invoice_request',
          link: '/purchase',
          is_read: false,
        }))
      )
    }
    return NextResponse.json({ success: true })
  }

  // 세금계산서 발행완료
  if (action === 'complete_tax') {
    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('quote_number, engineer_id')
      .eq('quote_id', Number(quoteId))
      .single()

    await supabaseAdmin.from('quotes').update({
      status: '매출완료',
      tax_invoice_completed_at: new Date().toISOString(),
    }).eq('quote_id', Number(quoteId))

    if (quote?.engineer_id) {
      await supabaseAdmin.from('notifications').insert({
        engineer_id: quote.engineer_id,
        title: '🎉 세금계산서 발행 완료',
        message: `[${quote.quote_number}] 세금계산서가 발행되었습니다. 매출 완료 처리되었습니다.`,
        type: 'tax_invoice_completed',
        link: '/sales',
        is_read: false,
      })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: '알 수 없는 action' }, { status: 400 })
}

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const fileName = path.replace('purchase_orders/', '')
  const { data, error } = await supabaseAdmin.storage
    .from('purchase_orders')
    .createSignedUrl(fileName, 600)

  if (error || !data?.signedUrl) return NextResponse.json({ error: 'URL 생성 실패' }, { status: 500 })
  return NextResponse.json({ signedUrl: data.signedUrl })
}
