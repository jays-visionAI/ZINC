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
    initChatbotTabs();  // Initialize tabs
    bindTabEvents();    // Bind tab-specific events
};

// ============================================
// TAB SWITCHING
// ============================================

function initChatbotTabs() {
    console.log('[Chatbot Settings] Initializing tabs...');
    const tabs = document.querySelectorAll('.chatbot-tab');

    if (tabs.length === 0) {
        console.warn('[Chatbot Settings] No tabs found!');
        return;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            console.log('[Chatbot Settings] Switching to tab:', targetTab);

            // Update tab styles (underline style)
            tabs.forEach(t => {
                t.style.borderBottom = '2px solid transparent';
                t.style.color = 'rgba(255,255,255,0.5)';
                t.style.fontWeight = '400';
                t.classList.remove('active');
            });

            tab.style.borderBottom = '2px solid #16e0bd';
            tab.style.color = '#fff';
            tab.style.fontWeight = '600';
            tab.classList.add('active');

            // Show/hide content
            const generalTab = document.getElementById('tab-general');
            const pageContextTab = document.getElementById('tab-page-context');
            const voiceTab = document.getElementById('tab-voice');
            const llmTab = document.getElementById('tab-llm');
            const faqTab = document.getElementById('tab-faq');

            if (generalTab) generalTab.style.display = targetTab === 'general' ? 'block' : 'none';
            if (pageContextTab) pageContextTab.style.display = targetTab === 'page-context' ? 'block' : 'none';
            if (voiceTab) voiceTab.style.display = targetTab === 'voice' ? 'block' : 'none';
            if (llmTab) llmTab.style.display = targetTab === 'llm' ? 'block' : 'none';
            if (faqTab) faqTab.style.display = targetTab === 'faq' ? 'block' : 'none';

            // Initialize tab content
            if (targetTab === 'page-context') {
                loadPageContextList();
            } else if (targetTab === 'voice') {
                loadVoiceSettings();
            } else if (targetTab === 'llm') {
                loadLLMSettings();
            } else if (targetTab === 'faq') {
                if (typeof loadFaqItems === 'function') loadFaqItems();
            }
        });
    });

    console.log('[Chatbot Settings] Tabs initialized:', tabs.length);
}

// Bind tab-specific events
function bindTabEvents() {
    // Page Context
    document.getElementById('page-context-select')?.addEventListener('change', (e) => {
        loadPageContext(e.target.value);
    });

    document.getElementById('btn-refresh-pages')?.addEventListener('click', loadPageContextList);
    document.getElementById('btn-add-tip')?.addEventListener('click', addTip);
    document.getElementById('btn-save-page-context')?.addEventListener('click', savePageContext);
    document.getElementById('btn-seed-data')?.addEventListener('click', seedPageContextData);

    // Voice
    document.getElementById('btn-save-voice')?.addEventListener('click', saveVoiceSettings);

    // LLM Settings
    document.getElementById('btn-save-llm')?.addEventListener('click', saveLLMSettings);
    document.getElementById('llm-provider')?.addEventListener('change', onProviderChange);
    document.getElementById('llm-model')?.addEventListener('change', onModelChange);
    document.getElementById('llm-temperature')?.addEventListener('input', onTemperatureChange);
}

// ============================================
// LLM SETTINGS MANAGEMENT
// ============================================

// Provider-Model mapping with descriptions
const LLM_PROVIDERS = {
    deepseek: {
        name: 'DeepSeek',
        icon: '🔮',
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat', desc: 'Cost-effective, high-quality chat model. Recommended for helpdesk use.' },
            { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', desc: 'Advanced reasoning capabilities for complex queries.' }
        ]
    },
    openai: {
        name: 'OpenAI',
        icon: '🟢',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', desc: 'Latest multimodal model with excellent performance.' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Faster and more affordable version of GPT-4o.' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Fast and cost-effective for simple queries.' }
        ]
    },
    anthropic: {
        name: 'Anthropic',
        icon: '🟣',
        models: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', desc: 'Best balance of intelligence and speed.' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', desc: 'Fastest Claude model for quick responses.' }
        ]
    },
    google: {
        name: 'Google',
        icon: '🔵',
        models: [
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Advanced model with long context window.' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Fast and efficient for quick responses.' }
        ]
    }
};

