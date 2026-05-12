'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BLUE = '#234ea2'
const PAGE_BG = '#f4f5f7'
const CARD_BG = '#ffffff'
const BORDER = '#e5e7eb'
const TEXT = '#111113'
const GRAY = '#6b7280'

const NAS_BASE = 'https://accretech.synology.me:14506'

const CATEGORIES = ['전체', '제품카탈로그', '매뉴얼', '사내양식', '기술자료']

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  '제품카탈로그': { bg: '#eff6ff', text: '#2563eb' },
  '매뉴얼':       { bg: '#f0fdf4', text: '#16a34a' },
  '사내양식':     { bg: '#fef9c3', text: '#a16207' },
  '기술자료':     { bg: '#fdf4ff', text: '#9333ea' },
}

const FILE_ICONS: Record<string, string> = {
  'pdf': '📄',
  'xlsx': '📊',
  'xls': '📊',
  'docx': '📝',
  'doc': '📝',
  'pptx': '📋',
  'ppt': '📋',
  'zip': '🗜️',
  'default': '📁',
}

type Document = {
  doc_id: number
  title: string
  category: string
  file_url: string
  file_type: string | null
  description: string | null
  engineer_id: number | null
  created_at: string
  engineers?: { name: string; position: string | null }
}

type Engineer = {
  engineer_id: number
  name: string
  position: string | null
}

function getFileIcon(fileType: string | null, url: string) {
  const ext = fileType || url.split('.').pop()?.toLowerCase() || 'default'
  return FILE_ICONS[ext] || FILE_ICONS['default']
}

