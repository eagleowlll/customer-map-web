'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Document, Page, Text, View, StyleSheet, Image, PDFViewer, Font
} from '@react-pdf/renderer'

// ── 굴림체 폰트 등록 ──────────────────────────────────────────────────────────
Font.register({
  family: 'NotoSansCJK',
  src: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf',
})

// ── 타입 ──────────────────────────────────────────────────────────────────────
type Engineer = {
  engineer_id: number
  name: string
  position: string | null
  email: string | null
  initials: string | null
}

type PriceItem = {
  id: number
  sheet_name: string
  item_code: string
  item_name_jp: string | null
  model_jp: string | null
  item_name_en: string | null
  model_en: string | null
  price_jpy: number | null
  cost_jpy: number | null
}

type QuoteRow = {
  id: string
  itemText: string
  selectedItem: PriceItem | null
  subLines: string[]
  quantity: number
  manual_unit_price: number
  tariff_rate: number
  exchange_rate: number
  profit_rate: number
  unit_price: number
  supply_price: number
  tax: number
  cost_price_jpy: number
  product_price: number
  profit: number
}

// ── 계산 함수 ─────────────────────────────────────────────────────────────────
function calcRow(row: QuoteRow, rate: number): QuoteRow {
  const exRate = rate || row.exchange_rate
  if (row.selectedItem?.cost_jpy && exRate) {
    const costJpy = row.selectedItem.cost_jpy
    const rawUnit = (costJpy * exRate * row.tariff_rate) / (1 - row.profit_rate / 100)
   const unitPrice = Math.ceil(rawUnit / 1000) * 1000
    const supplyPrice = unitPrice * row.quantity
    const tax = Math.round(supplyPrice * 0.1)
    const productPrice = Math.round(costJpy * exRate * row.tariff_rate * row.quantity)
    return {
      ...row, exchange_rate: exRate,
      cost_price_jpy: costJpy, unit_price: unitPrice,
      supply_price: supplyPrice, tax,
      product_price: productPrice, profit: supplyPrice - productPrice,
    }
  } else {
    const unitPrice = row.manual_unit_price
    const supplyPrice = unitPrice * row.quantity
    const tax = Math.round(supplyPrice * 0.1)
    return {
      ...row, exchange_rate: exRate,
      unit_price: unitPrice, supply_price: supplyPrice, tax,
      cost_price_jpy: 0, product_price: 0, profit: supplyPrice,
    }
  }
}

function createRow(): QuoteRow {
  return {
    id: Math.random().toString(36).slice(2),
    itemText: '', selectedItem: null, subLines: [],
    quantity: 1, manual_unit_price: 0,
    tariff_rate: 1.13, exchange_rate: 0, profit_rate: 40,
    unit_price: 0, supply_price: 0, tax: 0,
    cost_price_jpy: 0, product_price: 0, profit: 0,
  }
}

// ── 숫자 포맷 ─────────────────────────────────────────────────────────────────
const numKR = (n: number) => n.toLocaleString('ko-KR')

function amountToKorean(n: number): string {
  if (n === 0) return '영원 정'
  const units = ['', '만', '억', '조']
  const nums = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
  let result = '', unitIdx = 0, num = n
  while (num > 0) {
    const chunk = num % 10000
    if (chunk > 0) {
      let s = ''
      const t = Math.floor(chunk / 1000), h = Math.floor((chunk % 1000) / 100)
      const te = Math.floor((chunk % 100) / 10), o = chunk % 10
      if (t > 0) s += (t > 1 ? nums[t] : '') + '천'
      if (h > 0) s += (h > 1 ? nums[h] : '') + '백'
      if (te > 0) s += (te > 1 ? nums[te] : '') + '십'
      if (o > 0) s += nums[o]
      result = s + units[unitIdx] + result
    }
    num = Math.floor(num / 10000); unitIdx++
  }
  return result + '원 정'
}

// ── PDF 스타일 ────────────────────────────────────────────────────────────────
const THICK = 1.3
const THIN = 0.5
const COL = { name: '48%', qty: '7%', unit: '15%', supply: '17%', tax: '13%' }

const S = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansCJK',
    fontSize: 9,
    paddingTop: 38, paddingBottom: 25,
    paddingLeft: 30, paddingRight: 30,
    backgroundColor: '#ffffff',
  },
  // 제목 — 이중밑줄 효과는 borderBottom으로 구현
  
 titleText: {
  fontSize: 22, fontFamily: 'NotoSansCJK',
  letterSpacing: 8, textAlign: 'center',
  paddingBottom: 3,
},
 titleUnderlineWrap: { alignItems: 'center', marginBottom: 2 },
