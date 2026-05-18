'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Font, pdf } from '@react-pdf/renderer'
import { loadKakaoMap } from '@/lib/loadKakaoMap'
import { createClient } from '@/lib/supabase/client'

import type { Customer, Device, Contact, ServiceHistory, Engineer, Quote, ServiceForm, DeviceForm, ContactForm, CustomerEditFormData } from '@/components/customer/types'
import { PAGE_BG, TEXT_PRIMARY, TEXT_MUTED } from '@/components/customer/constants'

import CustomerInfoPanel from '@/components/customer/CustomerInfoPanel'
import ContactSection from '@/components/customer/ContactSection'
import DeviceSection from '@/components/customer/DeviceSection'
import ServiceReportDoc from '@/components/customer/ServiceReportDoc'
import QuoteHistoryModal from '@/components/customer/modals/QuoteHistoryModal'
import CustomerEditModal from '@/components/customer/modals/CustomerEditModal'
import ContactAddModal from '@/components/customer/modals/ContactAddModal'
import ContactEditModal from '@/components/customer/modals/ContactEditModal'
import DeviceAddModal from '@/components/customer/modals/DeviceAddModal'
import DeviceEditModal from '@/components/customer/modals/DeviceEditModal'
import ServiceAddModal from '@/components/customer/modals/ServiceAddModal'
import ServiceEditModal from '@/components/customer/modals/ServiceEditModal'
import SignModal from '@/components/customer/modals/SignModal'
import DeviceImageModal from '@/components/customer/modals/DeviceImageModal'

Font.register({
  family: 'NotoSansCJK',
  src: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf',
})

