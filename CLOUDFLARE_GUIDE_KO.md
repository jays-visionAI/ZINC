# ☁️ Cloudflare Pages 배포 가이드

GitHub에 업로드된 ZYNK 프로젝트를 Cloudflare Pages를 통해 무료로 배포하는 방법입니다.

## 1. Cloudflare Pages 프로젝트 생성
1. [Cloudflare 대시보드](https://dash.cloudflare.com/)에 로그인합니다.
2. 왼쪽 메뉴에서 **"Workers & Pages"**를 클릭합니다.
3. **"애플리케이션 생성(Create application)"** 버튼을 클릭합니다.
4. **"Pages"** 탭을 선택하고 **"Git에 연결(Connect to Git)"**을 클릭합니다.

## 2. GitHub 저장소 연결
1. GitHub 계정을 연결하라는 창이 뜨면 승인합니다.
2. 저장소 목록에서 **`ZYNK`** (또는 `jays-visionAI/ZYNK`)를 선택합니다.
3. **"설정 시작(Begin setup)"**을 클릭합니다.

## 3. 빌드 설정 (Build Settings)
정적 웹사이트이므로 특별한 빌드 명령어가 필요 없습니다.

- **프로젝트 이름**: `zinc` (원하는 이름으로 변경 가능)
- **프로덕션 브랜치**: `main`
- **프레임워크 사전 설정(Framework preset)**: **`None`** (선택 안 함)
- **빌드 명령어(Build command)**: (비워둠)
- **빌드 출력 디렉터리(Build output directory)**: (비워둠 - 루트 디렉터리 사용)

## 4. 환경 변수 설정 (Environment Variables)
Firebase 설정을 안전하게 사용하기 위해 환경 변수를 등록합니다.
(현재 코드에서 `import.meta.env`를 사용하지 않고 `firebase-config.js`에 직접 키를 입력했다면 이 단계는 건너뛰어도 되지만, 보안을 위해 권장됩니다.)

만약 `firebase-config.js`를 환경 변수 방식으로 수정했다면 아래 변수들을 추가하세요. **현재 상태 그대로 배포한다면 이 단계는 건너뛰세요.**

## 5. 배포 완료
1. **"저장 및 배포(Save and Deploy)"**를 클릭합니다.
2. Cloudflare가 자동으로 코드를 가져와 배포를 시작합니다.
3. 약 1~2분 후 **"성공(Success)"** 메시지가 뜨면 배포가 완료된 것입니다.
4. 제공된 `https://zinc-xxxx.pages.dev` 주소를 클릭하여 사이트가 정상 작동하는지 확인합니다.

## 6. 문제 해결
- **404 에러가 뜨나요?**
    - `index.html`이 루트 디렉터리에 있는지 확인하세요. (현재 프로젝트는 루트에 있으므로 문제없음)
- **"This domain is not authorized..." 에러가 뜨나요?**
    - **원인**: Firebase 보안 설정 때문에 등록되지 않은 도메인에서는 로그인이 차단됩니다.
    - **해결**:
        1. [Firebase 콘솔](https://console.firebase.google.com/) > **Authentication** > **Settings** 탭으로 이동합니다.
        2. **Authorized domains** (승인된 도메인) 섹션으로 스크롤합니다.
        3. **"도메인 추가"**를 클릭합니다.
        4. 에러가 발생한 도메인(예: `zinc-cp9.pages.dev`)을 입력하고 추가합니다.

---
**축하합니다! 이제 전 세계 어디서나 접속 가능한 웹사이트가 되었습니다.** 🎉
