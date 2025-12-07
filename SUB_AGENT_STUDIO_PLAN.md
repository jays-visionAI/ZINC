# Implementation Plan - Sub-Agent Studio Enhancement

## 🎯 목표
Sub-Agent Studio 섹션의 3-Column 레이아웃을 완전하게 구현하여, 서브 에이전트 선택 → 작업 이력 조회 → 콘텐츠 승인까지의 워크플로우를 완성합니다.

---

## 📋 Phase 1: UI 제목 추가

### 1.1 "Sub-Agent Studio" 섹션 타이틀 추가
**위치**: Agent Team 카드와 3-Column 패널 사이

**구현 내용**:
```html
<div class="section-header" style="same as Agent Swarm">
    <h2>Sub-Agent Studio</h2>
    <span class="info-icon">ⓘ</span>
</div>
```

**스타일**: Agent Swarm 섹션 헤더와 동일한 폰트/크기/여백

---

## 📋 Phase 2: 서브에이전트 ↔ Recent Runs 연동

### 2.1 데이터 구조
```
projects/{projectId}/agentRuns/{runId}
├── team_instance_id: string
├── sub_agent_id: string         // ← 추가: 어떤 서브에이전트가 실행했는지
├── sub_agent_role: string       // ← 추가: 역할 표시용
├── status: 'pending' | 'running' | 'completed' | 'failed'
├── created_at: timestamp
├── content_type: 'text' | 'image' | 'thread'
├── output: { ... }              // 생성된 콘텐츠 데이터
└── ...
```

### 2.2 서브에이전트 선택 이벤트
**파일**: `mission-control-view-history.js`

```javascript
// 서브에이전트 카드 클릭 시
function selectSubAgent(subAgentId, subAgentRole) {
    // 1. UI 선택 상태 업데이트
    highlightSelectedSubAgent(subAgentId);
    
    // 2. 해당 서브에이전트의 Runs만 필터링하여 로드
    loadRunsForSubAgent(subAgentId);
    
    // 3. Generated Content 초기화
    clearGeneratedContent();
}
```

### 2.3 Recent Runs 필터링
```javascript
async function loadRunsForSubAgent(subAgentId) {
    const runs = await db.collection('projects')
        .doc(projectId)
        .collection('agentRuns')
        .where('sub_agent_id', '==', subAgentId)
        .orderBy('created_at', 'desc')
        .limit(20)
        .get();
    
    renderRunsList(runs);
}
```

---

## 📋 Phase 3: Recent Runs ↔ Generated Content 연동

### 3.1 Run 선택 시 콘텐츠 표시
```javascript
function selectRun(runId) {
    // 1. UI 선택 상태 업데이트
    highlightSelectedRun(runId);
    
    // 2. Run 데이터 로드
    const runData = await loadRunDetails(runId);
    
    // 3. Generated Content 패널에 표시
    renderGeneratedContent(runData);
}
```

### 3.2 Generated Content 렌더링
```javascript
function renderGeneratedContent(run) {
    const container = document.getElementById('generated-content');
    
    container.innerHTML = `
        <div class="content-preview">
            <div class="content-header">
                <span class="content-type-badge">${run.content_type}</span>
                <span class="content-status">${run.status}</span>
            </div>
            
            <div class="content-body">
                ${renderContentByType(run)}
            </div>
            
            <div class="content-actions">
                <button class="btn-reject" onclick="rejectContent('${run.id}')">
                    ✕ Reject
                </button>
                <button class="btn-edit" onclick="editContent('${run.id}')">
                    ✎ Edit
                </button>
                <button class="btn-approve" onclick="approveContent('${run.id}')">
                    ✓ Approve & Post
                </button>
            </div>
        </div>
    `;
}
```

### 3.3 콘텐츠 액션 버튼
| 버튼 | 동작 | Firestore 업데이트 |
|------|------|-------------------|
| **Reject** | 콘텐츠 거부 | `status: 'rejected'` |
| **Edit** | 수정 모달 오픈 | - |
| **Approve & Post** | 승인 후 채널에 게시 | `status: 'approved'`, API 호출 |

