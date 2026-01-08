// admin-pipeline.js - Unified 5-Step Pipeline Management

let pipelineGlobalProjectId = null;

// ============================================
// Workflow List Management (exposed to window for WorkflowCanvas)
// ============================================
window.refreshPipelineWorkflows = async function (context) {
    console.log('[Pipeline] 🔄 refreshPipelineWorkflows called for:', context);
    await loadPipelineWorkflows(context);
};

async function loadPipelineWorkflows(context) {
    console.log('[Pipeline] loadPipelineWorkflows called for context:', context);
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error('[Pipeline] Firebase not ready');
        return;
    }

    const db = firebase.firestore();
    try {
        console.log('[Pipeline] Querying workflowDefinitions where pipelineContext ==', context);
        const snapshot = await db.collection('workflowDefinitions')
            .where('pipelineContext', '==', context)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const workflows = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('[Pipeline] Found', workflows.length, 'workflows for context:', context);
        renderWorkflowCards(context, workflows);
    } catch (err) {
        console.error(`[Pipeline] Refresh failed for ${context}:`, err);
        // Fallback without orderBy if index missing
        if (err.code === 'failed-precondition') {
            console.warn('[Pipeline] Trying fallback without orderBy...');
            try {
                const snapshot = await db.collection('workflowDefinitions')
                    .where('pipelineContext', '==', context)
                    .limit(20)
                    .get();
                const workflows = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log('[Pipeline] Fallback found', workflows.length, 'workflows');
                renderWorkflowCards(context, workflows);
            } catch (fallbackErr) {
                console.error('[Pipeline] Fallback also failed:', fallbackErr);
            }
        }
    }
}

async function loadAllPipelineWorkflows() {
    const contexts = ['market', 'brand', 'knowledge', 'studio', 'growth'];

    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.log('[Pipeline] Waiting for Firebase...');
        setTimeout(loadAllPipelineWorkflows, 500);
        return;
    }

    for (const context of contexts) {
        await loadPipelineWorkflows(context);
    }

    // Initialize Category Filters
    setupCategoryFilters();
}

function setupCategoryFilters() {
    document.querySelectorAll('.workflow-category-filter .filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const filterContainer = chip.parentElement;
            const context = filterContainer.dataset.context;
            const category = chip.dataset.category;

            // Update active state
            filterContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // Apply filter to cards
            filterWorkflowsByCategory(context, category);
        });
    });
}

