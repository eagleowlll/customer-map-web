# SECURITY AUDIT INVENTORY
**대상 시스템:** ACCRETECH Korea 사내 EMS (Customer Map Web)  
**감사 기준일:** 2026-05-29  
**감사 방법:** 소스코드 직접 열람 + read-only 명령어 (`git log`, `npm audit`, `grep`)  
**코드 수정:** 없음 (읽기 전용)

---

## ① 시스템·데이터 개요

### 1-1. 기술 스택 및 버전

| 항목 | 버전/내용 | 근거 |
|---|---|---|
| 프레임워크 | Next.js 16.1.7 (App Router) | `package.json:14` |
| 런타임 | React 19.2.3 | `package.json:15` |
| 언어 | TypeScript ^5 | `package.json:devDependencies` |
| 인증/DB | Supabase JS ^2.100.0 / SSR ^0.9.0 | `package.json:7-8` |
| 호스팅 | Vercel (vercel.json 없음 — 기본 설정 추정) | 파일 부재 |
| 보안 헤더 설정 | 없음 (next.config.ts 내 headers 미구성) | `next.config.ts:3` |
| PDF 생성 | @react-pdf/renderer ^4.5.1 | `package.json:5` |
| 엑셀 파싱 | xlsx ^0.18.5 (취약 버전 — E절 참조) | `package.json:11` |

### 1-2. 데이터베이스 테이블 및 민감 컬럼

코드에서 `.from('테이블명')` 패턴으로 참조 확인된 테이블 전수 목록:

| 테이블 | 민감 컬럼 (코드 확인) | 근거 |
|---|---|---|
| `customers` | company_name, address, latitude/longitude, status, agency, category | `hooks/useHomeData.ts:14` |
| `contacts` | name, department, position, **phone**, **email** | `app/customer/[id]/page.tsx:251` |
| `devices` | device_name, device_name2, serial_number, option, program | `app/customer/[id]/page.tsx:285` |
| `service_history` | service_notes, visit_date, is_paid, work_hours, service_type | `app/customer/[id]/page.tsx:131` |
| `service_engineers` | engineer_id, service_id (참조키) | `app/customer/[id]/page.tsx:139` |
| `engineers` | **name**, **email**, position, teams, **permission_level**, **is_inventory_manager**, initials | `app/admin/page.tsx:237` |
| `quotes` | total_supply, status, pdf_url, purchase_order_url, **delivery_info** (배송지), fail_reason | `app/api/purchase-order/route.ts:46` |
| `quote_items` | product_name, price, quantity | `app/customer/[id]/page.tsx:87` |
| `quote_sequence` | seq (견적번호 시퀀스) | `app/quote/page.tsx:458` |
| `price_list` | item_code, model_jp, 정가/구입가 (일본 원가) | `app/quote/page.tsx:699` |
| `exchange_rate` | rate, updated_at | `app/quote/page.tsx:676` |
| `sales_targets` | target_amount, engineer_id, year | `app/admin/page.tsx:197` |
| `inventory_items` | part_code, item_name, quantity, location, lot_no | `app/inventory/page.tsx:162` |
| `inventory_logs` | quantity_out, reason, outlet_company, engineer_id | `app/inventory/page.tsx:272` |
| `inventory_requests` | quantity, reason, status, reject_reason | `app/inventory/page.tsx:166` |
| `bulk_uploads` | success_count, fail_count | `app/inventory/page.tsx:399` |
| `notifications` | engineer_id, message, type, link | `app/api/purchase-order/route.ts:64` |
| `download_logs` | **engineer_id**, quote_id, **quote_number**, **company_name**, action | `app/sales/page.tsx:738` |
| `teams` | name, is_special, display_order | `app/admin/page.tsx:348` |
| `documents` | title, category, file_url, file_type, description | `app/library/page.tsx:136` |

### 1-3. 외부로 데이터가 나가는 경로

