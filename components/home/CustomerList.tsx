//customer list 컴포넌트

'use client'

import {
  CARD_BG,
  INPUT_BORDER,
  PANEL_BG,
  TEXT_SECONDARY,
  type Customer,
  type Device,
} from '@/lib/home'
import CustomerCard from './CustomerCard'

type Props = {
  customers: Customer[]
  deviceMap: Map<number, Device[]>
  onMove: (customer: Customer) => void
  onDetailClick: () => void
  listScrollRef: React.RefObject<HTMLDivElement | null>
  onScrollSave?: () => void
}

export default function CustomerList({
  customers,
  deviceMap,
  onMove,
  onDetailClick,
  listScrollRef,
  onScrollSave,
}: Props) {
  return (
    <div
      style={{
        border: `1px solid ${INPUT_BORDER}`,
        borderRadius: 20,
        padding: 8,
        background: PANEL_BG,
        flex: 1,
        minHeight: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        ref={listScrollRef}
        onScroll={onScrollSave}
        style={{
          height: '100%',
          overflowY: 'auto',
          paddingRight: 2,
        }}
      >
        {customers.length === 0 ? (
          <div style={{ padding: 12, color: TEXT_SECONDARY }}>
            검색 결과가 없습니다.
          </div>
        ) : (
          customers.map((c) => {
            const devices = deviceMap.get(Number(c.customer_id)) || []

            return (
              <CustomerCard
                key={c.customer_id}
                customer={c}
                devices={devices}
                onMove={() => onMove(c)}
                onDetailClick={onDetailClick}
              />
            )
          })
        )}
      </div>
    </div>
  )
}