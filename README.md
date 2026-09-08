# remember

## [🎮 웹앱 바로 실행하기](https://rudwndgus.github.io/remember/)

설치 없이 휴대폰이나 PC 브라우저에서 바로 플레이할 수 있습니다.

**My Intern Life · New York, 2026**

미국 인턴 생활을 작은 탑다운 RPG로 기억하는 모바일 웹 게임입니다. Vite + Phaser 3 + plain JavaScript로 만들었고, GitHub Pages에 배포하거나 휴대폰 홈 화면에 PWA로 설치할 수 있습니다.

파란 타이틀에서 시작하면 bluu 로고의 **원형 심벌로 확대**되고, 원 안에서 바깥 지도가 열립니다. 전체 지도를 잠시 보여준 뒤 회사 입구의 플레이어에게 카메라가 다가옵니다. 이 순서가 모두 끝난 다음 이동할 수 있습니다.

보내주신 원본 로고(300 × 300)와 지도(1619 × 971)가 저장소에 포함되어 있습니다. 설치 후 바로 실행할 수 있습니다. 파일을 교체하거나 지웠을 때는 필요한 파일 경로와 다시 시도 버튼을 표시합니다.

## 실행

Node.js 22.12 이상을 사용하세요.

```sh
npm install
npm run dev
```

터미널에 표시되는 주소를 엽니다. 같은 Wi-Fi의 휴대폰에서는 표시되는 Network 주소로 조작과 화면 크기를 확인할 수 있습니다. 실제 설치와 오프라인 동작은 HTTPS로 배포한 사이트에서 확인하세요. 개발 서버에서는 서비스 워커를 등록하지 않습니다.

```sh
npm run build
npm run preview
```

빌드 결과는 `dist/`에 생성됩니다. `preview`는 빌드 결과를 로컬에서 확인하는 명령입니다. `localhost`에서도 서비스 워커를 확인할 수 있습니다.

## 조작

- 시작: 화면 탭/클릭 또는 Enter / Space
- 이동: 방향키 또는 WASD
- 모바일: 화면의 터치 방향 컨트롤

인트로 중에는 이동이 잠겨 있습니다. 화면 회전과 크기 변경을 지원하며, 지도 비율은 유지됩니다.

## 이미지

원본 로고와 지도는 다음 경로에 저장되어 있습니다. 교체할 때도 같은 경로를 사용하세요. `public` 아래의 파일은 Vite가 빌드에 복사하고, 게임에서는 배포 경로를 적용한 URL로 읽습니다. PWA 아이콘도 프로젝트에 포함됩니다.

```text
public/
  assets/
    ui/bluu-logo.png
    maps/outside-main-map.png
  icons/
    icon-192.png
    icon-512.png
    apple-touch-icon.png
```

바깥 지도는 **하나의 배경 이미지**입니다. 지도를 타일로 다시 만들지 않습니다. 원본 이미지 크기가 바뀌면 아래 설정의 지도 크기, 스폰 위치와 충돌 영역도 함께 확인하세요. 로고를 교체하면 원형 심벌의 중심과 반지름을 조정해야 합니다.

## 수정할 위치

| 파일 / 설정 | 용도 |
| --- | --- |
| `src/utils/constants.js` → `LOGO_FOCUS` | 로고 내부 원형 심벌의 중심과 반지름. 이미지 크기에 대한 0–1 비율 |
| `src/utils/constants.js` → `MAP` | 지도 원본 크기와 지도 관련 설정 |
| `src/utils/constants.js` → `PLAYER.spawn` | 회사 입구 근처 플레이어 시작 좌표. 지도 픽셀 기준 |
| `src/utils/constants.js` → `CAMERA.coverMultiplier` | 화면을 채우는 최소 확대율에 곱하는 값. 기본 `1`로 추가 확대 없음 |
| `src/utils/constants.js` → `INTRO` | 로고 확대, 원형 지도 공개, 전체 지도 유지, 플레이어 확대 시간 |
| `src/scenes/TitleScene.js` | 타이틀과 원형 로고 안으로 들어가는 전환 |
| `src/scenes/OutsideScene.js` | 전체 지도 소개, 카메라 이동, 플레이어, 월드와 충돌 |
| `src/ui/TouchControls.js` | 모바일 입력 |
| `src/maps/outside-collisions.js` → `OUTSIDE_OBJECTS` | 원본 위에서 분리한 건물·차량·화단·담장 등 물체별 충돌 경계 |
| `src/maps/CollisionLayer.js` | 다각형과 선 경계를 실제 물리 충돌 영역으로 변환 |
| `src/pwa.js` | 설치 버튼, 서비스 워커, 업데이트 안내 |

