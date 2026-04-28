'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BLUE = '#234ea2'
const PAGE_BG = '#f4f5f7'
const CARD_BG = '#ffffff'
const BORDER = '#e5e7eb'
const TEXT = '#111113'
const GRAY = '#6b7280'

type Quote = {
  quote_id: number
  quote_number: string
  quote_date: string
  total_supply: number
  total_tax: number
  total_amount: number
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
}

type Engineer = {
  engineer_id: number
  name: string
  position: string | null
  teams: string | null
}

type SalesTarget = {
  target_id: number
  engineer_id: number | null
  year: number
  quarter: number | null
  target_amount: number
}

const STATUS_COLORS: Record<string, string> = {
  '견적중': '#f59e0b',
  '수주': '#3b82f6',
  '매출완료': '#16a34a',
  '실패': '#dc2626',
  '보류': '#9ca3af',
}

const TEAM_COLORS: Record<string, string> = {
  '1': '#6366f1',
  '2': '#0891b2',
  '3': '#16a34a',
  '4': '#f59e0b',
}

const numKR = (n: number) => Math.round(n).toLocaleString('ko-KR')

function getQuarter(dateStr: string) {
  const m = new Date(dateStr).getMonth() + 1
  return Math.ceil(m / 3)
}

function getMonth(dateStr: string) {
  return new Date(dateStr).getMonth() + 1
}

function getPeriodLabel(mode: string, year: number, month: number) {
  if (mode === 'month') return `${year}년 ${month}월`
  if (mode === 'year') return `${year}년 연간`
  if (mode === 'half1') return `${year}년 상반기`
  if (mode === 'half2') return `${year}년 하반기`
  return `${year}년 Q${mode.replace('q', '')}`
}

export default function SalesPage() {
  const supabase = createClient()

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [loading, setLoading] = useState(true)

  const thisYear = new Date().getFullYear()
  const thisMonth = new Date().getMonth() + 1

  const [year, setYear] = useState(thisYear)
  const [mode, setMode] = useState<'year' | 'half1' | 'half2' | 'q1' | 'q2' | 'q3' | 'q4' | 'month'>('year')
  const [month, setMonth] = useState(thisMonth)
  const [teamFilter, setTeamFilter] = useState<string | null>(null)

  const [editQuote, setEditQuote] = useState<Quote | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editOrderDate, setEditOrderDate] = useState('')
  const [editRevenueDate, setEditRevenueDate] = useState('')
  const [editFailReason, setEditFailReason] = useState('')
  const [saving, setSaving] = useState(false)

  const [showTargetModal, setShowTargetModal] = useState(false)
  const [targetEngineerId, setTargetEngineerId] = useState<number | null>(null)
  const [targetYear, setTargetYear] = useState(thisYear)
  const [targetQuarter, setTargetQuarter] = useState<number | null>(null)
  const [targetAmount, setTargetAmount] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: qData }, { data: eData }, { data: tData }] = await Promise.all([
      supabase.from('quotes').select('*, engineers(name, position), customers(company_name)').order('quote_date', { ascending: false }),
      supabase.from('engineers').select('engineer_id, name, position, teams').order('engineer_id'),
      supabase.from('sales_targets').select('*'),
    ])
    setQuotes((qData as Quote[]) || [])
    setEngineers(eData || [])
    setTargets(tData || [])
    setLoading(false)
  }

  const teams = [...new Set(engineers.map(e => e.teams).filter(Boolean))].sort() as string[]

  const POSITION_ORDER: Record<string, number> = {
    '총괄': 0, '관리자': 1, '수석': 2, '책임': 3, '선임': 4, '사원': 5,
  }

  const filteredEngineers = (teamFilter ? engineers.filter(e => e.teams === teamFilter) : engineers)
    .sort((a, b) => (POSITION_ORDER[a.position ?? ''] ?? 99) - (POSITION_ORDER[b.position ?? ''] ?? 99))
  const filteredEngineerIds = filteredEngineers.map(e => e.engineer_id)

  const matchPeriod = (dateStr: string, yr: number) => {
    const d = new Date(dateStr)
    if (d.getFullYear() !== yr) return false
    if (mode === 'year') return true
    if (mode === 'month') return getMonth(dateStr) === month
    const qtr = getQuarter(dateStr)
    if (mode === 'half1') return qtr <= 2
    if (mode === 'half2') return qtr >= 3
    if (mode === 'q1') return qtr === 1
    if (mode === 'q2') return qtr === 2
    if (mode === 'q3') return qtr === 3
    if (mode === 'q4') return qtr === 4
    return true
  }

  const filteredQuotes = quotes.filter(q =>
    matchPeriod(q.quote_date, year) && (teamFilter ? filteredEngineerIds.includes(q.engineer_id) : true)
  )
  const prevQuotes = quotes.filter(q =>
    matchPeriod(q.quote_date, year - 1) && (teamFilter ? filteredEngineerIds.includes(q.engineer_id) : true)
  )

  const teamQuoteAmt = filteredQuotes.reduce((s, q) => s + (q.total_supply || 0), 0)
  const teamOrderAmt = filteredQuotes.filter(q => ['수주', '매출완료'].includes(q.status)).reduce((s, q) => s + (q.total_supply || 0), 0)
  const teamRevenueAmt = filteredQuotes.filter(q => q.status === '매출완료').reduce((s, q) => s + (q.total_supply || 0), 0)
  const teamQuoteCnt = filteredQuotes.length
  const teamOrderCnt = filteredQuotes.filter(q => ['수주', '매출완료'].includes(q.status)).length
  const convRate = teamQuoteCnt > 0 ? (teamOrderCnt / teamQuoteCnt * 100) : 0
  const prevTeamRevenue = prevQuotes.filter(q => q.status === '매출완료').reduce((s, q) => s + (q.total_supply || 0), 0)
  const yoyChange = prevTeamRevenue > 0 ? ((teamRevenueAmt - prevTeamRevenue) / prevTeamRevenue * 100) : null

