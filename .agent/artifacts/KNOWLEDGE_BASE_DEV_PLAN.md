# 📁 Knowledge Base 개발 계획서

> **문서 작성일**: 2024-12-09
> **상태**: Planning Phase
> **연관 기획**: BRAND_BRAIN_DRAFT.md

---

## 📋 개요

### 목적
Brand Brain의 Knowledge Base 섹션과 Knowledge Hub 페이지를 연동하여 고객이 AI 에이전트에게 브랜드 지식을 제공할 수 있도록 합니다.

### 현재 상태
- ✅ UI 탭 메뉴 구조 완료 (Drive, Links, Notes)
- ❌ 탭 전환 비활성화 (CSS class 토글만, hidden 속성 변경 안함)
- ❌ Google Drive 연동 미구현
- ❌ Links 추가/관리 미구현
- ❌ Notes 추가/관리 미구현
- ❌ Firestore 데이터 연동 미구현

---

## 🏗️ 아키텍처 설계

### Firestore 데이터 구조

```
brandBrain/{userId}/projects/{projectId}/sources/{sourceId}
├── sourceType: "google_drive" | "link" | "note"
├── title: string
├── summary: string (AI 생성)
├── createdAt: Timestamp
├── updatedAt: Timestamp
│
├── [google_drive]
│   ├── driveFileId: string
│   ├── driveFileUrl: string
│   ├── mimeType: string
│   ├── fileSize: number
│   └── thumbnailUrl: string
│
├── [link]
│   ├── url: string
│   ├── linkType: "website" | "youtube" | "other"
│   ├── favicon: string
│   └── scraped: boolean
│
└── [note]
    └── content: string (full text)
```

### 저장 전략

| 소스 타입 | 원본 저장 위치 | Firestore 저장 | 
|----------|---------------|---------------|
| **Google Drive** | 고객 Google Drive | 메타데이터 + AI 요약만 |
| **Links** | 외부 URL | URL + AI 요약 |
| **Notes** | N/A | 전체 텍스트 |

---

## 📋 개발 Phase 분류

### Phase 1: 기본 탭 기능 활성화 (Day 1)
**목표**: 탭 메뉴 클릭 시 콘텐츠 전환

- [ ] `brand-brain.js`의 `switchKBTab()` 함수 수정
- [ ] CSS `hidden` 클래스 대신 `display` 속성 사용
- [ ] 각 탭에 빈 상태 UI 추가

### Phase 2: Notes 기능 구현 (Day 1-2)
**목표**: 가장 단순한 Notes 기능부터 구현

**2.1 UI 구현**
- [ ] "새 노트 추가" 버튼
- [ ] 노트 작성 모달 (제목, 내용)
- [ ] 노트 목록 렌더링
- [ ] 노트 편집/삭제 기능

**2.2 Firestore 연동**
- [ ] 노트 CRUD 서비스 함수
- [ ] Firestore Security Rules 업데이트

### Phase 3: Links 기능 구현 (Day 2-3)
**목표**: URL 입력 및 메타데이터 저장

**3.1 UI 구현**
- [ ] "링크 추가" 버튼
- [ ] URL 입력 모달
- [ ] 링크 목록 렌더링 (favicon, 제목)
- [ ] 링크 삭제 기능

**3.2 URL 메타데이터 추출**
- [ ] Open Graph 태그 파싱 (title, description, image)
- [ ] Favicon 추출
- [ ] YouTube 링크 특별 처리

**3.3 AI 요약 (선택)**
- [ ] URL 내용 스크래핑 (Cloud Function)
- [ ] AI 요약 생성

### Phase 4: Google Drive 연동 (Day 3-5)
**목표**: 고객 Google Drive 파일 선택 및 연동

**4.1 OAuth 설정**
- [ ] Google Cloud Console 프로젝트 설정
- [ ] OAuth 2.0 클라이언트 ID 생성
- [ ] 필요 스코프: `https://www.googleapis.com/auth/drive.file`

**4.2 Google Picker API 연동**
- [ ] Picker API 라이브러리 로드
- [ ] 파일 선택 UI 구현
- [ ] 선택된 파일 메타데이터 저장

