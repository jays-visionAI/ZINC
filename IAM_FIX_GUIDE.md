# Cloud Functions 배포 권한(IAM) 해결 가이드

Cloud Functions 2세대(v2) 배포 시 발생하는 "Unable to set the invoker for the IAM policy" 오류를 해결하기 위한 단계입니다.

## 방법 1: Firebase CLI 재인증 (가장 쉬움)

터미널에서 아래 명령어를 순서대로 실행해 보세요. 인증 토큰을 갱신하면 권한 문제가 해결되는 경우가 많습니다.

1.  **재로그인 (권한 갱신):**
    ```bash
    firebase login --reauth
    ```
    *   브라우저가 열리면 Google 계정으로 로그인하고 권한을 승인해 주세요.

2.  **배포 재시도:**
    ```bash
    firebase deploy --only functions:generateCreativeContent
    ```

---

## 방법 2: Google Cloud Console에서 권한 추가 (확실한 방법)

방법 1이 실패하면, 배포 계정에 명시적으로 권한을 추가해야 합니다.

1.  [Google Cloud Console (IAM)](https://console.cloud.google.com/iam-admin/iam) 접속.
2.  상단 프로젝트 선택기에서 **ZINC (zinc-c790f)** 프로젝트 선택.
3.  목록에서 **배포를 시도하는 이메일 계정**을 찾습니다. (오른쪽 연필 아이콘 클릭)
4.  **"다른 역할 추가"** 버튼을 클릭하여 아래 두 가지 역할을 추가합니다:
    *   **Cloud Functions 관리자** (Cloud Functions Admin)
    *   **Cloud Run 관리자** (Cloud Run Admin)
    *   **서비스 계정 사용자** (Service Account User) - *필요 시*
5.  저장 후 터미널에서 다시 배포 명령어 실행.

---

## 중요: 기존 함수 수동 삭제가 필요할 수 있습니다

만약 위 방법으로도 안 된다면, 충돌이 발생한 함수를 완전히 제거하고 다시 만드세요.

1.  **함수 삭세:**
    ```bash
    firebase functions:delete generateCreativeContent --force
    ```
2.  **다시 배포:**
    ```bash
    firebase deploy --only functions
    ```