titleLine1: { height: 2, backgroundColor: '#000', width: '100%', marginBottom: 2 },
titleLine2: { height: 1, backgroundColor: '#000', width: '100%' },
  dateRow: { textAlign: 'center', fontSize: 10, marginBottom: 10 },
  headerRow: { flexDirection: 'row', marginBottom: 4 },
  headerLeft: { flex: 1 },
  companyName: { fontSize: 12, fontFamily: 'NotoSansCJK', textDecoration: 'underline', marginBottom: 4 },
  headerSubText: { fontSize: 10, marginBottom: 5 },
  conditionRow: { flexDirection: 'row', marginBottom: 3 },
  conditionLabel: { fontSize: 10, width: 85, paddingLeft: 8 },
  conditionValue: { fontSize: 10 },
  headerRight: { width: 195, alignItems: 'flex-start' },
  logo: { width: 125, height: 30, marginBottom: 4 },
  headerRightText: { fontSize: 9.5, textAlign: 'left', marginBottom: 2 },
dividerBox: {
  borderTopWidth: THICK, borderColor: '#000',
  paddingVertical: 4, marginTop: 5, marginBottom: 0,
  flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
},
  dividerText: { fontSize: 11, fontFamily: 'NotoSansCJK', textAlign: 'center' },
  table: { width: '100%', borderWidth: THICK, borderColor: '#000' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f4a460', borderBottomWidth: THICK, borderBottomColor: '#000' },
  th: { borderRightWidth: THICK, borderRightColor: '#000', paddingVertical: 1, paddingHorizontal: 3, fontFamily: 'NotoSansCJK', fontSize: 9, textAlign: 'center' },
  thLast: { paddingVertical: 1, paddingHorizontal: 3, fontFamily: 'NotoSansCJK', fontSize: 9, textAlign: 'center' },
  itemRow: { flexDirection: 'row', borderTopWidth: THIN, borderTopColor: '#999', minHeight: 16 },
  td: { borderRightWidth: THICK, borderRightColor: '#000', paddingVertical: 3, paddingHorizontal: 4, fontSize: 9 },
  tdLast: { paddingVertical: 3, paddingHorizontal: 4, fontSize: 9 },
  tdCenter: { textAlign: 'center' },
  tdRight: { textAlign: 'right' },
  // 비고행 — 세로줄 유지
  remarkRow: { flexDirection: 'row', minHeight: 80 },
  remarkContent: { flex: 1, borderRightWidth: THICK, borderRightColor: '#000', padding: 6 },
  remarkRight: { flexDirection: 'column', width: 0 },
  remarkLine: { fontSize: 8.5, marginBottom: 2 },
  // 합계행 — 굵은 가로선
  summaryRow: { flexDirection: 'row', borderTopWidth: THICK, borderTopColor: '#000', height: 22, alignItems: 'center' },
titleItemRow: { flexDirection: 'row', borderTopWidth: THICK, borderTopColor: '#000', borderBottomWidth: THICK, borderBottomColor: '#000' },
})
// ── PDF 문서 컴포넌트 ─────────────────────────────────────────────────────────
type PDFDocProps = {
  company: string
  receiver: string
  quoteNo: string
  dateDisplay: string
  titleItem: string
  rows: QuoteRow[]
  remarks: string
  engineerName: string
  totalSupply: number
  totalTax: number
  totalAmount: number
}

