# Brand Brain Sync 기획서

## 문서 정보
- **문서명**: Brand Brain → Hive Mind 동기화 기능 기획서
- **버전**: v1.0
- **작성일**: 2024-12-09
- **상태**: Draft

---

## 1. 개요

### 1.1 배경
ZYNK 플랫폼에서 마케터는 Brand Brain에 브랜드의 핵심 정보(미션, 톤앤매너, 타겟 오디언스 등)를 입력합니다. 이 정보가 실제 콘텐츠를 생성하는 AI Agent들에게 전달되어야 브랜드 일관성이 유지됩니다.

현재 "Sync with Hive Mind" 버튼은 UI만 있고 실제 동기화 로직이 구현되어 있지 않습니다.

### 1.2 목표
- **프로젝트 레벨**에서 Brand Brain 정보를 모든 하위 Agent Team에 일괄 전파
- **자동 동기화** (1일 1회) + **수동 동기화** (버튼 클릭) 지원
- Agent 콘텐츠 생성 시 브랜드 컨텍스트가 자동으로 주입되도록 함

---

## 2. 사용자 스토리

### 마케터 관점
> "Brand Brain에서 브랜드 톤을 '전문적이고 신뢰감 있게'로 설정하고 Sync 버튼을 누르면, 
> 이 프로젝트에 연결된 X(Twitter), Instagram, LinkedIn Agent Team 모두가 
> 같은 톤으로 콘텐츠를 생성해야 합니다."

### 에이전트 관점
> "콘텐츠를 생성할 때 현재 프로젝트의 Brand Brain 정보를 참조하여
> 브랜드 키워드는 반드시 포함하고, 금지어는 절대 사용하지 않아야 합니다."

---

## 3. 시스템 아키텍처

### 3.1 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                         PROJECT                                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    BRAND BRAIN                           │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │ Core Identity│  │   Strategy   │  │Knowledge Hub │   │    │
│  │  │              │  │              │  │              │   │    │
│  │  │ • Name       │  │ • Voice Tone │  │ • Links      │   │    │
│  │  │ • Mission    │  │ • Keywords   │  │ • Notes      │   │    │
│  │  │ • Industry   │  │ • Do's/Don'ts│  │ • Analysis   │   │    │
│  │  │ • Target     │  │ • Focus Topic│  │              │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  │                                                          │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│               ┌───────────────────────┐                         │
│               │   "Sync with Hive     │                         │
│               │       Mind" 버튼       │                         │
│               │   ─────────────────   │                         │
│               │   • 수동: 버튼 클릭   │                         │
│               │   • 자동: 1일 1회     │                         │
│               └───────────┬───────────┘                         │
│                           │                                      │
│           ┌───────────────┼───────────────┐                     │
│           ▼               ▼               ▼                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Agent Team  │  │ Agent Team  │  │ Agent Team  │             │
│  │     A       │  │     B       │  │     C       │             │
│  │ (X/Twitter) │  │ (Instagram) │  │ (LinkedIn)  │             │
│  │             │  │             │  │             │             │
│  │ brandContext│  │ brandContext│  │ brandContext│             │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │             │
│  │ │Synced   │ │  │ │Synced   │ │  │ │Synced   │ │             │
│  │ │Data     │ │  │ │Data     │ │  │ │Data     │ │             │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 3.2 Firestore 스키마

#### 기존 구조 (변경 없음)
```
brandBrain/{userId}/projects/{projectId}
  ├── coreIdentity: {
  │     projectName: "Heritage Water",
  │     description: "Premium mineral water...",
  │     industry: "food_beverage",
  │     targetAudience: "25-45 health-conscious consumers",
  │     website: "https://heritage-water.com",
  │     websiteAnalysis: {...}
  │   }
  ├── strategy: {
  │     brandVoice: {
  │       personality: ["professional", "trustworthy"],
  │       writingStyle: "Clean and concise",
  │       dos: ["Use active voice", "Mention sustainability"],
  │       donts: ["Use slang", "Make health claims"]
  │     },
  │     currentFocus: {
  │       topic: "Summer hydration campaign",
  │       keywords: ["hydration", "wellness", "nature"]
  │     },
  │     toneIntensity: 0.7,
  │     platformPriority: ["instagram", "x", "linkedin"]
  │   }
  ├── knowledgeHub: {
  │     links: [...],
  │     notes: [...],
  │     documents: [...]
  │   }
  └── syncStatus: {
        lastSynced: Timestamp,
        pendingChanges: 0,
        autoSyncEnabled: true,
        autoSyncTime: "09:00"
      }
```

#### 신규 추가: Agent Team에 brandContext 필드
```
projectAgentTeamInstances/{teamId}
  ├── name: "[X] Heritage Water Team"
  ├── projectId: "proj_abc123"
  ├── channelType: "x"
  ├── subAgents: [...]
  │
  └── brandContext: {                    // ⬅️ 신규 추가
        syncedAt: Timestamp,
        syncVersion: 3,
        data: {
          brandName: "Heritage Water",
          mission: "Premium mineral water...",
          industry: "food_beverage",
          targetAudience: "25-45 health-conscious consumers",
          voiceTone: ["professional", "trustworthy"],
          writingStyle: "Clean and concise",
          keywords: ["hydration", "wellness", "nature"],
          dos: ["Use active voice", "Mention sustainability"],
          donts: ["Use slang", "Make health claims"],
          currentFocus: "Summer hydration campaign"
        }
      }
```

