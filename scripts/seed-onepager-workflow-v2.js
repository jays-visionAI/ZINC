/**
 * scripts/seed-onepager-workflow-v2.js
 * Seeds an enhanced One-Pager Workflow using Document Designer agent
 */
window.seedOnePagerWorkflowV2 = async function () {
    console.log("🚀 Seeding Enhanced One-Pager Workflow (V2 with Document Designer)...");
    const db = firebase.firestore();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const workflow = {
        name: "원페이저 생성기 Pro V2",
        description: "Knowledge Hub 데이터를 분석하여 편집 가능한 HTML 원페이저를 자동 생성합니다. Document Designer 에이전트를 활용합니다.",
        pipelineContext: "studio",
        category: "문서/프레젠테이션",
        status: "active",
        version: "2.0.0",
        nodes: [
            {
                id: "start",
                type: "start",
                x: 50,
                y: 300,
                data: { name: "Start" }
            },
            {
                id: "kh_data",
                type: "knowledge_hub",
                x: 200,
                y: 200,
                data: {
                    name: "Knowledge Hub",
                    label: "브랜드 자료",
                    khStatus: "active"
                }
            },
            {
                id: "brief_data",
                type: "project_brief",
                x: 200,
                y: 400,
                data: {
                    name: "Project Brief",
                    label: "프로젝트 정보"
                }
            },
            {
                id: "merge",
                type: "transform",
                x: 400,
                y: 300,
                data: {
                    name: "데이터 통합",
                    transformType: "aggregate"
                }
            },
            {
                id: "strategist",
                type: "agent",
                x: 600,
                y: 300,
                data: {
                    name: "전략 분석가",
                    agentId: "researcher",
                    model: "deepseek-reasoner",
                    temperature: 0.2,
                    inputMapping: `[브랜드 자료]\n{{kh_data.rawText}}\n\n[프로젝트 정보]\n프로젝트명: {{brief_data.name}}\n설명: {{brief_data.description}}\n타겟 고객: {{brief_data.targetAudience}}\n목표: {{brief_data.goals}}`,
                    systemPrompt: `당신은 시니어 브랜드 전략 컨설턴트입니다.
제공된 브랜드 자료와 프로젝트 정보를 심층 분석하여 다음을 도출하세요:

1. 핵심 가치 제안 (Value Proposition) - 한 문장
2. 차별화 포인트 3가지
3. 타겟 고객의 주요 페인포인트 3가지
4. 각 페인포인트에 대한 솔루션 매핑
5. 경쟁 우위 요소

JSON 형식으로 출력:
{
  "valueProposition": "...",
  "differentiators": ["...", "...", "..."],
  "painPoints": [{"pain": "...", "solution": "..."}, ...],
  "competitiveAdvantage": "..."
}`
                }
            },
            {
                id: "copywriter",
                type: "agent",
                x: 850,
                y: 300,
                data: {
                    name: "카피라이터",
                    agentId: "copywriter",
                    model: "gpt-4o",
                    temperature: 0.6,
                    inputMapping: `[전략 분석 결과]\n{{strategist.output}}\n\n[원본 브랜드 정보]\n{{kh_data.rawText}}`,
                    systemPrompt: `당신은 수상 경력이 있는 브랜드 카피라이터입니다.
전략 분석 결과를 바탕으로 원페이저용 카피를 작성하세요.

JSON 형식으로 출력:
{
  "headline": "강렬한 원라이너 헤드라인",
  "subheadline": "2-3문장의 부제목",
  "features": [
    {"icon": "🚀", "title": "특징1", "description": "설명"},
    {"icon": "💡", "title": "특징2", "description": "설명"},
    {"icon": "⚡", "title": "특징3", "description": "설명"}
  ],
  "socialProof": "신뢰도를 높이는 문구 (예: '500+ 기업이 선택한')",
  "cta": {
    "primary": "메인 CTA 문구",
    "secondary": "보조 CTA 문구"
  },
  "tagline": "기억에 남는 태그라인"
}`
                }
            },
            {
                id: "document_designer",
                type: "agent",
                x: 1100,
                y: 300,
                data: {
                    name: "Document Designer",
                    agentId: "DSN-DOCUMENT-DESIGN",
                    model: "deepseek-v3.2-speciale",
                    temperature: 0.6,
                    maxTokens: 12000,
                    inputMapping: `{
  "documentType": "one-pager",
  "pageCount": 1,
  "pageSize": "A4",
  "content": {
    "headline": "{{copywriter.output.headline}}",
    "subheadline": "{{copywriter.output.subheadline}}",
    "features": {{copywriter.output.features}},
    "socialProof": "{{copywriter.output.socialProof}}",
    "cta": {{copywriter.output.cta}},
    "tagline": "{{copywriter.output.tagline}}",
    "brandContext": "{{kh_data.rawText}}"
  },
  "designOptions": {
    "colorScheme": "indigo_purple",
    "visualStyle": "modern_tech",
    "layoutDensity": "balanced",
    "contentTone": "professional"
  }
}`,
                    systemPrompt: `당신은 월드클래스 문서 디자이너이자 시니어 프론트엔드 개발자입니다.
원페이저(One-Pager) 형식의 편집 가능한 HTML 문서를 생성합니다.

## 📐 출력 규칙

1. 완전한 HTML 문서 (<!DOCTYPE html> 포함)
2. A4 사이즈 (210mm × 297mm) 단일 페이지
3. 인라인 CSS 사용 (외부 스타일시트 없이 독립 실행 가능)
4. 모든 텍스트 요소에 contenteditable="true" 속성 추가
5. 각 편집 가능 요소에 data-field-id="unique_id" 부여
6. @page 및 @media print 스타일 포함
7. CSS 변수 사용: --primary-color, --secondary-color, --accent-color
8. Google Fonts CDN 링크 포함 (Pretendard, Inter)
9. 이미지 placeholder: <div class="image-placeholder" data-ai-prompt="[설명]">

## 📄 원페이저 레이아웃 구조

1. 헤더 영역: 로고 placeholder + 헤드라인
2. 히어로 섹션: 서브헤드라인 + 비주얼 placeholder
3. 특징 섹션: 3-4개 아이콘 카드
4. Social Proof / 고객사 로고
5. CTA 버튼
6. 푸터: 연락처 + 태그라인

**중요**: 반드시 완전한 HTML 코드만 출력하세요.
설명, 마크다운 코드블록('''html), 주석 없이 순수 HTML만 반환합니다.
첫 줄은 반드시 <!DOCTYPE html>로 시작해야 합니다.`
                }
            },
            {
                id: "end",
                type: "end",
                x: 1350,
                y: 300,
                data: { name: "End" }
            }
        ],
        edges: [
            { id: "e1", source: "start", target: "kh_data" },
            { id: "e2", source: "start", target: "brief_data" },
            { id: "e3", source: "kh_data", target: "merge" },
            { id: "e4", source: "brief_data", target: "merge" },
            { id: "e5", source: "merge", target: "strategist" },
            { id: "e6", source: "strategist", target: "copywriter" },
            { id: "e7", source: "copywriter", target: "document_designer" },
            { id: "e8", source: "document_designer", target: "end" }
        ],
        agentCount: 3,
        temperature: 0.5,
        contentCount: 0,
        outputType: "html",
        createdAt: timestamp
    };

    try {
        // Look for existing one to update or create new
        const snapshot = await db.collection('workflowDefinitions')
            .where('pipelineContext', '==', 'studio')
            .where('name', '==', workflow.name)
            .get();

        if (!snapshot.empty) {
            await db.collection('workflowDefinitions').doc(snapshot.docs[0].id).update(workflow);
            console.log("✅ Updated existing One-Pager Workflow V2");
        } else {
            await db.collection('workflowDefinitions').add(workflow);
            console.log("✅ Created new One-Pager Workflow V2");
        }

        alert("✅ 원페이저 생성기 Pro V2 워크플로우가 구성되었습니다!");
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        alert("❌ 워크플로우 생성 실패: " + err.message);
    }
};