원본 300 × 300 로고의 원형 심벌 기준은 `LOGO_FOCUS`의 `x: 148 / 300`, `y: 113 / 300`, `radius: 53 / 300`입니다. 전체 지도 유지 시간은 약 1.3초, 플레이어에게 이동하는 시간은 약 2.4초입니다. 지도 전체를 보여줄 때는 화면과 지도 비율에 맞춰 확대율을 계산하며, 플레이할 때는 카메라가 월드 밖으로 나가지 않도록 제한합니다.

최종 확대율은 `max(화면 너비 / 1619, 화면 높이 / 971)`입니다. 화면이 빈틈없이 채워지는 지점까지만 확대합니다. 지도 비율은 유지하므로 세로 화면에서는 좌우로 카메라가 따라가며, 가로 화면에서는 동네를 넓게 볼 수 있습니다.

## 지도 물체와 충돌

원본 맵을 직접 확인해 건물, 개별 차량, 화단, 숲, 담장·울타리, 공사 장비, 자재와 가로등을 별도 객체로 지정했습니다. 각 객체는 고유 `id`, 종류 `kind`, 원본 픽셀 좌표 `points`를 가집니다. 사선 담장에는 선의 두께도 지정합니다. 건물 안의 옥상 설비는 건물 자체의 충돌 영역에 포함됩니다.

충돌 경계는 2픽셀 단위로 합친 다음 사각형 물리 바디로 변환합니다. 따라서 경사진 외벽과 울타리도 막히며, 빈 주차면·횡단보도·회사 출입구·계단은 걸을 수 있습니다. 움직임 판정은 캐릭터 발 부분을 기준으로 합니다.

