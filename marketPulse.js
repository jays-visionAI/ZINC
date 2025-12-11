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
    refreshBtn: document.getElementById('btn-refresh')
};

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

        // Try to restore last selected project from localStorage
        const lastProjectId = localStorage.getItem('marketPulse_lastProject');
        if (lastProjectId && projects.find(p => p.id === lastProjectId)) {
            projectSelect.value = lastProjectId;
            currentProjectId = lastProjectId;
            projectSelect.classList.remove('selection-highlight');
        }

        // Add change listener
        projectSelect.addEventListener('change', () => {
            const newProjectId = projectSelect.value;
            if (newProjectId) {
                currentProjectId = newProjectId;
                localStorage.setItem('marketPulse_lastProject', newProjectId);
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

function onProjectChange() {
    // TODO: Reload market pulse data for selected project
    console.log('Project changed to:', currentProjectId);
    document.getElementById('last-updated').textContent = 'Just now';
}

// ========== RENDER FUNCTIONS ==========

function renderTrendingKeywords() {
    if (!dom.trendingKeywords) return;
    dom.trendingKeywords.innerHTML = '';

    const maxChange = Math.max(...TRENDING_KEYWORDS.map(k => Math.abs(k.change)));

    TRENDING_KEYWORDS.forEach((item, index) => {
        const isPositive = item.change > 0;
        const barWidth = (Math.abs(item.change) / maxChange) * 100;
        const delay = index * 100;

        const el = document.createElement('div');
        el.className = "flex items-center gap-4 group";
        el.innerHTML = `
            <div class="w-40 shrink-0">
                <span class="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">${item.keyword}</span>
            </div>
            <div class="flex items-center gap-2 w-24 shrink-0">
                <span class="${isPositive ? 'text-emerald-400' : 'text-red-400'} text-xs font-bold">
                    ${isPositive ? '🔺' : '🔻'} ${isPositive ? '+' : ''}${item.change}%
                </span>
            </div>
            <div class="flex-1">
                <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div class="h-full rounded-full bar-animate ${isPositive ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-red-400'}"
                         style="width: ${barWidth}%; animation-delay: ${delay}ms"></div>
                </div>
            </div>
            <div class="text-xs text-slate-500 w-20 text-right shrink-0">${(item.volume / 1000).toFixed(1)}k vol</div>
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
        const borderColor = isPriority ? 'border-red-500/30' : 'border-slate-700';
        const bgColor = isPriority ? 'bg-red-900/10' : 'bg-slate-950';
        const badge = isPriority
            ? '<span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase">🔥 High Priority</span>'
            : '<span class="px-2 py-0.5 bg-slate-700 text-slate-400 text-[10px] font-bold rounded uppercase">📊 Medium</span>';

        const el = document.createElement('div');
        el.className = `${bgColor} border ${borderColor} rounded-xl p-4`;
        el.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <h4 class="font-bold text-sm text-slate-200">${action.title}</h4>
                ${badge}
            </div>
            <p class="text-xs text-slate-400 mb-4">${action.description}</p>
            
            ${action.tags.length ? `
            <div class="flex flex-wrap gap-2 mb-3">
                ${action.tags.map(tag => `<span class="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded">${tag}</span>`).join('')}
            </div>
            ` : ''}
            
            ${action.bestTime ? `<div class="text-[10px] text-slate-500 mb-3">⏰ Best posting time: ${action.bestTime}</div>` : ''}
            
            <div class="flex flex-wrap gap-2">
                <button class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors">
                    🐝 Quick Meme
                </button>
                <button class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors">
                    📝 Blog Post
                </button>
                <button class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors">
                    📢 Campaign
                </button>
            </div>
        `;
        dom.aiActions.appendChild(el);
    });
}

function setupEventListeners() {
    if (dom.refreshBtn) {
        dom.refreshBtn.addEventListener('click', () => {
            dom.refreshBtn.classList.add('animate-spin');
            setTimeout(() => {
                dom.refreshBtn.classList.remove('animate-spin');
                document.getElementById('last-updated').textContent = 'Just now';
            }, 1000);
        });
    }
}

// ========== BOOTSTRAP ==========
document.addEventListener('DOMContentLoaded', init);
