'use client'

import { useEffect, useState } from 'react'
import type { Device, DeviceForm } from '../types'
import {
  CARD_BG, DANGER_BG, INPUT_BORDER, PANEL_BG, TEXT_PRIMARY,
  WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, inputStyle, dateInputStyle, modalOverlayStyle,
} from '../constants'

type Props = {
  device: Device | null
  isSaving: boolean
  onClose: () => void
  onSave: (form: DeviceForm) => void
  onDelete: () => void
}

export default function DeviceEditModal({ device, isSaving, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<DeviceForm>({ device_name: '', device_name2: '', option: '', serial_number: '', program: 'ACCTee', install_date: '', category: '20' })

  useEffect(() => {
    if (device) {
      setForm({
        device_name: device.device_name ?? '',
        device_name2: device.device_name2 ?? '',
        option: device.option ?? '',
        serial_number: device.serial_number ?? '',
        program: device.program ?? 'ACCTee',
        install_date: device.install_date ?? '',
        category: device.category ?? '20',
      })
    }
  }, [device])

  if (!device) return null

  const handleSave = () => {
    if (!form.device_name.trim()) { alert('장비 라인업을 입력해주세요.'); return }
    onSave(form)
  }

  return (
    <div onClick={onClose} style={modalOverlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>장비 수정</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <input value={form.device_name} onChange={(e) => setForm(p => ({ ...p, device_name: e.target.value }))} placeholder="장비 라인업" style={{ ...inputStyle, fontSize: 12 }} />
            <input value={form.device_name2} onChange={(e) => setForm(p => ({ ...p, device_name2: e.target.value }))} placeholder="장비 모델명" style={{ ...inputStyle, fontSize: 12 }} />
            <input value={form.option} onChange={(e) => setForm(p => ({ ...p, option: e.target.value }))} placeholder="옵션" style={{ ...inputStyle, fontSize: 12 }} />
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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
          <button onClick={onDelete} disabled={isSaving} style={{ padding: '10px 14px', background: DANGER_BG, color: '#fff', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSaving ? 0.7 : 1 }}>삭제</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
            <button onClick={handleSave} disabled={isSaving} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
