// admin-runtime-performance.js
// PRD 10.0: Runtime Performance & Analytics Dashboard
// Step 3: Time-Series Charts Implementation

(function () {
    // Chart instances
    let latencyChart = null;
    let tokenCostChart = null;

    // Mock Data for Development
    const mockLatencySeries = [
        { timestamp: '2025-11-30T00:00:00Z', avgLatencyMs: 900 },
        { timestamp: '2025-11-30T01:00:00Z', avgLatencyMs: 780 },
        { timestamp: '2025-11-30T02:00:00Z', avgLatencyMs: 850 },
        { timestamp: '2025-11-30T03:00:00Z', avgLatencyMs: 720 },
        { timestamp: '2025-11-30T04:00:00Z', avgLatencyMs: 680 },
        { timestamp: '2025-11-30T05:00:00Z', avgLatencyMs: 750 },
        { timestamp: '2025-11-30T06:00:00Z', avgLatencyMs: 820 },
        { timestamp: '2025-11-30T07:00:00Z', avgLatencyMs: 890 },
        { timestamp: '2025-11-30T08:00:00Z', avgLatencyMs: 950 },
        { timestamp: '2025-11-30T09:00:00Z', avgLatencyMs: 870 },
        { timestamp: '2025-11-30T10:00:00Z', avgLatencyMs: 800 },
        { timestamp: '2025-11-30T11:00:00Z', avgLatencyMs: 760 },
        { timestamp: '2025-11-30T12:00:00Z', avgLatencyMs: 730 },
        { timestamp: '2025-11-30T13:00:00Z', avgLatencyMs: 790 },
        { timestamp: '2025-11-30T14:00:00Z', avgLatencyMs: 840 },
        { timestamp: '2025-11-30T15:00:00Z', avgLatencyMs: 810 },
        { timestamp: '2025-11-30T16:00:00Z', avgLatencyMs: 770 },
        { timestamp: '2025-11-30T17:00:00Z', avgLatencyMs: 750 },
        { timestamp: '2025-11-30T18:00:00Z', avgLatencyMs: 820 },
        { timestamp: '2025-11-30T19:00:00Z', avgLatencyMs: 880 },
        { timestamp: '2025-11-30T20:00:00Z', avgLatencyMs: 920 },
        { timestamp: '2025-11-30T21:00:00Z', avgLatencyMs: 860 },
        { timestamp: '2025-11-30T22:00:00Z', avgLatencyMs: 790 },
        { timestamp: '2025-11-30T23:00:00Z', avgLatencyMs: 740 }
    ];

    const mockUsageSeries = [
        { timestamp: '2025-11-30T00:00:00Z', totalTokens: 12000, totalCostUsd: 1.20 },
        { timestamp: '2025-11-30T01:00:00Z', totalTokens: 8000, totalCostUsd: 0.80 },
        { timestamp: '2025-11-30T02:00:00Z', totalTokens: 9500, totalCostUsd: 0.95 },
        { timestamp: '2025-11-30T03:00:00Z', totalTokens: 7200, totalCostUsd: 0.72 },
        { timestamp: '2025-11-30T04:00:00Z', totalTokens: 6800, totalCostUsd: 0.68 },
        { timestamp: '2025-11-30T05:00:00Z', totalTokens: 8500, totalCostUsd: 0.85 },
        { timestamp: '2025-11-30T06:00:00Z', totalTokens: 10200, totalCostUsd: 1.02 },
        { timestamp: '2025-11-30T07:00:00Z', totalTokens: 11500, totalCostUsd: 1.15 },
        { timestamp: '2025-11-30T08:00:00Z', totalTokens: 13200, totalCostUsd: 1.32 },
        { timestamp: '2025-11-30T09:00:00Z', totalTokens: 14800, totalCostUsd: 1.48 },
        { timestamp: '2025-11-30T10:00:00Z', totalTokens: 15500, totalCostUsd: 1.55 },
        { timestamp: '2025-11-30T11:00:00Z', totalTokens: 16200, totalCostUsd: 1.62 },
        { timestamp: '2025-11-30T12:00:00Z', totalTokens: 17000, totalCostUsd: 1.70 },
        { timestamp: '2025-11-30T13:00:00Z', totalTokens: 15800, totalCostUsd: 1.58 },
        { timestamp: '2025-11-30T14:00:00Z', totalTokens: 14500, totalCostUsd: 1.45 },
        { timestamp: '2025-11-30T15:00:00Z', totalTokens: 13800, totalCostUsd: 1.38 },
        { timestamp: '2025-11-30T16:00:00Z', totalTokens: 12900, totalCostUsd: 1.29 },
        { timestamp: '2025-11-30T17:00:00Z', totalTokens: 11700, totalCostUsd: 1.17 },
        { timestamp: '2025-11-30T18:00:00Z', totalTokens: 10500, totalCostUsd: 1.05 },
        { timestamp: '2025-11-30T19:00:00Z', totalTokens: 9800, totalCostUsd: 0.98 },
        { timestamp: '2025-11-30T20:00:00Z', totalTokens: 8900, totalCostUsd: 0.89 },
        { timestamp: '2025-11-30T21:00:00Z', totalTokens: 8200, totalCostUsd: 0.82 },
        { timestamp: '2025-11-30T22:00:00Z', totalTokens: 7500, totalCostUsd: 0.75 },
        { timestamp: '2025-11-30T23:00:00Z', totalTokens: 6900, totalCostUsd: 0.69 }
    ];

    /**
     * Initialize Runtime Performance Page
     */
    window.initRuntimePerformance = function (user) {
        console.log('[RuntimePerformance] Initializing page...');

        // Render KPI Cards
        renderKPICards();

        // Wait for Chart.js to be available
        if (typeof Chart === 'undefined') {
            console.log('[RuntimePerformance] Waiting for Chart.js to load...');
            setTimeout(() => {
                if (typeof Chart !== 'undefined') {
                    renderLatencyChart(mockLatencySeries);
                    renderTokenCostChart(mockUsageSeries);
                    renderEngineTypeOverview(mockEngineStats);
                    renderRuntimeRuleOverview(mockRuleStats);
                    console.log('[RuntimePerformance] Charts rendered after Chart.js loaded');
                } else {
                    console.error('[RuntimePerformance] Chart.js failed to load');
                }
            }, 500);
        } else {
            // Chart.js already loaded
            renderLatencyChart(mockLatencySeries);
            renderTokenCostChart(mockUsageSeries);
            renderEngineTypeOverview(mockEngineStats);
            renderRuntimeRuleOverview(mockRuleStats);
            console.log('[RuntimePerformance] Page initialized successfully');
        }
    };

    /**
     * Render KPI Cards
     */
    function renderKPICards() {
        const container = document.getElementById('rp-kpi-cards');
        if (!container) return;

        const kpis = [
            {
                title: 'Avg Latency',
                value: '820ms',
                change: '-12%',
                trend: 'down',
                icon: '⚡',
                color: '#60a5fa'
            },
            {
                title: 'Total Requests',
                value: '24,567',
                change: '+8%',
                trend: 'up',
                icon: '📊',
                color: '#22c55e'
            },
            {
                title: 'Total Cost',
                value: '$28.45',
                change: '+5%',
                trend: 'up',
                icon: '💰',
                color: '#fbbf24'
            },
            {
                title: 'Success Rate',
                value: '98.7%',
                change: '+0.3%',
                trend: 'up',
                icon: '✅',
                color: '#10b981'
            }
        ];

        container.innerHTML = kpis.map(kpi => `
            <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 24px;">${kpi.icon}</span>
                    <span style="font-size: 12px; padding: 4px 8px; border-radius: 4px; background: ${kpi.trend === 'up' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${kpi.trend === 'up' ? '#22c55e' : '#ef4444'};">
                        ${kpi.change}
                    </span>
                </div>
                <div style="font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 6px;">${kpi.title}</div>
                <div style="font-size: 28px; font-weight: 700; color: ${kpi.color};">${kpi.value}</div>
            </div>
        `).join('');
    }

    /**
     * Render Latency Trend Chart
     * @param {Array} data - Array of {timestamp, avgLatencyMs}
     */
    function renderLatencyChart(data) {
        const ctx = document.getElementById('latency-chart');
        if (!ctx) {
            console.error('[RuntimePerformance] Latency chart canvas not found');
            return;
        }

        // Destroy existing chart
        if (latencyChart) {
            latencyChart.destroy();
        }

        // Prepare data
        const labels = data.map(d => {
            const date = new Date(d.timestamp);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        });
        const values = data.map(d => d.avgLatencyMs);

        // Create chart
        latencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Avg Latency (ms)',
                    data: values,
                    borderColor: '#60a5fa',
                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#60a5fa',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 3,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: 'rgba(255,255,255,0.7)',
                            font: {
                                size: 12
                            },
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#fff',
                        bodyColor: 'rgba(255,255,255,0.8)',
                        borderColor: 'rgba(96, 165, 250, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function (context) {
                                return `Latency: ${context.parsed.y}ms`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255,255,255,0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: {
                                size: 11
                            },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(255,255,255,0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: {
                                size: 11
                            },
                            callback: function (value) {
                                return value + 'ms';
                            }
                        }
                    }
                }
            }
        });

        console.log('[RuntimePerformance] Latency chart rendered');
    }

    /**
     * Render Token & Cost Trend Chart (Mixed: Bar + Line)
     * @param {Array} data - Array of {timestamp, totalTokens, totalCostUsd}
     */
    function renderTokenCostChart(data) {
        const ctx = document.getElementById('token-cost-chart');
        if (!ctx) {
            console.error('[RuntimePerformance] Token/Cost chart canvas not found');
            return;
        }

        // Destroy existing chart
        if (tokenCostChart) {
            tokenCostChart.destroy();
        }

        // Prepare data
        const labels = data.map(d => {
            const date = new Date(d.timestamp);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        });
        const tokens = data.map(d => d.totalTokens);
        const costs = data.map(d => d.totalCostUsd);

        // Create chart
        tokenCostChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Total Tokens',
                        data: tokens,
                        backgroundColor: 'rgba(34, 197, 94, 0.6)',
                        borderColor: '#22c55e',
                        borderWidth: 1,
                        yAxisID: 'y',
                        order: 2
                    },
                    {
                        type: 'line',
                        label: 'Total Cost (USD)',
                        data: costs,
                        borderColor: '#fbbf24',
                        backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#fbbf24',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        yAxisID: 'y1',
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 3,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: 'rgba(255,255,255,0.7)',
                            font: {
                                size: 12
                            },
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#fff',
                        bodyColor: 'rgba(255,255,255,0.8)',
                        borderColor: 'rgba(96, 165, 250, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.dataset.yAxisID === 'y') {
                                    label += context.parsed.y.toLocaleString() + ' tokens';
                                } else {
                                    label += '$' + context.parsed.y.toFixed(2);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255,255,255,0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: {
                                size: 11
                            },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255,255,255,0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: {
                                size: 11
                            },
                            callback: function (value) {
                                return (value / 1000).toFixed(0) + 'k';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Tokens',
                            color: '#22c55e',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: {
                                size: 11
                            },
                            callback: function (value) {
                                return '$' + value.toFixed(2);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Cost (USD)',
                            color: '#fbbf24',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });

        console.log('[RuntimePerformance] Token/Cost chart rendered');
    }

    /**
     * Apply Filters (placeholder for future implementation)
     */
    window.applyFilters = function () {
        const timeRange = document.getElementById('rp-time-range')?.value;
        const engineType = document.getElementById('rp-engine-type')?.value;
        const provider = document.getElementById('rp-provider')?.value;
        const tier = document.getElementById('rp-tier')?.value;

        console.log('[RuntimePerformance] Filters applied:', { timeRange, engineType, provider, tier });

        // TODO: Fetch filtered data from Firestore
        // For now, just re-render with mock data
        renderLatencyChart(mockLatencySeries);
        renderTokenCostChart(mockUsageSeries);
    };

    /**
     * Refresh Performance Data
     */
    window.refreshPerformanceData = function () {
        console.log('[RuntimePerformance] Refreshing data...');
        renderKPICards();
        renderLatencyChart(mockLatencySeries);
        renderTokenCostChart(mockUsageSeries);
    };

    /**
     * Export Performance Data
     */
    window.exportPerformanceData = function () {
        console.log('[RuntimePerformance] Exporting data...');
        alert('Export functionality coming soon!');
    };

    // Mock Data for Engine Type & Runtime Rule Overview
    const mockEngineStats = [
        { engineType: 'planner', calls: 1200, successRate: 0.98, avgLatencyMs: 800, totalTokens: 120000, totalCostUsd: 1.2 },
        { engineType: 'creator_text', calls: 2500, successRate: 0.96, avgLatencyMs: 950, totalTokens: 340000, totalCostUsd: 3.4 },
        { engineType: 'research', calls: 1800, successRate: 0.99, avgLatencyMs: 720, totalTokens: 280000, totalCostUsd: 2.8 },
        { engineType: 'engagement', calls: 3200, successRate: 0.94, avgLatencyMs: 650, totalTokens: 180000, totalCostUsd: 1.8 },
        { engineType: 'creator_image', calls: 450, successRate: 0.92, avgLatencyMs: 1200, totalTokens: 95000, totalCostUsd: 4.5 },
        { engineType: 'compliance', calls: 890, successRate: 0.97, avgLatencyMs: 780, totalTokens: 145000, totalCostUsd: 1.45 },
        { engineType: 'evaluator', calls: 1100, successRate: 0.98, avgLatencyMs: 820, totalTokens: 165000, totalCostUsd: 1.65 },
        { engineType: 'manager', calls: 650, successRate: 0.99, avgLatencyMs: 750, totalTokens: 98000, totalCostUsd: 0.98 }
    ];

    const mockRuleStats = [
        { runtimeRuleId: 'rpr_planner_global_v1', engineType: 'planner', tier: 'balanced', calls: 800, successRate: 0.95, avgLatencyMs: 1200 },
        { runtimeRuleId: 'rpr_creator_text_global_v1', engineType: 'creator_text', tier: 'creative', calls: 1500, successRate: 0.92, avgLatencyMs: 1400 },
        { runtimeRuleId: 'rpr_creator_image_global_v1', engineType: 'creator_image', tier: 'balanced', calls: 300, successRate: 0.88, avgLatencyMs: 1600 },
        { runtimeRuleId: 'rpr_engagement_global_v1', engineType: 'engagement', tier: 'precise', calls: 2000, successRate: 0.90, avgLatencyMs: 1100 },
        { runtimeRuleId: 'rpr_research_global_v1', engineType: 'research', tier: 'balanced', calls: 1200, successRate: 0.94, avgLatencyMs: 1000 },
        { runtimeRuleId: 'rpr_compliance_global_v1', engineType: 'compliance', tier: 'precise', calls: 600, successRate: 0.96, avgLatencyMs: 900 },
        { runtimeRuleId: 'rpr_evaluator_global_v1', engineType: 'evaluator', tier: 'balanced', calls: 800, successRate: 0.97, avgLatencyMs: 850 }
    ];

    let engineTypeChart = null;
    let runtimeRuleChart = null;

    /**
     * Render Engine Type Overview (Chart + Table)
     * @param {Array} data - Array of engine stats
     */
    function renderEngineTypeOverview(data) {
        // Sort by total cost descending
        const sortedData = [...data].sort((a, b) => b.totalCostUsd - a.totalCostUsd);

        // Render Chart
        const ctx = document.getElementById('engine-type-chart');
        if (ctx) {
            if (engineTypeChart) {
                engineTypeChart.destroy();
            }

            const labels = sortedData.map(d => d.engineType.replace('_', ' '));
            const costs = sortedData.map(d => d.totalCostUsd);

            engineTypeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Cost (USD)',
                        data: costs,
                        backgroundColor: 'rgba(251, 191, 36, 0.6)',
                        borderColor: '#fbbf24',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            bodyColor: 'rgba(255,255,255,0.8)',
                            borderColor: 'rgba(251, 191, 36, 0.3)',
                            borderWidth: 1,
                            padding: 12,
                            callbacks: {
                                label: function (context) {
                                    return `Cost: $${context.parsed.y.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                            ticks: {
                                color: 'rgba(255,255,255,0.5)',
                                font: { size: 10 },
                                callback: function (value) { return '$' + value.toFixed(1); }
                            }
                        }
                    }
                }
            });
        }

        // Render Table
        const tableContainer = document.getElementById('engine-type-table');
        if (tableContainer) {
            tableContainer.innerHTML = `
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <th style="padding: 8px; text-align: left; color: rgba(255,255,255,0.5); font-weight: 600;">Engine Type</th>
                            <th style="padding: 8px; text-align: right; color: rgba(255,255,255,0.5); font-weight: 600;">Calls</th>
                            <th style="padding: 8px; text-align: right; color: rgba(255,255,255,0.5); font-weight: 600;">Success %</th>
                            <th style="padding: 8px; text-align: right; color: rgba(255,255,255,0.5); font-weight: 600;">Avg Latency</th>
                            <th style="padding: 8px; text-align: right; color: rgba(255,255,255,0.5); font-weight: 600;">Tokens</th>
                            <th style="padding: 8px; text-align: right; color: rgba(255,255,255,0.5); font-weight: 600;">Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedData.map(d => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 8px; color: #60a5fa;">${d.engineType.replace('_', ' ')}</td>
                                <td style="padding: 8px; text-align: right; color: rgba(255,255,255,0.7);">${d.calls.toLocaleString()}</td>
                                <td style="padding: 8px; text-align: right; color: ${d.successRate >= 0.95 ? '#22c55e' : '#fbbf24'};">${(d.successRate * 100).toFixed(1)}%</td>
                                <td style="padding: 8px; text-align: right; color: rgba(255,255,255,0.7);">${d.avgLatencyMs}ms</td>
                                <td style="padding: 8px; text-align: right; color: rgba(255,255,255,0.7);">${(d.totalTokens / 1000).toFixed(0)}k</td>
                                <td style="padding: 8px; text-align: right; color: #fbbf24; font-weight: 600;">$${d.totalCostUsd.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        console.log('[RuntimePerformance] Engine Type overview rendered');
    }

    /**
     * Render Runtime Rule Overview (Chart + Worst 5 Table)
     * @param {Array} data - Array of rule stats
     */
    function renderRuntimeRuleOverview(data) {
        // Sort by success rate ascending (worst first) and take top 5
        const worstRules = [...data].sort((a, b) => a.successRate - b.successRate).slice(0, 5);

        // Render Chart
        const ctx = document.getElementById('runtime-rule-chart');
        if (ctx) {
            if (runtimeRuleChart) {
                runtimeRuleChart.destroy();
            }

            const labels = worstRules.map(d => d.runtimeRuleId.replace('rpr_', '').replace('_global_v1', ''));
            const latencies = worstRules.map(d => d.avgLatencyMs);

            runtimeRuleChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Avg Latency (ms)',
                        data: latencies,
                        backgroundColor: 'rgba(239, 68, 68, 0.6)',
                        borderColor: '#ef4444',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            bodyColor: 'rgba(255,255,255,0.8)',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            borderWidth: 1,
                            padding: 12,
                            callbacks: {
                                label: function (context) {
                                    return `Latency: ${context.parsed.y}ms`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 }, maxRotation: 45 }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                            ticks: {
                                color: 'rgba(255,255,255,0.5)',
                                font: { size: 10 },
                                callback: function (value) { return value + 'ms'; }
                            }
                        }
                    }
                }
            });
        }

        // Render Table
        const tableContainer = document.getElementById('runtime-rule-table');
        if (tableContainer) {
            tableContainer.innerHTML = `
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <th style="padding: 8px; text-align: left; color: rgba(255,255,255,0.5); font-weight: 600;">Runtime Rule</th>
                            <th style="padding: 8px; text-align: left; color: rgba(255,255,255,0.5); font-weight: 600;">Engine</th>
                            <th style="padding: 8px; text-align: center; color: rgba(255,255,255,0.5); font-weight: 600;">Tier</th>
                            <th style="padding: 8px; text-align: right; color: rgba(255,255,255,0.5); font-weight: 600;">Calls</th>
                            <th style="padding: 8px; text-align: right; color: rgba(255,255,255,0.5); font-weight: 600;">Success %</th>
                            <th style="padding: 8px; text-align: right; color: rgba(255,255,255,0.5); font-weight: 600;">Latency</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${worstRules.map((d, index) => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 8px; color: #ef4444; font-size: 11px;">${d.runtimeRuleId.replace('rpr_', '')}</td>
                                <td style="padding: 8px; color: rgba(255,255,255,0.7);">${d.engineType}</td>
                                <td style="padding: 8px; text-align: center;">
                                    <span style="padding: 2px 6px; border-radius: 4px; background: rgba(96, 165, 250, 0.1); color: #60a5fa; font-size: 10px;">
                                        ${d.tier}
                                    </span>
                                </td>
                                <td style="padding: 8px; text-align: right; color: rgba(255,255,255,0.7);">${d.calls.toLocaleString()}</td>
                                <td style="padding: 8px; text-align: right; color: ${d.successRate >= 0.95 ? '#22c55e' : d.successRate >= 0.90 ? '#fbbf24' : '#ef4444'}; font-weight: 600;">
                                    ${(d.successRate * 100).toFixed(1)}%
                                </td>
                                <td style="padding: 8px; text-align: right; color: ${d.avgLatencyMs > 1200 ? '#ef4444' : '#fbbf24'}; font-weight: 600;">
                                    ${d.avgLatencyMs}ms
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        console.log('[RuntimePerformance] Runtime Rule overview rendered');
    }

})();
