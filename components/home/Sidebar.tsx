//sidebar 컴포넌트

'use client'

import CustomerList from './CustomerList'
import {
  INPUT_BORDER,
  PANEL_BG,
  TEXT_MUTED,
  TEXT_PRIMARY,
  controlButtonStyle,
  WHITE_BUTTON_BG,
  WHITE_BUTTON_TEXT,
  type Customer,
  type Device,
} from '@/lib/home'

type Props = {
  query: string
  setQuery: (v: string) => void

  selectedStatuses: string[]
  toggleStatus: (status: string) => void

  onAddClick: () => void

  customers: Customer[]
  deviceMap: Map<number, Device[]>

  onMove: (customer: Customer) => void
  onDetailClick: () => void

  listScrollRef: React.RefObject<HTMLDivElement | null>
  onScrollSave: () => void
}

export default function Sidebar({
  query,
  setQuery,
  selectedStatuses,
  toggleStatus,
  onAddClick,
  customers,
  deviceMap,
  onMove,
  onDetailClick,
  listScrollRef,
  onScrollSave,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      {/* 검색 */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="회사명 / 주소 / 상태 / 대리점 검색"
          style={{
            width: '100%',
            padding: '14px 42px 14px 14px',
            border: `1px solid ${INPUT_BORDER}`,
            borderRadius: 16,
            background: PANEL_BG,
            color: TEXT_PRIMARY,
            fontSize: 15,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />

        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: TEXT_MUTED,
              color: PANEL_BG,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 필터 + 버튼 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginBottom: 3,
        }}
      >
       

     
      </div>

      {/* 리스트 */}
      <CustomerList
        customers={customers}
        deviceMap={deviceMap}
        onMove={onMove}
        onDetailClick={onDetailClick}
        listScrollRef={listScrollRef}
        onScrollSave={onScrollSave}
      />
    </div>
  )
}