function filterWorkflowsByCategory(context, category) {
    const container = document.getElementById(`workflow-cards-${context}`);
    if (!container) return;

    const cards = container.querySelectorAll('.workflow-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const cardCategory = card.dataset.category || '기타';
        if (category === '모두' || cardCategory === category) {
            card.style.display = 'flex';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Update count display for the filtered view if needed, or handled by visibility
}

// Unified Seeding Function for UI
window.seedProWorkflows = async function () {
    try {
        if (typeof seedProWorkflowsSet === 'function') await seedProWorkflowsSet();
        if (typeof seedKnowledgeWorkflow === 'function') await seedKnowledgeWorkflow();
        if (typeof seedOnePagerWorkflow === 'function') await seedOnePagerWorkflow();

        showNotification('Professional workflows have been seeded successfully!', 'success');

        // Refresh all lists
        const contexts = ['market', 'brand', 'knowledge', 'studio', 'growth'];
        for (const context of contexts) {
            await loadPipelineWorkflows(context);
        }
    } catch (err) {
        console.error('Seeding failed:', err);
        showNotification('Failed to seed workflows: ' + err.message, 'error');
    }
};

function renderWorkflowCards(context, workflows) {
    const container = document.getElementById(`workflow-cards-${context}`);
    const countEl = document.getElementById(`workflow-count-${context}`);

    if (!container) {
        console.warn(`[Pipeline] Container not found for context: ${context}`);
        return;
    }

    if (countEl) countEl.textContent = `(${workflows.length})`;

    if (workflows.length === 0) {
        container.innerHTML = `
            <div class="workflow-empty-state">
                <span class="workflow-empty-icon">📭</span>
                <p>저장된 워크플로우가 없습니다</p>
                <span class="workflow-empty-hint">위의 버튼을 클릭하여 새 워크플로우를 생성하세요</span>
            </div>
        `;
        return;
    }

    container.innerHTML = workflows.map(wf => `
        <div class="workflow-card" data-workflow-id="${wf.id}" data-category="${wf.category || '기타'}">
            <div class="workflow-card-header">
                <div class="workflow-card-badges">
                    <span class="workflow-card-status ${wf.status || 'draft'}">${wf.status === 'active' ? 'ACTIVE' : (wf.status || 'DRAFT').toUpperCase()}</span>
                    ${wf.category ? `<span class="workflow-card-category-badge">${wf.category}</span>` : ''}
                </div>
                <div class="workflow-card-header-actions">
                    <button class="workflow-card-delete" onclick="deleteWorkflow('${wf.id}', '${wf.name || 'Untitled'}', '${context}')" title="삭제">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                    <button class="workflow-card-menu" onclick="showWorkflowMenu('${wf.id}')">⋮</button>
                </div>
            </div>
            <div class="workflow-card-title">
                <span class="workflow-card-title-icon">📋</span>
                <h5>${wf.name || 'Untitled Workflow'}</h5>
            </div>
            <div class="workflow-card-meta">
                <span class="workflow-card-time">
                    <span>🕐</span>
                    <span>${formatRelativeTime(wf.createdAt)}</span>
                </span>
            </div>
            <div class="workflow-card-temp">
                <div class="workflow-card-temp-label">
                    <span>🌡️ Temperature</span>
                    <span class="workflow-card-temp-value">${wf.temperature || 0.7}</span>
                </div>
                <div class="workflow-card-temp-bar">
                    <div class="workflow-card-temp-fill" style="width: ${(wf.temperature || 0.7) * 100}%"></div>
                </div>
            </div>
            <div class="workflow-card-stats">
                <div class="workflow-card-stat">
                    <span class="workflow-card-stat-icon">👥</span>
                    <span class="workflow-card-stat-value">${wf.agentCount || 0}</span>
                    <span class="workflow-card-stat-label">Agents</span>
                </div>
                <div class="workflow-card-stat">
                    <span class="workflow-card-stat-icon">📄</span>
                    <span class="workflow-card-stat-value">${wf.contentCount || 0}</span>
                    <span class="workflow-card-stat-label">Contents</span>
                </div>
            </div>
            <div class="workflow-card-actions">
                <button class="workflow-card-action primary ${!pipelineGlobalProjectId ? 'disabled' : ''}" onclick="runWorkflow('${wf.id}')" ${!pipelineGlobalProjectId ? 'title="테스트 프로젝트를 먼저 선택하세요"' : ''}>
                    <span>▶</span>
                    <span>실행</span>
                </button>
                <button class="workflow-card-action secondary" onclick="editWorkflow('${wf.id}', '${context}')">
                    <span>✏️</span>
                    <span>편집</span>
                </button>
            </div>
        </div>
    `).join('');
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return '방금 전';
    const now = new Date();
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
}

// Global workflow action functions
window.openWorkflowCanvas = function (context) {
    if (window.WorkflowCanvas) {
        window.WorkflowCanvas.open(context, pipelineGlobalProjectId);
    } else {
        console.error('WorkflowCanvas not loaded');
        alert('워크플로우 캔버스를 로드하는 중 오류가 발생했습니다.');
    }
};

window.runWorkflow = async function (workflowId) {
    if (!pipelineGlobalProjectId) {
        showNotification('워크플로우를 실행할 테스트 프로젝트를 먼저 선택해주세요.', 'warning');
        return;
    }

    try {
        showNotification('🚀 워크플로우 실행을 준비 중...', 'info');
        console.log('[Pipeline] Running workflow:', workflowId, 'for project:', pipelineGlobalProjectId);

        if (typeof WorkflowEngine === 'undefined') {
            throw new Error('WorkflowEngine이 로드되지 않았습니다.');
        }

        // Fetch project context first
        const db = firebase.firestore();
        const projectDoc = await db.collection('projects').doc(pipelineGlobalProjectId).get();
        if (!projectDoc.exists) throw new Error('프로젝트를 찾을 수 없습니다.');

        const projectContext = { id: projectDoc.id, ...projectDoc.data() };

        showNotification('🤖 AI 분석 에이전트 가동 중...', 'info');

        const { outputs, workflowId: executedWfId } = await WorkflowEngine.executeById(workflowId, projectContext);
        console.log('[Pipeline] Execution Results:', outputs);

        // Increment content count
        await WorkflowEngine.incrementContentCount(workflowId);

        showNotification('✨ 워크플로우 실행 성공!', 'success');

        // Refresh the cards to show updated counts
        const workflowDoc = await db.collection('workflowDefinitions').doc(workflowId).get();
        if (workflowDoc.exists) {
            const wfData = workflowDoc.data();
            refreshPipelineWorkflows(wfData.pipelineContext);
        }

        // If results contain a summary, we might want to alert or show it
        // For now, just success notification is enough as it updates DB

    } catch (err) {
        console.error('[Pipeline] Execution failed:', err);
        showNotification('❌ 실행 실패: ' + err.message, 'error');
    }
};

window.editWorkflow = function (workflowId, context) {
    console.log('Editing workflow:', workflowId, 'in context:', context);
    if (window.WorkflowCanvas) {
        window.WorkflowCanvas.open(context, pipelineGlobalProjectId, workflowId);
    } else {
        console.error('WorkflowCanvas not loaded');
        alert('워크플로우 캔버스를 로드하는 중 오류가 발생했습니다.');
    }
};

// Delete modal state
let deleteModalResolve = null;
let pendingDeleteData = null;

window.showDeleteModal = function (workflowName) {
    return new Promise((resolve) => {
        deleteModalResolve = resolve;
        const modal = document.getElementById('wf-delete-modal');
        const nameEl = document.getElementById('delete-workflow-name');
        if (modal && nameEl) {
            nameEl.textContent = workflowName;
            modal.style.display = 'flex';
        } else {
            // Fallback
            resolve(confirm(`정말로 "${workflowName}" 워크플로우를 삭제하시겠습니까?`));
        }
    });
};

window.confirmDeleteModal = function () {
    const modal = document.getElementById('wf-delete-modal');
    if (modal) modal.style.display = 'none';
    if (deleteModalResolve) {
        deleteModalResolve(true);
        deleteModalResolve = null;
    }
};

window.cancelDeleteModal = function () {
    const modal = document.getElementById('wf-delete-modal');
    if (modal) modal.style.display = 'none';
    if (deleteModalResolve) {
        deleteModalResolve(false);
        deleteModalResolve = null;
    }
};

window.deleteWorkflow = async function (workflowId, workflowName, context) {
    console.log('Delete requested for workflow:', workflowId);

    const confirmed = await window.showDeleteModal(workflowName);

    if (!confirmed) {
        console.log('Delete cancelled by user');
        return;
    }

    try {
        const db = firebase.firestore();
        await db.collection('workflowDefinitions').doc(workflowId).delete();

        console.log('[Pipeline] Workflow deleted successfully:', workflowId);

        if (window.showNotification) {
            window.showNotification('워크플로우가 삭제되었습니다.', 'success');
        } else {
            alert('워크플로우가 삭제되었습니다.');
        }

        await loadPipelineWorkflows(context);

    } catch (err) {
        console.error('[Pipeline] Failed to delete workflow:', err);
        alert('워크플로우 삭제 중 오류가 발생했습니다: ' + err.message);
    }
};

window.duplicateWorkflow = function (workflowId) {
    console.log('Duplicating workflow:', workflowId);
    alert('워크플로우 복제 기능은 곧 제공될 예정입니다.');
};

window.showWorkflowMenu = function (workflowId) {
    console.log('Show menu for:', workflowId);
};

window.viewAllWorkflows = function (context) {
    console.log('View all workflows for:', context);
    alert('전체 워크플로우 목록은 곧 제공될 예정입니다.');
};

// Listen for workflow saved events
window.addEventListener('workflowSaved', (e) => {
    const { context } = e.detail;
    console.log('[Pipeline] ✅ workflowSaved event received! Refreshing context:', context);
    loadPipelineWorkflows(context);
});

// ============================================
// Pipeline Initialization
// ============================================
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

    // 1b. Load Projects for Global Context
    loadPipelineProjects();

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

    // 5. Load all saved workflows
    console.log('[Pipeline] Loading saved workflows...');
    loadAllPipelineWorkflows();
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

/**
 * Load project list from Firestore
 */
async function loadPipelineProjects() {
    const select = document.getElementById('pipeline-project-select');
    if (!select) return;

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('projects')
            .orderBy('updatedAt', 'desc')
            .limit(20)
            .get();

        select.innerHTML = '<option value="">Select Test Project...</option>';
        snapshot.forEach(doc => {
            const p = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = p.projectName || p.name || doc.id;
            select.appendChild(option);
        });
    } catch (e) {
        console.error('[Pipeline] Failed to load projects:', e);
    }
}

/**
 * Update global project context
 */
window.updatePipelineGlobalProject = function (projectId) {
    pipelineGlobalProjectId = projectId;
    console.log('[Pipeline] Global project context updated:', projectId);

    const badge = document.getElementById('pipeline-project-active-badge');
    const nameEl = document.getElementById('active-project-name');
    const select = document.getElementById('pipeline-project-select');

    if (projectId && projectId !== '') {
        badge.style.display = 'flex';
        const projectName = select.options[select.selectedIndex]?.text;
        nameEl.textContent = projectName || projectId;
    } else {
        badge.style.display = 'none';
        nameEl.textContent = 'No Project';
    }

    // Refresh all cards to update run button state
    loadAllPipelineWorkflows();
};
