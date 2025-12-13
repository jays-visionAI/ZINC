// admin-settings.js

// PRD 11.2 - Channel API Field Definitions (Static Schema)
const CHANNEL_API_FIELD_DEFS = {
    instagram: [
        { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "Meta Developer 대시보드에서 발급받은 Long-Lived Access Token" },
        { key: "page_id", label: "Page ID", type: "text", required: true, helperText: "Facebook Page ID connected to Instagram" }
    ],
    youtube: [
        { key: "api_key", label: "API Key", type: "password", required: true, helperText: "Google Cloud Console에서 발급받은 API Key" },
        { key: "channel_id", label: "Channel ID", type: "text", required: true, helperText: "YouTube Channel ID" }
    ],
    tiktok: [
        { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "TikTok Developer Access Token" },
        { key: "client_key", label: "Client Key", type: "text", required: true, helperText: "TikTok App Client Key" }
    ],
    linkedin: [
        { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "LinkedIn OAuth2 Access Token" },
        { key: "urn", label: "Organization URN", type: "text", required: true, helperText: "LinkedIn Organization URN (e.g., urn:li:organization:12345)" }
    ],
    x: [
        { key: "api_key", label: "API Key", type: "password", required: true, helperText: "X (Twitter) API Key" },
        { key: "api_secret", label: "API Secret", type: "password", required: true, helperText: "X (Twitter) API Secret" },
        { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "X (Twitter) Access Token" },
        { key: "access_token_secret", label: "Access Token Secret", type: "password", required: true, helperText: "X (Twitter) Access Token Secret" }
    ],
    // Default fallback for others
    default: [
        { key: "api_key", label: "API Key", type: "password", required: true, helperText: "API Key for this channel" }
    ]
};

