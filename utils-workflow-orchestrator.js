// utils-workflow-orchestrator.js
// Local Task Orchestrator - Executes WorkflowTemplates at the team level
// Phase 2 - PRD 8.0

(function () {
    'use strict';

    /**
     * Execute a WorkflowTemplate for a specific Agent Team
     * @param {Object} params - Execution parameters
     * @param {string} params.projectId - Project ID
     * @param {string} params.teamInstanceId - Agent Team Instance ID
     * @param {string} params.workflowTemplateId - Workflow Template ID
     * @param {Object} params.taskContext - Task context (prompt, channel, etc.)
     * @returns {Promise<Object>} Execution result
     */
    window.runWorkflow = async function ({ projectId, teamInstanceId, workflowTemplateId, taskContext }) {
        console.log(`[Orchestrator] Starting workflow: ${workflowTemplateId}`);
        console.log(`[Orchestrator] Project: ${projectId}, Team: ${teamInstanceId}`);

        try {
            // 1. Load Workflow Template
            const workflowTemplate = await loadWorkflowTemplate(workflowTemplateId);
            if (!workflowTemplate) {
                throw new Error(`Workflow template not found: ${workflowTemplateId}`);
            }

            // 2. Load Team Sub-Agents
            const subAgents = await loadTeamSubAgents(teamInstanceId);
            if (subAgents.length === 0) {
                throw new Error(`No sub-agents found for team: ${teamInstanceId}`);
            }

            // 3. Execute Steps Sequentially
            const results = [];
            for (const step of workflowTemplate.steps) {
                console.log(`[Orchestrator] Executing step: ${step.id} (${step.engineType})`);

                const stepResult = await executeWorkflowStep({
                    projectId,
                    teamInstanceId,
                    workflowTemplateId,
                    step,
                    subAgents,
                    taskContext,
                    previousResults: results
                });

                results.push(stepResult);

                // Stop if step failed
                if (stepResult.status === 'failed') {
                    console.error(`[Orchestrator] Step failed: ${step.id}`);
                    break;
                }
            }

            console.log(`[Orchestrator] Workflow completed. ${results.length} steps executed.`);
            return {
                workflowTemplateId,
                status: results.every(r => r.status === 'completed') ? 'completed' : 'partial',
                results
            };

        } catch (error) {
            console.error('[Orchestrator] Workflow execution failed:', error);
            throw error;
        }
    };

    /**
     * Execute a single workflow step
     */
    async function executeWorkflowStep({ projectId, teamInstanceId, workflowTemplateId, step, subAgents, taskContext, previousResults }) {
        const startTime = Date.now();

        try {
            // 1. Select appropriate Sub-Agent for this step
            const subAgent = selectSubAgentForStep(step, subAgents);
            if (!subAgent) {
                throw new Error(`No suitable sub-agent found for step: ${step.id} (${step.engineType})`);
            }

            console.log(`[Orchestrator] Selected sub-agent: ${subAgent.role_name} (${subAgent.role_type})`);

            // 2. Load Sub-Agent Template
            const template = await loadSubAgentTemplate(subAgent.templateId || subAgent.template_id);
            if (!template) {
                console.warn(`Template not found for sub-agent: ${subAgent.id}, using defaults`);
            }

            // 3. Prepare execution context
            const executionContext = await prepareExecutionContext({
                projectId,
                step,
                subAgent,
                template,
                taskContext,
                previousResults
            });

            // 4. Execute Sub-Agent (Mock for now)
            const agentOutput = await executeSubAgent({
                subAgent,
                template,
                executionContext
            });

            // 5. Record execution in agentRuns
            const runId = await recordAgentRun({
                projectId,
                teamInstanceId,
                workflowTemplateId,
                workflowStepId: step.id,
                subAgentInstanceId: subAgent.id,
                executionContext,
                agentOutput,
                duration: Date.now() - startTime
            });

            // 6. Record generated content if applicable
            if (agentOutput.content) {
                await recordGeneratedContent({
                    projectId,
                    teamInstanceId,
                    workflowTemplateId,
                    workflowStepId: step.id,
                    runId,
                    content: agentOutput.content,
                    channelId: taskContext.channelId
                });
            }

            return {
                stepId: step.id,
                status: 'completed',
                runId,
                output: agentOutput
            };

        } catch (error) {
            console.error(`[Orchestrator] Step execution failed: ${step.id}`, error);
            return {
                stepId: step.id,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Select the best Sub-Agent for a workflow step
     */
    function selectSubAgentForStep(step, subAgents) {
        // Strategy 1: Exact engine type match
        let candidate = subAgents.find(sa => sa.role_type === step.engineType);

        if (candidate) return candidate;

        // Strategy 2: Family match (if step has family hint)
        if (step.family) {
            candidate = subAgents.find(sa => {
                // TODO: Load template to check family
                return false; // Placeholder
            });
        }

        // Strategy 3: First active agent (fallback)
        return subAgents.find(sa => sa.status === 'active');
    }

    /**
     * Prepare execution context (Brand Brain, Runtime Config, etc.)
     */
    async function prepareExecutionContext({ projectId, step, subAgent, template, taskContext, previousResults }) {
        const context = {
            taskPrompt: taskContext.prompt || step.action,
            channelId: taskContext.channelId,
            previousOutputs: previousResults.map(r => r.output)
        };

        // Brand Brain Integration
        if (template && template.requiresBrandBrain) {
            console.log('[Orchestrator] Querying Brand Brain...');
            const brandContexts = await window.queryBrandBrain(projectId, context.taskPrompt, {
                mode: template.brandContextMode || 'light'
            });
            context.brandContext = brandContexts;
        }

        // Runtime Configuration
        if (template && typeof window.resolveRuntimeConfig === 'function') {
            console.log('[Orchestrator] Resolving runtime config...');
            context.runtimeConfig = await window.resolveRuntimeConfig(template, subAgent);
        }

        return context;
    }

    /**
     * Execute Sub-Agent (Mock Implementation)
     */
    async function executeSubAgent({ subAgent, template, executionContext }) {
        console.log(`[Orchestrator] Executing sub-agent: ${subAgent.role_name}`);

        // TODO: Replace with actual LLM call
        // For now, return mock data
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

        const mockOutputs = {
            planner: {
                response: 'Generated content plan: Focus on AI trends, use hashtags #AI #Innovation',
                content: null
            },
            creator_text: {
                response: 'Caption created',
                content: {
                    type: 'text',
                    body: 'Check out our latest AI innovation! 🚀 #AI #Innovation #TechTrends'
                }
            },
            creator_image: {
                response: 'Image generated',
                content: {
                    type: 'image',
                    body: 'https://via.placeholder.com/1080x1080?text=AI+Innovation'
                }
            }
        };

        return mockOutputs[subAgent.role_type] || { response: 'Step completed', content: null };
    }

    /**
     * Record execution in agentRuns collection
     */
    async function recordAgentRun({ projectId, teamInstanceId, workflowTemplateId, workflowStepId, subAgentInstanceId, executionContext, agentOutput, duration }) {
        const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const runData = {
            id: runId,
            project_id: projectId,
            team_instance_id: teamInstanceId,
            sub_agent_instance_id: subAgentInstanceId,

            // Workflow Linking (Phase 2)
            workflowTemplateId,
            workflowStepId,
            teamInstanceId,

            status: 'completed',
            input_prompt: executionContext.taskPrompt,
            output_response: agentOutput.response,

            tokens_used: 0, // TODO: Get from LLM response
            execution_time_ms: duration,
            cost_estimated: 0,

            created_at: firebase.firestore.Timestamp.now(),
            completed_at: firebase.firestore.Timestamp.now()
        };

        await db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).set(runData);
        console.log(`[Orchestrator] Recorded agentRun: ${runId}`);

        return runId;
    }

    /**
     * Record generated content
     */
    async function recordGeneratedContent({ projectId, teamInstanceId, workflowTemplateId, workflowStepId, runId, content, channelId }) {
        const contentId = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const contentData = {
            id: contentId,
            project_id: projectId,
            team_instance_id: teamInstanceId,
            run_id: runId,

            // Workflow Linking (Phase 2)
            workflowTemplateId,
            workflowStepId,
            teamInstanceId,
            channelId: channelId || null,

            content_type: content.type,
            content_body: content.body,
            status: 'draft',

            created_at: firebase.firestore.Timestamp.now(),
            updated_at: firebase.firestore.Timestamp.now()
        };

        await db.collection('projects').doc(projectId).collection('generatedContents').doc(contentId).set(contentData);
        console.log(`[Orchestrator] Recorded generatedContent: ${contentId}`);

        return contentId;
    }

    /**
     * Load workflow template from Firestore
     */
    async function loadWorkflowTemplate(workflowTemplateId) {
        // TODO: Implement actual Firestore query
        // For now, return mock template
        return {
            id: workflowTemplateId,
            name: 'Instagram Organic Post',
            steps: [
                { id: 'step_001', engineType: 'planner', action: 'Generate post concept' },
                { id: 'step_002', engineType: 'creator_text', action: 'Write caption' },
                { id: 'step_003', engineType: 'creator_image', action: 'Generate image' }
            ]
        };
    }

    /**
     * Load team sub-agents from Firestore
     */
    async function loadTeamSubAgents(teamInstanceId) {
        const snapshot = await db.collection('projectAgentTeamInstances')
            .doc(teamInstanceId)
            .collection('subAgents')
            .where('status', '==', 'active')
            .get();

        const agents = [];
        snapshot.forEach(doc => agents.push({ id: doc.id, ...doc.data() }));
        return agents;
    }

    /**
     * Load sub-agent template
     */
    async function loadSubAgentTemplate(templateId) {
        if (!templateId) return null;

        const doc = await db.collection('subAgentTemplates').doc(templateId).get();
        return doc.exists ? doc.data() : null;
    }

    console.log('[Workflow Orchestrator] Module loaded');
})();
