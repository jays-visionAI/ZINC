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
        { id: 'agent-manager-temp', label: 'label-manager-temp' }
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
            if (data.research) {
                document.getElementById('agent-research-model').value = data.research.model || 'deepseek-chat';
                document.getElementById('agent-research-temp').value = data.research.temperature || 0.7;
                document.getElementById('label-research-temp').textContent = data.research.temperature || 0.7;
                document.getElementById('agent-research-prompt').value = data.research.systemPrompt || '';
            }
            if (data.seo) {
                document.getElementById('agent-seo-model').value = data.seo.model || 'gpt-4o-mini';
                document.getElementById('agent-seo-temp').value = data.seo.temperature || 0.3;
                document.getElementById('label-seo-temp').textContent = data.seo.temperature || 0.3;
                document.getElementById('agent-seo-prompt').value = data.seo.systemPrompt || '';
            }
        }
    } catch (e) { console.error('Error loading market pulse:', e); }

    // Step 2: Brand Brain
    try {
        const doc = await db.collection('chatbotConfig').doc('pipeline_brand_brain').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.planner) {
                document.getElementById('agent-planner-model').value = data.planner.model || 'gpt-4o';
                document.getElementById('agent-planner-temp').value = data.planner.temperature || 0.5;
                document.getElementById('label-planner-temp').textContent = data.planner.temperature || 0.5;
                document.getElementById('agent-planner-prompt').value = data.planner.systemPrompt || '';
            }
        }
    } catch (e) { console.error('Error loading brand brain:', e); }

    // Step 3: Knowledge Hub
    try {
        const doc = await db.collection('chatbotConfig').doc('pipeline_knowledge_hub').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.standard) {
                document.getElementById('agent-standard-model').value = data.standard.model || 'gpt-4o';
                document.getElementById('agent-standard-temp').value = data.standard.temperature || 0.2;
                document.getElementById('label-standard-temp').textContent = data.standard.temperature || 0.2;
                document.getElementById('agent-standard-prompt').value = data.standard.systemPrompt || '';
            }
            if (data.depth) {
                document.getElementById('agent-depth-model').value = data.depth.model || 'deepseek-reasoner';
                document.getElementById('agent-depth-temp').value = data.depth.temperature || 0.3;
                document.getElementById('label-depth-temp').textContent = data.depth.temperature || 0.3;
                document.getElementById('agent-depth-prompt').value = data.depth.systemPrompt || '';
            }
            if (data.insights) {
                document.getElementById('agent-insights-model').value = data.insights.model || 'deepseek-reasoner';
                document.getElementById('agent-insights-temp').value = data.insights.temperature || 0.3;
                document.getElementById('label-insights-temp').textContent = data.insights.temperature || 0.3;
                document.getElementById('agent-insights-prompt').value = data.insights.systemPrompt || '';
            }
            if (data.strategy) {
                document.getElementById('agent-strategy-model').value = data.strategy.model || 'gpt-4o';
                document.getElementById('agent-strategy-temp').value = data.strategy.temperature || 0.6;
                document.getElementById('label-strategy-temp').textContent = data.strategy.temperature || 0.6;
                document.getElementById('agent-strategy-prompt').value = data.strategy.systemPrompt || '';
            }
            if (data.quick) {
                document.getElementById('agent-quick-model').value = data.quick.model || 'gpt-4o-mini';
                document.getElementById('agent-quick-temp').value = data.quick.temperature || 0.9;
                document.getElementById('label-quick-temp').textContent = data.quick.temperature || 0.9;
                document.getElementById('agent-quick-prompt').value = data.quick.systemPrompt || '';
            }
            if (data.studio_docs) {
                document.getElementById('agent-studio-docs-model').value = data.studio_docs.model || 'claude-3-5-sonnet-20241022';
                document.getElementById('agent-studio-docs-temp').value = data.studio_docs.temperature || 0.4;
                document.getElementById('label-studio-docs-temp').textContent = data.studio_docs.temperature || 0.4;
                document.getElementById('agent-studio-docs-prompt').value = data.studio_docs.systemPrompt || '';
            }
            if (data.studio_visual) {
                document.getElementById('agent-studio-visual-model').value = data.studio_visual.model || 'gpt-4o-mini';
                document.getElementById('agent-studio-visual-temp').value = data.studio_visual.temperature || 0.7;
                document.getElementById('label-studio-visual-temp').textContent = data.studio_visual.temperature || 0.7;
                document.getElementById('agent-studio-visual-prompt').value = data.studio_visual.systemPrompt || '';
            }
        }
    } catch (e) { console.error('Error loading knowledge hub:', e); }

    // Step 4: Studio
    try {
        const doc = await db.collection('chatbotConfig').doc('pipeline_studio').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.creator) {
                document.getElementById('agent-creator-model').value = data.creator.model || 'gpt-4o';
                document.getElementById('agent-creator-temp').value = data.creator.temperature || 0.7;
                document.getElementById('label-creator-temp').textContent = data.creator.temperature || 0.7;
                document.getElementById('agent-creator-prompt').value = data.creator.systemPrompt || '';
            }
            if (data.text) {
                document.getElementById('agent-text-model').value = data.text.model || 'gpt-4o';
                document.getElementById('agent-text-temp').value = data.text.temperature || 0.8;
                document.getElementById('label-text-temp').textContent = data.text.temperature || 0.8;
                document.getElementById('agent-text-prompt').value = data.text.systemPrompt || '';
            }
        }
    } catch (e) { console.error('Error loading studio:', e); }

    // Step 5: Growth
    try {
        const doc = await db.collection('chatbotConfig').doc('pipeline_growth').get();
        if (doc.exists) {
            const data = doc.data();
            if (data.manager) {
                document.getElementById('agent-manager-model').value = data.manager.model || 'gpt-4o';
                document.getElementById('agent-manager-temp').value = data.manager.temperature || 0.2;
                document.getElementById('label-manager-temp').textContent = data.manager.temperature || 0.2;
                document.getElementById('agent-manager-prompt').value = data.manager.systemPrompt || '';
            }
        }
    } catch (e) { console.error('Error loading growth:', e); }
}

