'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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
  install_engineer: string | null
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
}

const PAGE_BG = '#06070a'
const PANEL_BG = '#17181d'
const CARD_BG = '#1c1d22'
const INNER_CARD_BG = '#111216'
const INPUT_BG = '#0d0e12'
const INPUT_BORDER = '#2c2f36'
const TEXT_PRIMARY = '#f5f5f5'
const TEXT_SECONDARY = '#b5b7be'
const TEXT_MUTED = '#7d818c'
const WHITE_BUTTON_BG = '#f4f4f5'
const WHITE_BUTTON_TEXT = '#111113'
const DANGER_BG = '#dc2626'

const inputStyle: CSSProperties = {
  width: '100%',
  padding: 12,
  border: `1px solid ${INPUT_BORDER}`,
  borderRadius: 10,
  boxSizing: 'border-box',
  color: TEXT_PRIMARY,
  background: INPUT_BG,
  outline: 'none',
}

// date input with white background so calendar icon is visible
const dateInputStyle: CSSProperties = {
  width: '100%',
  padding: 12,
  border: `1px solid ${INPUT_BORDER}`,
  borderRadius: 10,
  boxSizing: 'border-box',
  color: '#111113',
  background: '#ffffff',
  outline: 'none',
  colorScheme: 'light',
}

const textareaStyle: CSSProperties = {
  width: '100%',
  padding: 12,
  border: `1px solid ${INPUT_BORDER}`,
  borderRadius: 10,
  resize: 'vertical',
  color: TEXT_PRIMARY,
  boxSizing: 'border-box',
  lineHeight: 1.5,
  background: INPUT_BG,
  outline: 'none',
}