[충돌 영역 겹쳐 보기](https://rudwndgus.github.io/remember/?debug=1&collisions=1)에서 시작하면 색으로 표시된 물체 경계를 확인할 수 있습니다. 빨강은 건물, 파랑은 차량, 노랑은 화단, 초록은 숲, 보라는 울타리, 분홍은 벽, 주황은 장비입니다. 일반 실행에는 이 표시가 나오지 않습니다.

## 구조와 확장

`BootScene`이 에셋을 준비하고, `TitleScene`이 로고 확대를 맡습니다. `OutsideScene`은 원형 지도 공개부터 전체 지도 유지, 플레이어 확대, 탐색 순으로 진행합니다. 캔버스 위의 UI는 게임 장면과 분리되어 있어 모바일 입력과 설치/업데이트 UI를 수정하기 쉽습니다.

새 지도를 추가하려면 `src/scenes/`에 장면을 만들고 `src/game/config.js`에 등록합니다. 이미지 로딩은 `BootScene`, 크기/입구/스폰 정보는 상수에 추가하세요. NPC와 대화는 바깥 장면의 입력 처리와 분리된 모듈로 추가할 수 있습니다. 새 장애물은 `src/maps/outside-collisions.js`에 사각형·다각형·선 객체로 추가할 수 있습니다.

음악과 발소리는 `src/audio/hooks.js`의 `remember:start`, `remember:footstep` 이벤트 훅에 연결할 수 있습니다. 실제 음원을 추가할 때는 `public/assets/audio/`에 넣고 사용자 시작 입력 이후 음악을 재생하세요. 모바일 브라우저의 자동 재생 제한을 피하려면 첫 탭에서 오디오를 활성화해야 합니다.

## GitHub Pages 배포

1. 이 프로젝트를 GitHub의 `remember` 저장소에 푸시합니다.
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
3. `main`에 푸시하거나 Actions의 **Deploy remember to GitHub Pages**를 수동 실행합니다.
4. 배포가 끝나면 `https://OWNER.github.io/remember/`에서 엽니다. 정확한 URL은 Actions 배포 결과에도 표시됩니다.

포함된 `.github/workflows/deploy.yml`은 `npm ci`와 빌드를 수행하고 `dist`를 공식 Pages 액션으로 배포합니다. 저장소 이름으로 `VITE_BASE_PATH`를 설정하므로 기본 `remember` 저장소에서는 `/remember/`가 됩니다.

다른 경로로 배포할 때는 `.env.example`을 `.env`로 복사하고 `VITE_BASE_PATH`를 수정하세요.

```dotenv
# https://OWNER.github.io/remember/
VITE_BASE_PATH=/remember/
```

개인 도메인 또는 `OWNER.github.io` 저장소의 루트에 배포한다면 `/`를 사용하고, 워크플로의 `VITE_BASE_PATH`도 `/`로 바꾸세요. 이 값은 Vite 에셋 주소, manifest의 시작 주소/범위, 서비스 워커 fallback에 함께 적용됩니다. `/remember/`로 빌드한 결과를 미리 볼 때는 `http://localhost:4173/remember/`를 여세요. [Vite 공식 배포 문서](https://vite.dev/guide/static-deploy.html#github-pages)

## 홈 화면 설치와 업데이트

- **iPhone / iPad:** Safari로 배포 주소를 열고 공유 → **홈 화면에 추가**를 선택합니다. 앱의 설치 버튼에도 안내가 있습니다.
- **Android:** Chrome에서 설치 버튼을 누르거나 브라우저 메뉴의 **앱 설치 / 홈 화면에 추가**를 선택합니다. 설치 버튼은 브라우저가 설치를 허용할 때 나타납니다.
- **오프라인:** 처음 온라인으로 열어 서비스 워커가 지도와 앱 파일을 저장한 뒤에는 오프라인에서도 실행할 수 있습니다.
- **새 버전:** 새 서비스 워커를 감지하면 작은 업데이트 안내를 표시합니다. **Reload**를 선택해야 적용되며, 인트로가 진행 중이면 안내를 뒤로 미룹니다. **Later**로 이번 안내를 닫을 수 있습니다.

앱으로 돌아왔을 때, 연결이 복구됐을 때, 앱을 계속 켜둔 경우 매시간 업데이트를 확인합니다. 변경된 파일은 새 revision으로 캐시하고 오래된 캐시는 정리합니다. 큰 지도도 오프라인에 포함되도록 에셋당 캐시 제한은 12 MiB입니다. 이 크기를 넘는 파일을 추가하면 `vite.config.js`에서 제한을 조정하세요. [Vite PWA 업데이트 문서](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html)

## 확인

```sh
npx playwright install chromium
npm test
npm run test:collisions
npm run test:pwa
```

`npm test`는 타이틀, 인트로 순서와 유지 시간, 이동·충돌, 재생 반복, 모바일 회전과 터치 해제를 확인합니다. 일정한 조건을 위해 네트워크 요청에 테스트 전용 검증 이미지를 주입하며, 실제 배포에는 포함하지 않습니다.

추가 충돌 브라우저 테스트는 실제 원본을 사용해 차량·화단·건물·얇은 벽·울타리·장비·숲·가로등·사선 담장으로 직접 걸어가며 통과가 차단되는지 검사합니다. `npm run test:collisions`는 지도 기준 좌표의 장애물 판정과 출입구·주차장·도로 사이의 연결성을 확인합니다.

`npm run test:pwa`는 포함된 원본 이미지로 별도의 프로덕션 빌드를 만들고 `/remember/` 경로, 오프라인 재실행과 이동, Canvas 렌더러의 원형 공개를 확인합니다. 결과와 스크린샷은 `artifacts/pwa-smoke/`에 저장됩니다. 원본 파일이 없는 환경에서만 임시 검증 이미지를 사용합니다.

설치된 Edge로 검사하려면 PowerShell에서 `$env:PLAYWRIGHT_CHANNEL = 'msedge'`를 설정한 뒤 테스트를 실행할 수도 있습니다.

실제 기기에서는 첫 실행 → 로고 원형 확대 → 지도 공개 → 전체 지도 유지 → 플레이어 확대 순서와 터치 조작을 확인하세요. 오프라인 검증은 `build`/`preview` 또는 HTTPS 배포에서 첫 로딩이 끝난 다음 네트워크를 끄고 새로고침합니다. PWA 설치 메뉴는 기기와 브라우저에 따라 달라집니다.
