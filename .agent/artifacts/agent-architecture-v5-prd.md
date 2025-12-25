# 🧠 ZYNK Agent Architecture v5.0 PRD
## 4계층 프롬프트 시스템 + Runtime Profile Agent

**Version:** 5.0  
**Date:** 2025-12-25  
**Status:** Planning  

---

## 📋 Executive Summary

ZYNK Studio의 에이전트 시스템을 고도화하여 **4계층 프롬프트 시스템**과 **AI 기반 동적 LLM 라우팅**을 도입합니다. 이를 통해 관리 효율성, 비용 최적화, 사용자 경험을 대폭 개선합니다.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    🔧 Layer 1: ADMIN                                    │
│                Standard Agent Profiles                                   │
│  • 12개 에이전트의 표준 역할/프롬프트 정의                                 │
│  • 실행 조건 및 주기 설정                                                │
│  • 시스템 관리자만 수정 가능                                              │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓ (상속)
┌─────────────────────────────────────────────────────────────────────────┐
│                    👤 Layer 2: USER                                     │
│              Team Goal + Sub-Agent Prompts                               │
│  • 프로젝트별 팀 목표 정의                                                │
│  • 12개 서브에이전트 커스텀 지시사항                                       │
│  • AI 샘플 생성 → 유저 수정                                              │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓ (병합)
┌─────────────────────────────────────────────────────────────────────────┐
│                    🤖 Layer 3: AI                                       │
│                 Runtime Profile Agent                                    │
│  • 작업 복잡도/난이도 실시간 분석                                          │
│  • 최적 LLM 모델 동적 선택                                                │
│  • 비용 vs 품질 자동 최적화                                               │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓ (실행)
┌─────────────────────────────────────────────────────────────────────────┐
│                    ⚡ Layer 4: EXECUTION                                 │
│                     DAG Executor                                         │
│  • 5단계 워크플로우 실행 (Research → Planning → Creation → Validation → Final)
│  • 병렬/순차 실행 관리                                                    │
│  • 결과 수집 및 UI 업데이트                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Feature Breakdown

---

### 🔧 Feature 1: Standard Agent Profiles (Admin)

#### 1.1 목적
- 12개 에이전트의 **표준 역할과 프롬프트**를 중앙에서 관리
- 모든 프로젝트에 일관된 품질 보장
- 에이전트 업그레이드 시 일괄 적용

#### 1.2 UI 위치
```
Admin > Settings > Agent Configuration (신규 탭)
```

#### 1.3 데이터 구조
```javascript
// Firestore: systemSettings/standardAgentProfiles
{
  "version": "1.0",
  "lastUpdated": "2025-12-25T00:00:00Z",
  "agents": {
    "research": {
      "displayName": "Research Agent",
      "phase": "research",
      "systemPrompt": "You are a research specialist...",
      "defaultTemperature": 0.5,
      "executionConfig": {
        "priority": 1,
        "timeout": 30000,
        "retryCount": 2,
        "parallelizable": true
      },
      "scheduling": {
        "trigger": "on_demand",        // on_demand | scheduled | conditional
        "condition": null,
        "cronExpression": null
      }
    },
    "seo_watcher": {
      "displayName": "SEO Watcher",
      "phase": "research",
      "systemPrompt": "You are an SEO specialist...",
      "defaultTemperature": 0.4,
      "executionConfig": {
        "priority": 1,
        "timeout": 25000,
        "retryCount": 2,
        "parallelizable": true
      },
      "scheduling": {
        "trigger": "scheduled",
        "condition": null,
        "cronExpression": "0 9 * * 1"  // 매주 월요일 9시
      }
    },
    // ... 12개 에이전트
  }
}
```