function QuotePDFDoc({
  company, receiver, quoteNo, dateDisplay, titleItem,
  rows, remarks, engineerName,
  totalSupply, totalTax, totalAmount
}: PDFDocProps) {
  const EMPTY_ROWS = Math.max(0, 10 - rows.length)

  return (
    <Document>
      <Page size="A4" style={S.page}>

       {/* 제목 */}
<View style={{ position: 'relative', marginBottom: 3 }}>
  <View style={{ alignItems: 'center', marginBottom: 0 }}>
    <Text style={S.titleText}>見　積　書</Text>
    <View style={{ height: 2, backgroundColor: '#000', width: 150, marginBottom: 2 }} />
<View style={{ height: 2, backgroundColor: '#000', width: 150 }} />
  </View>
          <View style={{ position: 'absolute', right: 0, top: 8 }}>
            <Text style={{ fontSize: 9, textAlign: 'right', marginBottom: 3 }}>{quoteNo}</Text>
            {receiver
              ? <Text style={{ fontSize: 9, textAlign: 'right' }}>수신인 : {receiver}</Text>
              : null}
          </View>
        </View>

        {/* 날짜 */}
        <Text style={S.dateRow}>西紀　{dateDisplay}</Text>

        {/* 회사 헤더 */}
        <View style={S.headerRow}>
          <View style={S.headerLeft}>
            <Text style={S.companyName}>{company || '　'} 貴下</Text>
            <Text style={S.headerSubText}>下記와 如히 견적함</Text>
            {[
              ['1.납품일정 :', '담당자와 협의'],
              ['2.지불조건 :', '현금'],
              ['3.인도조건 :', '지정장소'],
              ['4.견적유효 :', '작성일로부터 1개월'],
            ].map(([label, val]) => (
              <View key={label} style={S.conditionRow}>
                <Text style={S.conditionLabel}>{label}</Text>
                <Text style={S.conditionValue}>{val}</Text>
              </View>
            ))}
          </View>
          <View style={S.headerRight}>
            <Image src="/quotelogo.png" style={S.logo} />
            <Text style={S.headerRightText}>화성시 동탄대로 24길 31-8</Text>
            <Text style={S.headerRightText}>Accretech Korea Co., Ltd.</Text>
            <Text style={S.headerRightText}>대표이사 이상철</Text>
            <Text style={S.headerRightText}>대표전화 031)786-4093</Text>
          </View>
        </View>

        {/* 一金 */}
        <View style={S.dividerBox}>
          <Text style={S.dividerText}>
            一金　　{amountToKorean(totalSupply)}　　({totalSupply > 0 ? `₩${numKR(totalSupply)}` : '₩0'} -)　　부가세 별도
          </Text>
        </View>

        {/* 테이블 */}
        <View style={S.table}>

          {/* 헤더 */}
          <View style={S.tableHeader}>
            <Text style={[S.th, { width: COL.name }]}>品　　名</Text>
            <Text style={[S.th, { width: COL.qty }]}>數量</Text>
            <Text style={[S.th, { width: COL.unit }]}>單價</Text>
            <Text style={[S.th, { width: COL.supply }]}>供給價額</Text>
            <Text style={[S.thLast, { width: COL.tax }]}>附加稅</Text>
          </View>

          {/* 견적 내용 제목 — 품명 셀에만 */}
          {titleItem ? (
            <View style={{ flexDirection: 'row', borderBottomWidth: THICK, borderBottomColor: '#000' }}>
              <View style={[S.td, { width: COL.name, paddingVertical: 2 }]}>
                <Text style={{ textAlign: 'center', fontFamily: 'NotoSansCJK', fontSize: 9 }}>{titleItem}</Text>
              </View>
              <View style={[S.td, { width: COL.qty }]} />
              <View style={[S.td, { width: COL.unit }]} />
              <View style={[S.td, { width: COL.supply }]} />
              <View style={[S.tdLast, { width: COL.tax }]} />
            </View>
          ) : null}

          {/* 품목 행 */}
          {rows.map((row) => (
  <View key={row.id} style={[S.itemRow, { borderBottomWidth: THICK, borderBottomColor: '#000' }]}>
    <View style={[S.td, { width: COL.name }]}>
      <Text>
        {row.itemText}{row.selectedItem
          ? `(${row.selectedItem.model_jp || row.selectedItem.item_code})`
          : ''}
      </Text>
      {row.subLines.map((line, i) =>
        line ? <Text key={i} style={{ fontSize: 8.5, marginTop: 1 }}>{line}</Text> : null
      )}
    </View>
    {/* 수량 — 세로 중앙정렬 */}
    <View style={[S.td, { width: COL.qty, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ textAlign: 'center' }}>{row.quantity > 0 ? String(row.quantity) : ''}</Text>
    </View>
    {/* 단가 — 세로 중앙정렬 */}
    <View style={[S.td, { width: COL.unit, justifyContent: 'center', alignItems: 'flex-end' }]}>
      <Text>{row.unit_price > 0 ? `₩  ${numKR(row.unit_price)}` : ''}</Text>
    </View>
    {/* 공급가 — 세로 중앙정렬 */}
    <View style={[S.td, { width: COL.supply, justifyContent: 'center', alignItems: 'flex-end' }]}>
      <Text>{row.supply_price > 0 ? `₩  ${numKR(row.supply_price)}` : ''}</Text>
    </View>
    {/* 부가세 — 세로 중앙정렬 */}
    <View style={[S.tdLast, { width: COL.tax, justifyContent: 'center', alignItems: 'flex-end' }]}>
      <Text style={{ paddingRight: 4 }}>{row.tax > 0 ? `₩  ${numKR(row.tax)}` : ''}</Text>
    </View>
  </View>
))}

          {/* 빈 행 — 세로줄 유지, 가로선 없음 */}
          <View style={{ flexDirection: 'row', height: EMPTY_ROWS * 18 }}>
            <View style={{ width: COL.name, borderRightWidth: THICK, borderRightColor: '#000' }} />
            <View style={{ width: COL.qty, borderRightWidth: THICK, borderRightColor: '#000' }} />
            <View style={{ width: COL.unit, borderRightWidth: THICK, borderRightColor: '#000' }} />
            <View style={{ width: COL.supply, borderRightWidth: THICK, borderRightColor: '#000' }} />
            <View style={{ width: COL.tax }} />
          </View>

          {/* 비고 — 세로줄 유지 */}
          <View style={S.remarkRow}>
            <View style={S.remarkContent}>
              <Text style={[S.remarkLine, { fontFamily: 'NotoSansCJK' }]}>　비고</Text>
              {remarks.split('\n').map((line, i) => (
                <Text key={i} style={S.remarkLine}>{line}</Text>
              ))}
              <Text style={[S.remarkLine, { marginTop: 2 }]}>* 담당자 : {engineerName}</Text>
            </View>
            {/* 오른쪽 4개 컬럼 세로줄 유지 */}
            <View style={{ width: COL.qty, borderLeftWidth: 0, borderRightWidth: THICK, borderRightColor: '#000' }} />
            <View style={{ width: COL.unit, borderRightWidth: THICK, borderRightColor: '#000' }} />
            <View style={{ width: COL.supply, borderRightWidth: THICK, borderRightColor: '#000' }} />
            <View style={{ width: COL.tax }} />
          </View>

          {/* 합계/부가세/총계 — 굵은 가로선 */}
          {[
            { label: '합　　계', value: totalSupply },
            { label: '부 가 세', value: totalTax },
            { label: '총　　계', value: totalAmount },
          ].map(({ label, value }) => (
            <View key={label} style={S.summaryRow}>
              <View style={[S.td, { width: COL.name, height: 22, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>{label}</Text>
              </View>
              <View style={[S.td, { width: COL.qty, height: 22 }]} />
              <View style={[S.td, { width: COL.unit, height: 22 }]} />
              <View style={[S.td, { width: COL.supply, height: 22 }]} />
              <View style={[S.tdLast, { width: COL.tax, height: 22, justifyContent: 'center' }]}>
                <Text style={{ fontSize: 9, textAlign: 'right', paddingRight: 4 }}>
                  {value > 0 ? `₩${numKR(value)}` : ''}
                </Text>
              </View>
            </View>
          ))}

        </View>

      </Page>
    </Document>
  )
}

// ── 수익 분석 패널 ────────────────────────────────────────────────────────────
type ProfitPanelProps = {
  rows: QuoteRow[]
  exchangeRate: number
  rateUpdatedAt: string
  rateLoading: boolean
  onFetchRate: () => void
}

function ProfitPanel({ rows, exchangeRate, rateUpdatedAt, rateLoading, onFetchRate }: ProfitPanelProps) {
  const totalSupply = rows.reduce((s, r) => s + r.supply_price, 0)
  const totalProduct = rows.reduce((s, r) => s + r.product_price, 0)
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0)
  const profitPct = totalSupply > 0 ? (totalProfit / totalSupply) * 100 : 0
  const isGood = profitPct >= 40

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `2px solid ${isGood ? '#16a34a' : '#dc2626'}`, marginBottom: 14, overflow: 'hidden' }}>
      
      {/* 상단 헤더 */}
      <div style={{ background: isGood ? '#f0fdf4' : '#fef2f2', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontSize: 13, fontWeight: 800, color: '#1C3557' }}>📊 수익 분석</span>
    <span style={{ fontSize: 11, color: '#6b7280' }}>
      {exchangeRate ? `💱 ${exchangeRate.toFixed(4)}원` : '환율 로딩중...'}
      {rateUpdatedAt && ` (${rateUpdatedAt})`}
    </span>
    <button onClick={onFetchRate} disabled={rateLoading}
      style={{ padding: '2px 8px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 11, color: '#374151' }}>
      {rateLoading ? '갱신중...' : '🔄'}
    </button>
  </div>
  <span style={{
    fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20,
    background: isGood ? '#16a34a' : '#dc2626', color: '#fff'
  }}>
    {isGood ? '✓' : '⚠'} 이익률 {profitPct.toFixed(1)}%
  </span>
</div>

      {/* 항목별 상세 */}
      <div style={{ padding: '12px 16px' }}>
        {rows.map((r, i) => r.supply_price > 0 && (
          <div key={r.id} style={{ marginBottom: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>
              품목 {i + 1} {r.itemText && `— ${r.itemText}`}{r.selectedItem && ` (${r.selectedItem.model_jp})`}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {r.selectedItem && (<>
                <div style={{ background: '#fff', borderRadius: 6, padding: '6px 10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>구입가</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>¥{r.cost_price_jpy.toLocaleString()}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 6, padding: '6px 10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>관세 × 환율</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>×{r.tariff_rate} × {r.exchange_rate.toFixed(2)}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 6, padding: '6px 10px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>상품가 (원가)</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>₩{numKR(r.product_price)}</div>
                </div>
              </>)}
              <div style={{ background: '#fff', borderRadius: 6, padding: '6px 10px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>판매단가</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3557' }}>₩{numKR(r.unit_price)}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 6, padding: '6px 10px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>공급가</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3557' }}>₩{numKR(r.supply_price)}</div>
              </div>
              <div style={{ background: r.profit >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 6, padding: '6px 10px', border: `1px solid ${r.profit >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>매출이익 ({r.profit_rate}%)</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: r.profit >= 0 ? '#16a34a' : '#dc2626' }}>₩{numKR(r.profit)}</div>
              </div>
            </div>
          </div>
        ))}

        {/* 합계 요약 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>공급가 합계</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1C3557' }}>₩{numKR(totalSupply)}</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>상품가 합계</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#374151' }}>₩{numKR(totalProduct)}</div>
          </div>
          <div style={{ background: isGood ? '#f0fdf4' : '#fef2f2', borderRadius: 8, padding: '10px 12px', border: `1px solid ${isGood ? '#bbf7d0' : '#fecaca'}`, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>매출이익 합계</div>
           <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
  <span style={{ fontSize: 14, fontWeight: 800, color: isGood ? '#16a34a' : '#dc2626' }}>
    ₩{numKR(totalProfit)}
  </span>
  <span style={{ fontSize: 12, fontWeight: 700, color: isGood ? '#16a34a' : '#dc2626' }}>
    ({profitPct.toFixed(1)}%)
  </span>
</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function QuotePage() {
  const supabase = createClient()
  const [isClient, setIsClient] = useState(false)

  const [engineer, setEngineer] = useState<Engineer | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number>(0)
  const [rateUpdatedAt, setRateUpdatedAt] = useState('')
  const [rateLoading, setRateLoading] = useState(false)

  const [company, setCompany] = useState('')
  const [receiver, setReceiver] = useState('')
  const [titleItem, setTitleItem] = useState('')
const [remarks, setRemarks] = useState(
  '* 납기 : \n* E.U  : \n* 발주 진행 시 팩스 또는 메일로 발주서 회신 요망\n   (FAX : 031-786-4090)'
)

  const [rows, setRows] = useState<QuoteRow[]>([createRow()])
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({})
  const [searchResults, setSearchResults] = useState<Record<string, PriceItem[]>>({})
  const [searchOpen, setSearchOpen] = useState<Record<string, boolean>>({})

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = today.getMonth() + 1
  const dd = today.getDate()
  const dateStr = `${yyyy}${String(mm).padStart(2, '0')}${String(dd).padStart(2, '0')}`
  const dateDisplay = `${yyyy}年　${String(mm).padStart(2, '0')}月　${String(dd).padStart(2, '0')}日`
const [seqIndex, setSeqIndex] = useState(0) // 0=A, 1=B, 2=C...
const seqLetter = String.fromCharCode(65 + seqIndex)
useEffect(() => {
  if (!engineer) return
  const f = async () => {
    const { data } = await supabase
      .from('quote_sequence')
      .select('seq')
      .eq('date_str', dateStr)
      .eq('engineer_id', engineer.engineer_id)
      .order('seq', { ascending: false })
      .limit(1)
      .single()
   const nextSeq = data ? data.seq : 0
setSeqIndex(nextSeq)
  }
  f()
}, [engineer])

const quoteNo = `No.${(engineer?.initials || 'KJW').toUpperCase()}${dateStr}-${seqLetter}`

  const totalSupply = rows.reduce((s, r) => s + r.supply_price, 0)
  const totalTax = rows.reduce((s, r) => s + r.tax, 0)
  const totalAmount = totalSupply + totalTax
  const engineerName = engineer ? `${engineer.name} ${engineer.position || ''}`.trim() : ''

  useEffect(() => { setIsClient(true) }, [])

  useEffect(() => {
    const f = async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user?.email) return
      const { data } = await supabase.from('engineers').select('*').eq('email', u.user.email).single()
      if (data) setEngineer(data)
    }
    f()
  }, [])

  const fetchRate = useCallback(async () => {
    setRateLoading(true)
    try {
      const { data } = await supabase.from('exchange_rate').select('*').order('id', { ascending: false }).limit(1).single()
      const todayStr = new Date().toISOString().slice(0, 10)
      if (data && data.updated_at === todayStr) {
        setExchangeRate(Number(data.rate))
        setRateUpdatedAt(data.updated_at)
        setRateLoading(false)
        return
      }
      const res = await fetch('/api/exchange-rate')
      const json = await res.json()
      const jpy = json.jpy
      if (jpy) {
        const rate = parseFloat(jpy.deal_bas_r.replace(',', '')) / 100
        setExchangeRate(rate)
        setRateUpdatedAt(todayStr)
        await supabase.from('exchange_rate').insert([{ rate, updated_at: todayStr }])
      }
    } catch (e) { console.error(e) }
    setRateLoading(false)
  }, [])

  useEffect(() => { fetchRate() }, [fetchRate])

  useEffect(() => {
    if (!exchangeRate) return
    setRows(prev => prev.map(r => calcRow(r, exchangeRate)))
  }, [exchangeRate])

  const handleSearch = async (rowId: string, q: string) => {
    setSearchQuery(prev => ({ ...prev, [rowId]: q }))
    if (!q.trim()) { setSearchResults(prev => ({ ...prev, [rowId]: [] })); return }
    const { data } = await supabase.from('price_list').select('*')
      .or(`item_code.ilike.%${q}%,model_jp.ilike.%${q}%`).limit(20)
    setSearchResults(prev => ({ ...prev, [rowId]: data || [] }))
    setSearchOpen(prev => ({ ...prev, [rowId]: true }))
  }

  const handleSelect = (rowId: string, item: PriceItem) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r
      return calcRow({ ...r, selectedItem: item }, exchangeRate)
    }))
    setSearchOpen(prev => ({ ...prev, [rowId]: false }))
    setSearchQuery(prev => ({ ...prev, [rowId]: item.model_jp || item.item_code }))
  }

  const updateRow = (rowId: string, field: keyof QuoteRow, value: any) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r
      return calcRow({ ...r, [field]: value }, exchangeRate)
    }))
  }

  const clearItem = (rowId: string) => {
    setRows(prev => prev.map(r =>
      r.id !== rowId ? r : calcRow({ ...r, selectedItem: null, manual_unit_price: 0 }, exchangeRate)
    ))
    setSearchQuery(prev => ({ ...prev, [rowId]: '' }))
    setSearchResults(prev => ({ ...prev, [rowId]: [] }))
  }

  const updateSubLine = (rowId: string, idx: number, val: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r
      const lines = [...r.subLines]; lines[idx] = val
      return { ...r, subLines: lines }
    }))
  }
  const addSubLine = (rowId: string) =>
    setRows(prev => prev.map(r => r.id !== rowId ? r : { ...r, subLines: [...r.subLines, ''] }))
  const removeSubLine = (rowId: string, idx: number) =>
    setRows(prev => prev.map(r =>
      r.id !== rowId ? r : { ...r, subLines: r.subLines.filter((_, i) => i !== idx) }
    ))

  const inp: React.CSSProperties = {
    padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 5,
    fontSize: 12, outline: 'none', background: '#fff', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: '#eef0f4', minHeight: '100vh', fontFamily: 'Malgun Gothic, sans-serif' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: 20, display: 'flex', gap: 20 }}>

        {/* ── 왼쪽 입력 패널 ── */}
        <div style={{ width: 420, flexShrink: 0 }}>

{/* 기본 정보 */}
<div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 14, border: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#1C3557', marginBottom: 10 }}>기본 정보</div>

{/* 사명 */}
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
  <span style={{ fontSize: 12, color: '#374151', whiteSpace: 'nowrap', width: 60 }}>사명</span>
  <input value={company} onChange={e => setCompany(e.target.value)}
    placeholder="예: 젠트"
    style={{ ...inp, flex: 1 }} />
</div>

{/* 수신인 */}
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
  <span style={{ fontSize: 12, color: '#374151', whiteSpace: 'nowrap', width: 60 }}>수신인</span>
  <input value={receiver} onChange={e => setReceiver(e.target.value)}
    placeholder="예: 홍길동 부장님"
    style={{ ...inp, flex: 1 }} />
</div>

{/* 견적 내용 */}
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
  <span style={{ fontSize: 12, color: '#374151', whiteSpace: 'nowrap', width: 60 }}>견적 내용</span>
  <input value={titleItem} onChange={e => setTitleItem(e.target.value)}
    placeholder="예: 측정기 부품 견적의 건"
    style={{ ...inp, flex: 1 }} />
</div>

{/* 비고 */}
<div>
  <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>비고</div>
  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={4}
    style={{ ...inp, width: '100%', resize: 'vertical', lineHeight: 1.8 }} />
</div>
</div>
          {/* 수익 분석 (환율 포함) */}
          <ProfitPanel
            rows={rows}
            exchangeRate={exchangeRate}
            rateUpdatedAt={rateUpdatedAt}
            rateLoading={rateLoading}
            onFetchRate={fetchRate}
          />
          {/* 품목 */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#1C3557', marginBottom: 10 }}>📦 품목</div>

            {rows.map((row, rowIdx) => (
              <div key={row.id} style={{
                background: '#f8fafc', borderRadius: 10, padding: '12px',
                marginBottom: 10, border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>품목 {rowIdx + 1}</span>
                  <button onClick={() => setRows(prev => prev.filter(r => r.id !== row.id))}
                    style={{ padding: '2px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                    삭제
                  </button>
                </div>

                {/* 품명 앞 내용 */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>품명 앞 내용</div>
                  <input value={row.itemText}
                    onChange={e => updateRow(row.id, 'itemText', e.target.value)}
                    placeholder="예: 1. 스타일러스"
                    style={{ ...inp, width: '100%' }} />
                </div>

                {/* 상품 검색 */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>
                    상품 검색{row.selectedItem && <span style={{ color: '#16a34a', fontWeight: 700 }}> ✓ 선택됨</span>}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={searchQuery[row.id] || ''}
                      onChange={e => handleSearch(row.id, e.target.value)}
                      onFocus={() => setSearchOpen(prev => ({ ...prev, [row.id]: true }))}
                      placeholder="코드 또는 모델명 검색"
                      style={{ ...inp, width: '100%' }}
                    />
                    {searchOpen[row.id] && (searchResults[row.id] || []).length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
                        background: '#fff', border: '1px solid #ccc', borderRadius: 6,
                        maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
                      }}>
                        {searchResults[row.id].map(item => (
                          <div key={item.id} onClick={() => handleSelect(row.id, item)}
                            style={{ padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: 11 }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                            <span style={{ fontWeight: 700, color: '#234ea2' }}>{item.item_code}</span>
                            <span style={{ marginLeft: 6 }}>{item.item_name_jp}</span>
                            <span style={{ marginLeft: 6, color: '#666' }}>({item.model_jp})</span>
                            <div style={{ color: '#999', marginTop: 2 }}>
                              정가:¥{item.price_jpy?.toLocaleString()} / 구입가:¥{item.cost_jpy?.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {row.selectedItem && (
                    <button onClick={() => clearItem(row.id)}
                      style={{ marginTop: 4, padding: '2px 8px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                      품목 해제
                    </button>
                  )}
                </div>
{/* 수량 / 이익률 / 관세율 한줄 */}
<div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
  {/* 수량 */}
  <div style={{ flex: 1, textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>수량</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <button onClick={() => updateRow(row.id, 'quantity', Math.max(1, row.quantity - 1))}
        style={{ width: 22, height: 22, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>▼</button>
      <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{row.quantity}</span>
      <button onClick={() => updateRow(row.id, 'quantity', row.quantity + 1)}
        style={{ width: 22, height: 22, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>▲</button>
    </div>
  </div>

  <div style={{ width: 1, height: 36, background: '#e5e7eb' }} />

  {/* 이익률 */}
  <div style={{ flex: 1, textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>이익률</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <button onClick={() => updateRow(row.id, 'profit_rate', Math.max(0, row.profit_rate - 5))}
        style={{ width: 22, height: 22, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>▼</button>
      <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 800, fontSize: 13, color: row.profit_rate >= 40 ? '#16a34a' : '#dc2626' }}>
        {row.profit_rate}%
      </span>
      <button onClick={() => updateRow(row.id, 'profit_rate', Math.min(95, row.profit_rate + 5))}
        style={{ width: 22, height: 22, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>▲</button>
    </div>
  </div>

  <div style={{ width: 1, height: 36, background: '#e5e7eb' }} />

  {/* 관세율 */}
  <div style={{ flex: 1, textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>관세율</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <button onClick={() => updateRow(row.id, 'tariff_rate', parseFloat((row.tariff_rate - 0.01).toFixed(2)))}
        style={{ width: 22, height: 22, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>▼</button>
      <span style={{ minWidth: 36, textAlign: 'center', fontSize: 12 }}>×{row.tariff_rate.toFixed(2)}</span>
      <button onClick={() => updateRow(row.id, 'tariff_rate', parseFloat((row.tariff_rate + 0.01).toFixed(2)))}
        style={{ width: 22, height: 22, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11 }}>▲</button>
    </div>
  </div>

  {/* 수동단가 (품목 미선택시) */}
  {!row.selectedItem && (
    <>
      <div style={{ width: 1, height: 36, background: '#e5e7eb' }} />
      <div style={{ flex: 2 }}>
        <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>단가직접입력</div>
        <input type="number" value={row.manual_unit_price || ''}
          onChange={e => updateRow(row.id, 'manual_unit_price', parseInt(e.target.value) || 0)}
          placeholder="0"
          style={{ ...inp, width: '100%', textAlign: 'right', fontSize: 12 }} />
      </div>
    </>
  )}
</div>

                {/* 세부항목 */}
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>세부항목</div>
                  {row.subLines.map((line, li) => (
                    <div key={li} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      <input value={line} onChange={e => updateSubLine(row.id, li, e.target.value)}
                        placeholder="예: - Leaf Spring 교체"
                        style={{ ...inp, flex: 1, fontSize: 11 }} />
                      <button onClick={() => removeSubLine(row.id, li)}
                        style={{ padding: '2px 6px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 11 }}>−</button>
                    </div>
                  ))}
                  <button onClick={() => addSubLine(row.id)}
                    style={{ padding: '3px 10px', background: '#e0e7ff', color: '#234ea2', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                    + 세부항목 추가
                  </button>
                </div>

                {/* 계산 결과 */}
                {row.supply_price > 0 && (
                  <div style={{ marginTop: 8, padding: '6px 8px', background: '#f0fdf4', borderRadius: 6, fontSize: 11, color: '#166534' }}>
                    단가 ₩{numKR(row.unit_price)} × {row.quantity} = 공급가 <b>₩{numKR(row.supply_price)}</b> | 부가세 ₩{numKR(row.tax)}
                  </div>
                )}
              </div>
            ))}

            <button onClick={() => setRows(prev => [...prev, createRow()])}
              style={{ width: '100%', padding: '10px', background: '#234ea2', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              + 품목 추가
            </button>
          </div>
        </div>

        {/* ── 오른쪽 PDF 미리보기 ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: '#f4f5f7', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e4e9', height: 'calc(100vh - 40px)', position: 'sticky', top: 20 }}>
           <div style={{ background: '#234ea2', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>📄 PDF 미리보기</span>
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '3px 8px' }}>
    <button
      onClick={() => setSeqIndex(prev => Math.max(0, prev - 1))}
      style={{ width: 22, height: 22, border: 'none', borderRadius: 4, background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: '20px' }}>
      ◀
    </button>
    <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, minWidth: 20, textAlign: 'center' }}>
      {seqLetter}
    </span>
    <button
      onClick={() => setSeqIndex(prev => Math.min(25, prev + 1))}
      style={{ width: 22, height: 22, border: 'none', borderRadius: 4, background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: 13, lineHeight: '20px' }}>
      ▶
    </button>
  </div>
</div>
     
            {isClient && (
              <PDFViewer width="100%" height="100%" showToolbar style={{ border: 'none' }}>
                <QuotePDFDoc
                  company={company}
                  receiver={receiver}
                  quoteNo={quoteNo}
                  dateDisplay={dateDisplay}
                  titleItem={titleItem}
                  rows={rows}
                  remarks={remarks}
                  engineerName={engineerName}
                  totalSupply={totalSupply}
                  totalTax={totalTax}
                  totalAmount={totalAmount}
                />
              </PDFViewer>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
