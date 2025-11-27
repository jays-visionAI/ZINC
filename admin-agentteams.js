// admin-agentteams.js
// AgentSet Template Management Page
// Refactored for Phase 2 Architecture Alignment

(function () {
    let templates = [];
    let filteredTemplates = [];
    let unsubscribe = null;
    const projectId = "default_project";

    // Wizard State
    let currentStep = 1;
    let wizardData = {
        name: '',
        description: '',
        channel: 'multi-channel',
        roles: [],
        status: 'active'
    };

    // Available Sub-Agent Templates (for default selection)
    let subAgentTemplates = [];

    // Role Types (PRD 5.0 - Canonical snake_case values)
    const ROLE_TYPES = [
        { value: 'planner', label: '🎯 Planner', icon: '🎯' },
        { value: 'research', label: '🔍 Research', icon: '🔍' },
        { value: 'creator_text', label: '✍️ Creator.Text', icon: '✍️' },
        { value: 'creator_image', label: '🎨 Creator.Image', icon: '🎨' },
        { value: 'creator_video', label: '🎬 Creator.Video', icon: '🎬' },
        { value: 'engagement', label: '💬 Engagement', icon: '💬' },
        { value: 'compliance', label: '⚖️ Compliance', icon: '⚖️' },
        { value: 'evaluator', label: '📊 Evaluator', icon: '📊' },
        { value: 'manager', label: '👔 Manager', icon: '👔' },
        { value: 'kpi', label: '📈 KPI', icon: '📈' },
        { value: 'seo_watcher', label: '🔎 SEO Watcher', icon: '🔎' }
    ];

    window.initAgentteams = function (user) {
        console.log("Initializing Agent Team Templates Page...");

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        templates = [];
        filteredTemplates = [];

        loadTemplates();
        loadSubAgentTemplates();
        setupEventListeners();
    };

    function setupEventListeners() {
        const searchInput = document.getElementById("agentteam-search");
        const statusFilter = document.getElementById("filter-status");
        const createBtn = document.getElementById("add-agentteam-btn");
        const modalCloseBtn = document.getElementById("modal-close");
        const modalCancelBtn = document.getElementById("modal-cancel");
        const wizardNextBtn = document.getElementById("wizard-next");
        const wizardPrevBtn = document.getElementById("wizard-prev");
        const addRoleBtn = document.getElementById("add-role-btn");

        if (searchInput) searchInput.addEventListener("input", handleFilters);
        if (statusFilter) statusFilter.addEventListener("change", handleFilters);

        if (addRoleBtn) {
            addRoleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                addRole();
            });
        }

        // Direct binding for Create Button
        if (createBtn) {
            const newBtn = createBtn.cloneNode(true);
            createBtn.parentNode.replaceChild(newBtn, createBtn);
            newBtn.textContent = "+ Create Template"; // Update button text
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openWizard();
            });
        }

        // Modal Controls
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeWizard);
        if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeWizard);

        if (wizardNextBtn) {
            wizardNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleNextStep();
            });
        }

        if (wizardPrevBtn) {
            wizardPrevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handlePrevStep();
            });
        }
    }

    // --- Wizard Logic ---

    function openWizard() {
        console.log("Opening Template Wizard...");
        currentStep = 1;
        wizardData = { name: '', description: '', channel: 'multi-channel', roles: [], status: 'active' };

        const form = document.getElementById('agentteam-form');
        const modal = document.getElementById('agentteam-modal');

        if (!form || !modal) return;

        form.reset();
        updateWizardUI();

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('open'), 10);

        renderRoleSelection();
    }

    function closeWizard() {
        const modal = document.getElementById('agentteam-modal');
        modal.classList.remove('open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    function updateWizardUI() {
        // Update Header
        document.getElementById('wizard-step-num').textContent = currentStep;
        const titles = { 1: 'Basic Info', 2: 'Select Roles', 3: 'Review & Save' };
        document.getElementById('wizard-step-title').textContent = titles[currentStep];

        // Update Progress Bar
        const progress = (currentStep / 3) * 100;
        document.getElementById('wizard-progress').style.width = `${progress}%`;

        // Show/Hide Steps
        // Note: We need to adjust the HTML structure slightly or reuse existing steps creatively
        // Step 1: Template Info (Name, Desc) - Reusing 'step-2' (Instance Config) UI for this
        // Step 2: Role Selection - Reusing 'step-1' (Select Template) UI for this
        // Step 3: Review - Reusing 'step-3'

        // Let's dynamically adjust visibility
        document.getElementById('step-1').style.display = currentStep === 2 ? 'block' : 'none'; // Role Selection
        document.getElementById('step-2').style.display = currentStep === 1 ? 'block' : 'none'; // Basic Info
        document.getElementById('step-3').style.display = currentStep === 3 ? 'block' : 'none'; // Review

        // Update Buttons
        const prevBtn = document.getElementById('wizard-prev');
        const nextBtn = document.getElementById('wizard-next');

        prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
        nextBtn.textContent = currentStep === 3 ? 'Create Template' : 'Next Step';
    }

    function loadSubAgentTemplates() {
        db.collection('subAgentTemplates').where('status', '==', 'active').get()
            .then(snapshot => {
                subAgentTemplates = [];
                snapshot.forEach(doc => {
                    subAgentTemplates.push({ id: doc.id, ...doc.data() });
                });
            })
            .catch(err => console.error("Error loading sub-agent templates:", err));
    }

    function renderRoleSelection() {
        const list = document.getElementById('wizard-roles-list');
        if (!list) return;

        if (wizardData.roles.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5); border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px;">No roles defined. Click "+ Add Role" to start.</div>';
            return;
        }

        list.innerHTML = wizardData.roles.map((role, index) => `
            <div class="role-item" style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                    <div style="flex: 1;">
                        <label style="font-size: 11px; color: rgba(255,255,255,0.5);">Role Name</label>
                        <input type="text" class="admin-form-input" value="${role.name}" 
                            placeholder="e.g. Strategist"
                            onchange="updateRole(${index}, 'name', this.value)"
                            style="font-size: 13px; padding: 6px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 11px; color: rgba(255,255,255,0.5);">Required Type</label>
                        <select class="admin-select" style="width: 100%; font-size: 13px; padding: 6px;"
                            onchange="updateRole(${index}, 'type', this.value)">
                            ${ROLE_TYPES.map(t => `<option value="${t.value}" ${role.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
                        </select>
                    </div>
                    <button type="button" onclick="removeRole(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; align-self: center; margin-top: 14px;">&times;</button>
                </div>
                <div>
                    <label style="font-size: 11px; color: rgba(255,255,255,0.5);">Default Template (Optional)</label>
                    <select class="admin-select" style="width: 100%; font-size: 13px; padding: 6px;"
                        onchange="updateRole(${index}, 'defaultTemplateId', this.value)">
                        <option value="">-- No Default --</option>
                        ${subAgentTemplates.filter(t => t.type === role.type).map(t =>
            `<option value="${t.id}" ${role.defaultTemplateId === t.id ? 'selected' : ''}>${t.id} (v${t.version})</option>`
        ).join('')}
                    </select>
                </div>
            </div>
        `).join('');
    }

    window.addRole = function () {
        wizardData.roles.push({
            name: '',
            type: 'planner',
            defaultTemplateId: '',
            behaviourPackId: null // Phase 1 preparation
        });
        renderRoleSelection();
    };

    window.updateRole = function (index, field, value) {
        if (wizardData.roles[index]) {
            wizardData.roles[index][field] = value;
            if (field === 'type') {
                // Reset default template if type changes
                wizardData.roles[index].defaultTemplateId = '';
                renderRoleSelection(); // Re-render to update template options
            }
        }
    };

    window.removeRole = function (index) {
        wizardData.roles.splice(index, 1);
        renderRoleSelection();
    };

    function handleNextStep() {
        if (currentStep === 1) {
            // Basic Info Validation
            const name = document.getElementById('team-name').value;
            if (!name) {
                alert('Please enter a template name');
                return;
            }
            wizardData.name = name;
            wizardData.description = document.getElementById('team-description').value;
            wizardData.status = document.getElementById('team-status').value;
            currentStep++;
        } else if (currentStep === 2) {
            // Role Selection Validation
            if (wizardData.roles.length === 0) {
                alert('Please select at least one role');
                return;
            }
            renderStep3();
            currentStep++;
        } else if (currentStep === 3) {
            createTemplate();
        }
        updateWizardUI();
    }

    function handlePrevStep() {
        if (currentStep > 1) {
            currentStep--;
            updateWizardUI();
        }
    }

    function renderStep3() {
        document.getElementById('review-template').textContent = "New Template"; // Static text
        document.getElementById('review-name').textContent = wizardData.name;
        document.getElementById('review-desc').textContent = wizardData.description || 'No description';

        const list = document.getElementById('review-agents-list');
        list.innerHTML = wizardData.roles.map(role => {
            const typeObj = ROLE_TYPES.find(t => t.value === role.type);
            return `
            <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 4px; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">${typeObj?.icon || '🤖'}</span>
                    <div>
                        <span style="text-transform: capitalize; font-weight: 500; display: block;">${role.name || 'Unnamed Role'}</span>
                        <span style="font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase;">${typeObj?.label || role.type}</span>
                    </div>
                </div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.5);">
                    ${role.defaultTemplateId ? `<code style="color: #4ecdc4;">${role.defaultTemplateId}</code>` : 'No Default'}
                </div>
            </div>
        `}).join('');
    }

    async function createTemplate() {
        const btn = document.getElementById('wizard-next');
        try {
            btn.disabled = true;
            btn.textContent = 'Saving Template...';

            const timestamp = Date.now();
            const templateId = `agst_${timestamp}`; // Agent Set Template ID

            const templateData = {
                id: templateId,
                name: wizardData.name,
                description: wizardData.description,
                status: wizardData.status,
                version: '1.0.0',
                channel_type: wizardData.channel,
                roles: wizardData.roles,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: firebase.auth().currentUser?.uid || 'system'
            };

            // Save to agentSetTemplates collection (Root Level or Project Level)
            // Using root level `agentSetTemplates` as these are reusable definitions
            await db.collection('agentSetTemplates').doc(templateId).set(templateData);

            alert('✅ Template created successfully!');
            closeWizard();
        } catch (error) {
            console.error('Error creating template:', error);
            alert(`Error: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Template';
        }
    }

    // --- List Logic (Templates) ---

    function loadTemplates() {
        const tbody = document.getElementById("agentteams-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading templates...</td></tr>';

        // Listen to agentSetTemplates collection
        unsubscribe = db.collection('agentSetTemplates')
            .onSnapshot((snapshot) => {
                if (!document.getElementById("agentteams-table-body")) {
                    if (unsubscribe) unsubscribe();
                    return;
                }

                templates = [];
                snapshot.forEach(doc => {
                    templates.push({ id: doc.id, ...doc.data() });
                });

                templates.sort((a, b) => {
                    if (!a.updated_at) return 1;
                    if (!b.updated_at) return -1;
                    return b.updated_at.seconds - a.updated_at.seconds;
                });

                filteredTemplates = [...templates];
                handleFilters();
            }, (error) => {
                console.error("Error loading templates:", error);
                if (document.getElementById("agentteams-table-body")) {
                    document.getElementById("agentteams-table-body").innerHTML =
                        `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error: ${error.message}</td></tr>`;
                }
            });
    }

    function handleFilters() {
        const searchInput = document.getElementById("agentteam-search");
        const statusFilter = document.getElementById("filter-status");

        if (!searchInput || !statusFilter) return;

        const searchTerm = searchInput.value.toLowerCase();
        const selectedStatus = statusFilter.value;

        filteredTemplates = templates.filter(tpl => {
            const matchesSearch = tpl.id?.toLowerCase().includes(searchTerm) ||
                tpl.name?.toLowerCase().includes(searchTerm);
            const matchesStatus = selectedStatus === 'all' || tpl.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById("agentteams-table-body");
        if (!tbody) return;

        if (filteredTemplates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No templates found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredTemplates.map(tpl => {
            const roleCount = tpl.roles ? tpl.roles.length : 0;

            return `
            <tr style="cursor: pointer;" onclick="window.viewTemplateDetail('${tpl.id}')">
                <td>
                    <strong style="font-size: 14px;">${tpl.name}</strong>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;">
                        ID: ${tpl.id}
                    </div>
                </td>
                <td>
                    <span style="background: rgba(22, 224, 189, 0.2); padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                        v${tpl.version}
                    </span>
                </td>
                <td>
                    <span style="font-size: 13px;">
                        ${roleCount} roles
                    </span>
                </td>
                <td>
                    <span style="font-size: 13px;">
                        ${tpl.channel_type || 'General'}
                    </span>
                </td>
                <td>${getStatusBadge(tpl.status || 'active')}</td>
                <td>${formatDate(tpl.updated_at)}</td>
                <td onclick="event.stopPropagation();">
                    <div style="display: flex; gap: 8px;">
                        <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.viewTemplateDetail('${tpl.id}'); return false;" 
                                class="admin-btn-secondary">
                            View
                        </button>
                        <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.deleteTemplate('${tpl.id}'); return false;" 
                                class="admin-btn-secondary" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: rgba(239, 68, 68, 0.4);">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }

    function getStatusBadge(status) {
        const badges = {
            active: '<span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✅ Active</span>',
            draft: '<span style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">📝 Draft</span>',
            deprecated: '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">❌ Deprecated</span>'
        };
        return badges[status] || status;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    window.viewTemplateDetail = function (id) {
        alert(`Template Detail View for ${id} (Coming Soon)`);
    };

    window.deleteTemplate = async function (id) {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await db.collection('agentSetTemplates').doc(id).delete();
            alert('✅ Template deleted');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

})();
