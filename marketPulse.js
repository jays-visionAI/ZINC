// Market Pulse - JavaScript Logic

// ========== MOCK DATA ==========
const TRENDING_KEYWORDS = [
    { keyword: "#CleanBeauty", change: 340, volume: 12500 },
    { keyword: "#VeganSkincare", change: 180, volume: 8400 },
    { keyword: "@BeautyBrand", change: 95, volume: 5200 },
    { keyword: "#SustainableBeauty", change: 67, volume: 3100 },
    { keyword: "#OrganicCosmetics", change: -12, volume: 9000 }
];

const HEATMAP_DATA = [
    { label: "Your Brand", values: [85, 82, 68, 79, 84, 81, 83] },
    { label: "@BeautyBrand", values: [70, 65, 72, 60, 55, 58, 62] },
    { label: "@NatureCo", values: [88, 85, 90, 82, 86, 84, 87] }
];

const RECENT_MENTIONS = [
    { author: "@sarah_beauty", text: "Absolutely love this new serum! 😍", sentiment: "positive", platform: "Instagram", time: "3h ago" },
    { author: "@skincare_addict", text: "Fast shipping, product as expected", sentiment: "positive", platform: "Twitter", time: "5h ago" },
    { author: "@john_reviews", text: "A bit pricey for what you get...", sentiment: "neutral", platform: "Reddit", time: "1d ago" }
];

const COMPETITORS = [
    { name: "YOU", handle: "@YourBrand", mentions: 1247, change: 18, sentiment: 78, latest: "New product launch", isYou: true },
    { name: "BeautyBrand", handle: "@BeautyBrand", mentions: 892, change: -8, sentiment: 65, latest: "30% Off Sale Campaign", isYou: false },
    { name: "NatureCo", handle: "@NatureCo", mentions: 2031, change: 45, sentiment: 82, latest: "New Line Extension", isYou: false }
];

const INVESTIGATIONS = [
    { url: "reddit.com/r/SkincareAddiction", query: "Consumer preferences for organic brands", summary: "Strong preference for transparency in ingredients. Price sensitivity is high.", status: "completed", time: "2d ago" },
    { url: "twitter.com/search?q=vegan+skincare", query: "Current sentiment on vegan skincare", summary: "Positive overall sentiment. Key themes: cruelty-free, natural ingredients.", status: "completed", time: "5d ago" }
];

const AI_ACTIONS = [
    {
        priority: "high",
        title: "#CleanBeauty is trending (+340%)",
        description: "Your competitor NatureCo launched a new product line with strong engagement. Create response content to capture this trending conversation.",
        tags: ["#CleanBeauty", "#VeganSkincare"],
        bestTime: "Tuesday 9AM EST"
    },
    {
        priority: "medium",
        title: "User @sarah_beauty mentioned you positively",
        description: "Her post has high engagement (12K followers). Consider repurposing as UGC.",
        tags: []
    }
];

// ========== DOM REFERENCES ==========
const dom = {
    trendingKeywords: document.getElementById('trending-keywords'),
    heatmapContainer: document.getElementById('heatmap-container'),
    recentMentions: document.getElementById('recent-mentions'),
    competitorCards: document.getElementById('competitor-cards'),
    investigations: document.getElementById('investigations'),
    aiActions: document.getElementById('ai-actions'),
    refreshBtn: document.getElementById('btn-refresh'),
    researchTerminal: document.getElementById('research-terminal'),
    activityLog: document.getElementById('activity-log'),
    discoveryMapSection: document.getElementById('discovery-map-section'),
    discoveryMap: document.getElementById('discovery-map'),
    investigationsList: document.getElementById('investigations-list')
};

