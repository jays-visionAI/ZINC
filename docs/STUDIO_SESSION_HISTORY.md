# Studio 대화 기록 (Session History) 운영 규칙

## 제약 조건

| 항목 | 값 | 비고 |
|------|-----|------|
| **보존 기간** | 180일 (6개월) | 초과 시 자동 아카이브 |
| **프로젝트당 최대 세션** | 100개 | 초과 시 가장 오래된 세션 아카이브 |
| **세션당 최대 메시지** | 1,000개 | 초과 시 새 세션 자동 생성 |
| **총 저장 용량** | 20MB/프로젝트 | 메시지 subcollection 분리 저장 |
| **LLM 컨텍스트 로드** | 최근 20개 메시지 | 토큰 비용 최적화 |

---

## Firestore 데이터 구조

```
projects/{projectId}/studioSessions/{sessionId}
├── createdAt: Timestamp
├── updatedAt: Timestamp
├── title: string (자동 생성: 첫 메시지 앞 50자)
├── messageCount: number
├── lastMessage: string (미리보기용, 100자)
├── isArchived: boolean (default: false)
└── metadata: {
      userId: string,
      projectName: string
    }

projects/{projectId}/studioSessions/{sessionId}/messages/{messageId}
├── role: 'user' | 'assistant' | 'system'
├── content: string
├── timestamp: Timestamp
└── metadata: {
      model?: string,
      tokens?: number
    }
```

---

## 핵심 기능

### 1. 자동 저장
- 사용자 메시지 전송 시 즉시 저장
- AI 응답 수신 시 즉시 저장

### 2. 세션 목록 표시
- Context History 영역에 세션 목록 표시
- 최신순 정렬, 최대 10개 표시
- 더보기 버튼으로 전체 조회

### 3. 세션 복원
- 세션 클릭 시 대화 내역 로드
- 최근 20개 메시지를 LLM 컨텍스트에 주입

### 4. 세션 생성 규칙
- 프로젝트 변경 시 새 세션
- 1,000개 메시지 초과 시 새 세션
- 24시간 비활성 후 재접속 시 새 세션

### 5. 아카이브 정책
- 180일 경과 세션 자동 아카이브
- 아카이브 세션: 열람 가능, 계속 대화 불가
- 100개 초과 시 가장 오래된 세션 아카이브

---

## API 함수

```javascript
// 세션 생성
createSession(projectId, userId, projectName) → sessionId

// 메시지 저장
saveMessage(projectId, sessionId, role, content, metadata) → messageId

// 세션 목록 조회
listSessions(projectId, limit = 10) → [sessions]

// 세션 메시지 로드
loadSessionMessages(projectId, sessionId, limit = 50) → [messages]

// 세션 삭제
deleteSession(projectId, sessionId) → boolean

// 아카이브 실행 (Cloud Function)
archiveOldSessions(projectId) → count
```

---

*Version: 1.0 | Last Updated: 2026-01-21*
