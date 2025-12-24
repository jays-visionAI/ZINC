// services/agent-execution-service.js
// Service for executing Agent Team runs and generating content via LLM

(function () {
    'use strict';
    console.log("[AgentExecutionService] Initializing...");

    class AgentExecutionService {
        constructor() {
            this.db = firebase.firestore();

            // Execution stages for parallel workflow
            this.EXECUTION_STAGES = {
                PLANNING: {
                    name: 'planning',
                    roles: ['planner', '콘텐츠기획', '기획', 'research', '시장조사'],
                    parallel: false
                },
                CREATION: {
                    name: 'creation',
                    roles: ['creator_text', 'creator_image', 'creator_video', '텍스트생성', '이미지생성', '비디오생성'],
                    parallel: true  // 텍스트와 이미지 동시 생성
                },
                REVIEW: {
                    name: 'review',
                    roles: ['reviewer', 'compliance', '심의', 'manager', '총괄', '매니저'],
                    parallel: false
                }
            };

            // Memory Tier Limits by Subscription Plan
            this.MEMORY_TIER_LIMITS = {
                free: {
                    maxMemoryCount: 5,        // 최대 저장 개수
                    retentionDays: 30,        // 보존 기간 (일) - 모든 플랜 동일
                    maxContextSources: 3,     // 주입할 최대 소스 수
                    maxTokensPerSource: 500   // 소스당 최대 토큰
                },
                starter: {
                    maxMemoryCount: 10,
                    retentionDays: 30,
                    maxContextSources: 5,
                    maxTokensPerSource: 1000
                },
                pro: {
                    maxMemoryCount: 50,
                    retentionDays: 30,
                    maxContextSources: 10,
                    maxTokensPerSource: 2000
                },
                enterprise: {
                    maxMemoryCount: -1,       // Unlimited
                    retentionDays: 30,
                    maxContextSources: 20,
                    maxTokensPerSource: 5000
                }
            };
        }

        /**
         * Execute a full agent run
         * @param {string} runId - The AgentRun document ID
         * @param {string} projectId - Project ID
         * @param {string} [teamIdOverride] - Optional team ID override (if not in run document)
         * @param {string} [subAgentIdFilter] - Optional: If provided, only run this specific sub-agent
         * @returns {Promise<object>} - Execution result
         */
        async executeRun(runId, projectId, teamIdOverride = null, subAgentIdFilter = null) {
            console.log(`[AgentExecutionService] Starting execution for run: ${runId}`, { subAgentIdFilter });

            try {
                // 1. Update run status to 'running'
                await this._updateRunStatus(projectId, runId, 'running');

                // 2. Get run details
                const runDoc = await this.db.collection('projects')
                    .doc(projectId)
                    .collection('agentRuns')
                    .doc(runId)
                    .get();

                if (!runDoc.exists) {
                    throw new Error('Run not found');
                }

                const run = runDoc.data();
                const teamId = teamIdOverride || run.team_instance_id;

                // 2. Fetch team data
                console.log(`[AgentExecutionService] 2. Fetching team data: ${teamId}`);
                const teamDoc = await this.db.collection('projectAgentTeamInstances').doc(teamId).get();
                if (!teamDoc.exists) throw new Error('Team not found');
                const team = teamDoc.data();

                // 3. Fetch sub-agents
                console.log(`[AgentExecutionService] 3. Fetching sub-agents`);
                let subAgentsQuery = this.db.collection('projectAgentTeamInstances')
                    .doc(teamId)
                    .collection('subAgents');

                // If subAgentIdFilter is provided, only get that specific sub-agent
                const subAgentsSnapshot = await subAgentsQuery.get();

                let subAgents = [];
                subAgentsSnapshot.forEach(doc => subAgents.push({ id: doc.id, ...doc.data() }));

                // Filter to single sub-agent if specified
                if (subAgentIdFilter) {
                    subAgents = subAgents.filter(sa => sa.id === subAgentIdFilter);
                    console.log(`[AgentExecutionService] Filtered to specific sub-agent: ${subAgentIdFilter}`);

                    // For single sub-agent execution, use legacy sequential mode
                    return await this._executeSequential(projectId, runId, teamId, team, run, subAgents);
                }

                console.log(`[AgentExecutionService] Found ${subAgents.length} sub-agents to execute`);

                if (subAgents.length === 0) {
                    throw new Error('No sub-agents to execute');
                }

                // 4. Group sub-agents by stage
                const stagedAgents = this._groupAgentsByStage(subAgents);
                console.log(`[AgentExecutionService] 4. Grouped agents by stage:`,
                    Object.entries(stagedAgents).map(([k, v]) => `${k}: ${v.length}`));

                // 4.5 Load Brand Context (Phase 2: Brand Brain Sync)
                const brandContext = team.brandContext?.data || null;
                if (brandContext) {
                    console.log(`[AgentExecutionService] 📦 Brand Context loaded:`, {
                        brandName: brandContext.brandName,
                        voiceTone: brandContext.voiceTone,
                        keywords: brandContext.keywords?.length || 0
                    });
                } else {
                    console.log(`[AgentExecutionService] ⚠️ No Brand Context synced for this team`);
                }

                // 4.6 Load Knowledge Context (Phase 3: Knowledge Hub Integration)
                const tierLimits = await this._getUserTierLimits();
                const knowledgeContext = await this._loadKnowledgeContext(projectId, tierLimits);
                if (knowledgeContext.sources.length > 0) {
                    console.log(`[AgentExecutionService] 📚 Knowledge Context loaded:`, {
                        sourceCount: knowledgeContext.sources.length,
                        sources: knowledgeContext.sources.map(s => s.title)
                    });
                }

                // 4.7 Load Memory Context (Phase 3: Cross-Run Context)
                const memoryContext = await this._loadMemoryContext(projectId, tierLimits);
                if (memoryContext.memories.length > 0) {
                    console.log(`[AgentExecutionService] 🧠 Memory Context loaded:`, {
                        memoryCount: memoryContext.memories.length
                    });
                }

                // 5. Execute stages in order (with parallel support for creation stage)
                const results = [];
                const stageResults = [];

                // Load project-level teamDirective (Unified Brain architecture)
                const projectDoc = await this.db.collection('projects').doc(projectId).get();
                const projectData = projectDoc.data() || {};
                const teamDirective = projectData.teamDirective ||
                    team.active_directive?.summary ||
                    team.activeDirective || '';

                const executionContext = {
                    projectId,
                    teamDirective: teamDirective, // Use project-level first
                    customInstructions: run.custom_instructions,
                    brandContext: brandContext, // Phase 2: Brand Brain integration
                    knowledgeContext: knowledgeContext, // Phase 3: Knowledge Hub integration
                    memoryContext: memoryContext, // Phase 3: Cross-Run context
                    tierLimits: tierLimits, // User's tier-based limits
                    previousResults: results
                };

                // Stage 1: Planning (sequential)
                if (stagedAgents.planning.length > 0) {
                    console.log(`[AgentExecutionService] 📋 Stage 1: PLANNING (${stagedAgents.planning.length} agents)`);
                    const stageStart = Date.now();

                    for (const subAgent of stagedAgents.planning) {
                        await this._updateRunStep(projectId, runId, subAgent.id, subAgent.role_name || subAgent.role_type);

                        const result = await this._executeSubAgent(subAgent, executionContext);
                        results.push({
                            subAgentId: subAgent.id,
                            subAgentRole: subAgent.role_name || subAgent.role_type,
                            stage: 'planning',
                            ...result
                        });

                        await this.db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).update({
                            steps_completed: firebase.firestore.FieldValue.arrayUnion(subAgent.id)
                        });
                    }

                    stageResults.push({ stage: 'planning', duration_ms: Date.now() - stageStart, agents: stagedAgents.planning.length });
                    console.log(`[AgentExecutionService] ✅ Planning stage complete (${Date.now() - stageStart}ms)`);
                }

                // Stage 2: Creation (PARALLEL + MULTI-CHANNEL)
                if (stagedAgents.creation.length > 0) {
                    // Get target channels from run context (default to ['x'] if not specified)
                    const targetChannels = run.targetChannels || executionContext.targetChannels || ['x'];
                    console.log(`[AgentExecutionService] 🎨 Stage 2: CREATION - PARALLEL (${stagedAgents.creation.length} agents x ${targetChannels.length} channels)`);
                    const stageStart = Date.now();

                    // Update run status to show parallel execution
                    await this.db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).update({
                        current_stage: 'creation',
                        parallel_execution: true,
                        target_channels: targetChannels
                    });

                    // Execute all creation agents in parallel
                    // For text creators, we spawn one execution PER target channel
                    const parallelPromises = [];

                    for (const subAgent of stagedAgents.creation) {
                        const isTextCreator = subAgent.role_type === 'creator_text' || subAgent.role_type === 'writer';

                        if (isTextCreator && targetChannels.length > 0) {
                            // 🎯 MULTI-CHANNEL: Execute text creator once per target channel
                            for (const channel of targetChannels) {
                                parallelPromises.push((async () => {
                                    console.log(`[AgentExecutionService] ⚡ Starting parallel: ${subAgent.role_name} → ${channel.toUpperCase()}`);

                                    const result = await this._executeSubAgent(subAgent, {
                                        ...executionContext,
                                        previousResults: [...results],
                                        currentTargetChannel: channel, // 🎯 Specific channel for this execution
                                        targetChannels: targetChannels // All channels for context
                                    });

                                    return {
                                        subAgentId: subAgent.id,
                                        subAgentRole: subAgent.role_name || subAgent.role_type,
                                        stage: 'creation',
                                        targetChannel: channel, // 🏷️ Tag with target channel
                                        ...result
                                    };
                                })());
                            }
                        } else {
                            // Non-text creators (image, video) execute once
                            parallelPromises.push((async () => {
                                console.log(`[AgentExecutionService] ⚡ Starting parallel: ${subAgent.role_name}`);

                                const result = await this._executeSubAgent(subAgent, {
                                    ...executionContext,
                                    previousResults: [...results],
                                    targetChannels: targetChannels
                                });

                                return {
                                    subAgentId: subAgent.id,
                                    subAgentRole: subAgent.role_name || subAgent.role_type,
                                    stage: 'creation',
                                    ...result
                                };
                            })());
                        }
                    }

                    // Wait for all creation agents to complete
                    const creationResults = await Promise.all(parallelPromises);
                    results.push(...creationResults);

                    // Mark all as completed
                    for (const subAgent of stagedAgents.creation) {
                        await this.db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).update({
                            steps_completed: firebase.firestore.FieldValue.arrayUnion(subAgent.id)
                        });
                    }

                    stageResults.push({
                        stage: 'creation',
                        duration_ms: Date.now() - stageStart,
                        agents: stagedAgents.creation.length,
                        channels: targetChannels.length,
                        parallel: true
                    });
                    console.log(`[AgentExecutionService] ✅ Creation stage complete - PARALLEL (${Date.now() - stageStart}ms, ${creationResults.length} outputs)`);
                }

                // Stage 3: Review (sequential)
                if (stagedAgents.review.length > 0) {
                    console.log(`[AgentExecutionService] ✅ Stage 3: REVIEW (${stagedAgents.review.length} agents)`);
                    const stageStart = Date.now();

                    for (const subAgent of stagedAgents.review) {
                        await this._updateRunStep(projectId, runId, subAgent.id, subAgent.role_name || subAgent.role_type);

                        const result = await this._executeSubAgent(subAgent, {
                            ...executionContext,
                            previousResults: results
                        });
                        results.push({
                            subAgentId: subAgent.id,
                            subAgentRole: subAgent.role_name || subAgent.role_type,
                            stage: 'review',
                            ...result
                        });

                        await this.db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).update({
                            steps_completed: firebase.firestore.FieldValue.arrayUnion(subAgent.id)
                        });
                    }

                    stageResults.push({ stage: 'review', duration_ms: Date.now() - stageStart, agents: stagedAgents.review.length });
                    console.log(`[AgentExecutionService] ✅ Review stage complete (${Date.now() - stageStart}ms)`);
                }

                // 6. Save generated content
                const contentIds = await this._saveGeneratedContent(projectId, runId, teamId, results);

                // 6.5 Save to Memory (Phase 2: Memory Storage)
                await this._saveToMemory(projectId, runId, teamId, results, tierLimits);

                // 7. Update run as completed with stage info
                await this._updateRunStatus(projectId, runId, 'completed', {
                    completed_at: firebase.firestore.FieldValue.serverTimestamp(),
                    generated_content_ids: Array.isArray(contentIds) ? contentIds : [contentIds],
                    execution_mode: 'parallel',
                    stages: stageResults,
                    knowledge_sources_used: knowledgeContext.sources.length // Track knowledge usage
                });

                console.log(`[AgentExecutionService] ✅ Run completed successfully! (Parallel mode)`);
                return { success: true, contentIds, results, stages: stageResults };

            } catch (error) {
                console.error('[AgentExecutionService] ❌ Execution failed:', error);

                // Update run as failed
                await this._updateRunStatus(projectId, runId, 'failed', {
                    error: error.message,
                    completed_at: firebase.firestore.FieldValue.serverTimestamp()
                });

                return { success: false, error: error.message };
            }
        }

        /**
         * Group sub-agents by execution stage
         */
        _groupAgentsByStage(subAgents) {
            const stages = {
                planning: [],
                creation: [],
                review: [],
                other: []
            };

            for (const agent of subAgents) {
                const roleType = (agent.role_type || agent.role_name || '').toLowerCase();

                if (this.EXECUTION_STAGES.PLANNING.roles.some(r => roleType.includes(r))) {
                    stages.planning.push(agent);
                } else if (this.EXECUTION_STAGES.CREATION.roles.some(r => roleType.includes(r))) {
                    stages.creation.push(agent);
                } else if (this.EXECUTION_STAGES.REVIEW.roles.some(r => roleType.includes(r))) {
                    stages.review.push(agent);
                } else {
                    stages.other.push(agent);
                }
            }

            // Add 'other' agents to review stage
            stages.review.push(...stages.other);

            return stages;
        }

        /**
         * Legacy sequential execution (for single sub-agent runs)
         */
        async _executeSequential(projectId, runId, teamId, team, run, subAgents) {
            const results = [];

            for (let i = 0; i < subAgents.length; i++) {
                const subAgent = subAgents[i];
                await this._updateRunStep(projectId, runId, subAgent.id, subAgent.role_name || subAgent.role_type);

                const result = await this._executeSubAgent(subAgent, {
                    projectId,
                    // Note: For sequential mode, load project-level directive if available
                    teamDirective: team.active_directive?.summary || team.activeDirective,
                    customInstructions: run.custom_instructions,
                    previousResults: results
                });

                results.push({
                    subAgentId: subAgent.id,
                    subAgentRole: subAgent.role_name || subAgent.role_type,
                    ...result
                });

                await this.db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).update({
                    steps_completed: firebase.firestore.FieldValue.arrayUnion(subAgent.id)
                });
            }

            const contentId = await this._saveGeneratedContent(projectId, runId, teamId, results);

            await this._updateRunStatus(projectId, runId, 'completed', {
                completed_at: firebase.firestore.FieldValue.serverTimestamp(),
                generated_content_ids: [contentId],
                execution_mode: 'sequential'
            });

            console.log(`[AgentExecutionService] ✅ Run completed (Sequential mode)`);
            return { success: true, contentId, results };
        }

        /**
         * Execute a single sub-agent
         * Returns both input (prompts) and output for transparency
         */
        async _executeSubAgent(subAgent, context) {
            const baseSystemPrompt = subAgent.system_prompt || this._getDefaultPrompt(subAgent.role_type);

            // Phase 3: Inject Brand Context, Knowledge Context, AND Memory Context into System Prompt
            const systemPrompt = this._buildFullSystemPrompt(
                baseSystemPrompt,
                context.brandContext,
                context.knowledgeContext,
                context.memoryContext
            );
            const userMessage = this._buildUserMessage(subAgent.role_type, context);

            console.log(`[AgentExecutionService] 🤖 ${subAgent.role_name || subAgent.role_type}:`);
            console.log(`  📋 System Prompt: ${systemPrompt.substring(0, 150)}...`);
            console.log(`  💬 User Message: ${userMessage.substring(0, 100)}...`);
            if (context.brandContext) {
                console.log(`  🏷️ Brand: ${context.brandContext.brandName || 'N/A'}`);
            }
            if (context.knowledgeContext?.sources?.length > 0) {
                console.log(`  📚 Knowledge: ${context.knowledgeContext.sources.length} sources injected`);
            }
            if (context.memoryContext?.memories?.length > 0) {
                console.log(`  🧠 Memory: ${context.memoryContext.memories.length} previous runs referenced`);
            }

            // apiKey is handled by Cloud Function
            const response = await this._callOpenAI(systemPrompt, userMessage, null, context.projectId);

            console.log(`  ✅ Response: ${response.substring(0, 100)}...`);

            return {
                // Input (for transparency) - use null instead of undefined for Firestore
                input: {
                    system_prompt: systemPrompt || null,
                    user_message: userMessage || null,
                    team_directive: context.teamDirective || null,
                    custom_instructions: context.customInstructions || null,
                    brand_context_applied: !!context.brandContext // Track if brand context was used
                },
                // Output
                output: response,
                timestamp: new Date().toISOString()
            };
        }

        /**
         * Build System Prompt with Brand Context injection
         * This ensures AI follows brand guidelines during content generation
         */
        _buildSystemPromptWithBrandContext(basePrompt, brandContext) {
            if (!brandContext) {
                return basePrompt;
            }

            // Build brand guidelines section
            const brandSection = `
## Brand Guidelines (MUST FOLLOW)

### Brand Identity
- Brand Name: ${brandContext.brandName || 'Not specified'}
- Mission: ${brandContext.mission || 'Not specified'}
- Industry: ${brandContext.industry || 'Not specified'}
- Target Audience: ${brandContext.targetAudience || 'Not specified'}

### Voice & Tone
- Personality: ${brandContext.voiceTone?.join(', ') || 'Professional'}
- Writing Style: ${brandContext.writingStyle || 'Clear and engaging'}
- Tone Intensity: ${brandContext.toneIntensity ? (brandContext.toneIntensity * 100).toFixed(0) + '% formal' : 'Balanced'}

### Content Rules
✅ DO:
${brandContext.dos?.length > 0 ? brandContext.dos.map(d => `- ${d}`).join('\n') : '- Follow brand voice\n- Be authentic'}

❌ DON'T:
${brandContext.donts?.length > 0 ? brandContext.donts.map(d => `- ${d}`).join('\n') : '- Use inappropriate language\n- Go off-brand'}

### Focus & Keywords
- Current Focus: ${brandContext.currentFocus || 'General content'}
- Keywords to Include: ${brandContext.keywords?.length > 0 ? brandContext.keywords.join(', ') : 'None specified'}

---
`;

            // Combine brand section with base prompt
            return brandSection + '\n' + basePrompt;
        }

        /**
         * Build System Prompt with Brand Context, Knowledge Context, AND Memory Context
         * Phase 1-3: Full Context Integration
         */
        _buildFullSystemPrompt(basePrompt, brandContext, knowledgeContext, memoryContext = null) {
            let prompt = this._buildSystemPromptWithBrandContext(basePrompt, brandContext);

            // Add Knowledge Hub context if available
            if (knowledgeContext?.sources?.length > 0) {
                const knowledgeSection = `
## Reference Materials (from Knowledge Hub)
Use these materials as reference for accurate, on-brand content:

${knowledgeContext.sources.map((src, i) => `### ${i + 1}. ${src.title}
${src.summary || src.content || 'No content available'}
`).join('\n')}
---
`;
                prompt = knowledgeSection + prompt;
            }

            // Add Memory Context from previous runs if available
            if (memoryContext?.memories?.length > 0) {
                const memorySection = `
## Previous Work (Agent Memory)
Learn from these previous successful outputs for consistency:

${memoryContext.memories.map((mem, i) => `### Previous Run ${i + 1} (${mem.agent_role || 'Agent'})
${mem.summary.substring(0, 500)}${mem.summary.length > 500 ? '...' : ''}
`).join('\n')}
---
`;
                prompt = memorySection + prompt;
            }

            return prompt;
        }

        /**
         * Load Knowledge Context from Knowledge Hub sources
         * @param {string} projectId - Project ID
         * @param {object} tierLimits - User's tier limits
         * @returns {Promise<object>} Knowledge context with sources
         */
        async _loadKnowledgeContext(projectId, tierLimits) {
            try {
                console.log(`[AgentExecutionService] 📚 Loading Knowledge Context...`);

                // Query active knowledge sources
                const sourcesSnap = await this.db.collection('projects')
                    .doc(projectId)
                    .collection('knowledgeSources')
                    .where('status', '==', 'active')
                    .orderBy('updatedAt', 'desc')
                    .limit(tierLimits.maxContextSources)
                    .get();

                if (sourcesSnap.empty) {
                    console.log(`[AgentExecutionService] 📚 No active knowledge sources found`);
                    return { sources: [], summary: null };
                }

                const sources = [];
                sourcesSnap.forEach(doc => {
                    const data = doc.data();

                    // Extract summary or truncate content
                    let content = data.analysis?.summary || data.content || '';
                    if (content.length > tierLimits.maxTokensPerSource * 4) { // ~4 chars per token
                        content = content.substring(0, tierLimits.maxTokensPerSource * 4) + '...';
                    }

                    sources.push({
                        id: doc.id,
                        title: data.title || 'Untitled',
                        type: data.sourceType,
                        summary: content,
                        keyInsights: data.analysis?.keyInsights || []
                    });
                });

                console.log(`[AgentExecutionService] 📚 Loaded ${sources.length} knowledge sources`);

                return {
                    sources,
                    loadedAt: new Date().toISOString()
                };

            } catch (error) {
                console.error('[AgentExecutionService] Error loading knowledge context:', error);
                return { sources: [], error: error.message };
            }
        }

        /**
         * Get user's subscription tier and memory limits
         * @param {string} userId - User ID (optional, uses current user if not provided)
         * @returns {Promise<object>} Tier limits
         */
        async _getUserTierLimits(userId = null) {
            try {
                const uid = userId || firebase.auth().currentUser?.uid;
                if (!uid) {
                    console.warn('[AgentExecutionService] No user ID, using free tier limits');
                    return this.MEMORY_TIER_LIMITS.free;
                }

                const userDoc = await this.db.collection('users').doc(uid).get();
                if (!userDoc.exists) {
                    return this.MEMORY_TIER_LIMITS.free;
                }

                const userData = userDoc.data();
                const plan = (userData.plan || userData.subscription?.plan || 'free').toLowerCase();

                console.log(`[AgentExecutionService] 👤 User plan: ${plan}`);

                return this.MEMORY_TIER_LIMITS[plan] || this.MEMORY_TIER_LIMITS.free;

            } catch (error) {
                console.error('[AgentExecutionService] Error getting user tier:', error);
                return this.MEMORY_TIER_LIMITS.free;
            }
        }

        /**
         * Save execution results to Memory Store (Phase 2)
         * @param {string} projectId - Project ID
         * @param {string} runId - Run ID
         * @param {string} teamId - Team ID
         * @param {Array} results - Execution results
         * @param {object} tierLimits - User's tier limits
         */
        async _saveToMemory(projectId, runId, teamId, results, tierLimits) {
            try {
                console.log(`[AgentExecutionService] 💾 Saving to Memory...`);

                // Extract key insights from results (use reviewer/final output)
                const finalResult = results.find(r =>
                    r.stage === 'review' ||
                    r.subAgentRole?.toLowerCase().includes('review')
                ) || results[results.length - 1];

                if (!finalResult?.output) {
                    console.log(`[AgentExecutionService] 💾 No output to save to memory`);
                    return;
                }

                // Create memory entry
                const memoryRef = this.db.collection('projects')
                    .doc(projectId)
                    .collection('agentMemory');

                const memoryData = {
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    run_id: runId,
                    team_id: teamId,
                    memory_type: 'execution_result',
                    content: {
                        summary: finalResult.output.substring(0, 1000), // Truncate for storage
                        agent_role: finalResult.subAgentRole,
                        stage: finalResult.stage || 'unknown',
                        full_output_preview: finalResult.output.substring(0, 500)
                    },
                    relevance_score: 1.0, // New memories start with high relevance
                    usage_count: 0,
                    is_active: true,
                    expires_at: this._calculateExpiryDate(tierLimits.retentionDays)
                };

                await memoryRef.add(memoryData);
                console.log(`[AgentExecutionService] 💾 Memory saved (retention: ${tierLimits.retentionDays} days)`);

                // Cleanup old memories based on tier limits
                await this._cleanupOldMemories(projectId, tierLimits);

            } catch (error) {
                console.error('[AgentExecutionService] Error saving to memory:', error);
                // Don't throw - memory save failure shouldn't break execution
            }
        }

        /**
         * Calculate expiry date based on retention days
         */
        _calculateExpiryDate(retentionDays) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + retentionDays);
            return firebase.firestore.Timestamp.fromDate(expiryDate);
        }

        /**
         * Cleanup old memories based on tier limits
         * @param {string} projectId - Project ID
         * @param {object} tierLimits - User's tier limits
         */
        async _cleanupOldMemories(projectId, tierLimits) {
            try {
                const memoryRef = this.db.collection('projects')
                    .doc(projectId)
                    .collection('agentMemory');

                // 1. Delete expired memories
                const now = firebase.firestore.Timestamp.now();
                const expiredSnap = await memoryRef
                    .where('expires_at', '<=', now)
                    .limit(10)
                    .get();

                if (!expiredSnap.empty) {
                    const batch = this.db.batch();
                    expiredSnap.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                    console.log(`[AgentExecutionService] 🗑️ Deleted ${expiredSnap.size} expired memories`);
                }

                // 2. Enforce max memory count (if not unlimited)
                if (tierLimits.maxMemoryCount > 0) {
                    const countSnap = await memoryRef
                        .orderBy('created_at', 'desc')
                        .get();

                    if (countSnap.size > tierLimits.maxMemoryCount) {
                        const toDelete = countSnap.docs.slice(tierLimits.maxMemoryCount);
                        const deleteBatch = this.db.batch();
                        toDelete.forEach(doc => deleteBatch.delete(doc.ref));
                        await deleteBatch.commit();
                        console.log(`[AgentExecutionService] 🗑️ Deleted ${toDelete.length} memories (over limit)`);
                    }
                }

            } catch (error) {
                console.error('[AgentExecutionService] Error cleaning up memories:', error);
            }
        }

        /**
         * Load Memory Context from previous runs (Phase 3: Cross-Run Context)
         * @param {string} projectId - Project ID
         * @param {object} tierLimits - User's tier limits
         * @returns {Promise<object>} Memory context with recent runs
         */
        async _loadMemoryContext(projectId, tierLimits) {
            try {
                console.log(`[AgentExecutionService] 🧠 Loading Memory Context...`);

                const memoryRef = this.db.collection('projects')
                    .doc(projectId)
                    .collection('agentMemory');

                // Query recent active memories
                const memoriesSnap = await memoryRef
                    .where('is_active', '==', true)
                    .orderBy('created_at', 'desc')
                    .limit(Math.min(5, tierLimits.maxContextSources)) // Use up to 5 recent memories
                    .get();

                if (memoriesSnap.empty) {
                    console.log(`[AgentExecutionService] 🧠 No previous memories found`);
                    return { memories: [] };
                }

                const memories = [];
                memoriesSnap.forEach(doc => {
                    const data = doc.data();
                    memories.push({
                        id: doc.id,
                        run_id: data.run_id,
                        summary: data.content?.summary || '',
                        agent_role: data.content?.agent_role,
                        created_at: data.created_at?.toDate?.()?.toISOString() || 'Unknown'
                    });

                    // Update usage count
                    doc.ref.update({
                        usage_count: firebase.firestore.FieldValue.increment(1),
                        last_used_at: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(() => { }); // Ignore update errors
                });

                console.log(`[AgentExecutionService] 🧠 Loaded ${memories.length} memories from previous runs`);

                return {
                    memories,
                    loadedAt: new Date().toISOString()
                };

            } catch (error) {
                console.error('[AgentExecutionService] Error loading memory context:', error);
                return { memories: [], error: error.message };
            }
        }

        /**
         * Call OpenAI API via Firebase Cloud Functions
         * This avoids CORS issues by proxying through the backend
         */
        async _callOpenAI(systemPrompt, userMessage, apiKey = null, projectId = null) {
            // Check environment
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            // Try Cloud Functions first (skip on localhost to avoid hanging)
            if (!isLocal && typeof firebase.functions === 'function') {
                try {
                    console.log('[AgentExecutionService] ☁️ Trying Cloud Function...');
                    const callOpenAI = firebase.functions().httpsCallable('callOpenAI');

                    const payload = {
                        provider: 'openai',
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userMessage }
                        ],
                        temperature: 0.7,
                        maxTokens: 1000
                    };

                    const result = await callOpenAI(payload);

                    if (result.data.success) {
                        return result.data.content;
                    } else {
                        throw new Error(result.data.error || 'Cloud Function returned failure');
                    }
                } catch (error) {
                    console.warn('[AgentExecutionService] ⚠️ Cloud Function failed, attempting direct fallback:', error);
                    // Continue to fallback
                }
            }

            // Fallback: Direct API call
            return this._directApiCall(systemPrompt, userMessage, apiKey, projectId);
        }

        /**
         * Direct API call helper (Fallback)
         */
        async _directApiCall(systemPrompt, userMessage, apiKey = null, projectId = null) {
            console.log('[AgentExecutionService] 🔌 Using Direct API Fallback...');

            // Try to get API key if not provided
            if (!apiKey) {
                try {
                    // 1. Try using LLMProviderService (recommended - searches all providers)
                    if (window.LLMProviderService) {
                        console.log('[AgentExecutionService] Looking for API key via LLMProviderService...');
                        const providers = await window.LLMProviderService.getProviders();
                        console.log('[AgentExecutionService] Providers found:', providers.length, providers.map(p => ({
                            id: p.id,
                            provider: p.provider,
                            name: p.name,
                            status: p.status,
                            hasApiKey: !!(p.apiKey || p.api_key || p.credentialRef?.apiKeyEncrypted)
                        })));

                        // Helper function to extract API key from various possible locations
                        const extractApiKey = (provider) => {
                            return provider.apiKey ||
                                provider.api_key ||
                                provider.credentialRef?.apiKeyEncrypted ||
                                provider.credentialRef?.apiKey;
                        };

                        // Find active OpenAI provider
                        for (const provider of providers) {
                            const isOpenAI = provider.provider?.toLowerCase() === 'openai' ||
                                provider.name?.toLowerCase().includes('openai');

                            console.log(`[AgentExecutionService] Checking provider: ${provider.name || provider.id}`, { isOpenAI, status: provider.status });

                            if (isOpenAI && provider.status === 'active') {
                                const key = extractApiKey(provider);
                                if (key) {
                                    apiKey = key;
                                    console.log('[AgentExecutionService] ✓ Found active OpenAI key from Admin LLM Providers');
                                    break;
                                }
                            }
                        }

                        // If no active found, try any OpenAI
                        if (!apiKey) {
                            for (const provider of providers) {
                                const isOpenAI = provider.provider?.toLowerCase() === 'openai';
                                if (isOpenAI) {
                                    const key = extractApiKey(provider);
                                    if (key) {
                                        apiKey = key;
                                        console.log('[AgentExecutionService] ✓ Found OpenAI key (non-active status)');
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        console.warn('[AgentExecutionService] LLMProviderService not available!');
                    }

                    // 2. Fallback: Direct query to systemLLMProviders
                    if (!apiKey) {
                        console.log('[AgentExecutionService] Fallback: Direct systemLLMProviders query...');
                        const sysCredSnap = await this.db.collection('systemLLMProviders').get();
                        console.log('[AgentExecutionService] Direct query found:', sysCredSnap.size, 'documents');

                        for (const doc of sysCredSnap.docs) {
                            const data = doc.data();
                            const key = data.apiKey || data.api_key || data.credentialRef?.apiKeyEncrypted || data.credentialRef?.apiKey;
                            console.log('[AgentExecutionService] Document:', doc.id, { provider: data.provider, hasApiKey: !!key });
                            if (data.provider?.toLowerCase() === 'openai') {
                                if (key) {
                                    apiKey = key;
                                    console.log('[AgentExecutionService] ✓ Found key via direct query');
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error("[AgentExecutionService] Failed to fetch API key:", e);
                }
            }

            if (!apiKey) {
                // If running locally and no API key, return a mock response for testing
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.warn('[AgentExecutionService] ⚠️ No API Key found. Returning MOCK response for local testing.');
                    return `[MOCK RESPONSE] This is a generated response for testing purposes.
                    
Role: ${systemPrompt.includes('planner') ? 'Planner' : 'Agent'}
Context: Local Development Environment

The agent has successfully processed the request and generated this placeholder content to verify the execution flow.`;
                }

                throw new Error("Cloud Function failed and no API Key found in Settings for fallback.");
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API Error: ${errorData.error?.message || response.status}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || 'No response generated';
        }

        /**
         * Build user message based on role type
         * Now supports multi-channel targeting for Creator agents
         */
        _buildUserMessage(roleType, context) {
            const directive = context.teamDirective || 'Create engaging content';
            const customInstructions = context.customInstructions || '';
            const previousOutputs = context.previousResults.map(r => `[${r.subAgentRole}]: ${r.output}`).join('\n\n');

            // Multi-channel support: Get target channel from context
            const targetChannel = context.currentTargetChannel || 'x'; // Default to X/Twitter
            const allTargetChannels = context.targetChannels || ['x'];

            // Channel-specific formatting instructions
            const CHANNEL_FORMATS = {
                'x': {
                    name: 'X (Twitter)',
                    charLimit: 280,
                    style: 'Concise, punchy, with relevant hashtags. Max 280 characters.',
                    hashtagStyle: 'Use 2-3 relevant hashtags at the end.'
                },
                'instagram': {
                    name: 'Instagram',
                    charLimit: 2200,
                    style: 'Engaging caption with emojis, storytelling approach. Can be longer and more personal.',
                    hashtagStyle: 'Use 5-10 relevant hashtags, can be in a separate comment or at the end.'
                },
                'linkedin': {
                    name: 'LinkedIn',
                    charLimit: 3000,
                    style: 'Professional tone, industry insights, thought leadership. Use line breaks for readability.',
                    hashtagStyle: 'Use 3-5 professional hashtags.'
                },
                'facebook': {
                    name: 'Facebook',
                    charLimit: 63206,
                    style: 'Conversational, community-oriented, can include questions to encourage engagement.',
                    hashtagStyle: 'Minimal hashtags, focus on organic engagement.'
                },
                'youtube': {
                    name: 'YouTube',
                    charLimit: 5000,
                    style: 'Descriptive, SEO-friendly, include timestamps if applicable.',
                    hashtagStyle: 'Use 3-5 relevant hashtags.'
                },
                'tiktok': {
                    name: 'TikTok',
                    charLimit: 2200,
                    style: 'Trendy, fun, use popular sounds/trends references. Short and catchy.',
                    hashtagStyle: 'Use trending hashtags and challenges if relevant.'
                }
            };

            const channelConfig = CHANNEL_FORMATS[targetChannel] || CHANNEL_FORMATS['x'];

            switch (roleType) {
                case 'planner':
                    // Planner knows about ALL target channels to create a unified strategy
                    const channelList = allTargetChannels.map(ch => CHANNEL_FORMATS[ch]?.name || ch).join(', ');
                    return `Team Directive: ${directive}\n\nCustom Instructions: ${customInstructions}\n\nTarget Channels: ${channelList}\n\nCreate a unified content strategy that can be adapted to each target channel. Include:\n1. Core message/theme\n2. Key points to emphasize\n3. Target audience insights\n4. Tone and style guidelines`;

                case 'writer':
                case 'creator_text':
                    // Creator Text generates for a SPECIFIC channel
                    return `Team Directive: ${directive}\n\nPrevious Planning:\n${previousOutputs}\n\n🎯 TARGET CHANNEL: ${channelConfig.name}\n\nFORMATTING REQUIREMENTS:\n- Character Limit: ${channelConfig.charLimit}\n- Style: ${channelConfig.style}\n- Hashtags: ${channelConfig.hashtagStyle}\n\nWrite engaging content optimized for ${channelConfig.name}. Make it ready to publish.`;

                case 'reviewer':
                    return `Team Directive: ${directive}\n\nContent to Review:\n${previousOutputs}\n\nReview the content and suggest improvements. Ensure it aligns with the directive and is appropriate for the target platform.`;

                case 'publisher':
                case 'engagement':
                    return `Team Directive: ${directive}\n\nFinal Content:\n${previousOutputs}\n\nFormat this content for ${channelConfig.name}. ${channelConfig.style}\n${channelConfig.hashtagStyle}`;

                default:
                    return `Team Directive: ${directive}\n\nCustom Instructions: ${customInstructions}\n\nPrevious Context:\n${previousOutputs}\n\nPerform your role and generate output.`;
            }
        }

        /**
         * Get default prompt for a role type
         */
        _getDefaultPrompt(roleType) {
            const prompts = {
                'planner': 'You are a strategic content planner. Create detailed content plans that align with brand goals.',
                'writer': 'You are a creative content writer. Write engaging, on-brand content.',
                'creator_text': 'You are a creative content writer. Write engaging, on-brand content.',
                'reviewer': 'You are a content quality reviewer. Ensure content is accurate, engaging, and on-brand.',
                'publisher': 'You are a social media publisher. Format content for specific platforms.',
                'engagement': 'You are a social media manager. Optimize content for engagement.',
                'research': 'You are a market researcher. Gather relevant information and insights.',
                'compliance': 'You are a compliance officer. Ensure content meets guidelines and regulations.'
            };
            return prompts[roleType] || 'You are a helpful AI assistant.';
        }

        /**
         * Get API key from Admin LLM Providers (systemLLMProviders)
         * NOTE: This is separate from User's Channel API credentials
         */
        async _getApiKey(projectId) {
            console.log('[AgentExecutionService] Looking for LLM API key...');

            try {
                const user = firebase.auth().currentUser;
                if (!user) {
                    console.error('[AgentExecutionService] No user logged in!');
                    return null;
                }

                // ★ Method 1: Use LLMProviderService (Admin's LLM Providers - recommended)
                if (window.LLMProviderService) {
                    console.log('[AgentExecutionService] Using LLMProviderService (Admin LLM Providers)...');
                    try {
                        const providers = await window.LLMProviderService.getProviders();
                        console.log('[AgentExecutionService] Found', providers.length, 'LLM providers');

                        // Find active OpenAI provider
                        for (const provider of providers) {
                            console.log('[AgentExecutionService] Checking LLM provider:', provider.name, '|', provider.provider, '| status:', provider.status);

                            // Match OpenAI (case insensitive)
                            const isOpenAI = provider.provider?.toLowerCase() === 'openai' ||
                                provider.name?.toLowerCase().includes('openai');

                            if (isOpenAI && provider.status === 'active') {
                                const key = provider.apiKey || provider.api_key;
                                if (key) {
                                    console.log('[AgentExecutionService] ✓ Found active OpenAI key from Admin LLM Providers');
                                    return key;
                                }
                            }
                        }

                        // If no active found, try any OpenAI
                        for (const provider of providers) {
                            const isOpenAI = provider.provider?.toLowerCase() === 'openai';
                            if (isOpenAI) {
                                const key = provider.apiKey || provider.api_key;
                                if (key) {
                                    console.log('[AgentExecutionService] ✓ Found OpenAI key (non-active)');
                                    return key;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('[AgentExecutionService] LLMProviderService failed:', e.message);
                    }
                } else {
                    console.warn('[AgentExecutionService] LLMProviderService not loaded! Make sure llm-provider-service.js is included.');
                }

                // ★ Method 2: Direct Firestore query as fallback
                console.log('[AgentExecutionService] Fallback: Direct systemLLMProviders query...');
                try {
                    const sysCredSnap = await this.db.collection('systemLLMProviders')
                        .get();

                    for (const doc of sysCredSnap.docs) {
                        const data = doc.data();
                        console.log('[AgentExecutionService] Direct query - provider:', data.provider, data.name);
                        if (data.provider?.toLowerCase() === 'openai') {
                            const key = data.apiKey || data.api_key;
                            if (key) {
                                console.log('[AgentExecutionService] ✓ Found key via direct query');
                                return key;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[AgentExecutionService] Direct query failed:', e.message);
                }

                // Method 3: project-level credentials
                console.log('[AgentExecutionService] Checking project credentials...');
                try {
                    const projectCredSnap = await this.db.collection('projects')
                        .doc(projectId)
                        .collection('credentials')
                        .limit(5)
                        .get();

                    for (const doc of projectCredSnap.docs) {
                        const data = doc.data();
                        if (data.provider?.toLowerCase() === 'openai') {
                            const key = data.api_key || data.apiKey;
                            if (key) {
                                console.log('[AgentExecutionService] ✓ Found key in project credentials');
                                return key;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[AgentExecutionService] project credentials query failed:', e.message);
                }

                // Method 4: localStorage (for quick testing)
                const localKey = localStorage.getItem('openai_api_key');
                if (localKey) {
                    console.log('[AgentExecutionService] ✓ Found key in localStorage (testing mode)');
                    return localKey;
                }

                console.error('[AgentExecutionService] ❌ No API key found in any location!');
                console.log('[AgentExecutionService] 💡 Quick fix: Run this in console:');
                console.log('   localStorage.setItem("openai_api_key", "sk-your-api-key-here")');
                return null;

            } catch (error) {
                console.error('[AgentExecutionService] Error getting API key:', error);
                return null;
            }
        }

        /**
         * Update run status
         */
        async _updateRunStatus(projectId, runId, status, additionalData = {}) {
            await this.db.collection('projects')
                .doc(projectId)
                .collection('agentRuns')
                .doc(runId)
                .update({
                    status,
                    ...(status === 'running' && { started_at: firebase.firestore.FieldValue.serverTimestamp() }),
                    ...additionalData
                });
        }

        /**
         * Update current step
         */
        async _updateRunStep(projectId, runId, stepId, stepName) {
            await this.db.collection('projects')
                .doc(projectId)
                .collection('agentRuns')
                .doc(runId)
                .update({
                    current_step: stepId,
                    current_step_name: stepName
                });
        }

        /**
         * Save generated content - saves each sub-agent's output as individual content
         * Now includes targetChannel for multi-channel content and prompt_metadata for transparency
         */
        async _saveGeneratedContent(projectId, runId, teamId, results) {
            const contentIds = [];

            for (const result of results) {
                // Determine content type based on sub-agent role
                const contentType = this._getContentType(result.subAgentRole);

                // Save ALL agent outputs (including meta agents like planner, reviewer)
                // Meta outputs are internal (not publishable) but should still be viewable
                const isMetaContent = contentType === 'meta';

                // NEW: content_category for UI filtering
                const contentCategory = isMetaContent ? 'work_log' : 'publishable';

                // 🎯 MULTI-CHANNEL: Determine platform from targetChannel
                const targetChannel = result.targetChannel || null;
                const platformMap = {
                    'x': 'X',
                    'instagram': 'Instagram',
                    'linkedin': 'LinkedIn',
                    'facebook': 'Facebook',
                    'youtube': 'YouTube',
                    'tiktok': 'TikTok'
                };
                const platform = isMetaContent ? 'internal' : (platformMap[targetChannel] || 'X');

                const contentDoc = await this.db.collection('projects')
                    .doc(projectId)
                    .collection('generatedContents')
                    .add({
                        run_id: runId,
                        team_instance_id: teamId,
                        sub_agent_id: result.subAgentId,
                        sub_agent_role: result.subAgentRole,
                        content_type: contentType,  // 'text', 'image', 'video', 'meta'
                        content_category: contentCategory,  // NEW: 'publishable' or 'work_log'
                        is_meta: isMetaContent,     // Flag for meta content (not publishable)
                        execution_stage: result.stage || null,  // NEW: 'planning', 'creation', 'review'
                        platform: platform,
                        target_channel: targetChannel,  // 🆕 Raw channel identifier
                        status: isMetaContent ? 'complete' : 'pending',
                        title: this._generateContentTitle(result.subAgentRole),
                        description: result.subAgentRole,
                        preview_text: result.output?.substring(0, 280) || '',
                        content_text: result.output || '',
                        // 🔍 PROMPT TRANSPARENCY: Full prompt metadata for inspection
                        prompt_metadata: result.input || null,
                        created_at: firebase.firestore.FieldValue.serverTimestamp()
                    });

                contentIds.push(contentDoc.id);
            }

            // If no content was created (only meta agents), save final combined output
            if (contentIds.length === 0 && results.length > 0) {
                const finalOutput = results[results.length - 1];
                const contentDoc = await this.db.collection('projects')
                    .doc(projectId)
                    .collection('generatedContents')
                    .add({
                        run_id: runId,
                        team_instance_id: teamId,
                        content_type: 'text',
                        content_category: 'publishable',  // NEW
                        platform: 'X',
                        status: 'pending',
                        title: 'Generated Post',
                        description: 'Combined output from all agents',
                        preview_text: finalOutput?.output?.substring(0, 280) || '',
                        content_text: finalOutput?.output || '',
                        full_generation_log: results,
                        created_at: firebase.firestore.FieldValue.serverTimestamp()
                    });
                contentIds.push(contentDoc.id);
            }

            return contentIds;  // Return all IDs instead of just first
        }

        /**
         * Determine content type from sub-agent role
         */
        _getContentType(role) {
            const roleLower = (role || '').toLowerCase();

            // Publishable content types
            if (roleLower.includes('image') || roleLower.includes('creator_image') || roleLower.includes('visual')) {
                return 'image';
            }
            if (roleLower.includes('video')) {
                return 'video';
            }
            if (roleLower.includes('creator_text') || roleLower.includes('텍스트생성')) {
                return 'text';
            }

            // Meta content types (internal, not publishable)
            if (roleLower.includes('planner') || roleLower.includes('기획') ||
                roleLower.includes('reviewer') || roleLower.includes('심의') ||
                roleLower.includes('research') || roleLower.includes('조사') ||
                roleLower.includes('manager') || roleLower.includes('총괄') || roleLower.includes('매니저') ||
                roleLower.includes('analytics') || roleLower.includes('지표') ||
                roleLower.includes('seo') || roleLower.includes('모니터링') ||
                roleLower.includes('knowledge') || roleLower.includes('브랜드') || roleLower.includes('지식')) {
                return 'meta';
            }

            return 'text';  // Default to text if unrecognized
        }

        /**
         * Generate content title from role
         */
        _generateContentTitle(role) {
            const roleLower = (role || '').toLowerCase();

            // Publishable content
            if (roleLower.includes('image') || roleLower.includes('creator_image')) return '🖼️ Generated Image';
            if (roleLower.includes('video')) return '🎬 Generated Video';
            if (roleLower.includes('text') || roleLower.includes('writer') || roleLower.includes('creator_text')) return '📝 Generated Text';

            // Meta content (internal, not publishable)
            if (roleLower.includes('planner') || roleLower.includes('기획')) return '📋 Content Plan';
            if (roleLower.includes('research') || roleLower.includes('시장조사')) return '🔍 Market Research';
            if (roleLower.includes('reviewer') || roleLower.includes('심의') || roleLower.includes('compliance')) return '✅ Compliance Review';
            if (roleLower.includes('manager') || roleLower.includes('총괄') || roleLower.includes('매니저')) return '👔 Manager Summary';
            if (roleLower.includes('analytics') || roleLower.includes('지표')) return '📊 Analytics Report';
            if (roleLower.includes('seo') || roleLower.includes('모니터링')) return '🔎 SEO Analysis';
            if (roleLower.includes('knowledge') || roleLower.includes('브랜드') || roleLower.includes('지식')) return '📚 Brand Knowledge';

            return '📄 Agent Output';
        }
    }

    // Export singleton
    window.AgentExecutionService = new AgentExecutionService();

})();