// ========== RESEARCH SIMULATION CONFIG ==========
const RESEARCH_STEPS = [
    { type: 'info', msg: 'System initialized. Loading Brand Architecture...' },
    { type: 'brain', msg: 'Analyzing [Core Identity]: Extracting seed keywords and brand voice specs.' },
    { type: 'source', msg: 'Establishing neural link to Reddit, Twitter, and specialized forums...' },
    { type: 'scan', msg: 'Scanning 12,402 data points for latent keyword associations...' },
    { type: 'discovery', msg: 'Cluster identified: "Community pain points" around core themes.' },
    { type: 'competitor', msg: 'Detecting digital footprints of potential competitors...' },
    { type: 'competitor', msg: 'Competitor Found: "GlowRecipe" (Strong overlap in Clean Beauty segment).' },
    { type: 'competitor', msg: 'Competitor Found: "DrunkElephant" (Mentioned in 12% of target threads).' },
    { type: 'brain', msg: 'Filtering trends against Brand Safety & Strategy directives...' },
    { type: 'success', msg: 'Intelligence gathering complete. Syncing discovery map to Dashboard.' }
];

// ========== INITIALIZATION ==========
let currentProjectId = null;
let currentUser = null;

async function init() {
    // Check auth first
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProjects();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'index.html';
        }
    });

    renderTrendingKeywords();
    renderHeatmap();
    renderRecentMentions();
    renderCompetitors();
    renderInvestigations();
    renderAIActions();
    setupEventListeners();
}

// ========== PROJECT SELECTOR ==========
async function loadUserProjects() {
    const projectSelect = document.getElementById('project-select');
    if (!projectSelect) return;

    // Add glow highlight initially to guide user
    projectSelect.classList.add('selection-highlight');

    try {
        // Load projects without orderBy (requires no index)
        const snapshot = await firebase.firestore()
            .collection('projects')
            .where('userId', '==', currentUser.uid)
            .get();

        const projects = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Only include non-draft projects
            if (data.isDraft !== true) {
                projects.push({ id: doc.id, ...data });
            }
        });

        // Sort client-side by createdAt descending
        projects.sort((a, b) => {
            const tA = a.createdAt ? a.createdAt.seconds : 0;
            const tB = b.createdAt ? b.createdAt.seconds : 0;
            return tB - tA;
        });

        if (projects.length === 0) {
            projectSelect.innerHTML = '<option value="" disabled selected>⚠️ Create a Project in Command Center</option>';
            projectSelect.classList.remove('selection-highlight');
            return;
        }

        // Populate dropdown with placeholder first
        projectSelect.innerHTML = '<option value="">Select Project...</option>';
        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.projectName || p.name || 'Untitled Project';
            projectSelect.appendChild(option);
        });

        // Use global project ID from localStorage (shared across all pages)
        const globalProjectId = localStorage.getItem('currentProjectId');
        if (globalProjectId && projects.find(p => p.id === globalProjectId)) {
            projectSelect.value = globalProjectId;
            currentProjectId = globalProjectId;
            projectSelect.classList.remove('selection-highlight');
            // Auto-load data for the project
            onProjectChange();
        }

        // Add change listener - sync to global state
        projectSelect.addEventListener('change', () => {
            const newProjectId = projectSelect.value;
            if (newProjectId) {
                currentProjectId = newProjectId;
                // Sync to global state
                localStorage.setItem('currentProjectId', newProjectId);
                projectSelect.classList.remove('selection-highlight');

                // Reload data for new project
                onProjectChange();
            }
        });

    } catch (error) {
        console.error('Error loading projects:', error);
        projectSelect.innerHTML = '<option value="">Error loading</option>';
        projectSelect.classList.remove('selection-highlight');
    }
}

async function onProjectChange() {
    if (!currentProjectId) return;

    console.log('Project changed to:', currentProjectId);
    document.getElementById('last-updated').textContent = 'Syncing...';

    try {
        const doc = await firebase.firestore().collection('projects').doc(currentProjectId).get();
        if (doc.exists) {
            const projectData = doc.data();
            updateDashboardWithProjectData(projectData);
        }
        document.getElementById('last-updated').textContent = 'Just now';
    } catch (error) {
        console.error('Error fetching project data:', error);
    }
}

