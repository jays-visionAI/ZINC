// ZYIC AGENT OS - Phase 1 Orchestration Engine
// Planner → Creator → Manager 순차 실행

(async function setupOrchestration() {
    console.log("🎯 ZYIC AGENT OS - Orchestration Engine");
    console.log("========================================\n");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found.");
        return;
    }

    const projectId = "default_project"; // TODO: Get from context

    // =============================================
    // Main Orchestration Function
    // =============================================
    window.runAgentSetTask = async function (taskId) {
        console.log(`\n🚀 Starting Task Execution: ${taskId}`);
        console.log("==========================================\n");

        try {
            // 1. Load Task
            const taskRef = db.collection(`projects/${projectId}/agentTasks`).doc(taskId);
            const taskDoc = await taskRef.get();

            if (!taskDoc.exists) {
                throw new Error(`Task ${taskId} not found`);
            }

            const task = { id: taskDoc.id, ...taskDoc.data() };
            console.log(`📋 Task loaded: ${task.input.user_prompt}\n`);

            // Update task status to running
            await taskRef.update({
                status: "running",
                current_step: "planner",
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Load AgentSet
            const agentSetDoc = await db.collection(`projects/${projectId}/agentSets`)
                .doc(task.agent_set_id)
                .get();

            if (!agentSetDoc.exists) {
                throw new Error(`AgentSet ${task.agent_set_id} not found`);
            }

            const agentSet = agentSetDoc.data();
            console.log(`🤖 AgentSet: ${agentSet.name} (v${agentSet.agent_set_version})\n`);

            // 3. Load Sub-Agents
            const activeAgents = agentSet.active_sub_agents;
            const subAgents = {};

            for (const [role, agentId] of Object.entries(activeAgents)) {
                const agentDoc = await db.collection(`projects/${projectId}/subAgents`)
                    .doc(agentId)
                    .get();

                if (agentDoc.exists) {
                    subAgents[role] = agentDoc.data();
                }
            }

            console.log(`✅ Loaded ${Object.keys(subAgents).length} sub-agents\n`);

            // =============================================
            // Dynamic Execution Pipeline (Category-based)
            // =============================================
            const EXECUTION_STAGES = ['planner', 'creator', 'manager'];
            const stageArtifacts = {
                planner: [],
                creator: [],
                manager: []
            };
            const allArtifacts = [];

            // Group agents by category
            const agentsByCategory = {
                planner: [],
                creator: [],
                manager: []
            };

            for (const [role, agent] of Object.entries(subAgents)) {
                // Fallback for legacy agents without category
                const category = agent.category || mapRoleToCategory(agent.type);
                if (agentsByCategory[category]) {
                    agentsByCategory[category].push(agent);
                }
            }

            // Execute Stages
            for (const stage of EXECUTION_STAGES) {
                console.log(`\n🎬 STAGE: ${stage.toUpperCase()}`);
                console.log("------------------------------------------");

                await taskRef.update({ current_step: stage });

                const stageAgents = agentsByCategory[stage];
                if (stageAgents.length === 0) {
                    console.log(`   (No agents found for ${stage}, skipping)`);
                    continue;
                }

                // Collect upstream artifacts (from previous stages)
                const upstreamArtifacts = allArtifacts;

                // Execute agents in this stage (Parallel execution possible here)
                // For now, we run them sequentially for clarity
                for (const agent of stageAgents) {
                    console.log(`   👉 Running ${agent.role} (${agent.sub_agent_id})...`);

                    const artifact = await executeSubAgent(
                        agent,
                        task,
                        upstreamArtifacts,
                        agentSet
                    );

                    await saveArtifact(projectId, artifact);
                    stageArtifacts[stage].push(artifact);
                    allArtifacts.push(artifact);

                    // Record Step for UI Visualization
                    const stepData = {
                        role: agent.role || agent.type,
                        sub_agent_id: agent.sub_agent_id,
                        sub_agent_version: agent.version,
                        status: 'success',
                        latency_ms: artifact.latency_ms,
                        input: artifact.input_prompt, // Capture the actual prompt used
                        output: artifact.data,
                        created_at: new Date().toISOString()
                    };

                    await taskRef.update({
                        steps: firebase.firestore.FieldValue.arrayUnion(stepData)
                    });
                }

                console.log(`✅ ${stage.toUpperCase()} stage completed (${stageAgents.length} agents)\n`);
            }

            // =============================================
            // Finalize Task
            // =============================================
            await taskRef.update({
                status: "success",
                current_step: "done",
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log("==========================================");
            console.log(`✨ Task ${taskId} completed successfully!`);
            console.log("==========================================\n");
            console.log("📦 Artifacts created:", allArtifacts.length);
            allArtifacts.forEach(a => console.log(`   - [${a.sub_agent_type}] ${a.artifact_id}`));

            return {
                success: true,
                taskId,
                artifacts: allArtifacts
            };

        } catch (error) {
            console.error("❌ Task execution failed:", error);

            await db.collection(`projects/${projectId}/agentTasks`).doc(taskId).update({
                status: "failed",
                error_message: error.message,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            throw error;
        }
    };

    // =============================================
    // Execute Sub-Agent (Mock Implementation)
    // =============================================
    // =============================================
    // Execute Sub-Agent (Real LLM Implementation)
    // =============================================
    async function executeSubAgent(subAgent, task, upstreamArtifacts, agentSet) {
        const startTime = Date.now();
        const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log(`  🤖 Executing: ${subAgent.type} (${subAgent.version})`);

        // 1. Prepare Context & Prompt
        // v2.0: Resolve Runtime Config dynamically
        let runtimeConfig;

        // Check if we have v2 metadata
        if (subAgent.roleTypeForRuntime || subAgent.role_type) {
            try {
                if (typeof RuntimeResolver !== 'undefined') {
                    runtimeConfig = await RuntimeResolver.resolveRuntimeConfig({
                        role_type: subAgent.roleTypeForRuntime || subAgent.role_type || subAgent.type,
                        language: subAgent.primaryLanguage || subAgent.primary_language || 'en',
                        tier: subAgent.preferredTier || subAgent.preferred_tier || 'balanced'
                    });
                    console.log(`     ✅ Resolved Config: ${runtimeConfig.provider}/${runtimeConfig.model_id}`);
                } else {
                    console.warn("     ⚠️ RuntimeResolver not found, falling back to legacy/mock");
                }
            } catch (e) {
                console.error("     ❌ Error resolving runtime config:", e);
            }
        }

        // Fallback to legacy ID or Mock if resolution failed
        const profileOrConfig = runtimeConfig || subAgent.runtime_profile_id || { provider: 'mock', model_id: 'mock-fallback' };

        // Construct User Prompt based on task and upstream artifacts
        let userPrompt = `Task: ${task.input.user_prompt}\n\n`;

        if (upstreamArtifacts.length > 0) {
            userPrompt += "Context from previous steps:\n";
            upstreamArtifacts.forEach(art => {
                userPrompt += `[${art.type}]: ${JSON.stringify(art.data, null, 2)}\n`;
            });
        }

        console.log(`     Profile: ${runtimeProfileId}`);
        console.log(`     Input Length: ${userPrompt.length} chars`);

        try {
            // 2. Call LLM Router
            const llmResult = await window.callLLM(profileOrConfig, {
                systemPrompt: subAgent.system_prompt,
                userPrompt: userPrompt,
                jsonMode: true // Force JSON for structured output
            });

            const execTime = Date.now() - startTime;
            console.log(`     ⏱️  Execution time: ${execTime}ms`);
            console.log(`     ✅ LLM Response:`, llmResult.parsedJson);

            // 3. Save AgentRun Log
            const agentRun = {
                run_id: runId,
                project_id: projectId,
                agent_set_id: agentSet.agent_set_id,
                sub_agent_id: subAgent.sub_agent_id,
                task_id: task.id,
                runtime_profile_id: (profileOrConfig.id || profileOrConfig.rule_id || 'dynamic'),
                provider: llmResult.provider,
                model: llmResult.model,
                input: {
                    system_prompt: subAgent.system_prompt || "",
                    user_prompt: userPrompt
                },
                output: llmResult.parsedJson,
                raw_output: llmResult.text,
                usage: llmResult.usage,
                latency_ms: execTime,
                status: 'success',
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection(`projects/${projectId}/agentRuns`).doc(runId).set(agentRun);
            console.log(`     📝 AgentRun logged: ${runId}`);

            // 4. Return Artifact
            return {
                artifact_id: `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                agent_set_id: agentSet.agent_set_id,
                agent_set_version: agentSet.agent_set_version,
                task_id: task.id,
                sub_agent_type: subAgent.type,
                sub_agent_id: subAgent.sub_agent_id,
                sub_agent_version: subAgent.version || "undefined",
                type: getArtifactType(subAgent.type),
                data: llmResult.parsedJson, // Use the parsed JSON from LLM
                run_id: runId, // Link to run log
                schema_version: 1,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                // Metadata for UI visualization (not strictly part of artifact schema but useful)
                latency_ms: execTime,
                input_prompt: userPrompt
            };

        } catch (error) {
            console.error(`     ❌ SubAgent Execution Failed:`, error);

            // Log failed run
            await db.collection(`projects/${projectId}/agentRuns`).doc(runId).set({
                run_id: runId,
                project_id: projectId,
                agent_set_id: agentSet.agent_set_id,
                sub_agent_id: subAgent.sub_agent_id,
                task_id: task.id,
                runtime_profile_id: (profileOrConfig.id || profileOrConfig.rule_id || 'dynamic'),
                status: 'failed',
                error: error.message,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            throw error;
        }
    }

    // =============================================
    // Mock Data Generators
    // =============================================
    function generateMockPlan(task) {
        return {
            goal: `${task.input.context?.target_platform || 'Social media'} 게시물 생성`,
            target_audience: task.input.context?.target_audience || "일반 사용자",
            tone: "친근하고 감성적",
            content_outline: [
                "주목을 끄는 Hook 문장",
                "핵심 메시지 전달",
                "행동 유도 (Call-to-Action)",
                "관련 해시태그 추가"
            ],
            strategy_notes: `사용자 요청: "${task.input.user_prompt}"`
        };
    }

    function generateMockContent(task, artifacts) {
        const plan = artifacts.find(a => a.type === "plan")?.data || {};

        return {
            title: "주말 서울 카페 추천 ☕",
            caption: `
주말엔 여기 어때요? 🌿

서울의 숨은 카페를 소개해드립니다.
조용하고 감성적인 분위기에서
따뜻한 커피 한 잔 어떠세요?

📍 위치: 성수동
⏰ 영업시간: 10:00 - 22:00

${plan.target_audience}에게 딱 맞는 공간입니다!
            `.trim(),
            hashtags: [
                "#서울카페",
                "#성수카페",
                "#주말데이트",
                "#카페추천",
                "#감성카페"
            ],
            generated_from_prompt: task.input.user_prompt
        };
    }

    function generateMockDecision(task, artifacts) {
        const content = artifacts.find(a => a.type === "draft_content");

        return {
            decision: "PASS",
            release_ready: true,
            quality_score: 8.5,
            comments: "콘텐츠가 전략에 잘 부합하며, 타겟 오디언스에게 적합합니다. 게시 가능합니다.",
            suggestions: [
                "이미지 추가 시 더욱 효과적일 것으로 예상됩니다.",
                "게시 최적 시간: 주말 오전 10-11시"
            ]
        };
    }

    function getArtifactType(agentType) {
        const typeMap = {
            planner: "plan",
            research: "research_data",
            creator: "draft_content",
            compliance: "compliance_check",
            evaluator: "quality_evaluation",
            manager: "final_decision",
            kpi_engine: "kpi_prediction"
        };
        return typeMap[agentType] || "unknown";
    }

    // =============================================
    // Save Artifact to Firestore
    // =============================================
    async function saveArtifact(projectId, artifact) {
        await db.collection(`projects/${projectId}/artifacts`)
            .doc(artifact.artifact_id)
            .set(artifact);

        console.log(`     💾 Saved artifact: ${artifact.artifact_id}`);
    }

    // =============================================
    // Helper: View Artifacts
    // =============================================
    window.viewTaskArtifacts = async function (taskId) {
        const artifacts = await db.collection(`projects/${projectId}/artifacts`)
            .where("task_id", "==", taskId)
            .get();

        console.log(`\n📦 Artifacts for task ${taskId}:`);
        console.log("==========================================\n");

        artifacts.forEach(doc => {
            const art = doc.data();
            console.log(`  ${art.sub_agent_type.toUpperCase()}:`);
            console.log(`     Type: ${art.type}`);
            console.log(`     Data:`, art.data);
            console.log("");
        });
    };

    console.log("✅ Orchestration engine loaded!");
    console.log("\nAvailable functions:");
    console.log("  - runAgentSetTask(taskId)");
    console.log("  - viewTaskArtifacts(taskId)");
    console.log("  - createTestTask() [from init script]\n");

    // =============================================
    // Helper: Map Role to Category (Legacy Support)
    // =============================================
    function mapRoleToCategory(role) {
        const map = {
            planner: 'planner',
            research: 'planner',
            seo_watcher: 'planner',

            creator: 'creator',
            creator_text: 'creator',
            creator_image: 'creator',
            creator_video: 'creator',

            manager: 'manager',
            compliance: 'manager',
            engagement: 'manager',
            evaluator: 'manager',
            kpi_engine: 'manager'
        };
        return map[role] || 'manager'; // Default to manager if unknown
    }

})();

// =============================================
// Helper: Create Test Task (Global Scope)
// =============================================
window.createTestTask = async function (agentSetId = "default_team_v1") {
    // Use the projectId from the closure if available, or default
    const targetProjectId = "default_project";
    const taskId = `task_${Date.now()}`;

    // Ensure db is available
    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' is not initialized. Cannot create task.");
        return;
    }

    // Fetch the AgentSet to get the current version
    let agentSetVersion = "1.0.0"; // fallback
    try {
        const agentSetDoc = await db.collection(`projects/${targetProjectId}/agentSets`).doc(agentSetId).get();
        if (agentSetDoc.exists) {
            agentSetVersion = agentSetDoc.data().agent_set_version || "1.0.0";
        } else {
            console.warn(`⚠️ AgentSet ${agentSetId} not found. Using default version.`);
        }
    } catch (error) {
        console.error("Error fetching AgentSet version:", error);
    }

    const task = {
        task_id: taskId,
        agent_set_id: agentSetId,
        agent_set_version: agentSetVersion,
        status: "queued",
        current_step: "planner",
        input: {
            user_prompt: "이번 주 주말 인스타그램에 올릴 서울 카페 추천 게시물을 만들어줘",
            context: {
                target_platform: "instagram",
                content_type: "post",
                target_audience: "20-30대"
            }
        },
        error_message: null,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(`projects/${targetProjectId}/agentTasks`).doc(taskId).set(task);
    console.log(`✅ Test task created: ${taskId}`);
    return taskId;
};
