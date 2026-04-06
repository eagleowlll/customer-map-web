'use client'

import {
  CARD_BG,
  INPUT_BORDER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  getDeviceLines,
  type Customer,
  type Device,
} from '@/lib/home'

type Props = {
  customer: Customer
  devices: Device[]
  onMove: () => void
  onDetailClick: () => void
}

export default function CustomerCard({
  customer,
  devices,
  onMove,
  onDetailClick,
}: Props) {
  const deviceLines = getDeviceLines(devices)

  return (
    <button
      onClick={onMove}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: 14,
        border: `1px solid ${INPUT_BORDER}`,
        borderRadius: 18,
        marginBottom: 10,
        background: CARD_BG,
        color: TEXT_PRIMARY,
        cursor: 'pointer',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontWeight: 800, color: TEXT_PRIMARY, fontSize: 18 }}>
        {customer.company_name}{' '}
        <span style={{ fontWeight: 500, fontSize: 12, color: TEXT_SECONDARY }}>
          ({customer.status ?? '-'})
        </span>
      </div>

      <div
        style={{
          fontSize: 12,
          marginTop: 4,
          color: customer.address ? TEXT_SECONDARY : '#ef4444',
          fontWeight: customer.address ? 400 : 700,
          lineHeight: 1.45,
        }}
      >
        {customer.address ? customer.address : '주소 정보 없음 등록 필요'}
      </div>

      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>
        대리점: {customer.agency ?? '-'}
      </div>

      <div
        style={{
          fontSize: 12,
          color: TEXT_SECONDARY,
          marginTop: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <span
          style={{
            minWidth: 0,
            whiteSpace: 'pre-line',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            flex: 1,
          }}
        >
          {deviceLines.join('\n')}
        </span>

        <a
          href={`/customer/${customer.customer_id}`}
          onClick={(e) => {
            e.stopPropagation()
            onDetailClick()
          }}
          style={{
            color: TEXT_PRIMARY,
            fontWeight: 700,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            alignSelf: 'flex-end',
          }}
        >
          상세보기
        </a>
      </div>
    </button>
  )
}