'use client'

import { useEffect, useState } from 'react'
import type { Customer, CustomerEditFormData } from '../types'
import {
  CARD_BG, DANGER_BG, INPUT_BORDER, PANEL_BG, TEXT_PRIMARY,
  WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, inputStyle, modalOverlayStyle,
} from '../constants'

type Props = {
  customer: Customer | null
  isSaving: boolean
  isDeleting: boolean
  onClose: () => void
  onSave: (form: CustomerEditFormData) => void
  onDelete: () => void
}

export default function CustomerEditModal({ customer, isSaving, isDeleting, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<CustomerEditFormData>({ company_name: '', address: '', agency: '', status: '활성' })

  useEffect(() => {
    if (customer) {
      setForm({
        company_name: customer.company_name ?? '',
        address: customer.address ?? '',
        agency: customer.agency ?? '',
        status: customer.status ?? '활성',
      })
    }
  }, [customer])

  if (!customer) return null

  return (
    <div onClick={onClose} style={modalOverlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>업체 정보 수정</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <input value={form.company_name} onChange={(e) => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="업체명" style={inputStyle} />
          <input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} placeholder="주소" style={inputStyle} />
          <input value={form.agency} onChange={(e) => setForm(p => ({ ...p, agency: e.target.value }))} placeholder="대리점" style={inputStyle} />
          <select value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
            <option value="활성">상태: 활성</option>
            <option value="잠재">상태: 잠재</option>
            <option value="이탈">상태: 이탈</option>
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
          <button onClick={onDelete} disabled={isDeleting} style={{ padding: '10px 14px', background: DANGER_BG, color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isDeleting ? 0.7 : 1 }}>
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
            <button onClick={() => onSave(form)} disabled={isSaving} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