window.initSettings = function (currentUser) {
    console.log("⚙️ Initializing Settings Page...");

    // Provider Management State
    let providers = [];
    const tableBody = document.getElementById('providers-table-body-settings');
    const modal = document.getElementById('provider-modal-settings');
    const form = document.getElementById('provider-form-settings');
    const testResultDiv = document.getElementById('connection-test-result-settings');

    // Initialize Provider Management
    async function initProviderManagement() {
        if (!window.LLMProviderService) {
            console.error("LLMProviderService not found!");
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="5" style="color: red; text-align: center;">Error: Service not loaded</td></tr>';
            }
            return;
        }

        setupProviderEventListeners();
        await loadProviders();
    }

    function setupProviderEventListeners() {
        const addBtn = document.getElementById('btn-add-provider-settings');
        const saveBtn = document.getElementById('btn-save-provider-settings');
        const testBtn = document.getElementById('btn-test-connection-settings');

        if (addBtn) addBtn.addEventListener('click', () => window.openProviderModal());
        if (saveBtn) saveBtn.addEventListener('click', saveProvider);
        if (testBtn) testBtn.addEventListener('click', testConnection);
    }

    async function loadProviders() {
        if (!tableBody) return;

        try {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading providers...</td></tr>';

            providers = await window.LLMProviderService.getProviders();
            renderProvidersTable();
        } catch (error) {
            console.error("Error loading providers:", error);
            tableBody.innerHTML = `<tr><td colspan="5" style="color: red; text-align: center;">Error: ${error.message}</td></tr>`;
        }
    }

    function renderProvidersTable() {
        if (!tableBody) return;

        if (providers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No LLM providers configured yet.</td></tr>';
            return;
        }

        // Initial render with "Checking..." status
        tableBody.innerHTML = providers.map(p => `
            <tr id="provider-row-${p.id}">
                <td><strong style="color: #16e0bd;">${p.name}</strong></td>
                <td>${capitalize(p.provider)}</td>
                <td id="provider-status-${p.id}">
                    <span style="color: #f59e0b; border: 1px solid #f59e0b; padding: 2px 8px; border-radius: 12px; font-size: 10px;">
                        ⏳ Checking...
                    </span>
                </td>
                <td style="font-size: 12px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.models?.join(', ')}">${p.models?.join(', ') || '-'}</td>
                <td>
                    <button class="admin-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="editProviderSettings('${p.id}')">Edit</button>
                </td>
            </tr>
        `).join('');

        // Test each provider's API in background
        providers.forEach(p => testProviderHealth(p));
    }

    async function testProviderHealth(provider) {
        const statusCell = document.getElementById(`provider-status-${provider.id}`);
        if (!statusCell) return;

        try {
            // Call Cloud Function to test provider connection
            // The function will use the stored API key from Firestore
            const testConnection = firebase.functions().httpsCallable('testLLMProviderConnection');
            const result = await testConnection({
                providerId: provider.id,
                providerType: provider.provider
            });

            if (result.data && result.data.success) {
                statusCell.innerHTML = `
                    <span style="color: #22c55e; border: 1px solid #22c55e; padding: 2px 8px; border-radius: 12px; font-size: 10px;">
                        ✓ Active
                    </span>
                `;
            } else {
                statusCell.innerHTML = `
                    <span style="color: #ef4444; border: 1px solid #ef4444; padding: 2px 8px; border-radius: 12px; font-size: 10px;" title="${result.data?.error || 'Connection failed'}">
                        ✗ Error
                    </span>
                `;
            }
        } catch (error) {
            console.error(`[Provider Health] ${provider.name} error:`, error);
            // If Cloud Function doesn't exist yet, fall back to stored status
            if (error.code === 'functions/not-found' || error.message.includes('not found')) {
                // Use stored status as fallback
                statusCell.innerHTML = provider.status === 'active'
                    ? `<span style="color: #22c55e; border: 1px solid #22c55e; padding: 2px 8px; border-radius: 12px; font-size: 10px;">✓ Active</span>`
                    : `<span style="color: #6b7280; border: 1px solid #6b7280; padding: 2px 8px; border-radius: 12px; font-size: 10px;">Disabled</span>`;
            } else {
                statusCell.innerHTML = `
                    <span style="color: #ef4444; border: 1px solid #ef4444; padding: 2px 8px; border-radius: 12px; font-size: 10px;" title="${error.message}">
                        ✗ Error
                    </span>
                `;
            }
        }
    }

    window.openProviderModal = function (providerId = null) {
        if (!modal || !form) return;

        form.reset();
        document.getElementById('provider-doc-id-settings').value = '';
        if (testResultDiv) testResultDiv.innerHTML = '';

        if (providerId) {
            const p = providers.find(item => item.id === providerId);
            if (p) {
                document.getElementById('provider-modal-title-settings').textContent = 'Edit LLM Provider';
                document.getElementById('provider-doc-id-settings').value = p.id;
                document.getElementById('provider-type-settings').value = p.provider;
                document.getElementById('provider-name-settings').value = p.name;
                document.getElementById('provider-models-settings').value = p.models?.join(', ') || '';
                document.getElementById('provider-status-settings').value = p.status;

                document.getElementById('provider-api-key-settings').placeholder = "Leave blank to keep existing key";
                document.getElementById('provider-api-key-settings').required = false;
            }
        } else {
            document.getElementById('provider-modal-title-settings').textContent = 'Add LLM Provider';
            document.getElementById('provider-api-key-settings').placeholder = "sk-...";
            document.getElementById('provider-api-key-settings').required = true;
            document.getElementById('provider-status-settings').value = 'active';
        }

        modal.classList.add('open');
        modal.style.display = 'flex';
    };

    window.closeProviderModalSettings = function () {
        if (modal) {
            modal.classList.remove('open');
            modal.style.display = 'none';
        }
    };

    window.editProviderSettings = function (id) {
        openProviderModal(id);
    };

    async function saveProvider(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-save-provider-settings');
        if (!btn) return;

        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const id = document.getElementById('provider-doc-id-settings').value;
            const apiKeyInput = document.getElementById('provider-api-key-settings');

            const data = {
                provider: document.getElementById('provider-type-settings').value,
                name: document.getElementById('provider-name-settings').value,
                models: document.getElementById('provider-models-settings').value.split(',').map(s => s.trim()).filter(s => s),
                status: document.getElementById('provider-status-settings').value
            };

            if (apiKeyInput.value) {
                data.credentialRef = {
                    storageType: 'direct',
                    apiKeyMasked: maskApiKey(apiKeyInput.value),
                    apiKeyEncrypted: apiKeyInput.value
                };
            } else if (!id) {
                throw new Error("API Key is required for new provider");
            }

            await window.LLMProviderService.saveProvider(id || null, data);

            closeProviderModalSettings();
            await loadProviders();
            alert('✅ Provider saved successfully');

        } catch (error) {
            console.error("Save failed:", error);
            alert(`Error: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Provider';
        }
    }

    async function testConnection() {
        const apiKey = document.getElementById('provider-api-key-settings').value;
        const provider = document.getElementById('provider-type-settings').value;
        const modelsStr = document.getElementById('provider-models-settings').value;
        const model = modelsStr.split(',')[0]?.trim() || 'gpt-4o-mini';

        if (!apiKey) {
            testResultDiv.innerHTML = '<span style="color: #fbbf24;">⚠️ Please enter API Key to test connection</span>';
            return;
        }

        testResultDiv.innerHTML = '<span style="color: #888;">Testing connection...</span>';

        const result = await window.LLMProviderService.testConnection({
            provider,
            apiKey,
            model
        });

        if (result.success) {
            testResultDiv.innerHTML = `<span style="color: #22c55e;">✅ ${result.message} (${result.latency}ms)</span>`;
        } else {
            testResultDiv.innerHTML = `<span style="color: #ef4444;">❌ ${result.message}</span>`;
        }
    }

    function maskApiKey(key) {
        if (!key || key.length < 8) return '****';
        return key.substring(0, 3) + '...' + key.substring(key.length - 4);
    }

    function capitalize(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    function getStatusBadge(status) {
        const colors = {
            active: '#22c55e',
            disabled: '#94a3b8',
            error: '#ef4444'
        };
        const color = colors[status] || '#94a3b8';
        return `<span style="border: 1px solid ${color}; color: ${color}; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${capitalize(status)}</span>`;
    }

    // Initialize Provider Management
    initProviderManagement();

    // Update Prompts Handler
    const updatePromptsBtn = document.getElementById('update-prompts-btn');
    if (updatePromptsBtn) {
        updatePromptsBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to update the system prompts for Planner, Creator, and Manager?')) {
                const script = document.createElement('script');
                script.src = 'scripts/update-subagent-prompts.js?v=' + Date.now();
                document.body.appendChild(script);
            }
        });
    }
}

