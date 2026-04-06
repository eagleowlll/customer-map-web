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
}

export default function MapView({
  customers,
  deviceMap,
  focusedCustomerId,
  selectedStatuses,
  toggleStatus,
  onAddClick,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const kakaoMapRef = useRef<any>(null)
  const markerMapRef = useRef<Map<number, any>>(new Map())
  const infoWindowMapRef = useRef<Map<number, any>>(new Map())
  const openInfoWindowRef = useRef<{ id: number; iw: any } | null>(null)
  const clustererRef = useRef<any>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    let mounted = true

    async function initMap() {
      if (!mapRef.current) return

      const kakao = await loadKakaoMap()
      if (!mounted) return

      if (!kakaoMapRef.current) {
        kakaoMapRef.current = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(36.5, 127.8),
          level: 13,
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

      if (openInfoWindowRef.current) {
        openInfoWindowRef.current.iw.setMap(null)
        openInfoWindowRef.current = null
      }

      markerMapRef.current.forEach((marker) => marker.setMap(null))
      markerMapRef.current.clear()

      infoWindowMapRef.current.forEach((iw) => iw.setMap(null))
      infoWindowMapRef.current.clear()

      if (clustererRef.current) {
        clustererRef.current.clear()
      }

      const markers: any[] = []

      customers.forEach((c) => {
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
background:#ffffff;
color:#111111;
border:1px solid #e5e7eb;
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
  }, [isMapReady, customers, deviceMap])
useEffect(() => {
  if (!focusedCustomerId || !kakaoMapRef.current) return
  if (!isMapReady) return  // markerMapRef.size 체크 대신 isMapReady 사용

  const kakaoMap = kakaoMapRef.current
  const targetCustomer = customers.find(
    (c) => Number(c.customer_id) === Number(focusedCustomerId)
  )

  if (!targetCustomer || targetCustomer.latitude == null || targetCustomer.longitude == null) return

  const lat = Number(targetCustomer.latitude)
  const lng = Number(targetCustomer.longitude)

  if (Number.isNaN(lat) || Number.isNaN(lng)) return

  const position = new (window as any).kakao.maps.LatLng(lat, lng)

  if (openInfoWindowRef.current) {
    openInfoWindowRef.current.iw.setMap(null)
    openInfoWindowRef.current = null
  }

  // 레벨 먼저 설정 후 이동 (순서 중요)
  kakaoMap.setLevel(4)
  kakaoMap.panTo(position)

  const customOverlay = infoWindowMapRef.current.get(Number(targetCustomer.customer_id))

  if (customOverlay) {
    setTimeout(() => {
      customOverlay.setMap(kakaoMap)
      openInfoWindowRef.current = {
        id: targetCustomer.customer_id,
        iw: customOverlay,
      }
    }, 350)  // panTo 애니메이션 끝날 때까지 대기
  }
}, [focusedCustomerId, isMapReady, customers])  // isMapReady 의존성 추가

  return (
  <div
    style={{
      width: '100%',
      height: '100%',
      position: 'relative', // 🔥 핵심
    }}
  >
    {/* 🔥 좌측 상단 필터 */}
    {/* 좌측 상단 필터 */}
<div
  style={{
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1000,
    display: 'flex',
    gap: 8,
  }}
>
  {['활성', '잠재', '이탈'].map((status) => {
    const active = selectedStatuses.includes(status)

    return (
      <button
        key={status}
        onClick={() => toggleStatus(status)}
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          border: active ? 'none' : '1px solid #ddd',
          background: active ? '#234ea2' : '#ffffff',
          color: active ? '#ffffff' : '#111111',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {status}
      </button>
    )
  })}
</div>

{/* 우측 상단 업체등록 */}
<div
  style={{
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1000,
  }}
>
  <button
    onClick={onAddClick}
    style={{
      padding: '10px 16px',
      borderRadius: 12,
      border: 'none',
      background: '#234ea2',
      color: '#ffffff',
      fontWeight: 700,
      cursor: 'pointer',
    }}
  >
    업체 등록
  </button>
</div>
    {/* 지도 */}
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
)
}