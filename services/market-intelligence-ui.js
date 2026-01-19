/**
 * Market Intelligence UI (Vanilla JS Version)
 * Replaces the React-based MarketIntelligenceBridge to avoid build/MIME issues.
 */

class MarketIntelligenceUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        const savedDefaultRange = localStorage.getItem('mi_default_timerange') || '7D';
        this.state = {
            status: 'idle',
            data: [],
            keywords: [],
            projectId: null,
            timeRange: savedDefaultRange,
            selectedChannels: ['News', 'Social'],
            selectedTrendId: null,
            globalBriefing: ''
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
        const oldStatus = this.state.status;
        this.state = { ...this.state, ...newState };

        // Handle progress smoothing for 'analyzing' state
        if (this.state.status === 'analyzing') {
            this.startProgressSmoothing();
        } else {
            this.stopProgressSmoothing();
        }

        this.render();
    }

    startProgressSmoothing() {
        if (this.progressInterval) return;

        let displayPercent = this.state.progressPercent || 0;
        this.progressInterval = setInterval(() => {
            const target = this.state.progressPercent || 0;
            if (displayPercent < target) {
                // Catch up slowly (Halved for 2x slower progress)
                displayPercent += 0.25;
            } else if (displayPercent < 99) {
                // Micro-inching to show life while waiting (Halved for 2x slower progress)
                displayPercent += 0.025;
            }

            const el = document.getElementById('mi-progress-text');
            const bar = document.getElementById('mi-progress-bar');
            const circle = document.getElementById('mi-progress-circle');

            if (el) el.textContent = `${Math.floor(displayPercent)}%`;
            if (bar) bar.style.width = `${displayPercent}%`;
            if (circle) circle.setAttribute('stroke-dasharray', `${displayPercent} 100`);
        }, 100);
    }

    stopProgressSmoothing() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
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
                velocity: Math.floor(Math.random() * 15) + 5,
                volume: Math.floor(Math.random() * 40) + 10,
                mentions: Math.floor(Math.random() * 40) + 10,
                sentiment: Math.random() * 0.4 + 0.4,
                confidence: 0.85 + Math.random() * 0.1,
                history: Array.from({ length: 7 }, () => Math.floor(Math.random() * 50) + 50),
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
                        url: `https://news.google.com/search?q=${encodeURIComponent(kw)}`
                    },
                    {
                        id: `ev-${idx}-2`,
                        title: `Global Trends: ${kw} Analysis`,
                        publisher: 'Market Pulse Hub',
                        date: '2d ago',
                        snippet: `Market sentiment for ${kw} is shifting towards positive territory as adoption grows.`,
                        url: `https://news.google.com/search?q=${encodeURIComponent(kw)}`
                    },
                    {
                        id: `ev-${idx}-3`,
                        title: `Emerging Technology in ${kw}`,
                        publisher: 'Future Tech News',
                        date: '3d ago',
                        snippet: `New breakthroughs in ${kw} could disrupt traditional market models by late 2026.`,
                        url: `https://news.google.com/search?q=${encodeURIComponent(kw)}`
                    }
                ]
            }));

            this.setState({ status: 'success', data: trends });
        }, 800);
    }

    handleRefresh(force = false) {
        this.setState({ selectedTrendId: null });
        if (window.triggerMarketIntelligenceResearch) {
            window.triggerMarketIntelligenceResearch({
                timeRange: this.state.timeRange,
                channels: this.state.selectedChannels,
                forceRefresh: force
            });
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
        if (this.state.timeRange === range) return;
        this.setState({ timeRange: range });

        // Automatically trigger refresh when period changes to show specific data
        this.handleRefresh();
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
                    ${this.renderMainBriefing()}
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
                    <div class="flex flex-col items-end gap-1.5">
                        <div class="bg-slate-900 border border-slate-800 rounded-lg p-1 flex">
                            ${['7D', '30D', '60D', '90D', '180D'].map(range => `
                                <button data-range="${range}" class="time-range-btn px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${timeRange === range ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/5' : 'text-slate-500 hover:text-white'}">
                                    ${range}
                                </button>
                            `).join('')}
                        </div>
                        <label class="flex items-center gap-1.5 cursor-pointer group">
                            <input type="checkbox" id="mi-set-default-check" class="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer" ${localStorage.getItem('mi_default_timerange') === timeRange ? 'checked' : ''}>
                            <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Default Range</span>
                        </label>
                    </div>

                    <div class="w-px h-8 bg-slate-800 hidden md:block"></div>

                    <div class="flex gap-2">
                        ${['News', 'Social', 'Video'].map(channel => {
            const isActive = channel === 'News';
            return `
                                <button ${isActive ? `data-channel="${channel}"` : 'disabled'} 
                                    class="channel-btn px-4 py-1.5 rounded-full text-xs font-medium border transition-all 
                                    ${isActive ? (selectedChannels.includes(channel) ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-500 hover:text-white')
                    : 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed opacity-50'}"
                                    ${!isActive ? 'title="Coming Soon"' : ''}>
                                    ${channel}
                                    ${!isActive ? '<span class="ml-1 text-[8px] opacity-50">Soon</span>' : ''}
                                </button>
                            `;
        }).join('')}
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

    renderMainBriefing() {
        const { globalBriefing, status } = this.state;
        if (status === 'analyzing' || status === 'loading') return '';
        if (!globalBriefing) return '';

        return `
            <div class="mb-10 px-8 py-10 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-indigo-500/20"></div>
                <div class="relative z-10">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        </div>
                        <h2 class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Project Executive Briefing</h2>
                    </div>
                    <p class="text-xl text-slate-200 leading-chill font-bold tracking-tight">
                        ${globalBriefing}
                    </p>
                    <div class="mt-6 flex items-center gap-4">
                        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Synthesized from ${this.state.data.length} Tracked Industry Trends</span>
                        <div class="h-px flex-1 bg-slate-800"></div>
                    </div>
                </div>
            </div>
        `;
    }

    renderContent() {
        // NEW: Analyzing state with progress bar
        if (this.state.status === 'analyzing') {
            const percent = this.state.progressPercent || 0;
            const message = this.state.progressMessage || 'Processing...';
            return `
                <div class="flex flex-col items-center justify-center h-[450px] bg-slate-900/40 rounded-2xl border border-cyan-500/10 relative overflow-hidden">
                    <!-- Background Glow -->
                    <div class="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
                    
                    <div class="relative w-32 h-32 mb-8 group">
                        <!-- Outer Glow Ring -->
                        <div class="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse group-hover:bg-cyan-500/30 transition-all duration-1000"></div>
                        
                        <svg class="w-32 h-32 -rotate-90 relative z-10" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(30, 41, 59, 0.5)" stroke-width="2.5"></circle>
                            <circle id="mi-progress-circle" cx="18" cy="18" r="16" fill="none" stroke="url(#progress-gradient)" stroke-width="2.5" 
                                stroke-dasharray="${percent} 100" stroke-linecap="round" 
                                class="transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></circle>
                            <defs>
                                <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:#22d3ee" />
                                    <stop offset="100%" style="stop-color:#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div class="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <span id="mi-progress-text" class="text-white font-bold text-xl tracking-tighter">${percent}%</span>
                            <span class="text-[9px] text-cyan-400 font-bold uppercase tracking-widest opacity-60">Status</span>
                        </div>
                    </div>

                    <div class="text-center max-w-md px-4 relative z-10">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 mb-4">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">${percent < 100 ? 'Agent Intelligence Active' : 'Synthesis Complete'}</span>
                        </div>
                        
                        <h3 class="text-lg font-bold text-white mb-2">${message}</h3>
                        
                        <div class="w-64 mx-auto h-1.5 bg-slate-800/50 rounded-full overflow-hidden mb-6 border border-white/5">
                            <div id="mi-progress-bar" class="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]" style="width: ${percent}%"></div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 text-left p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
                            <div class="flex items-start gap-2">
                                <svg class="mt-0.5 text-cyan-500 flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                <div class="text-[10px] text-slate-400 line-clamp-1">Signal processing</div>
                            </div>
                            <div class="flex items-start gap-2">
                                <svg class="mt-0.5 text-cyan-500 flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                <div class="text-[10px] text-slate-400 line-clamp-1">Market synthesis</div>
                            </div>
                        </div>
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
                            ${(trend.mentions > 0) ? trend.mentions : (trend.volume > 1000 ? (trend.volume / 1000).toFixed(1) + 'k' : trend.volume)}
                        </div>
                        <span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            ${(trend.mentions > 0) ? 'Mentions' : 'Reach'}
                        </span>
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

        const maxVolume = 100000; // Standardized for matrix balance
        const maxVelocity = 40;    // Standardized for matrix balance

        const getX = (v) => padding + ((v + maxVelocity) / (maxVelocity * 2)) * (width - padding * 2);
        const getY = (v) => height - padding - (Math.min(v, maxVolume) / maxVolume) * (height - padding * 2);

        const quadrants = [
            { id: 'dominant', label: 'Dominant', pos: 'top-8 right-8', tooltipPos: 'top-full right-0 mt-2', arrowPos: 'bottom-full right-4 border-b-slate-800', advice: 'High growth, High reach. Mainstream trends with high impact. Focus on market leadership.' },
            { id: 'emerging', label: 'Emerging', pos: 'bottom-8 right-8', tooltipPos: 'bottom-full right-0 mb-2', arrowPos: 'top-full right-4 border-t-slate-800', advice: 'High growth, Low reach. Early signals of future mainstream. Opportunity to lead early adoption.' },
            { id: 'niche', label: 'Niche', pos: 'bottom-8 left-12', tooltipPos: 'bottom-full left-0 mb-2', arrowPos: 'top-full left-4 border-t-slate-800', advice: 'Low growth, Low reach. Specialized interest or fading presence. Monitor for specific use cases.' },
            { id: 'saturated', label: 'Saturated', pos: 'top-8 left-12', tooltipPos: 'top-full left-0 mt-2', arrowPos: 'bottom-full left-4 border-b-slate-800', advice: 'Low growth, High reach. Mature marketplace with high competition. Harder to differentiate.' }
        ];

        return `
            <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-visible group shadow-2xl">
                <div class="absolute inset-0 opacity-5 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none rounded-2xl"></div>

                <div class="flex justify-between items-center mb-6 relative z-10">
                    <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        Strategic Perception Matrix
                    </h4>
                    
                    <!-- Sentiment Legend -->
                    <div class="flex items-center gap-4 px-3 py-1.5 rounded-lg bg-slate-950/50 border border-slate-800/50">
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Positive</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Neutral</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Negative</span>
                        </div>
                    </div>
                </div>

                <div class="h-[320px] relative rounded-xl border border-slate-800/50 bg-slate-950/30 overflow-hidden">
                    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" class="overflow-visible">
                        <!-- Centering crosshair -->
                        <line x1="${getX(0)}" y1="${padding}" x2="${getX(0)}" y2="${height - padding}" stroke="rgba(34, 211, 238, 0.1)" stroke-width="2" />
                        <line x1="${padding}" y1="${getY(50000)}" x2="${width - padding}" y2="${getY(50000)}" stroke="rgba(34, 211, 238, 0.1)" stroke-width="2" />
                        
                        <!-- Grid lines -->
                        <line x1="${getX(0)}" y1="${padding}" x2="${getX(0)}" y2="${height - padding}" stroke="#1e293b" stroke-dasharray="4 4" />
                        <line x1="${padding}" y1="${getY(50000)}" x2="${width - padding}" y2="${getY(50000)}" stroke="#1e293b" stroke-dasharray="4 4" />

                        <!-- Axis Labels -->
                        <text x="${width / 2}" y="${height - 8}" text-anchor="middle" fill="#475569" font-size="11" font-weight="900" class="tracking-widest">VELOCITY % (GROWTH)</text>
                        <text x="10" y="${height / 2}" text-anchor="middle" fill="#475569" font-size="11" font-weight="900" transform="rotate(-90, 10, ${height / 2})" class="tracking-widest capitalize">REACH / IMPRESSIONS</text>

                        <!-- Nodes -->
                        ${this.state.data.map(trend => {
            const x = getX(trend.velocity);
            const y = getY(trend.volume);
            const isSelected = this.state.selectedTrendId === trend.id;
            const color = trend.sentiment > 0.2 ? '#06b6d4' : trend.sentiment < -0.2 ? '#f43f5e' : '#8b5cf6';
            return `
                                <g class="trend-node-group cursor-pointer">
                                    <circle 
                                        data-trend-id="${trend.id}"
                                        class="trend-node transition-all duration-300 hover:r-7"
                                        cx="${x}" cy="${y}" r="${isSelected ? 8 : 4.5}" 
                                        fill="${color}" fill-opacity="${isSelected ? 1 : 0.6}"
                                        stroke="${isSelected ? '#fff' : color}" stroke-width="${isSelected ? 2.5 : 0}"
                                    ></circle>
                                    ${isSelected ? `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${color}" stroke-opacity="0.3" stroke-width="1" class="animate-ping"></circle>` : ''}
                                </g>
                            `;
        }).join('')}
                    </svg>

                    <!-- Quadrant Labels with Tooltips -->
                    ${quadrants.map(q => `
                        <div class="absolute ${q.pos} flex items-center gap-2.5 group/quad pointer-events-auto">
                            <span class="text-[11px] text-white/30 font-black uppercase tracking-widest group-hover/quad:text-cyan-400 transition-colors">${q.label}</span>
                            <div class="relative">
                                <svg class="text-white/20 group-hover/quad:text-cyan-400 transition-colors cursor-help" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                
                                <div class="absolute ${q.tooltipPos} w-56 p-4 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover/quad:opacity-100 group-hover/quad:visible transition-all z-50">
                                    <div class="text-xs font-bold text-cyan-400 uppercase mb-1.5">${q.label} Quadrant</div>
                                    <div class="text-[11px] text-slate-200 leading-relaxed font-medium capitalize">
                                        ${q.advice}
                                    </div>
                                    <div class="absolute ${q.arrowPos} border-8 border-transparent"></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- AI-Generated Matrix Analysis -->
                <div class="mt-6 p-5 bg-slate-800/30 border border-slate-800 rounded-xl">
                    <div class="flex items-center gap-2 mb-3">
                        <svg class="text-cyan-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>
                        <span class="text-[10px] font-black text-cyan-500 uppercase tracking-widest">AI Matrix Analysis</span>
                    </div>
                    <p class="text-sm text-slate-300 leading-relaxed font-medium">
                        ${this.generateMatrixAnalysis()}
                    </p>
                </div>
            </div>
        `;
    }

    generateMatrixAnalysis() {
        const data = this.state.data || [];
        if (data.length === 0) {
            return "No trend data available for analysis. Run a market scan to populate the matrix.";
        }

        const maxVolume = 100000;
        const maxVelocity = 40;

        // Categorize trends by quadrant
        const dominant = data.filter(t => t.velocity > 0 && t.volume > maxVolume / 2);
        const emerging = data.filter(t => t.velocity > 0 && t.volume <= maxVolume / 2);
        const saturated = data.filter(t => t.velocity <= 0 && t.volume > maxVolume / 2);
        const niche = data.filter(t => t.velocity <= 0 && t.volume <= maxVolume / 2);

        // Calculate sentiment distribution
        const positive = data.filter(t => t.sentiment > 0.2).length;
        const negative = data.filter(t => t.sentiment < -0.2).length;
        const neutral = data.length - positive - negative;

        // Generate analysis text
        let analysis = [];

        // Overall position summary
        if (dominant.length > 0) {
            const names = dominant.slice(0, 2).map(t => `"${t.name}"`).join(', ');
            analysis.push(`${names} ${dominant.length > 1 ? 'are' : 'is'} in the Dominant quadrant, indicating high market reach with strong growth momentum.`);
        }

        if (emerging.length > 0) {
            const names = emerging.slice(0, 2).map(t => `"${t.name}"`).join(', ');
            analysis.push(`${names} ${emerging.length > 1 ? 'show' : 'shows'} emerging potential with rapid growth but limited reach yet - early mover opportunity.`);
        }

        if (saturated.length > 0) {
            analysis.push(`${saturated.length} trend${saturated.length > 1 ? 's are' : ' is'} in the Saturated zone - high visibility but slowing momentum.`);
        }

        if (niche.length > 0 && niche.length === data.length) {
            analysis.push(`All trends are in the Niche quadrant, suggesting specialized topics with room for market expansion.`);
        }

        // Sentiment insight
        if (positive > negative && positive > neutral) {
            analysis.push(`Overall market sentiment is positive (${Math.round(positive / data.length * 100)}%), suggesting favorable conditions for expansion.`);
        } else if (negative > positive) {
            analysis.push(`Caution: Negative sentiment detected in ${Math.round(negative / data.length * 100)}% of trends. Monitor for risks.`);
        }

        // If only one trend, give specific advice
        if (data.length === 1) {
            const t = data[0];
            const quadrant = t.velocity > 0 ? (t.volume > maxVolume / 2 ? 'Dominant' : 'Emerging') : (t.volume > maxVolume / 2 ? 'Saturated' : 'Niche');
            const sentimentLabel = t.sentiment > 0.2 ? 'positive' : t.sentiment < -0.2 ? 'negative' : 'neutral';
            return `Your primary trend "${t.name}" is positioned in the ${quadrant} quadrant with ${sentimentLabel} sentiment. ${quadrant === 'Emerging' ? 'This is an early-stage opportunity - consider increasing visibility investments.' : quadrant === 'Dominant' ? 'Strong market position - focus on maintaining leadership.' : quadrant === 'Saturated' ? 'Consider differentiation strategies to stand out.' : 'Niche positioning offers specialized audience targeting opportunities.'}`;
        }

        return analysis.length > 0 ? analysis.join(' ') : "Trend data is being analyzed. Additional insights will appear as more signals are collected.";
    }

    renderDrawer(trend, isOpen) {
        if (!isOpen || !trend) return `
            <div class="fixed inset-x-0 bottom-0 z-50 md:absolute md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 shadow-2xl translate-y-full md:translate-x-full transition-transform duration-300 pointer-events-none"></div>
        `;

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
                            <span>Intelligence Sources</span>
                            <span class="text-slate-600">${(trend.evidence || []).length} signals</span>
                        </h3>

                        <div class="space-y-3">
                            ${(trend.evidence && trend.evidence.length > 0) ? trend.evidence.map(ev => `
                                <a href="${ev.url}" target="_blank" rel="noopener noreferrer" class="block group p-3 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="text-xs text-cyan-500 font-medium">${typeof ev.publisher === 'object' ? (ev.publisher.name || 'News Source') : ev.publisher}</span>
                                        <svg class="text-slate-600 group-hover:text-cyan-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    </div>
                                    <h4 class="text-sm font-medium text-slate-200 group-hover:text-white mb-1 line-clamp-1">${ev.title}</h4>
                                    <p class="text-xs text-slate-500 line-clamp-2">${ev.snippet}</p>
                                    <div class="mt-2 text-[10px] text-slate-600">${ev.date}</div>
                                </a>
                            `).join('') : `
                                <div class="p-4 rounded-lg border border-dashed border-slate-800 text-center">
                                    <p class="text-xs text-slate-600 italic">No verified news signals found for this period.</p>
                                </div>
                            `}
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
            btn.addEventListener('click', () => {
                const range = btn.getAttribute('data-range');
                this.setTimeRange(range);
            });
        });

        // Set Default Checkbox
        const defaultCheck = this.container.querySelector('#mi-set-default-check');
        if (defaultCheck) {
            defaultCheck.addEventListener('change', (e) => {
                if (e.target.checked) {
                    localStorage.setItem('mi_default_timerange', this.state.timeRange);
                    showNotification?.(`Default range set to ${this.state.timeRange}`, 'success');
                } else {
                    localStorage.removeItem('mi_default_timerange');
                }
            });
        }

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

        // Refresh (Explicit button click means FORCE fresh scan)
        const refreshBtn = this.container.querySelector('#refresh-intelligence-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.handleRefresh(true));
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

window.refreshMarketIntelligence = function (projectId, keywords, data, meta = {}) {
    const freshState = {
        projectId: projectId,
        keywords: keywords,
        data: data || [],
        globalBriefing: meta.globalBriefing || '',
        status: 'success'
    };

    if (window.marketIntelligenceInstance) {
        window.marketIntelligenceInstance.setState(freshState);
    } else {
        console.log('[MarketIntelligence] No instance yet, queuing data');
        window.marketIntelligenceDataQueue = freshState;
    }
};
