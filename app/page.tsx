'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { loadKakaoMap } from '@/lib/loadKakaoMap'
import { createClient } from '@/lib/supabase/client'

type Customer = {
  customer_id: number
  company_name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  status: string | null
  agency: string | null
}

type Device = {
  device_id?: number
  customer_id: number
  device_name: string | null
  device_name2: string | null
  option: string | null
  serial_number: string | null
  program: string | null
  install_date: string | null
  install_engineer: string | null
  category: string | null
  packing_list_url: string | null
}

type Contact = {
  contact_id?: number
  customer_id?: number
  name: string
  department: string
  position: string
  phone: string
}

type ServiceHistory = {
  customer_id: number
  visit_date: string | null
}

type NewDeviceForm = {
  device_name: string
  device_name2: string
  option: string
  serial_number: string
  program: string
  install_date: string
  install_engineer: string
  category: string
  packing_file: File | null
}

const HOME_STATE_KEY = 'customer-map-home-state-v2'

const PAGE_BG = '#06070a'
const PANEL_BG = '#17181d'
const CARD_BG = '#1c1d22'
const INPUT_BG = '#0d0e12'
const INPUT_BORDER = '#2c2f36'
const TEXT_PRIMARY = '#f5f5f5'
const TEXT_SECONDARY = '#b5b7be'
const TEXT_MUTED = '#7d818c'
const WHITE_BUTTON_BG = '#f4f4f5'
const WHITE_BUTTON_TEXT = '#111113'
const RADIUS = 12


const BASE_LAT = 35.55424
const BASE_LNG = 129.35841
const BASE_NAME = '울산광역시 북구 명촌 7길 30'

const inputStyle: CSSProperties = {
  width: '100%',
  padding: 12,
  border: `1px solid ${INPUT_BORDER}`,
  borderRadius: 10,
  background: INPUT_BG,
  color: TEXT_PRIMARY,
  boxSizing: 'border-box',
  outline: 'none',
}

// date input with white calendar icon
const dateInputStyle: CSSProperties = {
  ...inputStyle,
  background: INPUT_BG,     // ← 테마 맞춤
  color: TEXT_PRIMARY,
  colorScheme: 'dark',      // ← 핵심 (아이콘 흰색됨)
}

const sectionCardStyle: CSSProperties = {
  border: `1px solid ${INPUT_BORDER}`,
  borderRadius: 16,
  padding: 16,
  background: PANEL_BG,
}

function createEmptyDeviceForm(): NewDeviceForm {
  return {
    device_name: '',
    device_name2: '',
    option: '',
    serial_number: '',
    program: 'ACCTee',
    install_date: '',
    install_engineer: '',
    category: '20',
    packing_file: null,
  }
}

function getDeviceLines(devices: Device[]): string[] {
  if (!devices || devices.length === 0) return ['-']

  return devices
    .map((d) => {
      const name = `${d.device_name ?? ''}${d.device_name2 ?? ''}${d.option ?? ''}`.trim()
      const program = d.program ? `(${d.program})` : ''
      const combined = `${name}${program}`.trim()
      return combined
    })
    .filter(Boolean)
}

function getDeviceLine(devices: Device[]): string {
  return getDeviceLines(devices).join(' / ')
}

function toTimeValue(value: string | null | undefined): number {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isNaN(time) ? 0 : time
}

