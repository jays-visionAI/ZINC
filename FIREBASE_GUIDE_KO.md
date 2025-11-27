# 🔥 Firebase 연동 가이드

ZYNK 프로젝트의 로그인 및 데이터 저장을 위한 Firebase 설정 방법입니다.

## 1. Firebase 프로젝트 생성
1. [Firebase 콘솔](https://console.firebase.google.com/)에 접속합니다.
2. **"프로젝트 추가"**를 클릭합니다.
3. 프로젝트 이름을 입력하고 (예: `zinc-social-automation`) 계속 진행합니다.
4. Google 애널리틱스는 선택 사항입니다 (지금은 사용 안 함으로 설정해도 됩니다).
5. **"프로젝트 만들기"**를 클릭합니다.

## 2. Authentication (로그인) 설정
1. 생성된 프로젝트 대시보드 왼쪽 메뉴에서 **"빌드" > "Authentication"**을 클릭합니다.
2. **"시작하기"** 버튼을 클릭합니다.
3. **"Sign-in method"** 탭에서 **"Google"**을 선택합니다.
4. 오른쪽 상단의 **"사용 설정"** 토글을 켭니다.
5. **"프로젝트 지원 이메일"**을 선택하고 **"저장"**을 클릭합니다.

## 3. Firestore Database (데이터베이스) 설정
1. 왼쪽 메뉴에서 **"빌드" > "Firestore Database"**를 클릭합니다.
2. **"데이터베이스 만들기"**를 클릭합니다.
3. **"프로덕션 모드에서 시작"** 또는 **"테스트 모드에서 시작"**을 선택합니다.
    - *개발 중에는 "테스트 모드"가 편하지만, 30일 후 접속이 제한될 수 있으므로 나중에 규칙을 수정해야 합니다.*
4. 위치(Region)를 선택합니다 (예: `asia-northeast3` - 서울).
5. **"사용 설정"**을 클릭합니다.

## 4. 웹 앱 추가 및 설정 가져오기
1. 프로젝트 개요(메인 화면)로 돌아갑니다.
2. 상단의 **`</>` (웹)** 아이콘을 클릭합니다.
3. 앱 닉네임을 입력합니다 (예: `ZYNK Web`).
4. **"앱 등록"**을 클릭합니다.
5. **"Firebase SDK 추가"** 단계에서 `const firebaseConfig = { ... }` 부분을 찾습니다.
6. `{` 부터 `}` 까지의 내용을 복사합니다.

## 5. 프로젝트에 설정 적용
1. VS Code에서 `firebase-config.js` 파일을 엽니다.
2. 기존의 `const firebaseConfig = { ... };` 부분을 복사한 내용으로 교체합니다.

```javascript
// 예시 (실제 값으로 변경해야 함)
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "zinc-project.firebaseapp.com",
  projectId: "zinc-project",
  storageBucket: "zinc-project.appspot.com",
  messagingSenderId: "123456...",
  appId: "1:123456...:web:..."
};
```

3. 파일을 저장합니다.

## 6. 테스트
1. 웹사이트를 새로고침합니다.
2. **"Get Started"** 버튼을 클릭합니다.
3. Google 로그인 팝업이 뜨고 로그인이 완료되면, 우측 상단에 프로필 이미지가 표시됩니다.
