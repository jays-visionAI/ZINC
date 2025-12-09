# 📊 Knowledge Pipeline - Database & Data Transfer Spec

> **문서 작성일**: 2024-12-09
> **상태**: Technical Specification
> **버전**: v1.0

---

## 📋 개요

이 문서는 Knowledge Hub → Strategy War Room → Hive Mind Studio 간의:
- **데이터베이스 설계**
- **데이터 전송 프로시저**
- **Admin 모니터링**

을 정의합니다.

---

## 🗃️ Firestore 데이터베이스 설계

### 전체 컬렉션 구조

```
firestore/
│
├── projects/{projectId}/                    # 프로젝트 루트
│   ├── knowledgeSources/                    # Knowledge Hub 소스
│   ├── foundationalData/                    # 기초 데이터 (generated)
│   ├── strategies/                          # 전략 (War Room)
│   ├── executionPlans/                      # 실행 계획
│   └── studioSessions/                      # Hive Mind 세션
│
├── communityActivities/{activityId}         # 커뮤니티 베스트 프랙티스
│
└── admin/
    └── pipelineMonitor/                     # Admin 모니터링
        ├── dailyStats
        └── processingQueue
```

---

## 1️⃣ LAYER 1: Knowledge Hub 데이터

### 1.1 knowledgeSources (소스 저장)

```javascript
// Collection: projects/{projectId}/knowledgeSources/{sourceId}
{
  // === Identity ===
  id: "ks_001",
  projectId: "proj_001",
  userId: "user_001",
  
  // === Source Type ===
  sourceType: "google_drive" | "link" | "note" | "discovery",
  
  // === Common Fields ===
  title: "회사소개서_2024.pptx",
  description: "회사 역사, 비전, 주요 제품 정보",
  
  // === Processing Status ===
  status: "pending" | "analyzing" | "completed" | "failed",
  progress: 75,  // 0-100
  
  // === Type-Specific Data ===
  googleDrive: {
    fileId: "1abc...",
    fileUrl: "https://drive.google.com/...",
    mimeType: "application/vnd.ms-powerpoint",
    fileSize: 15000000,
    thumbnailUrl: "https://..."
  },
  // OR
  link: {
    url: "https://company.com/about",
    favicon: "https://company.com/favicon.ico",
    ogTitle: "회사 소개",
    ogImage: "https://..."
  },
  // OR
  note: {
    content: "신제품 3종 출시 예정. 1월 15일..."
  },
  // OR
  discovery: {
    searchQuery: "클린뷰티 시장 동향",
    sourceUrl: "https://news.com/article",
    discoveredBy: "AI"
  },
  
  // === AI Analysis Results ===
  analysis: {
    summary: "15페이지 분량의 프레젠테이션. 회사 역사 (2015년 설립)...",
    keyInsights: [
      "100% 비건 인증 획득",
      "친환경 패키징 도입",
      "연매출 100억 원 달성"
    ],
    extractedEntities: {
      companyName: "OO화장품",
      foundedYear: 2015,
      products: ["클린 에센스", "비건 토너"],
      values: ["친환경", "투명성"]
    },
    tags: ["회사소개", "비전", "제품"],
    analyzedAt: Timestamp,
    aiModel: "gpt-4-turbo"
  },
  
  // === Timestamps ===
  createdAt: Timestamp,
  updatedAt: Timestamp,
  analyzedAt: Timestamp
}
```

---

### 1.2 foundationalData (기초 데이터 - Generated)

> **이 데이터가 Strategy War Room으로 전달됩니다**

