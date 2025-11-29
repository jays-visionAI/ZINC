# ZYNK Mission Control – Data Contract v1.1

**Purpose**: Defines the exact data requirements for each Mission Control UI panel.  
**Date**: 2025-11-29  
**Status**: Production Ready

---

## Overview

This document specifies the **data contract** between the backend (Firestore) and the Mission Control frontend. Each panel's data source, required fields, and query patterns are explicitly defined.

---

## 1. Agent Swarm (TOP)

### Source
- **Collection**: `projectAgentTeamInstances`
- **Model**: `AgentTeamInstance` (see [firestore-schema.md v1.1](./firestore-schema.md#collection-projectagentteaminstances))

### Required Fields per Card

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | teamInstanceId | `"team_1732345678901"` |
| `name` | 팀 이름 | `"Instagram Official Team"` |
| `status` | 상태 배지 (active / paused / error …) | `"active"` |
| `platform` | 채널 아이콘 (instagram, youtube …) | `"instagram"` |
| `active_directive.summary` | 현재 지시사항 텍스트 | `"Autonomous mode active..."` |
| `metrics.daily_actions_completed` | 일일 작업 완료 수 | `8` |
| `metrics.daily_actions_quota` | 일일 작업 할당량 | `15` |
| `metrics.neural_sync_score` | Neural Sync 점수 (0-100) | `91` |
| `metrics.last_run_at` | 마지막 실행 시각 | `Timestamp` |

### Query Pattern

```javascript
// Input
const projectId = 'proj_abc123';

// Query
const snapshot = await db
  .collection('projectAgentTeamInstances')
  .where('projectId', '==', projectId)
  .where('status', '!=', 'inactive')
  .orderBy('status')
  .orderBy('deployedAt', 'desc')
  .limit(20)
  .get();

// Output: Array of AgentTeamInstance
const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Filters:**
- `projectId == currentProjectId`
- `status != 'inactive'`

**Sort:**
- Primary: `status` (to show active teams first)
- Secondary: `deployedAt` DESC (newest first)

**Limit:** 20–50 teams (pagination 가능)

---

## 2. Left Panel – Active Sub-Agents

### Source
- **Subcollection**: `projectAgentTeamInstances/{teamId}/subAgents`
- **Model**: `SubAgentInstance` (see [subagent-instance-design.md](./subagent-instance-design.md))

### Required Fields per Card

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | subAgentInstanceId | `"sa_planner_001"` |
| `role_name` | 카드 타이틀 | `"TrendHunter"` |
| `role_type` | 역할 설명/툴팁 | `"planner"` |
| `metrics.success_rate` | 성공률 표시 | `98.5` → `"98% SR"` |
| `metrics.last_active_at` | 마지막 활동 시각 | `Timestamp` → `"Last active 10m ago"` |
| `status` | 상태 배지 (optional) | `"active"` |

### Query Pattern

```javascript
// Input
const teamInstanceId = 'team_1732345678901';

// Query
const snapshot = await db
  .collection('projectAgentTeamInstances')
  .doc(teamInstanceId)
  .collection('subAgents')
  .orderBy('display_order', 'asc')
  .get();

// Output: Array of SubAgentInstance
const subAgents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Path:** `projectAgentTeamInstances/{teamInstanceId}/subAgents`

**Order:** `display_order` ASC

**Limit:** None (typically 3-10 sub-agents per team)

---

## 3. Center Panel – Recent Runs

### Source
- **Subcollection**: `projects/{projectId}/agentRuns`
- **Model**: `AgentRun` (see [agentrun-content-design.md](./agentrun-content-design.md))

### Required Fields per Row

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | runId | `"run_1732345678901"` |
| `status` | 상태 배지 (pending/running/success/failed) | `"success"` |
| `prompt` | 한 줄 요약 텍스트 | `"Create Instagram caption..."` |
| `started_at` | 실행 시각 | `Timestamp` → `"2 hours ago"` |
| `duration_ms` | 실행 시간 | `3200` → `"3.2s"` |
| `sub_agent_instance_id` | 어떤 Sub-Agent가 실행했는지 | `"sa_creator_text_001"` |
| `output_ids` | 생성된 콘텐츠 ID 배열 | `["content_abc123"]` |

### Sub-Agent Name Resolution

> **Note**: Sub-Agent 이름은 클라이언트에서 `SubAgentInstance` 맵을 미리 만들어놓고 `sub_agent_instance_id`로 lookup.

```javascript
// 1. Load sub-agents first
const subAgentsMap = {};
const subAgentsSnapshot = await db
  .collection('projectAgentTeamInstances')
  .doc(teamInstanceId)
  .collection('subAgents')
  .get();

subAgentsSnapshot.forEach(doc => {
  const data = doc.data();
  subAgentsMap[data.id] = data.role_name;
});

// 2. Resolve names when rendering runs
runs.forEach(run => {
  run.subAgentName = subAgentsMap[run.sub_agent_instance_id] || 'Unknown';
});
```

### Query Pattern

```javascript
// Input
const projectId = 'proj_abc123';
const teamInstanceId = 'team_1732345678901';
const subAgentInstanceId = 'sa_creator_text_001'; // Optional filter

// Query (all runs for team)
let query = db
  .collection('projects')
  .doc(projectId)
  .collection('agentRuns')
  .where('team_instance_id', '==', teamInstanceId);

// Optional: Filter by specific sub-agent
if (subAgentInstanceId) {
  query = query.where('sub_agent_instance_id', '==', subAgentInstanceId);
}

const snapshot = await query
  .orderBy('started_at', 'desc')
  .limit(20)
  .get();

// Output: Array of AgentRun
const runs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Filters:**
- Required: `team_instance_id == 선택된 팀`
- Optional: `sub_agent_instance_id == 선택된 서브에이전트`

**Order:** `started_at` DESC

**Limit:** 20

---

## 4. Right Panel – Generated Content

### Source
- **Subcollection**: `projects/{projectId}/generatedContents`
- **Model**: `GeneratedContent` (see [agentrun-content-design.md](./agentrun-content-design.md))

### Required Fields per Card

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | contentId | `"content_abc123"` |
| `title` | 콘텐츠 제목 | `"Weekend Brunch Vibes"` |
| `body` | 캡션 요약 | `"Spice up your weekend..."` |
| `thumbnail_url` | 썸네일 이미지 URL | `"https://storage.googleapis.com/..."` |
| `status` | 상태 (Draft / Scheduled / Published …) | `"published"` |
| `platform` | 플랫폼 아이콘 | `"instagram"` |
| `scheduled_for` OR `created_at` | 시간 표시 | `Timestamp` |
| `external_post_url` | "Open" 버튼 링크 | `"https://instagram.com/p/abc123"` |
| `engagement` | 좋아요 / 댓글 / 공유 (optional) | `{ likes: 342, comments: 28 }` |

### Query Pattern

```javascript
// Input
const projectId = 'proj_abc123';
const teamInstanceId = 'team_1732345678901';
const runId = 'run_1732345678901'; // Optional filter

// Query (all content for team)
let query = db
  .collection('projects')
  .doc(projectId)
  .collection('generatedContents')
  .where('team_instance_id', '==', teamInstanceId);

// Optional: Filter by specific run
if (runId) {
  query = query.where('run_id', '==', runId);
}

const snapshot = await query
  .orderBy('created_at', 'desc')
  .limit(20)
  .get();

// Output: Array of GeneratedContent
const contents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

**Filters:**
- Required: `team_instance_id == 선택된 팀`
- Optional: `run_id == 선택된 실행`

**Order:** `created_at` DESC

**Limit:** 20

---

## Complete Data Flow Example

### Scenario: User Opens Mission Control for Project

```javascript
async function loadMissionControl(projectId) {
  // 1. Load Agent Swarm (TOP)
  const teams = await db
    .collection('projectAgentTeamInstances')
    .where('projectId', '==', projectId)
    .where('status', '!=', 'inactive')
    .orderBy('status')
    .orderBy('deployedAt', 'desc')
    .limit(20)
    .get()
    .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  
  renderAgentSwarm(teams);
  
  // 2. User clicks on a team card
  const selectedTeamId = teams[0].id;
  
  // 3. Load Active Sub-Agents (LEFT)
  const subAgents = await db
    .collection('projectAgentTeamInstances')
    .doc(selectedTeamId)
    .collection('subAgents')
    .orderBy('display_order', 'asc')
    .get()
    .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  
  renderActiveSubAgents(subAgents);
  
  // 4. Load Recent Runs (CENTER)
  const runs = await db
    .collection('projects')
    .doc(projectId)
    .collection('agentRuns')
    .where('team_instance_id', '==', selectedTeamId)
    .orderBy('started_at', 'desc')
    .limit(20)
    .get()
    .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  
  // Resolve sub-agent names
  const subAgentsMap = {};
  subAgents.forEach(sa => {
    subAgentsMap[sa.id] = sa.role_name;
  });
  runs.forEach(run => {
    run.subAgentName = subAgentsMap[run.sub_agent_instance_id] || 'Unknown';
  });
  
  renderRecentRuns(runs);
  
  // 5. Load Generated Content (RIGHT)
  const contents = await db
    .collection('projects')
    .doc(projectId)
    .collection('generatedContents')
    .where('team_instance_id', '==', selectedTeamId)
    .orderBy('created_at', 'desc')
    .limit(20)
    .get()
    .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  
  renderGeneratedContent(contents);
}
```

---

## Real-time Updates

### Listen to Team Changes

```javascript
const unsubscribeTeams = db
  .collection('projectAgentTeamInstances')
  .where('projectId', '==', projectId)
  .where('status', '!=', 'inactive')
  .orderBy('status')
  .orderBy('deployedAt', 'desc')
  .onSnapshot(snapshot => {
    const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAgentSwarm(teams);
  });
```

### Listen to Recent Runs

```javascript
const unsubscribeRuns = db
  .collection('projects')
  .doc(projectId)
  .collection('agentRuns')
  .where('team_instance_id', '==', teamInstanceId)
  .orderBy('started_at', 'desc')
  .limit(20)
  .onSnapshot(snapshot => {
    const runs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRecentRuns(runs);
  });
```

### Listen to Generated Content

```javascript
const unsubscribeContent = db
  .collection('projects')
  .doc(projectId)
  .collection('generatedContents')
  .where('team_instance_id', '==', teamInstanceId)
  .orderBy('created_at', 'desc')
  .limit(20)
  .onSnapshot(snapshot => {
    const contents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderGeneratedContent(contents);
  });
```

---

## Required Firestore Indexes

### For Agent Swarm Query

```javascript
{
  collection: 'projectAgentTeamInstances',
  fields: [
    { fieldPath: 'projectId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'deployedAt', order: 'DESCENDING' }
  ]
}
```

### For Recent Runs Query

```javascript
{
  collection: 'agentRuns',
  fields: [
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'started_at', order: 'DESCENDING' }
  ]
}

// Optional: For filtering by sub-agent
{
  collection: 'agentRuns',
  fields: [
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'sub_agent_instance_id', order: 'ASCENDING' },
    { fieldPath: 'started_at', order: 'DESCENDING' }
  ]
}
```

### For Generated Content Query

```javascript
{
  collection: 'generatedContents',
  fields: [
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'created_at', order: 'DESCENDING' }
  ]
}

// Optional: For filtering by run
{
  collection: 'generatedContents',
  fields: [
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'run_id', order: 'ASCENDING' },
    { fieldPath: 'created_at', order: 'DESCENDING' }
  ]
}
```

---

## Error Handling

### Missing Data Scenarios

| Scenario | Handling |
|----------|----------|
| No teams found | Show empty state: "No agent teams deployed" |
| No sub-agents | Show placeholder: "Initializing agents..." |
| No runs | Show empty state: "No executions yet" |
| No content | Show empty state: "No content generated" |
| Sub-agent name not found | Display: "Unknown Agent" |
| Thumbnail missing | Use platform default icon |
| Engagement data missing | Hide engagement section |

### Loading States

```javascript
// Show loading spinner while fetching
setLoading(true);

try {
  const data = await fetchData();
  renderUI(data);
} catch (error) {
  showError('Failed to load data. Please refresh.');
  console.error(error);
} finally {
  setLoading(false);
}
```

---

## Performance Optimization

### Pagination

```javascript
// Load more runs
let lastVisible = null;

async function loadMoreRuns() {
  let query = db
    .collection('projects')
    .doc(projectId)
    .collection('agentRuns')
    .where('team_instance_id', '==', teamInstanceId)
    .orderBy('started_at', 'desc')
    .limit(20);
  
  if (lastVisible) {
    query = query.startAfter(lastVisible);
  }
  
  const snapshot = await query.get();
  lastVisible = snapshot.docs[snapshot.docs.length - 1];
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

### Caching Strategy

- **Agent Swarm**: Cache for 5 minutes
- **Sub-Agents**: Cache for 10 minutes (rarely changes)
- **Recent Runs**: Real-time listener (no cache)
- **Generated Content**: Real-time listener (no cache)

---

## Testing Checklist

- [ ] Agent Swarm loads correctly
- [ ] Sub-Agents display in correct order
- [ ] Recent Runs show latest first
- [ ] Generated Content renders thumbnails
- [ ] Real-time updates work
- [ ] Empty states display correctly
- [ ] Loading states show during fetch
- [ ] Error states handle failures gracefully
- [ ] Pagination works for runs/content
- [ ] Sub-agent name resolution works

---

## References

- [Firestore Schema v1.1](./firestore-schema.md)
- [SubAgentInstance Design](./subagent-instance-design.md)
- [AgentRun & Content Design](./agentrun-content-design.md)
- [Implementation Guides](./README.md#implementation-guides)

---

**Document Owner**: Frontend Team  
**Last Updated**: 2025-11-29  
**Status**: Production Ready
