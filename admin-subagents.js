// admin-subagents.js
// SubAgent Management Page

(function () {
    let subAgents = [];
    let filteredSubAgents = [];
    let unsubscribeSubAgents = null;
    const projectId = "default_project"; // TODO: Get from context

    window.initSubAgents = function (user) {
        console.log("Initializing Sub-Agents Page...");

        // Cleanup previous listener
        if (unsubscribeSubAgents) {
            unsubscribeSubAgents();
            unsubscribeSubAgents = null;
        }

        // Reset state
        subAgents = [];
        filteredSubAgents = [];

        loadSubAgents();
        loadRuntimeProfiles(); // Load profiles for dropdown
        setupEventListeners();
    };

    // Load Runtime Profiles for Dropdown
    function loadRuntimeProfiles() {
        const select = document.getElementById('subagent-profile');
        if (!select) return;

        db.collection(`projects/${projectId}/runtimeProfiles`)
            .where('status', '==', 'active')
            .get()
            .then(snapshot => {
                let options = '<option value="">Select a Profile...</option>';
                snapshot.forEach(doc => {
                    const data = doc.data();

                    // Visual Guardrail: Add Cost Tier and Capabilities
                    const costTier = data.cost_hint?.tier ? `[💰${capitalizeFirst(data.cost_hint.tier)}]` : '';

                    let caps = [];
                    if (data.capabilities?.chat) caps.push('💬');
                    if (data.capabilities?.vision) caps.push('👁️');
                    if (data.capabilities?.image_generation) caps.push('🎨');
                    if (data.capabilities?.embedding) caps.push('🧩');
                    const capIcons = caps.length > 0 ? `[${caps.join('')}]` : '';

                    options += `<option value="${data.runtime_profile_id}">
                        ${data.name} (${data.provider}) - ${costTier} ${capIcons}
                    </option>`;
                });
                select.innerHTML = options;
            })
            .catch(err => console.error("Error loading profiles:", err));
    }

    function setupEventListeners() {
        // Search & Filter
        const searchInput = document.getElementById("subagent-search");
        const typeFilter = document.getElementById("filter-type");
        const statusFilter = document.getElementById("filter-status");

        if (searchInput) searchInput.addEventListener("input", handleFilters);
        if (typeFilter) typeFilter.addEventListener("change", handleFilters);
        if (statusFilter) statusFilter.addEventListener("change", handleFilters);

        // Event Delegation
        document.body.addEventListener('click', function (e) {
            // Add Button
            if (e.target.id === 'add-subagent-btn' || e.target.closest('#add-subagent-btn')) {
                openModal();
            }

            // Close Button
            if (e.target.id === 'modal-close' || e.target.closest('#modal-close')) {
                closeModal();
            }

            // Cancel Button
            if (e.target.id === 'modal-cancel') {
                closeModal();
            }

            // Save Button
            if (e.target.id === 'modal-save') {
                saveSubAgent();
            }

            // Modal Background
            if (e.target.id === 'subagent-modal') {
                closeModal();
            }
        });
    }

    function loadSubAgents() {
        const tbody = document.getElementById("subagents-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading sub-agents...</td></tr>';

        // Listen to subAgents collection
        unsubscribeSubAgents = db.collection(`projects/${projectId}/subAgents`)
            .onSnapshot((snapshot) => {
                if (!document.getElementById("subagents-table-body")) {
                    if (unsubscribeSubAgents) unsubscribeSubAgents();
                    return;
                }

                subAgents = [];
                snapshot.forEach(doc => {
                    subAgents.push({ id: doc.id, ...doc.data() });
                });

                // Sort by type, then by version (desc)
                subAgents.sort((a, b) => {
                    if (a.type !== b.type) {
                        return a.type.localeCompare(b.type);
                    }
                    return compareVersions(b.version, a.version);
                });

                filteredSubAgents = [...subAgents];
                handleFilters();
            }, (error) => {
                console.error("Error loading sub-agents:", error);
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

        filteredSubAgents = subAgents.filter(agent => {
            const matchesSearch = agent.sub_agent_id?.toLowerCase().includes(searchTerm) ||
                agent.type?.toLowerCase().includes(searchTerm);
            const matchesType = selectedType === 'all' || agent.type === selectedType;
            const matchesStatus = selectedStatus === 'all' || agent.status === selectedStatus;

            return matchesSearch && matchesType && matchesStatus;
        });

        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById("subagents-table-body");
        if (!tbody) return;

        if (filteredSubAgents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No sub-agents found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredSubAgents.map(agent => `
            <tr>
                <td>
                    ${getTypeIcon(agent.type)} 
                    <strong>${capitalizeFirst(agent.type)}</strong>
                </td>
                <td>
                    <code style="font-size: 12px; color: #4ecdc4;">${agent.sub_agent_id}</code>
                </td>
                <td>
                    <span style="background: rgba(22, 224, 189, 0.2); padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                        v${agent.version}
                    </span>
                </td>
                <td>${getStatusBadge(agent.status)}</td>
                <td>
                    <span style="font-size: 12px;">
                        ${agent.model_provider?.llmText?.model || 'N/A'}
                    </span>
                </td>
                <td>${formatDate(agent.created_at)}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="viewVersionHistory('${agent.type}')" class="admin-btn-icon" title="Version History">
                            📜
                        </button>
                        <button onclick="editSubAgent('${agent.id}')" class="admin-btn-icon" title="Edit">
                            ✏️
                        </button>
                        <button onclick="updateVersion('${agent.id}')" class="admin-btn-icon" title="Create New Version">
                            🔄
                        </button>
                        <button onclick="deleteSubAgent('${agent.id}')" class="admin-btn-icon" title="Delete" style="color: #ef4444;">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Helper Functions
    function getTypeIcon(type) {
        const icons = {
            planner: '🎯',
            research: '🔍',
            creator: '✍️',
            compliance: '⚖️',
            evaluator: '📊',
            manager: '👔',
            kpi_engine: '📈'
        };
        return icons[type] || '🤖';
    }

    function getStatusBadge(status) {
        const badges = {
            active: '<span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✅ Active</span>',
            testing: '<span style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">🧪 Testing</span>',
            deprecated: '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">❌ Deprecated</span>',
            experimental: '<span style="background: rgba(168, 85, 247, 0.2); color: #a855f7; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">🔬 Experimental</span>'
        };
        return badges[status] || status;
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function compareVersions(v1, v2) {
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

        title.textContent = isEdit ? 'Edit Sub-Agent' : 'Add New Sub-Agent';
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
    window.editSubAgent = async function (id) {
        try {
            const doc = await db.collection(`projects/${projectId}/subAgents`).doc(id).get();
            if (!doc.exists) {
                alert('Sub-Agent not found');
                return;
            }

            const agent = doc.data();

            document.getElementById('subagent-id').value = id;
            document.getElementById('subagent-type').value = agent.type;
            document.getElementById('subagent-version').value = agent.version;
            document.getElementById('subagent-status').value = agent.status;
            document.getElementById('subagent-prompt').value = agent.system_prompt || '';
            document.getElementById('model-llm-text').value = agent.model_provider?.llmText?.model || 'gpt-4';
            document.getElementById('config-temperature').value = agent.config?.temperature || 0.7;
            document.getElementById('config-max-tokens').value = agent.config?.maxTokens || 2000;
            document.getElementById('subagent-profile').value = agent.runtime_profile_id || ''; // Set Profile
            document.getElementById('parent-version').value = agent.version; // 원본 버전 저장

            openModal(true);
        } catch (error) {
            console.error('Error loading sub-agent:', error);
            alert(`Error: ${error.message}`);
        }
    };

    async function saveSubAgent() {
        const saveBtn = document.getElementById('modal-save');
        const id = document.getElementById('subagent-id').value;
        const type = document.getElementById('subagent-type').value;
        const status = document.getElementById('subagent-status').value;
        const systemPrompt = document.getElementById('subagent-prompt').value;
        const llmModel = document.getElementById('model-llm-text').value;
        const temperature = parseFloat(document.getElementById('config-temperature').value);
        const maxTokens = parseInt(document.getElementById('config-max-tokens').value);
        const runtimeProfileId = document.getElementById('subagent-profile').value;
        const changelog = document.getElementById('subagent-changelog').value;

        if (!type || !systemPrompt) {
            alert('Please fill in required fields');
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            if (id) {
                // UPDATE: Create new version
                const parentVersion = document.getElementById('parent-version').value;

                if (!changelog) {
                    alert('Please provide a change log for version update');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Sub-Agent';
                    return;
                }

                const oldAgentId = id;
                const updates = {
                    system_prompt: systemPrompt,
                    status: status,
                    runtime_profile_id: runtimeProfileId || null, // Save Profile ID
                    model_provider: {
                        llmText: { provider: 'openai', model: llmModel, enabled: false },
                        llmImage: { enabled: false },
                        embeddings: { provider: 'openai', model: 'text-embedding-ada-002' }
                    },
                    config: {
                        temperature,
                        maxTokens
                    }
                };

                const result = await updateSubAgentVersion(oldAgentId, updates, changelog, 'minor');
                console.log('Version update result:', result);
                alert(`✅ New version created: ${result.newVersion}`);
            } else {
                // CREATE: New sub-agent
                const newVersion = '1.0.0';
                const newId = `${type}_v${newVersion.replace(/\./g, '_')}`;

                const newAgent = {
                    sub_agent_id: newId,
                    type,
                    version: newVersion,
                    parent_version: null,
                    agent_set_id: null,
                    system_prompt: systemPrompt,
                    model_provider: {
                        llmText: { provider: 'openai', model: llmModel, enabled: false },
                        llmImage: { enabled: false },
                        embeddings: { provider: 'openai', model: 'text-embedding-ada-002' }
                    },
                    config: {
                        temperature,
                        maxTokens
                    },
                    runtime_profile_id: runtimeProfileId || null, // Save Profile ID
                    output_schema_version: 1,
                    status,
                    change_log: changelog || 'Initial version',
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                    created_by: firebase.auth().currentUser?.uid || 'system'
                };

                await db.collection(`projects/${projectId}/subAgents`).doc(newId).set(newAgent);
                alert('✅ Sub-Agent created successfully!');
            }

            closeModal();
        } catch (error) {
            console.error('Error saving sub-agent:', error);
            alert(`Error: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Sub-Agent';
        }
    }

    window.updateVersion = async function (id) {
        const changelog = prompt('Enter change description for new version:');
        if (!changelog) return;

        try {
            const result = await updateSubAgentVersion(id, {}, changelog, 'minor');
            alert(`✅ New version created: ${result.newVersion}`);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    window.deleteSubAgent = async function (id) {
        if (!confirm('Are you sure you want to deprecate this sub-agent?')) return;

        try {
            await db.collection(`projects/${projectId}/subAgents`).doc(id).update({
                status: 'deprecated',
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('✅ Sub-Agent marked as deprecated');
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        }
    };

    window.viewVersionHistory = async function (agentType) {
        const modal = document.getElementById('version-history-modal');
        const content = document.getElementById('version-history-content');

        modal.style.display = 'flex';
        content.innerHTML = 'Loading...';

        try {
            const versions = await getSubAgentVersions(agentType);

            content.innerHTML = versions.map(v => `
                <div style="border: 1px solid rgba(255,255,255,0.1); padding: 16px; margin-bottom: 12px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <strong>v${v.version}</strong>
                        ${getStatusBadge(v.status)}
                    </div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">
                        ID: <code>${v.sub_agent_id}</code>
                    </div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.8);">
                        ${v.change_log}
                    </div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 8px;">
                        Created: ${formatDate(v.created_at)}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            content.innerHTML = `<p style="color: #ef4444;">Error: ${error.message}</p>`;
        }
    };

    window.closeVersionHistory = function () {
        document.getElementById('version-history-modal').style.display = 'none';
    };

})();
