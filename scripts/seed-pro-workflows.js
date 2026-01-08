/**
 * Professional Workflow Seeding Script
 * Adds high-quality workflow definitions categorized by business function
 */
window.seedProWorkflowsSet = async function () {
    console.log("🚀 Starting Professional Workflow Seeding...");

    if (typeof db === 'undefined' && typeof firebase !== 'undefined') {
        var db = firebase.firestore();
    }

    if (!db) {
        console.error("❌ Firestore 'db' not found. Make sure Firebase is initialized.");
        return;
    }

    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const workflows = [
        {
            name: "SNS 바이럴 콘텐츠 팩토리",
            description: "인스타그램/링크드인용 고성능 콘텐츠를 생성하는 멀티 에이전트 워크플로우",
            pipelineContext: "studio",
            category: "SNS/마케팅",
            status: "active",
            nodes: [
                { id: "node_1", type: "start", x: 100, y: 300, data: { name: "Start" } },
                { id: "node_2", type: "project_brief", x: 300, y: 200, data: { name: "Project Brief" } },
                { id: "node_3", type: "brand_brain", x: 300, y: 400, data: { name: "Brand Brain" } },
                { id: "node_4", type: "transform", x: 550, y: 300, data: { name: "데이터 집계", transformType: "aggregate" } },
                {
                    id: "node_5", type: "agent", x: 800, y: 300,
                    data: {
                        name: "콘텐츠 전략가",
                        agentId: "planner",
                        model: "deepseek-reasoner",
                        temperature: 0.5,
                        systemPrompt: "당신은 시니어 SNS 전략가입니다. 제공된 프로젝트 브리프와 브랜드 에셋을 분석하여, 타겟 오디언스의 반응을 이끌어낼 수 있는 3가지 콘텐츠 앵글과 배포 전략을 수립하세요."
                    }
                },
                {
                    id: "node_6", type: "agent", x: 1100, y: 300,
                    data: {
                        name: "비주얼 크리에이터",
                        agentId: "creator",
                        model: "gpt-4o",
                        temperature: 0.8,
                        systemPrompt: "수립된 전략을 바탕으로 각 앵글에 맞는 매혹적인 문구(Caption), 해시태그, 그리고 AI 이미지 생성을 위한 정교한 프롬프트를 작성하세요."
                    }
                },
                { id: "node_7", type: "end", x: 1400, y: 300, data: { name: "End" } }
            ],
            edges: [
                { id: "e1-4", source: "node_1", target: "node_4" },
                { id: "e2-4", source: "node_2", target: "node_4" },
                { id: "e3-4", source: "node_3", target: "node_4" },
                { id: "e4-5", source: "node_4", target: "node_5" },
                { id: "e5-6", source: "node_5", target: "node_6" },
                { id: "e6-7", source: "node_6", target: "node_7" }
            ],
            temperature: 0.7,
            agentCount: 2,
            createdAt: timestamp
        },
        {
            name: "SEO 최적화 전문 블로그 엔진",
            description: "지식 허브 데이터를 기반으로 검색 엔진에 최적화된 심층 리포트와 블로그를 작성합니다.",
            pipelineContext: "studio",
            category: "블로그/학습",
            status: "active",
            nodes: [
                { id: "node_1", type: "start", x: 100, y: 300, data: { name: "Start" } },
                { id: "node_2", type: "knowledge_hub", x: 300, y: 300, data: { name: "Knowledge Hub", khStatus: "active" } },
                {
                    id: "node_3", type: "agent", x: 550, y: 300,
                    data: {
                        name: "데이터 분석가",
                        agentId: "researcher",
                        model: "deepseek-reasoner",
                        systemPrompt: "지식 허브의 문서들을 종합적으로 분석하여 핵심 인사이트와 통계적 근거들을 추출하세요."
                    }
                },
                {
                    id: "node_4", type: "agent", x: 850, y: 300,
                    data: {
                        name: "SEO 작가",
                        agentId: "copywriter",
                        model: "gpt-4o",
                        systemPrompt: "추출된 인사이트를 바탕으로 SEO 키워드가 자연스럽게 스며든 전문 블로그 아티클을 작성하세요. 구조적 독해를 돕는 소제목과 서론/본론/결론이 명확해야 합니다."
                    }
                },
                { id: "node_5", type: "end", x: 1100, y: 300, data: { name: "End" } }
            ],
            edges: [
                { id: "e1-2", source: "node_1", target: "node_2" },
                { id: "e2-3", source: "node_2", target: "node_3" },
                { id: "e3-4", source: "node_3", target: "node_4" },
                { id: "e4-5", source: "node_4", target: "node_5" }
            ],
            temperature: 0.4,
            agentCount: 2,
            createdAt: timestamp
        },
        {
            name: "B2B 개인화 콜드메일 시퀀스",
            description: "잠재 고객의 페인 포인트를 타격하는 개인화된 영업 메일 3종 세트를 생성합니다.",
            pipelineContext: "studio",
            category: "영업/뉴스레터",
            status: "active",
            nodes: [
                { id: "node_1", type: "start", x: 100, y: 300, data: { name: "Start" } },
                { id: "node_2", type: "input", x: 300, y: 300, data: { name: "고객 정보 (JSON)", source: "manual_json" } },
                {
                    id: "node_3", type: "agent", x: 600, y: 300,
                    data: {
                        name: "심리 분석 에이전트",
                        agentId: "evaluator",
                        model: "deepseek-reasoner",
                        systemPrompt: "입력된 고객의 직무와 산업 정보를 바탕으로 그들이 겪고 있을 가능성이 높은 업무적 고충(Pain Points) 3가지를 도출하세요."
                    }
                },
                {
                    id: "node_4", type: "agent", x: 900, y: 300,
                    data: {
                        name: "세일즈 카피라이터",
                        agentId: "creator",
                        model: "gpt-4o",
                        systemPrompt: "도출된 고충을 해결해 줄 수 있는 우리 서비스의 장점을 자연스럽게 강조하는 콜드 메일 시퀀스를 작성하세요. 거부감이 없는 부드러운 말투를 사용하세요."
                    }
                },
                { id: "node_5", type: "end", x: 1200, y: 300, data: { name: "End" } }
            ],
            edges: [
                { id: "e1-2", source: "node_1", target: "node_2" },
                { id: "e2-3", source: "node_2", target: "node_3" },
                { id: "e3-4", source: "node_3", target: "node_4" },
                { id: "e4-5", source: "node_4", target: "node_5" }
            ],
            temperature: 0.6,
            agentCount: 2,
            createdAt: timestamp
        }
    ];

    try {
        const batch = db.batch();
        workflows.forEach(wf => {
            const docRef = db.collection('workflowDefinitions').doc();
            batch.set(docRef, wf);
            console.log(`✅ Queued: ${wf.name} (${wf.category})`);
        });

        await batch.commit();
        console.log("✨ Successfully seeded Professional Workflows!");
    } catch (err) {
        console.error("❌ Seeding failed:", err);
    }
};