function getInstallDisplay(device: Device) {
  const rawYear = device.install_year?.toString().trim() || ''
  const rawDate = device.install_date?.toString().trim() || ''

  if (!rawDate && !rawYear) return '-'

  if (rawYear && rawDate) {
    if (rawDate.startsWith(rawYear)) {
      return rawDate
    }
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

  const [loading, setLoading] = useState(true)

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false)
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false)
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false)
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false)
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false)
  const [isEditDeviceModalOpen, setIsEditDeviceModalOpen] = useState(false)
  const [isDeviceImageModalOpen, setIsDeviceImageModalOpen] = useState(false)

  const [isSavingService, setIsSavingService] = useState(false)
  const [isSavingServiceEdit, setIsSavingServiceEdit] = useState(false)
  const [isSavingCustomerEdit, setIsSavingCustomerEdit] = useState(false)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [isSavingDevice, setIsSavingDevice] = useState(false)
  const [isSavingContactEdit, setIsSavingContactEdit] = useState(false)
  const [isSavingDeviceEdit, setIsSavingDeviceEdit] = useState(false)
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false)
  const [isSavingDeviceImage, setIsSavingDeviceImage] = useState(false)

  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [selectedService, setSelectedService] = useState<ServiceHistory | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [selectedImageDevice, setSelectedImageDevice] = useState<Device | null>(null)

  const [deviceImageFile, setDeviceImageFile] = useState<File | null>(null)

  const [serviceForm, setServiceForm] = useState({
    visit_date: '',
    service_notes: '',
    visitor: '',
  })

  const [serviceEditForm, setServiceEditForm] = useState({
    visit_date: '',
    service_notes: '',
    visitor: '',
  })

  const [customerEditForm, setCustomerEditForm] = useState({
    company_name: '',
    address: '',
    agency: '',
    status: '활성',
  })

  const [contactForm, setContactForm] = useState({
    name: '',
    department: '',
    position: '',
    phone: '',
  })

  const [contactEditForm, setContactEditForm] = useState({
    name: '',
    department: '',
    position: '',
    phone: '',
  })

  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    device_name2: '',
    option: '',
    serial_number: '',
    program: 'ACCTee',
    install_date: '',
    install_engineer: '',
    category: '20',
  })

  const [deviceEditForm, setDeviceEditForm] = useState({
    device_name: '',
    device_name2: '',
    option: '',
    serial_number: '',
    program: 'ACCTee',
    install_date: '',
    install_engineer: '',
    category: '20',
  })

  const fetchDetail = async () => {
    setLoading(true)

    const [{ data: customerData }, { data: devicesData }, { data: contactsData }, { data: historyData }] =
      await Promise.all([
        supabase.from('customers').select('*').eq('customer_id', customerId).single(),
        supabase.from('devices').select('*').eq('customer_id', customerId).order('device_id', { ascending: true }),
        supabase.from('contacts').select('*').eq('customer_id', customerId).order('contact_id', { ascending: true }),
        supabase
          .from('service_history')
          .select('*')
          .eq('customer_id', customerId)
          .order('service_id', { ascending: false }),
      ])

    setCustomer(customerData ?? null)
    setDevices(devicesData ?? [])
    setContacts(contactsData ?? [])
    setHistory(historyData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!customerId || Number.isNaN(customerId)) return
    fetchDetail()
  }, [customerId])

  const geocodeAddress = async (address: string) => {
    const kakao = await loadKakaoMap()

    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (!kakao.maps.services) {
        reject(new Error('Kakao Maps services 라이브러리가 로드되지 않았습니다.'))
        return
      }

      const geocoder = new kakao.maps.services.Geocoder()

      geocoder.addressSearch(address, (result: any[], status: string) => {
        if (status !== kakao.maps.services.Status.OK || !result[0]) {
          reject(new Error('주소 좌표 변환 실패'))
          return
        }

        resolve({
          latitude: Number(result[0].y),
          longitude: Number(result[0].x),
        })
      })
    })
  }

  const handleOpenServiceModal = (deviceId: number) => {
    setSelectedDeviceId(deviceId)
    setServiceForm({
      visit_date: '',
      service_notes: '',
      visitor: '',
    })
    setIsServiceModalOpen(true)
  }

  const handleAddService = async () => {
    if (!selectedDeviceId) {
      alert('장비를 먼저 선택해주세요.')
      return
    }

    if (!serviceForm.visit_date.trim()) {
      alert('방문일자를 입력해주세요.')
      return
    }

    if (!serviceForm.service_notes.trim()) {
      alert('서비스 내용을 입력해주세요.')
      return
    }

    const visitYear = serviceForm.visit_date.slice(0, 4)

    setIsSavingService(true)

    const { error } = await supabase.from('service_history').insert([
      {
        customer_id: customerId,
        device_id: selectedDeviceId,
        visit_year: visitYear,
        visit_date: serviceForm.visit_date.trim(),
        service_notes: serviceForm.service_notes.trim(),
        visitor: serviceForm.visitor.trim() || null,
      },
    ])

    setIsSavingService(false)

    if (error) {
      alert(error.message || '서비스 기록 저장 중 오류가 발생했습니다.')
      return
    }

    alert('서비스 기록이 추가되었습니다.')

    setServiceForm({
      visit_date: '',
      service_notes: '',
      visitor: '',
    })
    setIsServiceModalOpen(false)
    setSelectedDeviceId(null)

    await fetchDetail()
  }

  const handleOpenEditServiceModal = (service: ServiceHistory) => {
    setSelectedService(service)
    setServiceEditForm({
      visit_date: service.visit_date ?? '',
      service_notes: service.service_notes ?? '',
      visitor: service.visitor ?? '',
    })
    setIsEditServiceModalOpen(true)
  }

  const handleUpdateService = async () => {
    if (!selectedService) return

    if (!serviceEditForm.visit_date.trim()) {
      alert('방문일자를 입력해주세요.')
      return
    }

    if (!serviceEditForm.service_notes.trim()) {
      alert('서비스 내용을 입력해주세요.')
      return
    }

    const visitYear = serviceEditForm.visit_date.slice(0, 4)

    setIsSavingServiceEdit(true)

    const { error } = await supabase
      .from('service_history')
      .update({
        visit_year: visitYear,
        visit_date: serviceEditForm.visit_date.trim(),
        service_notes: serviceEditForm.service_notes.trim(),
        visitor: serviceEditForm.visitor.trim() || null,
      })
      .eq('service_id', selectedService.service_id)

    setIsSavingServiceEdit(false)

    if (error) {
      alert(error.message || '서비스 기록 수정 중 오류가 발생했습니다.')
      return
    }

    alert('서비스 기록이 수정되었습니다.')
    setIsEditServiceModalOpen(false)
    setSelectedService(null)
    await fetchDetail()
  }

  const handleDeleteService = async () => {
    if (!selectedService) return

    const ok = confirm('이 서비스 기록을 삭제하시겠습니까?')
    if (!ok) return

    setIsSavingServiceEdit(true)

    const { error } = await supabase
      .from('service_history')
      .delete()
      .eq('service_id', selectedService.service_id)

    setIsSavingServiceEdit(false)

    if (error) {
      alert(error.message || '서비스 기록 삭제 중 오류가 발생했습니다.')
      return
    }

    alert('서비스 기록이 삭제되었습니다.')
    setIsEditServiceModalOpen(false)
    setSelectedService(null)
    await fetchDetail()
  }

  const handleOpenEditCustomerModal = () => {
    setCustomerEditForm({
      company_name: customer?.company_name ?? '',
      address: customer?.address ?? '',
      agency: customer?.agency ?? '',
      status: customer?.status ?? '활성',
    })
    setIsEditCustomerModalOpen(true)
  }

  const handleUpdateCustomer = async () => {
    if (!customer) return

    if (!customerEditForm.company_name.trim()) {
      alert('업체명을 입력해주세요.')
      return
    }

    if (!customerEditForm.address.trim()) {
      alert('주소를 입력해주세요.')
      return
    }

    setIsSavingCustomerEdit(true)

    try {
      const coords = await geocodeAddress(customerEditForm.address.trim())

      const { error } = await supabase
        .from('customers')
        .update({
          company_name: customerEditForm.company_name.trim(),
          address: customerEditForm.address.trim(),
          agency: customerEditForm.agency.trim() || null,
          status: customerEditForm.status,
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .eq('customer_id', customer.customer_id)

      setIsSavingCustomerEdit(false)

      if (error) {
        alert(error.message || '업체 정보 수정 중 오류가 발생했습니다.')
        return
      }

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
      const { error: historyError } = await supabase
        .from('service_history')
        .delete()
        .eq('customer_id', customer.customer_id)
      if (historyError) throw historyError

      const { error: contactsError } = await supabase
        .from('contacts')
        .delete()
        .eq('customer_id', customer.customer_id)
      if (contactsError) throw contactsError

      const { error: devicesError } = await supabase
        .from('devices')
        .delete()
        .eq('customer_id', customer.customer_id)
      if (devicesError) throw devicesError

      const { error: customerError } = await supabase
        .from('customers')
        .delete()
        .eq('customer_id', customer.customer_id)
      if (customerError) throw customerError

      alert('업체 및 관련 데이터가 삭제되었습니다.')
      setIsEditCustomerModalOpen(false)
      router.push('/')
    } catch (error: any) {
      alert(error?.message || '업체 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeletingCustomer(false)
    }
  }

  const handleOpenAddContactModal = () => {
    setContactForm({
      name: '',
      department: '',
      position: '',
      phone: '',
    })
    setIsAddContactModalOpen(true)
  }

  const handleAddContact = async () => {
    if (!contactForm.name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }

    setIsSavingContact(true)

    const { error } = await supabase.from('contacts').insert([
      {
        customer_id: customerId,
        name: contactForm.name.trim(),
        department: contactForm.department.trim() || null,
        position: contactForm.position.trim() || null,
        phone: contactForm.phone.trim() || null,
      },
    ])

    setIsSavingContact(false)

    if (error) {
      alert(error.message || '담당자 추가 중 오류가 발생했습니다.')
      return
    }

    alert('담당자가 추가되었습니다.')
    setIsAddContactModalOpen(false)
    await fetchDetail()
  }

  const handleOpenEditContactModal = (contact: Contact) => {
    setSelectedContact(contact)
    setContactEditForm({
      name: contact.name ?? '',
      department: contact.department ?? '',
      position: contact.position ?? '',
      phone: contact.phone ?? '',
    })
    setIsEditContactModalOpen(true)
  }

  const handleUpdateContact = async () => {
    if (!selectedContact) return

    if (!contactEditForm.name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }

    setIsSavingContactEdit(true)

    const { error } = await supabase
      .from('contacts')
      .update({
        name: contactEditForm.name.trim(),
        department: contactEditForm.department.trim() || null,
        position: contactEditForm.position.trim() || null,
        phone: contactEditForm.phone.trim() || null,
      })
      .eq('contact_id', selectedContact.contact_id)

    setIsSavingContactEdit(false)

    if (error) {
      alert(error.message || '담당자 수정 중 오류가 발생했습니다.')
      return
    }

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

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('contact_id', selectedContact.contact_id)

    setIsSavingContactEdit(false)

    if (error) {
      alert(error.message || '담당자 삭제 중 오류가 발생했습니다.')
      return
    }

    alert('담당자가 삭제되었습니다.')
    setIsEditContactModalOpen(false)
    setSelectedContact(null)
    await fetchDetail()
  }

  const handleOpenAddDeviceModal = () => {
    setDeviceForm({
      device_name: '',
      device_name2: '',
      option: '',
      serial_number: '',
      program: 'ACCTee',
      install_date: '',
      install_engineer: '',
      category: '20',
    })
    setIsAddDeviceModalOpen(true)
  }

  const handleAddDevice = async () => {
    if (!deviceForm.device_name.trim()) {
      alert('장비 라인업을 입력해주세요.')
      return
    }

    setIsSavingDevice(true)

    const { error } = await supabase.from('devices').insert([
      {
        customer_id: customerId,
        device_name: deviceForm.device_name.trim(),
        device_name2: deviceForm.device_name2.trim() || null,
        option: deviceForm.option.trim() || null,
        serial_number: deviceForm.serial_number.trim() || null,
        program: deviceForm.program,
        install_date: deviceForm.install_date || null,
        install_year: null,
        install_engineer: deviceForm.install_engineer.trim() || null,
        category: deviceForm.category,
      },
    ])

    setIsSavingDevice(false)

    if (error) {
      alert(error.message || '장비 추가 중 오류가 발생했습니다.')
      return
    }

    alert('장비가 추가되었습니다.')
    setIsAddDeviceModalOpen(false)
    await fetchDetail()
  }

  const handleOpenEditDeviceModal = (device: Device) => {
    setSelectedDevice(device)
    setDeviceEditForm({
      device_name: device.device_name ?? '',
      device_name2: device.device_name2 ?? '',
      option: device.option ?? '',
      serial_number: device.serial_number ?? '',
      program: device.program ?? 'ACCTee',
      install_date: device.install_date ?? '',
      install_engineer: device.install_engineer ?? '',
      category: device.category ?? '20',
    })
    setIsEditDeviceModalOpen(true)
  }

  const handleUpdateDevice = async () => {
    if (!selectedDevice) return

    if (!deviceEditForm.device_name.trim()) {
      alert('장비 라인업을 입력해주세요.')
      return
    }

    setIsSavingDeviceEdit(true)

    const { error } = await supabase
      .from('devices')
      .update({
        device_name: deviceEditForm.device_name.trim(),
        device_name2: deviceEditForm.device_name2.trim() || null,
        option: deviceEditForm.option.trim() || null,
        serial_number: deviceEditForm.serial_number.trim() || null,
        program: deviceEditForm.program,
        install_date: deviceEditForm.install_date || null,
        install_year: null,
        install_engineer: deviceEditForm.install_engineer.trim() || null,
        category: deviceEditForm.category,
      })
      .eq('device_id', selectedDevice.device_id)

    setIsSavingDeviceEdit(false)

    if (error) {
      alert(error.message || '장비 수정 중 오류가 발생했습니다.')
      return
    }

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

    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('device_id', selectedDevice.device_id)

    setIsSavingDeviceEdit(false)

    if (error) {
      alert(error.message || '장비 삭제 중 오류가 발생했습니다.')
      return
    }

    alert('장비가 삭제되었습니다.')
    setIsEditDeviceModalOpen(false)
    setSelectedDevice(null)
    await fetchDetail()
  }

  const handleOpenDeviceImageModal = (device: Device) => {
    setSelectedImageDevice(device)
    setDeviceImageFile(null)
    setIsDeviceImageModalOpen(true)
  }

  const handleUploadDeviceImage = async () => {
    if (!selectedImageDevice) return

    if (!deviceImageFile) {
      alert('이미지 파일을 선택해주세요.')
      return
    }

    setIsSavingDeviceImage(true)

    try {
      const fileExt = deviceImageFile.name.split('.').pop()
      const fileName = `device-${selectedImageDevice.device_id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('device-images')
        .upload(fileName, deviceImageFile, {
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('device-images').getPublicUrl(fileName)
      const publicUrl = data.publicUrl

      const { error: updateError } = await supabase
        .from('devices')
        .update({
          image_url: publicUrl,
        })
        .eq('device_id', selectedImageDevice.device_id)

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

    devices.forEach((d) => {
      map.set(d.device_id, [])
    })

    history.forEach((h) => {
      if (h.device_id == null) return

      const deviceId = Number(h.device_id)
      const arr = map.get(deviceId) || []
      arr.push(h)
      map.set(deviceId, arr)
    })

    return map
  }, [devices, history])

  const iconButtonStyle: CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: WHITE_BUTTON_BG,
    color: WHITE_BUTTON_TEXT,
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  }

  if (loading) {
    return (
      <>
        <style jsx global>{`
          html,
          body {
            background: ${PAGE_BG};
          }
        `}</style>

        <main style={{ padding: 20, background: PAGE_BG, minHeight: '100vh', color: TEXT_PRIMARY }}>

          <p style={{ marginTop: 16 }}>불러오는 중...</p>
        </main>
      </>
    )
  }

  return (
    <>
      <style jsx global>{`
        html,
        body {
          background: ${PAGE_BG};
        }

        input::placeholder,
        textarea::placeholder {
          color: ${TEXT_MUTED};
          opacity: 1;
        }

        select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
        }
      `}</style>

      <main
        style={{
          padding: 20,
          maxWidth: 1400,
          margin: '0 auto',
          background: PAGE_BG,
          minHeight: '100vh',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          {/* 뒤로가기: router.back() 으로 이전 스크롤/위치 유지 */}
          <button
            onClick={() => router.back()}
            style={{
              color: TEXT_PRIMARY,
              background: 'none',
              border: 'none',
              fontWeight: 700,
              fontSize: 18,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← 지도로 돌아가기
          </button>
        </div>

        <div
          style={{
            background: PANEL_BG,
            border: `1px solid ${INPUT_BORDER}`,
            borderRadius: 20,
            padding: 24,
            marginBottom: 22,
            color: TEXT_PRIMARY,
            position: 'relative',
          }}
        >
          <button
            onClick={handleOpenEditCustomerModal}
            style={{
              ...iconButtonStyle,
              position: 'absolute',
              top: 20,
              right: 20,
            }}
          >
            ✏️
          </button>

          <h1 style={{ margin: 0, marginBottom: 18, fontSize: 32, color: TEXT_PRIMARY }}>
            {customer?.company_name ?? '고객 정보 없음'}
          </h1>

          <div style={{ display: 'grid', gap: 10, fontSize: 16, color: TEXT_SECONDARY }}>
            <p style={{ margin: 0 }}>주소: {customer?.address ?? '-'}</p>
            <p style={{ margin: 0 }}>상태: {customer?.status ?? '-'}</p>
            <p style={{ margin: 0 }}>대리점: {customer?.agency ?? '-'}</p>
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <h2 style={{ color: TEXT_PRIMARY, marginBottom: 12, fontSize: 30, fontWeight: 800 }}>담당자</h2>

          <div
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 4,
              alignItems: 'flex-start',
            }}
          >
            {(contacts ?? []).map((c) => {
              const departmentText = c.department?.trim() ? c.department : '부서정보 없음'

              return (
                <div
                  key={c.contact_id}
                  style={{
                    minWidth: 320,
                    maxWidth: 320,
                    background: CARD_BG,
                    borderRadius: 18,
                    padding: 18,
                    color: TEXT_PRIMARY,
                    border: `1px solid ${INPUT_BORDER}`,
                    flex: '0 0 auto',
                    textAlign: 'center',
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={() => handleOpenEditContactModal(c)}
                    style={{
                      ...iconButtonStyle,
                      position: 'absolute',
                      top: 14,
                      right: 14,
                    }}
                  >
                    ✏️
                  </button>

                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 10,
                      color: c.department?.trim() ? TEXT_SECONDARY : TEXT_MUTED,
                    }}
                  >
                    {departmentText}
                  </div>

                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      marginBottom: 10,
                      color: TEXT_PRIMARY,
                    }}
                  >
                    {c.name ?? '-'} {c.position ?? ''}
                  </div>

                  <div style={{ fontSize: 15, color: TEXT_SECONDARY }}>{c.phone ?? '-'}</div>
                </div>
              )
            })}

            <div
              style={{
                minWidth: 320,
                maxWidth: 320,
                minHeight: 156,
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={handleOpenAddContactModal}
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: WHITE_BUTTON_BG,
                  color: WHITE_BUTTON_TEXT,
                  border: `1px solid ${INPUT_BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flex: '0 0 auto',
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <h2 style={{ color: TEXT_PRIMARY, marginBottom: 12, fontSize: 30, fontWeight: 800 }}>장비</h2>

          <div
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 4,
              alignItems: 'flex-start',
            }}
          >
            {(devices ?? []).map((d) => {
              const deviceTitle = `${d.device_name ?? ''} ${d.device_name2 ?? ''} ${d.option ?? ''}`
                .replace(/\s+/g, ' ')
                .trim()
              const deviceHistory = historyByDevice.get(d.device_id) || []

              return (
                <div
                  key={d.device_id}
                  style={{
                    minWidth: 320,
                    maxWidth: 320,
                    background: CARD_BG,
                    borderRadius: 18,
                    padding: 16,
                    color: TEXT_PRIMARY,
                    border: `1px solid ${INPUT_BORDER}`,
                    flex: '0 0 auto',
                    position: 'relative',
                    alignSelf: 'flex-start',
                  }}
                >
                  <button
                    onClick={() => handleOpenEditDeviceModal(d)}
                    style={{
                      ...iconButtonStyle,
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      zIndex: 2,
                    }}
                  >
                    ✏️
                  </button>

                  <div
                    style={{
                      height: 150,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.08)',
                      marginBottom: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {d.image_url ? (
                      <img
                        src={d.image_url}
                        alt={deviceTitle || 'device image'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => handleOpenDeviceImageModal(d)}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          background: WHITE_BUTTON_BG,
                          color: WHITE_BUTTON_TEXT,
                          border: 'none',
                          fontSize: 38,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        +
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      position: 'relative',
                      marginBottom: 10,
                      minHeight: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: TEXT_PRIMARY,
                        textAlign: 'center',
                        width: '100%',
                        padding: '0 8px',
                        boxSizing: 'border-box',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'keep-all',
                      }}
                      title={deviceTitle || '-'}
                    >
                      {deviceTitle || '-'}
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 14,
                      marginBottom: 6,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    S/N : {d.serial_number ?? '-'} &nbsp; | &nbsp; 프로그램 : {d.program ?? '-'}
                  </div>

                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 14,
                      marginBottom: 4,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    설치 엔지니어 : {d.install_engineer ?? '-'}
                  </div>

                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 14,
                      marginBottom: 12,
                      color: TEXT_SECONDARY,
                    }}
                  >
                    납입연월 : {getInstallDisplay(d)}
                  </div>

                  <button
                    onClick={() => handleOpenServiceModal(d.device_id)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: WHITE_BUTTON_BG,
                      color: WHITE_BUTTON_TEXT,
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      marginBottom: 14,
                    }}
                  >
                    서비스 기록 추가
                  </button>

                  <div style={{ display: 'grid', gap: 10 }}>
                    {deviceHistory.length === 0 ? (
                      <div
                        style={{
                          width: '100%',
                          background: INNER_CARD_BG,
                          color: TEXT_PRIMARY,
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 14,
                          border: `1px solid ${INPUT_BORDER}`,
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>서비스 노트</div>
                        <div style={{ marginBottom: 18 }}>{'-'}</div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            gap: 10,
                            fontSize: 12,
                            color: TEXT_MUTED,
                          }}
                        >
                          <div>-</div>
                          <div>방문자 : -</div>
                        </div>
                      </div>
                    ) : (
                      deviceHistory.map((h) => (
                        <div
                          key={`${d.device_id}-${h.service_id}`}
                          style={{
                            width: '100%',
                            background: INNER_CARD_BG,
                            color: TEXT_PRIMARY,
                            borderRadius: 12,
                            padding: 14,
                            fontSize: 14,
                            border: `1px solid ${INPUT_BORDER}`,
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 10,
                              marginBottom: 10,
                            }}
                          >
                            <div style={{ fontWeight: 800 }}>서비스 노트</div>

                            <button
                              onClick={() => handleOpenEditServiceModal(h)}
                              style={{
                                padding: '6px 10px',
                                background: WHITE_BUTTON_BG,
                                color: WHITE_BUTTON_TEXT,
                                borderRadius: 8,
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              수정
                            </button>
                          </div>

                          <div
                            style={{
                              marginBottom: 18,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              lineHeight: 1.5,
                              color: TEXT_PRIMARY,
                            }}
                          >
                            {h.service_notes ?? '-'}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-end',
                              gap: 10,
                              fontSize: 12,
                              color: TEXT_MUTED,
                            }}
                          >
                            <div>{h.visit_date ?? '-'}</div>
                            <div>방문자 : {h.visitor ?? '-'}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}

            <div
              style={{
                minWidth: 320,
                maxWidth: 320,
                minHeight: 520,
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-start',
              }}
            >
              <button
                onClick={handleOpenAddDeviceModal}
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: WHITE_BUTTON_BG,
                  color: WHITE_BUTTON_TEXT,
                  border: `1px solid ${INPUT_BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flex: '0 0 auto',
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {isEditCustomerModalOpen && (
          <div
            onClick={() => setIsEditCustomerModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 620,
                background: CARD_BG,
                borderRadius: 18,
                padding: 20,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                border: `1px solid ${INPUT_BORDER}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>
                업체 정보 수정
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <input
                  value={customerEditForm.company_name}
                  onChange={(e) => setCustomerEditForm((prev) => ({ ...prev, company_name: e.target.value }))}
                  placeholder="업체명(company_name)"
                  style={inputStyle}
                />

                <input
                  value={customerEditForm.address}
                  onChange={(e) => setCustomerEditForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="주소(address)"
                  style={inputStyle}
                />

                <input
                  value={customerEditForm.agency}
                  onChange={(e) => setCustomerEditForm((prev) => ({ ...prev, agency: e.target.value }))}
                  placeholder="대리점(agency)"
                  style={inputStyle}
                />

                <select
                  value={customerEditForm.status}
                  onChange={(e) => setCustomerEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="활성">상태: 활성</option>
                  <option value="잠재">상태: 잠재</option>
                  <option value="이탈">상태: 이탈</option>
                </select>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={handleDeleteCustomer}
                  disabled={isDeletingCustomer}
                  style={{
                    padding: '10px 14px',
                    background: DANGER_BG,
                    color: '#fff',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    opacity: isDeletingCustomer ? 0.7 : 1,
                  }}
                >
                  {isDeletingCustomer ? '삭제 중...' : '삭제'}
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setIsEditCustomerModalOpen(false)}
                    style={{
                      padding: '10px 14px',
                      background: PANEL_BG,
                      color: TEXT_PRIMARY,
                      borderRadius: 10,
                      border: `1px solid ${INPUT_BORDER}`,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    취소
                  </button>

                  <button
                    onClick={handleUpdateCustomer}
                    disabled={isSavingCustomerEdit}
                    style={{
                      padding: '10px 14px',
                      background: WHITE_BUTTON_BG,
                      color: WHITE_BUTTON_TEXT,
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      opacity: isSavingCustomerEdit ? 0.7 : 1,
                    }}
                  >
                    {isSavingCustomerEdit ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAddContactModalOpen && (
          <div
            onClick={() => setIsAddContactModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 560,
                background: CARD_BG,
                borderRadius: 18,
                padding: 20,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                border: `1px solid ${INPUT_BORDER}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>
                담당자 추가
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <input
                  value={contactForm.name}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="이름(name)"
                  style={inputStyle}
                />
                <input
                  value={contactForm.department}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder="부서(department)"
                  style={inputStyle}
                />
                <input
                  value={contactForm.position}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, position: e.target.value }))}
                  placeholder="직책(position)"
                  style={inputStyle}
                />
                <input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="전화번호(phone)"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setIsAddContactModalOpen(false)}
                  style={{
                    padding: '10px 14px',
                    background: PANEL_BG,
                    color: TEXT_PRIMARY,
                    borderRadius: 10,
                    border: `1px solid ${INPUT_BORDER}`,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  취소
                </button>

                <button
                  onClick={handleAddContact}
                  disabled={isSavingContact}
                  style={{
                    padding: '10px 14px',
                    background: WHITE_BUTTON_BG,
                    color: WHITE_BUTTON_TEXT,
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    opacity: isSavingContact ? 0.7 : 1,
                  }}
                >
                  {isSavingContact ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditContactModalOpen && (
          <div
            onClick={() => {
              setIsEditContactModalOpen(false)
              setSelectedContact(null)
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 560,
                background: CARD_BG,
                borderRadius: 18,
                padding: 20,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                border: `1px solid ${INPUT_BORDER}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>
                담당자 수정
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <input
                  value={contactEditForm.name}
                  onChange={(e) => setContactEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="이름(name)"
                  style={inputStyle}
                />
                <input
                  value={contactEditForm.department}
                  onChange={(e) => setContactEditForm((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder="부서(department)"
                  style={inputStyle}
                />
                <input
                  value={contactEditForm.position}
                  onChange={(e) => setContactEditForm((prev) => ({ ...prev, position: e.target.value }))}
                  placeholder="직책(position)"
                  style={inputStyle}
                />
                <input
                  value={contactEditForm.phone}
                  onChange={(e) => setContactEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="전화번호(phone)"
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={handleDeleteContact}
                  disabled={isSavingContactEdit}
                  style={{
                    padding: '10px 14px',
                    background: DANGER_BG,
                    color: '#fff',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    opacity: isSavingContactEdit ? 0.7 : 1,
                  }}
                >
                  삭제
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => {
                      setIsEditContactModalOpen(false)
                      setSelectedContact(null)
                    }}
                    style={{
                      padding: '10px 14px',
                      background: PANEL_BG,
                      color: TEXT_PRIMARY,
                      borderRadius: 10,
                      border: `1px solid ${INPUT_BORDER}`,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    취소
                  </button>

                  <button
                    onClick={handleUpdateContact}
                    disabled={isSavingContactEdit}
                    style={{
                      padding: '10px 14px',
                      background: WHITE_BUTTON_BG,
                      color: WHITE_BUTTON_TEXT,
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      opacity: isSavingContactEdit ? 0.7 : 1,
                    }}
                  >
                    {isSavingContactEdit ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAddDeviceModalOpen && (
          <div
            onClick={() => setIsAddDeviceModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 760,
                background: CARD_BG,
                borderRadius: 18,
                padding: 20,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                border: `1px solid ${INPUT_BORDER}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>
                장비 추가
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <input
                    value={deviceForm.device_name}
                    onChange={(e) => setDeviceForm((prev) => ({ ...prev, device_name: e.target.value }))}
                    placeholder="장비 라인업(ex. SURFCOM)"
                    style={{ ...inputStyle, fontSize: 12 }}
                  />
                  <input
                    value={deviceForm.device_name2}
                    onChange={(e) => setDeviceForm((prev) => ({ ...prev, device_name2: e.target.value }))}
                    placeholder="장비 모델명(ex. 1600D)"
                    style={{ ...inputStyle, fontSize: 12 }}
                  />
                  <input
                    value={deviceForm.option}
                    onChange={(e) => setDeviceForm((prev) => ({ ...prev, option: e.target.value }))}
                    placeholder="옵션(ex. -12)"
                    style={{ ...inputStyle, fontSize: 12 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    value={deviceForm.serial_number}
                    onChange={(e) => setDeviceForm((prev) => ({ ...prev, serial_number: e.target.value }))}
                    placeholder="시리얼넘버(serial_number)"
                    style={inputStyle}
                  />
                  <select
                    value={deviceForm.program}
                    onChange={(e) => setDeviceForm((prev) => ({ ...prev, program: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="ACCTee">프로그램: ACCTee</option>
                    <option value="Tims">프로그램: Tims</option>
                    <option value="CALYPSO">프로그램: CALYPSO</option>
                    <option value="없음">프로그램: 없음</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    type="date"
                    value={deviceForm.install_date}
                    onChange={(e) => setDeviceForm((prev) => ({ ...prev, install_date: e.target.value }))}
                    style={dateInputStyle}
                  />
                  <select
                    value={deviceForm.category}
                    onChange={(e) => setDeviceForm((prev) => ({ ...prev, category: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="20">구분: 20</option>
                    <option value="81">구분: 81</option>
                    <option value="83">구분: 83</option>
                    <option value="84">구분: 84</option>
                  </select>
                </div>

                <input
                  value={deviceForm.install_engineer}
                  onChange={(e) => setDeviceForm((prev) => ({ ...prev, install_engineer: e.target.value }))}
                  placeholder="설치 엔지니어(install_engineer)"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setIsAddDeviceModalOpen(false)}
                  style={{
                    padding: '10px 14px',
                    background: PANEL_BG,
                    color: TEXT_PRIMARY,
                    borderRadius: 10,
                    border: `1px solid ${INPUT_BORDER}`,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  취소
                </button>

                <button
                  onClick={handleAddDevice}
                  disabled={isSavingDevice}
                  style={{
                    padding: '10px 14px',
                    background: WHITE_BUTTON_BG,
                    color: WHITE_BUTTON_TEXT,
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    opacity: isSavingDevice ? 0.7 : 1,
                  }}
                >
                  {isSavingDevice ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditDeviceModalOpen && (
          <div
            onClick={() => {
              setIsEditDeviceModalOpen(false)
              setSelectedDevice(null)
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 760,
                background: CARD_BG,
                borderRadius: 18,
                padding: 20,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                border: `1px solid ${INPUT_BORDER}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>
                장비 수정
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <input
                    value={deviceEditForm.device_name}
                    onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, device_name: e.target.value }))}
                    placeholder="장비 라인업(ex. SURFCOM)"
                    style={{ ...inputStyle, fontSize: 12 }}
                  />
                  <input
                    value={deviceEditForm.device_name2}
                    onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, device_name2: e.target.value }))}
                    placeholder="장비 모델명(ex. 1600D)"
                    style={{ ...inputStyle, fontSize: 12 }}
                  />
                  <input
                    value={deviceEditForm.option}
                    onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, option: e.target.value }))}
                    placeholder="옵션(ex. -12)"
                    style={{ ...inputStyle, fontSize: 12 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    value={deviceEditForm.serial_number}
                    onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, serial_number: e.target.value }))}
                    placeholder="시리얼넘버(serial_number)"
                    style={inputStyle}
                  />
                  <select
                    value={deviceEditForm.program}
                    onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, program: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="ACCTee">프로그램: ACCTee</option>
                    <option value="Tims">프로그램: Tims</option>
                    <option value="CALYPSO">프로그램: CALYPSO</option>
                    <option value="없음">프로그램: 없음</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    type="date"
                    value={deviceEditForm.install_date}
                    onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, install_date: e.target.value }))}
                    style={dateInputStyle}
                  />
                  <select
                    value={deviceEditForm.category}
                    onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="20">구분: 20</option>
                    <option value="81">구분: 81</option>
                    <option value="83">구분: 83</option>
                    <option value="84">구분: 84</option>
                  </select>
                </div>

                <input
                  value={deviceEditForm.install_engineer}
                  onChange={(e) => setDeviceEditForm((prev) => ({ ...prev, install_engineer: e.target.value }))}
                  placeholder="설치 엔지니어(install_engineer)"
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={handleDeleteDevice}
                  disabled={isSavingDeviceEdit}
                  style={{
                    padding: '10px 14px',
                    background: DANGER_BG,
                    color: '#fff',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    opacity: isSavingDeviceEdit ? 0.7 : 1,
                  }}
                >
                  삭제
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => {
                      setIsEditDeviceModalOpen(false)
                      setSelectedDevice(null)
                    }}
                    style={{
                      padding: '10px 14px',
                      background: PANEL_BG,
                      color: TEXT_PRIMARY,
                      borderRadius: 10,
                      border: `1px solid ${INPUT_BORDER}`,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    취소
                  </button>

                  <button
                    onClick={handleUpdateDevice}
                    disabled={isSavingDeviceEdit}
                    style={{
                      padding: '10px 14px',
                      background: WHITE_BUTTON_BG,
                      color: WHITE_BUTTON_TEXT,
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      opacity: isSavingDeviceEdit ? 0.7 : 1,
                    }}
                  >
                    {isSavingDeviceEdit ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isServiceModalOpen && (
          <div
            onClick={() => {
              setIsServiceModalOpen(false)
              setSelectedDeviceId(null)
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 620,
                background: CARD_BG,
                borderRadius: 18,
                padding: 20,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                border: `1px solid ${INPUT_BORDER}`,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: TEXT_PRIMARY }}>
                서비스 기록 추가
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <textarea
                  value={serviceForm.service_notes}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      service_notes: e.target.value,
                    }))
                  }
                  placeholder="service_notes"
                  rows={10}
                  style={textareaStyle}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input
                    type="date"
                    value={serviceForm.visit_date}
                    onChange={(e) =>
                      setServiceForm((prev) => ({
                        ...prev,
                        visit_date: e.target.value,
                      }))
                    }
                    style={dateInputStyle}
                  />

                  <input
                    value={serviceForm.visitor}
                    onChange={(e) =>
                      setServiceForm((prev) => ({
                        ...prev,
                        visitor: e.target.value,
                      }))
                    }
                    placeholder="방문자(visitor)"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => {
                    setIsServiceModalOpen(false)
                    setSelectedDeviceId(null)
                  }}
                  style={{
                    padding: '10px 14px',
                    background: PANEL_BG,
                    color: TEXT_PRIMARY,
                    borderRadius: 10,
                    border: `1px solid ${INPUT_BORDER}`,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  취소
                </button>

                <button
                  onClick={handleAddService}
                  disabled={isSavingService}
                  style={{
                    padding: '10px 14px',
                    background: WHITE_BUTTON_BG,
                    color: WHITE_BUTTON_TEXT,
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    opacity: isSavingService ? 0.7 : 1,
                  }}
                >
                  {isSavingService ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditServiceModalOpen && (
          <div
            onClick={() => {
              setIsEditServiceModalOpen(false)
              setSelectedService(null)
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 620,
                background: CARD_BG,
                borderRadius: 18,
                padding: 20,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                border: `1px solid ${INPUT_BORDER}`,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: TEXT_PRIMARY }}>
                서비스 기록 수정
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <textarea
                  value={serviceEditForm.service_notes}
                  onChange={(e) =>
                    setServiceEditForm((prev) => ({
                      ...prev,
                      service_notes: e.target.value,
                    }))
                  }
                  placeholder="service_notes"
                  rows={10}
                  style={textareaStyle}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input
                    type="date"
                    value={serviceEditForm.visit_date}
                    onChange={(e) =>
                      setServiceEditForm((prev) => ({
                        ...prev,
                        visit_date: e.target.value,
                      }))
                    }
                    style={dateInputStyle}
                  />

                  <input
                    value={serviceEditForm.visitor}
                    onChange={(e) =>
                      setServiceEditForm((prev) => ({
                        ...prev,
                        visitor: e.target.value,
                      }))
                    }
                    placeholder="방문자(visitor)"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={handleDeleteService}
                  disabled={isSavingServiceEdit}
                  style={{
                    padding: '10px 14px',
                    background: DANGER_BG,
                    color: '#fff',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    opacity: isSavingServiceEdit ? 0.7 : 1,
                  }}
                >
                  삭제
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => {
                      setIsEditServiceModalOpen(false)
                      setSelectedService(null)
                    }}
                    style={{
                      padding: '10px 14px',
                      background: PANEL_BG,
                      color: TEXT_PRIMARY,
                      borderRadius: 10,
                      border: `1px solid ${INPUT_BORDER}`,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    취소
                  </button>

                  <button
                    onClick={handleUpdateService}
                    disabled={isSavingServiceEdit}
                    style={{
                      padding: '10px 14px',
                      background: WHITE_BUTTON_BG,
                      color: WHITE_BUTTON_TEXT,
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      opacity: isSavingServiceEdit ? 0.7 : 1,
                    }}
                  >
                    {isSavingServiceEdit ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isDeviceImageModalOpen && (
          <div
            onClick={() => {
              setIsDeviceImageModalOpen(false)
              setSelectedImageDevice(null)
              setDeviceImageFile(null)
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 520,
                background: CARD_BG,
                borderRadius: 18,
                padding: 20,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                border: `1px solid ${INPUT_BORDER}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>
                장비 사진 추가
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setDeviceImageFile(file)
                }}
                style={inputStyle}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => {
                    setIsDeviceImageModalOpen(false)
                    setSelectedImageDevice(null)
                    setDeviceImageFile(null)
                  }}
                  style={{
                    padding: '10px 14px',
                    background: PANEL_BG,
                    color: TEXT_PRIMARY,
                    borderRadius: 10,
                    border: `1px solid ${INPUT_BORDER}`,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  취소
                </button>

                <button
                  onClick={handleUploadDeviceImage}
                  disabled={isSavingDeviceImage}
                  style={{
                    padding: '10px 14px',
                    background: WHITE_BUTTON_BG,
                    color: WHITE_BUTTON_TEXT,
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    opacity: isSavingDeviceImage ? 0.7 : 1,
                  }}
                >
                  {isSavingDeviceImage ? '업로드 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