export default function HomePage() {
  const supabase = createClient()

  const mapRef = useRef<HTMLDivElement | null>(null)
  const listScrollRef = useRef<HTMLDivElement | null>(null)
const clustererRef = useRef<any>(null)
  const kakaoMapRef = useRef<any>(null)
  const markerMapRef = useRef<Map<number, any>>(new Map())
  const infoWindowMapRef = useRef<Map<number, any>>(new Map())
  const openInfoWindowRef = useRef<{ id: number; iw: any } | null>(null)
 
  const restoredHomeStateRef = useRef(false)
  const pendingMapStateRef = useRef<{ lat: number; lng: number; level: number } | null>(null)
  const pendingListScrollTopRef = useRef<number | null>(null)
const [isMapReady, setIsMapReady] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [deviceMap, setDeviceMap] = useState<Map<number, Device[]>>(new Map())
  const [latestServiceDateMap, setLatestServiceDateMap] = useState<Map<number, number>>(new Map())

  const [query, setQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['활성', '잠재', '이탈'])

  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false)
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)

  const [customerForm, setCustomerForm] = useState({
    company_name: '',
    address: '',
    agency: '',
    status: '활성',
  })

  const [contactForm, setContactForm] = useState<Contact>({
    name: '',
    department: '',
    position: '',
    phone: '',
  })

  const [deviceForms, setDeviceForms] = useState<NewDeviceForm[]>([createEmptyDeviceForm()])

  const saveHomeState = () => {
    if (typeof window === 'undefined') return

    let mapState: { lat: number; lng: number; level: number } | null = null

    if (kakaoMapRef.current) {
      const center = kakaoMapRef.current.getCenter()
      mapState = {
        lat: center.getLat(),
        lng: center.getLng(),
        level: kakaoMapRef.current.getLevel(),
      }
    }

    const payload = {
      query,
      selectedStatuses,
      listScrollTop: listScrollRef.current?.scrollTop ?? 0,
      mapState,
    }

    sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify(payload))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const raw = sessionStorage.getItem(HOME_STATE_KEY)
    if (!raw) {
      restoredHomeStateRef.current = true
      return
    }

    try {
      const parsed = JSON.parse(raw)

      if (typeof parsed.query === 'string') {
        setQuery(parsed.query)
      }

      if (
        Array.isArray(parsed.selectedStatuses) &&
        parsed.selectedStatuses.every((item: unknown) => typeof item === 'string')
      ) {
        setSelectedStatuses(parsed.selectedStatuses)
      }

      if (
        parsed.mapState &&
        typeof parsed.mapState.lat === 'number' &&
        typeof parsed.mapState.lng === 'number' &&
        typeof parsed.mapState.level === 'number'
      ) {
        pendingMapStateRef.current = parsed.mapState
      }

      if (typeof parsed.listScrollTop === 'number') {
        pendingListScrollTopRef.current = parsed.listScrollTop
      }
    } catch (error) {
      console.warn('홈 상태 복원 실패:', error)
    } finally {
      restoredHomeStateRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!restoredHomeStateRef.current) return
    saveHomeState()
  }, [query, selectedStatuses])

  const resetForms = () => {
    setCustomerForm({
      company_name: '',
      address: '',
      agency: '',
      status: '활성',
    })

    setContactForm({
      name: '',
      department: '',
      position: '',
      phone: '',
    })

    setDeviceForms([createEmptyDeviceForm()])
  }

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status)
      }
      return [...prev, status]
    })
  }

  const updateDeviceForm = (
    index: number,
    field: keyof NewDeviceForm,
    value: string | File | null
  ) => {
    setDeviceForms((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return {
          ...item,
          [field]: value,
        }
      })
    )
  }

  const addDeviceFormCard = () => {
    setDeviceForms((prev) => [...prev, createEmptyDeviceForm()])
  }

  const removeDeviceFormCard = (index: number) => {
    setDeviceForms((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  const fetchData = async () => {
    const [customerRes, deviceRes, historyRes] = await Promise.all([
      supabase
        .from('customers')
        .select('customer_id, company_name, address, latitude, longitude, status, agency')
        .order('customer_id', { ascending: false })
        .range(0, 5000),

      supabase
        .from('devices')
        .select(
          'device_id, customer_id, device_name, device_name2, option, serial_number, program, install_date, install_engineer, category, packing_list_url'
        )
        .range(0, 5000),

      supabase.from('service_history').select('customer_id, visit_date').range(0, 5000),
    ])

    if (customerRes.error) {
      console.warn('customers 조회 오류:', customerRes.error)
    } else {
      const normalizedCustomers: Customer[] = (customerRes.data || []).map((c: any) => ({
        customer_id: Number(c.customer_id),
        company_name: c.company_name ?? '',
        address: c.address ?? null,
        latitude: c.latitude == null ? null : Number(c.latitude),
        longitude: c.longitude == null ? null : Number(c.longitude),
        status: c.status ?? null,
        agency: c.agency ?? null,
      }))
      setCustomers(normalizedCustomers)
    }

    if (deviceRes.error) {
      console.warn('devices 조회 오류:', deviceRes.error)
    } else {
      const map = new Map<number, Device[]>()

      ;(deviceRes.data || []).forEach((d: any) => {
        const customerId = Number(d.customer_id)
        if (Number.isNaN(customerId)) return

        const normalizedDevice: Device = {
          device_id: d.device_id ? Number(d.device_id) : undefined,
          customer_id: customerId,
          device_name: d.device_name ?? null,
          device_name2: d.device_name2 ?? null,
          option: d.option ?? null,
          serial_number: d.serial_number ?? null,
          program: d.program ?? null,
          install_date: d.install_date ?? null,
          install_engineer: d.install_engineer ?? null,
          category: d.category ?? null,
          packing_list_url: d.packing_list_url ?? null,
        }

        const existing = map.get(customerId) || []
        existing.push(normalizedDevice)
        map.set(customerId, existing)
      })

      setDeviceMap(map)
    }

    if (historyRes.error) {
      console.warn('service_history 조회 오류:', historyRes.error)
    } else {
      const map = new Map<number, number>()

      ;(historyRes.data as ServiceHistory[] | null)?.forEach((item) => {
        const customerId = Number(item.customer_id)
        if (Number.isNaN(customerId)) return

        const current = map.get(customerId) ?? 0
        const nextValue = toTimeValue(item.visit_date)

        if (nextValue > current) {
          map.set(customerId, nextValue)
        }
      })

      setLatestServiceDateMap(map)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase()

    const filtered = customers.filter((c) => {
      const statusMatched =
        selectedStatuses.length === 0 ? false : selectedStatuses.includes(c.status ?? '')

      if (!statusMatched) return false

      const devices = deviceMap.get(Number(c.customer_id)) || []
      const deviceLine = getDeviceLine(devices).toLowerCase()

      if (!q) return true

      return (
        (c.company_name || '').toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q) ||
        (c.status || '').toLowerCase().includes(q) ||
        (c.agency || '').toLowerCase().includes(q) ||
        deviceLine.includes(q)
      )
    })

    return [...filtered].sort((a, b) => {
      const aDevices = deviceMap.get(a.customer_id) || []
      const bDevices = deviceMap.get(b.customer_id) || []

      const aLatestDevice = Math.max(0, ...aDevices.map((d) => toTimeValue(d.install_date)))
      const bLatestDevice = Math.max(0, ...bDevices.map((d) => toTimeValue(d.install_date)))

      const aLatestService = latestServiceDateMap.get(a.customer_id) ?? 0
      const bLatestService = latestServiceDateMap.get(b.customer_id) ?? 0

      const aLatest = Math.max(aLatestDevice, aLatestService, a.customer_id)
      const bLatest = Math.max(bLatestDevice, bLatestService, b.customer_id)

      return bLatest - aLatest
    })
  }, [customers, query, selectedStatuses, deviceMap, latestServiceDateMap])

  useEffect(() => {
    if (pendingListScrollTopRef.current == null) return
    if (!listScrollRef.current) return

    requestAnimationFrame(() => {
      if (!listScrollRef.current) return
      listScrollRef.current.scrollTop = pendingListScrollTopRef.current ?? 0
      pendingListScrollTopRef.current = null
    })
  }, [filteredCustomers])

useEffect(() => {
  let mounted = true

  async function initMap() {
    if (!mapRef.current) return

    const kakao = await loadKakaoMap()
    if (!mounted) return

    if (!kakaoMapRef.current) {
      const initialMapState = pendingMapStateRef.current

      kakaoMapRef.current = new kakao.maps.Map(mapRef.current, {
        center: initialMapState
          ? new kakao.maps.LatLng(initialMapState.lat, initialMapState.lng)
          : new kakao.maps.LatLng(36.5, 127.8),
        level: initialMapState?.level ?? 13,
      })

      kakao.maps.event.addListener(kakaoMapRef.current, 'click', () => {
        if (openInfoWindowRef.current) {
          openInfoWindowRef.current.iw.setMap(null)
          openInfoWindowRef.current = null
        }
      })
    }

    setIsMapReady(true)
  }

  initMap()

  return () => {
    mounted = false
  }
}, [])
useEffect(() => {
  if (!isMapReady || !kakaoMapRef.current) return

  let cancelled = false

  async function renderMarkers() {
    const kakao = await loadKakaoMap()
    if (cancelled) return

    const map = kakaoMapRef.current
    if (!map) return

    // 기존 열린 오버레이 닫기
    if (openInfoWindowRef.current) {
      openInfoWindowRef.current.iw.setMap(null)
      openInfoWindowRef.current = null
    }

    // 기존 마커 제거
    markerMapRef.current.forEach((marker) => marker.setMap(null))
    markerMapRef.current.clear()

    // 기존 오버레이 제거
    infoWindowMapRef.current.forEach((iw) => iw.setMap(null))
    infoWindowMapRef.current.clear()

    // 기존 클러스터 제거
    if (clustererRef.current) {
      clustererRef.current.clear()
    }

    const markers: any[] = []

    filteredCustomers.forEach((c) => {
      if (c.latitude == null || c.longitude == null) return

      const lat = Number(c.latitude)
      const lng = Number(c.longitude)

      if (Number.isNaN(lat) || Number.isNaN(lng)) return

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
      })

      const devices = deviceMap.get(Number(c.customer_id)) || []
      const deviceLines = getDeviceLines(devices)

      const navUrl = `https://map.naver.com/p/directions/${BASE_LNG},${BASE_LAT},${encodeURIComponent(BASE_NAME)}/${lng},${lat},${encodeURIComponent(c.company_name)}/-/car`

      const overlayContent = document.createElement('div')
      overlayContent.addEventListener('click', (e) => e.stopPropagation())
      overlayContent.addEventListener('mousedown', (e) => e.stopPropagation())

      overlayContent.innerHTML = `
        <div style="
          width:320px;
          padding:16px;
          background:${CARD_BG};
          color:${TEXT_PRIMARY};
          border-radius:14px;
          border:1px solid ${INPUT_BORDER};
          font-size:13px;
          line-height:1.6;
          box-sizing:border-box;
          word-break:break-word;
          box-shadow:0 12px 30px rgba(0,0,0,0.5);
          text-align:center;
          position:relative;
        ">
          <div style="font-weight:700; font-size:15px; margin-bottom:8px; text-align:center; color:${TEXT_PRIMARY};">
            ${c.company_name} <span style="font-weight:400; font-size:12px; color:${TEXT_SECONDARY};">(${c.status ?? '-'})</span>
          </div>
          <div style="font-size:12px; color:${TEXT_SECONDARY}; margin-bottom:6px; text-align:center;">
            📍 ${c.address ?? '-'}
          </div>
          <div style="font-size:12px; color:${TEXT_SECONDARY}; margin-bottom:6px; text-align:center;">
            대리점: ${c.agency ?? '-'}
          </div>
          <div style="font-size:12px; color:${TEXT_PRIMARY}; margin-bottom:14px; text-align:center;">
            ${deviceLines.join('<br/>')}
          </div>
          <div style="display:flex; gap:10px;">
            <a href="/customer/${c.customer_id}"
               style="
                 flex:1;
                 text-align:center;
                 padding:9px 10px;
                 background:${WHITE_BUTTON_BG};
                 color:${WHITE_BUTTON_TEXT};
                 border-radius:10px;
                 font-size:13px;
                 text-decoration:none;
                 font-weight:700;
               ">
              상세보기
            </a>
            <a href="${navUrl}"
               target="_blank"
               rel="noopener noreferrer"
               style="
                 flex:1;
                 text-align:center;
                 padding:9px 10px;
                 background:#2a2d34;
                 color:${TEXT_PRIMARY};
                 border-radius:10px;
                 font-size:13px;
                 text-decoration:none;
                 font-weight:700;
                 border:1px solid ${INPUT_BORDER};
               ">
              네이버 길 안내
            </a>
          </div>
        </div>
      `

      const customOverlay = new kakao.maps.CustomOverlay({
        content: overlayContent,
        position: new kakao.maps.LatLng(lat, lng),
        yAnchor: 1.25,
        zIndex: 3,
      })

      kakao.maps.event.addListener(marker, 'click', () => {
        if (openInfoWindowRef.current?.id === c.customer_id) {
          openInfoWindowRef.current.iw.setMap(null)
          openInfoWindowRef.current = null
          return
        }

        if (openInfoWindowRef.current) {
          openInfoWindowRef.current.iw.setMap(null)
        }

        customOverlay.setMap(map)
        openInfoWindowRef.current = { id: c.customer_id, iw: customOverlay }
      })

      markerMapRef.current.set(c.customer_id, marker)
      infoWindowMapRef.current.set(c.customer_id, customOverlay)
      markers.push(marker)
    })

    if ((window as any).kakao?.maps?.MarkerClusterer) {
      if (!clustererRef.current) {
        clustererRef.current = new kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 7,
          disableClickZoom: false,
          markers: [],
          styles: [
            {
              width: '48px',
              height: '48px',
              background: 'rgba(255,255,255,0.82)',
              color: '#111113',
              textAlign: 'center',
              lineHeight: '48px',
              borderRadius: '50%',
              fontSize: '14px',
              fontWeight: '700',
              border: '1px solid rgba(255,255,255,0.95)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
            },
            {
              width: '56px',
              height: '56px',
              background: 'rgba(245,245,245,0.88)',
              color: '#111113',
              textAlign: 'center',
              lineHeight: '56px',
              borderRadius: '50%',
              fontSize: '15px',
              fontWeight: '700',
              border: '1px solid rgba(255,255,255,0.95)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
            },
            {
              width: '64px',
              height: '64px',
              background: 'rgba(230,230,230,0.9)',
              color: '#111113',
              textAlign: 'center',
              lineHeight: '64px',
              borderRadius: '50%',
              fontSize: '16px',
              fontWeight: '700',
              border: '1px solid rgba(255,255,255,0.95)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
            },
          ],
        })
      }

      clustererRef.current.clear()
      clustererRef.current.addMarkers(markers)
    } else {
      markers.forEach((marker) => marker.setMap(map))
    }
  }

  renderMarkers()

  return () => {
    cancelled = true
  }
}, [isMapReady, filteredCustomers, deviceMap])
  const moveToCustomer = async (customer: Customer) => {
    if (
      customer.latitude == null ||
      customer.longitude == null ||
      !kakaoMapRef.current
    ) {
      return
    }

    const kakao = await loadKakaoMap()
    const map = kakaoMapRef.current
    const lat = Number(customer.latitude)
    const lng = Number(customer.longitude)

    if (Number.isNaN(lat) || Number.isNaN(lng)) return

    const position = new kakao.maps.LatLng(lat, lng)

    if (openInfoWindowRef.current) {
      openInfoWindowRef.current.iw.setMap(null)
      openInfoWindowRef.current = null
    }

    map.panTo(position)

    const startLevel = map.getLevel()
    const endLevel = 4
    const duration = 1200
    const startTime = performance.now()

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const marker = markerMapRef.current.get(customer.customer_id)
    const customOverlay = infoWindowMapRef.current.get(customer.customer_id)

    const animateZoom = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)
      const currentLevel = startLevel + (endLevel - startLevel) * eased

      map.setLevel(Math.round(currentLevel), { anchor: position })

      if (progress < 1) {
        requestAnimationFrame(animateZoom)
      } else {
        if (marker && customOverlay) {
          customOverlay.setMap(map)
          openInfoWindowRef.current = { id: customer.customer_id, iw: customOverlay }
        }
      }
    }

    requestAnimationFrame(animateZoom)
  }

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

  const uploadPackingList = async (file: File, customerId: number, index: number) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `customer-${customerId}-device-${index + 1}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('packing-lists')
      .upload(fileName, file, {
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('packing-lists').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleAddCustomer = async () => {
    if (!customerForm.company_name.trim()) {
      alert('업체명을 입력해주세요.')
      return
    }

    if (!customerForm.address.trim()) {
      alert('주소를 입력해주세요.')
      return
    }

    if (!contactForm.name.trim()) {
      alert('담당자 이름을 입력해주세요.')
      return
    }

    if (deviceForms.length === 0) {
      alert('장비 정보를 최소 1개 입력해주세요.')
      return
    }

    for (const device of deviceForms) {
      if (!device.device_name.trim()) {
        alert('장비 라인업을 입력해주세요.')
        return
      }
    }

    setIsSavingCustomer(true)

    let insertedCustomerId = 0

    try {
      const coords = await geocodeAddress(customerForm.address.trim())

      const { data: insertedCustomer, error: customerError } = await supabase
        .from('customers')
        .insert([
          {
            company_name: customerForm.company_name.trim(),
            address: customerForm.address.trim(),
            agency: customerForm.agency.trim() || null,
            status: customerForm.status,
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        ])
        .select('customer_id')
        .single()

      if (customerError || !insertedCustomer) {
        throw customerError || new Error('customers 저장 실패')
      }

      insertedCustomerId = insertedCustomer.customer_id

      const devicePayload = []

      for (let i = 0; i < deviceForms.length; i += 1) {
        const d = deviceForms[i]
        let packingUrl: string | null = null

        if (d.packing_file) {
          packingUrl = await uploadPackingList(d.packing_file, insertedCustomerId, i)
        }

        devicePayload.push({
          customer_id: insertedCustomerId,
          device_name: d.device_name.trim(),
          device_name2: d.device_name2.trim() || null,
          option: d.option.trim() || null,
          serial_number: d.serial_number.trim() || null,
          program: d.program,
          install_date: d.install_date || null,
          install_engineer: d.install_engineer.trim() || null,
          category: d.category,
          packing_list_url: packingUrl,
        })
      }

      const { error: deviceError } = await supabase.from('devices').insert(devicePayload)

      if (deviceError) throw deviceError

      const { error: contactError } = await supabase.from('contacts').insert([
        {
          customer_id: insertedCustomerId,
          name: contactForm.name.trim(),
          department: contactForm.department.trim() || null,
          position: contactForm.position.trim() || null,
          phone: contactForm.phone.trim() || null,
        },
      ])

      if (contactError) throw contactError

      alert('업체가 추가되었습니다.')

      resetForms()
      setIsAddCustomerModalOpen(false)
      setQuery('')

      await fetchData()
    } catch (error: any) {
      console.error('업체 추가 실제 에러:', error)

      if (insertedCustomerId) {
        await supabase.from('customers').delete().eq('customer_id', insertedCustomerId)
      }

      alert(typeof error?.message === 'string' ? error.message : JSON.stringify(error))
    } finally {
      setIsSavingCustomer(false)
    }
  }

  const controlButtonStyle = (active: boolean): CSSProperties => ({
    padding: '10px 14px',
    borderRadius: RADIUS,
    border: `1px solid ${INPUT_BORDER}`,
    background: active ? WHITE_BUTTON_BG : PANEL_BG,
    color: active ? WHITE_BUTTON_TEXT : TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxSizing: 'border-box',
    minWidth: 70,
  })

  return (
    <>
      <style jsx global>{`
