'use client'

import { useState } from 'react'
import type { ContactForm } from '../types'
import {
  CARD_BG, INPUT_BORDER, PANEL_BG, TEXT_PRIMARY,
  WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, inputStyle, modalOverlayStyle,
} from '../constants'

type Props = {
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (form: ContactForm) => void
}

const emptyForm: ContactForm = { name: '', department: '', position: '', phone: '' }

export default function ContactAddModal({ isOpen, isSaving, onClose, onSave }: Props) {
  const [form, setForm] = useState<ContactForm>(emptyForm)

  if (!isOpen) return null

  const handleSave = () => {
    if (!form.name.trim()) { alert('이름을 입력해주세요.'); return }
    onSave(form)
    setForm(emptyForm)
  }

  const handleClose = () => { setForm(emptyForm); onClose() }

  return (
    <div onClick={handleClose} style={modalOverlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>담당자 추가</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="이름" style={inputStyle} />
          <input value={form.department} onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))} placeholder="부서" style={inputStyle} />
          <input value={form.position} onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))} placeholder="직책" style={inputStyle} />
          <input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="전화번호" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={handleClose} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
          <button onClick={handleSave} disabled={isSaving} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSaving ? 0.7 : 1 }}>
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
