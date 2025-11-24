// admin-project-detail.js

(function () {
    let projectId = null;
    let projectData = null;

    window.initProjectDetail = function (user) {
        console.log("Initializing Project Detail Page...");

        // Get project ID from URL hash
        const hash = window.location.hash;
        const match = hash.match(/project-detail\/([^\/]+)/);

        if (!match) {
            alert("No project ID provided");
            window.history.back();
            return;
        }

        projectId = match[1];
        console.log("Loading project:", projectId);

        loadProjectDetail();
        setupEventListeners();
    };

    function setupEventListeners() {
        const saveStatusBtn = document.getElementById("save-status-btn");
        if (saveStatusBtn) {
            saveStatusBtn.addEventListener("click", saveProjectStatus);
        }
    }

    async function loadProjectDetail() {
        try {
            // Load project data
            const projectDoc = await db.collection("projects").doc(projectId).get();

            if (!projectDoc.exists) {
                alert("Project not found");
                window.history.back();
                return;
            }

            projectData = { id: projectDoc.id, ...projectDoc.data() };

            // Render project info
            renderProjectInfo(projectData);

            // Render KPIs
            renderKPIs(projectData);

            // Load and render agents
            await loadAgents();

        } catch (error) {
            console.error("Error loading project:", error);
            alert(`Error loading project: ${error.message}`);
        }
    }

    function renderProjectInfo(project) {
        // Project name and status
        document.getElementById("project-name").textContent = project.projectName || "Untitled Project";

        const statusSelect = document.getElementById("project-status");
        if (statusSelect) {
            statusSelect.value = project.status || "Normal";
        }

        // Project details
        document.getElementById("project-owner").textContent = project.userId ? project.userId.substring(0, 8) + "..." : "-";
        document.getElementById("project-industry").textContent = project.industry || "-";

        const websiteLink = document.getElementById("project-website");
        if (project.websiteUrl) {
            websiteLink.href = project.websiteUrl;
            websiteLink.textContent = project.websiteUrl;
        } else {
            websiteLink.textContent = "-";
            websiteLink.removeAttribute("href");
        }

        const createdDate = project.createdAt
            ? new Date(project.createdAt.seconds * 1000).toLocaleDateString()
            : "-";
        document.getElementById("project-created").textContent = createdDate;

        document.getElementById("project-target").textContent = project.targetMarket || "-";
        document.getElementById("project-description").textContent = project.description || "-";
    }

    function renderKPIs(project) {
        // Follower Growth
        const growth = project.followerGrowth30d || 0;
        const growthDelta = project.followerGrowthDelta || 0;
        document.getElementById("kpi-growth").textContent = `${growth >= 0 ? '+' : ''}${growth}%`;
        document.getElementById("kpi-growth-delta").textContent = `${growthDelta >= 0 ? '+' : ''}${growthDelta}% vs last period`;
        document.getElementById("kpi-growth-delta").style.color = growthDelta >= 0 ? 'var(--color-success)' : '#ef4444';

        // Engagement Rate
        const engagement = project.engagementRate || 0;
        const engagementDelta = project.engagementRateDelta || 0;
        document.getElementById("kpi-engagement").textContent = `${engagement}%`;
        document.getElementById("kpi-engagement-delta").textContent = `${engagementDelta >= 0 ? '+' : ''}${engagementDelta}% vs last period`;
        document.getElementById("kpi-engagement-delta").style.color = engagementDelta >= 0 ? 'var(--color-success)' : '#ef4444';

        // Agent Health
        const health = project.agentHealthCurrent || 100;
        const healthMax = project.agentHealthMax || 100;
        document.getElementById("kpi-health").textContent = `${health}/${healthMax}`;
        document.getElementById("kpi-health-info").textContent = `${Math.round((health / healthMax) * 100)}% healthy`;

        // Pending Approvals
        const pending = project.pendingApprovals || 0;
        document.getElementById("kpi-pending").textContent = pending;
        document.getElementById("kpi-pending-info").textContent = pending > 0 ? "Needs attention" : "All clear";
        document.getElementById("kpi-pending-info").style.color = pending > 0 ? '#f59e0b' : 'var(--color-success)';
    }

    async function loadAgents() {
        const tbody = document.getElementById("agents-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading agents...</td></tr>';

        try {
            const agentsSnapshot = await db.collection("projects")
                .doc(projectId)
                .collection("agents")
                .get();

            if (agentsSnapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No agents assigned to this project</td></tr>';
                return;
            }

            tbody.innerHTML = "";

            agentsSnapshot.forEach(doc => {
                const agent = doc.data();
                const tr = document.createElement("tr");

                // Status badge
                let statusClass = "admin-status-active";
                if (agent.status === "Paused") statusClass = "admin-status-inactive";
                if (agent.status === "Error") statusClass = "admin-status-inactive";

                // Last active
                const lastActive = agent.lastActive
                    ? new Date(agent.lastActive.seconds * 1000).toLocaleDateString()
                    : "-";

                tr.innerHTML = `
                    <td>${agent.agentName || "Unnamed Agent"}</td>
                    <td>${agent.platform || "-"}</td>
                    <td><span class="admin-status-badge ${statusClass}">${agent.status || "Active"}</span></td>
                    <td>${agent.contentCreated || 0}</td>
                    <td>${agent.engagementRate || 0}%</td>
                    <td>
                        <span style="color: ${(agent.followerGrowth || 0) >= 0 ? 'var(--color-success)' : '#ef4444'}">
                            ${(agent.followerGrowth || 0) >= 0 ? '+' : ''}${agent.followerGrowth || 0}%
                        </span>
                    </td>
                    <td>${lastActive}</td>
                `;

                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error("Error loading agents:", error);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error loading agents: ${error.message}</td></tr>`;
        }
    }

    async function saveProjectStatus() {
        const statusSelect = document.getElementById("project-status");
        const saveBtn = document.getElementById("save-status-btn");

        if (!statusSelect || !saveBtn) return;

        const newStatus = statusSelect.value;

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";

            await db.collection("projects").doc(projectId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("Project status updated successfully!");
            projectData.status = newStatus;

        } catch (error) {
            console.error("Error updating status:", error);
            alert(`Error updating status: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Status";
        }
    }

    // Run immediately on first load
    window.initProjectDetail();

})();
