-- 납입의사록·패킹리스트 (packing-lists) 버킷 보안 설정
--
-- 1) Supabase 대시보드에서 packing-lists 버킷을 "Private(비공개)"로 설정한다.
--    (Storage → packing-lists → Settings → Public bucket 체크 해제)
--
-- 2) 비공개 버킷은 정책이 없으면 업로드·열람이 모두 막히므로,
--    "로그인(authenticated)한 사용자"에게만 업로드/열람 권한을 부여한다.
--    아래 정책으로 외부 비로그인 접근은 차단되고, 파일은 앱에서 발급하는
--    시간제한 서명 URL(createSignedUrl)로만 열린다.
--
-- 아래 SQL을 Supabase → SQL Editor 에서 실행.

-- 조회(서명 URL 발급 시 필요)
create policy "packing_lists authenticated read"
on storage.objects for select
to authenticated
using (bucket_id = 'packing-lists');

-- 업로드
create policy "packing_lists authenticated insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'packing-lists');

-- 교체(같은 경로 덮어쓰기) 대비
create policy "packing_lists authenticated update"
on storage.objects for update
to authenticated
using (bucket_id = 'packing-lists')
with check (bucket_id = 'packing-lists');
