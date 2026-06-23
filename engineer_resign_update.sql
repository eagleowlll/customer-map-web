-- 퇴사일(소프트삭제) 컬럼 추가
-- 퇴사한 직원은 행을 삭제하지 않고 resigned_date 를 기록한다.
--   - 과거 서비스/견적/실적 기록은 그대로 보존된다.
--   - 활동 현황·실적 현황은 "조회 기간 시작일 <= resigned_date" 일 때만 표시한다.
--     (예: 7/10 퇴사자는 6·7월 조회엔 보이고, 8월 조회엔 보이지 않음)
--   - 담당자 선택 등 현재 팀원 목록에서는 퇴사 후 숨겨진다.
-- NULL = 재직 중.

ALTER TABLE engineers
  ADD COLUMN IF NOT EXISTS resigned_date date;