function setupSaveListeners() {
    // 1. Market
    document.getElementById('save-market-settings')?.addEventListener('click', async () => {
        const btn = document.getElementById('save-market-settings');
        btn.disabled = true;
        try {
            const settings = {
                research: {
                    model: document.getElementById('agent-research-model').value,
                    temperature: parseFloat(document.getElementById('agent-research-temp').value),
                    systemPrompt: document.getElementById('agent-research-prompt').value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                seo: {
                    model: document.getElementById('agent-seo-model').value,
                    temperature: parseFloat(document.getElementById('agent-seo-temp').value),
                    systemPrompt: document.getElementById('agent-seo-prompt').value,
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
                    model: document.getElementById('agent-planner-model').value,
                    temperature: parseFloat(document.getElementById('agent-planner-temp').value),
                    systemPrompt: document.getElementById('agent-planner-prompt').value,
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
                    model: document.getElementById('agent-standard-model').value,
                    temperature: parseFloat(document.getElementById('agent-standard-temp').value),
                    systemPrompt: document.getElementById('agent-standard-prompt').value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                depth: {
                    model: document.getElementById('agent-depth-model').value,
                    temperature: parseFloat(document.getElementById('agent-depth-temp').value),
                    systemPrompt: document.getElementById('agent-depth-prompt').value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                insights: {
                    model: document.getElementById('agent-insights-model').value,
                    temperature: parseFloat(document.getElementById('agent-insights-temp').value),
                    systemPrompt: document.getElementById('agent-insights-prompt').value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                strategy: {
                    model: document.getElementById('agent-strategy-model').value,
                    temperature: parseFloat(document.getElementById('agent-strategy-temp').value),
                    systemPrompt: document.getElementById('agent-strategy-prompt').value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                quick: {
                    model: document.getElementById('agent-quick-model').value,
                    temperature: parseFloat(document.getElementById('agent-quick-temp').value),
                    systemPrompt: document.getElementById('agent-quick-prompt').value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                studio_docs: {
                    model: document.getElementById('agent-studio-docs-model').value,
                    temperature: parseFloat(document.getElementById('agent-studio-docs-temp').value),
                    systemPrompt: document.getElementById('agent-studio-docs-prompt').value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                studio_visual: {
                    model: document.getElementById('agent-studio-visual-model').value,
                    temperature: parseFloat(document.getElementById('agent-studio-visual-temp').value),
                    systemPrompt: document.getElementById('agent-studio-visual-prompt').value,
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
                    model: document.getElementById('agent-creator-model').value,
                    temperature: parseFloat(document.getElementById('agent-creator-temp').value),
                    systemPrompt: document.getElementById('agent-creator-prompt').value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                text: {
                    model: document.getElementById('agent-text-model').value,
                    temperature: parseFloat(document.getElementById('agent-text-temp').value),
                    systemPrompt: document.getElementById('agent-text-prompt').value,
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
                    model: document.getElementById('agent-manager-model').value,
                    temperature: parseFloat(document.getElementById('agent-manager-temp').value),
                    systemPrompt: document.getElementById('agent-manager-prompt').value,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            };
            await db.collection('chatbotConfig').doc('pipeline_growth').set(settings, { merge: true });
            notify('Growth Settings saved!', 'success');
        } catch (e) { notify(e.message, 'error'); } finally { btn.disabled = false; }
    });
}
