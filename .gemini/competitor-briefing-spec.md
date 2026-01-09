# 🎯 경쟁사 Quick Briefing 기획서

## 📋 개요

**목적**: 프로젝트 정보가 부족할 때 Knowledge Hub로 이동시키지 않고, Market Pulse 페이지 내에서 바로 필요한 정보를 수집하여 경쟁사를 탐색할 수 있도록 함.

**핵심 기능**:
1. 인라인 Quick Briefing 폼 (정보 부족 시 표시)
2. 산업 카테고리 선택
3. 타겟 고객 입력
4. USP(핵심 차별점) 입력
5. **고객이 직접 경쟁사 입력** (신규)
6. 입력 정보 프로젝트에 저장 후 자동 재탐색
7. **구조화된 Match Score 계산** (Option A 방식)

---

## 📊 Match Score 계산 방법론

### 가중 평균 공식

```
Match Score = (USP Overlap × 0.35) + 
              (Audience Proximity × 0.30) + 
              (Market Presence × 0.20) + 
              (Growth Momentum × 0.15)
```

### 각 지표별 점수 기준

#### 1. USP Overlap (가중치 35%)
> "우리와 어떤 가치를 두고 경쟁하는가?"

| 점수 범위 | 기준 |
|-----------|------|
| 90-100 | 핵심 USP가 거의 동일 (직접 경쟁) |
| 70-89 | USP의 50% 이상 중복 |
| 50-69 | 일부 기능/가치 중복 |
| 30-49 | 간접적 가치 경쟁 |
| 0-29 | USP 중복 거의 없음 |

#### 2. Audience Proximity (가중치 30%)
> "같은 고객을 두고 경쟁하는가?"

| 점수 범위 | 기준 |
|-----------|------|
| 90-100 | 타겟 고객이 완전히 동일 |
| 70-89 | 80% 이상 고객층 중복 |
| 50-69 | 50% 이상 고객층 중복 |
| 30-49 | 일부 세그먼트만 중복 |
| 0-29 | 고객층 거의 다름 |

**평가 요소**: 산업/업종, 기업 규모, 지역, 의사결정자 유형

#### 3. Market Presence (가중치 20%)
> "시장에서 얼마나 큰 존재감을 가지고 있는가?"

| 점수 범위 | 기준 |
|-----------|------|
| 90-100 | 시장 리더/대기업 |
| 70-89 | 주요 플레이어 |
| 50-69 | 성장 중인 중견 기업 |
| 30-49 | 스타트업/신규 진입자 |
| 0-29 | 신생 기업/미미한 존재감 |

**평가 요소**: 매출 규모, 직원 수, 투자 유치, 브랜드 인지도

#### 4. Growth Momentum (가중치 15%)
> "얼마나 빠르게 성장하고 있는가?"

| 점수 범위 | 기준 |
|-----------|------|
| 90-100 | 폭발적 성장 (연 100%+) |
| 70-89 | 고성장 (연 50-100%) |
| 50-69 | 안정적 성장 (연 20-50%) |
| 30-49 | 저성장 (연 0-20%) |
| 0-29 | 정체 또는 하락 |

**평가 요소**: 최근 투자, 신규 제품 출시, 채용 동향, 뉴스 언급량

### 서버 측 재계산

AI가 반환한 개별 지표를 기반으로 서버에서 matchScore를 재계산하여 일관성 보장:

```javascript
const calculatedScore = Math.round(
    (uspOverlap * 0.35) +
    (audienceProximity * 0.30) +
    (marketPresence * 0.20) +
    (growthMomentum * 0.15)
);
```

---

## 🖼️ UI 설계

