'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
  requester_id: number | null
  quantity_out: number
  log_type: 'out' | 'in'
  is_restocked: boolean
  outlet_company: string | null
  reason: string | null
  note: string | null
  logged_at: string
  inventory_items?: { item_name: string | null; part_code: string | null } | null
}

type InventoryRequest = {
  request_id: number
  item_id: number
  requester_id: number
  quantity: number
  outlet_company: string | null
  reason: string | null
  note: string | null
  status: '대기중' | '승인' | '반려'
  reject_reason: string | null
  requested_at: string
  processed_at: string | null
  processed_by: number | null
  inventory_items?: { item_name: string | null; part_code: string | null; location: string | null } | null
}

type ExcelRow = Record<string, string | number | null>

// 엑셀 날짜 시리얼 → YYYY-MM-DD 변환 (예: 46161 → "2026-05-19")
const parseExcelDate = (val: string | number | null | undefined): string | null => {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') {
    const ms = Math.round((val - 25569) * 86400 * 1000)
    return new Date(ms).toISOString().split('T')[0]
  }
  return String(val).trim() || null
}

type ExcelResult = {
  partCode: string
  itemName: string | null
  qty: number
  success: boolean
  error?: string
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

function InventoryPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  // ── 데이터 ──
  const [items, setItems] = useState<InventoryItem[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [requests, setRequests] = useState<InventoryRequest[]>([])
  const [allEngineers, setAllEngineers] = useState<Engineer[]>([])
  const [currentEngineer, setCurrentEngineer] = useState<Engineer | null>(null)
  const [loading, setLoading] = useState(true)

  // ── UI ──
  const validTabs = ['items', 'logs', 'requests', 'approval'] as const
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'items' | 'logs' | 'requests' | 'approval'>(
    validTabs.includes(tabParam as typeof validTabs[number]) ? tabParam as typeof validTabs[number] : 'items'
  )
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('전체')

  // 출고 요청 모달
  const [requestItem, setRequestItem] = useState<InventoryItem | null>(null)
  const [requestQty, setRequestQty] = useState(1)
  const [requestOutletCompany, setRequestOutletCompany] = useState('')
  const [requestReason, setRequestReason] = useState('')
  const [requestNote, setRequestNote] = useState('')
  const [isSavingRequest, setIsSavingRequest] = useState(false)

  // 엑셀 일괄 처리
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [excelType, setExcelType] = useState<'out' | 'in'>('out')
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([])
  const [excelFileName, setExcelFileName] = useState('')
  const [excelResults, setExcelResults] = useState<ExcelResult[] | null>(null)
  const [isProcessingExcel, setIsProcessingExcel] = useState(false)

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
        .select('*, inventory_items(item_name, part_code)')
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
    if (!requestOutletCompany.trim()) { alert('출고 업체를 입력해주세요.'); return }
    if (!requestReason.trim()) { alert('출고 사유를 입력해주세요.'); return }
    setIsSavingRequest(true)
    try {
      const { error } = await supabase.from('inventory_requests').insert([{
        item_id: requestItem.item_id,
        requester_id: currentEngineer.engineer_id,
        quantity: requestQty,
        outlet_company: requestOutletCompany.trim(),
        reason: requestReason.trim(),
        note: requestNote.trim() || null,
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
            link: '/inventory?tab=approval',
            is_read: false,
            created_at: new Date().toISOString(),
          }))
        )
      }
      alert('출고 요청이 등록되었습니다.')
      setRequestItem(null); setRequestQty(1); setRequestOutletCompany(''); setRequestReason(''); setRequestNote('')
      await fetchAll()
    } catch (err) {
      alert((err as { message?: string })?.message || '요청 중 오류가 발생했습니다.')
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
      const { error: e1 } = await supabase.from('inventory_items')
        .update({ quantity: item.quantity - req.quantity })
        .eq('item_id', req.item_id)
      if (e1) throw e1

      const { error: e2 } = await supabase.from('inventory_requests').update({
        status: '승인',
        processed_at: new Date().toISOString(),
        processed_by: currentEngineer.engineer_id,
      }).eq('request_id', req.request_id)
      if (e2) throw e2

      const { error: e3 } = await supabase.from('inventory_logs').insert([{
        item_id: req.item_id,
        engineer_id: currentEngineer.engineer_id,
        requester_id: req.requester_id,
        quantity_out: req.quantity,
        log_type: 'out',
        outlet_company: req.outlet_company,
        reason: req.reason,
        logged_at: new Date().toISOString(),
      }])
      if (e3) throw e3

      await supabase.from('notifications').insert([{
        engineer_id: req.requester_id,
        title: '출고 요청 승인됨',
        message: `${req.inventory_items?.item_name ?? '품목'} ${req.quantity}개 출고 요청이 승인되었습니다`,
        type: 'stock_approved',
        link: '/inventory?tab=requests',
        is_read: false,
        created_at: new Date().toISOString(),
      }])

      alert('승인이 완료되었습니다.')
      await fetchAll()
    } catch (err) {
      alert((err as { message?: string })?.message || '승인 처리 중 오류가 발생했습니다.')
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
      const { error: e1 } = await supabase.from('inventory_requests').update({
        status: '반려',
        reject_reason: rejectReason.trim(),
        processed_at: new Date().toISOString(),
        processed_by: currentEngineer.engineer_id,
      }).eq('request_id', rejectingRequest.request_id)
      if (e1) throw e1

      await supabase.from('notifications').insert([{
        engineer_id: rejectingRequest.requester_id,
        title: '출고 요청 반려됨',
        message: `${rejectingRequest.inventory_items?.item_name ?? '품목'} ${rejectingRequest.quantity}개 출고 요청이 반려되었습니다. 사유: ${rejectReason.trim()}`,
        type: 'stock_rejected',
        link: '/inventory?tab=requests',
        is_read: false,
        created_at: new Date().toISOString(),
      }])

      alert('반려 처리되었습니다.')
      setRejectingRequest(null); setRejectReason('')
      await fetchAll()
    } catch (err) {
      alert((err as { message?: string })?.message || '반려 처리 중 오류가 발생했습니다.')
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
      const newQty = item.quantity + restockQty

      const { error: e1 } = await supabase.from('inventory_items').update({ quantity: newQty }).eq('item_id', selectedLog.item_id)
      if (e1) throw e1

      const { data: newLogData, error: e2 } = await supabase.from('inventory_logs').insert([{
        item_id: selectedLog.item_id,
        engineer_id: currentEngineer.engineer_id,
        quantity_out: restockQty,
        log_type: 'in',
        reason: restockReason.trim() || null,
        logged_at: new Date().toISOString(),
      }]).select('*, inventory_items(item_name, part_code)').single()
      if (e2) throw e2

      // 스키마 캐시 우회: rpc 사용
      const { error: e3 } = await supabase.rpc('mark_log_restocked', { p_log_id: selectedLog.log_id })
      if (e3) throw e3

      // fetchAll() 대신 로컬 state 직접 갱신 — fetchAll이 스키마 캐시 지연으로 is_restocked 값을 덮어쓰는 것을 방지
      setItems(prev => prev.map(i => i.item_id === selectedLog.item_id ? { ...i, quantity: newQty } : i))
      setLogs(prev => [
        newLogData as InventoryLog,
        ...prev.map(l => l.log_id === selectedLog.log_id ? { ...l, is_restocked: true } : l),
      ])

      alert('재입고가 완료되었습니다.')
      setSelectedLog(null); setRestockQty(1); setRestockReason('')
    } catch (err) {
      alert((err as { message?: string })?.message || '재입고 처리 중 오류가 발생했습니다.')
    } finally {
      setIsRestocking(false)
    }
  }

  // ── 엑셀 일괄 처리 ──
  const handleExcelFile = (file: File) => {
    import('xlsx').then((XLSX) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const workbook = XLSX.read(e.target?.result, { type: 'binary' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet)
        setExcelRows(rows)
        setExcelFileName(file.name)
        setExcelResults(null)
      }
      reader.readAsBinaryString(file)
    })
  }

  const handleProcessExcel = async () => {
    if (!currentEngineer || excelRows.length === 0) return
    setIsProcessingExcel(true)

    const { data: bulkData } = await supabase.from('bulk_uploads').insert({
      engineer_id: currentEngineer.engineer_id,
      upload_type: excelType,
      file_name: excelFileName,
      row_count: excelRows.length,
      success_count: 0,
      fail_count: 0,
    }).select().single()
    const bulkId = bulkData?.upload_id ?? null

    const { data: latestItems } = await supabase.from('inventory_items').select('*')
    const liveItems: InventoryItem[] = (latestItems as InventoryItem[]) ?? []

    const results: ExcelResult[] = []
    let successCount = 0

    for (const row of excelRows) {
      const partCode = String(row['부품코드'] ?? '').trim()
      const qty = Number(row['출고수량'] ?? row['입고수량'] ?? row['수량'] ?? 0)
      const outletCompany = String(row['출고업체'] ?? '').trim() || null
      const reason = String(row['사유'] ?? '').trim() || null
      const dept = String(row['부서명'] ?? '').trim() || null
      // 입고 전용 필드
      const poNo = excelType === 'in' ? (String(row['PO No.'] ?? row['PO번호'] ?? '').trim() || null) : null
      const lotNo = excelType === 'in' ? (String(row['제번'] ?? '').trim() || null) : null
      const location = excelType === 'in' ? (String(row['보관장소'] ?? '').trim() || null) : null
      const receivedDate = excelType === 'in' ? parseExcelDate(row['매입일자']) : null

      if (!partCode) { results.push({ partCode: '-', itemName: null, qty, success: false, error: '부품코드 없음' }); continue }
      const item = liveItems.find(i => i.part_code === partCode)
      if (!item) { results.push({ partCode, itemName: null, qty, success: false, error: '미등록 부품코드' }); continue }
      if (qty <= 0) { results.push({ partCode, itemName: item.item_name, qty, success: false, error: '수량 오류' }); continue }
      if (excelType === 'out' && item.quantity < qty) {
        results.push({ partCode, itemName: item.item_name, qty, success: false, error: `재고 부족 (현재 ${item.quantity}개)` }); continue
      }

      const newQty = excelType === 'out' ? item.quantity - qty : item.quantity + qty
      const updateFields: Record<string, unknown> = { quantity: newQty }
      if (excelType === 'in') {
        if (poNo) updateFields.po_no = poNo
        if (lotNo) updateFields.lot_no = lotNo
        if (location) updateFields.location = location
        if (receivedDate) updateFields.received_date = receivedDate
      }
      const { error: e1 } = await supabase.from('inventory_items').update(updateFields).eq('item_id', item.item_id)
      if (e1) { results.push({ partCode, itemName: item.item_name, qty, success: false, error: e1.message }); continue }

      const noteStr = excelType === 'in'
        ? [poNo ? `PO: ${poNo}` : '', lotNo ? `제번: ${lotNo}` : '', dept ? `부서: ${dept}` : ''].filter(Boolean).join(' / ') || null
        : dept ? `부서: ${dept}` : null

      const { error: e2 } = await supabase.from('inventory_logs').insert({
        item_id: item.item_id,
        engineer_id: currentEngineer.engineer_id,
        quantity_out: qty,
        log_type: excelType,
        outlet_company: outletCompany,
        reason: reason,
        note: noteStr,
        bulk_upload_id: bulkId,
        logged_at: new Date().toISOString(),
      })
      if (e2) {
        await supabase.from('inventory_items').update({ quantity: item.quantity }).eq('item_id', item.item_id)
        results.push({ partCode, itemName: item.item_name, qty, success: false, error: e2.message }); continue
      }

      const idx = liveItems.findIndex(i => i.item_id === item.item_id)
      if (idx !== -1) liveItems[idx] = { ...liveItems[idx], quantity: newQty }
      successCount++
      results.push({ partCode, itemName: item.item_name, qty, success: true })
    }

    if (bulkId) {
      await supabase.from('bulk_uploads').update({ success_count: successCount, fail_count: results.length - successCount }).eq('upload_id', bulkId)
    }

    setExcelResults(results)
    setIsProcessingExcel(false)
    await fetchAll()
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
              {isManager && (
                <button onClick={() => { setShowExcelModal(true); setExcelRows([]); setExcelResults(null); setExcelFileName('') }}
                  style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${BLUE}`, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#eff6ff', color: BLUE, whiteSpace: 'nowrap' }}>
                  📊 엑셀 일괄 처리
                </button>
              )}
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
                    {['일시', '구분', '품명', '부품코드', '신청자', '승인자', '수량', '출고 업체', '사유', ''].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: GRAY, fontWeight: 700, whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: GRAY }}>이력이 없습니다.</td></tr>
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
                          {log.requester_id ? getEngName(log.requester_id) : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: TEXT }}>
                          {log.engineer_id ? getEngName(log.engineer_id) : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 800, color: isIn ? GREEN : RED }}>{isIn ? '+' : '-'}{log.quantity_out}개</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: TEXT }}>{log.outlet_company ?? '-'}</td>
                        <td style={{ padding: '12px 14px', color: GRAY }}>{log.reason ?? '-'}</td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {!isIn && (
                            log.is_restocked
                              ? <span style={{ fontSize: 12, color: GRAY, fontWeight: 600 }}>재입고 완료</span>
                              : <button onClick={() => { setSelectedLog(log); setRestockQty(log.quantity_out); setRestockReason('') }}
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
              <button onClick={() => { setRequestItem(null); setRequestOutletCompany(''); setRequestReason(''); setRequestNote('') }} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: 15 }}>✕</button>
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

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                  출고 업체 <span style={{ color: RED }}>*</span>
                </div>
                <input value={requestOutletCompany} onChange={e => setRequestOutletCompany(e.target.value)}
                  placeholder="출고 업체명을 입력하세요"
                  style={{ ...inp, borderColor: requestOutletCompany.trim() ? BORDER : '#fca5a5' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                  출고 사유 <span style={{ color: RED }}>*</span>
                </div>
                <textarea value={requestReason} onChange={e => setRequestReason(e.target.value)}
                  placeholder="출고 사유 또는 사용처를 입력하세요" rows={3}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', borderColor: requestReason.trim() ? BORDER : '#fca5a5' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>비고 <span style={{ fontWeight: 400, color: GRAY }}>(선택)</span></div>
                <textarea value={requestNote} onChange={e => setRequestNote(e.target.value)}
                  placeholder="추가로 전달할 내용이 있으면 입력하세요" rows={2}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ padding: '0 22px 20px', display: 'flex', gap: 8 }}>
              <button onClick={() => { setRequestItem(null); setRequestOutletCompany(''); setRequestReason(''); setRequestNote('') }}
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

      {/* ── 엑셀 일괄 처리 모달 ── */}
      {showExcelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            {/* 헤더 */}
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>📊 엑셀 일괄 처리</span>
              <button onClick={() => setShowExcelModal(false)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

              {/* 처리 유형 선택 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 8 }}>처리 유형</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['out', 'in'] as const).map(t => (
                    <button key={t} onClick={() => { setExcelType(t); setExcelRows([]); setExcelResults(null); setExcelFileName('') }}
                      style={{ padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                        background: excelType === t ? (t === 'out' ? RED : GREEN) : '#f3f4f6',
                        color: excelType === t ? '#fff' : TEXT }}>
                      {t === 'out' ? '출고' : '입고'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 파일 업로드 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 8 }}>엑셀 파일 업로드</div>
                <label
                  onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                  onDragEnter={e => { e.preventDefault(); e.stopPropagation() }}
                  onDrop={e => {
                    e.preventDefault(); e.stopPropagation()
                    const file = e.dataTransfer.files[0]
                    if (file) handleExcelFile(file)
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '32px 20px', border: `2px dashed ${excelFileName ? BLUE : BORDER}`, borderRadius: 12,
                    background: excelFileName ? '#eff6ff' : '#fafafa', cursor: 'pointer', gap: 8,
                  }}>
                  <span style={{ fontSize: 28 }}>📁</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: excelFileName ? BLUE : GRAY }}>
                    {excelFileName || '엑셀 파일을 클릭하거나 드래그해서 업로드'}
                  </span>
                  <span style={{ fontSize: 12, color: GRAY }}>.xlsx / .xls 형식 지원</span>
                  <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) handleExcelFile(e.target.files[0]) }} />
                </label>
              </div>

              {/* 필드 안내 */}
              <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 12, color: GRAY }}>
                {excelType === 'out' ? (
                  <span><b style={{ color: TEXT }}>출고 엑셀 컬럼:</b> 재고번호 | <b style={{ color: BLUE }}>부품코드*</b> | 품명 | <b style={{ color: BLUE }}>출고수량*</b> | 출고업체 | 사유 | 부서명</span>
                ) : (
                  <span><b style={{ color: TEXT }}>입고 엑셀 컬럼:</b> 재고번호 | <b style={{ color: BLUE }}>부품코드*</b> | 품명 | PO No. | 제번 | <b style={{ color: BLUE }}>수량*</b> | 보관장소 | 매입일자 | 부서명</span>
                )}
                <span style={{ marginLeft: 8, color: RED }}>* 필수</span>
              </div>

              {/* 파싱 미리보기 */}
              {excelRows.length > 0 && !excelResults && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{excelRows.length}행 인식됨 — 미리보기</div>
                  <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {(excelType === 'out'
                            ? ['부품코드', '출고수량', '출고업체', '사유', '부서명']
                            : ['부품코드', '수량', '보관장소', 'PO No.', '제번', '매입일자', '부서명']
                          ).map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: GRAY, fontWeight: 700, whiteSpace: 'nowrap', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {excelRows.slice(0, 10).map((row, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid #f3f4f6` }}>
                            <td style={{ padding: '7px 12px', fontWeight: 700, color: BLUE }}>{String(row['부품코드'] ?? '-')}</td>
                            {excelType === 'out' ? (
                              <>
                                <td style={{ padding: '7px 12px' }}>{String(row['출고수량'] ?? '-')}</td>
                                <td style={{ padding: '7px 12px', color: GRAY }}>{String(row['출고업체'] ?? '-')}</td>
                                <td style={{ padding: '7px 12px', color: GRAY }}>{String(row['사유'] ?? '-')}</td>
                                <td style={{ padding: '7px 12px', color: GRAY }}>{String(row['부서명'] ?? '-')}</td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '7px 12px', fontWeight: 700 }}>{String(row['수량'] ?? '-')}</td>
                                <td style={{ padding: '7px 12px', color: GRAY }}>{String(row['보관장소'] ?? '-')}</td>
                                <td style={{ padding: '7px 12px', color: GRAY }}>{String(row['PO No.'] ?? row['PO번호'] ?? '-')}</td>
                                <td style={{ padding: '7px 12px', color: GRAY }}>{String(row['제번'] ?? '-')}</td>
                                <td style={{ padding: '7px 12px', color: GRAY }}>{parseExcelDate(row['매입일자']) ?? '-'}</td>
                                <td style={{ padding: '7px 12px', color: GRAY }}>{String(row['부서명'] ?? '-')}</td>
                              </>
                            )}
                          </tr>
                        ))}
                        {excelRows.length > 10 && (
                          <tr><td colSpan={excelType === 'out' ? 5 : 7} style={{ padding: '6px 12px', color: GRAY, textAlign: 'center', fontSize: 11 }}>... 외 {excelRows.length - 10}행</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 처리 결과 */}
              {excelResults && (
                <div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1, padding: '12px 16px', background: '#dcfce7', borderRadius: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: GREEN }}>{excelResults.filter(r => r.success).length}</div>
                      <div style={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>성공</div>
                    </div>
                    <div style={{ flex: 1, padding: '12px 16px', background: '#fee2e2', borderRadius: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: RED }}>{excelResults.filter(r => !r.success).length}</div>
                      <div style={{ fontSize: 12, color: RED, fontWeight: 700 }}>실패</div>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${BORDER}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['부품코드', '품명', '수량', '결과'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: GRAY, fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {excelResults.map((r, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid #f3f4f6`, background: r.success ? '#f0fdf4' : '#fff' }}>
                            <td style={{ padding: '7px 12px', fontWeight: 700, color: BLUE }}>{r.partCode}</td>
                            <td style={{ padding: '7px 12px', color: TEXT }}>{r.itemName ?? '-'}</td>
                            <td style={{ padding: '7px 12px' }}>{r.qty}</td>
                            <td style={{ padding: '7px 12px' }}>
                              {r.success
                                ? <span style={{ color: GREEN, fontWeight: 700 }}>✓ 완료</span>
                                : <span style={{ color: RED, fontWeight: 700 }}>✗ {r.error}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setShowExcelModal(false)}
                style={{ flex: 1, padding: 11, background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                {excelResults ? '닫기' : '취소'}
              </button>
              {!excelResults && (
                <button onClick={handleProcessExcel}
                  disabled={isProcessingExcel || excelRows.length === 0}
                  style={{ flex: 2, padding: 11, background: excelType === 'out' ? RED : GREEN, color: '#fff', border: 'none', borderRadius: 10, cursor: (isProcessingExcel || excelRows.length === 0) ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: (isProcessingExcel || excelRows.length === 0) ? 0.6 : 1 }}>
                  {isProcessingExcel ? '처리 중...' : `${excelRows.length}행 ${excelType === 'out' ? '출고' : '입고'} 처리`}
                </button>
              )}
              {excelResults && excelResults.some(r => !r.success) && (
                <button onClick={() => { setExcelRows([]); setExcelResults(null); setExcelFileName('') }}
                  style={{ flex: 2, padding: 11, background: BLUE, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                  다시 업로드
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <InventoryPage />
    </Suspense>
  )
}
