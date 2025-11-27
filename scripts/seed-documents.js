// scripts/seed-documents.js
// Seeds initial documentation for the system

(async function seedDocuments() {
    console.log("🌱 Starting Documents Seeding...");
    const projectId = "default_project";

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found.");
        return;
    }

    const batch = db.batch();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // ==========================================
    // System Documentation
    // ==========================================
    const documents = [
        {
            id: "doc_performance_kpi_guide",
            title: "Performance & KPI 시스템 사용 가이드",
            category: "user_guide",
            slug: "performance-kpi-guide",
            status: "published",
            version: "1.0.0",
            content: `# Performance & KPI 시스템 사용 가이드

## 📊 시스템 개요

### 목적
AI Agent가 생성한 콘텐츠의 **실제 성과를 추적하고 분석**하는 시스템입니다.

### 주요 기능
1. **KPI 수동 입력**: SNS 성과 데이터를 입력하여 Engagement Rate 자동 계산
2. **성과 추적**: Agent 버전별, Template별 성과 비교
3. **Dashboard**: 성과 데이터 시각화 및 필터링

---

## 📖 사용 방법

### 1. Performance & KPI 페이지 접속
1. Admin Console 좌측 사이드바에서 **"Performance & KPI"** 클릭
2. 현재 저장된 성과 데이터 목록 확인

### 2. KPI 데이터 입력
1. 우측 상단의 **"+ Record KPI"** 버튼 클릭
2. 모달 창이 열리면 다음 정보 입력:

#### 입력 필드
- **Link to Task (선택)**: Agent Task ID 입력
- **Platform**: Instagram / Twitter / LinkedIn 선택
- **Metrics (필수)**:
  - Impressions: 노출 수 (필수)
  - Likes: 좋아요 수
  - Comments: 댓글 수
  - Saves/Shares: 저장/공유 수

### 3. 저장 및 확인
시스템이 자동으로 계산:
- **Engagement Rate** = (Likes + Comments + Saves) / Impressions
- **KPI Score** = 목표 대비 달성률 (0-100점)

---

## 🎯 KPI Score 계산 로직

### Score 등급
- **90~100점**: Excellent (초록색)
- **70~89점**: Good (파란색)
- **50~69점**: Average (노란색)
- **0~49점**: Poor (빨간색)`,
            tags: ["performance", "kpi", "analytics"],
            author: "System",
            last_updated_by: "System"
        },
        {
            id: "doc_agent_team_setup",
            title: "Agent Team 설정 가이드",
            category: "user_guide",
            slug: "agent-team-setup",
            status: "published",
            version: "1.0.0",
            content: `# Agent Team 설정 가이드

## 개요
Agent Team은 여러 Sub-Agent들이 협업하여 콘텐츠를 생성하는 단위입니다.

## Agent Team 구성 요소

### 1. Planner (기획자)
- 역할: 콘텐츠 전략 수립
- 입력: 타겟 오디언스, 목표
- 출력: 콘텐츠 계획

### 2. Creator (제작자)
- 역할: 실제 콘텐츠 생성
- 입력: Planner의 계획
- 출력: 최종 콘텐츠

### 3. Manager (관리자)
- 역할: 품질 검토 및 승인
- 입력: Creator의 콘텐츠
- 출력: 피드백 및 승인

## 새 Agent Team 생성 방법

1. **Agent Teams** 메뉴 클릭
2. **"+ Create Agent Team"** 버튼 클릭
3. 기본 정보 입력:
   - Team Name
   - Description
   - Target Platform
4. Sub-Agent 선택 (Planner, Creator, Manager)
5. **"Create Team"** 클릭

## 버전 관리

Agent Team은 버전 관리를 지원합니다:
- 각 수정 시 자동으로 버전 증가
- 이전 버전으로 롤백 가능
- 버전별 성과 비교 가능`,
            tags: ["agent-team", "setup", "configuration"],
            author: "System",
            last_updated_by: "System"
        },
        {
            id: "doc_runtime_profiles",
            title: "Runtime Profile 설정 가이드",
            category: "technical",
            slug: "runtime-profiles",
            status: "published",
            version: "1.0.0",
            content: `# Runtime Profile 설정 가이드

## Runtime Profile이란?

Runtime Profile은 Sub-Agent가 사용할 **LLM 모델과 설정**을 정의합니다.

## 주요 속성

### 1. Provider
- OpenAI
- Anthropic
- Google

### 2. Model ID
- gpt-4o (Premium)
- gpt-4o-mini (Balanced)
- gpt-3.5-turbo (Economy)

### 3. Capabilities
- chat: 대화 생성
- vision: 이미지 분석
- embedding: 텍스트 임베딩

### 4. Cost Hint
- expensive: 고비용, 고성능
- medium: 균형
- cheap: 저비용, 대량 처리

## 사용 예시

\`\`\`javascript
{
  "id": "rtp_chat_balanced_v1",
  "provider": "openai",
  "model_id": "gpt-4o-mini",
  "capabilities": {
    "chat": true,
    "vision": false
  },
  "cost_hint": {
    "tier": "medium"
  }
}
\`\`\`

## 선택 가이드

- **복잡한 기획**: Premium (gpt-4o)
- **일반 콘텐츠 생성**: Balanced (gpt-4o-mini)
- **대량 처리**: Economy (gpt-3.5-turbo)`,
            tags: ["runtime", "llm", "configuration"],
            author: "System",
            last_updated_by: "System"
        }
    ];

    documents.forEach(doc => {
        const ref = db.collection(`projects/${projectId}/documents`).doc(doc.id);
        batch.set(ref, {
            ...doc,
            created_at: timestamp,
            updated_at: timestamp,
            view_count: 0
        });
    });

    try {
        await batch.commit();
        console.log("✅ Documents Seeded Successfully!");
        console.log(`   - ${documents.length} Documents`);
        alert("✅ Documents Seeded Successfully!");
    } catch (error) {
        console.error("❌ Error seeding documents:", error);
        alert(`Error seeding documents: ${error.message}`);
    }

})();
