// admin-subagents.js
// SubAgent Template Management Page
// Refactored for Phase 2 Architecture Alignment

(function () {
    let templates = [];
    let filteredTemplates = [];
    let currentAdapters = []; // Store adapters being edited
    let unsubscribe = null;
    const projectId = "default_project";

    // 🔹 Canonical Engine Types (PRD 5.0)
    // Canonical values (snake_case) are used for DB storage and backend logic
    // UI labels are used for display in dropdowns and tables
    // 🔹 Canonical Engine Types (PRD 5.0)
    // Canonical values (snake_case) are used for DB storage and backend logic
    // UI labels are used for display in dropdowns and tables
    const ENGINE_TYPES = {
        planner: {
            canonical: 'planner',
            label: 'Planner',
            icon: '🎯',
            description: 'Strategic content planning and scheduling engine.',
            status: 'active',
            kpi: { runs: '1.2k', success: '99%', latency: '2.1s', teams: '8' }
        },
        research: {
            canonical: 'research',
            label: 'Research',
            icon: '🔍',
            description: 'Market analysis and trend discovery engine.',
            status: 'active',
            kpi: { runs: '850', success: '98%', latency: '4.5s', teams: '5' }
        },
        creator_text: {
            canonical: 'creator_text',
            label: 'Creator.Text',
            icon: '✍️',
            description: 'High-quality text generation for posts and articles.',
            status: 'active',
            kpi: { runs: '15k', success: '99.5%', latency: '1.2s', teams: '12' }
        },
        creator_image: {
            canonical: 'creator_image',
            label: 'Creator.Image',
            icon: '🎨',
            description: 'AI image generation and visual asset creation.',
            status: 'active',
            kpi: { runs: '4.2k', success: '97%', latency: '8.5s', teams: '10' }
        },
        creator_video: {
            canonical: 'creator_video',
            label: 'Creator.Video',
            icon: '🎬',
            description: 'Short-form video generation and editing.',
            status: 'experimental',
            kpi: { runs: '120', success: '85%', latency: '45s', teams: '2' }
        },
        engagement: {
            canonical: 'engagement',
            label: 'Engagement',
            icon: '💬',
            description: 'Community interaction and reply management.',
            status: 'active',
            kpi: { runs: '22k', success: '99.9%', latency: '0.8s', teams: '12' }
        },
        compliance: {
            canonical: 'compliance',
            label: 'Compliance',
            icon: '⚖️',
            description: 'Brand safety, fact-checking, and policy enforcement.',
            status: 'active',
            kpi: { runs: '35k', success: '100%', latency: '0.5s', teams: '12' }
        },
        evaluator: {
            canonical: 'evaluator',
            label: 'Evaluator',
            icon: '📊',
            description: 'Quality assessment and performance scoring.',
            status: 'active',
            kpi: { runs: '12k', success: '99%', latency: '1.5s', teams: '9' }
        },
        manager: {
            canonical: 'manager',
            label: 'Manager',
            icon: '👔',
            description: 'Final approval and team orchestration.',
            status: 'active',
            kpi: { runs: '5.6k', success: '99%', latency: '1.8s', teams: '12' }
        },
        kpi: {
            canonical: 'kpi',
            label: 'KPI',
            icon: '📈',
            description: 'Data analytics and performance optimization.',
            status: 'active',
            kpi: { runs: '8.9k', success: '99%', latency: '3.2s', teams: '7' }
        },
        seo_watcher: {
            canonical: 'seo_watcher',
            label: 'SEO Watcher',
            icon: '🔎',
            description: 'SEO policy monitoring and keyword optimization.',
            status: 'active',
            kpi: { runs: '3.4k', success: '98%', latency: '2.5s', teams: '4' }
        },
        knowledge_curator: {
            canonical: 'knowledge_curator',
            label: 'Knowledge Curator',
            icon: '📚',
            description: 'Brand memory and knowledge base management.',
            status: 'active',
            kpi: { runs: '1.1k', success: '99%', latency: '1.5s', teams: '6' }
        }
    };

    // Helper: Get engine type config by canonical value or label
    function getEngineTypeConfig(value) {
        // Try direct lookup by canonical
        if (ENGINE_TYPES[value]) return ENGINE_TYPES[value];

        // Try lookup by label (for backward compatibility)
        for (const key in ENGINE_TYPES) {
            if (ENGINE_TYPES[key].label === value) return ENGINE_TYPES[key];
        }

        // Legacy fallback mappings
        const legacyMap = {
            'Planner': 'planner',
            'Research': 'research',
            'Creator.Text': 'creator_text',
            'Creator.Image': 'creator_image',
            'Creator.Video': 'creator_video',
            'Engagement': 'engagement',
            'Compliance': 'compliance',
            'Evaluator': 'evaluator',
            'Manager': 'manager',
            'KPI': 'kpi',
            'Knowledge Curator': 'knowledge_curator',
            'creator': 'creator_text', // Legacy
            'kpi_engine': 'kpi' // Legacy
        };

        const canonical = legacyMap[value];
        return canonical ? ENGINE_TYPES[canonical] : null;
    }

    // ===== Runtime Configuration Presets =====

    const RUNTIME_PRESETS = [
        {
            id: 'standard',
            label: 'Standard (Balanced, English)',
            description: 'GPT-4, Temperature 0.7',
            role: 'strategist',
            language: 'en',
            tier: 'balanced'
        },
        {
            id: 'korean_strategic',
            label: 'Korean Strategic (Balanced, Korean)',
            description: 'GPT-4, 한국어 최적화',
            role: 'strategist',
            language: 'ko',
            tier: 'balanced'
        },
        {
            id: 'creative',
            label: 'Creative (Creative Tier, English)',
            description: 'GPT-4 Turbo, Temperature 0.9',
            role: 'creator',
            language: 'en',
            tier: 'creative'
        },
        {
            id: 'precise',
            label: 'Precise (Precise Tier, English)',
            description: 'GPT-4, Temperature 0.3',
            role: 'analyst',
            language: 'en',
            tier: 'precise'
        },
        {
            id: 'custom',
            label: 'Custom Configuration',
            description: 'Manually configure all settings',
            role: null,
            language: null,
            tier: null
        }
    ];

    // ===== System Prompt Templates by Role Family =====

    const SYSTEM_PROMPT_TEMPLATES = {
        strategy: `You are a strategic planning agent.

Your responsibilities:
- Analyze market trends and audience insights
- Create data-driven content strategies
- Optimize posting schedules and formats
- Align content with business objectives

Always provide actionable, measurable recommendations.`,

        creation: `You are a creative content generation agent.

Your responsibilities:
- Generate engaging, platform-optimized content
- Maintain consistent brand voice and style
- Incorporate trending topics and formats
- Balance creativity with brand guidelines

Always create content that resonates with the target audience.`,

        conversation: `You are a community engagement agent.

Your responsibilities:
- Respond to comments and messages professionally
- Build authentic relationships with followers
- Handle inquiries and feedback constructively
- Maintain brand tone in all interactions

Always prioritize genuine, helpful communication.`,

        governance: `You are a content compliance and quality agent.

Your responsibilities:
- Review content for brand safety and accuracy
- Ensure regulatory compliance
- Verify facts and claims
- Flag potential risks or issues

Always prioritize accuracy and brand protection.`,

        intelligence: `You are a data analysis and insights agent.

Your responsibilities:
- Track and analyze performance metrics
- Identify patterns and opportunities
- Generate actionable insights
- Provide optimization recommendations

Always base recommendations on data evidence.`,

        memory: `You are a knowledge management agent.

Your responsibilities:
- Organize and maintain brand knowledge
- Retrieve relevant context and guidelines
- Learn from past content performance
- Ensure consistency across all content

Always prioritize accurate, up-to-date information.`
    };

    // ===== Page View Management =====

    window.switchPageView = function (viewName) {
        // Update Tabs
        document.querySelectorAll('.page-tab').forEach(btn => {
            btn.classList.remove('active');
            if (btn.id === `tab-btn-${viewName}`) btn.classList.add('active');
        });

        // Update Views
        document.querySelectorAll('.page-view').forEach(view => {
            view.style.display = 'none';
        });

        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.style.display = 'block';
            // Trigger specific load logic if needed
            if (viewName === 'canvas') renderCanvasView();
            if (viewName === 'templates') {
                // Ensure table is rendered if not already
                if (templates.length === 0) loadTemplates();
            }
        }
    };

    function renderCanvasView() {
        const grid = document.getElementById('engine-canvas-grid');
        if (!grid) return;

        grid.innerHTML = Object.values(ENGINE_TYPES).map((engine, index) => `
            <div class="engine-card ${index % 3 === 0 ? 'pulse' : ''}" onclick="switchPageView('templates'); document.getElementById('filter-type').value='${engine.canonical}'; handleFilters();">
                <div class="status-dot status-${engine.status}"></div>
                <div class="engine-icon-wrapper">
                    ${engine.icon}
                </div>
                <div class="engine-title">${engine.label}</div>
                <div class="engine-desc">${engine.description}</div>
                
                <div class="engine-kpi-grid">
                    <div class="kpi-item">
                        <span class="kpi-label">Total Runs</span>
                        <span class="kpi-value">${engine.kpi.runs}</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-label">Success Rate</span>
                        <span class="kpi-value" style="color: #22c55e;">${engine.kpi.success}</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-label">Avg Latency</span>
                        <span class="kpi-value">${engine.kpi.latency}</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-label">Active Teams</span>
                        <span class="kpi-value" style="color: #16e0bd;">${engine.kpi.teams}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.initSubAgents = function (user) {
        console.log("Initializing Sub-Agent Templates Page...");

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        templates = [];
        filteredTemplates = [];

        // Default to Canvas View
        renderCanvasView();

        // Pre-load templates for Tab 2
        loadTemplates();

        setupEventListeners();
    };


    // --- v2.0 Helpers ---

    function populateMetadataDropdowns() {
        const roleSelect = document.getElementById('subagent-role');
        const langSelect = document.getElementById('subagent-language');
        const tierSelect = document.getElementById('subagent-tier');

        // Check if utils-runtime-resolver.js is loaded
        if (typeof window.getAvailableRoleTypes !== 'function') {
            console.warn('utils-runtime-resolver.js not loaded, using defaults');
            return;
        }

        // Populate Roles
        if (roleSelect) {
            const roles = window.getAvailableRoleTypes();
            roleSelect.innerHTML = roles.map(r =>
                `<option value="${r.value}">${r.label}</option>`
            ).join('');
        }

        // Populate Languages
        if (langSelect) {
            const langs = window.getAvailableLanguages();
            langSelect.innerHTML = langs.map(l =>
                `<option value="${l.value}">${l.flag} ${l.label}</option>`
            ).join('');
        }

        // Populate Tiers
        if (tierSelect) {
            const tiers = window.getAvailableTiers();
            tierSelect.innerHTML = tiers.map(t =>
                `<option value="${t.value}">${t.label} - ${t.description}</option>`
            ).join('');
        }

        // Render Runtime Presets
        renderRuntimePresets();
    }

    function renderRuntimePresets() {
        const container = document.getElementById('runtime-presets');
        if (!container) return;

        container.innerHTML = RUNTIME_PRESETS.map(preset => `
            <label style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: rgba(255,255,255,0.02); border: 2px solid rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                <input type="radio" name="runtime-preset" value="${preset.id}" 
                    style="margin-top: 2px;" 
                    onchange="selectRuntimePreset('${preset.id}')">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">${preset.label}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.6);">${preset.description}</div>
                </div>
            </label>
        `).join('');

        // Select default (standard)
        const defaultRadio = container.querySelector('input[value="standard"]');
        if (defaultRadio) defaultRadio.checked = true;
    }

    window.selectRuntimePreset = function (presetId) {
        const preset = RUNTIME_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        const customConfig = document.getElementById('custom-runtime-config');
        const roleSelect = document.getElementById('subagent-role');
        const langSelect = document.getElementById('subagent-language');
        const tierSelect = document.getElementById('subagent-tier');

        if (presetId === 'custom') {
            // Show custom configuration
            customConfig.style.display = 'block';
        } else {
            // Hide custom configuration and apply preset values
            customConfig.style.display = 'none';
            if (roleSelect) roleSelect.value = preset.role;
            if (langSelect) langSelect.value = preset.language;
            if (tierSelect) tierSelect.value = preset.tier;
        }
    };

    // Auto-fill System Prompt based on Role Family
    window.autoFillSystemPrompt = function (family) {
        const systemPromptField = document.getElementById('subagent-prompt'); // Fixed: was 'subagent-system-prompt'
        if (!systemPromptField || !family) return;

        const template = SYSTEM_PROMPT_TEMPLATES[family];
        if (template) {
            systemPromptField.value = template;
            console.log(`[Auto-fill] Loaded ${family} system prompt template`);
        }
    };

    // ===== System Prompt Template Management =====

    let promptTemplates = [];

    async function loadPromptTemplates() {
        try {
            const snapshot = await db.collection('systemPromptTemplates')
                .where('status', '==', 'active')
                .get();

            promptTemplates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            populateTemplateSelector();
        } catch (error) {
            console.error('[Prompt Templates] Failed to load:', error);
        }
    }

    function populateTemplateSelector() {
        const select = document.getElementById('prompt-template-select');
        if (!select) return;

        select.innerHTML = '<option value="">Select a template...</option>' +
            promptTemplates.map(t =>
                `<option value="${t.id}">${t.name} (v${t.version})</option>`
            ).join('');
    }

    window.togglePromptSource = function () {
        const source = document.querySelector('input[name="prompt-source"]:checked').value;
        const templateContainer = document.getElementById('template-selector-container');
        const promptField = document.getElementById('subagent-prompt');

        if (source === 'template') {
            templateContainer.style.display = 'block';
            promptField.disabled = true;
            promptField.style.opacity = '0.5';
        } else {
            templateContainer.style.display = 'none';
            promptField.disabled = false;
            promptField.style.opacity = '1';
        }
    };

    window.loadPromptTemplate = function () {
        const templateId = document.getElementById('prompt-template-select').value;
        if (!templateId) return;

        const template = promptTemplates.find(t => t.id === templateId);
        if (!template) return;

        // Load template content into prompt field
        document.getElementById('subagent-prompt').value = template.content;

        // Show preview
        const preview = document.getElementById('template-preview');
        preview.innerHTML = `
            <strong>${template.name}</strong> v${template.version}<br>
            ${template.description}<br>
            <span style="color: rgba(255,255,255,0.4);">Used by ${template.usageCount || 0} templates</span>
        `;
    };


    function filterRuntimeProfiles() {
        const role = document.getElementById('subagent-role').value;
        const lang = document.getElementById('subagent-language').value;
        const profileSelect = document.getElementById('subagent-profile');

        if (!profileSelect) return;

        // Re-populate options based on all loaded profiles
        // We need to store all profiles first. 
        // Let's modify loadRuntimeProfiles to store them in a variable.
        if (!window.allRuntimeProfiles) return;

        let filtered = window.allRuntimeProfiles;

        // Filter logic:
        // If role/lang selected, prioritize matching profiles
        // But for now, let's just show all but sort them? 
        // Or filter strictly? PRD says "prioritize".
        // Let's sort: exact match first, then others.

        if (role && lang) {
            filtered.sort((a, b) => {
                const aMatch = (a.role_type === role && a.language === lang) ? 2 : (a.role_type === role ? 1 : 0);
                const bMatch = (b.role_type === role && b.language === lang) ? 2 : (b.role_type === role ? 1 : 0);
                return bMatch - aMatch;
            });
        }

        let options = '<option value="">Select a Profile...</option>';
        filtered.forEach(data => {
            const isMatch = (role && lang && data.role_type === role && data.language === lang);
            const style = isMatch ? 'font-weight: bold; color: #16e0bd;' : '';
            const matchBadge = isMatch ? ' [RECOMMENDED]' : '';

            options += `<option value="${data.id}" style="${style}">
                ${data.name} (${data.provider})${matchBadge}
            </option>`;
        });
        profileSelect.innerHTML = options;

        // Auto-select if exact match found and nothing selected
        if (role && lang && !profileSelect.value) {
            const exactMatch = filtered.find(p => p.role_type === role && p.language === lang && p.tier === 'balanced');
            if (exactMatch) profileSelect.value = exactMatch.id;
        }
    }

    function loadRuntimeProfiles() {
        // v2.0: Use root `runtimeProfiles` collection
        db.collection('runtimeProfiles')
            .where('status', '==', 'active')
            .get()
            .then(snapshot => {
                window.allRuntimeProfiles = [];
                snapshot.forEach(doc => {
                    window.allRuntimeProfiles.push({ id: doc.id, ...doc.data() });
                });
                filterRuntimeProfiles(); // Initial render
            })
            .catch(err => console.error("Error loading profiles:", err));
    }

    function setupEventListeners() {
        const searchInput = document.getElementById("subagent-search");
        const typeFilter = document.getElementById("filter-type");
        const statusFilter = document.getElementById("filter-status");
        const addBtn = document.getElementById("add-subagent-btn");
        const modalClose = document.getElementById("modal-close");
        const modalCancel = document.getElementById("modal-cancel");
        const modalSave = document.getElementById("modal-save");
        const addAdapterBtn = document.getElementById("add-adapter-btn");

        // v2.0 Listeners
        const roleSelect = document.getElementById('subagent-role');
        const langSelect = document.getElementById('subagent-language');
        if (roleSelect) roleSelect.addEventListener('change', filterRuntimeProfiles);
        if (langSelect) langSelect.addEventListener('change', filterRuntimeProfiles);

        // Auto-select Role Family based on Engine Type
        const typeSelect = document.getElementById('subagent-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                const type = typeSelect.value;
                const familySelect = document.getElementById('subagent-family');
                if (familySelect && type) {
                    familySelect.value = autoSelectFamily(type);
                }
            });
        }

        if (searchInput) searchInput.addEventListener("input", handleFilters);
        if (typeFilter) typeFilter.addEventListener("change", handleFilters);
        if (statusFilter) statusFilter.addEventListener("change", handleFilters);

        // Tab Switching
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                // Deactivate all
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

                // Activate clicked
                tab.classList.add('active');
                const tabId = tab.dataset.tab;
                document.getElementById(`tab-${tabId}`).classList.add('active');
            });
        });

        // Direct event listeners for buttons
        // addBtn listener removed as it's handled by onclick in HTML now

        if (addAdapterBtn) {
            addAdapterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                addAdapter();
            });
        }

        if (modalClose) modalClose.addEventListener('click', closeModal);
        if (modalCancel) modalCancel.addEventListener('click', closeModal);
        if (modalSave) modalSave.addEventListener('click', saveTemplate);
    }

    function loadTemplates() {
        const tbody = document.getElementById("subagents-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading templates...</td></tr>';

        // Listen to subAgentTemplates collection
        unsubscribe = db.collection('subAgentTemplates')
            .onSnapshot((snapshot) => {
                if (!document.getElementById("subagents-table-body")) {
                    if (unsubscribe) unsubscribe();
                    return;
                }

                templates = [];
                snapshot.forEach(doc => {
                    templates.push({ id: doc.id, ...doc.data() });
                });

                templates.sort((a, b) => {
                    const timeA = a.updated_at ? (a.updated_at.toMillis ? a.updated_at.toMillis() : new Date(a.updated_at).getTime()) : 0;
                    const timeB = b.updated_at ? (b.updated_at.toMillis ? b.updated_at.toMillis() : new Date(b.updated_at).getTime()) : 0;
                    return timeB - timeA;
                });

                filteredTemplates = [...templates];
                handleFilters();
            }, (error) => {
                console.error("Error loading templates:", error);
                if (document.getElementById("subagents-table-body")) {
                    document.getElementById("subagents-table-body").innerHTML =
                        `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error: ${error.message}</td></tr>`;
                }
            });
    }

    function handleFilters() {
        const searchInput = document.getElementById("subagent-search");
        const typeFilter = document.getElementById("filter-type");
        const statusFilter = document.getElementById("filter-status");

        if (!searchInput || !typeFilter || !statusFilter) return;

        const searchTerm = searchInput.value.toLowerCase();
        const selectedType = typeFilter.value;
        const selectedStatus = statusFilter.value;

        filteredTemplates = templates.filter(tpl => {
            const matchesSearch = tpl.id?.toLowerCase().includes(searchTerm) ||
                tpl.type?.toLowerCase().includes(searchTerm);
            const matchesType = selectedType === 'all' || tpl.type === selectedType;
            const matchesStatus = selectedStatus === 'all' || tpl.status === selectedStatus;

            return matchesSearch && matchesType && matchesStatus;
        });

        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById("subagents-table-body");
        if (!tbody) return;

        if (filteredTemplates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No templates found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredTemplates.map(tpl => `
            <tr>
                <td>
                    ${getTypeIcon(tpl.type)} 
                    <strong>${getEngineTypeConfig(tpl.type)?.label || capitalizeFirst(tpl.type)}</strong>
                </td>
                <td>
                    <code style="font-size: 12px; color: #4ecdc4;">${tpl.id}</code>
                </td>
                <td>
                    <span style="background: rgba(22, 224, 189, 0.2); padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                        v${tpl.version}
                    </span>
                </td>
                <td>${getStatusBadge(tpl.status)}</td>
                <td>
                    <span style="font-size: 12px;">
                        ${tpl.runtime_profile_id || 'Default'}
                    </span>
                </td>
                <td>${formatDate(tpl.updated_at)}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button onclick="editTemplate('${tpl.id}')" class="admin-btn-secondary" style="padding: 4px 8px; font-size: 12px; width: 60px;">
                            Edit
                        </button>
                        <button onclick="deleteTemplate('${tpl.id}')" class="admin-btn-secondary" style="background: #ef4444; padding: 4px 8px; font-size: 12px; width: 60px;">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function getTypeIcon(type) {
        const config = getEngineTypeConfig(type);
        return config ? config.icon : '🤖';
    }

    function getStatusBadge(status) {
        const badges = {
            active: '<span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✅ Active</span>',
            draft: '<span style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">📝 Draft</span>',
            deprecated: '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">❌ Deprecated</span>'
        };
        return badges[status] || status;
    }

    function capitalizeFirst(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function compareVersions(v1, v2) {
        if (!v1 || !v2) return 0;
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        return 0;
    }

    function autoSelectFamily(engineType) {
        const map = {
            planner: 'strategy',
            manager: 'strategy',
            creator_text: 'creation',
            creator_image: 'creation',
            creator_video: 'creation',
            engagement: 'conversation',
            compliance: 'governance',
            evaluator: 'governance',
            seo_watcher: 'governance',
            kpi: 'intelligence',
            research: 'intelligence',
            knowledge_curator: 'memory'
        };
        return map[engineType] || '';
    }

    // Modal Functions
    function openModal(isEdit = false) {
        console.log('openModal called, isEdit:', isEdit);
        const modal = document.getElementById('subagent-modal');
        const title = document.getElementById('modal-title');

        if (!modal) {
            console.error('Modal element not found!');
            return;
        }

        title.textContent = isEdit ? 'Edit Template' : 'Create Sub-Agent Template';
        modal.style.display = 'flex';
        // Add 'open' class for opacity transition
        requestAnimationFrame(() => {
            modal.classList.add('open');
        });
        console.log('Modal display set to flex and open class added');

        // Reset Tabs
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

        const overviewTab = document.querySelector('.admin-tab[data-tab="overview"]');
        if (overviewTab) overviewTab.classList.add('active');

        const overviewContent = document.getElementById('tab-overview');
        if (overviewContent) overviewContent.classList.add('active');

        if (!isEdit) {
            console.log('Resetting form for create mode');
            const form = document.getElementById('subagent-form');
            if (form) form.reset();

            const idInput = document.getElementById('subagent-id');
            if (idInput) idInput.value = '';

            const versionInput = document.getElementById('subagent-version');
            if (versionInput) versionInput.value = '1.0.0';

            currentAdapters = [];
            renderAdapters();
        }

        // Populate dropdowns if needed
        populateMetadataDropdowns();

        // Load System Prompt Templates
        loadPromptTemplates();

        // Load templates
        loadTemplates();

        // Initialize Sliders
        setupSliders();
    }

    function setupSliders() {
        const tempSlider = document.getElementById('config-temperature-slider');
        const tempInput = document.getElementById('config-temperature');
        const tempDisplay = document.getElementById('temp-display');

        const tokenSlider = document.getElementById('config-max-tokens-slider');
        const tokenInput = document.getElementById('config-max-tokens');
        const tokenDisplay = document.getElementById('tokens-display');

        function sync(source, target, display) {
            if (source && target) {
                target.value = source.value;
                if (display) display.textContent = source.value;
            }
        }

        if (tempSlider && tempInput) {
            tempSlider.oninput = () => sync(tempSlider, tempInput, tempDisplay);
            tempInput.oninput = () => sync(tempInput, tempSlider, tempDisplay);
            // Init
            sync(tempInput, tempSlider, tempDisplay);
        }

        if (tokenSlider && tokenInput) {
            tokenSlider.oninput = () => sync(tokenSlider, tokenInput, tokenDisplay);
            tokenInput.oninput = () => sync(tokenInput, tokenSlider, tokenDisplay);
            // Init
            sync(tokenInput, tokenSlider, tokenDisplay);
        }
    }

    function closeModal() {
        const modal = document.getElementById('subagent-modal');
        if (modal) {
            modal.classList.remove('open');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200); // Wait for transition
        }
        const form = document.getElementById('subagent-form');
        if (form) form.reset();
    }

    // Expose to window for direct HTML access
    window.openSubAgentModal = function () {
        openModal(false);
    };

    window.createSubAgent = function () {
        console.log('createSubAgent called');
        openModal(false);
    };

    window.addAdapterFromUI = function () {
        const select = document.getElementById('new-adapter-channel');
        if (!select) return;

        const channelId = select.value;
        if (!channelId) {
            alert("Please select a channel first.");
            return;
        }

        // Check if already exists
        if (currentAdapters.find(a => a.channelId === channelId && !a.isDeleted)) {
            alert("Adapter for this channel already exists.");
            return;
        }

        currentAdapters.push({
            channelId: channelId.toLowerCase(),
            promptOverrides: "",
            enabled: true,
            isNew: true
        });

        renderAdapters();

        // Reset selection
        select.value = "";
    };

    // Legacy function support removed or redirected
    window.addAdapter = function () {
        // Redirect to UI based add
        document.querySelector('.admin-tab[data-tab="adapters"]').click();
        document.getElementById('new-adapter-channel').focus();
    };

    // CRUD Operations
    window.editTemplate = async function (id) {
        console.log('Edit template called:', id);
        try {
            const doc = await db.collection('subAgentTemplates').doc(id).get();
            if (!doc.exists) {
                alert('Template not found');
                return;
            }

            const tpl = doc.data();

            document.getElementById('subagent-id').value = id;
            document.getElementById('subagent-type').value = tpl.type;
            document.getElementById('subagent-version').value = tpl.version;
            document.getElementById('subagent-status').value = tpl.status;
            document.getElementById('subagent-prompt').value = tpl.system_prompt || '';
            document.getElementById('model-llm-text').value = tpl.model_provider?.llmText?.model || 'gpt-4';
            document.getElementById('config-temperature').value = tpl.config?.temperature || 0.7;
            document.getElementById('config-max-tokens').value = tpl.config?.maxTokens || 2000;
            document.getElementById('config-temperature').value = tpl.config?.temperature || 0.7;
            document.getElementById('config-max-tokens').value = tpl.config?.maxTokens || 2000;

            // v2.0 Metadata
            // v2.0 Metadata
            if (document.getElementById('subagent-role')) document.getElementById('subagent-role').value = tpl.roleTypeForRuntime || tpl.role_type || 'strategist';
            if (document.getElementById('subagent-language')) document.getElementById('subagent-language').value = tpl.primaryLanguage || tpl.primary_language || 'en';
            if (document.getElementById('subagent-tier')) document.getElementById('subagent-tier').value = tpl.preferredTier || tpl.preferred_tier || 'balanced';

            // v2.0 New Fields
            if (document.getElementById('subagent-family')) document.getElementById('subagent-family').value = tpl.family || autoSelectFamily(tpl.type) || '';
            if (document.getElementById('subagent-requires-brand-brain')) document.getElementById('subagent-requires-brand-brain').checked = tpl.requiresBrandBrain || false;
            if (document.getElementById('subagent-brand-context-mode')) document.getElementById('subagent-brand-context-mode').value = tpl.brandContextMode || 'none';

            // Set System Prompt Source
            if (tpl.systemPromptTemplateId) {
                document.querySelector('input[name="prompt-source"][value="template"]').checked = true;
                document.getElementById('prompt-template-select').value = tpl.systemPromptTemplateId;
                togglePromptSource();
                loadPromptTemplate(); // Show preview
            } else {
                document.querySelector('input[name="prompt-source"][value="custom"]').checked = true;
                togglePromptSource();
            }

            // Load Adapters
            await loadAdapters(id);

            openModal(true);
        } catch (error) {
            console.error('Error loading template:', error);
            alert(`Error: ${error.message}`);
        }
    };

    async function loadAdapters(templateId) {
        currentAdapters = [];
        try {
            const snapshot = await db.collection('subAgentChannelAdapters')
                .where('subAgentTemplateId', '==', templateId)
                .get();

            snapshot.forEach(doc => {
                currentAdapters.push({ id: doc.id, ...doc.data() });
            });
            renderAdapters();
        } catch (error) {
            console.error("Error loading adapters:", error);
        }
    }

    function renderAdapters() {
        const list = document.getElementById('adapters-list');
        if (!list) return;

        if (currentAdapters.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.3); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px;">No channel adapters configured.</div>';
            return;
        }

        list.innerHTML = currentAdapters.map((adapter, index) => `
            <div class="adapter-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #16e0bd;">${adapter.channelId}</strong>
                    <button type="button" onclick="removeAdapter(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer;">&times;</button>
                </div>
                <input type="text" placeholder="Prompt Override..." 
                    value="${adapter.promptOverrides || ''}" 
                    onchange="updateAdapter(${index}, 'promptOverrides', this.value)"
                    class="admin-form-input" style="font-size: 12px; margin-bottom: 5px;">
                <div style="display: flex; gap: 10px;">
                    <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                        <input type="checkbox" ${adapter.enabled ? 'checked' : ''} 
                            onchange="updateAdapter(${index}, 'enabled', this.checked)"> Enabled
                    </label>
                </div>
            </div>
        `).join('');
    }

    window.updateAdapter = function (index, field, value) {
        if (currentAdapters[index]) {
            currentAdapters[index][field] = value;
        }
    };

    window.removeAdapter = function (index) {
        if (confirm("Remove this adapter?")) {
            const adapter = currentAdapters[index];
            if (!adapter.isNew) {
                // If it's an existing adapter, we might want to track it for deletion
                // For now, we'll just remove from UI and handle deletion logic if needed, 
                // or just let the save function overwrite/delete.
                // Simpler approach: We will delete from Firestore on Save if it's missing from the list?
                // Or just delete immediately? Deleting immediately is risky if user cancels.
                // Let's mark as deleted.
                adapter.isDeleted = true;
            } else {
                currentAdapters.splice(index, 1);
            }
            renderAdapters(); // Need to filter out deleted ones in render
        }
    };

    // Update render to hide deleted
    const originalRender = renderAdapters;
    renderAdapters = function () {
        const list = document.getElementById('adapters-list');
        if (!list) return;

        const visibleAdapters = currentAdapters.filter(a => !a.isDeleted);

        if (visibleAdapters.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.3); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px;">No channel adapters configured.</div>';
            return;
        }

        list.innerHTML = visibleAdapters.map((adapter, index) => {
            // Find actual index in main array
            const realIndex = currentAdapters.indexOf(adapter);
            return `
            <div class="adapter-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #16e0bd;">${adapter.channelId}</strong>
                    <button type="button" onclick="removeAdapter(${realIndex})" style="background: none; border: none; color: #ef4444; cursor: pointer;">&times;</button>
                </div>
                <textarea placeholder="Prompt Override..." 
                    onchange="updateAdapter(${realIndex}, 'promptOverrides', this.value)"
                    class="admin-form-input" style="font-size: 12px; margin-bottom: 5px; min-height: 60px;">${adapter.promptOverrides || ''}</textarea>
                <div style="display: flex; gap: 10px;">
                    <label style="font-size: 11px; display: flex; align-items: center; gap: 4px;">
                        <input type="checkbox" ${adapter.enabled ? 'checked' : ''} 
                            onchange="updateAdapter(${realIndex}, 'enabled', this.checked)"> Enabled
                    </label>
                </div>
            </div>
        `}).join('');
    }

    async function saveTemplate(e) {
        e.preventDefault();
        const btn = document.getElementById('modal-save');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const id = document.getElementById('subagent-id').value;
            const type = document.getElementById('subagent-type').value;

            if (!type) throw new Error("Engine Type is required");

            const newVersion = document.getElementById('subagent-version').value; // Assuming this is where version comes from

            const subAgentData = {
                // Core Identity
                type: document.getElementById('subagent-type').value,
                engineTypeId: document.getElementById('subagent-type').value, // v2 alias
                version: newVersion,
                status: document.getElementById('subagent-status').value,
                system_prompt: document.getElementById('subagent-prompt').value,
                systemPrompt: document.getElementById('subagent-prompt').value, // v2 alias

                // v2.0 Metadata (for Dynamic Resolution)
                roleTypeForRuntime: document.getElementById('subagent-role').value,
                primaryLanguage: document.getElementById('subagent-language').value,

                // v3.0 System Prompt Template Reference
                systemPromptTemplateId: document.querySelector('input[name="prompt-source"]:checked').value === 'template'
                    ? document.getElementById('prompt-template-select').value
                    : null,
                systemPromptTemplateVersion: document.querySelector('input[name="prompt-source"]:checked').value === 'template'
                    ? (promptTemplates.find(t => t.id === document.getElementById('prompt-template-select').value)?.version || null)
                    : null,
                preferredTier: document.getElementById('subagent-tier').value,

                // Legacy aliases for compatibility
                role_type: document.getElementById('subagent-role').value,
                primary_language: document.getElementById('subagent-language').value,
                preferred_tier: document.getElementById('subagent-tier').value,

                // v2.0 New Fields
                family: document.getElementById('subagent-family').value,
                requiresBrandBrain: document.getElementById('subagent-requires-brand-brain').checked,
                brandContextMode: document.getElementById('subagent-brand-context-mode').value,


                // Legacy Config (Overridable by Runtime Rule)
                config: {
                    temperature: parseFloat(document.getElementById('config-temperature').value),
                    maxTokens: parseInt(document.getElementById('config-max-tokens').value)
                },

                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // v2 alias
                updated_by: firebase.auth().currentUser?.uid || 'system',
                channel_adapters: currentAdapters,
            };

            if (id) {
                await db.collection('subAgentTemplates').doc(id).update(subAgentData);
            } else {
                // Generate ID: tpl_{type}_v{version}
                const version = '1.0.0';
                const newId = `tpl_${type}_v${version.replace(/\./g, '_')}_${Date.now().toString().slice(-4)}`;

                // For new creation, add creation metadata
                subAgentData.id = newId;
                subAgentData.version = version;
                subAgentData.created_at = firebase.firestore.FieldValue.serverTimestamp();
                subAgentData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); // v2 alias

                await db.collection('subAgentTemplates').doc(newId).set(subAgentData);
            }

            closeModal();
            alert('✅ Template saved successfully!');
            loadTemplates(); // Refresh list
        } catch (error) {
            console.error("Error saving template:", error);
            alert(`Error: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Template';
        }
    }

    window.deleteTemplate = async function (id) {
        console.log('Delete template called:', id);

        if (!confirm('Are you sure you want to delete this Sub-Agent template?\n\nThis action cannot be undone.')) {
            return;
        }

        try {
            // Require Google Authentication for deletion
            const user = firebase.auth().currentUser;
            if (!user) {
                alert('You must be logged in to delete templates.');
                return;
            }

            // Show loading message
            const tbody = document.getElementById('subagents-table-body');
            if (!tbody) {
                console.error('subagents-table-body not found - this function should only be called from Sub-Agents page');
                return;
            }
            const originalContent = tbody.innerHTML;
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #16e0bd;">Waiting for Google Authentication...</td></tr>';

            // Reauthenticate with Google
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await user.reauthenticateWithPopup(provider);
                console.log('Reauthentication successful');

                // Show deleting message
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #16e0bd;">Deleting template...</td></tr>';
            } catch (authError) {
                // Restore original content
                tbody.innerHTML = originalContent;

                if (authError.code === 'auth/popup-closed-by-user') {
                    alert('Authentication cancelled.\n\nTemplate was not deleted.');
                } else if (authError.code === 'auth/cancelled-popup-request') {
                    alert('Authentication popup was blocked or cancelled.\n\nTemplate was not deleted.');
                } else {
                    console.error('Reauthentication error:', authError);
                    alert(`Authentication failed: ${authError.message}\n\nTemplate was not deleted.`);
                }
                return;
            }

            // Proceed with deletion after successful authentication
            await db.collection('subAgentTemplates').doc(id).delete();

            // Show success and reload
            setTimeout(() => {
                alert('Sub-Agent template deleted successfully!');
                loadTemplates();
            }, 500);

        } catch (error) {
            console.error('Error deleting template:', error);
            alert(`Error deleting template: ${error.message}`);
            loadTemplates();
        }
    };

})();
