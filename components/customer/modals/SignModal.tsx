'use client'

import { useRef, useState } from 'react'
import { CARD_BG, INPUT_BORDER, PANEL_BG, TEXT_MUTED, TEXT_PRIMARY, WHITE_BUTTON_BG, WHITE_BUTTON_TEXT, modalOverlayStyle } from '../constants'

type Props = {
  isOpen: boolean
  onClose: () => void
  onComplete: (engineerSignDataUrl: string, customerSignDataUrl: string) => void
}

export default function SignModal({ isOpen, onClose, onComplete }: Props) {
  const [signStep, setSignStep] = useState(1)
  const [engineerSigning, setEngineerSigning] = useState(false)
  const [customerSigning, setCustomerSigning] = useState(false)
  const engineerSignRef = useRef<HTMLCanvasElement>(null)
  const customerSignRef = useRef<HTMLCanvasElement>(null)

  if (!isOpen) return null

  const clearCanvas = () => {
    const ref = signStep === 1 ? engineerSignRef : customerSignRef
    ref.current?.getContext('2d')?.clearRect(0, 0, ref.current.width, ref.current.height)
  }

  const handleBack = () => {
    if (signStep === 2) {
      setSignStep(1)
    } else {
      setSignStep(1)
      onClose()
    }
  }

  const handleNext = async () => {
    if (signStep === 1) {
      setSignStep(2)
    } else {
      const engineerSignDataUrl = engineerSignRef.current!.toDataURL('image/png')
      const customerSignDataUrl = customerSignRef.current!.toDataURL('image/png')
      setSignStep(1)
      onComplete(engineerSignDataUrl, customerSignDataUrl)
    }
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={{ width: '100%', maxWidth: 520, background: CARD_BG, borderRadius: 18, padding: 24, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', border: `1px solid ${INPUT_BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#234ea2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>1</div>
          <div style={{ height: 2, flex: 1, background: signStep === 2 ? '#234ea2' : INPUT_BORDER, borderRadius: 2 }} />
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: signStep === 2 ? '#234ea2' : INPUT_BORDER, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>2</div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: TEXT_PRIMARY }}>
          {signStep === 1 ? '엔지니어 서명' : '고객 담당자 서명'}
        </div>
        <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 16 }}>
          {signStep === 1 ? '아래 칸에 서명해주세요' : '고객 담당자분께 서명을 받아주세요'}
        </div>

        {[
          { ref: engineerSignRef, step: 1, signing: engineerSigning, setSigning: setEngineerSigning },
          { ref: customerSignRef, step: 2, signing: customerSigning, setSigning: setCustomerSigning },
        ].map(({ ref, step, signing, setSigning }) => (
          <canvas
            key={step}
            ref={ref}
            width={900}
            height={240}
            style={{ width: '100%', height: 200, border: `2px solid ${INPUT_BORDER}`, borderRadius: 12, background: '#fff', cursor: 'crosshair', touchAction: 'none', display: signStep === step ? 'block' : 'none' }}
            onPointerDown={(e) => {
              setSigning(true)
              const canvas = ref.current!
              const rect = canvas.getBoundingClientRect()
              const ctx = canvas.getContext('2d')!
              ctx.beginPath()
              ctx.moveTo((e.clientX - rect.left) * canvas.width / rect.width, (e.clientY - rect.top) * canvas.height / rect.height)
              canvas.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (!signing) return
              const canvas = ref.current!
              const rect = canvas.getBoundingClientRect()
              const ctx = canvas.getContext('2d')!
              ctx.lineWidth = 3
              ctx.lineCap = 'round'
              ctx.lineJoin = 'round'
              ctx.strokeStyle = '#000'
              ctx.lineTo((e.clientX - rect.left) * canvas.width / rect.width, (e.clientY - rect.top) * canvas.height / rect.height)
              ctx.stroke()
            }}
            onPointerUp={() => setSigning(false)}
          />
        ))}

        <button onClick={clearCanvas} style={{ marginTop: 10, padding: '6px 14px', background: '#f3f4f6', border: `1px solid ${INPUT_BORDER}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          🗑 지우기
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
          <button onClick={handleBack} style={{ padding: '11px 20px', background: PANEL_BG, border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            {signStep === 2 ? '← 이전' : '취소'}
          </button>
          <button onClick={handleNext} style={{ padding: '11px 28px', background: WHITE_BUTTON_BG, color: WHITE_BUTTON_TEXT, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            {signStep === 1 ? '다음 →' : '✓ PDF 생성'}
          </button>
        </div>
      </div>
    </div>
  )
}
