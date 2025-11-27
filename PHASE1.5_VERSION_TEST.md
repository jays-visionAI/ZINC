# Phase 1.5: Version Management - Test Guide

## 🎯 테스트 시나리오

Phase 1.5 버전 관리 시스템을 테스트합니다.

---

## 📦 Step 1: 스크립트 로드

브라우저 콘솔에서:

```javascript
// version-management.js 파일 전체 내용 복사 & 붙여넣기
```

**예상 출력**:
```
✅ Version Management loaded!

Available functions:
  - updateSubAgentVersion(agentId, updates, changeLog, versionType)
  - updateAgentSetSubAgent(agentSetId, role, newSubAgentId)
  - getSubAgentVersions(agentType)
  - getAgentSetHistory(agentSetId)
  - rollbackSubAgent(agentSetId, role, targetSubAgentId)
```

---

## 🧪 Test 1: SubAgent 버전 업데이트

### 시나리오: Planner의 프롬프트를 개선

```javascript
// 1. 현재 버전 확인
const versions = await getSubAgentVersions("planner");
console.log("Planner versions:", versions);

// 2. 프롬프트 업데이트 (minor 버전 증가)
const result = await updateSubAgentVersion(
    "planner_v1_0_0",  // 현재 Agent ID
    {
        system_prompt: `You are an expert strategic content planner for social media.
Your role is to:
- Deeply analyze the user's request and target audience
- Define clear, measurable content goals and KPIs
- Create a detailed, actionable content outline
- Set precise tone, style, and brand guidelines
- Consider platform-specific best practices

Output a comprehensive JSON plan with: goal, target_audience, tone, content_outline, kpi_targets, platform_notes`
    },
    "Enhanced system prompt with more detailed instructions and KPI planning", // 변경 설명
    "minor"  // 버전 타입: major | minor | patch
);

console.log("Update result:", result);
```

**예상 결과**:
```
🔄 Updating SubAgent: planner_v1_0_0
   Version type: minor
   Change: Enhanced system prompt...

   Current: 1.0.0 (planner_v1_0_0)
   New: 1.1.0 (planner_v1_1_0)
   ✅ Created new version: planner_v1_1_0
   📝 SubAgent history recorded: hist_...
   ✅ Marked old version as deprecated

{
  success: true,
  oldAgentId: "planner_v1_0_0",
  newAgentId: "planner_v1_1_0",
  oldVersion: "1.0.0",
  newVersion: "1.1.0"
}
```

---

## 🧪 Test 2: AgentSet에 새 버전 적용 (자동 버전 증가)

```javascript
// AgentSet에 업그레이드된 Planner 적용
const agentSetResult = await updateAgentSetSubAgent(
    "default_team_v1",      // AgentSet ID
    "planner",              // 교체할 역할
    "planner_v1_1_0"        // 새 SubAgent ID
);

console.log("AgentSet update:", agentSetResult);
```

**예상 결과**:
```
🔄 Updating AgentSet: default_team_v1
   Role: planner → planner_v1_1_0

   Current version: 1.0.0
   New version: 1.1.0
   Old planner: planner_v1_0_0
   New planner: planner_v1_1_0

   ✅ AgentSet updated to v1.1.0
   📝 AgentSet history recorded: hist_...

{
  success: true,
  agentSetId: "default_team_v1",
  oldVersion: "1.0.0",
  newVersion: "1.1.0",
  role: "planner",
  oldSubAgent: "planner_v1_0_0",
  newSubAgent: "planner_v1_1_0"
}
```

---

## 🧪 Test 3: History 조회

### AgentSet 변경 이력 확인

```javascript
const history = await getAgentSetHistory("default_team_v1");
console.log("AgentSet History:");
history.forEach(h => {
    console.log(`  v${h.previous_version} → v${h.version}`);
    console.log(`    Reason: ${h.change_reason}`);
    console.log(`    Changed by: ${h.updated_by}`);
    console.log("");
});
```

**예상 출력**:
```
AgentSet History:
  v1.0.0 → v1.1.0
    Reason: Updated planner: planner_v1_0_0 → planner_v1_1_0
    Changed by: <your-user-id>
```

### SubAgent 모든 버전 확인

