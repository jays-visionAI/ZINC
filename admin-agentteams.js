// admin-agentteams.js
// AgentSet (Team) Management Page with Template Wizard

(function () {
    let agentTeams = [];
    let filteredTeams = [];
    let unsubscribeTeams = null;
    const projectId = "default_project";

    // Wizard State
    let currentStep = 1;
    let wizardData = {
        templateId: null,
        template: null,
        name: '',
        description: '',
        status: 'active'
    };

    // Mock Templates (Phase 2.5)
    // In Phase 4, these will come from `agentSetTemplates` collection
    const MOCK_TEMPLATES = [
        {
            id: 'agst_full_marketing_v1',
            name: 'Full Marketing Team',
            version: '2.0.0',
            description: 'Complete 12-agent team for comprehensive marketing operations.',
            channel: 'multi-channel',
            roles: [
                { role: 'manager', category: 'manager' },
                { role: 'planner', category: 'planner' },
                { role: 'research', category: 'planner' },
                { role: 'creator_text', category: 'creator' },
                { role: 'creator_image', category: 'creator' },
                { role: 'creator_video', category: 'creator' },
                { role: 'compliance', category: 'manager' },
                { role: 'engagement', category: 'manager' },
                { role: 'evaluator', category: 'manager' },
                { role: 'kpi_engine', category: 'manager' }
            ]
        },
        {
            id: 'agst_content_creation_v1',
            name: 'Content Creation Squad',
            version: '2.0.0',
            description: 'Focused on high-quality content production (Text, Image, Video).',
            channel: 'content-only',
            roles: [
                { role: 'manager', category: 'manager' },
                { role: 'planner', category: 'planner' },
                { role: 'creator_text', category: 'creator' },
                { role: 'creator_image', category: 'creator' },
                { role: 'creator_video', category: 'creator' },
                { role: 'compliance', category: 'manager' }
            ]
        },
        {
            id: 'agst_social_growth_v1',
            name: 'Social Growth Team',
            version: '2.0.0',
            description: 'Optimized for engagement and community growth.',
            channel: 'social',
            roles: [
                { role: 'manager', category: 'manager' },
                { role: 'planner', category: 'planner' },
                { role: 'creator_text', category: 'creator' },
                { role: 'engagement', category: 'manager' },
                { role: 'evaluator', category: 'manager' },
                { role: 'kpi_engine', category: 'manager' }
            ]
        }
    ];

    window.initAgentteams = function (user) {
        console.log("Initializing Agent Teams Page... (v2.1 - Debug)");

        if (unsubscribeTeams) {
            unsubscribeTeams();
            unsubscribeTeams = null;
        }

        agentTeams = [];
        filteredTeams = [];

        loadAgentTeams();
        setupEventListeners();
    };

    function setupEventListeners() {
        console.log("Setting up event listeners...");

        const searchInput = document.getElementById("agentteam-search");
        const statusFilter = document.getElementById("filter-status");
        const createBtn = document.getElementById("add-agentteam-btn");
        const modalCloseBtn = document.getElementById("modal-close");
        const modalCancelBtn = document.getElementById("modal-cancel");
        const wizardNextBtn = document.getElementById("wizard-next");
        const wizardPrevBtn = document.getElementById("wizard-prev");

        if (searchInput) searchInput.addEventListener("input", handleFilters);
        if (statusFilter) statusFilter.addEventListener("change", handleFilters);

        // Direct binding for Create Button
        if (createBtn) {
            console.log("Create Button Found, attaching listener.");
            // Remove old listener if possible (cloneNode trick to strip listeners)
            const newBtn = createBtn.cloneNode(true);
            createBtn.parentNode.replaceChild(newBtn, createBtn);

            newBtn.addEventListener('click', (e) => {
                console.log("Create Team Button Clicked (Direct)!");
                e.preventDefault();
                e.stopPropagation();
                openWizard();
            });
        } else {
            console.error("Create Button NOT found!");
        }

        // Modal Controls
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeWizard();
        });
        if (modalCancelBtn) modalCancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeWizard();
        });

        if (wizardNextBtn) {
            wizardNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Next Step Button Clicked!");
                handleNextStep();
            });
        }

        if (wizardPrevBtn) {
            wizardPrevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePrevStep();
            });
        }

        // Modal Background Click (Delegation is fine here as fallback)
        const modal = document.getElementById('agentteam-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeWizard();
            });
        }
    }

    // --- Wizard Logic ---

    function openWizard() {
        console.log("Opening Wizard...");
        currentStep = 1;
        wizardData = { templateId: null, template: null, name: '', description: '', status: 'active' };

        const form = document.getElementById('agentteam-form');
        const modal = document.getElementById('agentteam-modal');

        if (!form || !modal) {
            console.error("Critical Error: Modal or Form not found in DOM!");
            return;
        }

        // Reset Form
        form.reset();
        document.getElementById('agentteam-id').value = '';

        updateWizardUI();

        modal.style.display = 'flex';
        // Small delay to allow display:flex to apply before adding opacity class for transition
        setTimeout(() => {
            modal.classList.add('open');
            console.log("Modal class 'open' added.");
        }, 10);

        // Render Templates
        renderTemplates();
    }

    function closeWizard() {
        const modal = document.getElementById('agentteam-modal');
        modal.classList.remove('open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Wait for transition
    }

    function updateWizardUI() {
        // Update Header
        document.getElementById('wizard-step-num').textContent = currentStep;
        const titles = { 1: 'Select Template', 2: 'Instance Config', 3: 'Review & Create' };
        document.getElementById('wizard-step-title').textContent = titles[currentStep];

        // Update Progress Bar
        const progress = (currentStep / 3) * 100;
        document.getElementById('wizard-progress').style.width = `${progress}%`;

        // Show/Hide Steps
        [1, 2, 3].forEach(step => {
            document.getElementById(`step-${step}`).style.display = step === currentStep ? 'block' : 'none';
        });

        // Update Buttons
        const prevBtn = document.getElementById('wizard-prev');
        const nextBtn = document.getElementById('wizard-next');

        prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
        nextBtn.textContent = currentStep === 3 ? 'Create Team' : 'Next Step';
    }

    function renderTemplates() {
        const grid = document.getElementById('wizard-templates-grid');
        grid.innerHTML = MOCK_TEMPLATES.map(tpl => `
            <div class="template-card ${wizardData.templateId === tpl.id ? 'selected' : ''}" 
                 onclick="selectTemplate('${tpl.id}')"
                 style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">${tpl.channel}</span>
                    <span style="color: rgba(255,255,255,0.5); font-size: 12px;">v${tpl.version}</span>
                </div>
                <h4 style="margin: 0 0 8px 0; font-size: 16px;">${tpl.name}</h4>
                <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 16px; line-height: 1.4;">${tpl.description}</p>
                <div style="font-size: 12px; color: rgba(255,255,255,0.4);">
                    Includes: ${tpl.roles.map(r => r.role).join(', ')}
                </div>
            </div>
        `).join('');

        // Add styles for selection
        const style = document.createElement('style');
        style.innerHTML = `
            .template-card:hover { background: rgba(255,255,255,0.1) !important; }
            .template-card.selected { 
                border-color: #16e0bd !important; 
                background: rgba(22, 224, 189, 0.1) !important;
            }
        `;
        document.head.appendChild(style);
    }

    window.selectTemplate = function (tplId) {
        wizardData.templateId = tplId;
        wizardData.template = MOCK_TEMPLATES.find(t => t.id === tplId);
        renderTemplates(); // Re-render to show selection
    };

    function handleNextStep() {
        if (currentStep === 1) {
            if (!wizardData.templateId) {
                alert('Please select a template');
                return;
            }
            // Pre-fill name based on template
            if (!document.getElementById('team-name').value) {
                document.getElementById('team-name').value = `${wizardData.template.name} (Instance)`;
            }
            document.getElementById('selected-template-display').textContent = wizardData.template.name;

            currentStep++;
        } else if (currentStep === 2) {
            const name = document.getElementById('team-name').value;
            if (!name) {
                alert('Please enter a team name');
                return;
            }
            wizardData.name = name;
            wizardData.description = document.getElementById('team-description').value;
            wizardData.status = document.getElementById('team-status').value;

            renderStep3();
            currentStep++;
        } else if (currentStep === 3) {
            createAgentTeam();
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
        document.getElementById('review-template').textContent = wizardData.template.name;
        document.getElementById('review-name').textContent = wizardData.name;
        document.getElementById('review-desc').textContent = wizardData.description || 'No description';
        // Note: review-status element doesn't exist in HTML, so removed

        const list = document.getElementById('review-agents-list');
        list.innerHTML = wizardData.template.roles.map(item => `
            <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 4px; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">${getRoleIcon(item.role)}</span>
                    <div>
                        <span style="text-transform: capitalize; font-weight: 500; display: block;">${item.role}</span>
                        <span style="font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase;">${item.category}</span>
                    </div>
                </div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.5);">
                    New Instance
                </div>
            </div>
        `).join('');
    }

    function getRoleIcon(role) {
        const icons = {
            manager: '👔', planner: '📅', research: '🔍',
            creator_text: '✍️', creator_image: '🎨', creator_video: '🎬',
            compliance: '⚖️', engagement: '💬', evaluator: '📊',
            kpi_engine: '📈', seo_watcher: '🕷️', event_router: '🔀'
        };
        return icons[role] || '🤖';
    }

    async function createAgentTeam() {
        const btn = document.getElementById('wizard-next');
        try {
            btn.disabled = true;
            btn.textContent = 'Creating Instances...';

            const timestamp = Date.now();
            const agentSetId = `team_${timestamp}`;
            const agentSetVersion = '1.0.0';

            // 1. Create SubAgent Instances
            const subAgentMap = {};
            const batch = db.batch(); // Use batch for atomicity

            for (const item of wizardData.template.roles) {
                const subAgentId = `sa_${item.role}_${timestamp}`;
                const subAgentRef = db.collection(`projects/${projectId}/subAgents`).doc(subAgentId);

                const subAgentData = {
                    sub_agent_id: subAgentId,
                    role: item.role,
                    category: item.category, // Save category for orchestration
                    type: item.role, // Legacy support
                    project_id: projectId,
                    agent_set_id: agentSetId,
                    template_id: `tpl_${item.role}_default`, // Mock template ID
                    template_version: '1.0.0',
                    instance_version: '1.0.0',
                    status: 'active',
                    instance_config: {
                        // Default config would come from template
                        created_via: 'wizard_template_mode'
                    },
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                };

                batch.set(subAgentRef, subAgentData);
                subAgentMap[item.role] = subAgentId;
            }

            // 2. Create AgentSet Instance
            const agentSetRef = db.collection(`projects/${projectId}/agentSets`).doc(agentSetId);
            const agentSetData = {
                agent_set_id: agentSetId,
                agent_set_name: wizardData.name,
                description: wizardData.description,
                status: wizardData.status,
                agent_set_version: agentSetVersion,
                agent_set_template_id: wizardData.templateId,
                active_sub_agents: subAgentMap, // Map role -> subAgentId
                channel_type: wizardData.template.channel,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: firebase.auth().currentUser?.uid || 'system'
            };

            batch.set(agentSetRef, agentSetData);

            // 3. Commit Batch
            await batch.commit();

            // Record History (Optional, can be done after batch)
            await recordAgentSetHistory(agentSetId, null, agentSetVersion, `Created from template: ${wizardData.template.name}`);

            alert('✅ Team and Sub-Agents created successfully!');
            closeWizard();
        } catch (error) {
            console.error('Error creating team:', error);
            alert(`Error: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Team';
        }
    }

    // --- Existing List Logic (Unchanged) ---
    function loadAgentTeams() {
        const tbody = document.getElementById("agentteams-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading agent teams...</td></tr>';

        unsubscribeTeams = db.collection(`projects/${projectId}/agentSets`)
            .onSnapshot((snapshot) => {
                if (!document.getElementById("agentteams-table-body")) {
                    if (unsubscribeTeams) unsubscribeTeams();
                    return;
                }

                agentTeams = [];
                snapshot.forEach(doc => {
                    agentTeams.push({ id: doc.id, ...doc.data() });
                });

                agentTeams.sort((a, b) => {
                    if (!a.updated_at) return 1;
                    if (!b.updated_at) return -1;
                    return b.updated_at.seconds - a.updated_at.seconds;
                });

                filteredTeams = [...agentTeams];
                handleFilters();
            }, (error) => {
                console.error("Error loading agent teams:", error);
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

        filteredTeams = agentTeams.filter(team => {
            const matchesSearch = team.agent_set_id?.toLowerCase().includes(searchTerm) ||
                team.agent_set_name?.toLowerCase().includes(searchTerm);
            const matchesStatus = selectedStatus === 'all' || team.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById("agentteams-table-body");
        if (!tbody) return;

        if (filteredTeams.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No agent teams found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredTeams.map(team => {
            const subAgentCount = team.active_sub_agents ? Object.keys(team.active_sub_agents).length : 0;
            const projectCount = 0;

            return `
            <tr style="cursor: pointer;" onclick="window.viewTeamDetail('${team.id}')">
                <td>
                    <strong style="font-size: 14px;">${team.agent_set_name || team.agent_set_id}</strong>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;">
                        ID: ${team.agent_set_id}
                    </div>
                </td>
                <td>
                    <span style="background: rgba(22, 224, 189, 0.2); padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                        v${team.agent_set_version}
                    </span>
                </td>
                <td>
                    <span style="font-size: 13px;">
                        ${subAgentCount} agents
                    </span>
                </td>
                <td>
                    <span style="font-size: 13px;">
                        ${team.channel_type || '-'}
                    </span>
                </td>
                <td>${getStatusBadge(team.status || 'active')}</td>
                <td>${formatDate(team.updated_at)}</td>
                <td onclick="event.stopPropagation();">
                    <div style="display: flex; gap: 8px;">
                        <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.viewTeamDetail('${team.id}'); return false;" 
                                style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                                onmouseover="this.style.background='rgba(59, 130, 246, 0.3)'" 
                                onmouseout="this.style.background='rgba(59, 130, 246, 0.2)'">
                            View
                        </button>
                        <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.viewHistory('${team.id}'); return false;" 
                                style="background: rgba(168, 85, 247, 0.2); color: #a78bfa; border: 1px solid rgba(168, 85, 247, 0.4); padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                                onmouseover="this.style.background='rgba(168, 85, 247, 0.3)'" 
                                onmouseout="this.style.background='rgba(168, 85, 247, 0.2)'">
                            History
                        </button>
                        <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.deleteTeam('${team.id}'); return false;" 
                                style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                                onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'" 
                                onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'">
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
            testing: '<span style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">🧪 Testing</span>',
            deprecated: '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">❌ Deprecated</span>'
        };
        return badges[status] || status;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    window.viewTeamDetail = function (teamId) {
        window.location.hash = `agentteam-detail/${teamId}`;
    };

    window.viewHistory = async function (teamId) {
        try {
            const history = await getAgentSetHistory(teamId);
            if (history.length === 0) {
                alert('No history found for this team');
                return;
            }
            let message = `Version History for ${teamId}:\n\n`;
            history.forEach(h => {
                message += `v${h.version} ← v${h.previous_version}\n`;
                message += `  ${h.change_reason}\n`;
                message += `  ${formatDate(h.updated_at)}\n\n`;
            });
            alert(message);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    window.deleteTeam = async function (teamId) {
        if (!confirm('Mark this team as deprecated?')) return;
        try {
            await db.collection(`projects/${projectId}/agentSets`).doc(teamId).update({
                status: 'deprecated',
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('✅ Team marked as deprecated');
        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        }
    };

})();
