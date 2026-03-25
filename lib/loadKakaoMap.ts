declare global {
  interface Window {
    kakao: any
  }
}

let kakaoPromise: Promise<any> | null = null

export function loadKakaoMap() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window is undefined'))
  }

  if (window.kakao?.maps?.Map && window.kakao?.maps?.services) {
    return Promise.resolve(window.kakao)
  }

  if (kakaoPromise) return kakaoPromise

  kakaoPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('kakao-map-script') as HTMLScriptElement | null

    const onLoadKakao = () => {
      if (!window.kakao?.maps) {
        reject(new Error('카카오 지도 SDK 로드 실패'))
        return
      }

      window.kakao.maps.load(() => resolve(window.kakao))
    }

    if (existingScript) {
      if (window.kakao?.maps) {
        onLoadKakao()
      } else {
        existingScript.addEventListener('load', onLoadKakao)
        existingScript.addEventListener('error', () =>
          reject(new Error('카카오 지도 SDK 로드 실패'))
        )
      }
      return
    }

    const script = document.createElement('script')
    script.id = 'kakao-map-script'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false&libraries=services,clusterer`
    script.async = true

    script.onload = onLoadKakao
    script.onerror = () => reject(new Error('카카오 지도 SDK 로드 실패'))

    document.head.appendChild(script)
  })

  return kakaoPromise
}