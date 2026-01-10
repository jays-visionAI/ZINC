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

window.switchTab = function (tabId) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));

    // Show selected content
    const activeTab = document.getElementById(`tab-${tabId}`);
    const activeBtn = document.querySelector(`.settings-tab[data-tab="${tabId}"]`);

    if (activeTab) activeTab.style.display = 'block';
    if (activeBtn) activeBtn.classList.add('active');

    // Tab-specific logic
    if (tabId === 'profile') {
        renderProfileTab();
    } else if (tabId === 'language') {
        initLanguageTab();
    }
};

async function initLanguageTab() {
    const globalSelect = document.getElementById('global-lang-select');
    const mainSelect = document.getElementById('main-lang-select');
    const subSelect = document.getElementById('sub-lang-select');

    // Priority: Database > localStorage > Default
    let globalLang = localStorage.getItem('zynk-language');
    let mainLang = localStorage.getItem('zynk-main-language');
    let subLang = localStorage.getItem('zynk-sub-language');

    if (currentUser) {
        try {
            const userDoc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.language) globalLang = userData.language;
                if (userData.mainLanguage) mainLang = userData.mainLanguage;
                if (userData.subLanguage) subLang = userData.subLanguage;
            }
        } catch (err) {
            console.warn('[Settings] Failed to load language from DB, using local storage:', err);
        }
    }

    if (globalSelect) globalSelect.value = globalLang || 'en';
    if (mainSelect) mainSelect.value = mainLang || 'ko';
    if (subSelect) subSelect.value = subLang || 'en';
}