let currentLLMSettings = {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.7
};

// Load LLM settings from Firestore
async function loadLLMSettings() {
    console.log('[Chatbot Settings] Loading LLM settings...');

    try {
        const db = firebase.firestore();
        const doc = await db.collection('chatbotConfig').doc('default').get();

        if (doc.exists) {
            const data = doc.data();
            currentLLMSettings = {
                provider: data.llmProvider || 'deepseek',
                model: data.llmModel || 'deepseek-chat',
                temperature: data.llmTemperature ?? 0.7
            };
        }

        // Update UI
        updateLLMUI();
        console.log('[Chatbot Settings] LLM settings loaded:', currentLLMSettings);

    } catch (error) {
        console.error('[Chatbot Settings] Failed to load LLM settings:', error);
        updateLLMUI(); // Use defaults
    }
}

// Update all LLM UI elements
function updateLLMUI() {
    // Set provider dropdown
    const providerSelect = document.getElementById('llm-provider');
    if (providerSelect) {
        providerSelect.value = currentLLMSettings.provider;
    }

    // Populate model dropdown based on provider
    populateModelsDropdown(currentLLMSettings.provider);

    // Set model dropdown
    const modelSelect = document.getElementById('llm-model');
    if (modelSelect) {
        modelSelect.value = currentLLMSettings.model;
    }

    // Set temperature
    const tempSlider = document.getElementById('llm-temperature');
    const tempValue = document.getElementById('llm-temp-value');
    if (tempSlider) {
        tempSlider.value = currentLLMSettings.temperature;
    }
    if (tempValue) {
        tempValue.textContent = currentLLMSettings.temperature.toFixed(1);
    }

    // Update current display
    updateCurrentDisplay();

    // Update model description
    onModelChange();
}

// Populate models dropdown based on selected provider
function populateModelsDropdown(providerId) {
    const modelSelect = document.getElementById('llm-model');
    if (!modelSelect) return;

    const provider = LLM_PROVIDERS[providerId];
    if (!provider) return;

    modelSelect.innerHTML = provider.models.map(model =>
        `<option value="${model.id}">${model.name}</option>`
    ).join('');
}

// Update current model display at top of tab
function updateCurrentDisplay() {
    const provider = LLM_PROVIDERS[currentLLMSettings.provider];
    const model = provider?.models.find(m => m.id === currentLLMSettings.model);

    const iconEl = document.getElementById('llm-current-icon');
    const modelEl = document.getElementById('llm-current-model');
    const providerEl = document.getElementById('llm-current-provider');

    if (iconEl) iconEl.textContent = provider?.icon || '🔮';
    if (modelEl) modelEl.textContent = model?.name || currentLLMSettings.model;
    if (providerEl) providerEl.textContent = provider?.name || currentLLMSettings.provider;
}

// Provider change handler
function onProviderChange() {
    const providerSelect = document.getElementById('llm-provider');
    if (!providerSelect) return;

    const newProvider = providerSelect.value;
    currentLLMSettings.provider = newProvider;

    // Populate new models and select first
    populateModelsDropdown(newProvider);

    const provider = LLM_PROVIDERS[newProvider];
    if (provider && provider.models.length > 0) {
        currentLLMSettings.model = provider.models[0].id;
        const modelSelect = document.getElementById('llm-model');
        if (modelSelect) modelSelect.value = currentLLMSettings.model;
    }

    onModelChange();
}

// Model change handler
function onModelChange() {
    const modelSelect = document.getElementById('llm-model');
    if (!modelSelect) return;

    currentLLMSettings.model = modelSelect.value;

    // Update description
    const provider = LLM_PROVIDERS[currentLLMSettings.provider];
    const model = provider?.models.find(m => m.id === currentLLMSettings.model);

    const descEl = document.getElementById('llm-model-desc');
    if (descEl) {
        descEl.textContent = model?.desc || '';
    }
}

