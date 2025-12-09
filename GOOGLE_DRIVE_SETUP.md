# Google Drive Integration Setup Guide

> Knowledge Hub에서 Google Drive를 사용하기 위한 설정 가이드

---

## Prerequisites

1. Google Cloud Console 계정 (https://console.cloud.google.com)
2. Firebase 프로젝트

---

## Step 1: Google Cloud Console 설정

### 1.1 프로젝트 선택
1. Google Cloud Console에 로그인
2. 상단에서 현재 Firebase 프로젝트 선택 (또는 새 프로젝트 생성)

### 1.2 API 활성화
1. 좌측 메뉴 → **APIs & Services** → **Library**
2. 다음 API 검색 후 **Enable** 클릭:
   - **Google Drive API**
   - **Google Picker API**

---

## Step 2: OAuth 2.0 Client ID 생성

### 2.1 OAuth Consent Screen 설정
1. **APIs & Services** → **OAuth consent screen**
2. User Type: **External** 선택 → Create
3. 필수 정보 입력:
   - App name: `ZYNK Knowledge Hub`
   - User support email: 이메일 입력
   - Developer contact email: 이메일 입력
4. **Save and Continue**
5. **Scopes** 페이지에서:
   - **Add or Remove Scopes** 클릭
   - `../auth/drive.file` 추가
   - `../auth/drive.readonly` 추가
   - **Update** → **Save and Continue**
6. **Test users** 페이지에서 테스트할 이메일 추가 (개발 중에만 필요)
7. **Save and Continue** → **Back to Dashboard**

### 2.2 OAuth Client ID 생성
1. **APIs & Services** → **Credentials**
2. 상단 **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `ZYNK Knowledge Hub Web Client`
5. **Authorized JavaScript origins** 추가:
   - `http://localhost:8080` (개발용)
   - `http://localhost:3000` (개발용)
   - `https://your-production-domain.com` (프로덕션)
6. **Create** 클릭
7. **Client ID** 복사해서 저장

### 2.3 API Key 생성
1. **APIs & Services** → **Credentials**
2. 상단 **+ Create Credentials** → **API key**
3. 생성된 API Key 복사
4. **Edit API key** 클릭해서 제한 설정:
   - Name: `ZYNK Knowledge Hub API Key`
   - Application restrictions: **HTTP referrers**
   - Website restrictions 추가:
     - `localhost:*`
     - `your-production-domain.com/*`
   - API restrictions: **Restrict key**
     - **Google Drive API** 선택
     - **Google Picker API** 선택
5. **Save**

---

## Step 3: 코드에 적용

### 3.1 knowledgeHub.js 수정
파일 상단의 설정 변수를 수정:

```javascript
// ============================================================
// GOOGLE DRIVE CONFIGURATION
// ============================================================
const GOOGLE_CLIENT_ID = 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'YOUR_ACTUAL_API_KEY';
```

---

## Step 4: 테스트

1. `http://localhost:8080/knowledgeHub.html` 접속
2. "Add Sources" 버튼 클릭
3. "📂 Google Drive" 탭 선택
4. "Select from Google Drive" 버튼 클릭
5. Google 로그인 팝업에서 계정 선택
6. 파일 선택 후 확인

---

## Troubleshooting

### "Google API not loaded" 에러
- 페이지 새로고침 시도
- 브라우저 콘솔에서 에러 확인

### "OAuth error" 에러
- OAuth consent screen 설정 확인
- Authorized JavaScript origins에 현재 도메인 추가 확인

### Picker가 열리지 않음
- API Key의 HTTP referrer 제한 확인
- Google Picker API가 활성화되어 있는지 확인

### "Access blocked" 에러
- 테스트 유저 목록에 현재 계정 추가
- 또는 앱을 "Production" 상태로 게시 (실제 배포 시)

---

## Security Notes

⚠️ **중요**: 
- API Key와 Client ID는 공개 코드에 포함됩니다
- API Key에 반드시 HTTP referrer 제한 설정
- Production에서는 환경변수로 관리 권장
