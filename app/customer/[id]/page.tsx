//고객 상세 페이지
'use client'
import { Document, Page, Text, View, StyleSheet, Image, Font, pdf } from '@react-pdf/renderer'
import { useEffect, useMemo, useState, useCallback, useRef, type CSSProperties } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { loadKakaoMap } from '@/lib/loadKakaoMap'
import { createClient } from '@/lib/supabase/client'

type Customer = {
  customer_id: number
  company_name: string | null
  address: string | null
  status: string | null
  agency: string | null
}

type Device = {
  device_id: number
  customer_id: number
  device_name: string | null
  device_name2: string | null
  option: string | null
  serial_number: string | null
  packing_list_url: string | null
  install_date: string | null
  install_year: string | number | null
  program: string | null
  image_url: string | null
  category: string | null
}

type Contact = {
  contact_id: number
  customer_id: number
  name: string | null
  department: string | null
  position: string | null
  phone: string | null
}

type ServiceHistory = {
  service_id: number
  customer_id: number
  device_id: number | null
  visit_year: string | null
  visit_date: string | null
  service_notes: string | null
  visitor: string | null
  service_type: string | null
  contact_id: number | null
  is_paid: boolean | null
  work_hours: number | null
  service_engineers?: { engineer_id: number; engineers: { name: string; position: string | null } }[]
}

type Engineer = {
  engineer_id: number
  name: string
  position: string | null
}

type Quote = {
  quote_id: number
  quote_number: string
  quote_date: string
  total_supply: number
  total_amount: number
  total_cost: number | null
  total_profit: number | null
  profit_rate: number | null
  status: string
  subject: string | null
  recipient: string | null
  order_date: string | null
  revenue_date: string | null
  engineers?: { name: string; position: string | null }
  quote_items?: { product_name: string | null; price_list?: { model_jp: string | null } | null }[]
}

const PAGE_BG = '#f4f5f7'
const PANEL_BG = '#ffffff'
const CARD_BG = '#f9fafb'
const INNER_CARD_BG = '#f1f3f5'
const INPUT_BG = '#ffffff'
const INPUT_BORDER = '#e2e4e9'
const TEXT_PRIMARY = '#111113'
const TEXT_SECONDARY = '#4b5563'
const TEXT_MUTED = '#9ca3af'
const WHITE_BUTTON_BG = '#234ea2'
const WHITE_BUTTON_TEXT = '#ffffff'
const DANGER_BG = '#dc2626'

const STATUS_COLORS: Record<string, string> = {
  '견적중': '#f59e0b',
  '수주': '#3b82f6',
  '매출완료': '#16a34a',
  '실패': '#dc2626',
  '보류': '#9ca3af',
}

const numKR = (n: number) => Math.round(n).toLocaleString('ko-KR')

const inputStyle: CSSProperties = {
  width: '100%', padding: 12, border: `1px solid ${INPUT_BORDER}`, borderRadius: 10,
  boxSizing: 'border-box', color: TEXT_PRIMARY, background: INPUT_BG, outline: 'none',
}

const dateInputStyle: CSSProperties = {
  width: '100%', padding: 12, border: `1px solid ${INPUT_BORDER}`, borderRadius: 10,
  boxSizing: 'border-box', color: '#111113', background: '#ffffff', outline: 'none', colorScheme: 'light',
}

const textareaStyle: CSSProperties = {
  width: '100%', padding: 12, border: `1px solid ${INPUT_BORDER}`, borderRadius: 10,
  resize: 'vertical', color: TEXT_PRIMARY, boxSizing: 'border-box', lineHeight: 1.5,
  background: INPUT_BG, outline: 'none',
}

function getInstallDisplay(device: Device) {
  const rawYear = device.install_year?.toString().trim() || ''
  const rawDate = device.install_date?.toString().trim() || ''
  if (!rawDate && !rawYear) return '-'
  if (rawYear && rawDate) {
    if (rawDate.startsWith(rawYear)) return rawDate
    return `${rawYear} - ${rawDate}`
  }
  if (rawDate) return rawDate
  return rawYear
}

export default function CustomerDetailPage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const customerId = Number(params.id)

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [history, setHistory] = useState<ServiceHistory[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false)
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false)
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false)
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false)
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false)
  const [isEditDeviceModalOpen, setIsEditDeviceModalOpen] = useState(false)
  const [isDeviceImageModalOpen, setIsDeviceImageModalOpen] = useState(false)
  const [isQuoteHistoryModalOpen, setIsQuoteHistoryModalOpen] = useState(false)

  const [isSavingService, setIsSavingService] = useState(false)
  const [isSavingServiceEdit, setIsSavingServiceEdit] = useState(false)
  const [isSavingCustomerEdit, setIsSavingCustomerEdit] = useState(false)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [isSavingDevice, setIsSavingDevice] = useState(false)
  const [isSavingContactEdit, setIsSavingContactEdit] = useState(false)
  const [isSavingDeviceEdit, setIsSavingDeviceEdit] = useState(false)
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false)
  const [isSavingDeviceImage, setIsSavingDeviceImage] = useState(false)
  const [isSignModalOpen, setIsSignModalOpen] = useState(false)
  const [signStep, setSignStep] = useState(1)
  const [pendingReportService, setPendingReportService] = useState<ServiceHistory | null>(null)
  const [pendingReportDevice, setPendingReportDevice] = useState<Device | null>(null)
  const engineerSignRef = useRef<HTMLCanvasElement>(null)
  const customerSignRef = useRef<HTMLCanvasElement>(null)
  const [engineerSigning, setEngineerSigning] = useState(false)
  const [customerSigning, setCustomerSigning] = useState(false)

  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [selectedService, setSelectedService] = useState<ServiceHistory | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [selectedImageDevice, setSelectedImageDevice] = useState<Device | null>(null)
  const [deviceImageFile, setDeviceImageFile] = useState<File | null>(null)
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [selectedEngineerIds, setSelectedEngineerIds] = useState<number[]>([])
  const [selectedEditEngineerIds, setSelectedEditEngineerIds] = useState<number[]>([])
  const [currentUserEngineerId, setCurrentUserEngineerId] = useState<number | null>(null)
  const [showExtraEngineers, setShowExtraEngineers] = useState(false)
  const [showExtraEngineersEdit, setShowExtraEngineersEdit] = useState(false)

  const [serviceForm, setServiceForm] = useState({ visit_date: '', service_notes: '', visitor: '', service_type: '신규설치', contact_id: null as number | null, is_paid: true, work_hours: '2' })
  const [serviceEditForm, setServiceEditForm] = useState({ visit_date: '', service_notes: '', visitor: '', service_type: '신규설치', contact_id: null as number | null, is_paid: true, work_hours: '2' })
  const [customerEditForm, setCustomerEditForm] = useState({ company_name: '', address: '', agency: '', status: '활성' })
  const [contactForm, setContactForm] = useState({ name: '', department: '', position: '', phone: '' })
  const [contactEditForm, setContactEditForm] = useState({ name: '', department: '', position: '', phone: '' })
 const [deviceForm, setDeviceForm] = useState({ device_name: '', device_name2: '', option: '', serial_number: '', program: 'ACCTee', install_date: '', category: '20' })
  const [deviceEditForm, setDeviceEditForm] = useState({ device_name: '', device_name2: '', option: '', serial_number: '', program: 'ACCTee', install_date: '', category: '20' })

  const fetchDetail = async () => {
    setLoading(true)
    const [
      { data: customerData }, { data: devicesData }, { data: contactsData },
      { data: historyData }, { data: engineersData }, { data: quotesData },
    ] = await Promise.all([
      supabase.from('customers').select('*').eq('customer_id', customerId).single(),
      supabase.from('devices').select('*').eq('customer_id', customerId).order('device_id', { ascending: true }),
      supabase.from('contacts').select('*').eq('customer_id', customerId).order('contact_id', { ascending: true }),
      supabase.from('service_history').select('*, service_engineers(engineer_id, engineers(name, position))').eq('customer_id', customerId).order('service_id', { ascending: false }),
      supabase.from('engineers').select('*, email').order('engineer_id', { ascending: true }),
      // ── quote_items 포함 조회 ──
      supabase.from('quotes').select('*, engineers(name, position), quote_items(product_name, price_list(model_jp))').eq('customer_id', customerId).order('quote_date', { ascending: false }),
    ])
    
    setCustomer(customerData ?? null)
    setDevices(devicesData ?? [])
    setContacts(contactsData ?? [])
    setHistory(historyData ?? [])
    setEngineers(engineersData ?? [])
    setQuotes((quotesData as Quote[]) ?? [])
    const { data: { user } } = await supabase.auth.getUser()
    if (user && engineersData) {
      const me = (engineersData as any[]).find(e => e.email === user.email)
      if (me) setCurrentUserEngineerId(me.engineer_id)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!customerId || Number.isNaN(customerId)) return
    fetchDetail()
  }, [customerId])

  const geocodeAddress = async (address: string) => {
    const kakao = await loadKakaoMap()
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (!kakao.maps.services) { reject(new Error('Kakao Maps services 라이브러리가 로드되지 않았습니다.')); return }
      const geocoder = new kakao.maps.services.Geocoder()
      geocoder.addressSearch(address, (result: any[], status: string) => {
        if (status !== kakao.maps.services.Status.OK || !result[0]) { reject(new Error('주소 좌표 변환 실패')); return }
        resolve({ latitude: Number(result[0].y), longitude: Number(result[0].x) })
      })
    })
  }

  const handleOpenServiceModal = (deviceId: number) => {
    setSelectedDeviceId(deviceId)
   const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setServiceForm({ visit_date: todayStr, service_notes: '', visitor: '', service_type: '신규설치', contact_id: null, is_paid: true, work_hours: '2' })
    setSelectedEngineerIds(currentUserEngineerId ? [currentUserEngineerId] : [])
    setShowExtraEngineers(false)
    setIsServiceModalOpen(true)
  }

  const handleAddService = async () => {
    if (!selectedDeviceId) { alert('장비를 먼저 선택해주세요.'); return }
    if (!serviceForm.visit_date.trim()) { alert('방문일자를 입력해주세요.'); return }
    if (!serviceForm.service_notes.trim()) { alert('서비스 내용을 입력해주세요.'); return }
    if (!serviceForm.contact_id) { alert('고객 담당자를 선택해주세요.'); return }
    if (selectedEngineerIds.length === 0) { alert('방문 엔지니어를 선택해주세요.'); return }
    const visitYear = serviceForm.visit_date.slice(0, 4)
    setIsSavingService(true)
    const { data: newService, error } = await supabase.from('service_history').insert([{
      customer_id: customerId, device_id: selectedDeviceId, visit_year: visitYear,
      visit_date: serviceForm.visit_date.trim(), service_notes: serviceForm.service_notes.trim(),
      visitor: serviceForm.visitor.trim() || null, service_type: serviceForm.service_type,
      contact_id: serviceForm.contact_id || null,
      is_paid: serviceForm.is_paid,
      work_hours: serviceForm.work_hours ? parseFloat(serviceForm.work_hours) : null,
    }]).select().single()
    if (error) { setIsSavingService(false); alert(error.message || '서비스 기록 저장 중 오류가 발생했습니다.'); return }
    const engineerRows = selectedEngineerIds.map((eid) => ({ service_id: newService.service_id, engineer_id: eid }))
    const { error: engineerError } = await supabase.from('service_engineers').insert(engineerRows)
    setIsSavingService(false)
    if (engineerError) { alert(engineerError.message || '엔지니어 연결 저장 중 오류가 발생했습니다.'); return }
    alert('서비스 기록이 추가되었습니다.')
 setServiceForm({ visit_date: '', service_notes: '', visitor: '', service_type: '신규설치', contact_id: null, is_paid: true, work_hours: '2' })
 setSelectedEngineerIds(currentUserEngineerId ? [currentUserEngineerId] : [])
    setShowExtraEngineers(false)
    setIsServiceModalOpen(true)
    setSelectedDeviceId(null)
    await fetchDetail()
  }