function updateDashboardWithProjectData(data) {
    // 1. Update Keywords from Brand Brain
    const coreKeywords = data.strategy?.keywords || data.coreIdentity?.keywords || [];

    // Clear and re-populate TRENDING_KEYWORDS (initially with core data)
    const newKeywords = coreKeywords.map(kw => ({
        keyword: kw.startsWith('#') ? kw : `#${kw}`,
        change: 0, // Initial state before research
        volume: 0,
        isCore: true
    }));

    TRENDING_KEYWORDS.length = 0;
    if (newKeywords.length > 0) {
        TRENDING_KEYWORDS.push(...newKeywords);
    } else {
        // GUIDANCE: If no keywords, show a placeholder that encourages setup or research
        TRENDING_KEYWORDS.push({
            keyword: "Setup Brand Keywords",
            change: 0,
            volume: 0,
            isCore: true,
            isGuidance: true
        });
    }

    renderTrendingKeywords();

    // 2. Update Brand Stats (Mocking based on project name)
    const brandName = data.projectName || data.name || "Your Brand";
    const heatmapLabel = document.querySelector('#heatmap-container .text-right');
    if (heatmapLabel) heatmapLabel.textContent = brandName.substring(0, 8);
}

// ========== RENDER FUNCTIONS ==========

function renderTrendingKeywords() {
    if (!dom.trendingKeywords) return;
    dom.trendingKeywords.innerHTML = '';

    const maxChange = Math.max(...TRENDING_KEYWORDS.map(k => Math.abs(k.change || 0)), 50);

    TRENDING_KEYWORDS.forEach((item, index) => {
        const isPositive = item.change > 0;
        const changeAbs = Math.abs(item.change || 0);
        // Ensure even 0% change has a small visible bar (2%)
        const barWidth = Math.max(2, (changeAbs / maxChange) * 100);
        const delay = index * 100;

        const el = document.createElement('div');
        el.className = `flex items-center gap-4 group cursor-help transition-all duration-300 animate-in fade-in slide-in-from-right-4 ${item.isGuidance ? 'opacity-60 grayscale' : ''}`;
        el.style.animationDelay = `${delay}ms`;

        el.innerHTML = `
            <div class="w-40 shrink-0">
                <div class="flex flex-col">
                    <span class="font-semibold text-sm text-slate-200 group-hover:text-cyan-400 transition-colors">${item.keyword} ${item.isGuidance ? '✨' : ''}</span>
                    <div class="flex gap-1 mt-0.5">
                        ${item.isCore ? `<span class="px-1 py-0.5 bg-indigo-500/10 text-indigo-400 text-[7px] font-bold rounded border border-indigo-500/20 uppercase tracking-widest">IDENTITY</span>` : ''}
                        ${item.isDiscovered ? `<span class="px-1 py-0.5 bg-cyan-500/20 text-cyan-400 text-[7px] font-bold rounded border border-cyan-500/30 uppercase tracking-widest">DISCOVERED</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 w-24 shrink-0">
                <span class="${item.change === 0 ? 'text-slate-500' : isPositive ? 'text-emerald-400' : 'text-red-400'} text-xs font-bold font-mono">
                    ${item.change === 0 ? '•' : isPositive ? '▲' : '▼'} ${isPositive ? '+' : ''}${item.change || 0}%
                </span>
            </div>
            <div class="flex-1">
                <div class="w-full bg-slate-950/50 rounded-full h-1.5 border border-white/5 overflow-hidden">
                    <div class="h-full rounded-full bar-animate ${item.change === 0 ? 'bg-slate-700' : isPositive ? 'bg-gradient-to-r from-emerald-600 to-cyan-400' : 'bg-gradient-to-r from-red-600 to-orange-400'}"
                         style="width: ${barWidth}%"></div>
                </div>
            </div>
            <div class="text-[10px] text-slate-500 w-24 text-right shrink-0">
                ${item.isGuidance ? '<span class="text-cyan-400 animate-pulse">Action Required</span>' : `
                    <span class="text-slate-400 font-mono">${((item.volume || 0) / 1000).toFixed(1)}k</span> <span class="opacity-50">vol</span>
                `}
            </div>
        `;
        dom.trendingKeywords.appendChild(el);
    });
}

function renderHeatmap() {
    if (!dom.heatmapContainer) return;
    dom.heatmapContainer.innerHTML = '';

    HEATMAP_DATA.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = "flex items-center gap-2";

        const labelEl = document.createElement('div');
        labelEl.className = "w-12 text-[10px] text-slate-400 text-right truncate";
        labelEl.textContent = row.label.substring(0, 8);
        rowEl.appendChild(labelEl);

        const cellsEl = document.createElement('div');
        cellsEl.className = "flex-1 grid grid-cols-7 gap-1";

        row.values.forEach((val, i) => {
            const cell = document.createElement('div');
            let bgColor = 'bg-slate-700';
            if (val >= 75) bgColor = 'bg-emerald-500';
            else if (val >= 50) bgColor = 'bg-slate-600';
            else bgColor = 'bg-red-500';

            cell.className = `h-6 rounded ${bgColor} heatmap-cell cursor-pointer`;
            cell.style.opacity = Math.max(0.4, val / 100);
            cell.title = `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}: ${val}%`;
            cellsEl.appendChild(cell);
        });

        rowEl.appendChild(cellsEl);

        const avgEl = document.createElement('div');
        avgEl.className = "w-12 text-[10px] text-slate-400";
        const avg = Math.round(row.values.reduce((a, b) => a + b, 0) / row.values.length);
        avgEl.textContent = `${avg}%`;
        rowEl.appendChild(avgEl);

        dom.heatmapContainer.appendChild(rowEl);
    });
}

function renderRecentMentions() {
    if (!dom.recentMentions) return;
    dom.recentMentions.innerHTML = '';

    RECENT_MENTIONS.forEach(mention => {
        const emoji = mention.sentiment === 'positive' ? '😊' : mention.sentiment === 'negative' ? '😠' : '😐';
        const el = document.createElement('div');
        el.className = "p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-600 transition-colors";
        el.innerHTML = `
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1">
                    <div class="font-medium text-slate-200">${mention.author}</div>
                    <div class="text-slate-400 mt-0.5">"${mention.text}"</div>
                </div>
                <span class="text-lg">${emoji}</span>
            </div>
            <div class="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                <span>${mention.platform}</span>
                <span>•</span>
                <span>${mention.time}</span>
            </div>
        `;
        dom.recentMentions.appendChild(el);
    });
}

function renderCompetitors() {
    if (!dom.competitorCards) return;
    dom.competitorCards.innerHTML = '';

    COMPETITORS.forEach(comp => {
        const isPositive = comp.change > 0;
        const borderColor = comp.isYou ? 'border-indigo-500/50' : 'border-slate-700';
        const bgColor = comp.isYou ? 'bg-gradient-to-br from-indigo-900/30 to-slate-900' : 'bg-slate-950';

        const el = document.createElement('div');
        el.className = `${bgColor} border ${borderColor} rounded-xl p-5 hover:border-slate-500 transition-all`;
        el.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h3 class="font-bold text-white">${comp.name}</h3>
                    <span class="text-xs text-slate-500">${comp.handle}</span>
                </div>
                ${comp.isYou ? '<span class="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded">YOU</span>' : ''}
            </div>
            
            <div class="space-y-3">
                <div>
                    <div class="text-xs text-slate-500 uppercase">Mentions</div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-xl font-bold text-white">${comp.mentions.toLocaleString()}</span>
                        <span class="${isPositive ? 'text-emerald-400' : 'text-red-400'} text-xs font-medium">
                            ${isPositive ? '📈' : '📉'} ${isPositive ? '+' : ''}${comp.change}%
                        </span>
                    </div>
                </div>
                
                <div>
                    <div class="text-xs text-slate-500 uppercase">Sentiment</div>
                    <div class="flex items-center gap-2 mt-1">
                        <div class="flex-1 bg-slate-800 rounded-full h-2">
                            <div class="bg-emerald-500 h-2 rounded-full" style="width: ${comp.sentiment}%"></div>
                        </div>
                        <span class="text-sm font-bold text-${comp.sentiment >= 70 ? 'emerald' : comp.sentiment >= 50 ? 'slate' : 'red'}-400">${comp.sentiment}%</span>
                    </div>
                </div>
                
                <div>
                    <div class="text-xs text-slate-500 uppercase">Latest Activity</div>
                    <div class="text-sm text-slate-300 mt-1">${comp.latest}</div>
                </div>
            </div>
            
            <button class="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors">
                View Details
            </button>
        `;
        dom.competitorCards.appendChild(el);
    });
}

