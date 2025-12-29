// ZYNK AGENT OS - Phase 1 Initial Seed Script
// 초기 SubAgent 및 AgentSet 생성

(async function initAgentOS() {
    console.log("🚀 ZYNK AGENT OS - Phase 1 Initialization");
    console.log("==========================================\n");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found. Make sure Firebase is initialized.");
        return;
    }

    // Get current project ID (assuming we're in a project context)
    const projectId = "default_project"; // TODO: Replace with actual project ID

    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    const adminId = firebase.auth().currentUser?.uid || "system";

    // =============================================
    // 1. Create Sub-Agents (7 roles)
    // =============================================
    console.log("📦 Step 1: Creating Sub-Agents...\n");

    const subAgents = [
        {
            sub_agent_id: "planner_v1_0_0",
            type: "planner",
            version: "1.0.0",
            parent_version: null,
            agent_set_id: null,
            system_prompt: `You are a strategic content planner for social media.
Your role is to:
- Analyze the user's request and target audience
- Define clear content goals and KPIs
- Create a structured content outline
- Set the tone and style guidelines

Output a JSON plan with: goal, target_audience, tone, content_outline`,
            model_provider: {
                llmText: { provider: "openai", model: "gpt-4", enabled: false },
                llmImage: { enabled: false },
                embeddings: { provider: "openai", model: "text-embedding-ada-002" }
            },
            config: {
                temperature: 0.7,
                maxTokens: 2000
            },
            output_schema_version: 1,
            status: "active",
            change_log: "Initial version - Phase 1",
            created_at: timestamp,
            updated_at: timestamp,
            created_by: adminId
        },
        {
            sub_agent_id: "creator_v1_0_0",
            type: "creator",
            version: "1.0.0",
            parent_version: null,
            agent_set_id: null,
            system_prompt: `You are a creative content writer for social media.
Your role is to:
- Take the planner's strategy and create engaging content
- Write compelling copy that matches the tone and style
- Generate relevant hashtags
- Ensure the content aligns with the outline

Output a JSON with: title, caption, hashtags`,
            model_provider: {
                llmText: { provider: "openai", model: "gpt-4", enabled: false },
                llmImage: { provider: "openai", model: "dall-e-3", enabled: false },
                embeddings: { provider: "openai", model: "text-embedding-ada-002" }
            },
            config: {
                temperature: 0.8,
                maxTokens: 3000
            },
            output_schema_version: 1,
            status: "active",
            change_log: "Initial version - Phase 1",
            created_at: timestamp,
            updated_at: timestamp,
            created_by: adminId
        },
        {
            sub_agent_id: "manager_v1_0_0",
            type: "manager",
            version: "1.0.0",
            parent_version: null,
            agent_set_id: null,
            system_prompt: `You are a content quality manager.
Your role is to:
- Review the created content against the plan
- Check for brand consistency and quality
- Make final approval decision (PASS/REVISE/REJECT)
- Provide constructive feedback if needed

Output a JSON with: decision, release_ready, comments`,
            model_provider: {
                llmText: { provider: "openai", model: "gpt-4", enabled: false },
                llmImage: { enabled: false },
                embeddings: { provider: "openai", model: "text-embedding-ada-002" }
            },
            config: {
                temperature: 0.3,
                maxTokens: 1000
            },
            output_schema_version: 1,
            status: "active",
            change_log: "Initial version - Phase 1",
            created_at: timestamp,
            updated_at: timestamp,
            created_by: adminId
        },
        // Placeholder agents for Phase 2+
        {
            sub_agent_id: "research_v1_0_0",
            type: "research",
            version: "1.0.0",
            parent_version: null,
            agent_set_id: null,
            system_prompt: "Market research agent - to be implemented in Phase 2",
            model_provider: { llmText: { enabled: false } },
            config: { temperature: 0.5, maxTokens: 2000 },
            output_schema_version: 1,
            status: "experimental",
            change_log: "Placeholder - Phase 2",
            created_at: timestamp,
            updated_at: timestamp,
            created_by: adminId
        },
        {
            sub_agent_id: "compliance_v1_0_0",
            type: "compliance",
            version: "1.0.0",
            parent_version: null,
            agent_set_id: null,
            system_prompt: "Fact checking and compliance agent - to be implemented in Phase 2",
            model_provider: { llmText: { enabled: false } },
            config: { temperature: 0.2, maxTokens: 1500 },
            output_schema_version: 1,
            status: "experimental",
            change_log: "Placeholder - Phase 2",
            created_at: timestamp,
            updated_at: timestamp,
            created_by: adminId
        },
        {
            sub_agent_id: "evaluator_v1_0_0",
            type: "evaluator",
            version: "1.0.0",
            parent_version: null,
            agent_set_id: null,
            system_prompt: "Quality evaluator and KPI predictor - to be implemented in Phase 3",
            model_provider: { llmText: { enabled: false } },
            config: { temperature: 0.3, maxTokens: 1000 },
            output_schema_version: 1,
            status: "experimental",
            change_log: "Placeholder - Phase 3",
            created_at: timestamp,
            updated_at: timestamp,
            created_by: adminId
        },
        {
            sub_agent_id: "kpi_engine_v1_0_0",
            type: "kpi_engine",
            version: "1.0.0",
            parent_version: null,
            agent_set_id: null,
            system_prompt: "KPI optimization and evolution engine - to be implemented in Phase 4",
            model_provider: { llmText: { enabled: false } },
            config: { temperature: 0.1, maxTokens: 500 },
            output_schema_version: 1,
            status: "experimental",
            change_log: "Placeholder - Phase 4",
            created_at: timestamp,
            updated_at: timestamp,
            created_by: adminId
        }
    ];

    try {
        const batch = db.batch();

        subAgents.forEach(agent => {
            const docRef = db.collection(`projects/${projectId}/subAgents`).doc(agent.sub_agent_id);
            batch.set(docRef, agent);
            console.log(`  ✅ Queued: ${agent.type} (${agent.version}) - ${agent.status}`);
        });

        await batch.commit();
        console.log(`\n✨ Successfully created ${subAgents.length} sub-agents!\n`);

    } catch (error) {
        console.error("❌ Error creating sub-agents:", error);
        alert(`Failed to create sub-agents: ${error.message}`);
        return;
    }

    // =============================================
    // 2. Create Default AgentSet
    // =============================================
    console.log("📦 Step 2: Creating Default AgentSet...\n");

    const defaultAgentSet = {
        agent_set_id: "default_team_v1",
        name: "Default Marketing Team v1",
        description: "기본 소셜 미디어 콘텐츠 생성 팀 (Planner + Creator + Manager)",
        agent_set_version: "1.0.0",
        status: "active",
        active_sub_agents: {
            planner: "planner_v1_0_0",
            creator: "creator_v1_0_0",
            manager: "manager_v1_0_0",
            // Phase 2+ agents
            research: "research_v1_0_0",
            compliance: "compliance_v1_0_0",
            evaluator: "evaluator_v1_0_0",
            kpi_engine: "kpi_engine_v1_0_0"
        },
        kpi_model_version: null,
        created_at: timestamp,
        updated_at: timestamp
    };

    try {
        await db.collection(`projects/${projectId}/agentSets`)
            .doc(defaultAgentSet.agent_set_id)
            .set(defaultAgentSet);

        console.log(`  ✅ Created: ${defaultAgentSet.name}`);
        console.log(`     Version: ${defaultAgentSet.agent_set_version}`);
        console.log(`     Active Agents: ${Object.keys(defaultAgentSet.active_sub_agents).length}\n`);

    } catch (error) {
        console.error("❌ Error creating agentSet:", error);
        alert(`Failed to create agentSet: ${error.message}`);
        return;
    }

    // =============================================
    // 3. Verification
    // =============================================
    console.log("🔍 Step 3: Verifying installation...\n");

    try {
        const agentsSnapshot = await db.collection(`projects/${projectId}/subAgents`).get();
        const agentSetsSnapshot = await db.collection(`projects/${projectId}/agentSets`).get();

        console.log(`  ✅ SubAgents collection: ${agentsSnapshot.size} documents`);
        console.log(`  ✅ AgentSets collection: ${agentSetsSnapshot.size} documents\n`);

    } catch (error) {
        console.error("❌ Verification failed:", error);
    }

    console.log("==========================================");
    console.log("✨ Phase 1 Initialization Complete!");
    console.log("==========================================\n");
    console.log("Next steps:");
    console.log("1. Check Firebase Console to verify collections");
    console.log("2. Test creating a task with: createTestTask()");
    console.log("3. Run orchestration with: runAgentSetTask(taskId)\n");

    alert("✅ ZYNK AGENT OS Phase 1 initialized successfully!\n\nCheck console for details.");

})();

// createTestTask moved to orchestrator-phase1.js
