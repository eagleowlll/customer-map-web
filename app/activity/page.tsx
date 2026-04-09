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

function getRecentMonths() {
  const months = []
  const now = new Date()
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const label = `${month}월`
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    months.push({ label, start, end })
  }
  return months
}

export default function ActivityPage() {
  const supabase = createClient()

  const now = new Date()
  const defaultStart = `${now.getFullYear()}-01-01`
  const defaultEnd = now.toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(false)
  const [activeMonth, setActiveMonth] = useState<string | null>(null)

  const recentMonths = getRecentMonths()

  const fetchActivity = async (start: string, end: string) => {
    setLoading(true)

    const { data: engineers } = await supabase
      .from('engineers')
      .select('*')
      .order('engineer_id', { ascending: true })

    const { data: serviceData } = await supabase
      .from('service_engineers')
      .select('engineer_id, service_history(visit_date, service_type)')
      .gte('service_history.visit_date', start)
      .lte('service_history.visit_date', end)

    const result: ActivityRow[] = (engineers ?? []).map((eng) => {
      const counts: Record<string, number> = {}
      SERVICE_TYPES.forEach((t) => { counts[t] = 0 })

      ;(serviceData ?? [])
        .filter((row: any) => row.engineer_id === eng.engineer_id && row.service_history)
        .forEach((row: any) => {
          const type = row.service_history.service_type
          if (type && counts[type] !== undefined) {
            counts[type]++
          }
        })

      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      return { engineer: eng, counts, total }
    })

    setRows(result)
    setLoading(false)
  }

  useEffect(() => {
    fetchActivity(defaultStart, defaultEnd)
  }, [])

  const handleMonthClick = (month: { label: string; start: string; end: string }) => {
    setStartDate(month.start)
    setEndDate(month.end)
    setActiveMonth(month.label)
    fetchActivity(month.start, month.end)
  }

  const handleSearch = () => {
    setActiveMonth(null)
    fetchActivity(startDate, endDate)
  }

  return (
    <main style={{ padding: 24, background: PAGE_BG, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* 헤더 */}
        <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT_PRIMARY, margin: 0, marginBottom: 20 }}>
          활동 현황
        </h1>

        {/* 날짜 선택 카드 */}
        <div style={{
          background: PANEL_BG,
          border: `1px solid ${INPUT_BORDER}`,
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          {/* 월 빠른선택 버튼 */}
          {recentMonths.map((month) => (
            <button
              key={month.label}
              onClick={() => handleMonthClick(month)}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: `1px solid ${activeMonth === month.label ? BLUE_BG : INPUT_BORDER}`,
                background: activeMonth === month.label ? BLUE_BG : PAGE_BG,
                color: activeMonth === month.label ? BLUE_TEXT : TEXT_PRIMARY,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {month.label}
            </button>
          ))}

          {/* 구분선 */}
          <div style={{ width: 1, height: 32, background: INPUT_BORDER, margin: '0 4px' }} />

          {/* 날짜 직접 입력 */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setActiveMonth(null) }}
            style={{
              padding: '8px 12px',
              border: `1px solid ${INPUT_BORDER}`,
              borderRadius: 8,
              background: PAGE_BG,
              color: TEXT_PRIMARY,
              fontSize: 14,
              outline: 'none',
            }}
          />
          <span style={{ color: TEXT_MUTED, fontWeight: 700 }}>~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setActiveMonth(null) }}
            style={{
              padding: '8px 12px',
              border: `1px solid ${INPUT_BORDER}`,
              borderRadius: 8,
              background: PAGE_BG,
              color: TEXT_PRIMARY,
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '8px 20px',
              background: BLUE_BG,
              color: BLUE_TEXT,
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            조회
          </button>
        </div>

        {/* 카드 그리드 */}
        {loading ? (
          <p style={{ color: TEXT_SECONDARY }}>불러오는 중...</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}>
            {rows.map((row) => (
              <div
                key={row.engineer.engineer_id}
                style={{
                  background: PANEL_BG,
                  border: `1px solid ${INPUT_BORDER}`,
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {/* 엔지니어 이름 */}
                <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${INPUT_BORDER}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY }}>
                    {row.engineer.name}
                  </div>
                  <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>
                    {row.engineer.position ?? ''}
                  </div>
                </div>

                {/* 항목별 카운트 */}
                <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                  {SERVICE_TYPES.map((type) => (
                    <div
                      key={type}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>{type}</span>
                      <span style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: row.counts[type] > 0 ? BLUE_BG : TEXT_MUTED,
                      }}>
                        {row.counts[type]}건
                      </span>
                    </div>
                  ))}
                </div>

                {/* 합계 */}
                <div style={{
                  paddingTop: 12,
                  borderTop: `1px solid ${INPUT_BORDER}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>합계</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: BLUE_BG }}>
                    {row.total}건
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}