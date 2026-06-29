import type { Device } from './types'

export function getInstallDisplay(device: Device): string {
  const rawYear = device.install_year?.toString().trim() || ''
  const rawDate = device.install_date?.toString().trim() || ''
  if (!rawDate && !rawYear) return '-'
  if (rawYear && rawDate) {
    if (rawDate.startsWith(rawYear)) return rawDate
    return `${rawYear} - ${rawDate}`
  }
  if (rawDate) return rawDate
  return rawYear
}

export function getDefaultImageUrl(device: Device, supabaseUrl: string): string | null {
  const base = `${supabaseUrl}/storage/v1/object/public/device-images`
  const lineup = (device.device_name ?? '').toLowerCase()
  const combined = `${device.device_name2 ?? ''} ${device.option ?? ''}`.toLowerCase()
  const isSurfcom = lineup.includes('surfcom')
  const allText = `${lineup} ${combined}` // 라인업+모델+옵션 전체

  // AXCEL — 이름 어디에든 AXCEL이 포함되면 매칭
  if (allText.includes('axcel')) return `${base}/default_AXCEL.jpg`

  // SURFCOM 전용 (라인업 + 모델 동시 매칭) — RONDCOM 등 동일 모델번호와 구분
  if (isSurfcom && combined.includes('nex200')) return `${base}/default_SNEX200.jpg`
  if (isSurfcom && combined.includes('nex030')) return `${base}/default_SNEX030.jpg`
  if (isSurfcom && combined.includes('nex001')) return `${base}/default_SNEX001.jpg`
  if (isSurfcom && combined.includes('touch') && combined.includes('50')) return `${base}/default_STOUCH50.jpg`

  if (combined.includes('nex200')) return `${base}/default_RNEX200.jpg`
  if (combined.includes('1800')) return `${base}/default_S1800.png`
  if (combined.includes('1600')) return `${base}/default_C1600.png`
  if (combined.includes('1400')) return `${base}/default_S1400.png`
  if (combined.includes('73')) return `${base}/default_R73A.jpg`
  return null
}