// TODO (Future): channelApiSchemas collection
// channelApiSchemas/{channelSlug} {
//   fields: [
//     { key, label, type, required, helperText }
//   ],
//   updated_at,
//   updated_by
// }
// Step 4 (Agent Team wizard) and Channel API Settings will eventually
// load and save definitions from this collection instead of using
// the static CHANNEL_API_FIELD_DEFS constant.

let selectedChannelSlug = null;

function loadSettingsChannels() {
    const listContainer = document.getElementById('settings-channels-list');
    if (!listContainer) return;

    const db = firebase.firestore();

    db.collection('channelProfiles')
        .where('is_active', '==', true)
        .get()
        .then(snapshot => {
            const channels = [];
            snapshot.forEach(doc => {
                channels.push({ id: doc.id, ...doc.data() });
            });

            channels.sort((a, b) => a.name.localeCompare(b.name));

            if (channels.length === 0) {
                listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">No active channels found</div>';
                return;
            }

            listContainer.innerHTML = channels.map(channel => {
                const slug = channel.slug || channel.channel_type;
                const isSelected = selectedChannelSlug === slug;

                return `
                <div onclick="selectSettingsChannel('${slug}', '${channel.name}', '${channel.icon || '📺'}')" 
                     style="padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: all 0.2s; background: ${isSelected ? 'rgba(22, 224, 189, 0.1)' : 'transparent'};"
                     onmouseover="this.style.background='rgba(255,255,255,0.05)'"
                     onmouseout="this.style.background='${isSelected ? 'rgba(22, 224, 189, 0.1)' : 'transparent'}'">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 24px;">${channel.icon || '📺'}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: ${isSelected ? '#16e0bd' : '#fff'}; font-size: 14px;">${channel.name}</div>
                            <div style="font-size: 11px; color: rgba(255,255,255,0.4); font-family: monospace;">${slug}</div>
                        </div>
                        <div style="font-size: 18px; color: ${isSelected ? '#16e0bd' : 'rgba(255,255,255,0.3)'};">→</div>
                    </div>
                </div>
                `;
            }).join('');
        })
        .catch(error => {
            console.error("Error loading channels:", error);
            listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Error loading channels</div>';
        });
}

