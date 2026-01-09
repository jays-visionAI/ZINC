/**
 * utils-workflow-engine.js
 * Standalone DAG Execution Engine for Workflows
 * Decentralized from the Workflow Canvas UI
 */

const WorkflowEngine = (function () {
    'use strict';

    // Internal state for a single execution run
    class ExecutionRun {
        constructor(workflow, projectContext, logger) {
            this.workflow = workflow;
            this.projectContext = projectContext || {};
            this.logger = logger || console;
            this.nodeOutputs = {};
            this.status = 'idle';
        }

        async run() {
            this.status = 'running';
            this.logger.log(`[WorkflowEngine] Starting execution: ${this.workflow.name || 'Untitled'}`);

            const startNode = this.workflow.nodes.find(n => n.type === 'start');
            if (!startNode) throw new Error('Start node not found');

            const order = this.buildExecutionOrder(startNode.id);
            this.logger.log(`[WorkflowEngine] Execution Order: ${order.map(n => n.data.name || n.id).join(' -> ')}`);

            for (const node of order) {
                this.logger.log(`[WorkflowEngine] Executing ${node.type}: ${node.data.name || node.id}`);
                const startTime = Date.now();

                try {
                    const result = await this.executeNode(node);
                    this.nodeOutputs[node.id] = result;
                    this.logger.log(`[WorkflowEngine] ✅ ${node.id} completed in ${Date.now() - startTime}ms`);
                } catch (err) {
                    this.status = 'failed';
                    this.logger.error(`[WorkflowEngine] ❌ ${node.id} failed:`, err);
                    throw err;
                }
            }

            this.status = 'completed';
            return this.nodeOutputs;
        }

        buildExecutionOrder(startNodeId) {
            const nodes = this.workflow.nodes;
            const edges = this.workflow.edges;
            const order = [];
            const visited = new Set();
            const queue = [startNodeId];

            while (queue.length > 0) {
                const nodeId = queue.shift();
                if (visited.has(nodeId)) continue;

                const node = nodes.find(n => n.id === nodeId);
                if (!node) continue;

                // Check if all dependencies are satisfied (for DAG)
                const incomingEdges = edges.filter(e => e.target === nodeId);
                const allDepsSatisfied = incomingEdges.every(e => visited.has(e.source));

                if (incomingEdges.length > 0 && !allDepsSatisfied) {
                    // Put back in queue to try later
                    queue.push(nodeId);
                    continue;
                }

                order.push(node);
                visited.add(nodeId);

                // Add neighbors
                const neighbors = edges.filter(e => e.source === nodeId).map(e => e.target);
                queue.push(...neighbors);
            }
            return order;
        }

        async executeNode(node) {
            const previousOutputs = this.getPreviousOutputs(node.id);
            const context = {
                projectContext: this.projectContext,
                previousOutputs: previousOutputs,
                projectId: this.projectContext.id || this.projectContext.projectId
            };

            switch (node.type) {
                case 'start':
                    return { message: 'Workflow started' };
                case 'input':
                    return node.data.value || node.data.defaultValue || {};
                case 'knowledge_hub':
                    return await this.fetchKnowledgeHubData(context);
                case 'project_brief':
                    return await this.fetchProjectBriefData(context);
                case 'brand_brain':
                    return await this.fetchBrandBrainData(context);
                case 'agent':
                    return await this.runAgentNode(node, context);
                case 'transform':
                    return await this.runTransformNode(node, context);
                case 'end':
                    return previousOutputs; // Typically just pass through
                default:
                    return { warning: `Node type ${node.type} not fully implemented in standalone engine` };
            }
        }

        getPreviousOutputs(nodeId) {
            const incomingEdges = this.workflow.edges.filter(e => e.target === nodeId);
            const results = {};
            incomingEdges.forEach(e => {
                results[e.source] = this.nodeOutputs[e.source];
            });
            return results;
        }

        async runAgentNode(node, context) {
            const { agentId, model, temperature, systemPrompt, instruction } = node.data;
            const inputMapping = node.data.inputMapping;

            // Resolve prompt variables
            let resolvedUserPrompt = "Please process the data.";
            if (inputMapping) {
                resolvedUserPrompt = this.resolveVariables(inputMapping, context);
            }

            const combinedSystemPrompt = instruction
                ? `${systemPrompt}\n\n[ADDITIONAL INSTRUCTIONS]\n${instruction}`
                : systemPrompt;

            const provider = this.inferProvider(model);

            const executeSubAgent = firebase.app().functions('us-central1').httpsCallable('executeSubAgent');
            const result = await executeSubAgent({
                agentId: agentId || 'general',
                projectId: context.projectId,
                userPrompt: resolvedUserPrompt,
                systemPrompt: combinedSystemPrompt,
                model: model || 'gpt-4o-mini',
                provider: provider,
                temperature: temperature || 0.7,
                runtimeProfileId: null
            });

            if (!result.data.success) throw new Error(result.data.error || 'Agent failed');

            // Try to parse JSON if NOT HTML and seems like JSON
            let content = result.data.content;
            const isHtml = content.trim().toLowerCase().startsWith('<!doctype') || content.trim().toLowerCase().startsWith('<html');

            if (!isHtml) {
                try {
                    if (content.includes('{') && content.includes('}')) {
                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) content = JSON.parse(jsonMatch[0]);
                    }
                } catch (e) { /* keep as string if not JSON */ }
            }

            return content;
        }

        async runTransformNode(node, context) {
            const { transformType, template } = node.data;
            if (transformType === 'aggregate') {
                return context.previousOutputs;
            }
            if (transformType === 'template' && template) {
                return this.resolveVariables(template, context);
            }
            return context.previousOutputs;
        }

        resolveVariables(text, context) {
            if (typeof text !== 'string') return text;

            return text.replace(/\{\{([\w\.]+)\}\}/g, (match, path) => {
                const parts = path.split('.');
                let val = context;

                // Handle special paths
                if (parts[0] === 'projectId') return context.projectId || '';
                if (parts[0] === 'inputs') {
                    let obj = context.projectContext?.inputs || {};
                    for (let i = 1; i < parts.length; i++) {
                        if (obj && obj[parts[i]] !== undefined) obj = obj[parts[i]];
                        else return match;
                    }
                    return typeof obj === 'object' ? JSON.stringify(obj) : obj;
                }
                if (parts[0] === 'prev') {
                    // Get output from the first available previous node
                    const keys = Object.keys(context.previousOutputs);
                    if (keys.length > 0) {
                        let obj = context.previousOutputs[keys[0]];
                        for (let i = 1; i < parts.length; i++) {
                            if (obj && obj[parts[i]] !== undefined) obj = obj[parts[i]];
                            else return match;
                        }
                        return typeof obj === 'object' ? JSON.stringify(obj) : obj;
                    }
                }

                // Handle specific node IDs: {{node_1.output.summary}}
                if (context.previousOutputs[parts[0]]) {
                    let obj = context.previousOutputs[parts[0]];
                    // Skip 'output' part if user included it: node_1.output.xxx
                    const startIndex = parts[1] === 'output' ? 2 : 1;
                    for (let i = startIndex; i < parts.length; i++) {
                        if (obj && obj[parts[i]] !== undefined) obj = obj[parts[i]];
                        else return match;
                    }
                    return typeof obj === 'object' ? JSON.stringify(obj) : obj;
                }

                return match;
            });
        }

        inferProvider(model) {
            if (!model) return 'openai';
            const m = model.toLowerCase();
            if (m.includes('deepseek')) return 'deepseek';
            if (m.includes('claude')) return 'anthropic';
            if (m.includes('gemini')) return 'google';
            return 'openai';
        }

        // --- Data Fetchers ---
        async fetchKnowledgeHubData(ctx) {
            const db = firebase.firestore();
            const snapshot = await db.collection('projects').doc(ctx.projectId)
                .collection('knowledgeSources').get();

            const sources = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(s => s.isActive !== false);

            return {
                sources: sources,
                rawText: sources.map(s => `Title: ${s.title || 'Untitled'}\nContent: ${s.summary || s.content || s.description || ''}`).join('\n\n')
            };
        }

        async fetchProjectBriefData(ctx) {
            const db = firebase.firestore();
            const doc = await db.collection('projects').doc(ctx.projectId).get();
            return doc.exists ? doc.data() : { error: 'Project not found' };
        }

        async fetchBrandBrainData(ctx) {
            const db = firebase.firestore();
            const doc = await db.collection('projects').doc(ctx.projectId).collection('brandBrain').doc('core').get();
            return doc.exists ? doc.data() : { error: 'Brand Brain not found' };
        }
    }

    return {
        execute: async (workflow, projectContext, logger) => {
            const run = new ExecutionRun(workflow, projectContext, logger);
            const outputs = await run.run();
            return { outputs, workflowId: workflow.id };
        },

        executeById: async (workflowId, projectContext, logger) => {
            const db = firebase.firestore();
            const doc = await db.collection('workflowDefinitions').doc(workflowId).get();
            if (!doc.exists) throw new Error('Workflow not found');
            const workflow = { id: doc.id, ...doc.data() };
            const run = new ExecutionRun(workflow, projectContext, logger);
            const outputs = await run.run();
            return { outputs, workflowId: workflow.id };
        },

        findAndExecuteByContext: async (pipelineContext, projectContext, logger) => {
            const db = firebase.firestore();
            const snapshot = await db.collection('workflowDefinitions')
                .where('pipelineContext', '==', pipelineContext)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            let targetWorkflowId = null;

            if (snapshot.empty) {
                // Try fallback without active status filter if needed
                const snap2 = await db.collection('workflowDefinitions')
                    .where('pipelineContext', '==', pipelineContext)
                    .limit(1)
                    .get();
                if (snap2.empty) throw new Error(`No workflow found for context: ${pipelineContext}`);
                targetWorkflowId = snap2.docs[0].id;
            } else {
                targetWorkflowId = snapshot.docs[0].id;
            }

            return await WorkflowEngine.executeById(targetWorkflowId, projectContext, logger);
        },

        incrementContentCount: async (workflowId) => {
            if (!workflowId) return;
            const db = firebase.firestore();
            try {
                await db.collection('workflowDefinitions').doc(workflowId).update({
                    contentCount: firebase.firestore.FieldValue.increment(1),
                    lastRunAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`[WorkflowEngine] Incremented contentCount for ${workflowId}`);
            } catch (err) {
                console.warn('[WorkflowEngine] Failed to increment contentCount:', err);
            }
        }
    };
})();

window.WorkflowEngine = WorkflowEngine;
