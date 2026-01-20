# Target Brief 운영 규칙

## 개요

Target Brief는 AI 에이전트 팀이 콘텐츠를 생성할 때 참조하는 **최종 컨텍스트 문서**입니다. Studio 좌측 패널에 위치하며, 프로젝트의 핵심 정보를 담고 있습니다.

---

## 1. Target Brief 구성 요소

Target Brief가 완성되려면 다음 5가지 핵심 요소가 필요합니다:

| 요소 | 설명 | 검사 키워드 |
|------|------|-------------|
| **브랜드 정보** | 브랜드 아이덴티티, 핵심 가치, 차별화 포인트 | brand, 브랜드, identity, 아이덴티티 |
| **타겟 오디언스** | 주요 고객층 프로파일, 페르소나, 니즈 분석 | audience, 타겟, target, 고객, customer |
| **시장 데이터** | 시장 트렌드, 경쟁사 분석, 산업 동향 | market, 시장, 경쟁, competitor |
| **톤앤매너** | 브랜드 보이스, 커뮤니케이션 스타일 가이드 | tone, 톤앤매너, voice, 스타일 |
| **캠페인 목표** | KPI, 성과 지표, 달성하고자 하는 결과 | goal, 목표, objective, KPI |

---

## 2. AI Orchestrator 대화형 온보딩

프로젝트 로드 시 Target Brief가 미흡하면, AI Orchestrator가 3단계 대화로 사용자를 가이드합니다:

### Step 1: 프로젝트 확인 (즉시)
```
[프로젝트 이름 확인] DONE
사용자가 제시한 프로젝트는 "**{projectName}**" 입니다.
이는 우리가 구축할 "Target Brief"의 핵심 주제입니다.
```

### Step 2: Why Target Brief? (0.5초 후)
```
[Target Brief란?] DONE
**Target Brief**는 AI 에이전트 팀이 최고의 콘텐츠를 만들기 위한 "설계도"입니다.

좋은 Target Brief가 있으면:
• 브랜드 톤에 맞는 일관된 콘텐츠 생성
• 타겟 고객에게 정확히 어필하는 메시지
• 경쟁사와 차별화되는 독창적인 아이디어

**저와 함께 몇 가지 질문에 답하면, 최적의 Target Brief를 완성할 수 있습니다.**
```

### Step 3: 첫 번째 질문 (1.2초 후)
```
이제 **{projectName}** 프로젝트에 대한 "Target Brief"를 함께 구체화해 나가겠습니다.

첫 번째 단계로, 이 프로젝트의 **핵심 목표와 비전**을 이해해야 합니다.

**{projectName}**은 어떤 문제를 해결하거나, 어떤 기회를 포착하기 위한 프로젝트인가요?
간단히 말해, 이 프로젝트의 존재 이유는 무엇인가요?

[아직 형성된 Target Brief는 없어?] 버튼
```

### 빠른 가이드 (버튼 클릭 시)
```
[빠른 가이드] DONE
**Target Brief 빠른 구축 가이드**

아래 질문에 답하면 AI가 자동으로 Target Brief를 구성해 드립니다:

1️⃣ **브랜드/제품**: 무엇을 홍보하나요?
2️⃣ **타겟 고객**: 누구에게 전달하나요? (연령, 관심사)
3️⃣ **핵심 메시지**: 무엇을 말하고 싶나요?
4️⃣ **톤앤매너**: 어떤 느낌으로? (친근, 전문적, 유머)
5️⃣ **목표**: 어떤 결과를 원하나요? (인지도, 전환, 참여)

채팅창에 자유롭게 답변해 주세요. 완벽하지 않아도 됩니다!
```

---

## 3. Target Brief 로딩 프로세스

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TARGET BRIEF 데이터 흐름                          │
└─────────────────────────────────────────────────────────────────────┘

[Step 1] 프로젝트 선택
   └─→ project-select 드롭다운에서 프로젝트 선택

[Step 2] 자동 로딩
   └─→ loadAndAnalyzeTargetBrief(projectId, projectName) 호출
       ├─→ Firestore: projects/{projectId}/sources 조회 (최대 20개)
       └─→ 소스 병합 → syncBriefingBoard(content, 'replace')

[Step 3] 품질 분석
   └─→ analyzeBriefQuality() 호출
       ├─→ 5가지 핵심 요소 검사
       ├─→ 글자 수 검사 (최소 200자)
       └─→ 결과에 따라 Proactive 메시지 표시

[Step 4] 결과 표시
   ├─→ [충분] "프로젝트 확인" + "Target Brief 준비 완료"
   └─→ [미흡] "프로젝트 확인" + "Knowledge Hub 보강 필요"
