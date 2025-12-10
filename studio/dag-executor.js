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
     * Invoke agent (mock implementation - replace with Cloud Function call)
     */
    async invokeAgent(agentId, context) {
        // Simulated processing time
        const processingTime = 1000 + Math.random() * 1500;
        await this.sleep(processingTime);

        if (context && Math.random() > 0.7) {
            this.emit('onLog', { message: `   Context applied: ${context.planName}`, type: 'info' });
        }

        // Mock responses
        const mockResponses = {
            creator_text: {
                content: context ?
                    `[Based on Plan: ${context.planName}]\n\n🚀 Exciting executed content based on your ${context.planType} plan.\n\nStrategy: ${context.content.substring(0, 50)}...\n\n#ZYNK #AI #Executed` :
                    "🚀 Exciting news! We're thrilled to announce our latest innovation that's changing the game.\n\n#Innovation #Technology #Future"
            },
            creator_image: {
                imageUrl: `https://image.pollinations.ai/prompt/${context ? encodeURIComponent(context.planType + ' ' + context.planName) : 'futuristic%20technology'}?width=800&height=600&nologo=true`
            },
            seo_optimizer: {
                score: Math.floor(Math.random() * (98 - 85 + 1)) + 85,
                details: "Keywords valid, H1 present"
            },
            compliance: {
                score: 100,
                status: 'Passed',
                checks: ['Copyright OK', 'Brand Voice Match', 'Safety Pass']
            }
        };

        return mockResponses[agentId] || { success: true };
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
