'use client'

import { useState } from 'react'
import {
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  getDeviceLines,
  type Customer,
  type Device,
} from '@/lib/home'

const STATUS_COLOR: Record<string, string> = {
  '활성': '#16a34a',
  '잠재': '#f59e0b',
  '이탈': '#ef4444',
}

type Props = {
  customer: Customer
  devices: Device[]
  onMove: () => void
  onDetailClick: () => void
}

export default function CustomerCard({ customer, devices, onMove, onDetailClick }: Props) {
  const [hovered, setHovered] = useState(false)
  const deviceLines = getDeviceLines(devices)
  const statusColor = STATUS_COLOR[customer.status ?? ''] ?? '#9ca3af'
  const hasNoDevice = deviceLines.length === 1 && deviceLines[0] === '-'

  return (
    <div
      onClick={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        marginBottom: 8,
        borderRadius: 14,
        border: `1px solid ${hovered ? '#dce1ea' : '#eaecef'}`,
        background: '#ffffff',
        cursor: 'pointer',
        overflow: 'hidden',
        boxSizing: 'border-box',
        boxShadow: hovered
          ? '0 6px 20px rgba(0,0,0,0.09)'
          : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
      }}
    >
      {/* 상태 컬러 바 */}
      <div style={{ width: 4, flexShrink: 0, background: statusColor }} />

      {/* 컨텐츠 */}
      <div style={{ flex: 1, padding: '11px 13px', minWidth: 0 }}>

        {/* 헤더: 회사명 + 상태 뱃지 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
          <div style={{
            fontWeight: 700, color: TEXT_PRIMARY, fontSize: 14,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {customer.company_name}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
            background: `${statusColor}1a`,
            color: statusColor,
            flexShrink: 0, lineHeight: 1.6, whiteSpace: 'nowrap',
          }}>
            {customer.status ?? '-'}
          </span>
        </div>

        {/* 주소 */}
        <div style={{
          fontSize: 12,
          color: customer.address ? TEXT_SECONDARY : '#ef4444',
          fontWeight: customer.address ? 400 : 600,
          lineHeight: 1.45, marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {customer.address ?? '주소 정보 없음 — 등록 필요'}
        </div>

        {/* 대리점 */}
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>
          대리점 {customer.agency ?? '-'}
        </div>

        {/* 장비 태그 + 상세보기 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 4,
            flex: 1, minWidth: 0, overflow: 'hidden', maxHeight: 46,
          }}>
            {hasNoDevice ? (
              <span style={{ fontSize: 11, color: '#c4c9d1', fontStyle: 'italic' }}>장비 없음</span>
            ) : deviceLines.map((line, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '2px 7px', borderRadius: 6,
                background: '#eff4ff', color: '#234ea2', fontWeight: 600,
                whiteSpace: 'nowrap', maxWidth: 160,
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {line}
              </span>
            ))}
          </div>

          <a
            href={`/customer/${customer.customer_id}`}
            onClick={(e) => { e.stopPropagation(); onDetailClick() }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 12, fontWeight: 700, color: '#234ea2',
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
              padding: '4px 9px', borderRadius: 7,
              background: hovered ? '#eff4ff' : '#f4f5f7',
              transition: 'background 0.15s ease',
            }}
          >
            상세보기
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