---

## 📋 Phase 4: UI 상태 관리

### 4.1 선택 상태 흐름
```
[Sub-Agent 선택] 
    → Recent Runs 필터링 
    → Generated Content 초기화

[Run 선택] 
    → Generated Content 표시 
    → 액션 버튼 활성화
```

### 4.2 빈 상태 처리
```javascript
// 서브에이전트 미선택 시
"Select a sub-agent to view their recent runs"

// Run 미선택 시  
"Select a run to view generated content"

// 콘텐츠 없을 시
"No content generated yet"
```

---

## 🔧 수정 대상 파일

| 파일 | 수정 내용 |
|------|----------|
| `project-detail.js` | "Sub-Agent Studio" 섹션 헤더 추가 |
| `mission-control-view-history.js` | 서브에이전트 선택 로직, Runs 필터링 |
| `admin-detail.css` | 콘텐츠 프리뷰 및 액션 버튼 스타일 |
| `project-detail.html` | 콘텐츠 액션 버튼 추가 |

---

## ✅ 작업 체크리스트

### Phase 1: UI 제목 ✅
- [x] "Sub-Agent Studio" 섹션 헤더 추가
- [x] Agent Swarm과 동일한 스타일 적용

### Phase 2: 서브에이전트 ↔ Recent Runs ✅
- [x] 서브에이전트 클릭 이벤트 구현
- [x] 선택된 서브에이전트 하이라이트
- [x] Runs 필터링 쿼리 구현
- [x] Recent Runs 목록 렌더링

### Phase 3: Recent Runs ↔ Generated Content ✅
- [x] Run 클릭 이벤트 구현
- [x] 콘텐츠 상세 표시 렌더링
- [x] Reject 버튼 기능
- [x] Edit 버튼 (모달 placeholder)
- [x] Approve & Post 버튼 + Firestore 업데이트

### Phase 4: UX 개선 ✅
- [x] 빈 상태 메시지 표시
- [x] 로딩 상태 표시
- [ ] 에러 처리 (기본 구현 완료)

---

## 🎨 UI 미리보기

```
┌─────────────────────────────────────────────────────────────────────┐
│  Agent Swarm ◎                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [X]Vision Chain  ✓ ACTIVE        │  Deploy New Agent +       │   │
│  │ ⚡ ACTIVE DIRECTIVE: ...         │                           │   │
│  │ [ACTIVATE] [History] [⚙]        │                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Sub-Agent Studio ◎                                                │
│  ┌──────────────┐ ┌──────────────────┐ ┌──────────────────────────┐│
│  │ ASSIGNED     │ │ RECENT RUNS      │ │ GENERATED CONTENT        ││
│  │ SUB-AGENTS   │ │                  │ │                          ││
│  │──────────────│ │──────────────────│ │  [Content Preview]       ││
│  │ ▸ Planner    │ │ Run #5 - Success │ │  Type: Thread            ││
│  │   Writer     │ │ Run #4 - Failed  │ │  Status: Pending         ││
│  │   Reviewer   │ │ Run #3 - Success │ │                          ││
│  │   Publisher  │ │                  │ │  ┌──────────────────────┐││
│  │              │ │                  │ │  │ [Reject] [Edit]      │││
│  │              │ │                  │ │  │ [✓ Approve & Post]   │││
│  │              │ │                  │ │  └──────────────────────┘││
│  └──────────────┘ └──────────────────┘ └──────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📅 예상 소요 시간

| Phase | 작업 | 예상 시간 |
|-------|------|----------|
| 1 | UI 제목 추가 | 10분 |
| 2 | 서브에이전트 ↔ Runs 연동 | 30분 |
| 3 | Runs ↔ Content 연동 + 버튼 | 45분 |
| 4 | UX 개선 | 15분 |
| **Total** | | **~1시간 40분** |