```javascript
// Document: projects/{projectId}/foundationalData/latest
{
  // === Generation Meta ===
  version: 3,  // 버전 관리
  generatedAt: Timestamp,
  basedOnSources: ["ks_001", "ks_002", "ks_003"],  // 어떤 소스 기반인지
  
  // === Brand Profile ===
  brandProfile: {
    companyName: "OO화장품",
    founded: 2015,
    industry: "cosmetics",
    subIndustry: "clean_beauty",
    mission: "자연 성분으로 아름다움을 추구하는 클린뷰티 브랜드",
    vision: "지속가능한 미래를 위한 뷰티 혁신",
    coreValues: ["친환경", "투명성", "혁신"],
    differentiators: [
      "100% 비건 인증",
      "재활용 가능 패키징",
      "전 성분 공개 정책"
    ],
    keyFacts: {
      employees: 50,
      annualRevenue: "100억",
      certifications: ["비건 인증", "크루얼티프리"]
    }
  },
  
  // === Product/Service Map ===
  productMap: [
    {
      name: "클린 에센스",
      category: "스킨케어",
      subCategory: "에센스",
      priceRange: "mid",
      differentiator: "비건 인증 + 무향료",
      targetDemographic: "25-35세 여성"
    },
    {
      name: "비건 토너",
      category: "스킨케어",
      subCategory: "토너",
      priceRange: "mid",
      differentiator: "저자극 민감성 피부용"
    }
  ],
  
  // === Target Audience Profile ===
  targetAudience: {
    primary: {
      demographic: "25-35세 여성",
      psychographic: "환경에 관심 있고, 제품 성분을 중시하는 소비자",
      interests: ["환경", "비건", "클린뷰티", "지속가능성"],
      painPoints: ["성분 불투명", "동물실험", "과대광고"],
      channels: ["Instagram", "YouTube"]
    },
    secondary: {
      demographic: "35-45세 여성",
      psychographic: "프리미엄 스킨케어를 찾는 소비자"
    }
  },
  
  // === Competitor Analysis ===
  competitors: [
    {
      name: "경쟁사 A",
      positioning: "가격 리더",
      strengths: ["가격 경쟁력", "유통망"],
      weaknesses: ["브랜딩 약함", "차별화 부족"],
      recentMoves: "ESG 캠페인 시작 (2024-01)"
    },
    {
      name: "경쟁사 B",
      positioning: "프리미엄",
      strengths: ["브랜드 이미지", "인플루언서 마케팅"],
      weaknesses: ["높은 가격", "접근성"]
    }
  ],
  
  // === Market Context ===
  marketContext: {
    trends: [
      { name: "클린뷰티", momentum: "+340%", source: "Market Pulse" },
      { name: "ESG 마케팅", momentum: "+120%" }
    ],
    opportunities: [
      "MZ세대 친환경 소비 증가",
      "비건 뷰티 시장 확대"
    ],
    threats: [
      "대기업 클린뷰티 진출",
      "원자재 가격 상승"
    ],
    regulations: [
      "화장품 성분 표시법 강화 예정"
    ]
  },
  
  // === Brand Voice (Draft) ===
  brandVoice: {
    personality: ["전문적", "친근함", "신뢰감"],
    tone: "semi-formal",
    doList: ["과학적 근거 언급", "환경 가치 강조"],
    dontList: ["경쟁사 직접 비교", "과장된 효과 주장"],
    samplePhrases: [
      "자연이 선물한 성분, 그 순수함을 담았습니다 🌿",
      "민감한 피부도 안심하고 사용하세요"
    ],
    derivedFrom: ["ks_002"]  // 브랜드 가이드에서 추출
  },
  
  // === Transfer Status ===
  transferredToWarRoom: true,
  transferredAt: Timestamp
}
```

---

## 2️⃣ LAYER 2: Strategy War Room 데이터

### 2.1 brandIndicators (6가지 브랜드 지표)

