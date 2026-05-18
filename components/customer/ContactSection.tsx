'use client'

import type { Contact } from './types'
import { CARD_BG, INPUT_BORDER, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY, WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, iconButtonStyle } from './constants'

type Props = {
  contacts: Contact[]
  onAdd: () => void
  onEdit: (contact: Contact) => void
}

export default function ContactSection({ contacts, onAdd, onEdit }: Props) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ color: TEXT_PRIMARY, marginBottom: 12, fontSize: 30, fontWeight: 800 }}>담당자</h2>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4, alignItems: 'flex-start' }}>
        {contacts.map((c) => {
          const departmentText = c.department?.trim() ? c.department : '부서정보 없음'
          return (
            <div key={c.contact_id} style={{ minWidth: 320, maxWidth: 320, background: CARD_BG, borderRadius: 18, padding: 18, color: TEXT_PRIMARY, border: `1px solid ${INPUT_BORDER}`, flex: '0 0 auto', textAlign: 'center', position: 'relative' }}>
              <button onClick={() => onEdit(c)} style={{ ...iconButtonStyle, position: 'absolute', top: 14, right: 14 }}>✏️</button>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: c.department?.trim() ? TEXT_SECONDARY : TEXT_MUTED }}>{departmentText}</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 10, color: TEXT_PRIMARY }}>{c.name ?? '-'} {c.position ?? ''}</div>
              <div style={{ fontSize: 15, color: TEXT_SECONDARY }}>{c.phone ?? '-'}</div>
            </div>
          )
        })}
        <div style={{ minWidth: 320, maxWidth: 320, minHeight: 156, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={onAdd} style={{ width: 68, height: 68, borderRadius: '50%', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, border: `1px solid ${INPUT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, cursor: 'pointer' }}>+</button>
        </div>
      </div>
    </div>
  )
}