#### 1.4 UI 설계

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔧 Standard Agent Profiles                                             │
│  ─────────────────────────────────────────────────────────────────────  │
│  이 설정은 모든 프로젝트에 기본 적용됩니다.                                 │
│                                                                         │
│  ┌─ Research Phase ──────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ▼ 📊 Research Agent                                     [Edit]  │  │
│  │  ├─ System Prompt: "You are a research specialist..."            │  │
│  │  ├─ Temperature: 0.5                                              │  │
│  │  ├─ Trigger: On Demand                                            │  │
│  │  └─ Execution: Parallel, Timeout 30s, Retry 2x                    │  │
│  │                                                                   │  │
│  │  ▼ 🔍 SEO Watcher                                        [Edit]  │  │
│  │  ├─ System Prompt: "You are an SEO specialist..."                 │  │
│  │  ├─ Temperature: 0.4                                              │  │
│  │  ├─ Trigger: Scheduled (Mon 9AM)                                  │  │
│  │  └─ Execution: Parallel, Timeout 25s, Retry 2x                    │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Creation Phase ──────────────────────────────────────────────────┐  │
│  │  ▼ ✍️ Text Creator                                       [Edit]  │  │
│  │  ▼ 🎨 Image Creator                                      [Edit]  │  │
│  │  ▼ 🎥 Video Creator                                      [Edit]  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  [💾 Save All]   [↩️ Reset to Defaults]   [📤 Export JSON]              │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 1.5 에이전트 편집 모달

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Edit Agent: Research Agent                                     ✕     │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [Basic] [Execution] [Scheduling]                                       │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  System Prompt                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ You are a research specialist. Analyze the given content plan   │   │
│  │ and identify key themes, trends, and relevant information.      │   │
│  │ Provide insights that will help create compelling content.      │   │
│  │                                                                  │   │
│  │ Variables Available:                                             │   │
│  │ {{planContent}}, {{teamGoal}}, {{brandContext}}                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Task Prompt Template                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Analyze this content plan: {{planContent}}                       │   │
│  │                                                                  │   │
│  │ Provide:                                                         │   │
│  │ 1. Main themes                                                   │   │
│  │ 2. Target audience insights                                      │   │
│  │ 3. Key messages                                                  │   │
│  │ 4. Recommended angles                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Temperature: [0.5 ────●────── 1.0]                                     │
│                                                                         │
│  [Cancel]                                              [Save Changes]   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 1.6 실행 조건 탭

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Basic] [Execution] [Scheduling]                                       │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Execution Mode                                                         │
│  ○ Parallel (다른 에이전트와 동시 실행)                                   │
│  ● Sequential (순차 실행)                                               │
│                                                                         │
│  Priority: [ 1 ▼ ]  (1=highest, 5=lowest)                               │
│                                                                         │
│  Timeout: [ 30 ] seconds                                                │
│                                                                         │
│  Retry on Failure: [ 2 ▼ ] times                                        │
│                                                                         │
│  Dependencies (선행 에이전트)                                            │
│  ☐ Research Agent                                                       │
│  ☐ SEO Watcher                                                          │
│  ☑ Planner Agent (required)                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 1.7 스케줄링 탭

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Basic] [Execution] [Scheduling]                                       │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Trigger Type                                                           │
│  ● On Demand (수동 실행만)                                               │
│  ○ Scheduled (정기 실행)                                                │
│  ○ Conditional (조건부 실행)                                            │
│                                                                         │
│  ── Scheduled Options ──────────────────────────────────────────────    │
│  Frequency: [ Weekly ▼ ]                                                │
│  Day: [ Monday ▼ ]                                                      │
│  Time: [ 09:00 ▼ ]                                                      │
│                                                                         │
│  ── Conditional Options ────────────────────────────────────────────    │
│  Condition: [ planContent.length > 500 ]                                │
│  ☑ Run only if previous phase succeeded                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 👤 Feature 2: Team Goal + Sub-Agent Prompts (User)

#### 2.1 목적
- 프로젝트별 **커스텀 지시사항** 정의
- AI가 샘플 생성 → 유저가 수정하는 **Guided Customization**
- 표준 프롬프트를 Override하지 않고 **Append**