| 외부 서비스 | 흐르는 데이터 | 방향 | 근거 |
|---|---|---|---|
| **Supabase** (PostgreSQL + Auth + Storage) | 전체 DB 데이터, 파일(PDF/이미지), JWT 인증 토큰 | 양방향 | `lib/supabase/client.ts`, `lib/supabase/server.ts` |
| **Vercel** | 소스코드 배포, 환경변수, 서버 요청 로그 | 서버 실행 | vercel.json 없음 / 기본 배포 추정 |
| **Kakao Maps SDK** | 지도 렌더링 요청 (사용자 브라우저 IP, 고객사 좌표) | 클라이언트→Kakao | `lib/loadKakaoMap.ts` |
| **한국수출입은행 API** | JPY 환율 데이터 조회 (API Key 전송, 날짜) | 서버→외부 | `app/api/exchange-rate/route.ts:29` |
| **Google Fonts CDN** | 폰트 파일 요청 (NotoSansCJK) | 클라이언트→Google | `app/customer/[id]/page.tsx:29` |
| **Vercel Fonts** | Geist 폰트 (Next.js 기본 최적화 경유) | 클라이언트→Vercel | `app/layout.tsx:4` |

**NAS/WebDAV 연동:** 코드 내 NAS 직접 연동 없음 확인. 패킹리스트 파일은 Supabase Storage(`packing-lists` 버킷) 경유. (`app/page.tsx:368`)

---

## ② 통제 영역별 인벤토리

### A. 접근통제 · 인증

#### A-1. 인증 방식

| 항목 | 상태 | 구현 방식 | 근거 |
|---|---|---|---|
| 인증 수단 | ✅ | Supabase Auth (이메일/비밀번호 → JWT) | `app/login/page.tsx:20` |
| JWT 검증 (서버) | ✅ | `supabase.auth.getUser()` — 쿠키의 JWT를 서버에서 검증 | `lib/supabase/server.ts:4` |
| 세션 자동 만료 | ✅ | 30분 비활동 시 `supabase.auth.signOut()` + `/login` 리다이렉트 | `components/common/SessionManager.tsx:44` |
| 세션 타임아웃 방식 | ⚠️ | `localStorage` 기반 타임아웃 — 브라우저 탭 간 공유되나 서버측 세션 강제 아님. Supabase JWT 자체 만료 설정에 의존 | `SessionManager.tsx:39-48` |

#### A-2. 미들웨어 / 라우트 보호

| 항목 | 상태 | 구현 방식 | 근거 |
|---|---|---|---|
| Next.js `middleware.ts` | ❌ **갭** | `middleware.ts` 파일이 존재하지 않음. `proxy.ts`가 미들웨어 코드를 포함하지만 Next.js에 등록되지 않음 (함수명 `proxy`, default export 없음, 실제 실행 불가) | `proxy.ts:4`, `middleware.ts` 부재 |
| 페이지 단위 인증 리다이렉트 | ⚠️ 부분 | 일부 페이지(admin, account, inventory)는 `useEffect`+`getUser()`로 클라이언트 리다이렉트. 렌더링 후 검사되므로 HTML이 먼저 노출됨 | `app/admin/page.tsx:118-137` |
| 로그인 전 데이터 접근 방지 | ✅ (RLS 보완) | 미들웨어 부재를 Supabase RLS가 실질적으로 보완 — 미인증 상태의 anon 요청은 RLS로 차단됨 | Supabase RLS 설계 의존 |

#### A-3. 권한 모델

| 항목 | 상태 | 구현 방식 | 근거 |
|---|---|---|---|
| 역할 정의 위치 | ✅ | `engineers.permission_level` 컬럼: `superadmin` / `manager` / `member` | `app/api/create-user/route.ts:22` |
| 추가 권한 플래그 | ✅ | `is_inventory_manager` (재고 출고 승인 권한) | `app/inventory/page.tsx:86-87` |
| 역할 서버 강제 (API Routes) | ✅ | `create-user`, `delete-user`, `auto-fail`, `delete-quote-pdf`, `update-engineer` — 모두 `permission_level` DB 조회 후 403 반환 | `app/api/create-user/route.ts:17-23` |
| 역할 서버 강제 (페이지 직접 DB 쓰기) | ⚠️ **갭** | `inventory/page.tsx`의 출고 승인(`handleApprove`) — `isManager` 체크가 **클라이언트 UI 조건부 렌더링**으로만 존재. Supabase anon 클라이언트로 직접 `inventory_items.update()` 호출. RLS 미적용 시 우회 가능 | `app/inventory/page.tsx:252-290` |
| 역할 서버 강제 (구매/영업 페이지) | ⚠️ | `purchase/page.tsx:121` — `isAllowed` 체크는 클라이언트 변수. 실제 상태 변경은 `/api/purchase-order` 경유 (해당 API는 auth만 체크, 권한 미체크) | `app/purchase/page.tsx:121`, `app/api/purchase-order/route.ts:10-13` |

