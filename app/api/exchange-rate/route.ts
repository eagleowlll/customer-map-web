import { NextResponse } from 'next/server'
import https from 'https'

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
  try {
    const today = new Date()
    for (let i = 0; i < 5; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`

      const text = await httpsGet(
        `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=moGgfZ3NO89JJErPj4SrjK4bifPtlEBx&searchdate=${date}&data=AP01`
      )

      const json = JSON.parse(text)
      if (!Array.isArray(json) || json.length === 0) continue
      const jpy = json.find((x: any) => x.cur_unit === 'JPY(100)')
      if (jpy && jpy.deal_bas_r) {
        return NextResponse.json({ jpy, date })
      }
    }
    return NextResponse.json({ error: 'no data' }, { status: 500 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}