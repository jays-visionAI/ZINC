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
                    console.log('[RuntimePerformance] Charts rendered after Chart.js loaded');
                } else {
                    console.error('[RuntimePerformance] Chart.js failed to load');
                }
            }, 500);
        } else {
            // Chart.js already loaded
            renderLatencyChart(mockLatencySeries);
            renderTokenCostChart(mockUsageSeries);
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

})();
