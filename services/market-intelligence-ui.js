/**
 * Market Intelligence UI (Vanilla JS Version)
 * Replaces the React-based MarketIntelligenceBridge to avoid build/MIME issues.
 */

class MarketIntelligenceUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.state = {
            status: 'idle',
            data: [],
            keywords: [],
            projectId: null,
            timeRange: '7D',
            selectedChannels: ['News', 'Social'],
            selectedTrendId: null
        };

        if (this.container) {
            this.init();
        }
    }

    init() {
        this.render();
        this.loadData();
    }

    setState(newState) {
        const oldSelectedTrendId = this.state.selectedTrendId;
        this.state = { ...this.state, ...newState };

        // If status changed or data changed, re-render everything
        // For simple updates, we could be more granular, but for this refactor, re-rendering is safest.
        this.render();

        // Handle transitions for drawer if needed
        if (oldSelectedTrendId !== this.state.selectedTrendId) {
            // Optional: smooth scroll or focus
        }
    }

    loadData() {
        const { data, keywords } = this.state;

        // If real-time data is already provided, use it
        if (data && data.length > 0) {
            this.setState({ status: 'success' });
            return;
        }

        this.setState({ status: 'loading' });

        // Simulate fetching/analyzing based on keywords
        setTimeout(() => {
            if (!this.state.keywords || this.state.keywords.length === 0) {
                this.setState({ status: 'success', data: [] });
                return;
            }

            // Generate mock data if none exists
            const trends = this.state.keywords.map((kw, idx) => ({
                id: `trend-${idx}`,
                name: kw,
                velocity: Math.floor(Math.random() * 30) - 5,
                volume: Math.floor(Math.random() * 50000) + 1000,
                sentiment: Math.random() * 0.8 + 0.2,
                confidence: 0.7 + Math.random() * 0.25,
                history: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100)),
                summary: `${kw} is showing strong relevance to your project strategy. Search volume in ${this.state.selectedChannels.join(' & ')} is increasing.`,
                drivers: [
                    'Emerging consumer search patterns',
                    'Competitor marketing focus shift',
                    'Social media mentions increase'
                ],
                evidence: [
                    {
                        id: `ev-${idx}-1`,
                        title: `${kw} Market Report 2026`,
                        publisher: 'ZYNK Intelligent Scan',
                        date: '1d ago',
                        snippet: `Recent analysis shows ${kw} becoming a core pillar for high-growth sectors.`,
                        url: '#'
                    }
                ]
            }));

            this.setState({ status: 'success', data: trends });
        }, 800);
    }

    handleRefresh() {
        this.setState({ selectedTrendId: null });
        if (window.triggerMarketIntelligenceResearch) {
            window.triggerMarketIntelligenceResearch();
        } else {
            this.loadData();
        }
    }

    toggleChannel(channel) {
        const channels = [...this.state.selectedChannels];
        const index = channels.indexOf(channel);
        if (index > -1) {
            channels.splice(index, 1);
        } else {
            channels.push(channel);
        }
        this.setState({ selectedChannels: channels });
    }

    setTimeRange(range) {
        this.setState({ timeRange: range });
    }

    setSelectedTrend(id) {
        this.setState({ selectedTrendId: this.state.selectedTrendId === id ? null : id });
    }

    // --- RENDER METHODS ---

    render() {
        if (!this.container) return;

        const isDrawerOpen = !!this.state.selectedTrendId;
        const selectedTrend = this.state.data.find(t => t.id === this.state.selectedTrendId);

        this.container.innerHTML = `
            <section class="relative w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden min-h-[850px]">
                ${this.renderHeader()}
                
                <div class="transition-all duration-500 ease-in-out ${isDrawerOpen ? 'md:mr-[24rem]' : ''}">
                    ${this.renderContent()}
                </div>

                ${this.renderDrawer(selectedTrend, isDrawerOpen)}
            </section>
        `;

        this.attachEventListeners();
    }

    renderHeader() {
        const { timeRange, selectedChannels, status } = this.state;
        const isRefreshing = status === 'loading';

        return `
            <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div class="flex items-center gap-4">
                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
                        <svg class="text-cyan-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            <span class="text-cyan-400">📊</span> Market Intelligence
                        </h1>
                        <p class="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">Real-time Analysis • Enterprise Insight Hub</p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-4">
                    <div class="bg-slate-900 border border-slate-800 rounded-lg p-1 flex">
                        ${['7D', '30D'].map(range => `
                            <button data-range="${range}" class="time-range-btn px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${timeRange === range ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/5' : 'text-slate-500 hover:text-white'}">
                                ${range}
                            </button>
                        `).join('')}
                    </div>

                    <div class="w-px h-8 bg-slate-800 hidden md:block"></div>

                    <div class="flex gap-2">
                        ${['News', 'Social', 'Video'].map(channel => `
                            <button data-channel="${channel}" class="channel-btn px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedChannels.includes(channel) ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-500 hover:text-white'}">
                                ${channel}
                            </button>
                        `).join('')}
                    </div>

                    <div class="w-px h-8 bg-slate-800 hidden md:block"></div>

                    <div class="flex items-center gap-2">
                        <button id="add-tracker-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs font-bold tracking-wide uppercase" title="Manage Tracking Keywords">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                            Add Tracker
                        </button>

                        <button id="refresh-intelligence-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold tracking-wide uppercase" title="Refresh Analysis">
                            <svg class="${isRefreshing ? 'animate-spin' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                            ${isRefreshing ? 'Syncing...' : 'Refresh'}
                        </button>
                    </div>
                </div>
            </header>
        `;
    }

    renderContent() {
        // NEW: Analyzing state with progress bar
        if (this.state.status === 'analyzing') {
            const percent = this.state.progressPercent || 0;
            const message = this.state.progressMessage || 'Processing...';
            return `
                <div class="flex flex-col items-center justify-center h-[400px] bg-slate-900/20 rounded-xl border border-cyan-500/20">
                    <div class="relative w-20 h-20 mb-6">
                        <svg class="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="#1e293b" stroke-width="3"></circle>
                            <circle cx="18" cy="18" r="16" fill="none" stroke="url(#progress-gradient)" stroke-width="3" 
                                stroke-dasharray="${percent} 100" stroke-linecap="round" class="transition-all duration-500"></circle>
                            <defs>
                                <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" style="stop-color:#06b6d4" />
                                    <stop offset="100%" style="stop-color:#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <span class="text-white font-bold text-sm">${percent}%</span>
                        </div>
                    </div>
                    <div class="text-center max-w-md px-4">
                        <h3 class="text-lg font-bold text-white mb-2 flex items-center justify-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            AI Agents Working
                        </h3>
                        <p class="text-cyan-400 font-medium mb-4">${message}</p>
                        <div class="w-full max-w-xs mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                            <div class="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500 ease-out" style="width: ${percent}%"></div>
                        </div>
                        <p class="text-xs text-slate-500 leading-relaxed">
                            <span class="text-emerald-400 font-semibold">✓ Safe to leave:</span> 
                            You can navigate away and return later. Your results will be waiting for you.
                        </p>
                    </div>
                </div>
            `;
        }

        if (this.state.status === 'loading') {
            return `
                <div class="grid grid-cols-12 gap-6">
                    <div class="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${Array(6).fill(0).map(() => this.renderSkeletonCard()).join('')}
                    </div>
                    <div class="col-span-12">
                        ${this.renderSkeletonMap()}
                    </div>
                </div>
            `;
        }


        if (this.state.status === 'error') {
            return `
                <div class="flex flex-col items-center justify-center h-[400px] border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                    <svg class="w-10 h-10 text-rose-500 mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <h3 class="text-lg font-medium text-white">Failed to load trends</h3>
                    <p class="text-slate-500 text-sm mb-4">Network connection interrupted.</p>
                    <button id="retry-analysis-btn" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors border border-slate-700">
                        Retry Analysis
                    </button>
                </div>
            `;
        }

        if (this.state.status === 'success' && this.state.data.length === 0) {
            return `
                <div class="flex flex-col items-center justify-center h-[400px] bg-slate-900/20 rounded-xl">
                    <svg class="w-10 h-10 text-slate-500 mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                    <p class="text-slate-500">No trends match your filters.</p>
                </div>
            `;
        }

        return `
            <div class="grid grid-cols-12 gap-6 pb-20 md:pb-0">
                <div class="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr">
                    ${this.state.data.map(trend => this.renderTrendCard(trend)).join('')}
                </div>

                <div class="col-span-12">
                    ${this.renderTrendMap()}
                </div>
            </div>
        `;
    }

    renderTrendCard(trend) {
        const isActive = this.state.selectedTrendId === trend.id;
        const isPositive = trend.velocity >= 0;
        const sentimentWidth = ((trend.sentiment + 1) / 2) * 100;
        const sentimentGradient = trend.sentiment > 0
            ? 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)'
            : 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)';

        // Sparkline SVG
        const sparklineWidth = 100;
        const sparklineHeight = 30;
        const points = trend.history.map((val, i) => {
            const x = (i / (trend.history.length - 1)) * sparklineWidth;
            const y = sparklineHeight - (val / 100) * sparklineHeight;
            return `${x},${y}`;
        }).join(' ');

        return `
            <div data-trend-id="${trend.id}" class="trend-card group relative p-5 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col ${isActive ? 'bg-slate-800 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800'}">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-sm font-bold text-white tracking-tight line-clamp-1 pr-2 group-hover:text-cyan-400 transition-colors">
                        ${trend.name}
                    </h3>
                    <div class="px-2 py-0.5 rounded text-[10px] font-black ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                        ${isPositive ? '▲' : '▼'} ${Math.abs(trend.velocity)}%
                    </div>
                </div>

                <div class="mb-5">
                    <div class="flex items-baseline gap-2">
                        <div class="text-2xl font-bold text-white tracking-tight">
                            ${(trend.volume / 1000).toFixed(1)}k
                        </div>
                        <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Volume</span>
                    </div>
                </div>

                <div class="mb-auto">
                    <div class="flex justify-between text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">
                        <span>Net Sentiment</span>
                        <span class="${trend.sentiment > 0 ? 'text-cyan-400' : 'text-rose-400'}">
                            ${trend.sentiment > 0 ? '+' : ''}${trend.sentiment.toFixed(2)}
                        </span>
                    </div>
                    <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-700 ease-out shadow-lg" style="width: ${sentimentWidth}%; background: ${sentimentGradient}"></div>
                    </div>
                </div>

                <div class="flex justify-between items-end h-12 min-h-[48px] mt-4 pt-4 border-t border-white/5">
                    <div class="flex flex-col justify-end pb-1">
                        <div class="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 opacity-80 group-hover:opacity-100">
                             ${(trend.confidence * 100).toFixed(0)}% Match
                        </div>
                    </div>

                    <div class="w-24 h-full min-w-[96px] min-h-[32px] opacity-80 group-hover:opacity-100 transition-opacity filter drop-shadow-sm">
                        <svg width="100%" height="100%" viewBox="0 0 ${sparklineWidth} ${sparklineHeight}" preserveAspectRatio="none">
                            <polyline points="${points}" fill="none" stroke="${isPositive ? '#06b6d4' : '#f43f5e'}" stroke-width="2" vector-effect="non-scaling-stroke"></polyline>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }

    renderTrendMap() {
        // Implementation of SVG scatter plot
        const width = 800;
        const height = 320;
        const padding = 40;

        const maxVolume = Math.max(...this.state.data.map(t => t.volume), 100000);
        const maxVelocity = Math.max(...this.state.data.map(t => Math.abs(t.velocity)), 30);

        const getX = (v) => padding + ((v + maxVelocity) / (maxVelocity * 2)) * (width - padding * 2);
        const getY = (v) => height - padding - (v / maxVolume) * (height - padding * 2);

        return `
            <div class="h-[320px] w-full bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group">
                <div class="absolute inset-0 opacity-5 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

                <h4 class="absolute top-4 left-4 text-xs font-bold text-slate-500 uppercase tracking-wider z-10 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    Trend Matrix
                </h4>

                <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" class="overflow-visible">
                    <!-- Helper lines -->
                    <line x1="${getX(0)}" y1="${padding}" x2="${getX(0)}" y2="${height - padding}" stroke="#1e293b" stroke-dasharray="4 4" />
                    <line x1="${padding}" y1="${getY(50000)}" x2="${width - padding}" y2="${getY(50000)}" stroke="#1e293b" stroke-dasharray="4 4" />

                    <!-- Axis Labels -->
                    <text x="${width / 2}" y="${height - 5}" text-anchor="middle" fill="#475569" font-size="10" font-weight="bold">VELOCITY (%)</text>
                    <text x="5" y="${height / 2}" text-anchor="middle" fill="#475569" font-size="10" font-weight="bold" transform="rotate(-90, 5, ${height / 2})">VOLUME (k)</text>

                    <!-- Points -->
                    ${this.state.data.map(trend => {
            const x = getX(trend.velocity);
            const y = getY(trend.volume);
            const isSelected = this.state.selectedTrendId === trend.id;
            const color = trend.sentiment > 0.2 ? '#06b6d4' : trend.sentiment < -0.2 ? '#f43f5e' : '#8b5cf6';
            return `
                            <circle 
                                data-trend-id="${trend.id}"
                                class="trend-node cursor-pointer transition-all duration-300 hover:opacity-100"
                                cx="${x}" cy="${y}" r="${isSelected ? 8 : 5}" 
                                fill="${color}" fill-opacity="${isSelected ? 1 : 0.7}"
                                stroke="${isSelected ? '#fff' : color}" stroke-width="${isSelected ? 2 : 0}"
                            ></circle>
                        `;
        }).join('')}
                </svg>

                <div class="absolute top-8 right-8 text-[9px] text-white/20 font-bold uppercase tracking-widest pointer-events-none">Dominant</div>
                <div class="absolute bottom-8 right-8 text-[9px] text-white/20 font-bold uppercase tracking-widest pointer-events-none">Emerging</div>
                <div class="absolute bottom-8 left-12 text-[9px] text-white/20 font-bold uppercase tracking-widest pointer-events-none">Niche</div>
                <div class="absolute top-8 left-12 text-[9px] text-white/20 font-bold uppercase tracking-widest pointer-events-none">Saturated</div>
            </div>
        `;
    }

    renderDrawer(trend, isOpen) {
        if (!isOpen || !trend) return `
            <div class="fixed inset-x-0 bottom-0 z-50 md:absolute md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 shadow-2xl translate-y-full md:translate-x-full transition-transform duration-300 pointer-events-none"></div>
        `;

        const lowConfidence = trend.evidence.length < 3;

        return `
            <div class="fixed inset-x-0 bottom-0 z-50 md:absolute md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 shadow-2xl translate-y-0 md:translate-x-0 transition-transform duration-300 ease-in-out">
                <div class="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/30 backdrop-blur-sm">
                    <div>
                        <div class="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">Explain Trend</div>
                        <h2 class="text-lg font-semibold text-white leading-tight">${trend.name}</h2>
                    </div>
                    <button id="close-drawer-btn" class="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div class="p-5 overflow-y-auto h-[calc(100%-130px)] space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
                    <section>
                        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Why it's rising</h3>
                        <p class="text-sm text-slate-200 leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                            ${trend.summary}
                        </p>
                    </section>

                    <section>
                        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top Drivers</h3>
                        <ul class="space-y-2">
                            ${trend.drivers.map(driver => `
                                <li class="flex items-start gap-2 text-sm text-slate-300">
                                    <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0"></span>
                                    ${driver}
                                </li>
                            `).join('')}
                        </ul>
                    </section>

                    <section>
                        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex justify-between">
                            <span>Evidence</span>
                            <span class="text-slate-600">${trend.evidence.length} sources</span>
                        </h3>

                        ${lowConfidence ? `
                            <div class="mb-3 p-2 bg-amber-900/20 border border-amber-500/30 rounded flex items-center gap-2 text-xs text-amber-200">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                <span>Low evidence count. Confidence reduced.</span>
                            </div>
                        ` : ''}

                        <div class="space-y-3">
                            ${trend.evidence.map(ev => `
                                <a href="${ev.url}" target="_blank" rel="noopener noreferrer" class="block group p-3 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="text-xs text-cyan-500 font-medium">${ev.publisher}</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    </div>
                                    <h4 class="text-sm font-medium text-slate-200 group-hover:text-white mb-1 line-clamp-1">${ev.title}</h4>
                                    <p class="text-xs text-slate-500 line-clamp-2">${ev.snippet}</p>
                                    <div class="mt-2 text-[10px] text-slate-600">${ev.date}</div>
                                </a>
                            `).join('')}
                        </div>
                    </section>
                </div>

                <div class="absolute bottom-0 inset-x-0 p-4 border-t border-slate-800 bg-slate-900 flex gap-3">
                    <button onclick="saveTrendToLibrary('${trend.id}')" class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-sm font-medium text-slate-400 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        Save
                    </button>
                    <button onclick="showFullTrendReport('${trend.id}')" class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Full Report
                    </button>
                </div>
            </div>
        `;
    }

    renderSkeletonCard() {
        return `
            <div class="p-5 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse">
                <div class="flex justify-between items-start mb-4">
                    <div class="h-4 w-24 bg-slate-800 rounded"></div>
                    <div class="h-4 w-12 bg-slate-800 rounded"></div>
                </div>
                <div class="h-8 w-20 bg-slate-800 rounded mb-5"></div>
                <div class="h-1.5 w-full bg-slate-800 rounded-full mb-8"></div>
                <div class="flex justify-between items-end">
                    <div class="h-4 w-16 bg-slate-800 rounded"></div>
                    <div class="h-8 w-24 bg-slate-800 rounded"></div>
                </div>
            </div>
        `;
    }

    renderSkeletonMap() {
        return `
            <div class="h-[320px] w-full bg-slate-900/50 border border-slate-800 rounded-xl p-6 animate-pulse">
                <div class="h-4 w-32 bg-slate-800 rounded mb-8"></div>
                <div class="flex-1 border-l border-b border-slate-800 flex items-center justify-center h-48 opacity-50">
                    <div class="text-slate-700 font-bold uppercase tracking-widest">Generating Perception Matrix...</div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Time range buttons
        const rangeBtns = this.container.querySelectorAll('.time-range-btn');
        rangeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.setTimeRange(btn.getAttribute('data-range')));
        });

        // Channel buttons
        const channelBtns = this.container.querySelectorAll('.channel-btn');
        channelBtns.forEach(btn => {
            btn.addEventListener('click', () => this.toggleChannel(btn.getAttribute('data-channel')));
        });

        // Add tracker
        const addBtn = this.container.querySelector('#add-tracker-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => window.openKeywordEditor?.());
        }

        // Refresh
        const refreshBtn = this.container.querySelector('#refresh-intelligence-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.handleRefresh());
        }

        // Trend cards
        const trendCards = this.container.querySelectorAll('.trend-card');
        trendCards.forEach(card => {
            card.addEventListener('click', () => this.setSelectedTrend(card.getAttribute('data-trend-id')));
        });

        // Trend Map nodes
        const trendNodes = this.container.querySelectorAll('.trend-node');
        trendNodes.forEach(node => {
            node.addEventListener('click', () => this.setSelectedTrend(node.getAttribute('data-trend-id')));
        });

        // Drawer close
        const closeBtn = this.container.querySelector('#close-drawer-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.setState({ selectedTrendId: null }));
        }

        // Retry
        const retryBtn = this.container.querySelector('#retry-analysis-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.loadData());
        }
    }
}

// Global Bridge
window.marketIntelligenceDataQueue = null;

window.mountMarketIntelligence = function (containerId) {
    if (!window.marketIntelligenceInstance) {
        window.marketIntelligenceInstance = new MarketIntelligenceUI(containerId);

        // Check for queued data
        if (window.marketIntelligenceDataQueue) {
            console.log('[MarketIntelligence] applying queued data');
            window.marketIntelligenceInstance.setState(window.marketIntelligenceDataQueue);
            window.marketIntelligenceDataQueue = null;
        }
    }
    return window.marketIntelligenceInstance;
};

window.refreshMarketIntelligence = function (projectId, keywords, data) {
    const freshState = {
        projectId: projectId,
        keywords: keywords,
        data: data || [],
        status: 'success'
    };

    if (window.marketIntelligenceInstance) {
        window.marketIntelligenceInstance.setState(freshState);
    } else {
        console.log('[MarketIntelligence] No instance yet, queuing data');
        window.marketIntelligenceDataQueue = freshState;
    }
};