---

## 4. 기능 상세

### 4.1 수동 동기화 (Sync with Hive Mind 버튼)

#### 트리거
- Brand Brain 화면에서 "Sync with Hive Mind" 버튼 클릭

#### 프로세스
1. 현재 선택된 프로젝트의 Brand Brain 데이터 수집
2. 해당 프로젝트에 연결된 모든 Agent Team 조회
3. 각 Agent Team의 `brandContext` 필드 업데이트 (Batch Write)
4. `syncStatus.lastSynced` 타임스탬프 업데이트
5. 성공/실패 알림 표시

#### UI 피드백
```
[버튼 클릭]
   ↓
"Syncing..." (로딩 상태)
   ↓
"✅ 3 Agent Teams에 브랜드 정보가 동기화되었습니다!"
   ↓
"Last Synced: Just now"
```

### 4.2 자동 동기화 (일 1회)

#### 트리거
- Cloud Scheduler (매일 지정된 시간)
- 또는 Firebase Functions의 onSchedule

#### 조건
- `syncStatus.autoSyncEnabled === true`인 프로젝트만 대상
- 마지막 동기화 이후 변경사항이 있는 경우만 실행

#### 프로세스
1. Cloud Function이 모든 활성 프로젝트 조회
2. 각 프로젝트의 Brand Brain 데이터 수집
3. 하위 Agent Team들에 일괄 동기화
4. 동기화 로그 기록

### 4.3 Agent 콘텐츠 생성 시 활용

#### 현재 흐름
```
Agent 실행 → System Prompt 생성 → AI 호출 → 콘텐츠 생성
```

#### 개선된 흐름
```
Agent 실행 → brandContext 로드 → System Prompt에 주입 → AI 호출 → 콘텐츠 생성
```

#### System Prompt 주입 예시
```
[기존 System Prompt]
You are a social media content creator...

[Brand Context 주입]
## Brand Guidelines
- Brand Name: Heritage Water
- Mission: Premium mineral water from natural springs
- Target Audience: 25-45 health-conscious consumers
- Voice Tone: Professional, Trustworthy
- Writing Style: Clean and concise

## Content Rules
✅ DO:
- Use active voice
- Mention sustainability
- Focus on: Summer hydration campaign

❌ DON'T:
- Use slang
- Make health claims

## Keywords to Include:
hydration, wellness, nature

[/Brand Context]

Now create content for the following topic...
```

---

## 5. 구현 계획

### Phase 1: 수동 동기화 구현 (우선순위 높음) ✅ COMPLETE
- [x] `syncWithHiveMind()` 함수 수정
- [x] Brand Brain 데이터 수집 로직 (`buildBrandContext()`)
- [x] Agent Team 일괄 업데이트 로직 (Batch Write)
- [x] UI 피드백 개선 (스피너, 팀 수 표시)

### Phase 2: Agent에서 brandContext 활용 ✅ COMPLETE
- [x] Agent 실행 시 brandContext 로드 (`executeRun()`)
- [x] System Prompt 생성기에 Brand Context 섹션 추가 (`_buildSystemPromptWithBrandContext()`)
- [x] 실행 로그에 brand_context_applied 플래그 추가

### Phase 3: 자동 동기화 (선택적) ✅ COMPLETE
- [x] Cloud Function 작성 (`scheduledBrandSync`) - 매일 00:00 KST 실행
- [x] `triggerBrandSync` callable function 추가 (수동 트리거용)
- [x] 동기화 로그 저장 (`systemLogs` 컬렉션)

---

## 6. 예상 질문 (FAQ)

**Q1: Agent Team마다 다른 브랜드 설정을 하고 싶으면?**
> A: Brand Brain은 프로젝트 공통 설정입니다. 채널별 세부 조정은 Agent Team 설정에서 override 가능하도록 추후 확장할 수 있습니다.

**Q2: 동기화 후 이전 콘텐츠는 어떻게 되나요?**
> A: 이미 생성된 콘텐츠는 영향받지 않습니다. 동기화 이후 새로 생성되는 콘텐츠부터 적용됩니다.

**Q3: 특정 Agent Team만 동기화에서 제외하려면?**
> A: 추후 Agent Team 설정에 `excludeFromBrandSync: true` 옵션을 추가할 수 있습니다.

---

## 7. 성공 지표

| 지표 | 목표 |
|------|------|
| 동기화 성공률 | 99.9% |
| 동기화 시간 | < 3초 (Agent Team 10개 기준) |
| 브랜드 일관성 점수 | 생성된 콘텐츠의 브랜드 가이드 준수율 90%+ |

---

## 8. 다음 단계

1. **이 문서 리뷰 및 승인**
2. **Phase 1 구현 착수**
3. **테스트 및 QA**
4. **Phase 2, 3 순차 진행**

---

*문서 끝*