#### 2.2 UI 위치
```
Command Center > Project Card > 🧠 Brain Button
```

#### 2.3 데이터 구조
```javascript
// Firestore: agentTeams/{teamId}
{
  "teamId": "team_xxx",
  "projectId": "proj_xxx",
  "teamName": "ChannelTest Core Team",
  "directive": "우리는 B2B SaaS 기업입니다...",  // Team Goal
  "subAgentCustomizations": {
    "research": {
      "customPrompt": "경쟁사 Notion, Slack 대비 분석 포함",
      "enabled": true,
      "overrideTemperature": null  // null = use standard
    },
    "creator_text": {
      "customPrompt": "이모지 최소화, 전문적 톤 유지, 한국어로 작성",
      "enabled": true,
      "overrideTemperature": 0.7
    },
    "creator_image": {
      "customPrompt": "브랜드 컬러 #16e0bd 사용, 미니멀 스타일",
      "enabled": true
    }
    // ... 12개 에이전트
  },
  "runtimeProfileId": "profile_xxx",
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### 2.4 UI 설계: Brain Settings Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🧠 Agent Team Settings                                          ✕     │
│  ─────────────────────────────────────────────────────────────────────  │
│  Project: ChannelTest                                                   │
│                                                                         │
│  ┌─ Team Goal ──────────────────────────────────────────────────────┐  │
│  │  팀 전체 목표를 정의하세요. 모든 에이전트가 이 목표를 따릅니다.       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │ 우리는 B2B SaaS 기업입니다. 기술 전문성을 강조하면서          │ │  │
│  │  │ 친근하게 소통하는 콘텐츠를 만들어주세요.                      │ │  │
│  │  │ 타겟: CTO, VP Engineering, Product Manager                  │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  │  [🤖 AI로 샘플 생성]                                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ Sub-Agent Instructions ──────────────────────────────────────────┐  │
│  │  각 에이전트에게 구체적인 지시를 추가할 수 있습니다.                │  │
│  │                                                                   │  │
│  │  ▼ 📊 Research Agent                               [Enabled ✓]   │  │
│  │    Standard: "You are a research specialist..."                   │  │
│  │    ┌─────────────────────────────────────────────────────────┐   │  │
│  │    │ + 경쟁사 Notion, Slack 대비 분석을 포함해주세요.          │   │  │
│  │    │ + 최신 SaaS 트렌드(AI, 자동화) 연관지어 분석              │   │  │
│  │    └─────────────────────────────────────────────────────────┘   │  │
│  │    [🤖 AI 추천 보기]                                             │  │
│  │                                                                   │  │
│  │  ▼ ✍️ Text Creator                                 [Enabled ✓]   │  │
│  │    Standard: "You are an expert content creator..."               │  │
│  │    ┌─────────────────────────────────────────────────────────┐   │  │
│  │    │ + 이모지는 최소한만 사용                                  │   │  │
│  │    │ + 전문적이지만 친근한 톤 유지                             │   │  │
│  │    │ + 한국어로 작성 (필요시 영어 혼용)                         │   │  │
│  │    └─────────────────────────────────────────────────────────┘   │  │
│  │    [🤖 AI 추천 보기]                                             │  │
│  │                                                                   │  │
│  │  ▶ 🎨 Image Creator                                [Enabled ✓]   │  │
│  │  ▶ 🎥 Video Creator                                [Disabled]    │  │
│  │  ▶ ✅ Compliance                                   [Enabled ✓]   │  │
│  │  ...                                                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  [Cancel]                                              [💾 Save Team]   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2.5 AI 샘플 생성 기능

```javascript
// Cloud Function: generateSubAgentSuggestions
async function generateSubAgentSuggestions({ projectInfo, agentType }) {
    const prompt = `
        Based on this project:
        - Company: ${projectInfo.companyName}
        - Industry: ${projectInfo.industry}
        - Brand Voice: ${projectInfo.brandVoice}
        - Target Audience: ${projectInfo.targetAudience}
        
        Generate 3 customization suggestions for the ${agentType} agent.
        Each suggestion should be specific and actionable.
        
        Return JSON array: ["suggestion1", "suggestion2", "suggestion3"]
    `;
    
    return await callLLM({
        model: 'gemini-2.5-flash',  // 저비용 모델 사용
        prompt
    });
}
```

---

### 🤖 Feature 3: Runtime Profile Agent

#### 3.1 목적
- **작업 복잡도를 실시간 분석**하여 최적 LLM 선택
- 비용 vs 품질 **자동 최적화**
- 정적 설정 의존도 제거

#### 3.2 Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📥 Input Request                                                       │
│  ├─ taskType: "creator_text"                                            │
│  ├─ prompt: "Create social media posts for..."                          │
│  ├─ promptLength: 1500                                                  │
│  ├─ targetChannels: ["x", "linkedin"]                                   │
│  ├─ userQualityHint: "BALANCED" | "BOOST"                               │
│  └─ userCreditBalance: 500                                              │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  🤖 Runtime Profile Agent                                               │
│  Model: gemini-2.5-flash (메타 분석용 저비용 모델)                        │
│                                                                         │
│  System Prompt:                                                         │
│  "You are a Task Complexity Analyzer. Evaluate the incoming task        │
│   and recommend the optimal LLM model based on:                         │
│   - Task complexity (simple/medium/complex)                             │
│   - Required creativity vs precision                                    │
│   - Input length and context requirements                               │
│   - Cost efficiency                                                     │
│                                                                         │
│   Available Models (cost order, low to high):                           │
│   1. gemini-2.5-flash - Simple tasks, formatting, basic generation      │
│   2. gpt-4o-mini - Versatile, good quality/cost ratio                   │
│   3. gemini-2.5-pro - Balanced, longer context                          │
│   4. gpt-4o - High quality general purpose                              │
│   5. claude-3.5-sonnet - Complex reasoning, nuanced content             │
│                                                                         │
│   Return JSON: { provider, model, reasoning, estimatedCost }"           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  📤 Output Decision                                                     │
│  {                                                                      │
│    "provider": "google",                                                │
│    "model": "gemini-2.5-pro",                                           │
│    "reasoning": "Multi-channel content with moderate complexity.        │
│                  LinkedIn requires professional tone. Medium budget.",   │
│    "estimatedCost": 0.015,                                              │
│    "confidenceScore": 0.92,                                             │
│    "alternativeModel": {                                                │
│      "lowCost": "gemini-2.5-flash",                                     │
│      "highQuality": "gpt-4o"                                            │
│    }                                                                    │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.3 데이터 구조

```javascript
// Firestore: systemSettings/runtimeProfileAgent
{
  "enabled": true,
  "version": "1.0",
  "metaModel": {
    "provider": "google",
    "model": "gemini-2.5-flash"
  },
  "systemPrompt": "You are a Task Complexity Analyzer...",
  "availableModels": [
    {
      "id": "gemini-2.5-flash",
      "provider": "google",
      "tier": "economy",
      "bestFor": ["simple tasks", "formatting", "translation"],
      "costPer1kTokens": 0.0001
    },
    {
      "id": "gpt-4o-mini",
      "provider": "openai",
      "tier": "economy",
      "bestFor": ["general purpose", "quick responses"],
      "costPer1kTokens": 0.00015
    },
    {
      "id": "gemini-2.5-pro",
      "provider": "google",
      "tier": "standard",
      "bestFor": ["long context", "research", "analysis"],
      "costPer1kTokens": 0.00125
    },
    {
      "id": "gpt-4o",
      "provider": "openai",
      "tier": "standard",
      "bestFor": ["creative writing", "complex tasks"],
      "costPer1kTokens": 0.0025
    },
    {
      "id": "claude-3.5-sonnet",
      "provider": "anthropic",
      "tier": "premium",
      "bestFor": ["nuanced content", "reasoning", "compliance"],
      "costPer1kTokens": 0.003
    }
  ],
  "heuristics": {
    "shortPromptThreshold": 200,
    "longContextThreshold": 4000,
    "creativeTaskTypes": ["creator_text", "creator_video"],
    "precisionTaskTypes": ["compliance", "seo_optimizer"]
  },
  "caching": {
    "enabled": true,
    "ttlSeconds": 300
  }
}
```

#### 3.4 구현 로직

```javascript
// functions/runtimeProfileAgent.js