#### A-4. API 라우트 인가 현황

| API 경로 | 인증(authn) | 인가(authz) | 상태 | 근거 |
|---|---|---|---|---|
| `POST /api/create-user` | ✅ getUser | ✅ superadmin/manager | ✅ | `route.ts:13,22` |
| `POST /api/delete-user` | ✅ getUser | ✅ superadmin/manager + 계층 체크 | ✅ | `route.ts:13,22,46` |
| `POST /api/auto-fail` | ✅ getUser | ✅ superadmin/manager (2026-05-29 추가) | ✅ | `route.ts:12,20` |
| `POST /api/delete-quote-pdf` | ✅ getUser | ✅ superadmin/manager (2026-05-29 추가) | ✅ | `route.ts:8,17` |
| `GET /api/quote-pdf` | ✅ getUser | ✅ DB 소유권 검증 (2026-05-29 추가) | ✅ | `route.ts:8,21` |
| `POST /api/update-engineer` | ✅ getUser | ✅ superadmin/manager / permission_level 변경은 superadmin만 | ✅ | `route.ts:15,24,51` |
| `POST /api/purchase-order` | ✅ getUser | ❌ **갭** — 권한 체크 없음. 모든 로그인 사용자가 발주 상태 변경 가능 | ❌ | `route.ts:10-13` |
| `GET /api/purchase-order` | ✅ getUser | ✅ DB 소유권 검증 (2026-05-29 추가) | ✅ | `route.ts:214,233` |
| `GET /api/exchange-rate` | ❌ 없음 | ❌ 없음 | ❌ **갭** | `route.ts:16` |

#### A-5. RLS (Row Level Security)

| 항목 | 상태 | 비고 |
|---|---|---|
| RLS 정책 코드/마이그레이션 파일 | ℹ️ | 저장소 내 마이그레이션 SQL 없음. Supabase 대시보드에서만 확인 가능 |
| anon 키 클라이언트가 RLS 적용 받는지 | ✅ 설계상 보장 | `createBrowserClient(anon_key)` 사용 — Supabase 설계상 anon key는 RLS 적용 | `lib/supabase/client.ts:4` |
| service_role 키 RLS 우회 여부 | ✅ 의도된 설계 | API Routes 서버에서만 사용, RLS bypass는 서버측 검증 후 실행 | `app/api/*/route.ts` 전체 |
| 테이블별 RLS 실제 활성화 여부 | ℹ️ | **Kevin이 Supabase 대시보드에서 직접 확인 필요** | — |

---

### B. 데이터 보호 · 암호화

#### B-1. 전송 암호화

| 항목 | 상태 | 구현 방식 | 근거 |
|---|---|---|---|
| HTTPS (앱→Supabase) | ✅ | Supabase JS SDK 기본값 HTTPS | `lib/supabase/client.ts` |
| HTTPS (앱→환율 API) | ✅ (수정 후) | `fetch()` 사용으로 TLS 기본 검증 활성화 (2026-05-29 `rejectUnauthorized:false` 제거) | `app/api/exchange-rate/route.ts` |
| HTTPS 강제 (앱 레벨) | ℹ️ | Vercel은 HTTPS 기본 강제. next.config에 별도 설정 없음 | `next.config.ts` |
| 보안 헤더 (CSP, HSTS 등) | ❌ **갭** | `next.config.ts`에 `headers()` 설정 없음 — CSP, X-Frame-Options, HSTS 미설정 | `next.config.ts:3` |

#### B-2. 쿠키 보안

