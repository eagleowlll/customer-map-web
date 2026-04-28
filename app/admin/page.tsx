'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ADMIN_EMAIL = 'jwkwon@accretechkorea.com'
const BLUE = '#234ea2'
const PAGE_BG = '#f4f5f7'
const CARD_BG = '#ffffff'
const BORDER = '#e5e7eb'
const TEXT = '#111113'
const GRAY = '#6b7280'
const DANGER = '#dc2626'

type Quote = {
  quote_id: number
  quote_number: string
  quote_date: string
  total_supply: number
  status: string
  subject: string | null
  engineers?: { name: string } | null
  customers?: { company_name: string } | null
}

const numKR = (n: number) => Math.round(n).toLocaleString('ko-KR')

const STATUS_COLORS: Record<string, string> = {
  '견적중': '#f59e0b',
  '수주': '#3b82f6',
  '매출완료': '#16a34a',
  '실패': '#dc2626',
  '보류': '#9ca3af',
}

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  // 견적서 삭제 모달
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user?.email === ADMIN_EMAIL) {
        setAuthorized(true)
      } else {
        router.replace('/')
      }
      setLoading(false)
    }
    check()
  }, [])

  const fetchQuotes = async (q?: string) => {
    setQuoteLoading(true)
    let query = supabase
      .from('quotes')
      .select('*, engineers(name), customers(company_name)')
      .order('quote_date', { ascending: false })
      .limit(50)

    if (q && q.trim()) {
      query = query.or(`quote_number.ilike.%${q}%,subject.ilike.%${q}%`)
    }

    const { data } = await query
    setQuotes((data as Quote[]) || [])
    setQuoteLoading(false)
  }

  const handleOpenQuoteModal = () => {
    setShowQuoteModal(true)
    setSearchQuery('')
    fetchQuotes()
  }

  const handleDeleteQuote = async (quote: Quote) => {
    const ok = confirm(`견적서 ${quote.quote_number}을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)
    if (!ok) return
    setDeleting(quote.quote_id)
    await supabase.from('quote_items').delete().eq('quote_id', quote.quote_id)
    await supabase.from('quotes').delete().eq('quote_id', quote.quote_id)
    setDeleting(null)
    fetchQuotes(searchQuery)
  }

  const inp: React.CSSProperties = {
    padding: '8px 12px', border: `1px solid ${BORDER}`, borderRadius: 8,
    fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box',
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: 16, color: GRAY }}>
      확인 중...
    </div>
  )

  if (!authorized) return null

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', padding: 24, fontFamily: 'Malgun Gothic, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: 0 }}>⚙️ 관리자</h1>
          <p style={{ fontSize: 13, color: GRAY, marginTop: 6 }}>시스템 운영 및 유지보수 기능</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>

          {/* 목표 금액 관리 */}
          <div style={{ background: CARD_BG, borderRadius: 16, padding: 24, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 8 }}>목표 금액 관리</div>
            <div style={{ fontSize: 13, color: GRAY, marginBottom: 20, lineHeight: 1.6 }}>
              연간 목표 금액을 개인별 / 팀별로 설정하고 수정합니다.
            </div>
            <button style={{ width: '100%', padding: '10px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              onClick={() => alert('준비 중입니다.')}>
              관리하기
            </button>
          </div>

          {/* 견적서 삭제 */}
          <div style={{ background: CARD_BG, borderRadius: 16, padding: 24, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 8 }}>견적서 삭제</div>
            <div style={{ fontSize: 13, color: GRAY, marginBottom: 20, lineHeight: 1.6 }}>
              실수로 저장된 견적서를 조회하고 삭제합니다.
            </div>
            <button style={{ width: '100%', padding: '10px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              onClick={handleOpenQuoteModal}>
              관리하기
            </button>
          </div>

          {/* 가격표 업로드 */}
          <div style={{ background: CARD_BG, borderRadius: 16, padding: 24, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 8 }}>가격표 업로드</div>
            <div style={{ fontSize: 13, color: GRAY, marginBottom: 20, lineHeight: 1.6 }}>
              엑셀 파일을 업로드해서 견적서 가격표를 최신 버전으로 업데이트합니다.
            </div>
            <button style={{ width: '100%', padding: '10px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              onClick={() => alert('준비 중입니다.')}>
              업로드하기
            </button>
          </div>

          {/* 직원 관리 */}
          <div style={{ background: CARD_BG, borderRadius: 16, padding: 24, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 8 }}>직원 관리</div>
            <div style={{ fontSize: 13, color: GRAY, marginBottom: 20, lineHeight: 1.6 }}>
              이름, 직책, 팀, 이니셜 등 직원 정보를 수정합니다.
            </div>
            <button style={{ width: '100%', padding: '10px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              onClick={() => alert('준비 중입니다.')}>
              관리하기
            </button>
          </div>

          {/* 환율 설정 */}
          <div style={{ background: CARD_BG, borderRadius: 16, padding: 24, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>💱</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 8 }}>환율 수동 설정</div>
            <div style={{ fontSize: 13, color: GRAY, marginBottom: 20, lineHeight: 1.6 }}>
              자동 갱신이 안 될 때 JPY 환율을 수동으로 입력합니다.
            </div>
            <button style={{ width: '100%', padding: '10px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              onClick={() => alert('준비 중입니다.')}>
              설정하기
            </button>
          </div>

        </div>
      </div>

      {/* 견적서 삭제 모달 */}
      {showQuoteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: CARD_BG, borderRadius: 18, padding: 24, width: '100%', maxWidth: 760, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: TEXT }}>🗑️ 견적서 삭제</div>
              <button onClick={() => setShowQuoteModal(false)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchQuotes(searchQuery)}
                placeholder="견적번호 또는 견적 내용으로 검색"
                style={{ ...inp, flex: 1 }}
              />
              <button onClick={() => fetchQuotes(searchQuery)}
                style={{ padding: '8px 16px', background: BLUE, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                검색
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {quoteLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: GRAY }}>불러오는 중...</div>
              ) : quotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: GRAY }}>견적서가 없습니다</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, background: CARD_BG }}>
                    <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                      {['견적번호', '날짜', '담당자', '고객사', '금액', '상태', '삭제'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: GRAY, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map(q => (
                      <tr key={q.quote_id} style={{ borderBottom: `1px solid ${BORDER}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '10px 10px', fontWeight: 700, color: BLUE, whiteSpace: 'nowrap' }}>{q.quote_number}</td>
                        <td style={{ padding: '10px 10px', color: GRAY, whiteSpace: 'nowrap' }}>{q.quote_date}</td>
                        <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>{q.engineers?.name || '-'}</td>
                        <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>{q.customers?.company_name || '-'}</td>
                        <td style={{ padding: '10px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>₩{numKR(q.total_supply)}</td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: (STATUS_COLORS[q.status] || GRAY) + '22', color: STATUS_COLORS[q.status] || GRAY }}>
                            {q.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <button onClick={() => handleDeleteQuote(q)} disabled={deleting === q.quote_id}
                            style={{ padding: '4px 12px', background: DANGER, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: deleting === q.quote_id ? 0.6 : 1 }}>
                            {deleting === q.quote_id ? '삭제 중...' : '삭제'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: GRAY }}>
              * 최근 50건 표시 / 검색으로 더 찾을 수 있습니다
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
