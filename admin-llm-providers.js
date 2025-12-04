// admin-llm-providers.js
// Logic for LLM Providers Page

window.initLlmProviders = function () {
    console.log("[AdminLLMProviders] Initializing...");

    let providers = [];
    const tableBody = document.getElementById('llm-providers-table-body');
    const modal = document.getElementById('llm-provider-modal');
    const form = document.getElementById('llm-provider-form');
    const testResultDiv = document.getElementById('connection-test-result');

    // --- Initialization ---

    async function init() {
        if (!window.LLMProviderService) {
            console.error("LLMProviderService not found!");
            tableBody.innerHTML = '<tr><td colspan="6" style="color: red; text-align: center;">Error: Service not loaded</td></tr>';
            return;
        }

        setupEventListeners();
        await loadProviders();
    }

    function setupEventListeners() {
        document.getElementById('btn-add-provider').addEventListener('click', () => openModal());
        document.getElementById('btn-save-provider').addEventListener('click', saveProvider);
        document.getElementById('btn-test-connection').addEventListener('click', testConnection);
    }

    // --- Data Loading ---

    async function loadProviders() {
        try {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading providers...</td></tr>';

            providers = await window.LLMProviderService.getProviders();
            renderTable();
        } catch (error) {
            console.error("Error loading providers:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="color: red; text-align: center;">Error: ${error.message}</td></tr>`;
        }
    }

    function renderTable() {
        if (providers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No LLM providers configured yet.</td></tr>';
            return;
        }

        tableBody.innerHTML = providers.map(p => `
            <tr>
                <td>
                    <strong style="color: #16e0bd;">${p.name}</strong>
                    ${p.description ? `<div style="font-size: 11px; color: #888;">${p.description}</div>` : ''}
                </td>
                <td>${capitalize(p.provider)}</td>
                <td>${getStatusBadge(p.status)}</td>
                <td>
                    <div style="font-size: 12px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.models?.join(', ')}">
                        ${p.models?.join(', ') || '-'}
                    </div>
                </td>
                <td style="font-size: 12px; color: #888;">
                    ${formatDate(p.updatedAt)}
                </td>
                <td>
                    <button class="admin-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="editProvider('${p.id}')">Edit</button>
                </td>
            </tr>
        `).join('');
    }

    // --- Modal & Actions ---

    window.openModal = function (providerId = null) {
        form.reset();
        document.getElementById('provider-doc-id').value = '';
        document.getElementById('connection-test-result').innerHTML = '';

        if (providerId) {
            const p = providers.find(item => item.id === providerId);
            if (p) {
                document.getElementById('modal-title').textContent = 'Edit LLM Provider';
                document.getElementById('provider-doc-id').value = p.id;
                document.getElementById('provider-type').value = p.provider;
                document.getElementById('provider-name').value = p.name;
                document.getElementById('provider-models').value = p.models?.join(', ') || '';
                document.getElementById('provider-status').value = p.status;

                // Masked API Key placeholder
                document.getElementById('provider-api-key').placeholder = "Leave blank to keep existing key";
                document.getElementById('provider-api-key').required = false;
            }
        } else {
            document.getElementById('modal-title').textContent = 'Add LLM Provider';
            document.getElementById('provider-api-key').placeholder = "sk-...";
            document.getElementById('provider-api-key').required = true;
            document.getElementById('provider-status').value = 'active';
        }

        modal.style.display = 'flex';
    };

    window.closeProviderModal = function () {
        modal.style.display = 'none';
    };

    window.editProvider = function (id) {
        openModal(id);
    };

    async function saveProvider(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-save-provider');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const id = document.getElementById('provider-doc-id').value;
            const apiKeyInput = document.getElementById('provider-api-key');

            const data = {
                provider: document.getElementById('provider-type').value,
                name: document.getElementById('provider-name').value,
                models: document.getElementById('provider-models').value.split(',').map(s => s.trim()).filter(s => s),
                status: document.getElementById('provider-status').value
            };

            // Only update API key if entered (or if creating new)
            if (apiKeyInput.value) {
                data.credentialRef = {
                    storageType: 'direct',
                    apiKeyMasked: maskApiKey(apiKeyInput.value),
                    // In a real app, encrypt this! For now, storing as is but intended for admin-only DB.
                    apiKeyEncrypted: apiKeyInput.value
                };
            } else if (!id) {
                throw new Error("API Key is required for new provider");
            }

            await window.LLMProviderService.saveProvider(id || null, data);

            closeProviderModal();
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
        const apiKey = document.getElementById('provider-api-key').value;
        const provider = document.getElementById('provider-type').value;
        const modelsStr = document.getElementById('provider-models').value;
        const model = modelsStr.split(',')[0]?.trim() || 'gpt-4o-mini';

        if (!apiKey) {
            // If editing and field is empty, we can't test without re-entering key in this client-side impl
            // unless we fetch the stored key (which we shouldn't expose back to UI).
            // So for now, require re-entry to test.
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

    // --- Helpers ---

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

    function formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
    }

    // Initialize
    init();
};