```

---

## 3. Target Brief 데이터 소스

Target Brief는 다음 경로에서 데이터를 가져옵니다:

### 3.1 Knowledge Hub (Primary)
```
Firestore: projects/{projectId}/sources
```
- 문서, 웹 링크, 노트 등 사용자가 업로드한 자료
- `content` 또는 `summary` 필드의 내용을 병합

### 3.2 프로젝트 기본 정보 (Fallback)
```
Firestore: projects/{projectId}
```
- `description` 또는 `businessDescription` 필드
- Knowledge Hub 소스가 없을 때 사용

### 3.3 Context History
```
Firestore: projects/{projectId}/contentPlans
```
- 이전에 생성된 콘텐츠 플랜
- 좌측 "Context History" 영역에서 선택 가능

---

## 4. Proactive 동작 규칙

### 4.1 Brief 미흡 판정 조건
다음 조건 중 하나라도 해당되면 "미흡"으로 판정:
- 총 글자 수 < 200자
- 누락된 핵심 요소 ≥ 3개

### 4.2 Proactive 메시지 유형

#### [DONE] 프로젝트 확인 카드
```javascript
{
    title: '프로젝트 확인',
    icon: 'check',
    status: 'done',
    content: '현재 설정된 프로젝트 이름은 **{projectName}** 입니다.'
}
```

#### [RUNNING] Knowledge Hub 보강 필요 카드
```javascript
{
    title: 'Knowledge Hub 보강 필요',
    icon: 'brain',
    status: 'running',
    content: '다음 정보가 필요합니다:\n1. **브랜드 정보**: ...\n2. **타겟 오디언스**: ...\n...'
}
```

---

## 5. Target Brief 갱신 (syncBriefingBoard)

### 5.1 함수 시그니처
```javascript
syncBriefingBoard(content, mode)
```

### 5.2 모드 옵션
| 모드 | 동작 | 사용 시점 |
|------|------|-----------|
| `'replace'` | 기존 내용 전체 교체 | 프로젝트 변경, 새 컨텍스트 로드 |
| `'append'` | 기존 내용 유지 + 추가 | AI 추출 컨텍스트, 리서치 결과 |

### 5.3 호출 위치
- `loadAndAnalyzeTargetBrief()`: 프로젝트 로드 시 (replace)
- `parseAICommands()`: [CONTEXT: ...] 명령 처리 시 (append)
- `selectSourceContext()`: Context History 선택 시 (replace)
- MCP 리서치 완료 시 (append)

---

## 6. 관련 UI 요소

| 요소 ID | 위치 | 역할 |
|---------|------|------|
| `final-context-editor` | 좌측 패널 | Target Brief 텍스트 편집 영역 |
| `source-context-display` | 좌측 패널 (상단) | Context History 목록 |
| `brief-char-count` | 편집기 하단 | 글자 수 표시 |
| `brief-sync-indicator` | 편집기 상단 | "Synced" 표시 (갱신 시 깜빡임) |

---

## 7. 7가지 Proactive Trigger 유형

Target Brief 분석은 **STRATEGIC_INSIGHT** 트리거 유형에 해당합니다:

| 카테고리 | 트리거 유형 | 설명 | Phase |
|----------|-------------|------|-------|
| Smart Context | TASK_RECOVERY | 미완료 작업 복구 제안 | 1 |
| Smart Context | ASYNC_COMPLETION | 비동기 작업 완료 알림 | 1 |
| Smart Context | **STRATEGIC_INSIGHT** | 전략적 인사이트 제안 (Brief 분석 포함) | 2 |
| Monitoring | MARKET_SIGNAL | 시장/경쟁사 변화 감지 | 2 |
| Monitoring | USER_SCHEDULER | 사용자 일정 기반 알림 | 1 |
| Lifecycle | LIFECYCLE_CRM | 온보딩/리텐션 CRM | 1 |
| Lifecycle | ADMIN_BROADCAST | 운영자 공지/점검/긴급 | 1 |

---

## 8. Best Practices

### 8.1 효과적인 Target Brief 작성
1. **구체적 수치 포함**: "20-30대 여성" 대신 "25-35세 직장인 여성, 월 소득 400만원 이상"
2. **경쟁사 명시**: "경쟁사 대비 차별화" 대신 "A사, B사 대비 가격 20% 저렴, 품질 동등"
3. **KPI 명확화**: "인지도 향상" 대신 "Instagram 팔로워 10,000명 달성 (3개월 내)"

### 8.2 Knowledge Hub 활용
1. **다양한 소스 타입 업로드**: 문서, 웹 링크, 노트를 균형있게 추가
2. **최신 정보 우선**: 최근 6개월 이내 자료 우선 업로드
3. **핵심 키워드 포함**: 5가지 핵심 요소 관련 키워드가 포함된 자료 우선

---

*Last Updated: 2026-01-21*