### 정보 부족 시 표시되는 Quick Briefing 폼

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🆚 Strategic Competitor Radar                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ⚡ 경쟁사 분석을 위한 Quick Briefing                            │   │
│  │                                                                   │   │
│  │  더 정확한 경쟁사를 찾기 위해 아래 정보를 입력해주세요.          │   │
│  │                                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐   │   │
│  │  │ 🏭 산업/카테고리 *                                        │   │   │
│  │  │ ┌─────────────────────────────────────────────────────┐   │   │   │
│  │  │ │ [▼ 선택하세요                                      ]│   │   │   │
│  │  │ │    • SaaS / 소프트웨어                              │   │   │   │
│  │  │ │    • 핀테크 / 금융                                  │   │   │   │
│  │  │ │    • 블록체인 / 크립토                              │   │   │   │
│  │  │ │    • 이커머스 / 리테일                              │   │   │   │
│  │  │ │    • 헬스케어 / 바이오                              │   │   │   │
│  │  │ │    • AI / 머신러닝                                  │   │   │   │
│  │  │ │    • 교육 / 에듀테크                                │   │   │   │
│  │  │ │    • 미디어 / 콘텐츠                                │   │   │   │
│  │  │ │    • 물류 / 모빌리티                                │   │   │   │
│  │  │ │    • 기타 (직접 입력)                               │   │   │   │
│  │  │ └─────────────────────────────────────────────────────┘   │   │   │
│  │  └───────────────────────────────────────────────────────────┘   │   │
│  │                                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐   │   │
│  │  │ 👥 주요 타겟 고객 *                                       │   │   │
│  │  │ ┌─────────────────────────────────────────────────────┐   │   │   │
│  │  │ │ 예: 30-40대 스타트업 창업자, B2B 기업 의사결정자    │   │   │   │
│  │  │ └─────────────────────────────────────────────────────┘   │   │   │
│  │  └───────────────────────────────────────────────────────────┘   │   │
│  │                                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐   │   │
│  │  │ 💎 핵심 차별점 (USP)                                      │   │   │
│  │  │ ┌─────────────────────────────────────────────────────┐   │   │   │
│  │  │ │ 예: AI 기반 실시간 분석, 업계 최저 수수료,          │   │   │   │
│  │  │ │     24시간 고객 지원                                 │   │   │   │
│  │  │ └─────────────────────────────────────────────────────┘   │   │   │
│  │  └───────────────────────────────────────────────────────────┘   │   │
│  │                                                                   │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │   │
│  │                                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────┐   │   │
│  │  │ 🎯 이미 알고 있는 경쟁사 (선택)                            │   │   │
│  │  │                                                            │   │   │
│  │  │  직접 경쟁사를 추가하면 AI가 더 정확하게 분석합니다       │   │   │
│  │  │                                                            │   │   │
│  │  │  ┌─────────────────────────────────────┐  [+ 추가]        │   │   │
│  │  │  │ 경쟁사 이름 또는 URL 입력           │                  │   │   │
│  │  │  └─────────────────────────────────────┘                  │   │   │
│  │  │                                                            │   │   │
│  │  │  추가된 경쟁사:                                            │   │   │
│  │  │  ┌────────────────────────────────────────────────────┐   │   │   │
│  │  │  │ 🏢 Competitor A                              [✕]   │   │   │   │
│  │  │  │ 🏢 Competitor B                              [✕]   │   │   │   │
│  │  │  │ 🏢 https://competitor-c.com                  [✕]   │   │   │   │
│  │  │  └────────────────────────────────────────────────────┘   │   │   │
│  │  └───────────────────────────────────────────────────────────┘   │   │
│  │                                                                   │   │
│  │          ┌──────────────────────────────────────────┐            │   │
│  │          │  💾 저장 후 경쟁사 찾기                  │            │   │
│  │          └──────────────────────────────────────────┘            │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 데이터 구조

### 수집 필드 (프로젝트 문서에 저장)

```javascript
{
  // 기존 프로젝트 필드...
  
  // 새로 추가되는 Quick Briefing 필드
  competitorBriefing: {
    industry: "blockchain_crypto",           // 산업 카테고리 (enum)
    industryCustom: null,                    // 기타 선택 시 직접 입력 값
    targetAudience: "30-40대 블록체인 개발자 및 크립토 투자자",
    usp: "AI 기반 실시간 온체인 분석, 멀티체인 지원",
    knownCompetitors: [                      // 고객이 직접 입력한 경쟁사
      { name: "Chainalysis", url: "https://chainalysis.com" },
      { name: "Nansen", url: "https://nansen.ai" },
      { name: "Dune Analytics", url: null }
    ],
    updatedAt: Timestamp
  }
}
```

### 산업 카테고리 Enum

