// admin-monitoring.js

(function () {
    let volumeChart = null;
    let agentChart = null;

    window.initMonitoring = async function () {
        console.log("Initializing Monitoring Dashboard...");
        loadMonitoringData();
    };

    window.loadMonitoringData = async function () {
        const range = document.getElementById('monitor-range').value;
        const now = new Date();
        let startDate = new Date();

        // Calculate Start Date
        if (range === '24h') startDate.setDate(now.getDate() - 1);
        else if (range === '7d') startDate.setDate(now.getDate() - 7);
        else if (range === '30d') startDate.setDate(now.getDate() - 30);

        try {
            // Fetch Agent Runs from Firestore
            // Note: In production, use a composite index or aggregation query
            // For MVP, client-side filtering of recent runs is acceptable for moderate volume
            const snapshot = await db.collection('agentRuns')
                .where('createdAt', '>=', startDate)
                .orderBy('createdAt', 'desc')
                .limit(500) // Safety limit
                .get();

            const runs = snapshot.docs.map(doc => doc.data());

            updateKPIs(runs);
            renderCharts(runs);
            renderLogsTable(runs);

        } catch (error) {
            console.error("Failed to load monitoring data:", error);
            // Handle Missing Index Error gracefully
            if (error.code === 'failed-precondition') {
                alert("Missing Index: Check console for index creation link.");
            }
        }
    };

    function updateKPIs(runs) {
        if (!runs.length) {
            document.getElementById('kpi-runs').textContent = "0";
            document.getElementById('kpi-cost').textContent = "$0.00";
            document.getElementById('kpi-success').textContent = "-";
            document.getElementById('kpi-latency').textContent = "-";
            return;
        }

        // 1. Total Runs
        document.getElementById('kpi-runs').textContent = runs.length.toLocaleString();

        // 2. Success Rate
        const successCount = runs.filter(r => r.status === 'success' || r.status === 'completed').length;
        const successRate = ((successCount / runs.length) * 100).toFixed(1);
        document.getElementById('kpi-success').textContent = `${successRate}%`;

        // 3. Avg Latency
        const totalLatency = runs.reduce((sum, r) => sum + (r.durationMs || 0), 0);
        const avgLatency = Math.round(totalLatency / runs.length);
        document.getElementById('kpi-latency').textContent = `${avgLatency}ms`;

        // 4. Est. Cost (Simple Sum)
        const totalCost = runs.reduce((sum, r) => sum + (r.cost || 0), 0); // Using 'tokens' as proxy if cost is missing
        // If cost is missing but tokens exist, estimate:
        // const estimatedCost = runs.reduce((sum, r) => sum + ((r.tokens || 0) / 1000 * 0.002), 0); 
        document.getElementById('kpi-cost').textContent = `⚡ ${totalCost.toFixed(4)}`; // Showing Credits or $
    }

    function renderCharts(runs) {
        // Prepare Data for Volume Chart (Time Series)
        // Groups by Date (Day or Hour)
        const dateGroups = {};
        runs.forEach(r => {
            const date = r.createdAt.toDate().toLocaleDateString();
            if (!dateGroups[date]) dateGroups[date] = { runs: 0, cost: 0 };
            dateGroups[date].runs++;
            dateGroups[date].cost += (r.cost || 0);
        });

        const labels = Object.keys(dateGroups).reverse(); // Oldest first
        const runData = labels.map(d => dateGroups[d].runs);
        const costData = labels.map(d => dateGroups[d].cost);

        // 1. Volume & Cost Chart (Combined Bar/Line)
        const ctxVolume = document.getElementById('chart-volume').getContext('2d');
        if (volumeChart) volumeChart.destroy();

        volumeChart = new Chart(ctxVolume, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Runs',
                        data: runData,
                        backgroundColor: '#3b82f6',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Cost',
                        data: costData,
                        type: 'line',
                        borderColor: '#ef4444',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#ef4444' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } }
                }
            }
        });

        // 2. Agent Distribution (Donut)
        const agentCounts = {};
        runs.forEach(r => {
            const agent = r.agentId || 'Unknown';
            agentCounts[agent] = (agentCounts[agent] || 0) + 1;
        });

        const agentLabels = Object.keys(agentCounts);
        const agentData = Object.values(agentCounts);
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

        const ctxAgent = document.getElementById('chart-agents').getContext('2d');
        if (agentChart) agentChart.destroy();

        agentChart = new Chart(ctxAgent, {
            type: 'doughnut',
            data: {
                labels: agentLabels,
                datasets: [{
                    data: agentData,
                    backgroundColor: colors.slice(0, agentLabels.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#fff' } },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.chart._metasets[context.datasetIndex].total;
                                const percentage = Math.round((value / total) * 100) + '%';
                                return label + ': ' + value + ' (' + percentage + ')';
                            }
                        }
                    }
                }
            }
        });
    }

    function renderLogsTable(runs) {
        const tbody = document.getElementById('monitoring-logs-body');
        tbody.innerHTML = runs.slice(0, 20).map(r => {
            const date = r.createdAt.toDate();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `
                <tr onclick="viewLogDetail('${r.runId}', '${r.agentId}', '${r.logPath}')" style="cursor: pointer;">
                    <td style="color: rgba(255,255,255,0.7);">${timeStr}</td>
                    <td style="font-weight: 500; color: #fff;">${r.agentId || '-'}</td>
                    <td>
                        <span class="admin-badge ${r.status === 'success' ? 'badge-active' : 'badge-inactive'}">
                            ${(r.status || 'unknown').toUpperCase()}
                        </span>
                    </td>
                    <td>${r.durationMs ? r.durationMs + 'ms' : '-'}</td>
                    <td>${r.tokens || 0}</td>
                    <td style="font-size: 10px; color: #3b82f6;">VIEW LOG</td>
                </tr>
            `;
        }).join('');
    }

    // Modal Logic
    window.viewLogDetail = async function (runId, agentId, logPath) {
        const modal = document.getElementById('log-detail-modal');
        const metaEl = document.getElementById('log-meta');
        const jsonEl = document.getElementById('log-json');

        modal.style.display = 'flex';
        metaEl.innerHTML = `<strong>Run ID:</strong> ${runId} <span style="margin: 0 10px; opacity:0.3;">|</span> <strong>Agent:</strong> ${agentId}`;
        jsonEl.textContent = "Loading detailed log from GCS...";

        if (!logPath) {
            jsonEl.textContent = "No detailed log path available.";
            return;
        }

        try {
            // Note: In client-side JS, we cannot directly read GCS private buckets easily without a signed URL.
            // For this Admin panel, we might need a Cloud Function to fetch the log content.
            // OR if the bucket is public (not recommended).

            // Assuming for now we rely on a helper function or direct Firestore 'details' if we stored them there (we didn't).
            // Let's call a Cloud Function 'getLogContent' (Needs to be implemented) or
            // just show a placeholder message for Phase 4 MVP.

            // MVP: Show available metadata from Firestore run record?
            // "In a real implementation, this would fetch: " + logPath

            jsonEl.textContent = `[GCS Log Path]: ${logPath}\n\nTo view full content, implement 'getLogContent' Cloud Function or use GCS Console.\n(This ensures browser doesn't download massive JSONs automatically)`;

        } catch (error) {
            jsonEl.textContent = "Error loading log: " + error.message;
        }
    };

    window.closeLogModal = function () {
        document.getElementById('log-detail-modal').style.display = 'none';
    };

})();
