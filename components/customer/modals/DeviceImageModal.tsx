'use client'

import { useState } from 'react'
import type { Device } from '../types'
import { CARD_BG, INPUT_BORDER, PANEL_BG, TEXT_PRIMARY, WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, inputStyle, modalOverlayStyle } from '../constants'

type Props = {
  device: Device | null
  isSaving: boolean
  onClose: () => void
  onSave: (file: File) => void
}

export default function DeviceImageModal({ device, isSaving, onClose, onSave }: Props) {
  const [file, setFile] = useState<File | null>(null)

  if (!device) return null

  const handleClose = () => { setFile(null); onClose() }

  const handleSave = () => {
    if (!file) { alert('이미지 파일을 선택해주세요.'); return }
    onSave(file)
    setFile(null)
  }

  return (
    <div onClick={handleClose} style={modalOverlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: CARD_BG, borderRadius: 18, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>장비 사진 추가</div>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={inputStyle} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={handleClose} style={{ padding: '10px 14px', background: PANEL_BG, color: TEXT_PRIMARY, borderRadius: 10, border: `1px solid ${INPUT_BORDER}`, cursor: 'pointer', fontWeight: 600 }}>취소</button>
          <button onClick={handleSave} disabled={isSaving} style={{ padding: '10px 14px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, opacity: isSaving ? 0.7 : 1 }}>
            {isSaving ? '업로드 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
