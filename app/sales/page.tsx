//실적현황 페이지
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BLUE = '#234ea2'
const PAGE_BG = '#f4f5f7'
const CARD_BG = '#ffffff'
const BORDER = '#e5e7eb'
const TEXT = '#111113'
const GRAY = '#6b7280'
const ORANGE = '#f97316'

type Quote = {
  quote_id: number
  quote_number: string
  pdf_url?: string | null
  quote_date: string
  total_supply: number
  total_tax: number
  total_amount: number
  total_cost: number | null
  total_profit: number | null
  profit_rate: number | null
  status: string
  order_date: string | null
  revenue_date: string | null
  fail_reason: string | null
  recipient: string | null
  subject: string | null
  engineer_id: number
  customer_id: number | null
  engineers?: { name: string; position: string | null }
  customers?: { company_name: string } | null
  quote_items?: { product_name: string | null; price_list?: { model_jp: string | null } | null }[]
}
type Engineer = {
  engineer_id: number
  name: string
  position: string | null
  teams: string | null
  permission_level: string
}

type SalesTarget = {
  target_id: number
  engineer_id: number | null
  year: number
  quarter: number | null
  target_amount: number
}

const STATUS_COLORS: Record<string, string> = {
  '견적중': '#f59e0b', '수주': '#3b82f6', '매출완료': '#16a34a', '실패': '#dc2626', '보류': '#9ca3af',
}

const TEAM_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  '1': { bg: '#f5f3ff', text: '#7c6ff7', bar: '#7c6ff7' },
  '2': { bg: '#f0f9ff', text: '#0891b2', bar: '#0891b2' },
  '3': { bg: '#f0fdf4', text: '#16a34a', bar: '#16a34a' },
  '4': { bg: '#fffbeb', text: '#b45309', bar: '#d97706' },
}

const POSITION_ORDER: Record<string, number> = {
  '총괄': 0, '관리자': 1, '수석': 2, '책임': 3, '선임': 4, '사원': 5,
}

const numKR = (n: number) => Math.round(n).toLocaleString('ko-KR')
const numM = (n: number) => {
  if (n === 0) return '₩0'
  if (n >= 100000000) return `₩${(n / 100000000).toFixed(1)}억`
  if (n >= 10000000) return `₩${(n / 10000000).toFixed(0)}천만`
  if (n >= 1000000) return `₩${(n / 1000000).toFixed(0)}백만`
  return `₩${Math.round(n / 10000)}만`
}
const PAGE_SIZE = 20

function getFiscalYear(dateStr: string): number {
  const m = new Date(dateStr).getMonth() + 1
  const y = new Date(dateStr).getFullYear()
  return m >= 4 ? y : y - 1
}

function getFiscalQuarter(dateStr: string): number {
  const m = new Date(dateStr).getMonth() + 1
  if (m >= 4 && m <= 6) return 1
  if (m >= 7 && m <= 9) return 2
  if (m >= 10 && m <= 12) return 3
  return 4
}

function getCurrentFY(): number {
  const now = new Date()
  return now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1
}

function getRemainingLabel(mode: string, fy: number, month: number): string | null {
  const now = new Date()
  const nowFY = getCurrentFY()
  if (mode === 'year') {
    if (fy !== nowFY) return null
    const fyEnd = new Date(fy + 1, 2, 31)
    const diffMs = fyEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    const diffMonths = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30))
    if (diffDays <= 0) return '기간 종료'
    if (diffMonths <= 1) return `잔여 ${diffDays}일`
    return `잔여 ${diffMonths}개월`
  }
  if (mode === 'month') {
    const nowMonth = now.getMonth() + 1
    const nowYear = now.getFullYear()
    const targetYear = month < 4 ? fy + 1 : fy
    if (targetYear === nowYear && month === nowMonth) {
      const lastDay = new Date(nowYear, nowMonth, 0).getDate()
      return `잔여 ${lastDay - now.getDate()}일`
    }
    return null
  }
  if (['q1', 'q2', 'q3', 'q4'].includes(mode)) {
    if (fy !== nowFY) return null
    const nowFQ = getFiscalQuarter(now.toISOString())
    const modeQ = parseInt(mode.replace('q', ''))
    if (nowFQ !== modeQ) return null
    const qEndMonth = modeQ === 1 ? 6 : modeQ === 2 ? 9 : modeQ === 3 ? 12 : 3
    const qEndYear = modeQ === 4 ? fy + 1 : fy
    const qEnd = new Date(qEndYear, qEndMonth - 1 + 1, 0)
    const diffDays = Math.ceil((qEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return '기간 종료'
    return `잔여 ${diffDays}일`
  }
  return null
}

function getPeriodLabel(mode: string, fy: number, month: number): string {
  if (mode === 'year') return `FY${fy} 연간 (${fy}.4 ~ ${fy + 1}.3)`
  if (mode === 'q1') return `FY${fy} Q1 (4~6월)`
  if (mode === 'q2') return `FY${fy} Q2 (7~9월)`
  if (mode === 'q3') return `FY${fy} Q3 (10~12월)`
  if (mode === 'q4') return `FY${fy} Q4 (1~3월)`
  if (mode === 'month') return `${month}월`
  return ''
}

function getFYMonths(fy: number): { label: string; month: number; year: number }[] {
  return [4,5,6,7,8,9,10,11,12,1,2,3].map(m => ({
    label: `${m}월`, month: m, year: m >= 4 ? fy : fy + 1,
  }))
}

function AnimatedGauge({ pct, color, height = 12, delay = 0 }: { pct: number; color: string; height?: number; delay?: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(100, pct)), delay)
    return () => clearTimeout(t)
  }, [pct, delay])
  return (
    <div style={{ background: '#e5e7eb', borderRadius: height, height, overflow: 'hidden' }}>
      <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: height, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  )
}

