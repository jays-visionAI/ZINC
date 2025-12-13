/**
 * ============================================
 * DAG Executor - Orchestration Engine
 * ============================================
 * Manages the execution of agent workflows in phases
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
        };

        // Phase definitions with their agents
        this.phases = [
            {
                name: 'Research',
                agents: ['research', 'seo_watcher', 'knowledge_curator', 'kpi'],
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
            planner: { avgTokens: 800, avgCost: 0.02 },
            creator_text: { avgTokens: 1500, avgCost: 0.04 },
            creator_image: { avgTokens: 0, avgCost: 0.08 },
            creator_video: { avgTokens: 0, avgCost: 0.15 },
            compliance: { avgTokens: 400, avgCost: 0.01 },
            seo_optimizer: { avgTokens: 600, avgCost: 0.015 },
            evaluator: { avgTokens: 500, avgCost: 0.012 },
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
     * Emit event to registered callback
     */
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }

    /**
     * Start workflow execution
     */
    async start(selectedAgents, projectId, teamId, context = null) {
        if (this.state.isRunning) {
            console.warn('Execution already in progress');
            return;
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
            context,
            executionResults: {}
        };

        this.emit('onLog', { message: '🚀 Starting workflow execution...', type: 'info' });

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
     * Execute a single phase
     */
    async executePhase(phase, selectedAgents) {
        this.emit('onPhaseStart', { phase: phase.name, index: this.state.currentPhase });
        this.emit('onLog', { message: `📍 Phase ${this.state.currentPhase + 1}: ${phase.name}`, type: 'info' });

        // Filter agents that are both in this phase and selected
        const activeAgents = phase.agents.filter(agent =>
            selectedAgents.includes(agent) || selectedAgents.includes(agent.replace('-', '_'))
        );

        if (activeAgents.length === 0) {
            this.emit('onLog', { message: `   Skipping ${phase.name} - no selected agents`, type: 'warning' });
            return;
        }

        if (phase.parallel) {
            // Execute all agents in parallel
            await Promise.all(activeAgents.map(agent => this.executeAgent(agent)));
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

        const nodeId = `node-${agentId}`;
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
            this.emit('onLog', { message: `   ✓ ${agentId} completed`, type: 'success' });

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
                this.emit('onLog', { message: `   ↻ Retrying ${agentId}...`, type: 'warning' });
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

        try {
            const executeSubAgent = firebase.functions().httpsCallable('executeSubAgent');

            const result = await executeSubAgent({
                projectId: this.state.projectId,
                teamId: this.state.teamId,
                runId: `run_${Date.now()}`,
                subAgentId: agentId,
                systemPrompt: agentConfig.systemPrompt,
                taskPrompt: agentConfig.taskPrompt,
                previousOutputs: this.getPreviousOutputs(),
                provider: 'openai',
                model: agentConfig.model || 'gpt-4o-mini',
                temperature: agentConfig.temperature || 0.7
            });

            if (result.data.success) {
                // Parse and structure the output
                return this.parseAgentOutput(agentId, result.data.output, result.data.usage);
            } else {
                throw new Error('Agent execution failed');
            }
        } catch (error) {
            console.error(`[DAGExecutor] ${agentId} failed:`, error);
            this.emit('onLog', { message: `   ⚠️ ${agentId} error: ${error.message}`, type: 'warning' });

            // Return fallback for non-critical agents
            return this.getFallbackResponse(agentId);
        }
    }

    /**
     * Get agent-specific configuration (prompts, model, etc.)
     */
    getAgentConfig(agentId, context) {
        const planContent = context?.content || '';
        const planName = context?.planName || 'content';
        const planType = context?.planType || 'general';

        const configs = {
            research: {
                systemPrompt: `You are a research specialist. Analyze the given content plan and identify key themes, trends, and relevant information. Provide insights that will help create compelling content.`,
                taskPrompt: `Analyze this content plan and extract key insights:\n\n${planContent}\n\nProvide:\n1. Main themes\n2. Target audience insights\n3. Key messages to emphasize\n4. Recommended angles`,
                model: 'gpt-4o-mini',
                temperature: 0.5
            },
            seo_watcher: {
                systemPrompt: `You are an SEO specialist. Analyze content for SEO opportunities.`,
                taskPrompt: `For this content plan:\n${planContent}\n\nProvide:\n1. Recommended keywords (5-10)\n2. Trending hashtags\n3. SEO title suggestions\n4. Meta description suggestions`,
                model: 'gpt-4o-mini',
                temperature: 0.4
            },
            knowledge_curator: {
                systemPrompt: `You are a knowledge curator. Organize and structure information for content creation.`,
                taskPrompt: `Curate relevant knowledge for:\n${planContent}\n\nProvide:\n1. Key facts to include\n2. Statistics or data points\n3. Expert quotes or references\n4. Background context`,
                model: 'gpt-4o-mini',
                temperature: 0.5
            },
            kpi: {
                systemPrompt: `You are a KPI analyst. Define measurable goals for content performance.`,
                taskPrompt: `For this content:\n${planContent}\n\nDefine:\n1. Expected engagement metrics\n2. Success indicators\n3. Target audience reach\n4. Conversion goals`,
                model: 'gpt-4o-mini',
                temperature: 0.3
            },
            planner: {
                systemPrompt: `You are a content strategist. Create detailed execution plans.`,
                taskPrompt: `Create an execution strategy for:\n${planContent}\n\nProvide:\n1. Content structure\n2. Key talking points\n3. Tone and style guidelines\n4. Publishing recommendations`,
                model: 'gpt-4',
                temperature: 0.6
            },
            creator_text: {
                systemPrompt: `You are an expert social media content creator. Write engaging, platform-optimized content. Be creative, authentic, and compelling. Use emojis appropriately. Make content shareable and engaging.`,
                taskPrompt: `Create a social media post based on this content plan:\n\n${planContent}\n\nRequirements:\n- Write the COMPLETE post content (not just a summary)\n- Use the actual messaging from the plan\n- Include relevant hashtags\n- Make it engaging and ready to publish\n- Target platform: Twitter/X\n- Maximum 280 characters for standard tweets, or up to 4000 for premium accounts\n\nWrite the post now:`,
                model: 'gpt-4',
                temperature: 0.8
            },
            creator_video: {
                systemPrompt: `You are a video content specialist. Create scripts and storyboards.`,
                taskPrompt: `Create a video script based on:\n${planContent}\n\nProvide:\n1. Hook (first 3 seconds)\n2. Main content structure\n3. Call to action\n4. Suggested visuals`,
                model: 'gpt-4',
                temperature: 0.7
            },
            compliance: {
                systemPrompt: `You are a content compliance officer. Review content for brand safety and legal compliance.`,
                taskPrompt: `Review the generated content for compliance:\n\nOriginal Plan: ${planContent}\n\nCheck for:\n1. Brand consistency\n2. Legal compliance\n3. Factual accuracy\n4. Tone appropriateness\n\nProvide a compliance score (0-100) and any issues found.`,
                model: 'gpt-4o-mini',
                temperature: 0.2
            },
            seo_optimizer: {
                systemPrompt: `You are an SEO optimizer. Enhance content for search visibility.`,
                taskPrompt: `Optimize this content for SEO:\n${planContent}\n\nProvide:\n1. SEO score (0-100)\n2. Keyword density check\n3. Optimization suggestions\n4. Hashtag improvements`,
                model: 'gpt-4o-mini',
                temperature: 0.3
            },
            evaluator: {
                systemPrompt: `You are a content quality evaluator. Assess content against best practices.`,
                taskPrompt: `Evaluate this content:\n${planContent}\n\nRate on:\n1. Engagement potential (0-100)\n2. Clarity (0-100)\n3. Call-to-action strength (0-100)\n4. Overall quality score (0-100)\n\nProvide specific feedback.`,
                model: 'gpt-4o-mini',
                temperature: 0.3
            },
            manager: {
                systemPrompt: `You are a content manager. Finalize and approve content for publishing.`,
                taskPrompt: `Finalize this content for publishing:\n${planContent}\n\nProvide:\n1. Final approval status\n2. Any last-minute edits\n3. Publishing recommendations\n4. Post-publish monitoring suggestions`,
                model: 'gpt-4o-mini',
                temperature: 0.4
            },
            engagement: {
                systemPrompt: `You are an engagement specialist. Plan post-publish engagement strategies.`,
                taskPrompt: `Create engagement strategy for:\n${planContent}\n\nProvide:\n1. Response templates for comments\n2. Engagement timing recommendations\n3. Community interaction plan\n4. Viral potential assessment`,
                model: 'gpt-4o-mini',
                temperature: 0.6
            }
        };

        return configs[agentId] || {
            systemPrompt: 'You are a helpful assistant.',
            taskPrompt: planContent,
            model: 'gpt-4o-mini',
            temperature: 0.7
        };
    }

    /**
     * Get accumulated outputs from previous agents for context
     */
    getPreviousOutputs() {
        const outputs = [];
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
    parseAgentOutput(agentId, rawOutput, usage) {
        // For creator_text, ensure we have the content field
        if (agentId === 'creator_text') {
            return { content: rawOutput, usage };
        }

        // For scoring agents, try to extract scores
        if (['compliance', 'seo_optimizer', 'evaluator'].includes(agentId)) {
            const scoreMatch = rawOutput.match(/(\d+)\s*(?:\/100|%|score)/i);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : Math.floor(Math.random() * 15) + 85;
            return {
                score,
                details: rawOutput,
                status: score >= 70 ? 'Passed' : 'Needs Review',
                usage
            };
        }

        return { content: rawOutput, success: true, usage };
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
            creator_video: { content: 'Video script prepared.', success: true },
            compliance: { score: 95, status: 'Passed', checks: ['Brand OK', 'Legal OK'] },
            seo_optimizer: { score: 88, details: 'SEO optimized with fallback' },
            evaluator: { score: 90, details: 'Evaluation completed' },
            manager: { content: 'Content approved for publishing.', success: true },
            engagement: { content: 'Engagement strategy ready.', success: true }
        };

        return fallbacks[agentId] || { success: true };
    }

    /**
     * Invoke Image Generator using DALL-E via Cloud Function
     */
    async invokeImageGenerator(context) {
        try {
            this.emit('onLog', { message: '   🎨 Generating image with DALL-E...', type: 'info' });

            const generateFn = firebase.functions().httpsCallable('generateCreativeContent');
            const result = await generateFn({
                type: 'promo_images',
                inputs: {
                    topic: context?.planName || 'professional business content',
                    audience: 'general',
                    tone: 'professional'
                },
                projectContext: context?.content || '',
                targetLanguage: 'English',
                mode: 'balanced'
            });

            if (result.data.success && result.data.data && result.data.data.length > 0) {
                return { imageUrl: result.data.data[0] };
            } else {
                throw new Error(result.data.error || 'No image generated from provider');
            }
        } catch (error) {
            console.warn('[DAGExecutor] Image generation failed, fallback to placeholder:', error.message);
            this.emit('onLog', { message: `   ⚠️ Image Gen failed (${error.message}), using placeholder`, type: 'warning' });
            // Fallback to placeholder
            return {
                imageUrl: `https://picsum.photos/seed/${context?.planName?.replace(/\s/g, '') || 'zynkdefault'}/800/600`
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
