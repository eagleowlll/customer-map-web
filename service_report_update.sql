-- 서비스 레포트 PDF를 사이트에 저장하기 위한 설정
--
-- 1) service_history 에 레포트 파일 경로 컬럼 추가 (전체 URL이 아니라 버킷 내 경로 저장)
alter table service_history
  add column if not exists report_url text;

-- 2) service-report 버킷을 Private(비공개)로 설정 후 아래 정책 실행
--    (Storage → service-report → Settings → Public bucket 체크 해제)
--    비공개 버킷은 정책이 없으면 업로드/열람/삭제가 모두 막힘. 로그인 사용자에게만 허용한다.

create policy "service_report authenticated read"
on storage.objects for select to authenticated
using (bucket_id = 'service-report');

create policy "service_report authenticated insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'service-report');

create policy "service_report authenticated update"
on storage.objects for update to authenticated
using (bucket_id = 'service-report')
with check (bucket_id = 'service-report');

-- 새 파일 등록 시 기존 파일 삭제를 위해 delete 정책도 필요
create policy "service_report authenticated delete"
on storage.objects for delete to authenticated
using (bucket_id = 'service-report');

-- 참고: 납입의사록·패킹리스트(packing-lists)도 "새 파일 등록 시 기존 파일 삭제"가
--       동작하려면 아래 delete 정책이 있어야 한다. (없으면 교체 시 옛 파일이 버킷에 남음)
create policy "packing_lists authenticated delete"
on storage.objects for delete to authenticated
using (bucket_id = 'packing-lists');