export default function CustomerDetailPage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const customerId = Number(params.id)

  // ── 데이터 상태 ──
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [history, setHistory] = useState<ServiceHistory[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserEngineerId, setCurrentUserEngineerId] = useState<number | null>(null)

  // ── 모달 열림 상태 ──
  const [isQuoteHistoryModalOpen, setIsQuoteHistoryModalOpen] = useState(false)
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false)
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false)
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false)
  const [isSignModalOpen, setIsSignModalOpen] = useState(false)

  // ── 선택된 항목 (null = 모달 닫힘) ──
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [selectedService, setSelectedService] = useState<ServiceHistory | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [selectedImageDevice, setSelectedImageDevice] = useState<Device | null>(null)
  const [pendingReportService, setPendingReportService] = useState<ServiceHistory | null>(null)
  const [pendingReportDevice, setPendingReportDevice] = useState<Device | null>(null)

  // ── 저장 중 상태 ──
  const [isSavingService, setIsSavingService] = useState(false)
  const [isSavingServiceEdit, setIsSavingServiceEdit] = useState(false)
  const [isSavingCustomerEdit, setIsSavingCustomerEdit] = useState(false)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [isSavingDevice, setIsSavingDevice] = useState(false)
  const [isSavingContactEdit, setIsSavingContactEdit] = useState(false)
  const [isSavingDeviceEdit, setIsSavingDeviceEdit] = useState(false)
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false)
  const [isSavingDeviceImage, setIsSavingDeviceImage] = useState(false)

  // ── 데이터 페칭 ──
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

  // ── 주소 → 좌표 변환 ──
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

  // ── 서비스 CRUD ──
  const handleAddService = async (form: ServiceForm, engineerIds: number[]) => {
    if (!selectedDeviceId) return
    setIsSavingService(true)
    const visitYear = form.visit_date.slice(0, 4)
    const { data: newService, error } = await supabase.from('service_history').insert([{
      customer_id: customerId, device_id: selectedDeviceId, visit_year: visitYear,
      visit_date: form.visit_date.trim(), service_notes: form.service_notes.trim(),
      visitor: form.visitor.trim() || null, service_type: form.service_type,
      contact_id: form.contact_id || null, is_paid: form.is_paid,
      work_hours: form.work_hours ? parseFloat(form.work_hours) : null,
    }]).select().single()
    if (error) { setIsSavingService(false); alert(error.message || '서비스 기록 저장 중 오류가 발생했습니다.'); return }
    const { error: engineerError } = await supabase.from('service_engineers').insert(engineerIds.map(eid => ({ service_id: newService.service_id, engineer_id: eid })))
    setIsSavingService(false)
    if (engineerError) { alert(engineerError.message || '엔지니어 연결 저장 중 오류가 발생했습니다.'); return }
    alert('서비스 기록이 추가되었습니다.')
    setSelectedDeviceId(null)
    await fetchDetail()
  }

  const handleUpdateService = async (form: ServiceForm, engineerIds: number[]) => {
    if (!selectedService) return
    setIsSavingServiceEdit(true)
    const visitYear = form.visit_date.slice(0, 4)
    const { error } = await supabase.from('service_history').update({
      visit_year: visitYear, visit_date: form.visit_date.trim(),
      service_notes: form.service_notes.trim(), visitor: form.visitor.trim() || null,
      service_type: form.service_type, contact_id: form.contact_id || null,
      is_paid: form.is_paid, work_hours: form.work_hours ? parseFloat(form.work_hours) : null,
    }).eq('service_id', selectedService.service_id)
    if (error) { setIsSavingServiceEdit(false); alert(error.message || '서비스 기록 수정 중 오류가 발생했습니다.'); return }
    await supabase.from('service_engineers').delete().eq('service_id', selectedService.service_id)
    await supabase.from('service_engineers').insert(engineerIds.map(eid => ({ service_id: selectedService.service_id, engineer_id: eid })))
    setIsSavingServiceEdit(false)
    alert('서비스 기록이 수정되었습니다.')
    setSelectedService(null)
    await fetchDetail()
  }

  const handleDeleteService = async () => {
    if (!selectedService) return
    if (!confirm('이 서비스 기록을 삭제하시겠습니까?')) return
    setIsSavingServiceEdit(true)
    const { error } = await supabase.from('service_history').delete().eq('service_id', selectedService.service_id)
    setIsSavingServiceEdit(false)
    if (error) { alert(error.message || '서비스 기록 삭제 중 오류가 발생했습니다.'); return }
    alert('서비스 기록이 삭제되었습니다.')
    setSelectedService(null)
    await fetchDetail()
  }

  // ── PDF 생성 ──
  const handlePrintReport = useCallback(async (service: ServiceHistory, device: Device, engineerSignDataUrl?: string, customerSignDataUrl?: string) => {
    const contact = contacts.find(c => c.contact_id === service.contact_id) ?? null
    const engineerNames = (service.service_engineers ?? []).map(se => `${se.engineers.name} ${se.engineers.position ?? ''}`.trim()).join(', ')
    const blob = await pdf(
      <ServiceReportDoc
        service={service} device={device} customer={customer!} contact={contact}
        engineerNames={engineerNames} engineerSignDataUrl={engineerSignDataUrl} customerSignDataUrl={customerSignDataUrl}
      />
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${service.visit_date?.replace(/-/g, '') ?? 'unknown'}_${customer?.company_name ?? ''}_서비스레포트.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }, [contacts, customer])

  // ── 업체 CRUD ──
  const handleUpdateCustomer = async (form: CustomerEditFormData) => {
    if (!customer) return
    if (!form.company_name.trim()) { alert('업체명을 입력해주세요.'); return }
    if (!form.address.trim()) { alert('주소를 입력해주세요.'); return }
    setIsSavingCustomerEdit(true)
    try {
      const coords = await geocodeAddress(form.address.trim())
      const { error } = await supabase.from('customers').update({
        company_name: form.company_name.trim(), address: form.address.trim(),
        agency: form.agency.trim() || null, status: form.status,
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
    if (!confirm('이 업체를 삭제하시겠습니까?\n관련 담당자, 장비, 서비스기록도 모두 삭제됩니다.')) return
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

  // ── 담당자 CRUD ──
  const handleAddContact = async (form: ContactForm) => {
    setIsSavingContact(true)
    const { error } = await supabase.from('contacts').insert([{ customer_id: customerId, name: form.name.trim(), department: form.department.trim() || null, position: form.position.trim() || null, phone: form.phone.trim() || null }])
    setIsSavingContact(false)
    if (error) { alert(error.message || '담당자 추가 중 오류가 발생했습니다.'); return }
    alert('담당자가 추가되었습니다.')
    setIsAddContactModalOpen(false)
    await fetchDetail()
  }

  const handleUpdateContact = async (form: ContactForm) => {
    if (!selectedContact) return
    setIsSavingContactEdit(true)
    const { error } = await supabase.from('contacts').update({ name: form.name.trim(), department: form.department.trim() || null, position: form.position.trim() || null, phone: form.phone.trim() || null }).eq('contact_id', selectedContact.contact_id)
    setIsSavingContactEdit(false)
    if (error) { alert(error.message || '담당자 수정 중 오류가 발생했습니다.'); return }
    alert('담당자 정보가 수정되었습니다.')
    setSelectedContact(null)
    await fetchDetail()
  }

  const handleDeleteContact = async () => {
    if (!selectedContact) return
    if (!confirm('이 담당자를 삭제하시겠습니까?')) return
    setIsSavingContactEdit(true)
    const { error } = await supabase.from('contacts').delete().eq('contact_id', selectedContact.contact_id)
    setIsSavingContactEdit(false)
    if (error) { alert(error.message || '담당자 삭제 중 오류가 발생했습니다.'); return }
    alert('담당자가 삭제되었습니다.')
    setSelectedContact(null)
    await fetchDetail()
  }

  // ── 장비 CRUD ──
  const handleAddDevice = async (form: DeviceForm) => {
    setIsSavingDevice(true)
    const { error } = await supabase.from('devices').insert([{ customer_id: customerId, device_name: form.device_name.trim(), device_name2: form.device_name2.trim() || null, option: form.option.trim() || null, serial_number: form.serial_number.trim() || null, program: form.program, install_date: form.install_date || null, install_year: null, category: form.category }])
    setIsSavingDevice(false)
    if (error) { alert(error.message || '장비 추가 중 오류가 발생했습니다.'); return }
    alert('장비가 추가되었습니다.')
    setIsAddDeviceModalOpen(false)
    await fetchDetail()
  }

  const handleUpdateDevice = async (form: DeviceForm) => {
    if (!selectedDevice) return
    setIsSavingDeviceEdit(true)
    const { error } = await supabase.from('devices').update({ device_name: form.device_name.trim(), device_name2: form.device_name2.trim() || null, option: form.option.trim() || null, serial_number: form.serial_number.trim() || null, program: form.program, install_date: form.install_date || null, install_year: null, category: form.category }).eq('device_id', selectedDevice.device_id)
    setIsSavingDeviceEdit(false)
    if (error) { alert(error.message || '장비 수정 중 오류가 발생했습니다.'); return }
    alert('장비 정보가 수정되었습니다.')
    setSelectedDevice(null)
    await fetchDetail()
  }

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return
    if (!confirm('이 장비를 삭제하시겠습니까?')) return
    setIsSavingDeviceEdit(true)
    const { error } = await supabase.from('devices').delete().eq('device_id', selectedDevice.device_id)
    setIsSavingDeviceEdit(false)
    if (error) { alert(error.message || '장비 삭제 중 오류가 발생했습니다.'); return }
    alert('장비가 삭제되었습니다.')
    setSelectedDevice(null)
    await fetchDetail()
  }

  // ── 장비 사진 업로드 ──
  const handleUploadDeviceImage = async (file: File) => {
    if (!selectedImageDevice) return
    setIsSavingDeviceImage(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `device-${selectedImageDevice.device_id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('device-images').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('device-images').getPublicUrl(fileName)
      const { error: updateError } = await supabase.from('devices').update({ image_url: data.publicUrl }).eq('device_id', selectedImageDevice.device_id)
      if (updateError) throw updateError
      alert('장비 사진이 등록되었습니다.')
      setSelectedImageDevice(null)
      await fetchDetail()
    } catch (error: any) {
      alert(error?.message || '장비 사진 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsSavingDeviceImage(false)
    }
  }

  // ── 파생 상태 ──
  const historyByDevice = useMemo(() => {
    const map = new Map<number, ServiceHistory[]>()
    devices.forEach(d => map.set(d.device_id, []))
    history.forEach(h => {
      if (h.device_id == null) return
      const arr = map.get(Number(h.device_id)) || []
      arr.push(h)
      map.set(Number(h.device_id), arr)
    })
    return map
  }, [devices, history])

  const totalRevenueAmt = useMemo(
    () => quotes.filter(q => q.status === '매출완료').reduce((s, q) => s + (q.total_supply || 0), 0),
    [quotes]
  )

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

        <CustomerInfoPanel
          customer={customer}
          quotes={quotes}
          totalRevenueAmt={totalRevenueAmt}
          onEdit={() => setIsEditCustomerModalOpen(true)}
          onQuoteHistoryOpen={() => setIsQuoteHistoryModalOpen(true)}
        />

        <ContactSection
          contacts={contacts}
          onAdd={() => setIsAddContactModalOpen(true)}
          onEdit={setSelectedContact}
        />

        <DeviceSection
          devices={devices}
          historyByDevice={historyByDevice}
          onAddDevice={() => setIsAddDeviceModalOpen(true)}
          onEditDevice={setSelectedDevice}
          onAddService={setSelectedDeviceId}
          onEditService={setSelectedService}
          onImageUpload={setSelectedImageDevice}
          onPrintReport={(service, device) => {
            setPendingReportService(service)
            setPendingReportDevice(device)
            setIsSignModalOpen(true)
          }}
        />

        {/* ── 모달 ── */}
        <QuoteHistoryModal
          isOpen={isQuoteHistoryModalOpen}
          customer={customer}
          quotes={quotes}
          onClose={() => setIsQuoteHistoryModalOpen(false)}
        />
        <CustomerEditModal
          customer={isEditCustomerModalOpen ? customer : null}
          isSaving={isSavingCustomerEdit}
          isDeleting={isDeletingCustomer}
          onClose={() => setIsEditCustomerModalOpen(false)}
          onSave={handleUpdateCustomer}
          onDelete={handleDeleteCustomer}
        />
        <ContactAddModal
          isOpen={isAddContactModalOpen}
          isSaving={isSavingContact}
          onClose={() => setIsAddContactModalOpen(false)}
          onSave={handleAddContact}
        />
        <ContactEditModal
          contact={selectedContact}
          isSaving={isSavingContactEdit}
          onClose={() => setSelectedContact(null)}
          onSave={handleUpdateContact}
          onDelete={handleDeleteContact}
        />
        <DeviceAddModal
          isOpen={isAddDeviceModalOpen}
          isSaving={isSavingDevice}
          onClose={() => setIsAddDeviceModalOpen(false)}
          onSave={handleAddDevice}
        />
        <DeviceEditModal
          device={selectedDevice}
          isSaving={isSavingDeviceEdit}
          onClose={() => setSelectedDevice(null)}
          onSave={handleUpdateDevice}
          onDelete={handleDeleteDevice}
        />
        <ServiceAddModal
          deviceId={selectedDeviceId}
          contacts={contacts}
          engineers={engineers}
          currentUserEngineerId={currentUserEngineerId}
          isSaving={isSavingService}
          onClose={() => setSelectedDeviceId(null)}
          onSave={handleAddService}
        />
        <ServiceEditModal
          service={selectedService}
          contacts={contacts}
          engineers={engineers}
          isSaving={isSavingServiceEdit}
          onClose={() => setSelectedService(null)}
          onSave={handleUpdateService}
          onDelete={handleDeleteService}
        />
        <SignModal
          isOpen={isSignModalOpen}
          onClose={() => {
            setIsSignModalOpen(false)
            setPendingReportService(null)
            setPendingReportDevice(null)
          }}
          onComplete={async (engineerSign, customerSign) => {
            setIsSignModalOpen(false)
            if (pendingReportService && pendingReportDevice) {
              await handlePrintReport(pendingReportService, pendingReportDevice, engineerSign, customerSign)
            }
            setPendingReportService(null)
            setPendingReportDevice(null)
          }}
        />
        <DeviceImageModal
          device={selectedImageDevice}
          isSaving={isSavingDeviceImage}
          onClose={() => setSelectedImageDevice(null)}
          onSave={handleUploadDeviceImage}
        />

      </main>
    </>
  )
}
