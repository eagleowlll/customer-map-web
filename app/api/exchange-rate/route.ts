import { NextResponse } from 'next/server'
import https from 'https'

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 한국수출입은행 API는 공공기관 인증서를 사용하므로 Node.js 기본 CA에 포함되지 않을 수 있음
    // rejectUnauthorized: false는 서버-to-서버 호출(API Route)에서만 사용, 클라이언트 노출 없음
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
    for (let i = 0; i < 5; i++) {
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
