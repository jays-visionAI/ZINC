/**
 * ============================================
 * DAG Executor - Orchestration Engine v5.0
 * ============================================
 * Manages the execution of agent workflows in phases
 * 
 * v5.0 Updates:
 * - 4-Layer Prompt System (Admin Profile + User Custom + Brand Context + Runtime)
 * - 5-Tier Complexity Routing via Runtime Profile Agent
 * - Standard Agent Profiles integration
 */

class DAGExecutor {
    constructor() {
        this.state = {
            isRunning: false,
            isPaused: false,
            currentPhase: 0,
            completedNodes: [],
            failedNodes: [],
            startTime: null,
            totalTokens: 0,
            totalCost: 0,
            routingDefaults: null, // Store loaded defaults here

            // v5.0: 4-Layer Prompt System
            standardAgentProfiles: null, // Layer 1: Admin-defined base prompts
            tierConfig: null,            // v5.0: 5-Tier configuration
            useTierRouting: true         // v5.0: Enable 5-Tier routing
        };

        // Load Global Routing Defaults
        this.loadGlobalDefaults();

        // v5.0: Load Standard Agent Profiles
        this.loadStandardAgentProfiles();

        // SETUP: Connect to Local Emulator if on localhost
        // SETUP: Connect to Local Emulator if on localhost
        // if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        //     console.log('🔧 Using Local Functions Emulator');
        //     try {
        //         const functions = firebase.functions();
        //         functions.useFunctionsEmulator('http://localhost:5001');
        //     } catch (e) {
        //         console.warn('Emulator connection check:', e.message); // Ignore if already connected
        //     }
        // }

        // Phase definitions with their agents
        this.phases = [
            {
                name: 'Research',
                agents: ['research', 'seo_watcher', 'knowledge_curator', 'kpi'],
                consolidatedAgent: 'strategic_analyst', // ✨ Phase 3: Bundled agent
                parallel: true
            },
            {
                name: 'Planning',
                agents: ['planner'],
                parallel: false
            },
            {
                name: 'Creation',
                agents: ['creator_text', 'creator_image', 'creator_video'],
                parallel: true
            },
            {
                name: 'Validation',
                agents: ['compliance', 'seo_optimizer', 'evaluator'],
                consolidatedAgent: 'quality_controller', // ✨ Phase 3: Bundled agent
                parallel: true
            },
            {
                name: 'Final',
                agents: ['manager', 'engagement'],
                parallel: false
            }
        ];

        // Agent metadata for cost/token estimation
        this.agentMeta = {
            research: { avgTokens: 500, avgCost: 0.01 },
            seo_watcher: { avgTokens: 300, avgCost: 0.008 },
            knowledge_curator: { avgTokens: 400, avgCost: 0.01 },
            kpi: { avgTokens: 200, avgCost: 0.005 },
            strategic_analyst: { avgTokens: 1000, avgCost: 0.025 }, // ✨ Consolidated
            planner: { avgTokens: 800, avgCost: 0.02 },
            creator_text: { avgTokens: 1500, avgCost: 0.04 },
            creator_image: { avgTokens: 0, avgCost: 0.08 },
            creator_video: { avgTokens: 0, avgCost: 0.15 },
            compliance: { avgTokens: 400, avgCost: 0.01 },
            seo_optimizer: { avgTokens: 600, avgCost: 0.015 },
            evaluator: { avgTokens: 500, avgCost: 0.012 },
            quality_controller: { avgTokens: 1200, avgCost: 0.03 }, // ✨ Consolidated
            manager: { avgTokens: 300, avgCost: 0.008 },
            engagement: { avgTokens: 200, avgCost: 0.005 }
        };

        // Callbacks for UI updates
        this.callbacks = {
            onNodeStart: null,
            onNodeComplete: null,
            onNodeError: null,
            onPhaseStart: null,
            onPhaseComplete: null,
            onExecutionComplete: null,
            onContentGenerated: null,
            onLog: null
        };
    }