window.selectSettingsChannel = function (slug, name, icon) {
    selectedChannelSlug = slug;
    loadSettingsChannels(); // Re-render to update selection
    renderChannelDetail(slug, name, icon);
};

function renderChannelDetail(slug, name, icon) {
    const detailContainer = document.getElementById('settings-channel-detail');
    if (!detailContainer) return;

    const fieldDefs = CHANNEL_API_FIELD_DEFS[slug] || CHANNEL_API_FIELD_DEFS['default'];

    detailContainer.innerHTML = `
        <!-- Header -->
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 32px;">${icon}</div>
            <div>
                <h3 style="margin: 0; color: #fff;">${name}</h3>
                <div style="font-size: 12px; color: rgba(255,255,255,0.5); font-family: monospace; margin-top: 4px;">${slug}</div>
            </div>
        </div>

        <!-- Info Banner (Korean + English) -->
        <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; gap: 12px; align-items: start;">
                <div style="font-size: 20px;">ℹ️</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #fbbf24; margin-bottom: 8px; font-size: 13px;">현재 상태 (Read-only)</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 12px;">
                        현재 채널별 API 필드 정의는 프론트엔드에 하드코딩된 상수를 사용하고 있습니다.<br>
                        추후 업데이트에서 이 설정은 Firestore 기반의 <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">channelApiSchemas</code> 컬렉션으로 이전되고,<br>
                        이 화면에서 직접 편집할 수 있도록 확장될 예정입니다.
                    </div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.5); font-style: italic;">
                        For now, these API field definitions are static constants in the frontend. In a future release, they will be loaded from a Firestore collection (e.g. <code style="font-family: monospace;">channelApiSchemas</code>) and become fully editable here.
                    </div>
                </div>
            </div>
        </div>

        <!-- API Fields -->
        <div style="margin-bottom: 24px;">
            <h4 style="margin: 0 0 16px 0; color: #fff;">API Field Schema (${fieldDefs.length} fields)</h4>
            <div style="display: grid; gap: 16px;">
                ${fieldDefs.map(field => `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 16px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Field Key</label>
                            <div style="font-family: monospace; color: #16e0bd; font-size: 13px; font-weight: 600;">${field.key}</div>
                        </div>
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Label</label>
                            <div style="color: rgba(255,255,255,0.8); font-size: 13px;">${field.label}</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Type</label>
                            <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px; color: rgba(255,255,255,0.7);">${field.type}</span>
                        </div>
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Required</label>
                            <span style="color: ${field.required ? '#f87171' : 'rgba(255,255,255,0.5)'}; font-size: 12px; font-weight: 600;">${field.required ? '✓ Required' : 'Optional'}</span>
                        </div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Helper Text</label>
                        <div style="color: rgba(255,255,255,0.6); font-size: 12px; line-height: 1.5;">${field.helperText}</div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>

        <!-- Disabled Save Button -->
        <div style="display: flex; justify-content: flex-end; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
            <button onclick="alert('현재 버전에서는 설정 편집이 비활성화되어 있습니다. (Read-only)')" 
                    class="admin-btn-secondary" 
                    style="opacity: 0.5; cursor: not-allowed;">
                💾 Save (Coming soon)
            </button>
        </div>
    `;
}

window.switchSettingsTab = function (tabId) {
    // Update Tabs
    document.querySelectorAll('.settings-tab').forEach(el => {
        el.classList.remove('active');
        el.style.borderBottom = '2px solid transparent';
        el.style.color = 'rgba(255,255,255,0.5)';
    });

    const activeTab = document.getElementById(`tab-btn-${tabId}`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.borderBottom = '2px solid #16e0bd';
        activeTab.style.color = '#fff';
    }

    // Update Content
    document.querySelectorAll('.settings-tab-content').forEach(el => {
        el.style.display = 'none';
    });
    document.getElementById(`tab-${tabId}`).style.display = 'block';

    // Load channels when switching to Channel API tab
    if (tabId === 'channel-api') {
        loadSettingsChannels();
    }
    // Load Pricing data when switching to Pricing tab
    if (tabId === 'pricing') {
        loadPricingData();
    }
};

// --- Pricing & Credits Interface ---

let pricingPlans = {}; // Store loaded plans
let topupPacks = [];   // Store loaded packs

async function loadPricingData() {
    const plansBody = document.getElementById('pricing-plans-body');
    const packsBody = document.getElementById('pricing-packs-body');

    if (!plansBody || !packsBody) return;

    const db = firebase.firestore();

    // 1. Fetch Plans
    try {
        const plansSnapshot = await db.collection('system_pricing_plans').get();
        pricingPlans = {};
        if (!plansSnapshot.empty) {
            plansSnapshot.forEach(doc => {
                pricingPlans[doc.id] = doc.data();
            });
            renderPlansTable();
        } else {
            plansBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No plans found. Run seed script.</td></tr>';
        }
    } catch (error) {
        console.error("Error loading plans:", error);
        plansBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error loading plans: ${error.message}<br>Check Firestore Rules.</td></tr>`;
    }

    // 2. Fetch Packs
    try {
        const packsSnapshot = await db.collection('system_topup_packs').orderBy('order').get();
        topupPacks = [];
        if (!packsSnapshot.empty) {
            packsSnapshot.forEach(doc => topupPacks.push(doc.data()));
            renderPacksTable();
        } else {
            packsBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No packs found. Run seed script.</td></tr>';
        }
    } catch (error) {
        console.error("Error loading packs:", error);
        packsBody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error loading packs: ${error.message}</td></tr>`;
    }

    // 3. Fetch Action Costs (Always try to load this)
    await loadActionCosts();
}

let creditCosts = [];

async function loadActionCosts() {
    const tbody = document.getElementById('pricing-actions-body');
    if (!tbody) return;

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('system_credit_costs').orderBy('category').get();

        creditCosts = [];
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                creditCosts.push({ id: doc.id, ...doc.data() });
            });
            renderActionsTable();
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No costs defined. Run seed script.</td></tr>';
        }

    } catch (error) {
        console.error("Error loading costs:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
    }
}

function renderActionsTable() {
    const tbody = document.getElementById('pricing-actions-body');
    if (!tbody) return;

    tbody.innerHTML = creditCosts.map(action => `
        <tr>
            <td>
                <strong style="color: #fff;">${action.name}</strong>
                <div style="font-size: 11px; color: rgba(255,255,255,0.4); font-family: monospace;">${action.id}</div>
            </td>
            <td><span style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px; font-size:11px;">${action.category}</span></td>
            <td style="font-size: 13px; color: rgba(255,255,255,0.7);">${action.description}</td>
            <td>
                <input type="number" id="cost-${action.id}" value="${action.cost}" class="admin-input" style="width: 100px;">
            </td>
        </tr>
    `).join('');
}

window.saveActionCosts = async function () {
    const db = firebase.firestore();
    const btn = document.querySelector('button[onclick="saveActionCosts()"]');
    if (btn) { btn.textContent = "Saving..."; btn.disabled = true; }

    try {
        const batch = db.batch();

        creditCosts.forEach(action => {
            const input = document.getElementById(`cost-${action.id}`);
            if (input) {
                const newCost = parseInt(input.value);
                if (!isNaN(newCost)) {
                    const ref = db.collection('system_credit_costs').doc(action.id);
                    batch.update(ref, { cost: newCost });
                    action.cost = newCost; // Update local state
                }
            }
        });

        await batch.commit();
        alert("✅ Credit Costs Updated Successfully!");

    } catch (error) {
        console.error("Save costs failed:", error);
        alert("Error saving costs: " + error.message);
    } finally {
        if (btn) { btn.textContent = "Save Costs"; btn.disabled = false; }
    }
};

function renderPlansTable() {
    const tbody = document.getElementById('pricing-plans-body');
    if (!tbody) return;

    // Fixed order: starter, growth, scale, enterprise
    const order = ['starter', 'growth', 'scale', 'enterprise'];

    tbody.innerHTML = order.map(planId => {
        const plan = pricingPlans[planId];
        if (!plan) return '';

        const isEnterprise = plan.id === 'enterprise';

        return `
        <tr>
            <td>
                <strong style="color: #fff; text-transform: capitalize;">${plan.name}</strong>
                <div style="font-size: 11px; color: rgba(255,255,255,0.4); font-family: monospace;">${plan.id}</div>
            </td>
            <td>
                ${isEnterprise ?
                '<span style="color:rgba(255,255,255,0.5); font-style:italic;">Custom</span>' :
                `<input type="number" id="price-${plan.id}" value="${plan.price}" class="admin-input" style="width: 80px;">`
            }
            </td>
            <td>
                ${isEnterprise ?
                '<span style="color:rgba(255,255,255,0.5); font-style:italic;">Custom</span>' :
                `<input type="number" id="credits-${plan.id}" value="${plan.baseCredits}" class="admin-input" style="width: 100px;">`
            }
            </td>
            <td>
                ${isEnterprise ?
                '9999+' :
                `<input type="number" id="seats-${plan.id}" value="${plan.seats}" class="admin-input" style="width: 60px;">`
            }
            </td>
             <td>
                ${isEnterprise ?
                'Custom' :
                `<input type="number" id="agents-${plan.id}" value="${plan.agentLimit || 1}" class="admin-input" style="width: 60px;">`
            }
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" step="0.01" id="bonus-${plan.id}" value="${plan.bonusRate}" class="admin-input" style="width: 70px;" onchange="renderPacksTable()">
                    <span style="font-size: 11px; color: rgba(255,255,255,0.5);">(${Math.round(plan.bonusRate * 100)}%)</span>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function renderPacksTable() {
    const tbody = document.getElementById('pricing-packs-body');
    if (!tbody) return;

    // Get current bonus rates from Inputs (for real-time preview) or Fallback to state
    const getRate = (id) => {
        const input = document.getElementById(`bonus-${id}`);
        return input ? parseFloat(input.value) : (pricingPlans[id]?.bonusRate || 0);
    };

    const starterRate = getRate('starter');
    const enterpriseRate = getRate('enterprise');

    tbody.innerHTML = topupPacks.map(pack => {
        const starterTotal = Math.floor(pack.baseCredits * (1 + starterRate));
        const enterpriseTotal = Math.floor(pack.baseCredits * (1 + enterpriseRate));
        const enterpriseBonus = enterpriseTotal - pack.baseCredits;

        return `
        <tr>
            <td>
                <strong style="color: #fff;">${pack.name}</strong>
            </td>
            <td>$${pack.price}</td>
            <td>${pack.baseCredits.toLocaleString()}</td>
            <td>
                <span style="color: #16e0bd;">${starterTotal.toLocaleString()}</span>
                ${starterRate > 0 ? `<div style="font-size: 10px; color: #16e0bd;">+${starterRate * 100}% Bonus</div>` : ''}
            </td>
             <td>
                <span style="color: #fbbf24;">${enterpriseTotal.toLocaleString()}</span>
                <div style="font-size: 10px; color: #fbbf24;">+${enterpriseBonus.toLocaleString()} Bonus</div>
            </td>
        </tr>
        `;
    }).join('');
}

window.savePricingData = async function () {
    const db = firebase.firestore();
    const btn = document.querySelector('button[onclick="savePricingData()"]');
    if (btn) { btn.textContent = "Saving..."; btn.disabled = true; }

    try {
        const batch = db.batch();
        const order = ['starter', 'growth', 'scale', 'enterprise'];

        order.forEach(planId => {
            const planRef = db.collection('system_pricing_plans').doc(planId);

            // Collect logic
            const updates = {
                bonusRate: parseFloat(document.getElementById(`bonus-${planId}`).value || 0)
            };

            // Enterprise doesn't have editable base price/credits details in this UI version
            if (planId !== 'enterprise') {
                updates.price = parseInt(document.getElementById(`price-${planId}`).value || 0);
                updates.baseCredits = parseInt(document.getElementById(`credits-${planId}`).value || 0);
                updates.seats = parseInt(document.getElementById(`seats-${planId}`).value || 1);
                updates.agentLimit = parseInt(document.getElementById(`agents-${planId}`).value || 1);
            }

            batch.set(planRef, updates, { merge: true });

            // Update local state
            pricingPlans[planId] = { ...pricingPlans[planId], ...updates };
        });

        await batch.commit();
        alert("✅ Pricing Plans Updated Successfully!");
        renderPacksTable(); // Re-render packs to ensure consistent state

    } catch (error) {
        console.error("Save failed:", error);
        alert("Error saving data: " + error.message);
    } finally {
        if (btn) { btn.textContent = "Save Changes"; btn.disabled = false; }
    }
};

// ===================================================
// PRD 11.6 - LLM Models & Feature Policies Management
// ===================================================

let llmModels = [];
let featurePolicies = [];

/**
 * Load and render LLM Models table
 */
window.refreshLLMModels = async function () {
    const tbody = document.getElementById('llm-models-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Loading models...</td></tr>';

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('systemLLMModels').orderBy('tier').get();

        llmModels = [];
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">No models found. Click "Seed Models" to initialize.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            llmModels.push({ id: doc.id, ...doc.data() });
        });

        renderLLMModelsTable();
    } catch (error) {
        console.error('[LLM Models] Load error:', error);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #ef4444;">Error: ${error.message}</td></tr>`;
    }
};

