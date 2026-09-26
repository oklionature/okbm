#!/usr/bin/env bash
# _shared/social-session.ts를 각 Edge Function 폴더로 복사한다.
# 대시보드 배포 시 함수 폴더 밖 파일을 import하지 못해 복사본을 두는 구조라,
# 원본은 항상 _shared 쪽만 고치고 이 스크립트로 맞춘다. (CI가 불일치를 막음)
set -euo pipefail
cd "$(dirname "$0")/../supabase/functions"
for d in auth-kakao auth-naver delete-account; do
  cp _shared/social-session.ts "$d/social-session.ts"
  echo "synced $d/social-session.ts"
done
