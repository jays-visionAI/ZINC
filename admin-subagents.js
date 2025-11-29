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
    const ENGINE_TYPES = {
        planner: {
            canonical: 'planner',
            label: 'Planner',
            icon: '🎯',
            description: 'Strategic content planning'
        },
        research: {
            canonical: 'research',
            label: 'Research',
            icon: '🔍',
            description: 'Market analysis'
        },
        creator_text: {
            canonical: 'creator_text',
            label: 'Creator.Text',
            icon: '✍️',
            description: 'Text generation'
        },
        creator_image: {
            canonical: 'creator_image',
            label: 'Creator.Image',
            icon: '🎨',
            description: 'Image generation'
        },
        creator_video: {
            canonical: 'creator_video',
            label: 'Creator.Video',
            icon: '🎬',
            description: 'Video generation'
        },
        engagement: {
            canonical: 'engagement',
            label: 'Engagement',
            icon: '💬',
            description: 'Reply & Interaction'
        },
        compliance: {
            canonical: 'compliance',
            label: 'Compliance',
            icon: '⚖️',
            description: 'Fact checking & Safety'
        },
        evaluator: {
            canonical: 'evaluator',
            label: 'Evaluator',
            icon: '📊',
            description: 'Quality assessment'
        },
        manager: {
            canonical: 'manager',
            label: 'Manager',
            icon: '👔',
            description: 'Final approval'
        },
        kpi: {
            canonical: 'kpi',
            label: 'KPI',
            icon: '📈',
            description: 'Performance optimization'
        },
        seo_watcher: {
            canonical: 'seo_watcher',
            label: 'SEO Watcher',
            icon: '🔎',
            description: 'SEO policy monitoring'
        },
        knowledge_curator: {
            canonical: 'knowledge_curator',
            label: 'Knowledge Curator',
            icon: '📚',
            description: 'Brand memory & knowledge management'
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

    window.initSubagents = function (user) {
        console.log("Initializing Sub-Agent Templates Page...");

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        templates = [];
        filteredTemplates = [];

        loadTemplates();
        loadRuntimeProfiles();
        setupEventListeners();
    };

    // --- v2.0 Helpers ---

    function populateMetadataDropdowns() {
        const roleSelect = document.getElementById('subagent-role');
        const langSelect = document.getElementById('subagent-language');

        if (!roleSelect || !langSelect) return;

        // Clear existing
        roleSelect.innerHTML = '<option value="">Select Role Type...</option>';
        langSelect.innerHTML = '<option value="">Select Language...</option>';

        if (window.RuntimeProfileUtils) {
            window.RuntimeProfileUtils.ROLE_TYPES.forEach(role => {
                const option = document.createElement('option');
                option.value = role;
                option.textContent = role;
                roleSelect.appendChild(option);
            });

            window.RuntimeProfileUtils.LANGUAGES.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang;
                option.textContent = lang.toUpperCase();
                langSelect.appendChild(option);
            });
        }
    }

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
                    const typeA = a.type || '';
                    const typeB = b.type || '';
                    if (typeA !== typeB) return typeA.localeCompare(typeB);
                    return compareVersions(b.version, a.version);
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
            document.getElementById('subagent-profile').value = tpl.runtime_profile_id || '';

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

            const data = {
                type: type,
                status: document.getElementById('subagent-status').value,
                system_prompt: document.getElementById('subagent-prompt').value,

                // v2.0 Fields
                role_type: document.getElementById('subagent-role').value,
                primary_language: document.getElementById('subagent-language').value,
                runtime_profile_id: document.getElementById('subagent-profile').value,

                config: {
                    temperature: parseFloat(document.getElementById('config-temperature').value),
                    maxTokens: parseInt(document.getElementById('config-max-tokens').value)
                },
                model_provider: {
                    provider: 'openai', // Default for now
                    model: document.getElementById('model-llm-text').value
                },
                channel_adapters: currentAdapters,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (id) {
                await db.collection('subAgentTemplates').doc(id).update(data);
            } else {
                // Generate ID: tpl_{type}_v{version}
                const version = '1.0.0';
                const newId = `tpl_${type}_v${version.replace(/\./g, '_')}_${Date.now().toString().slice(-4)}`;
                data.id = newId;
                data.version = version;
                data.created_at = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('subAgentTemplates').doc(newId).set(data);
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