function getFileExt(fileType: string | null, url: string) {
  return (fileType || url.split('.').pop() || '').toUpperCase()
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// NAS 경로를 WebDAV URL로 변환
// Z:\폴더\파일.pdf → https://accretech.synology.me:14506/폴더/파일.pdf
function toWebDAVUrl(path: string): string {
  if (path.startsWith('http')) return path
  const cleaned = path
    .replace(/^[A-Za-z]:\\?/, '')  // Z:\ 제거
    .replace(/\\/g, '/')            // \ → /
    .replace(/^\//, '')             // 앞 슬래시 제거
  return `${NAS_BASE}/${cleaned}`
}

export default function DocumentsPage() {
  const supabase = createClient()
  const [documents, setDocuments] = useState<Document[]>([])
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('전체')
  const [search, setSearch] = useState('')
  const [currentEngineer, setCurrentEngineer] = useState<Engineer | null>(null)

  // 등록 모달
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    title: '',
    category: '제품카탈로그',
    file_url: '',
    file_type: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: docs }, { data: engs }, { data: { user } }] = await Promise.all([
      supabase.from('documents')
        .select('*, engineers(name, position)')
        .order('created_at', { ascending: false }),
      supabase.from('engineers').select('engineer_id, name, position').order('engineer_id'),
      supabase.auth.getUser(),
    ])
    setDocuments((docs as Document[]) || [])
    setEngineers(engs || [])
    if (user && engs) {
      const me = (engs as Engineer[]).find((e: any) => e.email === user.email)
      if (me) setCurrentEngineer(me)
    }
    setLoading(false)
  }

  const filtered = documents.filter(d => {
    const matchCat = category === '전체' || d.category === category
    const matchSearch = !search.trim() ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleAdd = async () => {
    if (!addForm.title.trim()) { alert('제목을 입력해주세요.'); return }
    if (!addForm.file_url.trim()) { alert('파일 경로 또는 URL을 입력해주세요.'); return }
    setSaving(true)
    // 파일 확장자 자동 추출
    const ext = addForm.file_url.split('.').pop()?.toLowerCase() || ''
    const { error } = await supabase.from('documents').insert({
      title: addForm.title.trim(),
      category: addForm.category,
      file_url: addForm.file_url.trim(),
      file_type: addForm.file_type || ext || null,
      description: addForm.description.trim() || null,
      engineer_id: currentEngineer?.engineer_id || null,
    })
    setSaving(false)
    if (error) { alert(error.message); return }
    setShowAddModal(false)
    setAddForm({ title: '', category: '제품카탈로그', file_url: '', file_type: '', description: '' })
    await fetchAll()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { error } = await supabase.from('documents').delete().eq('doc_id', deleteTarget.doc_id)
    if (error) { alert(error.message); return }
    setDeleteTarget(null)
    await fetchAll()
  }

  const handleOpen = (doc: Document) => {
    const url = toWebDAVUrl(doc.file_url)
    window.open(url, '_blank')
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`,
    borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff',
    boxSizing: 'border-box', color: TEXT,
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: 16, color: GRAY }}>불러오는 중...</div>
  )

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', padding: '24px 28px', fontFamily: 'Malgun Gothic, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0 }}>📂 자료실</h1>
            <div style={{ fontSize: 13, color: GRAY, marginTop: 4 }}>NAS 연동 · 클릭 시 바로 열림</div>
          </div>
          <button onClick={() => setShowAddModal(true)}
            style={{ padding: '10px 20px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + 자료 등록
          </button>
        </div>

        {/* 필터 */}
        <div style={{ background: CARD_BG, borderRadius: 14, padding: '14px 18px', marginBottom: 20, border: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="제목 또는 설명 검색"
              style={{ ...inp, width: 240, flex: 'none' }} />
            <div style={{ width: 1, height: 24, background: BORDER }} />
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: category === c ? BLUE : '#f3f4f6', color: category === c ? '#fff' : TEXT }}>
                {c}
              </button>
            ))}
            <span style={{ fontSize: 12, color: GRAY, marginLeft: 'auto' }}>{filtered.length}개</span>
          </div>
        </div>

        {/* 카테고리별 섹션 */}
        {category === '전체' ? (
          CATEGORIES.filter(c => c !== '전체').map(cat => {
            const catDocs = filtered.filter(d => d.category === cat)
            if (catDocs.length === 0) return null
            const cc = CATEGORY_COLORS[cat] || { bg: '#f8fafc', text: GRAY }
            return (
              <div key={cat} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{cat}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: cc.bg, color: cc.text, fontWeight: 700 }}>{catDocs.length}개</span>
                </div>
                <DocGrid docs={catDocs} onOpen={handleOpen} onDelete={setDeleteTarget} currentEngineer={currentEngineer} />
              </div>
            )
          })
        ) : (
          <div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: GRAY, fontSize: 14 }}>
                등록된 자료가 없습니다
              </div>
            ) : (
              <DocGrid docs={filtered} onOpen={handleOpen} onDelete={setDeleteTarget} currentEngineer={currentEngineer} />
            )}
          </div>
        )}
      </div>

      {/* 자료 등록 모달 */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: CARD_BG, borderRadius: 18, padding: 28, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, marginBottom: 20 }}>자료 등록</div>

            <div style={{ display: 'grid', gap: 14 }}>
              {/* 제목 */}
              <div>
                <div style={{ fontSize: 12, color: GRAY, marginBottom: 5 }}>제목 *</div>
                <input value={addForm.title} onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="예: 83 종합 카달로그" style={inp} />
              </div>

              {/* 카테고리 */}
              <div>
                <div style={{ fontSize: 12, color: GRAY, marginBottom: 5 }}>카테고리 *</div>
                <select value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))} style={{ ...inp }}>
                  {CATEGORIES.filter(c => c !== '전체').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* 파일 경로 */}
              <div>
                <div style={{ fontSize: 12, color: GRAY, marginBottom: 5 }}>NAS 파일 경로 또는 URL *</div>
                <input value={addForm.file_url} onChange={e => setAddForm(p => ({ ...p, file_url: e.target.value }))}
                  placeholder="예: 계측부/카달로그/83 종합 카달로그.PDF" style={inp} />
               <div style={{ fontSize: 11, color: GRAY, marginTop: 4 }}>
                  💡 Z: 드라이브 경로를 그대로 복붙하면 자동 변환됩니다<br />
                  예) <code>Z:\계측부\카달로그\파일.pdf</code> 그대로 입력 가능
                </div>
              </div>

              {/* 설명 */}
              <div>
                <div style={{ fontSize: 12, color: GRAY, marginBottom: 5 }}>설명 (선택)</div>
                <input value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="예: 2026년 최신 버전" style={inp} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '11px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleAdd} disabled={saving}
                style={{ flex: 1, padding: '11px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: CARD_BG, borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 8 }}>자료 삭제</div>
            <div style={{ fontSize: 13, color: GRAY, marginBottom: 20 }}>
              <b style={{ color: TEXT }}>{deleteTarget.title}</b> 을(를) 삭제하시겠습니까?<br />
              <span style={{ fontSize: 11 }}>NAS 파일은 삭제되지 않고 목록에서만 제거됩니다.</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleDelete}
                style={{ flex: 1, padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 문서 그리드 ───────────────────────────────────────────────────────────────
function DocGrid({ docs, onOpen, onDelete, currentEngineer }: {
  docs: Document[]
  onOpen: (doc: Document) => void
  onDelete: (doc: Document) => void
  currentEngineer: Engineer | null
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
      {docs.map(doc => {
        const cc = CATEGORY_COLORS[doc.category] || { bg: '#f8fafc', text: GRAY }
        const icon = getFileIcon(doc.file_type, doc.file_url)
        const ext = getFileExt(doc.file_type, doc.file_url)
        return (
          <div key={doc.doc_id}
            style={{ background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden', transition: 'all 0.15s', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
            onClick={() => onOpen(doc)}>

            {/* 파일 아이콘 영역 */}
            <div style={{ background: cc.bg, padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
              {icon}
            </div>

            {/* 정보 영역 */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.4, flex: 1, paddingRight: 8 }}>{doc.title}</div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: cc.bg, color: cc.text, flexShrink: 0 }}>{ext}</span>
              </div>

              {doc.description && (
                <div style={{ fontSize: 12, color: GRAY, marginBottom: 8 }}>{doc.description}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ fontSize: 11, color: GRAY }}>
                  {doc.engineers?.name && <span>{doc.engineers.name} · </span>}
                  {formatDate(doc.created_at)}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(doc) }}
                  style={{ padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                  삭제
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
