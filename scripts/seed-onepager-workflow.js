/**
 * scripts/seed-onepager-workflow.js
 * Seeds a professional workflow for generating Brand One-Pagers
 */
window.seedOnePagerWorkflow = async function () {
    console.log("🚀 Seeding One-Pager Generation Workflow...");
    const db = firebase.firestore();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const workflow = {
        name: "브랜드 원페이저 생성기 (Pro)",
        description: "Knowledge Hub와 Project Brief 데이터를 분석하여 전문적인 원페이저를 자동 생성합니다.",
        pipelineContext: "studio",
        category: "문서/프레젠테이션",
        status: "active",
        nodes: [
            { id: "start", type: "start", x: 50, y: 300, data: { name: "Start" } },
            { id: "kh_data", type: "knowledge_hub", x: 200, y: 200, data: { name: "Knowledge Hub", label: "브랜드 자료", khStatus: "active" } },
            { id: "brief_data", type: "project_brief", x: 200, y: 400, data: { name: "Project Brief", label: "프로젝트 정보" } },
            { id: "merge", type: "transform", x: 400, y: 300, data: { name: "데이터 통합", transformType: "aggregate" } },
            {
                id: "strategist", type: "agent", x: 600, y: 300,
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
                id: "copywriter", type: "agent", x: 850, y: 300,
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
                id: "designer", type: "agent", x: 1100, y: 300,
                data: {
                    name: "비주얼 디렉터",
                    agentId: "creator",
                    model: "gpt-4o",
                    temperature: 0.8,
                    inputMapping: `[카피 내용]\n{{copywriter.output}}\n\n[브랜드 컨텍스트]\n{{kh_data.rawText}}`,
                    systemPrompt: `당신은 크리에이티브 디렉터입니다.
원페이저의 시각적 방향성을 제안하세요.

JSON 형식으로 출력:
{
  "layout": {
    "style": "레이아웃 스타일 (예: Hero + 3-Column Features + CTA)",
    "sections": ["섹션1", "섹션2", "..."]
  },
  "colorPalette": {
    "primary": "#HEX코드",
    "secondary": "#HEX코드", 
    "accent": "#HEX코드",
    "background": "#HEX코드",
    "text": "#HEX코드"
  },
  "typography": {
    "headingFont": "추천 폰트명",
    "bodyFont": "추천 폰트명"
  },
  "heroImagePrompt": "히어로 섹션용 AI 이미지 생성 프롬프트 (상세하게)",
  "iconStyle": "아이콘 스타일 추천 (예: Minimal line icons, Gradient filled)",
  "moodKeywords": ["키워드1", "키워드2", "키워드3"]
}`
                }
            },
            { id: "end", type: "end", x: 1350, y: 300, data: { name: "End" } }
        ],
        edges: [
            { id: "e1", source: "start", target: "kh_data" },
            { id: "e2", source: "start", target: "brief_data" },
            { id: "e3", source: "kh_data", target: "merge" },
            { id: "e4", source: "brief_data", target: "merge" },
            { id: "e5", source: "merge", target: "strategist" },
            { id: "e6", source: "strategist", target: "copywriter" },
            { id: "e7", source: "copywriter", target: "designer" },
            { id: "e8", source: "designer", target: "end" }
        ],
        agentCount: 3,
        temperature: 0.5,
        contentCount: 0,
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
            console.log("✅ Updated existing One-Pager Workflow");
        } else {
            await db.collection('workflowDefinitions').add(workflow);
            console.log("✅ Created new One-Pager Workflow");
        }

        alert("원페이저 생성 워크플로우가 구성되었습니다!");
    } catch (err) {
        console.error("❌ Seeding failed:", err);
    }
};