function BarAnimate({ height, color, width = 36 }: { height: number; color: string; width?: number }) {
  const [h, setH] = useState(0)
  useEffect(() => { const t = setTimeout(() => setH(height), 100); return () => clearTimeout(t) }, [height])
  return (
    <div style={{ width, height: h, background: color, borderRadius: '4px 4px 0 0', position: 'absolute', bottom: 0, transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
  )
}

// ── 통합 실적 차트 ────────────────────────────────────────────────────────────
type ChartViewType = 'quarterly' | 'monthly' | 'yearly'

function PerformanceChart({ quotes, fy, targets, engineers, filteredEngineerIds, teamFilter }: {
  quotes: Quote[]
  fy: number
  targets: SalesTarget[]
  engineers: Engineer[]
  filteredEngineerIds: number[]
  teamFilter: string | null
}) {
  const [chartView, setChartView] = useState<ChartViewType>('quarterly')
  const BAR_H = 160

  const nowFY = getCurrentFY()
  const nowMonth = new Date().getMonth() + 1
  const nowYear = new Date().getFullYear()
  const nowFQ = getFiscalQuarter(new Date().toISOString())

  const scopedQuotes = teamFilter
    ? quotes.filter(q => filteredEngineerIds.includes(q.engineer_id))
    : quotes

  const totalYearTarget = engineers.reduce((s, e) => {
    if (teamFilter && e.teams !== teamFilter) return s
    const t = targets.find(t => t.engineer_id === e.engineer_id && t.year === fy && t.quarter === null)
    return s + (t?.target_amount || 0)
  }, 0)

  const quarterData = [
    { key: 'Q1', desc: '4~6월', q: 1 },
    { key: 'Q2', desc: '7~9월', q: 2 },
    { key: 'Q3', desc: '10~12월', q: 3 },
    { key: 'Q4', desc: '1~3월', q: 4 },
  ].map(qd => {
    const qQ = scopedQuotes.filter(q => getFiscalYear(q.quote_date) === fy && getFiscalQuarter(q.quote_date) === qd.q)
    const rev = qQ.filter(q => q.status === '매출완료')
    return {
      ...qd,
      revenueAmt: rev.reduce((s, q) => s + (q.total_supply || 0), 0),
      profitAmt: rev.reduce((s, q) => s + (q.total_profit || 0), 0),
      targetAmt: Math.round(totalYearTarget / 4),
      isCurrent: fy === nowFY && qd.q === nowFQ,
    }
  })

  const monthData = getFYMonths(fy).map(({ label, month, year }) => {
    const mQ = scopedQuotes.filter(q => {
      const d = new Date(q.quote_date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
    const rev = mQ.filter(q => q.status === '매출완료')
    const isCurrent = year === nowYear && month === nowMonth
    return {
      label, month, year,
      revenueAmt: rev.reduce((s, q) => s + (q.total_supply || 0), 0),
      profitAmt: rev.reduce((s, q) => s + (q.total_profit || 0), 0),
      targetAmt: Math.round(totalYearTarget / 12),
      isCurrent,
      isPast: year < nowYear || (year === nowYear && month < nowMonth),
    }
  })

  const yearData = [fy - 1, fy, fy + 1].map(y => {
    const yQ = scopedQuotes.filter(q => getFiscalYear(q.quote_date) === y)
    const rev = yQ.filter(q => q.status === '매출완료')
    const yTarget = engineers.reduce((s, e) => {
      if (teamFilter && e.teams !== teamFilter) return s
      const t = targets.find(t => t.engineer_id === e.engineer_id && t.year === y && t.quarter === null)
      return s + (t?.target_amount || 0)
    }, 0)
    return {
      label: `FY${y}`,
      revenueAmt: rev.reduce((s, q) => s + (q.total_supply || 0), 0),
      profitAmt: rev.reduce((s, q) => s + (q.total_profit || 0), 0),
      targetAmt: yTarget,
      isCurrent: y === nowFY,
    }
  })

  const data = chartView === 'quarterly' ? quarterData : chartView === 'monthly' ? monthData : yearData
  const maxAmt = Math.max(...data.map(d => Math.max(d.revenueAmt, d.targetAmt)), 1)

  return (
    <div style={{ background: CARD_BG, borderRadius: 14, padding: '20px 22px', marginBottom: 20, border: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>
          📊 실적 추이
          <span style={{ fontSize: 12, color: GRAY, fontWeight: 400, marginLeft: 8 }}>FY{fy}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['quarterly', '분기별'], ['monthly', '월별'], ['yearly', '연도별']] as [ChartViewType, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setChartView(v)}
              style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: chartView === v ? BLUE : '#f8fafc', color: chartView === v ? '#fff' : GRAY }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: chartView === 'monthly' ? 'repeat(12, 1fr)' : `repeat(${data.length}, 1fr)`, gap: 8, alignItems: 'flex-end', paddingBottom: 4 }}>
        {data.map((d: any, i: number) => {
          const revenueH = Math.max(0, (d.revenueAmt / maxAmt) * BAR_H)
          const targetH = Math.max(2, (d.targetAmt / maxAmt) * BAR_H)
          const profitRate = d.revenueAmt > 0 ? (d.profitAmt / d.revenueAmt * 100) : null
          const achievePct = d.targetAmt > 0 ? (d.revenueAmt / d.targetAmt * 100) : null
          const barW = 36
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: GRAY, marginBottom: 1, whiteSpace: 'nowrap' }}>
                {d.revenueAmt > 0 ? numM(d.revenueAmt) : ''}
              </div>
              {profitRate !== null && d.revenueAmt > 0 && (
                <div style={{ fontSize: 9, color: '#16a34a', fontWeight: 700, marginBottom: 2 }}>{profitRate.toFixed(0)}%</div>
              )}
              <div style={{ position: 'relative', height: BAR_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div style={{ width: barW, height: Math.max(2, (Math.max(d.revenueAmt, d.targetAmt * 0.1) / maxAmt) * BAR_H) || 2, background: '#f1f5f9', borderRadius: '4px 4px 0 0', position: 'absolute', bottom: 0 }} />
                <BarAnimate height={revenueH} color={d.isCurrent ? BLUE : '#94a3b8'} width={barW} />
                {d.targetAmt > 0 && (
                  <div style={{ position: 'absolute', bottom: targetH, left: '50%', transform: 'translateX(-50%)', width: barW + 8, height: 2, background: ORANGE, borderRadius: 2, zIndex: 2 }} />
                )}
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: chartView === 'monthly' ? 10 : 12, fontWeight: 800, color: d.isCurrent ? BLUE : TEXT, whiteSpace: 'nowrap' }}>{d.label || d.key}</div>
                {chartView === 'quarterly' && <div style={{ fontSize: 10, color: GRAY }}>{d.desc}</div>}
                {d.isCurrent && <div style={{ fontSize: 9, color: BLUE, fontWeight: 700, marginTop: 1 }}>◀ 현재</div>}
                {achievePct !== null && d.revenueAmt > 0 && (
                  <div style={{ fontSize: 9, color: achievePct >= 100 ? '#16a34a' : achievePct >= 70 ? ORANGE : '#dc2626', fontWeight: 700 }}>{achievePct.toFixed(0)}%</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, color: GRAY, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, background: '#94a3b8', borderRadius: 2 }} />매출 완료</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 2, background: ORANGE, borderRadius: 1 }} />목표</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, background: '#16a34a', borderRadius: 2 }} />순이익률</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, background: BLUE, borderRadius: 2 }} />현재 기간</div>
      </div>
    </div>
  )
}