const handleOpenEditServiceModal = (service: ServiceHistory) => {
    setSelectedService(service)
    setServiceEditForm({ visit_date: service.visit_date ?? '', service_notes: service.service_notes ?? '', visitor: service.visitor ?? '', service_type: service.service_type ?? '신규SETUP', contact_id: service.contact_id ?? null, is_paid: service.is_paid ?? true, work_hours: service.work_hours ? String(service.work_hours) : '' })
    setSelectedEditEngineerIds((service.service_engineers ?? []).map((se) => se.engineer_id))
    setShowExtraEngineersEdit(false)
    setIsEditServiceModalOpen(true)
  }

  const handleUpdateService = async () => {
    if (!selectedService) return
if (!serviceEditForm.visit_date.trim()) { alert('방문일자를 입력해주세요.'); return }
    if (!serviceEditForm.service_notes.trim()) { alert('서비스 내용을 입력해주세요.'); return }
    if (!serviceEditForm.contact_id) { alert('고객 담당자를 선택해주세요.'); return }
    if (selectedEditEngineerIds.length === 0) { alert('방문 엔지니어를 선택해주세요.'); return }
    const visitYear = serviceEditForm.visit_date.slice(0, 4)
    setIsSavingServiceEdit(true)
 const { error } = await supabase.from('service_history').update({
      visit_year: visitYear, visit_date: serviceEditForm.visit_date.trim(),
      service_notes: serviceEditForm.service_notes.trim(), visitor: serviceEditForm.visitor.trim() || null,
      service_type: serviceEditForm.service_type,
      contact_id: serviceEditForm.contact_id || null,
      is_paid: serviceEditForm.is_paid,
      work_hours: serviceEditForm.work_hours ? parseFloat(serviceEditForm.work_hours) : null,
    }).eq('service_id', selectedService.service_id)
    if (error) { setIsSavingServiceEdit(false); alert(error.message || '서비스 기록 수정 중 오류가 발생했습니다.'); return }
    await supabase.from('service_engineers').delete().eq('service_id', selectedService.service_id)
    await supabase.from('service_engineers').insert(selectedEditEngineerIds.map((eid) => ({ service_id: selectedService.service_id, engineer_id: eid })))
    setIsSavingServiceEdit(false)
    alert('서비스 기록이 수정되었습니다.')
    setIsEditServiceModalOpen(false)
    setSelectedService(null)
    setSelectedEditEngineerIds([])
    await fetchDetail()
  }

  const handleDeleteService = async () => {
    if (!selectedService) return
    const ok = confirm('이 서비스 기록을 삭제하시겠습니까?')
    if (!ok) return
    setIsSavingServiceEdit(true)
    const { error } = await supabase.from('service_history').delete().eq('service_id', selectedService.service_id)
    setIsSavingServiceEdit(false)
    if (error) { alert(error.message || '서비스 기록 삭제 중 오류가 발생했습니다.'); return }
    alert('서비스 기록이 삭제되었습니다.')
    setIsEditServiceModalOpen(false)
    setSelectedService(null)
    await fetchDetail()
  }

  const handlePrintReport = useCallback(async (service: ServiceHistory, device: Device, engineerSignDataUrl?: string, customerSignDataUrl?: string) => {
    const contact = contacts.find(c => c.contact_id === service.contact_id) ?? null
    const engineerNames = (service.service_engineers ?? []).map(se => `${se.engineers.name} ${se.engineers.position ?? ''}`.trim()).join(', ')
    const deviceTitle = `${device.device_name ?? ''} ${device.device_name2 ?? ''} ${device.option ?? ''}`.replace(/\s+/g, ' ').trim()

    Font.register({
      family: 'NotoSansCJK',
      src: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf',
    })

    const RS = StyleSheet.create({
      page: { fontFamily: 'NotoSansCJK', fontSize: 9, padding: 30, backgroundColor: '#fff' },
      title: { fontSize: 18, fontFamily: 'NotoSansCJK', textAlign: 'center', marginBottom: 2 },
      subtitle: { fontSize: 9, textAlign: 'center', color: '#666', marginBottom: 12 },
      table: { borderWidth: 1, borderColor: '#000' },
      row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#999' },
      cell: { padding: '4 6', borderRightWidth: 0.5, borderRightColor: '#999', justifyContent: 'center' },
      label: { fontSize: 8, color: '#444', fontFamily: 'NotoSansCJK' },
      value: { fontSize: 9, fontFamily: 'NotoSansCJK' },
      sectionTitle: { backgroundColor: '#f0f0f0', padding: '5 6', fontSize: 9, fontFamily: 'NotoSansCJK', textAlign: 'center', borderBottomWidth: 0.5, borderBottomColor: '#999' },
      contentBox: { minHeight: 80, padding: 10 },
      footer: { textAlign: 'center', fontSize: 9, marginTop: 10, color: '#333', fontFamily: 'NotoSansCJK' },
    })

    const ReportDoc = () => (
      <Document>
        <Page size="A4" style={RS.page}>
          <View style={{ borderWidth: 1.5, borderColor: '#000' }}>

            {/* ── 헤더 ── */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '8 12', borderBottomWidth: 1.5, borderBottomColor: '#000' }}>
              <View style={{ flex: 1 }} />
              <View style={{ flex: 2, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontFamily: 'NotoSansCJK', fontWeight: 'bold', letterSpacing: 3 }}>AFTER  SERVICE</Text>
                <Text style={{ fontSize: 8, color: '#555', fontFamily: 'NotoSansCJK', marginTop: 2 }}>(http://www.accretechkorea.com)</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Image src="/quotelogo.png" style={{ width: 110, height: 26 }} />
              </View>
            </View>

            {/* ── 사용자 섹션 ── */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000', minHeight: 120 }}>

              {/* 사용자 라벨 */}
              <View style={{ width: 22, borderRightWidth: 1, borderRightColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK', textAlign: 'center' }}>{'사\n용\n자'}</Text>
              </View>

              {/* 고객사/날짜/담당자/방문부서/연락처 */}
              <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#000' }}>
                {/* 고객사 */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#999', height: 48, alignItems: 'center' }}>
                  <View style={{ width: 55, borderRightWidth: 0.5, borderRightColor: '#999', height: '100%', justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>고객사</Text>
                  </View>
               <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK', textAlign: 'center' }}>{customer?.company_name ?? '-'}</Text>
                  </View>
                </View>
                {/* 날짜 */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#999', height: 24, alignItems: 'center' }}>
                  <View style={{ width: 55, borderRightWidth: 0.5, borderRightColor: '#999', height: '100%', justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>날짜</Text>
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>{service.visit_date ?? '-'}</Text>
                  </View>
                </View>
                {/* 담당자 */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#999', height: 24, alignItems: 'center' }}>
                  <View style={{ width: 55, borderRightWidth: 0.5, borderRightColor: '#999', height: '100%', justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>담당자</Text>
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>{contact ? `${contact.name ?? ''} ${contact.position ?? ''}`.trim() : '-'}</Text>
                  </View>
                </View>
                {/* 방문부서 */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#999', height: 24, alignItems: 'center' }}>
                  <View style={{ width: 55, borderRightWidth: 0.5, borderRightColor: '#999', height: '100%', justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>방문부서</Text>
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>{contact?.department ?? '-'}</Text>
                  </View>
                </View>
                {/* 연락처 */}
                <View style={{ flexDirection: 'row', height: 24, alignItems: 'center' }}>
                  <View style={{ width: 55, borderRightWidth: 0.5, borderRightColor: '#999', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>연락처</Text>
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>{contact?.phone ?? '-'}</Text>
                  </View>
                </View>
              </View>

              {/* 서명 섹션 */}
              <View style={{ width: 180 }}>
                {/* 고객 서명 — 고객사+날짜 높이(72) */}
                <View style={{ height: 72, borderBottomWidth: 0.5, borderBottomColor: '#999', flexDirection: 'row' }}>
                 <View style={{ width: 28, borderRightWidth: 0.5, borderRightColor: '#999', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 8, fontFamily: 'NotoSansCJK', textAlign: 'center' }}>{'고\n객'}</Text>
                  </View>
                  <View style={{ flex: 1, borderRightWidth: 0.5, borderRightColor: '#999', justifyContent: 'center', alignItems: 'center' }}>
                    {customerSignDataUrl ? <Image src={customerSignDataUrl} style={{ width: 80, height: 40, objectFit: 'contain' }} /> : null}
                  </View>
                  <View style={{ width: 36, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 8, fontFamily: 'NotoSansCJK', textAlign: 'center' }}>{'서\n명'}</Text>
                  </View>
                </View>
                {/* 담당 서명 — 담당자+방문부서+연락처 높이(72) */}
                <View style={{ height: 72, flexDirection: 'row' }}>
                <View style={{ width: 28, borderRightWidth: 0.5, borderRightColor: '#999', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 8, fontFamily: 'NotoSansCJK', textAlign: 'center' }}>{'담\n당'}</Text>
                  </View>
                  <View style={{ flex: 1, borderRightWidth: 0.5, borderRightColor: '#999', justifyContent: 'center', alignItems: 'center' }}>
                    {engineerSignDataUrl ? <Image src={engineerSignDataUrl} style={{ width: 80, height: 40, objectFit: 'contain' }} /> : null}
                  </View>
                  <View style={{ width: 36, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 8, fontFamily: 'NotoSansCJK', textAlign: 'center' }}>{'서\n명'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── 엔지니어/장비 섹션 — 좌우 50:50 ── */}
            {[
              { label: '엔지니어 이름', value: engineerNames, label2: '사업부', value2: '계측' },
              { label: '장비종류', value: device.device_name ?? '-', label2: '유/무상', value2: service.is_paid ? '유상' : '무상' },
              { label: '장비명', value: `${device.device_name2 ?? ''} ${device.option ?? ''}`.trim() || '-', label2: '대리점', value2: customer?.agency ?? '-' },
              { label: 'SER.NO', value: device.serial_number ?? '-', label2: 'OS Ver.', value2: device.program ?? '-' },
              { label: '작업유형', value: service.service_type ?? '-', label2: '작업시간', value2: service.work_hours ? `${service.work_hours}h` : '-' },
            ].map(({ label, value, label2, value2 }, i, arr) => (
              <View key={i} style={{ flexDirection: 'row', borderBottomWidth: i < arr.length - 1 ? 0.5 : 1, borderBottomColor: i < arr.length - 1 ? '#999' : '#000', height: 22, alignItems: 'center' }}>
                {/* 왼쪽 50% */}
                <View style={{ flex: 1, flexDirection: 'row', borderRightWidth: 0.5, borderRightColor: '#999', height: '100%', alignItems: 'center' }}>
                  <View style={{ width: 70, borderRightWidth: 0.5, borderRightColor: '#999', height: '100%', justifyContent: 'center', paddingLeft: 4 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' , textAlign: 'center'}}>{label}</Text>
                  </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK', textAlign: 'center' }}>{value}</Text>
                  </View>
                </View>
                {/* 오른쪽 50% */}
                <View style={{ flex: 1, flexDirection: 'row', height: '100%', alignItems: 'center' }}>
                  <View style={{ width: 70, borderRightWidth: 0.5, borderRightColor: '#999', height: '100%', justifyContent: 'center', paddingLeft: 4 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK', fontWeight: 'bold' ,textAlign: 'center'}}>{label2}</Text>
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK', textAlign: 'center' }}>{value2}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* ── A/S 내용 ── */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#000' }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#555', padding: '4 0', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>A/S 및 납입 내용</Text>
              </View>
              <View style={{ minHeight: 260, padding: '8 10' }}>
                <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK', lineHeight: 1.6 }}>{service.service_notes ?? ''}</Text>
              </View>
            </View>

            {/* ── 기타사항 ── */}
            <View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#555', padding: '4 0', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontFamily: 'NotoSansCJK' }}>기타사항</Text>
              </View>
              <View style={{ minHeight: 60, padding: '8 10' }}>
              </View>
            </View>

          </View>

          {/* 하단 회사명 */}
          <Text style={{ textAlign: 'center', fontSize: 10, marginTop: 8, fontFamily: 'NotoSansCJK', fontWeight: 'bold' }}>ACCRETECHKOREA Co., Ltd.</Text>
        </Page>
      </Document>
    )

    const blob = await pdf(<ReportDoc />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = service.visit_date?.replace(/-/g, '') ?? 'unknown'
    a.download = `${dateStr}_${customer?.company_name ?? ''}_서비스레포트.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }, [contacts, customer, engineers])

  const handleOpenEditCustomerModal = () => {
    setCustomerEditForm({ company_name: customer?.company_name ?? '', address: customer?.address ?? '', agency: customer?.agency ?? '', status: customer?.status ?? '활성' })
    setIsEditCustomerModalOpen(true)
  }

  const handleUpdateCustomer = async () => {
    if (!customer) return
    if (!customerEditForm.company_name.trim()) { alert('업체명을 입력해주세요.'); return }
    if (!customerEditForm.address.trim()) { alert('주소를 입력해주세요.'); return }
    setIsSavingCustomerEdit(true)
    try {
      const coords = await geocodeAddress(customerEditForm.address.trim())
      const { error } = await supabase.from('customers').update({
        company_name: customerEditForm.company_name.trim(), address: customerEditForm.address.trim(),
        agency: customerEditForm.agency.trim() || null, status: customerEditForm.status,
        latitude: coords.latitude, longitude: coords.longitude,
      }).eq('customer_id', customer.customer_id)
      setIsSavingCustomerEdit(false)
      if (error) { alert(error.message || '업체 정보 수정 중 오류가 발생했습니다.'); return }
      alert('업체 정보가 수정되었습니다.')
      setIsEditCustomerModalOpen(false)
      await fetchDetail()
    } catch (error: any) {
      setIsSavingCustomerEdit(false)
      alert(error?.message || '업체 정보 수정 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteCustomer = async () => {
    if (!customer) return
    const ok = confirm('이 업체를 삭제하시겠습니까?\n관련 담당자, 장비, 서비스기록도 모두 삭제됩니다.')
    if (!ok) return
    setIsDeletingCustomer(true)
    try {
      await supabase.from('service_history').delete().eq('customer_id', customer.customer_id)
      await supabase.from('contacts').delete().eq('customer_id', customer.customer_id)
      await supabase.from('devices').delete().eq('customer_id', customer.customer_id)
      const { error } = await supabase.from('customers').delete().eq('customer_id', customer.customer_id)
      if (error) throw error
      alert('업체 및 관련 데이터가 삭제되었습니다.')
      setIsEditCustomerModalOpen(false)
      router.push('/')
    } catch (error: any) {
      alert(error?.message || '업체 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeletingCustomer(false)
    }
  }

  const handleOpenAddContactModal = () => { setContactForm({ name: '', department: '', position: '', phone: '' }); setIsAddContactModalOpen(true) }

  const handleAddContact = async () => {
    if (!contactForm.name.trim()) { alert('이름을 입력해주세요.'); return }
    setIsSavingContact(true)
    const { error } = await supabase.from('contacts').insert([{ customer_id: customerId, name: contactForm.name.trim(), department: contactForm.department.trim() || null, position: contactForm.position.trim() || null, phone: contactForm.phone.trim() || null }])
    setIsSavingContact(false)
    if (error) { alert(error.message || '담당자 추가 중 오류가 발생했습니다.'); return }
    alert('담당자가 추가되었습니다.')
    setIsAddContactModalOpen(false)
    await fetchDetail()
  }

  const handleOpenEditContactModal = (contact: Contact) => {
    setSelectedContact(contact)
    setContactEditForm({ name: contact.name ?? '', department: contact.department ?? '', position: contact.position ?? '', phone: contact.phone ?? '' })
    setIsEditContactModalOpen(true)
  }

  const handleUpdateContact = async () => {
    if (!selectedContact) return
    if (!contactEditForm.name.trim()) { alert('이름을 입력해주세요.'); return }
    setIsSavingContactEdit(true)
    const { error } = await supabase.from('contacts').update({ name: contactEditForm.name.trim(), department: contactEditForm.department.trim() || null, position: contactEditForm.position.trim() || null, phone: contactEditForm.phone.trim() || null }).eq('contact_id', selectedContact.contact_id)
    setIsSavingContactEdit(false)
    if (error) { alert(error.message || '담당자 수정 중 오류가 발생했습니다.'); return }
    alert('담당자 정보가 수정되었습니다.')
    setIsEditContactModalOpen(false)
    setSelectedContact(null)
    await fetchDetail()
  }

  const handleDeleteContact = async () => {
    if (!selectedContact) return
    const ok = confirm('이 담당자를 삭제하시겠습니까?')
    if (!ok) return
    setIsSavingContactEdit(true)
    const { error } = await supabase.from('contacts').delete().eq('contact_id', selectedContact.contact_id)
    setIsSavingContactEdit(false)
    if (error) { alert(error.message || '담당자 삭제 중 오류가 발생했습니다.'); return }
    alert('담당자가 삭제되었습니다.')
    setIsEditContactModalOpen(false)
    setSelectedContact(null)
    await fetchDetail()
  }

  const handleOpenAddDeviceModal = () => { setDeviceForm({ device_name: '', device_name2: '', option: '', serial_number: '', program: 'ACCTee', install_date: '', install_engineer: '', category: '20' }); setIsAddDeviceModalOpen(true) }

  const handleAddDevice = async () => {
    if (!deviceForm.device_name.trim()) { alert('장비 라인업을 입력해주세요.'); return }
    setIsSavingDevice(true)
    const { error } = await supabase.from('devices').insert([{ customer_id: customerId, device_name: deviceForm.device_name.trim(), device_name2: deviceForm.device_name2.trim() || null, option: deviceForm.option.trim() || null, serial_number: deviceForm.serial_number.trim() || null, program: deviceForm.program, install_date: deviceForm.install_date || null, install_year: null,  category: deviceForm.category }])
    setIsSavingDevice(false)
    if (error) { alert(error.message || '장비 추가 중 오류가 발생했습니다.'); return }
    alert('장비가 추가되었습니다.')
    setIsAddDeviceModalOpen(false)
    await fetchDetail()
  }

  const handleOpenEditDeviceModal = (device: Device) => {
    setSelectedDevice(device)
    setDeviceEditForm({ device_name: device.device_name ?? '', device_name2: device.device_name2 ?? '', option: device.option ?? '', serial_number: device.serial_number ?? '', program: device.program ?? 'ACCTee', install_date: device.install_date ?? '', install_engineer: device.install_engineer ?? '', category: device.category ?? '20' })
    setIsEditDeviceModalOpen(true)
  }

  const handleUpdateDevice = async () => {
    if (!selectedDevice) return
    if (!deviceEditForm.device_name.trim()) { alert('장비 라인업을 입력해주세요.'); return }
    setIsSavingDeviceEdit(true)
    const { error } = await supabase.from('devices').update({ device_name: deviceEditForm.device_name.trim(), device_name2: deviceEditForm.device_name2.trim() || null, option: deviceEditForm.option.trim() || null, serial_number: deviceEditForm.serial_number.trim() || null, program: deviceEditForm.program, install_date: deviceEditForm.install_date || null, install_year: null,  category: deviceEditForm.category }).eq('device_id', selectedDevice.device_id)
    setIsSavingDeviceEdit(false)
    if (error) { alert(error.message || '장비 수정 중 오류가 발생했습니다.'); return }
    alert('장비 정보가 수정되었습니다.')
    setIsEditDeviceModalOpen(false)
    setSelectedDevice(null)
    await fetchDetail()
  }

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return
    const ok = confirm('이 장비를 삭제하시겠습니까?')
    if (!ok) return
    setIsSavingDeviceEdit(true)
    const { error } = await supabase.from('devices').delete().eq('device_id', selectedDevice.device_id)
    setIsSavingDeviceEdit(false)
    if (error) { alert(error.message || '장비 삭제 중 오류가 발생했습니다.'); return }
    alert('장비가 삭제되었습니다.')
    setIsEditDeviceModalOpen(false)
    setSelectedDevice(null)
    await fetchDetail()
  }

  const handleOpenDeviceImageModal = (device: Device) => { setSelectedImageDevice(device); setDeviceImageFile(null); setIsDeviceImageModalOpen(true) }

  const handleUploadDeviceImage = async () => {
    if (!selectedImageDevice) return
    if (!deviceImageFile) { alert('이미지 파일을 선택해주세요.'); return }
    setIsSavingDeviceImage(true)
    try {
      const fileExt = deviceImageFile.name.split('.').pop()
      const fileName = `device-${selectedImageDevice.device_id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('device-images').upload(fileName, deviceImageFile, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('device-images').getPublicUrl(fileName)
      const { error: updateError } = await supabase.from('devices').update({ image_url: data.publicUrl }).eq('device_id', selectedImageDevice.device_id)
      if (updateError) throw updateError
      alert('장비 사진이 등록되었습니다.')
      setIsDeviceImageModalOpen(false)
      setSelectedImageDevice(null)
      setDeviceImageFile(null)
      await fetchDetail()
    } catch (error: any) {
      alert(error?.message || '장비 사진 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsSavingDeviceImage(false)
    }
  }

  const historyByDevice = useMemo(() => {
    const map = new Map<number, ServiceHistory[]>()
    devices.forEach((d) => map.set(d.device_id, []))
    history.forEach((h) => {
      if (h.device_id == null) return
      const arr = map.get(Number(h.device_id)) || []
      arr.push(h)
      map.set(Number(h.device_id), arr)
    })
    return map
  }, [devices, history])

  const totalQuoteAmt = quotes.reduce((s, q) => s + (q.total_supply || 0), 0)
  const totalOrderAmt = quotes.filter(q => ['수주', '매출완료'].includes(q.status)).reduce((s, q) => s + (q.total_supply || 0), 0)
  const totalRevenueAmt = quotes.filter(q => q.status === '매출완료').reduce((s, q) => s + (q.total_supply || 0), 0)

  const iconButtonStyle: CSSProperties = {
    width: 34, height: 34, borderRadius: '50%', background: WHITE_BUTTON_BG,
    color: WHITE_BUTTON_TEXT, border: 'none', cursor: 'pointer', fontSize: 16,
    fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  }

  if (loading) {
    return (
      <>
        <style jsx global>{`html, body { background: ${PAGE_BG}; }`}</style>
        <main style={{ padding: 20, background: PAGE_BG, minHeight: '100vh', color: TEXT_PRIMARY }}>
          <p style={{ marginTop: 16 }}>불러오는 중...</p>
        </main>
      </>
    )
  }

  return (
    <>
      <style jsx global>{`
        html, body { background: ${PAGE_BG}; }
        input::placeholder, textarea::placeholder { color: ${TEXT_MUTED}; opacity: 1; }
        select { appearance: none; -webkit-appearance: none; -moz-appearance: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; }
      `}</style>

      <main style={{ padding: 20, maxWidth: 1400, margin: '0 auto', background: PAGE_BG, minHeight: '100vh' }}>

        {/* 업체 정보 패널 */}
        <div style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}`, borderRadius: 20, padding: 24, marginBottom: 22, color: TEXT_PRIMARY, position: 'relative' }}>
          <button onClick={handleOpenEditCustomerModal} style={{ ...iconButtonStyle, position: 'absolute', top: 20, right: 20 }}>✏️</button>
          <h1 style={{ margin: 0, marginBottom: 18, fontSize: 32, color: TEXT_PRIMARY }}>{customer?.company_name ?? '고객 정보 없음'}</h1>
          <div style={{ display: 'grid', gap: 10, fontSize: 16, color: TEXT_SECONDARY }}>
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              주소: {customer?.address ?? '-'}
              {customer?.address && (
                <button onClick={() => { navigator.clipboard.writeText(customer.address ?? ''); alert('주소가 복사되었습니다!') }}
                  style={{ padding: '3px 10px', fontSize: 12, fontWeight: 700, background: '#234ea2', color: '#ffffff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>복사</button>
              )}
            </p>
            <p style={{ margin: 0 }}>상태: {customer?.status ?? '-'}</p>
            <p style={{ margin: 0 }}>대리점: {customer?.agency ?? '-'}</p>
          </div>
          <button onClick={() => setIsQuoteHistoryModalOpen(true)}
            style={{ marginTop: 16, padding: '9px 18px', background: quotes.length > 0 ? '#eff6ff' : '#f3f4f6', color: quotes.length > 0 ? WHITE_BUTTON_BG : TEXT_SECONDARY, border: `1px solid ${quotes.length > 0 ? '#bfdbfe' : INPUT_BORDER}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            📋 거래 이력 {quotes.length > 0 ? `(${quotes.length}건 · 누적 ₩${numKR(totalRevenueAmt)})` : '(없음)'}
          </button>
        </div>

        {/* 담당자 */}
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ color: TEXT_PRIMARY, marginBottom: 12, fontSize: 30, fontWeight: 800 }}>담당자</h2>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4, alignItems: 'flex-start' }}>
            {(contacts ?? []).map((c) => {
              const departmentText = c.department?.trim() ? c.department : '부서정보 없음'
              return (
                <div key={c.contact_id} style={{ minWidth: 320, maxWidth: 320, background: CARD_BG, borderRadius: 18, padding: 18, color: TEXT_PRIMARY, border: `1px solid ${INPUT_BORDER}`, flex: '0 0 auto', textAlign: 'center', position: 'relative' }}>
                  <button onClick={() => handleOpenEditContactModal(c)} style={{ ...iconButtonStyle, position: 'absolute', top: 14, right: 14 }}>✏️</button>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: c.department?.trim() ? TEXT_SECONDARY : TEXT_MUTED }}>{departmentText}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 10, color: TEXT_PRIMARY }}>{c.name ?? '-'} {c.position ?? ''}</div>
                  <div style={{ fontSize: 15, color: TEXT_SECONDARY }}>{c.phone ?? '-'}</div>
                </div>
              )
            })}
            <div style={{ minWidth: 320, maxWidth: 320, minHeight: 156, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button onClick={handleOpenAddContactModal} style={{ width: 68, height: 68, borderRadius: '50%', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, border: `1px solid ${INPUT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, cursor: 'pointer', flex: '0 0 auto' }}>+</button>
            </div>
          </div>
        </div>

        {/* 장비 */}
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ color: TEXT_PRIMARY, marginBottom: 12, fontSize: 30, fontWeight: 800 }}>장비</h2>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4, alignItems: 'flex-start' }}>
            {(devices ?? []).map((d) => {
              const deviceTitle = `${d.device_name ?? ''} ${d.device_name2 ?? ''} ${d.option ?? ''}`.replace(/\s+/g, ' ').trim()
              const deviceHistory = historyByDevice.get(d.device_id) || []
              return (
                <div key={d.device_id} style={{ minWidth: 320, maxWidth: 320, background: CARD_BG, borderRadius: 18, padding: 16, color: TEXT_PRIMARY, border: `1px solid ${INPUT_BORDER}`, flex: '0 0 auto', position: 'relative', alignSelf: 'flex-start' }}>
                  <button onClick={() => handleOpenEditDeviceModal(d)} style={{ ...iconButtonStyle, position: 'absolute', top: 14, right: 14, zIndex: 2 }}>✏️</button>
                  <div style={{ height: 150, borderRadius: 14, background: 'rgba(255,255,255,0.08)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {d.image_url ? (
                      <img src={d.image_url} alt={deviceTitle || 'device image'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <button onClick={() => handleOpenDeviceImageModal(d)} style={{ width: 64, height: 64, borderRadius: '50%', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, border: 'none', fontSize: 38, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    )}
                  </div>
                  <div style={{ position: 'relative', marginBottom: 10, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', width: '100%', padding: '0 8px', boxSizing: 'border-box', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'keep-all' }} title={deviceTitle || '-'}>{deviceTitle || '-'}</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 14, marginBottom: 6, color: TEXT_SECONDARY }}>S/N : {d.serial_number ?? '-'} &nbsp; | &nbsp; 프로그램 : {d.program ?? '-'}</div>
                  <div style={{ textAlign: 'center', fontSize: 14, marginBottom: 12, color: TEXT_SECONDARY }}>납입연월 : {getInstallDisplay(d)}</div>
                  <button onClick={() => handleOpenServiceModal(d.device_id)} style={{ width: '100%', padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, marginBottom: 14 }}>서비스 레포트 추가</button>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {deviceHistory.length === 0 ? (
                      <div style={{ width: '100%', background: INNER_CARD_BG, color: TEXT_PRIMARY, borderRadius: 12, padding: 14, fontSize: 14, border: `1px solid ${INPUT_BORDER}`, boxSizing: 'border-box' }}>
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>서비스 노트</div>
                        <div style={{ marginBottom: 18 }}>-</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, fontSize: 12, color: TEXT_MUTED }}><div>-</div><div>방문자 : -</div></div>
                      </div>
                    ) : deviceHistory.map((h) => (
                      <div key={`${d.device_id}-${h.service_id}`} style={{ width: '100%', background: INNER_CARD_BG, color: TEXT_PRIMARY, borderRadius: 12, padding: 14, fontSize: 14, border: `1px solid ${INPUT_BORDER}`, boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800 }}>{h.service_type ?? '-'}</span>
                            {h.is_paid !== null && (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: h.is_paid ? '#eff6ff' : '#f0fdf4', color: h.is_paid ? '#234ea2' : '#16a34a' }}>
                                {h.is_paid ? '유상' : '무상'}
                              </span>
                            )}
                          </div>
                         <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleOpenEditServiceModal(h)} style={{ padding: '6px 10px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>수정</button>
                            <button onClick={() => {
                              setPendingReportService(h)
                              setPendingReportDevice(d)
                              setSignStep(1)
                              setIsSignModalOpen(true)
                            }} style={{ padding: '6px 10px', background: '#16a34a', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>레포트</button>
                          </div>
                        </div>
                        <div style={{ marginBottom: 18, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, color: TEXT_PRIMARY }}>{h.service_notes ?? '-'}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, fontSize: 12, color: TEXT_MUTED }}>
                          <div>{h.visit_date ?? '-'}</div>
                          <div style={{ textAlign: 'right' }}>방문자 : {h.service_engineers && h.service_engineers.length > 0 ? h.service_engineers.map((se) => `${se.engineers.name} ${se.engineers.position ?? ''}`.trim()).join(', ') : (h.visitor ?? '-')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <div style={{ minWidth: 320, maxWidth: 320, minHeight: 520, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
              <button onClick={handleOpenAddDeviceModal} style={{ width: 68, height: 68, borderRadius: '50%', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, border: `1px solid ${INPUT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, cursor: 'pointer', flex: '0 0 auto' }}>+</button>
            </div>
          </div>
        </div>

        {/* ── 거래 이력 모달 ── */}
        {isQuoteHistoryModalOpen && (
          <div onClick={() => setIsQuoteHistoryModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 1100, maxHeight: '90vh', background: CARD_BG, borderRadius: 18, padding: 24, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}`, display: 'flex', flexDirection: 'column' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: TEXT_PRIMARY, marginBottom: 4 }}>📋 거래 이력</div>
                  <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{customer?.company_name}</div>
                </div>
                <button onClick={() => setIsQuoteHistoryModalOpen(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* 요약 카드 */}
              {(() => {
                const revenueQuotes = quotes.filter(q => q.status === '매출완료')
                const totalProfitAmt = revenueQuotes.reduce((s, q) => s + (q.total_profit || 0), 0)
                const totalProfitRate = totalRevenueAmt > 0 ? (totalProfitAmt / totalRevenueAmt * 100) : null
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: '총 견적 발행액', value: `₩${numKR(totalQuoteAmt)}`, sub: `${quotes.length}건`, color: TEXT_PRIMARY },
                      { label: '총 수주액', value: `₩${numKR(totalOrderAmt)}`, sub: `${quotes.filter(q => ['수주', '매출완료'].includes(q.status)).length}건`, color: '#3b82f6' },
                      { label: '누적 매출액', value: `₩${numKR(totalRevenueAmt)}`, sub: `${quotes.filter(q => q.status === '매출완료').length}건`, color: WHITE_BUTTON_BG },
                      { label: '누적 순이익', value: totalProfitAmt > 0 ? `₩${numKR(totalProfitAmt)}` : '-', sub: '매출완료 기준', color: '#16a34a' },
                      { label: '평균 이익률', value: totalProfitRate !== null && totalProfitAmt > 0 ? `${totalProfitRate.toFixed(1)}%` : '-', sub: '매출완료 기준', color: totalProfitRate !== null && totalProfitRate >= 40 ? '#16a34a' : '#f59e0b' },
                    ].map(({ label, value, sub, color }) => (
                      <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: `1px solid ${INPUT_BORDER}`, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* 견적 목록 */}
              <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
                {quotes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, fontSize: 14 }}>견적 이력이 없습니다</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                    <thead style={{ position: 'sticky', top: 0, background: CARD_BG }}>
                      <tr style={{ borderBottom: `2px solid ${INPUT_BORDER}` }}>
                        {['견적번호', '날짜', '담당자', '내용', '품목', '금액', '순이익', '이익률', '상태'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: TEXT_SECONDARY, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map(q => {
                       const itemNames = q.quote_items && q.quote_items.length > 0
                          ? q.quote_items.map(i => i.price_list?.model_jp || i.product_name).filter(Boolean).join(', ')
                          : '-'
                        return (
                          <tr key={q.quote_id} style={{ borderBottom: `1px solid ${INPUT_BORDER}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: WHITE_BUTTON_BG, whiteSpace: 'nowrap' }}>{q.quote_number}</td>
                            <td style={{ padding: '10px 12px', color: TEXT_SECONDARY, whiteSpace: 'nowrap' }}>{q.quote_date}</td>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{q.engineers?.name ?? '-'}</td>
                            <td style={{ padding: '10px 12px', color: TEXT_SECONDARY, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.subject ?? '-'}</td>
                            <td style={{ padding: '10px 12px', color: TEXT_SECONDARY, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemNames}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>₩{numKR(q.total_supply)}</td>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              {q.status === '매출완료' && q.total_profit
                                ? <span style={{ fontWeight: 700, color: '#16a34a' }}>₩{numKR(q.total_profit)}</span>
                                : <span style={{ color: '#d1d5db' }}>-</span>}
                            </td>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              {q.status === '매출완료' && q.profit_rate
                                ? <span style={{ fontWeight: 700, color: q.profit_rate >= 40 ? '#16a34a' : '#f59e0b' }}>{q.profit_rate.toFixed(1)}%</span>
                                : <span style={{ color: '#d1d5db' }}>-</span>}
                            </td>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: (STATUS_COLORS[q.status] || '#9ca3af') + '22', color: STATUS_COLORS[q.status] || TEXT_SECONDARY }}>
                                {q.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 업체 수정 모달 */}
        {isEditCustomerModalOpen && (
          <div onClick={() => setIsEditCustomerModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>업체 정보 수정</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <input value={customerEditForm.company_name} onChange={(e) => setCustomerEditForm((prev) => ({ ...prev, company_name: e.target.value }))} placeholder="업체명" style={inputStyle} />
                <input value={customerEditForm.address} onChange={(e) => setCustomerEditForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="주소" style={inputStyle} />
                <input value={customerEditForm.agency} onChange={(e) => setCustomerEditForm((prev) => ({ ...prev, agency: e.target.value }))} placeholder="대리점" style={inputStyle} />
                <select value={customerEditForm.status} onChange={(e) => setCustomerEditForm((prev) => ({ ...prev, status: e.target.value }))} style={inputStyle}>
                  <option value="활성">상태: 활성</option>
                  <option value="잠재">상태: 잠재</option>
                  <option value="이탈">상태: 이탈</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
                <button onClick={handleDeleteCustomer} disabled={isDeletingCustomer} style={{ padding: '10px 14px', background: DANGER_BG, color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isDeletingCustomer ? 0.7 : 1 }}>{isDeletingCustomer ? '삭제 중...' : '삭제'}</button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setIsEditCustomerModalOpen(false)} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
                  <button onClick={handleUpdateCustomer} disabled={isSavingCustomerEdit} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingCustomerEdit ? 0.7 : 1 }}>{isSavingCustomerEdit ? '저장 중...' : '저장'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 담당자 추가 모달 */}
        {isAddContactModalOpen && (
          <div onClick={() => setIsAddContactModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>담당자 추가</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <input value={contactForm.name} onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="이름" style={inputStyle} />
                <input value={contactForm.department} onChange={(e) => setContactForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="부서" style={inputStyle} />
                <input value={contactForm.position} onChange={(e) => setContactForm((prev) => ({ ...prev, position: e.target.value }))} placeholder="직책" style={inputStyle} />
                <input value={contactForm.phone} onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="전화번호" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => setIsAddContactModalOpen(false)} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
                <button onClick={handleAddContact} disabled={isSavingContact} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingContact ? 0.7 : 1 }}>{isSavingContact ? '저장 중...' : '저장'}</button>
              </div>
            </div>
          </div>
        )}

        {/* 담당자 수정 모달 */}
        {isEditContactModalOpen && (
          <div onClick={() => { setIsEditContactModalOpen(false); setSelectedContact(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>담당자 수정</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <input value={contactEditForm.name} onChange={(e) => setContactEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="이름" style={inputStyle} />
                <input value={contactEditForm.department} onChange={(e) => setContactEditForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="부서" style={inputStyle} />
                <input value={contactEditForm.position} onChange={(e) => setContactEditForm((prev) => ({ ...prev, position: e.target.value }))} placeholder="직책" style={inputStyle} />
                <input value={contactEditForm.phone} onChange={(e) => setContactEditForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="전화번호" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
                <button onClick={handleDeleteContact} disabled={isSavingContactEdit} style={{ padding: '10px 14px', background: DANGER_BG, color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingContactEdit ? 0.7 : 1 }}>삭제</button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setIsEditContactModalOpen(false); setSelectedContact(null) }} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
                  <button onClick={handleUpdateContact} disabled={isSavingContactEdit} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingContactEdit ? 0.7 : 1 }}>{isSavingContactEdit ? '저장 중...' : '저장'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 장비 추가 모달 */}
        {isAddDeviceModalOpen && (
          <div onClick={() => setIsAddDeviceModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>장비 추가</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <input value={deviceForm.device_name} onChange={(e) => setDeviceForm((prev) => ({ ...prev, device_name: e.target.value }))} placeholder="장비 라인업(ex. SURFCOM)" style={{ ...inputStyle, fontSize: 12 }} />
                  <input value={deviceForm.device_name2} onChange={(e) => setDeviceForm((prev) => ({ ...prev, device_name2: e.target.value }))} placeholder="장비 모델명(ex. 1600D)" style={{ ...inputStyle, fontSize: 12 }} />
                  <input value={deviceForm.option} onChange={(e) => setDeviceForm((prev) => ({ ...prev, option: e.target.value }))} placeholder="옵션(ex. -12)" style={{ ...inputStyle, fontSize: 12 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input value={deviceForm.serial_number} onChange={(e) => setDeviceForm((prev) => ({ ...prev, serial_number: e.target.value }))} placeholder="시리얼넘버" style={inputStyle} />
                  <select value={deviceForm.program} onChange={(e) => setDeviceForm((prev) => ({ ...prev, program: e.target.value }))} style={inputStyle}>
                    <option value="ACCTee">프로그램: ACCTee</option>
                    <option value="Tims">프로그램: Tims</option>
                    <option value="CALYPSO">프로그램: CALYPSO</option>
                    <option value="없음">프로그램: 없음</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input type="date" value={deviceForm.install_date} onChange={(e) => setDeviceForm((prev) => ({ ...prev, install_date: e.target.value }))} style={dateInputStyle} />
                  <select value={deviceForm.category} onChange={(e) => setDeviceForm((prev) => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                    <option value="20">구분: 20</option>
                    <option value="81">구분: 81</option>
                    <option value="83">구분: 83</option>
                    <option value="84">구분: 84</option>
                  </select>
                </div>            
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => setIsAddDeviceModalOpen(false)} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
                <button onClick={handleAddDevice} disabled={isSavingDevice} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingDevice ? 0.7 : 1 }}>{isSavingDevice ? '저장 중...' : '저장'}</button>
              </div>
            </div>
          </div>
        )}

        {/* 장비 수정 모달 */}
        {isEditDeviceModalOpen && (
          <div onClick={() => { setIsEditDeviceModalOpen(false); setSelectedDevice(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>장비 수정</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <input value={deviceEditForm.device_name} onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, device_name: e.target.value }))} placeholder="장비 라인업" style={{ ...inputStyle, fontSize: 12 }} />
                  <input value={deviceEditForm.device_name2} onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, device_name2: e.target.value }))} placeholder="장비 모델명" style={{ ...inputStyle, fontSize: 12 }} />
                  <input value={deviceEditForm.option} onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, option: e.target.value }))} placeholder="옵션" style={{ ...inputStyle, fontSize: 12 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input value={deviceEditForm.serial_number} onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, serial_number: e.target.value }))} placeholder="시리얼넘버" style={inputStyle} />
                  <select value={deviceEditForm.program} onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, program: e.target.value }))} style={inputStyle}>
                    <option value="ACCTee">프로그램: ACCTee</option>
                    <option value="Tims">프로그램: Tims</option>
                    <option value="CALYPSO">프로그램: CALYPSO</option>
                    <option value="없음">프로그램: 없음</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input type="date" value={deviceEditForm.install_date} onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, install_date: e.target.value }))} style={dateInputStyle} />
                  <select value={deviceEditForm.category} onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                    <option value="20">구분: 20</option>
                    <option value="81">구분: 81</option>
                    <option value="83">구분: 83</option>
                    <option value="84">구분: 84</option>
                  </select>
                </div>
              
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
                <button onClick={handleDeleteDevice} disabled={isSavingDeviceEdit} style={{ padding: '10px 14px', background: DANGER_BG, color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingDeviceEdit ? 0.7 : 1 }}>삭제</button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setIsEditDeviceModalOpen(false); setSelectedDevice(null) }} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
                  <button onClick={handleUpdateDevice} disabled={isSavingDeviceEdit} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingDeviceEdit ? 0.7 : 1 }}>{isSavingDeviceEdit ? '저장 중...' : '저장'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 서비스 추가 모달 */}
        {isServiceModalOpen && (
          <div onClick={() => { setIsServiceModalOpen(false); setSelectedDeviceId(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: TEXT_PRIMARY }}>서비스 레포트 추가</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <textarea value={serviceForm.service_notes} onChange={(e) => setServiceForm((prev) => ({ ...prev, service_notes: e.target.value }))} placeholder="서비스 내용" rows={8} style={textareaStyle} />
             <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr', gap: 12 }}>
                  <select value={serviceForm.service_type} onChange={(e) => setServiceForm((prev) => ({ ...prev, service_type: e.target.value }))} style={inputStyle}>
                    <option value="신규설치">신규 설치</option>
                    <option value="이전설치">이전 설치</option>
                    <option value="A/S">A/S</option>
                    <option value="B/S">B/S</option>
                    <option value="교육">교육</option>
                  </select>
                  <select value={serviceForm.is_paid ? 'true' : 'false'} onChange={(e) => setServiceForm((prev) => ({ ...prev, is_paid: e.target.value === 'true' }))} style={inputStyle}>
                    <option value="true">유상</option>
                    <option value="false">무상</option>
                  </select>
                  <input type="date" value={serviceForm.visit_date} onChange={(e) => setServiceForm((prev) => ({ ...prev, visit_date: e.target.value }))} style={dateInputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12, alignItems: 'center' }}>
                  <select value={serviceForm.contact_id ?? ''} onChange={(e) => setServiceForm((prev) => ({ ...prev, contact_id: e.target.value ? Number(e.target.value) : null }))} style={inputStyle}>
                    <option value="">고객 담당자 선택</option>
                    {contacts.map(c => (
                      <option key={c.contact_id} value={c.contact_id}>{c.name} {c.position ?? ''}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, padding: '8px 14px' }}>
                    <span style={{ fontSize: 12, color: TEXT_SECONDARY, whiteSpace: 'nowrap' }}>작업시간(h)</span>
                    <button onClick={() => setServiceForm(prev => ({ ...prev, work_hours: String(Math.max(0, parseFloat(prev.work_hours || '2') - 0.5)) }))}
                      style={{ width: 28, height: 28, border: `1px solid ${INPUT_BORDER}`, borderRadius: 6, background: '#f3f4f6', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>▼</button>
                    <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{serviceForm.work_hours || '2'}</span>
                    <button onClick={() => setServiceForm(prev => ({ ...prev, work_hours: String(parseFloat(prev.work_hours || '2') + 0.5) }))}
                      style={{ width: 28, height: 28, border: `1px solid ${INPUT_BORDER}`, borderRadius: 6, background: '#f3f4f6', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>▲</button>
                  </div>
                </div>
                <div style={{ border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, padding: 12, background: INPUT_BG }}>
                  <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 10 }}>방문 엔지니어</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {/* 선택된 엔지니어들 표시 */}
                    {selectedEngineerIds.map(id => {
                      const eng = engineers.find(e => e.engineer_id === id)
                      if (!eng) return null
                      return (
                        <button key={id}
                          onClick={() => id !== currentUserEngineerId && setSelectedEngineerIds(prev => prev.filter(i => i !== id))}
                          style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid #234ea2`, background: '#234ea2', color: '#ffffff', fontWeight: 700, fontSize: 13, cursor: id === currentUserEngineerId ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {eng.name} {eng.position || ''}
                          {id !== currentUserEngineerId && <span style={{ fontSize: 14, opacity: 0.8 }}>✕</span>}
                        </button>
                      )
                    })}
                    {/* + 버튼 */}
                    <button onClick={() => setShowExtraEngineers(p => !p)}
                      style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${INPUT_BORDER}`, background: showExtraEngineers ? '#f0f4ff' : INPUT_BG, color: '#234ea2', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      + 추가
                    </button>
                  </div>
                  {/* 추가 엔지니어 선택 목록 */}
                  {showExtraEngineers && (
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 10, borderTop: `1px solid ${INPUT_BORDER}` }}>
                      {engineers.filter(e => !selectedEngineerIds.includes(e.engineer_id)).map(eng => (
                        <button key={eng.engineer_id}
                          onClick={() => { setSelectedEngineerIds(prev => [...prev, eng.engineer_id]); setShowExtraEngineers(false) }}
                          style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${INPUT_BORDER}`, background: INPUT_BG, color: TEXT_PRIMARY, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                          {eng.name} {eng.position || ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => { setIsServiceModalOpen(false); setSelectedDeviceId(null) }} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
                <button onClick={handleAddService} disabled={isSavingService} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingService ? 0.7 : 1 }}>{isSavingService ? '저장 중...' : '저장'}</button>
              </div>
            </div>
          </div>
        )}

        {/* 서비스 수정 모달 */}
        {isEditServiceModalOpen && (
          <div onClick={() => { setIsEditServiceModalOpen(false); setSelectedService(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: TEXT_PRIMARY }}>서비스 기록 수정</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <textarea value={serviceEditForm.service_notes} onChange={(e) => setServiceEditForm((prev) => ({ ...prev, service_notes: e.target.value }))} placeholder="서비스 내용" rows={8} style={textareaStyle} />
           <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr', gap: 12 }}>
                  <select value={serviceEditForm.service_type} onChange={(e) => setServiceEditForm((prev) => ({ ...prev, service_type: e.target.value }))} style={inputStyle}>
                    <option value="신규설치">신규 설치</option>
                    <option value="이전설치">이전 설치</option>
                    <option value="A/S">A/S</option>
                    <option value="B/S">B/S</option>
                    <option value="교육">교육</option>
                  </select>
                  <select value={serviceEditForm.is_paid ? 'true' : 'false'} onChange={(e) => setServiceEditForm((prev) => ({ ...prev, is_paid: e.target.value === 'true' }))} style={inputStyle}>
                    <option value="true">유상</option>
                    <option value="false">무상</option>
                  </select>
                  <input type="date" value={serviceEditForm.visit_date} onChange={(e) => setServiceEditForm((prev) => ({ ...prev, visit_date: e.target.value }))} style={dateInputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12, alignItems: 'center' }}>
                  <select value={serviceEditForm.contact_id ?? ''} onChange={(e) => setServiceEditForm((prev) => ({ ...prev, contact_id: e.target.value ? Number(e.target.value) : null }))} style={inputStyle}>
                    <option value="">고객 담당자 선택</option>
                    {contacts.map(c => (
                      <option key={c.contact_id} value={c.contact_id}>{c.name} {c.position ?? ''}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, padding: '8px 14px' }}>
                    <span style={{ fontSize: 12, color: TEXT_SECONDARY, whiteSpace: 'nowrap' }}>작업시간(h)</span>
                    <button onClick={() => setServiceEditForm(prev => ({ ...prev, work_hours: String(Math.max(0, parseFloat(prev.work_hours || '2') - 0.5)) }))}
                      style={{ width: 28, height: 28, border: `1px solid ${INPUT_BORDER}`, borderRadius: 6, background: '#f3f4f6', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>▼</button>
                    <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{serviceEditForm.work_hours || '2'}</span>
                    <button onClick={() => setServiceEditForm(prev => ({ ...prev, work_hours: String(parseFloat(prev.work_hours || '2') + 0.5) }))}
                      style={{ width: 28, height: 28, border: `1px solid ${INPUT_BORDER}`, borderRadius: 6, background: '#f3f4f6', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>▲</button>
                  </div>
                </div>
                <div style={{ border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, padding: 12, background: INPUT_BG }}>
                  <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 10 }}>방문 엔지니어</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedEditEngineerIds.map(id => {
                      const eng = engineers.find(e => e.engineer_id === id)
                      if (!eng) return null
                      return (
                        <button key={id}
                          onClick={() => setSelectedEditEngineerIds(prev => prev.filter(i => i !== id))}
                          style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid #234ea2`, background: '#234ea2', color: '#ffffff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {eng.name} {eng.position || ''}
                          <span style={{ fontSize: 14, opacity: 0.8 }}>✕</span>
                        </button>
                      )
                    })}
                    <button onClick={() => setShowExtraEngineersEdit(p => !p)}
                      style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${INPUT_BORDER}`, background: showExtraEngineersEdit ? '#f0f4ff' : INPUT_BG, color: '#234ea2', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      + 추가
                    </button>
                  </div>
                  {showExtraEngineersEdit && (
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 10, borderTop: `1px solid ${INPUT_BORDER}` }}>
                      {engineers.filter(e => !selectedEditEngineerIds.includes(e.engineer_id)).map(eng => (
                        <button key={eng.engineer_id}
                          onClick={() => { setSelectedEditEngineerIds(prev => [...prev, eng.engineer_id]); setShowExtraEngineersEdit(false) }}
                          style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${INPUT_BORDER}`, background: INPUT_BG, color: TEXT_PRIMARY, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                          {eng.name} {eng.position || ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
               
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
                <button onClick={handleDeleteService} disabled={isSavingServiceEdit} style={{ padding: '10px 14px', background: DANGER_BG, color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingServiceEdit ? 0.7 : 1 }}>삭제</button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setIsEditServiceModalOpen(false); setSelectedService(null) }} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
                  <button onClick={handleUpdateService} disabled={isSavingServiceEdit} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingServiceEdit ? 0.7 : 1 }}>{isSavingServiceEdit ? '저장 중...' : '저장'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 서명 모달 */}
        {isSignModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 520, background: CARD_BG, borderRadius: 18, padding: 24, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>

              {/* 스텝 표시 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#234ea2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>1</div>
                <div style={{ height: 2, flex: 1, background: signStep === 2 ? '#234ea2' : INPUT_BORDER, borderRadius: 2 }} />
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: signStep === 2 ? '#234ea2' : INPUT_BORDER, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>2</div>
              </div>

              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: TEXT_PRIMARY }}>
                {signStep === 1 ? '엔지니어 서명' : '고객 담당자 서명'}
              </div>
              <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 16 }}>
                {signStep === 1 ? '아래 칸에 서명해주세요' : '고객 담당자분께 서명을 받아주세요'}
              </div>

              {/* 서명 캔버스 2개 — 항상 DOM에 존재, 보이는 것만 전환 */}
              {[
                { ref: engineerSignRef, step: 1, signing: engineerSigning, setSigning: setEngineerSigning },
                { ref: customerSignRef, step: 2, signing: customerSigning, setSigning: setCustomerSigning },
              ].map(({ ref, step, signing, setSigning }) => (
                <canvas
                  key={step}
                  ref={ref}
                  width={900}
                  height={240}
                  style={{ width: '100%', height: 200, border: `2px solid ${INPUT_BORDER}`, borderRadius: 12, background: '#fff', cursor: 'crosshair', touchAction: 'none', display: signStep === step ? 'block' : 'none' }}
                  onPointerDown={(e) => {
                    setSigning(true)
                    const canvas = ref.current!
                    const rect = canvas.getBoundingClientRect()
                    const ctx = canvas.getContext('2d')!
                    ctx.beginPath()
                    ctx.moveTo((e.clientX - rect.left) * canvas.width / rect.width, (e.clientY - rect.top) * canvas.height / rect.height)
                    canvas.setPointerCapture(e.pointerId)
                  }}
                  onPointerMove={(e) => {
                    if (!signing) return
                    const canvas = ref.current!
                    const rect = canvas.getBoundingClientRect()
                    const ctx = canvas.getContext('2d')!
                    ctx.lineWidth = 3
                    ctx.lineCap = 'round'
                    ctx.lineJoin = 'round'
                    ctx.strokeStyle = '#000'
                    ctx.lineTo((e.clientX - rect.left) * canvas.width / rect.width, (e.clientY - rect.top) * canvas.height / rect.height)
                    ctx.stroke()
                  }}
                  onPointerUp={() => setSigning(false)}
                />
              ))}

              {/* 지우기 버튼 */}
              <button onClick={() => {
                const ref = signStep === 1 ? engineerSignRef : customerSignRef
                const canvas = ref.current!
                canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
              }} style={{ marginTop: 10, padding: '6px 14px', background: '#f3f4f6', border: `1px solid ${INPUT_BORDER}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                🗑 지우기
              </button>

              {/* 버튼 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
                <button onClick={() => {
                  if (signStep === 2) {
                    setSignStep(1)
                  } else {
                    setIsSignModalOpen(false)
                    setPendingReportService(null)
                    setPendingReportDevice(null)
                    setSignStep(1)
                  }
                }} style={{ padding: '11px 20px', background: PANEL_BG, border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                  {signStep === 2 ? '← 이전' : '취소'}
                </button>

                <button onClick={async () => {
                  if (signStep === 1) {
                    setSignStep(2)
                  } else {
                    const engineerSignDataUrl = engineerSignRef.current!.toDataURL('image/png')
                    const customerSignDataUrl = customerSignRef.current!.toDataURL('image/png')
                    setIsSignModalOpen(false)
                    setSignStep(1)
                    if (pendingReportService && pendingReportDevice) {
                      await handlePrintReport(pendingReportService, pendingReportDevice, engineerSignDataUrl, customerSignDataUrl)
                    }
                    setPendingReportService(null)
                    setPendingReportDevice(null)
                  }
                }} style={{ padding: '11px 28px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                  {signStep === 1 ? '다음 →' : '✓ PDF 생성'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 장비 사진 모달 */}
        {isDeviceImageModalOpen && (
          <div onClick={() => { setIsDeviceImageModalOpen(false); setSelectedImageDevice(null); setDeviceImageFile(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>장비 사진 추가</div>
              <input type="file" accept="image/*" onChange={(e) => setDeviceImageFile(e.target.files?.[0] ?? null)} style={inputStyle} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={() => { setIsDeviceImageModalOpen(false); setSelectedImageDevice(null); setDeviceImageFile(null) }} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
                <button onClick={handleUploadDeviceImage} disabled={isSavingDeviceImage} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSavingDeviceImage ? 0.7 : 1 }}>{isSavingDeviceImage ? '업로드 중...' : '저장'}</button>
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  )
}