function renderInvestigations() {
    if (!dom.investigations) return;
    dom.investigations.innerHTML = '';

    INVESTIGATIONS.forEach(inv => {
        const el = document.createElement('div');
        el.className = "p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-cyan-500/30 transition-colors";
        el.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="text-emerald-400 mt-0.5">✅</div>
                <div class="flex-1">
                    <div class="text-sm font-medium text-slate-200">${inv.url}</div>
                    <div class="text-xs text-slate-500 mt-0.5">Query: "${inv.query}"</div>
                    <div class="text-xs text-slate-400 mt-2">${inv.summary}</div>
                    <div class="flex items-center justify-between mt-2">
                        <span class="text-[10px] text-slate-600">${inv.time}</span>
                        <button class="text-[10px] text-cyan-400 hover:text-cyan-300">View Full</button>
                    </div>
                </div>
            </div>
        `;
        dom.investigations.appendChild(el);
    });
}

function renderAIActions() {
    if (!dom.aiActions) return;
    dom.aiActions.innerHTML = '';

    AI_ACTIONS.forEach(action => {
        const isPriority = action.priority === 'high';
        const borderColor = isPriority ? 'border-amber-500/30' : 'border-slate-800';
        const bgColor = isPriority ? 'bg-amber-500/5' : 'bg-slate-950/50';
        const glowColor = isPriority ? 'shadow-[0_0_20px_rgba(245,158,11,0.05)]' : '';

        const badge = isPriority
            ? '<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded uppercase tracking-tighter">🔥 Strategic Priority</span>'
            : '<span class="px-2 py-0.5 bg-slate-800 text-slate-500 text-[10px] font-bold rounded uppercase tracking-tighter">Opportunity</span>';

        const el = document.createElement('div');
        el.className = `${bgColor} ${borderColor} ${glowColor} border rounded-2xl p-5 hover:border-slate-600 transition-all group`;
        el.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full ${isPriority ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}"></div>
                    <h4 class="font-bold text-sm text-slate-200 group-hover:text-white transition-colors">${action.title}</h4>
                </div>
                ${badge}
            </div>
            <p class="text-xs text-slate-400 mb-5 leading-relaxed">${action.description}</p>
            
            <div class="flex items-center justify-between mt-auto">
                <div class="flex -space-x-2">
                    ${action.tags.slice(0, 3).map(tag => `
                        <div class="px-2 py-1 bg-slate-900 border border-slate-800 rounded-md text-[9px] text-slate-500 hover:text-cyan-400 cursor-default transition-colors">
                            ${tag}
                        </div>
                    `).join('')}
                </div>
                
                <div class="flex gap-2">
                    <button class="action-btn px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black rounded-lg shadow-lg shadow-indigo-500/10 transition-all active:scale-95" data-action="meme" data-cost="20">
                        GENERATE
                    </button>
                    <button class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-bold rounded-lg transition-all" onclick="showNotification('Transferred to Studio Queue')">
                        STUDIO
                    </button>
                </div>
            </div>
        `;
        dom.aiActions.appendChild(el);
    });
}