| 항목 | 상태 | 구현 방식 | 근거 |
|---|---|---|---|
| Supabase 세션 쿠키 속성 | ✅/ℹ️ | `@supabase/ssr`이 쿠키를 관리. httpOnly/Secure는 SSR 라이브러리 기본값에 의존 | `lib/supabase/server.ts:11-19` |
| 애플리케이션 직접 쿠키 사용 | ✅ | 앱이 직접 쿠키를 설정하는 코드 없음. 전적으로 Supabase SSR 라이브러리에 위임 | — |

#### B-3. 시크릿 관리

| 항목 | 상태 | 구현 방식 | 근거 |
|---|---|---|---|
| `.env.local` gitignore | ✅ | `.gitignore`의 `.env*` 패턴으로 커밋 방지 | `.gitignore:34` |
| `SUPABASE_SERVICE_ROLE_KEY` 위치 | ✅ | API Routes(`app/api/*/route.ts`)에서만 `process.env`로 참조 — 클라이언트 번들에 포함되지 않음 | `app/api/auto-fail/route.ts:7` 등 |
| `NEXT_PUBLIC_*` 클라이언트 노출 | ✅ 의도된 설계 | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_KAKAO_JS_KEY` — Supabase anon 키와 Kakao JS 키는 공개가 정상 | `lib/supabase/client.ts:5` |
| **하드코딩된 시크릿 (중대)** | ❌ **갭** | `upload_price_list.js:6`에 Supabase **anon 키** 하드코딩. `geocode_update.js:8`에 Kakao **REST API 키** 하드코딩. 두 파일 모두 저장소 루트에 위치하며 gitignore 제외됨 | `upload_price_list.js:6`, `geocode_update.js:8` |
| **XSS via innerHTML** | ⚠️ | `MapView.tsx:76` — Supabase DB에서 읽은 `c.company_name`, `c.address`, `c.agency`, `c.status`, `deviceLines` 값이 `innerHTML` 템플릿 리터럴에 직접 삽입됨. 공격자가 DB에 XSS 페이로드를 저장했을 경우 실행 가능 (Stored XSS) | `components/home/MapView.tsx:95-107` |

---

### C. 감사 로깅

| 항목 | 상태 | 구현 방식 | 근거 |
|---|---|---|---|
| 견적서 PDF 다운로드 로그 | ✅ | `download_logs` 테이블에 `engineer_id`, `quote_id`, `quote_number`, `company_name`, `action:'download'` 기록 | `app/quote/page.tsx:589` |
| 견적서 PDF 열람(view) 로그 | ✅ | `action:'view'` 로 동일 테이블 기록 | `app/sales/page.tsx:738` |
| 재고 출고 로그 | ✅ | `inventory_logs` 테이블에 `item_id`, `engineer_id`, `quantity_out`, `reason`, `outlet_company` 기록 | `app/inventory/page.tsx:272` |
| 재입고 로그 | ✅ | `inventory_logs` — `log_type:'in'` | `app/inventory/page.tsx:349` |
| 관리자 로그 조회 기능 | ✅ | Admin 페이지에서 최근 7일/최대 1000건 `download_logs` 조회 | `app/admin/page.tsx:140-151` |
| 로그인/로그아웃 감사 로그 | ℹ️ | Supabase Auth 자체 auth.users 이력. 코드 레벨에서 별도 기록 없음 | — |
| 고객사 데이터 변경 이력 | ❌ **갭** | 고객사/장비/담당자 정보의 생성·수정·삭제 이력 테이블 없음 | — |
| 권한 변경 이력 | ❌ **갭** | `permission_level` 변경 로그 없음 | — |

---

### D. 무결성 워크플로우

#### D-1. 재고 출고 승인

| 항목 | 상태 | 구현 방식 | 근거 |
|---|---|---|---|
| 승인 권한 체크 위치 | ⚠️ **갭** | `isManager` 변수로 승인 탭/버튼 UI 조건부 렌더링. 실제 DB 쓰기(`inventory_items.update`, `inventory_requests.update`)는 anon 클라이언트로 직접 수행 — 서버측 권한 강제 없음 | `app/inventory/page.tsx:252-290`, `:185` |
| 재고 음수 방지 | ✅ | 승인 전 `item.quantity >= req.quantity` 확인 | `app/inventory/page.tsx:258` |
| 반려 처리 | ✅ | `inventory_requests.update({ status:'반려', reject_reason })` | `app/inventory/page.tsx:309` |

#### D-2. 발주 상태 전환

| 항목 | 상태 | 구현 방식 | 근거 |
|---|---|---|---|
| 발주 상태 변경 권한 | ❌ **갭** | `POST /api/purchase-order` 내 `complete_order`, `request_tax`, `complete_tax`, `update_schedule` 액션 — 인증 외 권한 체크 없음. 모든 로그인 사용자가 임의 quoteId에 대해 상태 변경 가능 | `app/api/purchase-order/route.ts:79-207` |

---

### E. 취약점 관리

#### E-1. 최근 보안 수정 이력

| 커밋 | 날짜 | 수정 내용 |
|---|---|---|
| 당일 세션 (감사 중) | 2026-05-29 | `/api/auto-fail` — superadmin/manager 권한 체크 추가 |
| 당일 세션 (감사 중) | 2026-05-29 | `/api/delete-quote-pdf` — 권한 체크 + 경로 순회 방지 + DB 소유권 검증 추가 |
| 당일 세션 (감사 중) | 2026-05-29 | `/api/quote-pdf` — DB 소유권 검증 + 경로 순회 방지 추가 |
| 당일 세션 (감사 중) | 2026-05-29 | `/api/purchase-order GET` — DB 소유권 검증 + 경로 순회 방지 추가 |
| 당일 세션 (감사 중) | 2026-05-29 | `exchange-rate` — `rejectUnauthorized:false` 제거, TLS 검증 복구 |
| 당일 세션 (감사 중) | 2026-05-29 | `/api/update-engineer` 신규 생성 — permission_level 변경을 서버측에서 강제 |
| 당일 세션 (감사 중) | 2026-05-29 | `admin/page.tsx` — 직원 정보 수정을 `/api/update-engineer` API 경유로 변경 |

#### E-2. npm audit 결과

실행일: 2026-05-29  
**총 취약점: 5건 (high: 2, moderate: 3)**

| 패키지 | 심각도 | CVE/Advisory | 수정 가능 여부 |
|---|---|---|---|
| `xlsx ^0.18.5` | **High** | Prototype Pollution (GHSA-4r6h-8v6p-xvw6) | ❌ 수정 버전 없음 |
| `xlsx ^0.18.5` | **High** | ReDoS (GHSA-5pgg-2g8v-p4x9) | ❌ 수정 버전 없음 |
| `next 16.1.7` | Moderate | Next.js Middleware bypass, cache poisoning 등 다수 | ✅ `npm audit fix --force` → 16.2.7 |
| `brace-expansion` | Moderate | DoS (GHSA-f886-m6hf-6m8v) | ✅ `npm audit fix` |
| `ws` | Moderate | DoS (GHSA-…) | ✅ `npm audit fix` |

> `xlsx` 취약점: 서버측 재고 엑셀 파일 처리(`app/inventory/page.tsx:407-472`)에서 사용. Prototype Pollution은 신뢰할 수 없는 파일 입력 시 영향 있음.

#### E-3. 일반 웹 취약점 점검

| 항목 | 상태 | 세부 내용 | 근거 |
|---|---|---|---|
| SQL 인젝션 | ✅ | Supabase JS SDK의 파라미터화된 쿼리 사용. 원시 SQL 없음 | 코드 전체 |
| XSS (React JSX) | ✅ | React의 자동 이스케이핑으로 JSX 내 데이터 안전 | — |
| **XSS (innerHTML)** | ⚠️ **갭** | `MapView.tsx:95-107` — DB 데이터(`company_name`, `address`, `agency`, `status`, `deviceLines`)를 `innerHTML`에 직접 삽입. Stored XSS 가능 | `components/home/MapView.tsx:76-111` |
| IDOR (객체 단위 인가) | ⚠️ **갭** | `POST /api/purchase-order` — `quoteId`를 body로 전달받아 권한 검증 없이 해당 견적 상태 변경 가능 | `app/api/purchase-order/route.ts:52` |
| 파일 업로드 — MIME 검증 (클라이언트) | ✅ | `file.type` 기반 allowlist 검증 | `app/customer/[id]/page.tsx:319`, `app/account/page.tsx:93` |
| 파일 업로드 — MIME 검증 (서버) | ❌ **갭** | 발주서 PDF 업로드 (`/api/purchase-order`) — 서버에서 MIME 타입 검증 없음. `contentType: 'application/pdf'` 를 클라이언트 전송값이 아닌 **하드코딩된 값**으로 설정하는 방식만 존재 | `app/api/purchase-order/route.ts:39` |
| 시크릿 하드코딩 | ❌ **갭** | `upload_price_list.js:6`, `geocode_update.js:8` 에 키 하드코딩 | 위 B-3 참조 |
| 관리자 검색 인젝션 | ⚠️ | `admin/page.tsx:157` — `.or()` 필터에 사용자 입력 직접 보간. Supabase JS SDK의 ORM 레이어로 쿼리 구조 변경은 어려우나 특수문자 처리 불확실 | `app/admin/page.tsx:157` |

---

### F. 클라우드 · 제3자 위험

| 서비스 | 역할 | 접근 데이터 범위 | 인증서/컴플라이언스 |
|---|---|---|---|
| **Supabase** (미국 AWS us-east-1 기본) | DB, Auth, Storage, Realtime | 전체 고객/견적/재고/직원 데이터 | SOC2 Type II — 별도 첨부 필요 |
| **Vercel** | Next.js 호스팅, Edge Network, 환경변수 관리 | 서버 코드, 환경변수(SERVICE_ROLE_KEY 포함), 요청 로그 | SOC2 Type II — 별도 첨부 필요 |
| **Kakao** | 지도 렌더링, 주소→좌표 변환 | 사용자 브라우저 IP, 고객사 좌표 | 한국 ISMS 인증 — 별도 첨부 필요 |
| **한국수출입은행** | JPY 환율 데이터 | API Key, 조회 날짜 | 공공기관 — 별도 첨부 필요 |
| **Google Fonts** | NotoSansCJK 폰트 CDN | 사용자 브라우저 IP, User-Agent | Google Privacy Policy — 별도 첨부 필요 |

> **데이터 물리적 위치**: Supabase 프로젝트 리전이 코드 밖에 있어 확인 불가. Kevin이 대시보드에서 확인 필요 (아래 ⑤ 섹션).

---

### G. 백업 · 가용성 · 데이터 거버넌스

| 항목 | 상태 | 세부 내용 |
|---|---|---|
| DB 백업 설정 | ℹ️ | 코드 내 백업 로직 없음. Supabase 자동 백업 여부는 대시보드 확인 필요 |
| 데이터 삭제 방식 | ❌ Hard Delete | `supabase.from('customers').delete()`, `contacts.delete()`, `devices.delete()` — soft delete(is_deleted 플래그) 없음. 삭제 시 복구 불가 | `app/customer/[id]/page.tsx:233-236` |
| 견적서 삭제 방식 | ❌ Hard Delete | `quote_items.delete()` + `quotes.delete()` — 되돌릴 수 없음 | `app/admin/page.tsx:178-179` |
| 데이터 보존 정책 | ℹ️ | 코드 내 보존 기간 정의 없음 |
| 개인정보(연락처) 보존/삭제 정책 | ❌ **갭** | `contacts` 테이블에 이름/전화/이메일 저장. 퇴직 담당자 삭제 절차 없음 |
| 사고 대응 절차 | ℹ️ | 코드 내 사고 대응 로직 없음. 운영 절차로 별도 관리 필요 |

---

## ③ 취약점 수정 이력 표

| # | 수정일 | 파일 | 수정 전 | 수정 후 |
|---|---|---|---|---|
| 1 | 2026-05-29 | `app/api/auto-fail/route.ts` | 인증만 체크 — 모든 로그인 사용자가 견적 대량 실패처리 가능 | `permission_level` DB 조회 후 superadmin/manager만 허용 |
| 2 | 2026-05-29 | `app/api/delete-quote-pdf/route.ts` | 인증만 체크, 경로 검증 없음 — 임의 파일 삭제 가능 | superadmin/manager 권한 체크 + `..` 경로 순회 방지 + DB에서 파일 소유권 검증 |
| 3 | 2026-05-29 | `app/api/quote-pdf/route.ts` | 인증만 체크 — 임의 PDF Signed URL 발급 가능 | DB에서 `pdf_url` 일치 검증 후 Signed URL 발급 |
| 4 | 2026-05-29 | `app/api/purchase-order/route.ts` (GET) | `path.replace('purchase_orders/', '')` 단순 문자열 치환 후 임의 파일 URL 발급 | DB에서 `purchase_order_url` 일치 검증, `..` 경로 순회 방지 |
| 5 | 2026-05-29 | `app/api/exchange-rate/route.ts` | `https.get({ rejectUnauthorized: false })` — TLS 인증서 검증 비활성화 | `fetch()` 로 교체, TLS 기본 검증 복원 |
| 6 | 2026-05-29 | `app/api/update-engineer/route.ts` (신규) | (없음) | permission_level 변경을 서버에서 강제하는 전용 API 생성. superadmin만 권한 변경 허용 |
| 7 | 2026-05-29 | `app/admin/page.tsx:282-305` | 직원 정보 수정을 anon 클라이언트로 직접 DB 쓰기 — 클라이언트측 조건만으로 permission_level 변경 제한 | `/api/update-engineer` API 경유로 변경, 서버측 권한 강제 |

---

## ④ 잔여 갭 목록

| # | 심각도 | 분류 | 항목 | 권장 조치 |
|---|---|---|---|---|
| G-1 | 🔴 HIGH | 인가 누락 | `POST /api/purchase-order` — 권한 체크 없음. 모든 로그인 사용자가 임의 quote의 발주완료·세금계산서 요청 등 상태 변경 가능 | 발주·완료 액션에 superadmin/manager 또는 `teams='영업관리'` 권한 체크 추가 |
| G-2 | 🔴 HIGH | Stored XSS | `MapView.tsx:76-111` — DB 데이터(`company_name`, `address`, `agency`, `device_name` 등)를 `innerHTML` 템플릿 리터럴에 직접 삽입. DB에 XSS 페이로드 저장 시 지도 오버레이에서 실행됨 | 삽입 전 `textContent` 사용 또는 HTML 이스케이프 함수(`escapeHtml`) 적용 |
| G-3 | 🟠 MEDIUM | 인가 누락 (무인증 API) | `GET /api/exchange-rate` — 인증 체크 없음. 외부에서 API Key 소비 가능 | `getUser()` 인증 체크 추가 |
| G-4 | 🟠 MEDIUM | 클라이언트측 권한 체크 | `inventory/page.tsx:252` — 재고 출고 승인이 클라이언트 `isManager` 변수로만 제어. Supabase anon 클라이언트로 직접 DB 쓰기 | RLS 정책으로 `inventory_requests.update`를 `is_inventory_manager=true` 사용자만 허용하거나, 승인 전용 API Route 생성 |
| G-5 | 🟠 MEDIUM | 보안 헤더 미설정 | `next.config.ts` — CSP, X-Frame-Options, HSTS, X-Content-Type-Options 헤더 없음 | `next.config.ts`에 `headers()` 함수로 보안 헤더 추가 |
| G-6 | 🟠 MEDIUM | 미들웨어 미등록 | `proxy.ts`가 실질적으로 동작하지 않음 — 미인증 사용자가 URL 직접 접근 시 HTML은 렌더링됨 (RLS로 데이터는 차단되나 UI 노출) | `proxy.ts`를 `middleware.ts`로 이름 변경 후 `export default` 및 함수명 조정 |
| G-7 | 🟠 MEDIUM | 하드코딩 시크릿 | `upload_price_list.js:6` (anon key), `geocode_update.js:8` (Kakao REST key) 하드코딩 | `process.env` 또는 `.env.local` 참조로 변경. 파일을 `.gitignore`에 추가 검토 |
| G-8 | 🟡 LOW | 데이터 삭제 무결성 | Hard Delete만 존재 — 고객사/견적서/담당자 삭제 시 복구 불가 | `is_deleted` 소프트 삭제 컬럼 도입 또는 Supabase point-in-time recovery 활성화 확인 |
| G-9 | 🟡 LOW | 감사 로그 부재 | 고객사 정보 변경, 권한 변경 이력이 기록되지 않음 | `activity_log` 또는 트리거 기반 감사 테이블 추가 |
| G-10 | 🟡 LOW | 의존성 취약점 | `xlsx` High 2건 수정 버전 없음. `next` 16.1.7 → 16.2.7 업그레이드 필요 | `xlsx` 대체 라이브러리(`exceljs`) 검토. Next.js `npm audit fix --force` 실행 |
| G-11 | 🟡 LOW | 발주서 파일 MIME 서버 검증 | `/api/purchase-order` 업로드 — 서버에서 파일 타입 검증 없음 (클라이언트 `accept="application/pdf"`만 존재) | 서버에서 파일 시그니처(magic bytes `%PDF`) 검증 추가 |

---

## ⑤ Kevin이 Supabase / Vercel 대시보드에서 확인할 항목

### Supabase 대시보드

1. **데이터 물리적 위치(리전)**: 프로젝트 Settings → General → "Project Region" — 어느 국가/리전에 저장되는지 확인. 일본 본사 보고 시 데이터 거주지(data residency) 필수 명시.

2. **테이블별 RLS 활성화 여부**: Table Editor → 각 테이블 우상단 "RLS enabled" 표시 확인. 특히 아래 테이블이 RLS enabled인지:
   - `customers`, `contacts`, `devices`, `service_history`, `quotes`, `quote_items`, `inventory_items`, `inventory_requests`, `price_list`, `engineers`

3. **RLS 정책 내용**: Authentication → Policies — `inventory_requests` 테이블의 UPDATE 정책이 `is_inventory_manager=true`인 사용자만 허용하는지 확인 (G-4 갭 관련).

4. **Storage 버킷 public/private 설정**: Storage → 각 버킷:
   - `quote-pdfs`: **Private** 이어야 함 (민감 비즈니스 문서)
   - `purchase_orders`: **Private** 이어야 함
   - `device-images`: Public 가능 (장비 사진)
   - `profile-images`: Public 가능 (프로필 사진)
   - `packing-lists`: 확인 필요

5. **자동 백업 활성화 여부**: Settings → Database → "Database Backups" — Point-in-time recovery 또는 Daily backup 활성화 여부 및 보존 기간(권장: 30일 이상).

6. **Auth 설정**:
   - 이메일 확인 강제 여부 (`email_confirm: true`는 코드에서 확인됨, 대시보드 설정도 일치하는지)
   - 비밀번호 최소 길이 정책 (코드에서는 8자 체크, Auth 설정에서 일치하는지)
   - 로그인 실패 횟수 제한(Rate Limiting) 활성화 여부

7. **Service Role Key 노출 이력**: API Key 탭에서 키 생성/재발급 이력 확인. `.env.local`에 있는 키가 유출된 적 없는지 점검.

### Vercel 대시보드

8. **배포 리전**: Project → Settings → Functions Region — 서버 함수가 어느 리전에서 실행되는지 확인.

9. **환경변수 접근 권한**: Settings → Environment Variables — `SUPABASE_SERVICE_ROLE_KEY` 가 "Preview" 환경에는 노출되지 않도록 "Production only" 설정 여부 확인.

10. **팀 계정 접근 권한**: Team Settings → Members — Vercel 프로젝트에 접근 가능한 계정 명단과 역할(Admin/Developer/Viewer) 확인.

### 공통 (운영 절차)

11. **계정 2FA(이중 인증) 적용 여부**: Supabase 대시보드 계정, Vercel 계정 모두 2FA 설정 여부 확인 (특히 superadmin 계정).

12. **관리자 권한 보유자 현황**: `engineers` 테이블에서 `permission_level IN ('superadmin','manager')` 인 인원 명단과 실제 재직 여부 대조.

---

*감사 완료일: 2026-05-29 | 작성: Claude Code (Anthropic) | 검토 필요: Kevin*