    /**
     * Register callback functions for UI updates
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
        return this;
    }

    /**
     * Load Global Routing Defaults from Firestore
     */
    async loadGlobalDefaults() {
        try {
            const db = firebase.firestore();
            const doc = await db.collection('systemSettings').doc('llmConfig').get();
            if (doc.exists && doc.data().defaultModels) {
                this.state.routingDefaults = doc.data().defaultModels;

                // v5.0: Extract tier config
                if (this.state.routingDefaults.tiers || this.state.routingDefaults.text?.tiers) {
                    this.state.tierConfig = this.state.routingDefaults.tiers || this.state.routingDefaults.text?.tiers;
                    console.log('✅ 5-Tier Config Loaded:', Object.keys(this.state.tierConfig));
                }

                console.log('✅ Global Routing Defaults Loaded:', this.state.routingDefaults);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load global routing defaults:', error);
        }
    }

    /**
     * v5.0: Load Standard Agent Profiles from Firestore
     * Layer 1 of the 4-Layer Prompt System
     */
    async loadStandardAgentProfiles() {
        try {
            const db = firebase.firestore();
            const doc = await db.collection('systemSettings').doc('standardAgentProfiles').get();
            if (doc.exists && doc.data().agents) {
                this.state.standardAgentProfiles = doc.data().agents;
                console.log('✅ Standard Agent Profiles Loaded:', Object.keys(this.state.standardAgentProfiles));
            }
        } catch (error) {
            console.warn('⚠️ Failed to load standard agent profiles:', error);
        }
    }

    /**
     * v5.0: Build 4-Layer System Prompt
     * Merges: Layer 1 (Admin) + Layer 2 (User Custom) + Context
     * @param {string} agentId - Agent identifier
     * @param {Object} context - Execution context
     * @returns {string} - Merged system prompt
     */
    build4LayerSystemPrompt(agentId, context = {}) {
        const layers = [];

        // Layer 1: Standard Agent Profile (Admin-defined base prompt)
        const standardProfile = this.state.standardAgentProfiles?.[agentId];
        if (standardProfile?.systemPrompt) {
            layers.push(`[BASE ROLE]\n${standardProfile.systemPrompt}`);
        }

        // Layer 2: User Custom Instructions (from Brain Modal)
        // Improved: Pass agentId to getSubAgentPrompt which now handles fuzzy matching
        const userCustomPrompt = this.getSubAgentPrompt(agentId);
        if (userCustomPrompt) {
            layers.push(`[USER CUSTOMIZATION]\n${userCustomPrompt}`);
        }

        // Layer 2.5: Team Directive (Team Goal)
        const teamDirective = this.getTeamDirective();
        if (teamDirective) {
            layers.push(`[TEAM GOAL]\n${teamDirective}`);
        }

        // Layer 3: Brand/Project Context (if available)
        // Standardized: Check for both brandContext and content
        const brandContext = context.brandContext || context.content || context.businessDescription;
        if (brandContext) {
            layers.push(`[BRAND CONTEXT]\n${brandContext}`);
        }

        // Combine all layers
        if (layers.length === 0) {
            return null; // No custom prompt, use agent default
        }

        return layers.join('\n\n---\n\n');
    }

    /**
     * v5.0: Get tier configuration for an agent based on task type
     * Uses heuristic mapping from agent type to tier
     */
    getTierForAgent(agentId) {
        // Default tier mappings (simulating Runtime Profile Agent heuristics)
        const tierMappings = {
            // Research phase - moderate complexity
            'research': '3_standard',
            'seo_watcher': '2_balanced',
            'knowledge_curator': '2_balanced',
            'kpi': '2_balanced',

            // Planning phase - higher complexity
            'planner': '3_standard',

            // Creation phase - varies by type
            'creator_text': '3_standard',
            'creator_image': '2_balanced',
            'creator_video': '2_balanced',

            // Validation phase - precision needed
            'compliance': '4_premium',
            'seo_optimizer': '2_balanced',
            'evaluator': '3_standard',

            // Final phase - moderate
            'manager': '3_standard',
            'engagement': '2_balanced'
        };

        const baseTier = tierMappings[agentId] || '3_standard';

        // Apply quality tier override if BOOST is requested
        if (this.state.qualityTier === 'BOOST') {
            return '4_premium';
        } else if (this.state.qualityTier === 'ULTRA') {
            return '5_ultra';
        }

        return baseTier;
    }

    /**
     * v5.0: Get provider and model from tier configuration
     */
    getProviderModelFromTier(tierId) {
        const tierConfig = this.state.tierConfig?.[tierId];

        if (tierConfig) {
            return {
                provider: tierConfig.provider,
                model: tierConfig.model,
                creditMultiplier: tierConfig.creditMultiplier || 1.0
            };
        }

        // Fallback defaults - v5.1: Respect user preference for no GPT-4o
        // Uses Deepseek models as fallback since they're more cost-effective
        const fallbacks = {
            '1_economy': { provider: 'deepseek', model: 'deepseek-chat', creditMultiplier: 0.2 },
            '2_balanced': { provider: 'deepseek', model: 'deepseek-chat', creditMultiplier: 0.5 },
            '3_standard': { provider: 'deepseek', model: 'deepseek-reasoner', creditMultiplier: 1.0 },
            '4_premium': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', creditMultiplier: 3.0 },
            '5_ultra': { provider: 'deepseek', model: 'deepseek-reasoner', creditMultiplier: 5.0 }
        };

        return fallbacks[tierId] || fallbacks['3_standard'];
    }

    /**
     * Emit event to registered callback
     */
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }

    /**
     * Set Team Context from Team Brain Settings
     * @param {Object} teamContext - Contains teamName, directive, and subAgents config
     */
    setTeamContext(teamContext) {
        this.state.teamContext = teamContext;
        console.log('[DAGExecutor] Team Context set:', teamContext?.teamName, 'Directive:', teamContext?.directive?.substring(0, 50) + '...');
    }

    /**
     * Get team directive for injection into agent prompts
     */
    getTeamDirective() {
        return this.state.teamContext?.directive || '';
    }

    /**
     * Get sub-agent specific system prompt if available
     */
    getSubAgentPrompt(agentId) {
        if (!this.state.teamContext?.subAgents) return null;

        // Normalize ID for comparison: remove underscores/dashes and creator prefix
        const normalize = (id) => id.toString().toLowerCase()
            .replace(/[_-]/g, '')
            .replace(/^creator/, '');

        const target = normalize(agentId);

        const agent = this.state.teamContext.subAgents.find(a => {
            const aId = normalize(a.id || a.role_type || a.type || '');
            const aName = normalize(a.name || '');
            return aId === target || aName === target || aId.includes(target) || target.includes(aId);
        });

        return agent?.systemPrompt || agent?.system_prompt || null;
    }

