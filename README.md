# remember

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
| `src/utils/constants.js` → `CAMERA.playZoom` | 인트로가 끝난 뒤 플레이할 때 카메라 확대율 |
| `src/utils/constants.js` → `INTRO` | 로고 확대, 원형 지도 공개, 전체 지도 유지, 플레이어 확대 시간 |
| `src/scenes/TitleScene.js` | 타이틀과 원형 로고 안으로 들어가는 전환 |
| `src/scenes/OutsideScene.js` | 전체 지도 소개, 카메라 이동, 플레이어, 월드와 충돌 |
| `src/ui/TouchControls.js` | 모바일 입력 |
| `src/pwa.js` | 설치 버튼, 서비스 워커, 업데이트 안내 |

원본 300 × 300 로고의 원형 심벌 기준은 `LOGO_FOCUS`의 `x: 148 / 300`, `y: 113 / 300`, `radius: 53 / 300`입니다. 전체 지도 유지 시간은 약 1.3초, 플레이어에게 이동하는 시간은 약 2.4초입니다. 지도 전체를 보여줄 때는 화면과 지도 비율에 맞춰 확대율을 계산하며, 플레이할 때는 카메라가 월드 밖으로 나가지 않도록 제한합니다.

## 구조와 확장

`BootScene`이 에셋을 준비하고, `TitleScene`이 로고 확대를 맡습니다. `OutsideScene`은 원형 지도 공개부터 전체 지도 유지, 플레이어 확대, 탐색 순으로 진행합니다. 캔버스 위의 UI는 게임 장면과 분리되어 있어 모바일 입력과 설치/업데이트 UI를 수정하기 쉽습니다.

새 지도를 추가하려면 `src/scenes/`에 장면을 만들고 `src/game/config.js`에 등록합니다. 이미지 로딩은 `BootScene`, 크기/입구/스폰 정보는 상수에 추가하세요. NPC와 대화는 바깥 장면의 입력 처리와 분리된 모듈로 추가할 수 있습니다. 현재 충돌 구조는 단순한 사각형 영역과 월드 경계를 사용합니다. 향후 장애물 사각형이나 물리 바디를 더할 수 있습니다.

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
npm run test:pwa
```

브라우저 smoke test는 타이틀, 인트로 진행, 플레이어 이동과 모바일 화면을 확인합니다. 원본 이미지가 없는 환경에서는 테스트가 네트워크 요청에만 임시 검증 이미지를 주입합니다. 이 이미지는 실제 게임이나 배포 결과에 포함되지 않으며, 원본 지도/로고의 시각적 검증을 대체하지 않습니다.

실제 기기에서는 첫 실행 → 로고 원형 확대 → 지도 공개 → 전체 지도 유지 → 플레이어 확대 순서와 터치 조작을 확인하세요. 오프라인 검증은 `build`/`preview` 또는 HTTPS 배포에서 첫 로딩이 끝난 다음 네트워크를 끄고 새로고침합니다. PWA 설치 메뉴는 기기와 브라우저에 따라 달라집니다.