class RuntimeProfileAgent {
    constructor(db) {
        this.db = db;
        this.cache = new Map();
        this.config = null;
    }

    async analyze(request) {
        // 1. Load config
        if (!this.config) {
            await this.loadConfig();
        }

        // 2. Check cache (same task type + similar length)
        const cacheKey = this.getCacheKey(request);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // 3. Quick heuristics (avoid LLM call for obvious cases)
        const quickDecision = this.applyHeuristics(request);
        if (quickDecision.confident) {
            return quickDecision.result;
        }

        // 4. LLM Analysis for complex decisions
        const analysis = await this.callMetaAgent(request);

        // 5. Cache result
        this.cache.set(cacheKey, analysis);
        
        return analysis;
    }

    applyHeuristics(request) {
        const { taskType, promptLength, userQualityHint } = request;

        // User explicitly requested BOOST → Premium model
        if (userQualityHint === 'BOOST') {
            return {
                confident: true,
                result: {
                    provider: 'openai',
                    model: 'gpt-4o',
                    reasoning: 'User requested BOOST quality',
                    estimatedCost: 0.025
                }
            };
        }

        // Short, simple task → Economy model
        if (promptLength < this.config.heuristics.shortPromptThreshold) {
            return {
                confident: true,
                result: {
                    provider: 'google',
                    model: 'gemini-2.5-flash',
                    reasoning: 'Short prompt, simple task',
                    estimatedCost: 0.001
                }
            };
        }

        // Precision tasks → Standard model with low temperature
        if (this.config.heuristics.precisionTaskTypes.includes(taskType)) {
            return {
                confident: true,
                result: {
                    provider: 'google',
                    model: 'gemini-2.5-pro',
                    reasoning: 'Precision task requires accurate analysis',
                    estimatedCost: 0.01
                }
            };
        }

        // Not confident → needs LLM analysis
        return { confident: false };
    }

