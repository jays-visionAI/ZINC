# ZYNK Mission Control – Agent Team View History 연동 + Firestore 스키마 구현

**Version**: 1.0  
**Date**: 2025-11-29  
**Status**: Implementation Ready

---

## 목표

Mission Control 화면에서 Agent Swarm 카드의 **View History** 버튼을 누르면, 하단 3개 패널이 모두 해당 Agent Team 기준으로 동기화되도록 구현한다.

1. **좌측**: Assigned Agent Team → 실제 할당된 **Sub-Agents 리스트**
2. **중앙**: Recent Runs → 이 팀의 Sub-Agent가 수행한 **모든 실행 이력(AgentRun)**
3. **우측**: Generated Content → 각 실행으로 생성된 **콘텐츠 + 외부 플랫폼 링크**

Task 실행 시 **모든 실행을 Firestore에 기록**하고, Team / Sub-Agent 단위로 **하루 실행 횟수 제한(Quota)** 를 걸 수 있도록 데이터 스키마/로직을 준비한다.

---

## 1. Firestore 스키마 작업

### 1-1) 기존 컬렉션 재사용

이미 존재하는 컬렉션/문서 구조:
- `projects/{projectId}`
- `projectAgentTeamInstances/{teamId}`
- `projectAgentTeamInstances/{teamId}/subAgents/{subAgentInstanceId}`
- `channelProfiles/{channelId}`
- `subAgentTemplates`, `agentSetTemplates` 등

이번 작업에서는 아래 4개 계층을 View History와 연결한다:

- **Team**: `projectAgentTeamInstances/{teamId}`
- **SubAgents**: `projectAgentTeamInstances/{teamId}/subAgents/{subAgentInstanceId}`
- **Runs**: `projects/{projectId}/agentRuns/{runId}`
- **Contents**: `projects/{projectId}/generatedContents/{contentId}`

---

### 1-2) Team 인스턴스 메트릭/쿼터 필드 추가

**Collection**: `projectAgentTeamInstances`

```typescript
interface TeamMetrics {
  daily_actions_completed: number;  // 오늘 이 팀이 수행한 Task 수
  daily_actions_quota: number;      // 하루 허용 최대 Task 수 (예: 15)

  neural_sync_score: number;        // 카드에 표시되는 91% 등
  success_rate: number;             // 전체 성공률 (0-100)
  total_runs: number;               // 누적 실행 수

  last_run_at?: Timestamp | null;
}

interface ProjectAgentTeamInstance {
  id: string;
  projectId: string;
  channelId: string;
  templateId: string;
  name: string;
  status: 'active' | 'inactive' | 'paused' | 'error';
  platform?: 'instagram' | 'x' | 'youtube' | 'tiktok' | 'blog' | string;

  active_directive?: {
    title: string;          // "ACTIVE DIRECTIVE"
    summary: string;        // 카드에 보여줄 한 줄 설명
    updated_at: Timestamp;
  };

  metrics?: TeamMetrics;

  // 선택: 쿼터 모드 설정
  quota_mode?: 'team_only' | 'team_and_subagent';

  created_at?: Timestamp;
  updated_at?: Timestamp;
}
```

---

### 1-3) Sub-Agent 인스턴스 구조 정리

**Subcollection**: `projectAgentTeamInstances/{teamId}/subAgents`

```typescript
interface SubAgentMetrics {
  daily_actions_completed: number;   // 오늘 이 Sub-Agent가 수행한 Task 수
  daily_actions_quota: number;       // 하루 허용 최대 Task 수
  total_runs: number;                // 누적 실행 수
  success_rate: number;              // 성공률 (0-100)
  last_active_at?: Timestamp | null;
}

interface SubAgentInstance {
  id: string;                        // subAgentInstanceId
  project_id: string;                // proj_...
  team_instance_id: string;          // projectAgentTeamInstances/{teamId}
  template_id: string;               // subAgentTemplates 참조

  role_name: string;                 // Sub-Agent's Role (UI에서 표시)
  role_type: string;                 // 'planner' | 'creator_text' ...
  display_order: number;

  status: 'active' | 'inactive';

  // 좋아요 & 평점 (미션콘트롤/어드민 상세화면에서 사용)
  likes_count: number;
  rating_avg: number;                // 예: 4.9
  rating_count: number;

  metrics?: SubAgentMetrics;

  created_at?: Timestamp;
  updated_at?: Timestamp;
}
```

**View History 클릭 시**, 이 서브컬렉션 전체를 좌측 패널(Assigned Agent Team > Active Sub-Agents 리스트)에 바인딩한다. `display_order` 기준 `asc` 로 정렬.

---

### 1-4) AgentRun 컬렉션 신규 생성

**Subcollection**: `projects/{projectId}/agentRuns/{runId}`

모든 Task 실행/시도는 `AgentRun`으로 기록한다. 쿼터에 막혀 실제 실행이 안 된 경우도 별도의 status로 기록.

