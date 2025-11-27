// admin-performance.js
let allPerformance = [];
const projectId = "default_project";

window.initPerformance = function (user) {
    console.log("Initializing Performance Page...");

    // Attach event listener to the "Record KPI" button
    const recordBtn = document.getElementById('record-kpi-btn');
    if (recordBtn) {
        recordBtn.onclick = window.openPerformanceModal;
        console.log("✅ Record KPI button event attached");
    } else {
        console.warn("❌ Record KPI button not found");
    }

    loadPerformanceData();
};

async function loadPerformanceData() {
    const tbody = document.getElementById('performance-table-body');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;">Loading...</td></tr>`;

    try {
        const snapshot = await db.collection(`projects/${projectId}/performance`)
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();

        allPerformance = [];
        snapshot.forEach(doc => {
            allPerformance.push({ id: doc.id, ...doc.data() });
        });

        renderPerformance(allPerformance);
    } catch (error) {
        console.error("Error loading performance:", error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error loading data: ${error.message}</td></tr>`;
    }
}

window.renderPerformance = function (data) {
    const tbody = document.getElementById('performance-table-body');

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.3);">No performance records found</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>
                <div style="font-family: monospace; color: #16e0bd;">${item.content_id.substring(0, 12)}...</div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.3);">Task: ${item.task_id || 'N/A'}</div>
            </td>
            <td>
                <span style="text-transform: capitalize;">${item.platform}</span>
            </td>
            <td>
                <span class="status-badge status-active">v${item.agent_set_version || '?'}</span>
            </td>
            <td>
                <div style="font-size: 12px;">
                    👁️ ${item.performance_metrics.impressions}
                    ❤️ ${item.performance_metrics.likes}
                </div>
            </td>
            <td>
                <strong>${(item.kpi_snapshot.actual_engagement * 100).toFixed(2)}%</strong>
                <span style="font-size: 11px; color: rgba(255,255,255,0.5);">Target: ${(item.kpi_snapshot.target_engagement * 100).toFixed(1)}%</span>
            </td>
            <td>
                ${getScoreBadge(item.kpi_snapshot.score)}
            </td>
            <td>${formatDate(item.created_at)}</td>
        </tr>
    `).join('');
}

window.openPerformanceModal = function () {
    console.log("🔓 Opening Performance Modal...");
    const modal = document.getElementById('performance-modal');
    if (modal) {
        modal.style.display = 'flex';
        console.log("✅ Modal opened");
    } else {
        console.error("❌ Modal element not found!");
    }
};

window.closePerformanceModal = function () {
    console.log("🔒 Closing Performance Modal...");
    document.getElementById('performance-modal').style.display = 'none';
    // Reset inputs
    document.getElementById('perf-task-id').value = '';
    document.getElementById('perf-impressions').value = '';
    document.getElementById('perf-likes').value = '';
    document.getElementById('perf-comments').value = '';
    document.getElementById('perf-saves').value = '';
};

window.savePerformance = async function () {
    const taskId = document.getElementById('perf-task-id').value.trim() || null;
    const platform = document.getElementById('perf-platform').value;

    const metrics = {
        impressions: parseInt(document.getElementById('perf-impressions').value) || 0,
        likes: parseInt(document.getElementById('perf-likes').value) || 0,
        comments: parseInt(document.getElementById('perf-comments').value) || 0,
        saves: parseInt(document.getElementById('perf-saves').value) || 0,
        shares: 0 // Simplified for modal
    };

    if (metrics.impressions === 0) {
        alert("Impressions must be greater than 0");
        return;
    }

    try {
        await window.PerformanceManager.recordPerformance(taskId, metrics, { platform });
        alert("✅ Performance Recorded!");
        closePerformanceModal();
        loadPerformanceData(); // Refresh list
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
};

window.filterPerformance = function () {
    const searchTerm = document.getElementById('perf-search').value.toLowerCase();
    const platformFilter = document.getElementById('perf-platform-filter').value;

    const filtered = allPerformance.filter(item => {
        const matchesSearch = (item.content_id && item.content_id.toLowerCase().includes(searchTerm)) ||
            (item.task_id && item.task_id.toLowerCase().includes(searchTerm));

        const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter;

        return matchesSearch && matchesPlatform;
    });

    renderPerformance(filtered);
};

function getScoreBadge(score) {
    let color = '#ef4444'; // Red
    if (score >= 90) color = '#22c55e'; // Green
    else if (score >= 70) color = '#3b82f6'; // Blue
    else if (score >= 50) color = '#fbbf24'; // Yellow

    return `<span style="background: ${color}20; color: ${color}; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${score}</span>`;
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
}
