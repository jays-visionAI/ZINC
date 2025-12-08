// The Filter - JavaScript Logic

// ========== MOCK DATA ==========
const SCORE_BREAKDOWN = [
    {
        id: "brand-voice",
        label: "Brand Voice",
        score: 100,
        status: "pass",
        detail: "Brand Brain 전략과 일치"
    },
    {
        id: "grammar",
        label: "Grammar & Spelling",
        score: 100,
        status: "pass",
        detail: "맞춤법/문법 오류 없음"
    },
    {
        id: "seo",
        label: "SEO Optimization",
        score: 85,
        status: "warning",
        detail: "트렌딩 키워드 1개 추가 권장"
    },
    {
        id: "compliance",
        label: "Compliance",
        score: 100,
        status: "pass",
        detail: "금지어/법적 이슈 없음"
    }
];

const SUGGESTIONS = [
    {
        id: "sug-1",
        type: "SEO",
        priority: "medium",
        title: "해시태그 추가 제안",
        description: "Market Pulse에서 감지된 트렌딩 키워드 \"#수분폭탄\"을 추가하면 노출이 +15% 증가할 것으로 예상됩니다.",
        current: "#비건뷰티 #친환경 #여름스킨케어",
        suggested: "#비건뷰티 #친환경 #여름스킨케어 #수분폭탄",
        applied: false
    },
    {
        id: "sug-2",
        type: "Engagement",
        priority: "low",
        title: "도입부 임팩트 강화",
        description: "첫 문장이 다소 평이합니다. 의문형으로 시작하면 참여율이 +12% 높아지는 경향이 있습니다.",
        current: "여름철 피부 고민, #클린뷰티 로 시작하세요!",
        suggested: "여름철 피부가 지쳐가고 있나요? 🌿",
        applied: false
    }
];

// ========== DOM REFERENCES ==========
const dom = {
    scoreBreakdown: document.getElementById('score-breakdown'),
    suggestionsContainer: document.getElementById('suggestions-container'),
    suggestionCount: document.getElementById('suggestion-count'),
    contentEditor: document.getElementById('content-editor'),
    charCount: document.getElementById('char-count'),
    previewCaption: document.getElementById('preview-caption'),
    previewHashtags: document.getElementById('preview-hashtags')
};

// ========== INITIALIZATION ==========
function init() {
    renderScoreBreakdown();
    renderSuggestions();
    setupEventListeners();
}

// ========== RENDER FUNCTIONS ==========

function renderScoreBreakdown() {
    if (!dom.scoreBreakdown) return;
    dom.scoreBreakdown.innerHTML = '';

    SCORE_BREAKDOWN.forEach((item, index) => {
        const statusIcon = item.status === 'pass' ? '✅' : '⚠️';
        const statusColor = item.status === 'pass' ? 'emerald' : 'amber';

        const el = document.createElement('div');
        el.className = "fade-in";
        el.style.animationDelay = `${index * 100}ms`;

        el.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                    <span>${statusIcon}</span>
                    <span class="text-sm font-medium text-slate-300">${item.label}</span>
                </div>
                <span class="text-sm font-bold text-${statusColor}-400">${item.score}%</span>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-2 mb-1">
                <div class="bg-${statusColor}-500 h-2 rounded-full score-animate" style="width: ${item.score}%; animation-delay: ${index * 100}ms"></div>
            </div>
            <div class="text-xs text-slate-500">${item.detail}</div>
        `;
        dom.scoreBreakdown.appendChild(el);
    });
}

function renderSuggestions() {
    if (!dom.suggestionsContainer) return;
    dom.suggestionsContainer.innerHTML = '';

    const activeSuggestions = SUGGESTIONS.filter(s => !s.applied);
    dom.suggestionCount.textContent = activeSuggestions.length;

    if (activeSuggestions.length === 0) {
        dom.suggestionsContainer.innerHTML = `
            <div class="text-center py-8 text-slate-500">
                <div class="text-3xl mb-2">✨</div>
                <div class="text-sm">모든 제안이 적용되었습니다!</div>
            </div>
        `;
        return;
    }

    activeSuggestions.forEach((sug, index) => {
        const priorityColor = sug.priority === 'high' ? 'red' : sug.priority === 'medium' ? 'amber' : 'blue';

        const el = document.createElement('div');
        el.className = "bg-slate-950 border border-slate-800 rounded-xl p-4 fade-in";
        el.style.animationDelay = `${index * 100}ms`;
        el.id = `suggestion-${sug.id}`;

        el.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-amber-400">⚠️</span>
                    <span class="text-xs font-bold text-${priorityColor}-400 uppercase">${sug.type}</span>
                </div>
                <span class="text-xs text-slate-500">${sug.priority.toUpperCase()}</span>
            </div>
            
            <h4 class="font-medium text-white mb-2">${sug.title}</h4>
            <p class="text-xs text-slate-400 mb-4">${sug.description}</p>
            
            <div class="space-y-2 text-xs mb-4">
                <div class="flex gap-2">
                    <span class="text-slate-500 shrink-0">현재:</span>
                    <span class="text-slate-400">${sug.current}</span>
                </div>
                <div class="flex gap-2">
                    <span class="text-emerald-500 shrink-0">제안:</span>
                    <span class="text-emerald-400">${sug.suggested}</span>
                </div>
            </div>
            
            <div class="flex gap-2">
                <button onclick="applySuggestion('${sug.id}')" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors">
                    ✍️ 적용하기
                </button>
                <button onclick="dismissSuggestion('${sug.id}')" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium rounded-lg transition-colors">
                    무시
                </button>
            </div>
        `;
        dom.suggestionsContainer.appendChild(el);
    });
}

function setupEventListeners() {
    // Character count
    if (dom.contentEditor) {
        dom.contentEditor.addEventListener('input', () => {
            const text = dom.contentEditor.value;
            dom.charCount.textContent = text.length;

            // Update preview
            const lines = text.split('\n');
            const caption = lines[0] || '';
            const hashtags = text.match(/#\S+/g) || [];

            if (dom.previewCaption) {
                dom.previewCaption.textContent = caption.slice(0, 80) + (caption.length > 80 ? '...' : '');
            }
            if (dom.previewHashtags) {
                dom.previewHashtags.textContent = hashtags.join(' ');
            }
        });
    }
}

// ========== SUGGESTION ACTIONS ==========

function applySuggestion(id) {
    const suggestion = SUGGESTIONS.find(s => s.id === id);
    if (!suggestion) return;

    // Mark as applied
    suggestion.applied = true;

    // Update editor content if it's a text change
    if (suggestion.type === 'SEO' && dom.contentEditor) {
        const currentText = dom.contentEditor.value;
        const newText = currentText.replace(suggestion.current, suggestion.suggested);
        dom.contentEditor.value = newText;
        dom.contentEditor.dispatchEvent(new Event('input'));
    }

    // Re-render
    renderSuggestions();

    // Update score if SEO was the issue
    if (suggestion.type === 'SEO') {
        const seoItem = SCORE_BREAKDOWN.find(s => s.id === 'seo');
        if (seoItem) {
            seoItem.score = 100;
            seoItem.status = 'pass';
            seoItem.detail = '트렌딩 키워드 포함됨';
            renderScoreBreakdown();
            document.getElementById('total-score').textContent = '100';
        }
    }
}

function dismissSuggestion(id) {
    const suggestion = SUGGESTIONS.find(s => s.id === id);
    if (!suggestion) return;

    suggestion.applied = true; // Just hide it
    renderSuggestions();
}

// ========== BOOTSTRAP ==========
document.addEventListener('DOMContentLoaded', init);
