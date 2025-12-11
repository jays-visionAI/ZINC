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

        // Load connected agent teams for each credential
        await loadConnectedTeamsForCredentials();

        renderCredentialsTable();
    } catch (error) {
        console.error('Error loading credentials:', error);
        alert('Error loading credentials: ' + error.message);
    }
}

// Helper: Load connected agent teams for all credentials
async function loadConnectedTeamsForCredentials() {
    const db = firebase.firestore();

    for (const cred of credentials) {
        try {
            if (!cred.projectId || !cred.provider) {
                cred.connectedTeams = [];
                continue;
            }

            const teamsSnapshot = await db.collection('projectAgentTeamInstances')
                .where('projectId', '==', cred.projectId)
                .get();

            const connectedTeams = [];

            teamsSnapshot.forEach(doc => {
                const teamData = doc.data();
                const channelBindings = teamData.channelBindings || {};

                if (channelBindings[cred.provider] === cred.id) {
                    connectedTeams.push({
                        id: doc.id,
                        name: teamData.name
                    });
                }
            });

            cred.connectedTeams = connectedTeams;

        } catch (error) {
            console.error(`Error loading teams for credential ${cred.id}:`, error);
            cred.connectedTeams = [];
        }
    }
}

function renderCredentialsTable() {
    const tbody = document.getElementById('credentials-table-body');
    if (!tbody) return;

    if (credentials.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 60px; color: rgba(255,255,255,0.5);">
                    No channel connections yet. Click "Add Channel" to get started.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = credentials.map(cred => {
        const connectedTeams = cred.connectedTeams || [];

        let agentTeamDisplay = '';
        if (connectedTeams.length === 0) {
            agentTeamDisplay = `
                <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.4);">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #6b7280;"></span>
                    Not connected
                </div>
            `;
        } else if (connectedTeams.length === 1) {
            agentTeamDisplay = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 4px #22c55e;"></span>
                    <span>${connectedTeams[0].name}</span>
                </div>
            `;
        } else {
            agentTeamDisplay = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${connectedTeams.map(team => `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 4px #22c55e;"></span>
                            <span style="font-size: 13px;">${team.name}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${getProviderIcon(cred.provider)}
                        <strong>${getProviderName(cred.provider)}</strong>
                    </div>
                </td>
                <td>
                    <div>${cred.detailedName || cred.accountName || 'Unnamed'}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${cred.accountHandle || ''}</div>
                </td>
                <td>${agentTeamDisplay}</td>
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
        `;
    }).join('');
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

// Channel Profile Cache (PRD 12.x)
let channelProfileMap = {};

// Provider Configuration (Field Specs only)
const PROVIDER_CONFIG = {
    x: {
        fields: [
            { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter API Key', required: true },
            { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'Enter API Secret', required: false },
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
            { key: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', placeholder: 'Enter Token Secret', required: false }
        ]
    },
    instagram: {
        fields: [
            { key: 'appId', label: 'App ID', type: 'text', placeholder: 'Facebook App ID', required: true },
            { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'Facebook App Secret', required: false },
            { key: 'accessToken', label: 'Access Token (Optional if using App Secret)', type: 'password', placeholder: 'Long-lived Access Token', required: false },
            { key: 'pageId', label: 'Instagram Business Account ID', type: 'text', placeholder: 'Instagram Account ID (not username)', required: true },
            { key: 'fbPageId', label: 'Connected Facebook Page ID', type: 'text', placeholder: 'Facebook Page ID', required: false }
        ]
    },
    youtube: {
        fields: [
            { key: 'clientId', label: 'Client ID (OAuth 2.0)', type: 'text', placeholder: 'Google Cloud Client ID', required: true },
            { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Google Cloud Client Secret', required: true },
            { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'OAuth Refresh Token', required: false, help: 'Required for offline access' },
            { key: 'apiKey', label: 'API Key (Public Data)', type: 'text', placeholder: 'Google Cloud API Key', required: false }
        ]
    },
    linkedin: {
        fields: [
            { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'LinkedIn App Client ID', required: true },
            { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'LinkedIn App Client Secret', required: true },
            { key: 'urn', label: 'Organization URN', type: 'text', placeholder: 'urn:li:organization:12345678', required: true, help: 'Found in LinkedIn Page URL' },
            { key: 'accessToken', label: 'Access Token (Optional)', type: 'password', placeholder: 'Pre-generated Access Token', required: false }
        ]
    },
    tiktok: {
        fields: [
            { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
            { key: 'clientKey', label: 'Client Key', type: 'text', placeholder: 'Enter Client Key', required: true }
        ]
    },
    facebook: {
        fields: [
            { key: 'appId', label: 'App ID', type: 'text', required: true },
            { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
            { key: 'pageId', label: 'Page ID', type: 'text', required: true },
            { key: 'accessToken', label: 'Access Token (Optional)', type: 'password', required: false }
        ]
    },
    naverBlog: {
        fields: [
            { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Naver Client ID', required: true },
            { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Naver Client Secret', required: true }
        ]
    },
    naverSmartStore: {
        fields: [
            { key: 'applicationId', label: 'Application ID', type: 'text', placeholder: 'Commerce API Application ID', required: true },
            { key: 'applicationSecret', label: 'Application Secret', type: 'password', placeholder: 'Commerce API Secret', required: true }
        ]
    },
    discord: { fields: [{ key: 'botToken', label: 'Bot Token', type: 'password', required: true }] },
    coupang: { fields: [{ key: 'accessKey', label: 'Access Key', type: 'text', required: true }, { key: 'secretKey', label: 'Secret Key', type: 'password', required: true }] },
    reddit: { fields: [{ key: 'clientId', label: 'Client ID', type: 'text', required: true }, { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true }] },
    kakaotalk: { fields: [{ key: 'apiKey', label: 'REST API Key', type: 'password', required: true }] },
    line: { fields: [{ key: 'channelAccessToken', label: 'Channel Access Token', type: 'password', required: true }] },
    telegram: { fields: [{ key: 'botToken', label: 'Bot Token', type: 'password', required: true }] },
    whatsapp: { fields: [{ key: 'accessToken', label: 'Access Token', type: 'password', required: true }] }
};

// Modal Management
window.openCredentialModal = async function (credentialId = null) {
    const modal = document.getElementById('credential-modal');
    const form = document.getElementById('credential-form');
    const title = document.getElementById('credential-modal-title');
    const testResult = document.getElementById('test-connection-result');
    const providerSelect = document.getElementById('credential-provider');

    form.reset();
    document.getElementById('credential-id').value = '';
    testResult.innerHTML = '';

    // Reset provider select
    providerSelect.innerHTML = '<option value="">Loading channels...</option>';

    // Fallback channel list (used if Firestore fails)
    const FALLBACK_CHANNELS = [
        { key: 'instagram', displayName: 'Instagram', order: 1 },
        { key: 'x', displayName: 'X (Twitter)', order: 2 },
        { key: 'facebook', displayName: 'Facebook', order: 3 },
        { key: 'linkedin', displayName: 'LinkedIn', order: 4 },
        { key: 'youtube', displayName: 'YouTube', order: 5 },
        { key: 'tiktok', displayName: 'TikTok', order: 6 },
        { key: 'discord', displayName: 'Discord', order: 7 },
        { key: 'naver_blog', displayName: 'Naver Blog', order: 8 },
        { key: 'reddit', displayName: 'Reddit', order: 9 },
        { key: 'kakaotalk', displayName: 'KakaoTalk', order: 10 },
        { key: 'line', displayName: 'Line', order: 11 },
        { key: 'telegram', displayName: 'Telegram', order: 12 },
        { key: 'whatsapp', displayName: 'WhatsApp', order: 13 },
        { key: 'naver_smartstore', displayName: 'Naver Smart Store', order: 14 },
        { key: 'coupang', displayName: 'Coupang', order: 15 }
    ];

    let channels = [];

    try {
        // Try to fetch from Firestore first
        const snapshot = await db.collection('channelProfiles').get();

        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            // Cache in channelProfileMap (PRD 12.x)
            channelProfileMap[data.key] = data;

            if (data.supportsApiConnection !== false && data.status !== 'inactive') {
                channels.push(data);
            }
        });

        if (channels.length > 0) {
            channels.sort((a, b) => (a.order || 0) - (b.order || 0));
            console.log(`Loaded ${channels.length} channels from Firestore`);
        } else {
            console.log('Firestore returned empty, using fallback channels');
            channels = FALLBACK_CHANNELS;
            // Cache fallback channels too
            FALLBACK_CHANNELS.forEach(ch => {
                channelProfileMap[ch.key] = { ...ch, apiCredentialConfig: null };
            });
        }
    } catch (error) {
        console.warn("Firestore error, using fallback channels:", error.message);
        channels = FALLBACK_CHANNELS;
        // Cache fallback channels
        FALLBACK_CHANNELS.forEach(ch => {
            channelProfileMap[ch.key] = { ...ch, apiCredentialConfig: null };
        });
    }

    // Populate dropdown
    providerSelect.innerHTML = '<option value="">Select a provider...</option>';
    channels.forEach(data => {
        const option = document.createElement('option');
        option.value = data.key;
        option.textContent = data.displayName || data.name || data.key; // Fallback chain
        providerSelect.appendChild(option);
        console.log(`Added channel: ${data.key} - ${option.textContent}`);
    });

    // Load user's projects
    await loadUserProjects();

    updateCredentialFields();

    if (credentialId) {
        const cred = credentials.find(c => c.id === credentialId);
        if (cred) {
            title.textContent = 'Edit Channel Connection';
            document.getElementById('credential-id').value = cred.id;
            document.getElementById('credential-provider').value = cred.provider;
            document.getElementById('credential-account-name').value = cred.detailedName || cred.accountName || '';

            // Set project if available
            if (cred.projectId) {
                document.getElementById('credential-project').value = cred.projectId;
                await loadAgentTeamsForBinding();
            }

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
    showConfirmModal(
        'Delete Connection',
        'Are you sure you want to delete this connection?\n\nThis action cannot be undone.',
        async () => {
            try {
                await window.ChannelCredentialService.deleteCredential(id);
                await loadCredentials();
                showAlertModal('Deleted', 'Connection deleted successfully', null, { type: 'success' });
            } catch (error) {
                console.error('Error deleting credential:', error);
                showAlertModal('Error', 'Error deleting connection: ' + error.message, null, { type: 'error' });
            }
        },
        {
            confirmText: 'Delete',
            confirmStyle: 'danger'
        }
    );
};

// Dynamic Fields
window.updateCredentialFields = function () {
    const provider = document.getElementById('credential-provider').value;
    const container = document.getElementById('credential-fields-container');

    console.log('updateCredentialFields called, provider:', provider);
    console.log('Container element:', container);

    if (!provider) {
        container.innerHTML = '';
        return;
    }

    const fields = getProviderFields(provider);
    console.log('Fields for provider:', fields);

    container.innerHTML = fields.map(field => `
        <div class="form-group" style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: rgba(255,255,255,0.8); font-size: 14px;">
                ${field.label}${field.required ? ' *' : ''}
            </label>
            <input 
                type="${field.type}" 
                id="cred-${field.key}" 
                class="admin-form-input" 
                placeholder="${field.placeholder || ''}"
                ${field.required ? 'required' : ''}
            >
            ${field.help ? `<small style="color: rgba(255,255,255,0.5); font-size: 12px;">${field.help}</small>` : ''}
        </div>
    `).join('');

    console.log('Fields rendered:', fields.length);
};

function getProviderFields(provider) {
    // PRD 12.x: Check Channel Profile first
    const profile = channelProfileMap[provider];
    if (profile && profile.apiCredentialConfig && Array.isArray(profile.apiCredentialConfig.fields)) {
        console.log(`Using apiCredentialConfig from Channel Profile for: ${provider}`);
        return profile.apiCredentialConfig.fields;
    }

    // Fallback: Use PROVIDER_CONFIG
    console.log(`Using PROVIDER_CONFIG fallback for: ${provider}`);
    return PROVIDER_CONFIG[provider]?.fields || [];
}

let lastTestResult = null; // Store last test result

// Helper: Get values from dynamic fields with validation
function getCredentialFieldValues(provider, options = { validate: false }) {
    const fields = getProviderFields(provider);
    const values = {};
    let hasError = false;

    fields.forEach(field => {
        const input = document.getElementById(`cred-${field.key}`);

        if (!input) {
            console.warn('Missing input element for field:', field.key);
            return;
        }

        const value = (input.value || '').trim();

        // Reset error style
        input.classList.remove('input-error');

        if (options.validate && field.required && !value) {
            hasError = true;
            input.classList.add('input-error');
        }

        if (value) {
            values[field.key] = value;
        }
    });

    if (options.validate && hasError) {
        throw new Error('Please fill in all required credential fields.');
    }

    return values;
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

// Test Credential
async function testCredential() {
    const providerEl = document.getElementById('credential-provider');
    const resultDiv = document.getElementById('test-connection-result');
    const btn = document.getElementById('btn-test-credential');

    if (!providerEl) {
        console.error('Provider select not found');
        resultDiv.innerHTML = '<span style="color: #ef4444;">Internal Error: Provider element not found.</span>';
        return;
    }

    const provider = providerEl.value;

    if (!provider) {
        resultDiv.innerHTML = '<span style="color: #fbbf24;">⚠️ Please select a provider first.</span>';
        return;
    }

    let credentialValues;
    try {
        // Validate fields
        credentialValues = getCredentialFieldValues(provider, { validate: true });
    } catch (validationError) {
        resultDiv.innerHTML = `<span style="color: #fbbf24;">⚠️ ${validationError.message}</span>`;
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Testing...';
    resultDiv.innerHTML = '<span style="color: #888;">🔄 Step 1: Validating format...</span>';

    try {
        const result = await window.ChannelCredentialService.testConnection(provider, credentialValues);

        lastTestResult = result; // Save result for saveCredential

        // Build multi-line result display
        let resultHtml = '';

        // Step 1 result
        if (result.step1?.success) {
            resultHtml += `<div style="color: #22c55e; margin-bottom: 4px;">${result.step1.message}</div>`;
        } else {
            resultHtml += `<div style="color: #ef4444; margin-bottom: 4px;">${result.step1?.message || '❌ Step 1: Format check failed'}</div>`;
        }

        // Step 2 result
        if (result.step2) {
            if (result.step2.success) {
                resultHtml += `<div style="color: #22c55e; margin-bottom: 4px;">${result.step2.message}</div>`;

                // Show account info if available
                if (result.accountInfo) {
                    const info = result.accountInfo;
                    resultHtml += `<div style="color: #3b82f6; margin-top: 8px; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.2);">
                        <strong>🎉 Account Connected:</strong><br>
                        <span style="font-size: 16px; font-weight: 600;">${info.handle}</span> (${info.name})
                    </div>`;

                    // Store account info for saving
                    lastTestResult.accountHandle = info.handle;
                    lastTestResult.accountName = info.name;
                    lastTestResult.accountUsername = info.username;
                    lastTestResult.profileImageUrl = info.profileImageUrl;
                }
            } else {
                resultHtml += `<div style="color: #f59e0b;">${result.step2.message}</div>`;
            }
        }

        resultDiv.innerHTML = resultHtml;

    } catch (error) {
        lastTestResult = { success: false, message: error.message };
        resultDiv.innerHTML = `<span style="color: #ef4444;">${error.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Test Connection';
    }
}

// Save Credential
// Save Credential
async function saveCredential(e) {
    e.preventDefault();

    try {
        const idEl = document.getElementById('credential-id');
        const providerEl = document.getElementById('credential-provider');
        const nameEl = document.getElementById('credential-account-name');

        if (!providerEl || !nameEl) {
            throw new Error('Internal Error: Form elements not found.');
        }

        const credentialId = idEl ? idEl.value : '';
        const provider = providerEl.value.trim();
        const accountName = nameEl.value.trim();

        if (!provider) {
            throw new Error('Please select a provider.');
        }
        if (!accountName) {
            throw new Error('Please enter an Account Name.');
        }

        // Dynamic fields + validation
        const credentials = getCredentialFieldValues(provider, { validate: true });

        // Get project and agent team
        const projectId = document.getElementById('credential-project')?.value;
        const selectedTeamId = document.getElementById('credential-agent-team')?.value;

        if (!projectId) {
            alert('Please select a project');
            return;
        }

        // Determine status based on last test result
        let status = 'active';
        if (lastTestResult && lastTestResult.success === true) {
            status = 'connected';
        } else if (lastTestResult && lastTestResult.success === false) {
            status = 'error';
        }

        const data = {
            provider,
            projectId,  // ✨ Add projectId
            detailedName: accountName,  // ✨ Use detailedName instead of accountName
            accountName,  // Keep for backward compatibility
            credentials,
            status,
            lastTestedAt: lastTestResult ? new Date() : null,
            // ✨ Add account info from X API test
            accountHandle: lastTestResult?.accountHandle || null,
            accountUsername: lastTestResult?.accountUsername || null,
            profileImageUrl: lastTestResult?.profileImageUrl || null
        };

        const savedCredId = await window.ChannelCredentialService.saveCredential(
            currentUser.uid,
            credentialId || null,
            data
        );

        // Bind to agent team if selected
        if (selectedTeamId && selectedTeamId !== '') {
            try {
                await bindCredentialToTeam(selectedTeamId, provider, savedCredId);

                const teamName = document.querySelector(`#credential-agent-team option[value="${selectedTeamId}"]`)?.textContent || 'agent team';
                alert(`✅ Connection saved and linked to ${teamName}!`);
            } catch (bindError) {
                console.error('Error binding to agent team:', bindError);
                alert(`✅ Connection saved, but failed to link to agent team: ${bindError.message}`);
            }
        } else {
            alert('✅ Connection saved successfully');
        }

        // Reset state
        lastTestResult = null;

        closeCredentialModal();
        await loadCredentials();
    } catch (error) {
        console.error('Error saving credential:', error);
        alert(error.message || ('Error saving connection: ' + error.message));
    }
}

function getStatusBadge(status) {
    const map = {
        connected: { color: '#22c55e', label: 'Connected' },
        active: { color: '#22c55e', label: 'Active' },
        error: { color: '#ef4444', label: 'Error' },
        disabled: { color: '#94a3b8', label: 'Disabled' }
    };

    const fallback = { color: '#94a3b8', label: status || 'Unknown' };
    const { color, label } = map[status] || fallback;

    return `<span style="
        border: 1px solid ${color};
        color: ${color};
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 11px;
    ">${label}</span>`;
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


// Load user's projects for credential binding
window.loadUserProjects = async function () {
    const projectSelect = document.getElementById('credential-project');
    if (!projectSelect || !currentUser) return;

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('projects')
            .where('userId', '==', currentUser.uid)
            .where('isDraft', '==', false)  // Only non-draft projects
            .get();

        projectSelect.innerHTML = '<option value="">Select project...</option>';

        // Collect projects and sort client-side
        const projects = [];
        snapshot.forEach(doc => {
            const project = doc.data();
            projects.push({
                id: doc.id,
                name: project.projectName || 'Unnamed Project',  // ✨ Use projectName field
                createdAt: project.createdAt
            });
        });

        // Client-side sort by createdAt (newest first)
        projects.sort((a, b) => {
            const tA = a.createdAt ? a.createdAt.seconds : 0;
            const tB = b.createdAt ? b.createdAt.seconds : 0;
            return tB - tA;
        });

        // Populate dropdown
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });

        if (projects.length === 0) {
            projectSelect.innerHTML = '<option value="">No projects found</option>';
        }

    } catch (error) {
        console.error('Error loading projects:', error);
        projectSelect.innerHTML = '<option value="">Error loading projects</option>';
    }
};

// Load agent teams for binding when project and channel are selected
window.loadAgentTeamsForBinding = async function () {
    const projectId = document.getElementById('credential-project')?.value;
    const provider = document.getElementById('credential-provider')?.value;
    const teamSelect = document.getElementById('credential-agent-team');

    if (!teamSelect) return;

    if (!projectId || !provider) {
        teamSelect.innerHTML = '<option value="">-- Select project and channel first --</option>';
        teamSelect.disabled = true;
        return;
    }

    try {
        const db = firebase.firestore();
        const teamsSnapshot = await db.collection('projectAgentTeamInstances')
            .where('projectId', '==', projectId)
            .get();

        const matchingTeams = [];

        teamsSnapshot.forEach(doc => {
            const teamData = doc.data();
            const channels = teamData.channels || [];

            // Check if this team uses the selected provider
            const hasChannel = channels.some(ch => ch.provider === provider);

            if (hasChannel) {
                const channelBindings = teamData.channelBindings || {};
                const hasCredential = channelBindings[provider];

                matchingTeams.push({
                    id: doc.id,
                    name: teamData.name,
                    hasCredential: !!hasCredential
                });
            }
        });

        teamSelect.innerHTML = '<option value="">-- None (add later) --</option>';
        teamSelect.disabled = false;

        matchingTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;

            if (team.hasCredential) {
                option.textContent = `${team.name} (⚠️ Already has credential)`;
                option.style.color = '#eab308';
            } else {
                option.textContent = team.name;
            }

            teamSelect.appendChild(option);
        });

        if (matchingTeams.length === 0) {
            teamSelect.innerHTML = '<option value="">-- No agent teams found --</option>';
        }

    } catch (error) {
        console.error('Error loading agent teams:', error);
        teamSelect.innerHTML = '<option value="">-- Error loading teams --</option>';
    }
};

// Bind credential to agent team
async function bindCredentialToTeam(teamId, provider, credentialId) {
    const db = firebase.firestore();
    const teamRef = db.collection('projectAgentTeamInstances').doc(teamId);

    try {
        const teamDoc = await teamRef.get();

        if (!teamDoc.exists) {
            throw new Error('Agent team not found');
        }

        const teamData = teamDoc.data();
        const channelBindings = teamData.channelBindings || {};
        const channels = teamData.channels || [];

        // Update channelBindings
        channelBindings[provider] = credentialId;

        // Update channels array
        const channelIndex = channels.findIndex(ch => ch.provider === provider);
        if (channelIndex !== -1) {
            channels[channelIndex].credentialId = credentialId;
            channels[channelIndex].status = 'ready';
            channels[channelIndex].lastErrorMessage = null;
            channels[channelIndex].updatedAt = firebase.firestore.Timestamp.now();
        }

        // Save and update team status to active
        await teamRef.update({
            channelBindings,
            channels,
            status: 'active', // ✨ Auto-activate team when credential is bound
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Credential ${credentialId} bound to team ${teamId}`);

    } catch (error) {
        console.error('Error binding credential to team:', error);
        throw error;
    }
}
