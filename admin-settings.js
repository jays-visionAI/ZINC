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

// ==========================================
// API TESTER UTILITIES (New Tab Logic)
// ==========================================

window.initApiTester = async function () {
    console.log("🧪 Initializing API Tester...");
    await window.autoFillGeminiKey();
}

/**
 * Auto-fill Gemini Key from System Providers if available
 */
window.autoFillGeminiKey = async function () {
    if (!window.LLMProviderService) return;
    try {
        const providers = await window.LLMProviderService.getProviders();
        // Look for 'gemini' or 'google'
        const googleProvider = providers.find(p => p.provider === 'google' || p.provider === 'gemini');

        if (googleProvider && googleProvider.apiKey) {
            const inputEl = document.getElementById('test-gemini-key');
            if (inputEl) inputEl.value = googleProvider.apiKey;
            console.log("✅ Auto-filled Gemini Key from System");
        } else {
            console.log("⚠️ No Google/Gemini provider found in system to auto-fill.");
        }
    } catch (e) {
        console.error("Failed to auto-load key:", e);
    }
}

/**
 * Execute Gemini Model List (User's logic adapted)
 */
window.runGeminiModelList = async function () {
    const key = document.getElementById('test-gemini-key').value.trim();
    const statusEl = document.getElementById('test-gemini-list-status');
    const outEl = document.getElementById('test-gemini-list-output');

    if (!key) {
        alert("Please enter an API Key first.");
        return;
    }

    statusEl.innerHTML = '<span style="color:#f59e0b">⏳ Fetching models...</span>';
    outEl.textContent = "";

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
        const res = await fetch(url, { method: "GET" });
        const text = await res.text();

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
        }

        const data = JSON.parse(text);
        const models = data.models || [];

        // Filter and Format
        const summary = models.map(m => `• ${m.name} (${m.displayName})`).join('\n');

        outEl.textContent = JSON.stringify(data, null, 2); // Show full JSON for debugging
        statusEl.innerHTML = `<span style="color:#10b981">✅ OK. Found ${models.length} models.</span>`;

        // Auto-select a likely candidate for generation test
        const bestModel = models.find(m => m.name.includes('gemini-2.0-flash-exp')) || models.find(m => m.name.includes('gemini-1.5-pro'));
        if (bestModel) {
            document.getElementById('test-gemini-model-id').value = bestModel.name.replace('models/', '');
        }

    } catch (e) {
        statusEl.innerHTML = `<span style="color:#ef4444">❌ Error</span>`;
        outEl.textContent = e.message;
    }
}

/**
 * Execute Gemini Generation Test
 */
window.runGeminiGeneration = async function () {
    const outputPre = document.getElementById('test-gemini-gen-output');
    const statusDiv = document.getElementById('test-gemini-gen-status');
    const modelId = document.getElementById('test-gemini-model-id').value.trim() || 'gemini-1.5-flash';
    const prompt = document.getElementById('test-gemini-prompt').value.trim();
    const apiKey = document.getElementById('test-gemini-key').value.trim();

    if (!apiKey) { alert('Please enter or load a Gemini API Key first.'); return; }
    if (!prompt) { alert('Please enter a prompt.'); return; }

    statusDiv.innerHTML = '🚀 Sending prompt...';
    outputPre.textContent = 'Generating...';
    outputPre.style.color = '#0bceaf';

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        outputPre.textContent = JSON.stringify(data, null, 2);

        if (response.ok) {
            const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No text in response';
            statusDiv.innerHTML = `✅ Success! "${answer.substring(0, 50)}..."`;
        } else {
            statusDiv.innerHTML = `❌ Error: ${data.error?.message || response.statusText}`;
            outputPre.style.color = '#ef4444';
        }

    } catch (error) {
        statusDiv.innerHTML = `❌ Network Error: ${error.message}`;
        outputPre.textContent = error.stack;
        outputPre.style.color = '#ef4444';
    }
};

// ============================================
// OPENAI API TESTER LOGIC
// ============================================

