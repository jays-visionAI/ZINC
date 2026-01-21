// admin-registry.js
// Agent Registry Dashboard (List View)
// Logic: Display Agent Classes, Manage Seed Data

(function () {
    console.log("[AgentRegistry] JS Loaded");
    let registry = [];
    let filteredRegistry = [];
    let unsubscribe = null;

    // Core Agents Data for Client-Side Seeding (with procedures)
    const coreAgentsSeed = [
        // Intelligence
        {
            id: "INT-MKT-SCOUT", name: "Market Scout", category: "Intelligence", status: "active", currentProductionVersion: "1.0.0",
            description: "Surveys external market data, trends, and competitor activities.",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "fetch_market_data", label: "Fetch Market Data", description: "Query external APIs for market trends", color: "#3b82f6" },
                { step: 2, action: "analyze_competitors", label: "Analyze Competitors", description: "Extract competitor positioning", color: "#10b981" },
                { step: 3, action: "generate_insights", label: "Generate Insights", description: "Synthesize findings into actionable insights", color: "#8b5cf6" }
            ]
        },
        {
            id: "INT-KB-RAG", name: "Knowledge Agent (RAG)", category: "Intelligence", status: "active", currentProductionVersion: "1.0.0",
            description: "Retrieves specific chunks from the internal Knowledge Hub with citations.",
            sourceFiles: ["services/agent-execution-service.js", "knowledgeHub.js"],
            procedures: [
                { step: 1, action: "parse_query", label: "Parse Query", description: "Understand the user's information need", color: "#3b82f6" },
                { step: 2, action: "vector_search", label: "Vector Search", description: "Search Knowledge Hub embeddings", color: "#f59e0b" },
                { step: 3, action: "rank_results", label: "Rank Results", description: "Score relevance of retrieved chunks", color: "#10b981" },
                { step: 4, action: "format_response", label: "Format with Citations", description: "Return answer with source citations", color: "#8b5cf6" }
            ]
        },

        // Design
        {
            id: "DSN-NRV-DSGN", name: "Narrative Designer", category: "Design", status: "active", currentProductionVersion: "1.0.0",
            description: "Structures the storyline and content flow using frameworks like PAS or SWOT.",
            sourceFiles: ["services/agent-execution-service.js", "studio.js"],
            procedures: [
                { step: 1, action: "extract_knowledge", label: "Extract Knowledge Hub Data", description: "Load relevant brand and project context", color: "#3b82f6" },
                { step: 2, action: "analyze_patterns", label: "Analyze Pattern & Trends", description: "Identify key themes and messaging angles", color: "#10b981" },
                { step: 3, action: "combine_brief", label: "Combine with Project Brief", description: "Merge insights with campaign objectives", color: "#8b5cf6" },
                { step: 4, action: "generate_narrative", label: "Generate Multi-Channel Narrative", description: "Output structured content for each platform", color: "#f43f5e" }
            ]
        },
        {
            id: "DSN-VIS-DIR", name: "Visual Director", category: "Design", status: "active", currentProductionVersion: "1.0.0",
            description: "Defines the aesthetic guidelines, color palettes, and typography suitable for the brand.",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "load_brand_identity", label: "Load Brand Identity", description: "Fetch brand colors, fonts, and guidelines", color: "#3b82f6" },
                { step: 2, action: "analyze_context", label: "Analyze Content Context", description: "Understand the content type and platform", color: "#10b981" },
                { step: 3, action: "generate_style", label: "Generate Style Guide", description: "Output visual specifications", color: "#8b5cf6" }
            ]
        },
        {
            id: "DSN-STR-ARCH", name: "Structure Architect", category: "Design", status: "active", currentProductionVersion: "1.0.0",
            description: "Designs content structure and information architecture for optimal user experience.",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "analyze_requirements", label: "Analyze Requirements", description: "Understand content goals and constraints", color: "#3b82f6" },
                { step: 2, action: "design_structure", label: "Design Structure", description: "Create information hierarchy", color: "#10b981" },
                { step: 3, action: "optimize_flow", label: "Optimize Flow", description: "Refine user journey through content", color: "#8b5cf6" }
            ]
        },

        // QA
        {
            id: "QA-VIS-QC", name: "Aesthetic Critic (Vision)", category: "QA", status: "active", currentProductionVersion: "1.0.0",
            description: "Uses Vision AI to critique screenshots for design flaws.",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "capture_screenshot", label: "Capture Screenshot", description: "Render content to image", color: "#3b82f6" },
                { step: 2, action: "vision_analysis", label: "Vision AI Analysis", description: "Analyze design using GPT-4V or Gemini Vision", color: "#f59e0b" },
                { step: 3, action: "score_aesthetics", label: "Score Aesthetics", description: "Rate contrast, alignment, whitespace", color: "#10b981" },
                { step: 4, action: "generate_feedback", label: "Generate Feedback", description: "Output specific improvement suggestions", color: "#f43f5e" }
            ]
        },
        {
            id: "QA-REV-HND", name: "Revision Handler", category: "QA", status: "active", currentProductionVersion: "1.0.0",
            description: "Processes feedback and manages content revisions.",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "parse_feedback", label: "Parse Feedback", description: "Extract actionable items from feedback", color: "#3b82f6" },
                { step: 2, action: "apply_revisions", label: "Apply Revisions", description: "Implement requested changes", color: "#10b981" },
                { step: 3, action: "validate_changes", label: "Validate Changes", description: "Ensure revisions meet requirements", color: "#8b5cf6" }
            ]
        },

        // Strategy
        {
            id: "STG-DECK-MSTR", name: "Pitch Deck Strategist", category: "Strategy", status: "active", currentProductionVersion: "1.0.0",
            description: "Master strategist for creating investor pitch decks.",
            sourceFiles: ["scripts/pitchDeckAgent.js", "services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "analyze_business", label: "Analyze Business Model", description: "Extract key business information", color: "#3b82f6" },
                { step: 2, action: "structure_narrative", label: "Structure Pitch Narrative", description: "Apply investor-friendly storytelling framework", color: "#10b981" },
                { step: 3, action: "generate_slides", label: "Generate Slide Content", description: "Create content for each slide type", color: "#8b5cf6" },
                { step: 4, action: "optimize_flow", label: "Optimize Flow", description: "Ensure logical progression and impact", color: "#f43f5e" }
            ]
        },
        {
            id: "STG-ONE-PAGER", name: "One Pager Strategist", category: "Strategy", status: "active", currentProductionVersion: "1.0.0",
            description: "Creates concise one-page summaries for various business purposes.",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "gather_info", label: "Gather Information", description: "Collect key data points", color: "#3b82f6" },
                { step: 2, action: "prioritize", label: "Prioritize Content", description: "Select most impactful information", color: "#10b981" },
                { step: 3, action: "design_layout", label: "Design Layout", description: "Optimize for single-page format", color: "#8b5cf6" }
            ]
        },

        // Studio
        {
            id: "STU-ORCHESTRATOR", name: "Studio Orchestrator", category: "Studio", status: "active", currentProductionVersion: "1.0.0",
            description: "Manages the content generation workflow, routing tasks to appropriate sub-agents.",
            sourceFiles: ["services/agent-execution-service.js", "studio.js"],
            procedures: [
                { step: 1, action: "parse_request", label: "Parse Generation Request", description: "Understand content type and requirements", color: "#3b82f6" },
                { step: 2, action: "load_context", label: "Load Brand & Knowledge Context", description: "Fetch all relevant project data", color: "#f59e0b" },
                { step: 3, action: "route_agents", label: "Route to Sub-Agents", description: "Dispatch to Creator, Designer, etc.", color: "#10b981" },
                { step: 4, action: "aggregate_results", label: "Aggregate Results", description: "Combine outputs from all agents", color: "#8b5cf6" },
                { step: 5, action: "quality_check", label: "Quality Check", description: "Validate output before delivery", color: "#f43f5e" }
            ]
        },
        {
            id: "STU-CREATOR-TEXT", name: "Text Creator", category: "Studio", status: "active", currentProductionVersion: "1.0.0",
            description: "Generates text content for various channels (SNS, Blog, Email, etc.).",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "receive_brief", label: "Receive Content Brief", description: "Get channel, tone, and requirements", color: "#3b82f6" },
                { step: 2, action: "apply_brand_voice", label: "Apply Brand Voice", description: "Inject brand personality and guidelines", color: "#10b981" },
                { step: 3, action: "generate_content", label: "Generate Content", description: "Create channel-optimized text", color: "#8b5cf6" },
                { step: 4, action: "format_output", label: "Format for Channel", description: "Apply platform-specific formatting", color: "#f43f5e" }
            ]
        },

        // Growth
        {
            id: "GRW-MANAGER", name: "Growth Manager", category: "Growth", status: "active", currentProductionVersion: "1.0.0",
            description: "Evaluates content performance and suggests optimization strategies.",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "collect_metrics", label: "Collect Performance Metrics", description: "Gather engagement and conversion data", color: "#3b82f6" },
                { step: 2, action: "analyze_patterns", label: "Analyze Patterns", description: "Identify what's working and what's not", color: "#10b981" },
                { step: 3, action: "generate_recommendations", label: "Generate Recommendations", description: "Suggest content and strategy improvements", color: "#8b5cf6" }
            ]
        },
        {
            id: "GRW-REASONER", name: "Strategy Reasoner", category: "Growth", status: "active", currentProductionVersion: "1.0.0",
            description: "Uses deep reasoning to develop long-term content strategies.",
            sourceFiles: ["services/agent-execution-service.js"],
            procedures: [
                { step: 1, action: "review_history", label: "Review Content History", description: "Analyze past performance data", color: "#3b82f6" },
                { step: 2, action: "identify_opportunities", label: "Identify Opportunities", description: "Find gaps and growth areas", color: "#10b981" },
                { step: 3, action: "develop_strategy", label: "Develop Strategy", description: "Create comprehensive content roadmap", color: "#8b5cf6" },
                { step: 4, action: "prioritize_actions", label: "Prioritize Actions", description: "Rank recommendations by impact", color: "#f43f5e" }
            ]
        }
    ];

    window.initRegistry = function (user) {
        console.log("Initializing Agent Registry Dashboard...");

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        loadRegistry();
        setupEventListeners();
    };

    function loadRegistry() {
        const tbody = document.getElementById("profiles-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7">Loading Registry...</td></tr>';

        unsubscribe = db.collection('agentRegistry').onSnapshot(snap => {
            registry = [];
            snap.forEach(doc => registry.push({ docId: doc.id, ...doc.data() }));

            registry.sort((a, b) => {
                if (a.category !== b.category) return a.category.localeCompare(b.category);
                return a.name.localeCompare(b.name);
            });

            filteredRegistry = [...registry];
            renderTable();
        });
    }

    function renderTable() {
        const tbody = document.getElementById("profiles-table-body");
        if (!tbody) return;

        if (filteredRegistry.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding: 40px;">
                        <div style="margin-bottom: 10px; color: #aaa;">No agents found in Registry</div>
                        <button onclick="seedRegistry()" style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                            🌱 Seed Core Agents
                        </button>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = filteredRegistry.map(agent => {
            return `
                <tr style="cursor:pointer;" onclick="window.location.hash = 'registry-detail/${agent.id}'">
                    <td>
                        <div style="color:#16e0bd; font-weight:600;">${agent.name}</div>
                        <div style="color:rgba(255,255,255,0.5); font-size:11px;">${agent.id}</div>
                    </td>
                    <td><span class="category-badge">${agent.category}</span></td>
                    <td>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="color:#fff; font-weight:500;">v${agent.currentProductionVersion || '0.0.0'}</span>
                            <span style="color:#a855f7; font-size:11px;">● Production Info</span>
                        </div>
                    </td>
                    <td>
                        <span class="admin-badge ${agent.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                            ${(agent.status || 'unknown').toUpperCase()}
                        </span>
                    </td>
                    <td>${agent.updatedAt ? new Date(agent.updatedAt.seconds * 1000).toLocaleDateString() : '-'}</td>
                    <td style="display: flex; gap: 8px;">
                        <button class="admin-btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="event.stopPropagation(); openQuickView('${agent.id}')">👁️ View</button>
                        <button class="admin-btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="event.stopPropagation(); window.location.hash = 'registry-detail/${agent.id}'">Manage</button>
                    </td>
                </tr>
             `;
        }).join('');
    }

    // --- Quick View Modal Logic ---
    let currentQuickViewAgent = null;
    let currentQuickViewVersion = null;

    window.openQuickView = async function (agentId) {
        console.log('[QuickView] Opening for agent:', agentId);

        const agent = registry.find(a => a.id === agentId || a.docId === agentId);
        if (!agent) {
            alert('Agent not found');
            return;
        }

        currentQuickViewAgent = agent;

        const modal = document.getElementById('agent-quick-view-modal');
        if (!modal) {
            console.error('[QuickView] Modal element not found!');
            alert('Quick View modal not available. Try refreshing the page.');
            return;
        }

        const nameEl = document.getElementById('qv-agent-name');
        const idEl = document.getElementById('qv-agent-id');
        if (nameEl) nameEl.textContent = agent.name;
        if (idEl) idEl.textContent = agentId;

        modal.style.display = 'flex';

        if (typeof switchQuickViewTab === 'function') {
            switchQuickViewTab('prompt');
        }

        const promptEl = document.getElementById('qv-prompt-content');
        const proceduresEl = document.getElementById('qv-procedures-container');
        if (promptEl) promptEl.textContent = 'Loading...';
        if (proceduresEl) proceduresEl.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5);">Loading...</div>';

        try {
            const versionsSnap = await db.collection('agentVersions')
                .where('agentId', '==', agentId)
                .where('isProduction', '==', true)
                .limit(1)
                .get();

            const versionEl = document.getElementById('qv-version');

            if (versionsSnap.empty) {
                if (versionEl) versionEl.textContent = 'N/A';
                if (promptEl) promptEl.textContent = 'No production version found. Click "Manage Versions" to create one.';
                if (proceduresEl) proceduresEl.innerHTML = '<div style="text-align: center; color: #f59e0b;">No procedures defined</div>';
                currentQuickViewVersion = null;
                return;
            }

            currentQuickViewVersion = { id: versionsSnap.docs[0].id, ...versionsSnap.docs[0].data() };

            if (versionEl) versionEl.textContent = currentQuickViewVersion.version || '1.0.0';
            if (promptEl) promptEl.textContent = currentQuickViewVersion.systemPrompt || '(No prompt defined)';

            if (typeof renderQuickViewProcedures === 'function') {
                renderQuickViewProcedures(currentQuickViewVersion.procedures || []);
            }

            if (typeof renderQuickViewSourceFiles === 'function') {
                renderQuickViewSourceFiles(agent.sourceFiles || []);
            }

        } catch (error) {
            console.error('Error loading agent data:', error);
            if (promptEl) promptEl.textContent = 'Error loading data: ' + error.message;
        }
    };

    window.closeQuickViewModal = function () {
        const modal = document.getElementById('agent-quick-view-modal');
        if (modal) modal.style.display = 'none';
        currentQuickViewAgent = null;
        currentQuickViewVersion = null;
    };

    window.switchQuickViewTab = function (tabName) {
        document.querySelectorAll('.qv-tab').forEach(tab => {
            tab.style.color = 'rgba(255,255,255,0.6)';
            tab.style.borderBottomColor = 'transparent';
            tab.style.fontWeight = '400';
        });
        const activeTab = document.getElementById(`qv-tab-${tabName}`);
        if (activeTab) {
            activeTab.style.color = '#fff';
            activeTab.style.borderBottomColor = '#4ecdc4';
            activeTab.style.fontWeight = '600';
        }

        document.querySelectorAll('.qv-content').forEach(content => {
            content.style.display = 'none';
        });
        const activeContent = document.getElementById(`qv-content-${tabName}`);
        if (activeContent) {
            activeContent.style.display = 'block';
        }
    };

    function renderQuickViewProcedures(procedures) {
        const container = document.getElementById('qv-procedures-container');
        if (!container) return;

        if (!procedures || procedures.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p style="color: rgba(255,255,255,0.6);">No procedures defined for this agent.</p>
                </div>
            `;
            return;
        }

        let html = `<div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 16px;">${procedures.length} steps in execution flow</div>`;

        procedures.forEach((step, i) => {
            const stepNum = step.step || step.id || (i + 1);
            const color = step.color || '#64748b';

            html += `
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
                    <div style="background: ${color}; color: #fff; min-width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">${stepNum}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">${step.label || 'Unnamed Step'}</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">${step.description || ''}</div>
                        <code style="background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px; font-size: 11px; color: #a78bfa;">${step.action || ''}</code>
                    </div>
                </div>
                ${i < procedures.length - 1 ? '<div style="width: 2px; height: 12px; background: rgba(255,255,255,0.1); margin-left: 13px;"></div>' : ''}
            `;
        });

        container.innerHTML = html;
    }

    function renderQuickViewSourceFiles(sourceFiles) {
        const container = document.getElementById('qv-source-files');
        const contentArea = document.getElementById('qv-source-content');
        if (!container) return;

        const files = sourceFiles && sourceFiles.length > 0 ? sourceFiles : [
            'services/agent-execution-service.js',
            'services/agent-runtime-service.js'
        ];

        container.innerHTML = files.map((file, i) => `
            <button class="qv-source-btn" 
                    style="padding: 6px 14px; border-radius: 6px; border: 1px solid #30363d; background: ${i === 0 ? '#4ecdc4' : '#21262d'}; color: ${i === 0 ? '#000' : '#c9d1d9'}; cursor: pointer; font-size: 12px;"
                    onclick="loadQuickViewSource('${file}', this)">
                ${file.split('/').pop()}
            </button>
        `).join('');

        if (files.length > 0) {
            loadQuickViewSource(files[0]);
        }
    }

    window.loadQuickViewSource = async function (filePath, btnElement) {
        const contentArea = document.getElementById('qv-source-content');
        if (!contentArea) return;

        document.querySelectorAll('.qv-source-btn').forEach(btn => {
            btn.style.background = '#21262d';
            btn.style.color = '#c9d1d9';
        });
        if (btnElement) {
            btnElement.style.background = '#4ecdc4';
            btnElement.style.color = '#000';
        }

        contentArea.textContent = 'Loading...';

        try {
            const response = await fetch('/' + filePath);
            if (!response.ok) throw new Error('File not found');

            const code = await response.text();
            const lines = code.split('\n');

            let html = '';
            lines.forEach((line, i) => {
                const lineNum = i + 1;
                const escapedLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += `<div style="display: flex;"><span style="display: inline-block; min-width: 45px; color: #484f58; text-align: right; padding-right: 16px; user-select: none; border-right: 1px solid #30363d; margin-right: 16px;">${lineNum}</span><span>${escapedLine || ' '}</span></div>`;
            });

            contentArea.innerHTML = html;

        } catch (error) {
            contentArea.textContent = 'Error loading file: ' + error.message;
        }
    };

    window.openAgentDetail = function () {
        if (currentQuickViewAgent) {
            window.location.hash = 'registry-detail/' + (currentQuickViewAgent.id || currentQuickViewAgent.docId);
            closeQuickViewModal();
        }
    };

    // --- Client-Side Seeding Logic ---
    window.seedRegistry = async function () {
        if (!confirm("Are you sure you want to seed the default ZYNK Core Agents? This will create new records if they don't exist.")) return;

        const btn = document.querySelector('button[onclick="seedRegistry()"]');
        if (btn) btn.textContent = "Seeding...";

        try {
            const batch = db.batch();
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            let count = 0;

            for (const agent of coreAgentsSeed) {
                const regRef = db.collection("agentRegistry").doc(agent.id);
                batch.set(regRef, {
                    id: agent.id,
                    name: agent.name,
                    category: agent.category,
                    description: agent.description,
                    status: agent.status,
                    currentProductionVersion: agent.currentProductionVersion,
                    sourceFiles: agent.sourceFiles || [],
                    createdAt: timestamp,
                    updatedAt: timestamp
                }, { merge: true });

                const initVerRef = db.collection("agentVersions").doc(`${agent.id}-v1-0-0`);
                batch.set(initVerRef, {
                    agentId: agent.id,
                    version: "1.0.0",
                    isProduction: true,
                    status: "production",
                    config: { model: "deepseek-reasoner", temperature: 0.7 },
                    procedures: agent.procedures || [],
                    systemPrompt: `You are ${agent.name}. ${agent.description}\n\n(Update this prompt via Admin UI for production use.)`,
                    changelog: "Initial seed via Admin UI with procedures",
                    createdAt: timestamp
                }, { merge: true });

                count++;
            }

            await batch.commit();
            alert(`✅ Successfully seeded ${count} agents!`);

        } catch (e) {
            console.error(e);
            alert("Seeding failed: " + e.message);
        }
    };

    function setupEventListeners() {
        const searchInput = document.getElementById("profile-search");
        const categorySelect = document.getElementById("registry-category-filter");

        function applyFilters() {
            const term = searchInput ? searchInput.value.toLowerCase() : "";
            const category = categorySelect ? categorySelect.value : "all";

            filteredRegistry = registry.filter(agent => {
                const matchesSearch = agent.name.toLowerCase().includes(term) ||
                    agent.id.toLowerCase().includes(term) ||
                    agent.category.toLowerCase().includes(term);

                const matchesCategory = category === "all" || agent.category === category;

                return matchesSearch && matchesCategory;
            });
            renderTable();
        }

        if (searchInput) {
            searchInput.placeholder = "Search agents...";
            searchInput.oninput = applyFilters;
        }

        if (categorySelect) {
            categorySelect.onchange = applyFilters;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // AI AGENT DESIGNER - Intelligent Agent Creation Tool
    // ═══════════════════════════════════════════════════════════════

    let designedAgent = null;

    window.openCreateAgentModal = function () {
        console.log('[AgentDesigner] Opening AI Agent Designer...');

        const existingModal = document.getElementById('ai-agent-designer-modal');
        if (existingModal) existingModal.remove();

        document.body.style.overflow = 'hidden';

        const modal = document.createElement('div');
        modal.id = 'ai-agent-designer-modal';
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999999; background: rgba(0,0,0,0.9); align-items: center; justify-content: center; overflow: hidden;';

        modal.innerHTML = `
            <div style="background: #0d1117; border-radius: 16px; max-width: 900px; width: 95%; max-height: 95vh; overflow: hidden; border: 1px solid rgba(78, 205, 196, 0.3); display: flex; flex-direction: column; box-shadow: 0 0 60px rgba(78, 205, 196, 0.2);">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0d1117 100%); padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(78, 205, 196, 0.2);">
                    <div>
                        <h3 style="margin: 0; color: #4ecdc4; font-size: 20px;">🤖 AI Agent Designer</h3>
                        <span style="font-size: 12px; color: rgba(255,255,255,0.5);">Describe what you need, AI will design the agent for you</span>
                    </div>
                    <button onclick="closeAgentDesigner()" style="background: none; border: none; color: rgba(255,255,255,0.6); font-size: 28px; cursor: pointer;">&times;</button>
                </div>

                <div style="padding: 24px; overflow-y: auto; flex: 1;">
                    <!-- Step 1: Describe -->
                    <div id="designer-step-describe">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #4ecdc4; font-weight: 600;">설계에 사용할 LLM 모델</label>
                            <select id="designer-llm-model" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; color: #fff; font-size: 14px; box-sizing: border-box; cursor: pointer;">
                                <option value="deepseek-v3.2-speciale" selected>⭐ DeepSeek V3.2 Speciale (최신 - 추천)</option>
                                <option value="deepseek-v3.2-exp">🚀 DeepSeek V3.2 Exp (최신 실험실 모델)</option>
                                <option value="deepseek-v3.2">DeepSeek V3.2 (빠른 설계)</option>
                                <option value="deepseek-chat">DeepSeek V3 (안정)</option>
                                <option value="deepseek-reasoner">DeepSeek R1 (깊은 사고 - 정교한 절차 설계)</option>
                                <option value="gpt-4o">GPT-4o (표준)</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #4ecdc4; font-weight: 600;">어떤 에이전트가 필요하신가요?</label>
                            <textarea id="agent-requirement" rows="4" placeholder="예: 인스타그램 캡션을 작성하는 에이전트가 필요해요. 브랜드 톤앤매너를 반영하고, 해시태그 추천과 이모지도 적절히 사용해야 해요." style="width: 100%; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; font-size: 14px; resize: none; box-sizing: border-box; line-height: 1.6;"></textarea>
                        </div>

                        <button onclick="designAgent()" id="design-btn" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #4ecdc4 0%, #44a3aa 100%); border: none; border-radius: 10px; color: #0d1117; font-weight: 700; font-size: 15px; cursor: pointer;">🧠 AI로 에이전트 설계하기</button>

                        <div id="overlap-detection" style="display: none; margin-top: 20px;">
                            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 16px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                    <span style="font-size: 18px;">⚠️</span>
                                    <span style="color: #fbbf24; font-weight: 600;">유사한 기존 에이전트 발견</span>
                                </div>
                                <div id="overlap-agents-list"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Step 2: Review -->
                    <div id="designer-step-review" style="display: none;">
                        <button onclick="backToDescribe()" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; cursor: pointer; font-size: 13px; margin-bottom: 16px;">← 다시 설명하기</button>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; margin-bottom: 6px; font-size: 12px; color: rgba(255,255,255,0.6);">Agent Name</label>
                                <input type="text" id="designed-name" oninput="updateDesignedId()" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 14px; box-sizing: border-box;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 6px; font-size: 12px; color: rgba(255,255,255,0.6);">Agent ID (자동 생성)</label>
                                <input type="text" id="designed-id" readonly style="width: 100%; padding: 12px; background: rgba(78, 205, 196, 0.1); border: 1px solid rgba(78, 205, 196, 0.3); border-radius: 8px; color: #4ecdc4; font-size: 14px; font-family: monospace; box-sizing: border-box;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; margin-bottom: 6px; font-size: 12px; color: rgba(255,255,255,0.6);">Category</label>
                                <select id="designed-category" onchange="updateDesignedId()" style="width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; box-sizing: border-box;">
                                    <option value="Intelligence">Intelligence</option>
                                    <option value="Design">Design</option>
                                    <option value="Strategy">Strategy</option>
                                    <option value="QA">QA</option>
                                    <option value="Studio">Studio</option>
                                    <option value="Growth">Growth</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 6px; font-size: 12px; color: rgba(255,255,255,0.6);">LLM Model</label>
                                <select id="designed-model" style="width: 100%; padding: 12px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; box-sizing: border-box;">
                                    <option value="deepseek-v3.2-speciale">⭐ DeepSeek V3.2 Speciale (최신)</option>
                                    <option value="deepseek-v3.2-exp">🚀 DeepSeek V3.2 Exp (실험실)</option>
                                    <option value="deepseek-v3.2">DeepSeek V3.2</option>
                                    <option value="deepseek-chat">DeepSeek V3 (안정)</option>
                                    <option value="deepseek-reasoner">DeepSeek R1 (Reasoning)</option>
                                    <option value="gpt-4o">GPT-4o</option>
                                </select>
                            </div>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: rgba(255,255,255,0.6);">Description</label>
                            <textarea id="designed-description" rows="2" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 14px; resize: none; box-sizing: border-box;"></textarea>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: rgba(255,255,255,0.6);">System Prompt</label>
                            <textarea id="designed-prompt" rows="10" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 13px; font-family: monospace; resize: vertical; box-sizing: border-box;"></textarea>
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 6px; font-size: 12px; color: rgba(255,255,255,0.6);">Procedures (AI 생성)</label>
                            <div id="designed-procedures" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px;"></div>
                        </div>
                    </div>
                </div>

                <div style="padding: 16px 24px; background: #161b22; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: flex-end; gap: 12px;">
                    <button onclick="closeAgentDesigner()" style="padding: 12px 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; cursor: pointer;">Cancel</button>
                    <button onclick="createDesignedAgent()" id="create-designed-btn" style="display: none; padding: 12px 24px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border: none; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 600;">✅ Create Agent</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add spinner animation
        if (!document.getElementById('designer-styles')) {
            const style = document.createElement('style');
            style.id = 'designer-styles';
            style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
    };

    window.closeAgentDesigner = function () {
        const modal = document.getElementById('ai-agent-designer-modal');
        if (modal) modal.remove();
        document.body.style.overflow = '';
        designedAgent = null;
    };

    window.closeCreateAgentModal = closeAgentDesigner;

    window.designAgent = async function () {
        const requirement = document.getElementById('agent-requirement')?.value.trim();
        const selectedModel = document.getElementById('designer-llm-model')?.value || 'deepseek-chat';

        if (!requirement) {
            alert('에이전트에 대한 설명을 입력해주세요.');
            return;
        }

        const btn = document.getElementById('design-btn');
        btn.innerHTML = '<span style="animation: spin 1s linear infinite; display: inline-block;">⏳</span> AI가 설계 중...';
        btn.disabled = true;

        try {
            // Check overlaps
            checkOverlappingAgents(requirement);

            const existingAgents = registry.map(a => `${a.name}: ${a.description || ''}`).join('\n');

            const response = await firebase.functions().httpsCallable('generateLLMResponse')({
                provider: selectedModel.includes('gpt') ? 'openai' : 'deepseek',
                model: selectedModel,
                systemPrompt: `You are an AI agent designer. Design a new AI agent based on user requirements.

Existing agents:
${existingAgents}

Output ONLY valid JSON (no markdown):
{"name":"English Name","category":"Design|Intelligence|Strategy|QA|Studio|Growth","description":"Korean description","systemPrompt":"Complete English system prompt with role, responsibilities, guidelines","procedures":[{"action":"action_code","label":"Step","description":"Description"}]}`,
                userMessage: requirement,
                temperature: 0.7,
                source: 'agent_designer'
            });

            if (!response.data.success) throw new Error(response.data.error);

            let design;
            try {
                const jsonStr = response.data.response.replace(/```json\n?|\n?```/g, '').trim();
                design = JSON.parse(jsonStr);
            } catch (e) {
                throw new Error('AI 응답 파싱 실패. 다시 시도해주세요.');
            }

            designedAgent = design;

            // Generate ID
            const prefixes = { 'Intelligence': 'INT', 'Design': 'DSN', 'Strategy': 'STG', 'QA': 'QA', 'Studio': 'STU', 'Growth': 'GRW' };
            const prefix = prefixes[design.category] || 'AGT';
            const namePart = design.name.toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 15);
            designedAgent.id = `${prefix}-${namePart}`;

            // Show review
            document.getElementById('designer-step-describe').style.display = 'none';
            document.getElementById('designer-step-review').style.display = 'block';
            document.getElementById('create-designed-btn').style.display = 'block';

            document.getElementById('designed-name').value = design.name;
            document.getElementById('designed-id').value = designedAgent.id;
            document.getElementById('designed-category').value = design.category;
            document.getElementById('designed-description').value = design.description;
            document.getElementById('designed-prompt').value = design.systemPrompt;

            const procContainer = document.getElementById('designed-procedures');
            if (design.procedures && design.procedures.length > 0) {
                const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];
                procContainer.innerHTML = design.procedures.map((p, i) => `
                    <div style="display:flex;align-items:center;gap:12px;padding:8px 0;${i > 0 ? 'border-top:1px solid rgba(255,255,255,0.05);' : ''}">
                        <span style="background:${colors[i % colors.length]};color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;">${i + 1}</span>
                        <div>
                            <div style="color:#fff;font-size:13px;">${p.label}</div>
                            <div style="color:rgba(255,255,255,0.5);font-size:11px;">${p.description}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                procContainer.innerHTML = '<div style="color:rgba(255,255,255,0.4);">No procedures</div>';
            }

        } catch (error) {
            alert('설계 오류: ' + error.message);
        } finally {
            btn.innerHTML = '🧠 AI로 에이전트 설계하기';
            btn.disabled = false;
        }
    };

    function checkOverlappingAgents(requirement) {
        const keywords = requirement.toLowerCase().split(/\s+/);
        const overlaps = registry.filter(a => {
            const text = `${a.name} ${a.description || ''}`.toLowerCase();
            return keywords.filter(k => k.length > 3 && text.includes(k)).length >= 2;
        });

        const container = document.getElementById('overlap-detection');
        const list = document.getElementById('overlap-agents-list');

        if (overlaps.length > 0) {
            container.style.display = 'block';
            list.innerHTML = overlaps.map(a => `
                <div style="background:rgba(0,0,0,0.2);padding:10px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <span style="color:#fff;">${a.name} <span style="color:rgba(255,255,255,0.5);font-size:12px;">${a.category}</span></span>
                    <button onclick="window.location.hash='registry-detail/${a.id}';closeAgentDesigner();" style="padding:4px 10px;background:rgba(78,205,196,0.2);border:1px solid rgba(78,205,196,0.4);border-radius:4px;color:#4ecdc4;cursor:pointer;font-size:11px;">View</button>
                </div>
            `).join('');
        } else {
            container.style.display = 'none';
        }
    }

    window.updateDesignedId = function () {
        if (!designedAgent) return;
        const name = document.getElementById('designed-name')?.value || '';
        const cat = document.getElementById('designed-category')?.value || 'Design';
        const prefixes = { 'Intelligence': 'INT', 'Design': 'DSN', 'Strategy': 'STG', 'QA': 'QA', 'Studio': 'STU', 'Growth': 'GRW' };
        document.getElementById('designed-id').value = `${prefixes[cat] || 'AGT'}-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 15)}`;
    };

    window.backToDescribe = function () {
        document.getElementById('designer-step-describe').style.display = 'block';
        document.getElementById('designer-step-review').style.display = 'none';
        document.getElementById('create-designed-btn').style.display = 'none';
    };

    window.createDesignedAgent = async function () {
        if (!designedAgent) return;

        const btn = document.getElementById('create-designed-btn');
        btn.innerHTML = '⏳ Creating...';
        btn.disabled = true;

        try {
            const agentId = document.getElementById('designed-id').value;
            const name = document.getElementById('designed-name').value.trim();
            const category = document.getElementById('designed-category').value;
            const model = document.getElementById('designed-model').value;
            const description = document.getElementById('designed-description').value.trim();
            const prompt = document.getElementById('designed-prompt').value.trim();

            if (registry.find(a => a.id === agentId)) {
                throw new Error(`ID "${agentId}" already exists!`);
            }

            const batch = db.batch();
            const ts = firebase.firestore.FieldValue.serverTimestamp();

            // Determine source files based on category
            let sourceFiles = ['services/agent-execution-service.js'];
            if (category === 'Strategy') sourceFiles.push('services/market-analysis-service.js');
            if (category === 'Intelligence') sourceFiles.push('services/knowledge-base-service.js');
            if (category === 'Design') sourceFiles.push('services/asset-generation-service.js');

            batch.set(db.collection('agentRegistry').doc(agentId), {
                id: agentId,
                name,
                category,
                description,
                status: 'active',
                currentProductionVersion: '1.0.0',
                sourceFiles: sourceFiles,
                createdAt: ts,
                updatedAt: ts
            });

            batch.set(db.collection('agentVersions').doc(`${agentId}-v1-0-0`), {
                agentId,
                version: '1.0.0',
                isProduction: true,
                status: 'production',
                config: { model, temperature: 0.7, maxTokens: 4096 },
                systemPrompt: prompt,
                procedures: designedAgent.procedures || [],
                changelog: 'Created via AI Agent Designer',
                createdAt: ts
            });

            await batch.commit();

            alert(`✅ Agent "${name}" created!\nID: ${agentId}`);
            closeAgentDesigner();
            window.location.hash = `registry-detail/${agentId}`;

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            btn.innerHTML = '✅ Create Agent';
            btn.disabled = false;
        }
    };

})();
