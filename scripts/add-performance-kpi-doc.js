// scripts/add-performance-kpi-doc.js
// Adds Performance KPI Guide to Documents

(async function addPerformanceKPIDoc() {
    console.log("📄 Adding Performance KPI Guide to Documents...");
    const projectId = "default_project";

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found.");
        return;
    }

    const docId = "doc_performance_kpi_guide";
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const document = {
        id: docId,
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

#### 단계별 가이드
1. **"+ Record KPI"** 버튼 클릭
2. 문서 정보 입력:
   - **Link to Task (선택)**: Agent Task ID 입력 (예: \`task_1732...\`)
   - **Platform**: Instagram / Twitter / LinkedIn 선택
   - **Metrics (필수)**:
     - **Impressions**: 노출 수 (필수, 0보다 커야 함)
     - **Likes**: 좋아요 수
     - **Comments**: 댓글 수
     - **Saves/Shares**: 저장/공유 수

3. **"Calculate & Save"** 클릭

#### 자동 계산
시스템이 자동으로 계산:
- **Engagement Rate** = (Likes + Comments + Saves) / Impressions
- **KPI Score** = 목표 대비 달성률 (0-100점)

### 3. 데이터 필터링
- **검색창**: Content ID 또는 Task ID로 검색
- **Platform 필터**: 특정 플랫폼의 데이터만 표시

---

## 💡 사용 예시

### 시나리오: Instagram 포스트 성과 입력

1. Agent가 Instagram 포스트를 생성 (Task ID: \`task_1732123456\`)
2. 실제 Instagram에 게시 후 24시간 경과
3. Instagram Insights에서 데이터 수집:
   - Impressions: 10,000
   - Likes: 500
   - Comments: 100
   - Saves: 50

4. Admin Console에서 입력:
\`\`\`
Link to Task: task_1732123456
Platform: Instagram
Impressions: 10000
Likes: 500
Comments: 100
Saves: 50
\`\`\`

5. 결과:
   - **Engagement Rate**: 6.50% ((500+100+50)/10000)
   - **KPI Score**: 81점 (목표 8% 대비)
   - **Tier**: Good

---

## 🎯 KPI Score 계산 로직

### 공식
\`\`\`javascript
if (actual >= target) {
    // 목표 달성 시: 80~100점
    score = 80 + (ratio - 1.0) * 40;
} else {
    // 목표 미달 시: 0~80점
    score = ratio * 80;
}
\`\`\`

### Score 등급
- **90~100점**: Excellent (초록색)
- **70~89점**: Good (파란색)
- **50~69점**: Average (노란색)
- **0~49점**: Poor (빨간색)

---

## 🔍 데이터 활용

### Template vs Instance 분석 (향후 구현)
- 같은 Template을 사용하는 여러 Instance의 평균 성과 비교
- 어떤 설정(Runtime Profile, System Prompt 등)이 더 효과적인지 분석

### AgentSet 버전 비교
- v1.0 vs v1.1 vs v1.2의 성과 차이 확인
- 버전 업그레이드 효과 검증

---

## ⚠️ 주의사항

1. **Impressions는 필수**: 0이면 저장 불가
2. **Task ID는 선택**: 없어도 저장 가능하지만, 연결 시 더 풍부한 분석 가능
3. **실시간 연동 아님**: 현재는 수동 입력 방식 (향후 API 연동 예정)

---

## 🚀 다음 단계

### Phase 2.2: Advanced Execution
- Orchestrator가 Template/Instance 구조 사용
- Runtime Profile 자동 선택 로직

### Phase 2.5: Cloud Functions
- 실제 LLM API 연동
- 자동 성과 수집 (SNS API 연동)`,
        tags: ["performance", "kpi", "analytics", "guide"],
        author: "System",
        last_updated_by: "System",
        view_count: 0,
        created_at: timestamp,
        updated_at: timestamp
    };

    try {
        await db.collection(`projects/${projectId}/documents`).doc(docId).set(document);
        console.log("✅ Performance KPI Guide Added!");
        alert("✅ Performance KPI Guide Added to Documents!");
    } catch (error) {
        console.error("❌ Error adding document:", error);
        alert(`Error: ${error.message}`);
    }

})();
