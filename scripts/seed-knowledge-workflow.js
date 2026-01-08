/**
 * scripts/seed-knowledge-workflow.js
 * Seeds a professional workflow for the Knowledge Hub
 */
window.seedKnowledgeWorkflow = async function () {
    console.log("🚀 Seeding Knowledge Hub Workflow...");
    const db = firebase.firestore();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const workflow = {
        name: "지능형 브랜드 요약 엔진 (Pro)",
        description: "지식 허브의 모든 소스를 분석하여 메인 서머리, 핵심 토픽, 제안 질문을 한 번에 생성합니다.",
        pipelineContext: "knowledge",
        category: "분석/요약",
        status: "active",
        nodes: [
            { id: "start", type: "start", x: 100, y: 300, data: { name: "Start" } },
            { id: "kh_data", type: "knowledge_hub", x: 300, y: 300, data: { name: "Knowledge Hub", khStatus: "active" } },
            {
                id: "analyzer", type: "agent", x: 600, y: 300,
                data: {
                    name: "전략 분석가",
                    agentId: "researcher",
                    model: "deepseek-reasoner",
                    temperature: 0.3,
                    inputMapping: "아래 제공된 소스 데이터를 바탕으로 브랜드 요약 보고서를 JSON 형식으로 작성해줘.\n\n[SOURCE DATA]\n{{kh_data.rawText}}",
                    systemPrompt: `당신은 시니어 브랜드 전략 컨설턴트입니다. 
제공된 소스들을 심층 분석하여 다음 구조의 JSON을 생성하세요:

{
  "summary": "3-4문단의 전문적인 브랜드 요약 (최소 500자)",
  "keyInsights": ["핵심 인사이트 1", "핵심 인사이트 2", "핵심 인사이트 3", "핵심 인사이트 4", "핵심 인사이트 5"],
  "suggestedQuestions": ["전략적 질문 1", "전략적 질문 2", "전략적 질문 3"]
}

전문적이고 통찰력 있는 톤을 유지하세요.`
                }
            },
            { id: "end", type: "end", x: 900, y: 300, data: { name: "End" } }
        ],
        edges: [
            { id: "e1", source: "start", target: "kh_data" },
            { id: "e2", source: "kh_data", target: "analyzer" },
            { id: "e3", source: "analyzer", target: "end" }
        ],
        agentCount: 1,
        temperature: 0.3,
        contentCount: 0,
        createdAt: timestamp
    };

    try {
        // Look for existing one to update or create new
        const snapshot = await db.collection('workflowDefinitions')
            .where('pipelineContext', '==', 'knowledge')
            .where('name', '==', workflow.name)
            .get();

        if (!snapshot.empty) {
            await db.collection('workflowDefinitions').doc(snapshot.docs[0].id).update(workflow);
            console.log("✅ Updated existing Knowledge Workflow");
        } else {
            await db.collection('workflowDefinitions').add(workflow);
            console.log("✅ Created new Knowledge Workflow");
        }

        alert("Knowledge Hub용 전문 워크플로우가 구성되었습니다.");
    } catch (err) {
        console.error("❌ Seeding failed:", err);
    }
};
