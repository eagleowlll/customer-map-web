'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PAGE_BG = '#f4f5f7'
const PANEL_BG = '#ffffff'
const INPUT_BORDER = '#e2e4e9'
const TEXT_PRIMARY = '#111113'
const TEXT_SECONDARY = '#4b5563'
const TEXT_MUTED = '#9ca3af'
const BLUE_BG = '#234ea2'
const BLUE_TEXT = '#ffffff'

const SERVICE_TYPES = ['신규SETUP', 'A/S(유상)', 'B/S(영업)', '이전SETUP', '유상교육']

type Engineer = {
  engineer_id: number
  name: string
  position: string | null
}

type ActivityRow = {
  engineer: Engineer
  counts: Record<string, number>
  total: number
}

type ServiceDetail = {
  service_id: number
  visit_date: string
  service_type: string
  customer_name: string
  service_notes: string | null
}

export default function ActivityPage() {
  const supabase = createClient()

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1

  const formatDate = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate()

  const defaultStart = formatDate(thisYear, thisMonth, 1)
  const defaultEnd = formatDate(thisYear, thisMonth, lastDay(thisYear, thisMonth))

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [activeBtn, setActiveBtn] = useState<string>('당월')

  // 상세 모달
  const [selectedEngineer, setSelectedEngineer] = useState<Engineer | null>(null)
  const [details, setDetails] = useState<ServiceDetail[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('전체')

  const fetchActivity = async (start: string, end: string) => {
    setLoading(true)

    const { data: engineers } = await supabase
      .from('engineers')
      .select('*')
      .order('engineer_id', { ascending: true })

    // service_engineers → service_history join
    const { data: seData } = await supabase
      .from('service_engineers')
      .select('engineer_id, service_id')

    const { data: shData } = await supabase
      .from('service_history')
      .select('service_id, service_type, visit_date')
      .gte('visit_date', start)
      .lte('visit_date', end)

    const shMap: Record<number, { service_type: string; visit_date: string }> = {}
    ;(shData ?? []).forEach((sh: any) => {
      shMap[sh.service_id] = { service_type: sh.service_type, visit_date: sh.visit_date }
    })

    const result: ActivityRow[] = (engineers ?? []).map((eng) => {
      const counts: Record<string, number> = {}
      SERVICE_TYPES.forEach((t) => { counts[t] = 0 })

      ;(seData ?? [])
        .filter((se: any) => se.engineer_id === eng.engineer_id)
        .forEach((se: any) => {
          const sh = shMap[se.service_id]
          if (sh && sh.service_type && counts[sh.service_type] !== undefined) {
            counts[sh.service_type]++
          }
        })

      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      return { engineer: eng, counts, total }
    })

    setRows(result)
    setLoading(false)
  }

  const fetchDetails = async (engineer: Engineer) => {
    setSelectedEngineer(engineer)
    setDetailLoading(true)
    setDetails([])
    setFilterType('전체')

    // 해당 엔지니어의 service_id 목록
    const { data: seData } = await supabase
      .from('service_engineers')
      .select('service_id')
      .eq('engineer_id', engineer.engineer_id)

    const serviceIds = (seData ?? []).map((se: any) => se.service_id)

    if (serviceIds.length === 0) {
      setDetailLoading(false)
      return
    }

    // service_history + customers join
    const { data: shData } = await supabase
      .from('service_history')
      .select('service_id, visit_date, service_type, service_notes, customer_id, customers(company_name)')
      .in('service_id', serviceIds)
      .gte('visit_date', startDate)
      .lte('visit_date', endDate)
      .order('visit_date', { ascending: false })

    const result: ServiceDetail[] = (shData ?? []).map((sh: any) => ({
      service_id: sh.service_id,
      visit_date: sh.visit_date,
      service_type: sh.service_type,
      customer_name: sh.customers?.company_name ?? '-',
      service_notes: sh.service_notes,
    }))

    setDetails(result)
    setDetailLoading(false)
  }

  useEffect(() => {
    fetchActivity(defaultStart, defaultEnd)
  }, [])

  const handleThisMonth = () => {
    const s = formatDate(thisYear, thisMonth, 1)
    const e = formatDate(thisYear, thisMonth, lastDay(thisYear, thisMonth))
    setStartDate(s); setEndDate(e); setActiveBtn('당월')
    fetchActivity(s, e)
  }

  const handleLastMonth = () => {
    const d = new Date(thisYear, thisMonth - 2, 1)
    const y = d.getFullYear(); const m = d.getMonth() + 1
    const s = formatDate(y, m, 1)
    const e = formatDate(y, m, lastDay(y, m))
    setStartDate(s); setEndDate(e); setActiveBtn('전월')
    fetchActivity(s, e)
  }

  const handleSearch = () => {
    setActiveBtn('')
    fetchActivity(startDate, endDate)
  }

  const filteredDetails = filterType === '전체'
    ? details
    : details.filter(d => d.service_type === filterType)

  return (
    <main style={{ padding: 24, background: PAGE_BG, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT_PRIMARY, margin: 0, marginBottom: 20 }}>
          활동 현황
        </h1>

        {/* 날짜 선택 카드 */}
        <div style={{
          background: PANEL_BG, border: `1px solid ${INPUT_BORDER}`,
          borderRadius: 16, padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          {/* 날짜 직접 입력 먼저 */}
          <input type="date" value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setActiveBtn('') }}
            style={{ padding: '8px 12px', border: `1px solid ${INPUT_BORDER}`, borderRadius: 8, background: PAGE_BG, color: TEXT_PRIMARY, fontSize: 14, outline: 'none' }} />
          <span style={{ color: TEXT_MUTED, fontWeight: 700 }}>~</span>
          <input type="date" value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setActiveBtn('') }}
            style={{ padding: '8px 12px', border: `1px solid ${INPUT_BORDER}`, borderRadius: 8, background: PAGE_BG, color: TEXT_PRIMARY, fontSize: 14, outline: 'none' }} />
          <button onClick={handleSearch}
            style={{ padding: '8px 20px', background: BLUE_BG, color: BLUE_TEXT, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            조회
          </button>

          <div style={{ width: 1, height: 32, background: INPUT_BORDER, margin: '0 4px' }} />

          {/* 당월 / 전월 버튼 */}
          {[{ label: '당월', fn: handleThisMonth }, { label: '전월', fn: handleLastMonth }].map(({ label, fn }) => (
            <button key={label} onClick={fn}
              style={{
                padding: '8px 18px', borderRadius: 8,
                border: `1px solid ${activeBtn === label ? BLUE_BG : INPUT_BORDER}`,
                background: activeBtn === label ? BLUE_BG : PAGE_BG,
                color: activeBtn === label ? BLUE_TEXT : TEXT_PRIMARY,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* 카드 그리드 */}
        {loading ? (
          <p style={{ color: TEXT_SECONDARY }}>불러오는 중...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {rows.map((row) => (
              <div key={row.engineer.engineer_id}
                onClick={() => fetchDetails(row.engineer)}
                style={{
                  background: PANEL_BG, border: `1px solid ${INPUT_BORDER}`,
                  borderRadius: 16, padding: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(35,78,162,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)')}
              >
                <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${INPUT_BORDER}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY }}>{row.engineer.name}</div>
                  <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>{row.engineer.position ?? ''}</div>
                </div>
                <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                  {SERVICE_TYPES.map((type) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>{type}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: row.counts[type] > 0 ? BLUE_BG : TEXT_MUTED }}>
                        {row.counts[type]}건
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ paddingTop: 12, borderTop: `1px solid ${INPUT_BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>합계</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: BLUE_BG }}>{row.total}건</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selectedEngineer && (
        <div onClick={() => setSelectedEngineer(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>

            {/* 모달 헤더 */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${INPUT_BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: TEXT_PRIMARY }}>{selectedEngineer.name}</div>
                <div style={{ fontSize: 13, color: TEXT_MUTED }}>{selectedEngineer.position} · {startDate} ~ {endDate}</div>
              </div>
              <button onClick={() => setSelectedEngineer(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: TEXT_MUTED }}>✕</button>
            </div>

            {/* 서비스 타입 필터 */}
            <div style={{ padding: '12px 24px', borderBottom: `1px solid ${INPUT_BORDER}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['전체', ...SERVICE_TYPES].map(type => (
                <button key={type} onClick={() => setFilterType(type)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${filterType === type ? BLUE_BG : INPUT_BORDER}`,
                    background: filterType === type ? BLUE_BG : PAGE_BG,
                    color: filterType === type ? BLUE_TEXT : TEXT_SECONDARY,
                  }}>
                  {type} ({type === '전체' ? details.length : details.filter(d => d.service_type === type).length})
                </button>
              ))}
            </div>

            {/* 상세 목록 */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 24px 24px' }}>
              {detailLoading ? (
                <p style={{ color: TEXT_MUTED, padding: '20px 0' }}>불러오는 중...</p>
              ) : filteredDetails.length === 0 ? (
                <p style={{ color: TEXT_MUTED, padding: '20px 0' }}>해당 기간 내 서비스 기록이 없습니다.</p>
              ) : (
                filteredDetails.map((d) => (
                  <div key={d.service_id}
                    style={{ padding: '14px 0', borderBottom: `1px solid ${INPUT_BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 4 }}>
                        {d.customer_name}
                      </div>
                      {d.service_notes && (
                        <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>{d.service_notes}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#e0e7ff', color: BLUE_BG, marginBottom: 4 }}>
                        {d.service_type}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_MUTED }}>{d.visit_date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
