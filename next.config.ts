import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Supabase API + Storage + Realtime + 한국수출입은행 환율 API + 폰트 다운로드
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://oapi.koreaexim.go.kr https://fonts.gstatic.com",
      // Kakao Maps SDK
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://dapi.kakao.com https://t1.daumcdn.net",
      // Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // 이미지: Supabase Storage, Kakao, data URI, blob
      "img-src 'self' data: blob: https://*.supabase.co https://*.daumcdn.net https://t1.kakaocdn.net",
      // @react-pdf/renderer PDFViewer는 blob: URL iframe으로 렌더링
      "frame-src 'self' blob:",
      // @react-pdf/renderer Web Worker (PDF 렌더링 스레드)
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
