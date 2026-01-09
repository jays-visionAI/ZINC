/**
 * ============================================
 * Workflow Canvas Builder - Main Controller
 * ============================================
 * 
 * AI-powered visual workflow designer for agent pipelines
 * Supports: Prompt-based generation, Canvas editing, Code export
 */

window.WorkflowCanvas = (function () {
    'use strict';

    // ============================================
    // SVG Icons
    // ============================================
    const SVG_ICONS = {
        play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`,
        stop: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
        agent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>`,
        condition: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l9 9-9 9-9-9z"/></svg>`,
        parallel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
        search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
        chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20v-8M12 20V8M20 20V4"/></svg>`,
        target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
        document: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>`,
        report: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
        lightbulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/></svg>`,
        brush: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.06 11.9l8.07-8.07a2.85 2.85 0 1 1 4.03 4.03l-8.07 8.07M7 14a5 5 0 0 1-5 5v1h6a5 5 0 0 0 0-10l-1 4z"/></svg>`,
        pen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>`,
        theater: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 10l9 4 9-4M2 14l9 4 9-4"/><path d="M2 18l9 4 9-4"/></svg>`,
        trending: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
        brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-.5 1.94A4.98 4.98 0 0 1 18 12a5 5 0 0 1-2 4v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4a5 5 0 0 1-2-4c0-1.67.83-3.15 2.1-4.06A4 4 0 0 1 8 6a4 4 0 0 1 4-4z"/></svg>`,
        plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`,
        x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16"/></svg>`,
        clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
        database: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
        link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
        image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
        text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>`,
        code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
        save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
        reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
        magic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 5.2l-1.4 1.4"/><path d="M17.8 12.8l-1.4-1.4"/><path d="M12.2 5.2l1.4 1.4"/><path d="M12.2 12.8l-1.4-1.4"/><path d="M9 14l-6 6"/><path d="M6 14l-3 3"/><path d="M9 17l-3 3"/></svg>`,
        sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1"/><path d="M12 20v1"/><path d="M3 12h1"/><path d="M20 12h1"/><path d="M18.364 5.636l-.707.707"/><path d="M18.364 18.364l-.707-.707"/><path d="M5.636 5.636l-.707.707"/><path d="M5.636 18.364l-.707-.707"/></svg>`,
        clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
        upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
        filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`
    };

    // ============================================
    // State
    // ============================================
    const state = {
        isOpen: false,
        currentStep: 1,
        pipelineContext: 'market', // market | brand | knowledge | studio | growth
        projectId: null,
        workflowId: null,
        name: null,
        isSyncingUI: false, // Flag to prevent infinite recursion during property form loading

        // Canvas state
        nodes: [],
        edges: [],
        selectedNodeIds: [], // Multiple selection support
        selectedNodeId: null, // Primary selected node (compatibility)

        // Viewport state
        zoom: 1,
        panX: 0,
        panY: 0,

        // Drag state
        isDragging: false,
        dragNodeId: null,
        dragOffset: { x: 0, y: 0 },

        // Pan state
        isPanning: false,
        panStart: { x: 0, y: 0 },

        // Connection state
        isConnecting: false,
        connectionSource: null,

        // Testing state
        isTesting: false,
        testingNodeId: null,

        // Analysis result
        analysisResult: null,

        // Active popup
        activePopup: null,

        // Available agents per context (Synced with Firestore Agent Registry)
        availableAgents: {},

        // LLM Model Catalog with capabilities
        modelCatalog: {
            text: [
                { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', tier: 'premium', description: 'Most capable text model' },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', tier: 'standard', description: 'Fast and affordable' },
                { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', tier: 'premium', description: 'Best for complex reasoning' },
                { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', tier: 'economy', description: 'Fast responses' },
                { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', tier: 'premium', description: 'Advanced reasoning' },
                { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek', tier: 'economy', description: 'Cost-effective' },
                { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'deepseek', tier: 'standard', description: 'Latest V3 model' },
                { id: 'deepseek-v3.2-speciale', name: 'DeepSeek V3.2 Speciale', provider: 'deepseek', tier: 'premium', description: 'Enhanced V3 with special capabilities' },
                { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', tier: 'standard', description: 'Multimodal capable' }
            ],
            image: [
                { id: 'imagen-3', name: 'Imagen 3', provider: 'google', tier: 'premium', description: 'Photorealistic images' },
                { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash (Nano Banana)', provider: 'google', tier: 'standard', description: 'Fast image generation' },
                { id: 'gemini-3.0-pro', name: 'Gemini 3 pro (Nano Banana Pro)', provider: 'google', tier: 'premium', description: 'Advanced image synthesis' },
                { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', provider: 'stability', tier: 'standard', description: 'Open source, customizable' },
                { id: 'midjourney-v6', name: 'Midjourney v6', provider: 'midjourney', tier: 'premium', description: 'Artistic style' }
            ],
            video: [
                { id: 'runway-gen3', name: 'Runway Gen-3 Alpha', provider: 'runway', tier: 'premium', description: 'High quality video generation' },
                { id: 'kling-1.5', name: 'Kling 1.5', provider: 'kuaishou', tier: 'standard', description: 'Fast video generation' },
                { id: 'pika-1.5', name: 'Pika 1.5', provider: 'pika', tier: 'standard', description: 'Creative video effects' },
                { id: 'sora', name: 'Sora (Preview)', provider: 'openai', tier: 'premium', description: 'Coming soon', disabled: true }
            ],
            code: [
                { id: 'codex', name: 'GPT-4 Codex', provider: 'openai', tier: 'premium', description: 'Code generation' },
                { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek', tier: 'standard', description: 'Specialized for coding' }
            ]
        },

        // Trigger types
        triggerTypes: [
            { id: 'manual', name: 'Manual', icon: 'play', description: 'Execute manually' },
            { id: 'schedule', name: 'Schedule', icon: 'clock', description: 'Cron-based scheduling' },
            { id: 'firestore', name: 'Firestore Event', icon: 'database', description: 'onCreate, onUpdate, onDelete' },
            { id: 'webhook', name: 'Webhook', icon: 'link', description: 'HTTP endpoint trigger' }
        ],

        // Current workflow trigger config
        triggerConfig: {
            type: 'manual',
            schedule: null,
            firestoreCollection: null,
            firestoreEvent: 'onUpdate'
        },

        // Connected MCP Servers
        mcpServers: []
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
        console.log('%c[WorkflowCanvas] Loaded v20260108_37', 'color: #00ff00; font-weight: bold;');
        // Load HTML template if not already present
        if (!document.getElementById('workflow-canvas-modal')) {
            await loadTemplate();
        }

        cacheElements();
        setupEventListeners();

        // Sync agents with real Registry from Firestore
        await syncAgentsWithRegistry();
        await syncMCPServers();

        console.log('[WorkflowCanvas] initialized with dynamic Agent Registry & MCP');

        // Load project list for context selector
        await loadProjectList();
    }

    async function syncMCPServers() {
        try {
            console.log('[WorkflowCanvas] Syncing MCP Servers...');
            // In a real app, this would fetch from db.collection('mcpRegistry')
            // For now, we seed with high-value recommendations based on current agents
            const seedMCPServers = [
                {
                    id: 'google-search',
                    name: 'Google Search MCP',
                    provider: 'google',
                    icon: 'search',
                    description: 'Real-time web search and news',
                    tools: [
                        { id: 'search', name: 'Web Search', description: 'Search the web for latest info' },
                        { id: 'news', name: 'Get News', description: 'Fetch latest news articles' }
                    ]
                },
                {
                    id: 'puppeteer',
                    name: 'Puppeteer MCP',
                    provider: 'mcp',
                    icon: 'browser',
                    description: 'Browser automation and rendering',
                    tools: [
                        { id: 'screenshot', name: 'Capture Screenshot', description: 'Take a screenshot of a URL' },
                        { id: 'extract_text', name: 'Extract Text', description: 'Get text content from a website' }
                    ]
                },
                {
                    id: 'github',
                    name: 'GitHub MCP',
                    provider: 'github',
                    icon: 'code',
                    description: 'Access repositories and issues',
                    tools: [
                        { id: 'list_issues', name: 'List Issues', description: 'Fetch issues from a repo' },
                        { id: 'read_file', name: 'Read File', description: 'Read content of a file' }
                    ]
                },
                {
                    id: 'slack',
                    name: 'Slack MCP',
                    provider: 'slack',
                    icon: 'message',
                    description: 'Send messages and alerts',
                    tools: [
                        { id: 'post_message', name: 'Post Message', description: 'Send a message to a channel' }
                    ]
                }
            ];

            state.mcpServers = seedMCPServers;
            console.log(`[WorkflowCanvas] Registered ${state.mcpServers.length} MCP servers.`);
        } catch (err) {
            console.error('[WorkflowCanvas] Failed to sync MCP Servers:', err);
            state.mcpServers = [];
        }
    }

    async function syncAgentsWithRegistry() {
        try {
            console.log('[WorkflowCanvas] Syncing agents with Firestore Registry...');
            const firestore = window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
            if (!firestore) {
                console.warn('[WorkflowCanvas] Firestore (db) not initialized yet. Skipping sync.');
                return;
            }
            const snap = await firestore.collection('agentRegistry').where('status', '==', 'active').get();
            const allAgents = [];
            snap.forEach(doc => allAgents.push({ id: doc.id, ...doc.data() }));

            // Helper to find icon by ID/Category
            const getIcon = (id, category) => {
                const map = {
                    'search': ['SCOUT', 'RESEARCH'],
                    'document': ['RAG', 'KNOWLEDGE'],
                    'pen': ['DESIGNER', 'WRITER', 'TEXT'],
                    'brush': ['VISUAL', 'IMAGE', 'DIRECTOR'],
                    'target': ['ARCHITECT', 'STRATEGY'],
                    'trending': ['MANAGER', 'GROWTH'],
                    'brain': ['REASONER', 'STRATEGIST'],
                    'theater': ['ORCHESTRATOR']
                };
                for (const [icon, keywords] of Object.entries(map)) {
                    if (keywords.some(k => id.toUpperCase().includes(k) || (category && category.toUpperCase().includes(k)))) return icon;
                }
                return 'agent';
            };

            // Reconstruct availableAgents based on Categories
            state.availableAgents = {
                all: allAgents, // Full list for reference
                market: allAgents.filter(a => a.category === 'Intelligence'),
                brand: allAgents.filter(a => a.category === 'Design'),
                knowledge: allAgents.filter(a => ['Intelligence', 'Design', 'QA'].includes(a.category)),
                studio: allAgents.filter(a => ['Studio', 'Design'].includes(a.category)),
                growth: allAgents.filter(a => ['Growth', 'Strategy', 'QA'].includes(a.category))
            };

            // Standardize agent objects (add icon and capability if missing)
            Object.values(state.availableAgents).flat().forEach(a => {
                if (!a.icon) a.icon = getIcon(a.id, a.category);
                if (!a.capability) {
                    a.capability = (a.id.includes('IMAGE') || a.id.includes('VISUAL')) ? 'image' : 'text';
                }
            });

            console.log(`[WorkflowCanvas] Successfully synced ${allAgents.length} agents from Firestore.`);
        } catch (err) {
            console.error('[WorkflowCanvas] Failed to sync Agent Registry:', err);
            // Fallback to minimal default if firestore fails
            state.availableAgents = { all: [], market: [], brand: [], knowledge: [], studio: [], growth: [] };
        }
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

        // Palette drag & click
        document.querySelectorAll('.wf-palette-item').forEach(item => {
            item.addEventListener('dragstart', handlePaletteDragStart);
            item.addEventListener('dragend', handlePaletteDragEnd);
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                // Add to center of viewport
                const rect = elements.canvasArea.getBoundingClientRect();
                const x = (rect.width / 2) / state.zoom;
                const y = (rect.height / 2) / state.zoom;
                const node = createNode(type, x, y);
                renderAllNodes(); // Consistency: Refresh everything
                renderAllEdges();
                selectNode(node.id);
            });
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

        // Trigger Settings Listeners
        const triggerInputs = [
            'wf-trigger-cron', 'wf-trigger-timezone', 'wf-trigger-collection',
            'wf-trigger-event', 'wf-trigger-field-condition'
        ];
        triggerInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => getTriggerConfig());
                input.addEventListener('change', () => getTriggerConfig());
            }
        });

        // Agent change - update capability and model
        if (propAgent) {
            propAgent.addEventListener('change', (e) => {
                const agentId = e.target.value;
                updateNodeProperty('agentId', agentId);

                // Find the agent and its capability
                const agents = state.availableAgents[state.pipelineContext] || [];
                const agent = agents.find(a => a.id === agentId);

                if (agent) {
                    const capability = agent.capability || 'text';
                    updateNodeProperty('capability', capability);
                    updateNodeProperty('name', agent.name);

                    // Set default model based on capability
                    const defaultModels = {
                        text: 'gpt-4o',
                        image: 'dall-e-3',
                        video: 'runway-gen3',
                        code: 'deepseek-coder'
                    };
                    const defaultModel = defaultModels[capability] || 'gpt-4o';
                    updateNodeProperty('model', defaultModel);

                    // Refresh model selector
                    populateModelSelector(capability, defaultModel);
                }
            });
        }

        if (propModel) propModel.addEventListener('change', (e) => updateNodeProperty('model', e.target.value));
        if (propTemp) {
            propTemp.addEventListener('input', (e) => {
                updateNodeProperty('temperature', parseFloat(e.target.value));
                document.getElementById('wf-prop-temp-value').textContent = e.target.value;
            });
        }

        const propInstruction = document.getElementById('wf-prop-agent-instruction');
        if (propInstruction) {
            propInstruction.addEventListener('input', (e) => updateNodeProperty('instruction', e.target.value));
        }

        const propInputMapping = document.getElementById('wf-prop-input-mapping');
        if (propCondition) propCondition.addEventListener('input', (e) => updateNodeProperty('expression', e.target.value));

        // Output Settings (End Node)
        const propOutputColl = document.getElementById('wf-prop-output-collection');
        const propOutputWebhook = document.getElementById('wf-prop-output-webhook');
        if (propOutputColl) propOutputColl.addEventListener('input', (e) => updateNodeProperty('outputCollection', e.target.value));
        if (propOutputWebhook) propOutputWebhook.addEventListener('input', (e) => updateNodeProperty('outputWebhook', e.target.value));

        const propOutputDocId = document.getElementById('wf-prop-output-doc-id');
        const propOutputTemplate = document.getElementById('wf-prop-output-data-template');
        if (propOutputDocId) propOutputDocId.addEventListener('input', (e) => updateNodeProperty('outputDocId', e.target.value));
        if (propOutputTemplate) propOutputTemplate.addEventListener('input', (e) => updateNodeProperty('outputDataTemplate', e.target.value));

        // Firestore Node Listeners
        const firestoreInputs = [
            { id: 'wf-prop-fs-operation', key: 'fsOperation', event: 'change' },
            { id: 'wf-prop-fs-collection', key: 'fsCollection', event: 'input' },
            { id: 'wf-prop-fs-where', key: 'fsWhere', event: 'input' },
            { id: 'wf-prop-fs-orderby', key: 'fsOrderBy', event: 'input' },
            { id: 'wf-prop-fs-limit', key: 'fsLimit', event: 'input' },
            { id: 'wf-prop-fs-docid', key: 'fsDocId', event: 'input' },
            { id: 'wf-prop-fs-write-template', key: 'fsWriteTemplate', event: 'input' }
        ];
        firestoreInputs.forEach(item => {
            const el = document.getElementById(item.id);
            if (el) {
                el.addEventListener(item.event, (e) => {
                    let value = e.target.value;
                    if (item.id === 'wf-prop-fs-limit') value = parseInt(value) || 50;
                    updateNodeProperty(item.key, value);
                });
            }
        });

        // Input Node Listeners
        const inputNodeInputs = [
            { id: 'wf-prop-input-source', key: 'inputSource', event: 'change' },
            { id: 'wf-prop-input-kh-status', key: 'khStatus', event: 'change' },
            { id: 'wf-prop-input-fs-collection', key: 'fsCollection', event: 'input' },
            { id: 'wf-prop-input-fs-where', key: 'fsWhere', event: 'input' },
            { id: 'wf-prop-input-manual-json', key: 'manualJson', event: 'input' }
        ];
        inputNodeInputs.forEach(item => {
            const el = document.getElementById(item.id);
            if (el) el.addEventListener(item.event, (e) => updateNodeProperty(item.key, e.target.value));
        });

        // Transform Node Listeners
        const transformInputs = [
            { id: 'wf-prop-transform-type', key: 'transformType', event: 'change' },
            { id: 'wf-prop-transform-filter-expr', key: 'filterExpr', event: 'input' },
            { id: 'wf-prop-transform-map-template', key: 'mapTemplate', event: 'input' },
            { id: 'wf-prop-transform-reduce-expr', key: 'reduceExpr', event: 'input' },
            { id: 'wf-prop-transform-reduce-init', key: 'reduceInit', event: 'input' },
            { id: 'wf-prop-transform-sort-key', key: 'sortKey', event: 'input' },
            { id: 'wf-prop-transform-sort-order', key: 'sortOrder', event: 'change' },
            { id: 'wf-prop-transform-slice-n', key: 'sliceN', event: 'input' },
            { id: 'wf-prop-transform-merge-source', key: 'mergeSource', event: 'change' }
        ];
        transformInputs.forEach(item => {
            const el = document.getElementById(item.id);
            if (el) el.addEventListener(item.event, (e) => updateNodeProperty(item.key, e.target.value));
        });

        // Command Bar - Textarea auto-resize and Enter key handling
        const cmdInput = document.getElementById('wf-canvas-prompt');
        if (cmdInput) {
            // Auto-resize textarea
            const autoResize = () => {
                cmdInput.style.height = 'auto';
                const maxHeight = 200; // ~10 lines
                cmdInput.style.height = Math.min(cmdInput.scrollHeight, maxHeight) + 'px';
            };
            cmdInput.addEventListener('input', autoResize);

            // Enter to send, Shift+Enter for newline
            cmdInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    refineWithPrompt();
                }
            });
        }
    }

    // ============================================
    // Public API
    // ============================================
    function open(context = 'market', projectId = null, workflowId = null) {
        console.log('[WorkflowCanvas] open() called with context:', context);
        state.pipelineContext = context;
        state.projectId = projectId;
        state.workflowId = workflowId;
        state.isOpen = true;
        console.log('[WorkflowCanvas] state.pipelineContext set to:', state.pipelineContext);

        // Pre-select project if ID provided
        if (projectId) {
            updateProjectContext(projectId);
        }

        if (!elements.modal) {
            init().then(() => {
                showModal(workflowId);
            });
        } else {
            showModal(workflowId);
        }
    }

    async function showModal(workflowId = null) {
        elements.modal.classList.add('active');
        renderAgentChips();
        document.body.style.overflow = 'hidden';

        if (workflowId) {
            await loadWorkflow(workflowId);
            goToStep(2); // Jump to canvas if editing
        } else {
            reset(true); // Clear state silently for new workflow
            goToStep(1);
        }
    }

    async function loadWorkflow(workflowId) {
        try {
            const db = firebase.firestore();
            const doc = await db.collection('workflowDefinitions').doc(workflowId).get();

            if (!doc.exists) {
                notify('워크플로우를 찾을 수 없습니다.', 'error');
                return;
            }

            const data = doc.data();
            console.log('[WorkflowCanvas] Loading workflow:', data.name);

            // Restore state
            state.workflowId = workflowId;
            state.name = data.name;
            state.pipelineContext = data.pipelineContext || state.pipelineContext;
            state.nodes = data.nodes.map(n => ({
                id: n.id,
                type: n.type,
                x: n.position.x,
                y: n.position.y,
                data: n.data
            })) || [];

            state.edges = data.edges || [];

            // Restore trigger
            if (data.trigger) {
                state.triggerConfig = {
                    ...state.triggerConfig,
                    ...data.trigger
                };
            }

            // Update ID counters to avoid collisions
            const maxNodeId = state.nodes.reduce((max, n) => {
                const num = parseInt(n.id.replace(/^\D+/g, ''));
                return !isNaN(num) ? Math.max(max, num) : max;
            }, 0);
            nodeIdCounter = maxNodeId;

            const maxEdgeId = state.edges.reduce((max, e) => {
                const num = parseInt(e.id.replace(/^\D+/g, ''));
                return !isNaN(num) ? Math.max(max, num) : max;
            }, 0);
            edgeIdCounter = maxEdgeId;

            // Render everything
            renderAllNodes();
            renderAllEdges();
            syncTriggerUI();

        } catch (err) {
            console.error('[WorkflowCanvas] Failed to load workflow:', err);
            notify('워크플로우 로드 중 오류가 발생했습니다.', 'error');
        }
    }

    function close() {
        if (elements.modal) {
            elements.modal.classList.remove('active');
        }
        state.isOpen = false;
        document.body.style.overflow = '';
    }

    function reset(silent = false) {
        if (!silent && !confirm('모든 변경사항이 초기화됩니다. 계속하시겠습니까?')) return;

        state.workflowId = null;
        state.name = null;
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

        // Update Step 1 UI based on existing workflow
        if (step === 1) {
            updatePromptUIForMode();
        }

        // Generate code when going to step 3
        if (step === 3) {
            generateCode();
        }

        // Re-render edges when switching to canvas to fix coordinate alignment issues
        if (step === 2) {
            setTimeout(() => {
                renderAllEdges();
                updateMinimap();
            }, 100);
        }
    }

    /**
     * Update Step 1 UI based on whether workflow exists (refine mode vs create mode)
     */
    function updatePromptUIForMode() {
        const hasExistingWorkflow = state.nodes && state.nodes.length > 0;
        const promptTitle = document.querySelector('.wf-prompt-title');
        const promptSubtitle = document.querySelector('.wf-prompt-subtitle');
        const promptTextarea = document.getElementById('wf-prompt-input');
        const analyzeBtn = document.querySelector('.wf-prompt-actions .wf-btn-primary span');

        if (hasExistingWorkflow) {
            // REFINE MODE
            if (promptTitle) promptTitle.textContent = '워크플로우 수정하기';
            if (promptSubtitle) promptSubtitle.innerHTML = '기존 워크플로우에 노드를 추가, 삭제, 또는 수정할 수 있습니다.<br>예: "조건 노드 추가해줘", "마지막 에이전트 삭제해줘"';
            if (promptTextarea) promptTextarea.placeholder = '예: 조건 노드 추가해줘, 병렬 처리 노드 넣어줘, 마지막 노드 삭제해줘...';
            if (analyzeBtn) analyzeBtn.textContent = '워크플로우 수정';
        } else {
            // CREATE MODE
            if (promptTitle) promptTitle.textContent = '워크플로우를 자연어로 설명해주세요';
            if (promptSubtitle) promptSubtitle.innerHTML = 'AI가 분석하여 최적의 에이전트 워크플로우를 자동으로 구성합니다.<br>복잡한 조건이나 병렬 처리도 자연스럽게 설명해보세요.';
            if (promptTextarea) promptTextarea.placeholder = '예: 먼저 시장 트렌드를 분석하고, 결과가 유의미하면 콘텐츠 기획을 진행하고, 아니면 추가 리서치를 해줘. 기획이 끝나면 글 작성과 이미지 생성을 동시에 진행해줘.';
            if (analyzeBtn) analyzeBtn.textContent = 'AI로 워크플로우 생성';
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

        // Check if we already have a workflow (refine mode vs create mode)
        const hasExistingWorkflow = state.nodes && state.nodes.length > 0;
        const isRefineMode = hasExistingWorkflow;

        // Show loading
        elements.analysisResult.classList.add('active');
        const loadingText = isRefineMode ? 'AI가 기존 워크플로우를 수정 중입니다...' : 'AI가 분석 중입니다...';
        elements.detectedAgents.innerHTML = `<div class="wf-loading"><div class="wf-spinner"></div><span class="wf-loading-text">${loadingText}</span></div>`;
        elements.flowDescription.innerHTML = '';

        try {
            if (isRefineMode) {
                // REFINE MODE: Modify existing workflow
                console.log('[WorkflowCanvas] Refine mode - modifying existing workflow');
                const refinement = await refineExistingWorkflow(prompt);

                // Set refinement flag to let applyToCanvas know not to rebuild
                state.analysisResult = {
                    isRefinement: true,
                    description: refinement.description
                };

                // Show refinement result
                elements.detectedAgents.innerHTML = `
                    <div class="wf-detected-agent" style="background: rgba(0, 240, 255, 0.1); border-color: rgba(0, 240, 255, 0.3);">
                        <span class="wf-detected-check">${SVG_ICONS.check}</span>
                        <span style="color: var(--wf-cyan);">워크플로우 수정 완료</span>
                    </div>
                `;
                elements.flowDescription.innerHTML = `
                    <strong style="color: var(--wf-cyan);">🔄 수정 내용:</strong><br>
                    <pre style="white-space: pre-wrap; font-family: inherit; margin: 8px 0;">${refinement.description}</pre>
                `;

                // Re-render nodes and edges
                renderAllNodes();
                renderAllEdges();
                notify('워크플로우가 수정되었습니다.', 'success');
            } else {
                // CREATE MODE: New workflow analysis
                const analysis = await smartAnalyzePrompt(prompt);
                state.analysisResult = analysis;

                // Render detected data nodes first
                let detectedHtml = '';
                if (analysis.detectedDataNodes && analysis.detectedDataNodes.length > 0) {
                    detectedHtml += analysis.detectedDataNodes.map(dn => `
                        <div class="wf-detected-agent wf-detected-data">
                            <span class="wf-detected-check">${SVG_ICONS[dn.icon] || SVG_ICONS.database}</span>
                            <span>${dn.name}</span>
                            <span class="wf-detected-type">${dn.type}</span>
                        </div>
                    `).join('');
                }

                // Then render detected agents
                detectedHtml += analysis.detectedAgents.map(agent => `
                    <div class="wf-detected-agent">
                        <span class="wf-detected-check">${SVG_ICONS.check}</span>
                        <span>${agent.name}</span>
                    </div>
                `).join('');

                elements.detectedAgents.innerHTML = detectedHtml || '<p>감지된 노드가 없습니다. 더 구체적으로 설명해주세요.</p>';

                // Render flow description
                elements.flowDescription.innerHTML = `
                    <strong>감지된 흐름:</strong><br>
                    <pre style="white-space: pre-wrap; font-family: inherit; margin: 8px 0;">${analysis.flowDescription}</pre>
                `;
            }
        } catch (err) {
            console.error('Analysis failed:', err);
            elements.detectedAgents.innerHTML = '<p style="color: var(--wf-red);">분석 중 오류가 발생했습니다.</p>';
        }
    }

    /**
     * Refine existing workflow with additional prompt
     */
    async function refineExistingWorkflow(prompt) {
        console.log('[WorkflowCanvas] Refining existing workflow with DeepSeek V3.2 Speciale...');

        // Prepare current state for LLM context
        const currentGraph = {
            nodes: state.nodes.map(n => ({ id: n.id, type: n.type, x: n.x, y: n.y, data: n.data })),
            edges: state.edges
        };

        const contextAgents = state.availableAgents[state.pipelineContext] || [];
        const agentList = contextAgents.map(a => `- ${a.id}: ${a.name} (${a.category})`).join('\n');

        const systemPrompt = `당신은 AI 워크플로우 설계 전문가입니다.
현재 구성된 워크플로우를 사용자의 요청에 맞춰 수정하고 최적화된 JSON 그래프를 출력합니다.

## 현재 워크플로우 상태:
\`\`\`json
${JSON.stringify(currentGraph, null, 2)}
\`\`\`

## 사용 가능한 에이전트 목록:
${agentList}

## 수정 규칙:
1. 사용자의 요청(추가, 삭제, 연결 변경 등)을 반영하여 전체 그래프를 다시 구성하세요.
2. 기존 노드 ID를 최대한 유지하여 레이아웃 변화를 최소화하세요.
3. 새로운 노드가 필요하면 고유한 ID를 부여하세요.
4. 노드 간 x, y 좌표가 겹치지 않도록 적절히 배치하세요.

## Firestore 저장 경로 규칙 ({{projectId}} 변수 사용 필수):
- One Pager: projects/{{projectId}}/onePagers
- Brochure: projects/{{projectId}}/brochures
- Promo Image: projects/{{projectId}}/promoImages
- Pitch Deck: projects/{{projectId}}/pitchDecks
- Brand Summary: projects/{{projectId}}/brandSummaries

## JSON 출력 형식 (마크다운 없이 순수 JSON만):
{
  "description": "수정된 내용 요약 (한국어)",
  "graph": {
    "nodes": [...],
    "edges": [...]
  }
}`;

        try {
            const response = await firebase.functions().httpsCallable('generateLLMResponse', { timeout: 540000 })({
                provider: 'deepseek',
                model: 'deepseek-v3.2-speciale',
                systemPrompt: systemPrompt,
                userMessage: `다음 요청에 따라 워크플로우를 수정해주세요:\n\n"${prompt}"`,
                temperature: 0.2,
                source: 'workflow_canvas_refinement'
            });

            if (!response.data.success) throw new Error(response.data.error || 'Refinement failed');

            let result;
            try {
                let cleanResponse = response.data.response.trim();
                if (cleanResponse.startsWith('```json')) {
                    cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
                } else if (cleanResponse.startsWith('```')) {
                    cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
                }
                result = JSON.parse(cleanResponse);
            } catch (err) {
                console.error('[WorkflowCanvas] Failed to parse refinement JSON:', err);
                throw err;
            }

            if (result.graph) {
                // Apply the new graph to state
                state.nodes = [];
                state.edges = [];

                const idMap = {};
                result.graph.nodes.forEach(n => {
                    const node = createNode(n.type, n.x, n.y, n.data);
                    idMap[n.id] = node.id;
                });

                result.graph.edges.forEach(e => {
                    const sourceId = idMap[e.source];
                    const targetId = idMap[e.target];
                    if (sourceId && targetId) {
                        createEdge(sourceId, targetId, e.label || '');
                    }
                });

                return {
                    success: true,
                    description: result.description || '워크플로우가 수정되었습니다.'
                };
            }

            return { success: false, description: '수정 사항을 적용할 수 없습니다.' };

        } catch (err) {
            console.error('[WorkflowCanvas] LLM Refinement failed:', err);
            notify('수정 요청 분석 실패', 'error');
            return { success: false, description: '오류가 발생했습니다.' };
        }
    }

    // Smart analysis that infers data nodes, transforms, and agents
    async function smartAnalyzePrompt(prompt) {
        console.log('[WorkflowCanvas] Analyzing prompt with DeepSeek V3.2 Speciale...');

        // Get available agents for current context
        const contextAgents = state.availableAgents[state.pipelineContext] || [];
        const agentList = contextAgents.map(a => `- ${a.id}: ${a.name} (${a.category})`).join('\n');

        const systemPrompt = `당신은 AI 워크플로우 설계 전문가입니다.
사용자의 자연어 요청을 분석하여 최적의 에이전트 파이프라인 워크플로우를 설계하고 JSON으로 출력합니다.

## 사용 가능한 에이전트 목록:
${agentList}

## 설계 원칙:
1. **병렬 처리**: 서로 의존성이 없는 작업(예: 글 작성과 이미지 생성)은 'parallel' 노드를 사용하여 동시에 진행하세요.
2. **조건 분기**: 결과에 따라 로직이 달라져야 하면 'condition' 노드를 사용하세요.
3. **데이터 소스**: 시작 단계에서 필요한 데이터(Knowledge Hub, Project Brief 등)를 'input' 노드로 명시하세요.
4. **통합/변환**: 여러 데이터 소스를 합치거나 가공할 때는 'transform' 노드를 사용하세요.
5. **레이아웃**: 노드 간 겹치지 않도록 x, y 좌표를 적절히 배치하세요. (x 간격 약 250~300, y 간격 약 150)

## 노드 타입 및 속성:
- start: 시작 노드 (x: 100, y: 300 고정)
- end: 종료 노드
- agent: AI 에이전트 (agentId, name, model, temperature 필수)
- condition: 조건 분기 (expression 필수)
- parallel: 병렬 실행 시작점
- input: 데이터 입력 (inputSource: knowledge_hub | project_brief | brand_brain)
- transform: 데이터 가공 (transformType: aggregate | filter | map | merge)
- firestore: DB 작업 (fsOperation: read | write)

## Firestore 저장 경로 규칙 ({{projectId}} 변수 사용 필수):
- One Pager: projects/{{projectId}}/onePagers
- Brochure: projects/{{projectId}}/brochures
- Promo Image: projects/{{projectId}}/promoImages
- Pitch Deck: projects/{{projectId}}/pitchDecks
- Brand Summary: projects/{{projectId}}/brandSummaries

## 출력 규칙:
- 반드시 JSON 형식으로만 출력
- 마크다운 코드블록 없이 순수 JSON만 반환
- Firestore 노드 작성 시 위 경로 규칙을 준수하세요.

## JSON 스키마:
{
  "suggestedName": "워크플로우 이름",
  "flowDescription": "단계별 진행 과정 설명 (한국어)",
  "graph": {
    "nodes": [
      { "id": "node_id", "type": "node_type", "x": 숫자, "y": 숫자, "data": { "name": "이름", "agentId": "에이전트ID", ... } }
    ],
    "edges": [
      { "source": "node_id", "target": "node_id", "label": "조건명(옵션)" }
    ]
  },
  "detectedAgents": [ { "id": "id", "name": "name" } ],
  "detectedDataNodes": [ { "type": "type", "name": "name" } ]
}`;

        try {
            const response = await firebase.functions().httpsCallable('generateLLMResponse', { timeout: 540000 })({
                provider: 'deepseek',
                model: 'deepseek-v3.2-speciale',
                systemPrompt: systemPrompt,
                userMessage: `다음 요청을 기반으로 최적의 워크플로우 그래프를 설계해주세요:\n\n"${prompt}"`,
                temperature: 0.2,
                source: 'workflow_canvas_graph_designer'
            });

            if (!response.data.success) {
                throw new Error(response.data.error || 'LLM 분석 실패');
            }

            // Parse LLM response
            let llmResult;
            try {
                let cleanResponse = response.data.response.trim();
                if (cleanResponse.startsWith('```json')) {
                    cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
                } else if (cleanResponse.startsWith('```')) {
                    cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
                }
                llmResult = JSON.parse(cleanResponse);
            } catch (parseErr) {
                console.error('[WorkflowCanvas] Failed to parse LLM response:', parseErr);
                return fallbackAnalyzePrompt(prompt);
            }

            if (!llmResult.graph || !llmResult.graph.nodes) {
                return fallbackAnalyzePrompt(prompt);
            }

            return {
                ...llmResult,
                isGraphBased: true,
                confidence: 0.98
            };

        } catch (err) {
            console.error('[WorkflowCanvas] LLM Analysis failed:', err);
            notify('AI 분석 실패, 기본 분석으로 전환합니다.', 'warning');
            return fallbackAnalyzePrompt(prompt);
        }
    }

    /**
     * Fallback rule-based analysis (used when LLM fails)
     */
    function fallbackAnalyzePrompt(prompt) {
        const keywords = prompt.toLowerCase();
        const analysis = {
            detectedAgents: [],
            detectedDataNodes: [],
            flowDescription: '',
            hasCondition: false,
            hasParallel: false,
            hasDataInput: false,
            hasFirestoreRead: false,
            hasFirestoreWrite: false,
            hasTransform: false,
            confidence: 0.6
        };

        // Simple keyword detection
        const inputKeywords = {
            knowledge_hub: ['knowledge', '지식', 'rag', '문서'],
            project_brief: ['프로젝트', 'project', 'brief'],
            brand_brain: ['브랜드', 'brand']
        };

        for (const [source, keys] of Object.entries(inputKeywords)) {
            if (keys.some(k => keywords.includes(k))) {
                analysis.hasDataInput = true;
                analysis.detectedDataNodes.push({
                    type: 'input',
                    subtype: source,
                    name: getInputSourceName(source),
                    icon: 'upload',
                    description: `${getInputSourceName(source)}에서 데이터 로드`
                });
                break;
            }
        }

        // Detect agents by keywords
        const contextAgents = state.availableAgents[state.pipelineContext] || [];
        if (contextAgents.length > 0) {
            analysis.detectedAgents.push(contextAgents[0]);
        }

        // Detect patterns
        analysis.hasCondition = ['조건', '만약', 'if', 'condition'].some(k => keywords.includes(k));
        analysis.hasParallel = ['병렬', '동시', 'parallel'].some(k => keywords.includes(k));
        analysis.hasFirestoreWrite = ['저장', 'save', 'write'].some(k => keywords.includes(k));

        // Generate flow description
        let flowSteps = [];
        if (analysis.detectedDataNodes.length > 0) {
            flowSteps.push(`📥 ${analysis.detectedDataNodes[0].name}`);
        }
        if (analysis.detectedAgents.length > 0) {
            flowSteps.push(`🤖 ${analysis.detectedAgents.map(a => a.name).join(' → ')}`);
        }
        flowSteps.push('📤 결과 출력');

        analysis.flowDescription = flowSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');

        return analysis;
    }


    function getInputSourceName(source) {
        const names = {
            knowledge_hub: 'Knowledge Hub',
            project_brief: 'Project Brief',
            brand_brain: 'Brand Brain',
            firestore_query: 'Firestore Query',
            manual_json: 'Manual JSON'
        };
        return names[source] || source;
    }

    function getTransformName(type) {
        const names = {
            filter: '필터링',
            map: '변환',
            reduce: '집계',
            sort: '정렬',
            slice: '슬라이스',
            merge: '병합'
        };
        return names[type] || type;
    }

    function applyToCanvas() {
        if (!state.analysisResult) return;

        // In refine mode, changes are already applied to state.nodes/edges
        const hasExistingWorkflow = state.nodes && state.nodes.length > 0;
        if (hasExistingWorkflow && state.analysisResult?.isRefinement) {
            goToStep(2);
            return;
        }

        // Clear canvas
        state.nodes = [];
        state.edges = [];
        if (elements.nodesContainer) elements.nodesContainer.innerHTML = '';
        if (elements.connectionsSvg) elements.connectionsSvg.innerHTML = '';
        nodeIdCounter = 0;
        edgeIdCounter = 0;

        const analysis = state.analysisResult;

        // ---------------------------------------------------------
        // New Strategy: LLM Graph Re-construction
        // ---------------------------------------------------------
        if (analysis.isGraphBased && analysis.graph) {
            console.log('[WorkflowCanvas] Using LLM-generated graph structure');

            // Map to store temporary ID matching
            const idMap = {};

            // 1. Create Nodes
            analysis.graph.nodes.forEach(nodeData => {
                const node = createNode(nodeData.type, nodeData.x, nodeData.y, nodeData.data || {});
                idMap[nodeData.id] = node.id; // Map LLM ID to local sequence ID
            });

            // 2. Create Edges
            if (analysis.graph.edges) {
                analysis.graph.edges.forEach(edgeData => {
                    const sourceId = idMap[edgeData.source];
                    const targetId = idMap[edgeData.target];
                    if (sourceId && targetId) {
                        createEdge(sourceId, targetId, edgeData.label || '');
                    }
                });
            }
        }
        // ---------------------------------------------------------
        // Legacy Strategy: Sequential Fallback
        // ---------------------------------------------------------
        else {
            console.log('[WorkflowCanvas] Using sequential fallback logic');
            const { detectedAgents, detectedDataNodes, hasCondition, hasParallel, hasFirestoreWrite } = analysis;

            // Create Start node
            const startNode = createNode('start', 100, 300);
            let lastNodeId = startNode.id;
            let xPos = 350;
            const yBase = 300;

            // Create Data Nodes
            (detectedDataNodes || []).forEach(dn => {
                const node = createNode(dn.type, xPos, yBase, {
                    name: dn.name,
                    inputSource: dn.subtype || 'knowledge_hub',
                    fsOperation: dn.operation || 'read'
                });
                createEdge(lastNodeId, node.id);
                lastNodeId = node.id;
                xPos += 250;
            });

            // Create Agent Nodes
            (detectedAgents || []).forEach(agent => {
                const node = createNode('agent', xPos, yBase, {
                    agentId: agent.id,
                    name: agent.name,
                    icon: agent.icon,
                    model: agent.model || 'gpt-4o'
                });
                createEdge(lastNodeId, node.id);
                lastNodeId = node.id;
                xPos += 300;
            });

            // Create End Node
            const endNode = createNode('end', xPos, yBase, {
                outputDestination: hasFirestoreWrite ? 'firestore' : 'none'
            });
            createEdge(lastNodeId, endNode.id);
        }

        renderAllNodes();
        renderAllEdges();
        if (typeof updateMinimap === 'function') updateMinimap();
        goToStep(2);
    }

    function showTemplates() {
        alert('템플릿 라이브러리는 곧 제공될 예정입니다.');
    }

    function refineAnalysis() {
        if (state.currentStep === 2) {
            const cmdInput = document.getElementById('wf-canvas-prompt');
            if (cmdInput) {
                cmdInput.focus();
                return;
            }
        }
        elements.promptInput.focus();
        elements.promptInput.setSelectionRange(elements.promptInput.value.length, elements.promptInput.value.length);
    }

    /**
     * AI Copilot: Refine existing canvas with a new prompt from the bottom bar
     */
    async function refineWithPrompt() {
        const input = document.getElementById('wf-canvas-prompt');
        const btn = document.getElementById('wf-canvas-prompt-btn');
        const prompt = input?.value.trim();

        if (!prompt) return;

        // Visual feedback (loading)
        btn.classList.add('wf-btn-loading');
        input.disabled = true;
        const originalBtnHtml = btn.innerHTML;
        btn.innerHTML = '<span class="wf-spinner" style="width:16px;height:16px;border-width:2px;border-color:#fff transparent transparent transparent;"></span>';

        try {
            console.log('[WorkflowCanvas] Refining with prompt:', prompt);

            const result = await refineExistingWorkflow(prompt);

            if (result.success) {
                renderAllNodes();
                renderAllEdges();
                if (typeof updateMinimap === 'function') updateMinimap();
                notify(result.description, 'success');
                input.value = '';
                // Adjust textarea height
                input.style.height = 'auto';
            } else {
                notify(result.description || '수정에 실패했습니다.', 'warning');
            }

        } catch (err) {
            console.error('Refine failed:', err);
            notify('요청 처리 중 오류가 발생했습니다.', 'error');
        } finally {
            btn.classList.remove('wf-btn-loading');
            input.disabled = false;
            btn.innerHTML = originalBtnHtml;
            input.focus();
        }
    }

    // ============================================
    // Step 2: Canvas Operations
    // ============================================
    function renderAgentChips() {
        const agents = state.availableAgents.all || state.availableAgents[state.pipelineContext] || [];
        if (elements.agentChips) {
            elements.agentChips.innerHTML = agents.map(agent => `
                <div class="wf-agent-chip" data-agent-id="${agent.id}" onclick="WorkflowCanvas.addAgentToCanvas('${agent.id}')">
                    <span class="wf-agent-chip-icon">${SVG_ICONS[agent.icon] || SVG_ICONS.agent}</span>
                    <span>${agent.name} (${agent.id})</span>
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
                triggerConfig: data.triggerConfig || {
                    type: type === 'start' ? 'manual' : 'automatic'
                },
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
            parallel: 'Parallel',
            input: 'Data Input',
            firestore: 'Firestore',
            transform: 'Transform'
        };
        return names[type] || 'Node';
    }

    function getDefaultNodeIcon(type) {
        const icons = {
            start: SVG_ICONS.play,
            end: SVG_ICONS.stop,
            agent: SVG_ICONS.agent,
            condition: SVG_ICONS.condition,
            parallel: SVG_ICONS.parallel,
            input: SVG_ICONS.upload,
            firestore: SVG_ICONS.database,
            transform: SVG_ICONS.filter
        };
        return icons[type] || SVG_ICONS.database;
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
        updateMinimap();
    }

    function renderAllEdges() {
        if (!elements.connectionsSvg) return;
        elements.connectionsSvg.innerHTML = '';
        state.edges.forEach(edge => renderEdge(edge));
        updateMinimap();
    }

    // ============================================
    // Minimap
    // ============================================
    function updateMinimap() {
        const minimap = elements.minimap;
        if (!minimap) return;

        const viewport = document.getElementById('wf-minimap-viewport');
        const nodesContainer = minimap.querySelector('.wf-minimap-nodes') || document.createElement('div');
        if (!minimap.querySelector('.wf-minimap-nodes')) {
            nodesContainer.className = 'wf-minimap-nodes';
            minimap.appendChild(nodesContainer);
        }
        nodesContainer.innerHTML = '';

        // 1. Calculate world bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        state.nodes.forEach(n => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + 200);
            maxY = Math.max(maxY, n.y + 100);
        });

        // Padding around world
        const padding = 500;
        minX -= padding; minY -= padding;
        maxX += padding; maxY += padding;

        const worldWidth = maxX - minX;
        const worldHeight = maxY - minY;

        // 2. Scale factors for minimap (200x150)
        const scaleX = 200 / worldWidth;
        const scaleY = 150 / worldHeight;
        const scale = Math.min(scaleX, scaleY);

        // 3. Render node representations in minimap
        state.nodes.forEach(n => {
            const dot = document.createElement('div');
            dot.className = `wf-minimap-node ${n.type}`;
            dot.style.left = `${(n.x - minX) * scale}px`;
            dot.style.top = `${(n.y - minY) * scale}px`;
            dot.style.width = `${200 * scale}px`;
            dot.style.height = `${120 * scale}px`;
            nodesContainer.appendChild(dot);
        });

        // 4. Render viewport rectangle
        const canvasRect = elements.canvasArea.getBoundingClientRect();
        const viewX = -state.zoomOffset?.x || 0;
        const viewY = -state.zoomOffset?.y || 0;
        const viewW = canvasRect.width / state.zoom;
        const viewH = canvasRect.height / state.zoom;

        viewport.style.left = `${(viewX - minX) * scale}px`;
        viewport.style.top = `${(viewY - minY) * scale}px`;
        viewport.style.width = `${viewW * scale}px`;
        viewport.style.height = `${viewH * scale}px`;
    }
    function renderNode(node) {
        const el = document.createElement('div');
        el.id = node.id;
        el.className = `wf-node wf-node-${node.type}`;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;

        if (state.selectedNodeIds.includes(node.id)) {
            el.classList.add('selected');
        }

        // Get SVG icon
        const getIcon = (iconName) => SVG_ICONS[iconName] || SVG_ICONS.agent;

        switch (node.type) {
            case 'start':
                el.classList.add('can-test');
                el.innerHTML = `
        <div class="wf-node-start-inner">
            <span class="wf-node-icon">${SVG_ICONS.play}</span>
            <span>START</span>
        </div>
        <div class="wf-port wf-port-output" data-node-id="${node.id}" data-port-type="output"></div>
        <div class="wf-port-add-btn" data-node-id="${node.id}">${SVG_ICONS.plus}</div>
        `;
                break;

            case 'end':
                el.innerHTML = `
        <div class="wf-node-end-inner">
            <span class="wf-node-icon">${SVG_ICONS.stop}</span>
            <span>END</span>
        </div>
        <div class="wf-port wf-port-input" data-node-id="${node.id}" data-port-type="input"></div>
        `;
                break;

            case 'agent':
                el.innerHTML = `
        <div class="wf-node-agent-inner">
            <div class="wf-node-agent-header">
                <span class="wf-node-agent-icon">${getIcon(node.data.icon)}</span>
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
        <div class="wf-port wf-port-input" data-node-id="${node.id}" data-port-type="input"></div>
        <div class="wf-port wf-port-output" data-node-id="${node.id}" data-port-type="output"></div>
        <div class="wf-port-add-btn" data-node-id="${node.id}">${SVG_ICONS.plus}</div>
        `;
                break;

            case 'condition':
                el.innerHTML = `
        <div class="wf-node-condition-inner">
            <div class="wf-node-condition-content">
                <span class="wf-node-icon">${SVG_ICONS.condition}</span>
                <span>IF/ELSE</span>
            </div>
        </div>
        <div class="wf-port wf-port-input" data-node-id="${node.id}" data-port-type="input"></div>
        <div class="wf-port wf-port-output wf-port-output-true" style="top: 25%; right: -7px;" data-node-id="${node.id}" data-port-type="output-true"></div>
        <span class="wf-port-label wf-port-label-true" style="top: 25%; right: 15px;">TRUE</span>
        
        <div class="wf-port wf-port-output wf-port-output-false" style="top: 50%; right: -7px;" data-node-id="${node.id}" data-port-type="output-false"></div>
        <span class="wf-port-label wf-port-label-false" style="top: 50%; right: 15px;">FALSE</span>
        
        <div class="wf-port wf-port-output wf-port-output-default" style="top: 75%; right: -7px;" data-node-id="${node.id}" data-port-type="output-default"></div>
        <span class="wf-port-label wf-port-label-default" style="top: 75%; right: 15px;">DEFAULT</span>
        
        <div class="wf-port-add-btn" data-node-id="${node.id}">${SVG_ICONS.plus}</div>
        `;
                break;

            case 'parallel':
                el.innerHTML = `
        <div class="wf-node-parallel-inner">
            <span class="wf-node-icon">${SVG_ICONS.parallel}</span>
            <span>PARALLEL</span>
        </div>
        <div class="wf-port wf-port-input" data-node-id="${node.id}" data-port-type="input"></div>
        <div class="wf-port wf-port-output" data-node-id="${node.id}" data-port-type="output"></div>
        <div class="wf-port-add-btn" data-node-id="${node.id}">${SVG_ICONS.plus}</div>
        `;
                break;

            case 'input':
            case 'knowledge_hub':
            case 'project_brief':
            case 'brand_brain':
                el.classList.add('wf-node-data');
                let dataIcon = SVG_ICONS.upload;
                let dataTag = node.data.inputSource || 'Select Source';

                if (node.type === 'knowledge_hub') {
                    dataIcon = SVG_ICONS.database;
                    dataTag = 'Knowledge Hub';
                } else if (node.type === 'project_brief') {
                    dataIcon = SVG_ICONS.document;
                    dataTag = 'Project Brief';
                } else if (node.type === 'brand_brain') {
                    dataIcon = SVG_ICONS.brain;
                    dataTag = 'Brand Brain';
                }

                el.innerHTML = `
        <div class="wf-node-data-inner wf-node-${node.type === 'input' ? 'input' : 'datasource'}">
            <div class="wf-node-data-header">
                <span class="wf-node-data-icon">${dataIcon}</span>
                <span class="wf-node-data-name">${node.data.name || node.data.label || 'Data Input'}</span>
            </div>
            <div class="wf-node-data-body">
                <span class="wf-node-data-tag">${dataTag}</span>
            </div>
        </div>
        <div class="wf-port wf-port-input" data-node-id="${node.id}" data-port-type="input"></div>
        <div class="wf-port wf-port-output" data-node-id="${node.id}" data-port-type="output"></div>
        <div class="wf-port-add-btn" data-node-id="${node.id}">${SVG_ICONS.plus}</div>
        `;
                break;

            case 'firestore':
                el.classList.add('wf-node-data');
                el.innerHTML = `
        <div class="wf-node-data-inner wf-node-firestore">
            <div class="wf-node-data-header">
                <span class="wf-node-data-icon">${SVG_ICONS.database}</span>
                <span class="wf-node-data-name">${node.data.name || 'Firestore'}</span>
            </div>
            <div class="wf-node-data-body">
                <span class="wf-node-data-tag">${node.data.fsOperation || 'read'}</span>
            </div>
        </div>
        <div class="wf-port wf-port-input" data-node-id="${node.id}" data-port-type="input"></div>
        <div class="wf-port wf-port-output" data-node-id="${node.id}" data-port-type="output"></div>
        <div class="wf-port-add-btn" data-node-id="${node.id}">${SVG_ICONS.plus}</div>
        `;
                break;

            case 'transform':
                el.classList.add('wf-node-data');
                el.innerHTML = `
        <div class="wf-node-data-inner wf-node-transform">
            <div class="wf-node-data-header">
                <span class="wf-node-data-icon">${SVG_ICONS.filter}</span>
                <span class="wf-node-data-name">${node.data.name || 'Transform'}</span>
            </div>
            <div class="wf-node-data-body">
                <span class="wf-node-data-tag">${node.data.transformType || 'filter'}</span>
            </div>
        </div>
        <div class="wf-port wf-port-input" data-node-id="${node.id}" data-port-type="input"></div>
        <div class="wf-port wf-port-output" data-node-id="${node.id}" data-port-type="output"></div>
        <div class="wf-port-add-btn" data-node-id="${node.id}">${SVG_ICONS.plus}</div>
        `;
                break;
        }

        // Event listeners
        el.addEventListener('mousedown', (e) => handleNodeMouseDown(e, node.id));
        el.addEventListener('click', (e) => {
            e.stopPropagation();

            // Handle Start node click for real execution or simulation
            if (node.type === 'start' && !state.isTesting) {
                // If project is selected, we can run actual engine
                if (state.projectId) {
                    if (confirm('실제 프로젝트 데이터를 사용하여 워크플로우를 실행하시겠습니까? (결과가 DB에 반영됩니다)')) {
                        saveAndRun();
                    } else {
                        runWorkflowTest();
                    }
                } else {
                    runWorkflowTest();
                }
                return;
            }
            selectNode(node.id);
        });

        // Add + button and port click handler
        const ports = el.querySelectorAll('.wf-port');
        ports.forEach(port => {
            port.addEventListener('click', (e) => {
                e.stopPropagation();
                selectNode(node.id); // Also select the node when interacting with its ports
                const portType = port.dataset.portType; // input, output, output-true, etc.
                showAgentPopup(node.id, e, portType);
            });
        });

        const addBtn = el.querySelector('.wf-port-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectNode(node.id); // Also select the node when clicking + button
                showAgentPopup(node.id, e, 'output'); // Bottom button defaults to output
            });
        }

        elements.nodesContainer.appendChild(el);
    }

    // ============================================
    // Agent Popup
    // ============================================
    function showAgentPopup(sourceNodeId, event, portType) {
        // Remove existing popup
        hideAgentPopup();

        const agents = state.availableAgents[state.pipelineContext] || [];
        const popup = document.createElement('div');
        popup.className = 'wf-agent-popup';
        popup.id = 'wf-agent-popup';

        // Position near the click
        const rect = event.target.getBoundingClientRect();
        popup.style.left = `${rect.left + (portType === 'input' ? -230 : 20)}px`;
        popup.style.top = `${rect.top - 50}px`;

        popup.innerHTML = `
        <div class="wf-agent-popup-header">
            <h5>${portType === 'input' ? 'Add Preceding Agent' : 'Add Next Agent'}</h5>
        </div>
        ${agents.map(agent => `
                <div class="wf-agent-popup-item" data-agent-id="${agent.id}">
                    <div class="wf-agent-popup-item-icon">${SVG_ICONS[agent.icon] || SVG_ICONS.agent}</div>
                    <span class="wf-agent-popup-item-name">${agent.name}</span>
                </div>
            `).join('')}
        `;

        // Add click handlers to items
        popup.querySelectorAll('.wf-agent-popup-item').forEach(item => {
            item.addEventListener('click', () => {
                const agentId = item.dataset.agentId;
                const agent = agents.find(a => a.id === agentId);
                const sourceNode = state.nodes.find(n => n.id === sourceNodeId);

                if (agent && sourceNode) {
                    // 1. Calculate new position based on portType
                    const spacing = 200;
                    const newX = portType === 'input' ? sourceNode.x - spacing : sourceNode.x + spacing;
                    const newY = sourceNode.y;

                    // 2. Create new node
                    const newNode = createNode('agent', newX, newY, {
                        agentId: agent.id,
                        name: agent.name,
                        icon: agent.icon,
                        capability: agent.capability
                    });
                    renderNode(newNode);

                    // 3. Create edge based on direction
                    if (portType === 'input') {
                        // Edge from NEW to SOURCE
                        createEdge(newNode.id, sourceNodeId, '');
                    } else {
                        // Edge from SOURCE to NEW
                        // Handle condition node output types (true, false, default)
                        let label = '';
                        if (portType === 'output-true') label = 'TRUE';
                        else if (portType === 'output-false') label = 'FALSE';
                        else if (portType === 'output-default') label = 'DEFAULT';

                        createEdge(sourceNodeId, newNode.id, label);
                    }

                    renderAllEdges();
                    selectNode(newNode.id);
                }
                hideAgentPopup();
            });
        });

        document.body.appendChild(popup);
        state.activePopup = popup;

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', handlePopupOutsideClick);
        }, 100);
    }

    function hideAgentPopup() {
        const popup = document.getElementById('wf-agent-popup');
        if (popup) {
            popup.remove();
        }
        state.activePopup = null;
        document.removeEventListener('click', handlePopupOutsideClick);
    }

    function handlePopupOutsideClick(e) {
        if (state.activePopup && !state.activePopup.contains(e.target)) {
            hideAgentPopup();
        }
    }

    function addAgentFromPopup(sourceNodeId, agent) {
        const sourceNode = state.nodes.find(n => n.id === sourceNodeId);
        if (!sourceNode) return;

        // Create new agent node to the right of source
        const newX = sourceNode.x + 300;
        const newY = sourceNode.y;

        const newNode = createNode('agent', newX, newY, {
            agentId: agent.id,
            name: agent.name,
            icon: agent.icon
        });

        // Connect source to new node
        createEdge(sourceNodeId, newNode.id);

        // If source was connected to End node, reconnect End to new node
        const existingEdgeToEnd = state.edges.find(e => e.source === sourceNodeId);
        if (existingEdgeToEnd) {
            const endNode = state.nodes.find(n => n.id === existingEdgeToEnd.target && n.type === 'end');
            if (endNode) {
                // Remove old edge to end
                state.edges = state.edges.filter(e => e.id !== existingEdgeToEnd.id);
                // Connect new node to end
                createEdge(newNode.id, endNode.id);
            }
        }

        renderAllNodes();
        renderAllEdges();
        selectNode(newNode.id);
    }

    function addAgentToCanvas(agentId) {
        const agents = state.availableAgents.all || state.availableAgents[state.pipelineContext] || [];
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;

        // Add to a visible place on canvas
        const x = 300 + (state.nodes.length * 40);
        const y = 300 + (state.nodes.length * 20);

        const newNode = createNode('agent', x, y, {
            agentId: agent.id,
            name: agent.name,
            icon: agent.icon,
            capability: agent.capability
        });

        renderAllNodes();
        renderAllEdges();
        selectNode(newNode.id);

        // Switch to Canvas tab if we're in Prompt tab
        if (state.currentStep === 1) {
            goToStep(2);
        }
    }

    // ============================================
    // Workflow Test Execution
    // ============================================
    async function runWorkflowTest() {
        if (state.isTesting) return;

        // 1. Perform Structural & Data Validation
        const validation = validateWorkflow();
        if (!validation.valid) {
            const errorMsg = validation.errors.join('\n');
            alert('워크플로우 설정 오류가 발견되었습니다:\n\n' + errorMsg);

            // Mark failed nodes visually
            validation.failedNodeIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('test-failed-glow');
            });

            showTestResult('failed', validation.errors[0]);
            return;
        }

        state.isTesting = true;

        // Get ordered nodes (for simulation, we follow the primary path)
        const startNode = state.nodes.find(n => n.type === 'start');

        // Build execution order (Breadth-first to show parallel as well)
        const executionOrder = [];
        const queue = [startNode.id];
        const visited = new Set();

        while (queue.length > 0) {
            const nodeId = queue.shift();
            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            const node = state.nodes.find(n => n.id === nodeId);
            executionOrder.push(node);

            const outgoingEdges = state.edges.filter(e => e.source === nodeId);
            outgoingEdges.forEach(e => {
                if (!visited.has(e.target)) queue.push(e.target);
            });
        }

        // Clear previous test classes
        document.querySelectorAll('.wf-node').forEach(el => {
            el.classList.remove('testing', 'test-success', 'test-failed');
        });
        document.querySelectorAll('.wf-connection-line').forEach(el => {
            el.classList.remove('testing');
        });

        // Show testing status
        showTestResult('testing');

        try {
            // Execute each node with animation
            for (let i = 0; i < executionOrder.length; i++) {
                const node = executionOrder[i];
                const nodeEl = document.getElementById(node.id);

                if (nodeEl) nodeEl.classList.add('testing');

                // Add testing class to edges leading to this node
                const incomingEdges = state.edges.filter(e => e.target === node.id);
                incomingEdges.forEach(edge => {
                    const edgeEl = document.getElementById(edge.id);
                    if (edgeEl) edgeEl.classList.add('testing');
                });

                // Simulate execution time
                await delay(600);

                if (nodeEl) {
                    nodeEl.classList.remove('testing');
                    nodeEl.classList.add('test-success');
                }
            }

            // All nodes in flow completed
            showTestResult('success');

        } catch (error) {
            console.error('Test failed:', error);
            showTestResult('failed');
        } finally {
            state.isTesting = false;
            setTimeout(() => {
                document.querySelectorAll('.wf-node').forEach(el => {
                    el.classList.remove('test-success', 'test-failed', 'test-failed-glow');
                });
                document.querySelectorAll('.wf-connection-line').forEach(el => {
                    el.classList.remove('testing');
                });
            }, 6000);
        }
    }

    /**
     * Comprehensive workflow validation
     */
    function validateWorkflow() {
        const errors = [];
        const failedNodeIds = new Set();

        if (state.nodes.length < 2) {
            errors.push('워크플로우에는 최소 2개 이상의 노드가 필요합니다.');
        }

        const startNode = state.nodes.find(n => n.type === 'start');
        if (!startNode) {
            errors.push('Start 노드가 배치되어야 합니다.');
        }

        const endNodes = state.nodes.filter(n => n.type === 'end');
        if (endNodes.length === 0) {
            errors.push('최소 하나 이상의 End 노드가 필요합니다.');
        }

        // 1. Connectivity Check (Reachable from Start)
        const reachable = new Set();
        if (startNode) {
            const stack = [startNode.id];
            while (stack.length > 0) {
                const id = stack.pop();
                if (reachable.has(id)) continue;
                reachable.add(id);
                state.edges.filter(e => e.source === id).forEach(e => stack.push(e.target));
            }
        }

        state.nodes.forEach(node => {
            if (!reachable.has(node.id)) {
                errors.push(`노드 "${node.data.name}" (ID: ${node.id}) 가 시작 흐름에 연결되어 있지 않습니다.`);
                failedNodeIds.add(node.id);
            }

            // 2. Specific Config Check
            const d = node.data;
            if (node.type === 'agent' && !d.agentId) {
                errors.push(`에이전트 노드 "${d.name}" 에 선택된 에이전트가 없습니다.`);
                failedNodeIds.add(node.id);
            }
            if (node.type === 'input' && !d.inputSource) {
                errors.push(`데이터 입력 노드 "${d.name}" 의 소스가 설정되지 않았습니다.`);
                failedNodeIds.add(node.id);
            }
            if (node.type === 'firestore' && !d.fsCollection) {
                errors.push(`Firestore 노드 "${d.name}" 의 컬렉션 경로가 비어있습니다.`);
                failedNodeIds.add(node.id);
            }
            if (node.type === 'end' && (d.outputDestination === 'firestore' && !d.outputCollection)) {
                errors.push(`End 노드 "${d.name}" 의 저장 경로(Firestore Collection)가 설정되지 않았습니다.`);
                failedNodeIds.add(node.id);
            }
            if (node.type === 'end' && (d.outputDestination === 'webhook' && !d.outputWebhook)) {
                errors.push(`End 노드 "${d.name}" 의 Webhook URL이 설정되지 않았습니다.`);
                failedNodeIds.add(node.id);
            }

            // 3. Flow Check (Terminating types)
            const hasOutgoing = state.edges.some(e => e.source === node.id);
            if (!hasOutgoing && node.type !== 'end') {
                errors.push(`노드 "${d.name}" 이후의 다음 단계가 연결되지 않았습니다 (End 노드여야 함).`);
                failedNodeIds.add(node.id);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            failedNodeIds: Array.from(failedNodeIds)
        };
    }

    function showTestResult(status, message = null) {
        const resultEl = document.getElementById('wf-test-result') || createTestResultElement();

        resultEl.className = 'wf-test-result show ' + status;

        if (status === 'testing') {
            resultEl.innerHTML = `
                <div class="wf-spinner" style="width: 24px; height: 24px; margin: 0 auto 8px;"></div>
                <div style="font-size: 13px;">Verifying Flow...</div>
            `;
        } else if (status === 'success') {
            resultEl.innerHTML = `
                <div style="color: #10b981; font-size: 20px; margin-bottom: 5px;">${SVG_ICONS.check}</div>
                <div style="font-weight: 700;">Validation Success</div>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">All connections & data valid</div>
            `;
        } else if (status === 'failed') {
            resultEl.innerHTML = `
                <div style="color: #ef4444; font-size: 20px; margin-bottom: 5px;">${SVG_ICONS.x}</div>
                <div style="font-weight: 700;">Validation Failed</div>
                <div style="font-size: 11px; color: #ef4444; margin-top: 4px; padding: 0 10px;">${message || 'Errors detected in workflow'}</div>
            `;
        }
    }

    function createTestResultElement() {
        const resultEl = document.createElement('div');
        resultEl.id = 'wf-test-result';
        resultEl.className = 'wf-test-result';

        const propertiesPanel = document.querySelector('.wf-properties-panel');
        if (propertiesPanel) {
            propertiesPanel.appendChild(resultEl);
        }
        return resultEl;
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function renderAllEdges() {
        if (!elements.connectionsSvg) return;
        elements.connectionsSvg.innerHTML = '';
        state.edges.forEach(edge => renderEdge(edge));
    }

    function deleteEdge(edgeId) {
        state.edges = state.edges.filter(e => e.id !== edgeId);
        renderAllEdges();
    }

    function renderEdge(edge) {
        const sourceNode = state.nodes.find(n => n.id === edge.source);
        const targetNode = state.nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        // Calculate center points in canvas space
        const getPortCenter = (nodeId, selector) => {
            const nodeEl = document.getElementById(nodeId);
            if (!nodeEl) return null;
            const port = nodeEl.querySelector(selector);
            if (!port) return null;

            const node = state.nodes.find(n => n.id === nodeId);
            if (!node) return null;

            // Get port center relative to node element
            const pRect = port.getBoundingClientRect();
            const nRect = nodeEl.getBoundingClientRect();

            return {
                x: node.x + (pRect.left + pRect.width / 2 - nRect.left) / state.zoom,
                y: node.y + (pRect.top + pRect.height / 2 - nRect.top) / state.zoom
            };
        };

        let sourceSelector = '.wf-port-output';
        if (sourceNode && sourceNode.type === 'condition') {
            if (edge.label === 'TRUE') sourceSelector = '.wf-port-output-true';
            else if (edge.label === 'FALSE') sourceSelector = '.wf-port-output-false';
            else if (edge.label === 'DEFAULT') sourceSelector = '.wf-port-output-default';
        }

        const sourceCenter = getPortCenter(edge.source, sourceSelector);
        const targetCenter = getPortCenter(edge.target, '.wf-port-input');

        if (!sourceCenter || !targetCenter) return;

        const x1 = sourceCenter.x;
        const y1 = sourceCenter.y;
        const x2 = targetCenter.x;
        const y2 = targetCenter.y;

        // Create bezier curve
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
        path.setAttribute('class', 'wf-connection-line');
        path.setAttribute('id', edge.id);
        elements.connectionsSvg.appendChild(path);

        // Add Invisible wider path for easier hovering
        const hoverPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hoverPath.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
        hoverPath.setAttribute('class', 'wf-connection-hover-area');
        elements.connectionsSvg.appendChild(hoverPath);

        // Add Middle Plus Button for Parallel/Insert
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'wf-edge-add-group');
        g.setAttribute('transform', `translate(${midX}, ${midY})`);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '10');
        circle.setAttribute('class', 'wf-edge-add-btn-bg');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.innerHTML = '+';
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('class', 'wf-edge-add-btn-text');

        g.appendChild(circle);
        g.appendChild(text);

        g.addEventListener('click', (e) => {
            e.stopPropagation();
            showParallelAgentPopup(edge, { clientX: e.clientX, clientY: e.clientY });
        });

        // 2. Delete Button Group (X)
        const gDel = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gDel.setAttribute('class', 'wf-edge-delete-group');
        // Position both buttons consistently
        g.setAttribute('transform', `translate(${midX - 15}, ${midY})`);
        gDel.setAttribute('transform', `translate(${midX + 15}, ${midY})`);

        const circleDel = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circleDel.setAttribute('r', '10');
        circleDel.setAttribute('class', 'wf-edge-delete-btn-bg');


        const xText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xText.innerHTML = '×';
        xText.setAttribute('text-anchor', 'middle');
        xText.setAttribute('dominant-baseline', 'central');
        xText.setAttribute('class', 'wf-edge-delete-btn-text');

        gDel.appendChild(circleDel);
        gDel.appendChild(xText);

        gDel.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('이 연결을 삭제하시겠습니까?')) {
                deleteEdge(edge.id);
            }
        });

        elements.connectionsSvg.appendChild(g);
        elements.connectionsSvg.appendChild(gDel);
    }

    function showParallelAgentPopup(edge, pos) {
        hideAgentPopup();
        const agents = state.availableAgents[state.pipelineContext] || [];
        const popup = document.createElement('div');
        popup.className = 'wf-agent-popup';
        popup.id = 'wf-agent-popup';
        popup.style.left = `${pos.clientX + 10}px`;
        popup.style.top = `${pos.clientY - 20}px`;

        popup.innerHTML = `
        <div class="wf-agent-popup-header">
            <h5>Add Parallel Agent</h5>
            <p style="font-size: 9px; margin: 0; opacity: 0.6;">Adds node from ${edge.source}</p>
        </div>
        ${agents.map(agent => `
                <div class="wf-agent-popup-item" data-agent-id="${agent.id}">
                    <div class="wf-agent-popup-item-icon">${SVG_ICONS[agent.icon] || SVG_ICONS.agent}</div>
                    <span class="wf-agent-popup-item-name">${agent.name}</span>
                </div>
            `).join('')}
        `;

        popup.querySelectorAll('.wf-agent-popup-item').forEach(item => {
            item.addEventListener('click', () => {
                const agentId = item.dataset.agentId;
                const agent = agents.find(a => a.id === agentId);
                const sourceNode = state.nodes.find(n => n.id === edge.source);

                if (agent && sourceNode) {
                    // Create new node at parallel offset
                    const newNode = createNode('agent', sourceNode.x + 200, sourceNode.y + 120, {
                        agentId: agent.id,
                        name: agent.name,
                        icon: agent.icon,
                        capability: agent.capability
                    });
                    renderNode(newNode);

                    // Connect same source to new parallel node
                    createEdge(edge.source, newNode.id, '');

                    renderAllEdges();
                    selectNode(newNode.id);
                }
                hideAgentPopup();
            });
        });

        document.body.appendChild(popup);
        state.activePopup = popup;
        setTimeout(() => {
            document.addEventListener('click', handlePopupOutsideClick);
        }, 100);
    }

    // ============================================
    // Node Selection & Properties
    // ============================================
    function selectNode(nodeId, isShift = false) {
        console.log(`[WorkflowCanvas] selectNode: ${nodeId} (Shift: ${isShift})`);

        if (!isShift) {
            // Normal click: Clear all and select single
            state.selectedNodeIds = nodeId ? [nodeId] : [];
        } else if (nodeId) {
            // Shift click: Toggle selection
            const index = state.selectedNodeIds.indexOf(nodeId);
            if (index > -1) {
                state.selectedNodeIds.splice(index, 1);
            } else {
                state.selectedNodeIds.push(nodeId);
            }
        }

        // Set primary selected node for properties panel
        state.selectedNodeId = state.selectedNodeIds.length > 0 ? state.selectedNodeIds[state.selectedNodeIds.length - 1] : null;

        // Visual update
        document.querySelectorAll('.wf-node').forEach(el => {
            if (state.selectedNodeIds.includes(el.id)) {
                el.classList.add('selected');
                el.style.zIndex = '1000';
            } else {
                el.classList.remove('selected');
                el.style.zIndex = '10';
            }
        });

        if (state.selectedNodeId) {
            showPropertiesForm(state.selectedNodeId);
        } else {
            hidePropertiesForm();
        }
    }

    function showPropertiesForm(nodeId) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node) return;

        state.isSyncingUI = true; // Lock UI updates

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
        const outputGroup = document.getElementById('wf-prop-output-group');
        const mcpGroup = document.getElementById('wf-prop-mcp-group');
        const inputNodeGroup = document.getElementById('wf-prop-input-node-group');
        const firestoreGroup = document.getElementById('wf-prop-firestore-group');
        const transformGroup = document.getElementById('wf-prop-transform-group');

        agentGroup.style.display = node.type === 'agent' ? 'block' : 'none';
        modelGroup.style.display = node.type === 'agent' ? 'block' : 'none';
        tempGroup.style.display = node.type === 'agent' ? 'block' : 'none';
        conditionGroup.style.display = node.type === 'condition' ? 'block' : 'none';
        inputGroup.style.display = node.type === 'agent' ? 'block' : 'none';
        outputGroup.style.display = node.type === 'end' ? 'block' : 'none';
        mcpGroup.style.display = node.type === 'agent' ? 'block' : 'none';
        inputNodeGroup.style.display = node.type === 'input' ? 'block' : 'none';
        firestoreGroup.style.display = node.type === 'firestore' ? 'block' : 'none';
        transformGroup.style.display = node.type === 'transform' ? 'block' : 'none';

        const instructionGroup = document.getElementById('wf-prop-instruction-group');
        if (instructionGroup) instructionGroup.style.display = node.type === 'agent' ? 'block' : 'none';

        // Update Trigger UI for the selected node
        if (node.data.triggerConfig) {
            syncTriggerUI(node.data.triggerConfig);
        } else {
            // Default config if missing
            node.data.triggerConfig = { type: node.type === 'start' ? 'manual' : 'automatic' };
            syncTriggerUI(node.data.triggerConfig);
        }

        // INPUT NODE handling
        if (node.type === 'input') {
            const sourceSelect = document.getElementById('wf-prop-input-source');
            sourceSelect.value = node.data.inputSource || '';
            updateInputSourceUI(node.data.inputSource || '');

            const khStatus = document.getElementById('wf-prop-input-kh-status');
            if (khStatus) khStatus.value = node.data.khStatus || 'active';

            const fsCollection = document.getElementById('wf-prop-input-fs-collection');
            if (fsCollection) fsCollection.value = node.data.fsCollection || '';

            const fsWhere = document.getElementById('wf-prop-input-fs-where');
            if (fsWhere) fsWhere.value = node.data.fsWhere || '';

            const manualJson = document.getElementById('wf-prop-input-manual-json');
            if (manualJson) manualJson.value = node.data.manualJson || '';
        }

        // FIRESTORE NODE handling
        if (node.type === 'firestore') {
            const opSelect = document.getElementById('wf-prop-fs-operation');
            opSelect.value = node.data.fsOperation || 'read';
            updateFirestoreOpUI(node.data.fsOperation || 'read');

            const fsCollection = document.getElementById('wf-prop-fs-collection');
            if (fsCollection) fsCollection.value = node.data.fsCollection || '';

            const fsWhere = document.getElementById('wf-prop-fs-where');
            if (fsWhere) fsWhere.value = node.data.fsWhere || '';

            const fsOrderBy = document.getElementById('wf-prop-fs-orderby');
            if (fsOrderBy) fsOrderBy.value = node.data.fsOrderBy || '';

            const fsLimit = document.getElementById('wf-prop-fs-limit');
            if (fsLimit) fsLimit.value = node.data.fsLimit || 50;

            const fsDocId = document.getElementById('wf-prop-fs-docid');
            if (fsDocId) fsDocId.value = node.data.fsDocId || '';

            const fsWriteTemplate = document.getElementById('wf-prop-fs-write-template');
            if (fsWriteTemplate) fsWriteTemplate.value = node.data.fsWriteTemplate || '';
        }

        // TRANSFORM NODE handling
        if (node.type === 'transform') {
            const typeSelect = document.getElementById('wf-prop-transform-type');
            typeSelect.value = node.data.transformType || 'filter';
            updateTransformUI(node.data.transformType || 'filter');

            const filterExpr = document.getElementById('wf-prop-transform-filter-expr');
            if (filterExpr) filterExpr.value = node.data.filterExpr || '';

            const mapTemplate = document.getElementById('wf-prop-transform-map-template');
            if (mapTemplate) mapTemplate.value = node.data.mapTemplate || '';

            const reduceExpr = document.getElementById('wf-prop-transform-reduce-expr');
            if (reduceExpr) reduceExpr.value = node.data.reduceExpr || '';

            const reduceInit = document.getElementById('wf-prop-transform-reduce-init');
            if (reduceInit) reduceInit.value = node.data.reduceInit || '0';

            const sortKey = document.getElementById('wf-prop-transform-sort-key');
            if (sortKey) sortKey.value = node.data.sortKey || '';

            const sortOrder = document.getElementById('wf-prop-transform-sort-order');
            if (sortOrder) sortOrder.value = node.data.sortOrder || 'desc';

            const sliceN = document.getElementById('wf-prop-transform-slice-n');
            if (sliceN) sliceN.value = node.data.sliceN || 10;

            const mergeSource = document.getElementById('wf-prop-transform-merge-source');
            if (mergeSource) mergeSource.value = node.data.mergeSource || 'project_context';
        }

        if (node.type === 'agent') {
            // Populate agent selector - show all agents with name(id) format
            const agentSelect = document.getElementById('wf-prop-agent');
            const agents = state.availableAgents.all || state.availableAgents[state.pipelineContext] || [];
            agentSelect.innerHTML = '<option value="">Select Agent...</option>' +
                agents.map(a => `<option value="${a.id}" ${a.id === node.data.agentId ? 'selected' : ''}>● ${a.name} (${a.id})</option>`).join('');

            // Get agent's capability for model filtering
            const selectedAgent = agents.find(a => a.id === node.data.agentId);
            const capability = selectedAgent?.capability || node.data.capability || 'text';
            node.data.capability = capability;

            // Populate model selector based on capability
            populateModelSelector(capability, node.data.model || 'gpt-4o');

            // Highlight active capability chip
            document.querySelectorAll('.wf-cap-chip').forEach(chip => {
                chip.classList.toggle('active', chip.dataset.cap === capability);
            });

            document.getElementById('wf-prop-temp').value = node.data.temperature || 0.7;
            document.getElementById('wf-prop-temp-value').textContent = node.data.temperature || 0.7;

            const instruction = document.getElementById('wf-prop-agent-instruction');
            if (instruction) instruction.value = node.data.instruction || '';

            // Input Mapping
            const inputMapping = document.getElementById('wf-prop-input-mapping');
            if (inputMapping) inputMapping.value = node.data.inputMapping || '';

            // Populate Variable Picker
            populateInputVariablePicker(nodeId);

            // MCP Settings
            const mcpEnabled = document.getElementById('wf-prop-mcp-enabled');
            const mcpServerSelect = document.getElementById('wf-prop-mcp-server');

            mcpEnabled.checked = node.data.mcpEnabled || false;
            document.getElementById('wf-mcp-config').style.display = node.data.mcpEnabled ? 'block' : 'none';

            // Populate MCP Server List
            mcpServerSelect.innerHTML = '<option value="">Choose Server...</option>' +
                state.mcpServers.map(s => `<option value="${s.id}" ${s.id === node.data.mcpServerId ? 'selected' : ''}>${s.name}</option>`).join('');

            if (node.data.mcpEnabled && node.data.mcpServerId) {
                renderMCPTools(node.data.mcpServerId, node.data.mcpEnabledTools || []);
            }

            // Sync Mode Buttons
            const mcpMode = node.data.mcpMode || 'hybrid';
            document.querySelectorAll('.wf-mcp-mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mcpMode);
            });
        }

        if (node.type === 'condition') {
            document.getElementById('wf-prop-condition').value = node.data.expression || '';

            // Logic operator logic
            const logicSelect = document.getElementById('wf-prop-condition-logic');
            if (logicSelect) {
                logicSelect.value = node.data.logic || 'AND';
                logicSelect.onchange = () => {
                    node.data.logic = logicSelect.value;
                    updateExpressionFromRules(node);
                };
            }

            // Render rules
            renderConditionRules(node.id);

            // DEFAULT route options
            const onMissing = document.getElementById('wf-default-on-missing');
            const onError = document.getElementById('wf-default-on-error');
            const onTimeout = document.getElementById('wf-default-on-timeout');

            if (onMissing) onMissing.checked = node.data.defaultRoute?.onMissing ?? true;
            if (onError) onError.checked = node.data.defaultRoute?.onError ?? true;
            if (onTimeout) onTimeout.checked = node.data.defaultRoute?.onTimeout ?? true;
        }

        if (node.type === 'end') {
            const destSelect = document.getElementById('wf-prop-output-dest');
            destSelect.value = node.data.outputDestination || 'none';

            // Populate the "Primary Result Node" selector
            const outputNodeSelect = document.getElementById('wf-prop-final-output-node');
            if (outputNodeSelect) {
                // List all nodes except the current End node and Start node
                const otherNodes = state.nodes.filter(n => n.id !== node.id && n.type !== 'start');
                outputNodeSelect.innerHTML = '<option value="">Default (Last Node)</option>' +
                    otherNodes.map(n => `<option value="${n.id}" ${n.id === node.data.finalOutputNodeId ? 'selected' : ''}>${n.data.name || n.type} (${n.id})</option>`).join('');
            }

            const ctxInput = document.getElementById('wf-prop-output-studio-context');
            ctxInput.value = state.pipelineContext;
            ctxInput.onchange = (e) => {
                state.pipelineContext = e.target.value;
                updateNodeProperty('pipelineContext', e.target.value);
            };
            // Remove readonly if user wants to change context
            ctxInput.readOnly = false;
            document.getElementById('wf-prop-output-collection').value = node.data.outputCollection || '';
            document.getElementById('wf-prop-output-webhook').value = node.data.outputWebhook || '';
            document.getElementById('wf-prop-output-doc-id').value = node.data.outputDocId || '';
            document.getElementById('wf-prop-output-data-template').value = node.data.outputDataTemplate || '';

            updateOutputUI(destSelect.value);
        }

        state.isSyncingUI = false; // Unlock UI updates

        // Show Output Data section if node has output
        showNodeOutputData(node);
    }

    /**
     * Display node's output data in the properties panel
     */
    function showNodeOutputData(node) {
        const section = document.getElementById('wf-output-data-section');
        const statusEl = document.getElementById('wf-output-data-status');
        const emptyEl = document.getElementById('wf-output-data-empty');
        const previewEl = document.getElementById('wf-output-data-preview');
        const jsonEl = document.getElementById('wf-output-data-json');
        const timestampEl = document.getElementById('wf-output-data-timestamp');
        const sizeEl = document.getElementById('wf-output-data-size');

        if (!section) return;

        // Always show the section for non-start nodes
        if (node.type === 'start') {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        // Check if node has output data
        const outputData = node.data.outputData;

        if (outputData && Object.keys(outputData).length > 0) {
            // Show output data preview
            emptyEl.style.display = 'none';
            previewEl.style.display = 'block';

            // Status badge
            const status = node.data.executionStatus || 'success';
            statusEl.className = 'wf-output-data-status ' + status;
            statusEl.textContent = status === 'success' ? '✓ Completed' :
                status === 'pending' ? '⏳ Running' : '✗ Error';

            // Metadata
            const timestamp = node.data.executedAt ? new Date(node.data.executedAt).toLocaleString('ko-KR') : 'N/A';
            const dataStr = safeJsonStringify(outputData);
            const size = dataStr.length > 1024 ? `${(dataStr.length / 1024).toFixed(1)} KB` : `${dataStr.length} bytes`;

            timestampEl.textContent = `🕐 ${timestamp}`;
            sizeEl.textContent = `📦 ${size}`;

            // JSON preview (truncated)
            const jsonPreview = safeJsonStringify(outputData, 2);
            const truncated = jsonPreview.length > 500 ? jsonPreview.substring(0, 500) + '\n...' : jsonPreview;
            jsonEl.querySelector('code').textContent = truncated;

            // Store full data for expansion
            state.selectedNodeOutputData = outputData;
        } else {
            // No output data yet
            emptyEl.style.display = 'block';
            previewEl.style.display = 'none';
            statusEl.className = 'wf-output-data-status';
            statusEl.textContent = '';
            state.selectedNodeOutputData = null;
        }
    }

    /**
     * Expand output data in a modal
     */
    function expandOutputData() {
        if (!state.selectedNodeOutputData) return;

        const data = state.selectedNodeOutputData;
        const jsonStr = JSON.stringify(data, null, 2);

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'wf-output-modal-overlay';
        modal.innerHTML = `
            <div class="wf-output-modal">
                <div class="wf-output-modal-header">
                    <h3>📄 Full Output Data</h3>
                    <button class="wf-output-modal-close" id="wf-output-close">✕</button>
                </div>
                <div class="wf-output-modal-body">
                    <pre>${escapeHtml(jsonStr)}</pre>
                </div>
                <div class="wf-output-modal-footer">
                    <button class="wf-btn wf-btn-secondary" id="wf-copy-json">📋 Copy JSON</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Attach listeners
        const copyBtn = modal.querySelector('#wf-copy-json');
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(jsonStr).then(() => {
                copyBtn.textContent = '✓ Copied!';
                setTimeout(() => { copyBtn.textContent = '📋 Copy JSON'; }, 2000);
            }).catch(err => {
                console.error('Copy failed:', err);
                notify('복사 실패: ' + err.message, 'error');
            });
        };

        const closeBtn = modal.querySelector('#wf-output-close');
        closeBtn.onclick = () => modal.remove();

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Test a single node (Unit Test)
     * Executes the selected node independently and displays results
     */
    async function testNode() {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node) {
            notify('테스트할 노드를 선택해주세요.', 'error');
            return;
        }

        // UI - Set loading state
        const btn = document.getElementById('wf-test-node-btn');
        const hint = document.getElementById('wf-test-node-hint');
        btn.classList.add('loading');
        btn.classList.remove('success', 'error');
        hint.textContent = '실행 중...';

        console.log(`[WorkflowCanvas] Testing node: ${node.id} (${node.type})`);

        try {
            let result;
            const startTime = Date.now();

            switch (node.type) {
                case 'start':
                    result = await testStartNode(node);
                    break;
                case 'agent':
                    result = await testAgentNode(node);
                    break;
                case 'input':
                    result = await testInputNode(node);
                    break;
                case 'firestore':
                    result = await testFirestoreNode(node);
                    break;
                case 'transform':
                    result = await testTransformNode(node);
                    break;
                case 'condition':
                    result = await testConditionNode(node);
                    break;
                case 'parallel':
                    result = { success: true, output: { message: 'Parallel node requires full workflow execution' } };
                    break;
                case 'end':
                    result = { success: true, output: { message: 'End node - workflow complete' } };
                    break;
                default:
                    result = { success: false, error: `Unsupported node type: ${node.type}` };
            }

            const duration = Date.now() - startTime;

            // Update node with output data
            node.data.outputData = result.output || result.error;
            node.data.executionStatus = result.success ? 'success' : 'error';
            node.data.executedAt = new Date().toISOString();
            node.data.executionDuration = duration;

            // UI - Show result in Output Data section
            showNodeOutputData(node);

            // UI - Update button state
            btn.classList.remove('loading');
            btn.classList.add(result.success ? 'success' : 'error');
            hint.textContent = result.success
                ? `✓ 완료 (${duration}ms)`
                : `✗ 오류: ${result.error || 'Unknown error'}`;

            // Re-render node to show status indicator
            renderNodeStatus(node.id, result.success ? 'success' : 'error');

            notify(result.success ? '노드 테스트 완료!' : '노드 테스트 실패', result.success ? 'success' : 'error');

        } catch (error) {
            console.error('[WorkflowCanvas] Test failed:', error);

            node.data.outputData = { error: error.message };
            node.data.executionStatus = 'error';
            node.data.executedAt = new Date().toISOString();

            showNodeOutputData(node);

            btn.classList.remove('loading');
            btn.classList.add('error');
            hint.textContent = `✗ 오류: ${error.message}`;

            notify('노드 테스트 실패: ' + error.message, 'error');
        }
    }

    /**
     * Test Agent Node - Call Cloud Function
     */
    async function testAgentNode(node) {
        const agentId = node.data.agentId;
        if (!agentId) {
            return { success: false, error: 'Agent not selected' };
        }

        // Build context from previous nodes (mock for now)
        const previousOutputs = getPreviousNodeOutputs(node.id);

        // Get project context
        const projectId = state.pipelineContext || 'test-project';
        const runId = `test_${Date.now()}`;

        console.log(`[testAgentNode] Calling executeSubAgent for: ${agentId}`);

        // Call Cloud Function
        const executeSubAgent = firebase.functions().httpsCallable('executeSubAgent', { timeout: 540000 });
        const response = await executeSubAgent({
            projectId,
            teamId: 'test-team',
            runId,
            subAgentId: agentId,
            systemPrompt: node.data.systemPrompt || `You are ${node.data.name || agentId}.`,
            taskPrompt: node.data.taskPrompt || `Execute the task for ${node.data.name || agentId}.`,
            previousOutputs,
            provider: getProviderFromModel(node.data.model),
            model: node.data.model || 'gpt-4o',
            temperature: node.data.temperature || 0.7
        });

        if (response.data && response.data.success) {
            return {
                success: true,
                output: {
                    response: response.data.output,
                    model: response.data.model,
                    usage: response.data.usage,
                    metadata: response.data.metadata
                }
            };
        } else {
            return { success: false, error: response.data?.error || 'Unknown error from Cloud Function' };
        }
    }

    /**
     * Test Start Node
     */
    async function testStartNode(node) {
        return {
            success: true,
            output: {
                message: 'Workflow started',
                triggerType: node.data.triggerConfig?.type || 'manual',
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Test Input Node
     */
    async function testInputNode(node) {
        const source = node.data.inputSource;
        let data = null;

        // Validation: Check if source is selected
        if (!source || source === '' || source === 'Select Source...') {
            return {
                success: false,
                error: 'DATA SOURCE가 선택되지 않았습니다. 데이터 소스를 선택해주세요.'
            };
        }

        switch (source) {
            case 'knowledge_hub':
                // Query Knowledge Hub - actually query if possible
                const khStatus = node.data.khStatus || 'active';
                try {
                    // Priority 1: state.projectId, Priority 2: state.pipelineContext
                    const targetId = (state.projectId && state.projectId !== '') ? state.projectId : state.pipelineContext;
                    const isReserved = ['market', 'brand', 'knowledge', 'studio', 'growth', 'all'].includes(targetId);

                    const firestore = window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
                    if (targetId && !isReserved && firestore) {
                        // Correct path is projects/{id}/knowledgeSources
                        const snapshot = await firestore.collection('projects').doc(targetId)
                            .collection('knowledgeSources')
                            .get();

                        const items = [];
                        snapshot.forEach(doc => {
                            const d = doc.data();
                            // Filter by status if needed
                            if (khStatus === 'active' && d.isActive === false) return;
                            if (khStatus === 'completed' && d.status !== 'completed') return;
                            items.push({ id: doc.id, ...d });
                        });

                        data = {
                            source: 'Knowledge Hub',
                            filter: khStatus,
                            count: items.length,
                            items: items.map(i => ({ id: i.id, title: i.title || i.name || 'Untitled' })),
                            rawText: items.map(i => `Title: ${i.title}\nContent: ${i.summary || i.content || i.description}`).join('\n\n')
                        };
                    } else {
                        data = {
                            source: 'Knowledge Hub',
                            filter: khStatus,
                            message: 'Project context not set - showing mock data',
                            items: [{ id: 'mock1', title: 'Sample Document 1' }, { id: 'mock2', title: 'Sample Document 2' }]
                        };
                    }
                } catch (e) {
                    data = { source: 'Knowledge Hub', filter: khStatus, error: e.message, items: [] };
                }
                break;

            case 'project_brief':
                // Get Project Brief
                try {
                    const targetId = (state.projectId && state.projectId !== '') ? state.projectId : state.pipelineContext;
                    const isReserved = ['market', 'brand', 'knowledge', 'studio', 'growth', 'all'].includes(targetId);

                    const firestore = window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
                    if (targetId && !isReserved && firestore) {
                        const projectDoc = await firestore.collection('projects').doc(targetId).get();
                        if (projectDoc.exists) {
                            const p = projectDoc.data();
                            data = {
                                source: 'Project Brief',
                                name: p.name,
                                description: p.description,
                                targetAudience: p.targetAudience,
                                goals: p.goals
                            };
                        } else {
                            data = getMockProjectBrief();
                        }
                    } else {
                        data = getMockProjectBrief();
                    }
                } catch (e) {
                    data = getMockProjectBrief();
                }
                break;

            case 'brand_brain':
                // Get Brand Brain Context
                try {
                    const targetId = (state.projectId && state.projectId !== '') ? state.projectId : state.pipelineContext;
                    const isReserved = ['market', 'brand', 'knowledge', 'studio', 'growth', 'all'].includes(targetId);

                    const firestore = window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
                    if (targetId && !isReserved && firestore) {
                        const brandDoc = await firestore.collection('brandBrain').doc(targetId).get();
                        if (brandDoc.exists) {
                            data = { source: 'Brand Brain', ...brandDoc.data() };
                        } else {
                            data = getMockBrandBrain();
                        }
                    } else {
                        data = getMockBrandBrain();
                    }
                } catch (e) {
                    data = getMockBrandBrain();
                }
                break;

            case 'firestore_query':
                const collection = node.data.fsCollection;
                if (!collection) {
                    return { success: false, error: 'Firestore Collection 경로가 지정되지 않았습니다.' };
                }
                try {
                    const firestore = window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
                    if (firestore) {
                        const snapshot = await firestore.collection(collection).limit(5).get();
                        const items = [];
                        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
                        data = { source: 'Firestore Query', collection, count: items.length, items };
                    } else {
                        data = { source: 'Firestore Query', collection, message: 'Mock data', items: [{ id: 'doc1' }] };
                    }
                } catch (e) {
                    return { success: false, error: 'Firestore query failed: ' + e.message };
                }
                break;

            case 'manual_json':
                const jsonInput = node.data.manualJson;
                if (!jsonInput || jsonInput.trim() === '') {
                    return { success: false, error: 'Manual JSON 입력이 비어있습니다.' };
                }
                try {
                    data = JSON.parse(jsonInput);
                } catch (e) {
                    return { success: false, error: 'Invalid JSON: ' + e.message };
                }
                break;

            default:
                return {
                    success: false,
                    error: `알 수 없는 데이터 소스: ${source}`
                };
        }

        return { success: true, output: data };
    }

    /**
     * Test Firestore Node
     */
    async function testFirestoreNode(node) {
        const operation = node.data.fsOperation || 'read';
        const collection = node.data.fsCollection;

        if (!collection) {
            return { success: false, error: 'Collection path not specified' };
        }

        return {
            success: true,
            output: {
                operation,
                collection,
                message: `Firestore ${operation} operation ready`,
                mockData: operation === 'read' ? [{ id: 'doc1', data: 'sample' }] : { written: true }
            }
        };
    }

    /**
     * Test Transform Node
     */
    async function testTransformNode(node) {
        const transformType = node.data.transformType || 'filter';
        const mockInput = [{ id: 1, value: 10 }, { id: 2, value: 20 }, { id: 3, value: 5 }];

        let output;
        switch (transformType) {
            case 'filter':
                output = mockInput.filter(item => item.value > 5);
                break;
            case 'map':
                output = mockInput.map(item => ({ ...item, doubled: item.value * 2 }));
                break;
            case 'reduce':
                output = { sum: mockInput.reduce((acc, item) => acc + item.value, 0) };
                break;
            case 'sort':
                output = [...mockInput].sort((a, b) => b.value - a.value);
                break;
            case 'slice':
                output = mockInput.slice(0, node.data.sliceN || 2);
                break;
            default:
                output = mockInput;
        }

        return {
            success: true,
            output: {
                transformType,
                input: mockInput,
                result: output
            }
        };
    }

    /**
     * Test Condition Node
     */
    async function testConditionNode(node) {
        const expression = node.data.expression || 'true';

        // Mock evaluation
        const mockContext = { output: { success: true, value: 100 } };
        let result;

        try {
            // Simple evaluation (for testing purposes)
            result = expression.includes('true') || expression.includes('success');
        } catch (e) {
            result = false;
        }

        return {
            success: true,
            output: {
                expression,
                evaluatedTo: result,
                branch: result ? 'TRUE' : 'FALSE'
            }
        };
    }

    /**
     * Get outputs from previous nodes (for context)
     */
    function getPreviousNodeOutputs(nodeId) {
        const incomingEdges = state.edges.filter(e => e.target === nodeId);
        const outputs = [];

        incomingEdges.forEach(edge => {
            const sourceNode = state.nodes.find(n => n.id === edge.source);
            if (sourceNode && sourceNode.data.outputData) {
                outputs.push({
                    nodeId: sourceNode.id,
                    role: sourceNode.data.name || sourceNode.type,
                    content: JSON.stringify(sourceNode.data.outputData)
                });
            }
        });

        return outputs;
    }

    /**
     * Extract provider from model name
     */
    function getProviderFromModel(model) {
        if (!model) return 'openai';
        if (model.includes('gpt')) return 'openai';
        if (model.includes('gemini')) return 'google';
        if (model.includes('claude')) return 'anthropic';
        if (model.includes('deepseek')) return 'deepseek';
        return 'openai';
    }

    /**
     * Render node status indicator (success/error badge)
     */
    function renderNodeStatus(nodeId, status) {
        const nodeEl = document.getElementById(nodeId);
        if (!nodeEl) return;

        // Remove existing status
        nodeEl.classList.remove('wf-node-success', 'wf-node-error', 'wf-node-running');

        // Add new status
        if (status === 'success') {
            nodeEl.classList.add('wf-node-success');
        } else if (status === 'error') {
            nodeEl.classList.add('wf-node-error');
        } else if (status === 'running') {
            nodeEl.classList.add('wf-node-running');
        }
    }

    function updateOutputUI(dest) {
        document.getElementById('wf-output-studio-options').style.display = dest === 'studio' ? 'block' : 'none';
        document.getElementById('wf-output-firestore-options').style.display = dest === 'firestore' ? 'block' : 'none';
        document.getElementById('wf-output-webhook-options').style.display = dest === 'webhook' ? 'block' : 'none';
    }

    // ============================================
    // MCP Handlers
    // ============================================
    function toggleMCP(enabled) {
        updateNodeProperty('mcpEnabled', enabled);
        document.getElementById('wf-mcp-config').style.display = enabled ? 'block' : 'none';

        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (enabled && node && node.data.mcpServerId) {
            renderMCPTools(node.data.mcpServerId, node.data.mcpEnabledTools || []);
        }
    }

    function updateMCPServer(serverId) {
        updateNodeProperty('mcpServerId', serverId);
        updateNodeProperty('mcpEnabledTools', []); // Reset tools on server change

        if (serverId) {
            renderMCPTools(serverId, []);
        } else {
            document.getElementById('wf-mcp-tools-container').style.display = 'none';
        }
    }

    function renderMCPTools(serverId, enabledTools) {
        const server = state.mcpServers.find(s => s.id === serverId);
        const container = document.getElementById('wf-mcp-tools-container');
        const list = document.getElementById('wf-mcp-tools-list');

        if (!server || !server.tools || server.tools.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        list.innerHTML = server.tools.map(tool => `
            <div class="wf-mcp-tool-chip ${enabledTools.includes(tool.id) ? 'selected' : ''}" 
                 onclick="WorkflowCanvas.toggleMCPTool('${tool.id}')" 
                 title="${tool.description}">
                ${tool.name}
            </div>
        `).join('');
    }

    function toggleMCPTool(toolId) {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node) return;

        let tools = node.data.mcpEnabledTools || [];
        if (tools.includes(toolId)) {
            tools = tools.filter(id => id !== toolId);
        } else {
            tools.push(toolId);
        }

        updateNodeProperty('mcpEnabledTools', tools);
        renderMCPTools(node.data.mcpServerId, tools);
    }

    function setMCPMode(mode) {
        updateNodeProperty('mcpMode', mode);
        document.querySelectorAll('.wf-mcp-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    }

    // ============================================
    // Input Node UI Handlers
    // ============================================
    function updateInputSourceUI(source) {
        document.getElementById('wf-input-knowledge-options').style.display = source === 'knowledge_hub' ? 'block' : 'none';
        document.getElementById('wf-input-firestore-options').style.display = source === 'firestore_query' ? 'block' : 'none';
        document.getElementById('wf-input-manual-options').style.display = source === 'manual_json' ? 'block' : 'none';
        updateNodeProperty('inputSource', source);
    }

    // ============================================
    // Firestore Node UI Handlers
    // ============================================
    function updateFirestoreOpUI(operation) {
        document.getElementById('wf-fs-read-options').style.display = operation === 'read' ? 'block' : 'none';
        document.getElementById('wf-fs-write-options').style.display = ['write', 'update'].includes(operation) ? 'block' : 'none';
        updateNodeProperty('fsOperation', operation);
    }

    // ============================================
    // Transform Node UI Handlers
    // ============================================
    function updateTransformUI(type) {
        document.getElementById('wf-transform-filter-options').style.display = type === 'filter' ? 'block' : 'none';
        document.getElementById('wf-transform-map-options').style.display = type === 'map' ? 'block' : 'none';
        document.getElementById('wf-transform-reduce-options').style.display = type === 'reduce' ? 'block' : 'none';
        document.getElementById('wf-transform-sort-options').style.display = type === 'sort' ? 'block' : 'none';
        document.getElementById('wf-transform-slice-options').style.display = type === 'slice' ? 'block' : 'none';
        document.getElementById('wf-transform-aggregate-options').style.display = type === 'aggregate' ? 'block' : 'none';
        updateNodeProperty('transformType', type);
    }

    function populateInputVariablePicker(nodeId) {
        const picker = document.getElementById('wf-variable-picker');
        if (!picker) return;

        const upstreamNodes = getUpstreamNodes(nodeId);

        if (upstreamNodes.length === 0) {
            picker.innerHTML = '<p class="wf-property-hint">선행 노드가 없어 사용할 수 있는 변수가 없습니다.</p>';
            return;
        }

        let html = '<div class="wf-variable-chips">';
        upstreamNodes.forEach(node => {
            const nodeName = node.data.name || node.id;
            // Get outputs for this node type
            const outputs = getNodeOutputs(node);

            outputs.forEach(opt => {
                const varPath = `{{${node.id}.output.${opt}}}`;
                html += `
            <div class="wf-variable-chip"
                title="${varPath}"
                onmouseover="WorkflowCanvas.highlightNode('${node.id}')"
                onmouseout="WorkflowCanvas.unhighlightNodes()"
                onclick="WorkflowCanvas.insertVariable('${varPath}')">
                <span class="wf-chip-node">${nodeName}</span>
                <span class="wf-chip-var">${opt}</span>
            </div>
`;
            });
        });
        html += '</div>';
        picker.innerHTML = html;
    }

    function highlightNode(nodeId) {
        const el = document.getElementById(nodeId);
        if (el) el.classList.add('highlighted');
    }

    function unhighlightNodes() {
        document.querySelectorAll('.wf-node.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
    }

    function getUpstreamNodes(nodeId) {
        // Collect all nodes that can reach this node via edges
        const sourceIds = state.edges.filter(e => e.target === nodeId).map(e => e.source);
        // Include agent, input, transform, and firestore nodes as data sources
        return state.nodes.filter(n => sourceIds.includes(n.id) && ['agent', 'input', 'transform', 'firestore'].includes(n.type));
    }

    function getNodeOutputs(node) {
        // For Agents, use capability-based outputs
        if (node.type === 'agent') {
            if (node.data.capability === 'image') return ['imageUrl', 'prompt', 'revisedPrompt'];
            if (node.data.capability === 'video') return ['videoUrl', 'thumbnailUrl', 'duration'];
            return ['text', 'summary', 'status'];
        }

        // For Transform (Aggregate, Filter, etc.)
        if (node.type === 'transform') {
            return ['result', 'inputCount', 'outputCount'];
        }

        // For Input Nodes (Knowledge Hub, Project Brief)
        if (node.type === 'input') {
            const source = node.data.inputSource;
            if (source === 'project_brief') return ['name', 'description', 'goals', 'targetAudience'];
            if (source === 'knowledge_hub') return ['items', 'count', 'source'];
            if (source === 'brand_brain') return ['persona', 'tone', 'values'];
            return ['data', 'source'];
        }

        // For Firestore
        if (node.type === 'firestore') {
            return ['result', 'count', 'path'];
        }

        return ['output'];
    }

    function insertVariable(varPath) {
        const inputMapping = document.getElementById('wf-prop-input-mapping');
        if (!inputMapping) return;

        const start = inputMapping.selectionStart;
        const end = inputMapping.selectionEnd;
        const text = inputMapping.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        inputMapping.value = before + varPath + after;
        inputMapping.focus();

        // Trigger save
        updateNodeProperty('inputMapping', inputMapping.value);
    }

    function populateModelSelector(capability, currentModel) {
        const modelSelect = document.getElementById('wf-prop-model');
        if (!modelSelect) return;

        // Sync Chips
        document.querySelectorAll('.wf-cap-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.cap === capability);
        });

        let optionsHTML = '';

        // Group models by capability
        const capabilities = ['text', 'image', 'video', 'code'];
        const labels = {
            text: '🔤 Text Models',
            image: '🖼️ Image Models',
            video: '🎬 Video Models',
            code: '💻 Code Models'
        };

        // Put current capability groups first
        const sortedCaps = [capability, ...capabilities.filter(c => c !== capability)];

        sortedCaps.forEach(cap => {
            const models = state.modelCatalog[cap] || [];
            if (models.length === 0) return;

            optionsHTML += `<optgroup label="${labels[cap]}">`;
            models.forEach(m => {
                const tierBadge = m.tier === 'premium' ? '⭐' : m.tier === 'economy' ? '💰' : '';
                const disabled = m.disabled ? 'disabled' : '';
                const selected = (m.id === currentModel) ? 'selected' : '';
                optionsHTML += `<option value="${m.id}" ${selected} ${disabled}>${tierBadge} ${m.name} (${m.provider})</option>`;
            });
            optionsHTML += `</optgroup>`;
        });

        // Add multimodal as fallback/alternative for image tasks
        if (capability === 'image' && !optionsHTML.includes('gpt-4o')) {
            optionsHTML += `
                <optgroup label="✨ Multimodal (Vision)">
                    <option value="gpt-4o" ${currentModel === 'gpt-4o' ? 'selected' : ''}>GPT-4o (Vision supported)</option>
                    <option value="gemini-2.0-flash" ${currentModel === 'gemini-2.0-flash' ? 'selected' : ''}>Gemini 2.0 Flash</option>
                </optgroup>
            `;
        }

        modelSelect.innerHTML = optionsHTML;

        // Update capability indicator/badge
        updateCapabilityBadge(capability);
    }

    function switchCapability(capability) {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node || node.type !== 'agent') return;

        node.data.capability = capability;

        // Pick first model of this capability as default if current one isn't compatible
        const compatibleModels = state.modelCatalog[capability] || [];
        if (compatibleModels.length > 0) {
            node.data.model = compatibleModels[0].id;
        }

        populateModelSelector(capability, node.data.model);
        renderAllNodes(); // Refresh icon on canvas
    }

    function updateCapabilityBadge(capability) {
        const badge = document.getElementById('wf-capability-badge');
        if (!badge) return;

        const config = {
            text: { label: 'TEXT', color: '#00f0ff', icon: SVG_ICONS.text },
            image: { label: 'IMAGE', color: '#10b981', icon: SVG_ICONS.image },
            video: { label: 'VIDEO', color: '#a855f7', icon: SVG_ICONS.video },
            code: { label: 'CODE', color: '#f59e0b', icon: SVG_ICONS.code }
        }[capability] || { label: 'TEXT', color: '#00f0ff', icon: SVG_ICONS.text };

        badge.innerHTML = `<span style="color: ${config.color};">${config.icon}</span> ${config.label}`;
        badge.style.borderColor = config.color;
        badge.style.background = `${config.color}15`;
    }

    function hidePropertiesForm() {
        elements.noSelection.style.display = 'flex';
        elements.propertiesForm.style.display = 'none';
    }
    // ============================================
    // Visual Condition Builder Handlers
    // ============================================
    function addConditionRule() {
        if (!state.selectedNodeId) return;
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node || node.type !== 'condition') return;

        if (!node.data.rules) node.data.rules = [];

        node.data.rules.push({
            id: 'rule_' + Date.now(),
            field: 'output.confidence',
            operator: '>',
            value: '0.7'
        });

        renderConditionRules(node.id);
        updateExpressionFromRules(node);
    }

    function removeConditionRule(ruleId) {
        if (!state.selectedNodeId) return;
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node || !node.data.rules) return;

        node.data.rules = node.data.rules.filter(r => r.id !== ruleId);
        renderConditionRules(node.id);
        updateExpressionFromRules(node);
    }

    function updateConditionRule(ruleId, key, value) {
        if (!state.selectedNodeId) return;
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node || !node.data.rules) return;

        const rule = node.data.rules.find(r => r.id === ruleId);
        if (rule) {
            rule[key] = value;
            updateExpressionFromRules(node);
        }
    }

    function updateExpressionFromRules(node) {
        if (!node.data.rules || node.data.rules.length === 0) {
            node.data.expression = '';
        } else {
            const logic = document.getElementById('wf-prop-condition-logic')?.value || 'AND';
            const separator = logic === 'OR' ? ' || ' : ' && ';

            node.data.expression = node.data.rules.map(r => {
                let val = r.value;
                // Quote strings if not numeric
                if (isNaN(val) && val !== 'true' && val !== 'false') {
                    val = `"${val}"`;
                }

                let op = r.operator;
                if (op === 'contains') return `${r.field}.includes(${val})`;
                if (op === 'not_contains') return `!${r.field}.includes(${val})`;
                if (op === 'starts_with') return `${r.field}.startsWith(${val})`;
                if (op === 'ends_with') return `${r.field}.endsWith(${val})`;

                return `${r.field} ${op} ${val}`;
            }).join(separator);
        }

        // Update the textual preview
        const exprEl = document.getElementById('wf-prop-condition');
        if (exprEl) exprEl.value = node.data.expression;

        // Update the visual appearance on canvas if needed
        renderAllNodes();
        selectNode(node.id); // Maintain selection after re-render
    }

    function renderConditionRules(nodeId) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node || node.type !== 'condition') return;

        const container = document.getElementById('wf-condition-rules-container');
        const logicGroup = document.getElementById('wf-logic-operator-group');

        if (!container) return;

        const rules = node.data.rules || [];
        if (rules.length > 1) {
            logicGroup.style.display = 'block';
            document.getElementById('wf-prop-condition-logic').value = node.data.logic || 'AND';
        } else {
            logicGroup.style.display = 'none';
        }

        container.innerHTML = rules.map(rule => `
            <div class="wf-condition-rule" data-rule-id="${rule.id}">
                <div class="wf-rule-remove" onclick="WorkflowCanvas.removeConditionRule('${rule.id}')">×</div>
                <div class="wf-condition-rule-row">
                    <select class="wf-rule-select wf-rule-field" onchange="WorkflowCanvas.updateConditionRule('${rule.id}', 'field', this.value)">
                        <optgroup label="Node Output">
                            <option value="output.text" ${rule.field === 'output.text' ? 'selected' : ''}>output.text</option>
                            <option value="output.confidence" ${rule.field === 'output.confidence' ? 'selected' : ''}>output.confidence</option>
                            <option value="output.length" ${rule.field === 'output.length' ? 'selected' : ''}>output.length</option>
                            <option value="output.status" ${rule.field === 'output.status' ? 'selected' : ''}>output.status</option>
                        </optgroup>
                        <optgroup label="Context">
                            <option value="context.pipeline" ${rule.field === 'context.pipeline' ? 'selected' : ''}>context.pipeline</option>
                            <option value="context.userRole" ${rule.field === 'context.userRole' ? 'selected' : ''}>context.userRole</option>
                        </optgroup>
                    </select>
                    <select class="wf-rule-select wf-rule-op" onchange="WorkflowCanvas.updateConditionRule('${rule.id}', 'operator', this.value)">
                        <option value=">" ${rule.operator === '>' ? 'selected' : ''}>></option>
                        <option value="<" ${rule.operator === '<' ? 'selected' : ''}><</option>
                        <option value="==" ${rule.operator === '==' ? 'selected' : ''}>==</option>
                        <option value="!=" ${rule.operator === '!=' ? 'selected' : ''}>!=</option>
                        <option value="contains" ${rule.operator === 'contains' ? 'selected' : ''}>Contains</option>
                        <option value="not_contains" ${rule.operator === 'not_contains' ? 'selected' : ''}>Not Contains</option>
                    </select>
                </div>
                <div class="wf-condition-rule-row">
                    <input type="text" class="wf-rule-input wf-rule-value" 
                        value="${rule.value}" 
                        placeholder="Value..."
                        onchange="WorkflowCanvas.updateConditionRule('${rule.id}', 'value', this.value)">
                </div>
            </div>
        `).join('');

        if (rules.length === 0) {
            container.innerHTML = '<p style="font-size: 11px; opacity: 0.5; text-align: center; padding: 10px;">No rules defined. Click +Add Rule.</p>';
        }
    }


    function updateNodeProperty(key, value) {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node) return;

        if (key === 'pipelineContext') {
            state.pipelineContext = value;
            return;
        }

        node.data[key] = value;

        // Optimized Update: For 'name', update DOM directly to avoid focus loss and flickering during typing
        if (key === 'name') {
            const nodeEl = document.getElementById(node.id);
            if (nodeEl) {
                // Find name element in agent nodes or data nodes
                const nameText = nodeEl.querySelector('.wf-node-agent-name, .wf-node-data-name');
                if (nameText) nameText.textContent = value;
            }
            return;
        }

        // Update visual if needed
        const uiAffectingKeys = ['model', 'temperature', 'agentId', 'icon', 'inputSource', 'fsOperation', 'transformType', 'outputDestination'];
        if (uiAffectingKeys.includes(key) && !state.isSyncingUI) {
            renderAllNodes();
            selectNode(state.selectedNodeId);
        }

        renderAllEdges();
    }

    function deleteSelectedNode() {
        if (state.selectedNodeIds.length === 0) return;
        const count = state.selectedNodeIds.length;
        if (!confirm(`${count}개의 노드를 삭제하시겠습니까?`)) return;

        // Perform smart deletion: connect previous nodes to next nodes
        state.selectedNodeIds.forEach(id => {
            const incomingEdges = state.edges.filter(e => e.target === id);
            const outgoingEdges = state.edges.filter(e => e.source === id);

            // Only attempt auto-reconnect if it's a single node being deleted
            // to avoid complex/unexpected side effects for mass deletions
            if (count === 1) {
                incomingEdges.forEach(inEdge => {
                    outgoingEdges.forEach(outEdge => {
                        // Avoid duplicates if already exists
                        const exists = state.edges.some(e => e.source === inEdge.source && e.target === outEdge.target);
                        if (!exists) {
                            createEdge(inEdge.source, outEdge.target);
                        }
                    });
                });
            }

            // Remove edges connected to this node
            state.edges = state.edges.filter(e => e.source !== id && e.target !== id);
            // Remove node
            state.nodes = state.nodes.filter(n => n.id !== id);
        });

        state.selectedNodeIds = [];
        state.selectedNodeId = null;

        renderAllNodes();
        renderAllEdges();
        hidePropertiesForm();
    }

    // ============================================
    // Canvas Event Handlers
    // ============================================
    function handleNodeMouseDown(e, nodeId) {
        e.stopPropagation(); // Stop background click from firing
        const isShift = e.shiftKey;

        // If the node isn't part of current selection, update selection
        if (!state.selectedNodeIds.includes(nodeId)) {
            selectNode(nodeId, isShift);
        }

        if (e.target.classList.contains('wf-port')) {
            // Start connection dragging from output port
            if (e.target.classList.contains('wf-port-output') || e.target.classList.contains('wf-port-output-true') || e.target.classList.contains('wf-port-output-false') || e.target.classList.contains('wf-port-output-default')) {
                state.isConnecting = true;
                state.connectionSource = {
                    nodeId: nodeId,
                    portType: e.target.dataset.portType || 'output',
                    x: e.clientX,
                    y: e.clientY
                };
                e.preventDefault();
                return;
            }
            return;
        }

        e.preventDefault();
        state.isDragging = true;
        state.dragNodeId = nodeId;

        // Store drag offsets for ALL selected nodes
        state.dragNodeOffsets = {};
        state.selectedNodeIds.forEach(id => {
            const node = state.nodes.find(n => n.id === id);
            if (node) {
                state.dragNodeOffsets[id] = {
                    x: (e.clientX / state.zoom) - node.x,
                    y: (e.clientY / state.zoom) - node.y
                };
            }
        });
    }

    function handleCanvasMouseDown(e) {
        // If clicking on background (not a node or port)
        if (!e.target.closest('.wf-node') && !e.target.closest('.wf-agent-popup') && !e.target.closest('.wf-edge-add-group')) {
            // Deselect when clicking on canvas background
            selectNode(null);

            // Start panning
            state.isPanning = true;
            state.panStart = { x: e.clientX, y: e.clientY };
            if (elements.canvasArea) elements.canvasArea.style.cursor = 'grabbing';
        }
    }

    function handleCanvasMouseMove(e) {
        // Handle multi-node dragging
        if (state.isDragging && state.selectedNodeIds.length > 0) {
            state.selectedNodeIds.forEach(id => {
                const node = state.nodes.find(n => n.id === id);
                const offset = state.dragNodeOffsets[id];
                if (!node || !offset) return;

                node.x = (e.clientX / state.zoom) - offset.x;
                node.y = (e.clientY / state.zoom) - offset.y;

                const el = document.getElementById(id);
                if (el) {
                    el.style.left = `${node.x}px`;
                    el.style.top = `${node.y}px`;
                }
            });

            renderAllEdges();
            return;
        }

        // Handle canvas panning
        if (state.isPanning) {
            const dx = e.clientX - state.panStart.x;
            const dy = e.clientY - state.panStart.y;

            state.panX += dx;
            state.panY += dy;
            state.panStart = { x: e.clientX, y: e.clientY };

            updateViewportTransform();
            return;
        }

        // Handle connection dragging
        if (state.isConnecting && state.connectionSource) {
            renderAllEdges(); // Update existing
            drawTemporaryEdge(state.connectionSource, e.clientX, e.clientY);
        }
    }

    function drawTemporaryEdge(source, mouseX, mouseY) {
        const sourceNode = state.nodes.find(n => n.id === source.nodeId);
        if (!sourceNode) return;

        const nodeEl = document.getElementById(source.nodeId);
        const port = nodeEl.querySelector(`.wf-port[data-port-type="${source.portType}"]`) || nodeEl.querySelector('.wf-port-output');
        if (!port) return;

        const pRect = port.getBoundingClientRect();
        const vRect = elements.canvasViewport.getBoundingClientRect();

        const x1 = (pRect.left + pRect.width / 2 - vRect.left) / state.zoom;
        const y1 = (pRect.top + pRect.height / 2 - vRect.top) / state.zoom;
        const x2 = (mouseX - vRect.left) / state.zoom;
        const y2 = (mouseY - vRect.top) / state.zoom;

        const midX = (x1 + x2) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
        path.setAttribute('class', 'wf-connection-line temporary');
        elements.connectionsSvg.appendChild(path);
    }

    function handleCanvasMouseUp(e) {
        if (state.isConnecting) {
            // Check if dropped on a node's input port
            const targetPort = e.target.closest('.wf-port-input');
            if (targetPort) {
                const targetNodeId = targetPort.closest('.wf-node').id;
                if (targetNodeId !== state.connectionSource.nodeId) {
                    let label = '';
                    const pt = state.connectionSource.portType;
                    if (pt === 'output-true') label = 'TRUE';
                    else if (pt === 'output-false') label = 'FALSE';
                    else if (pt === 'output-default') label = 'DEFAULT';

                    createEdge(state.connectionSource.nodeId, targetNodeId, label);
                }
            }
        }

        state.isDragging = false;
        state.dragNodeId = null;
        state.dragNodeOffsets = null;
        state.isConnecting = false;
        state.connectionSource = null;
        state.isPanning = false;
        if (elements.canvasArea) elements.canvasArea.style.cursor = 'default';
        renderAllEdges();
    }

    function handleCanvasWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05; // Reduced sensitivity from 0.1 to 0.05
        const newZoom = Math.max(0.3, Math.min(3, state.zoom + delta));
        state.zoom = newZoom;

        updateViewportTransform();
    }

    function updateViewportTransform() {
        if (elements.canvasViewport) {
            elements.canvasViewport.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
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
        renderAllNodes();
        renderAllEdges();
        selectNode(node.id);
    }

    function handleKeyDown(e) {
        if (!state.isOpen) return;

        // Don't trigger if typing in input/textarea
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
            // But allow Escape to blur
            if (e.key === 'Escape') document.activeElement.blur();
            return;
        }

        // Delete key
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (state.selectedNodeId) {
                deleteSelectedNode();
            }
        }

        // Escape key
        if (e.key === 'Escape') {
            close();
        }

        // Ctrl/Cmd + C (Copy)
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            if (state.selectedNodeId) {
                e.preventDefault();
                copySelectedNode();
            }
        }

        // Ctrl/Cmd + V (Paste)
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            pasteNode();
        }
    }

    function copySelectedNode() {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (!node || node.type === 'start' || node.type === 'end') return;

        state.clipboard = {
            type: node.type,
            data: JSON.parse(JSON.stringify(node.data))
        };
        console.log('[WorkflowCanvas] Node copied to clipboard');
    }

    function pasteNode() {
        if (!state.clipboard) return;

        // Add small offset to paste position
        const offsetX = 50;
        const offsetY = 50;

        // Find a good place to paste (e.g., near center or cursor)
        const x = (state.clipboard.lastX || 400) + offsetX;
        const y = (state.clipboard.lastY || 300) + offsetY;

        state.clipboard.lastX = x;
        state.clipboard.lastY = y;

        const newNode = createNode(state.clipboard.type, x, y, state.clipboard.data);
        renderNode(newNode);
        selectNode(newNode.id);
        renderAllEdges();
        console.log('[WorkflowCanvas] Node pasted');
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
    // Auto-Layout (Tidy Up)
    // ============================================
    function tidyUp() {
        if (state.nodes.length === 0) return;

        const SPACING_X = 280;
        const SPACING_Y = 180;
        const OFFSET_X = 100;
        const OFFSET_Y = 200;

        // 1. Build adjacency list and find root(s)
        const adj = {};
        const inDegree = {};
        state.nodes.forEach(n => {
            adj[n.id] = [];
            inDegree[n.id] = 0;
        });

        state.edges.forEach(e => {
            if (adj[e.source]) adj[e.source].push(e.target);
            if (inDegree[e.target] !== undefined) inDegree[e.target]++;
        });

        // 2. BFS to determine levels
        const levels = {}; // nodeId -> level
        const queue = [];

        // Find Start node or nodes with in-degree 0
        const startNodes = state.nodes.filter(n => n.type === 'start');
        if (startNodes.length > 0) {
            startNodes.forEach(n => {
                levels[n.id] = 0;
                queue.push(n.id);
            });
        } else {
            state.nodes.forEach(n => {
                if (inDegree[n.id] === 0) {
                    levels[n.id] = 0;
                    queue.push(n.id);
                }
            });
        }

        // Fallback for isolated nodes
        if (queue.length === 0 && state.nodes.length > 0) {
            levels[state.nodes[0].id] = 0;
            queue.push(state.nodes[0].id);
        }

        while (queue.length > 0) {
            const uId = queue.shift();
            const currentLevel = levels[uId];

            (adj[uId] || []).forEach(vId => {
                if (levels[vId] === undefined || levels[vId] < currentLevel + 1) {
                    levels[vId] = currentLevel + 1;
                    queue.push(vId);
                }
            });
        }

        // Handle nodes not reached (isolated)
        state.nodes.forEach(n => {
            if (levels[n.id] === undefined) levels[n.id] = 0;
        });

        // 3. Group nodes by level
        const nodesByLevel = {};
        state.nodes.forEach(n => {
            const level = levels[n.id];
            if (!nodesByLevel[level]) nodesByLevel[level] = [];
            nodesByLevel[level].push(n);
        });

        // 4. Update coordinates
        Object.keys(nodesByLevel).forEach(levelStr => {
            const level = parseInt(levelStr);
            const nodes = nodesByLevel[level];
            const totalWidth = nodes.length * SPACING_Y;

            nodes.forEach((node, idx) => {
                node.x = OFFSET_X + (level * SPACING_X);
                node.y = OFFSET_Y + (idx * SPACING_Y) - (totalWidth / 2) + SPACING_Y / 2;
            });
        });

        // 5. Re-render
        renderAllNodes();
        renderAllEdges();
        console.log('[WorkflowCanvas] Workflow tidied up!');
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
    const context = {input, outputs: { } };

        `;

        // Simple dependency-based generator (DAG order)
        const processedNodes = new Set();
        const pendingNodes = workflow.nodes.filter(n => n.type !== 'start');

        // Start node processing
        const startNode = workflow.nodes.find(n => n.type === 'start');
        if (startNode) {
            code += `    // START\n    console.log('Workflow started:', input);\n\n`;
            processedNodes.add(startNode.id);
        }

        let addedAny = true;
        while (addedAny && processedNodes.size < workflow.nodes.length) {
            addedAny = false;

            for (const node of pendingNodes) {
                if (processedNodes.has(node.id)) continue;

                // Check dependencies
                const incomingEdges = workflow.edges.filter(e => e.target === node.id);
                const allDepsMet = incomingEdges.every(e => processedNodes.has(e.source));

                if (allDepsMet) {
                    if (node.type === 'agent') {
                        code += `    // Agent: ${node.data.name}\n`;

                        // Parse input mapping
                        let mappedInput = 'context.input'; // Default
                        if (node.data.inputMapping) {
                            mappedInput = parseInputMappingToJS(node.data.inputMapping, 'context.outputs');
                        }

                        code += `    context.outputs['${node.id}'] = await executeAgent('${node.data.agentId}', {\n`;
                        code += `        model: '${node.data.model}',\n`;
                        code += `        temperature: ${node.data.temperature},\n`;
                        code += `        input: ${mappedInput}\n`;
                        code += `    });\n\n`;
                    } else if (node.type === 'condition') {
                        const expression = parseInputMappingToJS(node.data.expression || 'true', 'context.outputs');
                        code += `    // Condition: ${node.data.name || 'Branch'}\n`;
                        code += `    if (${expression}) {\n`;
                        code += `        console.log('Condition met: ${node.id}');\n`;
                        code += `    } else {\n`;
                        code += `        console.log('Condition not met: ${node.id}');\n`;
                        code += `    }\n\n`;
                    }

                    processedNodes.add(node.id);
                    addedAny = true;
                }
            }
        }

        code += `    // END\n    return context.outputs;\n}\n`;
        return code;
    }

    function parseInputMappingToJS(mapping, outputsVarName) {
        // Simple regex to replace {{nodeId.output.var}} with context.outputs['nodeId'].var
        // Supports: {{nodeId.output.field}}, {{prev.output.field}}, {{input.field}}

        let js = mapping;

        // Handle JSON or plain string
        try {
            // Check if it's a JSON string
            if (mapping.trim().startsWith('{')) {
                // Keep the JSON structure but replace the placeholders
                js = mapping.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
                    const parts = path.trim().split('.');
                    if (parts[0] === 'input') return `\${input.${parts.slice(1).join('.')}}`;
                    return `\${${outputsVarName}['${parts[0]}'].${parts.slice(2).join('.')}}`;
                });
                return `JSON.parse(\`${js}\`)`;
            }
        } catch (e) { /* fallback to plain string or expression */ }

        // Plain expression replacement
        return mapping.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const parts = path.trim().split('.');
            if (parts[0] === 'input') return `context.input.${parts.slice(1).join('.')}`;
            // parts[0]: nodeId, parts[1]: 'output', parts[2...]: field
            return `${outputsVarName}['${parts[0]}'].${parts.slice(2).join('.')}`;
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Name modal state
    let nameModalResolve = null;

    function showNameModal() {
        return new Promise((resolve) => {
            nameModalResolve = resolve;
            const modal = document.getElementById('wf-name-modal');
            const input = document.getElementById('wf-name-input');
            if (modal && input) {
                input.value = state.name || 'My Workflow';
                modal.style.display = 'flex';
                setTimeout(() => input.focus(), 100);
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') confirmNameModal();
                    if (e.key === 'Escape') cancelNameModal();
                };
            } else {
                // Fallback to prompt if modal not found
                const name = prompt('워크플로우 이름을 입력하세요:', 'My Workflow');
                resolve(name);
            }
        });
    }

    function confirmNameModal() {
        const modal = document.getElementById('wf-name-modal');
        const input = document.getElementById('wf-name-input');
        if (modal) modal.style.display = 'none';
        if (nameModalResolve) {
            nameModalResolve(input?.value || null);
            nameModalResolve = null;
        }
    }

    function cancelNameModal() {
        const modal = document.getElementById('wf-name-modal');
        if (modal) modal.style.display = 'none';
        if (nameModalResolve) {
            nameModalResolve(null);
            nameModalResolve = null;
        }
    }

    // ============================================
    // Save Operations
    // ============================================
    async function saveAsDraft() {
        console.log('[WorkflowCanvas] saveAsDraft called');

        if (!state.nodes.length) {
            alert('저장할 워크플로우가 없습니다.');
            return;
        }

        // Always prompt for name if it's a new workflow (no workflowId)
        let workflowName = state.name;
        console.log('[WorkflowCanvas] Current name:', workflowName, 'workflowId:', state.workflowId);

        if (!workflowName || !state.workflowId) {
            console.log('[WorkflowCanvas] Showing name modal...');
            try {
                workflowName = await showNameModal();
                console.log('[WorkflowCanvas] Modal returned:', workflowName);
            } catch (e) {
                console.error('[WorkflowCanvas] Modal error:', e);
            }
            if (!workflowName) {
                console.log('[WorkflowCanvas] No name provided, cancelling save');
                return;
            }
            state.name = workflowName;
        }

        // Calculate agent count from nodes
        const agentCount = state.nodes.filter(n => n.type === 'agent').length;

        // Calculate average temperature
        const agentNodes = state.nodes.filter(n => n.type === 'agent');
        const avgTemp = agentNodes.length > 0
            ? agentNodes.reduce((sum, n) => sum + (n.data.temperature || 0.7), 0) / agentNodes.length
            : 0.7;

        const workflowData = stripUndefined({
            name: workflowName,
            pipelineContext: state.pipelineContext,
            projectId: state.projectId || null,
            status: 'draft',
            nodes: state.nodes.map(n => ({
                id: n.id,
                type: n.type,
                position: { x: n.x, y: n.y },
                data: stripUndefined(n.data)
            })),
            edges: state.edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label || ''
            })),
            // Use START node's trigger as main workflow trigger
            trigger: state.nodes.find(n => n.type === 'start')?.data.triggerConfig || { type: 'manual' },
            temperature: parseFloat(avgTemp.toFixed(2)),
            agentCount: agentCount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        try {
            const db = firebase.firestore();

            console.log('[WorkflowCanvas] Saving workflow with context:', state.pipelineContext);
            console.log('[WorkflowCanvas] Workflow data:', workflowData);

            if (state.workflowId) {
                // Update existing
                await db.collection('workflowDefinitions').doc(state.workflowId).update(workflowData);
                console.log('[WorkflowCanvas] Updated workflow:', state.workflowId);
                notify('워크플로우가 업데이트되었습니다.', 'success');
            } else {
                // Create new
                workflowData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                workflowData.contentCount = 0; // Initialize counter
                const docRef = await db.collection('workflowDefinitions').add(workflowData);
                state.workflowId = docRef.id;
                console.log('[WorkflowCanvas] Created new workflow:', docRef.id, 'with context:', state.pipelineContext);
                notify('워크플로우가 저장되었습니다.', 'success');
            }

            // Dispatch event to refresh the list in admin-pipeline
            console.log('[WorkflowCanvas] Dispatching workflowSaved event for context:', state.pipelineContext);
            window.dispatchEvent(new CustomEvent('workflowSaved', {
                detail: { context: state.pipelineContext }
            }));

            // Also try direct function call as fallback
            console.log('[WorkflowCanvas] Checking for refreshPipelineWorkflows:', typeof window.refreshPipelineWorkflows);
            if (typeof window.refreshPipelineWorkflows === 'function') {
                console.log('[WorkflowCanvas] Calling refreshPipelineWorkflows directly');
                window.refreshPipelineWorkflows(state.pipelineContext);
            } else {
                // Try with delay in case script hasn't loaded yet
                console.log('[WorkflowCanvas] refreshPipelineWorkflows not found, trying with delay...');
                setTimeout(() => {
                    if (typeof window.refreshPipelineWorkflows === 'function') {
                        console.log('[WorkflowCanvas] Delayed call to refreshPipelineWorkflows');
                        window.refreshPipelineWorkflows(state.pipelineContext);
                    } else {
                        console.warn('[WorkflowCanvas] refreshPipelineWorkflows still not available');
                    }
                }, 500);
            }

        } catch (err) {
            console.error('Failed to save workflow:', err);
            alert('저장 중 오류가 발생했습니다: ' + err.message);
        }
    }

    async function saveAndRun() {
        // Save first
        await saveAsDraft();

        // Validate workflow has nodes
        if (state.nodes.length < 2) {
            notify('워크플로우에 최소 2개 이상의 노드가 필요합니다.', 'error');
            return;
        }

        // Find start node
        const startNode = state.nodes.find(n => n.type === 'start');
        if (!startNode) {
            notify('Start 노드가 필요합니다.', 'error');
            return;
        }

        notify('🚀 워크플로우 실행 시작...', 'info');
        console.log('[WorkflowCanvas] Starting workflow execution...');

        // Reset all node states
        state.nodes.forEach(node => {
            node.data.outputData = null;
            node.data.executionStatus = null;
            renderNodeStatus(node.id, null);
        });

        // Build execution order using topological sort (BFS from start)
        const executionOrder = buildExecutionOrder(startNode.id);
        console.log('[WorkflowCanvas] Execution order:', executionOrder.map(n => n.id));

        // Track overall execution
        const executionResults = [];
        let hasError = false;

        // Execute nodes in order
        for (const node of executionOrder) {
            if (hasError && node.type !== 'end') {
                // Skip remaining nodes on error (except end node for cleanup)
                continue;
            }

            // Show running state
            renderNodeStatus(node.id, 'running');

            try {
                console.log(`[WorkflowCanvas] Executing node: ${node.id} (${node.type})`);
                const startTime = Date.now();

                // Get previous outputs for context
                const previousOutputs = getPreviousNodeOutputs(node.id);

                // Execute based on node type
                let result;
                switch (node.type) {
                    case 'start':
                        result = await testStartNode(node);
                        break;
                    case 'agent':
                        result = await executeAgentNodeWithContext(node, previousOutputs);
                        break;
                    case 'input':
                        result = await testInputNode(node);
                        break;
                    case 'knowledge_hub':
                        // Map to testInputNode but force the source
                        result = await testInputNode({ ...node, data: { ...node.data, inputSource: 'knowledge_hub' } });
                        break;
                    case 'project_brief':
                        result = await testInputNode({ ...node, data: { ...node.data, inputSource: 'project_brief' } });
                        break;
                    case 'brand_brain':
                        result = await testInputNode({ ...node, data: { ...node.data, inputSource: 'brand_brain' } });
                        break;
                    case 'firestore':
                        result = await testFirestoreNode(node);
                        break;
                    case 'transform':
                        result = await executeTransformWithPreviousData(node, previousOutputs);
                        break;
                    case 'condition':
                        result = await evaluateConditionWithContext(node, previousOutputs);
                        break;
                    case 'parallel':
                        result = await executeParallelBranches(node);
                        break;
                    case 'end':
                        result = { success: true, output: { message: 'Workflow completed', results: [...executionResults] } };
                        break;
                    default:
                        result = { success: false, error: `Unknown node type: ${node.type}` };
                }

                const duration = Date.now() - startTime;

                // Update node with result
                node.data.outputData = result.output || { error: result.error };
                node.data.executionStatus = result.success ? 'success' : 'error';
                node.data.executedAt = new Date().toISOString();
                node.data.executionDuration = duration;

                // Update UI
                renderNodeStatus(node.id, result.success ? 'success' : 'error');

                executionResults.push({
                    nodeId: node.id,
                    type: node.type,
                    success: result.success,
                    duration,
                    output: result.output
                });

                if (!result.success) {
                    hasError = true;
                    notify(`❌ 노드 실행 실패: ${node.data.name || node.id}`, 'error');
                }

            } catch (error) {
                console.error(`[WorkflowCanvas] Node execution failed: ${node.id}`, error);

                node.data.outputData = { error: error.message };
                node.data.executionStatus = 'error';
                node.data.executedAt = new Date().toISOString();

                renderNodeStatus(node.id, 'error');
                hasError = true;

                executionResults.push({
                    nodeId: node.id,
                    type: node.type,
                    success: false,
                    error: error.message
                });

                notify(`❌ 오류: ${error.message}`, 'error');
            }

            // Small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Final summary
        const successCount = executionResults.filter(r => r.success).length;
        const totalCount = executionResults.length;

        if (hasError) {
            notify(`⚠️ 워크플로우 부분 완료: ${successCount}/${totalCount} 노드 성공`, 'error');
        } else {
            notify(`✅ 워크플로우 실행 완료! ${successCount}개 노드 모두 성공`, 'success');
        }

        console.log('[WorkflowCanvas] Execution finished. Results:', executionResults);

        // Show first node with data (for inspection)
        const firstNodeWithOutput = state.nodes.find(n => n.data.outputData);
        if (firstNodeWithOutput) {
            state.selectedNodeId = firstNodeWithOutput.id;
            showPropertiesForm(firstNodeWithOutput.id);
        }
    }

    /**
     * Build execution order using BFS from start node
     */
    function buildExecutionOrder(startNodeId) {
        const visited = new Set();
        const order = [];
        const queue = [startNodeId];

        while (queue.length > 0) {
            const nodeId = queue.shift();

            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            const node = state.nodes.find(n => n.id === nodeId);
            if (!node) continue;

            order.push(node);

            // Find outgoing edges
            const outgoingEdges = state.edges.filter(e => e.source === nodeId);
            outgoingEdges.forEach(edge => {
                if (!visited.has(edge.target)) {
                    queue.push(edge.target);
                }
            });
        }

        return order;
    }

    /**
     * Execute Agent Node with context from previous nodes
     */
    async function executeAgentNodeWithContext(node, previousOutputs) {
        const agentId = node.data.agentId;
        if (!agentId) {
            return { success: false, error: 'Agent not selected' };
        }

        const projectId = state.pipelineContext || 'test-project';
        const runId = `run_${Date.now()}`;

        // Build rich context from previous outputs
        const contextSummary = previousOutputs.map(o =>
            `[${o.role}]: ${typeof o.content === 'string' ? o.content.substring(0, 500) : JSON.stringify(o.content).substring(0, 500)}`
        ).join('\n');

        const taskPrompt = node.data.taskPrompt ||
            `You are ${node.data.name || agentId}. Based on the following context, execute your task:\n\n${contextSummary || 'No previous context available.'}`;

        console.log(`[executeAgentNodeWithContext] Agent: ${agentId}, Context nodes: ${previousOutputs.length}`);

        const executeSubAgent = firebase.functions().httpsCallable('executeSubAgent', { timeout: 540000 });

        // Combine base system prompt with additional instructions if provided
        let combinedSystemPrompt = node.data.systemPrompt || `You are ${node.data.name || agentId}, an AI assistant.`;
        if (node.data.instruction && node.data.instruction.trim() !== '') {
            combinedSystemPrompt += `\n\n[ADDITIONAL INSTRUCTIONS]\n${node.data.instruction}`;
        }

        const response = await executeSubAgent({
            projectId: projectId || 'test-project',
            teamId: 'workflow-test',
            runId: runId,
            subAgentId: agentId,
            runtimeProfileId: 'default', // Explicitly set to 'default' to avoid Firestore undefined error
            systemPrompt: combinedSystemPrompt,
            taskPrompt: taskPrompt,
            previousOutputs: previousOutputs || [],
            provider: getProviderFromModel(node.data.model) || 'openai',
            model: node.data.model || 'gpt-4o',
            temperature: parseFloat(node.data.temperature) || 0.7
        });

        if (response.data && response.data.success) {
            return {
                success: true,
                output: {
                    response: response.data.output,
                    model: response.data.model,
                    usage: response.data.usage,
                    metadata: response.data.metadata
                }
            };
        } else {
            return { success: false, error: response.data?.error || 'Cloud Function error' };
        }
    }

    /**
     * Execute Transform Node with actual previous data
     */
    async function executeTransformWithPreviousData(node, previousOutputs) {
        const transformType = node.data.transformType || 'filter';

        // Get input data from ALL previous nodes (for parallel merge)
        let inputData = [];
        if (previousOutputs.length > 0) {
            previousOutputs.forEach(output => {
                try {
                    let content = typeof output.content === 'string'
                        ? JSON.parse(output.content)
                        : output.content;

                    // Unify format
                    if (content.result && Array.isArray(content.result)) {
                        inputData = inputData.concat(content.result);
                    } else if (Array.isArray(content)) {
                        inputData = inputData.concat(content);
                    } else {
                        // Single object
                        inputData.push(content);
                    }
                } catch (e) {
                    inputData.push({ raw: output.content, source: output.role });
                }
            });
        }

        let output;
        try {
            switch (transformType) {
                case 'filter':
                    const filterExpr = node.data.filterExpr || 'true';
                    output = inputData.filter(item => {
                        try { return eval(filterExpr); } catch { return true; }
                    });
                    break;
                case 'map':
                    output = inputData.map((item, i) => ({ ...item, _index: i }));
                    break;
                case 'reduce':
                    output = { count: inputData.length, items: inputData };
                    break;
                case 'sort':
                    const sortKey = node.data.sortKey || 'id';
                    output = [...inputData].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
                    break;
                case 'slice':
                    output = inputData.slice(0, node.data.sliceN || 10);
                    break;
                case 'aggregate':
                    // Merge From logic: inputData already combines all previous node results
                    output = inputData;
                    break;
                default:
                    output = inputData;
            }
        } catch (e) {
            output = inputData;
        }

        return {
            success: true,
            output: {
                transformType,
                inputCount: inputData.length,
                outputCount: Array.isArray(output) ? output.length : 1,
                result: output
            }
        };
    }

    /**
     * Evaluate Condition with context
     */
    async function evaluateConditionWithContext(node, previousOutputs) {
        const expression = node.data.expression || 'true';

        // Build context for evaluation
        let context = {};
        if (previousOutputs.length > 0) {
            try {
                const lastOutput = previousOutputs[previousOutputs.length - 1];
                context = typeof lastOutput.content === 'string'
                    ? JSON.parse(lastOutput.content)
                    : lastOutput.content;
            } catch (e) {
                context = { raw: previousOutputs[0]?.content };
            }
        }

        // Simple evaluation
        let result = true;
        try {
            // Replace common patterns
            let evalExpr = expression
                .replace(/output\./g, 'context.')
                .replace(/result\./g, 'context.result.')
                .replace(/success/g, 'context.success');

            result = eval(evalExpr);
        } catch (e) {
            result = expression.includes('true') || expression.includes('success');
        }

        return {
            success: true,
            output: {
                expression,
                context: JSON.stringify(context).substring(0, 200),
                evaluatedTo: result,
                branch: result ? 'TRUE' : 'FALSE'
            }
        };
    }

    /**
     * Execute Parallel branches (simplified - executes sequentially for now)
     */
    async function executeParallelBranches(node) {
        // Find all outgoing edges from this parallel node
        const outgoingEdges = state.edges.filter(e => e.source === node.id);

        return {
            success: true,
            output: {
                message: 'Parallel execution point',
                branches: outgoingEdges.length,
                branchTargets: outgoingEdges.map(e => e.target)
            }
        };
    }

    function copyJSON() {
        const jsonStr = JSON.stringify({
            nodes: state.nodes,
            edges: state.edges
        }, null, 2);
        navigator.clipboard.writeText(jsonStr).then(() => {
            notify('JSON이 클립보드에 복사되었습니다.', 'info');
        });
    }

    function copyJS() {
        const jsCode = elements.jsOutput.textContent;
        navigator.clipboard.writeText(jsCode).then(() => {
            notify('JavaScript 코드가 클립보드에 복사되었습니다.', 'info');
        });
    }

    /**
     * Replaces alert with a standard notification UI
     */
    function notify(message, type = 'info') {
        const existing = document.querySelector('.wf-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `wf-notification wf-notification-${type}`;

        const icon = type === 'success' ? SVG_ICONS.check : (type === 'error' ? SVG_ICONS.stop : SVG_ICONS.agent);

        toast.innerHTML = `
            <div class="wf-notification-icon">${icon}</div>
            <div class="wf-notification-text">${message}</div>
        `;

        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================
    // Trigger Settings
    // ============================================
    function updateTriggerType(type) {
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        if (node) {
            if (!node.data.triggerConfig) node.data.triggerConfig = {};
            node.data.triggerConfig.type = type;
        } else {
            state.triggerConfig.type = type;
        }

        // Update description hint
        const descHint = document.getElementById('wf-trigger-desc');
        if (descHint) {
            switch (type) {
                case 'automatic': descHint.textContent = '이전 노드가 성공적으로 완료되면 즉시 실행됩니다.'; break;
                case 'manual': descHint.textContent = '이전 노드가 완료되어도 외부 실행 신호가 올 때까지 대기합니다.'; break;
                case 'schedule': descHint.textContent = '정해진 시간에 따라 실행됩니다.'; break;
                case 'firestore': descHint.textContent = '데이터베이스의 특정 경로에 변화가 생기면 실행됩니다.'; break;
                case 'webhook': descHint.textContent = '외부 API 호출을 통해 실행됩니다.'; break;
            }
        }

        // Hide all options
        const scheduleOpts = document.getElementById('wf-trigger-schedule-options');
        const firestoreOpts = document.getElementById('wf-trigger-firestore-options');
        const webhookOpts = document.getElementById('wf-trigger-webhook-options');

        if (scheduleOpts) scheduleOpts.style.display = 'none';
        if (firestoreOpts) firestoreOpts.style.display = 'none';
        if (webhookOpts) webhookOpts.style.display = 'none';

        // Show selected options
        switch (type) {
            case 'schedule':
                if (scheduleOpts) scheduleOpts.style.display = 'block';
                break;
            case 'firestore':
                if (firestoreOpts) firestoreOpts.style.display = 'block';
                break;
            case 'webhook':
                if (webhookOpts) webhookOpts.style.display = 'block';
                break;
        }
    }

    function generateWebhookUrl() {
        const workflowId = state.workflowId || `wf_${Date.now()}`;
        const baseUrl = 'https://us-central1-zinc-c790f.cloudfunctions.net/workflowWebhook';
        const webhookUrl = `${baseUrl}?workflowId=${workflowId}`;

        const urlInput = document.getElementById('wf-trigger-webhook-url');
        if (urlInput) {
            urlInput.value = webhookUrl;
        }

        // Copy to clipboard
        navigator.clipboard.writeText(webhookUrl).then(() => {
            alert('Webhook URL이 클립보드에 복사되었습니다!');
        });
    }

    function getTriggerConfig() {
        // Return config for selected node if exists
        const node = state.nodes.find(n => n.id === state.selectedNodeId);
        const sourceConfig = node ? node.data.triggerConfig : state.triggerConfig;

        const config = {
            type: sourceConfig?.type || 'automatic'
        };

        switch (config.type) {
            case 'schedule':
                config.cron = document.getElementById('wf-trigger-cron')?.value || '0 9 * * *';
                config.timezone = document.getElementById('wf-trigger-timezone')?.value || 'Asia/Seoul';
                break;
            case 'firestore':
                config.collection = document.getElementById('wf-trigger-collection')?.value || '';
                config.event = document.getElementById('wf-trigger-event')?.value || 'onUpdate';
                config.fieldCondition = document.getElementById('wf-trigger-field-condition')?.value || '';
                break;
            case 'webhook':
                config.webhookUrl = document.getElementById('wf-trigger-webhook-url')?.value || '';
                break;
        }

        // Save back to node if it's node-bound
        if (node) node.data.triggerConfig = config;

        return config;
    }

    function syncTriggerUI(specificConfig = null) {
        const config = specificConfig || state.triggerConfig;
        if (!config) return;

        // Update trigger type select
        const typeSelect = document.getElementById('wf-trigger-type');
        if (typeSelect) {
            typeSelect.value = config.type || 'automatic';
            updateTriggerType(config.type || 'automatic');
        }

        // Update specific fields
        const cronInput = document.getElementById('wf-trigger-cron');
        if (cronInput) cronInput.value = config.cron || '0 9 * * *';

        const tzInput = document.getElementById('wf-trigger-timezone');
        if (tzInput) tzInput.value = config.timezone || 'Asia/Seoul';

        const collInput = document.getElementById('wf-trigger-collection');
        if (collInput) collInput.value = config.collection || '';

        const eventSelect = document.getElementById('wf-trigger-event');
        if (eventSelect) eventSelect.value = config.event || 'onUpdate';

        const condInput = document.getElementById('wf-trigger-field-condition');
        if (condInput) condInput.value = config.fieldCondition || '';

        const urlInput = document.getElementById('wf-trigger-webhook-url');
        if (urlInput) urlInput.value = config.webhookUrl || '';
    }

    // ============================================
    // Return Public API
    // ============================================
    /**
     * Update project context for testing
     */
    function updateProjectContext(projectId) {
        state.projectId = projectId;
        console.log('[WorkflowCanvas] Project context updated:', projectId);

        const select = document.getElementById('wf-project-select');
        if (select) select.value = projectId || '';

        const indicator = document.getElementById('wf-context-indicator');
        const nameEl = document.getElementById('wf-context-name');

        if (projectId && projectId !== '') {
            indicator.classList.add('active');
            if (select && select.selectedOptions[0]) {
                nameEl.textContent = select.selectedOptions[0].textContent;
            } else {
                nameEl.textContent = projectId;
            }
        } else {
            indicator.classList.remove('active');
            nameEl.textContent = 'Global Context';
        }
    }

    /**
     * Load project list from Firestore
     */
    async function loadProjectList() {
        const select = document.getElementById('wf-project-select');
        const firestore = window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
        if (!select || !firestore) return;

        try {
            const snapshot = await firestore.collection('projects')
                .orderBy('updatedAt', 'desc')
                .limit(20)
                .get();

            select.innerHTML = '<option value="">Select Test Project...</option>';
            snapshot.forEach(doc => {
                const p = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = p.projectName || p.name || doc.id;
                select.appendChild(option);
            });

            // Set initial value if state already has projectId
            if (state.projectId) {
                select.value = state.projectId;
                updateProjectContext(state.projectId);
            }
        } catch (e) {
            console.error('Failed to load projects:', e);
        }
    }

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
        tidyUp,
        deleteSelectedNode,
        highlightNode,
        unhighlightNodes,
        saveAsDraft,
        saveAndRun,
        copyJSON,
        copyJS,
        addAgentToCanvas,

        // Trigger functions
        updateTriggerType,
        generateWebhookUrl,
        getTriggerConfig,

        // MCP & Output Handlers
        toggleMCP,
        updateMCPServer,
        setMCPMode,
        toggleMCPTool,
        updateOutputUI,

        // Data Node Handlers
        updateInputSourceUI,
        updateFirestoreOpUI,
        updateTransformUI,
        refineWithPrompt,
        updateNodeProperty,

        // Condition Builder Handlers
        addConditionRule,
        removeConditionRule,
        updateConditionRule,

        // Capability Handler
        switchCapability,

        // Output Data Viewer
        expandOutputData,

        // Node Testing
        testNode,

        // Name Modal Handlers
        confirmNameModal,
        cancelNameModal,

        // Expose state for debugging
        getState: () => state,

        // Utils
        stripUndefined
    };
    function getMockProjectBrief() {
        return {
            source: 'Project Brief',
            message: 'Project ID not found in this context - using mock data',
            name: 'Vision Chain Project',
            description: 'AI-driven supply chain optimization platform',
            targetAudience: 'Global logistics companies',
            goals: 'Reduce operational costs by 25%'
        };
    }

    function getMockBrandBrain() {
        return {
            source: 'Brand Brain',
            message: 'Project ID not found in this context - using mock data',
            persona: 'Tech Innovator',
            tone: 'Modern, Professional, Visionary',
            values: ['Efficiency', 'Intelligence', 'Scalability'],
            description: 'A cutting-edge solution for modern business challenges.'
        };
    }

    function stripUndefined(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const copy = Array.isArray(obj) ? [] : {};
        Object.keys(obj).forEach(key => {
            const val = obj[key];
            if (val !== undefined && val !== null) {
                if (typeof val === 'object' && !(val instanceof Date)) {
                    copy[key] = stripUndefined(val);
                } else {
                    copy[key] = val;
                }
            } else if (val === null) {
                copy[key] = null;
            }
        });
        return copy;
    }
    function safeJsonStringify(obj, space = 0) {
        try {
            const cache = new Set();
            return JSON.stringify(obj, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (cache.has(value)) return '[Circular]';
                    cache.add(value);
                }
                return value;
            }, space);
        } catch (e) {
            return String(obj);
        }
    }
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.WorkflowCanvas) {
        window.WorkflowCanvas.init();
    }
});

// Global helpers for pipeline
window.editWorkflow = function (workflowId, context) {
    console.log('Editing workflow:', workflowId, 'in context:', context);
    if (window.WorkflowCanvas) {
        window.WorkflowCanvas.open(context, null, workflowId);
    } else {
        console.error('WorkflowCanvas not loaded');
        alert('워크플로우 캔버스를 로드하는 중 오류가 발생했습니다.');
    }
};

window.openWorkflowCanvas = function (context) {
    if (window.WorkflowCanvas) {
        window.WorkflowCanvas.open(context);
    } else {
        console.error('WorkflowCanvas not loaded');
        alert('워크플로우 캔버스를 로드하는 중 오류가 발생했습니다.');
    }
};
