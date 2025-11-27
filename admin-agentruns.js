// admin-agentruns.js
(function () {
    let allRuns = [];
    const projectId = "default_project";

    window.initAgentruns = function (user) {
        console.log("Initializing Agent Runs Page...");
        loadRuns();
    };

    window.refreshRuns = function () {
        loadRuns();
    };

    async function loadRuns() {
        const tbody = document.getElementById('runs-table-body');
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;">Loading...</td></tr>`;

        try {
            const snapshot = await db.collection(`projects/${projectId}/agentTasks`)
                .orderBy('created_at', 'desc')
                .limit(50)
                .get();

            allRuns = [];
            snapshot.forEach(doc => {
                allRuns.push({ id: doc.id, ...doc.data() });
            });

            renderRuns(allRuns);
        } catch (error) {
            console.error("Error loading runs:", error);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error loading runs: ${error.message}</td></tr>`;
        }
    }

    window.renderRuns = function (runs) {
        const tbody = document.getElementById('runs-table-body');

        if (runs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.3);">No runs found</td></tr>`;
            return;
        }

        tbody.innerHTML = runs.map(run => `
            <tr onclick="viewRunDetail('${run.id}')" style="cursor: pointer;">
                <td>
                    <div style="font-family: monospace; color: #16e0bd;">${run.id.substring(0, 8)}...</div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.3);">${run.id}</div>
                </td>
                <td>
                    <span class="status-badge status-${run.status || 'unknown'}">
                        ${(run.status || 'unknown').toUpperCase()}
                    </span>
                </td>
                <td>${run.agent_set_id || '-'}</td>
                <td>
                    <div style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: rgba(255,255,255,0.7);">
                        ${run.input?.user_prompt || '-'}
                    </div>
                </td>
                <td>${formatDate(run.created_at)}</td>
                <td>${calculateDuration(run.created_at, run.updated_at)}</td>
                <td>
                    <button class="admin-btn-secondary" style="padding: 4px 8px; font-size: 12px;">View</button>
                </td>
            </tr>
        `).join('');
    }

    window.viewRunDetail = function (runId) {
        window.location.hash = `#agentrun-detail/${runId}`;
    };

    window.filterRuns = function () {
        const searchTerm = document.getElementById('run-search').value.toLowerCase();
        const statusFilter = document.getElementById('run-status-filter').value;

        const filtered = allRuns.filter(run => {
            const matchesSearch = (run.id && run.id.toLowerCase().includes(searchTerm)) ||
                (run.input?.user_prompt && run.input.user_prompt.toLowerCase().includes(searchTerm));

            const matchesStatus = statusFilter === 'all' || run.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        renderRuns(filtered);
    };

    function formatDate(timestamp) {
        if (!timestamp) return '-';
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

})();
