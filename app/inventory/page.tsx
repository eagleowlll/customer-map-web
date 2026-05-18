'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

const BLUE = '#234ea2'
const GREEN = '#16a34a'
const PAGE_BG = '#f4f5f7'
const CARD_BG = '#ffffff'
const BORDER = '#e5e7eb'
const TEXT = '#111113'
const GRAY = '#6b7280'
const RED = '#dc2626'

type InventoryItem = {
  item_id: number
  item_no: string | null
  part_code: string | null
  item_name: string | null
  po_no: string | null
  lot_no: string | null
  quantity: number
  location: string | null
  received_date: string | null
}

type InventoryLog = {
  log_id: number
  item_id: number
  engineer_id: number | null
  quantity_out: number
  log_type: 'out' | 'in'
  outlet_company: string | null
  reason: string | null
  note: string | null
  logged_at: string
  inventory_items?: { item_name: string | null; part_code: string | null } | null
  engineers?: { name: string; position: string | null } | null
}

export default function InventoryPage() {
  const supabase = createClient()

  const [items, setItems] = useState<InventoryItem[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [currentEngineerId, setCurrentEngineerId] = useState<number | null>(null)

  const [activeTab, setActiveTab] = useState<'items' | 'logs'>('items')
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('전체')

  // 출고 모달
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [checkoutQty, setCheckoutQty] = useState(1)
  const [checkoutCompany, setCheckoutCompany] = useState('')
  const [checkoutReason, setCheckoutReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 재입고 모달
  const [selectedLog, setSelectedLog] = useState<InventoryLog | null>(null)
  const [restockQty, setRestockQty] = useState(1)
  const [restockReason, setRestockReason] = useState('')
  const [isRestocking, setIsRestocking] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: itemsData }, { data: logsData }] = await Promise.all([
      supabase.from('inventory_items').select('*').order('item_id', { ascending: true }),
      supabase.from('inventory_logs')
        .select('*, inventory_items(item_name, part_code), engineers(name, position)')
        .order('logged_at', { ascending: false }),
    ])
    setItems((itemsData as InventoryItem[]) ?? [])
    setLogs((logsData as InventoryLog[]) ?? [])
    if (user?.email) {
      const { data: me } = await supabase.from('engineers').select('engineer_id').eq('email', user.email).single()
      if (me) setCurrentEngineerId(me.engineer_id)
    }
    setLoading(false)
  }

  const filteredItems = useMemo(() => items.filter(item => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q ||
      (item.part_code ?? '').toLowerCase().includes(q) ||
      (item.item_name ?? '').toLowerCase().includes(q)
    const matchLoc = locationFilter === '전체' || item.location === locationFilter
    return matchSearch && matchLoc
  }), [items, search, locationFilter])

  // ── 출고 처리 ──
  const handleCheckout = async () => {
    if (!selectedItem || checkoutQty < 1 || checkoutQty > selectedItem.quantity) return
    setIsSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ quantity: selectedItem.quantity - checkoutQty })
        .eq('item_id', selectedItem.item_id)
      if (updateError) throw updateError

      const { error: logError } = await supabase
        .from('inventory_logs')
        .insert([{
          item_id: selectedItem.item_id,
          engineer_id: currentEngineerId,
          quantity_out: checkoutQty,
          log_type: 'out',
          outlet_company: checkoutCompany.trim() || null,
          reason: checkoutReason.trim() || null,
          logged_at: new Date().toISOString(),
        }])
      if (logError) throw logError

      alert('출고가 완료되었습니다.')
      setSelectedItem(null)
      setCheckoutQty(1)
      setCheckoutCompany('')
      setCheckoutReason('')
      await fetchAll()
    } catch (err: any) {
      alert(err?.message || '출고 처리 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── 재입고 처리 ──
  const handleRestock = async () => {
    if (!selectedLog || restockQty < 1) return
    setIsRestocking(true)
    try {
      const currentItem = items.find(i => i.item_id === selectedLog.item_id)
      if (!currentItem) throw new Error('품목 정보를 찾을 수 없습니다.')

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ quantity: currentItem.quantity + restockQty })
        .eq('item_id', selectedLog.item_id)
      if (updateError) throw updateError

      const { error: logError } = await supabase
        .from('inventory_logs')
        .insert([{
          item_id: selectedLog.item_id,
          engineer_id: currentEngineerId,
          quantity_out: restockQty,
          log_type: 'in',
          reason: restockReason.trim() || null,
          logged_at: new Date().toISOString(),
        }])
      if (logError) throw logError

      alert('재입고가 완료되었습니다.')
      setSelectedLog(null)
      setRestockQty(1)
      setRestockReason('')
      await fetchAll()
    } catch (err: any) {
      alert(err?.message || '재입고 처리 중 오류가 발생했습니다.')
    } finally {
      setIsRestocking(false)
    }
  }

  const openCheckout = (item: InventoryItem) => {
    setSelectedItem(item)
    setCheckoutQty(1)
    setCheckoutCompany('')
    setCheckoutReason('')
  }

  const openRestock = (log: InventoryLog) => {
    setSelectedLog(log)
    setRestockQty(log.quantity_out)
    setRestockReason('')
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const floor1Count = items.filter(i => i.location === '1층').length
  const floor2Count = items.filter(i => i.location === '2층').length

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 11px', border: `1px solid ${BORDER}`, borderRadius: 8,
    fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box', color: TEXT,
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: 16, color: GRAY }}>
      불러오는 중...
    </div>
  )

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', padding: '24px 28px', fontFamily: 'Malgun Gothic, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: TEXT }}>📦 재고 관리</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: GRAY }}>부품 재고 현황 및 출고·재입고 이력 관리</p>
        </div>

        {/* 요약 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: '총 품목 수', value: `${items.length}종`, color: TEXT, bg: CARD_BG, border: BORDER },
            { label: '총 재고 수량', value: `${totalQty}개`, color: BLUE, bg: '#eff6ff', border: '#bfdbfe' },
            { label: '1층 보관', value: `${floor1Count}종`, color: TEXT, bg: CARD_BG, border: BORDER },
            { label: '2층 보관', value: `${floor2Count}종`, color: TEXT, bg: CARD_BG, border: BORDER },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ background: bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, color: GRAY, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', marginBottom: 16, borderBottom: `2px solid ${BORDER}` }}>
          {([['items', '재고 목록'], ['logs', '출고·재입고 이력']] as [string, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab as 'items' | 'logs')}
              style={{
                padding: '10px 22px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                background: 'transparent', color: activeTab === tab ? BLUE : GRAY,
                borderBottom: activeTab === tab ? `2px solid ${BLUE}` : '2px solid transparent',
                marginBottom: -2, transition: 'color 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── 재고 목록 탭 ── */}
        {activeTab === 'items' && (
          <>
            <div style={{ background: CARD_BG, borderRadius: 12, padding: '12px 16px', marginBottom: 14, border: `1px solid ${BORDER}`, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="부품코드 또는 품명으로 검색"
                style={{ ...inp, flex: 1, minWidth: 200, width: 'auto', padding: '7px 11px' }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                {['전체', '1층', '2층'].map(loc => (
                  <button key={loc} onClick={() => setLocationFilter(loc)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 13,
                      background: locationFilter === loc ? BLUE : '#f3f4f6',
                      color: locationFilter === loc ? '#fff' : TEXT,
                    }}>
                    {loc}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: GRAY, whiteSpace: 'nowrap' }}>{filteredItems.length}개 품목</span>
            </div>

            <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${BORDER}` }}>
                      {['재고번호', '부품코드', '품명', 'PO번호', '제번', '수량', '보관장소', '매입일자', ''].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: GRAY, fontWeight: 700, whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: GRAY }}>
                          {search || locationFilter !== '전체' ? '검색 결과가 없습니다.' : '등록된 재고가 없습니다.'}
                        </td>
                      </tr>
                    ) : filteredItems.map(item => (
                      <tr key={item.item_id}
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '12px 14px', color: GRAY, fontSize: 12, whiteSpace: 'nowrap' }}>{item.item_no ?? '-'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: BLUE, whiteSpace: 'nowrap' }}>{item.part_code ?? '-'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: TEXT }}>{item.item_name ?? '-'}</td>
                        <td style={{ padding: '12px 14px', color: GRAY, fontSize: 12, whiteSpace: 'nowrap' }}>{item.po_no ?? '-'}</td>
                        <td style={{ padding: '12px 14px', color: GRAY, fontSize: 12, whiteSpace: 'nowrap' }}>{item.lot_no ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{item.quantity}개</span>
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {item.location ? (
                            <span style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                              background: item.location === '1층' ? '#eff6ff' : '#f0fdf4',
                              color: item.location === '1층' ? BLUE : GREEN,
                            }}>
                              {item.location}
                            </span>
                          ) : <span style={{ color: GRAY }}>-</span>}
                        </td>
                        <td style={{ padding: '12px 14px', color: GRAY, fontSize: 12, whiteSpace: 'nowrap' }}>{item.received_date ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => openCheckout(item)}
                            disabled={item.quantity === 0}
                            style={{
                              padding: '5px 14px', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12,
                              cursor: item.quantity === 0 ? 'not-allowed' : 'pointer',
                              background: item.quantity === 0 ? '#e5e7eb' : BLUE,
                              color: item.quantity === 0 ? GRAY : '#fff',
                            }}>
                            출고
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── 출고·재입고 이력 탭 ── */}
        {activeTab === 'logs' && (
          <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${BORDER}` }}>
                    {['일시', '구분', '품명', '부품코드', '처리자', '수량', '출고 업체', '사유', ''].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: GRAY, fontWeight: 700, whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: GRAY }}>이력이 없습니다.</td>
                    </tr>
                  ) : logs.map(log => {
                    const isIn = log.log_type === 'in'
                    return (
                      <tr key={log.log_id}
                        style={{ borderBottom: `1px solid ${BORDER}`, background: isIn ? '#f0fdf4' : 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = isIn ? '#dcfce7' : '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = isIn ? '#f0fdf4' : '')}>
                        <td style={{ padding: '12px 14px', color: GRAY, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(log.logged_at).toLocaleString('ko-KR', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: isIn ? '#dcfce7' : '#fee2e2',
                            color: isIn ? GREEN : RED,
                          }}>
                            {isIn ? '재입고' : '출고'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: TEXT }}>{log.inventory_items?.item_name ?? '-'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: BLUE, whiteSpace: 'nowrap' }}>{log.inventory_items?.part_code ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: TEXT }}>
                          {log.engineers ? `${log.engineers.name}${log.engineers.position ? ' ' + log.engineers.position : ''}` : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 800, color: isIn ? GREEN : RED }}>
                            {isIn ? '+' : '-'}{log.quantity_out}개
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: TEXT }}>{log.outlet_company ?? '-'}</td>
                        <td style={{ padding: '12px 14px', color: GRAY }}>{log.reason ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {!isIn && (
                            <button
                              onClick={() => openRestock(log)}
                              style={{
                                padding: '5px 12px', border: `1px solid ${GREEN}`, borderRadius: 7,
                                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                background: '#f0fdf4', color: GREEN,
                              }}>
                              재입고
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── 출고 모달 ── */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>출고 처리</span>
              <button onClick={() => setSelectedItem(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>

            <div style={{ padding: '16px 22px 0' }}>
              {/* 품목 정보 */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, color: GRAY, marginBottom: 3 }}>품명</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 8 }}>{selectedItem.item_name ?? '-'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                  <div><span style={{ color: GRAY }}>부품코드 </span><span style={{ fontWeight: 700, color: BLUE }}>{selectedItem.part_code ?? '-'}</span></div>
                  <div><span style={{ color: GRAY }}>보관장소 </span><span style={{ fontWeight: 700 }}>{selectedItem.location ?? '-'}</span></div>
                  <div><span style={{ color: GRAY }}>현재 수량 </span><span style={{ fontWeight: 800 }}>{selectedItem.quantity}개</span></div>
                  {selectedItem.lot_no && (
                    <div><span style={{ color: GRAY }}>제번 </span><span style={{ fontWeight: 700 }}>{selectedItem.lot_no}</span></div>
                  )}
                </div>
              </div>

              {/* 수량 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>출고 수량</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <button onClick={() => setCheckoutQty(q => Math.max(1, q - 1))}
                    style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#f3f4f6', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: TEXT }}>
                    ▼
                  </button>
                  <span style={{ fontSize: 30, fontWeight: 800, color: TEXT, minWidth: 56, textAlign: 'center' }}>{checkoutQty}</span>
                  <button onClick={() => setCheckoutQty(q => Math.min(selectedItem.quantity, q + 1))}
                    style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#f3f4f6', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: TEXT }}>
                    ▲
                  </button>
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, color: GRAY, marginTop: 8 }}>
                  출고 후 잔여: <strong style={{ color: TEXT }}>{selectedItem.quantity - checkoutQty}개</strong>
                </div>
              </div>

              {/* 출고 업체 */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>출고 업체 <span style={{ fontWeight: 400, color: GRAY }}>(선택)</span></div>
                <input
                  value={checkoutCompany}
                  onChange={e => setCheckoutCompany(e.target.value)}
                  placeholder="출고 업체명 입력"
                  style={inp}
                />
              </div>

              {/* 사유 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>사유 <span style={{ fontWeight: 400, color: GRAY }}>(선택)</span></div>
                <textarea
                  value={checkoutReason}
                  onChange={e => setCheckoutReason(e.target.value)}
                  placeholder="출고 사유 또는 사용처를 입력하세요"
                  rows={2}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ padding: '0 22px 20px', display: 'flex', gap: 8 }}>
              <button onClick={() => setSelectedItem(null)}
                style={{ flex: 1, padding: 11, background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                취소
              </button>
              <button
                onClick={handleCheckout}
                disabled={isSaving || checkoutQty < 1 || checkoutQty > selectedItem.quantity}
                style={{
                  flex: 2, padding: 11, background: BLUE, color: '#fff', border: 'none', borderRadius: 10,
                  cursor: isSaving ? 'wait' : 'pointer', fontWeight: 700, fontSize: 14, opacity: isSaving ? 0.7 : 1,
                }}>
                {isSaving ? '처리 중...' : `${checkoutQty}개 출고 확인`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 재입고 모달 ── */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: GREEN }}>재입고 처리</span>
              <button onClick={() => setSelectedLog(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>

            <div style={{ padding: '16px 22px 0' }}>
              {/* 원래 출고 정보 */}
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: `1px solid #bbf7d0` }}>
                <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, marginBottom: 6 }}>원래 출고 이력</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 6 }}>{selectedLog.inventory_items?.item_name ?? '-'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
                  <div><span style={{ color: GRAY }}>부품코드 </span><span style={{ fontWeight: 700, color: BLUE }}>{selectedLog.inventory_items?.part_code ?? '-'}</span></div>
                  <div><span style={{ color: GRAY }}>출고량 </span><span style={{ fontWeight: 700 }}>{selectedLog.quantity_out}개</span></div>
                  {selectedLog.outlet_company && (
                    <div><span style={{ color: GRAY }}>출고업체 </span><span style={{ fontWeight: 700 }}>{selectedLog.outlet_company}</span></div>
                  )}
                  {selectedLog.reason && (
                    <div><span style={{ color: GRAY }}>사유 </span><span style={{ fontWeight: 700 }}>{selectedLog.reason}</span></div>
                  )}
                </div>
              </div>

              {/* 재입고 수량 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>재입고 수량</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <button onClick={() => setRestockQty(q => Math.max(1, q - 1))}
                    style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#f3f4f6', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: TEXT }}>
                    ▼
                  </button>
                  <span style={{ fontSize: 30, fontWeight: 800, color: GREEN, minWidth: 56, textAlign: 'center' }}>{restockQty}</span>
                  <button onClick={() => setRestockQty(q => q + 1)}
                    style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#f3f4f6', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: TEXT }}>
                    ▲
                  </button>
                </div>
              </div>

              {/* 사유 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>사유 <span style={{ fontWeight: 400, color: GRAY }}>(선택)</span></div>
                <textarea
                  value={restockReason}
                  onChange={e => setRestockReason(e.target.value)}
                  placeholder="재입고 사유를 입력하세요"
                  rows={2}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ padding: '0 22px 20px', display: 'flex', gap: 8 }}>
              <button onClick={() => setSelectedLog(null)}
                style={{ flex: 1, padding: 11, background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                취소
              </button>
              <button
                onClick={handleRestock}
                disabled={isRestocking || restockQty < 1}
                style={{
                  flex: 2, padding: 11, background: GREEN, color: '#fff', border: 'none', borderRadius: 10,
                  cursor: isRestocking ? 'wait' : 'pointer', fontWeight: 700, fontSize: 14, opacity: isRestocking ? 0.7 : 1,
                }}>
                {isRestocking ? '처리 중...' : `${restockQty}개 재입고 확인`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
