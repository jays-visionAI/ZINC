import { FilterService } from './services/filter-service.js';
import { AIFilterEngine } from './utils-ai-filter.js';

// ========== STATE ==========
let currentContentId = null;
let currentProjectId = 'jays-visionAI'; // Default or from context
let currentContent = null;
let currentEvaluation = null;

// ========== DOM REFERENCES ==========
const dom = {
    scoreBreakdown: document.getElementById('score-breakdown'),
    suggestionsContainer: document.getElementById('suggestions-container'),
    suggestionCount: document.getElementById('suggestion-count'),
    contentEditor: document.getElementById('content-editor'),
    charCount: document.getElementById('char-count'),
    previewCaption: document.getElementById('preview-caption'),
    previewHashtags: document.getElementById('preview-hashtags'),
    totalScore: document.getElementById('total-score'),

    // Header Info
    contentTitle: document.getElementById('content-title'),

    // Actions
    btnApprove: document.querySelector('button[class*="bg-emerald-600"]'),
    btnSave: document.querySelector('button:contains("임시 저장")') // Helper needed or select by text
};

// Helper to find button by text if no ID
function findButtonByText(text) {
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
        if (btn.textContent.includes(text)) return btn;
    }
    return null;
}

// ========== INITIALIZATION ==========
async function init() {
    // 1. Get IDs from URL or defaults
    const urlParams = new URLSearchParams(window.location.search);
    currentContentId = urlParams.get('id');

    // 2. Load Content
    if (!currentContentId || currentContentId === 'demo_draft_new') {
        console.log("No ID or demo_draft_new, (re)creating demo draft...");
        currentContentId = await FilterService.createDemoDraft(currentProjectId, currentContentId || 'demo_draft_001');
        // Update URL without reload
        const newUrl = `${window.location.pathname}?id=${currentContentId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    await loadContent(currentContentId);
    setupEventListeners();
}

async function loadContent(id) {
    try {
        const data = await FilterService.getContent(currentProjectId, id);
        if (!data) {
            alert("Content not found");
            return;
        }

        currentContent = data;
        renderEditor(data.content);

        // Initial Analysis
        runAnalysis();
    } catch (error) {
        console.error("Failed to load content:", error);
    }
}

// ========== LOGIC: ANALYSIS & RENDER ==========

function runAnalysis() {
    if (!currentContent) return;

    const text = dom.contentEditor.value;
    const hashtags = extractHashtags(text);

    // Run Mock AI Engine
    const result = AIFilterEngine.analyze(text, hashtags, currentContent.platform);
    currentEvaluation = result;

    renderScoreBreakdown(result.breakdown);
    renderSuggestions(result.suggestions);

    // Update Total Score UI
    if (dom.totalScore) {
        dom.totalScore.textContent = result.totalScore;
    }
}

function extractHashtags(text) {
    return text.match(/#\S+/g) || [];
}

function renderEditor(contentData) {
    if (dom.contentEditor) {
        dom.contentEditor.value = contentData.caption;
        // Trigger input event to update char counts
        dom.contentEditor.dispatchEvent(new Event('input'));
    }
    // Update Header Title if exists
    if (dom.contentTitle) {
        dom.contentTitle.textContent = `Content #${currentContentId.substring(0, 6)}`;
    }
}