**4.3 파일 내용 접근 (선택)**
- [ ] PDF 텍스트 추출
- [ ] PPTX 텍스트 추출
- [ ] AI 요약 생성

### Phase 5: Knowledge Hub 통합 (Day 5-6)
**목표**: Brand Brain의 축약 버전과 전체 페이지 동기화

- [ ] Knowledge Hub → Brand Brain 소스 공유
- [ ] Brand Brain에서 Knowledge Hub로 이동 시 현재 프로젝트 유지
- [ ] 파일 업로드 기능 (로컬 → Firestore Storage)

### Phase 6: AI 요약 생성 (Day 6-8)
**목표**: 모든 소스에 대해 AI 요약 자동 생성

- [ ] Cloud Function: 소스 추가 트리거
- [ ] OpenAI/Gemini API 호출
- [ ] 요약 결과 Firestore 저장
- [ ] 요약 표시 UI

---

## 🔧 기술 스택

### Frontend
- Vanilla JavaScript (no framework)
- Tailwind CSS (이미 사용 중)

### Backend
- Firebase Firestore (데이터 저장)
- Firebase Cloud Functions (AI 처리)
- Firebase Storage (파일 저장 - 선택)

### 외부 API
- Google Drive API (파일 접근)
- Google Picker API (파일 선택 UI)
- OpenAI/Gemini API (요약 생성)

---

## 📅 개발 일정 (예상)

| Phase | 작업 | 예상 시간 | 우선순위 |
|-------|------|----------|---------|
| 1 | 탭 기능 활성화 | 2시간 | 🔴 High |
| 2 | Notes 기능 | 4-6시간 | 🔴 High |
| 3 | Links 기능 | 4-6시간 | 🟡 Medium |
| 4 | Google Drive 연동 | 8-16시간 | 🟡 Medium |
| 5 | Knowledge Hub 통합 | 4-8시간 | 🟢 Low |
| 6 | AI 요약 | 8-16시간 | 🟢 Low |
| **총합** | | **30-54시간** | |

---

## 🔐 Firestore Security Rules

```javascript
// Knowledge Base Sources
match /brandBrain/{userId}/projects/{projectId}/sources/{sourceId} {
  // 사용자 본인만 읽기/쓰기 가능
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## 💡 UX 가이드라인

### 빈 상태 디자인
```
┌──────────────────────────────────────┐
│                                      │
│          📂 No files yet             │
│                                      │
│  Connect your Google Drive to add    │
│  brand documents, presentations,     │
│  and guidelines.                     │
│                                      │
│   [🔗 Connect Google Drive]          │
│                                      │
└──────────────────────────────────────┘
```

### 추가 모달 디자인
```
┌──────────────────────────────────────┐
│  📝 Add Note                    [X]  │
├──────────────────────────────────────┤
│                                      │
│  Title *                             │
│  ┌──────────────────────────────┐    │
│  │ 신제품 런칭 계획              │    │
│  └──────────────────────────────┘    │
│                                      │
│  Content *                           │
│  ┌──────────────────────────────┐    │
│  │ 1월 15일 신제품 3종 출시     │    │
│  │ 예정. 마케팅 캠페인 2주      │    │
│  │ 전부터 티징 시작...          │    │
│  └──────────────────────────────┘    │
│                                      │
│              [Cancel]  [Save Note]   │
└──────────────────────────────────────┘
```

---

## 🚀 시작 권장 순서

1. **Phase 1 + 2**: 탭 활성화 + Notes 기능 (즉시 가치 제공)
2. **Phase 3**: Links 기능 (URL 메타데이터만, AI 요약은 나중에)
3. **Phase 4**: Google Drive 연동 (시간 소요 큼)

---

## ✅ 다음 액션

- [ ] Phase 1 탭 기능 수정 시작
- [ ] Notes 모달 UI 디자인
- [ ] Firestore Security Rules 업데이트

---

> **승인 후 개발 시작**: 이 계획을 검토하신 후 승인해 주시면 Phase 1부터 개발을 시작하겠습니다.
