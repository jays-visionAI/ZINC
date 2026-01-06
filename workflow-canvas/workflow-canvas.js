/**
 * ============================================
 * Workflow Canvas Builder - Main Controller
 * ============================================
 * 
 * AI-powered visual workflow designer for agent pipelines
 * Supports: Prompt-based generation, Canvas editing, Code export
 */

const WorkflowCanvas = (function () {
    'use strict';

    // ============================================
    // State
    // ============================================
    const state = {
        isOpen: false,
        currentStep: 1,
        pipelineContext: 'market', // market | brand | knowledge | studio | growth
        projectId: null,
        workflowId: null,

        // Canvas state
        nodes: [],
        edges: [],
        selectedNodeId: null,

        // Viewport state
        zoom: 1,
        panX: 0,
        panY: 0,

        // Drag state
        isDragging: false,
        dragNodeId: null,
        dragOffset: { x: 0, y: 0 },

        // Connection state
        isConnecting: false,
        connectionSource: null,

        // Analysis result
        analysisResult: null,

        // Available agents per context
        availableAgents: {
            market: [
                { id: 'research', name: 'Trend Researcher', icon: '🔍', description: 'Market trend analysis' },
                { id: 'seo_watcher', name: 'SEO Watcher', icon: '📊', description: 'SEO monitoring and keywords' }
            ],
            brand: [
                { id: 'planner', name: 'Strategic Planner', icon: '🎯', description: 'Brand strategy and planning' }
            ],
            knowledge: [
                { id: 'standard', name: 'Brand Summary', icon: '📝', description: 'Standard document analysis' },
                { id: 'depth', name: 'Depth Report', icon: '📑', description: 'Deep A4 analysis' },
                { id: 'insights', name: 'Insight Analyst', icon: '💡', description: 'Mind map and competitor analysis' },
                { id: 'strategy', name: 'Strategic Planner', icon: '🎯', description: 'Campaign and content planning' },
                { id: 'quick', name: 'Creative Copywriter', icon: '✍️', description: 'Social and ad copy' },
                { id: 'studio_docs', name: 'Document Designer', icon: '📄', description: 'Press release and email' },
                { id: 'studio_visual', name: 'Visual Director', icon: '🎨', description: 'Image and visual prompts' }
            ],
            studio: [
                { id: 'creator', name: 'Visual Creator', icon: '🎨', description: 'Visual content production' },
                { id: 'text', name: 'Text Producer', icon: '✍️', description: 'Copywriting and text finalization' },
                { id: 'orchestrator', name: 'Studio Orchestrator', icon: '🎭', description: 'Master workflow controller' }
            ],
            growth: [
                { id: 'manager', name: 'Evaluation Manager', icon: '📈', description: 'Performance review' },
                { id: 'reasoner', name: 'Strategy Reasoner', icon: '🧠', description: 'Deep thinking and analysis' }
            ]
        }
    };

    // Node ID counter
    let nodeIdCounter = 0;
    let edgeIdCounter = 0;

    // ============================================
    // DOM Elements
    // ============================================
    let elements = {};

    function cacheElements() {
        elements = {
            modal: document.getElementById('workflow-canvas-modal'),
            promptInput: document.getElementById('wf-prompt-input'),
            analysisResult: document.getElementById('wf-analysis-result'),
            detectedAgents: document.getElementById('wf-detected-agents'),
            flowDescription: document.getElementById('wf-flow-description'),
            agentChips: document.getElementById('wf-agent-chips'),
            canvasArea: document.getElementById('wf-canvas-area'),
            canvasViewport: document.getElementById('wf-canvas-viewport'),
            nodesContainer: document.getElementById('wf-nodes-container'),
            connectionsSvg: document.getElementById('wf-connections-svg'),
            propertiesBody: document.getElementById('wf-properties-body'),
            noSelection: document.getElementById('wf-no-selection'),
            propertiesForm: document.getElementById('wf-properties-form'),
            jsonOutput: document.getElementById('wf-json-output'),
            jsOutput: document.getElementById('wf-js-output')
        };
    }

    // ============================================
    // Initialization
    // ============================================
    async function init() {
        // Load HTML template if not already present
        if (!document.getElementById('workflow-canvas-modal')) {
            await loadTemplate();
        }

        cacheElements();
        setupEventListeners();
        console.log('✅ WorkflowCanvas initialized');
    }

    async function loadTemplate() {
        try {
            const response = await fetch('/workflow-canvas/workflow-canvas.html');
            const html = await response.text();

            // Create container and append to body
            const container = document.createElement('div');
            container.innerHTML = html;
            document.body.appendChild(container.firstElementChild);

            // Load CSS if not already loaded
            if (!document.querySelector('link[href*="workflow-canvas.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/workflow-canvas/workflow-canvas.css';
                document.head.appendChild(link);
            }
        } catch (err) {
            console.error('Failed to load workflow canvas template:', err);
        }
    }

    function setupEventListeners() {
        // Step tabs
        document.querySelectorAll('.wf-step-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const step = parseInt(tab.dataset.step);
                goToStep(step);
            });
        });

        // Canvas interactions
        if (elements.canvasArea) {
            elements.canvasArea.addEventListener('mousedown', handleCanvasMouseDown);
            elements.canvasArea.addEventListener('mousemove', handleCanvasMouseMove);
            elements.canvasArea.addEventListener('mouseup', handleCanvasMouseUp);
            elements.canvasArea.addEventListener('wheel', handleCanvasWheel);
        }

        // Palette drag
        document.querySelectorAll('.wf-palette-item').forEach(item => {
            item.addEventListener('dragstart', handlePaletteDragStart);
            item.addEventListener('dragend', handlePaletteDragEnd);
        });

        // Canvas drop zone
        if (elements.canvasArea) {
            elements.canvasArea.addEventListener('dragover', e => e.preventDefault());
            elements.canvasArea.addEventListener('drop', handleCanvasDrop);
        }

        // Property inputs
        setupPropertyListeners();

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyDown);
    }

    function setupPropertyListeners() {
        const propName = document.getElementById('wf-prop-name');
        const propAgent = document.getElementById('wf-prop-agent');
        const propModel = document.getElementById('wf-prop-model');
        const propTemp = document.getElementById('wf-prop-temp');
        const propCondition = document.getElementById('wf-prop-condition');

        if (propName) propName.addEventListener('input', (e) => updateNodeProperty('name', e.target.value));
        if (propAgent) propAgent.addEventListener('change', (e) => updateNodeProperty('agentId', e.target.value));
        if (propModel) propModel.addEventListener('change', (e) => updateNodeProperty('model', e.target.value));
        if (propTemp) {
            propTemp.addEventListener('input', (e) => {
                updateNodeProperty('temperature', parseFloat(e.target.value));
                document.getElementById('wf-prop-temp-value').textContent = e.target.value;
            });
        }
        if (propCondition) propCondition.addEventListener('input', (e) => updateNodeProperty('expression', e.target.value));
    }

    // ============================================
    // Public API
    // ============================================
    function open(context = 'market', projectId = null) {
        state.pipelineContext = context;
        state.projectId = projectId;
        state.isOpen = true;

        if (!elements.modal) {
            init().then(() => {
                showModal();
            });
        } else {
            showModal();
        }
    }

    function showModal() {
        elements.modal.classList.add('active');
        renderAgentChips();
        goToStep(1);
        document.body.style.overflow = 'hidden';
    }

    function close() {
        if (elements.modal) {
            elements.modal.classList.remove('active');
        }
        state.isOpen = false;
        document.body.style.overflow = '';
    }

    function reset() {
        if (!confirm('모든 변경사항이 초기화됩니다. 계속하시겠습니까?')) return;

        state.nodes = [];
        state.edges = [];
        state.selectedNodeId = null;
        state.analysisResult = null;
        nodeIdCounter = 0;
        edgeIdCounter = 0;

        if (elements.nodesContainer) elements.nodesContainer.innerHTML = '';
        if (elements.connectionsSvg) elements.connectionsSvg.innerHTML = '';
        if (elements.promptInput) elements.promptInput.value = '';
        if (elements.analysisResult) elements.analysisResult.classList.remove('active');

        hidePropertiesForm();
        goToStep(1);
    }

    function goToStep(step) {
        state.currentStep = step;

        // Update tabs
        document.querySelectorAll('.wf-step-tab').forEach(tab => {
            const tabStep = parseInt(tab.dataset.step);
            tab.classList.remove('active', 'completed');
            if (tabStep === step) {
                tab.classList.add('active');
            } else if (tabStep < step) {
                tab.classList.add('completed');
            }
        });

        // Update content
        document.querySelectorAll('.wf-step-content').forEach((content, idx) => {
            content.classList.toggle('active', idx + 1 === step);
        });

        // Generate code when going to step 3
        if (step === 3) {
            generateCode();
        }
    }

    // ============================================
    // Step 1: Prompt Analysis
    // ============================================
    async function analyzePrompt() {
        const prompt = elements.promptInput.value.trim();
        if (!prompt) {
            alert('워크플로우 설명을 입력해주세요.');
            return;
        }

        // Show loading
        elements.analysisResult.classList.add('active');
        elements.detectedAgents.innerHTML = '<div class="wf-loading"><div class="wf-spinner"></div><span class="wf-loading-text">AI가 분석 중입니다...</span></div>';
        elements.flowDescription.innerHTML = '';

        try {
            // Call LLM for analysis (mock for now, will integrate with backend)
            const analysis = await mockAnalyzePrompt(prompt);
            state.analysisResult = analysis;

            // Render detected agents
            elements.detectedAgents.innerHTML = analysis.detectedAgents.map(agent => `
                <div class="wf-detected-agent">
                    <span>✅</span>
                    <span>${agent.name}</span>
                </div>
            `).join('');

            // Render flow description
            elements.flowDescription.innerHTML = `
                <strong>감지된 흐름:</strong><br>
                ${analysis.flowDescription}
            `;
        } catch (err) {
            console.error('Analysis failed:', err);
            elements.detectedAgents.innerHTML = '<p style="color: var(--wf-red);">분석 중 오류가 발생했습니다.</p>';
        }
    }

    // Mock analysis (to be replaced with real LLM call)
    async function mockAnalyzePrompt(prompt) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const contextAgents = state.availableAgents[state.pipelineContext] || [];

        // Simple keyword matching for demo
        const detectedAgents = [];
        const keywords = prompt.toLowerCase();

        if (keywords.includes('트렌드') || keywords.includes('분석') || keywords.includes('리서치')) {
            detectedAgents.push(contextAgents.find(a => a.id === 'research') || contextAgents[0]);
        }
        if (keywords.includes('기획') || keywords.includes('전략') || keywords.includes('플래닝')) {
            detectedAgents.push(contextAgents.find(a => a.id === 'planner') || contextAgents.find(a => a.id === 'strategy'));
        }
        if (keywords.includes('콘텐츠') || keywords.includes('글') || keywords.includes('작성')) {
            detectedAgents.push(contextAgents.find(a => a.id === 'quick') || contextAgents.find(a => a.id === 'text'));
        }
        if (keywords.includes('이미지') || keywords.includes('비주얼') || keywords.includes('디자인')) {
            detectedAgents.push(contextAgents.find(a => a.id === 'studio_visual') || contextAgents.find(a => a.id === 'creator'));
        }

        // Remove undefined
        const validAgents = detectedAgents.filter(Boolean);

        // Generate flow description
        const hasCondition = keywords.includes('만약') || keywords.includes('결과') || keywords.includes('유의미');
        const hasParallel = keywords.includes('동시') || keywords.includes('병렬') || keywords.includes('함께');

        let flowDescription = '';
        if (validAgents.length > 0) {
            flowDescription = `• 순차 실행: ${validAgents.map(a => a.name).join(' → ')}`;
            if (hasCondition) {
                flowDescription += '\n• 조건 분기 포함: 결과에 따라 다음 단계 결정';
            }
            if (hasParallel) {
                flowDescription += '\n• 병렬 처리 포함: 일부 작업 동시 진행';
            }
        } else {
            flowDescription = '• 워크플로우 흐름을 더 구체적으로 설명해주세요.';
        }

        return {
            detectedAgents: validAgents.length > 0 ? validAgents : [contextAgents[0]].filter(Boolean),
            flowDescription,
            hasCondition,
            hasParallel,
            confidence: 0.85
        };
    }

    function applyToCanvas() {
        if (!state.analysisResult) return;

        // Clear canvas
        state.nodes = [];
        state.edges = [];
        if (elements.nodesContainer) elements.nodesContainer.innerHTML = '';
        if (elements.connectionsSvg) elements.connectionsSvg.innerHTML = '';

        const { detectedAgents, hasCondition, hasParallel } = state.analysisResult;

        // Create Start node
        const startNode = createNode('start', 100, 250);

        let lastNodeId = startNode.id;
        let xPos = 250;
        const yBase = 250;

        // Create agent nodes
        detectedAgents.forEach((agent, idx) => {
            if (hasParallel && idx === detectedAgents.length - 2 && detectedAgents.length >= 2) {
                // Create parallel nodes for last two agents
                const parallel1 = createNode('agent', xPos, yBase - 80, { agentId: agent.id, name: agent.name, icon: agent.icon });
                const parallel2 = createNode('agent', xPos, yBase + 80, {
                    agentId: detectedAgents[idx + 1].id,
                    name: detectedAgents[idx + 1].name,
                    icon: detectedAgents[idx + 1].icon
                });

                createEdge(lastNodeId, parallel1.id);
                createEdge(lastNodeId, parallel2.id);

                // End node connects to both
                const endNode = createNode('end', xPos + 280, yBase);
                createEdge(parallel1.id, endNode.id);
                createEdge(parallel2.id, endNode.id);

                renderAllNodes();
                renderAllEdges();
                goToStep(2);
                return;
            }

            if (hasCondition && idx === 0) {
                // Add condition after first agent
                const agentNode = createNode('agent', xPos, yBase, { agentId: agent.id, name: agent.name, icon: agent.icon });
                createEdge(lastNodeId, agentNode.id);
                xPos += 280;

                const condNode = createNode('condition', xPos, yBase, { expression: 'output.confidence > 0.7' });
                createEdge(agentNode.id, condNode.id);
                lastNodeId = condNode.id;
                xPos += 160;
            } else if (!hasParallel || idx < detectedAgents.length - 2) {
                const agentNode = createNode('agent', xPos, yBase, { agentId: agent.id, name: agent.name, icon: agent.icon });
                createEdge(lastNodeId, agentNode.id);
                lastNodeId = agentNode.id;
                xPos += 280;
            }
        });

        // Create End node
        const endNode = createNode('end', xPos, yBase);
        createEdge(lastNodeId, endNode.id);

        renderAllNodes();
        renderAllEdges();
        goToStep(2);
    }

    function showTemplates() {
        alert('템플릿 라이브러리는 곧 제공될 예정입니다.');
    }

    function refineAnalysis() {
        elements.promptInput.focus();
        elements.promptInput.setSelectionRange(elements.promptInput.value.length, elements.promptInput.value.length);
    }

    // ============================================
    // Step 2: Canvas Operations
    // ============================================
    function renderAgentChips() {
        const agents = state.availableAgents[state.pipelineContext] || [];
        if (elements.agentChips) {
            elements.agentChips.innerHTML = agents.map(agent => `
                <div class="wf-agent-chip" data-agent-id="${agent.id}">
                    <span>${agent.icon}</span>
                    <span>${agent.name}</span>
                </div>
            `).join('');
        }
    }

    function createNode(type, x, y, data = {}) {
        const id = `node_${++nodeIdCounter}`;
        const node = {
            id,
            type,
            x,
            y,
            data: {
                name: data.name || getDefaultNodeName(type),
                icon: data.icon || getDefaultNodeIcon(type),
                agentId: data.agentId || '',
                model: data.model || 'gpt-4o',
                temperature: data.temperature || 0.7,
                expression: data.expression || '',
                ...data
            }
        };
        state.nodes.push(node);
        return node;
    }

    function getDefaultNodeName(type) {
        const names = {
            start: 'Start',
            end: 'End',
            agent: 'Agent',
            condition: 'Condition',
            parallel: 'Parallel'
        };
        return names[type] || 'Node';
    }

    function getDefaultNodeIcon(type) {
        const icons = {
            start: '▶️',
            end: '⏹️',
            agent: '🤖',
            condition: '🔀',
            parallel: '⚡'
        };
        return icons[type] || '📦';
    }

    function createEdge(sourceId, targetId, label = '') {
        const id = `edge_${++edgeIdCounter}`;
        const edge = { id, source: sourceId, target: targetId, label };
        state.edges.push(edge);
        return edge;
    }

    function renderAllNodes() {
        if (!elements.nodesContainer) return;
        elements.nodesContainer.innerHTML = '';
        state.nodes.forEach(node => renderNode(node));
    }

    function renderNode(node) {
        const el = document.createElement('div');
        el.id = node.id;
        el.className = `wf-node wf-node-${node.type}`;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;

        if (node.id === state.selectedNodeId) {
            el.classList.add('selected');
        }

        switch (node.type) {
            case 'start':
                el.innerHTML = `
                    <div class="wf-node-start-inner">
                        <span class="wf-node-icon">${node.data.icon}</span>
                        <span>START</span>
                    </div>
                    <div class="wf-port wf-port-output"></div>
                `;
                break;

            case 'end':
                el.innerHTML = `
                    <div class="wf-node-end-inner">
                        <span class="wf-node-icon">${node.data.icon}</span>
                        <span>END</span>
                    </div>
                    <div class="wf-port wf-port-input"></div>
                `;
                break;

            case 'agent':
                el.innerHTML = `
                    <div class="wf-node-agent-inner">
                        <div class="wf-node-agent-header">
                            <span class="wf-node-agent-icon">${node.data.icon}</span>
                            <span class="wf-node-agent-name">${node.data.name}</span>
                            <div class="wf-node-agent-status"></div>
                        </div>
                        <div class="wf-node-agent-body">
                            <div class="wf-node-agent-info">
                                <span><strong>Model:</strong> ${node.data.model}</span>
                                <span><strong>Temp:</strong> ${node.data.temperature}</span>
                            </div>
                        </div>
                    </div>
                    <div class="wf-port wf-port-input"></div>
                    <div class="wf-port wf-port-output"></div>
                `;
                break;

            case 'condition':
                el.innerHTML = `
                    <div class="wf-node-condition-inner">
                        <div class="wf-node-condition-content">
                            <span class="wf-node-icon">${node.data.icon}</span>
                            <span>IF/ELSE</span>
                        </div>
                    </div>
                    <div class="wf-port wf-port-input"></div>
                    <div class="wf-port wf-port-output wf-port-output-true" style="top: 20%; right: -7px;"></div>
                    <div class="wf-port wf-port-output wf-port-output-false" style="top: 80%; right: -7px;"></div>
                `;
                break;

            case 'parallel':
                el.innerHTML = `
                    <div class="wf-node-parallel-inner">
                        <span class="wf-node-icon">${node.data.icon}</span>
                        <span>PARALLEL</span>
                    </div>
                    <div class="wf-port wf-port-input"></div>
                    <div class="wf-port wf-port-output"></div>
                `;
                break;
        }

        // Event listeners
        el.addEventListener('mousedown', (e) => handleNodeMouseDown(e, node.id));
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectNode(node.id);
        });

        elements.nodesContainer.appendChild(el);
    }

    function renderAllEdges() {
        if (!elements.connectionsSvg) return;
        elements.connectionsSvg.innerHTML = '';
        state.edges.forEach(edge => renderEdge(edge));
    }

    function renderEdge(edge) {
        const sourceNode = state.nodes.find(n => n.id === edge.source);
        const targetNode = state.nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        // Calculate port positions
        const sourceEl = document.getElementById(sourceNode.id);
        const targetEl = document.getElementById(targetNode.id);
        if (!sourceEl || !targetEl) return;

        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const canvasRect = elements.canvasArea.getBoundingClientRect();

        // Source point (right side)
        const x1 = sourceNode.x + sourceRect.width;
        const y1 = sourceNode.y + sourceRect.height / 2;

        // Target point (left side)
        const x2 = targetNode.x;
        const y2 = targetNode.y + targetRect.height / 2;

        // Create bezier curve
        const midX = (x1 + x2) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
        path.setAttribute('class', 'wf-connection-line');
        path.setAttribute('id', edge.id);

        elements.connectionsSvg.appendChild(path);
    }

    // ============================================
    // Node Selection & Properties
    // ============================================
    function selectNode(nodeId) {
        // Deselect previous
        if (state.selectedNodeId) {
            const prevEl = document.getElementById(state.selectedNodeId);
            if (prevEl) prevEl.classList.remove('selected');
        }

        state.selectedNodeId = nodeId;
        const newEl = document.getElementById(nodeId);
        if (newEl) newEl.classList.add('selected');

        showPropertiesForm(nodeId);
    }

    function showPropertiesForm(nodeId) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node) return;

        elements.noSelection.style.display = 'none';
        elements.propertiesForm.style.display = 'block';

        // Fill form values
        document.getElementById('wf-prop-type').value = node.type.toUpperCase();
        document.getElementById('wf-prop-name').value = node.data.name || '';

        // Show/hide fields based on node type
        const agentGroup = document.getElementById('wf-prop-agent-group');
        const modelGroup = document.getElementById('wf-prop-model-group');
        const tempGroup = document.getElementById('wf-prop-temp-group');
        const conditionGroup = document.getElementById('wf-prop-condition-group');
        const inputGroup = document.getElementById('wf-prop-input-group');

        agentGroup.style.display = node.type === 'agent' ? 'block' : 'none';
        modelGroup.style.display = node.type === 'agent' ? 'block' : 'none';
        tempGroup.style.display = node.type === 'agent' ? 'block' : 'none';
        conditionGroup.style.display = node.type === 'condition' ? 'block' : 'none';
        inputGroup.style.display = node.type === 'agent' ? 'block' : 'none';

        if (node.type === 'agent') {
            // Populate agent selector
            const agentSelect = document.getElementById('wf-prop-agent');
            const agents = state.availableAgents[state.pipelineContext] || [];
            agentSelect.innerHTML = '<option value="">Select Agent...</option>' +
                agents.map(a => `<option value="${a.id}" ${a.id === node.data.agentId ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('');

            document.getElementById('wf-prop-model').value = node.data.model || 'gpt-4o';
            document.getElementById('wf-prop-temp').value = node.data.temperature || 0.7;
            document.getElementById('wf-prop-temp-value').textContent = node.data.temperature || 0.7;
        }

        if (node.type === 'condition') {
            document.getElementById('wf-prop-condition').value = node.data.expression || '';
        }
    }

    function hidePropertiesForm() {
        elements.noSelection.style.display = 'flex';
        elements.propertiesForm.style.display = 'none';
    }

    function updateNodeProperty(key, value) {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node) return;

        node.data[key] = value;

        // Update visual if needed
        if (key === 'name' || key === 'model' || key === 'temperature') {
            renderAllNodes();
            selectNode(state.selectedNodeId);
        }

        renderAllEdges();
    }

    function deleteSelectedNode() {
        if (!state.selectedNodeId) return;
        if (!confirm('이 노드를 삭제하시겠습니까?')) return;

        // Remove edges connected to this node
        state.edges = state.edges.filter(e => e.source !== state.selectedNodeId && e.target !== state.selectedNodeId);

        // Remove node
        state.nodes = state.nodes.filter(n => n.id !== state.selectedNodeId);
        state.selectedNodeId = null;

        renderAllNodes();
        renderAllEdges();
        hidePropertiesForm();
    }

    // ============================================
    // Canvas Event Handlers
    // ============================================
    function handleNodeMouseDown(e, nodeId) {
        if (e.target.classList.contains('wf-port')) return;

        e.preventDefault();
        state.isDragging = true;
        state.dragNodeId = nodeId;

        const node = state.nodes.find(n => n.id === nodeId);
        state.dragOffset = {
            x: e.clientX - node.x,
            y: e.clientY - node.y
        };
    }

    function handleCanvasMouseDown(e) {
        if (e.target === elements.canvasArea || e.target === elements.canvasViewport) {
            // Deselect when clicking on canvas
            if (state.selectedNodeId) {
                const el = document.getElementById(state.selectedNodeId);
                if (el) el.classList.remove('selected');
                state.selectedNodeId = null;
                hidePropertiesForm();
            }
        }
    }

    function handleCanvasMouseMove(e) {
        if (!state.isDragging || !state.dragNodeId) return;

        const node = state.nodes.find(n => n.id === state.dragNodeId);
        if (!node) return;

        node.x = e.clientX - state.dragOffset.x;
        node.y = e.clientY - state.dragOffset.y;

        const el = document.getElementById(state.dragNodeId);
        if (el) {
            el.style.left = `${node.x}px`;
            el.style.top = `${node.y}px`;
        }

        renderAllEdges();
    }

    function handleCanvasMouseUp(e) {
        state.isDragging = false;
        state.dragNodeId = null;
    }

    function handleCanvasWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.5, Math.min(2, state.zoom + delta));
        state.zoom = newZoom;

        if (elements.canvasViewport) {
            elements.canvasViewport.style.transform = `scale(${state.zoom})`;
        }
    }

    function handlePaletteDragStart(e) {
        e.dataTransfer.setData('node-type', e.target.dataset.type);
    }

    function handlePaletteDragEnd(e) {
        // Cleanup
    }

    function handleCanvasDrop(e) {
        e.preventDefault();
        const type = e.dataTransfer.getData('node-type');
        if (!type) return;

        const rect = elements.canvasArea.getBoundingClientRect();
        const x = (e.clientX - rect.left) / state.zoom;
        const y = (e.clientY - rect.top) / state.zoom;

        const node = createNode(type, x, y);
        renderNode(node);
        selectNode(node.id);
    }

    function handleKeyDown(e) {
        if (!state.isOpen) return;

        // Delete key
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (state.selectedNodeId && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                deleteSelectedNode();
            }
        }

        // Escape key
        if (e.key === 'Escape') {
            close();
        }
    }

    // ============================================
    // Zoom Controls
    // ============================================
    function zoomIn() {
        state.zoom = Math.min(2, state.zoom + 0.2);
        elements.canvasViewport.style.transform = `scale(${state.zoom})`;
    }

    function zoomOut() {
        state.zoom = Math.max(0.5, state.zoom - 0.2);
        elements.canvasViewport.style.transform = `scale(${state.zoom})`;
    }

    function zoomReset() {
        state.zoom = 1;
        elements.canvasViewport.style.transform = 'scale(1)';
    }

    // ============================================
    // Step 3: Code Generation
    // ============================================
    function generateCode() {
        const workflow = {
            id: state.workflowId || `wf_${Date.now()}`,
            name: 'Generated Workflow',
            pipelineContext: state.pipelineContext,
            version: '1.0.0',
            nodes: state.nodes.map(n => ({
                id: n.id,
                type: n.type,
                position: { x: n.x, y: n.y },
                data: n.data
            })),
            edges: state.edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label
            })),
            createdAt: new Date().toISOString()
        };

        // JSON output
        const jsonStr = JSON.stringify(workflow, null, 2);
        elements.jsonOutput.innerHTML = `<code>${escapeHtml(jsonStr)}</code>`;

        // Generate JS execution code
        const jsCode = generateExecutionCode(workflow);
        elements.jsOutput.innerHTML = `<code>${escapeHtml(jsCode)}</code>`;
    }

    function generateExecutionCode(workflow) {
        let code = `// Auto-generated Workflow Execution Code
// Generated: ${new Date().toISOString()}

async function executeWorkflow_${workflow.id.replace(/[^a-zA-Z0-9]/g, '_')}(input) {
    const context = { input, outputs: {} };
    
`;

        // Sort nodes by edges (topological sort simplified)
        const startNode = workflow.nodes.find(n => n.type === 'start');
        if (startNode) {
            code += `    // START\n    console.log('Workflow started:', input);\n\n`;
        }

        workflow.nodes.filter(n => n.type === 'agent').forEach((node, idx) => {
            code += `    // Agent: ${node.data.name}\n`;
            code += `    context.outputs['${node.id}'] = await executeAgent('${node.data.agentId}', {\n`;
            code += `        model: '${node.data.model}',\n`;
            code += `        temperature: ${node.data.temperature},\n`;
            code += `        input: context.input\n`;
            code += `    });\n\n`;
        });

        workflow.nodes.filter(n => n.type === 'condition').forEach(node => {
            code += `    // Condition: ${node.data.expression || 'custom'}\n`;
            code += `    if (${node.data.expression || 'true'}) {\n`;
            code += `        // TRUE branch\n`;
            code += `    } else {\n`;
            code += `        // FALSE branch\n`;
            code += `    }\n\n`;
        });

        code += `    // END\n    return context.outputs;\n}\n`;

        return code;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ============================================
    // Save Operations
    // ============================================
    async function saveAsDraft() {
        const workflow = {
            id: state.workflowId || null,
            name: prompt('워크플로우 이름을 입력하세요:', 'My Workflow') || 'Untitled',
            pipelineContext: state.pipelineContext,
            projectId: state.projectId,
            status: 'draft',
            nodes: state.nodes,
            edges: state.edges,
            updatedAt: new Date().toISOString()
        };

        console.log('Saving workflow draft:', workflow);
        alert('워크플로우가 저장되었습니다. (Draft)');

        // TODO: Integrate with Firestore
    }

    async function saveAndRun() {
        await saveAsDraft();
        alert('워크플로우 실행 기능은 곧 제공될 예정입니다.');

        // TODO: Execute workflow via DAG Executor
    }

    function copyJSON() {
        const jsonStr = JSON.stringify({
            nodes: state.nodes,
            edges: state.edges
        }, null, 2);
        navigator.clipboard.writeText(jsonStr);
        alert('JSON이 클립보드에 복사되었습니다.');
    }

    function copyJS() {
        const jsCode = elements.jsOutput.textContent;
        navigator.clipboard.writeText(jsCode);
        alert('JavaScript 코드가 클립보드에 복사되었습니다.');
    }

    // ============================================
    // Return Public API
    // ============================================
    return {
        init,
        open,
        close,
        reset,
        goToStep,
        analyzePrompt,
        applyToCanvas,
        showTemplates,
        refineAnalysis,
        zoomIn,
        zoomOut,
        zoomReset,
        deleteSelectedNode,
        saveAsDraft,
        saveAndRun,
        copyJSON,
        copyJS,

        // Expose state for debugging
        getState: () => state
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    WorkflowCanvas.init();
});
