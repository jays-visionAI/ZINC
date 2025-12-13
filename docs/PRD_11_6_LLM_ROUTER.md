# PRD 11.6 - LLM Router & Booster Implementation

## 📋 구현 요약

이 문서는 PRD 11.6 (LLM 라우팅 + Booster + Feature 정책 + 크레딧 레저) 구현 내용을 설명합니다.

---

## 🏗️ 새로 추가된 파일

| 파일 | 설명 |
|------|------|
| `functions/llmRouter.js` | LLM Router 핵심 모듈 (서버) |
| `services/llm-router-service.js` | 프론트엔드 LLM Router 서비스 |
| `scripts/seed-llm-models.js` | Firestore 시드 스크립트 |

---

## 📦 Firestore 컬렉션

### 1. systemLLMModels
모델 카탈로그 및 원가표

```javascript
{
  id: 'gpt-5',
  provider: 'openai',
  modelId: 'gpt-5',
  displayName: 'GPT-5',
  tier: 'standard',           // economy | standard | premium
  costPer1kInputTokens: 0.005,
  costPer1kOutputTokens: 0.015,
  creditPer1kTokens: 1.0,     // ZYNK 크레딧 배수
  maxContextTokens: 128000,
  capabilities: ['chat', 'function_calling'],
  isActive: true,
  isDefault: true
}
```

### 2. featurePolicies
기능별 모델 라우팅 정책

```javascript
{
  id: 'studio.content_gen',
  featureName: 'Content Generation',
  category: 'studio',
  defaultTier: {
    provider: 'openai',
    model: 'gpt-5',
    creditMultiplier: 1.0
  },
  boostTier: {
    provider: 'openai',
    model: 'gpt-5.2',
    creditMultiplier: 2.5
  },
  forceTier: null,  // 강제 모델 (있으면 항상 이 모델 사용)
  isActive: true
}
```

### 3. llmUsageLogs
LLM 사용 로그

```javascript
{
  userId: 'user123',
  projectId: 'project456',
  feature: 'studio.content_gen',
  qualityTier: 'BOOST',
  provider: 'openai',
  model: 'gpt-5.2',
  usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
  creditCost: 8,
  latencyMs: 1234,
  createdAt: Timestamp
}
```

---

## 🔧 Cloud Function

### routeLLM

새로운 통합 LLM 호출 엔드포인트:

```javascript
const routeLLM = firebase.functions().httpsCallable('routeLLM');

const result = await routeLLM({
  feature: 'studio.content_gen',  // 필수: 기능 ID
  qualityTier: 'BOOST',           // 'DEFAULT' 또는 'BOOST'
  systemPrompt: 'You are...',
  userPrompt: 'Create a...',
  temperature: 0.7,
  projectId: 'project123'
});

// 결과
{
  success: true,
  content: '생성된 콘텐츠...',
  model: 'gpt-5.2',
  usage: { prompt_tokens: 100, completion_tokens: 200 },
  routing: {
    feature: 'studio.content_gen',
    qualityTier: 'BOOST',
    provider: 'openai',
    model: 'gpt-5.2',
    creditMultiplier: 2.5,
    creditCost: 8,
    latencyMs: 1234
  },
  credits: { success: true, remaining: 992 }
}
```

---

## 🎨 프론트엔드 사용법

### LLMRouterService

```javascript
// 1. 기본 호출
const result = await LLMRouterService.call({
  feature: 'studio.content_gen',
  qualityTier: 'DEFAULT',
  systemPrompt: 'You are a creative writer.',
  userPrompt: 'Write a social media post about coffee.'
});

// 2. 간편 호출 (Boost 옵션)
const result = await LLMRouterService.generateContent(
  'studio.ad_copy',
  'Create an ad for running shoes',
  { boost: true, projectId: 'proj123' }
);

// 3. 비용 예측
const estimate = await LLMRouterService.estimateCost(
  'studio.content_gen',
  'BOOST',
  2000  // 예상 토큰 수
);
// → { estimated: 5, model: 'gpt-5.2', multiplier: 2.5 }
```

---

## 🚀 설정 순서

### 1. Firestore 시드 데이터 생성

브라우저 콘솔에서 실행:

```javascript
// scripts/seed-llm-models.js 로드 후
await seedLLMRouterData();
```

### 2. Cloud Functions 배포

```bash
cd functions
firebase deploy --only functions
```

### 3. Firestore Rules 배포

```bash
firebase deploy --only firestore:rules
```

### 4. Admin Console에서 확인

Admin → Settings → System (API) 탭에서:
- **LLM Models**: 모델별 원가 확인
- **Feature Policies**: 기능별 라우팅 정책 확인

---

## 📊 크레딧 배수 정책

| Tier | 기본 모델 | 배수 |
|------|----------|------|
| Economy | gpt-4o-mini, gemini-2.0-flash | 0.1-0.3x |
| Standard (DEFAULT) | gpt-5, claude-3.5-sonnet | 1.0x |
| Premium (BOOST) | gpt-5.2, claude-3-opus | 2.5x |

---

## 🔄 기존 코드 마이그레이션

기존 `callLLM` 호출을 `LLMRouterService.call`로 점진적 교체:

```javascript
// Before (직접 모델 지정)
const result = await callOpenAI({
  model: 'gpt-4o',
  messages: [...]
});

// After (기능 기반 라우팅)
const result = await LLMRouterService.call({
  feature: 'studio.content_gen',
  qualityTier: 'DEFAULT',
  messages: [...]
});
```

---

## ✅ 테스트 체크리스트

- [ ] Admin Console에서 LLM Models 테이블 로드 확인
- [ ] Admin Console에서 Feature Policies 테이블 로드 확인
- [ ] `routeLLM` Cloud Function 호출 테스트
- [ ] DEFAULT tier 호출 시 gpt-5 사용 확인
- [ ] BOOST tier 호출 시 gpt-5.2 사용 확인
- [ ] 크레딧 차감 및 llmUsageLogs 기록 확인
- [ ] forceTier 설정 시 강제 모델 사용 확인