function setupEventListeners() {
    if (dom.refreshBtn) {
        dom.refreshBtn.addEventListener('click', () => {
            dom.refreshBtn.classList.add('animate-spin');
            setTimeout(() => dom.refreshBtn.classList.remove('animate-spin'), 1000);
            renderTrendingKeywords(); // Mock refresh
        });
    }

    // Deploy Web Agent Button
    const btnDeploy = document.getElementById('btn-deploy-agent');
    if (btnDeploy) {
        btnDeploy.addEventListener('click', handleDeployAgent);
    }

    // Setup Keywords Button
    const btnSetup = document.getElementById('btn-setup-keywords');
    if (btnSetup) {
        btnSetup.addEventListener('click', () => {
            window.location.href = 'brandBrain.html';
        });
    }

    // Quick Research Button (Guidance)
    const btnQuick = document.getElementById('btn-quick-research');
    if (btnQuick) {
        btnQuick.addEventListener('click', () => {
            const el = document.getElementById('intelligence-lab');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-4', 'ring-cyan-500/50');
                setTimeout(() => el.classList.remove('ring-4', 'ring-cyan-500/50'), 2000);
            }
        });
    }

    // AI Actions (Event Delegation)
    if (dom.aiActions) {
        dom.aiActions.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn');
            if (btn) {
                const actionType = btn.dataset.action;
                const actionId = actionType === 'meme' ? 'market_meme_generation' :
                    actionType === 'blog' ? 'market_blog_post' : 'market_campaign';
                handleAIAction(btn, actionId);
            }
        });
    }
}