    async callMetaAgent(request) {
        const prompt = `
            Analyze this task and recommend the optimal LLM:
            
            Task Type: ${request.taskType}
            Prompt Length: ${request.promptLength} chars
            Target Channels: ${request.targetChannels?.join(', ') || 'N/A'}
            User Budget Hint: ${request.userQualityHint || 'BALANCED'}
            
            Available Models:
            ${this.config.availableModels.map(m => 
                `- ${m.id}: ${m.bestFor.join(', ')} ($${m.costPer1kTokens}/1k tokens)`
            ).join('\n')}
            
            Return ONLY valid JSON:
            { "provider": "...", "model": "...", "reasoning": "...", "estimatedCost": 0.0 }
        `;

        const result = await callLLM({
            provider: this.config.metaModel.provider,
            model: this.config.metaModel.model,
            messages: [
                { role: 'system', content: this.config.systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1  // Low temperature for consistent decisions
        });

        return JSON.parse(result.text);
    }

    getCacheKey(request) {
        const lengthBucket = Math.floor(request.promptLength / 500) * 500;
        return `${request.taskType}:${lengthBucket}:${request.userQualityHint || 'BALANCED'}`;
    }
}

module.exports = { RuntimeProfileAgent };
```

#### 3.5 LLM Router 통합

```javascript
// functions/llmRouter.js 수정

class LLMRouter {
    constructor(db) {
        this.db = db;
        this.runtimeProfileAgent = new RuntimeProfileAgent(db);  // NEW
        // ...
    }

    async route(options) {
        const {
            feature,
            taskType,
            qualityTier,
            promptLength,
            targetChannels,
            // ...
        } = options;

        // NEW: Runtime Profile Agent 분석
        let routingDecision;
        
        if (this.runtimeProfileAgentEnabled) {
            routingDecision = await this.runtimeProfileAgent.analyze({
                taskType: taskType || feature,
                promptLength: promptLength || 0,
                targetChannels,
                userQualityHint: qualityTier
            });
            
            console.log(`[LLMRouter] RuntimeProfileAgent decision: ${routingDecision.model}`);
        } else {
            // Fallback to static Global Defaults
            routingDecision = await this.getGlobalDefaults();
        }

        // Use the decision
        const { provider, model } = routingDecision;
        
        // ... rest of routing logic
    }
}
```

---

### ⚡ Feature 4: DAG Executor 개선

#### 4.1 개선 사항

| 항목 | 현재 | 개선 |
|------|------|------|
| **프롬프트 소스** | 하드코딩 | 4계층 병합 (Standard + Team + Runtime) |
| **LLM 선택** | 정적 설정 | Runtime Profile Agent 연동 |
| **실행 조건** | 고정 | Admin 설정 기반 동적 제어 |
| **스케줄링** | 없음 | Cron 기반 정기 실행 지원 |

#### 4.2 프롬프트 병합 로직

```javascript
// dag-executor.js 개선

async buildFinalPrompt(agentId, context) {
    // Layer 1: Standard Profile (Admin)
    const standard = await this.loadStandardProfile(agentId);
    
    // Layer 2: Team Customization (User)
    const teamCustom = this.state.teamContext?.subAgentCustomizations?.[agentId];
    
    // Layer 3: Runtime Context (Brand Brain)
    const brandContext = await this.loadBrandContext(context.projectId);
    
    // Merge
    const systemPrompt = standard.systemPrompt;
    
    const taskPrompt = `
        ${standard.taskPromptTemplate}
        
        [Team Goal]
        ${this.state.teamContext?.directive || ''}
        
        [Agent-Specific Instructions]
        ${teamCustom?.customPrompt || ''}
        
        [Brand Context]
        Brand: ${brandContext.companyName}
        Voice: ${brandContext.brandVoice}
        Target: ${brandContext.targetAudience}
        Style: ${brandContext.styleGuide}
    `;
    
    // Variable substitution
    return this.substituteVariables(taskPrompt, context);
}
```

#### 4.3 실행 조건 체크

```javascript
async shouldExecuteAgent(agentId) {
    const config = await this.loadStandardProfile(agentId);
    const scheduling = config.scheduling;
    
    switch (scheduling.trigger) {
        case 'on_demand':
            return true;  // Always run when requested
            
        case 'scheduled':
            return this.isScheduledTime(scheduling.cronExpression);
            
        case 'conditional':
            return this.evaluateCondition(scheduling.condition);
            
        default:
            return true;
    }
}

evaluateCondition(condition) {
    // Simple expression evaluator
    // e.g., "planContent.length > 500"
    try {
        const context = {
            planContent: this.state.context?.content || '',
            targetChannels: this.state.targetChannels || [],
            phase: this.state.currentPhase
        };
        return eval(condition.replace(/\b(\w+)\b/g, 'context.$1'));
    } catch (e) {
        console.error('Condition evaluation failed:', e);
        return true;  // Default to run
    }
}
```

---

## 📊 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FULL EXECUTION FLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

1. User clicks "Start Execution" in Studio
                              ↓
2. DAG Executor starts
   ├─ Loads Standard Profiles (Admin)
   ├─ Loads Team Settings (User)
   └─ Loads Brand Context
                              ↓
3. For each Agent in phase:
   ├─ Check execution conditions
   ├─ Build merged prompt (L1 + L2 + L3)
   ├─ Call Runtime Profile Agent → Get optimal LLM
   └─ Execute via LLM Router
                              ↓
4. Results collected and shown in Studio UI
```

---

## 🗓️ Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
| Task | Priority | Effort |
|------|----------|--------|
| Create `systemSettings/standardAgentProfiles` schema | 🔴 High | 2h |
| Admin UI: Standard Agent Profiles tab | 🔴 High | 8h |
| Migrate existing hardcoded prompts to Firestore | 🔴 High | 4h |
| DAG Executor: Load from standardAgentProfiles | 🔴 High | 4h |

### Phase 2: User Customization (Week 2-3)
| Task | Priority | Effort |
|------|----------|--------|
| Brain Settings Modal redesign | 🔴 High | 6h |
| Team Goal + SubAgent UI implementation | 🔴 High | 8h |
| AI Sample Generation Cloud Function | 🟡 Medium | 4h |
| DAG Executor: Merge user customizations | 🔴 High | 4h |

### Phase 3: Runtime Profile Agent (Week 3-4)
| Task | Priority | Effort |
|------|----------|--------|
| RuntimeProfileAgent class implementation | 🔴 High | 8h |
| Heuristics tuning | 🟡 Medium | 4h |
| LLM Router integration | 🔴 High | 4h |
| Caching layer | 🟡 Medium | 2h |
| Admin toggle (enable/disable) | 🟡 Medium | 2h |

### Phase 4: Scheduling & Polish (Week 4-5)
| Task | Priority | Effort |
|------|----------|--------|
| Execution config UI (Admin) | 🟡 Medium | 4h |
| Scheduling config UI (Admin) | 🟡 Medium | 4h |
| Condition evaluator | 🟡 Medium | 4h |
| Monitoring dashboard | 🟢 Low | 6h |
| Documentation | 🟢 Low | 4h |

---

## 📁 File Changes Summary

### New Files
```
/functions/runtimeProfileAgent.js          - Runtime Profile Agent 구현
/admin-agent-config.html                   - Standard Profiles Admin UI
/admin-agent-config.js                     - Admin UI 로직
```

### Modified Files
```
/admin-settings.html                       - Agent Configuration 탭 추가
/admin-settings.js                         - 탭 로직 추가
/command-center.js                         - Brain Modal 개선
/studio/dag-executor.js                    - 4계층 프롬프트 병합
/functions/llmRouter.js                    - RuntimeProfileAgent 통합
/functions/index.js                        - 새 Cloud Function 등록
```

### Deprecated Files
```
/admin-runtime-profiles.html               - (기존 UI 숨김 처리)
/admin-runtime-profiles.js                 - (기존 로직 deprecated)
```

---

## ✅ Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| LLM 비용 절감 | 30% 감소 | 월간 크레딧 사용량 비교 |
| 품질 유지 | Evaluator 점수 90+ 유지 | Agent 평가 점수 |
| 관리 효율성 | 설정 시간 50% 단축 | 프로젝트 셋업 시간 |
| 사용자 만족도 | 커스터마이징 사용률 80%+ | Brain Settings 사용 비율 |

---

## 📝 Open Questions

1. **Runtime Profile Agent 오버헤드**: Meta-Agent 호출로 인한 추가 레이턴시 (~200ms) 허용 가능?
2. **캐싱 전략**: 동일 유형 작업에 대한 캐싱 TTL은 얼마가 적절?
3. **Fallback 정책**: Agent 분석 실패 시 어떤 모델을 기본으로 사용?
4. **스케줄링 구현**: Cloud Scheduler 사용 vs 자체 Cron 구현?

---

**Document Version History**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 5.0 | 2025-12-25 | Antigravity | Initial 4-layer architecture + Runtime Profile Agent |
