'use client'

import type { Device, ServiceHistory } from './types'
import { CARD_BG, INNER_CARD_BG, INPUT_BORDER, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY, WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, iconButtonStyle } from './constants'
import { getInstallDisplay, getDefaultImageUrl } from './utils'

type Props = {
  devices: Device[]
  historyByDevice: Map<number, ServiceHistory[]>
  onAddDevice: () => void
  onEditDevice: (device: Device) => void
  onAddService: (deviceId: number) => void
  onEditService: (service: ServiceHistory) => void
  onImageUpload: (device: Device) => void
  onPrintReport: (service: ServiceHistory, device: Device) => void
}

export default function DeviceSection({ devices, historyByDevice, onAddDevice, onEditDevice, onAddService, onEditService, onImageUpload, onPrintReport }: Props) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ color: TEXT_PRIMARY, marginBottom: 12, fontSize: 30, fontWeight: 800 }}>장비</h2>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4, alignItems: 'flex-start' }}>
        {devices.map((d) => {
          const deviceTitle = `${d.device_name ?? ''} ${d.device_name2 ?? ''} ${d.option ?? ''}`.replace(/\s+/g, ' ').trim()
          const deviceHistory = historyByDevice.get(d.device_id) || []
          const defaultDeviceImg = getDefaultImageUrl(d, supabaseUrl)

          return (
            <div key={d.device_id} style={{ minWidth: 320, maxWidth: 320, background: CARD_BG, borderRadius: 18, padding: 16, color: TEXT_PRIMARY, border: `1px solid ${INPUT_BORDER}`, flex: '0 0 auto', position: 'relative', alignSelf: 'flex-start' }}>
              <button onClick={() => onEditDevice(d)} style={{ ...iconButtonStyle, position: 'absolute', top: 14, right: 14, zIndex: 2 }}>✏️</button>

              {/* 이미지 */}
              <div style={{ height: 150, borderRadius: 14, background: 'rgba(255,255,255,0.08)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {d.image_url ? (
                  <img src={d.image_url} alt={deviceTitle || 'device image'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : defaultDeviceImg ? (
                  <img src={defaultDeviceImg} alt={deviceTitle || 'device image'} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                ) : (
                  <button onClick={() => onImageUpload(d)} style={{ width: 64, height: 64, borderRadius: '50%', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, border: 'none', fontSize: 38, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                )}
              </div>

              {/* 제목 */}
              <div style={{ position: 'relative', marginBottom: 10, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center', width: '100%', padding: '0 8px', boxSizing: 'border-box', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'keep-all' }} title={deviceTitle || '-'}>
                  {deviceTitle || '-'}
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: 14, marginBottom: 6, color: TEXT_SECONDARY }}>S/N : {d.serial_number ?? '-'} &nbsp; | &nbsp; 프로그램 : {d.program ?? '-'}</div>
              <div style={{ textAlign: 'center', fontSize: 14, marginBottom: 12, color: TEXT_SECONDARY }}>납입연월 : {getInstallDisplay(d)}</div>

              <button onClick={() => onAddService(d.device_id)} style={{ width: '100%', padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, marginBottom: 14 }}>
                서비스 레포트 추가
              </button>

              {/* 서비스 히스토리 */}
              <div style={{ display: 'grid', gap: 10 }}>
                {deviceHistory.length === 0 ? (
                  <div style={{ width: '100%', background: INNER_CARD_BG, color: TEXT_PRIMARY, borderRadius: 12, padding: 14, fontSize: 14, border: `1px solid ${INPUT_BORDER}`, boxSizing: 'border-box' }}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>서비스 노트</div>
                    <div style={{ marginBottom: 18 }}>-</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, fontSize: 12, color: TEXT_MUTED }}>
                      <div>-</div><div>방문자 : -</div>
                    </div>
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
                        <button onClick={() => onEditService(h)} style={{ padding: '6px 10px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>수정</button>
                        <button onClick={() => onPrintReport(h, d)} style={{ padding: '6px 10px', background: '#16a34a', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>레포트</button>
                      </div>
                    </div>
                    <div style={{ marginBottom: 18, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5, color: TEXT_PRIMARY }}>{h.service_notes ?? '-'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, fontSize: 12, color: TEXT_MUTED }}>
                      <div>{h.visit_date ?? '-'}</div>
                      <div style={{ textAlign: 'right' }}>
                        방문자 : {h.service_engineers && h.service_engineers.length > 0
                          ? h.service_engineers.map(se => `${se.engineers.name} ${se.engineers.position ?? ''}`.trim()).join(', ')
                          : (h.visitor ?? '-')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* 장비 추가 버튼 */}
        <div style={{ minWidth: 320, maxWidth: 320, minHeight: 520, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
          <button onClick={onAddDevice} style={{ width: 68, height: 68, borderRadius: '50%', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, border: `1px solid ${INPUT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, cursor: 'pointer' }}>+</button>
        </div>
      </div>
    </div>
  )
}