/**
 * Handle Deploy Web Agent - Enhanced with Simulation & Map
 */
async function handleDeployAgent() {
    const userId = firebase.auth().currentUser?.uid;
    if (!userId) return;

    if (typeof CreditService === 'undefined') {
        alert('Credit Service not loaded');
        return;
    }

    const researchTarget = document.getElementById('research-target')?.value || 'reddit.com';
    const researchQuery = document.getElementById('research-query')?.value || 'Market trends';

    // Check credits
    const ACTION_ID = 'market_investigation';
    const btn = document.getElementById('btn-deploy-agent');
    const originalContent = btn.innerHTML;

    try {
        const cost = await CreditService.getCost(ACTION_ID);
        if (cost > 0) {
            if (!confirm(`Deploy Research Agent for "${researchTarget}"?\nCost: ${cost} credits`)) return;
        }

        // 1. UI Preparation
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-pulse">DEPLOYING AGENT...</span>';

        // Hide previous results if any
        dom.discoveryMapSection.classList.add('hidden');
        dom.investigationsList.classList.add('hidden');

        // Show terminal
        dom.researchTerminal.classList.remove('hidden');
        dom.activityLog.innerHTML = '';

        // 2. Credit Deduction
        await CreditService.deductCredits(userId, ACTION_ID, {
            projectId: currentProjectId,
            target: researchTarget,
            query: researchQuery
        });

        // 3. Simulation Sequence
        for (const step of RESEARCH_STEPS) {
            await appendLog(step);
            await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
        }

        // 4. Finalizing Results (Injecting "Discovered" Items)
        showNotification(`Research Complete! Discovered high-value intelligence.`);

        // Add discovered keywords to Trends
        const discoveredItems = [
            { keyword: "#BarrierRepair", change: 124, volume: 15600, isDiscovered: true },
            { keyword: "#CeramideSurge", change: 88, volume: 9200, isDiscovered: true }
        ];

        // Remove old discoveries if any, and prepend new ones
        const coreOnly = TRENDING_KEYWORDS.filter(k => k.isCore);
        TRENDING_KEYWORDS.length = 0;
        TRENDING_KEYWORDS.push(...discoveredItems, ...coreOnly);
        renderTrendingKeywords();

        // Add Competitor to Radar
        const glowRecipe = { name: "GlowRecipe", handle: "@GlowRecipe", mentions: 4502, change: 32, sentiment: 85, latest: "Dominating #BarrierRepair tags", isYou: false };
        if (!COMPETITORS.find(c => c.name === "GlowRecipe")) {
            COMPETITORS.push(glowRecipe);
            renderCompetitors();
        }

        // Toggle UI
        dom.discoveryMapSection.classList.remove('hidden');
        renderDiscoveryMap();

        // Update Investigations list
        const newInv = {
            url: researchTarget,
            query: researchQuery,
            summary: "Discovered surging interest in Barrier Repair and Ceramide formulations. Competitive gap identified in night-routine segments.",
            status: "completed",
            time: "Just now"
        };
        INVESTIGATIONS.unshift(newInv);
        renderInvestigations();

        // Update AI Actions to reflect discovery
        updateAIActionsWithDiscovery();

    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        dom.investigationsList.classList.remove('hidden');
    }
}

