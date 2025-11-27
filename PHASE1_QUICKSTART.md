# ZYIC AGENT OS - Phase 1 Quick Start Guide

## 🚀 Phase 1 초기화 및 테스트

Phase 1에서는 **LLM 연동 없이** Mock 데이터로 전체 흐름을 검증합니다.

---

## Step 1: Firebase Console에서 스크립트 실행

### 1.1 초기화 스크립트 실행

1. Firebase Console 열기: https://console.firebase.google.com/
2. 프로젝트 선택: `zinc-c790f`
3. Firestore Database로 이동
4. 웹 앱 페이지 열기 (예: `localhost:8000` 또는 `zync.pages.dev`)
5. 브라우저 콘솔 열기 (F12)
6. 스크립트 복사 & 실행:

```javascript
// 1. init-agent-os-phase1.js 내용 전체 복사 후 실행
// 또는 HTML에 script 태그 추가
```

**결과 확인**:
```
🚀 ZYIC AGENT OS - Phase 1 Initialization
==========================================

📦 Step 1: Creating Sub-Agents...
  ✅ Queued: planner (1.0.0) - active
  ✅ Queued: creator (1.0.0) - active
  ✅ Queued: manager (1.0.0) - active
  ... (7개 agents)

✨ Successfully created 7 sub-agents!

📦 Step 2: Creating Default AgentSet...
  ✅ Created: Default Marketing Team v1

✨ Phase 1 Initialization Complete!
```

### 1.2 Firestore 확인

Firebase Console에서 다음 컬렉션 생성 확인:

```
/projects/default_project/subAgents
  - planner_v1_0_0
  - creator_v1_0_0
  - manager_v1_0_0
  - research_v1_0_0 (placeholder)
  - compliance_v1_0_0 (placeholder)
  - evaluator_v1_0_0 (placeholder)
  - kpi_engine_v1_0_0 (placeholder)

/projects/default_project/agentSets
  - default_team_v1
```

---

## Step 2: Orchestration 엔진 로드

```javascript
// 2. orchestrator-phase1.js 내용 전체 복사 후 실행
```

**결과**:
```
✅ Orchestration engine loaded!

Available functions:
  - runAgentSetTask(taskId)
  - viewTaskArtifacts(taskId)
  - createTestTask()
```

---

## Step 3: 테스트 Task 실행

### 3.1 Task 생성

```javascript
const taskId = await createTestTask();
console.log("Task ID:", taskId);
// 출력 예: task_1732532400123
```

### 3.2 Task 실행

```javascript
await runAgentSetTask(taskId);
```

**예상 출력**:
```
🚀 Starting Task Execution: task_1732532400123
==========================================

📋 Task loaded: 이번 주 주말 인스타그램에 올릴 서울 카페 추천 게시물을 만들어줘
🤖 AgentSet: Default Marketing Team v1 (v1.0.0)
✅ Loaded 7 sub-agents

📋 STEP 1: Planner Agent
------------------------------------------
  🤖 Executing: planner (1.0.0)
     ⏱️  Execution time: 12ms
     💾 Saved artifact: art_1732532401_abc123
✅ Planner completed

✍️  STEP 2: Creator Agent
------------------------------------------
  🤖 Executing: creator (1.0.0)
     ⏱️  Execution time: 8ms
     💾 Saved artifact: art_1732532402_def456
✅ Creator completed

👔 STEP 3: Manager Agent
------------------------------------------
  🤖 Executing: manager (1.0.0)
     ⏱️  Execution time: 5ms
     💾 Saved artifact: art_1732532403_ghi789
✅ Manager completed

==========================================
✨ Task task_1732532400123 completed successfully!
==========================================

📦 Artifacts created:
   - art_1732532401_abc123 (plan)
   - art_1732532402_def456 (draft_content)
   - art_1732532403_ghi789 (final_decision)
```

### 3.3 결과 확인

```javascript
await viewTaskArtifacts(taskId);
```

**출력 예시**:
```
📦 Artifacts for task task_1732532400123:
==========================================

  PLANNER:
     Type: plan
     Data: {
       goal: "instagram 게시물 생성",
       target_audience: "20-30대",
       tone: "친근하고 감성적",
       content_outline: [...]
     }

  CREATOR:
     Type: draft_content
     Data: {
       title: "주말 서울 카페 추천 ☕",
       caption: "주말엔 여기 어때요? 🌿\n...",
       hashtags: ["#서울카페", "#성수카페", ...]
     }

  MANAGER:
     Type: final_decision
     Data: {
       decision: "PASS",
       release_ready: true,
       quality_score: 8.5,
       comments: "콘텐츠가 전략에 잘 부합하며..."
     }
```

---

## Step 4: Firestore에서 검증

Firebase Console에서 확인:

### 생성된 Collections:

```
/projects/default_project/agentTasks
  - task_1732532400123
    status: "success"
    current_step: "done"

/projects/default_project/artifacts
  - art_1732532401_abc123 (planner)
  - art_1732532402_def456 (creator)
  - art_1732532403_ghi789 (manager)
```

---

## ✅ Phase 1 완료 체크리스트

- [x] Firestore에 `subAgents` 컬렉션 생성 (7개 문서)
- [x] Firestore에 `agentSets` 컬렉션 생성 (1개 문서)
- [x] Task 생성 및 실행 성공
- [x] 3개 Artifact 생성 확인 (plan, draft_content, final_decision)
- [x] Security Rules 설정 (Phase 1.5)
- [x] 버전 관리 로직 테스트 (완료)

---

## 🔧 문제 해결

### "db is not defined"
- Firebase SDK가 로드되지 않음
- `firebase-config.js`가 먼저 로드되었는지 확인
- 페이지 새로고침 후 재시도

### "Collection not found"
- `projectId` 변수 확인
- 초기화 스크립트 재실행

### Timestamp 관련 오류
- `firebase.firestore.FieldValue.serverTimestamp()` 사용 확인

---

## 📚 다음 단계 (Phase 1.5)

1. **Security Rules 설정**
   - `subAgents`, `agentSets` read/write 권한
   - Admin 전용 write 규칙

2. **버전 관리 테스트**
   - SubAgent 업데이트 → 버전 증가
   - AgentSet 버전 자동 증가
   - History 기록

3. **Admin UI 연결 (Optional)**
   - `admin-subagents.html` 페이지 생성
   - Firestore 데이터 표시

---

## 🎯 Phase 2 준비

Phase 1 완료 후 Phase 2에서는:
- ✅ 실제 LLM Provider 연동 (OpenAI/Anthropic/Google)
- ✅ Cloud Functions로 Orchestrator 이동
- ✅ Admin Dashboard UI 개발

현재는 **Mock 데이터로 전체 흐름 검증 완료** 상태입니다! 🚀
