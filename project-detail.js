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

            // Load KPIs (using project data for now)
            renderKPIs(project);

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

});