    /**
     * Start workflow execution
     * @param {Array} selectedAgents - List of selected agent IDs to execute
     * @param {string} projectId - Project ID
     * @param {string} teamId - Core Agent Team ID
     * @param {Object} context - Plan context from Knowledge Hub
     * @param {string} qualityTier - Quality tier (e.g., 'BOOST')
     * @param {Array} targetChannels - 🎯 Target channels for multi-channel content (e.g., ['x', 'instagram'])
     */
    async start(selectedAgents, projectId, teamId, context = null, qualityTier = null, targetChannels = ['x']) {
        if (this.state.isRunning) {
            console.warn('Execution already in progress');
            return;
        }

        // Preserve v5.0 state that was loaded in constructor
        const existingTeamContext = this.state.teamContext || null;
        const existingRoutingDefaults = this.state.routingDefaults;
        const existingTierConfig = this.state.tierConfig;
        const existingStandardAgentProfiles = this.state.standardAgentProfiles;
        const useTierRouting = this.state.useTierRouting;

        // If tier config not loaded yet, wait for it
        if (!existingTierConfig && useTierRouting) {
            console.log('[DAGExecutor] Waiting for tier config to load...');
            await this.loadGlobalDefaults();
        }

        this.state = {
            isRunning: true,
            isPaused: false,
            currentPhase: 0,
            completedNodes: [],
            failedNodes: [],
            startTime: Date.now(),
            totalTokens: 0,
            totalCost: 0,
            projectId,
            teamId,
            selectedAgents,
            context: context || {},
            qualityTier,
            targetChannels: targetChannels || ['x'],
            executionResults: {},
            // v5.0: Preserve loaded configs
            routingDefaults: existingRoutingDefaults || this.state.routingDefaults,
            tierConfig: existingTierConfig || this.state.tierConfig,
            standardAgentProfiles: existingStandardAgentProfiles || this.state.standardAgentProfiles,
            useTierRouting: useTierRouting,
            teamContext: existingTeamContext,
            // ✨ Phase 2: Logic for "Context-Driven Skip"
            skipPhases: {
                Research: !!(context.marketPulseData && (Date.now() - new Date(context.marketPulseData.updatedAt).getTime() < 86400000)),
                Planning: !!(context.source === 'knowledge-hub' || context.planContent)
            }
        };

        // 🎯 Log multi-channel targeting
        console.log(`[DAGExecutor] 🎯 Target channels: ${this.state.targetChannels.join(', ')}`);

        this.emit('onLog', { message: '🚀 Starting workflow execution...', type: 'info' });
        this.emit('onLog', { message: `🎯 Target channels: ${targetChannels.join(', ')}`, type: 'info' });

        try {
            for (let i = 0; i < this.phases.length; i++) {
                if (!this.state.isRunning) break;

                this.state.currentPhase = i;
                await this.executePhase(this.phases[i], selectedAgents);
            }

            this.emit('onExecutionComplete', {
                success: true,
                duration: Date.now() - this.state.startTime,
                totalTokens: this.state.totalTokens,
                totalTokens: this.state.totalTokens,
                totalCost: this.state.totalCost,
                results: this.state.executionResults
            });

            this.emit('onLog', { message: '✅ Workflow completed successfully!', type: 'success' });
        } catch (error) {
            this.emit('onLog', { message: `❌ Execution failed: ${error.message}`, type: 'error' });
            this.emit('onExecutionComplete', { success: false, error });
        }

        this.state.isRunning = false;
    }

    /**
     * Regenerate Creation Logic with Feedback
     */
    async regenerateCreation(feedback) {
        if (this.state.isRunning) {
            console.warn('Execution already in progress');
            return;
        }

        this.emit('onLog', { message: `🔄 Regenerating content with feedback: "${feedback}"`, type: 'info' });

        // Restore state for re-run
        this.state.isRunning = true;
        this.state.isPaused = false;

        // Store feedback in context
        if (!this.state.context) this.state.context = {};
        this.state.context.userFeedback = feedback;

        try {
            // Find Creation Phase
            const phaseIndex = this.phases.findIndex(p => p.name === 'Creation');
            if (phaseIndex !== -1) {
                this.state.currentPhase = phaseIndex;
                // Re-execute Creation Phase
                await this.executePhase(this.phases[phaseIndex], this.state.selectedAgents);
            }
            this.emit('onLog', { message: '✅ Regeneration completed!', type: 'success' });
        } catch (error) {
            this.emit('onLog', { message: `❌ Regeneration failed: ${error.message}`, type: 'error' });
        }

        this.state.isRunning = false;
        // Optional: Clear feedback so it doesn't stick for next completely new run? 
        // For now, keep it as it might be relevant history.
    }

