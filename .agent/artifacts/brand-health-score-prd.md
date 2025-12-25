# Brand Health Score System
## 종합 기획서 v2.0

---

## 📋 목차

1. [Executive Summary](#1-executive-summary)
2. [점수 체계 개요](#2-점수-체계-개요)
3. [사용자 여정 및 데이터 플로우](#3-사용자-여정-및-데이터-플로우)
4. [카테고리별 점수 기준 및 Alert 시스템](#4-카테고리별-점수-기준-및-alert-시스템)
5. [UI/UX 설계](#5-uiux-설계)
6. [Firestore 스키마](#6-firestore-스키마)
7. [구현 명세](#7-구현-명세)
8. [구현 로드맵](#8-구현-로드맵)

---

## 1. Executive Summary

### 1.1 개요

**Brand Health Score**는 ZYNK 플랫폼에서 브랜드 관리 상태를 **100점 만점**으로 측정하는 종합 지표입니다.

### 1.2 핵심 목표

| 목표 | 설명 |
|------|------|
| **측정** | 브랜드 정보 완성도를 객관적으로 수치화 |
| **가이드** | 부족한 항목을 명확히 알려주고 개선 방향 제시 |
| **액션** | 원클릭으로 필요한 정보 입력 화면으로 이동 |
| **추적** | 시간에 따른 브랜드 헬스 변화 모니터링 |

### 1.3 핵심 원칙

```
🎯 "점수가 0이면, 즉시 알려주고, 바로 고칠 수 있게 한다"
```

- ❌ **0점 항목** → 🔴 빨간색 Alert + 즉시 액션 버튼
- ⚠️ **미달 항목** → 🟡 경고 표시 + 개선 가이드
- ✅ **완료 항목** → 🟢 초록색 체크 + 완료 표시

---

## 2. 점수 체계 개요

### 2.1 총점 구조 (100점 만점)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BRAND HEALTH SCORE                            │
│                         ┌─────┐                                  │
│                         │ 75  │ / 100                            │
│                         └─────┘                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │IDENTITY │ │ KNOW.   │ │ STRAT.  │ │ UPDATE  │ │  QUAL.  │   │
│  │  20/25  │ │  15/25  │ │  20/25  │ │  10/15  │ │  10/10  │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 카테고리별 배점

| 카테고리 | 약어 | 배점 | 설명 | 주요 측정 항목 |
|---------|------|------|------|---------------|
| **Identity** | IDENTITY | 25점 | Core Identity 완성도 | 프로젝트명, 미션, 타겟, 웹사이트 |
| **Knowledge** | KNOW. | 25점 | 지식 자산 풍부도 | 링크, 문서, 노트, Google Drive |
| **Strategy** | STRAT. | 25점 | 전략 설정 완성도 | 브랜드 보이스, 키워드, Do's/Don'ts |
| **Update** | UPDATE | 15점 | 최신성 및 업데이트 빈도 | 주간 체크인, 동기화, 신선도 |
| **Quality** | QUAL. | 10점 | 콘텐츠 품질 피드백 | 승인율, 피드백, Agent 커스터마이징 |

### 2.3 점수 등급

| 점수 | 등급 | 색상 | 상태 | UI 표시 |
|------|------|------|------|---------|
| 90-100 | S | 🟢 #22C55E | Excellent | 완벽한 브랜드 관리 🎉 |
| 75-89 | A | 🟢 #10B981 | Good | 대부분 완료 ✓ |
| 60-74 | B | 🟡 #F59E0B | Average | 개선 필요 ⚠️ |
| 40-59 | C | 🟠 #F97316 | Below Average | 주의 필요 ⚠️ |
| 0-39 | D | 🔴 #EF4444 | Poor | 즉시 개선 필요 🚨 |

---

## 3. 사용자 여정 및 데이터 플로우

### 3.1 전체 사용자 여정

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: 프로젝트 생성 (Command Center)                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                       │
│  📝 Project Wizard (4-Step)                                                  │
│     ├─ Step 1: Business Info (Name, Description, Industry)                  │
│     ├─ Step 2: Assets Upload                                                │
│     ├─ Step 3: Template Selection                                           │
│     └─ Step 4: Channel Config                                               │
│              │                                                               │
│              ▼                                                               │
│  STEP 2: Brand Brain 자동 연동                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                              │
│  🧠 Core Identity 자동 생성                                                  │
│     └─ mapProjectToBrandBrain() 함수가 데이터 매핑                           │
│              │                                                               │
│              ▼                                                               │
│  STEP 3: Brand Health Score 계산                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                           │
│  📊 calculateHealthScore() 실행                                              │
│     ├─ 5개 카테고리 점수 계산                                                │
│     ├─ 누락 항목 분석                                                        │
│     └─ Alert 생성                                                            │
│              │                                                               │
│              ▼                                                               │
│  STEP 4: Alert 표시 및 사용자 액션 유도                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                     │
│  🚨 점수 0 또는 미달 항목 발견 시:                                            │
│     ├─ 시각적 Alert 표시 (빨간색/노란색)                                     │
│     ├─ "개선하기" 버튼 표시                                                  │
│     └─ 클릭 시 → Missing Items 모달 표시                                     │
│              │                                                               │
│              ▼                                                               │
│  STEP 5: 사용자 정보 입력                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                                  │
│  ✏️ "지금 작성하기" 버튼 클릭 시:                                             │
│     ├─ 해당 필드로 자동 스크롤                                               │
│     ├─ 하이라이트 효과                                                       │
│     └─ 포커스 활성화                                                         │
│              │                                                               │
│              ▼                                                               │
│  STEP 6: 점수 업데이트                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━                                                     │
│  🔄 정보 입력 완료 시:                                                       │
│     ├─ 자동 저장 (debounce)                                                  │
│     ├─ 점수 즉시 재계산                                                      │
│     └─ UI 애니메이션으로 점수 상승 표시 🎊                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 데이터 매핑 (Project → Brand Brain)

```javascript
// Command Center에서 생성된 프로젝트 데이터
const projectData = {
    projectName: "Vision Chain",
    description: "AI 기반 마케팅 자동화",
    industry: "tech",
    targetMarkets: ["한국", "미국"],
    websiteUrl: "https://visionchain.co",
    preferredTone: "professional"
};

// Brand Brain으로 자동 매핑
const brandBrainData = {
    coreIdentity: {
        projectName: projectData.projectName,        // → Identity Score
        description: projectData.description,         // → Identity Score
        industry: projectData.industry,               // → Identity Score
        targetAudience: projectData.targetMarkets.join(', '),  // → Identity Score
        website: projectData.websiteUrl,              // → Identity Score
        websiteAnalysis: null                         // → Identity Score (분석 필요)
    },
    strategy: {
        brandVoice: {
            personality: [projectData.preferredTone], // → Strategy Score
            // ... 나머지는 사용자가 직접 입력 필요
        }
    }
};
```

---

## 4. 카테고리별 점수 기준 및 Alert 시스템

### 4.1 Identity Score (25점)

#### 4.1.1 점수 기준

| 항목 | 점수 | 획득 조건 | Alert 조건 |
|------|------|----------|-----------|
| Project Name | 5점 | 프로젝트명 입력 | 비어있으면 🔴 |
| Mission/Description | 5점 | 설명 100자 이상 | 50자 미만시 ⚠️ |
| ↳ 보너스 | +2점 | 설명 200자 이상 | - |
| Industry | 3점 | 산업 분야 선택 | 미선택시 🔴 |
| Target Audience | 5점 | 타겟 20자 이상 구체적 정의 | 비어있으면 🔴 |
| Website URL | 3점 | URL 입력 | 비어있으면 ⚠️ |
| Website Analysis | 4점 | AI 분석 완료 | 미분석시 ⚠️ |

#### 4.1.2 Alert 및 Action Mapping

| 상태 | Alert 메시지 | Action 버튼 | 동작 |
|------|-------------|-------------|------|
| 🔴 Project Name 없음 | "프로젝트명을 입력해주세요" | 📝 입력하기 | `scrollToAndFocus('project-name')` |
| 🔴 Mission 없음 | "브랜드 미션을 설명해주세요" | ✏️ 작성하기 | `scrollToAndFocus('mission')` |
| 🔴 Industry 없음 | "산업 분야를 선택해주세요" | 📂 선택하기 | `scrollToAndFocus('industry')` |
| 🔴 Target 없음 | "타겟 고객을 정의해주세요" | 👤 설정하기 | `scrollToAndFocus('target')` |
| ⚠️ Website 없음 | "웹사이트 URL을 입력해주세요" | 🌐 입력하기 | `scrollToAndFocus('website-url')` |
| ⚠️ Analysis 미완료 | "웹사이트를 분석해주세요" | 🔍 분석하기 | `triggerAutoAnalyze()` |

#### 4.1.3 점수 계산 함수

```javascript
function calculateIdentityScore(coreIdentity) {
    let score = 0;
    const missing = [];
    
    // Project Name (5점)
    if (coreIdentity.projectName?.trim()) {
        score += 5;
    } else {
        missing.push({
            field: 'project-name',
            message: '프로젝트명을 입력해주세요',
            points: 5,
            severity: 'critical', // 🔴
            action: () => scrollToAndFocus('project-name'),
            actionLabel: '📝 입력하기'
        });
    }
    
    // Description (5점 + 보너스 2점)
    const desc = coreIdentity.description || '';
    if (desc.length >= 100) {
        score += 5;
        if (desc.length >= 200) score += 2; // 보너스
    } else if (desc.length >= 50) {
        score += 3;
        missing.push({
            field: 'mission',
            message: '미션을 100자 이상 작성하면 +2점',
            points: 2,
            severity: 'warning', // ⚠️
            action: () => scrollToAndFocus('mission'),
            actionLabel: '✏️ 더 작성하기'
        });
    } else {
        if (desc.length > 0) score += 1;
        missing.push({
            field: 'mission',
            message: '브랜드 미션을 설명해주세요 (50자 이상)',
            points: 5,
            severity: 'critical',
            action: () => scrollToAndFocus('mission'),
            actionLabel: '✏️ 작성하기'
        });
    }
    
    // Industry (3점)
    if (coreIdentity.industry) {
        score += 3;
    } else {
        missing.push({
            field: 'industry',
            message: '산업 분야를 선택해주세요',
            points: 3,
            severity: 'critical',
            action: () => scrollToAndFocus('industry'),
            actionLabel: '📂 선택하기'
        });
    }
    
    // Target Audience (5점)
    const target = coreIdentity.targetAudience || '';
    if (target.length >= 20) {
        score += 5;
    } else if (target.length > 0) {
        score += 2;
        missing.push({
            field: 'target',
            message: '타겟 고객을 더 구체적으로 정의해주세요',
            points: 3,
            severity: 'warning',
            action: () => scrollToAndFocus('target'),
            actionLabel: '👤 상세 설정'
        });
    } else {
        missing.push({
            field: 'target',
            message: '타겟 고객을 정의해주세요',
            points: 5,
            severity: 'critical',
            action: () => scrollToAndFocus('target'),
            actionLabel: '👤 설정하기'
        });
    }
    
    // Website (3점)
    if (coreIdentity.website?.trim()) {
        score += 3;
    } else {
        missing.push({
            field: 'website-url',
            message: '웹사이트 URL을 입력해주세요',
            points: 3,
            severity: 'warning',
            action: () => scrollToAndFocus('website-url'),
            actionLabel: '🌐 입력하기'
        });
    }
    
    // Website Analysis (4점)
    if (coreIdentity.websiteAnalysis?.pageCount > 0) {
        score += 4;
    } else if (coreIdentity.website) {
        missing.push({
            field: 'btn-auto-analyze',
            message: '웹사이트를 분석해주세요',
            points: 4,
            severity: 'warning',
            action: () => document.getElementById('btn-auto-analyze')?.click(),
            actionLabel: '🔍 분석하기'
        });
    }
    
    return { score: Math.min(score, 25), missing };
}
```

---

### 4.2 Knowledge Score (25점)

#### 4.2.1 점수 기준

| 항목 | 점수 | 획득 조건 | Alert 조건 |
|------|------|----------|-----------|
| Links | 5점 | 1개=1점, 최대 5점 | 0개면 ⚠️ |
| Documents | 8점 | 1개=2점, 최대 8점 | 0개면 ⚠️ |
| Notes | 4점 | 1개=1점, 최대 4점 | 0개면 ⚠️ |
| Google Drive 연동 | 2점 | 연동 완료 | 미연동시 ⚠️ |
| Google Drive 파일 | 3점 | 5개 이상 | - |
| Knowledge Hub 활용 | 3점 | "Use in Studio" 사용 | 미사용시 ⚠️ |

#### 4.2.2 Alert 및 Action Mapping

| 상태 | Alert 메시지 | Action 버튼 | 동작 |
|------|-------------|-------------|------|
| 0 Links | "참조 링크를 추가해주세요" | 🔗 링크 추가 | KB 섹션 스크롤 + Link 탭 |
| 0 Documents | "브랜드 자료를 업로드해주세요" | 📄 업로드 | KB 섹션 스크롤 + Doc 탭 |
| 0 Notes | "브랜드 메모를 작성해주세요" | 📝 메모 추가 | KB 섹션 스크롤 + Note 탭 |
| Drive 미연동 | "Google Drive를 연결해주세요" | 📁 연결하기 | `connectGoogleDrive()` |
| Hub 미활용 | "Knowledge Hub를 활용해주세요" | 🧠 허브 가기 | `knowledgeHub.html` 이동 |

---

### 4.3 Strategy Score (25점)

#### 4.3.1 점수 기준

| 항목 | 점수 | 획득 조건 | Alert 조건 |
|------|------|----------|-----------|
| Brand Voice Tags | 6점 | 2개=4점, 3개+=6점 | 0개면 🔴 |
| Writing Style | 4점 | 50자 이상 | 비어있으면 ⚠️ |
| Focus Topic | 4점 | 주제 설정 | 비어있으면 ⚠️ |
| Keywords | 4점 | 3개=3점, 5개+=4점 | 0개면 ⚠️ |
| Do's | 3점 | 2개 이상 | 0개면 ⚠️ |
| Don'ts | 2점 | 2개 이상 | 0개면 ⚠️ |
| Tone Intensity | 2점 | 기본값(50) 아닌 값 | - |

#### 4.3.2 Alert 및 Action Mapping

| 상태 | Alert 메시지 | Action 버튼 | 동작 |
|------|-------------|-------------|------|
| 0 Voice Tags | "브랜드 성격을 선택해주세요" | 🎭 선택하기 | Brand Voice 섹션 스크롤 |
| No Writing Style | "글쓰기 스타일을 정의해주세요" | ✍️ 작성하기 | `scrollToAndFocus('writing-style')` |
| No Topic | "현재 집중 주제를 설정해주세요" | 🎯 설정하기 | `scrollToAndFocus('focus-topic')` |
| 0 Keywords | "핵심 키워드를 추가해주세요" | #️⃣ 추가하기 | `scrollToAndFocus('keyword-input')` |
| No Do's/Don'ts | "콘텐츠 가이드라인을 설정해주세요" | ✅ 설정하기 | Do's/Don'ts 섹션 스크롤 |

---

### 4.4 Update Score (15점)

#### 4.4.1 점수 기준

| 항목 | 점수 | 획득 조건 | Alert 조건 |
|------|------|----------|-----------|
| Weekly Check-in | 5점 | 7일 내 완료 | 7일 초과시 🔴 |
| Last Sync | 4점 | 7일 내 동기화 | 7일 초과시 ⚠️ |
| Data Freshness | 3점 | 30일 내 수정 | 30일 초과시 ⚠️ |
| Knowledge Update | 3점 | 14일 내 추가 | 14일 초과시 ⚠️ |

#### 4.4.2 Alert 및 Action Mapping

| 상태 | Alert 메시지 | Action 버튼 | 동작 |
|------|-------------|-------------|------|
| 체크인 만료 | "주간 브랜드 체크인을 완료해주세요" | 📅 체크인 시작 | Weekly Check-in 배너 클릭 |
| 동기화 오래됨 | "Hive Mind와 동기화해주세요" | 🔄 지금 동기화 | `syncWithHiveMind()` |
| 데이터 오래됨 | "브랜드 정보를 업데이트해주세요" | ♻️ 업데이트 | Core Identity 스크롤 |

---

### 4.5 Quality Score (10점)

#### 4.5.1 점수 기준

| 항목 | 점수 | 획득 조건 | Alert 조건 |
|------|------|----------|-----------|
| Approval Rate | 4점 | 80% 이상 승인 | 60% 미만시 ⚠️ |
| Feedback Input | 3점 | 5개 이상 피드백 | 0개면 ⚠️ |
| Agent Fine-tuning | 3점 | Agent Config 커스터마이징 | 미설정시 ⚠️ |

#### 4.5.2 Alert 및 Action Mapping

| 상태 | Alert 메시지 | Action 버튼 | 동작 |
|------|-------------|-------------|------|
| 낮은 승인율 | "생성된 콘텐츠를 검토해주세요" | 📋 콘텐츠 보기 | Studio 페이지 이동 |
| 피드백 없음 | "콘텐츠에 피드백을 제공해주세요" | 💬 피드백 제공 | 콘텐츠 리스트 이동 |
| Agent 미설정 | "에이전트 설정을 커스터마이징해주세요" | 🤖 설정하기 | Agent Setting Prompt 모달 오픈 |

---

## 5. UI/UX 설계

### 5.1 점수 카드 디자인

#### 5.1.1 정상 상태 (만점)

```
┌─────────────────────────┐
│  IDENTITY        ✅     │
│  ━━━━━━━━━━━━━━━━━━━━   │
│     25/25               │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │ ← 초록색 프로그레스 바
└─────────────────────────┘
```

#### 5.1.2 경고 상태 (점수 미달)

```
┌─────────────────────────┐
│  IDENTITY        ⚠️     │ ← 노란색 테두리
│  ━━━━━━━━━━━━━━━━━━━━   │
│     15/25               │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░   │ ← 노란색 프로그레스 바
│  ┌─────────────────┐    │
│  │  개선하기 →     │    │ ← 클릭 가능 버튼
│  └─────────────────┘    │
└─────────────────────────┘
```

#### 5.1.3 위험 상태 (0점 또는 매우 낮음)

```
┌─────────────────────────┐
│  IDENTITY        🔴     │ ← 빨간색 테두리 + 펄스 애니메이션
│  ━━━━━━━━━━━━━━━━━━━━   │
│     0/25                │ ← 빨간색 숫자
│  ░░░░░░░░░░░░░░░░░░░░   │ ← 빨간색 빈 프로그레스 바
│  ┌─────────────────┐    │
│  │ 🚨 즉시 설정 →  │    │ ← 강조된 액션 버튼
│  └─────────────────┘    │
└─────────────────────────┘
```

### 5.2 Missing Items 모달

```
┌─────────────────────────────────────────────────────────────────┐
│                                                              ✕  │
│  🔴 Identity 점수 개선하기                    현재: 5/25점      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ❌ 브랜드 미션/설명이 비어있습니다                       │   │
│  │    +5점 획득 가능                                        │   │
│  │                                     [📝 지금 작성하기]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ❌ 타겟 고객이 정의되지 않았습니다                       │   │
│  │    +5점 획득 가능                                        │   │
│  │                                     [👤 타겟 설정하기]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️ 웹사이트 분석이 완료되지 않았습니다                   │   │
│  │    +4점 획득 가능                                        │   │
│  │                                     [🔍 분석하기]        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  💡 모두 완료 시: +14점 → 19/25점                               │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 액션 버튼 클릭 시 동작

```
┌───────────────────────────────────────────────────────────────────┐
│                        ACTION FLOW                                 │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. 사용자가 "📝 지금 작성하기" 클릭                               │
│              │                                                     │
│              ▼                                                     │
│  2. 모달 자동 닫힘                                                 │
│              │                                                     │
│              ▼                                                     │
│  3. 해당 입력 필드로 스무스 스크롤                                 │
│     ┌─────────────────────────────────────────────────────────┐   │
│     │                                                          │   │
│     │    ╭─────────────────────────────────────────────────╮  │   │
│     │    │  Mission                                        │  │   │
│     │    │  ┌────────────────────────────────────────────┐ │  │   │
│     │    │  │ █                                          │ │  │   │
│     │    │  │                                            │ │ ← 포커스 │
│     │    │  │  ← 펄스 하이라이트 효과                    │ │  │   │
│     │    │  └────────────────────────────────────────────┘ │  │   │
│     │    ╰─────────────────────────────────────────────────╯  │   │
│     │                                                          │   │
│     └─────────────────────────────────────────────────────────┘   │
│              │                                                     │
│              ▼                                                     │
│  4. 사용자가 정보 입력                                             │
│              │                                                     │
│              ▼                                                     │
│  5. 자동 저장 (1초 debounce)                                       │
│              │                                                     │
│              ▼                                                     │
│  6. 점수 재계산 + UI 업데이트                                      │
│     ┌─────────────┐                                               │
│     │   5 → 10    │ ← 점수 상승 애니메이션 🎊                      │
│     │  ▲▲▲▲▲      │                                               │
│     └─────────────┘                                               │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### 5.4 Optimize 버튼

```html
<!-- Health Score 카드 우측 상단 -->
<button id="health-optimize-btn" class="optimize-btn">
    ⚠️ Optimize
</button>
```

**동작:**
1. 모든 카테고리의 누락 항목 분석
2. 점수 향상 가능성이 가장 큰 카테고리 우선 표시
3. Missing Items 모달 오픈

---

## 6. Firestore 스키마

### 6.1 Brand Brain Document 구조

```javascript
// Collection: brandBrain/{userId}/projects/{projectId}
{
    // Core Identity (Identity Score 계산에 사용)
    coreIdentity: {
        projectName: string,
        description: string,
        website: string,
        websiteAnalysis: {
            pageCount: number,
            analyzedAt: Timestamp,
            summary: string
        } | null,
        industry: string,
        targetAudience: string
    },
    
    // Strategy Directives (Strategy Score 계산에 사용)
    strategy: {
        brandVoice: {
            personality: string[],     // ["professional", "friendly"]
            writingStyle: string,      // 자유 형식 텍스트
            dos: string[],             // ["Emphasize sustainability"]
            donts: string[]            // ["Don't mention competitors"]
        },
        currentFocus: {
            topic: string,             // "Clean Beauty Trend"
            keywords: string[]         // ["#CleanBeauty", "#Vegan"]
        },
        toneIntensity: number,         // 0.0 - 1.0 (기본값 0.5)
        platformPriority: string[]     // ["x", "instagram", "linkedin"]
    },
    
    // Health Score (계산 결과 저장)
    healthScore: {
        total: number,                 // 0-100
        breakdown: {
            identity: number,          // 0-25
            knowledge: number,         // 0-25
            strategy: number,          // 0-25
            update: number,            // 0-15
            quality: number            // 0-10
        },
        missingItems: {
            identity: MissingItem[],
            knowledge: MissingItem[],
            strategy: MissingItem[],
            update: MissingItem[],
            quality: MissingItem[]
        },
        lastCalculated: Timestamp,
        history: [                     // 최근 30일 기록 (트렌드 표시용)
            { date: Timestamp, score: number }
        ]
    },
    
    // Weekly Check-in (Update Score 계산에 사용)
    weeklyCheckin: {
        lastCompleted: Timestamp | null,
        streakCount: number,           // 연속 체크인 횟수
        history: [
            { date: Timestamp, changes: string[] }
        ]
    },
    
    // Sync Status
    syncStatus: {
        lastSynced: Timestamp | null,
        pendingChanges: number,
        pendingItems: string[]
    },
    
    // Quality Tracking (Quality Score 계산에 사용)
    qualityTracking: {
        approvedCount: number,
        rejectedCount: number,
        feedbackCount: number,
        hasCustomAgentConfig: boolean
    },
    
    // Metadata
    sourceProjectId: string,
    createdAt: Timestamp,
    updatedAt: Timestamp
}
```

### 6.2 Missing Item 타입

```typescript
interface MissingItem {
    field: string;           // 필드 ID (예: "project-name")
    message: string;         // 사용자에게 표시할 메시지
    points: number;          // 획득 가능 점수
    severity: 'critical' | 'warning';  // 심각도 (🔴 vs ⚠️)
    actionType: ActionType;  // 액션 타입
    actionTarget: string;    // 액션 대상 (필드 ID 또는 URL)
}

type ActionType = 
    | 'scroll-focus'    // 해당 필드로 스크롤 + 포커스
    | 'click-button'    // 버튼 클릭 트리거
    | 'open-modal'      // 모달 오픈
    | 'navigate'        // 페이지 이동
    | 'call-function';  // 함수 호출
```

---

## 7. 구현 명세

### 7.1 핵심 함수

```javascript
/**
 * 전체 Health Score 계산 (메인 함수)
 */
function calculateHealthScore() {
    if (!brandBrainData) return;
    
    // 각 카테고리별 점수 계산
    const identity = calculateIdentityScore(brandBrainData.coreIdentity);
    const knowledge = calculateKnowledgeScore(knowledgeSources);
    const strategy = calculateStrategyScore(brandBrainData.strategy);
    const update = calculateUpdateScore(brandBrainData);
    const quality = calculateQualityScore(brandBrainData.qualityTracking);
    
    // 총점 계산
    const total = identity.score + knowledge.score + strategy.score + 
                  update.score + quality.score;
    
    // 누락 항목 통합
    const allMissing = {
        identity: identity.missing,
        knowledge: knowledge.missing,
        strategy: strategy.missing,
        update: update.missing,
        quality: quality.missing
    };
    
    // UI 업데이트
    updateHealthScoreUI(total, {
        identity: identity.score,
        knowledge: knowledge.score,
        strategy: strategy.score,
        update: update.score,
        quality: quality.score
    }, allMissing);
    
    // Firestore에 저장
    saveHealthScoreToFirestore(total, allMissing);
}

/**
 * UI 업데이트
 */
function updateHealthScoreUI(total, breakdown, missing) {
    // 총점 표시
    const scoreEl = document.getElementById('health-score');
    animateScoreChange(scoreEl, total);
    
    // 각 카테고리 업데이트
    Object.entries(breakdown).forEach(([category, score]) => {
        updateCategoryCard(category, score, missing[category]);
    });
    
    // Optimize 버튼 상태 업데이트
    updateOptimizeButton(total, missing);
}

/**
 * 카테고리 카드 업데이트
 */
function updateCategoryCard(category, score, missingItems) {
    const maxScore = getCategoryMaxScore(category);
    const scoreEl = document.getElementById(`score-${category}`);
    const cardEl = scoreEl.closest('.score-card') || scoreEl.parentElement;
    
    // 점수 표시
    scoreEl.textContent = `${score}/${maxScore}`;
    
    // 상태에 따른 스타일 적용
    cardEl.classList.remove('score-card--warning', 'score-card--critical', 'score-card--complete');
    
    if (score === maxScore) {
        cardEl.classList.add('score-card--complete');
        cardEl.querySelector('.score-card__alert-icon')?.remove();
    } else if (score === 0 || missingItems.some(m => m.severity === 'critical')) {
        cardEl.classList.add('score-card--critical');
        addAlertIcon(cardEl, '🔴');
        addActionButton(cardEl, category);
    } else if (missingItems.length > 0) {
        cardEl.classList.add('score-card--warning');
        addAlertIcon(cardEl, '⚠️');
        addActionButton(cardEl, category);
    }
}

/**
 * 스크롤 후 포커스
 */
function scrollToAndFocus(elementId) {
    // 모달 닫기
    closeMissingItemsModal();
    
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // 스크롤
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 하이라이트 효과
    element.classList.add('highlight-pulse');
    
    // 포커스 (딜레이 후)
    setTimeout(() => {
        element.focus();
        setTimeout(() => {
            element.classList.remove('highlight-pulse');
        }, 1000);
    }, 500);
}

/**
 * Optimize 버튼 핸들러
 */
function handleHealthOptimize() {
    const allMissing = {
        identity: analyzeMissingItems('identity'),
        knowledge: analyzeMissingItems('knowledge'),
        strategy: analyzeMissingItems('strategy'),
        update: analyzeMissingItems('update'),
        quality: analyzeMissingItems('quality')
    };
    
    // 가장 점수 향상이 큰 카테고리 우선
    const prioritized = Object.entries(allMissing)
        .map(([cat, items]) => ({
            category: cat,
            items,
            potentialPoints: items.reduce((sum, i) => sum + i.points, 0)
        }))
        .filter(c => c.items.length > 0)
        .sort((a, b) => b.potentialPoints - a.potentialPoints);
    
    if (prioritized.length === 0) {
        showNotification('🎉 브랜드 헬스가 완벽합니다! (100/100)', 'success');
        return;
    }
    
    // 우선순위 1순위 카테고리 모달 표시
    showMissingItemsModal(prioritized[0].category);
}
```

### 7.2 CSS 스타일

```css
/* 점수 카드 기본 스타일 */
.score-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px;
    transition: all 0.3s ease;
}

/* 완료 상태 */
.score-card--complete {
    border-color: rgba(34, 197, 94, 0.5);
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), transparent);
}

/* 경고 상태 */
.score-card--warning {
    border-color: rgba(251, 191, 36, 0.5);
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), transparent);
}

/* 위험 상태 */
.score-card--critical {
    border-color: rgba(239, 68, 68, 0.5);
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), transparent);
    animation: pulse-danger 2s ease-in-out infinite;
}

@keyframes pulse-danger {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}

/* 필드 하이라이트 효과 */
.highlight-pulse {
    animation: highlight 1s ease-in-out;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.5),
                0 0 20px rgba(99, 102, 241, 0.3) !important;
}

@keyframes highlight {
    0%, 100% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.5); }
    50% { box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.8), 0 0 30px rgba(99, 102, 241, 0.5); }
}

/* 액션 버튼 */
.score-card__action-btn {
    margin-top: 8px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 6px;
    color: #818cf8;
    cursor: pointer;
    transition: all 0.2s;
}

.score-card__action-btn:hover {
    background: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
}

/* Missing Item 스타일 */
.missing-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    margin-bottom: 12px;
}

.missing-item--critical {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.05);
}

.missing-item--warning {
    border-color: rgba(251, 191, 36, 0.3);
    background: rgba(251, 191, 36, 0.05);
}

.missing-item__action {
    padding: 8px 16px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
}

.missing-item__action:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}
```

---

## 8. 구현 로드맵

### Phase 1: 기본 점수 계산 개선 (1-2일)
- [ ] `calculateHealthScore()` 함수 리팩토링
- [ ] 5개 카테고리별 개별 점수 계산 함수 구현
- [ ] Missing Items 분석 로직 구현
- [ ] UI 점수 표시 업데이트

### Phase 2: Alert 시스템 구현 (1-2일)
- [ ] 점수 카드 상태별 스타일 적용 (완료/경고/위험)
- [ ] Alert 아이콘 표시 로직
- [ ] 액션 버튼 추가
- [ ] Missing Items 모달 구현

### Phase 3: 액션 연동 (1일)
- [ ] `scrollToAndFocus()` 함수 구현
- [ ] 각 액션 타입별 핸들러 구현
- [ ] 하이라이트 효과 CSS 추가
- [ ] 자동 저장 후 점수 재계산 연동

### Phase 4: Knowledge & Update Score (1일)
- [ ] Knowledge Source 데이터 기반 점수 계산
- [ ] 주간 체크인 완료 추적
- [ ] 데이터 신선도 계산 로직

### Phase 5: Quality Score & 마무리 (1일)
- [ ] 콘텐츠 승인/거부 추적
- [ ] Agent Config 커스터마이징 감지
- [ ] Optimize 버튼 기능 완성
- [ ] 테스트 및 버그 수정

---

## 📌 핵심 요약

```
┌─────────────────────────────────────────────────────────────────────┐
│                       BRAND HEALTH SCORE                             │
│                     핵심 원칙: "보여주고, 알려주고, 고치게 하자"      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1️⃣ 점수 측정: 5개 카테고리, 100점 만점                             │
│     • Identity (25) + Knowledge (25) + Strategy (25)                │
│     • + Update (15) + Quality (10) = 100점                          │
│                                                                      │
│  2️⃣ Alert 표시: 점수 미달 시 시각적 경고                            │
│     • 🔴 0점 또는 Critical = 빨간색 + 펄스 애니메이션               │
│     • ⚠️ Warning = 노란색 테두리                                    │
│     • ✅ 완료 = 초록색                                               │
│                                                                      │
│  3️⃣ 액션 유도: 즉시 개선할 수 있는 버튼 제공                        │
│     • "개선하기" → Missing Items 모달                                │
│     • "지금 작성하기" → 해당 필드로 스크롤 + 포커스                  │
│                                                                      │
│  4️⃣ 자동 업데이트: 정보 입력 시 즉시 점수 반영                      │
│     • 자동 저장 (debounce)                                          │
│     • 점수 재계산                                                    │
│     • UI 애니메이션으로 점수 상승 표시                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

*문서 버전: v2.0*
*최종 업데이트: 2025-12-25*
*작성자: ZYNK Development Team*
