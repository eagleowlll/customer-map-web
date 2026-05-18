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
  const combined = `${device.device_name2 ?? ''} ${device.option ?? ''}`.toLowerCase()
  if (combined.includes('nex200')) return `${supabaseUrl}/storage/v1/object/public/device-images/default_RNEX200.jpg`
  if (combined.includes('1800')) return `${supabaseUrl}/storage/v1/object/public/device-images/default_S1800.png`
  if (combined.includes('1600')) return `${supabaseUrl}/storage/v1/object/public/device-images/default_C1600.png`
  if (combined.includes('1400')) return `${supabaseUrl}/storage/v1/object/public/device-images/default_S1400.png`
  if (combined.includes('73')) return `${supabaseUrl}/storage/v1/object/public/device-images/default_R73A.jpg`
  return null
}