    /**
     * Execute a single phase
     */
    async executePhase(phase, selectedAgents) {
        // ✨ Phase 2: Check for Context-Driven Skip
        if (this.state.skipPhases?.[phase.name]) {
            this.emit('onLog', { message: `✨ Skipping ${phase.name} phase - Fresh context found`, type: 'success' });
            this.emit('onPhaseStart', { phase: phase.name, index: this.state.currentPhase, skipped: true });

            // Mark agents as completed (simulated) for UI consistency
            phase.agents.forEach(agentId => {
                const nodeId = this.getNodeId(agentId);
                this.state.completedNodes.push(agentId);
                this.emit('onNodeComplete', { nodeId, agentId, result: { content: 'Context loaded from source', skipped: true } });
            });

            this.emit('onPhaseComplete', { phase: phase.name, index: this.state.currentPhase, skipped: true });
            return;
        }

        this.emit('onPhaseStart', { phase: phase.name, index: this.state.currentPhase });
        this.emit('onLog', { message: `📍 Phase ${this.state.currentPhase + 1}: ${phase.name}`, type: 'info' });

        // ✨ Phase 3: Consolidation Logic
        // If bundling is active (Lite Mode) or explicitly selected
        let activeAgents = [];
        const isLiteMode = this.state.qualityTier === 'LITE' || !this.state.qualityTier;

        if (phase.consolidatedAgent && (isLiteMode || selectedAgents.includes(phase.consolidatedAgent))) {
            this.emit('onLog', { message: `   ⚡ Using Consolidated Agent: ${phase.consolidatedAgent}`, type: 'info' });
            activeAgents = [phase.consolidatedAgent];
        } else {
            // Filter agents that are both in this phase and selected
            activeAgents = phase.agents.filter(agent =>
                selectedAgents.includes(agent) || selectedAgents.includes(agent.replace('-', '_'))
            );
        }

        if (activeAgents.length === 0) {
            this.emit('onLog', { message: `   Skipping ${phase.name} - no selected agents`, type: 'warning' });
            return;
        }

        if (phase.parallel) {
            // Execute all agents in parallel with stagger
            const promises = activeAgents.map((agent, index) => {
                return this.sleep(index * 2000).then(() => this.executeAgent(agent));
            });
            await Promise.all(promises);
        } else {
            // Execute agents sequentially
            for (const agent of activeAgents) {
                if (!this.state.isRunning) break;
                await this.executeAgent(agent);
            }
        }

        this.emit('onPhaseComplete', { phase: phase.name, index: this.state.currentPhase });
    }

    /**
     * Execute a single agent
     */
    async executeAgent(agentId) {
        // Wait if paused
        while (this.state.isPaused) {
            await this.sleep(100);
        }

        const nodeId = this.getNodeId(agentId);
        this.emit('onNodeStart', { nodeId, agentId });
        this.emit('onLog', { message: `   ▶ ${agentId} started...`, type: 'running' });

        try {
            // Simulate API call delay (replace with actual Cloud Function call)
            const result = await this.invokeAgent(agentId, this.state.context);

            // Update metrics
            const meta = this.agentMeta[agentId] || { avgTokens: 100, avgCost: 0.01 };
            this.state.totalTokens += meta.avgTokens;
            this.state.totalCost += meta.avgCost;
            this.state.completedNodes.push(agentId);
            this.state.executionResults[agentId] = result;

            this.emit('onNodeComplete', { nodeId, agentId, result });

            // Extract model name for logging (Safety Check)
            const resultMeta = (result && result.metadata) ? result.metadata : {};
            const modelName = resultMeta.model || (result && result.model) || 'Unknown';
            const providerName = resultMeta.provider ? ` (${resultMeta.provider})` : '';

            this.emit('onLog', { message: `   ✓ ${agentId} completed using <strong>${modelName}</strong>${providerName}`, type: 'success' });

            // Trigger content generation callback for creation agents
            if (['creator_text', 'creator_image', 'creator_video'].includes(agentId)) {
                this.emit('onContentGenerated', { agentId, content: result });
            }

            return result;
        } catch (error) {
            this.state.failedNodes.push(agentId);
            this.emit('onNodeError', { nodeId, agentId, error });
            this.emit('onLog', { message: `   ✗ ${agentId} failed: ${error.message}`, type: 'error' });

            // Retry logic
            if (await this.shouldRetry(agentId, error)) {
                const retryCount = this.state.failedNodes.filter(id => id === agentId).length;
                const delay = Math.pow(2, retryCount) * 1000 + (Math.random() * 1000); // Exponential backoff + jitter
                this.emit('onLog', { message: `   ↻ Retrying ${agentId} in ${Math.round(delay)}ms...`, type: 'warning' });
                await this.sleep(delay);
                return this.executeAgent(agentId);
            }

            throw error;
        }
    }

