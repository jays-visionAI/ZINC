# 🚀 ZYNK 베타 서비스 개시 전 체크리스트

> **최종 수정일**: 2025-12-05  
> **목적**: 정식 서비스 전 반드시 확인 및 개선해야 할 항목

---

## 🔴 Critical (보안/안정성)

### 1. LLM API Key 보안 강화 ⚠️ **MUST FIX**

**현재 상태 (베타)**:
- `systemLLMProviders` 컬렉션이 인증된 사용자에게 읽기 허용
- API Key가 프론트엔드에 노출됨

**정식 서비스 권장안**:
```
[User Frontend] → [Cloudflare Worker/Backend] → [OpenAI API]
                         ↓
                   (API Key는 서버에만 저장)
```

**구현 작업**:
- [ ] Cloudflare Worker 생성 (`/api/llm/generate`)
- [ ] Worker에서 `systemLLMProviders` 읽기 (서버 측)
- [ ] 클라이언트는 Worker만 호출
- [ ] `firestore.rules`에서 `systemLLMProviders` 읽기 권한을 Admin only로 복원

**관련 파일**:
- `/firestore.rules` (라인 175-183)
- `/services/agent-execution-service.js`

---

### 2. User API Credentials 암호화

**현재 상태**:
- 소셜 채널 API Key가 평문으로 Firestore에 저장

**권장안**:
- [ ] AES 암호화 적용 (Firebase KMS 또는 Cloudflare Secrets)
- [ ] 암호화된 키만 클라이언트에 전달
- [ ] 복호화는 서버 측에서만 수행

---

## 🟡 Important (성능/UX)

### 3. 에이전트 실행 큐잉 시스템

**현재 상태**:
- 프론트엔드에서 직접 LLM API 호출
- 동시 다수 사용자 시 Rate Limit 이슈 가능

**권장안**:
- [ ] Cloud Functions 또는 Cloudflare Queue 도입
- [ ] 작업 상태 실시간 업데이트 (Firestore listeners)

---

### 4. 에러 핸들링 및 재시도 로직

**현재 상태**:
- LLM API 실패 시 단순 에러 표시

**권장안**:
- [ ] 지수 백오프 재시도 로직
- [ ] 사용자 친화적 에러 메시지
- [ ] 실패 로그 저장 (`projects/{id}/errorLogs`)

---

## 🟢 Nice to Have (개선사항)

### 5. 소셜 미디어 게시 자동화

**현재 상태**:
- 콘텐츠 승인 후 수동 게시

**권장안**:
- [ ] X (Twitter) API 자동 게시 연동
- [ ] 예약 게시 기능

---

### 6. 분석 대시보드

- [ ] 에이전트 실행 통계
- [ ] 콘텐츠 승인률
- [ ] 채널별 성과 지표

---

## ✅ 완료된 항목

- [x] User/Admin API 분리 (`userApiCredentials` vs `systemLLMProviders`)
- [x] Firestore 보안 규칙 초기 설정
- [x] 에이전트 실행 파이프라인 구현
- [x] 콘텐츠 승인 워크플로우 (Reject/Edit/Approve)

---

## 📌 참고사항

### API 분리 체계

| 용도 | 컬렉션 | 관리 페이지 | 사용자 |
|------|--------|-------------|--------|
| LLM 실행 (OpenAI) | `systemLLMProviders` | Admin Settings | 회사 |
| 소셜 채널 (X, LinkedIn) | `userApiCredentials` | User Settings | 고객 |

---

**담당자**: Development Team  
**검토 시점**: 정식 서비스 2주 전