function renderProfileTab() {
    const container = document.getElementById('user-info-display');
    if (!container || !currentUser) return;

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px;">
                <span style="color: rgba(255,255,255,0.5);">Email</span>
                <span style="color: white; font-weight: 500;">${currentUser.email}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px;">
                <span style="color: rgba(255,255,255,0.5);">User ID</span>
                <span style="color: white; font-size: 11px; font-family: monospace;">${currentUser.uid}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px;">
                <span style="color: rgba(255,255,255,0.5);">Last Login</span>
                <span style="color: white;">${new Date(currentUser.metadata.lastSignInTime).toLocaleString()}</span>
            </div>
        </div>
    `;
}

async function initSettings(user) {
    currentUser = user;
    console.log("Settings initialized for user:", user.email);

    // 🪙 Initialize Credits System first (important for usage display)
    if (typeof initCreditsSystem === 'function') {
        try {
            await initCreditsSystem();
        } catch (err) {
            console.error("Failed to init credits system:", err);
        }
    }

    // Load credentials
    loadCredentials();

    // Setup event listeners
    setupEventListeners();

    // 💳 Load billing & subscription status - wait for token to be fully ready
    if (user && user.getIdToken) {
        try {
            await user.getIdToken(true); // Force refresh token
            console.log("Auth token refreshed for billing calls");
        } catch (err) {
            console.error("Token refresh failed:", err);
        }
    }

    if (typeof updateBillingTab === 'function') setTimeout(updateBillingTab, 1000);
    if (typeof loadSubscriptionStatus === 'function') setTimeout(loadSubscriptionStatus, 1500);
}

function setupEventListeners() {
    const addBtn = document.getElementById('btn-add-credential');
    const testBtn = document.getElementById('btn-test-credential');
    const form = document.getElementById('credential-form');

    if (addBtn) addBtn.addEventListener('click', () => openCredentialModal());
    if (testBtn) testBtn.addEventListener('click', testCredential);
    if (form) form.addEventListener('submit', saveCredential);

    // 1. Global UI Language (Preview only)
    const globalLangSelect = document.getElementById('global-lang-select');
    if (globalLangSelect) {
        globalLangSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            if (typeof setAppLanguage === 'function') {
                // Change UI language WITHOUT persisting (preview mode)
                setAppLanguage(lang, false);
                console.log('[Settings] Global UI language preview:', lang);
            }
        });
    }

    // 2. Save Button for all Language Settings
    const saveLangBtn = document.getElementById('save-language-btn');
    if (saveLangBtn) {
        saveLangBtn.addEventListener('click', async () => {
            const globalLang = document.getElementById('global-lang-select')?.value;
            const mainLang = document.getElementById('main-lang-select')?.value;
            const subLang = document.getElementById('sub-lang-select')?.value;

            const originalBtnText = saveLangBtn.innerHTML;
            saveLangBtn.disabled = true;
            saveLangBtn.innerHTML = '<span class="animate-pulse">Saving...</span>';

            try {
                // 1. Save to localStorage for instant UI persistence
                if (globalLang) {
                    localStorage.setItem('zynk-language', globalLang);
                    if (typeof setAppLanguage === 'function') {
                        setAppLanguage(globalLang, true);
                    }
                }
                if (mainLang) localStorage.setItem('zynk-main-language', mainLang);
                if (subLang) localStorage.setItem('zynk-sub-language', subLang);

                // 2. Save to Firestore for cross-session/device permanence
                if (currentUser) {
                    await firebase.firestore().collection('users').doc(currentUser.uid).set({
                        language: globalLang,
                        mainLanguage: mainLang,
                        subLanguage: subLang,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                console.log('[Settings] All language settings saved to DB and LocalStorage');

                // Show feedback
                if (typeof showAlertModal === 'function') {
                    const title = (localStorage.getItem('zynk-language') === 'ko') ? '저장 완료' : 'Settings Saved';
                    const msg = (localStorage.getItem('zynk-language') === 'ko') ? '언어 설정이 성공적으로 저장되었습니다.' : 'Language settings have been saved successfully.';
                    showAlertModal(title, msg, null, { type: 'success' });
                } else {
                    alert('✅ Settings saved');
                }
            } catch (err) {
                console.error('[Settings] Failed to save language settings:', err);
                showNotification('Failed to save settings. Please try again.', 'error');
            } finally {
                saveLangBtn.disabled = false;
                saveLangBtn.innerHTML = originalBtnText;
            }
        });
    }

    // Add Listeners for Language Change
    window.addEventListener('zynk-lang-changed', (e) => {
        // Update sidebar and other components
        if (window.UI && typeof window.UI.refreshUI === 'function') {
            window.UI.refreshUI();
        }
    });

    // Initial sync
    const currentLang = localStorage.getItem('zynk-language') || 'en';
}

function updateLanguageButtons(lang) {
    const btnEn = document.getElementById('lang-btn-en');
    const btnKo = document.getElementById('lang-btn-ko');

    if (btnEn && btnKo) {
        if (lang === 'en') {
            btnEn.classList.add('active');
            btnEn.style.borderColor = 'var(--color-cyan)';
            btnEn.style.background = 'rgba(22, 224, 189, 0.1)';

            btnKo.classList.remove('active');
            btnKo.style.borderColor = 'rgba(255,255,255,0.05)';
            btnKo.style.background = 'rgba(255,255,255,0.03)';
        } else {
            btnKo.classList.add('active');
            btnKo.style.borderColor = 'var(--color-cyan)';
            btnKo.style.background = 'rgba(22, 224, 189, 0.1)';

            btnEn.classList.remove('active');
            btnEn.style.borderColor = 'rgba(255,255,255,0.05)';
            btnEn.style.background = 'rgba(255,255,255,0.03)';
        }
    }
}

async function loadCredentials() {
    if (!currentUser) return;

    try {
        credentials = await window.ChannelCredentialService.getCredentials(currentUser.uid);

        renderCredentialsTable();

        // ⚡️ Real-time Verification on Load
        verifyAllCredentials();
    } catch (error) {
        console.error('Error loading credentials:', error);
        alert('Error loading credentials: ' + error.message);
    }
}

// Helper: Load connected agent teams for all credentials (REMOVED)

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
        tiktok: '🎵',
        naverBlog: 'N',
        naver_blog: 'N',
        naverSmartStore: 'N',
        naver_smart_store: 'N',
        naver_smartstore: 'N',
        naverMap: 'N',
        naver_map: 'N',
        coupang: '📦',
        tmap: '🚗',
        kakaoNavi: '🧭',
        kakao_navi: '🧭',
        kakaoMap: '🗺️',
        kakao_map: '🗺️',
        kakaotalk: '💬',
        line: '🟢',
        telegram: '✈️',
        discord: '🤖'
    };
    return icons[provider] || '🔗';
}

function getProviderName(provider) {
    const names = {
        x: 'X (Twitter)',
        instagram: 'Instagram',
        youtube: 'YouTube',
        linkedin: 'LinkedIn',
        tiktok: 'TikTok',
        naverBlog: 'Naver Blog',
        naver_blog: 'Naver Blog',
        naverSmartStore: 'N smartstore',
        naver_smart_store: 'N smartstore',
        naver_smartstore: 'N smartstore',
        naverMap: 'N Map',
        naver_map: 'N Map',
        coupang: 'Coupang',
        tmap: 'T-Map',
        kakaoNavi: 'Kakao Navi',
        kakao_navi: 'Kakao Navi',
        kakaoMap: 'Kakao Map',
        kakao_map: 'Kakao Map',
        kakaotalk: 'KakaoTalk',
        line: 'LINE',
        telegram: 'Telegram',
        discord: 'Discord'
    };
    return names[provider] || provider;
}

function getStatusBadge(status) {
    const colors = {
        active: '#22c55e',          // Green (Legacy)
        connected: '#22c55e',       // Green
        verifying: '#f59e0b',       // Amber/Yellow
        error: '#ef4444',           // Red
        disconnected: '#ef4444',    // Red
        disabled: '#94a3b8'         // Gray
    };
    const color = colors[status] || '#94a3b8';

    let label = status;
    if (status === 'active') label = 'Connected';

    return `<span style="border: 1px solid ${color}; color: ${color}; padding: 2px 8px; border-radius: 12px; font-size: 11px; text-transform: capitalize;">${label}</span>`;
}

function formatDate(timestamp) {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
}

// 🚀 Verify all credentials on load
async function verifyAllCredentials() {
    console.log("Starting verification for all credentials...");

    // 1. Set all to 'Verifying...' visually first
    credentials.forEach(cred => {
        cred.status = 'verifying';
    });
    renderCredentialsTable();

    // 2. Trigger tests in parallel
    const verificationPromises = credentials.map(async (cred) => {
        try {
            // Check if provider and credentials exist
            if (!cred.provider || !cred.credentials) {
                throw new Error('Invalid credential data');
            }

            // Call Service
            const result = await window.ChannelCredentialService.testConnection(cred.provider, cred.credentials);

            if (result.success) {
                cred.status = 'connected';
            } else {
                cred.status = 'disconnected'; // or 'error'
                console.warn(`Verification failed for ${cred.detailedName}:`, result.message);
            }
        } catch (error) {
            console.error(`Verification error for ${cred.detailedName}:`, error);
            cred.status = 'error';
        }

        // 3. Update UI individually (or re-render entire table for simplicity)
        renderCredentialsTable();

        // Optional: Update Firestore to reflect current status?
        // For now, we only update UI as requested ("세팅메뉴에 유저가 진입할때 테스트").
        // Updating DB might cause write frequency issues if many users enter.
    });

    await Promise.all(verificationPromises);
    console.log("All verifications complete.");
}

// Channel Profile Cache (PRD 12.x)
let channelProfileMap = {};

// Provider Configuration (Field Specs only)
const PROVIDER_CONFIG = {
    x: {
        services: [
            {
                id: 'v2',
                name: 'X API v2 (Posting/Auth)',
                fields: [
                    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter API Key', required: true },
                    { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'Enter API Secret', required: false },
                    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
                    { key: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', placeholder: 'Enter Token Secret', required: false }
                ]
            }
        ]
    },
    instagram: {
        services: [
            {
                id: 'publishing',
                name: 'Content Publishing API',
                description: 'Directly post content to Instagram Feed',
                fields: [
                    { key: 'accessToken', label: 'Long-lived Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
                    { key: 'pageId', label: 'Instagram Business ID', type: 'text', placeholder: 'Instagram Account ID (Numeric)', required: true },
                    { key: 'appId', label: 'Facebook App ID', type: 'text', placeholder: 'App ID', required: true },
                    { key: 'appSecret', label: 'Facebook App Secret', type: 'password', placeholder: 'App Secret', required: true }
                ]
            },
            {
                id: 'monitoring',
                name: 'Monitoring & Insights',
                description: 'Analyze account performance and metrics',
                fields: [
                    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
                    { key: 'pageId', label: 'Facebook Page ID', type: 'text', placeholder: 'Connected Page ID', required: true }
                ]
            },
            {
                id: 'messaging',
                name: 'Messaging & DM',
                description: 'Manage and respond to Instagram Direct Messages',
                fields: [
                    { key: 'accessToken', label: 'Page Access Token', type: 'password', placeholder: 'Access Token (Messages permission)', required: true },
                    { key: 'pageId', label: 'Instagram Business ID', type: 'text', placeholder: 'Business ID', required: true }
                ]
            }
        ]
    },
    youtube: {
        services: [
            {
                id: 'data_api',
                name: 'YouTube Data API v3',
                fields: [
                    { key: 'clientId', label: 'Client ID (OAuth 2.0)', type: 'text', placeholder: 'Google Cloud Client ID', required: true },
                    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Google Cloud Client Secret', required: true },
                    { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'OAuth Refresh Token', required: false },
                    { key: 'apiKey', label: 'API Key (Public Data)', type: 'text', placeholder: 'Google Cloud API Key', required: false }
                ]
            }
        ]
    },
    linkedin: {
        services: [
            {
                id: 'org_api',
                name: 'LinkedIn Organization API',
                fields: [
                    { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'App Client ID', required: true },
                    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'App Client Secret', required: true },
                    { key: 'urn', label: 'Organization URN', type: 'text', placeholder: 'urn:li:organization:12345678', required: true },
                    { key: 'accessToken', label: 'Access Token (Optional)', type: 'password', placeholder: 'Pre-generated Token', required: false }
                ]
            }
        ]
    },
    tiktok: {
        services: [
            {
                id: 'video_kit',
                name: 'TikTok Video Kit (Post)',
                fields: [
                    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
                    { key: 'clientKey', label: 'Client Key', type: 'text', placeholder: 'Enter Client Key', required: true }
                ]
            }
        ]
    },
    facebook: {
        services: [
            {
                id: 'page_post',
                name: 'Facebook Page Posting',
                fields: [
                    { key: 'appId', label: 'App ID', type: 'text', required: true },
                    { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
                    { key: 'pageId', label: 'Page ID', type: 'text', required: true },
                    { key: 'accessToken', label: 'Access Token (Optional)', type: 'password', required: false }
                ]
            }
        ]
    },
    naverBlog: {
        services: [
            {
                id: 'v1',
                name: 'Naver Blog Writing API',
                fields: [
                    { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Naver Client ID', required: true },
                    { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Naver Client Secret', required: true }
                ]
            }
        ]
    },
    naverSmartStore: {
        services: [
            {
                id: 'commerce_api',
                name: 'Commerce API (Products)',
                fields: [
                    { key: 'applicationId', label: 'Application ID', type: 'text', placeholder: 'Commerce API App ID', required: true },
                    { key: 'applicationSecret', label: 'Application Secret', type: 'password', placeholder: 'Commerce API Secret', required: true }
                ]
            }
        ]
    },
    kakaotalk: {
        services: [
            {
                id: 'message',
                name: 'Kakao Biz Message',
                fields: [
                    { key: 'adminKey', label: 'Admin Key', type: 'password', required: true },
                    { key: 'restApiKey', label: 'REST API Key', type: 'text', required: true }
                ]
            }
        ]
    }
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

    // Load channels from Firestore using standardized utility
    let channels = [];
    if (window.ChannelProfilesUtils) {
        channels = await window.ChannelProfilesUtils.loadAvailableChannels();

        // Update global channelProfileMap
        channels.forEach(ch => {
            channelProfileMap[ch.key] = ch;
        });
    }

    if (channels.length === 0) {
        console.warn('No channels found via ChannelProfilesUtils - using fallback from PROVIDER_CONFIG');
        // Fallback: Use PROVIDER_CONFIG keys if profiles not found in Firestore
        channels = Object.keys(PROVIDER_CONFIG).map(key => ({
            key: key,
            id: key,
            displayName: getProviderName(key)
        }));
    }

    // Populate dropdown
    providerSelect.innerHTML = '<option value="">Select a provider...</option>';
    channels.forEach(data => {
        const option = document.createElement('option');
        option.value = data.key;
        // Prefer getProviderName for consistent UI labels
        option.textContent = getProviderName(data.key);
        providerSelect.appendChild(option);
        console.log(`Added channel: ${data.key} - ${option.textContent}`);
    });

    // Load user's projects
    await loadUserProjects();

    const serviceGroup = document.getElementById('credential-service-group');
    if (serviceGroup) serviceGroup.style.display = 'none';

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
            }

            // Handle multi-service initialization
            const config = PROVIDER_CONFIG[cred.provider];
            if (config && config.services && config.services.length > 0) {
                handleProviderChange(); // Populate services
                const serviceSelect = document.getElementById('credential-service');
                if (serviceSelect) {
                    serviceSelect.value = cred.serviceId || config.services[0].id;
                }
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

// Provider Change Handler
window.handleProviderChange = function () {
    const provider = document.getElementById('credential-provider').value;
    const serviceGroup = document.getElementById('credential-service-group');
    const serviceSelect = document.getElementById('credential-service');

    if (!provider) {
        if (serviceGroup) serviceGroup.style.display = 'none';
        return;
    }

    const config = PROVIDER_CONFIG[provider];
    if (config && config.services && config.services.length > 0) {
        if (serviceGroup) serviceGroup.style.display = 'block';
        if (serviceSelect) {
            serviceSelect.innerHTML = config.services.map(s =>
                `<option value="${s.id}">${s.name}</option>`
            ).join('');
        }
    } else {
        if (serviceGroup) serviceGroup.style.display = 'none';
    }

    updateCredentialFields();
};

// Dynamic Fields
window.updateCredentialFields = function () {
    const provider = document.getElementById('credential-provider').value;
    const serviceId = document.getElementById('credential-service').value;
    const container = document.getElementById('credential-fields-container');
    const descEl = document.getElementById('service-description');

    if (!provider) {
        container.innerHTML = '';
        return;
    }

    const config = PROVIDER_CONFIG[provider];
    const fields = getProviderFields(provider, serviceId);

    // Update description if service is selected
    if (config && config.services && descEl) {
        const service = config.services.find(s => s.id === serviceId);
        descEl.textContent = service ? service.description || '' : '';
    }

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
};

function getProviderFields(provider, serviceId) {
    // PRD 12.x: Check Channel Profile first
    const profile = channelProfileMap[provider];
    if (profile && profile.apiCredentialConfig && Array.isArray(profile.apiCredentialConfig.fields)) {
        return profile.apiCredentialConfig.fields;
    }

    // New multi-service structure
    const config = PROVIDER_CONFIG[provider];
    if (config && config.services) {
        const service = config.services.find(s => s.id === (serviceId || config.services[0].id));
        return service ? service.fields : [];
    }

    return [];
}

let lastTestResult = null; // Store last test result

// Helper: Get values from dynamic fields with validation
function getCredentialFieldValues(provider, serviceId, options = { validate: false }) {
    const fields = getProviderFields(provider, serviceId);
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
        const serviceId = document.getElementById('credential-service').value;
        // Validate fields
        credentialValues = getCredentialFieldValues(provider, serviceId, { validate: true });
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

        // Check if result has step details (like Twitter) or simple result (others)
        if (result.step1) {
            // Complex result (Twitter)
            if (result.step1.success) {
                resultHtml += `<div style="color: #22c55e; margin-bottom: 4px;">${result.step1.message}</div>`;
            } else {
                resultHtml += `<div style="color: #ef4444; margin-bottom: 4px;">${result.step1.message || '❌ Step 1: Format check failed'}</div>`;
            }

            if (result.step2) {
                if (result.step2.success) {
                    resultHtml += `<div style="color: #22c55e; margin-bottom: 4px;">${result.step2.message}</div>`;

                    if (result.accountInfo) {
                        const info = result.accountInfo;
                        resultHtml += `<div style="color: #3b82f6; margin-top: 8px; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.2);">
                            <strong>🎉 Account Connected:</strong><br>
                            <span style="font-size: 16px; font-weight: 600;">${info.handle}</span> (${info.name})
                        </div>`;

                        lastTestResult.accountHandle = info.handle;
                        lastTestResult.accountName = info.name;
                    }
                } else {
                    resultHtml += `<div style="color: #f59e0b;">${result.step2.message}</div>`;
                }
            }
        } else {
            // Simple result (Others)
            if (result.success) {
                resultHtml += `<div style="color: #22c55e; margin-bottom: 4px;">✅ ${result.message}</div>`;
            } else {
                resultHtml += `<div style="color: #ef4444; margin-bottom: 4px;">❌ ${result.message}</div>`;
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
        const serviceId = document.getElementById('credential-service')?.value;
        const credentials = getCredentialFieldValues(provider, serviceId, { validate: true });

        // Get project
        const projectId = document.getElementById('credential-project')?.value;

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
            serviceId,  // ✨ Add serviceId
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

        alert('✅ Connection saved successfully');

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

    // Load Memory data when Memory tab is selected
    if (tabName === 'memory') {
        loadMemoryData();
    }
}

// Memory Tab: Load and display memory settings
window.loadMemoryData = async function () {
    try {
        const db = firebase.firestore();
        const uid = firebase.auth().currentUser?.uid;
        if (!uid) return;

        // 1. Get user's plan
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const plan = (userData.plan || userData.subscription?.plan || 'free').toLowerCase();

        // 2. Define tier limits (synced with agent-execution-service.js)
        const MEMORY_TIER_LIMITS = {
            free: { maxMemoryCount: 5, retentionDays: 30, maxContextSources: 3 },
            starter: { maxMemoryCount: 10, retentionDays: 30, maxContextSources: 5 },
            pro: { maxMemoryCount: 50, retentionDays: 30, maxContextSources: 10 },
            enterprise: { maxMemoryCount: -1, retentionDays: 30, maxContextSources: 20 }
        };

        const limits = MEMORY_TIER_LIMITS[plan] || MEMORY_TIER_LIMITS.free;

        // 3. Update UI with current limits
        document.getElementById('memory-max-count').textContent =
            limits.maxMemoryCount === -1 ? '∞' : limits.maxMemoryCount;
        document.getElementById('memory-retention').textContent = limits.retentionDays;
        document.getElementById('memory-max-sources').textContent = limits.maxContextSources;

        // 4. Count current memories across all user's projects
        const projectsSnap = await db.collection('projects')
            .where('userId', '==', uid)
            .get();

        let totalMemories = 0;
        for (const projectDoc of projectsSnap.docs) {
            const memorySnap = await db.collection('projects')
                .doc(projectDoc.id)
                .collection('agentMemory')
                .get();
            totalMemories += memorySnap.size;
        }

        document.getElementById('memory-current').textContent = totalMemories;

        // 5. Highlight current tier row
        ['free', 'starter', 'pro', 'enterprise'].forEach(tier => {
            const row = document.getElementById(`tier-row-${tier}`);
            if (row) {
                if (tier === plan) {
                    row.style.background = 'rgba(139, 92, 246, 0.1)';
                    row.style.borderLeft = '3px solid #8B5CF6';
                } else {
                    row.style.background = 'transparent';
                    row.style.borderLeft = 'none';
                }
            }
        });

        console.log(`[MemorySettings] Loaded: plan=${plan}, memories=${totalMemories}`);

    } catch (error) {
        console.error('[MemorySettings] Error loading memory data:', error);
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

// End of user-settings.js