input[type="date"].white-date::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
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

        * {
          scrollbar-color: #5b606b ${PANEL_BG};
        }

              `}</style>

      <div
        style={{
          padding: 20,
          height: '100vh',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          background: PAGE_BG,
          overflow: 'hidden',
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 16,
            color: TEXT_PRIMARY,
            flex: '0 0 auto',
          }}
        >
          아크레텍 코리아 고객사 현황 지도
        </h1>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            gap: 16,
            alignItems: 'stretch',
            flex: 1,
            minHeight: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* 검색창 + X 버튼 */}
            <div style={{ position: 'relative', marginBottom: 12, flex: '0 0 auto' }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="회사명 / 주소 / 상태 / 대리점 검색"
                style={{
                  width: '100%',
                  padding: '14px 42px 14px 14px',
                  border: `1px solid ${INPUT_BORDER}`,
                  borderRadius: 16,
                  background: PANEL_BG,
                  color: TEXT_PRIMARY,
                  fontSize: 15,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: 'none',
                    background: TEXT_MUTED,
                    color: PAGE_BG,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
                flex: '0 0 auto',
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => toggleStatus('활성')}
                  style={controlButtonStyle(selectedStatuses.includes('활성'))}
                >
                  활성
                </button>
                <button
                  onClick={() => toggleStatus('잠재')}
                  style={controlButtonStyle(selectedStatuses.includes('잠재'))}
                >
                  잠재
                </button>
                <button
                  onClick={() => toggleStatus('이탈')}
                  style={controlButtonStyle(selectedStatuses.includes('이탈'))}
                >
                  이탈
                </button>
              </div>

              <button
                onClick={() => setIsAddCustomerModalOpen(true)}
                style={{
                  padding: '10px 14px',
                  background: WHITE_BUTTON_BG,
                  color: WHITE_BUTTON_TEXT,
                  border: `1px solid ${INPUT_BORDER}`,
                  borderRadius: RADIUS,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                }}
              >
                업체 등록
              </button>
            </div>

            <div
              style={{
                border: `1px solid ${INPUT_BORDER}`,
                borderRadius: 20,
                padding: 8,
                background: PANEL_BG,
                flex: 1,
                minHeight: 0,
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <div
                ref={listScrollRef}
                onScroll={saveHomeState}
                style={{
                  height: '100%',
                  overflowY: 'auto',
                  paddingRight: 2,
                }}
              >
                {filteredCustomers.length === 0 ? (
                  <div style={{ padding: 12, color: TEXT_SECONDARY }}>검색 결과가 없습니다.</div>
                ) : (
                  filteredCustomers.map((c) => {
                    const devices = deviceMap.get(Number(c.customer_id)) || []
                    const deviceLines = getDeviceLines(devices)

                    return (
                      <button
                        key={c.customer_id}
                        onClick={() => moveToCustomer(c)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: 14,
                          border: `1px solid ${INPUT_BORDER}`,
                          borderRadius: 18,
                          marginBottom: 10,
                          background: CARD_BG,
                          color: TEXT_PRIMARY,
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ fontWeight: 800, color: TEXT_PRIMARY, fontSize: 18 }}>
                          {c.company_name}{' '}
                          <span style={{ fontWeight: 500, fontSize: 12, color: TEXT_SECONDARY }}>
                            ({c.status ?? '-'})
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            marginTop: 4,
                            color: c.address ? TEXT_SECONDARY : '#ef4444',
                            fontWeight: c.address ? 400 : 700,
                            lineHeight: 1.45,
                          }}
                        >
                          {c.address ? c.address : '주소 정보 없음 등록 필요'}
                        </div>

                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>
                          대리점: {c.agency ?? '-'}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: TEXT_SECONDARY,
                            marginTop: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              minWidth: 0,
                              whiteSpace: 'pre-line',
                              lineHeight: 1.5,
                              wordBreak: 'break-word',
                              flex: 1,
                            }}
                          >
                            {deviceLines.join('\n')}
                          </span>

                          <a
                            href={`/customer/${c.customer_id}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              saveHomeState()
                            }}
                            style={{
                              color: TEXT_PRIMARY,
                              fontWeight: 700,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              alignSelf: 'flex-end',
                            }}
                          >
                            상세보기
                          </a>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div
            ref={mapRef}
            style={{
              width: '100%',
              height: '100%',
              minHeight: 0,
              borderRadius: 20,
              overflow: 'hidden',
              border: `1px solid ${INPUT_BORDER}`,
              boxSizing: 'border-box',
              background: PANEL_BG,
            }}
          />
        </div>

        {isAddCustomerModalOpen && (
          <div
            onClick={() => setIsAddCustomerModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
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
                maxWidth: 780,
                maxHeight: '90vh',
                overflowY: 'auto',
                background: CARD_BG,
                color: TEXT_PRIMARY,
                borderRadius: 20,
                padding: 20,
                boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                border: `1px solid ${INPUT_BORDER}`,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 20,
                  color: TEXT_PRIMARY,
                }}
              >
                업체 등록
              </div>

              <div style={{ ...sectionCardStyle, marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    marginBottom: 14,
                    color: TEXT_PRIMARY,
                  }}
                >
                  업체 정보
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 130px',
                      gap: 10,
                    }}
                  >
                    <input
                      value={customerForm.company_name}
                      onChange={(e) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          company_name: e.target.value,
                        }))
                      }
                      placeholder="업체명(company_name)"
                      style={inputStyle}
                    />

                    <select
                      value={customerForm.status}
                      onChange={(e) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      style={inputStyle}
                    >
                      <option value="활성">활성</option>
                      <option value="잠재">잠재</option>
                      <option value="이탈">이탈</option>
                    </select>
                  </div>

                  <input
                    value={customerForm.address}
                    onChange={(e) =>
                      setCustomerForm((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder="주소(전체 주소를 입력 ex. 울산광역시 북구 명촌 7길 30)"
                    style={inputStyle}
                  />

                  <input
                    value={customerForm.agency}
                    onChange={(e) =>
                      setCustomerForm((prev) => ({
                        ...prev,
                        agency: e.target.value,
                      }))
                    }
                    placeholder="대리점(agency)"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ ...sectionCardStyle, marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY }}>
                    장비 정보
                  </div>

                  <button
                    type="button"
                    onClick={addDeviceFormCard}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: WHITE_BUTTON_BG,
                      color: WHITE_BUTTON_TEXT,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 24,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  {deviceForms.map((device, index) => (
                    <div
                      key={index}
                      style={{
                        border: `1px solid ${INPUT_BORDER}`,
                        borderRadius: 14,
                        padding: 14,
                        background: '#111216',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ fontWeight: 700, color: TEXT_PRIMARY }}>
                          장비 {index + 1}
                        </div>

                        {deviceForms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDeviceFormCard(index)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: `1px solid ${INPUT_BORDER}`,
                              background: PANEL_BG,
                              color: TEXT_PRIMARY,
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            삭제
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gap: 12 }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: 10,
                          }}
                        >
                          <input
                            value={device.device_name}
                            onChange={(e) =>
                              updateDeviceForm(index, 'device_name', e.target.value)
                            }
                            placeholder="장비 라인업(ex. SURFCOM)"
                            style={{ ...inputStyle, fontSize: 12 }}
                          />

                          <input
                            value={device.device_name2}
                            onChange={(e) =>
                              updateDeviceForm(index, 'device_name2', e.target.value)
                            }
                            placeholder="장비 모델명(ex. 1600D)"
                            style={{ ...inputStyle, fontSize: 12 }}
                          />

                          <input
                            value={device.option}
                            onChange={(e) =>
                              updateDeviceForm(index, 'option', e.target.value)
                            }
                            placeholder="옵션(ex. -12)"
                            style={{ ...inputStyle, fontSize: 12 }}
                          />
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                          }}
                        >
                          <input
                            value={device.serial_number}
                            onChange={(e) =>
                              updateDeviceForm(index, 'serial_number', e.target.value)
                            }
                            placeholder="시리얼넘버(serial_number)"
                            style={inputStyle}
                          />

                          <select
                            value={device.program}
                            onChange={(e) =>
                              updateDeviceForm(index, 'program', e.target.value)
                            }
                            style={inputStyle}
                          >
                            <option value="ACCTee">ACCTee</option>
                            <option value="Tims">Tims</option>
                            <option value="CALYPSO">CALYPSO</option>
                            <option value="없음">없음</option>
                          </select>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                          }}
                        >
                          <input
                            type="date"
                            className="white-date"
                            value={device.install_date}
                            onChange={(e) =>
                              updateDeviceForm(index, 'install_date', e.target.value)
                            }
                            style={dateInputStyle}
                          />

                          <select
                            value={device.category}
                            onChange={(e) =>
                              updateDeviceForm(index, 'category', e.target.value)
                            }
                            style={inputStyle}
                          >
                            <option value="20">구분: 20</option>
                            <option value="81">구분: 81</option>
                            <option value="83">구분: 83</option>
                            <option value="84">구분: 84</option>
                          </select>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                          }}
                        >
                          <input
                            value={device.install_engineer}
                            onChange={(e) =>
                              updateDeviceForm(index, 'install_engineer', e.target.value)
                            }
                            placeholder="설치 엔지니어(install_engineer)"
                            style={inputStyle}
                          />

                          <input
                            type="file"
                            accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
                            onChange={(e) =>
                              updateDeviceForm(
                                index,
                                'packing_file',
                                e.target.files?.[0] ?? null
                              )
                            }
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...sectionCardStyle, marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    marginBottom: 14,
                    color: TEXT_PRIMARY,
                  }}
                >
                  담당자 정보
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <input
                    value={contactForm.department}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                    placeholder="부서(department)"
                    style={inputStyle}
                  />

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                    }}
                  >
                    <input
                      value={contactForm.name}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="이름(name)"
                      style={inputStyle}
                    />

                    <input
                      value={contactForm.position}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          position: e.target.value,
                        }))
                      }
                      placeholder="직책(position)"
                      style={inputStyle}
                    />
                  </div>

                  <input
                    value={contactForm.phone}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="전화번호(phone)"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  style={{
                    padding: '10px 14px',
                    background: PANEL_BG,
                    color: TEXT_PRIMARY,
                    borderRadius: 10,
                    border: `1px solid ${INPUT_BORDER}`,
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  취소
                </button>

                <button
                  onClick={handleAddCustomer}
                  disabled={isSavingCustomer}
                  style={{
                    padding: '10px 14px',
                    background: WHITE_BUTTON_BG,
                    color: WHITE_BUTTON_TEXT,
                    borderRadius: 10,
                    border: `1px solid ${INPUT_BORDER}`,
                    cursor: 'pointer',
                    fontWeight: 700,
                    opacity: isSavingCustomer ? 0.7 : 1,
                  }}
                >
                  {isSavingCustomer ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