async function appendLog(step) {
    const logEl = document.createElement('div');
    logEl.className = "mb-1 flex items-start gap-2 animate-in scroll-in";

    let icon = "›";
    let colorClass = "text-cyan-400";

    if (step.type === 'source') { icon = "🌐"; colorClass = "text-blue-400"; }
    if (step.type === 'scan') { icon = "🔍"; colorClass = "text-amber-400"; }
    if (step.type === 'brain') { icon = "🧠"; colorClass = "text-indigo-400"; }
    if (step.type === 'discovery') { icon = "💎"; colorClass = "text-emerald-400 font-bold"; }
    if (step.type === 'competitor') { icon = "🆚"; colorClass = "text-purple-400 font-bold"; }
    if (step.type === 'success') { icon = "✅"; colorClass = "text-emerald-500 font-bold"; }

    logEl.innerHTML = `
        <span class="${colorClass}">${icon}</span>
        <span class="${step.type === 'discovery' || step.type === 'competitor' ? 'text-white font-bold' : 'text-slate-300'}">${step.msg}</span>
    `;

    dom.activityLog.appendChild(logEl);
    dom.activityLog.scrollTop = dom.activityLog.scrollHeight;
}

function renderDiscoveryMap() {
    if (!dom.discoveryMap) return;
    dom.discoveryMap.innerHTML = '';

    const containerWidth = dom.discoveryMap.offsetWidth;
    const containerHeight = dom.discoveryMap.offsetHeight;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // CORE NODES (Actual from TRENDING_KEYWORDS which now has project data)
    const coreNodes = TRENDING_KEYWORDS.filter(k => k.isCore).slice(0, 2).map((k, i) => ({
        label: k.keyword,
        x: i === 0 ? centerX - 60 : centerX + 60,
        y: centerY - 40,
        type: 'core'
    }));

    // If coreNodes empty, use a placeholder core
    if (coreNodes.length === 0) {
        coreNodes.push({ label: 'Core Brand', x: centerX, y: centerY - 40, type: 'core' });
    }

    // DISCOVERY NODES (Newly found)
    const discoveryNodes = [
        { label: 'Barrier', x: centerX - 120, y: centerY + 60, type: 'discovered', score: 94 },
        { label: 'Ceramide', x: centerX + 20, y: centerY + 90, type: 'discovered', score: 88 }
    ];

    // COMPETITOR NODES (Discovery phase payoff)
    const competitorNodes = [
        { label: 'GlowRecipe', x: centerX + 110, y: centerY + 30, type: 'competitor', score: 'Overlap' },
        { label: 'DrunkElephant', x: centerX - 150, y: centerY - 100, type: 'competitor', score: 'Direct' }
    ];

    const allNodes = [...coreNodes, ...discoveryNodes, ...competitorNodes];

    // Render Connections
    discoveryNodes.forEach(node => {
        const target = coreNodes[0];
        drawConnection(node, target);
    });

    competitorNodes.forEach(node => {
        const target = coreNodes[0];
        drawConnection(node, target, 'rgba(192, 132, 252, 0.3)');
    });

    // Render Nodes
    allNodes.forEach(node => {
        const el = document.createElement('div');
        el.className = `discovery-node ${node.type === 'core' ? 'node-pulse' : ''}`;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;

        let colorClasses = "bg-indigo-500/20 border-indigo-500";
        if (node.type === 'discovered') colorClasses = "bg-cyan-500/20 border-cyan-500";
        if (node.type === 'competitor') colorClasses = "bg-purple-500/20 border-purple-500";

        el.innerHTML = `
            <div class="${colorClasses} border rounded-full px-3 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
                ${node.label}
                ${node.score ? `<br><span class="text-white/50 text-[8px]">${node.score}${typeof node.score === 'number' ? '%' : ''}</span>` : ''}
            </div>
        `;
        dom.discoveryMap.appendChild(el);
    });
}