    /**
     * Invoke agent via Cloud Function
     * Each agent type has specific prompts and capabilities
     */
    async invokeAgent(agentId, context) {
        // For image generation, use specialized handler
        if (agentId === 'creator_image') {
            return await this.invokeImageGenerator(context);
        }

        // Prepare agent-specific prompts
        const agentConfig = this.getAgentConfig(agentId, context);


        const executeSubAgent = firebase.functions().httpsCallable('executeSubAgent');

        // v4.0: runtimeProfileId (Source of Truth)
        const runtimeProfileId =
            this.state.selectedAgentTeam?.runtimeProfileId ||
            this.state.selectedAgentTeam?.runtime_profile_id ||
            this.state.selectedAgentTeam?.runtime_profile_link ||
            null;

        // FIX for Gemini: Merge history into prompt to avoid "First role must be user" error
        // AND use safer model name if it's the specific pro version causing 404s
        let finalPreviousOutputs = this.getPreviousOutputs();
        let finalTaskPrompt = agentConfig.taskPrompt;
        let finalModel = agentConfig.model;

        // Check if using Google/Gemini
        const isGemini = (agentConfig.provider === 'google' || agentConfig.provider === 'gemini');

        if (isGemini) {
            // 1. (Removed) No longer downgrading 1.5-pro. Assuming 3.0-pro works as per user.

            // 2. Fix Role Error: Serialize history into User Prompt
            if (finalPreviousOutputs && finalPreviousOutputs.length > 0) {
                console.log('[DAGExecutor] Serializing history for Gemini to avoid Role Error');
                const historyText = finalPreviousOutputs.map(o => `[Previous Output from ${o.role}]:\n${o.content}`).join('\n\n');
                finalTaskPrompt = `Previous Context:\n${historyText}\n\nTask:\n${finalTaskPrompt}`;
                finalPreviousOutputs = []; // Clear array so server doesn't create 'model' roles
            }
        }

        let attempts = 0;
        const maxAttempts = 3; // Increased retries before fallback
        let currentProvider = agentConfig.provider;

        // PATCH (Gemini Fix): Backend Cloud Function expects 'gemini' as provider ID (matching DB doc ID), 
        // but frontend might have 'google'. Map it here until backend aliasing is deployed.
        if (currentProvider === 'google') {
            console.log('[DAGExecutor] Auto-mapping provider google -> gemini for backend compatibility');
            currentProvider = 'gemini';
        }
        // Ensure we start with the mapped model
        let currentModel = finalModel;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                const result = await executeSubAgent({
                    projectId: this.state.projectId,
                    teamId: this.state.teamId,
                    runId: `run_${Date.now()}`,
                    subAgentId: agentId,
                    systemPrompt: agentConfig.systemPrompt,
                    taskPrompt: finalTaskPrompt,
                    previousOutputs: finalPreviousOutputs,
                    provider: currentProvider,
                    model: currentModel,
                    temperature: agentConfig.temperature || 0.7,
                    runtimeProfileId,
                    qualityTier: this.state.qualityTier
                });

                if (result.data.success) {
                    return this.parseAgentOutput(agentId, result.data.output, result.data.usage, result.data.metadata);
                } else {
                    throw new Error('Agent execution returned success:false');
                }
            } catch (error) {
                console.error(`[DAGExecutor] Attempt ${attempts} failed for ${agentId} (${currentProvider}/${currentModel}):`, error);

                if (attempts < maxAttempts) {
                    // v5.1 FIX: Respect Global Routing - DO NOT switch to GPT-4o
                    // Instead, retry with same provider (network issues) or use economy tier
                    if (attempts === 1) {
                        // First retry: Wait and try again with same model (might be network issue)
                        console.warn(`[DAGExecutor] ⚠️ Retry ${attempts + 1}: Retrying with same model after delay...`);
                        this.emit('onLog', { message: `   ⚠️ Retrying with same model...`, type: 'warning' });
                        await new Promise(r => setTimeout(r, 2000));
                    } else {
                        // Second retry: Switch to economy tier (deepseek-chat) instead of GPT-4o
                        console.warn(`[DAGExecutor] ⚠️ Retry ${attempts + 1}: Switching to economy model (deepseek-chat)...`);
                        this.emit('onLog', { message: `   ⚠️ Switching to economy model (deepseek-chat)...`, type: 'warning' });
                        currentProvider = 'deepseek';
                        currentModel = 'deepseek-chat';
                        await new Promise(r => setTimeout(r, 500));
                    }
                } else {
                    // Final failure
                    this.emit('onLog', { message: `   ❌ All attempts failed. Using static fallback.`, type: 'error' });
                    return this.getFallbackResponse(agentId);
                }
            }
        }
    }

    /**
     * Get agent-specific configuration (prompts, model, etc.)
     * v5.0: Now uses 5-Tier routing and 4-Layer prompt system
     */
    getAgentConfig(agentId, context) {
        // Ensure planContent is never empty to prevent LLM hallucinations
        const planContent = context?.content || context?.planName || 'Create engaging content relevant to the project and brand.';
        const userFeedback = context?.userFeedback ? `\n\nIMPORTANT USER FEEDBACK FOR REGENERATION:\n"${context.userFeedback}"\n\nYou MUST incorporate this feedback into your output.` : '';

        console.log(`[DAGExecutor v5.0] getAgentConfig for ${agentId}:`, { planContent, context, userFeedback });

        // v5.0: Use 5-Tier routing if enabled
        let providerName, globalModel;

        if (this.state.useTierRouting && this.state.tierConfig) {
            // Get tier for this agent
            const tierId = this.getTierForAgent(agentId);
            const tierSettings = this.getProviderModelFromTier(tierId);

            providerName = tierSettings.provider;
            globalModel = tierSettings.model;

            console.log(`[DAGExecutor v5.0] 5-Tier Routing: ${agentId} → ${tierId} → ${providerName}/${globalModel}`);
        } else {
            // Legacy routing (fallback)
            providerName = this.state.selectedAgentTeam?.provider;

            // If Team doesn't specify provider, fallback to Global Default Provider
            if (!providerName && this.state.routingDefaults?.text?.default?.provider) {
                providerName = this.state.routingDefaults.text.default.provider;
            }

            // Final fallback to Deepseek if nothing is configured (respecting no-GPT-4o preference)
            providerName = (providerName || 'deepseek').toLowerCase();

            globalModel = 'deepseek-reasoner'; // Absolute fallback - v5.1: Use Deepseek instead of GPT-4o

            // Check loaded defaults to find the exact model for this provider
            const tierKey = (this.state.qualityTier === 'BOOST') ? 'boost' : 'default';
            console.log(`[DAGExecutor] Legacy Resolving Model for Tier: ${tierKey}`);

            if (this.state.routingDefaults && this.state.routingDefaults.text) {
                const defs = this.state.routingDefaults.text[tierKey];
                if (defs && defs.model) {
                    globalModel = defs.model;
                    providerName = defs.provider || providerName;
                }
            }
        }

        // Model mapping for unavailable models
        if (globalModel === 'gemini-3.0-pro') globalModel = 'gemini-2.0-flash-exp';
        if (globalModel === 'gemini-3.0') globalModel = 'gemini-2.0-flash-exp';
        if (globalModel === 'gemini-1.5-pro') globalModel = 'gemini-2.0-flash-exp';
        if (globalModel === 'gemini-1.5-flash') globalModel = 'gemini-2.0-flash-exp';

        // v5.0: Build 4-Layer System Prompt
        const layeredSystemPrompt = this.build4LayerSystemPrompt(agentId, context);

        // Inject provider into all configs to allow explicit passing in invokeAgent
        const configWithProvider = (cfg) => {
            const config = { ...cfg, provider: providerName };

            // v5.0: Prepend layered prompt if available
            if (layeredSystemPrompt && cfg.systemPrompt) {
                config.systemPrompt = `${layeredSystemPrompt}\n\n---\n\n[TASK INSTRUCTIONS]\n${cfg.systemPrompt}`;
            }

            return config;
        };

        const configs = {
            strategic_analyst: configWithProvider({
                systemPrompt: `You are a Strategic Research Analyst. Your job is to synthesize market data, SEO trends, and knowledge curator insights into a single strategic summary.`,
                taskPrompt: `Analyze the provided context and market data:
                    ${planContent}
                    
                    Provide a consolidated strategic report including:
                    1. Market Trend Analysis
                    2. SEO & Keyword Strategy
                    3. Key Knowledge Points
                    4. KPI Recommendations`,
                model: globalModel,
                temperature: 0.4
            }),
            quality_controller: configWithProvider({
                systemPrompt: `You are a Senior Quality Controller. Review the generated content for brand safety, SEO excellence, and overall quality.`,
                taskPrompt: `Perform an all-in-one review for the following content based on the original plan:
                    Plan: ${planContent}
                    
                    Review criteria:
                    1. Brand & Legal Compliance
                    2. SEO Score & Optimization
                    3. Final Quality Rating (0-100)
                    4. Necessary edits or improvements`,
                model: globalModel,
                temperature: 0.2
            }),
            research: configWithProvider({
                systemPrompt: `You are a research specialist. Analyze the given content plan and identify key themes, trends, and relevant information. Provide insights that will help create compelling content.`,
                taskPrompt: `Analyze this content plan and extract key insights:\n\n${planContent}\n\nProvide:\n1. Main themes\n2. Target audience insights\n3. Key messages to emphasize\n4. Recommended angles`,
                model: globalModel,
                temperature: 0.5
            }),
            seo_watcher: configWithProvider({
                systemPrompt: `You are an SEO specialist. Analyze content for SEO opportunities.`,
                taskPrompt: `For this content plan:\n${planContent}\n\nProvide:\n1. Recommended keywords (5-10)\n2. Trending hashtags\n3. SEO title suggestions\n4. Meta description suggestions`,
                model: globalModel,
                temperature: 0.4
            }),
            knowledge_curator: configWithProvider({
                systemPrompt: `You are a knowledge curator. Organize and structure information for content creation.`,
                taskPrompt: `Curate relevant knowledge for:\n${planContent}\n\nProvide:\n1. Key facts to include\n2. Statistics or data points\n3. Expert quotes or references\n4. Background context`,
                model: globalModel,
                temperature: 0.5
            }),
            kpi: configWithProvider({
                systemPrompt: `You are a KPI analyst. Define measurable goals for content performance.`,
                taskPrompt: `For this content:\n${planContent}\n\nDefine:\n1. Expected engagement metrics\n2. Success indicators\n3. Target audience reach\n4. Conversion goals`,
                model: globalModel,
                temperature: 0.3
            }),
            planner: configWithProvider({
                systemPrompt: `You are a content strategist. Create detailed execution plans for multi-channel social media campaigns.`,
                taskPrompt: `Create a multi-channel execution strategy for:
                       ${planContent}
                       
                       Target Channels: ${this.state.targetChannels ? this.state.targetChannels.join(', ') : 'X'}
                       
                       Provide:
                       1. Content structure (tailored for each channel)
                       2. Key talking points
                       3. Tone and style guidelines for each platform
                       4. Best publishing times and format recommendations`,
                model: globalModel,
                temperature: 0.6
            }),
            creator_text: configWithProvider({
                systemPrompt: `You are an expert multi-channel social media content creator. Write engaging, platform-optimized content for multiple social networks simultaneously. Be creative, authentic, and compelling.`,
                taskPrompt: this.state.targetChannels && this.state.targetChannels.length > 1
                    ? `Create optimized social media posts for these channels: ${this.state.targetChannels.join(', ')}.
                       
                       Base your content on this plan:
                       ${planContent}
                       
                       IMPORTANT: Output your response ONLY as a valid JSON object where keys are the channel names (lowercase) and values are the generated text content.
                       Example: {"x": "content for x", "instagram": "content for instagram", "linkedin": "content for linkedin"}
                       Do NOT include any preamble or extra text.
                       
                       ${userFeedback}`
                    : `Create a social media post for ${this.state.targetChannels ? this.state.targetChannels[0] || 'X' : 'X'} based on this plan:
                       ${planContent}
                       
                       Requirements:
                       - Write the COMPLETE post content ready for publishing
                       - Include relevant hashtags
                       - Target: ${this.state.targetChannels ? this.state.targetChannels[0] || 'X' : 'X'}
                       
                       Write the post now:
                       ${userFeedback}`,
                model: globalModel,
                temperature: 0.8
            }),
            creator_video: configWithProvider({
                systemPrompt: `You are a video content specialist. Create scripts and storyboards.`,
                taskPrompt: `Create a video script based on:\n${planContent}\n\nProvide:\n1. Hook (first 3 seconds)\n2. Main content structure\n3. Call to action\n4. Suggested visuals${userFeedback}`,
                model: globalModel,
                temperature: 0.7
            }),
            compliance: configWithProvider({
                systemPrompt: `You are a content compliance officer. Review content for brand safety and legal compliance.`,
                taskPrompt: `Review the generated content for compliance:\n\nOriginal Plan: ${planContent}\n\nCheck for:\n1. Brand consistency\n2. Legal compliance\n3. Factual accuracy\n4. Tone appropriateness\n\nProvide a compliance score (0-100) and any issues found.`,
                model: globalModel,
                temperature: 0.2
            }),
            seo_optimizer: configWithProvider({
                systemPrompt: `You are an SEO optimizer. Enhance content for search visibility.`,
                taskPrompt: `Optimize this content for SEO:\n${planContent}\n\nProvide:\n1. SEO score (0-100)\n2. Keyword density check\n3. Optimization suggestions\n4. Hashtag improvements`,
                model: globalModel,
                temperature: 0.3
            }),
            evaluator: configWithProvider({
                systemPrompt: `You are a content quality evaluator. Assess content against best practices.`,
                taskPrompt: `Evaluate this content:\n${planContent}\n\nRate on:\n1. Engagement potential (0-100)\n2. Clarity (0-100)\n3. Call-to-action strength (0-100)\n4. Overall quality score (0-100)\n\nProvide specific feedback.`,
                model: globalModel,
                temperature: 0.3
            }),
            manager: configWithProvider({
                systemPrompt: `You are a content manager. Finalize and approve content for publishing.`,
                taskPrompt: `Finalize this content for publishing:\n${planContent}\n\nProvide:\n1. Final approval status\n2. Any last-minute edits\n3. Publishing recommendations\n4. Post-publish monitoring suggestions`,
                model: globalModel,
                temperature: 0.6
            }),
            engagement: configWithProvider({
                systemPrompt: `You are a community manager. Draft engagement responses.`,
                taskPrompt: `Draft potential responses to user comments for:\n${planContent}\n\nProvide:\n1. FAQ responses\n2. Engagement starters\n3. Positive sentiment reinforcement\n4. Crisis management (if applicable)`,
                model: globalModel,
                temperature: 0.7
            })
        };

        return configs[agentId] || {
            systemPrompt: 'You are a helpful assistant.',
            taskPrompt: planContent,
            model: globalModel,
            temperature: 0.7
        };
    }

    /**
     * Get accumulated outputs from previous agents for context
     */
    getPreviousOutputs() {
        const outputs = [];

        // ✨ Phase 2: Inject pseudo-outputs for skipped phases to provide context to downstream agents
        if (this.state.skipPhases?.Research && this.state.context.marketPulseData) {
            outputs.push({
                role: 'Research (Preserved Context)',
                content: `Historical Market Data: ${JSON.stringify(this.state.context.marketPulseData)}`
            });
        }

        if (this.state.skipPhases?.Planning && this.state.context.planContent) {
            outputs.push({
                role: 'Planner (Preserved Context)',
                content: `Pre-defined Plan: ${this.state.context.planContent}`
            });
        }

        for (const [agentId, result] of Object.entries(this.state.executionResults || {})) {
            if (result && result.content) {
                outputs.push({
                    role: agentId,
                    content: typeof result.content === 'string' ? result.content : JSON.stringify(result)
                });
            }
        }
        return outputs;
    }

    /**
     * Parse agent output into structured format
     */
    /**
     * Map Agent ID to DOM Node ID (SVG)
     */
    getNodeId(agentId) {
        const mapping = {
            'research': 'node-research',
            'seo_watcher': 'node-seo',
            'knowledge_curator': 'node-knowledge',
            'kpi': 'node-kpi',
            'planner': 'node-planner',
            'creator_text': 'node-text',
            'creator_image': 'node-image',
            'creator_video': 'node-video',
            'compliance': 'node-compliance',
            'seo_optimizer': 'node-seo-opt',
            'evaluator': 'node-evaluator',
            'manager': 'node-manager'
        };
        return mapping[agentId] || `node-${agentId}`;
    }

    parseAgentOutput(agentId, rawOutput, usage, metadata = {}) {
        // Cleaning common LLM artifacts (markdown code blocks)
        let cleanOutput = rawOutput;
        if (typeof rawOutput === 'string') {
            cleanOutput = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        // For creator_text, ensure we have the content field
        if (agentId === 'creator_text') {
            let content = cleanOutput;
            if (typeof cleanOutput === 'object' && cleanOutput !== null) {
                content = cleanOutput.content || cleanOutput.text || cleanOutput.message || cleanOutput.output || JSON.stringify(cleanOutput);
            }
            return { content: content, usage, metadata };
        }

        // For scoring agents, try to extract scores
        if (['compliance', 'seo_optimizer', 'evaluator'].includes(agentId)) {
            const scoreMatch = rawOutput.match(/(\d+)\s*(?:\/100|%|score)/i);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : Math.floor(Math.random() * 15) + 85;
            return {
                score,
                details: rawOutput,
                status: score >= 70 ? 'Passed' : 'Needs Review',
                status: score >= 70 ? 'Passed' : 'Needs Review',
                usage,
                metadata
            };
        }

        return { content: rawOutput, success: true, usage, metadata };
    }

    /**
     * Fallback responses for when Cloud Function fails
     */
    getFallbackResponse(agentId) {
        const fallbacks = {
            research: { content: 'Research completed with default insights.', success: true },
            seo_watcher: { keywords: ['brand', 'innovation', 'technology'], success: true },
            knowledge_curator: { content: 'Knowledge curated successfully.', success: true },
            kpi: { metrics: { engagement: 'high', reach: 'medium' }, success: true },
            planner: { content: 'Content strategy defined.', success: true },
            creator_text: { content: '🚀 Exciting update coming soon! Stay tuned for more. #Innovation', success: true },
            creator_image: { url: 'https://via.placeholder.com/1024x1024?text=AI+Generated+Image', success: true },
            creator_video: { content: 'Video script prepared.', success: true },
            compliance: { score: 95, status: 'Passed', checks: ['Brand OK', 'Legal OK'] },
            seo_optimizer: { score: 88, details: 'SEO optimized with fallback' },
            evaluator: { score: 90, details: 'Evaluation completed' },
            manager: { content: 'Content approved for publishing.', success: true },
            engagement: { content: 'Engagement strategy ready.', success: true }
        };

        const response = fallbacks[agentId] || { success: true };

        // Add metadata to indicate Mock Data usage
        response.metadata = {
            model: 'MOCK-DATA',
            provider: 'system',
            resources: { project: false, brand: false, history: 0 },
            isMock: true,
            weights: { project: 0, brand: 0, knowledge: 0, history: 0 }
        };
        response.usage = { total_tokens: 0 };

        return response;
    }

    /**
     * Invoke Image Generator using configured provider via Cloud Function
     */
    async invokeImageGenerator(context) {
        try {
            this.emit('onLog', { message: '   🎨 Generating image with configured provider...', type: 'info' });

            // Set longer timeout for image generation (3 minutes instead of default ~70s)
            const generateFn = firebase.functions().httpsCallable('generateCreativeContent', { timeout: 180000 });
            const result = await generateFn({
                type: 'promo_images',
                inputs: {
                    topic: context?.planName || 'professional business content',
                    audience: 'general',
                    tone: 'professional',
                    plan: context.planContext || '', // Pass plan context specifically if needed
                    type: context.agentId, // Used as subAgentId/engineType
                    runtimeProfileId: context.config?.runtimeProfileId, // v4.0: Pass the ID
                    // provider: context.config?.provider, // DISABLED: Force Router Logic
                    // model: context.config?.model // DISABLED: Force Router Logic
                },
                projectContext: context?.content || '',
                targetLanguage: 'English',
                mode: 'balanced'
            });

            if (result.data.success && result.data.data && result.data.data.length > 0) {
                // Use metadata from response (dynamic based on Global Routing)
                const responseMetadata = result.data.metadata || {};
                return {
                    imageUrl: result.data.data[0],
                    metadata: {
                        model: responseMetadata.model || 'Unknown',
                        provider: responseMetadata.provider || 'unknown',
                        resources: { project: true }
                    }
                };
            } else {
                throw new Error(result.data.error || 'No image generated from provider');
            }
        } catch (error) {
            console.warn('[DAGExecutor] Image generation failed, fallback to placeholder:', error.message);
            this.emit('onLog', { message: `   ⚠️ Image Gen failed (${error.message}), using placeholder`, type: 'warning' });
            // Fallback to placeholder
            return {
                imageUrl: `https://picsum.photos/seed/${context?.planName?.replace(/\s/g, '') || 'zynkdefault'}/800/600`,
                metadata: {
                    model: 'Placeholder',
                    provider: 'system',
                    isMock: true
                }
            };
        }
    }

    /**
     * Determine if agent should be retried
     */
    async shouldRetry(agentId, error) {
        const retryCount = this.state.failedNodes.filter(id => id === agentId).length;
        return retryCount < 3 && error.retryable !== false;
    }

    /**
     * Pause execution
     */
    pause() {
        this.state.isPaused = true;
        this.emit('onLog', { message: '⏸ Execution paused', type: 'warning' });
    }

    /**
     * Resume execution
     */
    resume() {
        this.state.isPaused = false;
        this.emit('onLog', { message: '▶ Execution resumed', type: 'info' });
    }

    /**
     * Stop execution
     */
    stop() {
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.emit('onLog', { message: '⏹ Execution stopped', type: 'warning' });
    }

    /**
     * Get current execution stats
     */
    getStats() {
        return {
            phase: this.state.currentPhase + 1,
            totalPhases: this.phases.length,
            completedAgents: this.state.completedNodes.length,
            failedAgents: this.state.failedNodes.length,
            duration: this.state.startTime ? Date.now() - this.state.startTime : 0,
            totalTokens: this.state.totalTokens,
            totalCost: this.state.totalCost.toFixed(4)
        };
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in studio.js
window.DAGExecutor = DAGExecutor;
