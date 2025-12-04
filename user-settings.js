// user-settings.js

document.addEventListener("DOMContentLoaded", () => {
    // Auth Check
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            initSettings(user);
        } else {
            window.location.href = "index.html";
        }
    });
});

let currentUser = null;
let credentials = [];

function initSettings(user) {
    currentUser = user;
    console.log("Settings initialized for user:", user.email);

    // Load credentials
    loadCredentials();

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    const addBtn = document.getElementById('btn-add-credential');
    const testBtn = document.getElementById('btn-test-credential');
    const form = document.getElementById('credential-form');

    if (addBtn) addBtn.addEventListener('click', () => openCredentialModal());
    if (testBtn) testBtn.addEventListener('click', testCredential);
    if (form) form.addEventListener('submit', saveCredential);
}

async function loadCredentials() {
    if (!currentUser) return;

    try {
        credentials = await window.ChannelCredentialService.getCredentials(currentUser.uid);
        renderCredentialsTable();
    } catch (error) {
        console.error('Error loading credentials:', error);
        alert('Error loading credentials: ' + error.message);
    }
}

function renderCredentialsTable() {
    const tbody = document.getElementById('credentials-table-body');
    if (!tbody) return;

    if (credentials.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 60px; color: rgba(255,255,255,0.5);">
                    No channel connections yet. Click "Add Channel" to get started.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = credentials.map(cred => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${getProviderIcon(cred.provider)}
                    <strong>${getProviderName(cred.provider)}</strong>
                </div>
            </td>
            <td>
                <div>${cred.accountName}</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${cred.accountHandle}</div>
            </td>
            <td>${getStatusBadge(cred.status)}</td>
            <td style="font-size: 12px; color: rgba(255,255,255,0.5);">
                ${cred.lastTested ? formatDate(cred.lastTested) : 'Never'}
            </td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="admin-btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editCredential('${cred.id}')">
                        Edit
                    </button>
                    <button class="admin-btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="deleteCredential('${cred.id}')">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getProviderIcon(provider) {
    const icons = {
        x: '𝕏',
        instagram: '📷',
        youtube: '▶️',
        linkedin: '💼',
        tiktok: '🎵'
    };
    return icons[provider] || '🔗';
}

function getProviderName(provider) {
    const names = {
        x: 'X (Twitter)',
        instagram: 'Instagram',
        youtube: 'YouTube',
        linkedin: 'LinkedIn',
        tiktok: 'TikTok'
    };
    return names[provider] || provider;
}

function getStatusBadge(status) {
    const colors = {
        active: '#22c55e',
        error: '#ef4444',
        disabled: '#94a3b8'
    };
    const color = colors[status] || '#94a3b8';
    return `<span style="border: 1px solid ${color}; color: ${color}; padding: 2px 8px; border-radius: 12px; font-size: 11px; text-transform: capitalize;">${status}</span>`;
}

function formatDate(timestamp) {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
}

// Modal Management
window.openCredentialModal = function (credentialId = null) {
    const modal = document.getElementById('credential-modal');
    const form = document.getElementById('credential-form');
    const title = document.getElementById('credential-modal-title');
    const testResult = document.getElementById('test-connection-result');

    form.reset();
    document.getElementById('credential-id').value = '';
    testResult.innerHTML = '';
    updateCredentialFields();

    if (credentialId) {
        const cred = credentials.find(c => c.id === credentialId);
        if (cred) {
            title.textContent = 'Edit Channel Connection';
            document.getElementById('credential-id').value = cred.id;
            document.getElementById('credential-provider').value = cred.provider;
            document.getElementById('credential-account-name').value = cred.accountName;
            document.getElementById('credential-account-handle').value = cred.accountHandle;

            updateCredentialFields();
            populateCredentialFields(cred.credentials);
        }
    } else {
        title.textContent = 'Add Channel Connection';
    }

    modal.classList.add('open');
};

window.closeCredentialModal = function () {
    const modal = document.getElementById('credential-modal');
    modal.classList.remove('open');
};

window.editCredential = function (id) {
    openCredentialModal(id);
};

window.deleteCredential = async function (id) {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
        await window.ChannelCredentialService.deleteCredential(id);
        await loadCredentials();
        alert('✅ Connection deleted successfully');
    } catch (error) {
        console.error('Error deleting credential:', error);
        alert('Error deleting connection: ' + error.message);
    }
};

// Dynamic Fields
window.updateCredentialFields = function () {
    const provider = document.getElementById('credential-provider').value;
    const container = document.getElementById('credential-fields-container');

    if (!provider) {
        container.innerHTML = '';
        return;
    }

    const fields = getProviderFields(provider);
    container.innerHTML = fields.map(field => `
        <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.8); font-size: 14px;">
                ${field.label}${field.required ? ' *' : ''}
            </label>
            <input 
                type="${field.type}" 
                id="cred-${field.key}" 
                class="admin-form-input" 
                placeholder="${field.placeholder}"
                ${field.required ? 'required' : ''}
            >
            ${field.help ? `<small style="color: rgba(255,255,255,0.5); font-size: 12px;">${field.help}</small>` : ''}
        </div>
    `).join('');
};

function getProviderFields(provider) {
    const fieldSets = {
        x: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter API Key', required: true },
            { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'Enter API Secret', required: false },
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
            { key: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', placeholder: 'Enter Token Secret', required: false }
        ],
        instagram: [
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
            { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'Enter Facebook Page ID', required: true, help: 'Facebook Page ID connected to Instagram' }
        ],
        youtube: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter YouTube API Key', required: true, help: 'From Google Cloud Console' }
        ],
        linkedin: [
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
            { key: 'urn', label: 'Organization URN', type: 'text', placeholder: 'urn:li:organization:12345', required: false }
        ],
        tiktok: [
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
            { key: 'clientKey', label: 'Client Key', type: 'text', placeholder: 'Enter Client Key', required: true }
        ]
    };

    return fieldSets[provider] || [];
}