// 1. Auto-fill OpenAI Key
window.autoFillOpenAIKey = async function () {
    try {
        const key = await getSystemApiKey('openai');
        if (key) {
            document.getElementById('test-openai-key').value = key;
            alert('✅ Loaded OpenAI API Key from System!');
        } else {
            alert('❌ No OpenAI API Key found in System Settings (systemLLMProviders).');
        }
    } catch (e) {
        console.error(e);
        alert('Error loading key: ' + e.message);
    }
};

// 2. Run OpenAI Model List
window.runOpenAIModelList = async function () {
    const outputPre = document.getElementById('test-openai-list-output');
    const statusDiv = document.getElementById('test-openai-list-status');
    const apiKey = document.getElementById('test-openai-key').value.trim();

    if (!apiKey) { alert('Please enter or load an OpenAI API Key first.'); return; }

    statusDiv.innerHTML = '⏳ Fetching models...';
    outputPre.textContent = 'Loading...';
    outputPre.style.color = '#0f0';

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const data = await response.json();

        if (response.ok) {
            const models = data.data || [];
            models.sort((a, b) => b.created - a.created); // Newest first
            const count = models.length;

            statusDiv.innerHTML = `✅ OK. Found ${count} models.`;
            outputPre.textContent = JSON.stringify(models, null, 2);
        } else {
            statusDiv.innerHTML = `❌ Error: ${data.error?.message || response.statusText}`;
            outputPre.textContent = JSON.stringify(data, null, 2);
            outputPre.style.color = '#ef4444';
        }
    } catch (error) {
        statusDiv.innerHTML = `❌ Network Error: ${error.message}`;
        outputPre.textContent = error.stack;
        outputPre.style.color = '#ef4444';
    }
};

