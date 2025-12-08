// ========================================
// Admin Chatbot Settings
// ========================================

// Default FAQ items
const DEFAULT_FAQ = [
    {
        id: 'faq_001',
        question: 'Market Pulse가 뭔가요?',
        answer: 'Market Pulse는 ZYNK의 첫 번째 단계로, 시장 트렌드와 경쟁사 동향을 실시간으로 모니터링하는 기능입니다.'
    },
    {
        id: 'faq_002',
        question: 'Brand Brain은 어떤 기능인가요?',
        answer: 'Brand Brain은 ZYNK의 두 번째 단계로, 브랜드 전략과 톤앤매너를 설정하여 모든 콘텐츠에 일관성을 유지합니다.'
    },
    {
        id: 'faq_003',
        question: 'Studio에서 콘텐츠는 어떻게 만들어지나요?',
        answer: 'Studio는 12개 전문 AI 에이전트가 협력하여 콘텐츠를 생성합니다. 워크플로우를 선택하면 자동으로 콘텐츠가 만들어집니다.'
    }
];

// State
let chatbotSettings = {
    systemPrompt: '',
    welcomeMessage: '',
    dailyLimit: 50,
    status: 'active',
    faq: []
};

// Initialize
window.initChatbot = function () {
    console.log('[Chatbot Settings] Initializing...');
    loadSettings();
    bindEvents();
};

// Load settings from Firestore or defaults
async function loadSettings() {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('chatbotConfig').doc('default').get();

        if (doc.exists) {
            const data = doc.data();
            chatbotSettings = {
                systemPrompt: data.systemPrompt || document.getElementById('chatbot-system-prompt').value,
                welcomeMessage: data.welcomeMessage || document.getElementById('chatbot-welcome-message').value,
                dailyLimit: data.dailyLimit || 50,
                status: data.status || 'active',
                faq: data.faq || DEFAULT_FAQ
            };
        } else {
            // Use defaults
            chatbotSettings.faq = DEFAULT_FAQ;
        }

        // Populate UI
        populateUI();

    } catch (error) {
        console.error('[Chatbot Settings] Error loading:', error);
        // Use defaults on error
        chatbotSettings.faq = DEFAULT_FAQ;
        populateUI();
    }
}

// Populate UI with settings
function populateUI() {
    const systemPromptEl = document.getElementById('chatbot-system-prompt');
    const welcomeMessageEl = document.getElementById('chatbot-welcome-message');
    const dailyLimitEl = document.getElementById('chatbot-daily-limit');
    const statusEl = document.getElementById('chatbot-status');

    if (chatbotSettings.systemPrompt && systemPromptEl) {
        systemPromptEl.value = chatbotSettings.systemPrompt;
    }
    if (chatbotSettings.welcomeMessage && welcomeMessageEl) {
        welcomeMessageEl.value = chatbotSettings.welcomeMessage;
    }
    if (dailyLimitEl) {
        dailyLimitEl.value = chatbotSettings.dailyLimit;
    }
    if (statusEl) {
        statusEl.value = chatbotSettings.status;
    }

    renderFaqList();
}

// Render FAQ list
function renderFaqList() {
    const container = document.getElementById('faq-list');
    if (!container) return;

    if (!chatbotSettings.faq || chatbotSettings.faq.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
                No FAQs added yet. Click "Add FAQ" to create one.
            </div>
        `;
        return;
    }

    container.innerHTML = chatbotSettings.faq.map(faq => `
        <div class="faq-item" data-id="${faq.id}">
            <div class="faq-question">Q: ${escapeHtml(faq.question)}</div>
            <div class="faq-answer">${escapeHtml(faq.answer)}</div>
            <div class="faq-actions">
                <button class="admin-btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editFaq('${faq.id}')">
                    Edit
                </button>
                <button class="admin-btn-secondary" style="padding: 6px 12px; font-size: 12px; color: #ef4444;" onclick="deleteFaq('${faq.id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Bind events
function bindEvents() {
    // Add FAQ button
    document.getElementById('btn-add-faq')?.addEventListener('click', () => {
        openFaqModal();
    });

    // Save FAQ button
    document.getElementById('btn-save-faq')?.addEventListener('click', () => {
        saveFaq();
    });

    // Save settings button
    document.getElementById('btn-save-chatbot')?.addEventListener('click', () => {
        saveSettings();
    });

    // Reset button
    document.getElementById('btn-reset-chatbot')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset to default settings?')) {
            resetToDefaults();
        }
    });
}