function populateCredentialFields(credentials) {
    if (!credentials) return;

    Object.keys(credentials).forEach(key => {
        const input = document.getElementById(`cred-${key}`);
        if (input) {
            input.value = credentials[key];
        }
    });
}

function getCredentialFieldValues(provider) {
    const fields = getProviderFields(provider);
    const values = {};

    fields.forEach(field => {
        const input = document.getElementById(`cred-${field.key}`);
        if (input && input.value) {
            values[field.key] = input.value;
        }
    });

    return values;
}

// Test Connection
async function testCredential() {
    const provider = document.getElementById('credential-provider').value;
    const resultDiv = document.getElementById('test-connection-result');
    const btn = document.getElementById('btn-test-credential');

    if (!provider) {
        resultDiv.innerHTML = '<span style="color: #fbbf24;">⚠️ Please select a provider first</span>';
        return;
    }

    const credentials = getCredentialFieldValues(provider);

    btn.disabled = true;
    btn.textContent = 'Testing...';
    resultDiv.innerHTML = '<span style="color: #888;">Testing connection...</span>';

    try {
        const result = await window.ChannelCredentialService.testConnection(provider, credentials);

        if (result.success) {
            resultDiv.innerHTML = `<span style="color: #22c55e;">✅ ${result.message}</span>`;
        } else {
            resultDiv.innerHTML = `<span style="color: #ef4444;">❌ ${result.message}</span>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<span style="color: #ef4444;">❌ ${error.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Test Connection';
    }
}

// Save Credential
async function saveCredential(e) {
    e.preventDefault();

    const credentialId = document.getElementById('credential-id').value;
    const provider = document.getElementById('credential-provider').value;
    const accountName = document.getElementById('credential-account-name').value;
    const accountHandle = document.getElementById('credential-account-handle').value;
    const credentials = getCredentialFieldValues(provider);

    const data = {
        provider,
        accountName,
        accountHandle,
        credentials,
        status: 'active'
    };

    try {
        await window.ChannelCredentialService.saveCredential(
            currentUser.uid,
            credentialId || null,
            data
        );

        closeCredentialModal();
        await loadCredentials();
        alert('✅ Connection saved successfully');
    } catch (error) {
        console.error('Error saving credential:', error);
        alert('Error saving connection: ' + error.message);
    }
}

// Tab Switching
window.switchTab = function (tabName) {
    // Update Tab UI
    document.querySelectorAll('.settings-tab').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.tab === tabName) el.classList.add('active');
    });

    // Update Content Visibility
    document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
}