function renderLLMModelsTable() {
    const tbody = document.getElementById('llm-models-table-body');
    if (!tbody) return;

    const tierColors = {
        economy: '#10b981',
        standard: '#eab308',
        premium: '#f43f5e'
    };

    const providerIcons = {
        openai: '🟢',
        anthropic: '🟣',
        gemini: '🔵'
    };

    tbody.innerHTML = llmModels.map(model => {
        const tierColor = tierColors[model.tier] || '#888';
        const providerIcon = providerIcons[model.provider] || '⚪';
        const defaultBadge = model.isDefault
            ? '<span style="background: #16e0bd; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 9px; margin-left: 4px;">DEFAULT</span>'
            : '';

        // Check if model is actually available (not future models like GPT-5)
        const unavailableModels = ['gpt-5', 'gpt-5.2', 'gpt-5-turbo', 'gemini-2.0-pro', 'gemini-3.0-pro'];
        const isUnavailable = unavailableModels.includes(model.modelId);

        // Code Ready status
        const codeReadyBadge = '<span style="color: #22c55e; border: 1px solid #22c55e; padding: 2px 8px; border-radius: 12px; font-size: 10px;">Ready</span>';

        // Status badge - show Inactive for unavailable models
        let statusBadge;
        if (isUnavailable) {
            statusBadge = '<span style="color: #f59e0b; border: 1px solid #f59e0b; padding: 2px 8px; border-radius: 12px; font-size: 10px;">Inactive</span>';
        } else if (model.isActive) {
            statusBadge = '<span style="color: #22c55e; border: 1px solid #22c55e; padding: 2px 8px; border-radius: 12px; font-size: 10px;">Active</span>';
        } else {
            statusBadge = '<span style="color: #6b7280; border: 1px solid #6b7280; padding: 2px 8px; border-radius: 12px; font-size: 10px;">Disabled</span>';
        }

        return `
        <tr style="${isUnavailable ? 'opacity: 0.6;' : ''}">
            <td>
                <strong style="color: #fff;">${model.displayName}</strong>${defaultBadge}
                <div style="font-size: 11px; color: rgba(255,255,255,0.4); font-family: monospace;">${model.modelId}</div>
            </td>
            <td>${providerIcon} ${capitalize(model.provider)}</td>
            <td><span style="color: ${tierColor}; font-weight: 600; text-transform: uppercase; font-size: 11px;">${model.tier}</span></td>
            <td style="font-family: monospace; font-size: 12px;">$${model.costPer1kInputTokens?.toFixed(4) || '0.00'}</td>
            <td style="font-family: monospace; font-size: 12px;">$${model.costPer1kOutputTokens?.toFixed(4) || '0.00'}</td>
            <td>
                <span style="background: linear-gradient(90deg, ${tierColor}40, transparent); padding: 4px 8px; border-radius: 4px; font-weight: 600; color: ${tierColor};">
                    ${model.creditPer1kTokens?.toFixed(1) || '1.0'}x
                </span>
            </td>
            <td style="font-size: 11px; color: rgba(255,255,255,0.6);">${formatContextSize(model.maxContextTokens)}</td>
            <td>${codeReadyBadge}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="admin-btn-secondary" style="padding: 4px 8px; font-size: 10px;" onclick="editLLMModel('${model.id}')">Edit</button>
            </td>
        </tr>
        `;
    }).join('');
}