```javascript
// Document: projects/{projectId}/brandIndicators/current
{
  projectId: "proj_001",
  
  // === 6 Brand Value Indicators ===
  indicators: {
    awareness: {
      score: 78,
      change: +5,  // vs last week
      trend: "up",
      metrics: {
        mentions: 1250,
        searchVolume: 3400,
        reach: 450000
      }
    },
    perception: {
      score: 82,
      change: +2,
      trend: "up",
      metrics: {
        sentimentScore: 0.78,  // -1 to 1
        avgReviewRating: 4.5,
        nps: 42
      }
    },
    engagement: {
      score: 65,
      change: -3,
      trend: "down",  // ⚠️ Alert trigger
      metrics: {
        avgLikes: 234,
        avgComments: 18,
        avgShares: 12,
        ctr: 2.3
      }
    },
    loyalty: {
      score: 71,
      change: +1,
      trend: "stable",
      metrics: {
        followerRetention: 94,
        repeatVisitors: 38,
        communityGrowth: 2.1
      }
    },
    differentiation: {
      score: 85,
      change: 0,
      trend: "stable",
      metrics: {
        uniquePositioning: 0.85,
        competitorGap: 12
      }
    },
    consistency: {
      score: 88,
      change: +4,
      trend: "up",
      metrics: {
        messageAlignment: 0.92,
        visualConsistency: 0.88,
        channelHarmony: 0.85
      }
    }
  },
  
  // === Alerts ===
  alerts: [
    {
      indicator: "engagement",
      severity: "warning",
      message: "Engagement 지표 3주 연속 하락",
      triggeredAt: Timestamp
    }
  ],
  
  // === Data Sources ===
  dataSources: {
    foundationalData: "projects/proj_001/foundationalData/latest",
    marketPulse: "projects/proj_001/marketPulse/latest",
    socialMetrics: "External API"
  },
  
  updatedAt: Timestamp
}
```

---

### 2.2 strategies (AI 추천 전략)

