// admin-pipeline.js - Unified 5-Step Pipeline Management

window.initPipelineMarket = (user) => initPipeline(user, 'market');
window.initPipelineBrand = (user) => initPipeline(user, 'brand');
window.initPipelineKnowledge = (user) => initPipeline(user, 'knowledge');
window.initPipelineStudio = (user) => initPipeline(user, 'studio');
window.initPipelineGrowth = (user) => initPipeline(user, 'growth');

async function initPipeline(currentUser, initialTab = 'market') {
    console.log(`[Pipeline] Initializing with tab: ${initialTab}`);

    // 1. Tab Switching Logic
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    function setActiveTab(tabId) {
        tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
        tabContents.forEach(content => content.classList.toggle('active', content.id === `tab-${tabId}`));
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });

    // Set initial tab
    setActiveTab(initialTab);

    // 2. Slider Labels Logic
    const sliderConfigs = [
        { id: 'agent-research-temp', label: 'label-research-temp' },
        { id: 'agent-seo-temp', label: 'label-seo-temp' },
        { id: 'agent-planner-temp', label: 'label-planner-temp' },
        { id: 'agent-standard-temp', label: 'label-standard-temp' },
        { id: 'agent-depth-temp', label: 'label-depth-temp' },
        { id: 'agent-insights-temp', label: 'label-insights-temp' },
        { id: 'agent-strategy-temp', label: 'label-strategy-temp' },
        { id: 'agent-quick-temp', label: 'label-quick-temp' },
        { id: 'agent-studio-docs-temp', label: 'label-studio-docs-temp' },
        { id: 'agent-studio-visual-temp', label: 'label-studio-visual-temp' },
        { id: 'agent-creator-temp', label: 'label-creator-temp' },
        { id: 'agent-text-temp', label: 'label-text-temp' },
        { id: 'agent-manager-temp', label: 'label-manager-temp' },
        { id: 'agent-reasoner-temp', label: 'label-reasoner-temp' },
        { id: 'agent-orchestrator-temp', label: 'label-orchestrator-temp' }
    ];

    sliderConfigs.forEach(s => {
        const slider = document.getElementById(s.id);
        const label = document.getElementById(s.label);
        if (slider && label) {
            slider.addEventListener('input', () => { label.textContent = slider.value; });
        }
    });

    // 3. Save Event Listeners (Attach immediately so UI is responsive)
    console.log('[Pipeline] Attaching save listeners...');
    setupSaveListeners();

    // 4. Load all data (Async, doesn't block UI listeners)
    console.log('[Pipeline] Starting async settings load...');
    loadAllSettings().then(() => {
        console.log('[Pipeline] All settings loaded successfully');
    }).catch(err => {
        console.error('[Pipeline] Error in loadAllSettings:', err);
    });
}

function notify(msg, type = 'success') {
    if (window.showNotification) {
        window.showNotification(msg, type);
    } else {
        console.log(`[Notification] ${type.toUpperCase()}: ${msg}`);
        alert(msg);
    }
}