// ── 개인 월별 차트 모달 ──────────────────────────────────────────────────────
function EngineerChartModal({ engineer, quotes, targets, fy, onClose }: {
  engineer: Engineer; quotes: Quote[]; targets: SalesTarget[]; fy: number; onClose: () => void
}) {
  const nowMonth = new Date().getMonth() + 1
  const nowYear = new Date().getFullYear()
  const BAR_H = 140

  const myTarget = targets.find(t => t.engineer_id === engineer.engineer_id && t.year === fy && t.quarter === null)
  const yearTarget = myTarget?.target_amount || 0
  const monthTarget = Math.round(yearTarget / 12)

  const monthData = getFYMonths(fy).map(({ label, month, year }) => {
    const mQ = quotes.filter(q => {
      if (q.engineer_id !== engineer.engineer_id) return false
      const d = new Date(q.quote_date)
      return d.getFullYear() === year && d.getMonth() + 1 === month && q.status === '매출완료'
    })
    const revenueAmt = mQ.reduce((s, q) => s + (q.total_supply || 0), 0)
    const profitAmt = mQ.reduce((s, q) => s + (q.total_profit || 0), 0)
    const isCurrent = year === nowYear && month === nowMonth
    const achieve = monthTarget > 0 ? (revenueAmt / monthTarget * 100) : null
    return { label, month, year, revenueAmt, profitAmt, isCurrent, achieve }
  })

  const maxAmt = Math.max(...monthData.map(d => Math.max(d.revenueAmt, monthTarget)), 1)
  const targetH = Math.max(2, (monthTarget / maxAmt) * BAR_H)
  const tc = TEAM_COLORS[engineer.teams ?? ''] || { bg: '#f3f4f6', text: BLUE, bar: BLUE }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: CARD_BG, borderRadius: 18, width: '100%', maxWidth: 860, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: TEXT }}>{engineer.name}</span>
              <span style={{ fontSize: 12, color: GRAY }}>{engineer.position}</span>
              {engineer.teams && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: tc.bg, color: tc.text, fontWeight: 700 }}>{engineer.teams}팀</span>}
            </div>
            <div style={{ fontSize: 12, color: GRAY }}>FY{fy} 월별 매출 현황 · 월 목표 {monthTarget > 0 ? `₩${numKR(monthTarget)}` : '미설정'}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6, alignItems: 'flex-end', paddingBottom: 8 }}>
            {monthData.map((d, i) => {
              const revenueH = Math.max(0, (d.revenueAmt / maxAmt) * BAR_H)
              const profitRate = d.revenueAmt > 0 ? (d.profitAmt / d.revenueAmt * 100) : null
              const achieveColor = d.achieve === null ? GRAY : d.achieve >= 100 ? '#16a34a' : d.achieve >= 70 ? ORANGE : '#dc2626'
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: GRAY, marginBottom: 1 }}>{d.revenueAmt > 0 ? numM(d.revenueAmt) : ''}</div>
                  {profitRate !== null && d.revenueAmt > 0 && <div style={{ fontSize: 9, color: '#16a34a', fontWeight: 700, marginBottom: 2 }}>{profitRate.toFixed(0)}%</div>}
                  <div style={{ position: 'relative', height: BAR_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', bottom: 0, width: 36, height: '100%', background: '#f8fafc', borderRadius: '4px 4px 0 0' }} />
                    <BarAnimate height={revenueH} color={d.isCurrent ? BLUE : '#94a3b8'} />
                    {monthTarget > 0 && <div style={{ position: 'absolute', bottom: targetH, left: '50%', transform: 'translateX(-50%)', width: 44, height: 2, background: ORANGE, borderRadius: 2, zIndex: 2 }} />}
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: d.isCurrent ? BLUE : TEXT }}>{d.label}</div>
                    {d.achieve !== null && d.revenueAmt > 0 && <div style={{ fontSize: 9, fontWeight: 700, color: achieveColor }}>{d.achieve.toFixed(0)}%</div>}
                    {d.isCurrent && <div style={{ fontSize: 8, color: BLUE, fontWeight: 700 }}>◀</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 20 }}>
            {(() => {
              const totalRev = monthData.reduce((s, d) => s + d.revenueAmt, 0)
              const totalProfit = monthData.reduce((s, d) => s + d.profitAmt, 0)
              const achievedMonths = monthData.filter(d => d.revenueAmt > 0).length
              const overTargetMonths = monthData.filter(d => d.achieve !== null && d.achieve >= 100).length
              return [
                { label: '연간 누적 매출', value: `₩${numKR(totalRev)}` },
                { label: '연간 누적 순이익', value: totalProfit > 0 ? `₩${numKR(totalProfit)}` : '-', color: '#16a34a' },
                { label: '매출 발생 월수', value: `${achievedMonths}개월` },
                { label: '목표 달성 월수', value: monthTarget > 0 ? `${overTargetMonths}개월` : '-', color: '#16a34a' },
              ].map(({ label, value, color }: any) => (
                <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 10, color: GRAY, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: color || TEXT }}>{value}</div>
                </div>
              ))
            })()}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 11, color: GRAY }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, background: '#94a3b8', borderRadius: 2 }} />매출 완료</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 16, height: 2, background: ORANGE, borderRadius: 1 }} />월 목표</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, background: BLUE, borderRadius: 2 }} />현재 월</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 팀 실적 카드 (4칸: 포캐스트/수주/매출완료/순이익) ─────────────────────────
