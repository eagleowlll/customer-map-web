'use client'

import { useEffect, useRef, useState } from 'react'
import { loadKakaoMap } from '@/lib/loadKakaoMap'
import {
  BASE_LAT,
  BASE_LNG,
  BASE_NAME,
  CARD_BG,
  INPUT_BORDER,
  PANEL_BG,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  WHITE_BUTTON_BG,
  WHITE_BUTTON_TEXT,
  getDeviceLines,
  type Customer,
  type Device,
} from '@/lib/home'

type Props = {
  customers: Customer[]
  deviceMap: Map<number, Device[]>
  focusedCustomerId: number | null
  selectedStatuses: string[]
  toggleStatus: (status: string) => void
  onAddClick: () => void
  restoredMapCenter: { lat: number; lng: number } | null
  restoredMapLevel: number | null
  restoredOpenOverlayCustomerId: number | null
  onMapStateChange: (center: { lat: number; lng: number }, level: number) => void
  onOpenOverlayChange: (customerId: number | null) => void
}

export default function MapView({
  customers,
  deviceMap,
  focusedCustomerId,
  selectedStatuses,
  toggleStatus,
  onAddClick,
  restoredMapCenter,
  restoredMapLevel,
  restoredOpenOverlayCustomerId,
  onMapStateChange,
  onOpenOverlayChange,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const kakaoMapRef = useRef<any>(null)
  const markerMapRef = useRef<Map<number, any>>(new Map())
  const openInfoWindowRef = useRef<{ id: number; iw: any } | null>(null)
  const clustererRef = useRef<any>(null)
  const customerMapRef = useRef<Map<number, Customer>>(new Map())
  const [isMapReady, setIsMapReady] = useState(false)
  const restoredMapStateAppliedRef = useRef(false)

  // 오버레이 동적 생성 함수
  const createOverlay = (c: Customer, map: any, kakao: any) => {
    const devices = deviceMap.get(Number(c.customer_id)) || []
    const deviceLines = getDeviceLines(devices)
    const navUrl = `https://map.naver.com/p/directions/${BASE_LNG},${BASE_LAT},${encodeURIComponent(BASE_NAME)}/${c.longitude},${c.latitude},${encodeURIComponent(c.company_name)}/-/car`

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
             style="flex:1;text-align:center;padding:9px 10px;background:${WHITE_BUTTON_BG};color:${WHITE_BUTTON_TEXT};border-radius:10px;font-size:13px;text-decoration:none;font-weight:700;">
            상세보기
          </a>
          <a href="${navUrl}" target="_blank" rel="noopener noreferrer"
             style="flex:1;text-align:center;padding:9px 10px;background:#ffffff;color:#111111;border-radius:10px;font-size:13px;text-decoration:none;font-weight:700;border:1px solid ${INPUT_BORDER};">
            네이버 길 안내
          </a>
        </div>
      </div>
    `

    return new kakao.maps.CustomOverlay({
      content: overlayContent,
      position: new kakao.maps.LatLng(Number(c.latitude), Number(c.longitude)),
      yAnchor: 1.25,
      zIndex: 3,
    })
  }

  // 지도 초기화
useEffect(() => {
    let mounted = true

    async function initMap() {
      if (!mapRef.current) return
      const kakao = await loadKakaoMap()
      if (!mounted) return

      if (!kakaoMapRef.current) {
       const isMobile = window.innerWidth <= 768
        kakaoMapRef.current = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(isMobile ? 38.6 : 36.5, isMobile ? 128.0 : 127.8),
          level: isMobile ? 13 : 13,
        })

         ;(window as any).__kakaoMapInstance = kakaoMapRef.current

        const resizeObserver = new ResizeObserver(() => {
          kakaoMapRef.current?.relayout()
        })
        resizeObserver.observe(mapRef.current!)

        kakao.maps.event.addListener(kakaoMapRef.current, 'click', () => {
          if (openInfoWindowRef.current) {
            openInfoWindowRef.current.iw.setMap(null)
            openInfoWindowRef.current = null
            onOpenOverlayChange(null)
          }
        })

        kakao.maps.event.addListener(kakaoMapRef.current, 'idle', () => {
          const center = kakaoMapRef.current.getCenter()
          const level = kakaoMapRef.current.getLevel()
          onMapStateChange({ lat: center.getLat(), lng: center.getLng() }, level)
        })
      }

      setIsMapReady(true)
    }

    initMap()
    return () => { mounted = false }
  }, [])

  // 마커 렌더링 - 변경분만 처리
  useEffect(() => {
    if (!isMapReady || !kakaoMapRef.current) return

    let cancelled = false

    async function renderMarkers() {
      const kakao = await loadKakaoMap()
      if (cancelled) return

      const map = kakaoMapRef.current
      if (!map) return

      const newCustomerMap = new Map<number, Customer>()
      customers.forEach((c) => newCustomerMap.set(c.customer_id, c))

      // 삭제: 현재 마커 중 새 목록에 없는 것
      const toDelete: number[] = []
      markerMapRef.current.forEach((_, id) => {
        if (!newCustomerMap.has(id)) toDelete.push(id)
      })

      toDelete.forEach((id) => {
        const marker = markerMapRef.current.get(id)
        if (marker) marker.setMap(null)
        markerMapRef.current.delete(id)

        if (openInfoWindowRef.current?.id === id) {
          openInfoWindowRef.current.iw.setMap(null)
          openInfoWindowRef.current = null
          onOpenOverlayChange(null)
        }
      })

      // 추가: 새 목록 중 현재 마커에 없는 것만
      const toAdd: Customer[] = []
      customers.forEach((c) => {
        if (!markerMapRef.current.has(c.customer_id)) toAdd.push(c)
      })

      const newMarkers: any[] = []

      toAdd.forEach((c) => {
        if (c.latitude == null || c.longitude == null) return
        const lat = Number(c.latitude)
        const lng = Number(c.longitude)
        if (Number.isNaN(lat) || Number.isNaN(lng)) return

        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(lat, lng),
        })

        kakao.maps.event.addListener(marker, 'click', () => {
          // 오버레이를 클릭 시점에 동적 생성
          if (openInfoWindowRef.current?.id === c.customer_id) {
            openInfoWindowRef.current.iw.setMap(null)
            openInfoWindowRef.current = null
            onOpenOverlayChange(null)
            return
          }

          if (openInfoWindowRef.current) {
            openInfoWindowRef.current.iw.setMap(null)
          }

          const overlay = createOverlay(c, map, kakao)
          overlay.setMap(map)
          openInfoWindowRef.current = { id: c.customer_id, iw: overlay }
          onOpenOverlayChange(c.customer_id)
        })

        markerMapRef.current.set(c.customer_id, marker)
        newMarkers.push(marker)
      })

      customerMapRef.current = newCustomerMap

      // 클러스터러에 새 마커만 추가
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
                width: '48px', height: '48px',
                background: 'rgba(255,255,255,0.82)', color: '#111113',
                textAlign: 'center', lineHeight: '48px', borderRadius: '50%',
                fontSize: '14px', fontWeight: '700',
                border: '1px solid rgba(255,255,255,0.95)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
              },
              {
                width: '56px', height: '56px',
                background: 'rgba(245,245,245,0.88)', color: '#111113',
                textAlign: 'center', lineHeight: '56px', borderRadius: '50%',
                fontSize: '15px', fontWeight: '700',
                border: '1px solid rgba(255,255,255,0.95)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
              },
              {
                width: '64px', height: '64px',
                background: 'rgba(230,230,230,0.9)', color: '#111113',
                textAlign: 'center', lineHeight: '64px', borderRadius: '50%',
                fontSize: '16px', fontWeight: '700',
                border: '1px solid rgba(255,255,255,0.95)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
              },
            ],
          })
        }

        if (toDelete.length > 0) {
          // 삭제된 마커 클러스터에서 제거
          clustererRef.current.clear()
          const allMarkers: any[] = []
          markerMapRef.current.forEach((marker) => allMarkers.push(marker))
          clustererRef.current.addMarkers(allMarkers)
        } else if (newMarkers.length > 0) {
          clustererRef.current.addMarkers(newMarkers)
        }
      } else {
        newMarkers.forEach((marker) => marker.setMap(map))
      }
    }

    renderMarkers()
    return () => { cancelled = true }
  }, [isMapReady, customers, deviceMap])

  // 지도 상태 복원
  useEffect(() => {
    if (!isMapReady || !kakaoMapRef.current) return
    if (restoredMapStateAppliedRef.current) return
    if (customers.length === 0) return

    const kakao = (window as any).kakao
    if (!kakao?.maps) return

    const map = kakaoMapRef.current

    if (restoredMapCenter && restoredMapLevel !== null) {
      map.setLevel(restoredMapLevel)
      map.setCenter(new kakao.maps.LatLng(restoredMapCenter.lat, restoredMapCenter.lng))
    }

    if (restoredOpenOverlayCustomerId != null) {
      const customer = customerMapRef.current.get(restoredOpenOverlayCustomerId)
      if (customer) {
        setTimeout(async () => {
          const kakao = await loadKakaoMap()
          const overlay = createOverlay(customer, map, kakao)
          overlay.setMap(map)
          openInfoWindowRef.current = { id: restoredOpenOverlayCustomerId, iw: overlay }
        }, 300)
      }
    }

    restoredMapStateAppliedRef.current = true
  }, [isMapReady, customers, restoredMapCenter, restoredMapLevel, restoredOpenOverlayCustomerId])

  // 업체 포커스
  useEffect(() => {
    if (!focusedCustomerId || !kakaoMapRef.current) return
    if (!isMapReady) return

    const kakaoMap = kakaoMapRef.current
    const targetCustomer = customers.find(
      (c) => Number(c.customer_id) === Number(focusedCustomerId)
    )

    if (!targetCustomer || targetCustomer.latitude == null || targetCustomer.longitude == null) return

    const lat = Number(targetCustomer.latitude)
    const lng = Number(targetCustomer.longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return

    if (openInfoWindowRef.current) {
      openInfoWindowRef.current.iw.setMap(null)
      openInfoWindowRef.current = null
    }

    kakaoMap.setLevel(4)
    kakaoMap.panTo(new (window as any).kakao.maps.LatLng(lat, lng))

    setTimeout(async () => {
      const kakao = await loadKakaoMap()
      const overlay = createOverlay(targetCustomer, kakaoMap, kakao)
      overlay.setMap(kakaoMap)
      openInfoWindowRef.current = { id: targetCustomer.customer_id, iw: overlay }
      onOpenOverlayChange(targetCustomer.customer_id)
    }, 350)
  }, [focusedCustomerId, isMapReady, customers])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 좌측 상단 필터 */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, display: 'flex', gap: 8 }}>
        {['활성', '잠재', '이탈'].map((status) => {
          const active = selectedStatuses.includes(status)
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              style={{
                padding: '10px 14px', borderRadius: 12,
                border: active ? 'none' : '1px solid #ddd',
                background: active ? '#234ea2' : '#ffffff',
                color: active ? '#ffffff' : '#111111',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              {status}
            </button>
          )
        })}
      </div>

      {/* 우측 상단 업체등록 */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
        <button
          onClick={onAddClick}
          style={{
            padding: '10px 16px', borderRadius: 12, border: 'none',
            background: '#234ea2', color: '#ffffff', fontWeight: 700, cursor: 'pointer',
          }}
        >
          업체 등록
        </button>
      </div>

      {/* 지도 */}
     <div
        ref={mapRef}
        className="kakao-map-container"
        style={{
          width: '100%', height: '100%', minHeight: 0,
          borderRadius: 20, overflow: 'hidden',
          border: `1px solid ${INPUT_BORDER}`,
          boxSizing: 'border-box', background: PANEL_BG,
        }}
      />
    </div>
  )
}