// 3. Run OpenAI Generation
window.runOpenAIGeneration = async function () {
    const outputPre = document.getElementById('test-openai-gen-output');
    const statusDiv = document.getElementById('test-openai-gen-status');
    const modelId = document.getElementById('test-openai-model-id').value.trim() || 'gpt-4o';
    const prompt = document.getElementById('test-openai-prompt').value.trim();
    const apiKey = document.getElementById('test-openai-key').value.trim();

    if (!apiKey) { alert('Please enter or load an OpenAI API Key first.'); return; }
    if (!prompt) { alert('Please enter a prompt.'); return; }

    statusDiv.innerHTML = '🚀 Sending prompt...';
    outputPre.textContent = 'Generating...';
    outputPre.style.color = '#0bceaf';

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        outputPre.textContent = JSON.stringify(data, null, 2);

        if (response.ok) {
            const answer = data.choices?.[0]?.message?.content || 'No text in response';
            statusDiv.innerHTML = `✅ Success! "${answer.substring(0, 50)}..."`;
        } else {
            statusDiv.innerHTML = `❌ Error: ${data.error?.message || response.statusText}`;
            outputPre.style.color = '#ef4444';
        }

    } catch (error) {
        statusDiv.innerHTML = `❌ Network Error: ${error.message}`;
        outputPre.textContent = error.stack;
        outputPre.style.color = '#ef4444';
    }
};
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
    await window.loadGlobalDefaults();
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
                    <div style="display: flex; gap: 4px;">
                        <button class="admin-btn-secondary" onclick="editProvider('${p.id}')" style="padding: 4px 8px; font-size: 11px; flex: 1;">Edit</button>
                        <button class="admin-btn-secondary" onclick="deleteProvider('${p.id}')" style="padding: 4px 8px; font-size: 11px; flex: 1; color: #ef4444; border-color: rgba(239,68,68,0.5);">Del</button>
                    </div>
                </td>
            </tr>
        `).join('');

    // Trigger asynchronous checks
    providers.forEach(p => checkProviderHealth(p));
}

async function checkProviderHealth(provider) {
    const statusCell = document.getElementById(`provider-status-${provider.id}`);
    if (!statusCell) return;

    console.log('[Provider Health] Testing:', provider.name, 'id:', provider.id, 'type:', provider.provider);

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

/**
 * Sanitize LLM Providers (Standardize names & remove duplicates)
 */
window.sanitizeLLMProviders = async function () {
    if (!confirm('This will standardise provider names (OpenAI, Google Gemini, Anthropic) and remove duplicates. Continue?')) {
        return;
    }

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('systemLLMProviders').get();
        const allProviders = [];

        snapshot.forEach(doc => {
            allProviders.push({ id: doc.id, ...doc.data() });
        });

        // Standardize names mapping
        const standardNames = {
            'openai': 'OpenAI',
            'gemini': 'Google Gemini',
            'anthropic': 'Anthropic'
        };

        const uniqueProviders = {};
        const batch = db.batch();
        let changesCount = 0;

        // Sort by update time (keep most recent) to prefer newer entries
        allProviders.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

        // 1. Identify unique providers & mark duplicates for deletion
        // Also update names if needed
        for (const p of allProviders) {
            if (!p.provider) continue; // Skip invalid

            const type = p.provider.toLowerCase();
            if (!uniqueProviders[type]) {
                // This is the primary provider for this type
                uniqueProviders[type] = p;

                // Check if renaming is needed
                const newName = standardNames[type];
                if (newName && p.name !== newName) {
                    console.log(`Renaming ${p.name} -> ${newName}`);
                    batch.update(db.collection('systemLLMProviders').doc(p.id), {
                        name: newName,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    changesCount++;
                }
            } else {
                // Duplicate! Delete it.
                console.log(`Deleting duplicate provider: ${p.name} (${p.id})`);
                batch.delete(db.collection('systemLLMProviders').doc(p.id));
                changesCount++;
            }
        }

        if (changesCount > 0) {
            await batch.commit();
            alert(`Cleanup complete! ${changesCount} items processed.`);
            await loadProviders();
        } else {
            alert('Providers are already clean.');
        }

    } catch (error) {
        console.error('Error sanitizing providers:', error);
        alert('Error: ' + error.message);
    }
};

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
        btn.textContent = 'Save Provider';
    }
}

window.deleteProvider = async function (id) {
    if (!confirm("Are you sure you want to delete this provider? This action cannot be undone.")) return;

    try {
        await window.LLMProviderService.deleteProvider(id);
        await loadProviders();
        alert("Provider deleted successfully.");
    } catch (e) {
        console.error("Delete failed:", e);
        alert("Error deleting provider: " + e.message);
    }
}

async function testConnection() {
    const apiKeyInput = document.getElementById('provider-api-key-settings');
    const apiKey = apiKeyInput ? apiKeyInput.value : '';
    const providerDocId = document.getElementById('provider-doc-id-settings').value;
    const provider = document.getElementById('provider-type-settings').value;
    const modelsStr = document.getElementById('provider-models-settings').value;
    const model = modelsStr.split(',')[0]?.trim() || 'gpt-4o-mini';

    if (!apiKey && !providerDocId) {
        if (testResultDiv) testResultDiv.innerHTML = '<span style="color: #fbbf24;">⚠️ Please enter API Key (or save provider first) to test connection</span>';
        return;
    }

    if (testResultDiv) testResultDiv.innerHTML = '<span style="color: #888;">Testing connection...</span>';

    try {
        // Call service which calls Cloud Function
        // Pass providerId so backend can use stored key if apiKey is empty
        const result = await window.LLMProviderService.testConnection({
            provider,
            apiKey,
            providerId: providerDocId,
            model
        });

        if (result.success) {
            if (testResultDiv) testResultDiv.innerHTML = `<span style="color: #22c55e;">✅ ${result.message} (${result.latency}ms)</span>`;
        } else {
            if (testResultDiv) testResultDiv.innerHTML = `<span style="color: #ef4444;">❌ ${result.message}</span>`;
        }
    } catch (error) {
        console.error("Test function error:", error);
        if (testResultDiv) testResultDiv.innerHTML = `<span style="color: #ef4444;">❌ Error: ${error.message}</span>`;
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
    // Load LLM Models and Policies when switching to LLM tab
    if (tabId === 'llm') {
        refreshLLMModels();
        refreshFeaturePolicies();
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

    const providerIcons = {
        openai: '🟢',
        anthropic: '🟣',
        gemini: '🔵'
    };

    tbody.innerHTML = llmModels.map(model => {
        // Calculate tier from credit rate
        const creditRate = model.creditPer1kTokens || 1.0;
        const tierInfo = getTierFromCreditRate(creditRate);
        const tierColor = tierInfo.color;
        const tierLabel = tierInfo.label;

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
            <td><span style="color: ${tierColor}; font-weight: 600; text-transform: uppercase; font-size: 11px;">${tierLabel}</span></td>
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
 * Calculate tier from credit rate
 */
function getTierFromCreditRate(rate) {
    if (rate < 1.0) return { tier: 'economy', color: '#10b981', label: 'ECONOMY' };
    if (rate < 2.0) return { tier: 'standard', color: '#eab308', label: 'STANDARD' };
    return { tier: 'premium', color: '#f43f5e', label: 'PREMIUM' };
}

/**
 * Update tier preview in modal
 */
window.updateTierPreview = function () {
    const rateInput = document.getElementById('llm-model-credit-rate');
    const tierPreview = document.getElementById('tier-preview');
    if (!rateInput || !tierPreview) return;

    const rate = parseFloat(rateInput.value) || 1.0;
    const { color, label } = getTierFromCreditRate(rate);

    tierPreview.textContent = label;
    tierPreview.style.background = color + '20';
    tierPreview.style.color = color;
    tierPreview.style.border = `1px solid ${color}`;
};

/**
 * Open LLM Model edit modal
 */
window.editLLMModel = function (modelId) {
    const model = llmModels.find(m => m.id === modelId);
    if (!model) {
        console.error('Model not found:', modelId);
        return;
    }

    const modal = document.getElementById('llm-model-modal');
    if (!modal) return;

    // Populate form fields
    document.getElementById('llm-model-doc-id').value = model.id;
    document.getElementById('llm-model-modal-title').textContent = `Edit: ${model.displayName}`;
    document.getElementById('llm-model-display-name').value = model.displayName || '';
    document.getElementById('llm-model-input-cost').textContent = `$${model.costPer1kInputTokens?.toFixed(4) || '0.0000'}`;
    document.getElementById('llm-model-output-cost').textContent = `$${model.costPer1kOutputTokens?.toFixed(4) || '0.0000'}`;
    document.getElementById('llm-model-credit-rate').value = model.creditPer1kTokens?.toFixed(1) || '1.0';
    document.getElementById('llm-model-status').value = model.isActive ? 'true' : 'false';

    // Update tier preview
    window.updateTierPreview();

    // Show modal
    modal.classList.add('open');
    modal.style.display = 'flex';
};

/**
 * Close LLM Model modal
 */
window.closeLLMModelModal = function () {
    const modal = document.getElementById('llm-model-modal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
    }
};

/**
 * Save LLM Model changes
 */
window.saveLLMModel = async function () {
    const modelId = document.getElementById('llm-model-doc-id').value;
    const displayName = document.getElementById('llm-model-display-name').value.trim();
    const creditRate = parseFloat(document.getElementById('llm-model-credit-rate').value);
    const isActive = document.getElementById('llm-model-status').value === 'true';

    if (!modelId || !displayName) {
        alert('Please fill in all required fields');
        return;
    }

    if (isNaN(creditRate) || creditRate < 0.1 || creditRate > 10) {
        alert('Credit Rate must be between 0.1 and 10.0');
        return;
    }

    const saveBtn = document.getElementById('btn-save-llm-model');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }

    try {
        const db = firebase.firestore();
        const { tier } = getTierFromCreditRate(creditRate);

        await db.collection('systemLLMModels').doc(modelId).update({
            displayName: displayName,
            creditPer1kTokens: creditRate,
            tier: tier,
            isActive: isActive,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('[LLM Model] Updated:', modelId);
        window.closeLLMModelModal();
        await window.refreshLLMModels();

    } catch (error) {
        console.error('[LLM Model] Save error:', error);
        alert('Error saving model: ' + error.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }
};

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

// Auto-load LLM Models and Feature Policies when System tab is shown
// LLM Auto-load simplified via main switchSettingsTab logic


/**
 * Seed LLM Models & Router Data
 * Adds standard models including Gemini 3.0 Pro, GPT-4o, Claude 3.5 Sonnet
 */
window.seedLLMRouterData = async function () {
    if (!confirm('This will reset/update the LLM Models catalog. Existing custom settings might be overwritten. Continue?')) {
        return;
    }

    try {
        const db = firebase.firestore();
        const batch = db.batch();

        const models = [
            // --- Google Gemini (Image/Video) ---
            {
                id: 'nano-banana-pro-preview',
                provider: 'gemini',
                modelId: 'nano-banana-pro-preview',
                displayName: 'Nano Banana Pro (Preview)',
                tier: 'premium',
                creditPer1kTokens: 5.0,
                costPer1kInputTokens: 0.0100,
                costPer1kOutputTokens: 0.0400,
                maxContextTokens: 0,
                isActive: true,
                codeReady: true
            },
            {
                id: 'veo-3.0-fast-generate-001',
                provider: 'gemini', // or 'google_veo' based on router, but usually grouped
                modelId: 'veo-3.0-fast-generate-001',
                displayName: 'Veo 3.0 Fast',
                tier: 'premium',
                creditPer1kTokens: 10.0,
                costPer1kInputTokens: 0,
                costPer1kOutputTokens: 0, // Video pricing varies
                maxContextTokens: 0,
                isActive: true,
                codeReady: true
            },
            {
                id: 'veo-3.1-fast-generate-preview',
                provider: 'gemini',
                modelId: 'veo-3.1-fast-generate-preview',
                displayName: 'Veo 3.1 Fast (Preview)',
                tier: 'premium',
                creditPer1kTokens: 10.0,
                costPer1kInputTokens: 0,
                costPer1kOutputTokens: 0,
                maxContextTokens: 0,
                isActive: true,
                codeReady: true
            },
            {
                id: 'gemini-3-pro-preview',
                provider: 'gemini',
                modelId: 'gemini-3-pro-preview',
                displayName: 'Gemini 3.0 Pro (Preview)',
                tier: 'premium',
                creditPer1kTokens: 3.0,
                costPer1kInputTokens: 0.0025,
                costPer1kOutputTokens: 0.0100,
                maxContextTokens: 2000000,
                isActive: true,
                codeReady: true
            },
            {
                id: 'gemini-2.5-pro',
                provider: 'gemini',
                modelId: 'gemini-2.5-pro',
                displayName: 'Gemini 2.5 Pro (Boost)',
                tier: 'standard', // High standard or Premium
                creditPer1kTokens: 2.0,
                costPer1kInputTokens: 0.00125,
                costPer1kOutputTokens: 0.00375,
                maxContextTokens: 2000000,
                isActive: true,
                codeReady: true
            },
            {
                id: 'gemini-2.5-flash',
                provider: 'gemini',
                modelId: 'gemini-2.5-flash',
                displayName: 'Gemini 2.5 Flash',
                tier: 'economy',
                creditPer1kTokens: 0.2,
                costPer1kInputTokens: 0.0001, // Very cheap
                costPer1kOutputTokens: 0.0004,
                maxContextTokens: 1000000,
                isActive: true,
                codeReady: true
            },
            {
                id: 'gemini-2.0-flash-exp',
                provider: 'gemini',
                modelId: 'gemini-2.0-flash-exp',
                displayName: 'Gemini 2.0 Flash (Exp)',
                tier: 'economy',
                creditPer1kTokens: 0.1,
                costPer1kInputTokens: 0,
                costPer1kOutputTokens: 0,
                maxContextTokens: 1000000,
                isActive: true,
                codeReady: true
            },

            // --- OpenAI ---
            {
                id: 'gpt-5.2-pro',
                provider: 'openai',
                modelId: 'gpt-5.2-pro',
                displayName: 'GPT-5.2 Pro',
                tier: 'premium',
                creditPer1kTokens: 5.0,
                costPer1kInputTokens: 0.03,
                costPer1kOutputTokens: 0.06,
                maxContextTokens: 200000,
                isActive: true,
                codeReady: false
            },
            {
                id: 'gpt-5.1',
                provider: 'openai',
                modelId: 'gpt-5.1',
                displayName: 'GPT-5.1',
                tier: 'standard',
                creditPer1kTokens: 2.0,
                costPer1kInputTokens: 0.01,
                costPer1kOutputTokens: 0.02,
                maxContextTokens: 128000,
                isActive: true,
                codeReady: false
            },
            {
                id: 'sora-2-pro',
                provider: 'openai',
                modelId: 'sora-2-pro',
                displayName: 'Sora 2.0 Pro',
                tier: 'premium',
                creditPer1kTokens: 20.0,
                costPer1kInputTokens: 0,
                costPer1kOutputTokens: 0,
                maxContextTokens: 0,
                isActive: true,
                codeReady: false
            },
            {
                id: 'sora-2',
                provider: 'openai',
                modelId: 'sora-2',
                displayName: 'Sora 2.0',
                tier: 'standard',
                creditPer1kTokens: 10.0,
                costPer1kInputTokens: 0,
                costPer1kOutputTokens: 0,
                maxContextTokens: 0,
                isActive: true,
                codeReady: false
            },
            {
                id: 'gpt-4o',
                provider: 'openai',
                modelId: 'gpt-4o',
                displayName: 'GPT-4o',
                tier: 'standard',
                creditPer1kTokens: 1.5,
                costPer1kInputTokens: 0.0025,
                costPer1kOutputTokens: 0.0100,
                maxContextTokens: 128000,
                isActive: true,
                codeReady: true
            },
            {
                id: 'gpt-4o-mini',
                provider: 'openai',
                modelId: 'gpt-4o-mini',
                displayName: 'GPT-4o Mini',
                tier: 'economy',
                creditPer1kTokens: 0.2,
                costPer1kInputTokens: 0.00015,
                costPer1kOutputTokens: 0.0006,
                maxContextTokens: 128000,
                isActive: true,
                codeReady: false
            },

            // --- Anthropic ---
            {
                id: 'claude-3-5-sonnet-20241022',
                provider: 'anthropic',
                modelId: 'claude-3-5-sonnet-20241022',
                displayName: 'Claude 3.5 Sonnet (New)',
                tier: 'standard',
                creditPer1kTokens: 1.5,
                costPer1kInputTokens: 0.003,
                costPer1kOutputTokens: 0.015,
                maxContextTokens: 200000,
                isActive: true,
                codeReady: true
            },
            {
                id: 'claude-3-opus',
                provider: 'anthropic',
                modelId: 'claude-3-opus-20240229',
                displayName: 'Claude 3 Opus (Premium)',
                tier: 'premium',
                creditPer1kTokens: 5.0,
                costPer1kInputTokens: 0.015,
                costPer1kOutputTokens: 0.075,
                maxContextTokens: 200000,
                isActive: true,
                codeReady: true
            }
        ];

        models.forEach(model => {
            const docRef = db.collection('systemLLMModels').doc(model.id);
            batch.set(docRef, { ...model, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        });

        await batch.commit();
        alert('✅ LLM Models seeded successfully! Gemini 3.0 & Nano Banana added.');
        refreshLLMModels();
    } catch (error) {
        console.error('Error seeding LLM models:', error);
        alert('Error: ' + error.message);
    }
};

// ============================================
// GLOBAL ROUTING DEFAULTS
// ============================================

window.loadGlobalDefaults = async function () {
    try {
        if (!firebase.apps.length) return;

        // Ensure models are loaded for dropdowns
        if (!llmModels || llmModels.length === 0) {
            await refreshLLMModels();
        }

        const db = firebase.firestore();
        const doc = await db.collection('systemSettings').doc('llmConfig').get();
        let config = {};

        if (doc.exists && doc.data().defaultModels) {
            config = doc.data().defaultModels;
        }

        renderGlobalDefaultsUI(config);
    } catch (error) {
        console.error('Error loading global defaults:', error);
    }
};

function renderGlobalDefaultsUI(config) {
    const container = document.getElementById('global-defaults-wrapper');
    if (!container) return;

    // Define Sections with Content Type Specifics
    const sections = [
        {
            id: 'text', icon: '📝', title: 'LLM (Text Generation)',
            models: llmModels.map(m => ({ id: m.modelId, name: m.displayName })),
            defaultProvider: 'google', defaultModel: 'gemini-1.5-pro'
        },
        {
            id: 'image', icon: '🎨', title: 'Image Generation',
            models: [
                { id: 'dall-e-3', name: 'DALL-E 3' },
                { id: 'imagen-3', name: 'Google Imagen 3' },
                { id: 'nano-banana-pro-preview', name: 'Nano Banana Pro (Preview)' },
                { id: 'flux-pro', name: 'Flux Pro' },
                { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL' }
            ],
            defaultProvider: 'openai', defaultModel: 'dall-e-3'
        },
        {
            id: 'video', icon: '🎥', title: 'Video Generation',
            models: [
                { id: 'runway-gen-3', name: 'Runway Gen-3' },
                { id: 'luma-dream-machine', name: 'Luma Dream Machine' },
                { id: 'sora-preview', name: 'Sora (Preview)' },
                { id: 'sora-2', name: 'Sora 2.0' },
                { id: 'sora-2-pro', name: 'Sora 2.0 Pro' },
                { id: 'veo-3.0-fast-generate-001', name: 'Veo 3.0 Fast' },
                { id: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast (Preview)' }
            ],
            defaultProvider: 'runway', defaultModel: 'runway-gen-3'
        }
    ];

    let html = '';

    sections.forEach(sec => {
        // Fallback Logic: Try config[id] -> config (legacy root) -> Defaults
        const secConfig = config[sec.id] || (sec.id === 'text' ? config : {}) || {};
        const def = secConfig.default || { provider: sec.defaultProvider, model: sec.defaultModel };
        const boost = secConfig.boost || { provider: sec.defaultProvider, model: sec.defaultModel };

        // Provider Options (Dynamic per section)
        let providerOptions = `
            <option value="google" ${def.provider === 'google' ? 'selected' : ''}>Google Gemini</option>
            <option value="openai" ${def.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
            <option value="anthropic" ${def.provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
            <option value="replicate" ${def.provider === 'replicate' ? 'selected' : ''}>Replicate</option>
            <option value="runway" ${def.provider === 'runway' ? 'selected' : ''}>Runway</option>
        `;

        // Special handling for Video Providers
        if (sec.id === 'video') {
            providerOptions += `<option value="google_veo" ${def.provider === 'google_veo' ? 'selected' : ''}>Google Veo</option>`;
            providerOptions += `<option value="openai_sora" ${def.provider === 'openai_sora' ? 'selected' : ''}>OpenAI SORA</option>`;
        }
        // Special handling for Image Providers (Add Nano Banana if distinct from Gemini)
        if (sec.id === 'image') {
            providerOptions += `<option value="google_nano" ${def.provider === 'google_nano' ? 'selected' : ''}>Google Nano Banana</option>`;
        }

        const boostProviderOptions = providerOptions.replace(`value="${def.provider}" selected`, `value="${def.provider}"`).replace(`value="${boost.provider}"`, `value="${boost.provider}" selected`);


        html += `
        <div style="margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); border-radius: 8px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                <span style="font-size: 20px;">${sec.icon}</span>
                <h5 style="margin: 0; color: #fff; font-size: 14px;">${sec.title}</h5>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <!-- Standard Tier -->
                <div>
                     <div style="margin-bottom: 8px; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Standard Tier (Default)</div>
                     <div style="display: grid; gap: 10px;">
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 4px;">Provider</label>
                            <select id="${sec.id}-def-provider" class="admin-input">
                                ${providerOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 4px;">Model</label>
                            <select id="${sec.id}-def-model" class="admin-input">
                                ${sec.models.map(m => `<option value="${m.id}" ${m.id === def.model ? 'selected' : ''}>${m.name}</option>`).join('')}
                            </select>
                        </div>
                     </div>
                </div>

                <!-- Boost Tier -->
                <div>
                     <div style="margin-bottom: 8px; font-size: 11px; color: #818cf8; font-weight: 600; text-transform: uppercase;">Premium Tier (Boost) 🚀</div>
                     <div style="display: grid; gap: 10px;">
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 4px;">Provider</label>
                            <select id="${sec.id}-boost-provider" class="admin-input">
                                ${boostProviderOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 4px;">Model</label>
                            <select id="${sec.id}-boost-model" class="admin-input">
                                ${sec.models.map(m => `<option value="${m.id}" ${m.id === boost.model ? 'selected' : ''}>${m.name}</option>`).join('')}
                            </select>
                        </div>
                     </div>
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
}

window.saveGlobalDefaults = async function () {
    const db = firebase.firestore();
    const saveBtn = document.querySelector('button[onclick="saveGlobalDefaults()"]');

    if (saveBtn) {
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
    }

    // Helper to get values
    const getVal = (id) => document.getElementById(id)?.value;

    const textConfig = {
        default: { provider: getVal('text-def-provider'), model: getVal('text-def-model'), creditMultiplier: 1.0 },
        boost: { provider: getVal('text-boost-provider'), model: getVal('text-boost-model'), creditMultiplier: 3.0 }
    };
    const imageConfig = {
        default: { provider: getVal('image-def-provider'), model: getVal('image-def-model'), creditMultiplier: 2.0 },
        boost: { provider: getVal('image-boost-provider'), model: getVal('image-boost-model'), creditMultiplier: 5.0 }
    };
    const videoConfig = {
        default: { provider: getVal('video-def-provider'), model: getVal('video-def-model'), creditMultiplier: 5.0 },
        boost: { provider: getVal('video-boost-provider'), model: getVal('video-boost-model'), creditMultiplier: 10.0 }
    };

    try {
        await db.collection('systemSettings').doc('llmConfig').set({
            defaultModels: {
                text: textConfig,
                image: imageConfig,
                video: videoConfig,
                // Backward Compatibility for existing Router (Text)
                default: textConfig.default,
                boost: textConfig.boost
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showCustomModal('Success', 'Global routing defaults updated successfully!', 'success');
    } catch (error) {
        showCustomModal('Error', 'Error saving defaults: ' + error.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.textContent = 'Save Defaults';
            saveBtn.disabled = false;
        }
    }
};

window.updateModelOptions = function (tier) {
    // Optional: Could be used to update placeholders based on provider selection
};

// ============================================
// CUSTOM MODAL UTILITY
// ============================================

window.showCustomModal = function (title, message, type = 'info') {
    // Remove existing if any
    const existing = document.getElementById('custom-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: '9999',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)', opacity: '0', transition: 'opacity 0.2s'
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
        backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px',
        maxWidth: '400px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)', transform: 'scale(0.95)', transition: 'transform 0.2s'
    });

    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
    const titleColor = type === 'success' ? '#22c55e' : (type === 'error' ? '#ef4444' : '#fff');
    const btnColor = type === 'success' ? '#16e0bd' : (type === 'error' ? '#ef4444' : '#64748b');
    const btnTextColor = type === 'success' ? '#0f172a' : '#fff';

    modal.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 36px; margin-bottom: 12px;">${icon}</div>
            <h3 style="color: ${titleColor}; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">${title}</h3>
            <p style="color: rgba(255, 255, 255, 0.8); margin: 0; line-height: 1.5; font-size: 14px;">${message}</p>
        </div>
        <div style="display: flex; justify-content: center;">
            <button id="modal-ok-btn" style="
                background: ${btnColor}; 
                color: ${btnTextColor};
                border: none; padding: 10px 32px; border-radius: 6px; 
                font-weight: 600; font-size: 14px; cursor: pointer; 
                transition: transform 0.1s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);">
                OK
            </button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Button Hover Effect
    const btn = overlay.querySelector('#modal-ok-btn');
    btn.onmouseover = () => btn.style.filter = 'brightness(1.1)';
    btn.onmouseout = () => btn.style.filter = 'brightness(1)';
    btn.onmousedown = () => btn.style.transform = 'scale(0.95)';
    btn.onmouseup = () => btn.style.transform = 'scale(1)';

    // Animation In
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
    });

    // Close Handler
    const close = () => {
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        setTimeout(() => overlay.remove(), 200);
    };

    btn.onclick = close;
    overlay.onclick = (e) => {
        if (e.target === overlay) close();
    };

    // Auto Close Success after 3s (Optional, user said previous one was too fast, keep this one manual or long delay)
    // if (type === 'success') setTimeout(close, 3000);
};