const teamTargetKey = mode === 'year' || mode === 'month' ? null : (mode === 'q1' ? 1 : mode === 'q2' ? 2 : mode === 'q3' ? 3 : mode === 'q4' ? 4 : null)
  const teamTarget = targets.find(t => t.engineer_id === null && t.year === year && t.quarter === null)
  const teamYearTargetAmt = teamTarget?.target_amount || 0
  const teamTargetAmt = mode === 'year' ? teamYearTargetAmt
    : mode === 'month' ? Math.round(teamYearTargetAmt / 12)
    : mode === 'half1' || mode === 'half2' ? Math.round(teamYearTargetAmt / 2)
    : Math.round(teamYearTargetAmt / 4)
  const teamAchieve = teamTargetAmt > 0 ? (teamRevenueAmt / teamTargetAmt * 100) : null
  const engineerStats = filteredEngineers.map(eng => {
    const myQuotes = filteredQuotes.filter(q => q.engineer_id === eng.engineer_id)
    const quotedAmt = myQuotes.reduce((s, q) => s + (q.total_supply || 0), 0)
    const orderedAmt = myQuotes.filter(q => ['수주', '매출완료'].includes(q.status)).reduce((s, q) => s + (q.total_supply || 0), 0)
    const revenueAmt = myQuotes.filter(q => q.status === '매출완료').reduce((s, q) => s + (q.total_supply || 0), 0)
    const quotedCnt = myQuotes.length
    const orderedCnt = myQuotes.filter(q => ['수주', '매출완료'].includes(q.status)).length
    const conv = quotedCnt > 0 ? (orderedCnt / quotedCnt * 100) : 0
const myTarget = targets.find(t => t.engineer_id === eng.engineer_id && t.year === year && t.quarter === null)
    const yearTargetAmt = myTarget?.target_amount || 0
    const targetAmt = mode === 'year' ? yearTargetAmt
      : mode === 'month' ? Math.round(yearTargetAmt / 12)
      : mode === 'half1' || mode === 'half2' ? Math.round(yearTargetAmt / 2)
      : Math.round(yearTargetAmt / 4)    
      const achieve = targetAmt > 0 ? (revenueAmt / targetAmt * 100) : null
    return { ...eng, quotedAmt, orderedAmt, revenueAmt, quotedCnt, orderedCnt, conv, targetAmt, achieve }
  })

  const recentQuotes = [...filteredQuotes].slice(0, 30)

  const handleSaveStatus = async () => {
    if (!editQuote) return
    setSaving(true)
    await supabase.from('quotes').update({
      status: editStatus, order_date: editOrderDate || null,
      revenue_date: editRevenueDate || null, fail_reason: editFailReason || null,
    }).eq('quote_id', editQuote.quote_id)
    setSaving(false)
    setEditQuote(null)
    fetchAll()
  }

  const handleSaveTarget = async () => {
    if (!targetAmount) return
    setSavingTarget(true)
    const existing = targets.find(t =>
      t.engineer_id === targetEngineerId && t.year === targetYear &&
      (targetQuarter === null ? t.quarter === null : t.quarter === targetQuarter)
    )
    if (existing) {
      await supabase.from('sales_targets').update({ target_amount: Number(targetAmount) }).eq('target_id', existing.target_id)
    } else {
      await supabase.from('sales_targets').insert({
        engineer_id: targetEngineerId, year: targetYear,
        quarter: targetQuarter, target_amount: Number(targetAmount),
      })
    }
    setSavingTarget(false)
    setShowTargetModal(false)
    setTargetAmount('')
    fetchAll()
  }

  const inp: React.CSSProperties = {
    padding: '6px 10px', border: `1px solid ${BORDER}`, borderRadius: 8,
    fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box',
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: 16, color: GRAY }}>불러오는 중...</div>
  )

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', padding: 24, fontFamily: 'Malgun Gothic, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          
          <button onClick={() => setShowTargetModal(true)}
            style={{ padding: '8px 16px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            🎯 목표 설정
          </button>
        </div>

        {/* 필터 */}
        <div style={{ background: CARD_BG, borderRadius: 14, padding: '14px 18px', marginBottom: 20, border: `1px solid ${BORDER}` }}>
          {/* 기간 필터 */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...inp, width: 90 }}>
              {[thisYear, thisYear - 1, thisYear - 2].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            {(['year', 'half1', 'half2', 'q1', 'q2', 'q3', 'q4', 'month'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{
                  padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  background: mode === m ? BLUE : '#f3f4f6',
                  color: mode === m ? '#fff' : TEXT,
                }}>
                {m === 'year' ? '연간' : m === 'half1' ? '상반기' : m === 'half2' ? '하반기' : m === 'month' ? '월별' : m.toUpperCase()}
              </button>
            ))}
            {mode === 'month' && (
              <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...inp, width: 80 }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
            )}
            <span style={{ fontSize: 12, color: GRAY, marginLeft: 4 }}>{getPeriodLabel(mode, year, month)}</span>
          </div>

          {/* 팀 필터 */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: GRAY, fontWeight: 700 }}>팀:</span>
            <button onClick={() => setTeamFilter(null)}
              style={{
                padding: '5px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12,
                background: teamFilter === null ? BLUE : '#f3f4f6',
                color: teamFilter === null ? '#fff' : TEXT,
              }}>
              전체
            </button>
            {teams.map(t => (
              <button key={t} onClick={() => setTeamFilter(teamFilter === t ? null : t)}
                style={{
                  padding: '5px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12,
                  background: teamFilter === t ? (TEAM_COLORS[t] || BLUE) : '#f3f4f6',
                  color: teamFilter === t ? '#fff' : TEXT,
                }}>
                {t}팀
              </button>
            ))}
          </div>
        </div>

        {/* 요약 카드 */}
        <div style={{ background: CARD_BG, borderRadius: 14, padding: '18px 20px', marginBottom: 20, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 14 }}>
            {teamFilter ? `🏢 ${teamFilter}팀` : '🏢 계측부 전체'}
            <span style={{ fontSize: 12, color: GRAY, fontWeight: 400, marginLeft: 8 }}>{getPeriodLabel(mode, year, month)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {[
              { label: '견적 발행액', value: `₩${numKR(teamQuoteAmt)}`, sub: `${teamQuoteCnt}건` },
              { label: '수주액', value: `₩${numKR(teamOrderAmt)}`, sub: `${teamOrderCnt}건` },
              { label: '매출 완료액', value: `₩${numKR(teamRevenueAmt)}`, sub: null, highlight: true },
              { label: '수주 전환율', value: `${convRate.toFixed(1)}%`, sub: `${teamOrderCnt}/${teamQuoteCnt}건` },
              { label: '전년 동기 대비', value: yoyChange !== null ? `${yoyChange >= 0 ? '+' : ''}${yoyChange.toFixed(1)}%` : '-', sub: `전년 ₩${numKR(prevTeamRevenue)}`, color: yoyChange !== null ? (yoyChange >= 0 ? '#16a34a' : '#dc2626') : GRAY },
              { label: '목표 달성률', value: teamAchieve !== null ? `${teamAchieve.toFixed(1)}%` : '목표 미설정', sub: teamTargetAmt > 0 ? `목표 ₩${numKR(teamTargetAmt)}` : null, color: teamAchieve !== null ? (teamAchieve >= 100 ? '#16a34a' : teamAchieve >= 70 ? '#f59e0b' : '#dc2626') : GRAY },
            ].map(({ label, value, sub, highlight, color }: any) => (
              <div key={label} style={{ background: highlight ? '#eff6ff' : '#f8fafc', borderRadius: 10, padding: '12px 14px', border: `1px solid ${highlight ? '#bfdbfe' : BORDER}` }}>
                <div style={{ fontSize: 11, color: GRAY, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: color || (highlight ? BLUE : TEXT) }}>{value}</div>
                {sub && <div style={{ fontSize: 11, color: GRAY, marginTop: 2 }}>{sub}</div>}
              </div>
            ))}
          </div>
          {teamTargetAmt > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: GRAY }}>
                <span>목표 달성률</span>
                <span>₩{numKR(teamRevenueAmt)} / ₩{numKR(teamTargetAmt)}</span>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: 8, height: 12, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, teamAchieve || 0)}%`, height: '100%', background: (teamAchieve || 0) >= 100 ? '#16a34a' : (teamAchieve || 0) >= 70 ? '#f59e0b' : BLUE, borderRadius: 8, transition: 'width 0.5s' }} />
              </div>
            </div>
          )}
        </div>

        {/* 엔지니어별 카드 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 12 }}>
                     개인 실적
            <span style={{ fontSize: 12, color: GRAY, fontWeight: 400, marginLeft: 8 }}>({filteredEngineers.length}명)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {engineerStats.map(eng => (
              <div key={eng.engineer_id} style={{ background: CARD_BG, borderRadius: 14, padding: '16px 18px', border: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{eng.name}</span>
                      <span style={{ fontSize: 12, color: GRAY, marginLeft: 6 }}>{eng.position}</span>
                    </div>
                    {eng.teams && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (TEAM_COLORS[eng.teams] || BLUE) + '22', color: TEAM_COLORS[eng.teams] || BLUE }}>
                        {eng.teams}팀
                      </span>
                    )}
                  </div>
                  {eng.achieve !== null && (
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: eng.achieve >= 100 ? '#dcfce7' : eng.achieve >= 70 ? '#fef9c3' : '#fee2e2', color: eng.achieve >= 100 ? '#16a34a' : eng.achieve >= 70 ? '#a16207' : '#dc2626' }}>
                      {eng.achieve.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: GRAY }}>견적 발행</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>₩{numKR(eng.quotedAmt)}</div>
                    <div style={{ fontSize: 10, color: GRAY }}>{eng.quotedCnt}건</div>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: GRAY }}>수주</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>₩{numKR(eng.orderedAmt)}</div>
                    <div style={{ fontSize: 10, color: GRAY }}>{eng.orderedCnt}건</div>
                  </div>
                  <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: GRAY }}>매출 완료</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>₩{numKR(eng.revenueAmt)}</div>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: GRAY }}>수주 전환율</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: eng.conv >= 50 ? '#16a34a' : '#f59e0b' }}>{eng.conv.toFixed(0)}%</div>
                    <div style={{ fontSize: 10, color: GRAY }}>{eng.orderedCnt}/{eng.quotedCnt}건</div>
                  </div>
                </div>
                {eng.targetAmt > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11, color: GRAY }}>
                      <span>목표 달성률</span>
                      <span>목표 ₩{numKR(eng.targetAmt)}</span>
                    </div>
                    <div style={{ background: '#e5e7eb', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, eng.achieve || 0)}%`, height: '100%', background: (eng.achieve || 0) >= 100 ? '#16a34a' : (eng.achieve || 0) >= 70 ? '#f59e0b' : BLUE, borderRadius: 6 }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 견적 목록 */}
        <div style={{ background: CARD_BG, borderRadius: 14, padding: '18px 20px', border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 14 }}>📋 견적 목록 ({filteredQuotes.length}건)</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {['견적번호', '날짜', '담당자', '고객사', '견적 내용', '금액', '상태', '관리'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: GRAY, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentQuotes.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: GRAY }}>해당 기간 견적이 없습니다</td></tr>
                ) : recentQuotes.map(q => (
                  <tr key={q.quote_id} style={{ borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: BLUE, whiteSpace: 'nowrap' }}>{q.quote_number}</td>
                    <td style={{ padding: '10px 10px', color: GRAY, whiteSpace: 'nowrap' }}>{q.quote_date}</td>
                    <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>{q.engineers?.name || '-'}</td>
                    <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>{q.customers?.company_name || '-'}</td>
                    <td style={{ padding: '10px 10px', color: GRAY, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.subject || '-'}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>₩{numKR(q.total_supply)}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: STATUS_COLORS[q.status] + '22', color: STATUS_COLORS[q.status] || GRAY }}>
                        {q.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <button onClick={() => { setEditQuote(q); setEditStatus(q.status); setEditOrderDate(q.order_date || ''); setEditRevenueDate(q.revenue_date || ''); setEditFailReason(q.fail_reason || '') }}
                        style={{ padding: '4px 10px', background: '#f3f4f6', border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        상태변경
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 상태 변경 모달 */}
      {editQuote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 16 }}>견적 상태 변경</div>
            <div style={{ fontSize: 13, color: GRAY, marginBottom: 16 }}>{editQuote.quote_number}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>상태</div>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ ...inp, width: '100%' }}>
                {['견적중', '수주', '매출완료', '실패', '보류'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {['수주', '매출완료'].includes(editStatus) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>수주 확정일</div>
                <input type="date" value={editOrderDate} onChange={e => setEditOrderDate(e.target.value)} style={{ ...inp, width: '100%' }} />
              </div>
            )}
            {editStatus === '매출완료' && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>매출 인식일 (납품완료일)</div>
                <input type="date" value={editRevenueDate} onChange={e => setEditRevenueDate(e.target.value)} style={{ ...inp, width: '100%' }} />
              </div>
            )}
            {editStatus === '실패' && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>실패 사유</div>
                <select value={editFailReason} onChange={e => setEditFailReason(e.target.value)} style={{ ...inp, width: '100%' }}>
                  <option value="">선택</option>
                  {['가격', '경쟁사', '예산동결', '일정연기', '기타'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditQuote(null)} style={{ flex: 1, padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>취소</button>
              <button onClick={handleSaveStatus} disabled={saving} style={{ flex: 1, padding: '10px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1 }}>{saving ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 목표 설정 모달 */}
      {showTargetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 20 }}>🎯 목표 설정</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>대상</div>
              <select value={targetEngineerId ?? ''} onChange={e => setTargetEngineerId(e.target.value === '' ? null : Number(e.target.value))} style={{ ...inp, width: '100%' }}>
                <option value="">계측부 전체</option>
                {engineers.map(e => <option key={e.engineer_id} value={e.engineer_id}>{e.name} {e.position} {e.teams ? `(${e.teams}팀)` : ''}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>연도</div>
              <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))} style={{ ...inp, width: '100%' }}>
                {[thisYear, thisYear + 1, thisYear - 1].map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>기간</div>
              <select value={targetQuarter ?? ''} onChange={e => setTargetQuarter(e.target.value === '' ? null : Number(e.target.value))} style={{ ...inp, width: '100%' }}>
                <option value="">연간</option>
                <option value="1">Q1 (1~3월)</option>
                <option value="2">Q2 (4~6월)</option>
                <option value="3">Q3 (7~9월)</option>
                <option value="4">Q4 (10~12월)</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>목표금액 (원)</div>
              <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="예: 50000000" style={{ ...inp, width: '100%' }} />
              {targetAmount && <div style={{ fontSize: 11, color: BLUE, marginTop: 4 }}>₩{numKR(Number(targetAmount))}</div>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowTargetModal(false); setTargetAmount('') }} style={{ flex: 1, padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>취소</button>
              <button onClick={handleSaveTarget} disabled={savingTarget} style={{ flex: 1, padding: '10px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, opacity: savingTarget ? 0.7 : 1 }}>{savingTarget ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
