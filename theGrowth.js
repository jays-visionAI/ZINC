import { GrowthService } from './services/growth-service.js';
import { AnalyticsSeeder } from './utils-analytics-seeder.js';

// ========== STATE ==========
const currentProjectId = 'jays-visionAI'; // Default or context from global

// ========== DOM REFERENCES ==========
const dom = {
    topContent: document.getElementById('top-content'),
    learningInsights: document.getElementById('learning-insights'),
    generateReportBtn: document.getElementById('btn-generate-report'),
    reportModal: document.getElementById('report-modal'),
    closeModalBtn: document.getElementById('btn-close-modal')
};

// ========== INITIALIZATION ==========
async function init() {
    await ensureData();

    // Load Data in Parallel
    const [topContent, metrics] = await Promise.all([
        GrowthService.getTopContent(currentProjectId),
        GrowthService.getDailyMetrics(currentProjectId, 1) // Get latest day for insights
    ]);

    renderTopContent(topContent);

    // Use insights from the latest daily metric if available
    const insights = metrics.length > 0 ? metrics[0].insights : [];
    renderLearningInsights(insights);

    setupEventListeners();
}

async function ensureData() {
    // Check if data exists, if not seed it
    const created = await GrowthService.ensureDataExists(currentProjectId, AnalyticsSeeder.seedInitialData.bind(AnalyticsSeeder));
    if (created) {
        console.log("Initial analytics data seeded.");
    }
}

// ========== RENDER FUNCTIONS ==========

function renderTopContent(contentList) {
    if (!dom.topContent) return;
    dom.topContent.innerHTML = '';

    if (contentList.length === 0) {
        dom.topContent.innerHTML = '<div class="text-slate-500 text-sm p-4 text-center">No content data available.</div>';
        return;
    }

    contentList.forEach((content, index) => {
        const el = document.createElement('div');
        el.className = "flex items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-600 transition-all fade-in";
        el.style.animationDelay = `${index * 100}ms`;

        el.innerHTML = `
            <div class="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-lg text-amber-400 font-bold">
                ${index + 1}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-lg">${content.emoji || '📄'}</span>
                    <span class="font-medium text-white truncate">${content.title || 'Untitled Content'}</span>
                </div>
                <div class="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>Reach: ${(content.performance.reach || 0).toLocaleString()}</span>
                    <span class="text-emerald-400">(${content.performance.trend === 'up' ? '↗' : '→'})</span>
                    <span>•</span>
                    <span>Engagement: ${content.performance.engagementRate || 0}%</span>
                </div>
            </div>
            <div class="flex gap-2">
                <button class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 rounded-lg transition-colors">상세보기</button>
                <button class="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-xs text-indigo-400 rounded-lg transition-colors">재사용</button>
            </div>
        `;
        dom.topContent.appendChild(el);
    });
}

function renderLearningInsights(insights) {
    if (!dom.learningInsights) return;
    dom.learningInsights.innerHTML = '';

    if (!insights || insights.length === 0) {
        dom.learningInsights.innerHTML = '<div class="text-slate-500 text-sm p-4 text-center">No insights generated yet.</div>';
        return;
    }

    const iconMap = {
        'best_time': '⏰',
        'hashtag': '#️⃣',
        'content_type': '📝',
        'image_style': '🖼️'
    };

    insights.forEach((insight, index) => {
        const el = document.createElement('div');
        el.className = "bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-purple-500/30 transition-all fade-in";
        el.style.animationDelay = `${index * 100}ms`;

        // Mock improvements/labels based on type for display flavor
        let improvement = "+20%";
        let label = "Efficiency";
        if (insight.type === 'best_time') { improvement = "+35%"; label = "도달률"; }
        if (insight.type === 'hashtag') { improvement = "+28%"; label = "참여율"; }

        el.innerHTML = `
            <div class="flex items-center gap-2 mb-3">
                <span class="text-xl">${iconMap[insight.type] || '💡'}</span>
                <span class="text-sm font-medium text-slate-300 capitalize">${insight.type.replace('_', ' ')}</span>
            </div>
            <div class="text-sm text-white font-medium mb-2">${insight.value}</div>
            <div class="flex items-center justify-between">
                <span class="text-xs text-emerald-400">${improvement} ${label}</span>
                <span class="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">Auto-Applied</span>
            </div>
            <div class="flex items-center gap-1 mt-3 text-[10px] text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                자동 반영됨
            </div>
        `;
        dom.learningInsights.appendChild(el);
    });
}

function setupEventListeners() {
    // Report Modal
    if (dom.generateReportBtn && dom.reportModal) {
        dom.generateReportBtn.addEventListener('click', () => {
            dom.reportModal.classList.remove('hidden');
            dom.reportModal.classList.add('flex');
        });
    }

    if (dom.closeModalBtn && dom.reportModal) {
        dom.closeModalBtn.addEventListener('click', () => {
            dom.reportModal.classList.add('hidden');
            dom.reportModal.classList.remove('flex');
        });

        // Close on backdrop click
        dom.reportModal.addEventListener('click', (e) => {
            if (e.target === dom.reportModal) {
                dom.reportModal.classList.add('hidden');
                dom.reportModal.classList.remove('flex');
            }
        });
    }
}

// ========== BOOTSTRAP ==========
document.addEventListener('DOMContentLoaded', init);
