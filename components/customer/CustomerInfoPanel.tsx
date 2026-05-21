'use client'

import { useState } from 'react'
import type { Customer, Quote } from './types'
import { INPUT_BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, WHITE_BUTTON_BG, numKR } from './constants'

const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  '활성': { bg: '#dcfce7', color: '#16a34a' },
  '잠재': { bg: '#fef3c7', color: '#d97706' },
  '이탈': { bg: '#fee2e2', color: '#dc2626' },
}

type Props = {
  customer: Customer | null
  quotes: Quote[]
  totalRevenueAmt: number
  onEdit: () => void
  onQuoteHistoryOpen: () => void
}

export default function CustomerInfoPanel({ customer, quotes, totalRevenueAmt, onEdit, onQuoteHistoryOpen }: Props) {
  const [copied, setCopied] = useState(false)
  const sc = STATUS_CFG[customer?.status ?? ''] ?? { bg: '#f3f4f6', color: TEXT_MUTED }

  const handleCopy = () => {
    if (!customer?.address) return
    navigator.clipboard.writeText(customer.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: '#ffffff', border: `1px solid ${INPUT_BORDER}`, borderRadius: 20,
      padding: '22px 26px', marginBottom: 24, position: 'relative',
    }}>
      {/* 수정 버튼 */}
      <button
        onClick={onEdit}
        style={{
          position: 'absolute', top: 20, right: 20,
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px',
          background: '#f4f5f7', border: `1px solid ${INPUT_BORDER}`, borderRadius: 9,
          cursor: 'pointer', fontSize: 13, fontWeight: 600, color: TEXT_SECONDARY,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        수정
      </button>

      {/* 회사명 + 상태 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: TEXT_PRIMARY, lineHeight: 1.2 }}>
          {customer?.company_name ?? '업체 정보 없음'}
        </h1>
        {customer?.status && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
            background: sc.bg, color: sc.color, flexShrink: 0,
          }}>
            {customer.status}
          </span>
        )}
      </div>

      {/* 정보 행 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{
            color: customer?.address ? TEXT_SECONDARY : '#ef4444',
            fontWeight: customer?.address ? 400 : 600,
          }}>
            {customer?.address ?? '주소 정보 없음 — 수정 필요'}
          </span>
          {customer?.address && (
            <button onClick={handleCopy} style={{
              padding: '2px 9px', fontSize: 11, fontWeight: 700,
              background: copied ? '#dcfce7' : '#eff4ff',
              color: copied ? '#16a34a' : WHITE_BUTTON_BG,
              border: 'none', borderRadius: 6, cursor: 'pointer',
              transition: 'all 0.15s ease', flexShrink: 0,
            }}>
              {copied ? '복사됨' : '복사'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: TEXT_SECONDARY }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2" style={{ flexShrink: 0 }}>
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
          </svg>
          대리점 {customer?.agency ?? '-'}
        </div>
      </div>

      {/* 거래 이력 버튼 */}
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${INPUT_BORDER}` }}>
        <button
          onClick={onQuoteHistoryOpen}
          style={{
            padding: '8px 16px',
            background: quotes.length > 0 ? '#eff4ff' : '#f4f5f7',
            color: quotes.length > 0 ? WHITE_BUTTON_BG : TEXT_MUTED,
            border: `1px solid ${quotes.length > 0 ? '#c7d7f8' : INPUT_BORDER}`,
            borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          거래 이력
          {quotes.length > 0
            ? <span>{quotes.length}건 · 누적 ₩{numKR(totalRevenueAmt)}</span>
            : <span>(없음)</span>}
        </button>
      </div>
    </div>
  )
}