function renderScoreBreakdown(breakdown) {
    if (!dom.scoreBreakdown) return;
    dom.scoreBreakdown.innerHTML = '';

    breakdown.forEach((item, index) => {
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

function renderSuggestions(suggestions) {
    if (!dom.suggestionsContainer) return;
    dom.suggestionsContainer.innerHTML = '';

    const activeSuggestions = suggestions.filter(s => !s.isApplied);

    if (dom.suggestionCount) {
        dom.suggestionCount.textContent = activeSuggestions.length;
    }

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
        el.id = `suggestion-${sug.id}`; // Ensure IDs are unique in utils-ai-filter

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
                    <span class="text-slate-400">${sug.currentValue}</span>
                </div>
                <div class="flex gap-2">
                    <span class="text-emerald-500 shrink-0">제안:</span>
                    <span class="text-emerald-400">${sug.suggestedValue}</span>
                </div>
            </div>
            
            <div class="flex gap-2">
                <button class="btn-apply flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors" data-id="${sug.id}">
                    ✍️ 적용하기
                </button>
                <button class="btn-dismiss px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium rounded-lg transition-colors" data-id="${sug.id}">
                    무시
                </button>
            </div>
        `;
        dom.suggestionsContainer.appendChild(el);
    });

    // Attach event listeners to new buttons
    dom.suggestionsContainer.querySelectorAll('.btn-apply').forEach(btn => {
        btn.addEventListener('click', (e) => applySuggestion(e.target.dataset.id));
    });
    dom.suggestionsContainer.querySelectorAll('.btn-dismiss').forEach(btn => {
        btn.addEventListener('click', (e) => dismissSuggestion(e.target.dataset.id));
    });
}

function setupEventListeners() {
    // Editor Input -> Live Analysis (Debounced in real app, instant for now)
    if (dom.contentEditor) {
        dom.contentEditor.addEventListener('input', () => {
            const text = dom.contentEditor.value;
            if (dom.charCount) dom.charCount.textContent = text.length;

            // Update preview text
            const lines = text.split('\n');
            const caption = lines[0] || '';
            const hashtags = text.match(/#\S+/g) || [];

            if (dom.previewCaption) {
                dom.previewCaption.textContent = caption.slice(0, 80) + (caption.length > 80 ? '...' : '');
            }
            if (dom.previewHashtags) {
                dom.previewHashtags.textContent = hashtags.join(' ');
            }

            // Trigger re-analysis
            runAnalysis();
        });
    }

    // Save Button
    const saveBtn = findButtonByText('임시 저장');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveCurrentState('draft');
            alert('임시 저장되었습니다.');
        });
    }

    // Approve Button
    if (dom.btnApprove) {
        dom.btnApprove.addEventListener('click', async () => {
            if (confirm('이 콘텐츠를 승인하고 발행 대기 상태로 변경하시겠습니까?')) {
                await saveCurrentState('approved');
                alert('승인 완료! The Growth 대시보드로 데이터가 전송됩니다.');
                // Redirect or update UI
                window.location.href = 'theGrowth.html';
            }
        });
    }
}

// ========== ACTIONS ==========

async function saveCurrentState(status) {
    if (!currentContentId) return;

    const dataToSave = {
        status: status || 'draft',
        content: {
            caption: dom.contentEditor.value,
            hashtags: extractHashtags(dom.contentEditor.value),
            // mediaUrls preserved from original if not edited
            mediaUrls: currentContent.content.mediaUrls || []
        },
        evaluation: currentEvaluation
    };

    await FilterService.saveContent(currentProjectId, currentContentId, dataToSave);
}

function applySuggestion(id) {
    if (!currentEvaluation) return;

    const suggestion = currentEvaluation.suggestions.find(s => s.id === id);
    if (!suggestion) return;

    // Apply Logic
    const currentText = dom.contentEditor.value;

    // Simple replacement logic (can be brittle, but sufficient for MV prototype)
    if (suggestion.type === 'SEO') {
        // e.g., Append tag
        if (suggestion.suggestedValue.startsWith('Add ')) {
            const tagToAdd = suggestion.suggestedValue.replace('Add ', '');
            dom.contentEditor.value = currentText + ' ' + tagToAdd;
        }
    } else if (suggestion.currentValue && suggestion.suggestedValue) {
        // Text replacement
        dom.contentEditor.value = currentText.replace(suggestion.currentValue, suggestion.suggestedValue);
    }

    // Mark as applied in local state (won't persist unless saved, but re-analysis will likely clear it anyway if condition met)
    suggestion.isApplied = true;

    // Dispatch input to trigger re-analysis and UI update
    dom.contentEditor.dispatchEvent(new Event('input'));
}

function dismissSuggestion(id) {
    // Just hide from UI for this session
    const btn = document.getElementById(`suggestion-${id}`);
    if (btn) btn.remove();
}

// ========== BOOTSTRAP ==========
document.addEventListener('DOMContentLoaded', init);
