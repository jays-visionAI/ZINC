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

            if (project.activeAgentSetId) {
                loadAgentTeam(id, project.activeAgentSetId);
            } else {
                renderNoTeamState();
            }

            // Load Channel Cards (Active Deployments)
            loadChannelCards(id);

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
            loadChannelCards(projectId); // Refresh cards

        } catch (error) {
            console.error("Error deploying team:", error);
            alert(`Deployment failed: ${error.message}`);
        } finally {
            btn.disabled = false;
        }
    }

    // --- Channel Cards Logic ---

    async function loadChannelCards(projectId) {
        const grid = document.getElementById("channel-cards-grid");
        if (!grid) return;

        try {
            const snapshot = await db.collection("projectAgentTeamInstances")
                .where("projectId", "==", projectId)
                .where("status", "==", "active")
                .get();

            const instances = [];
            snapshot.forEach(doc => instances.push({ id: doc.id, ...doc.data() }));

            if (instances.length === 0) {
                grid.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5); grid-column: 1 / -1; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px;">No active channels. Click "Deploy Team" to start.</div>';
                return;
            }

            // Fetch channel details for names/icons
            // Optimization: We could store channelName in the instance to avoid extra reads
            // We already did that in deployTeam (channelName)

            grid.innerHTML = instances.map(inst => `
                <div class="admin-card" style="border-top: 4px solid #16e0bd;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 18px; color: white;">${inst.name}</h3>
                            <div style="font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px;">Deployed: ${formatDate(inst.deployedAt)}</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 50%;">
                            ${getChannelIconById(inst.channelId)}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 16px;">
                        <button class="admin-btn-secondary" style="flex: 1; font-size: 13px;" onclick="viewTeamDetails('${inst.id}')">Manage</button>
                        <button class="admin-btn-secondary" style="flex: 1; font-size: 13px; background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.3);" onclick="deactivateTeam('${inst.id}')">Stop</button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error("Error loading channel cards:", error);
            grid.innerHTML = '<div style="text-align: center; color: #ef4444;">Error loading active channels.</div>';
        }
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

    window.viewTeamDetails = function (instanceId) {
        // For now, just reload the page with this team active?
        // Or navigate to a team detail page?
        // Let's just alert for Phase 1
        alert(`Managing Team: ${instanceId}`);
    };

    window.deactivateTeam = async function (instanceId) {
        if (!confirm("Are you sure you want to stop this team?")) return;
        try {
            await db.collection("projectAgentTeamInstances").doc(instanceId).update({ status: 'inactive' });
            loadChannelCards(new URLSearchParams(window.location.search).get('id'));
        } catch (error) {
            console.error("Error stopping team:", error);
            alert("Error stopping team.");
        }
    };

});
