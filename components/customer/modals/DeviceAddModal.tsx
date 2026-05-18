'use client'

import { useState } from 'react'
import type { DeviceForm } from '../types'
import {
  CARD_BG, INPUT_BORDER, PANEL_BG, TEXT_PRIMARY,
  WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, inputStyle, dateInputStyle, modalOverlayStyle,
} from '../constants'

type Props = {
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (form: DeviceForm) => void
}

const emptyForm: DeviceForm = { device_name: '', device_name2: '', option: '', serial_number: '', program: 'ACCTee', install_date: '', category: '20' }

export default function DeviceAddModal({ isOpen, isSaving, onClose, onSave }: Props) {
  const [form, setForm] = useState<DeviceForm>(emptyForm)

  if (!isOpen) return null

  const handleSave = () => {
    if (!form.device_name.trim()) { alert('장비 라인업을 입력해주세요.'); return }
    onSave(form)
    setForm(emptyForm)
  }

  const handleClose = () => { setForm(emptyForm); onClose() }

  return (
    <div onClick={handleClose} style={modalOverlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>장비 추가</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <input value={form.device_name} onChange={(e) => setForm(p => ({ ...p, device_name: e.target.value }))} placeholder="장비 라인업(ex. SURFCOM)" style={{ ...inputStyle, fontSize: 12 }} />
            <input value={form.device_name2} onChange={(e) => setForm(p => ({ ...p, device_name2: e.target.value }))} placeholder="장비 모델명(ex. 1600D)" style={{ ...inputStyle, fontSize: 12 }} />
            <input value={form.option} onChange={(e) => setForm(p => ({ ...p, option: e.target.value }))} placeholder="옵션(ex. -12)" style={{ ...inputStyle, fontSize: 12 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input value={form.serial_number} onChange={(e) => setForm(p => ({ ...p, serial_number: e.target.value }))} placeholder="시리얼넘버" style={inputStyle} />
            <select value={form.program} onChange={(e) => setForm(p => ({ ...p, program: e.target.value }))} style={inputStyle}>
              <option value="ACCTee">프로그램: ACCTee</option>
              <option value="Tims">프로그램: Tims</option>
              <option value="CALYPSO">프로그램: CALYPSO</option>
              <option value="없음">프로그램: 없음</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="date" value={form.install_date} onChange={(e) => setForm(p => ({ ...p, install_date: e.target.value }))} style={dateInputStyle} />
            <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
              <option value="20">구분: 20</option>
              <option value="81">구분: 81</option>
              <option value="83">구분: 83</option>
              <option value="84">구분: 84</option>
            </select>
          </div>
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
