-- H12: 공식 피드 사진을 Supabase Storage에서 R2로 옮기고, Storage에는 더 못 올리게 막는다 (2026-10-21)
--
-- 왜: 2026-10-16~17 공식 피드 7개(사진 57장)가 Supabase Storage(photos/feed/)에 올라가
--     방문자가 볼 때마다 Supabase cached egress로 잡혔다(하루 1~2GB, 무료 5GB 초과).
--     사진 57장은 같은 파일 이름으로 R2 feed/official/ 에 복사하고 바이트 단위로 확인했다.
-- 실행: Supabase 대시보드 → SQL Editor에 통째로 붙여 넣고 Run. 여러 번 실행해도 결과는 같다.

-- 1) 피드 7개의 사진 주소를 R2로 바꾼다
update public.feeds
set
  photo = replace(photo,
    'https://qnumfecythtqtrxeasys.supabase.co/storage/v1/object/public/photos/feed/',
    'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/feed/official/'),
  ready_shot_photo = replace(ready_shot_photo,
    'https://qnumfecythtqtrxeasys.supabase.co/storage/v1/object/public/photos/feed/',
    'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/feed/official/'),
  photos = replace(photos::text,
    'https://qnumfecythtqtrxeasys.supabase.co/storage/v1/object/public/photos/feed/',
    'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/feed/official/')::jsonb,
  updated_at = now()
where id in (
  'pack_ganghwa_bimil', 'pack_47_hakbong', 'pack_20261016_0r7re7',
  'pack_20260928_y79bo1', 'pack_20261014_mctsgr', 'pack_20261006_0c6rph', 'pack_20261017_m6oadd'
);

-- 2) Storage에 쓰기(올리기·덮어쓰기·지우기)를 허락하는 정책을 모두 없앤다.
--    사이트·앱은 Storage를 쓰지 않는다(사진은 전부 R2). 읽기(공개 주소)는 그대로 둔다.
--    권한 문제로 실패해도 1)은 그대로 남도록 따로 처리한다.
do $$
declare p record;
begin
  for p in
    select policyname, cmd from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
    raise notice 'dropped storage policy: % (%)', p.policyname, p.cmd;
  end loop;
exception when others then
  raise warning 'storage 정책 삭제 실패: % — 대시보드 Storage → Policies에서 직접 지울 것', sqlerrm;
end $$;

-- 3) 확인: 둘 다 0이어야 한다
select
  (select count(*) from public.feeds
    where photo like '%supabase.co/storage%' or ready_shot_photo like '%supabase.co/storage%'
       or photos::text like '%supabase.co/storage%') as feeds_still_on_supabase,
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')) as storage_write_policies_left;
