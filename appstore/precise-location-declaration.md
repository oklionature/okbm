# 플레이 콘솔 정밀 위치(ACCESS_FINE_LOCATION) 신고서 문구 (2026-11-16, 앱 0.9.4 / 버전 코드 13)

플레이 콘솔 → 앱 콘텐츠(정책) → 위치 권한(정밀 위치) 신고서에 아래를 붙여 넣는다.
화면 이름·칸 이름은 콘솔에 따라 조금 다를 수 있다.

## 정밀 위치가 필요한 기능
GPX 등산로 길 안내

## 기능 설명 (한국어)
낭만루트는 백패킹 박지(야영 장소)와 그곳까지 가는 등산로(GPX)를 지도에 보여 주는 앱입니다.
사용자가 박지 정보창에서 GPX 등산로를 켜면, 산길 위에서 내 위치가 등산로에 있는지 확인해
"길 위에 있어요 · 박지까지 길 따라 ○km" 또는 "길에서 ○m 벗어났어요 · 길은 ○쪽에 있어요"를 알려 주고,
50m 넘게 벗어나면 진동으로 알립니다. 산속 갈림길에서 길을 잃지 않게 하는 안전 기능입니다.

## 대략 위치나 위치 버튼으로 안 되는 이유
대략 위치는 오차가 수백 m~수 km라서, 폭 몇 m인 산길에서 50m 벗어났는지 가릴 수 없습니다.
갈림길에서 잘못 든 길을 알려 주려면 GPS 수준의 정확한 위치가 꼭 필요합니다.

## 언제 쓰나
- 앱이 화면에 떠 있을 때만 씁니다(포그라운드). 백그라운드 위치는 쓰지 않고 요청하지도 않습니다.
- 사용자가 GPX 등산로를 켜거나, 길 안내 줄의 '다시 확인'·지도 '내 위치'를 누를 때, 그리고 앱을 다시 열 때 한 번씩만 위치를 받습니다.
- 위치는 기기 안에서 등산로와 거리를 재는 데만 쓰고 서버에 저장하거나 광고·분석에 쓰지 않습니다.

## English (if the form asks in English)
Feature: GPX trail guidance for backpacking routes.
When the user turns on a GPX trail for a campsite, the app checks whether the user is on the trail and tells them
"You are on the trail · N km to the campsite" or "You are N m off the trail · the trail is to the north", and vibrates
when they are more than 50 m off. This is a safety feature to prevent getting lost at trail junctions in the mountains.
Approximate location (hundreds of meters to kilometers of error) cannot tell whether the user has left a mountain
trail by 50 m, so precise location is required. Location is used only while the app is in the foreground, only when the
user turns on a trail or taps "check again"/"my location", is processed on the device, and is never stored on our
servers or used for ads or analytics. Background location is not requested.

## 진행 (2026-11-16)
- 0.9.4(버전 코드 13, 정밀 위치 권한 추가)를 프로덕션 전체 출시(100%)로 올려 검토를 위해 전송했다. 출시 노트:
  "GPX 등산로 길 안내가 더 정확해졌어요. 등산로를 켜고 산에 가면 정확한 위치로 길 위에 있는지, 길에서 벗어났는지 알려 드려요."
- 빠른 검사는 통과했고(경고는 늘 나오는 가독화·디버그 기호 안내 2개뿐), 이때는 정밀 위치 신고서를 따로 묻지 않았다(앱 콘텐츠 '주의 필요' 없음).
  심사 중에 신고서를 요구하면 위 문구를 넣는다. 앱 묶음: Desktop/my-app (AndroidManifest ACCESS_FINE_LOCATION, build.gradle 13/0.9.4).