```javascript
const INDUSTRY_CATEGORIES = [
  { id: 'saas_software', label: 'SaaS / 소프트웨어', icon: '💻' },
  { id: 'fintech_finance', label: '핀테크 / 금융', icon: '💰' },
  { id: 'blockchain_crypto', label: '블록체인 / 크립토', icon: '⛓️' },
  { id: 'ecommerce_retail', label: '이커머스 / 리테일', icon: '🛒' },
  { id: 'healthcare_bio', label: '헬스케어 / 바이오', icon: '🏥' },
  { id: 'ai_ml', label: 'AI / 머신러닝', icon: '🤖' },
  { id: 'education_edtech', label: '교육 / 에듀테크', icon: '📚' },
  { id: 'media_content', label: '미디어 / 콘텐츠', icon: '🎬' },
  { id: 'logistics_mobility', label: '물류 / 모빌리티', icon: '🚚' },
  { id: 'gaming_entertainment', label: '게임 / 엔터테인먼트', icon: '🎮' },
  { id: 'real_estate', label: '부동산 / 프롭테크', icon: '🏠' },
  { id: 'food_beverage', label: 'F&B / 푸드테크', icon: '🍔' },
  { id: 'travel_hospitality', label: '여행 / 호스피탈리티', icon: '✈️' },
  { id: 'hr_recruiting', label: 'HR / 채용', icon: '👥' },
  { id: 'marketing_adtech', label: '마케팅 / 애드테크', icon: '📢' },
  { id: 'other', label: '기타 (직접 입력)', icon: '📝' }
];
```

---

## 🔄 플로우

### 1. 정보 부족 시 (기존)
```
scanMarket() → checkProjectDataSufficiency() → insufficient → showInsufficientDataMessage()
```

### 2. 정보 부족 시 (신규)
```
scanMarket() 
    → checkProjectDataSufficiency() 
    → insufficient 
    → showQuickBriefingForm()  ← 신규 함수
        → 유저가 폼 작성
        → saveQuickBriefingAndScan()  ← 신규 함수
            → Firestore 업데이트
            → currentProjectData 갱신
            → scanMarket() 재호출
```

### 3. 고객 입력 경쟁사 처리
```
1. 고객이 경쟁사 이름/URL 입력
2. knownCompetitors 배열에 추가
3. AI Context에 포함하여 discoverCompetitors 호출
4. AI가 고객 입력 경쟁사 + 유사 경쟁사 추천
5. knownCompetitors는 matchScore 100%로 자동 포함
```

---

## 🛠️ 구현 계획

### Phase 1: Quick Briefing 폼 UI
1. `showQuickBriefingForm()` 함수 구현
2. 산업 카테고리 드롭다운
3. 타겟 고객 텍스트 필드
4. USP 텍스트 필드
5. 폼 유효성 검사

### Phase 2: 고객 경쟁사 입력 기능
1. 경쟁사 추가 입력 필드
2. 경쟁사 목록 관리 (추가/삭제)
3. URL 자동 감지 및 파싱

### Phase 3: 데이터 저장 및 재탐색
1. `saveQuickBriefingAndScan()` 함수 구현
2. Firestore 프로젝트 문서 업데이트
3. `currentProjectData` 갱신
4. `scanMarket()` 자동 재호출

### Phase 4: AI 컨텍스트 개선
1. `discoverCompetitorsWithAI()` 업데이트
2. knownCompetitors를 AI 프롬프트에 포함
3. AI가 고객 입력 경쟁사 기반으로 유사 경쟁사 추천

---

## 📁 파일 수정 목록

| 파일 | 수정 내용 |
|------|----------|
| `marketPulse.js` | `showQuickBriefingForm()`, `saveQuickBriefingAndScan()`, `addKnownCompetitor()`, `removeKnownCompetitor()` 함수 추가 |
| `marketPulse.js` | `checkProjectDataSufficiency()` - competitorBriefing 필드 체크 추가 |
| `marketPulse.js` | `discoverCompetitorsWithAI()` - knownCompetitors 컨텍스트 추가 |
| `functions/index.js` | `discoverCompetitors` - knownCompetitors 프롬프트 반영 |

---

## ✅ 성공 기준

1. 정보 부족 시 Knowledge Hub로 이동하지 않음
2. 인라인 폼에서 필수 정보 수집 가능
3. 고객이 직접 경쟁사 입력 가능
4. 입력 정보 저장 후 자동 재탐색
5. 저장된 정보는 다음 방문 시에도 유지

---

## 🎨 디자인 가이드라인

- **배경**: `bg-slate-800/50` (반투명 다크)
- **카드**: `bg-slate-900` with `border-indigo-500/30`
- **입력 필드**: `bg-slate-800` with `border-slate-700`
- **CTA 버튼**: `bg-gradient-to-r from-indigo-600 to-purple-600`
- **아이콘**: Lucide Icons 또는 Emoji
- **애니메이션**: `animate-in fade-in` (Tailwind CSS)