// Open FAQ modal
function openFaqModal(faqId = null) {
    document.getElementById('faq-modal').style.display = 'flex';
    document.getElementById('faq-edit-id').value = faqId || '';
    document.getElementById('faq-modal-title').textContent = faqId ? 'Edit FAQ' : 'Add FAQ';

    if (faqId) {
        const faq = chatbotSettings.faq.find(f => f.id === faqId);
        if (faq) {
            document.getElementById('faq-question').value = faq.question;
            document.getElementById('faq-answer').value = faq.answer;
        }
    } else {
        document.getElementById('faq-question').value = '';
        document.getElementById('faq-answer').value = '';
    }
}

// Close FAQ modal
window.closeFaqModal = function () {
    document.getElementById('faq-modal').style.display = 'none';
};

// Edit FAQ
window.editFaq = function (faqId) {
    openFaqModal(faqId);
};

// Delete FAQ
window.deleteFaq = function (faqId) {
    if (confirm('Are you sure you want to delete this FAQ?')) {
        chatbotSettings.faq = chatbotSettings.faq.filter(f => f.id !== faqId);
        renderFaqList();
    }
};

// Save FAQ
function saveFaq() {
    const question = document.getElementById('faq-question').value.trim();
    const answer = document.getElementById('faq-answer').value.trim();
    const editId = document.getElementById('faq-edit-id').value;

    if (!question || !answer) {
        alert('Please fill in both question and answer.');
        return;
    }

    if (editId) {
        // Edit existing
        const idx = chatbotSettings.faq.findIndex(f => f.id === editId);
        if (idx > -1) {
            chatbotSettings.faq[idx].question = question;
            chatbotSettings.faq[idx].answer = answer;
        }
    } else {
        // Add new
        chatbotSettings.faq.push({
            id: 'faq_' + Date.now(),
            question,
            answer
        });
    }

    closeFaqModal();
    renderFaqList();
}

// Save all settings to Firestore
async function saveSettings() {
    const btn = document.getElementById('btn-save-chatbot');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    try {
        // Gather values from UI
        chatbotSettings.systemPrompt = document.getElementById('chatbot-system-prompt').value;
        chatbotSettings.welcomeMessage = document.getElementById('chatbot-welcome-message').value;
        chatbotSettings.dailyLimit = parseInt(document.getElementById('chatbot-daily-limit').value) || 50;
        chatbotSettings.status = document.getElementById('chatbot-status').value;

        const db = firebase.firestore();
        await db.collection('chatbotConfig').doc('default').set({
            ...chatbotSettings,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: firebase.auth().currentUser?.uid || 'unknown'
        });

        btn.innerHTML = '✓ Saved!';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('[Chatbot Settings] Save error:', error);
        alert('Failed to save settings: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Reset to defaults (requires re-authentication)
async function resetToDefaults() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('Please log in first.');
            return;
        }

        // Re-authenticate with Google
        const provider = new firebase.auth.GoogleAuthProvider();
        await user.reauthenticateWithPopup(provider);

        // If re-auth successful, proceed with reset
        document.getElementById('chatbot-system-prompt').value = `당신은 ZYNK 헬프데스크 AI입니다.

## 역할
- ZYNK 플랫폼 사용법 안내
- 기능 설명 (Market Pulse, Brand Brain, Studio, The Filter, The Growth)
- 문제 해결 및 트러블슈팅

## 제한사항
ZYNK와 관련된 질문에만 답변하세요.
다음과 같은 요청은 정중히 거절하세요:
- 수학 문제 풀이
- 번역 요청
- 뉴스/기사 검색
- 코드 작성

## 거절 응답
"죄송합니다. 저는 ZYNK 사용에 관한 질문만 도와드릴 수 있습니다. 🐝"`;

        document.getElementById('chatbot-welcome-message').value = `안녕하세요! 저는 ZYNK 헬프데스크 AI입니다. 🐝

ZYNK 사용에 관한 질문이 있으시면 편하게 물어보세요!

🔹 기능 사용법
🔹 문제 해결
🔹 팁과 가이드`;

        document.getElementById('chatbot-daily-limit').value = 50;
        document.getElementById('chatbot-status').value = 'active';

        chatbotSettings.faq = DEFAULT_FAQ;
        renderFaqList();

        alert('Settings have been reset to defaults.');

    } catch (error) {
        console.error('[Chatbot Settings] Re-auth failed:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            alert('Authentication cancelled.');
        } else {
            alert('Authentication required to reset settings.');
        }
    }
}
