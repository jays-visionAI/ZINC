# Implementation Plan - Agent Execution System (Full Stack)

## 🎯 Goal
Firebase + Cloudflare 환경에서 에이전트 팀 실행 시스템을 완전하게 구현합니다.

---

## ✅ Phase 1: UI/UX (완료)

### 1.1 Agent Card Footer 업데이트 ✅
- [x] "View History" 버튼 크기 50%로 축소
- [x] "Activate" 버튼 추가 (나머지 50%)
- [x] 그린 그라데이션 + Play 아이콘 디자인

### 1.2 Activation Modal 구현 ✅
- [x] 프리미엄 디자인 (Glassmorphism, 애니메이션 오브)
- [x] 팀 정보 표시 (이름, 에이전트 수, Directive)
- [x] Custom Instructions 입력 필드
- [x] Start Run 버튼
- [x] Notification Toast 시스템

---

## 🔧 Phase 2: Backend Logic (다음 단계)

### 2.1 AgentRun 문서 구조
```
projects/{projectId}/agentRuns/{runId}
├── team_instance_id: string
├── project_id: string
├── status: 'pending' | 'running' | 'completed' | 'failed'
├── trigger_type: 'manual' | 'scheduled'
├── custom_instructions: string
├── created_at: timestamp
├── started_at: timestamp
├── completed_at: timestamp
├── current_step: string (현재 실행 중인 sub-agent ID)
├── steps_completed: string[] (완료된 sub-agent IDs)
├── generated_content_ids: string[]
└── error: string | null
```

### 2.2 Agent Execution Service
**위치**: `/services/agent-execution-service.js`

```javascript
class AgentExecutionService {
    // Sub-Agent 순차 실행
    async executeRun(runId) { }
    
    // 개별 Sub-Agent 실행
    async executeSubAgent(subAgentId, context) { }
    
    // LLM API 호출 (OpenAI/Anthropic)
    async callLLM(prompt, model) { }
    
    // 결과물 저장
    async saveGeneratedContent(runId, content) { }
}
```

### 2.3 실행 흐름
```
1. [UI] Activate 버튼 클릭
2. [Firestore] AgentRun 문서 생성 (status: 'pending')
3. [Service] AgentExecutionService.executeRun() 호출
4. [Loop] 각 Sub-Agent 순차 실행:
   a. Planner → 컨텐츠 계획 생성
   b. Writer → 초안 작성
   c. Reviewer → 검토 및 수정
   d. Publisher → 최종 포맷팅
5. [Firestore] generatedContent 저장
6. [Firestore] AgentRun 상태 업데이트 (status: 'completed')
7. [UI] 알림 표시 + UI 새로고침
```

---

## 🎨 Phase 3: Real-time UI Updates

### 3.1 실행 상태 표시
- Agent Card에 "Running..." 상태 표시
- 현재 실행 중인 Sub-Agent 하이라이트
- Progress 표시 (1/4, 2/4 등)

### 3.2 Firestore Listener
```javascript
// 실시간 Run 상태 구독
db.collection('projects').doc(projectId)
  .collection('agentRuns').doc(runId)
  .onSnapshot((doc) => {
      updateUIWithRunStatus(doc.data());
  });
```

---

## 📋 작업 체크리스트

### Phase 2 구현 순서:
1. [ ] `/services/agent-execution-service.js` 생성
2. [ ] OpenAI/Anthropic API 키 설정 (Settings에서 가져오기)
3. [ ] `executeRun()` 메인 실행 함수 구현
4. [ ] `executeSubAgent()` 개별 에이전트 실행 구현
5. [ ] `callLLM()` API 호출 구현
6. [ ] `saveGeneratedContent()` 결과 저장 구현
7. [ ] 에러 핸들링 및 재시도 로직

### Phase 3 구현 순서:
1. [ ] Agent Card에 running 상태 CSS 추가
2. [ ] Firestore listener 설정
3. [ ] UI 상태 업데이트 함수 구현
4. [ ] Sub-Agent 카드에 진행 상태 표시

---

## 🔐 보안 고려사항

1. **API 키 보호**
   - API 키는 `userApiCredentials` 컬렉션에서 안전하게 가져옴
   - 클라이언트에서 직접 API 호출 (서버리스)

2. **Rate Limiting**
   - Daily Actions 제한 준수
   - 동시 실행 방지 (팀당 1개의 active run만)

3. **에러 핸들링**
   - API 실패 시 자동 재시도 (최대 3회)
   - 모든 에러는 Run 문서에 기록

---

## 📁 파일 구조

```
/services/
├── agent-runtime-service.js (기존)
├── agent-execution-service.js (신규)
└── llm-provider-service.js (신규 - LLM API 추상화)

/project-detail-card-handlers.js (수정됨)
/project-detail.html (수정됨)
/styles/agent-swarm-cards.css (수정됨)
```
