'use client'

import type { Customer, Quote } from './types'
import { CARD_BG, INPUT_BORDER, PANEL_BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, iconButtonStyle, numKR } from './constants'

type Props = {
  customer: Customer | null
  quotes: Quote[]
  totalRevenueAmt: number
  onEdit: () => void
  onQuoteHistoryOpen: () => void
}

export default function CustomerInfoPanel({ customer, quotes, totalRevenueAmt, onEdit, onQuoteHistoryOpen }: Props) {
  return (
    <div style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}`, borderRadius: 20, padding: 24, marginBottom: 22, color: TEXT_PRIMARY, position: 'relative' }}>
      <button onClick={onEdit} style={{ ...iconButtonStyle, position: 'absolute', top: 20, right: 20 }}>✏️</button>
      <h1 style={{ margin: 0, marginBottom: 18, fontSize: 32, color: TEXT_PRIMARY }}>{customer?.company_name ?? '고객 정보 없음'}</h1>
      <div style={{ display: 'grid', gap: 10, fontSize: 16, color: TEXT_SECONDARY }}>
        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          주소: {customer?.address ?? '-'}
          {customer?.address && (
            <button
              onClick={() => { navigator.clipboard.writeText(customer.address ?? ''); alert('주소가 복사되었습니다!') }}
              style={{ padding: '3px 10px', fontSize: 12, fontWeight: 700, background: '#234ea2', color: '#ffffff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              복사
            </button>
          )}
        </p>
        <p style={{ margin: 0 }}>상태: {customer?.status ?? '-'}</p>
        <p style={{ margin: 0 }}>대리점: {customer?.agency ?? '-'}</p>
      </div>
      <button
        onClick={onQuoteHistoryOpen}
        style={{ marginTop: 16, padding: '9px 18px', background: quotes.length > 0 ? '#eff6ff' : '#f3f4f6', color: quotes.length > 0 ? WHITE_BUTTON_BG : TEXT_MUTED, border: `1px solid ${quotes.length > 0 ? '#bfdbfe' : INPUT_BORDER}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        📋 거래 이력 {quotes.length > 0 ? `(${quotes.length}건 · 누적 ₩${numKR(totalRevenueAmt)})` : '(없음)'}
      </button>
    </div>
  )
}
