// The Growth - JavaScript Logic

// ========== MOCK DATA ==========
const TOP_CONTENT = [
    {
        rank: 1,
        emoji: "🔥",
        title: "클린뷰티 캠페인",
        reach: 45230,
        reachChange: 340,
        engagement: 8.2,
        platform: "Instagram"
    },
    {
        rank: 2,
        emoji: "📸",
        title: "여름 스킨케어 가이드",
        reach: 32150,
        reachChange: 180,
        engagement: 6.8,
        platform: "Instagram"
    },
    {
        rank: 3,
        emoji: "💬",
        title: "고객 후기 리포스팅",
        reach: 28400,
        reachChange: 95,
        engagement: 5.4,
        platform: "Twitter"
    }
];

const LEARNING_INSIGHTS = [
    {
        icon: "⏰",
        title: "최적 발행 시간",
        value: "화요일/목요일 오전 9시",
        improvement: "+35%",
        improvementLabel: "도달률",
        appliedTo: "Studio"
    },
    {
        icon: "#️⃣",
        title: "효과적인 해시태그",
        value: "#클린뷰티, #비건화장품",
        improvement: "+28%",
        improvementLabel: "참여율",
        appliedTo: "The Filter"
    },
    {
        icon: "🖼️",
        title: "이미지 스타일",
        value: "밝은 톤 + 자연 배경",
        improvement: "+42%",
        improvementLabel: "저장률",
        appliedTo: "Brand Brain"
    },
    {
        icon: "📝",
        title: "콘텐츠 길이",
        value: "150-200자",
        improvement: "최적",
        improvementLabel: "완독률",
        appliedTo: "Studio"
    }
];

// ========== DOM REFERENCES ==========
const dom = {
    topContent: document.getElementById('top-content'),
    learningInsights: document.getElementById('learning-insights'),
    generateReportBtn: document.getElementById('btn-generate-report'),
    reportModal: document.getElementById('report-modal'),
    closeModalBtn: document.getElementById('btn-close-modal')
};

// ========== INITIALIZATION ==========
function init() {
    renderTopContent();
    renderLearningInsights();
    setupEventListeners();
}

// ========== RENDER FUNCTIONS ==========

function renderTopContent() {
    if (!dom.topContent) return;
    dom.topContent.innerHTML = '';

    TOP_CONTENT.forEach((content, index) => {
        const el = document.createElement('div');
        el.className = "flex items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-600 transition-all fade-in";
        el.style.animationDelay = `${index * 100}ms`;

        el.innerHTML = `
            <div class="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-lg text-amber-400 font-bold">
                ${content.rank}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-lg">${content.emoji}</span>
                    <span class="font-medium text-white truncate">${content.title}</span>
                </div>
                <div class="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>Reach: ${content.reach.toLocaleString()}</span>
                    <span class="text-emerald-400">(+${content.reachChange}%)</span>
                    <span>•</span>
                    <span>Engagement: ${content.engagement}%</span>
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

function renderLearningInsights() {
    if (!dom.learningInsights) return;
    dom.learningInsights.innerHTML = '';

    LEARNING_INSIGHTS.forEach((insight, index) => {
        const el = document.createElement('div');
        el.className = "bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-purple-500/30 transition-all fade-in";
        el.style.animationDelay = `${index * 100}ms`;

        el.innerHTML = `
            <div class="flex items-center gap-2 mb-3">
                <span class="text-xl">${insight.icon}</span>
                <span class="text-sm font-medium text-slate-300">${insight.title}</span>
            </div>
            <div class="text-sm text-white font-medium mb-2">${insight.value}</div>
            <div class="flex items-center justify-between">
                <span class="text-xs text-emerald-400">${insight.improvement} ${insight.improvementLabel}</span>
                <span class="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">${insight.appliedTo}</span>
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
