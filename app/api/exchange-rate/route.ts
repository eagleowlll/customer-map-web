import { NextResponse } from 'next/server'
import https from 'https'

// 한국수출입은행 API는 공공기관 CA 인증서를 사용하므로 Node.js 기본 CA 번들에 포함되지 않음.
// 이 요청에 한해 TLS 검증을 우회한다. 수신 데이터는 공개 환율 숫자뿐이라 MITM 위험 무시.
// 환율은 공개 데이터이므로 인증 체크 불필요 — Vercel 쿠키 파싱 이슈 방지를 위해 미적용.
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

export async function GET() {
  const authKey = process.env.KOREA_EXIM_API_KEY
  if (!authKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const today = new Date()
    // 공휴일·주말 연속 최대 7일까지 소급 조회
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`

      const text = await httpsGet(
        `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${authKey}&searchdate=${date}&data=AP01`
      )
      const json = JSON.parse(text)
      if (!Array.isArray(json) || json.length === 0) continue
      const jpy = json.find((x: { cur_unit: string; deal_bas_r: string }) => x.cur_unit === 'JPY(100)')
      if (jpy && jpy.deal_bas_r) {
        return NextResponse.json({ jpy, date })
      }
    }
    return NextResponse.json({ error: 'no data' }, { status: 500 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
