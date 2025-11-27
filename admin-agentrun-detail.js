// admin-agentrun-detail.js
// Agent Task Execution Detail Viewer

(function () {
    let currentTaskId = null;
    let currentTask = null;
    const projectId = "default_project";

    window.initAgentrunDetail = function (user) {
        console.log("Initializing Agent Run Detail Page...");

        // Extract task ID from hash
        const hash = window.location.hash;
        const match = hash.match(/agentrun-detail\/(.+)/);

        if (!match) {
            console.error("No task ID in URL");
            return;
        }

        currentTaskId = match[1];
        loadTaskData();
    };

    async function loadTaskData() {
        try {
            // 1. Load Task Document
            const taskDoc = await db.collection(`projects/${projectId}/agentTasks`).doc(currentTaskId).get();

            if (!taskDoc.exists) {
                // Fallback for demo/testing if real task doesn't exist
                console.warn("Task not found, using mock data for demonstration");
                currentTask = generateMockTask(currentTaskId);
            } else {
                currentTask = { id: taskDoc.id, ...taskDoc.data() };
            }

            renderHeader();
            renderTimeline();

            // Auto-select first step
            if (currentTask.steps && currentTask.steps.length > 0) {
                selectStep(0);
            }
        } catch (error) {
            console.error("Error loading task:", error);
            alert(`Error: ${error.message}`);
        }
    }

    function renderHeader() {
        document.getElementById('run-id').textContent = currentTask.task_id || currentTask.id;
        document.getElementById('run-team').textContent = currentTask.agent_set_id || 'Unknown Team';

        const statusEl = document.getElementById('run-status');
        statusEl.textContent = (currentTask.status || 'unknown').toUpperCase();
        statusEl.style.background = getStatusColor(currentTask.status);
        statusEl.style.color = currentTask.status === 'running' ? '#1a1a1a' : '#fff';

        document.getElementById('run-started').textContent = formatDate(currentTask.created_at);
        document.getElementById('run-duration').textContent = calculateDuration(currentTask.created_at, currentTask.updated_at);
    }

    function renderTimeline() {
        const container = document.getElementById('execution-timeline');
        const steps = currentTask.steps || [];

        container.innerHTML = steps.map((step, index) => `
            <div class="timeline-step" onclick="selectStep(${index})" id="step-${index}">
                <div class="timeline-connector"></div>
                <div class="timeline-icon" style="background: ${getRoleColor(step.role, 0.2)}; color: ${getRoleColor(step.role, 1)};">
                    ${getRoleIcon(step.role)}
                    <div class="step-status-icon" style="background: ${getStatusColor(step.status)};">
                        ${getStatusIcon(step.status)}
                    </div>
                </div>
                <div>
                    <div style="font-weight: 600; font-size: 14px;">${capitalize(step.role)}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${step.sub_agent_id || 'v1.0.0'}</div>
                </div>
                <div style="margin-left: auto; font-size: 12px; color: rgba(255,255,255,0.4);">
                    ${step.latency_ms ? (step.latency_ms / 1000).toFixed(1) + 's' : ''}
                </div>
            </div>
        `).join('');
    }

    window.selectStep = function (index) {
        const steps = currentTask.steps || [];
        const step = steps[index];
        if (!step) return;

        // Update active state in timeline
        document.querySelectorAll('.timeline-step').forEach(el => el.classList.remove('active'));
        document.getElementById(`step-${index}`).classList.add('active');

        // Show detail view
        document.getElementById('step-detail-placeholder').style.display = 'none';
        const content = document.getElementById('step-detail-content');
        content.style.display = 'block';

        // Populate content
        document.getElementById('detail-title').textContent = `${getRoleIcon(step.role)} ${capitalize(step.role)} Agent`;
        document.getElementById('detail-meta').textContent = `ID: ${step.sub_agent_id} | Version: ${step.sub_agent_version || '1.0.0'}`;

        const statusEl = document.getElementById('detail-status');
        statusEl.textContent = step.status.toUpperCase();
        statusEl.style.background = getStatusColor(step.status);

        // Input
        const inputData = step.input || {};
        document.getElementById('detail-input').textContent = typeof inputData === 'string' ? inputData : JSON.stringify(inputData, null, 2);

        // Output (Artifact)
        const outputData = step.output || step.artifact || {};
        document.getElementById('detail-output').textContent = JSON.stringify(outputData, null, 2);
    }

    // --- Helper Functions ---

    function getStatusColor(status) {
        switch (status) {
            case 'success': return '#22c55e';
            case 'running': return '#fbbf24';
            case 'failed': return '#ef4444';
            case 'queued': return '#94a3b8';
            default: return '#64748b';
        }
    }

    function getStatusIcon(status) {
        switch (status) {
            case 'success': return '✓';
            case 'failed': return '✕';
            case 'running': return '⟳';
            default: return '-';
        }
    }

    function getRoleColor(role, opacity = 1) {
        const colors = {
            planner: `rgba(236, 72, 153, ${opacity})`, // Pink
            research: `rgba(59, 130, 246, ${opacity})`, // Blue
            creator: `rgba(168, 85, 247, ${opacity})`, // Purple
            compliance: `rgba(245, 158, 11, ${opacity})`, // Amber
            evaluator: `rgba(16, 185, 129, ${opacity})`, // Emerald
            manager: `rgba(99, 102, 241, ${opacity})`, // Indigo
            kpi_engine: `rgba(239, 68, 68, ${opacity})` // Red
        };
        return colors[role] || `rgba(255, 255, 255, ${opacity})`;
    }

    function getRoleIcon(role) {
        const icons = {
            planner: '🎯', research: '🔍', creator: '✍️',
            compliance: '⚖️', evaluator: '📊', manager: '👔', kpi_engine: '📈'
        };
        return icons[role] || '🤖';
    }

    function capitalize(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
    }

    function calculateDuration(start, end) {
        if (!start || !end) return '-';
        const s = start.toDate ? start.toDate() : new Date(start);
        const e = end.toDate ? end.toDate() : new Date(end);
        const diff = (e - s) / 1000;
        return `${diff.toFixed(1)}s`;
    }

    // Mock Data Generator for Testing
    function generateMockTask(id) {
        const now = new Date();
        return {
            task_id: id,
            agent_set_id: 'mock_team_v1',
            status: 'success',
            created_at: new Date(now.getTime() - 10000),
            updated_at: now,
            steps: [
                {
                    role: 'planner',
                    status: 'success',
                    sub_agent_id: 'planner_v1_0_0',
                    latency_ms: 1200,
                    input: { user_prompt: "Create a post about summer coffee" },
                    output: { goal: "Promote Summer Blend", target: "Young Adults", outline: ["Intro", "Flavor", "CTA"] }
                },
                {
                    role: 'creator',
                    status: 'success',
                    sub_agent_id: 'creator_v1_2_0',
                    latency_ms: 3500,
                    input: { plan: "Promote Summer Blend..." },
                    output: { title: "Cool Down with Summer Blend 🧊", content: "Beat the heat! #SummerCoffee" }
                },
                {
                    role: 'manager',
                    status: 'success',
                    sub_agent_id: 'manager_v1_0_0',
                    latency_ms: 800,
                    input: { draft: "Cool Down with Summer Blend..." },
                    output: { decision: "APPROVED", comments: "Looks good!" }
                }
            ]
        };
    }

})();