```javascript
// Collection: projects/{projectId}/strategies/{strategyId}
{
  id: "strat_001",
  projectId: "proj_001",
  
  // === Strategy Meta ===
  type: "ai_recommended" | "custom" | "community",
  priority: "high" | "medium" | "low",
  status: "draft" | "approved" | "executing" | "completed" | "archived",
  
  // === Strategy Content ===
  title: "Engagement 회복 캠페인",
  objective: "Engagement 지표 +15% 달성",
  
  // === Problem/Opportunity ===
  context: {
    trigger: "engagement_decline",  // 어떤 이벤트가 이 전략을 트리거했는지
    problem: "Engagement 지표 3주 연속 하락",
    rootCause: "Instagram 알고리즘 변화로 Static 포스트 도달률 감소",
    opportunity: null
  },
  
  // === Recommendation ===
  recommendation: {
    summary: "Reels 콘텐츠 비율을 60%로 증가하고 UGC 캠페인을 시작",
    actions: [
      {
        action: "Reels 콘텐츠 비율 30% → 60% 증가",
        rationale: "Reels의 도달률이 Static 대비 3배",
        effort: "medium",
        impact: "high"
      },
      {
        action: "고객 UGC 리포스팅 캠페인",
        rationale: "Engagement 부스트 + 신뢰도 향상",
        effort: "low",
        impact: "medium"
      }
    ],
    expectedOutcome: "Engagement +15% (4주 내)",
    timeframe: "4 weeks"
  },
  
  // === AI Generation Info ===
  aiGenerated: {
    model: "gpt-4-turbo",
    basedOn: {
      foundationalData: "projects/proj_001/foundationalData/latest",
      brandIndicators: "projects/proj_001/brandIndicators/current",
      marketTrends: ["클린뷰티 +340%"]
    },
    confidence: 0.85,
    generatedAt: Timestamp
  },
  
  // === User Interaction ===
  userFeedback: {
    approved: true,
    approvedBy: "user_001",
    approvedAt: Timestamp,
    modifications: [
      "인플루언서 콜라보 추가"
    ]
  },
  
  // === Linked Execution Plan ===
  executionPlanId: "ep_001",  // 승인 후 생성
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

### 2.3 executionPlans (실행 계획)

> **이 데이터가 Hive Mind Studio로 전달됩니다**

```javascript
// Collection: projects/{projectId}/executionPlans/{planId}
{
  id: "ep_001",
  projectId: "proj_001",
  strategyId: "strat_001",  // 연결된 전략
  
  // === Plan Meta ===
  title: "Engagement 회복 캠페인 실행 계획",
  status: "draft" | "scheduled" | "in_progress" | "completed",
  
  // === Timeline ===
  timeline: {
    startDate: "2024-01-15",
    endDate: "2024-02-15",
    totalWeeks: 4
  },
  
  // === Weekly Breakdown ===
  weeks: [
    {
      weekNumber: 1,
      theme: "Reels 콘텐츠 강화",
      startDate: "2024-01-15",
      endDate: "2024-01-21",
      
      // === Tasks for Hive Mind Studio ===
      tasks: [
        {
          id: "task_001",
          type: "content_creation",
          title: "Behind the Scene Reels 제작",
          description: "제품 제조 과정 비하인드씬 영상",
          channel: "instagram",
          contentType: "reels",
          quantity: 2,
          
          // === Hive Mind Assignment ===
          assignedToStudio: true,
          studioSessionId: "ss_001",  // 생성된 세션 ID
          
          // === Progress ===
          status: "pending" | "in_production" | "review" | "approved" | "published",
          
          // === Content Requirements ===
          requirements: {
            brandVoice: "friendly, authentic",
            keyMessages: ["비건 인증", "제조 과정 투명성"],
            hashtags: ["#클린뷰티", "#비하인드씬"],
            callToAction: "프로필 링크에서 더 알아보세요"
          }
        },
        {
          id: "task_002",
          type: "content_creation",
          title: "제품 사용법 Reels",
          channel: "instagram",
          contentType: "reels",
          quantity: 3,
          assignedToStudio: true,
          studioSessionId: "ss_002"
        }
      ],
      
      // === Week KPIs ===
      kpis: {
        targetReelsCount: 5,
        targetReach: 50000,
        targetEngagement: "+5%"
      }
    },
    {
      weekNumber: 2,
      theme: "UGC 캠페인 런칭",
      // ... similar structure
    }
  ],
  
  // === Transfer Status to Studio ===
  studioTransfer: {
    transferred: true,
    transferredAt: Timestamp,
    sessions: ["ss_001", "ss_002", "ss_003"]
  },
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 3️⃣ LAYER 3: Hive Mind Studio 데이터

### 3.1 studioSessions (스튜디오 세션)

```javascript
// Collection: projects/{projectId}/studioSessions/{sessionId}
{
  id: "ss_001",
  projectId: "proj_001",
  
  // === Source ===
  source: {
    type: "execution_plan",
    executionPlanId: "ep_001",
    taskId: "task_001"
  },
  
  // === Session Info ===
  title: "Behind the Scene Reels 제작",
  channel: "instagram",
  contentType: "reels",
  
  // === Injected Context (from Knowledge Hub & War Room) ===
  context: {
    // From foundationalData
    brandProfile: { /* snapshot */ },
    brandVoice: { /* snapshot */ },
    productInfo: { /* relevant products */ },
    
    // From strategy
    campaignContext: {
      name: "Engagement 회복 캠페인",
      objective: "Engagement +15%",
      keyMessages: ["비건 인증", "제조 과정 투명성"]
    },
    
    // Task-specific
    requirements: {
      hashtags: ["#클린뷰티", "#비하인드씬"],
      callToAction: "프로필 링크에서 더 알아보세요"
    }
  },
  
  // === Agent Execution ===
  agentPipeline: {
    workflow: "social_content_creation",
    agents: ["planner", "copywriter", "designer", "reviewer"],
    status: "queued" | "running" | "completed" | "failed",
    currentAgent: "copywriter",
    progress: 50
  },
  
  // === Generated Content ===
  outputs: [
    {
      id: "output_001",
      contentType: "reels_script",
      content: "...",
      generatedBy: "copywriter_agent",
      version: 1
    },
    {
      id: "output_002",
      contentType: "thumbnail",
      fileUrl: "https://storage.../thumbnail.png",
      generatedBy: "designer_agent"
    }
  ],
  
  // === Review ===
  review: {
    status: "pending" | "approved" | "rejected" | "revision_needed",
    reviewedBy: "user_001",
    feedback: "좋아요, 하지만 음악 변경 필요",
    reviewedAt: Timestamp
  },
  
  // === Publishing ===
  publishing: {
    scheduled: true,
    scheduledFor: Timestamp,
    publishedAt: null,
    platformPostId: null
  },
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🔄 데이터 전송 프로시저 (Procedures)

### Procedure 1: Knowledge Hub → Foundational Data 생성

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROCEDURE: GenerateFoundationalData                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER:                                                                   │
│  • 새 소스 분석 완료 (knowledgeSources.status == "completed")               │
│  • 사용자가 "Refresh Insights" 클릭                                         │
│  • 24시간마다 자동 (새 소스가 있는 경우)                                    │
│                                                                             │
│  PROCESS:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. 모든 완료된 소스 수집                                           │   │
│  │     SELECT * FROM knowledgeSources WHERE status == "completed"       │   │
│  │                                                                      │   │
│  │  2. AI 통합 분석 수행 (Cloud Function)                               │   │
│  │     - 모든 소스의 analysis.keyInsights 통합                          │   │
│  │     - 브랜드 프로필 생성                                             │   │
│  │     - 제품 맵 생성                                                   │   │
│  │     - 타겟 고객 프로필 도출                                          │   │
│  │     - 경쟁사 분석 통합                                               │   │
│  │                                                                      │   │
│  │  3. foundationalData 저장                                            │   │
│  │     SET foundationalData/latest = { ... }                            │   │
│  │     version++                                                        │   │
│  │                                                                      │   │
│  │  4. War Room 알림                                                    │   │
│  │     NOTIFY "New foundational data available"                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OUTPUT:                                                                    │
│  • foundationalData/latest 문서 업데이트                                    │
│  • transferredToWarRoom = true                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Procedure 2: Foundational Data → Strategy War Room

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROCEDURE: GenerateStrategyRecommendations                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER:                                                                   │
│  • foundationalData 업데이트                                                │
│  • brandIndicators에서 Alert 발생                                           │
│  • Market Pulse에서 새 트렌드 감지                                          │
│  • 사용자가 "Get AI Recommendations" 클릭                                   │
│                                                                             │
│  INPUT:                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  const inputs = {                                                   │   │
│  │    foundationalData: await getDoc("foundationalData/latest"),       │   │
│  │    brandIndicators: await getDoc("brandIndicators/current"),        │   │
│  │    marketTrends: await getMarketPulseData(),                        │   │
│  │    communityBestPractices: await getCommunityActivities()           │   │
│  │  };                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PROCESS:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. 문제/기회 식별                                                  │   │
│  │     - brandIndicators에서 하락 지표 찾기                            │   │
│  │     - marketTrends에서 관련 기회 찾기                               │   │
│  │                                                                      │   │
│  │  2. AI 전략 생성 (Cloud Function)                                   │   │
│  │     const strategies = await generateStrategies(inputs);             │   │
│  │                                                                      │   │
│  │  3. 전략 저장                                                        │   │
│  │     for (strategy of strategies) {                                   │   │
│  │       await addDoc("strategies", {                                   │   │
│  │         ...strategy,                                                 │   │
│  │         status: "draft",                                             │   │
│  │         aiGenerated: { basedOn: inputs }                            │   │
│  │       });                                                            │   │
│  │     }                                                                │   │
│  │                                                                      │   │
│  │  4. 사용자 알림                                                      │   │
│  │     PUSH_NOTIFICATION "3 new strategies available"                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OUTPUT:                                                                    │
│  • strategies 컬렉션에 새 문서들                                            │
│  • status = "draft" (사용자 승인 대기)                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Procedure 3: Strategy → Execution Plan 생성

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROCEDURE: CreateExecutionPlan                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER:                                                                   │
│  • 사용자가 Strategy를 "Approve" 클릭                                       │
│                                                                             │
│  PROCESS:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. 전략 상태 업데이트                                              │   │
│  │     UPDATE strategies/{id} SET status = "approved"                   │   │
│  │                                                                      │   │
│  │  2. AI 실행 계획 생성 (Cloud Function)                               │   │
│  │     const plan = await generateExecutionPlan({                       │   │
│  │       strategy: strategy,                                            │   │
│  │       foundationalData: foundationalData,                            │   │
│  │       calendar: getProjectCalendar()                                 │   │
│  │     });                                                              │   │
│  │                                                                      │   │
│  │  3. 실행 계획 저장                                                   │   │
│  │     await addDoc("executionPlans", {                                 │   │
│  │       ...plan,                                                       │   │
│  │       strategyId: strategy.id,                                       │   │
│  │       status: "draft"                                                │   │
│  │     });                                                              │   │
│  │                                                                      │   │
│  │  4. 전략과 연결                                                      │   │
│  │     UPDATE strategies/{id} SET executionPlanId = plan.id             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OUTPUT:                                                                    │
│  • executionPlans에 새 문서                                                 │
│  • 주별 태스크 자동 생성                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Procedure 4: Execution Plan → Hive Mind Studio

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROCEDURE: TransferToStudio                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER:                                                                   │
│  • 사용자가 Execution Plan을 "Send to Studio" 클릭                          │
│  • 스케줄된 시작일 도달                                                     │
│                                                                             │
│  PROCESS:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. 실행 계획의 태스크 추출                                         │   │
│  │     const tasks = plan.weeks.flatMap(w => w.tasks);                  │   │
│  │                                                                      │   │
│  │  2. 각 태스크에 대해 Studio 세션 생성                                │   │
│  │     for (task of tasks) {                                            │   │
│  │       // Context 스냅샷 생성                                         │   │
│  │       const context = {                                              │   │
│  │         brandProfile: foundationalData.brandProfile,                 │   │
│  │         brandVoice: foundationalData.brandVoice,                     │   │
│  │         campaignContext: {                                           │   │
│  │           name: strategy.title,                                      │   │
│  │           objective: strategy.objective                              │   │
│  │         },                                                           │   │
│  │         requirements: task.requirements                              │   │
│  │       };                                                             │   │
│  │                                                                      │   │
│  │       // Studio 세션 생성                                            │   │
│  │       const session = await addDoc("studioSessions", {               │   │
│  │         source: { executionPlanId, taskId },                         │   │
│  │         context: context,                                            │   │
│  │         agentPipeline: { status: "queued" }                          │   │
│  │       });                                                            │   │
│  │                                                                      │   │
│  │       // 태스크에 세션 연결                                          │   │
│  │       task.studioSessionId = session.id;                             │   │
│  │     }                                                                │   │
│  │                                                                      │   │
│  │  3. 실행 계획 상태 업데이트                                          │   │
│  │     UPDATE executionPlans/{id} SET                                   │   │
│  │       status = "in_progress",                                        │   │
│  │       studioTransfer = { transferred: true, sessions: [...] }        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  OUTPUT:                                                                    │
│  • studioSessions에 새 문서들 (각 태스크당 1개)                             │
│  • 각 세션에 context 스냅샷 포함 (Knowledge Hub 데이터)                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Admin 모니터링

### Admin Pipeline Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔧 Admin > Pipeline Monitor                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📊 Pipeline Health                                                  │   │
│  │                                                                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │ KH Sources │  │ FD Gen     │  │ Strategies │  │ Studio     │    │   │
│  │  │     156    │  │     89     │  │     234    │  │     412    │    │   │
│  │  │  ✅ 142    │  │  ✅ 85     │  │  ✅ 198    │  │  ✅ 356    │    │   │
│  │  │  🔄 12     │  │  🔄 4      │  │  🔄 24     │  │  🔄 42     │    │   │
│  │  │  ❌ 2      │  │  ❌ 0      │  │  ❌ 12     │  │  ❌ 14     │    │   │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📋 Processing Queue                                                 │   │
│  │                                                                      │   │
│  │  ID            Type                Status      Started    Duration   │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  proc_001      Source Analysis     🔄 Running   10:23:15   5m 23s   │   │
│  │  proc_002      FD Generation       🔄 Running   10:25:01   3m 37s   │   │
│  │  proc_003      Strategy Gen        ⏳ Queued    -          -        │   │
│  │  proc_004      Studio Transfer     ⏳ Queued    -          -        │   │
│  │                                                                      │   │
│  │  [View All]  [Retry Failed]  [Clear Queue]                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔍 Data Flow Trace                                                  │   │
│  │                                                                      │   │
│  │  Project: OO화장품 (proj_001)                                        │   │
│  │                                                                      │   │
│  │  Knowledge Hub                Strategy War Room        Hive Mind    │   │
│  │  ──────────────                ──────────────────       ─────────   │   │
│  │  📄 5 sources         →        📊 FD v3           →    ────┐       │   │
│  │  ✅ All analyzed              ✅ Generated              │         │   │
│  │                                      │                   │         │   │
│  │                               🎯 3 strategies     →     │         │   │
│  │                               ✅ 2 approved             │         │   │
│  │                                      │                   │         │   │
│  │                               📋 1 exec plan      →     │         │   │
│  │                               ✅ Transferred            │         │   │
│  │                                                          ▼         │   │
│  │                                                    🐝 4 sessions   │   │
│  │                                                    ✅ 2 completed  │   │
│  │                                                    🔄 2 running    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Firestore: Admin Monitoring Collection

```javascript
// Collection: admin/pipelineMonitor/dailyStats/{date}
{
  date: "2024-01-15",
  
  // Layer 1: Knowledge Hub
  knowledgeHub: {
    sourcesCreated: 23,
    sourcesAnalyzed: 21,
    sourcesFailed: 2,
    avgAnalysisTime: 45000,  // ms
    foundationalDataGenerated: 12
  },
  
  // Layer 2: Strategy War Room
  strategyWarRoom: {
    strategiesGenerated: 18,
    strategiesApproved: 12,
    strategiesRejected: 3,
    executionPlansCreated: 8
  },
  
  // Layer 3: Hive Mind Studio
  hiveMindStudio: {
    sessionsCreated: 34,
    sessionsCompleted: 28,
    sessionsFailed: 2,
    avgSessionDuration: 120000,  // ms
    contentsGenerated: 56,
    contentsApproved: 48
  },
  
  // Errors
  errors: [
    {
      type: "source_analysis_failed",
      projectId: "proj_001",
      sourceId: "ks_005",
      error: "File too large",
      timestamp: Timestamp
    }
  ]
}

// Document: admin/pipelineMonitor/processingQueue
{
  queue: [
    {
      id: "proc_001",
      type: "source_analysis",
      projectId: "proj_001",
      resourceId: "ks_006",
      status: "running",
      startedAt: Timestamp,
      progress: 45
    }
  ],
  
  updatedAt: Timestamp
}
```

---

## 📅 구현 우선순위

| Phase | 작업 | DB Collection | Procedure |
|-------|------|---------------|-----------|
| 1 | Knowledge Sources CRUD | knowledgeSources | - |
| 2 | Source Analysis (AI) | knowledgeSources.analysis | Source Analysis |
| 3 | Foundational Data Gen | foundationalData | GenerateFoundationalData |
| 4 | Brand Indicators | brandIndicators | - |
| 5 | Strategy Generation | strategies | GenerateStrategyRecommendations |
| 6 | Execution Plans | executionPlans | CreateExecutionPlan |
| 7 | Studio Transfer | studioSessions | TransferToStudio |
| 8 | Admin Monitor | admin/pipelineMonitor | - |

---

## ✅ 체크리스트

- [ ] Firestore Collections 생성
- [ ] Security Rules 업데이트
- [ ] Cloud Functions 개발
  - [ ] analyzeSource()
  - [ ] generateFoundationalData()
  - [ ] generateStrategies()
  - [ ] createExecutionPlan()
  - [ ] transferToStudio()
- [ ] Admin Pipeline Monitor UI
- [ ] Real-time 상태 업데이트 (onSnapshot)

---

> **이 스펙을 검토하신 후 승인해 주시면 구현을 시작하겠습니다.**