async function loadAllSettings() {
    console.log('[Pipeline] Loading all settings from Firestore (via chatbotConfig)...');

    // Step 1: Market Pulse
    try {
        const doc = await db.collection('chatbotConfig').doc('pipeline_market_pulse').get();
        if (doc.exists) {
            const data = doc.data();
            updateElValue('agent-research-model', data.research?.model || 'deepseek-chat');
            updateElValue('agent-research-temp', data.research?.temperature || 0.7);
            updateElText('label-research-temp', data.research?.temperature || 0.7);
            updateElValue('agent-research-prompt', data.research?.systemPrompt || '');

            updateElValue('agent-seo-model', data.seo?.model || 'gpt-4o-mini');
            updateElValue('agent-seo-temp', data.seo?.temperature || 0.3);
            updateElText('label-seo-temp', data.seo?.temperature || 0.3);
            updateElValue('agent-seo-prompt', data.seo?.systemPrompt || '');
        }
    } catch (e) { console.error('Error loading market pulse:', e); }

    // Step 2: Brand Brain
    try {
        const doc = await db.collection('chatbotConfig').doc('pipeline_brand_brain').get();
        if (doc.exists) {
            const data = doc.data();
            updateElValue('agent-planner-model', data.planner?.model || 'gpt-4o');
            updateElValue('agent-planner-temp', data.planner?.temperature || 0.5);
            updateElText('label-planner-temp', data.planner?.temperature || 0.5);
            updateElValue('agent-planner-prompt', data.planner?.systemPrompt || '');
        }
    } catch (e) { console.error('Error loading brand brain:', e); }

    // Step 3: Knowledge Hub
    try {
        const doc = await db.collection('chatbotConfig').doc('pipeline_knowledge_hub').get();
        if (doc.exists) {
            const data = doc.data();
            updateElValue('agent-standard-model', data.standard?.model || 'gpt-4o');
            updateElValue('agent-standard-temp', data.standard?.temperature || 0.2);
            updateElText('label-standard-temp', data.standard?.temperature || 0.2);
            updateElValue('agent-standard-prompt', data.standard?.systemPrompt || '');

            updateElValue('agent-depth-model', data.depth?.model || 'deepseek-reasoner');
            updateElValue('agent-depth-temp', data.depth?.temperature || 0.3);
            updateElText('label-depth-temp', data.depth?.temperature || 0.3);
            updateElValue('agent-depth-prompt', data.depth?.systemPrompt || '');

            updateElValue('agent-insights-model', data.insights?.model || 'deepseek-reasoner');
            updateElValue('agent-insights-temp', data.insights?.temperature || 0.3);
            updateElText('label-insights-temp', data.insights?.temperature || 0.3);
            updateElValue('agent-insights-prompt', data.insights?.systemPrompt || '');

            updateElValue('agent-strategy-model', data.strategy?.model || 'gpt-4o');
            updateElValue('agent-strategy-temp', data.strategy?.temperature || 0.6);
            updateElText('label-strategy-temp', data.strategy?.temperature || 0.6);
            updateElValue('agent-strategy-prompt', data.strategy?.systemPrompt || '');

            updateElValue('agent-quick-model', data.quick?.model || 'gpt-4o-mini');
            updateElValue('agent-quick-temp', data.quick?.temperature || 0.9);
            updateElText('label-quick-temp', data.quick?.temperature || 0.9);
            updateElValue('agent-quick-prompt', data.quick?.systemPrompt || '');

            updateElValue('agent-studio-docs-model', data.studio_docs?.model || 'claude-3-5-sonnet-20241022');
            updateElValue('agent-studio-docs-temp', data.studio_docs?.temperature || 0.4);
            updateElText('label-studio-docs-temp', data.studio_docs?.temperature || 0.4);
            updateElValue('agent-studio-docs-prompt', data.studio_docs?.systemPrompt || '');

            updateElValue('agent-studio-visual-model', data.studio_visual?.model || 'gpt-4o-mini');
            updateElValue('agent-studio-visual-temp', data.studio_visual?.temperature || 0.7);
            updateElText('label-studio-visual-temp', data.studio_visual?.temperature || 0.7);
            updateElValue('agent-studio-visual-prompt', data.studio_visual?.systemPrompt || '');
        }
    } catch (e) { console.error('Error loading knowledge hub:', e); }

    // Step 4: Studio
    try {
        const doc = await db.collection('chatbotConfig').doc('pipeline_studio').get();
        if (doc.exists) {
            const data = doc.data();
            updateElValue('agent-creator-model', data.creator?.model || 'gpt-4o');
            updateElValue('agent-creator-temp', data.creator?.temperature || 0.7);
            updateElText('label-creator-temp', data.creator?.temperature || 0.7);
            updateElValue('agent-creator-prompt', data.creator?.systemPrompt || '');

            updateElValue('agent-text-model', data.text?.model || 'gpt-4o');
            updateElValue('agent-text-temp', data.text?.temperature || 0.8);
            updateElText('label-text-temp', data.text?.temperature || 0.8);
            updateElValue('agent-text-prompt', data.text?.systemPrompt || '');

            updateElValue('agent-orchestrator-model', data.orchestrator?.model || 'gpt-4o');
            updateElValue('agent-orchestrator-temp', data.orchestrator?.temperature || 0.5);
            updateElText('label-orchestrator-temp', data.orchestrator?.temperature || 0.5);
            updateElValue('agent-orchestrator-prompt', data.orchestrator?.systemPrompt || '');

            const complexityEl = document.getElementById('orchestrator-complexity-routing');
            if (complexityEl) complexityEl.checked = data.orchestrator?.enableComplexityRouting !== false;

            const brandSyncEl = document.getElementById('orchestrator-brand-sync');
            if (brandSyncEl) brandSyncEl.checked = data.orchestrator?.autoSyncBrand !== false;
        }
    } catch (e) { console.error('Error loading studio:', e); }

    // Step 5: Growth
    try {
        const doc = await db.collection('chatbotConfig').doc('pipeline_growth').get();
        if (doc.exists) {
            const data = doc.data();
            updateElValue('agent-manager-model', data.manager?.model || 'gpt-4o');
            updateElValue('agent-manager-temp', data.manager?.temperature || 0.2);
            updateElText('label-manager-temp', data.manager?.temperature || 0.2);
            updateElValue('agent-manager-prompt', data.manager?.systemPrompt || '');

            updateElValue('agent-reasoner-model', data.reasoner?.model || 'deepseek-reasoner');
            updateElValue('agent-reasoner-temp', data.reasoner?.temperature || 0.1);
            updateElText('label-reasoner-temp', data.reasoner?.temperature || 0.1);
            updateElValue('agent-reasoner-prompt', data.reasoner?.systemPrompt || '');
        }
    } catch (e) { console.error('Error loading growth:', e); }
}

