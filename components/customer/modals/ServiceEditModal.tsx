'use client'

import { useEffect, useState } from 'react'
import type { Contact, Engineer, ServiceForm, ServiceHistory } from '../types'
import {
  CARD_BG, DANGER_BG, INPUT_BG, INPUT_BORDER, PANEL_BG, TEXT_PRIMARY, TEXT_SECONDARY,
  WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, inputStyle, dateInputStyle, textareaStyle, modalOverlayStyle,
} from '../constants'

type Props = {
  service: ServiceHistory | null
  contacts: Contact[]
  engineers: Engineer[]
  isSaving: boolean
  onClose: () => void
  onSave: (form: ServiceForm, engineerIds: number[]) => void
  onDelete: () => void
}

export default function ServiceEditModal({ service, contacts, engineers, isSaving, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<ServiceForm>({ visit_date: '', service_notes: '', visitor: '', service_type: '신규설치', contact_id: null, is_paid: true, work_hours: '2' })
  const [selectedEngineerIds, setSelectedEngineerIds] = useState<number[]>([])
  const [showExtraEngineers, setShowExtraEngineers] = useState(false)

  useEffect(() => {
    if (service) {
      setForm({
        visit_date: service.visit_date ?? '',
        service_notes: service.service_notes ?? '',
        visitor: service.visitor ?? '',
        service_type: service.service_type ?? '신규설치',
        contact_id: service.contact_id ?? null,
        is_paid: service.is_paid ?? true,
        work_hours: service.work_hours ? String(service.work_hours) : '',
      })
      setSelectedEngineerIds((service.service_engineers ?? []).map(se => se.engineer_id))
      setShowExtraEngineers(false)
    }
  }, [service])

  if (!service) return null

  const handleSave = () => {
    if (!form.visit_date.trim()) { alert('방문일자를 입력해주세요.'); return }
    if (!form.service_notes.trim()) { alert('서비스 내용을 입력해주세요.'); return }
    if (!form.contact_id) { alert('고객 담당자를 선택해주세요.'); return }
    if (selectedEngineerIds.length === 0) { alert('방문 엔지니어를 선택해주세요.'); return }
    onSave(form, selectedEngineerIds)
  }

  return (
    <div onClick={onClose} style={modalOverlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: TEXT_PRIMARY }}>서비스 기록 수정</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <textarea value={form.service_notes} onChange={(e) => setForm(p => ({ ...p, service_notes: e.target.value }))} placeholder="서비스 내용" rows={8} style={textareaStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr', gap: 12 }}>
            <select value={form.service_type} onChange={(e) => setForm(p => ({ ...p, service_type: e.target.value }))} style={inputStyle}>
              <option value="신규설치">신규 설치</option>
              <option value="이전설치">이전 설치</option>
              <option value="A/S">A/S</option>
              <option value="B/S">B/S</option>
              <option value="교육">교육</option>
            </select>
            <select value={form.is_paid ? 'true' : 'false'} onChange={(e) => setForm(p => ({ ...p, is_paid: e.target.value === 'true' }))} style={inputStyle}>
              <option value="true">유상</option>
              <option value="false">무상</option>
            </select>
            <input type="date" value={form.visit_date} onChange={(e) => setForm(p => ({ ...p, visit_date: e.target.value }))} style={dateInputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 12, alignItems: 'center' }}>
            <select value={form.contact_id ?? ''} onChange={(e) => setForm(p => ({ ...p, contact_id: e.target.value ? Number(e.target.value) : null }))} style={inputStyle}>
              <option value="">고객 담당자 선택</option>
              {contacts.map(c => <option key={c.contact_id} value={c.contact_id}>{c.name} {c.position ?? ''}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, padding: '8px 14px' }}>
              <span style={{ fontSize: 12, color: TEXT_SECONDARY, whiteSpace: 'nowrap' }}>작업시간(h)</span>
              <button onClick={() => setForm(p => ({ ...p, work_hours: String(Math.max(0, parseFloat(p.work_hours || '2') - 0.5)) }))} style={{ width: 28, height: 28, border: `1px solid ${INPUT_BORDER}`, borderRadius: 6, background: '#f3f4f6', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>▼</button>
              <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{form.work_hours || '2'}</span>
              <button onClick={() => setForm(p => ({ ...p, work_hours: String(parseFloat(p.work_hours || '2') + 0.5) }))} style={{ width: 28, height: 28, border: `1px solid ${INPUT_BORDER}`, borderRadius: 6, background: '#f3f4f6', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>▲</button>
            </div>
          </div>
          <div style={{ border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, padding: 12, background: INPUT_BG }}>
            <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginBottom: 10 }}>방문 엔지니어</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedEngineerIds.map(id => {
                const eng = engineers.find(e => e.engineer_id === id)
                if (!eng) return null
                return (
                  <button key={id} onClick={() => setSelectedEngineerIds(p => p.filter(i => i !== id))}
                    style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid #234ea2', background: '#234ea2', color: '#ffffff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {eng.name} {eng.position || ''}
                    <span style={{ fontSize: 14, opacity: 0.8 }}>✕</span>
                  </button>
                )
              })}
              <button onClick={() => setShowExtraEngineers(p => !p)}
                style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${INPUT_BORDER}`, background: showExtraEngineers ? '#f0f4ff' : INPUT_BG, color: '#234ea2', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                + 추가
              </button>
            </div>
            {showExtraEngineers && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 10, borderTop: `1px solid ${INPUT_BORDER}` }}>
                {engineers.filter(e => !selectedEngineerIds.includes(e.engineer_id)).map(eng => (
                  <button key={eng.engineer_id} onClick={() => { setSelectedEngineerIds(p => [...p, eng.engineer_id]); setShowExtraEngineers(false) }}
                    style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${INPUT_BORDER}`, background: INPUT_BG, color: TEXT_PRIMARY, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    {eng.name} {eng.position || ''}
                  </button>
                ))}
              </div>
            )}
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
