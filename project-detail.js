// project-detail.js
// Mission Control Logic

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    let currentUser = null;

    if (!projectId) {
        alert("No project ID specified.");
        window.location.href = "command-center.html";
        return;
    }

    // Deployment Wizard State
    let deployStep = 1;
    let deployData = {
        channelId: '',
        channelName: '',
        templateId: '',
        templateName: '',
        roles: []
    };
    let channelProfiles = [];
    let teamTemplates = [];

    // 🔹 Auth Check
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }
        currentUser = user;
        loadProjectData(projectId);
    });

    async function loadProjectData(id) {
        try {
            const doc = await db.collection("projects").doc(id).get();
            if (!doc.exists) {
                alert("Project not found.");
                window.location.href = "command-center.html";
                return;
            }

            const project = doc.data();
            renderProjectInfo(project);

            // Load Agent Swarm (Active Deployments)
            loadAgentSwarm(id);

            // Load KPIs (using project data for now)
            renderKPIs(project);

            setupDeploymentListeners();

        } catch (error) {
            console.error("Error loading project:", error);
            alert("Error loading project data.");
        }
    }

    function renderProjectInfo(project) {
        document.getElementById("project-title").textContent = project.projectName || "Untitled Project";
        document.title = `ZYNK - ${project.projectName}`;
    }

    function renderKPIs(project) {
        document.getElementById("kpi-content").textContent = project.totalContentCreated || 0;
        document.getElementById("kpi-pending").textContent = project.pendingApprovals || 0;
        document.getElementById("kpi-engagement").textContent = `${project.engagementRate || 0}%`;
        document.getElementById("kpi-growth").textContent = `${project.followerGrowth30d || 0}%`;
    }

    async function loadAgentTeam(projectId, agentSetId) {
        try {
            // 1. Get Agent Set Info
            const setDoc = await db.collection(`projects/${projectId}/agentSets`).doc(agentSetId).get();
            if (setDoc.exists) {
                const setData = setDoc.data();
                document.getElementById("agent-team-name").textContent = setData.name;
                document.getElementById("team-status-badge").innerHTML = getStatusBadge(setData.status);
            }

            // 2. Get Sub-Agents
            const agentsSnapshot = await db.collection(`projects/${projectId}/subAgents`)
                .where("agent_set_id", "==", agentSetId)
                .get();

            const agents = [];
            agentsSnapshot.forEach(doc => agents.push({ id: doc.id, ...doc.data() }));

            renderAgentsTable(agents);

        } catch (error) {
            console.error("Error loading agent team:", error);
            document.getElementById("agent-team-name").textContent = "Error loading team";
        }
    }

    function renderNoTeamState() {
        document.getElementById("agent-team-name").textContent = "No Active Team";
        document.getElementById("agents-table-body").innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                    No active agents found. Please configure an agent team.
                </td>
            </tr>
        `;
    }

    function renderAgentsTable(agents) {
        const tbody = document.getElementById("agents-table-body");
        if (agents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        No agents in this team.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = agents.map(agent => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">${getRoleIcon(agent.type)}</span>
                        <div>
                            <div style="font-weight: 600; text-transform: capitalize;">${agent.type?.replace('_', ' ') || 'Unknown'}</div>
                            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">v${agent.version}</div>
                        </div>
                    </div>
                </td>
                <td>${getStatusBadge(agent.status)}</td>
                <td>
                    <span style="color: rgba(255,255,255,0.7); font-size: 13px;">
                        ${agent.current_task || 'Idle'}
                    </span>
                </td>
                <td>${formatDate(agent.updated_at)}</td>
                <td>
                    <button class="admin-btn-secondary" style="padding: 4px 12px; font-size: 12px;" onclick="viewAgentLogs('${agent.id}')">
                        Logs
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function getRoleIcon(role) {
        const icons = {
            planner: '🎯',
            research: '🔍',
            creator_text: '✍️',
            creator_image: '🎨',
            creator_video: '🎬',
            compliance: '⚖️',
            engagement: '💬',
            evaluator: '📊',
            manager: '👔',
            kpi_engine: '📈'
        };
        return icons[role] || '🤖';
    }

    function getStatusBadge(status) {
        const badges = {
            active: '<span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✅ Active</span>',
            idle: '<span style="background: rgba(148, 163, 184, 0.2); color: #94a3b8; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">💤 Idle</span>',
            working: '<span style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">⚡ Working</span>',
            error: '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">⚠️ Error</span>'
        };
        return badges[status] || status;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
    }

    window.viewAgentLogs = function (agentId) {
        alert(`Logs for agent ${agentId} (Coming Soon)`);
    };

    // Manage Team Button
    document.getElementById("btn-manage-team").addEventListener("click", () => {
        alert("Team Management features coming in next update.");
    });

    // --- Deployment Wizard Logic ---

    function setupDeploymentListeners() {
        const deployBtn = document.getElementById("btn-deploy-team");
        const modalClose = document.getElementById("deploy-modal-close");
        const modalCancel = document.getElementById("deploy-cancel");
        const nextBtn = document.getElementById("deploy-next");
        const prevBtn = document.getElementById("deploy-prev");

        if (deployBtn) deployBtn.addEventListener("click", openDeployWizard);
        if (modalClose) modalClose.addEventListener("click", closeDeployWizard);
        if (modalCancel) modalCancel.addEventListener("click", closeDeployWizard);

        if (nextBtn) nextBtn.addEventListener("click", handleDeployNext);
        if (prevBtn) prevBtn.addEventListener("click", handleDeployPrev);
    }

    function openDeployWizard() {
        deployStep = 1;
        deployData = { channelId: '', channelName: '', templateId: '', templateName: '', roles: [] };

        const modal = document.getElementById("deploy-modal");
        modal.style.display = "flex";

        updateDeployUI();
        loadChannels();
    }

    function closeDeployWizard() {
        document.getElementById("deploy-modal").style.display = "none";
    }

    function updateDeployUI() {
        document.getElementById("deploy-step-num").textContent = deployStep;
        const titles = { 1: "Select Channel", 2: "Select Template", 3: "Review & Deploy" };
        document.getElementById("deploy-step-title").textContent = titles[deployStep];

        const progress = (deployStep / 3) * 100;
        document.getElementById("deploy-progress").style.width = `${progress}%`;

        document.getElementById("deploy-step-1").style.display = deployStep === 1 ? "block" : "none";
        document.getElementById("deploy-step-2").style.display = deployStep === 2 ? "block" : "none";
        document.getElementById("deploy-step-3").style.display = deployStep === 3 ? "block" : "none";

        document.getElementById("deploy-prev").style.visibility = deployStep === 1 ? "hidden" : "visible";
        document.getElementById("deploy-next").textContent = deployStep === 3 ? "Deploy Team" : "Next Step";
    }

    async function loadChannels() {
        const grid = document.getElementById("channel-selection-grid");
        grid.innerHTML = '<div style="text-align: center; padding: 20px;">Loading Channels...</div>';

        try {
            const snapshot = await db.collection("channelProfiles").where("status", "==", "active").get();
            channelProfiles = [];
            snapshot.forEach(doc => channelProfiles.push({ id: doc.id, ...doc.data() }));

            if (channelProfiles.length === 0) {
                grid.innerHTML = '<div style="text-align: center; padding: 20px;">No active channels found.</div>';
                return;
            }

            grid.innerHTML = channelProfiles.map(channel => `
                <div class="channel-card-select ${deployData.channelId === channel.id ? 'selected' : ''}" 
                     onclick="selectChannel('${channel.id}', '${channel.name}')"
                     style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 8px;">${getChannelIcon(channel.platform)}</div>
                    <div style="font-weight: 600;">${channel.name}</div>
                </div>
            `).join('');

            // Add style for selection
            if (!document.getElementById('channel-select-style')) {
                const style = document.createElement('style');
                style.id = 'channel-select-style';
                style.innerHTML = `.channel-card-select.selected { border-color: #16e0bd !important; background: rgba(22, 224, 189, 0.1) !important; }`;
                document.head.appendChild(style);
            }

        } catch (error) {
            console.error("Error loading channels:", error);
            grid.innerHTML = '<div style="text-align: center; color: #ef4444;">Error loading channels.</div>';
        }
    }

    window.selectChannel = function (id, name) {
        deployData.channelId = id;
        deployData.channelName = name;
        loadChannels(); // Re-render to show selection
    };

    async function loadTeamTemplates() {
        const grid = document.getElementById("template-selection-grid");
        grid.innerHTML = '<div style="text-align: center; padding: 20px;">Loading Templates...</div>';

        try {
            const snapshot = await db.collection("agentSetTemplates").where("status", "==", "active").get();
            teamTemplates = [];
            snapshot.forEach(doc => teamTemplates.push({ id: doc.id, ...doc.data() }));

            if (teamTemplates.length === 0) {
                grid.innerHTML = '<div style="text-align: center; padding: 20px;">No active templates found.</div>';
                return;
            }

            grid.innerHTML = teamTemplates.map(tpl => `
                <div class="template-card-select ${deployData.templateId === tpl.id ? 'selected' : ''}" 
                     onclick="selectTemplate('${tpl.id}', '${tpl.name}')"
                     style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-weight: 600; margin-bottom: 4px;">${tpl.name}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${tpl.roles ? tpl.roles.length : 0} Roles</div>
                </div>
            `).join('');

            // Add style for selection
            if (!document.getElementById('template-select-style')) {
                const style = document.createElement('style');
                style.id = 'template-select-style';
                style.innerHTML = `.template-card-select.selected { border-color: #16e0bd !important; background: rgba(22, 224, 189, 0.1) !important; }`;
                document.head.appendChild(style);
            }

        } catch (error) {
            console.error("Error loading templates:", error);
            grid.innerHTML = '<div style="text-align: center; color: #ef4444;">Error loading templates.</div>';
        }
    }

    window.selectTemplate = function (id, name) {
        deployData.templateId = id;
        deployData.templateName = name;

        const tpl = teamTemplates.find(t => t.id === id);
        if (tpl) {
            deployData.roles = tpl.roles || [];
        }

        loadTeamTemplates(); // Re-render
    };

    function handleDeployNext() {
        if (deployStep === 1) {
            if (!deployData.channelId) { alert("Please select a channel."); return; }
            deployStep++;
            loadTeamTemplates();
        } else if (deployStep === 2) {
            if (!deployData.templateId) { alert("Please select a template."); return; }
            deployStep++;
            renderDeployReview();
        } else if (deployStep === 3) {
            deployTeam();
        }
        updateDeployUI();
    }

    function handleDeployPrev() {
        if (deployStep > 1) {
            deployStep--;
            updateDeployUI();
        }
    }

    function renderDeployReview() {
        document.getElementById("review-channel").textContent = deployData.channelName;
        document.getElementById("review-template").textContent = deployData.templateName;

        const list = document.getElementById("review-roles-list");
        list.innerHTML = deployData.roles.map(role => `
            <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; display: flex; justify-content: space-between;">
                <span>${role.name || role.role}</span>
                <span style="font-size: 12px; color: rgba(255,255,255,0.5);">${role.type || 'Unknown'}</span>
            </div>
        `).join('');
    }

    async function deployTeam() {
        const btn = document.getElementById("deploy-next");
        try {
            btn.disabled = true;
            btn.textContent = "Deploying...";

            // 1. Create projectAgentTeamInstance
            const instanceId = `team_${Date.now()}`;
            const instanceData = {
                id: instanceId,
                projectId: projectId,
                channelId: deployData.channelId,
                templateId: deployData.templateId,
                name: `${deployData.channelName} Team`, // Default name
                status: 'active',
                deployedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deployedBy: currentUser.uid,
                // PRD 5.0 Metadata
                configProfileId: 'default', // Placeholder
                engineVersionSet: 'v1.0.0', // Placeholder
                channel: 'stable', // Default channel
                ruleProfileId: null // Phase 1 preparation (RULE Profile)
            };

            await db.collection("projectAgentTeamInstances").doc(instanceId).set(instanceData);

            // 2. Create Sub-Agents (Instances)
            // For Phase 1, we'll just create placeholder records in `subAgents` collection
            // In a real system, this would trigger backend provisioning
            const batch = db.batch();

            deployData.roles.forEach((role, index) => {
                const agentId = `agent_${instanceId}_${index}`;
                const agentRef = db.collection(`projects/${projectId}/subAgents`).doc(agentId);

                batch.set(agentRef, {
                    id: agentId,
                    agent_set_id: instanceId, // Linking to the team instance
                    type: role.type,
                    name: role.name,
                    status: 'idle',
                    version: '1.0.0',
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();

            alert("✅ Team deployed successfully!");
            closeDeployWizard();
            loadAgentSwarm(projectId); // Refresh cards

        } catch (error) {
            console.error("Error deploying team:", error);
            alert(`Deployment failed: ${error.message}`);
        } finally {
            btn.disabled = false;
        }
    }

    // --- Agent Swarm Logic ---

    async function loadAgentSwarm(projectId) {
        const grid = document.getElementById("agent-swarm-grid");
        if (!grid) return;

        try {
            const snapshot = await db.collection("projectAgentTeamInstances")
                .where("projectId", "==", projectId)
                .where("status", "==", "active")
                .get();

            const instances = [];
            snapshot.forEach(doc => instances.push({ id: doc.id, ...doc.data() }));

            let html = '';

            // Render Instances
            if (instances.length > 0) {
                html += instances.map(inst => renderAgentCard(inst)).join('');
            } else {
                // Render Dummy/Placeholder Cards if no instances
                html += renderPlaceholderCard('x', 'Vanguard (X)', 'Trend Setter', 'active');
                html += renderPlaceholderCard('linkedin', 'Strategist (LI)', 'Thought Leader', 'cooldown');
            }

            // Add "Deploy New Agent" Card
            html += `
                <div class="add-agent-card" onclick="document.getElementById('btn-deploy-team').click()">
                    <div class="add-icon-circle">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </div>
                    <div class="add-text">Deploy New Agent</div>
                </div>
            `;

            grid.innerHTML = html;

        } catch (error) {
            console.error("Error loading agent swarm:", error);
            grid.innerHTML = '<div style="text-align: center; color: #ef4444;">Error loading agent swarm.</div>';
        }
    }

    function renderAgentCard(inst) {
        return `
            <div class="agent-card">
                <div class="agent-card-header">
                    <div class="agent-info">
                        <div class="agent-icon">
                            ${getChannelIconById(inst.channelId)}
                        </div>
                        <div class="agent-details">
                            <div class="agent-name">
                                ${inst.name}
                                ${inst.status === 'error' ? '<span style="color: #ef4444;">!</span>' : ''}
                            </div>
                            <div class="agent-role">${inst.templateName || 'Custom Agent'}</div>
                        </div>
                    </div>
                    <div class="agent-status status-${inst.status === 'active' ? 'active' : 'inactive'}">
                        ${inst.status}
                    </div>
                </div>

                <div class="agent-directive active">
                    <div class="directive-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        Active Directive:
                    </div>
                    <div class="directive-text">
                        Autonomous mode active. Scanning ecosystem for engagement opportunities.
                    </div>
                </div>

                <div class="agent-metrics">
                    <div class="metric-item">
                        <div class="metric-header">
                            <span>Daily Actions</span>
                            <span>8/15</span>
                        </div>
                        <div class="metric-bar-bg">
                            <div class="metric-bar-fill" style="width: 53%; background: #16e0bd;"></div>
                        </div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-header">
                            <span>Neural Sync</span>
                            <span style="color: #16e0bd;">91%</span>
                        </div>
                        <div class="metric-bar-bg">
                            <div class="metric-bar-fill" style="width: 91%; background: linear-gradient(90deg, #16e0bd, #3b82f6);"></div>
                        </div>
                    </div>
                </div>

                <div class="agent-actions">
                    <button class="btn-view-history" onclick="viewTeamDetails('${inst.id}')">View History</button>
                    <button class="btn-settings" onclick="openChannelConfig('${inst.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    function renderPlaceholderCard(platform, name, role, status) {
        const isCooldown = status === 'cooldown';
        return `
            <div class="agent-card" style="opacity: 0.8;">
                <div class="agent-card-header">
                    <div class="agent-info">
                        <div class="agent-icon">
                            ${getChannelIcon(platform)}
                        </div>
                        <div class="agent-details">
                            <div class="agent-name">
                                ${name}
                                <span style="color: #ef4444;">!</span>
                            </div>
                            <div class="agent-role">${role}</div>
                        </div>
                    </div>
                    <div class="agent-status status-${status}">
                        ${status.toUpperCase()}
                    </div>
                </div>

                <div class="agent-directive ${isCooldown ? 'warning' : 'active'}">
                    <div class="directive-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        Active Directive:
                    </div>
                    <div class="directive-text">
                        ${isCooldown ? "Daily quota reached. Analyzing day's performance." : "Autonomous mode active. Scanning ecosystem for engagement opportunities."}
                    </div>
                </div>

                <div class="agent-metrics">
                    <div class="metric-item">
                        <div class="metric-header">
                            <span>Daily Actions</span>
                            <span>${isCooldown ? '0/5' : '8/15'}</span>
                        </div>
                        <div class="metric-bar-bg">
                            <div class="metric-bar-fill" style="width: ${isCooldown ? '0%' : '53%'}; background: ${isCooldown ? '#3b82f6' : '#16e0bd'};"></div>
                        </div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-header">
                            <span>Neural Sync</span>
                            <span style="color: #16e0bd;">${isCooldown ? '97%' : '91%'}</span>
                        </div>
                        <div class="metric-bar-bg">
                            <div class="metric-bar-fill" style="width: ${isCooldown ? '97%' : '91%'}; background: linear-gradient(90deg, #16e0bd, #3b82f6);"></div>
                        </div>
                    </div>
                </div>

                <div class="agent-actions">
                    <button class="btn-view-history" onclick="alert('This is a demo agent.')">View History</button>
                    <button class="btn-settings" onclick="alert('This is a demo agent.')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    function getChannelIcon(platform) {
        // Map platform to icon
        const icons = {
            instagram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
            x: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>',
            youtube: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>',
            linkedin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>',
            medium: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6.5" cy="12" r="5.5"></circle><ellipse cx="17.5" cy="12" rx="3.5" ry="5.5"></ellipse><ellipse cx="23" cy="12" rx="1" ry="5.5"></ellipse></svg>'
        };
        return icons[platform?.toLowerCase()] || icons['instagram']; // Default
    }

    function getChannelIconById(id) {
        // Simple mapping based on ID containing platform name
        if (id.includes('instagram')) return getChannelIcon('instagram');
        if (id.includes('x') || id.includes('twitter')) return getChannelIcon('x');
        if (id.includes('youtube')) return getChannelIcon('youtube');
        if (id.includes('linkedin')) return getChannelIcon('linkedin');
        if (id.includes('medium')) return getChannelIcon('medium');
        return getChannelIcon('instagram');
    }

    // --- Configuration Panel Logic ---

    let configResolver = null;
    let currentConfigInstanceId = null;
    let currentConfigData = null; // Stores current effective config
    let currentOverrides = {}; // Stores pending overrides
    let currentPlatform = 'x'; // Default platform

    // --- Configuration Schemas ---
    const CONFIG_SCHEMAS = {
        x: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.35 },
                { key: 'clicks', type: 'slider', label: 'Link Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'impressions', type: 'slider', label: 'Impressions', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.15 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1-3/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5-10/day)' },
                        { value: 'aggressive', label: 'Aggressive (10+/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.shortTweet', type: 'slider', label: 'Short Tweet', min: 0, max: 100, default: 60 },
                { key: 'formatMix.thread', type: 'slider', label: 'Thread', min: 0, max: 100, default: 80 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Post', min: 0, max: 100, default: 30 },
                { key: 'formatMix.videoPost', type: 'slider', label: 'Video Post', min: 0, max: 100, default: 10 },
                {
                    key: 'experimentIntensity', type: 'select', label: 'Experiment Intensity', options: [
                        { value: 'low', label: 'Low (Safe)' },
                        { value: 'medium', label: 'Medium (Balanced)' },
                        { value: 'high', label: 'High (Experimental)' },
                        { value: 'aggressive', label: 'Aggressive' }
                    ], default: 'medium'
                },
                { key: 'avgThreadLength', type: 'slider', label: 'Target Thread Length', min: 3, max: 25, step: 1, default: 7 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone Preset', options: [
                        { value: 'calm', label: 'Calm & Thoughtful' },
                        { value: 'professional', label: 'Professional & Clear' },
                        { value: 'bold', label: 'Bold & Confident' },
                        { value: 'humorous', label: 'Humorous & Witty' },
                        { value: 'provocative', label: 'Provocative & Contrarian' }
                    ], default: 'professional'
                },
                {
                    key: 'hookStyle', type: 'multi-select', label: 'Hook Style (Select 1-3)', options: [
                        { value: 'question', label: 'Question ("What if...")' },
                        { value: 'stat', label: 'Statistic ("93% of...")' },
                        { value: 'story', label: 'Story ("Last week...")' },
                        { value: 'contrarian', label: 'Contrarian ("Everyone is wrong...")' },
                        { value: 'value_prop', label: 'Value Prop ("How to 10x...")' }
                    ], default: ['question', 'stat']
                },
                { key: 'hashtagCount', type: 'slider', label: 'Hashtags per Post', min: 0, max: 5, step: 1, default: 3 },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal (1-2)' },
                        { value: 'moderate', label: 'Moderate (3-5)' },
                        { value: 'high', label: 'High (5+)' }
                    ], default: 'minimal'
                },
                {
                    key: 'ctaIntensity', type: 'select', label: 'Call-to-Action Intensity', options: [
                        { value: 'soft', label: 'Soft ("Learn more")' },
                        { value: 'medium', label: 'Medium ("Check it out")' },
                        { value: 'aggressive', label: 'Aggressive ("Sign up NOW")' }
                    ], default: 'medium'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off (Manual Only)' },
                        { value: 'low', label: 'Low (@Mentions Only)' },
                        { value: 'medium', label: 'Medium (+ Keywords)' },
                        { value: 'high', label: 'High (Proactive)' }
                    ], default: 'medium'
                },
                { key: 'dailyReplyCap', type: 'slider', label: 'Max Replies/Day', min: 0, max: 200, step: 5, default: 50 },
                { key: 'replyToMentions', type: 'toggle', label: 'Reply to @Mentions', default: true },
                { key: 'replyToKeywords', type: 'tag-input', label: 'Keywords (Press Enter)', default: [] },
                {
                    key: 'escalationTriggers', type: 'multi-select', label: 'Escalation Rules (Alert Human)', options: [
                        { value: 'negative_sentiment', label: 'Negative Sentiment' },
                        { value: 'complaint', label: 'Complaints' },
                        { value: 'support_question', label: 'Support Questions' },
                        { value: 'pricing_inquiry', label: 'Pricing Inquiries' }
                    ], default: ['complaint']
                }
            ]
        },
        instagram: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'clicks', type: 'slider', label: 'Link Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Feed Post Frequency', options: [
                        { value: 'low', label: 'Low (3-4/week)' },
                        { value: 'medium', label: 'Medium (1/day)' },
                        { value: 'high', label: 'High (1-2/day)' },
                        { value: 'aggressive', label: 'Aggressive (3+/day)' }
                    ], default: 'medium'
                },
                {
                    key: 'storyFrequency', type: 'select', label: 'Story Frequency', options: [
                        { value: 'low', label: 'Low (1-2/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5-10/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.reel', type: 'slider', label: 'Reels', min: 0, max: 100, default: 60 },
                { key: 'formatMix.carousel', type: 'slider', label: 'Carousel', min: 0, max: 100, default: 30 },
                { key: 'formatMix.singleImage', type: 'slider', label: 'Single Image', min: 0, max: 100, default: 10 },
                { key: 'formatMix.story', type: 'slider', label: 'Story Weight', min: 0, max: 100, default: 50 },
                {
                    key: 'visualStyle', type: 'select', label: 'Visual Style', options: [
                        { value: 'minimalist', label: 'Minimalist' },
                        { value: 'vibrant', label: 'Vibrant' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'grunge', label: 'Grunge' },
                        { value: 'pastel', label: 'Pastel' }
                    ], default: 'professional'
                },
                { key: 'filterIntensity', type: 'slider', label: 'Filter Intensity', min: 0, max: 100, default: 20 }
            ],
            creator_text: [
                {
                    key: 'captionLength', type: 'select', label: 'Caption Length', options: [
                        { value: 'short', label: 'Short (1-2 lines)' },
                        { value: 'medium', label: 'Medium (Paragraph)' },
                        { value: 'microblog', label: 'Microblog (Long Form)' }
                    ], default: 'medium'
                },
                {
                    key: 'tonePreset', type: 'select', label: 'Tone Preset', options: [
                        { value: 'friendly', label: 'Friendly & Casual' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'inspirational', label: 'Inspirational' },
                        { value: 'witty', label: 'Witty' }
                    ], default: 'professional'
                },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'heavy', label: 'Heavy' }
                    ], default: 'moderate'
                },
                { key: 'hashtagCount', type: 'slider', label: 'Hashtags', min: 0, max: 30, step: 1, default: 15 },
                {
                    key: 'hashtagStrategy', type: 'select', label: 'Hashtags Strategy', options: [
                        { value: 'broad', label: 'Broad Only' },
                        { value: 'niche', label: 'Niche Only' },
                        { value: 'mixed', label: 'Mixed' }
                    ], default: 'mixed'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'medium'
                },
                { key: 'replyToComments', type: 'toggle', label: 'Reply to Comments', default: true },
                { key: 'replyToDMs', type: 'toggle', label: 'Reply to DMs', default: false },
                { key: 'replyToMentions', type: 'toggle', label: 'Reply to Mentions', default: true },
                { key: 'replyToKeywords', type: 'tag-input', label: 'Keywords', default: [] }
            ]
        },
        youtube: {
            goals: [
                { key: 'subscribers', type: 'slider', label: 'Subscriber Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'watchTime', type: 'slider', label: 'Watch Time', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.35 },
                { key: 'engagement', type: 'slider', label: 'Engagement (Likes/Comments)', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'clicks', type: 'slider', label: 'Click-Through Rate', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.15 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Upload Frequency', options: [
                        { value: 'low', label: 'Low (1-2/week)' },
                        { value: 'medium', label: 'Medium (3-4/week)' },
                        { value: 'high', label: 'High (Daily)' },
                        { value: 'aggressive', label: 'Aggressive (Multiple/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.longForm', type: 'slider', label: 'Long-Form Videos (8+ min)', min: 0, max: 100, default: 60 },
                { key: 'formatMix.shorts', type: 'slider', label: 'YouTube Shorts', min: 0, max: 100, default: 40 },
                { key: 'videoLength', type: 'slider', label: 'Target Video Length (min)', min: 5, max: 60, step: 5, default: 15 },
                { key: 'seoOptimization', type: 'toggle', label: 'SEO Optimization', default: true }
            ],
            creator_text: [
                {
                    key: 'titleStyle', type: 'select', label: 'Title Style', options: [
                        { value: 'descriptive', label: 'Descriptive' },
                        { value: 'clickbait', label: 'Clickbait' },
                        { value: 'keyword_rich', label: 'Keyword-Rich' }
                    ], default: 'descriptive'
                },
                {
                    key: 'thumbnailStyle', type: 'select', label: 'Thumbnail Style', options: [
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'bold_text', label: 'Bold Text Overlay' },
                        { value: 'face_focus', label: 'Face Focus' }
                    ], default: 'bold_text'
                },
                {
                    key: 'descriptionLength', type: 'select', label: 'Description Length', options: [
                        { value: 'short', label: 'Short (1-2 paragraphs)' },
                        { value: 'medium', label: 'Medium (3-5 paragraphs)' },
                        { value: 'long', label: 'Long (Full SEO)' }
                    ], default: 'medium'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Comment Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low (Top Comments)' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High (All Comments)' }
                    ], default: 'medium'
                },
                { key: 'pinTopComment', type: 'toggle', label: 'Auto-Pin Top Comment', default: true },
                { key: 'communityPosts', type: 'toggle', label: 'Enable Community Posts', default: true }
            ]
        },
        linkedin: {
            goals: [
                { key: 'connections', type: 'slider', label: 'Connection Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.35 },
                { key: 'impressions', type: 'slider', label: 'Impressions', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'leads', type: 'slider', label: 'Lead Generation', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.15 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (2-3/week)' },
                        { value: 'medium', label: 'Medium (1/day)' },
                        { value: 'high', label: 'High (2/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 40 },
                { key: 'formatMix.article', type: 'slider', label: 'LinkedIn Articles', min: 0, max: 100, default: 20 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 30 },
                { key: 'formatMix.videoPost', type: 'slider', label: 'Video Posts', min: 0, max: 100, default: 10 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'professional', label: 'Professional' },
                        { value: 'thought_leader', label: 'Thought Leader' },
                        { value: 'conversational', label: 'Conversational' },
                        { value: 'inspirational', label: 'Inspirational' }
                    ], default: 'professional'
                },
                { key: 'hashtagCount', type: 'slider', label: 'Hashtags', min: 0, max: 5, step: 1, default: 3 },
                { key: 'includeCallToAction', type: 'toggle', label: 'Include CTA', default: true }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'low'
                },
                { key: 'connectionRequests', type: 'toggle', label: 'Auto-Accept Connections', default: false },
                { key: 'endorseSkills', type: 'toggle', label: 'Auto-Endorse Skills', default: false }
            ]
        },
        tiktok: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'views', type: 'slider', label: 'Video Views', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'shares', type: 'slider', label: 'Shares', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1/day)' },
                        { value: 'medium', label: 'Medium (2-3/day)' },
                        { value: 'high', label: 'High (4-5/day)' },
                        { value: 'aggressive', label: 'Aggressive (6+/day)' }
                    ], default: 'medium'
                },
                {
                    key: 'videoLength', type: 'select', label: 'Video Length', options: [
                        { value: 'short', label: 'Short (15-30s)' },
                        { value: 'medium', label: 'Medium (30-60s)' },
                        { value: 'long', label: 'Long (1-3min)' }
                    ], default: 'medium'
                },
                { key: 'trendParticipation', type: 'slider', label: 'Trend Participation', min: 0, max: 100, default: 70 },
                { key: 'originalContent', type: 'slider', label: 'Original Content', min: 0, max: 100, default: 30 }
            ],
            creator_text: [
                {
                    key: 'captionStyle', type: 'select', label: 'Caption Style', options: [
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'engaging', label: 'Engaging' },
                        { value: 'storytelling', label: 'Storytelling' }
                    ], default: 'engaging'
                },
                { key: 'hashtagCount', type: 'slider', label: 'Hashtags', min: 0, max: 10, step: 1, default: 5 },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'heavy', label: 'Heavy' }
                    ], default: 'moderate'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Comment Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'medium'
                },
                { key: 'duetEnabled', type: 'toggle', label: 'Enable Duets', default: true },
                { key: 'stitchEnabled', type: 'toggle', label: 'Enable Stitch', default: true }
            ]
        },
        facebook: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Page Followers', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.35 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'conversions', type: 'slider', label: 'Conversions', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.15 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1/day)' },
                        { value: 'medium', label: 'Medium (2-3/day)' },
                        { value: 'high', label: 'High (4+/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 30 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 40 },
                { key: 'formatMix.videoPost', type: 'slider', label: 'Video Posts', min: 0, max: 100, default: 20 },
                { key: 'formatMix.story', type: 'slider', label: 'Stories', min: 0, max: 100, default: 10 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'friendly', label: 'Friendly' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'casual', label: 'Casual' },
                        { value: 'promotional', label: 'Promotional' }
                    ], default: 'friendly'
                },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'heavy', label: 'Heavy' }
                    ], default: 'moderate'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'medium'
                },
                { key: 'messengerAutoReply', type: 'toggle', label: 'Messenger Auto-Reply', default: false }
            ]
        },
        pinterest: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'saves', type: 'slider', label: 'Pin Saves', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'clicks', type: 'slider', label: 'Outbound Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'impressions', type: 'slider', label: 'Impressions', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Pin Frequency', options: [
                        { value: 'low', label: 'Low (5-10/day)' },
                        { value: 'medium', label: 'Medium (10-20/day)' },
                        { value: 'high', label: 'High (20-30/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.standardPin', type: 'slider', label: 'Standard Pins', min: 0, max: 100, default: 60 },
                { key: 'formatMix.videoPin', type: 'slider', label: 'Video Pins', min: 0, max: 100, default: 20 },
                { key: 'formatMix.ideaPin', type: 'slider', label: 'Idea Pins', min: 0, max: 100, default: 20 }
            ],
            creator_text: [
                {
                    key: 'titleStyle', type: 'select', label: 'Pin Title Style', options: [
                        { value: 'descriptive', label: 'Descriptive' },
                        { value: 'keyword_rich', label: 'Keyword-Rich' },
                        { value: 'actionable', label: 'Actionable' }
                    ], default: 'keyword_rich'
                },
                {
                    key: 'descriptionLength', type: 'select', label: 'Description Length', options: [
                        { value: 'short', label: 'Short' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'long', label: 'Long (SEO Optimized)' }
                    ], default: 'long'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Comment Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' }
                    ], default: 'low'
                }
            ]
        },
        reddit: {
            goals: [
                { key: 'karma', type: 'slider', label: 'Karma Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Engagement (Comments/Upvotes)', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'clicks', type: 'slider', label: 'Link Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1-2/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5+/day)' }
                    ], default: 'low'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 50 },
                { key: 'formatMix.linkPost', type: 'slider', label: 'Link Posts', min: 0, max: 100, default: 30 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 20 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'casual', label: 'Casual' },
                        { value: 'informative', label: 'Informative' },
                        { value: 'humorous', label: 'Humorous' },
                        { value: 'serious', label: 'Serious' }
                    ], default: 'casual'
                },
                {
                    key: 'titleStyle', type: 'select', label: 'Title Style', options: [
                        { value: 'question', label: 'Question-Based' },
                        { value: 'statement', label: 'Statement' },
                        { value: 'clickbait', label: 'Engaging/Clickbait' }
                    ], default: 'question'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Comment Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'medium'
                },
                { key: 'subredditEngagement', type: 'toggle', label: 'Cross-Subreddit Engagement', default: true }
            ]
        },
        medium: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'reads', type: 'slider', label: 'Article Reads', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'claps', type: 'slider', label: 'Claps', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'readTime', type: 'slider', label: 'Read Time', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.15 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Publishing Frequency', options: [
                        { value: 'low', label: 'Low (1-2/week)' },
                        { value: 'medium', label: 'Medium (3-4/week)' },
                        { value: 'high', label: 'High (Daily)' }
                    ], default: 'low'
                },
                {
                    key: 'articleLength', type: 'select', label: 'Article Length', options: [
                        { value: 'short', label: 'Short (3-5 min read)' },
                        { value: 'medium', label: 'Medium (5-10 min read)' },
                        { value: 'long', label: 'Long (10+ min read)' }
                    ], default: 'medium'
                }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Writing Tone', options: [
                        { value: 'professional', label: 'Professional' },
                        { value: 'conversational', label: 'Conversational' },
                        { value: 'academic', label: 'Academic' },
                        { value: 'storytelling', label: 'Storytelling' }
                    ], default: 'conversational'
                },
                { key: 'includeImages', type: 'toggle', label: 'Include Images', default: true },
                { key: 'seoOptimization', type: 'toggle', label: 'SEO Optimization', default: true }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Comment Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' }
                    ], default: 'low'
                },
                { key: 'highlightComments', type: 'toggle', label: 'Auto-Highlight Comments', default: false }
            ]
        },
        threads: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'shares', type: 'slider', label: 'Shares', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1-3/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5-10/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 60 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 30 },
                { key: 'formatMix.videoPost', type: 'slider', label: 'Video Posts', min: 0, max: 100, default: 10 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'casual', label: 'Casual' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'witty', label: 'Witty' },
                        { value: 'thoughtful', label: 'Thoughtful' }
                    ], default: 'casual'
                },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'moderate', label: 'Moderate' }
                    ], default: 'minimal'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'medium'
                },
                { key: 'replyToMentions', type: 'toggle', label: 'Reply to Mentions', default: true }
            ]
        },
        bluesky: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'clicks', type: 'slider', label: 'Link Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1-3/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5-10/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 70 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 20 },
                { key: 'formatMix.thread', type: 'slider', label: 'Threads', min: 0, max: 100, default: 10 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'casual', label: 'Casual' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'thoughtful', label: 'Thoughtful' },
                        { value: 'humorous', label: 'Humorous' }
                    ], default: 'thoughtful'
                },
                { key: 'contentWarnings', type: 'toggle', label: 'Use Content Warnings', default: false }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' }
                    ], default: 'low'
                },
                { key: 'replyToMentions', type: 'toggle', label: 'Reply to Mentions', default: true }
            ]
        },
        mastodon: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Engagement (Boosts/Favs)', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'clicks', type: 'slider', label: 'Link Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1-3/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5-10/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 70 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 20 },
                { key: 'formatMix.thread', type: 'slider', label: 'Threads', min: 0, max: 100, default: 10 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'casual', label: 'Casual' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'activist', label: 'Activist' },
                        { value: 'community_focused', label: 'Community-Focused' }
                    ], default: 'community_focused'
                },
                { key: 'contentWarnings', type: 'toggle', label: 'Use Content Warnings (CW)', default: true },
                { key: 'altTextRequired', type: 'toggle', label: 'Require Alt Text for Images', default: true }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' }
                    ], default: 'low'
                },
                { key: 'replyToMentions', type: 'toggle', label: 'Reply to Mentions', default: true },
                { key: 'crossInstanceEngagement', type: 'toggle', label: 'Cross-Instance Engagement', default: true }
            ]
        },
        discord: {
            goals: [
                { key: 'members', type: 'slider', label: 'Member Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Message Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'retention', type: 'slider', label: 'Member Retention', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'activity', type: 'slider', label: 'Daily Active Users', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Message Frequency', options: [
                        { value: 'low', label: 'Low (Occasional)' },
                        { value: 'medium', label: 'Medium (Regular)' },
                        { value: 'high', label: 'High (Very Active)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.announcement', type: 'slider', label: 'Announcements', min: 0, max: 100, default: 30 },
                { key: 'formatMix.discussion', type: 'slider', label: 'Discussions', min: 0, max: 100, default: 50 },
                { key: 'formatMix.event', type: 'slider', label: 'Events', min: 0, max: 100, default: 20 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'casual', label: 'Casual' },
                        { value: 'friendly', label: 'Friendly' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'gaming', label: 'Gaming/Meme' }
                    ], default: 'friendly'
                },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji/Emote Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'heavy', label: 'Heavy' }
                    ], default: 'moderate'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low (Mentions Only)' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High (Active Participation)' }
                    ], default: 'medium'
                },
                { key: 'welcomeNewMembers', type: 'toggle', label: 'Welcome New Members', default: true },
                { key: 'moderationAssist', type: 'toggle', label: 'Moderation Assistance', default: false }
            ]
        }
    };

    // Initialize ConfigResolver
    try {
        configResolver = new ConfigResolver(db, projectId);
    } catch (e) {
        console.error("Failed to init ConfigResolver:", e);
    }

    // Panel Event Listeners
    const configOverlay = document.getElementById('config-overlay');
    const configPanel = document.getElementById('config-panel');
    const configClose = document.getElementById('config-close');
    const configSave = document.getElementById('config-save');
    const configReset = document.getElementById('config-reset-all');

    if (configClose) configClose.addEventListener('click', closeConfigPanel);
    if (configOverlay) configOverlay.addEventListener('click', closeConfigPanel);
    if (configSave) configSave.addEventListener('click', saveConfigChanges);
    if (configReset) configReset.addEventListener('click', resetAllConfig);

    // Tab Switching
    document.querySelectorAll('.config-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.config-section').forEach(s => s.classList.remove('active'));

            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            const section = document.getElementById(`config-section-${tabName}`);
            if (section) section.classList.add('active');
        });
    });

    window.openChannelConfig = async function (instanceId) {
        if (!configResolver) return alert("Config System not initialized");

        currentConfigInstanceId = instanceId;
        currentOverrides = {}; // Reset pending overrides

        // Show loading state
        document.getElementById('config-content').innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading configuration...</div>';

        configOverlay.classList.add('active');
        configPanel.classList.add('active');

        try {
            // Get Instance Details
            const instanceDoc = await db.collection("projectAgentTeamInstances").doc(instanceId).get();
            const instance = instanceDoc.data();

            // Update Header
            document.getElementById('config-channel-name').textContent = instance.name;
            document.getElementById('config-channel-icon').innerHTML = getChannelIconById(instance.channelId);
            document.getElementById('config-template-name').textContent = `Template: ${instance.templateId || 'Custom'}`;
            document.getElementById('config-profile-name').textContent = `Runtime Profile: ${instance.configProfileId || 'Default'}`;

            // Determine platform from channelId
            const channelId = instance.channelId.toLowerCase();
            currentPlatform = 'x'; // Default

            // Platform detection based on channelId
            if (channelId.includes('instagram')) currentPlatform = 'instagram';
            else if (channelId.includes('youtube')) currentPlatform = 'youtube';
            else if (channelId.includes('linkedin')) currentPlatform = 'linkedin';
            else if (channelId.includes('tiktok')) currentPlatform = 'tiktok';
            else if (channelId.includes('facebook')) currentPlatform = 'facebook';
            else if (channelId.includes('pinterest')) currentPlatform = 'pinterest';
            else if (channelId.includes('reddit')) currentPlatform = 'reddit';
            else if (channelId.includes('medium')) currentPlatform = 'medium';
            else if (channelId.includes('threads')) currentPlatform = 'threads';
            else if (channelId.includes('bluesky')) currentPlatform = 'bluesky';
            else if (channelId.includes('mastodon')) currentPlatform = 'mastodon';
            else if (channelId.includes('discord')) currentPlatform = 'discord';


            // Load Effective Configs for all engines
            const [goals, planner, creator, engagement] = await Promise.all([
                configResolver.getEffectiveConfig(instanceId, 'goals'),
                configResolver.getEffectiveConfig(instanceId, 'planner'),
                configResolver.getEffectiveConfig(instanceId, 'creator_text'),
                configResolver.getEffectiveConfig(instanceId, 'engagement')
            ]);

            currentConfigData = { goals, planner, creator_text: creator, engagement };

            renderConfigUI();

        } catch (error) {
            console.error("Error opening config:", error);
            document.getElementById('config-content').innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">Error: ${error.message}</div>`;
        }
    };

    function closeConfigPanel() {
        configOverlay.classList.remove('active');
        configPanel.classList.remove('active');
    }

    function renderConfigUI() {
        const container = document.getElementById('config-content');
        container.innerHTML = '';

        const schema = CONFIG_SCHEMAS[currentPlatform] || CONFIG_SCHEMAS['x'];

        // 1. Goals Tab
        const goalsSection = createSection('goals', true);
        goalsSection.innerHTML = renderSchemaTab('goals', schema.goals, currentConfigData.goals);
        container.appendChild(goalsSection);

        // 2. Planner Tab
        const plannerSection = createSection('planner', false);
        plannerSection.innerHTML = renderSchemaTab('planner', schema.planner, currentConfigData.planner);
        container.appendChild(plannerSection);

        // 3. Creator Text Tab
        const creatorSection = createSection('creator_text', false);
        creatorSection.innerHTML = renderSchemaTab('creator_text', schema.creator_text, currentConfigData.creator_text);
        container.appendChild(creatorSection);

        // 4. Engagement Tab
        const engagementSection = createSection('engagement', false);
        engagementSection.innerHTML = renderSchemaTab('engagement', schema.engagement, currentConfigData.engagement);
        container.appendChild(engagementSection);

        // 5. Advanced Tab (Still manual for now as it's optional/generic)
        const advancedSection = createSection('advanced', false);
        advancedSection.innerHTML = renderAdvancedTab(currentConfigData.advanced || {});
        container.appendChild(advancedSection);

        // Re-attach listeners for inputs
        attachInputListeners();
    }

    function createSection(id, isActive) {
        const div = document.createElement('div');
        div.id = `config-section-${id}`;
        div.className = `config-section ${isActive ? 'active' : ''}`;
        return div;
    }

    // --- Render Helpers ---

    function renderSchemaTab(engine, fields, config) {
        if (!fields) return '<div style="padding: 20px; color: rgba(255,255,255,0.5);">No configuration available for this section.</div>';

        return fields.map(field => {
            const value = getDeepValue(config, field.key) ?? field.default;

            // Group logic could be added here if schema supports groups
            // For now, wrap each field in a div or render directly

            let fieldHtml = '';
            switch (field.type) {
                case 'slider':
                    fieldHtml = renderSlider(engine, field.key, field.label, value, field.min, field.max, field.step, field.isPercent);
                    break;
                case 'select':
                    fieldHtml = renderSelect(engine, field.key, field.label, field.options, value);
                    break;
                case 'multi-select':
                    fieldHtml = renderMultiSelect(engine, field.key, field.options, value, field.label);
                    break;
                case 'toggle':
                    fieldHtml = renderToggle(engine, field.key, field.label, value);
                    break;
                case 'tag-input':
                    fieldHtml = `
                        <div class="config-group">
                            <label class="config-label">${field.label}</label>
                            ${renderTagInput(engine, field.key, value)}
                        </div>`;
                    break;
                default:
                    fieldHtml = `<div>Unknown field type: ${field.type}</div>`;
            }
            return fieldHtml;
        }).join('');
    }

    function renderSelect(engine, key, label, options, currentValue) {
        const optionsHtml = options.map(opt =>
            `<option value="${opt.value}" ${opt.value === currentValue ? 'selected' : ''}>${opt.label}</option>`
        ).join('');

        return `
            <div class="config-group">
                <label class="config-label">${label}</label>
                <select class="config-select" data-engine="${engine}" data-key="${key}">
                    ${optionsHtml}
                </select>
            </div>
        `;
    }

    function renderSlider(engine, key, label, value, min, max, step = 1, isPercent = false) {
        const displayValue = isPercent ? `${Math.round(value * 100)}%` : value;
        return `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-size: 12px; color: rgba(255,255,255,0.7);">${label}</span>
                    <span class="config-value" id="val-${engine}-${key.replace('.', '-')}">${displayValue}</span>
                </div>
                <div class="config-slider-container">
                    <input type="range" class="config-slider" 
                        data-engine="${engine}" data-key="${key}"
                        min="${min}" max="${max}" step="${step}" value="${value}"
                        oninput="document.getElementById('val-${engine}-${key.replace('.', '-')}').textContent = ${isPercent} ? Math.round(this.value * 100) + '%' : this.value">
                </div>
            </div>
        `;
    }

    function renderAdvancedTab(config) {
        return `
            <div class="config-group">
                <label class="config-label">Optimization</label>
                ${renderToggle('advanced', 'seoOptimization', 'SEO Optimization', config.seoOptimization !== false)}
                ${renderToggle('advanced', 'linkPreviewOptimization', 'Rich Link Previews', config.linkPreviewOptimization !== false)}
            </div>

            <div class="config-group">
                <label class="config-label">Structure Strategy</label>
                <div style="margin-bottom: 12px;">
                    <label class="config-label" style="font-size: 12px;">Thread Structure</label>
                    <select class="config-select" data-engine="advanced" data-key="threadStructure">
                        <option value="linear" ${config.threadStructure === 'linear' ? 'selected' : ''}>Linear (Standard)</option>
                        <option value="branching" ${config.threadStructure === 'branching' ? 'selected' : ''}>Branching (Complex)</option>
                    </select>
                </div>
                <div>
                    <label class="config-label" style="font-size: 12px;">Retweet Strategy</label>
                    <select class="config-select" data-engine="advanced" data-key="retweetStrategy">
                        <option value="off" ${config.retweetStrategy === 'off' ? 'selected' : ''}>Off</option>
                        <option value="selective" ${config.retweetStrategy === 'selective' ? 'selected' : ''}>Selective (High Performers)</option>
                        <option value="aggressive" ${config.retweetStrategy === 'aggressive' ? 'selected' : ''}>Aggressive</option>
                    </select>
                </div>
            </div>
        `;
    }

    function renderMultiSelect(engine, key, options, selectedValues) {
        const items = options.map(opt => {
            const isChecked = selectedValues.includes(opt.value);
            return `
                <label class="config-checkbox-item">
                    <input type="checkbox" class="config-multi-checkbox" 
                        data-engine="${engine}" data-key="${key}" value="${opt.value}"
                        ${isChecked ? 'checked' : ''}>
                    ${opt.label}
                </label>
            `;
        }).join('');

        return `<div class="config-multiselect-container">${items}</div>`;
    }

    function renderToggle(engine, key, label, isChecked) {
        return `
            <div class="config-toggle-container">
                <span class="config-toggle-label">${label}</span>
                <label class="config-toggle">
                    <input type="checkbox" class="config-toggle-input" 
                        data-engine="${engine}" data-key="${key}"
                        ${isChecked ? 'checked' : ''}>
                    <span class="config-toggle-slider"></span>
                </label>
            </div>
        `;
    }

    function renderTagInput(engine, key, tags) {
        const tagItems = tags.map(tag => `
            <span class="config-tag">
                ${tag}
                <span class="config-tag-remove" data-tag="${tag}" data-engine="${engine}" data-key="${key}">&times;</span>
            </span>
        `).join('');

        return `
            <div class="config-tag-container" id="tags-${engine}-${key}">
                ${tagItems}
                <input type="text" class="config-tag-input" 
                    data-engine="${engine}" data-key="${key}" 
                    placeholder="Add keyword...">
            </div>
        `;
    }

    function attachInputListeners() {
        // 1. Sliders & Selects
        document.querySelectorAll('.config-slider, .config-select').forEach(input => {
            input.addEventListener('change', (e) => {
                updateConfigValue(e.target.dataset.engine, e.target.dataset.key, e.target.value, e.target.type);
            });
        });

        // 2. Toggles (Single Checkbox)
        document.querySelectorAll('.config-toggle-input').forEach(input => {
            input.addEventListener('change', (e) => {
                updateConfigValue(e.target.dataset.engine, e.target.dataset.key, e.target.checked);
            });
        });

        // 3. Multi-Select (Checkbox Group)
        document.querySelectorAll('.config-multi-checkbox').forEach(input => {
            input.addEventListener('change', (e) => {
                const engine = e.target.dataset.engine;
                const key = e.target.dataset.key;
                const value = e.target.value;

                // Get current array (from overrides or currentConfigData)
                let currentArray = getDeepValue(currentOverrides, engine, key);
                if (currentArray === undefined) {
                    currentArray = getDeepValue(currentConfigData, engine, key) || [];
                    // Clone it to avoid mutating original
                    currentArray = [...currentArray];
                }

                if (e.target.checked) {
                    if (!currentArray.includes(value)) currentArray.push(value);
                } else {
                    currentArray = currentArray.filter(v => v !== value);
                }

                updateConfigValue(engine, key, currentArray);
            });
        });

        // 4. Tag Inputs
        document.querySelectorAll('.config-tag-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const tag = e.target.value.trim();
                    if (!tag) return;

                    const engine = e.target.dataset.engine;
                    const key = e.target.dataset.key;

                    let currentTags = getDeepValue(currentOverrides, engine, key);
                    if (currentTags === undefined) {
                        currentTags = getDeepValue(currentConfigData, engine, key) || [];
                        currentTags = [...currentTags];
                    }

                    if (!currentTags.includes(tag)) {
                        currentTags.push(tag);
                        updateConfigValue(engine, key, currentTags);

                        // Re-render tags part only
                        const container = document.getElementById(`tags-${engine}-${key}`);
                        // Insert before input
                        const span = document.createElement('span');
                        span.className = 'config-tag';
                        span.innerHTML = `${tag} <span class="config-tag-remove" data-tag="${tag}" data-engine="${engine}" data-key="${key}">&times;</span>`;
                        container.insertBefore(span, input);

                        // Re-attach remove listener for new tag
                        span.querySelector('.config-tag-remove').addEventListener('click', handleTagRemove);
                    }
                    e.target.value = '';
                }
            });
        });

        // Tag Remove Listeners
        document.querySelectorAll('.config-tag-remove').forEach(btn => {
            btn.addEventListener('click', handleTagRemove);
        });
    }

    function handleTagRemove(e) {
        const engine = e.target.dataset.engine;
        const key = e.target.dataset.key;
        const tagToRemove = e.target.dataset.tag;

        let currentTags = getDeepValue(currentOverrides, engine, key);
        if (currentTags === undefined) {
            currentTags = getDeepValue(currentConfigData, engine, key) || [];
            currentTags = [...currentTags];
        }

        currentTags = currentTags.filter(t => t !== tagToRemove);
        updateConfigValue(engine, key, currentTags);

        // Remove from DOM
        e.target.parentElement.remove();
    }

    function updateConfigValue(engine, key, value, type) {
        // Convert types if needed
        if (type === 'range') {
            value = parseFloat(value);
        }

        // Handle nested keys (e.g. formatMix.shortTweet)
        if (!currentOverrides[engine]) currentOverrides[engine] = {};

        if (key.includes('.')) {
            const [parent, child] = key.split('.');
            if (!currentOverrides[engine][parent]) {
                // Initialize with current config value if exists, or empty obj
                const existingParent = currentConfigData[engine]?.[parent] || {};
                currentOverrides[engine][parent] = { ...existingParent };
            }
            currentOverrides[engine][parent][child] = value;
        } else {
            currentOverrides[engine][key] = value;
        }

        console.log('Config changed:', currentOverrides);
    }

    function getDeepValue(obj, engine, key) {
        if (!obj || !obj[engine]) return undefined;
        if (key.includes('.')) {
            const [parent, child] = key.split('.');
            return obj[engine][parent]?.[child];
        }
        return obj[engine][key];
    }

    async function saveConfigChanges() {
        if (!currentConfigInstanceId) return;

        const btn = document.getElementById('config-save');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            // Save overrides using ConfigResolver
            await configResolver.saveChannelConfig(
                currentConfigInstanceId,
                currentOverrides,
                currentUser.uid
            );

            alert('✅ Configuration saved successfully!');
            closeConfigPanel();

        } catch (error) {
            console.error("Error saving config:", error);
            alert(`Error saving: ${error.message}`);
        } finally {
            btn.textContent = 'Save Changes';
            btn.disabled = false;
        }
    }

    async function resetAllConfig() {
        if (!confirm("Are you sure you want to reset all overrides to default?")) return;

        try {
            await configResolver.resetAllOverrides(currentConfigInstanceId);
            alert('✅ Configuration reset to defaults!');
            closeConfigPanel();
        } catch (error) {
            console.error("Error resetting config:", error);
            alert(`Error resetting: ${error.message}`);
        }
    }

    window.deactivateTeam = async function (instanceId) {
        if (!confirm("Are you sure you want to stop this team?")) return;
        try {
            await db.collection("projectAgentTeamInstances").doc(instanceId).update({ status: 'inactive' });
            loadAgentSwarm(new URLSearchParams(window.location.search).get('id'));
        } catch (error) {
            console.error("Error stopping team:", error);
            alert("Error stopping team.");
        }
    };

});