```typescript
type AgentRunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'blocked_quota';  // 쿼터 초과로 실행 자체가 막힌 경우

interface AgentRun {
  id: string;

  project_id: string;
  team_instance_id: string;         // projectAgentTeamInstances/{teamId}
  sub_agent_instance_id: string;    // 실행한 Sub-Agent
  sub_agent_role_name: string;      // UI 카드에 표시할 Role 이름

  status: AgentRunStatus;
  started_at: Timestamp;
  completed_at?: Timestamp;
  duration_ms?: number;

  // 실행 요청 내용
  task_prompt: string;              // "이번 주말 인스타그램에 올릴 서울 카페 추천..."
  output_summary?: string;          // 결과 요약(있다면)

  // 생성된 콘텐츠 링크들
  generated_content_ids: string[];  // projects/{projectId}/generatedContents 의 id 배열

  // 쿼터 스냅샷 (blocked_quota 기록용)
  quota_snapshot?: {
    team_daily_actions_completed: number;
    team_daily_actions_quota: number;
    subagent_daily_actions_completed?: number;
    subagent_daily_actions_quota?: number;
  };
  block_reason?: 'team_quota_exceeded' | 'subagent_quota_exceeded' | null;

  // 비용/에러 정보 (선택)
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  };
  error_message?: string;
}
```

**Recent Runs 패널**은 이 `AgentRun` 컬렉션을 기반으로 한다.

- **쿼리 기준**:
  - `where('team_instance_id', '==', teamId)`
  - `orderBy('started_at', 'desc')`
  - 필요 시 `limit(20)` 등
- **상태 표시**:
  - `success` / `failed` / `running` / `blocked_quota` 를 다른 색상 배지로 표현

---

### 1-5) GeneratedContent 컬렉션 신규 생성

**Subcollection**: `projects/{projectId}/generatedContents/{contentId}`

모든 성공적인 생성결과(텍스트/이미지/영상 등)를 여기에 저장하고, 실제 외부 플랫폼에 업로드된 경우 링크를 함께 저장한다.

```typescript
type GeneratedContentStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed';

interface GeneratedContent {
  id: string;

  project_id: string;
  team_instance_id: string;         // 어떤 Agent Team의 결과인지
  sub_agent_instance_id: string;    // 어느 Sub-Agent가 생성했는지
  run_id: string;                   // AgentRun.id

  type: 'text' | 'image' | 'video' | 'carousel';
  title?: string;                   // 카드 제목
  preview_text?: string;            // 캡션/본문 요약
  preview_image_url?: string;       // 썸네일/이미지

  status: GeneratedContentStatus;

  // 게시/스케줄링 정보
  platform: string;                 // 'instagram' | 'x' | 'youtube' | 'blog' 등
  channel_profile_id: string;       // channelProfiles/{id}

  scheduled_for?: Timestamp | null;
  published_at?: Timestamp | null;

  // 실제 외부 플랫폼(인스타/X 등)에 업로드된 경우
  external_post_url?: string | null;  // 외부 링크 (우측 패널 버튼이 이걸 사용)
  external_post_id?: string | null;   // 플랫폼 내부 ID (API 연동 용도)

  // Engagement 메트릭 (선택)
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };

  created_at: Timestamp;
  updated_at: Timestamp;
}
```

**Generated Content 패널**은 이 컬렉션을 기반으로 한다.

- **기본 쿼리(팀 전체 보기)**:
  - `where('team_instance_id', '==', teamId)`
  - `orderBy('created_at', 'desc')`
- **특정 Run 선택 시**:
  - 조건을 `where('run_id', '==', selectedRunId)` 로 변경

각 카드 우측/하단에:
- `external_post_url`가 있으면: **"View on [Platform]"** 버튼 활성화 → 새 탭으로 해당 링크 오픈
- 없으면: **"Not published yet"** 같은 상태 라벨 노출

---

### 1-6) 필수 인덱스

Firestore Composite Index를 아래와 같이 생성해 주세요.

#### 1. agentRuns

```javascript
{
  collection: 'projects/{projectId}/agentRuns',
  fields: [
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'started_at', order: 'DESCENDING' }
  ]
}
```

#### 2. generatedContents – 팀 기준 조회

```javascript
{
  collection: 'projects/{projectId}/generatedContents',
  fields: [
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'created_at', order: 'DESCENDING' }
  ]
}
```

#### 3. generatedContents – Run 기준 조회

```javascript
{
  collection: 'projects/{projectId}/generatedContents',
  fields: [
    { fieldPath: 'run_id', order: 'ASCENDING' },
    { fieldPath: 'created_at', order: 'DESCENDING' }
  ]
}
```

---

## 2. 실행 로직 – 모든 Task 기록 + 쿼터 반영

실제 에이전트가 Task를 수행할 때 다음 패턴으로 구현해 주세요.

### 함수 예시: `executeAgentTask(projectId, teamId, subAgentId, taskPrompt, payload)`

#### 1. 쿼터 조회

- **Team 문서**: `projectAgentTeamInstances/{teamId}.metrics.daily_actions_*`
- **Sub-Agent 문서**: `subAgents/{subAgentId}.metrics.daily_actions_*`

