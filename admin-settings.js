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

        if (addBtn) addBtn.addEventListener('click', () => openProviderModal());
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

        tableBody.innerHTML = providers.map(p => `
            <tr>
                <td><strong style="color: #16e0bd;">${p.name}</strong></td>
                <td>${capitalize(p.provider)}</td>
                <td>${getStatusBadge(p.status)}</td>
                <td style="font-size: 12px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.models?.join(', ')}">${p.models?.join(', ') || '-'}</td>
                <td>
                    <button class="admin-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="editProviderSettings('${p.id}')">Edit</button>
                </td>
            </tr>
        `).join('');
    }

    window.openProviderModal = function (providerId = null) {
        if (!modal || !form) return;

        form.reset();
        document.getElementById('provider-doc-id-settings').value = '';
        testResultDiv.innerHTML = '';

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

        modal.style.display = 'flex';
    };

    window.closeProviderModalSettings = function () {
        if (modal) modal.style.display = 'none';
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
};
