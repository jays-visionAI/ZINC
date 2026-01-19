/**
 * utils-workflow-engine.js
 * Standalone DAG Execution Engine for Workflows
 * Decentralized from the Workflow Canvas UI
 */

const WorkflowEngine = (function () {
    'use strict';

    // Internal state for a single execution run
    class ExecutionRun {
        constructor(workflow, projectContext, logger, options = {}) {
            this.workflow = workflow;
            this.projectContext = projectContext || {};
            this.logger = logger || console;
            this.options = options;
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

            for (let i = 0; i < order.length; i++) {
                const node = order[i];
                this.logger.log(`[WorkflowEngine] Executing ${node.type}: ${node.data.name || node.id}`);

                // Progress tracking
                if (this.options.onProgress) {
                    const percent = Math.floor((i / order.length) * 100);
                    this.options.onProgress({
                        node,
                        index: i,
                        total: order.length,
                        percent: percent,
                        message: `Executing: ${node.data.name || node.type}`
                    });
                }

                const startTime = Date.now();

                try {
                    const result = await this.executeNode(node);
                    this.nodeOutputs[node.id] = result;
                    this.logger.log(`[WorkflowEngine] ✅ ${node.id} completed successfully`);
                } catch (err) {
                    this.status = 'failed';
                    const errorDetails = err.message || 'Unknown error';
                    this.logger.error(`[WorkflowEngine] ❌ Node "${node.data.name || node.id}" failed: ${errorDetails}`);

                    // Attach node info to error for easier debugging
                    err.nodeId = node.id;
                    err.nodeType = node.type;
                    err.nodeName = node.data.name;
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

            // 1. Calculate in-degrees for all nodes reachable from any start point
            // For a precise DAG run starting from startNodeId, we'll use a degree map.
            const inDegree = {};
            nodes.forEach(n => inDegree[n.id] = 0);
            edges.forEach(e => {
                if (inDegree[e.target] !== undefined) {
                    inDegree[e.target]++;
                }
            });

            // 2. Kahn's Algorithm
            const queue = [startNodeId];
            const processed = new Set();

            // We need to be careful: the startNodeId might have incoming edges if it's not a true 'source'
            // but for our engine, startNodeId is the entry point.

            let count = 0;
            const MAX = nodes.length * 2;

            while (queue.length > 0 && count < MAX) {
                count++;
                const nodeId = queue.shift();
                if (processed.has(nodeId)) continue;

                const node = nodes.find(n => n.id === nodeId);
                if (!node) continue;

                order.push(node);
                processed.add(nodeId);

                // Find all children
                const outEdges = edges.filter(e => e.source === nodeId);
                outEdges.forEach(e => {
                    const childId = e.target;
                    inDegree[childId]--;
                    if (inDegree[childId] <= 0) {
                        queue.push(childId);
                    }
                });
            }

            if (order.length === 0) {
                this.logger.error('[WorkflowEngine] Failed to build execution order. Check start node.');
            }

            return order;
        }

        async executeNode(node) {
            const previousOutputs = this.getPreviousOutputs(node.id);
            const context = {
                projectContext: this.projectContext,
                previousOutputs: previousOutputs,
                allOutputs: this.nodeOutputs,
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
                case 'firestore':
                    // Special handling for common Market Intelligence workflow nodes
                    const nodeName = (node.data?.name || '').toLowerCase();

                    // 1. Collective Intelligence - fetch market keywords from project
                    if (nodeName.includes('collective intelligence') || nodeName.includes('집단지성')) {
                        this.logger.log(`[WorkflowEngine] 🧠 Collective Intelligence: Auto-fetching market keywords from project...`);
                        const db = firebase.firestore();
                        const projectDoc = await db.collection('projects').doc(context.projectId).get();
                        if (projectDoc.exists) {
                            const projectData = projectDoc.data();
                            const keywords = projectData.marketPulseKeywords || projectData.strategy?.keywords || [];
                            this.logger.log(`[WorkflowEngine] 🧠 Found ${keywords.length} keywords: ${keywords.join(', ')}`);
                            return {
                                keywords: keywords,
                                keywordList: keywords.map(k => ({ keyword: k, status: 'active' })),
                                projectName: projectData.name,
                                industry: projectData.industry,
                                targetAudience: projectData.targetAudience,
                                description: projectData.description,
                                source: 'project_document'
                            };
                        }
                        return { keywords: [], keywordList: [], warning: 'Project not found or no keywords configured' };
                    }

                    // 2. Brand Core Identity - fetch brand brain data
                    if (nodeName.includes('브랜드') || nodeName.includes('brand') || nodeName.includes('아이덴티티')) {
                        this.logger.log(`[WorkflowEngine] 🎨 Brand Identity: Auto-fetching brand data...`);
                        const brandData = await this.fetchBrandBrainData(context);
                        return brandData;
                    }

                    return await this.runFirestoreNode(node, context);
                case 'end':
                    let finalResult = previousOutputs;

                    // User's brilliant idea: Explicitly pick which node's output is the "Final Result"
                    if (node.data && node.data.finalOutputNodeId) {
                        const targetId = node.data.finalOutputNodeId;
                        this.logger.log(`[WorkflowEngine] END node redirection: Selecting output from ${targetId} as final result.`);
                        finalResult = context.allOutputs[targetId] || previousOutputs;
                    }

                    // PRD 11.2 - Auto-Export Logic
                    // Support both explicit 'firestore' destination AND 'autoExport' shorthand
                    if ((node.data && node.data.outputDestination === 'firestore') || (node.data && node.data.autoExport)) {
                        this.logger.log(`[WorkflowEngine] END node auto-export: Saving to Firestore...`);

                        const collection = node.data.outputCollection || node.data.autoExport;

                        // Map END node's export properties to Firestore node's expected properties
                        const fsConfig = {
                            data: {
                                operation: 'write',
                                collection: collection,
                                docId: node.data.outputDocId,
                                dataTemplate: node.data.outputDataTemplate || '{{prev.output}}' // Simpler default
                            }
                        };

                        // We need to inject the finalResult as 'prev.output' for the template resolver
                        const exportContext = { ...context, previousOutputs: { [node.id]: finalResult } };

                        try {
                            await this.runFirestoreNode(fsConfig, exportContext);
                            this.logger.log(`[WorkflowEngine] ✅ Auto-export saved successfully.`);
                        } catch (exportErr) {
                            this.logger.log(`[WorkflowEngine] ⚠️ Auto-export failed but continuing: ${exportErr.message}`, 'warn');
                            console.warn('[WorkflowEngine] Auto-export error detail:', exportErr);
                        }
                    }

                    return finalResult;
                default:
                    return { warning: `Node type ${node.type} not fully implemented in standalone engine` };
            }
        }

        async runFirestoreNode(node, context) {
            const operation = node.data.operation;
            const collection = node.data.collection ? this.resolveVariables(node.data.collection, context) : null;
            const docId = node.data.docId ? this.resolveVariables(node.data.docId, context) : null;
            const dataTemplate = node.data.dataTemplate;
            const db = firebase.firestore();

            // Optimize for direct output mapping (common for HTML results)
            // If the template is just '{{prev.output}}' and the output is a string, use it directly
            const prevOutput = Object.values(context.previousOutputs)[0];
            // Template Resolution
            let finalData = {};
            if (dataTemplate === '{{prev.output}}' && typeof prevOutput === 'string') {
                finalData = {
                    content: prevOutput,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
            } else {
                const resolvedData = this.resolveVariables(dataTemplate || "{}", context);
                try {
                    // If it looks like JSON, try to parse it
                    if (typeof resolvedData === 'string' && resolvedData.trim().startsWith('{')) {
                        finalData = JSON.parse(resolvedData);
                    } else {
                        finalData = { content: resolvedData };
                    }
                } catch (e) {
                    finalData = { content: resolvedData };
                }
            }

            if (operation === 'write') {
                if (!collection) throw new Error('Collection missing for Firestore Write');

                // If no docId is provided, and it's an auto-export scenario, we should probably 
                // generate a new ID to avoid overwriting the project record or failing on update rules
                let targetDocId = docId;
                if (!targetDocId) {
                    // For Project-scoped collections, if we don't have a docId, 
                    // we create a new random ID to support multiple versions/history
                    targetDocId = db.collection('projects').doc().id;
                }

                let targetCollection = collection;



                // SECURITY RULE COMPLIANCE: Force nested paths for project-scoped collections
                // These collections are ONLY writable under projects/{projectId}/...
                const projectScopedCollections = [
                    'onePagers', 'one_pagers', 'brandSummaries', 'brand_summaries',
                    'generatedContents', 'generated_contents', 'knowledgeSources', 'knowledge_sources',
                    'contentPlans', 'savedPlans', 'scheduledContent', 'brochures', 'pitchDecks',
                    'promoImages', 'generatedImages', 'researchHistory'
                ];

                if (projectScopedCollections.includes(collection)) {
                    // Check if we are already using a nested path (simple check)
                    if (!collection.startsWith('projects/')) {
                        this.logger.log(`[WorkflowEngine] 🛡️ Security Redirect: Routing '${collection}' to 'projects/${context.projectId}/${collection}'`);
                        // We use the sub-collection API structure
                        await db.collection('projects').doc(context.projectId).collection(collection).doc(targetDocId).set({
                            ...finalData,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });

                        return { success: true, savedAt: `projects/${context.projectId}/${collection}/${targetDocId}` };
                    }
                }

                // Default write for other collections (or if already full path)
                await db.collection(targetCollection).doc(targetDocId).set({
                    ...finalData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                return { success: true, savedAt: targetDocId };
            } else {
                // Read operation
                if (!collection || !docId) {
                    console.error('[WorkflowEngine] Firestore Read Failed: Missing configuration.', {
                        nodeName: node.data?.name || node.id,
                        collection,
                        docId
                    });
                    throw new Error(`Collection or DocID missing for Firestore Read (Node: ${node.data?.name || node.id})`);
                }
                const doc = await db.collection(collection).doc(docId).get();
                return doc.exists ? doc.data() : { error: 'Not found' };
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

            // Use direct firebase.functions() for more reliable timeout handling
            const executeSubAgent = firebase.app().functions('us-central1').httpsCallable('executeSubAgent', { timeout: 540000 });

            // Format history for the Cloud Function context
            const previousOutputsArray = Object.entries(context.previousOutputs).map(([id, content]) => ({
                role: id,
                content: typeof content === 'object' ? JSON.stringify(content) : content
            }));

            const result = await executeSubAgent({
                projectId: context.projectId,
                teamId: 'workflow', // Fallback for standalone execution
                subAgentId: agentId || node.id || 'general',
                agentRole: node.data.name || 'Assistant',
                runId: 'wf-run-' + Date.now(),
                taskPrompt: resolvedUserPrompt,
                systemPrompt: combinedSystemPrompt,
                previousOutputs: previousOutputsArray,
                model: model || 'deepseek-chat',
                provider: provider || 'deepseek',
                temperature: temperature || 0.3,
                runtimeProfileId: node.data.runtimeProfileId || null
            });

            if (!result.data.success) throw new Error(result.data.error || 'Agent failed');

            // Try to parse JSON if NOT HTML and seems like JSON
            let content = result.data.output || result.data.content;
            if (!content) return ""; // Safety fallback

            // Ensure content is string for safety before trimming
            const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
            const isHtml = contentStr.trim().toLowerCase().startsWith('<!doctype') || contentStr.trim().toLowerCase().startsWith('<html');

            if (!isHtml && typeof content === 'string') {
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
                if (parts[0] === 'advancedOptions') {
                    let obj = context.projectContext?.advancedOptions || {};
                    for (let i = 1; i < parts.length; i++) {
                        if (obj && obj[parts[i]] !== undefined) obj = obj[parts[i]];
                        else return match;
                    }
                    return typeof obj === 'object' ? JSON.stringify(obj) : obj;
                }
                if (parts[0] === 'nodes') {
                    const nodeId = parts[1];
                    const nodeOutput = context.allOutputs ? context.allOutputs[nodeId] : null;
                    if (!nodeOutput) return match;

                    if (parts[2] === 'output' || parts.length === 2) {
                        return typeof nodeOutput === 'object' ? JSON.stringify(nodeOutput) : nodeOutput;
                    }

                    // Handle deeper properties if output is an object
                    let obj = nodeOutput;
                    for (let i = 2; i < parts.length; i++) {
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

        async fetchKnowledgeHubData(ctx) {
            const db = firebase.firestore();
            const projectId = ctx.projectId;
            if (!projectId) throw new Error('Project ID missing for Knowledge Hub fetch');

            // According to Rules 158: match /projects/{projectId}/knowledgeSources/{sourceId}
            // Root query on 'knowledgeHub' or root 'knowledgeSources' will fail with permission-denied
            try {
                const snapshot = await db.collection('projects').doc(projectId)
                    .collection('knowledgeSources')
                    .where('active', '==', true)
                    .limit(20)
                    .get();

                const sources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                return {
                    sources: sources,
                    rawText: sources.map(s => `Title: ${s.title || 'Untitled'}\nContent: ${s.summary || s.content || s.description || ''}`).join('\n\n')
                };
            } catch (err) {
                if (err.code === 'permission-denied') {
                    console.warn(`[WorkflowEngine] Permission Denied for Knowledge Hub. Path: projects/${projectId}/knowledgeSources`);
                }
                throw err;
            }
        }

        async fetchProjectBriefData(ctx) {
            const db = firebase.firestore();
            const doc = await db.collection('projects').doc(ctx.projectId).get();
            return doc.exists ? doc.data() : { error: 'Project not found' };
        }

        async fetchBrandBrainData(ctx) {
            const db = firebase.firestore();
            const projectId = ctx.projectId;
            if (!projectId) throw new Error('Project ID missing for Brand Brain fetch');

            try {
                // Rules 437 keyed by userId, but we also use brandBrain/{projectId} at root for system agents
                // Let's try root first, then nested
                const doc = await db.collection('brandBrain').doc(projectId).get();
                if (doc.exists) return doc.data();

                // Nested Fallback (Rules 442)
                const userId = ctx.projectContext?.userId || (firebase.auth().currentUser?.uid);
                if (userId) {
                    const fallbackDoc = await db.collection('brandBrain').doc(userId).collection('projects').doc(projectId).get();
                    if (fallbackDoc.exists) return fallbackDoc.data();
                }

                return { error: 'Brand Brain not found' };
            } catch (err) {
                if (err.code === 'permission-denied') {
                    console.warn(`[WorkflowEngine] Permission Denied for Brand Brain at root. Trying nested...`);
                }
                return { error: err.message };
            }
        }
    }

    return {
        execute: async (workflow, projectContext, logger) => {
            const run = new ExecutionRun(workflow, projectContext, logger);
            const outputs = await run.run();
            return { outputs, workflowId: workflow.id };
        },

        executeById: async (workflowId, projectContext, logger, options = {}) => {
            const db = firebase.firestore();
            const doc = await db.collection('workflowDefinitions').doc(workflowId).get();
            if (!doc.exists) throw new Error('Workflow not found');
            const workflow = { id: doc.id, ...doc.data() };
            const run = new ExecutionRun(workflow, projectContext, logger, options);
            const outputs = await run.run();
            return { outputs, workflowId: workflow.id };
        },

        findAndExecuteByContext: async (pipelineContext, projectContext, logger) => {
            const db = firebase.firestore();
            logger.log(`[WorkflowEngine] Searching for workflow in context: ${pipelineContext}...`);
            const startTimeTotal = Date.now();

            try {
                // 1. Try finding by context (Prefer 'active', then any)
                let snapshot = await db.collection('workflowDefinitions')
                    .where('pipelineContext', 'in', [pipelineContext, 'one_pager', 'creative']) // Search broader contexts
                    .orderBy('createdAt', 'desc')
                    .limit(50)
                    .get();

                // If not found by context, get all and filter locally for better matching
                if (snapshot.empty) {
                    console.warn(`[WorkflowEngine] No workflows found for contexts: ${pipelineContext}. Fetching all workflows for fallback...`);
                    snapshot = await db.collection('workflowDefinitions').limit(100).get();
                }

                const allWorkflows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filter strategy:
                // A. Exact context match (highest priority)
                let target = allWorkflows.find(w => w.pipelineContext === pipelineContext && w.status === 'active') ||
                    allWorkflows.find(w => w.pipelineContext === pipelineContext) ||
                    allWorkflows.find(w => w.pipelineContext === 'one_pager' && w.status === 'active') ||
                    allWorkflows.find(w => w.pipelineContext === 'one_pager');

                // B. Name-based match (Keyword fallback)
                if (!target) {
                    const keywords = ['one pager', 'one-pager', '원페이저', 'onepager', 'studio pro'];
                    target = allWorkflows.find(w => {
                        const name = (w.name || '').toLowerCase();
                        return keywords.some(k => name.includes(k));
                    });
                }

                if (!target) {
                    const availableNames = allWorkflows.map(w => w.name).join(', ');
                    throw new Error(`No workflow found for context "${pipelineContext}". Available: [${availableNames}]. Please check your workflow Context in the Admin Canvas.`);
                }

                logger.log(`[WorkflowEngine] Selected workflow: "${target.name}" (${target.id})`);
                return await WorkflowEngine.executeById(target.id, projectContext, logger);

            } catch (err) {
                const elapsed = (Date.now() - startTimeTotal) / 1000;
                console.error(`[WorkflowEngine] Execution failed after ${elapsed.toFixed(1)}s`);
                console.error(`[WorkflowEngine] Type: ${err.name || 'Error'}, Code: ${err.code || 'n/a'}`);

                if (err.nodeId) {
                    console.error(`[WorkflowEngine] Failed Node: "${err.nodeName}" (${err.nodeId}) Type: ${err.nodeType}`);
                }

                if (err.code === 'permission-denied') {
                    console.warn('[WorkflowEngine] 🛡️ Permission Denied: Ensure you have access to all requested Firestore collections and the selected Project.');
                }

                console.error('[WorkflowEngine] Full Error:', err);
                throw err;
            }
        },

        incrementContentCount: async (workflowId) => {
            if (!workflowId) return;
            const db = firebase.firestore();
            try {
                // Use a non-blocking attempt to increment
                db.collection('workflowDefinitions').doc(workflowId).update({
                    contentCount: firebase.firestore.FieldValue.increment(1),
                    lastRunAt: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(err => {
                    console.warn(`[WorkflowEngine] Could not update workflow metadata (Permissons?): ${err.message}`);
                });
            } catch (err) {
                // Silently fail for metadata updates
            }
        }
    };
})();

window.WorkflowEngine = WorkflowEngine;
