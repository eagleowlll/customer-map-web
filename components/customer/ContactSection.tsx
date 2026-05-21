'use client'

import { useState } from 'react'
import type { Contact } from './types'
import { INPUT_BORDER, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY, WHITE_BUTTON_BG } from './constants'

type Props = {
  contacts: Contact[]
  onAdd: () => void
  onEdit: (contact: Contact) => void
}

function ContactCard({ contact, onEdit }: { contact: Contact; onEdit: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minWidth: 240, maxWidth: 240, background: '#ffffff', borderRadius: 16, padding: '18px 18px 16px',
        border: `1px solid ${hovered ? '#c7d7f8' : INPUT_BORDER}`,
        flex: '0 0 auto', position: 'relative',
        boxShadow: hovered ? '0 6px 20px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
      }}
    >
      <button
        onClick={onEdit}
        style={{
          position: 'absolute', top: 12, right: 12, width: 26, height: 26,
          borderRadius: '50%', background: hovered ? '#eff4ff' : '#f4f5f7',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: hovered ? WHITE_BUTTON_BG : TEXT_MUTED,
          transition: 'all 0.15s ease',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* 이름 + 직책 */}
      <div style={{ fontSize: 15, fontWeight: 800, color: TEXT_PRIMARY, marginBottom: 3, paddingRight: 30 }}>
        {contact.name ?? '-'}
        {contact.position && (
          <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginLeft: 5 }}>
            {contact.position}
          </span>
        )}
      </div>

      {/* 부서 */}
      <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 12, minHeight: 16 }}>
        {contact.department?.trim() || '부서 정보 없음'}
      </div>

      {/* 전화번호 */}
      {contact.phone ? (
        <a
          href={`tel:${contact.phone}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, color: WHITE_BUTTON_BG, fontWeight: 600,
            textDecoration: 'none', marginBottom: 6,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.59A2 2 0 012 .01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
          {contact.phone}
        </a>
      ) : (
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 6 }}>전화번호 없음</div>
      )}

      {/* 이메일 */}
      {contact.email ? (
        <a
          href={`mailto:${contact.email}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500,
            textDecoration: 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2.2" style={{ flexShrink: 0 }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          {contact.email}
        </a>
      ) : (
        <div style={{ fontSize: 12, color: TEXT_MUTED }}>이메일 없음</div>
      )}
    </div>
  )
}

export default function ContactSection({ contacts, onAdd, onEdit }: Props) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY }}>담당자</h2>
        {contacts.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: '#eff4ff', color: WHITE_BUTTON_BG,
          }}>
            {contacts.length}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {contacts.map((c) => (
          <ContactCard key={c.contact_id} contact={c} onEdit={() => onEdit(c)} />
        ))}

        {/* 추가 버튼 */}
        <button
          onClick={onAdd}
          style={{
            minWidth: 240, flex: '0 0 auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#ffffff', border: `2px dashed ${INPUT_BORDER}`, borderRadius: 16,
            cursor: 'pointer', color: TEXT_MUTED, fontSize: 13, fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#234ea2'
            e.currentTarget.style.color = '#234ea2'
            e.currentTarget.style.background = '#f8faff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = INPUT_BORDER
            e.currentTarget.style.color = TEXT_MUTED
            e.currentTarget.style.background = '#ffffff'
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: '50%', background: '#f4f5f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, lineHeight: 1,
          }}>+</div>
          담당자 추가
        </button>
      </div>
    </div>
  )
}