function drawConnection(node, target, color = 'rgba(99, 102, 241, 0.3)') {
    const angle = Math.atan2(node.y - target.y, node.x - target.x) * 180 / Math.PI;
    const dist = Math.sqrt(Math.pow(node.x - target.x, 2) + Math.pow(node.y - target.y, 2));

    const line = document.createElement('div');
    line.className = "map-connection";
    line.style.width = `${dist}px`;
    line.style.left = `${target.x + 40}px`;
    line.style.top = `${target.y + 15}px`;
    line.style.transform = `rotate(${angle}deg)`;
    line.style.background = `linear-gradient(to right, ${color}, transparent)`;
    dom.discoveryMap.appendChild(line);
}

function updateAIActionsWithDiscovery() {
    // Add discovered keywords to AI Actions
    const discoveryAction = {
        priority: "high",
        title: "Strategic Discovery: 'Barrier Repair' Surge",
        description: "Intelligent scan detected a 124% increase in 'Barrier Repair' conversations where your core keywords are mentioned. Competitor GlowRecipe is not yet active here.",
        tags: ["#BarrierRepair", "#MarketGap", "#CleanBeauty"],
        bestTime: "Tonight 8PM (Strategic Window)"
    };

    AI_ACTIONS.unshift(discoveryAction);
    renderAIActions();
}

/**
 * Handle AI Action (Meme/Blog/Campaign)
 */
async function handleAIAction(btn, actionId) {
    const userId = firebase.auth().currentUser?.uid;
    if (!userId) return;

    const originalText = btn.innerHTML;

    try {
        const cost = await CreditService.getCost(actionId);

        if (cost > 0) {
            if (!confirm(`Generate Content?\nCost: ${cost} credits`)) return;
        }

        btn.disabled = true;
        btn.innerHTML = 'Generating...';

        const result = await CreditService.deductCredits(userId, actionId, { projectId: currentProjectId });

        await new Promise(resolve => setTimeout(resolve, 1500));

        showNotification(`Content Generated (-${result.cost} Credits)`);
        btn.innerHTML = '✅ Done';
        btn.classList.remove('bg-indigo-600', 'bg-slate-800');
        btn.classList.add('bg-emerald-600', 'text-white');

    } catch (error) {
        console.error(error);
        if (error.message === 'Insufficient credits') {
            alert("⚠️ Insufficient Credits!");
        } else {
            alert("Failed: " + error.message);
        }
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Helper Notification (from Brand Brain)
function showNotification(message, type = 'success') {
    const div = document.createElement('div');
    div.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-xl text-white font-medium z-50 transform transition-all duration-300 translate-y-10 opacity-0 ${type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`;
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    setTimeout(() => {
        div.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

// ========== BOOTSTRAP ==========
document.addEventListener('DOMContentLoaded', init);