function formatContextSize(tokens) {
    if (!tokens) return '-';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
    return tokens.toString();
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/**
 * Load and render Feature Policies table
 */
window.refreshFeaturePolicies = async function () {
    const tbody = document.getElementById('feature-policies-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Loading policies...</td></tr>';

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('featurePolicies').orderBy('category').get();

        featurePolicies = [];
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">No policies found. Click "Seed Models" to initialize.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            featurePolicies.push({ id: doc.id, ...doc.data() });
        });

        renderFeaturePoliciesTable();
    } catch (error) {
        console.error('[Feature Policies] Load error:', error);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444;">Error: ${error.message}</td></tr>`;
    }
};

function renderFeaturePoliciesTable() {
    const tbody = document.getElementById('feature-policies-table-body');
    if (!tbody) return;

    const categoryColors = {
        studio: '#8b5cf6',
        brandbrain: '#f59e0b',
        marketpulse: '#06b6d4',
        chatbot: '#10b981',
        arena: '#ef4444'
    };

    tbody.innerHTML = featurePolicies.map(policy => {
        const catColor = categoryColors[policy.category] || '#6b7280';
        const defaultModel = policy.defaultTier?.model || '-';
        const boostModel = policy.boostTier?.model || '-';
        const defaultCredit = policy.defaultTier?.creditMultiplier?.toFixed(1) || '1.0';
        const boostCredit = policy.boostTier?.creditMultiplier?.toFixed(1) || '2.5';
        const forceModel = policy.forceTier?.model;
        const forceBadge = forceModel
            ? `<span style="background: #ef4444; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 9px;">${forceModel}</span>`
            : '<span style="color: rgba(255,255,255,0.3);">-</span>';
        const statusBadge = policy.isActive
            ? '<span style="color: #22c55e;">●</span>'
            : '<span style="color: #6b7280;">○</span>';

        return `
        <tr>
            <td>
                <strong style="color: #fff;">${policy.featureName}</strong>
                <div style="font-size: 10px; color: rgba(255,255,255,0.4); font-family: monospace;">${policy.id}</div>
            </td>
            <td>
                <span style="background: ${catColor}20; color: ${catColor}; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">
                    ${policy.category}
                </span>
            </td>
            <td style="font-size: 12px; color: rgba(255,255,255,0.8);">${defaultModel}</td>
            <td><span style="color: #eab308;">${defaultCredit}x</span></td>
            <td style="font-size: 12px; color: #16e0bd; font-weight: 600;">${boostModel}</td>
            <td><span style="color: #f43f5e; font-weight: 600;">${boostCredit}x</span></td>
            <td>${forceBadge}</td>
            <td>${statusBadge}</td>
        </tr>
        `;
    }).join('');
}