function TeamCard({ teamId, engineers, filteredQuotes, targets, mode, fy, onCardClick, isSelected }: {
  teamId: string; engineers: Engineer[]; filteredQuotes: Quote[]; targets: SalesTarget[]
  mode: string; fy: number; onCardClick: (id: string) => void; isSelected: boolean
}) {
  const tc = TEAM_COLORS[teamId] || { bg: '#f3f4f6', text: BLUE, bar: BLUE }
  const teamEngIds = engineers.filter(e => e.teams === teamId).map(e => e.engineer_id)
  const teamQuotes = filteredQuotes.filter(q => teamEngIds.includes(q.engineer_id))
  const revenueQuotes = teamQuotes.filter(q => q.status === '매출완료')
  const quoteAmt = teamQuotes.reduce((s, q) => s + (q.total_supply || 0), 0)
  const orderAmt = teamQuotes.filter(q => ['수주', '매출완료'].includes(q.status)).reduce((s, q) => s + (q.total_supply || 0), 0)
  const revenueAmt = revenueQuotes.reduce((s, q) => s + (q.total_supply || 0), 0)
  const profitAmt = revenueQuotes.reduce((s, q) => s + (q.total_profit || 0), 0)
  const profitRate = revenueAmt > 0 ? (profitAmt / revenueAmt * 100) : null
  const teamYearTarget = engineers.filter(e => e.teams === teamId).reduce((s, e) => {
    const t = targets.find(t => t.engineer_id === e.engineer_id && t.year === fy && t.quarter === null)
    return s + (t?.target_amount || 0)
  }, 0)
  const periodTarget = mode === 'year' ? teamYearTarget : mode === 'month' ? Math.round(teamYearTarget / 12) : Math.round(teamYearTarget / 4)
  const achieve = periodTarget > 0 ? (revenueAmt / periodTarget * 100) : null
  const achieveColor = achieve === null ? GRAY : achieve >= 100 ? '#16a34a' : achieve >= 70 ? '#f59e0b' : '#dc2626'

  return (
    <div onClick={() => onCardClick(teamId)} style={{
      background: CARD_BG, borderRadius: 16, padding: '18px 20px',
      border: isSelected ? `2px solid ${tc.bar}` : `1px solid ${BORDER}`,
      borderLeft: `4px solid ${tc.bar}`,
      cursor: 'pointer', transition: 'all 0.2s',
      boxShadow: isSelected ? `0 4px 20px ${tc.bar}33` : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>{teamId}팀</span>
          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: tc.bg, color: tc.text, fontWeight: 700 }}>{teamEngIds.length}명</span>
        </div>
        {achieve !== null && <span style={{ fontSize: 13, fontWeight: 800, color: achieveColor }}>{achieve.toFixed(1)}%</span>}
      </div>

     {/* 2x2 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: GRAY, marginBottom: 3 }}>포캐스트</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>₩{numKR(quoteAmt)}</div>
        </div>
        <div style={{ background: '#f0f7ff', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: GRAY, marginBottom: 3 }}>수주</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>₩{numKR(orderAmt)}</div>
        </div>
        <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: GRAY, marginBottom: 3 }}>매출완료</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: tc.bar }}>₩{numKR(revenueAmt)}</div>
        </div>
        <div style={{ background: profitAmt > 0 ? '#f0fdf4' : '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: GRAY, marginBottom: 3 }}>순이익</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: profitAmt > 0 ? '#16a34a' : GRAY }}>
            {profitAmt > 0 ? `₩${numKR(profitAmt)}` : '-'}
          </div>
          {profitRate !== null && <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>{profitRate.toFixed(1)}%</div>}
        </div>
      </div>

      {periodTarget > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: GRAY }}>
            <span>달성률</span>
            <span style={{ color: achieveColor, fontWeight: 700 }}>목표 ₩{numKR(periodTarget)}</span>
          </div>
          <AnimatedGauge pct={achieve || 0} color={achieveColor} height={8} delay={200} />
        </>
      )}
    </div>
  )
}

// ── 개인 견적 모달 ────────────────────────────────────────────────────────────
function EngineerQuoteModal({ engineer, quotes, onClose, onStatusSave }: {
  engineer: Engineer & { quotedAmt: number; revenueAmt: number; profitAmt: number; profitRate: number | null; targetAmt: number; achieve: number | null }
  quotes: Quote[]
  onClose: () => void
  onStatusSave: (q: Quote, status: string, orderDate: string, revenueDate: string, failReason: string) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('전체')
  const [page, setPage] = useState(1)
  const [editQuote, setEditQuote] = useState<Quote | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editOrderDate, setEditOrderDate] = useState('')
  const [editRevenueDate, setEditRevenueDate] = useState('')
  const [editFailReason, setEditFailReason] = useState('')
  const [saving, setSaving] = useState(false)
  const tc = TEAM_COLORS[engineer.teams ?? ''] || { bg: '#f3f4f6', text: BLUE, bar: BLUE }
  const achieveColor = engineer.achieve === null ? GRAY : engineer.achieve >= 100 ? '#16a34a' : engineer.achieve >= 70 ? '#f59e0b' : '#dc2626'
  const filtered = quotes.filter(q => {
    const matchSearch = !search.trim() ||
      q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
      (q.customers?.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (q.subject || '').toLowerCase().includes(search.toLowerCase())
    return matchSearch && (statusFilter === '전체' || q.status === statusFilter)
  })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const inp: React.CSSProperties = { padding: '6px 10px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }
  const handleSave = async () => {
    if (!editQuote) return
    setSaving(true)
    await onStatusSave(editQuote, editStatus, editOrderDate, editRevenueDate, editFailReason)
    setSaving(false)
    setEditQuote(null)
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: CARD_BG, borderRadius: 18, width: '100%', minWidth: 900, maxWidth: 1200, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', position: 'relative' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{engineer.name}</span>
                <span style={{ fontSize: 12, color: GRAY }}>{engineer.position}</span>
                {engineer.teams && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: tc.bg, color: tc.text, fontWeight: 700 }}>{engineer.teams}팀</span>}
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                <div><span style={{ color: GRAY, fontSize: 11 }}>포캐스트</span><div style={{ fontWeight: 700, color: TEXT }}>₩{numKR(engineer.quotedAmt)}</div></div>
                <div><span style={{ color: GRAY, fontSize: 11 }}>매출 완료</span><div style={{ fontWeight: 700, color: BLUE }}>₩{numKR(engineer.revenueAmt)}</div></div>
                <div>
                  <span style={{ color: GRAY, fontSize: 11 }}>순이익</span>
                  <div style={{ fontWeight: 800, color: '#16a34a' }}>
                    {engineer.profitAmt > 0 ? `₩${numKR(engineer.profitAmt)}` : '-'}
                    {engineer.profitRate !== null && engineer.profitAmt > 0 && <span style={{ fontSize: 11, marginLeft: 4 }}>({engineer.profitRate.toFixed(1)}%)</span>}
                  </div>
                </div>
                {engineer.achieve !== null && (
                  <div><span style={{ color: GRAY, fontSize: 11 }}>목표 달성률</span><div style={{ fontWeight: 800, color: achieveColor }}>{engineer.achieve.toFixed(1)}%</div></div>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="견적번호 / 고객사 / 내용 검색" style={{ ...inp, flex: 1, minWidth: 200 }} />
            {['전체', '견적중', '수주', '매출완료', '실패', '보류'].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: statusFilter === s ? (STATUS_COLORS[s] || BLUE) : '#f3f4f6', color: statusFilter === s ? '#fff' : TEXT }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
          {paged.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: GRAY }}>견적이 없습니다</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
              <thead style={{ position: 'sticky', top: 0, background: CARD_BG, zIndex: 1 }}>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {['견적번호', '날짜', '고객사', '내용', '품목', '매출액', '순이익', '이익률', '상태', '관리'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: GRAY, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(q => {
                  const hasProfit = q.status === '매출완료' && q.total_profit != null
                  const itemNames = q.quote_items && q.quote_items.length > 0
                    ? q.quote_items.map(i => i.price_list?.model_jp || i.product_name).filter(Boolean).join(', ')
                    : '-'
                  return (
                    <tr key={q.quote_id} style={{ borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                     <td style={{ padding: '10px 12px', fontWeight: 700, color: BLUE, whiteSpace: 'nowrap' }}>
                        <span
                          onClick={async () => {
                            if (!q.pdf_url) return
                            // NAS URL이면 그대로 열기
                            if (q.pdf_url.includes('synology')) {
                              window.open(q.pdf_url, '_blank')
                              return
                            }
                            // Supabase Storage면 Signed URL 생성
                          const path = q.pdf_url.startsWith('quote-pdfs/')
                              ? q.pdf_url.replace('quote-pdfs/', '')
                              : q.pdf_url.split('/quote-pdfs/')[1]
                            if (!path) return
                            const res = await fetch(`/api/quote-pdf?path=${encodeURIComponent(path)}`)
                            const json = await res.json()
                            if (json.signedUrl) window.open(json.signedUrl, '_blank')
                          }}
                          style={{ cursor: q.pdf_url ? 'pointer' : 'default', textDecoration: q.pdf_url ? 'underline' : 'none' }}>
                          {q.quote_number} {q.pdf_url ? '📄' : ''}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: GRAY, whiteSpace: 'nowrap' }}>{q.quote_date}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{q.customers?.company_name || '-'}</td>
                      <td style={{ padding: '10px 12px', color: GRAY, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.subject || '-'}</td>
                      <td style={{ padding: '10px 12px', color: GRAY, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemNames}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>₩{numKR(q.total_supply)}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {hasProfit ? <span style={{ fontWeight: 700, color: '#16a34a' }}>₩{numKR(q.total_profit!)}</span> : <span style={{ color: '#d1d5db' }}>-</span>}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {hasProfit ? <span style={{ fontWeight: 700, color: (q.profit_rate || 0) >= 40 ? '#16a34a' : '#f59e0b' }}>{q.profit_rate?.toFixed(1)}%</span> : <span style={{ color: '#d1d5db' }}>-</span>}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: (STATUS_COLORS[q.status] || GRAY) + '22', color: STATUS_COLORS[q.status] || GRAY }}>{q.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => { setEditQuote(q); setEditStatus(q.status); setEditOrderDate(q.order_date || ''); setEditRevenueDate(q.revenue_date || ''); setEditFailReason(q.fail_reason || '') }}
                          style={{ padding: '4px 10px', background: '#f3f4f6', border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                          상태변경
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '12px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontWeight: 700 }}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: page === p ? BLUE : '#f3f4f6', color: page === p ? '#fff' : TEXT }}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontWeight: 700 }}>›</button>
            <span style={{ fontSize: 12, color: GRAY, marginLeft: 8 }}>{filtered.length}건 중 {(page - 1) * PAGE_SIZE + 1}~{Math.min(page * PAGE_SIZE, filtered.length)}건</span>
          </div>
        )}
        {editQuote && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 340, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 12 }}>상태 변경</div>
              <div style={{ fontSize: 12, color: GRAY, marginBottom: 14 }}>{editQuote.quote_number}</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: GRAY, marginBottom: 5 }}>상태</div>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }}>
                  {['견적중', '수주', '매출완료', '실패', '보류'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {['수주', '매출완료'].includes(editStatus) && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: GRAY, marginBottom: 5 }}>수주 확정일</div>
                  <input type="date" value={editOrderDate} onChange={e => setEditOrderDate(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none', colorScheme: 'light' }} />
                </div>
              )}
              {editStatus === '매출완료' && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: GRAY, marginBottom: 5 }}>매출 인식일</div>
                  <input type="date" value={editRevenueDate} onChange={e => setEditRevenueDate(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none', colorScheme: 'light' }} />
                </div>
              )}
              {editStatus === '실패' && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: GRAY, marginBottom: 5 }}>실패 사유</div>
                  <select value={editFailReason} onChange={e => setEditFailReason(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none' }}>
                    <option value="">선택</option>
                    {['가격', '경쟁사', '예산동결', '일정연기', '기타'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setEditQuote(null)} style={{ flex: 1, padding: '9px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>취소</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '9px', background: BLUE, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function SalesPage() {
  const supabase = createClient()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [loading, setLoading] = useState(true)
  const currentFY = getCurrentFY()
  const thisMonth = new Date().getMonth() + 1
  const [fy, setFy] = useState(currentFY)
  const [mode, setMode] = useState<'year' | 'q1' | 'q2' | 'q3' | 'q4' | 'month'>('month')
  const [month, setMonth] = useState(thisMonth)
  const [teamFilter, setTeamFilter] = useState<string | null>(null)
  const [selectedEngineer, setSelectedEngineer] = useState<any | null>(null)
  const [chartEngineer, setChartEngineer] = useState<Engineer | null>(null)
  const [showChart, setShowChart] = useState(false)
  const [currentEngineer, setCurrentEngineer] = useState<Engineer | null>(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const [{ data: qData }, { data: eData }, { data: tData }, { data: meData }] = await Promise.all([
      supabase.from('quotes')
        .select('*, engineers(name, position), customers(company_name), quote_items(product_name, price_list(model_jp))')
        .order('quote_date', { ascending: false }),
      supabase.from('engineers').select('engineer_id, name, position, teams, permission_level').order('engineer_id'),
      supabase.from('sales_targets').select('*'),
      supabase.from('engineers').select('*').eq('email', userData.user?.email || '').single(),
    ])
    setQuotes((qData as Quote[]) || [])
    setEngineers(eData || [])
    setTargets(tData || [])
    setCurrentEngineer(meData || null)
    setLoading(false)
  }

  const teams = [...new Set(engineers.map(e => e.teams).filter(Boolean))].sort() as string[]
  const sortedEngineers = [...engineers].sort((a, b) => (POSITION_ORDER[a.position ?? ''] ?? 99) - (POSITION_ORDER[b.position ?? ''] ?? 99))

  // 권한별 열람 가능 엔지니어 필터
  const visibleEngineers = sortedEngineers.filter(e => {
    if (!currentEngineer) return false
    if (currentEngineer.permission_level === 'superadmin') return true
    if (currentEngineer.permission_level === 'manager') return e.teams === currentEngineer.teams
    return e.engineer_id === currentEngineer.engineer_id
  })

  const filteredEngineers = teamFilter ? visibleEngineers.filter(e => e.teams === teamFilter) : visibleEngineers
  const filteredEngineerIds = filteredEngineers.map(e => e.engineer_id)

  const matchPeriod = (dateStr: string, fiscalYear: number) => {
    const d = new Date(dateStr)
    const calYear = d.getFullYear()
    const calMonth = d.getMonth() + 1
    if (mode === 'year') return getFiscalYear(dateStr) === fiscalYear
    if (mode === 'month') {
      const targetYear = month < 4 ? fiscalYear + 1 : fiscalYear
      return calYear === targetYear && calMonth === month
    }
    if (mode === 'q1') return getFiscalYear(dateStr) === fiscalYear && calMonth >= 4 && calMonth <= 6
    if (mode === 'q2') return getFiscalYear(dateStr) === fiscalYear && calMonth >= 7 && calMonth <= 9
    if (mode === 'q3') return getFiscalYear(dateStr) === fiscalYear && calMonth >= 10 && calMonth <= 12
    if (mode === 'q4') return calMonth >= 1 && calMonth <= 3 && calYear === fiscalYear + 1
    return true
  }

  const filteredQuotes = quotes.filter(q => matchPeriod(q.quote_date, fy) && (teamFilter ? filteredEngineerIds.includes(q.engineer_id) : true))
  const prevQuotes = quotes.filter(q => matchPeriod(q.quote_date, fy - 1) && (teamFilter ? filteredEngineerIds.includes(q.engineer_id) : true))
  const revenueQuotes = filteredQuotes.filter(q => q.status === '매출완료')

  const totalQuoteAmt = filteredQuotes.reduce((s, q) => s + (q.total_supply || 0), 0)
  const totalOrderAmt = filteredQuotes.filter(q => ['수주', '매출완료'].includes(q.status)).reduce((s, q) => s + (q.total_supply || 0), 0)
  const totalRevenueAmt = revenueQuotes.reduce((s, q) => s + (q.total_supply || 0), 0)
  const totalCostAmt = revenueQuotes.reduce((s, q) => s + (q.total_cost || 0), 0)
  const totalProfitAmt = revenueQuotes.reduce((s, q) => s + (q.total_profit || 0), 0)
  const totalProfitRate = totalRevenueAmt > 0 ? (totalProfitAmt / totalRevenueAmt * 100) : null
  const totalQuoteCnt = filteredQuotes.length
  const totalOrderCnt = filteredQuotes.filter(q => ['수주', '매출완료'].includes(q.status)).length
  const convRate = totalQuoteCnt > 0 ? (totalOrderCnt / totalQuoteCnt * 100) : 0
  const prevRevenue = prevQuotes.filter(q => q.status === '매출완료').reduce((s, q) => s + (q.total_supply || 0), 0)
  const yoyChange = prevRevenue > 0 ? ((totalRevenueAmt - prevRevenue) / prevRevenue * 100) : null

  const totalYearTarget = filteredEngineers.reduce((s, e) => {
    const t = targets.find(t => t.engineer_id === e.engineer_id && t.year === fy && t.quarter === null)
    return s + (t?.target_amount || 0)
  }, 0)
  const totalTargetAmt = mode === 'year' ? totalYearTarget : mode === 'month' ? Math.round(totalYearTarget / 12) : Math.round(totalYearTarget / 4)
  const totalAchieve = totalTargetAmt > 0 ? (totalRevenueAmt / totalTargetAmt * 100) : null
  const totalAchieveColor = totalAchieve === null ? GRAY : totalAchieve >= 100 ? '#16a34a' : totalAchieve >= 70 ? '#f59e0b' : '#dc2626'
  const remainingLabel = getRemainingLabel(mode, fy, month)

  const engineerStats = filteredEngineers.map(eng => {
    const myQuotes = filteredQuotes.filter(q => q.engineer_id === eng.engineer_id)
    const myRevenueQuotes = myQuotes.filter(q => q.status === '매출완료')
    const quotedAmt = myQuotes.reduce((s, q) => s + (q.total_supply || 0), 0)
    const revenueAmt = myRevenueQuotes.reduce((s, q) => s + (q.total_supply || 0), 0)
    const orderedAmt = myQuotes.filter(q => ['수주', '매출완료'].includes(q.status)).reduce((s, q) => s + (q.total_supply || 0), 0)
    const profitAmt = myRevenueQuotes.reduce((s, q) => s + (q.total_profit || 0), 0)
    const profitRate = revenueAmt > 0 ? (profitAmt / revenueAmt * 100) : null
    const quotedCnt = myQuotes.length
    const orderedCnt = myQuotes.filter(q => ['수주', '매출완료'].includes(q.status)).length
    const myTarget = targets.find(t => t.engineer_id === eng.engineer_id && t.year === fy && t.quarter === null)
    const yearTargetAmt = myTarget?.target_amount || 0
    const targetAmt = mode === 'year' ? yearTargetAmt : mode === 'month' ? Math.round(yearTargetAmt / 12) : Math.round(yearTargetAmt / 4)
    const achieve = targetAmt > 0 ? (revenueAmt / targetAmt * 100) : null
    return { ...eng, quotedAmt, orderedAmt, revenueAmt, profitAmt, profitRate, quotedCnt, orderedCnt, targetAmt, achieve }
  })

  const handleStatusSave = async (q: Quote, status: string, orderDate: string, revenueDate: string, failReason: string) => {
    await supabase.from('quotes').update({ status, order_date: orderDate || null, revenue_date: revenueDate || null, fail_reason: failReason || null }).eq('quote_id', q.quote_id)
    await fetchAll()
  }

  const inp: React.CSSProperties = { padding: '6px 10px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: 16, color: GRAY }}>불러오는 중...</div>
  )

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', padding: '24px 28px', fontFamily: 'Malgun Gothic, sans-serif' }}>
      
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* 필터 */}
        <div style={{ background: CARD_BG, borderRadius: 14, padding: '14px 18px', marginBottom: 20, border: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={fy} onChange={e => setFy(Number(e.target.value))} style={{ ...inp, width: 110 }}>
              {[currentFY + 1, currentFY, currentFY - 1].map(y => <option key={y} value={y}>FY{y}</option>)}
            </select>
            {(['year', 'q1', 'q2', 'q3', 'q4', 'month'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: mode === m ? BLUE : '#f3f4f6', color: mode === m ? '#fff' : TEXT }}>
                {m === 'year' ? '연간' : m === 'month' ? '월별' : m.toUpperCase()}
              </button>
            ))}
            {mode === 'month' && (
              <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...inp, width: 80 }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            )}
            <span style={{ fontSize: 12, color: GRAY }}>{getPeriodLabel(mode, fy, month)}</span>
            {remainingLabel && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '3px 10px', borderRadius: 20 }}>⏱ {remainingLabel}</span>
            )}
            <div style={{ flex: 1 }} />
            <div style={{ width: 1, height: 24, background: BORDER, margin: '0 4px' }} />
            <span style={{ fontSize: 12, color: GRAY, fontWeight: 700 }}>팀:</span>
            <button onClick={() => setTeamFilter(null)} style={{ padding: '4px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: teamFilter === null ? BLUE : '#f3f4f6', color: teamFilter === null ? '#fff' : TEXT }}>전체</button>
            {teams.map(t => (
              <button key={t} onClick={() => setTeamFilter(teamFilter === t ? null : t)} style={{ padding: '4px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: teamFilter === t ? (TEAM_COLORS[t]?.bar || BLUE) : '#f3f4f6', color: teamFilter === t ? '#fff' : TEXT }}>{t}팀</button>
            ))}
          </div>
        </div>

        {/* 사업부 전체 요약 */}
        <div style={{ background: CARD_BG, borderRadius: 14, padding: '20px 22px', marginBottom: 20, border: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>
              {teamFilter ? `🏢 ${teamFilter}팀` : '🏢 계측부 전체'}
              <span style={{ fontSize: 12, color: GRAY, fontWeight: 400, marginLeft: 8 }}>{getPeriodLabel(mode, fy, month)}</span>
              {remainingLabel && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginLeft: 8 }}>· {remainingLabel}</span>}
            </div>
            <button onClick={() => setShowChart(p => !p)}
              style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${showChart ? BLUE : BORDER}`, background: showChart ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: showChart ? BLUE : GRAY, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              📊 실적 추이 {showChart ? '▲' : '▼'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { label: '포캐스트', value: `₩${numKR(totalQuoteAmt)}`, sub: `${totalQuoteCnt}건` },
              { label: '수주액', value: `₩${numKR(totalOrderAmt)}`, sub: `${totalOrderCnt}건` },
              { label: '매출 완료액', value: `₩${numKR(totalRevenueAmt)}`, highlight: true },
              { label: '원가 합계', value: totalCostAmt > 0 ? `₩${numKR(totalCostAmt)}` : '-', sub: '매출완료 기준' },
              { label: '순이익', value: totalProfitAmt > 0 ? `₩${numKR(totalProfitAmt)}` : '-', sub: totalProfitRate !== null && totalProfitAmt > 0 ? `이익률 ${totalProfitRate.toFixed(1)}%` : null, color: '#16a34a' },
              { label: '수주 전환율', value: `${convRate.toFixed(1)}%`, sub: `${totalOrderCnt}/${totalQuoteCnt}건` },
              { label: '전년 동기 대비', value: yoyChange !== null ? `${yoyChange >= 0 ? '+' : ''}${yoyChange.toFixed(1)}%` : '-', color: yoyChange !== null ? (yoyChange >= 0 ? '#16a34a' : '#dc2626') : GRAY },
             { label: '목표 달성률', value: totalAchieve !== null ? `${totalAchieve.toFixed(1)}%` : '목표 미설정', sub: totalTargetAmt > 0 ? `목표 ₩${numKR(totalTargetAmt)}` : null, color: totalAchieveColor },
            ].map(({ label, value, sub, highlight, color }: any) => (
              <div key={label} style={{ background: highlight ? '#eff6ff' : '#f8fafc', borderRadius: 10, padding: '12px 14px', border: `1px solid ${highlight ? '#bfdbfe' : BORDER}` }}>
                <div style={{ fontSize: 11, color: GRAY, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: color || (highlight ? BLUE : TEXT) }}>{value}</div>
                {sub && <div style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>{sub}</div>}
              </div>
            ))}
          </div>
          {totalTargetAmt > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: GRAY }}>사업부 목표 달성률</span>
                <span style={{ fontWeight: 700, color: totalAchieveColor }}>₩{numKR(totalRevenueAmt)} / ₩{numKR(totalTargetAmt)} ({totalAchieve?.toFixed(1)}%)</span>
              </div>
              <AnimatedGauge pct={totalAchieve || 0} color={totalAchieveColor} height={14} delay={100} />
            </>
          )}
        </div>

        {/* 실적 추이 차트 */}
        <div style={{ overflow: 'hidden', maxHeight: showChart ? 600 : 0, transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)', marginBottom: showChart ? 20 : 0 }}>
          <PerformanceChart quotes={quotes} fy={fy} targets={targets} engineers={sortedEngineers} filteredEngineerIds={filteredEngineerIds} teamFilter={teamFilter} />
        </div>

        {/* 팀별 실적 — superadmin과 manager만 표시 */}
        {!teamFilter && teams.length > 0 && currentEngineer?.permission_level !== 'member' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 12 }}>🏆 팀별 실적</div>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {teams.map(t => (
                <TeamCard key={t} teamId={t} engineers={sortedEngineers} filteredQuotes={filteredQuotes} targets={targets} mode={mode} fy={fy} onCardClick={id => setTeamFilter(id === teamFilter ? null : id)} isSelected={teamFilter === t} />
              ))}
            </div>
          </div>
        )}

        {/* 개인 실적 */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 12 }}>
            👤 개인 실적
            <span style={{ fontSize: 12, color: GRAY, fontWeight: 400, marginLeft: 8 }}>({filteredEngineers.length}명) · 카드 클릭 시 견적 목록 · 📊 클릭 시 월별 차트</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {engineerStats.map((eng, idx) => {
              const tc = TEAM_COLORS[eng.teams ?? ''] || { bg: '#f3f4f6', text: BLUE, bar: BLUE }
              const achieveColor = eng.achieve === null ? GRAY : eng.achieve >= 100 ? '#16a34a' : eng.achieve >= 70 ? '#f59e0b' : '#dc2626'
              return (
                <div key={eng.engineer_id}
                  onClick={() => setSelectedEngineer(eng)}
                  style={{ background: CARD_BG, borderRadius: 14, padding: '16px 18px', border: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}>

                  <button onClick={e => { e.stopPropagation(); setChartEngineer(eng) }} title="월별 실적 차트"
                    style={{ position: 'absolute', top: 14, right: 14, width: 26, height: 26, borderRadius: '50%', background: '#f0f4ff', border: `1px solid ${BORDER}`, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BLUE }}>
                    📊
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingRight: 32 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{eng.name}</span>
                      <span style={{ fontSize: 12, color: GRAY, marginLeft: 6 }}>{eng.position}</span>
                    </div>
                    {eng.teams && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: tc.bg, color: tc.text }}>{eng.teams}팀</span>}
                    {eng.achieve !== null && <span style={{ fontSize: 13, fontWeight: 800, color: achieveColor, marginLeft: 'auto' }}>{eng.achieve.toFixed(0)}%</span>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: GRAY }}>포캐스트</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>₩{numKR(eng.quotedAmt)}</div>
                      <div style={{ fontSize: 10, color: GRAY }}>{eng.quotedCnt}건</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: GRAY }}>수주</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>₩{numKR(eng.orderedAmt)}</div>
                      <div style={{ fontSize: 10, color: GRAY }}>{eng.orderedCnt}건</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: GRAY }}>매출 완료</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>₩{numKR(eng.revenueAmt)}</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: GRAY }}>순이익</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: eng.profitAmt > 0 ? '#16a34a' : GRAY }}>{eng.profitAmt > 0 ? `₩${numKR(eng.profitAmt)}` : '-'}</div>
                      {eng.profitRate !== null && eng.profitAmt > 0 && <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>{eng.profitRate.toFixed(1)}%</div>}
                    </div>
                  </div>
                  {eng.targetAmt > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: GRAY }}>
                        <span>목표 달성률</span>
                        <span style={{ color: achieveColor, fontWeight: 700 }}>{eng.achieve?.toFixed(0)}% · 목표 {numKR(eng.targetAmt)}</span>
                      </div>
                      <AnimatedGauge pct={eng.achieve || 0} color={achieveColor} height={7} delay={80 + idx * 40} />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selectedEngineer && (
        <EngineerQuoteModal
          engineer={selectedEngineer}
          quotes={filteredQuotes.filter(q => q.engineer_id === selectedEngineer.engineer_id)}
          onClose={() => setSelectedEngineer(null)}
          onStatusSave={async (q, status, orderDate, revenueDate, failReason) => {
            await handleStatusSave(q, status, orderDate, revenueDate, failReason)
            setSelectedEngineer((prev: any) => prev ? { ...prev } : null)
          }}
        />
      )}

      {chartEngineer && (
        <EngineerChartModal engineer={chartEngineer} quotes={quotes} targets={targets} fy={fy} onClose={() => setChartEngineer(null)} />
      )}
    </div>
  )
}
