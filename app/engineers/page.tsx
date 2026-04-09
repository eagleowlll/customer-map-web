'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PAGE_BG = '#f4f5f7'
const PANEL_BG = '#ffffff'
const INPUT_BORDER = '#e2e4e9'
const TEXT_PRIMARY = '#111113'
const TEXT_SECONDARY = '#4b5563'
const INPUT_BG = '#ffffff'
const BLUE_BG = '#234ea2'
const BLUE_TEXT = '#ffffff'
const DANGER_BG = '#dc2626'

type Engineer = {
  engineer_id: number
  name: string
  position: string | null
}

export default function EngineersPage() {
  const supabase = createClient()

  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedEngineer, setSelectedEngineer] = useState<Engineer | null>(null)

  const [form, setForm] = useState({ name: '', position: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchEngineers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('engineers')
      .select('*')
      .order('engineer_id', { ascending: true })
    setEngineers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchEngineers()
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }
    setIsSaving(true)
    const { error } = await supabase.from('engineers').insert([{
      name: form.name.trim(),
      position: form.position.trim() || null,
    }])
    setIsSaving(false)
    if (error) { alert(error.message); return }
    setIsAddModalOpen(false)
    setForm({ name: '', position: '' })
    await fetchEngineers()
  }

  const handleEdit = async () => {
    if (!selectedEngineer) return
    if (!form.name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }
    setIsSaving(true)
    const { error } = await supabase
      .from('engineers')
      .update({ name: form.name.trim(), position: form.position.trim() || null })
      .eq('engineer_id', selectedEngineer.engineer_id)
    setIsSaving(false)
    if (error) { alert(error.message); return }
    setIsEditModalOpen(false)
    setSelectedEngineer(null)
    await fetchEngineers()
  }

  const handleDelete = async () => {
    if (!selectedEngineer) return
    const ok = confirm('이 엔지니어를 삭제하시겠습니까?')
    if (!ok) return
    setIsDeleting(true)
    const { error } = await supabase
      .from('engineers')
      .delete()
      .eq('engineer_id', selectedEngineer.engineer_id)
    setIsDeleting(false)
    if (error) { alert(error.message); return }
    setIsEditModalOpen(false)
    setSelectedEngineer(null)
    await fetchEngineers()
  }

  const inputStyle = {
    width: '100%',
    padding: 12,
    border: `1px solid ${INPUT_BORDER}`,
    borderRadius: 10,
    background: INPUT_BG,
    color: TEXT_PRIMARY,
    boxSizing: 'border-box' as const,
    outline: 'none',
    fontSize: 15,
  }

  return (
    <main style={{ padding: 24, background: PAGE_BG, minHeight: '100vh' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT_PRIMARY, margin: 0 }}>
            엔지니어 관리
          </h1>
          <button
            onClick={() => { setForm({ name: '', position: '' }); setIsAddModalOpen(true) }}
            style={{
              padding: '10px 18px',
              background: BLUE_BG,
              color: BLUE_TEXT,
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            + 엔지니어 추가
          </button>
        </div>

        {loading ? (
          <p style={{ color: TEXT_SECONDARY }}>불러오는 중...</p>
        ) : engineers.length === 0 ? (
          <p style={{ color: TEXT_SECONDARY }}>등록된 엔지니어가 없습니다.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {engineers.map((e) => (
              <div
                key={e.engineer_id}
                style={{
                  background: PANEL_BG,
                  border: `1px solid ${INPUT_BORDER}`,
                  borderRadius: 14,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: TEXT_PRIMARY }}>{e.name}</div>
                  <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 4 }}>
                    {e.position ?? '직책 없음'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEngineer(e)
                    setForm({ name: e.name, position: e.position ?? '' })
                    setIsEditModalOpen(true)
                  }}
                  style={{
                    padding: '8px 14px',
                    background: BLUE_BG,
                    color: BLUE_TEXT,
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  수정
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 추가 모달 */}
      {isAddModalOpen && (
        <div
          onClick={() => setIsAddModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, background: PANEL_BG,
              borderRadius: 18, padding: 24, border: `1px solid ${INPUT_BORDER}`,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>
              엔지니어 추가
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="이름"
                style={inputStyle}
              />
              <input
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                placeholder="직책 (예: 과장, 대리)"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  padding: '10px 14px', background: PAGE_BG, color: TEXT_PRIMARY,
                  border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, fontWeight: 600, cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={isSaving}
                style={{
                  padding: '10px 14px', background: BLUE_BG, color: BLUE_TEXT,
                  border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {isEditModalOpen && (
        <div
          onClick={() => { setIsEditModalOpen(false); setSelectedEngineer(null) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, background: PANEL_BG,
              borderRadius: 18, padding: 24, border: `1px solid ${INPUT_BORDER}`,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: TEXT_PRIMARY }}>
              엔지니어 수정
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="이름"
                style={inputStyle}
              />
              <input
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                placeholder="직책 (예: 과장, 대리)"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  padding: '10px 14px', background: DANGER_BG, color: '#fff',
                  border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setIsEditModalOpen(false); setSelectedEngineer(null) }}
                  style={{
                    padding: '10px 14px', background: PAGE_BG, color: TEXT_PRIMARY,
                    border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleEdit}
                  disabled={isSaving}
                  style={{
                    padding: '10px 14px', background: BLUE_BG, color: BLUE_TEXT,
                    border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}