// 🛡️ Safety helpers to prevent TypeError when navigating
function updateElValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}
function updateElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setupSaveListeners() {
    // 1. Market
    document.getElementById('save-market-settings')?.addEventListener('click', async () => {
        const btn = document.getElementById('save-market-settings');
        btn.disabled = true;
        try {
            const settings = {
                research: {
                    model: document.getElementById('agent-research-model')?.value || 'gpt-4o',
                    temperature: parseFloat(document.getElementById('agent-research-temp')?.value || 0.7),
                    systemPrompt: document.getElementById('agent-research-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                seo: {
                    model: document.getElementById('agent-seo-model')?.value || 'gpt-4o-mini',
                    temperature: parseFloat(document.getElementById('agent-seo-temp')?.value || 0.3),
                    systemPrompt: document.getElementById('agent-seo-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            };
            await db.collection('chatbotConfig').doc('pipeline_market_pulse').set(settings, { merge: true });
            notify('Market Pulse Settings saved!', 'success');
        } catch (e) { notify(e.message, 'error'); } finally { btn.disabled = false; }
    });

    // 2. Brand
    document.getElementById('save-brand-settings')?.addEventListener('click', async () => {
        const btn = document.getElementById('save-brand-settings');
        btn.disabled = true;
        try {
            const settings = {
                planner: {
                    model: document.getElementById('agent-planner-model')?.value || 'gpt-4o',
                    temperature: parseFloat(document.getElementById('agent-planner-temp')?.value || 0.5),
                    systemPrompt: document.getElementById('agent-planner-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            };
            await db.collection('chatbotConfig').doc('pipeline_brand_brain').set(settings, { merge: true });
            notify('Brand Brain Settings saved!', 'success');
        } catch (e) { notify(e.message, 'error'); } finally { btn.disabled = false; }
    });

    // 3. Knowledge
    document.getElementById('save-knowledge-settings')?.addEventListener('click', async () => {
        const btn = document.getElementById('save-knowledge-settings');
        btn.disabled = true;
        try {
            const settings = {
                standard: {
                    model: document.getElementById('agent-standard-model')?.value || 'gpt-4o',
                    temperature: parseFloat(document.getElementById('agent-standard-temp')?.value || 0.2),
                    systemPrompt: document.getElementById('agent-standard-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                depth: {
                    model: document.getElementById('agent-depth-model')?.value || 'deepseek-reasoner',
                    temperature: parseFloat(document.getElementById('agent-depth-temp')?.value || 0.3),
                    systemPrompt: document.getElementById('agent-depth-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                insights: {
                    model: document.getElementById('agent-insights-model')?.value || 'deepseek-reasoner',
                    temperature: parseFloat(document.getElementById('agent-insights-temp')?.value || 0.3),
                    systemPrompt: document.getElementById('agent-insights-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                strategy: {
                    model: document.getElementById('agent-strategy-model')?.value || 'gpt-4o',
                    temperature: parseFloat(document.getElementById('agent-strategy-temp')?.value || 0.6),
                    systemPrompt: document.getElementById('agent-strategy-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                quick: {
                    model: document.getElementById('agent-quick-model')?.value || 'gpt-4o-mini',
                    temperature: parseFloat(document.getElementById('agent-quick-temp')?.value || 0.9),
                    systemPrompt: document.getElementById('agent-quick-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                studio_docs: {
                    model: document.getElementById('agent-studio-docs-model')?.value || 'claude-3-5-sonnet-20241022',
                    temperature: parseFloat(document.getElementById('agent-studio-docs-temp')?.value || 0.4),
                    systemPrompt: document.getElementById('agent-studio-docs-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                studio_visual: {
                    model: document.getElementById('agent-studio-visual-model')?.value || 'gpt-4o-mini',
                    temperature: parseFloat(document.getElementById('agent-studio-visual-temp')?.value || 0.7),
                    systemPrompt: document.getElementById('agent-studio-visual-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            };
            await db.collection('chatbotConfig').doc('pipeline_knowledge_hub').set(settings, { merge: true });
            notify('Knowledge Hub Settings saved!', 'success');
        } catch (e) { notify(e.message, 'error'); } finally { btn.disabled = false; }
    });

    // 4. Studio
    document.getElementById('save-studio-settings')?.addEventListener('click', async () => {
        const btn = document.getElementById('save-studio-settings');
        btn.disabled = true;
        try {
            const settings = {
                creator: {
                    model: document.getElementById('agent-creator-model')?.value || 'gpt-4o',
                    temperature: parseFloat(document.getElementById('agent-creator-temp')?.value || 0.7),
                    systemPrompt: document.getElementById('agent-creator-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                text: {
                    model: document.getElementById('agent-text-model')?.value || 'gpt-4o',
                    temperature: parseFloat(document.getElementById('agent-text-temp')?.value || 0.8),
                    systemPrompt: document.getElementById('agent-text-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                orchestrator: {
                    model: document.getElementById('agent-orchestrator-model')?.value || 'gpt-4o',
                    temperature: parseFloat(document.getElementById('agent-orchestrator-temp')?.value || 0.5),
                    systemPrompt: document.getElementById('agent-orchestrator-prompt')?.value || '',
                    enableComplexityRouting: document.getElementById('orchestrator-complexity-routing')?.checked !== false,
                    autoSyncBrand: document.getElementById('orchestrator-brand-sync')?.checked !== false,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            };
            await db.collection('chatbotConfig').doc('pipeline_studio').set(settings, { merge: true });
            notify('Studio Settings saved!', 'success');
        } catch (e) { notify(e.message, 'error'); } finally { btn.disabled = false; }
    });

    // 5. Growth
    document.getElementById('save-growth-settings')?.addEventListener('click', async () => {
        const btn = document.getElementById('save-growth-settings');
        btn.disabled = true;
        try {
            const settings = {
                manager: {
                    model: document.getElementById('agent-manager-model')?.value || 'gpt-4o',
                    temperature: parseFloat(document.getElementById('agent-manager-temp')?.value || 0.2),
                    systemPrompt: document.getElementById('agent-manager-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                reasoner: {
                    model: document.getElementById('agent-reasoner-model')?.value || 'deepseek-reasoner',
                    temperature: parseFloat(document.getElementById('agent-reasoner-temp')?.value || 0.1),
                    systemPrompt: document.getElementById('agent-reasoner-prompt')?.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            };
            await db.collection('chatbotConfig').doc('pipeline_growth').set(settings, { merge: true });
            notify('Growth Pipeline Settings saved!', 'success');
        } catch (e) { notify(e.message, 'error'); } finally { btn.disabled = false; }
    });
}
