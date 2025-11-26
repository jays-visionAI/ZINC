// admin-agentteam-detail.js
// AgentSet Detail Page with SubAgent Management

(function () {
    let currentTeamId = null;
    let currentTeam = null;
    let availableSubAgents = {};
    const projectId = "default_project";

    window.initAgentteamdetail = function (user) {
        console.log("Initializing Agent Team Detail Page... (Debug Mode)");

        // Extract team ID from hash
        const hash = window.location.hash;
        console.log("Current Hash:", hash);

        const match = hash.match(/agentteam-detail\/(.+)/);

        if (!match) {
            console.error("No team ID in URL");
            return;
        }

        currentTeamId = match[1];
        console.log("Extracted Team ID:", currentTeamId);
        loadTeamDetail();
    };

    async function loadTeamDetail() {
        console.log("Starting loadTeamDetail for ID:", currentTeamId);
        try {
            // Load team data
            console.log("Fetching team document...");
            const teamDoc = await db.collection(`projects/${projectId}/agentSets`).doc(currentTeamId).get();
            console.log("Team document fetched. Exists:", teamDoc.exists);

            if (!teamDoc.exists) {
                console.error("Team document does not exist!");
                alert('Team not found');
                window.location.hash = 'agentteams';
                return;
            }

            currentTeam = { id: teamDoc.id, ...teamDoc.data() };
            console.log("Current Team Data:", currentTeam);

            // Load all available SubAgents
            console.log("Fetching available sub-agents...");
            const subAgentsSnapshot = await db.collection(`projects/${projectId}/subAgents`)
                .where("status", "==", "active")
                .get();
            console.log("Sub-agents fetched. Count:", subAgentsSnapshot.size);

            availableSubAgents = {};
            subAgentsSnapshot.forEach(doc => {
                const agent = doc.data();
                if (!availableSubAgents[agent.type]) {
                    availableSubAgents[agent.type] = [];
                }
                availableSubAgents[agent.type].push({ id: doc.id, ...agent });
            });

            // Sort by version desc
            Object.keys(availableSubAgents).forEach(type => {
                availableSubAgents[type].sort((a, b) => compareVersions(b.version, a.version));
            });

            console.log("Rendering team detail...");
            renderTeamDetail();
            console.log("Rendering sub-agents...");
            renderSubAgents();
            console.log("Render complete.");
        } catch (error) {
            console.error("Error loading team:", error);
            alert(`Error: ${error.message}`);
        }
    }

    function renderTeamDetail() {
        document.getElementById('team-name').textContent = currentTeam.agent_set_name || currentTeam.agent_set_id;
        document.getElementById('team-version').textContent = `v${currentTeam.agent_set_version}`;
        document.getElementById('team-status').innerHTML = getStatusBadge(currentTeam.status || 'active');
        document.getElementById('team-description').textContent = currentTeam.description || 'No description';
        document.getElementById('team-id').textContent = currentTeam.agent_set_id;
        document.getElementById('team-created').textContent = formatDate(currentTeam.created_at);
        document.getElementById('team-updated').textContent = formatDate(currentTeam.updated_at);
    }

    function renderSubAgents() {
        const grid = document.getElementById('subagents-grid');

        const roles = [
            { key: 'planner', icon: '🎯', name: 'Planner', desc: 'Strategic content planning' },
            { key: 'research', icon: '🔍', name: 'Research', desc: 'Market & trend analysis' },
            { key: 'creator', icon: '✍️', name: 'Creator', desc: 'Content generation' },
            { key: 'compliance', icon: '⚖️', name: 'Compliance', desc: 'Fact checking & legal' },
            { key: 'evaluator', icon: '📊', name: 'Evaluator', desc: 'Quality assessment' },
            { key: 'manager', icon: '👔', name: 'Manager', desc: 'Final approval' },
            { key: 'kpi_engine', icon: '📈', name: 'KPI Engine', desc: 'Performance optimization' }
        ];

        grid.innerHTML = roles.map(role => {
            const subAgentId = currentTeam.active_sub_agents?.[role.key];
            const isAssigned = !!subAgentId;

            if (!isAssigned) {
                return `
                <div style="background: rgba(255,255,255,0.03); border: 2px dashed rgba(255,255,255,0.2); padding: 20px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">
                                ${role.icon} ${role.name}
                            </div>
                            <div style="font-size: 12px; color: rgba(255,255,255,0.5);">
                                ${role.desc}
                            </div>
                        </div>
                        <button onclick="assignSubAgentToRole('${role.key}')" class="admin-btn-secondary" style="font-size: 12px;">
                            + Assign
                        </button>
                    </div>
                </div>
                `;
            }

            // Find agent details
            const agentData = findSubAgentById(subAgentId);

            return `
            <div style="background: rgba(22, 224, 189, 0.1); border: 2px solid rgba(22, 224, 189, 0.3); padding: 20px; border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 16px; font-weight: 600;">
                                ${role.icon} ${role.name}
                            </span>
                            <span style="background: rgba(22, 224, 189, 0.2); padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                                v${agentData?.version || '?'}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 8px;">
                            ${role.desc}
                        </div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.4);">
                            ID: ${subAgentId}
                        </div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px;">
                            Model: ${agentData?.model_provider?.llmText?.model || 'N/A'}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editSubAgentInline('${role.key}', '${subAgentId}')" class="admin-btn-icon" title="Edit">
                            ✏️
                        </button>
                        <button onclick="changeSubAgentVersion('${role.key}')" class="admin-btn-icon" title="Change Version">
                            🔄
                        </button>
                        <button onclick="removeSubAgent('${role.key}')" class="admin-btn-icon" title="Remove" style="color: #ef4444;">
                            ✖️
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    function findSubAgentById(id) {
        for (const type in availableSubAgents) {
            const found = availableSubAgents[type].find(a => a.id === id);
            if (found) return found;
        }
        return null;
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

    // SubAgent Assignment
    window.assignSubAgent = function () {
        document.getElementById('assign-subagent-modal').style.display = 'flex';
        updateSubAgentOptions();
    };

    window.assignSubAgentToRole = function (role) {
        document.getElementById('assign-role').value = role;
        document.getElementById('assign-subagent-modal').style.display = 'flex';
        updateSubAgentOptions();
    };

    function updateSubAgentOptions() {
        const role = document.getElementById('assign-role').value;
        const select = document.getElementById('assign-subagent');

        const agents = availableSubAgents[role] || [];

        if (agents.length === 0) {
            select.innerHTML = '<option value="">No available agents for this role</option>';
            return;
        }

        select.innerHTML = agents.map(agent =>
            `<option value="${agent.id}">v${agent.version} - ${agent.id} (${agent.model_provider?.llmText?.model || 'N/A'})</option>`
        ).join('');

        // Auto-select first (latest version)
        select.selectedIndex = 0;
    }

    window.confirmAssign = async function () {
        const role = document.getElementById('assign-role').value;
        const subAgentId = document.getElementById('assign-subagent').value;

        if (!subAgentId) {
            alert('Please select a sub-agent');
            return;
        }

        try {
            await updateAgentSetSubAgent(currentTeamId, role, subAgentId);
            alert(`✅ Assigned ${subAgentId} to ${role}`);
            closeAssignModal();
            loadTeamDetail(); // Reload
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    window.closeAssignModal = function () {
        document.getElementById('assign-subagent-modal').style.display = 'none';
    };

    // Edit SubAgent (Create New Version)
    window.editSubAgentInline = async function (role, currentId) {
        try {
            const agentDoc = await db.collection(`projects/${projectId}/subAgents`).doc(currentId).get();
            if (!agentDoc.exists) {
                alert('Agent not found');
                return;
            }

            const agent = agentDoc.data();

            document.getElementById('edit-current-id').value = currentId;
            document.getElementById('edit-role').value = role;
            document.getElementById('edit-prompt').value = agent.system_prompt || '';
            document.getElementById('edit-model').value = agent.model_provider?.llmText?.model || 'gpt-4';
            document.getElementById('edit-temperature').value = agent.config?.temperature || 0.7;
            document.getElementById('edit-changelog').value = '';

            document.getElementById('edit-subagent-modal').style.display = 'flex';
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    window.confirmEdit = async function () {
        const currentId = document.getElementById('edit-current-id').value;
        const role = document.getElementById('edit-role').value;
        const prompt = document.getElementById('edit-prompt').value;
        const model = document.getElementById('edit-model').value;
        const temperature = parseFloat(document.getElementById('edit-temperature').value);
        const changelog = document.getElementById('edit-changelog').value;

        if (!changelog) {
            alert('Please provide a change log');
            return;
        }

        try {
            const updates = {
                system_prompt: prompt,
                model_provider: {
                    llmText: { provider: 'openai', model: model, enabled: false }
                },
                config: { temperature, maxTokens: 2000 }
            };

            const result = await updateSubAgentVersion(currentId, updates, changelog, 'minor');

            // Auto-assign new version to team
            await updateAgentSetSubAgent(currentTeamId, role, result.newAgentId);

            alert(`✅ New version created: ${result.newVersion}\n✅ Assigned to team`);
            closeEditModal();
            loadTeamDetail(); // Reload
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    window.closeEditModal = function () {
        document.getElementById('edit-subagent-modal').style.display = 'none';
    };

    window.changeSubAgentVersion = function (role) {
        // Shortcut to assign modal
        assignSubAgentToRole(role);
    };

    window.removeSubAgent = async function (role) {
        if (!confirm(`Remove ${role} from this team?`)) return;

        try {
            const updates = { ...currentTeam.active_sub_agents };
            delete updates[role];

            await db.collection(`projects/${projectId}/agentSets`).doc(currentTeamId).update({
                active_sub_agents: updates,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert(`✅ ${role} removed`);
            loadTeamDetail(); // Reload
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // Team Info Edit
    window.editTeamInfo = function () {
        const newName = prompt('New team name:', currentTeam.agent_set_name);
        if (!newName) return;

        db.collection(`projects/${projectId}/agentSets`).doc(currentTeamId).update({
            agent_set_name: newName,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert('✅ Team name updated');
            loadTeamDetail();
        }).catch(error => {
            alert(`Error: ${error.message}`);
        });
    };

    window.viewTeamHistory = async function () {
        try {
            const history = await getAgentSetHistory(currentTeamId);

            if (history.length === 0) {
                alert('No history found');
                return;
            }

            let message = `Version History:\n\n`;
            history.forEach(h => {
                message += `v${h.version} ← v${h.previous_version}\n`;
                message += `  ${h.change_reason}\n\n`;
            });

            alert(message);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // Helper Functions
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
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // Listen for role select change
    document.addEventListener('DOMContentLoaded', () => {
        const roleSelect = document.getElementById('assign-role');
        if (roleSelect) {
            roleSelect.addEventListener('change', updateSubAgentOptions);
        }
    });

})();