#### 2. 쿼터 초과 여부 체크

팀 혹은 Sub-Agent 둘 중 하나라도 하루 쿼터를 초과하면:

- **LLM 호출/실행은 하지 않음**
- 대신 `AgentRun` 문서를 생성:
  - `status: 'blocked_quota'`
  - `block_reason: 'team_quota_exceeded'` 또는 `'subagent_quota_exceeded'`
  - `quota_snapshot` 필드에 당시 수치 기록
- 함수 종료

#### 3. 정상 실행

1. **AgentRun 문서 생성** (`status: 'running'`, `started_at` 기록)
2. **LLM/에이전트 실행**
3. **실행 완료 후**:
   - `GeneratedContent` 문서 생성 (필요 시 여러 개)
   - `AgentRun` 문서 업데이트:
     - `status: 'success'` 또는 `'failed'`
     - `completed_at`, `duration_ms`
     - `generated_content_ids` 배열 채우기
   - **Team / Sub-Agent metrics 업데이트**:
     - `daily_actions_completed += 1`
     - `total_runs += 1`
     - `success_rate` 재계산
     - `last_run_at` / `last_active_at` 갱신

이렇게 하면 **"모든 Task 시도가 AgentRun에 기록되고, 생성된 Output은 GeneratedContent에 저장되며, 쿼터에 막힌 실행도 blocked_quota 상태로 Recent Runs에서 확인 가능"**합니다.

---

## 3. Mission Control – View History 동작 정의

프론트 기준 **View History 클릭 시**의 동작을 다음과 같이 구현해 주세요.

### 입력: `projectId`, `teamInstanceId`

#### 1. 상태 저장

- 글로벌/페이지 상태에 `selectedTeamId = teamInstanceId` 저장

#### 2. Assigned Agent Team 패널 (좌측)

**쿼리**:
- 컬렉션: `projectAgentTeamInstances/{teamId}/subAgents`
- 정렬: `orderBy('display_order', 'asc')`

**UI**:
- 각 카드에:
  - Sub-Agent 이름 (template / 인스턴스명)
  - `role_name` (Sub-Agent's Role)
  - `likes_count`, `rating_avg` 표시
  - `status`(active/inactive)에 따라 스타일 구분

#### 3. Recent Runs 패널 (중앙)

**쿼리**:
- 컬렉션: `projects/{projectId}/agentRuns`
- 조건: `where('team_instance_id', '==', teamId)`
- 정렬: `orderBy('started_at', 'desc')`

**UI**:
- 각 Run 카드에:
  - `status` 배지 (`success` / `failed` / `running` / `blocked_quota`)
  - `task_prompt` (한 줄 요약)
  - `sub_agent_role_name`
  - `started_at`, `duration_ms`
- **Run 카드 클릭 시**:
  - 우측 Generated Content 패널을 `run_id == clickedRunId` 기준으로 필터링

#### 4. Generated Content 패널 (우측)

**기본 쿼리(팀 전체 보기)**:
- 컬렉션: `projects/{projectId}/generatedContents`
- 조건: `where('team_instance_id', '==', teamId)`
- 정렬: `orderBy('created_at', 'desc')`

**특정 Run 선택 시**:
- 조건을 `where('run_id', '==', selectedRunId)` 로 변경

**UI**:
- 카드 항목:
  - `title` / `preview_text` / `preview_image_url`
  - `status` 배지 (Draft / Scheduled / Published 등)
  - 플랫폼 아이콘 (`platform` 필드 기반)
  - `external_post_url`가 존재하면:
    - **"View on [Platform]"** 버튼 활성화 → 새 탭에서 링크 오픈

---

## 4. 구현 체크리스트

- [ ] `projectAgentTeamInstances` 문서에 `metrics` 필드 추가
- [ ] `subAgents` 서브컬렉션에 `metrics`, `likes_count`, `rating_*` 필드 확정
- [ ] Firestore에 `agentRuns`, `generatedContents` 서브컬렉션 생성
- [ ] 위 스키마에 맞춰 TypeScript 인터페이스/타입 정의
- [ ] 필요한 Composite Index 생성 (3개)
- [ ] `executeAgentTask` 스타일의 서버 함수에서:
  - 쿼터 체크 → AgentRun 기록 → GeneratedContent 생성/연결 → 메트릭 업데이트 로직 구현
- [ ] Mission Control **View History 클릭 시**:
  - 좌/중/우 패널이 각각 위 쿼리 규칙에 따라 해당 팀 데이터만 로딩되도록 연결

---

## 5. 참고 자료

- [Firestore Schema v1.2](./firestore-schema.md)
- [SubAgentInstance Design](./subagent-instance-design.md)
- [Mission Control Data Contract](./mission-control-data-contract.md)
- [AgentRun & Content Design](./agentrun-content-design.md)

---

**Document Owner**: Architecture Team  
**Review Date**: 2025-11-29  
**Status**: Ready for Implementation