/**
 * Edit LLM Model (placeholder for modal)
 */
window.editLLMModel = function (modelId) {
    const model = llmModels.find(m => m.id === modelId);
    if (!model) return;

    // For now, just show info. Full edit modal can be added later.
    const info = `
Model: ${model.displayName}
ID: ${model.modelId}
Provider: ${model.provider}
Tier: ${model.tier}

Cost (per 1K tokens):
- Input: $${model.costPer1kInputTokens}
- Output: $${model.costPer1kOutputTokens}

Credit Multiplier: ${model.creditPer1kTokens}x

To edit, modify the systemLLMModels collection directly in Firestore.
    `;
    alert(info);
};

// Auto-load LLM Models and Feature Policies when System tab is shown
(function () {
    // Override switchSettingsTab to also load LLM data
    const originalSwitch = window.switchSettingsTab;
    window.switchSettingsTab = function (tabId) {
        originalSwitch(tabId);

        if (tabId === 'system') {
            // Load LLM Models and Feature Policies
            if (typeof refreshLLMModels === 'function') refreshLLMModels();
            if (typeof refreshFeaturePolicies === 'function') refreshFeaturePolicies();
        }
    };

    // Also load on initial page load if System tab is active
    setTimeout(() => {
        const systemTab = document.getElementById('tab-system');
        if (systemTab && systemTab.style.display !== 'none') {
            if (typeof refreshLLMModels === 'function') refreshLLMModels();
            if (typeof refreshFeaturePolicies === 'function') refreshFeaturePolicies();
        }
    }, 500);
})();

