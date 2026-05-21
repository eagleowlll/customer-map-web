'use client'

import { type Customer, type Device } from '@/lib/home'
import CustomerCard from './CustomerCard'

type Props = {
  customers: Customer[]
  deviceMap: Map<number, Device[]>
  onMove: (customer: Customer) => void
  onDetailClick: () => void
  listScrollRef: React.RefObject<HTMLDivElement | null>
  onScrollSave?: () => void
  isLoading?: boolean
}

function SkeletonCard() {
  return (
    <div style={{
      display: 'flex', marginBottom: 8, borderRadius: 14,
      border: '1px solid #eaecef', background: '#ffffff', overflow: 'hidden',
      animation: 'sk-pulse 1.6s ease-in-out infinite',
    }}>
      <div style={{ width: 4, flexShrink: 0, background: '#e9eaec' }} />
      <div style={{ flex: 1, padding: '11px 13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <div style={{ width: '50%', height: 14, borderRadius: 6, background: '#f0f1f3' }} />
          <div style={{ width: 34, height: 16, borderRadius: 99, background: '#f0f1f3' }} />
        </div>
        <div style={{ width: '76%', height: 12, borderRadius: 6, background: '#f0f1f3', marginBottom: 5 }} />
        <div style={{ width: '36%', height: 11, borderRadius: 6, background: '#f0f1f3', marginBottom: 9 }} />
        <div style={{ display: 'flex', gap: 5 }}>
          <div style={{ width: 62, height: 20, borderRadius: 6, background: '#f0f1f3' }} />
          <div style={{ width: 78, height: 20, borderRadius: 6, background: '#f0f1f3' }} />
        </div>
      </div>
    </div>
  )
}

export default function CustomerList({
  customers,
  deviceMap,
  onMove,
  onDetailClick,
  listScrollRef,
  onScrollSave,
  isLoading = false,
}: Props) {
  return (
    <div style={{
      borderRadius: 16,
      background: '#f8f9fb',
      border: '1px solid #eaecef',
      flex: 1, minHeight: 0, boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes sk-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .customer-list-scroll::-webkit-scrollbar { width: 4px; }
        .customer-list-scroll::-webkit-scrollbar-track { background: transparent; }
        .customer-list-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
        .customer-list-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
      <div
        ref={listScrollRef}
        onScroll={onScrollSave}
        className="customer-list-scroll"
        style={{ height: '100%', overflowY: 'auto', padding: '8px' }}
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : customers.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', minHeight: 220, gap: 10,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af' }}>검색 결과가 없습니다</div>
            <div style={{ fontSize: 12, color: '#c4c9d1' }}>다른 검색어나 필터를 시도해보세요</div>
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
