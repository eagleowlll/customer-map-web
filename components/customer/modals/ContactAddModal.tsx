'use client'

import { useState } from 'react'
import type { ContactForm } from '../types'
import {
  INPUT_BORDER, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY,
  WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, inputStyle, modalOverlayStyle,
} from '../constants'

type Props = {
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (form: ContactForm) => void
}

const emptyForm: ContactForm = { name: '', department: '', position: '', phone: '', email: '' }
const labelStyle = { fontSize: 12, fontWeight: 600, color: TEXT_MUTED, marginBottom: 5, display: 'block' } as const

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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: '#ffffff', borderRadius: 20, padding: 28,
          boxShadow: '0 16px 48px rgba(0,0,0,0.22)', border: `1px solid ${INPUT_BORDER}`,
          animation: 'modal-in 0.18s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY }}>담당자 추가</div>
          <button
            onClick={handleClose}
            style={{ width: 30, height: 30, borderRadius: '50%', background: '#f4f5f7', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_SECONDARY }}
          >✕</button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>이름 *</label>
              <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="이름" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>직책</label>
              <input value={form.position} onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))} placeholder="직책" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>부서</label>
            <input value={form.department} onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))} placeholder="부서" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>전화번호</label>
            <input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="전화번호" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>이메일</label>
            <input value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="이메일" type="email" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <button
            onClick={handleClose}
            style={{ padding: '10px 16px', background: '#f4f5f7', color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >취소</button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{ padding: '10px 20px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: isSaving ? 0.7 : 1 }}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