// Temperature change handler
function onTemperatureChange() {
    const tempSlider = document.getElementById('llm-temperature');
    const tempValue = document.getElementById('llm-temp-value');

    if (tempSlider) {
        currentLLMSettings.temperature = parseFloat(tempSlider.value);
    }
    if (tempValue) {
        tempValue.textContent = currentLLMSettings.temperature.toFixed(1);
    }
}

// Save LLM settings to Firestore
async function saveLLMSettings() {
    const btn = document.getElementById('btn-save-llm');
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    try {
        const db = firebase.firestore();
        await db.collection('chatbotConfig').doc('default').set({
            llmProvider: currentLLMSettings.provider,
            llmModel: currentLLMSettings.model,
            llmTemperature: currentLLMSettings.temperature,
            llmUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            llmUpdatedBy: firebase.auth().currentUser?.uid || 'unknown'
        }, { merge: true });

        // Update display
        updateCurrentDisplay();

        btn.innerHTML = '✓ Saved!';
        console.log('[Chatbot Settings] LLM settings saved:', currentLLMSettings);

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('[Chatbot Settings] Failed to save LLM settings:', error);
        alert('❌ Error saving LLM settings: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ============================================
// PAGE CONTEXT MANAGEMENT
// ============================================

let currentPageContextId = null;
let currentPageContextData = null;
let currentTips = [];

async function loadPageContextList() {
    const select = document.getElementById('page-context-select');
    const emptyState = document.getElementById('page-context-empty');
    const selectorContainer = document.getElementById('page-selector-container');
    const editor = document.getElementById('page-context-editor');

    if (!select) {
        console.error('[Chatbot Settings] page-context-select not found');
        return;
    }

    select.innerHTML = '<option value="">-- Select a page --</option>';

    try {
        const db = firebase.firestore();
        // Remove orderBy to avoid index requirement
        const snapshot = await db.collection('chatbotPageContext').get();

        console.log(`[Chatbot Settings] Found ${snapshot.size} page contexts`);

        if (snapshot.empty) {
            // Show empty state
            if (emptyState) emptyState.style.display = 'block';
            if (selectorContainer) selectorContainer.style.display = 'none';
            if (editor) editor.style.display = 'none';
            return;
        }

        // Hide empty state, show selector
        if (emptyState) emptyState.style.display = 'none';
        if (selectorContainer) selectorContainer.style.display = 'block';

        // Sort by order field in memory
        const docs = [];
        snapshot.forEach(doc => {
            docs.push({ id: doc.id, data: doc.data() });
        });
        docs.sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

        docs.forEach(({ id, data }) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${data.name?.en || id} (${data.isActive !== false ? '✅' : '❌'})`;
            select.appendChild(option);
        });

        console.log(`[Chatbot Settings] Loaded ${docs.length} page contexts`);
    } catch (error) {
        console.error('[Chatbot Settings] Failed to load page contexts:', error);
        alert('Error loading page contexts: ' + error.message);
    }
}

// Seed default page context data
async function seedPageContextData() {
    if (!confirm('This will create default page contexts. Existing data will NOT be overwritten. Continue?')) {
        return;
    }

    const PAGE_CONTEXTS = [
        {
            pageId: 'command-center',
            name: { en: 'Command Center', ko: '커맨드 센터' },
            description: {
                en: 'Your main dashboard to manage all projects.',
                ko: '모든 프로젝트를 관리하는 메인 대시보드입니다.'
            },
            tips: [
                { en: 'Click "Add Project" to create a new project', ko: '"프로젝트 추가" 버튼을 클릭하여 새 프로젝트를 만드세요' },
                { en: 'Click on a project card to open Mission Control', ko: '프로젝트 카드를 클릭하면 Mission Control로 이동합니다' }
            ],
            order: 1, isActive: true
        },
        {
            pageId: 'project-detail',
            name: { en: 'Mission Control', ko: '미션 컨트롤' },
            description: {
                en: 'The central command hub for your project.',
                ko: '프로젝트의 중앙 제어 허브입니다.'
            },
            tips: [
                { en: 'Agent Team cards show live status and actions', ko: 'Agent Team 카드에서 실시간 상태와 액션을 볼 수 있습니다' }
            ],
            order: 2, isActive: true
        },
        {
            pageId: 'brand-brain',
            name: { en: 'Brand Brain', ko: '브랜드 브레인' },
            description: {
                en: 'Configure your brand identity, voice, and strategy.',
                ko: '브랜드 아이덴티티, 보이스, 전략을 설정합니다.'
            },
            tips: [
                { en: 'Fill in Core Identity with your brand basics', ko: 'Core Identity에 브랜드 기본 정보를 입력하세요' },
                { en: 'Click "Sync with Hive Mind" to push to agents', ko: '"Sync with Hive Mind"를 클릭하면 에이전트에 전파됩니다' }
            ],
            order: 3, isActive: true
        },
        {
            pageId: 'knowledge-hub',
            name: { en: 'Knowledge Hub', ko: '지식 허브' },
            description: { en: 'Store and manage brand knowledge.', ko: '브랜드 지식을 저장하고 관리합니다.' },
            tips: [{ en: 'Upload documents for AI to reference', ko: 'AI가 참조할 문서를 업로드하세요' }],
            order: 4, isActive: true
        },
        {
            pageId: 'market-pulse',
            name: { en: 'Market Pulse', ko: '마켓 펄스' },
            description: { en: 'Monitor market trends and competitor activity.', ko: '시장 트렌드와 경쟁사 활동을 모니터링합니다.' },
            tips: [{ en: 'View trending topics in your industry', ko: '업계의 트렌딩 토픽을 확인하세요' }],
            order: 5, isActive: true
        },
        {
            pageId: 'strategy-war-room',
            name: { en: 'Strategy War Room', ko: '전략 상황실' },
            description: { en: 'Plan and execute marketing campaigns.', ko: '마케팅 캠페인을 계획하고 실행합니다.' },
            tips: [{ en: 'Create campaign objectives and KPIs', ko: '캠페인 목표와 KPI를 설정하세요' }],
            order: 6, isActive: true
        },
        {
            pageId: 'the-filter',
            name: { en: 'The Filter', ko: '더 필터' },
            description: { en: 'Review and approve AI-generated content.', ko: 'AI가 생성한 콘텐츠를 검토하고 승인합니다.' },
            tips: [{ en: 'Review pending content in the queue', ko: '대기 중인 콘텐츠를 검토하세요' }],
            order: 7, isActive: true
        },
        {
            pageId: 'the-growth',
            name: { en: 'The Growth', ko: '더 그로스' },
            description: { en: 'Track your social media growth metrics.', ko: '소셜 미디어 성장 지표를 추적합니다.' },
            tips: [{ en: 'View follower growth trends', ko: '팔로워 성장 추이를 확인하세요' }],
            order: 8, isActive: true
        },
        {
            pageId: 'studio',
            name: { en: 'Hive Mind Studio', ko: '하이브 마인드 스튜디오' },
            description: { en: 'Create content with AI agent workflows.', ko: 'AI 에이전트 워크플로우로 콘텐츠를 생성합니다.' },
            tips: [{ en: 'Select a workflow template to start', ko: '워크플로우 템플릿을 선택하여 시작하세요' }],
            order: 9, isActive: true
        }
    ];

    try {
        const db = firebase.firestore();
        const batch = db.batch();
        let created = 0;

        for (const ctx of PAGE_CONTEXTS) {
            const ref = db.collection('chatbotPageContext').doc(ctx.pageId);
            const existing = await ref.get();

            if (!existing.exists) {
                batch.set(ref, {
                    ...ctx,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                created++;
            }
        }

        await batch.commit();
        alert(`✅ Seeded ${created} page contexts! (${PAGE_CONTEXTS.length - created} already existed)`);
        loadPageContextList();
    } catch (error) {
        console.error('[Chatbot Settings] Seed error:', error);
        alert('❌ Error seeding data: ' + error.message);
    }
}

async function loadPageContext(pageId) {
    if (!pageId) {
        document.getElementById('page-context-editor').style.display = 'none';
        return;
    }

    try {
        const db = firebase.firestore();
        const doc = await db.collection('chatbotPageContext').doc(pageId).get();

        if (!doc.exists) {
            alert('Page context not found');
            return;
        }

        currentPageContextId = pageId;
        currentPageContextData = doc.data();
        currentTips = currentPageContextData.tips || [];

        // Populate form
        document.getElementById('ctx-name-en').value = currentPageContextData.name?.en || '';
        document.getElementById('ctx-name-ko').value = currentPageContextData.name?.ko || '';
        document.getElementById('ctx-desc-en').value = currentPageContextData.description?.en || '';
        document.getElementById('ctx-desc-ko').value = currentPageContextData.description?.ko || '';
        document.getElementById('ctx-is-active').checked = currentPageContextData.isActive !== false;

        // Render tips
        renderTips();

        document.getElementById('page-context-editor').style.display = 'block';

    } catch (error) {
        console.error('[Chatbot Settings] Failed to load page context:', error);
        alert('Error loading page context');
    }
}

function renderTips() {
    const container = document.getElementById('tips-container');
    if (!container) return;

    container.innerHTML = '';

    currentTips.forEach((tip, index) => {
        const tipEl = document.createElement('div');
        tipEl.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;';
        tipEl.innerHTML = `
            <input type="text" class="admin-input tip-en" data-index="${index}" placeholder="Tip in English..." value="${tip.en || ''}">
            <input type="text" class="admin-input tip-ko" data-index="${index}" placeholder="팁 (한국어)..." value="${tip.ko || ''}">
            <button type="button" class="admin-btn-secondary btn-remove-tip" data-index="${index}" style="padding: 8px 12px; color: #ef4444;">🗑️</button>
        `;
        container.appendChild(tipEl);
    });

    // Add event listeners
    container.querySelectorAll('.tip-en, .tip-ko').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const lang = e.target.classList.contains('tip-en') ? 'en' : 'ko';
            if (!currentTips[idx]) currentTips[idx] = {};
            currentTips[idx][lang] = e.target.value;
        });
    });

    container.querySelectorAll('.btn-remove-tip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            currentTips.splice(idx, 1);
            renderTips();
        });
    });
}

function addTip() {
    currentTips.push({ en: '', ko: '' });
    renderTips();
}

async function savePageContext() {
    if (!currentPageContextId) return;

    const data = {
        name: {
            en: document.getElementById('ctx-name-en').value,
            ko: document.getElementById('ctx-name-ko').value
        },
        description: {
            en: document.getElementById('ctx-desc-en').value,
            ko: document.getElementById('ctx-desc-ko').value
        },
        tips: currentTips.filter(t => t.en || t.ko),
        isActive: document.getElementById('ctx-is-active').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const db = firebase.firestore();
        await db.collection('chatbotPageContext').doc(currentPageContextId).update(data);

        alert('✅ Page context saved!');
        loadPageContextList();
    } catch (error) {
        console.error('[Chatbot Settings] Failed to save page context:', error);
        alert('❌ Error saving page context');
    }
}

// ============================================
// VOICE SETTINGS
// ============================================

async function loadVoiceSettings() {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('chatbotConfig').doc('default').get();

        if (doc.exists) {
            const config = doc.data();
            const voiceInput = document.getElementById('voice-input-enabled');
            const voiceOutput = document.getElementById('voice-output-enabled');

            if (voiceInput) voiceInput.checked = config.voiceInputEnabled || false;
            if (voiceOutput) voiceOutput.checked = config.voiceOutputEnabled || false;
        }
    } catch (error) {
        console.error('[Chatbot Settings] Failed to load voice settings:', error);
    }
}

async function saveVoiceSettings() {
    try {
        const db = firebase.firestore();
        await db.collection('chatbotConfig').doc('default').update({
            voiceEnabled: true,
            voiceInputEnabled: document.getElementById('voice-input-enabled').checked,
            voiceOutputEnabled: document.getElementById('voice-output-enabled').checked,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('✅ Voice settings saved!');
    } catch (error) {
        console.error('[Chatbot Settings] Failed to save voice settings:', error);
        alert('❌ Error saving voice settings');
    }
}

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
window.openFaqModal = function (faqId = null) {
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
};

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
