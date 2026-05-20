'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

const BLUE = '#234ea2'
const GREEN = '#16a34a'
const ORANGE = '#f59e0b'
const RED = '#dc2626'
const PAGE_BG = '#f4f5f7'
const CARD_BG = '#ffffff'
const BORDER = '#e5e7eb'
const TEXT = '#111113'
const GRAY = '#6b7280'

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

type InventoryRequest = {
  request_id: number
  item_id: number
  requester_id: number
  quantity: number
  reason: string | null
  status: '대기중' | '승인' | '반려'
  reject_reason: string | null
  requested_at: string
  processed_at: string | null
  processed_by: number | null
  inventory_items?: { item_name: string | null; part_code: string | null; location: string | null } | null
}

type Engineer = {
  engineer_id: number
  name: string
  position: string | null
  teams: string | null
  email: string | null
  is_inventory_manager: boolean
  permission_level: string | null
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  '대기중': { bg: '#fef3c7', color: ORANGE },
  '승인':   { bg: '#dcfce7', color: GREEN },
  '반려':   { bg: '#fee2e2', color: RED },
}

export default function InventoryPage() {
  const supabase = createClient()

  // ── 데이터 ──
  const [items, setItems] = useState<InventoryItem[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [requests, setRequests] = useState<InventoryRequest[]>([])
  const [allEngineers, setAllEngineers] = useState<Engineer[]>([])
  const [currentEngineer, setCurrentEngineer] = useState<Engineer | null>(null)
  const [loading, setLoading] = useState(true)

  // ── UI ──
  const [activeTab, setActiveTab] = useState<'items' | 'logs' | 'requests' | 'approval'>('items')
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('전체')

  // 출고 요청 모달
  const [requestItem, setRequestItem] = useState<InventoryItem | null>(null)
  const [requestQty, setRequestQty] = useState(1)
  const [requestReason, setRequestReason] = useState('')
  const [isSavingRequest, setIsSavingRequest] = useState(false)

  // 재입고 모달
  const [selectedLog, setSelectedLog] = useState<InventoryLog | null>(null)
  const [restockQty, setRestockQty] = useState(1)
  const [restockReason, setRestockReason] = useState('')
  const [isRestocking, setIsRestocking] = useState(false)

  // 반려 모달
  const [rejectingRequest, setRejectingRequest] = useState<InventoryRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [
      { data: itemsData },
      { data: logsData },
      { data: requestsData },
      { data: engData },
    ] = await Promise.all([
      supabase.from('inventory_items').select('*').order('item_id', { ascending: true }),
      supabase.from('inventory_logs')
        .select('*, inventory_items(item_name, part_code), engineers(name, position)')
        .order('logged_at', { ascending: false }),
      supabase.from('inventory_requests')
        .select('*, inventory_items(item_name, part_code, location)')
        .order('requested_at', { ascending: false }),
      supabase.from('engineers')
        .select('engineer_id, name, position, teams, email, is_inventory_manager, permission_level')
        .order('engineer_id'),
    ])
    setItems((itemsData as InventoryItem[]) ?? [])
    setLogs((logsData as InventoryLog[]) ?? [])
    setRequests((requestsData as InventoryRequest[]) ?? [])
    setAllEngineers((engData as Engineer[]) ?? [])
    if (user?.email && engData) {
      const me = (engData as Engineer[]).find(e => e.email === user.email)
      if (me) setCurrentEngineer(me)
    }
    setLoading(false)
  }

  // ── 파생 상태 ──
  const isManager = currentEngineer?.is_inventory_manager ?? false
  const isSuperAdmin = currentEngineer?.permission_level === 'superadmin'

  const filteredItems = useMemo(() => items.filter(item => {
    const q = search.trim().toLowerCase()
    return (!q || (item.part_code ?? '').toLowerCase().includes(q) || (item.item_name ?? '').toLowerCase().includes(q))
      && (locationFilter === '전체' || item.location === locationFilter)
  }), [items, search, locationFilter])

  const myRequests = useMemo(() => {
    if (!currentEngineer) return []
    if (isSuperAdmin) return requests
    return requests.filter(r => r.requester_id === currentEngineer.engineer_id)
  }, [requests, currentEngineer, isSuperAdmin])

  const pendingRequests = requests.filter(r => r.status === '대기중')

  const getEngName = (id: number) => {
    const e = allEngineers.find(e => e.engineer_id === id)
    return e ? `${e.name}${e.position ? ' ' + e.position : ''}` : '-'
  }

  // ── 출고 요청 ──
  const handleRequest = async () => {
    if (!requestItem || !currentEngineer || requestQty < 1) return
    setIsSavingRequest(true)
    try {
      const { error } = await supabase.from('inventory_requests').insert([{
        item_id: requestItem.item_id,
        requester_id: currentEngineer.engineer_id,
        quantity: requestQty,
        reason: requestReason.trim() || null,
        status: '대기중',
        requested_at: new Date().toISOString(),
      }])
      if (error) throw error

      const managers = allEngineers.filter(e => e.is_inventory_manager)
      if (managers.length > 0) {
        await supabase.from('notifications').insert(
          managers.map(m => ({
            engineer_id: m.engineer_id,
            title: '출고 요청 승인 필요',
            message: `${requestItem.item_name ?? '알 수 없음'} ${requestQty}개 출고 요청이 들어왔습니다`,
            type: 'stock_request',
            link: '/inventory',
            is_read: false,
            created_at: new Date().toISOString(),
          }))
        )
      }
      alert('출고 요청이 등록되었습니다.')
      setRequestItem(null); setRequestQty(1); setRequestReason('')
      await fetchAll()
    } catch (err) {
      alert(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다.')
    } finally {
      setIsSavingRequest(false)
    }
  }

  // ── 승인 ──
  const handleApprove = async (req: InventoryRequest) => {
    if (!currentEngineer) return
    const item = items.find(i => i.item_id === req.item_id)
    if (!item) { alert('품목 정보를 찾을 수 없습니다.'); return }
    if (item.quantity < req.quantity) { alert(`현재 재고(${item.quantity}개)가 요청 수량(${req.quantity}개)보다 부족합니다.`); return }
    if (!confirm(`${req.inventory_items?.item_name ?? '품목'} ${req.quantity}개 출고 요청을 승인하시겠습니까?`)) return

    setIsProcessing(true)
    try {
      await supabase.from('inventory_items')
        .update({ quantity: item.quantity - req.quantity })
        .eq('item_id', req.item_id)

      await supabase.from('inventory_requests').update({
        status: '승인',
        processed_at: new Date().toISOString(),
        processed_by: currentEngineer.engineer_id,
      }).eq('request_id', req.request_id)

      // 출고 이력 기록
      await supabase.from('inventory_logs').insert([{
        item_id: req.item_id,
        engineer_id: currentEngineer.engineer_id,
        quantity_out: req.quantity,
        log_type: 'out',
        reason: req.reason,
        logged_at: new Date().toISOString(),
      }])

      // 요청자 알림
      await supabase.from('notifications').insert([{
        engineer_id: req.requester_id,
        title: '출고 요청 승인됨',
        message: `${req.inventory_items?.item_name ?? '품목'} ${req.quantity}개 출고 요청이 승인되었습니다`,
        type: 'stock_approved',
        link: '/inventory',
        is_read: false,
        created_at: new Date().toISOString(),
      }])

      alert('승인이 완료되었습니다.')
      await fetchAll()
    } catch (err) {
      alert(err instanceof Error ? err.message : '승인 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── 반려 ──
  const handleReject = async () => {
    if (!rejectingRequest || !currentEngineer) return
    if (!rejectReason.trim()) { alert('반려 사유를 입력해주세요.'); return }
    setIsProcessing(true)
    try {
      await supabase.from('inventory_requests').update({
        status: '반려',
        reject_reason: rejectReason.trim(),
        processed_at: new Date().toISOString(),
        processed_by: currentEngineer.engineer_id,
      }).eq('request_id', rejectingRequest.request_id)

      await supabase.from('notifications').insert([{
        engineer_id: rejectingRequest.requester_id,
        title: '출고 요청 반려됨',
        message: `${rejectingRequest.inventory_items?.item_name ?? '품목'} ${rejectingRequest.quantity}개 출고 요청이 반려되었습니다. 사유: ${rejectReason.trim()}`,
        type: 'stock_rejected',
        link: '/inventory',
        is_read: false,
        created_at: new Date().toISOString(),
      }])

      alert('반려 처리되었습니다.')
      setRejectingRequest(null); setRejectReason('')
      await fetchAll()
    } catch (err) {
      alert(err instanceof Error ? err.message : '반려 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── 재입고 ──
  const handleRestock = async () => {
    if (!selectedLog || restockQty < 1 || !currentEngineer) return
    setIsRestocking(true)
    try {
      const item = items.find(i => i.item_id === selectedLog.item_id)
      if (!item) throw new Error('품목 정보를 찾을 수 없습니다.')
      await supabase.from('inventory_items').update({ quantity: item.quantity + restockQty }).eq('item_id', selectedLog.item_id)
      await supabase.from('inventory_logs').insert([{
        item_id: selectedLog.item_id,
        engineer_id: currentEngineer.engineer_id,
        quantity_out: restockQty,
        log_type: 'in',
        reason: restockReason.trim() || null,
        logged_at: new Date().toISOString(),
      }])
      alert('재입고가 완료되었습니다.')
      setSelectedLog(null); setRestockQty(1); setRestockReason('')
      await fetchAll()
    } catch (err) {
      alert(err instanceof Error ? err.message : '재입고 처리 중 오류가 발생했습니다.')
    } finally {
      setIsRestocking(false)
    }
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const floor1Count = items.filter(i => i.location === '1층').length
  const floor2Count = items.filter(i => i.location === '2층').length

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 11px', border: `1px solid ${BORDER}`, borderRadius: 8,
    fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box', color: TEXT,
  }

  const tabs = [
    { key: 'items', label: '재고 목록' },
    { key: 'logs', label: '출고·재입고 이력' },
    { key: 'requests', label: `요청 이력${myRequests.length > 0 ? ` (${myRequests.length})` : ''}` },
    ...(isManager ? [{ key: 'approval', label: `승인 관리${pendingRequests.length > 0 ? ` ● ${pendingRequests.length}` : ''}` }] : []),
  ]

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: 16, color: GRAY }}>
      불러오는 중...
    </div>
  )

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', padding: '24px 28px', fontFamily: 'Malgun Gothic, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: TEXT }}>📦 재고 관리</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: GRAY }}>부품 재고 현황 및 출고 요청·승인 관리</p>
        </div>

        {/* 요약 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: '총 품목 수', value: `${items.length}종`, color: TEXT, bg: CARD_BG, border: BORDER },
            { label: '총 재고 수량', value: `${totalQty}개`, color: BLUE, bg: '#eff6ff', border: '#bfdbfe' },
            { label: '대기 중 요청', value: `${pendingRequests.length}건`, color: pendingRequests.length > 0 ? ORANGE : GRAY, bg: pendingRequests.length > 0 ? '#fef3c7' : CARD_BG, border: pendingRequests.length > 0 ? '#fde68a' : BORDER },
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
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key as 'items' | 'logs' | 'requests' | 'approval')}
              style={{
                padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                background: 'transparent', color: activeTab === key ? BLUE : GRAY,
                borderBottom: activeTab === key ? `2px solid ${BLUE}` : '2px solid transparent',
                marginBottom: -2, transition: 'color 0.15s', whiteSpace: 'nowrap',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── 재고 목록 ── */}
        {activeTab === 'items' && (
          <>
            <div style={{ background: CARD_BG, borderRadius: 12, padding: '12px 16px', marginBottom: 14, border: `1px solid ${BORDER}`, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="부품코드 또는 품명으로 검색"
                style={{ ...inp, flex: 1, minWidth: 200, width: 'auto', padding: '7px 11px' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                {['전체', '1층', '2층'].map(loc => (
                  <button key={loc} onClick={() => setLocationFilter(loc)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: locationFilter === loc ? BLUE : '#f3f4f6', color: locationFilter === loc ? '#fff' : TEXT }}>
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
                      <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: GRAY }}>
                        {search || locationFilter !== '전체' ? '검색 결과가 없습니다.' : '등록된 재고가 없습니다.'}
                      </td></tr>
                    ) : filteredItems.map(item => (
                      <tr key={item.item_id} style={{ borderBottom: `1px solid ${BORDER}` }}
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
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: item.location === '1층' ? '#eff6ff' : '#f0fdf4', color: item.location === '1층' ? BLUE : GREEN }}>
                              {item.location}
                            </span>
                          ) : <span style={{ color: GRAY }}>-</span>}
                        </td>
                        <td style={{ padding: '12px 14px', color: GRAY, fontSize: 12, whiteSpace: 'nowrap' }}>{item.received_date ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => { setRequestItem(item); setRequestQty(1); setRequestReason('') }}
                            style={{ padding: '5px 14px', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', background: BLUE, color: '#fff' }}>
                            출고 요청
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

        {/* ── 출고·재입고 이력 ── */}
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
                    <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: GRAY }}>이력이 없습니다.</td></tr>
                  ) : logs.map(log => {
                    const isIn = log.log_type === 'in'
                    return (
                      <tr key={log.log_id} style={{ borderBottom: `1px solid ${BORDER}`, background: isIn ? '#f0fdf4' : 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = isIn ? '#dcfce7' : '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = isIn ? '#f0fdf4' : '')}>
                        <td style={{ padding: '12px 14px', color: GRAY, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(log.logged_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: isIn ? '#dcfce7' : '#fee2e2', color: isIn ? GREEN : RED }}>
                            {isIn ? '재입고' : '출고'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: TEXT }}>{log.inventory_items?.item_name ?? '-'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: BLUE, whiteSpace: 'nowrap' }}>{log.inventory_items?.part_code ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: TEXT }}>
                          {log.engineers ? `${log.engineers.name}${log.engineers.position ? ' ' + log.engineers.position : ''}` : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 800, color: isIn ? GREEN : RED }}>{isIn ? '+' : '-'}{log.quantity_out}개</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: TEXT }}>{log.outlet_company ?? '-'}</td>
                        <td style={{ padding: '12px 14px', color: GRAY }}>{log.reason ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {!isIn && (
                            <button onClick={() => { setSelectedLog(log); setRestockQty(log.quantity_out); setRestockReason('') }}
                              style={{ padding: '5px 12px', border: `1px solid ${GREEN}`, borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer', background: '#f0fdf4', color: GREEN }}>
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

        {/* ── 요청 이력 ── */}
        {activeTab === 'requests' && (
          <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${BORDER}` }}>
                    {['요청일시', '품명', '부품코드', ...(isSuperAdmin ? ['요청자'] : []), '요청 수량', '사유', '상태', '반려 사유'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: GRAY, fontWeight: 700, whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myRequests.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: GRAY }}>요청 이력이 없습니다.</td></tr>
                  ) : myRequests.map(req => {
                    const st = STATUS_STYLE[req.status] ?? { bg: '#f3f4f6', color: GRAY }
                    return (
                      <tr key={req.request_id} style={{ borderBottom: `1px solid ${BORDER}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '12px 14px', color: GRAY, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(req.requested_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: TEXT }}>{req.inventory_items?.item_name ?? '-'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: BLUE, whiteSpace: 'nowrap' }}>{req.inventory_items?.part_code ?? '-'}</td>
                        {isSuperAdmin && <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: TEXT }}>{getEngName(req.requester_id)}</td>}
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: TEXT, whiteSpace: 'nowrap' }}>{req.quantity}개</td>
                        <td style={{ padding: '12px 14px', color: GRAY }}>{req.reason ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: st.bg, color: st.color }}>{req.status}</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: RED, fontSize: 12 }}>{req.reject_reason ?? '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 승인 관리 ── */}
        {activeTab === 'approval' && isManager && (
          <div style={{ background: CARD_BG, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${BORDER}` }}>
                    {['요청일시', '품명', '부품코드', '보관장소', '현재 재고', '요청자', '요청 수량', '사유', ''].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: GRAY, fontWeight: 700, whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: GRAY }}>대기 중인 요청이 없습니다.</td></tr>
                  ) : pendingRequests.map(req => {
                    const item = items.find(i => i.item_id === req.item_id)
                    return (
                      <tr key={req.request_id} style={{ borderBottom: `1px solid ${BORDER}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '12px 14px', color: GRAY, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(req.requested_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: TEXT }}>{req.inventory_items?.item_name ?? '-'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: BLUE, whiteSpace: 'nowrap' }}>{req.inventory_items?.part_code ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {req.inventory_items?.location ? (
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: req.inventory_items.location === '1층' ? '#eff6ff' : '#f0fdf4', color: req.inventory_items.location === '1층' ? BLUE : GREEN }}>
                              {req.inventory_items.location}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, color: item && item.quantity < req.quantity ? RED : TEXT }}>
                            {item?.quantity ?? '-'}개
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: TEXT }}>{getEngName(req.requester_id)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: TEXT, whiteSpace: 'nowrap' }}>{req.quantity}개</td>
                        <td style={{ padding: '12px 14px', color: GRAY, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.reason ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleApprove(req)} disabled={isProcessing}
                              style={{ padding: '5px 14px', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: isProcessing ? 'wait' : 'pointer', background: GREEN, color: '#fff', opacity: isProcessing ? 0.6 : 1 }}>
                              승인
                            </button>
                            <button onClick={() => { setRejectingRequest(req); setRejectReason('') }} disabled={isProcessing}
                              style={{ padding: '5px 14px', border: `1px solid ${RED}`, borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: isProcessing ? 'wait' : 'pointer', background: '#fff', color: RED, opacity: isProcessing ? 0.6 : 1 }}>
                              반려
                            </button>
                          </div>
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

      {/* ── 출고 요청 모달 ── */}
      {requestItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>출고 요청</span>
              <button onClick={() => setRequestItem(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>
            <div style={{ padding: '16px 22px 0' }}>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, color: GRAY, marginBottom: 3 }}>품명</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 8 }}>{requestItem.item_name ?? '-'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                  <div><span style={{ color: GRAY }}>부품코드 </span><span style={{ fontWeight: 700, color: BLUE }}>{requestItem.part_code ?? '-'}</span></div>
                  <div><span style={{ color: GRAY }}>보관장소 </span><span style={{ fontWeight: 700 }}>{requestItem.location ?? '-'}</span></div>
                  <div><span style={{ color: GRAY }}>현재 수량 </span><span style={{ fontWeight: 800 }}>{requestItem.quantity}개</span></div>
                  {requestItem.lot_no && <div><span style={{ color: GRAY }}>제번 </span><span style={{ fontWeight: 700 }}>{requestItem.lot_no}</span></div>}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>요청 수량</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <button onClick={() => setRequestQty(q => Math.max(1, q - 1))}
                    style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#f3f4f6', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: TEXT }}>▼</button>
                  <span style={{ fontSize: 30, fontWeight: 800, color: TEXT, minWidth: 56, textAlign: 'center' }}>{requestQty}</span>
                  <button onClick={() => setRequestQty(q => q + 1)}
                    style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#f3f4f6', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: TEXT }}>▲</button>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>출고 사유 <span style={{ fontWeight: 400, color: GRAY }}>(선택)</span></div>
                <textarea value={requestReason} onChange={e => setRequestReason(e.target.value)}
                  placeholder="출고 사유 또는 사용처를 입력하세요" rows={3}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ padding: '0 22px 20px', display: 'flex', gap: 8 }}>
              <button onClick={() => setRequestItem(null)}
                style={{ flex: 1, padding: 11, background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>취소</button>
              <button onClick={handleRequest} disabled={isSavingRequest || requestQty < 1}
                style={{ flex: 2, padding: 11, background: BLUE, color: '#fff', border: 'none', borderRadius: 10, cursor: isSavingRequest ? 'wait' : 'pointer', fontWeight: 700, fontSize: 14, opacity: isSavingRequest ? 0.7 : 1 }}>
                {isSavingRequest ? '요청 중...' : `${requestQty}개 출고 요청`}
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
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, marginBottom: 6 }}>원래 출고 이력</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 6 }}>{selectedLog.inventory_items?.item_name ?? '-'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
                  <div><span style={{ color: GRAY }}>부품코드 </span><span style={{ fontWeight: 700, color: BLUE }}>{selectedLog.inventory_items?.part_code ?? '-'}</span></div>
                  <div><span style={{ color: GRAY }}>출고량 </span><span style={{ fontWeight: 700 }}>{selectedLog.quantity_out}개</span></div>
                  {selectedLog.reason && <div><span style={{ color: GRAY }}>사유 </span><span style={{ fontWeight: 700 }}>{selectedLog.reason}</span></div>}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>재입고 수량</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <button onClick={() => setRestockQty(q => Math.max(1, q - 1))}
                    style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#f3f4f6', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: TEXT }}>▼</button>
                  <span style={{ fontSize: 30, fontWeight: 800, color: GREEN, minWidth: 56, textAlign: 'center' }}>{restockQty}</span>
                  <button onClick={() => setRestockQty(q => q + 1)}
                    style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#f3f4f6', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: TEXT }}>▲</button>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>사유 <span style={{ fontWeight: 400, color: GRAY }}>(선택)</span></div>
                <textarea value={restockReason} onChange={e => setRestockReason(e.target.value)} placeholder="재입고 사유를 입력하세요" rows={2}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ padding: '0 22px 20px', display: 'flex', gap: 8 }}>
              <button onClick={() => setSelectedLog(null)}
                style={{ flex: 1, padding: 11, background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>취소</button>
              <button onClick={handleRestock} disabled={isRestocking}
                style={{ flex: 2, padding: 11, background: GREEN, color: '#fff', border: 'none', borderRadius: 10, cursor: isRestocking ? 'wait' : 'pointer', fontWeight: 700, fontSize: 14, opacity: isRestocking ? 0.7 : 1 }}>
                {isRestocking ? '처리 중...' : `${restockQty}개 재입고 확인`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 반려 모달 ── */}
      {rejectingRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: RED }}>출고 요청 반려</span>
              <button onClick={() => setRejectingRequest(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>
            <div style={{ padding: '16px 22px 0' }}>
              <div style={{ background: '#fef2f2', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid #fecaca', fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: TEXT, marginBottom: 4 }}>{rejectingRequest.inventory_items?.item_name ?? '-'}</div>
                <div style={{ color: GRAY }}>{getEngName(rejectingRequest.requester_id)} · {rejectingRequest.quantity}개 요청</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>반려 사유 <span style={{ color: RED }}>*</span></div>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="반려 사유를 입력해주세요" rows={3}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ padding: '0 22px 20px', display: 'flex', gap: 8 }}>
              <button onClick={() => setRejectingRequest(null)}
                style={{ flex: 1, padding: 11, background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>취소</button>
              <button onClick={handleReject} disabled={isProcessing || !rejectReason.trim()}
                style={{ flex: 2, padding: 11, background: RED, color: '#fff', border: 'none', borderRadius: 10, cursor: isProcessing ? 'wait' : 'pointer', fontWeight: 700, fontSize: 14, opacity: (isProcessing || !rejectReason.trim()) ? 0.6 : 1 }}>
                {isProcessing ? '처리 중...' : '반려 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
