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
  selectedCategories: string[]
  toggleCategory: (category: string) => void
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
  selectedCategories,
  toggleCategory,
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
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const restoredMapStateAppliedRef = useRef(false)

  // 오버레이 동적 생성 함수
  const createOverlay = (c: Customer, map: any, kakao: any) => {
    const devices = deviceMap.get(Number(c.customer_id)) || []
    const deviceLines = getDeviceLines(devices)
    const navUrlUlsan = `https://map.naver.com/p/directions/${BASE_LNG},${BASE_LAT},${encodeURIComponent(BASE_NAME)}/${c.longitude},${c.latitude},${encodeURIComponent(c.company_name)}/-/car`
    const navUrlDongtan = `https://map.naver.com/p/directions/127.108180,37.217719,${encodeURIComponent('경기 화성시 동탄구 동탄대로24길 31-8')}/${c.longitude},${c.latitude},${encodeURIComponent(c.company_name)}/-/car`
    const overlayContent = document.createElement('div')
    overlayContent.addEventListener('click', (e) => e.stopPropagation())
    overlayContent.addEventListener('mousedown', (e) => e.stopPropagation())

    const statusColor = c.status === '활성' ? '#16a34a' : c.status === '잠재' ? '#f59e0b' : c.status === '이탈' ? '#ef4444' : '#9ca3af'
    overlayContent.innerHTML = `
      <div style="
        width:300px;
        background:#ffffff;
        color:#111111;
        border-radius:16px;
        border:1px solid #e5e7eb;
        font-size:13px;
        line-height:1.6;
        box-sizing:border-box;
        word-break:break-word;
        box-shadow:0 16px 40px rgba(0,0,0,0.18);
        overflow:hidden;
      ">
        <div style="
          padding:14px 16px 12px;
          border-bottom:1px solid #f3f4f6;
        ">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
            <div style="font-weight:700; font-size:14px; color:#111111; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
              ${c.company_name}
            </div>
            <span style="font-size:11px; font-weight:700; padding:2px 7px; border-radius:99px; background:${statusColor}1a; color:${statusColor}; flex-shrink:0; white-space:nowrap;">
              ${c.status ?? '-'}
            </span>
          </div>
          <div style="font-size:12px; color:#6b7280; margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${c.address ?? '-'}
          </div>
          <div style="font-size:11px; color:#adb5bd;">대리점 ${c.agency ?? '-'}</div>
        </div>
        <div style="padding:10px 16px; border-bottom:1px solid #f3f4f6; display:flex; flex-wrap:wrap; gap:4px;">
          ${deviceLines.map(l => `<span style="font-size:11px; padding:2px 7px; border-radius:6px; background:#eff4ff; color:#234ea2; font-weight:600; white-space:nowrap;">${l}</span>`).join('')}
        </div>
        <div style="display:flex; gap:8px; padding:10px 12px;">
          <a href="/customer/${c.customer_id}"
             style="flex:1;text-align:center;padding:8px 10px;background:#234ea2;color:#ffffff;border-radius:9px;font-size:12px;text-decoration:none;font-weight:700;">
            상세보기
          </a>
          <a href="${navUrlUlsan}" target="_blank" rel="noopener noreferrer"
             style="flex:1;text-align:center;padding:8px 10px;background:#f4f5f7;color:#111111;border-radius:9px;font-size:12px;text-decoration:none;font-weight:700;">
            울산 출발
          </a>
          <a href="${navUrlDongtan}" target="_blank" rel="noopener noreferrer"
             style="flex:1;text-align:center;padding:8px 10px;background:#f4f5f7;color:#111111;border-radius:9px;font-size:12px;text-decoration:none;font-weight:700;">
            동탄 출발
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
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 1000, display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* 상태 필터 */}
        {([
          { label: '활성', color: '#16a34a', shadow: 'rgba(22,163,74,0.30)' },
          { label: '잠재', color: '#f59e0b', shadow: 'rgba(245,158,11,0.30)' },
          { label: '이탈', color: '#ef4444', shadow: 'rgba(239,68,68,0.30)' },
        ] as const).map(({ label, color, shadow }) => {
          const active = selectedStatuses.includes(label)
          return (
            <button key={label} onClick={() => toggleStatus(label)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 13px', borderRadius: 10, border: 'none',
                background: active ? color : 'rgba(255,255,255,0.92)',
                color: active ? '#ffffff' : '#1a1a2e',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                boxShadow: active
                  ? `0 4px 12px ${shadow}`
                  : '0 2px 8px rgba(0,0,0,0.10)',
                backdropFilter: 'blur(6px)',
                transition: 'background 0.15s ease, box-shadow 0.15s ease, color 0.15s ease',
              }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: active ? 'rgba(255,255,255,0.75)' : color,
                transition: 'background 0.15s ease',
              }} />
              {label}
            </button>
          )
        })}

        {/* 계열 필터 드롭다운 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCategoryMenu(prev => !prev)}
            style={{
              padding: '7px 13px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              border: 'none',
              background: selectedCategories.length === 3 ? 'rgba(255,255,255,0.92)' : '#0891b2',
              color: selectedCategories.length === 3 ? '#1a1a2e' : '#ffffff',
              boxShadow: selectedCategories.length === 3
                ? '0 2px 8px rgba(0,0,0,0.10)'
                : '0 4px 12px rgba(8,145,178,0.28)',
              backdropFilter: 'blur(6px)',
              transition: 'all 0.15s ease',
            }}>
            계열{selectedCategories.length < 3 ? ` (${selectedCategories.sort().join(',')})` : ''}
          </button>
          {showCategoryMenu && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 2000,
              background: '#ffffff', borderRadius: 10, padding: '5px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'row', gap: 4,
            }}>
              {['81', '83', '84'].map(cat => {
                const checked = selectedCategories.includes(cat)
                return (
                  <button key={cat} onClick={() => toggleCategory(cat)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, border: 'none',
                      cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      background: checked ? '#234ea2' : '#f4f5f7',
                      color: checked ? '#fff' : '#555',
                      transition: 'background 0.15s ease, color 0.15s ease',
                    }}>
                    {cat}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 우측 상단 업체 등록 */}
      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 1000 }}>
        <button
          onClick={onAddClick}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: '#234ea2', color: '#ffffff',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(35,78,162,0.35)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
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