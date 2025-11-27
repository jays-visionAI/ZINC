// admin-subagents.js
// SubAgent Template Management Page
// Refactored for Phase 2 Architecture Alignment

(function () {
    let templates = [];
    let filteredTemplates = [];
    let unsubscribe = null;
    const projectId = "default_project";

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

    function loadRuntimeProfiles() {
        const select = document.getElementById('subagent-profile');
        if (!select) return;

        // Runtime Profiles are global/shared, so we fetch from project level for now
        db.collection(`projects/${projectId}/runtimeProfiles`)
            .where('status', '==', 'active')
            .get()
            .then(snapshot => {
                let options = '<option value="">Select a Profile...</option>';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const costTier = data.cost_hint?.tier ? `[💰${capitalizeFirst(data.cost_hint.tier)}]` : '';
                    options += `<option value="${data.runtime_profile_id}">
                        ${data.name} (${data.provider}) - ${costTier}
                    </option>`;
                });
                select.innerHTML = options;
            })
            .catch(err => console.error("Error loading profiles:", err));
    }

    function setupEventListeners() {
        const searchInput = document.getElementById("subagent-search");
        const typeFilter = document.getElementById("filter-type");
        const statusFilter = document.getElementById("filter-status");

        if (searchInput) searchInput.addEventListener("input", handleFilters);
        if (typeFilter) typeFilter.addEventListener("change", handleFilters);
        if (statusFilter) statusFilter.addEventListener("change", handleFilters);

        // Event Delegation
        document.body.addEventListener('click', function (e) {
            if (e.target.id === 'add-subagent-btn' || e.target.closest('#add-subagent-btn')) {
                openModal();
            }
            if (e.target.id === 'modal-close' || e.target.closest('#modal-close')) {
                closeModal();
            }
            if (e.target.id === 'modal-cancel') {
                closeModal();
            }
            if (e.target.id === 'modal-save') {
                saveTemplate();
            }
            if (e.target.id === 'subagent-modal') {
                closeModal();
            }
        });
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
                    if (a.type !== b.type) return a.type.localeCompare(b.type);
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
                    <strong>${capitalizeFirst(tpl.type)}</strong>
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
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editTemplate('${tpl.id}')" class="admin-btn-icon" title="Edit">
                            ✏️
                        </button>
                        <button onclick="deleteTemplate('${tpl.id}')" class="admin-btn-icon" title="Delete" style="color: #ef4444;">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function getTypeIcon(type) {
        const icons = {
            planner: '🎯', research: '🔍', creator: '✍️',
            compliance: '⚖️', evaluator: '📊', manager: '👔', kpi_engine: '📈'
        };
        return icons[type] || '🤖';
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
        const modal = document.getElementById('subagent-modal');
        const title = document.getElementById('modal-title');

        title.textContent = isEdit ? 'Edit Template' : 'Create Sub-Agent Template';
        modal.style.display = 'flex';

        if (!isEdit) {
            document.getElementById('subagent-form').reset();
            document.getElementById('subagent-id').value = '';
            document.getElementById('subagent-version').value = '1.0.0';
        }
    }

    function closeModal() {
        const modal = document.getElementById('subagent-modal');
        modal.style.display = 'none';
        document.getElementById('subagent-form').reset();
    }

    // CRUD Operations
    window.editTemplate = async function (id) {
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

            openModal(true);
        } catch (error) {
            console.error('Error loading template:', error);
            alert(`Error: ${error.message}`);
        }
    };

    async function saveTemplate() {
        const saveBtn = document.getElementById('modal-save');
        const id = document.getElementById('subagent-id').value;
        const type = document.getElementById('subagent-type').value;
        const status = document.getElementById('subagent-status').value;
        const systemPrompt = document.getElementById('subagent-prompt').value;
        const llmModel = document.getElementById('model-llm-text').value;
        const temperature = parseFloat(document.getElementById('config-temperature').value);
        const maxTokens = parseInt(document.getElementById('config-max-tokens').value);
        const runtimeProfileId = document.getElementById('subagent-profile').value;

        if (!type || !systemPrompt) {
            alert('Please fill in required fields');
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const templateData = {
                type,
                status,
                system_prompt: systemPrompt,
                runtime_profile_id: runtimeProfileId || null,
                model_provider: {
                    llmText: { provider: 'openai', model: llmModel, enabled: false },
                    llmImage: { enabled: false },
                    embeddings: { provider: 'openai', model: 'text-embedding-ada-002' }
                },
                config: {
                    temperature,
                    maxTokens
                },
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (id) {
                // Update existing
                await db.collection('subAgentTemplates').doc(id).update(templateData);
                alert('✅ Template updated successfully!');
            } else {
                // Create new
                const newVersion = '1.0.0';
                const newId = `tpl_${type}_v${newVersion.replace(/\./g, '_')}`;

                templateData.id = newId;
                templateData.version = newVersion;
                templateData.created_at = firebase.firestore.FieldValue.serverTimestamp();
                templateData.created_by = firebase.auth().currentUser?.uid || 'system';

                await db.collection('subAgentTemplates').doc(newId).set(templateData);
                alert('✅ Template created successfully!');
            }

            closeModal();
        } catch (error) {
            console.error('Error saving template:', error);
            alert(`Error: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Template';
        }
    }

    window.deleteTemplate = async function (id) {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await db.collection('subAgentTemplates').doc(id).delete();
            alert('✅ Template deleted');
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        }
    };

})();