```javascript
const plannerVersions = await getSubAgentVersions("planner");
console.log("All Planner versions:");
plannerVersions.forEach(v => {
    console.log(`  ${v.version} (${v.sub_agent_id}) - ${v.status}`);
    console.log(`    ${v.change_log}`);
});
```

**예상 출력**:
```
All Planner versions:
  1.1.0 (planner_v1_1_0) - active
    Enhanced system prompt with more detailed instructions
  1.0.0 (planner_v1_0_0) - deprecated
    Initial version - Phase 1
```

---

## 🧪 Test 4: 업그레이드된 Agent로 Task 실행

```javascript
// 1. 새 Task 생성
const taskId = await createTestTask();

// 2. 실행 (업그레이드된 planner_v1_1_0 사용됨)
await runAgentSetTask(taskId);

// 3. Artifacts 확인
await viewTaskArtifacts(taskId);
```

**확인 사항**:
- Planner artifact의 `sub_agent_id`가 `planner_v1_1_0`인지 확인
- Planner artifact의 `sub_agent_version`이 `1.1.0`인지 확인

---

## 🧪 Test 5: 버전 롤백

### 이전 버전으로 되돌리기

```javascript
const rollbackResult = await rollbackSubAgent(
    "default_team_v1",   // AgentSet ID
    "planner",           // 역할
    "planner_v1_0_0"     // 되돌릴 버전 (이전 버전)
);

console.log("Rollback result:", rollbackResult);
```

**예상 결과**:
```
⏮️  Rolling back planner in default_team_v1
   Target: planner_v1_0_0

🔄 Updating AgentSet: default_team_v1
   Role: planner → planner_v1_0_0
   ...
   ✅ AgentSet updated to v1.2.0

{
  success: true,
  oldVersion: "1.1.0",
  newVersion: "1.2.0",  // ← 롤백도 버전 증가!
  ...
}
```

---

## 🧪 Test 6: Firebase Console에서 검증

1. **SubAgents 컬렉션 확인**
   ```
   /projects/default_project/subAgents
     - planner_v1_0_0 (status: deprecated)
     - planner_v1_1_0 (status: active)
     - creator_v1_0_0
     - manager_v1_0_0
     - ...
   ```

2. **AgentSets 컬렉션 확인**
   ```
   /projects/default_project/agentSets/default_team_v1
     agent_set_version: "1.1.0" (또는 "1.2.0" if rolled back)
     active_sub_agents:
       planner: "planner_v1_1_0" (또는 v1_0_0)
       creator: "creator_v1_0_0"
       manager: "manager_v1_0_0"
   ```

3. **History 컬렉션 확인**
   ```
   /projects/default_project/subAgent_history
     - hist_... (planner 업데이트 기록)
   
   /projects/default_project/agentSet_history
     - hist_... (AgentSet 버전 변경 기록)
   ```

---

## ✅ 성공 기준

- [x] SubAgent 버전 업데이트 성공 (1.0.0 → 1.1.0)
- [x] 새 SubAgent 문서 생성 확인
- [x] 이전 버전 deprecated 상태로 변경
- [x] AgentSet 자동 버전 증가 (1.0.0 → 1.1.0)
- [x] SubAgent_history 기록 생성
- [x] AgentSet_history 기록 생성
- [x] 업그레이드된 Agent로 Task 실행 가능
- [x] 버전 롤백 동작 (1.1.0 → 1.2.0, planner는 v1_0_0으로)

---

## 🎯 다음 단계

Phase 1.5 완료 후:
- **Option A**: Admin UI 개발 (SubAgent/AgentSet 관리 페이지)
- **Option B**: Phase 2 - 실제 LLM 연동

---

## 💡 추가 테스트 아이디어

### Creator 업그레이드

```javascript
await updateSubAgentVersion(
    "creator_v1_0_0",
    {
        config: {
            temperature: 0.9,  // 더 창의적으로
            maxTokens: 4000
        }
    },
    "Increased creativity and output length",
    "minor"
);

await updateAgentSetSubAgent("default_team_v1", "creator", "creator_v1_1_0");
```

### Major 버전 업데이트 (큰 변경)

```javascript
await updateSubAgentVersion(
    "manager_v1_0_0",
    {
        system_prompt: "Complete redesign of manager logic...",
        config: { /* new config */ }
    },
    "Complete redesign - breaking change",
    "major"  // → 2.0.0
);
```

테스트를 시작하세요! 🚀
