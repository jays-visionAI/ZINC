/**
 * Knowledge Hub - JavaScript Logic
 * Phase 1: Sources Management, Chat, Content Plans
 */

// ============================================================
// GOOGLE DRIVE CONFIGURATION
// ============================================================
// These values are set in env-config.js (loaded before this script)
const GOOGLE_CLIENT_ID = window.ENV_CONFIG?.GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = window.ENV_CONFIG?.GOOGLE_API_KEY || '';
const GOOGLE_DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';

// ============================================================
// STATE
// ============================================================
let currentUser = null;
let currentProjectId = null;
let currentProject = null;
let sources = [];
let chatMessages = [];
let isLoading = false;
let sourcesUnsubscribe = null;
let targetLanguage = 'ko'; // Default target language for summaries

// Google API state
let gapiInited = false;
let gisInited = false;
let tokenClient = null;
let accessToken = null;

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initializeKnowledgeHub();
});

async function initializeKnowledgeHub() {
    // Initialize Google APIs
    initializeGoogleAPIs();

    // Check auth
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProjects();
            await loadUserCredits();
            initializeEventListeners();
            initializeSourceFilters();
            initializeAddSourceModal();
            initializePlanCards();
        } else {
            window.location.href = 'index.html';
        }
    });
}

// ============================================================
// GOOGLE DRIVE INTEGRATION
// ============================================================

/**
 * Initialize Google APIs (GAPI + GIS)
 */
function initializeGoogleAPIs() {
    // Load GAPI
    if (typeof gapi !== 'undefined') {
        gapi.load('client:picker', async () => {
            try {
                await gapi.client.init({
                    apiKey: GOOGLE_API_KEY,
                    discoveryDocs: GOOGLE_DISCOVERY_DOCS,
                });
                gapiInited = true;
                console.log('GAPI initialized');
                maybeEnableGoogleDrive();
            } catch (error) {
                console.error('Error initializing GAPI:', error);
            }
        });
    }

    // Initialize GIS Token Client
    if (typeof google !== 'undefined' && google.accounts) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_SCOPES,
            callback: (response) => {
                if (response.error !== undefined) {
                    console.error('OAuth error:', response);
                    showNotification('Google Drive authentication failed', 'error');
                    return;
                }
                accessToken = response.access_token;
                gisInited = true;
                console.log('GIS Token received');
                // Open picker after getting token
                openGooglePicker();
            },
        });
        console.log('GIS Token Client initialized');
    }
}

/**
 * Check if Google Drive is ready
 */
function maybeEnableGoogleDrive() {
    const btn = document.getElementById('btn-connect-drive');
    if (btn && gapiInited) {
        btn.textContent = 'Select from Google Drive';
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

/**
 * Request Google Drive access and open picker
 */
function requestGoogleDriveAccess() {
    if (!gapiInited) {
        showNotification('Google API not loaded. Please refresh the page.', 'error');
        return;
    }

    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
        showNotification('Google Drive not configured. Please set up API credentials.', 'warning');
        showGoogleDriveSetupInstructions();
        return;
    }

    if (accessToken) {
        // Already have token, open picker directly
        openGooglePicker();
    } else {
        // Request token
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            showNotification('Google Sign-In not available', 'error');
        }
    }
}

/**
 * Open Google Picker to select files
 */
function openGooglePicker() {
    if (!accessToken) {
        showNotification('No access token available', 'error');
        return;
    }

    const picker = new google.picker.PickerBuilder()
        .addView(new google.picker.DocsView()
            .setIncludeFolders(false)
            .setMimeTypes('application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain'))
        .addView(new google.picker.DocsView()
            .setIncludeFolders(true)
            .setSelectFolderEnabled(false))
        .setOAuthToken(accessToken)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setCallback(handlePickerCallback)
        .setTitle('Select files for Knowledge Hub')
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .build();

    picker.setVisible(true);
}

/**
 * Handle Google Picker selection
 */
async function handlePickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const files = data.docs;
        console.log('Selected files:', files);

        for (const file of files) {
            await addGoogleDriveSource(file);
        }

        closeModal('add-source-modal');
        await loadSources();
        showNotification(`${files.length} file(s) added from Google Drive!`, 'success');
    }
}

/**
 * Add a Google Drive file as a source
 */
async function addGoogleDriveSource(file) {
    try {
        const sourceData = {
            sourceType: 'google_drive',
            title: file.name,
            isActive: true,
            status: 'pending',
            googleDrive: {
                fileId: file.id,
                fileName: file.name,
                mimeType: file.mimeType,
                fileUrl: file.url,
                iconUrl: file.iconUrl,
                lastModified: file.lastEditedUtc ? new Date(file.lastEditedUtc) : null,
                sizeBytes: file.sizeBytes || null
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .add(sourceData);

        console.log('Added Drive source:', file.name);

    } catch (error) {
        console.error('Error adding Drive source:', error);
        showNotification(`Failed to add ${file.name}`, 'error');
    }
}

/**
 * Show setup instructions when Google Drive is not configured
 */
function showGoogleDriveSetupInstructions() {
    const driveContent = document.getElementById('add-source-drive');
    if (driveContent) {
        driveContent.innerHTML = `
            <div class="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
                <h4 class="text-sm font-semibold text-amber-400 mb-2">⚠️ Google Drive Setup Required</h4>
                <p class="text-xs text-slate-400 mb-3">To enable Google Drive integration, configure the following in <code class="bg-slate-700 px-1 rounded">knowledgeHub.js</code>:</p>
                <ol class="text-xs text-slate-400 space-y-2 list-decimal list-inside">
                    <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-indigo-400 hover:underline">Google Cloud Console</a></li>
                    <li>Create OAuth 2.0 Client ID (Web application)</li>
                    <li>Add your domain to Authorized JavaScript origins</li>
                    <li>Enable Google Drive API and Google Picker API</li>
                    <li>Replace <code class="bg-slate-700 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code class="bg-slate-700 px-1 rounded">GOOGLE_API_KEY</code> in the code</li>
                </ol>
            </div>
        `;
    }
}

// ============================================================
// PROJECT LOADING
// ============================================================
async function loadUserProjects() {
    const projectSelector = document.getElementById('project-selector');

    try {
        const snapshot = await firebase.firestore()
            .collection('projects')
            .where('userId', '==', currentUser.uid)
            .where('isDraft', '==', false)
            .get();

        const projects = [];
        snapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });

        // Sort by created date
        projects.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });

        // Populate selector
        projectSelector.innerHTML = '';
        if (projects.length === 0) {
            projectSelector.innerHTML = '<option value="">No projects found</option>';
            return;
        }

        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.projectName || project.name || project.brandName || 'Unnamed Project';
            projectSelector.appendChild(option);
        });

        // Check URL param for project ID
        const urlParams = new URLSearchParams(window.location.search);
        const projectIdFromUrl = urlParams.get('projectId');

        if (projectIdFromUrl && projects.find(p => p.id === projectIdFromUrl)) {
            projectSelector.value = projectIdFromUrl;
            await selectProject(projectIdFromUrl);
        } else if (projects.length > 0) {
            projectSelector.value = projects[0].id;
            await selectProject(projects[0].id);
        }

    } catch (error) {
        console.error('Error loading projects:', error);
        showNotification('Failed to load projects', 'error');
    }
}

async function selectProject(projectId) {
    if (!projectId) return;

    currentProjectId = projectId;

    try {
        const doc = await firebase.firestore()
            .collection('projects')
            .doc(projectId)
            .get();

        if (doc.exists) {
            currentProject = { id: doc.id, ...doc.data() };
            document.getElementById('project-name-display').textContent =
                currentProject.name || currentProject.brandName || 'Brand Intelligence';

            await loadSources();
            updateSourceCounts();
        }
    } catch (error) {
        console.error('Error selecting project:', error);
    }
}

// ============================================================
// SOURCES MANAGEMENT
// ============================================================
async function loadSources() {
    if (!currentProjectId) return;

    // Unsubscribe from previous listener if exists
    if (sourcesUnsubscribe) {
        sourcesUnsubscribe();
        sourcesUnsubscribe = null;
    }

    try {
        // Use onSnapshot for realtime updates
        sourcesUnsubscribe = firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                sources = [];
                snapshot.forEach(doc => {
                    sources.push({ id: doc.id, ...doc.data() });
                });

                renderSources();
                updateSummarySection();
            }, (error) => {
                console.error('Error loading sources:', error);
                showNotification('Failed to load sources', 'error');
            });

    } catch (error) {
        console.error('Error setting up sources listener:', error);
        showNotification('Failed to setup sources listener', 'error');
    }
}

function updateSummarySection() {
    const summaryTitle = document.getElementById('summary-title');
    const summaryContent = document.getElementById('summary-content');
    const keyInsights = document.getElementById('key-insights');
    const insightsList = document.getElementById('insights-list');

    const activeSources = sources.filter(s => s.isActive !== false);

    if (activeSources.length === 0) {
        summaryTitle.textContent = 'No active sources';
        summaryContent.textContent = 'Add sources or enable existing ones to generate an AI summary.';
        keyInsights.classList.add('hidden');
        return;
    }

    // Check statuses
    const analyzing = activeSources.filter(s => s.status === 'analyzing');
    const completed = activeSources.filter(s => s.status === 'completed');
    const failed = activeSources.filter(s => s.status === 'failed');

    if (analyzing.length > 0) {
        summaryTitle.textContent = 'Analyzing sources...';
        summaryContent.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></span>
                <span>Analyzing ${analyzing.length} source(s). Please wait...</span>
            </div>
        `;
        keyInsights.classList.add('hidden');
        return;
    }

    if (completed.length === 0) {
        if (failed.length > 0) {
            summaryTitle.textContent = 'Analysis Failed';
            summaryContent.textContent = 'Some sources failed to analyze. Please check the source list.';
        } else {
            summaryTitle.textContent = 'Ready to analyze';
            summaryContent.textContent = 'Sources are added but not yet analyzed.';
        }
        keyInsights.classList.add('hidden');
        return;
    }

    // Sort completed by analyzedAt desc to show latest info
    completed.sort((a, b) => {
        const dateA = a.analysis?.analyzedAt?.toDate?.() || new Date(0);
        const dateB = b.analysis?.analyzedAt?.toDate?.() || new Date(0);
        return dateB - dateA;
    });

    const primarySource = completed[0];
    const analysis = primarySource.analysis || {};

    // If multiple sources, we might want to hint at that
    const suffix = completed.length > 1 ? ` (+${completed.length - 1} others)` : '';
    summaryTitle.textContent = analysis.summary ? 'Brand Summary' : 'Summary Processing...';

    if (analysis.summary) {
        summaryContent.textContent = analysis.summary;
    } else {
        summaryContent.textContent = 'Summary extracted from ' + (primarySource.title || 'source') + suffix;
    }

    // Key Insights
    if (analysis.keyInsights && analysis.keyInsights.length > 0) {
        keyInsights.classList.remove('hidden');
        insightsList.innerHTML = analysis.keyInsights.map(insight => `
            <div class="flex items-start gap-2 text-xs text-slate-400">
                <span class="text-indigo-400 mt-0.5">•</span>
                <span>${insight}</span>
            </div>
        `).join('');
    } else {
        keyInsights.classList.add('hidden');
    }
}

function renderSources(filter = 'all') {
    const sourcesList = document.getElementById('sources-list');
    const emptyState = document.getElementById('sources-empty');

    // Filter sources
    let filteredSources = sources;
    if (filter !== 'all') {
        filteredSources = sources.filter(s => {
            if (filter === 'drive') return s.sourceType === 'google_drive';
            if (filter === 'links') return s.sourceType === 'link';
            if (filter === 'notes') return s.sourceType === 'note';
            return true;
        });
    }

    // Clear existing (except empty state)
    const existingItems = sourcesList.querySelectorAll('.source-item');
    existingItems.forEach(item => item.remove());

    if (filteredSources.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    filteredSources.forEach(source => {
        const sourceEl = createSourceElement(source);
        sourcesList.appendChild(sourceEl);
    });

    updateSourceCounts();
}

function createSourceElement(source) {
    const div = document.createElement('div');
    div.className = 'source-item p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl transition-all cursor-pointer hover:bg-slate-800';
    div.dataset.sourceId = source.id;

    const icon = getSourceIcon(source.sourceType);
    const statusBadge = getStatusBadge(source.status);

    div.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg ${getSourceBgColor(source.sourceType)} flex items-center justify-center flex-shrink-0">
                ${icon}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-white truncate">${escapeHtml(source.title || 'Untitled')}</span>
                    ${statusBadge}
                </div>
                <p class="text-[11px] text-slate-500 truncate">${getSourceDescription(source)}</p>
            </div>
            <div class="toggle-switch ${source.isActive !== false ? 'active' : ''}" data-source-id="${source.id}"></div>
        </div>
    `;

    // Toggle click handler
    const toggle = div.querySelector('.toggle-switch');
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSourceActive(source.id, !toggle.classList.contains('active'));
    });

    return div;
}

function getSourceIcon(type) {
    switch (type) {
        case 'google_drive':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-400"><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`;
        case 'link':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-400"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
        case 'note':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-400"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg>`;
        default:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>`;
    }
}

function getSourceBgColor(type) {
    switch (type) {
        case 'google_drive': return 'bg-blue-500/20';
        case 'link': return 'bg-emerald-500/20';
        case 'note': return 'bg-amber-500/20';
        default: return 'bg-slate-700';
    }
}

function getStatusBadge(status) {
    switch (status) {
        case 'analyzing':
            return '<span class="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">Analyzing...</span>';
        case 'completed':
            return '<span class="text-[9px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">✓</span>';
        case 'failed':
            return '<span class="text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Failed</span>';
        default:
            return '<span class="text-[9px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">Pending</span>';
    }
}

function getSourceDescription(source) {
    switch (source.sourceType) {
        case 'google_drive':
            return source.googleDrive?.fileName || source.description || 'Google Drive file';
        case 'link':
            return source.link?.url || source.description || 'Web link';
        case 'note':
            return source.note?.content?.substring(0, 50) + '...' || 'Note';
        default:
            return source.description || '';
    }
}

async function toggleSourceActive(sourceId, isActive) {
    try {
        await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .doc(sourceId)
            .update({ isActive, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });

        // Update local state
        const source = sources.find(s => s.id === sourceId);
        if (source) source.isActive = isActive;

        // Update toggle UI
        const toggle = document.querySelector(`.toggle-switch[data-source-id="${sourceId}"]`);
        if (toggle) {
            toggle.classList.toggle('active', isActive);
        }

        updateSourceCounts();
        showNotification(isActive ? 'Source activated' : 'Source deactivated', 'success');

    } catch (error) {
        console.error('Error toggling source:', error);
        showNotification('Failed to update source', 'error');
    }
}

function updateSourceCounts() {
    const total = sources.length;
    const active = sources.filter(s => s.isActive !== false).length;

    document.getElementById('source-count').textContent = total;
    document.getElementById('active-sources-count').textContent = active;
    document.getElementById('sources-indicator').textContent = active;

    // Also trigger summary update when counts change (e.g. toggle active/inactive)
    updateSummarySection();
}

// ============================================================
// SOURCE FILTERS
// ============================================================
function initializeSourceFilters() {
    const filters = document.querySelectorAll('.source-filter');

    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            filters.forEach(f => {
                f.classList.remove('active', 'bg-indigo-600/20', 'text-indigo-400', 'border', 'border-indigo-500/30');
                f.classList.add('text-slate-400');
            });
            filter.classList.add('active', 'bg-indigo-600/20', 'text-indigo-400', 'border', 'border-indigo-500/30');
            filter.classList.remove('text-slate-400');

            renderSources(filter.dataset.filter);
        });
    });
}

// ============================================================
// ADD SOURCE MODAL
// ============================================================
function initializeAddSourceModal() {
    const modal = document.getElementById('add-source-modal');
    const btnOpen = document.getElementById('btn-add-source');
    const btnClose = document.getElementById('btn-close-source-modal');
    const tabs = document.querySelectorAll('.add-source-tab');

    btnOpen.addEventListener('click', () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });

    btnClose.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('bg-indigo-600', 'text-white');
                t.classList.add('bg-slate-800', 'text-slate-400');
            });
            tab.classList.remove('bg-slate-800', 'text-slate-400');
            tab.classList.add('bg-indigo-600', 'text-white');

            document.querySelectorAll('.add-source-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`add-source-${tab.dataset.type}`).classList.remove('hidden');
        });
    });

    // Add Link
    document.getElementById('btn-add-link').addEventListener('click', () => addLinkSource());

    // Add Note
    document.getElementById('btn-add-note').addEventListener('click', () => addNoteSource());


    // Connect Drive
    document.getElementById('btn-connect-drive').addEventListener('click', () => {
        requestGoogleDriveAccess();
    });
}

async function addLinkSource() {
    const urlInput = document.getElementById('link-url-input');
    const url = urlInput.value.trim();

    if (!url) {
        showNotification('Please enter a URL', 'error');
        return;
    }

    try {
        const sourceData = {
            sourceType: 'link',
            title: extractDomain(url),
            isActive: true,
            status: 'pending',
            link: { url },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .add(sourceData);

        urlInput.value = '';
        closeModal('add-source-modal');
        await loadSources();
        showNotification('Link added successfully!', 'success');

    } catch (error) {
        console.error('Error adding link:', error);
        showNotification('Failed to add link', 'error');
    }
}

async function addNoteSource() {
    const titleInput = document.getElementById('note-title-input');
    const contentInput = document.getElementById('note-content-input');

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        showNotification('Please enter title and content', 'error');
        return;
    }

    try {
        const sourceData = {
            sourceType: 'note',
            title,
            isActive: true,
            status: 'completed', // Notes don't need analysis
            note: { content },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .add(sourceData);

        titleInput.value = '';
        contentInput.value = '';
        closeModal('add-source-modal');
        await loadSources();
        showNotification('Note added successfully!', 'success');

    } catch (error) {
        console.error('Error adding note:', error);
        showNotification('Failed to add note', 'error');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// ============================================================
// CONTENT PLANS
// ============================================================
function initializePlanCards() {
    const planCards = document.querySelectorAll('.plan-card');

    planCards.forEach(card => {
        card.addEventListener('click', () => {
            const planType = card.dataset.plan;
            handlePlanClick(planType);
        });
    });

    // Load saved plans and schedules
    loadSavedPlans();
    loadUpcomingSchedules();
}

async function handlePlanClick(planType) {
    const activeSources = sources.filter(s => s.isActive !== false && s.status === 'completed');

    if (activeSources.length === 0) {
        showNotification('Please add sources and wait for analysis to complete', 'warning');
        return;
    }

    // Show loading indicator
    showNotification(`Generating ${formatPlanType(planType)}...`, 'info');

    try {
        // Call Cloud Function
        const generateContentPlan = firebase.functions().httpsCallable('generateContentPlan');
        const result = await generateContentPlan({
            projectId: currentProjectId,
            planType: planType
        });

        if (result.data.success) {
            showNotification(`${formatPlanType(planType)} generated!`, 'success');

            // Show result modal
            showPlanResultModal(result.data.plan, result.data.planId);

            // Refresh saved plans
            await loadSavedPlans();
        }
    } catch (error) {
        console.error('Error generating plan:', error);
        showNotification(`Failed to generate plan: ${error.message}`, 'error');
    }
}

async function loadSavedPlans() {
    const savedPlansList = document.getElementById('saved-plans-list');

    if (!currentProjectId) {
        savedPlansList.innerHTML = '<p class="text-[11px] text-slate-600 text-center py-2">No saved plans yet</p>';
        return;
    }

    try {
        const snapshot = await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('contentPlans')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            savedPlansList.innerHTML = '<p class="text-[11px] text-slate-600 text-center py-2">No saved plans yet</p>';
            return;
        }

        savedPlansList.innerHTML = '';
        snapshot.forEach(doc => {
            const plan = doc.data();
            const planEl = document.createElement('div');
            planEl.className = 'flex items-center justify-between p-2 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-all';
            planEl.onclick = () => showPlanResultModal(plan, doc.id);

            planEl.innerHTML = `
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-slate-300 truncate">${escapeHtml(plan.title || formatPlanType(plan.type))}</p>
                    <p class="text-[10px] text-slate-500">${getStatusBadgeText(plan.status)}</p>
                </div>
                <span class="text-[10px] text-slate-600">${getPlanIcon(plan.category)}</span>
            `;
            savedPlansList.appendChild(planEl);
        });

    } catch (error) {
        console.error('Error loading saved plans:', error);
    }
}

function getStatusBadgeText(status) {
    switch (status) {
        case 'draft': return '📝 Draft';
        case 'scheduled': return '📅 Scheduled';
        case 'sent': return '📤 Sent';
        case 'completed': return '✅ Completed';
        default: return status;
    }
}

function getPlanIcon(category) {
    switch (category) {
        case 'strategic': return '🎯';
        case 'quick_action': return '⚡';
        case 'knowledge': return '📚';
        case 'create_now': return '🚀';
        default: return '📄';
    }
}

function showPlanResultModal(plan, planId) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('plan-result-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'plan-result-modal';
        modal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black/60 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl mx-4 shadow-2xl max-h-[80vh] flex flex-col">
                <div class="flex items-center justify-between p-5 border-b border-slate-700">
                    <h3 id="plan-modal-title" class="text-lg font-semibold text-white"></h3>
                    <button id="btn-close-plan-modal" class="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>
                <div id="plan-modal-content" class="flex-1 overflow-y-auto p-5">
                    <!-- Content will be rendered here -->
                </div>
                <div class="p-4 border-t border-slate-700 flex justify-between items-center">
                    <span id="plan-credits-badge" class="text-xs text-slate-500"></span>
                    <div class="flex gap-2">
                        <button id="btn-schedule-plan" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">
                            📅 Schedule
                        </button>
                        <button id="btn-send-to-studio" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium">
                            Send to Studio
                        </button>
                        <button id="btn-copy-plan" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium">
                            Copy
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close handlers
        document.getElementById('btn-close-plan-modal').onclick = () => closePlanModal();
        modal.onclick = (e) => { if (e.target === modal) closePlanModal(); };

        // Copy handler
        document.getElementById('btn-copy-plan').onclick = () => {
            const content = document.getElementById('plan-modal-content').innerText;
            navigator.clipboard.writeText(content);
            showNotification('Copied to clipboard!', 'success');
        };

        // Send to Studio handler
        document.getElementById('btn-send-to-studio').onclick = () => {
            showNotification('Send to Studio feature coming soon!', 'info');
        };

        // Schedule handler
        document.getElementById('btn-schedule-plan').onclick = () => {
            openScheduleModal();
        };
    }

    // Store current plan for scheduling
    window.currentPlanForScheduling = { plan, planId };

    // Populate content
    document.getElementById('plan-modal-title').textContent = plan.title || formatPlanType(plan.type);
    document.getElementById('plan-credits-badge').textContent = `${plan.credits || 0} credits used`;

    // Render content
    const contentEl = document.getElementById('plan-modal-content');
    contentEl.innerHTML = renderPlanContent(plan.content || plan);

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closePlanModal() {
    const modal = document.getElementById('plan-result-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderPlanContent(content) {
    if (typeof content === 'string') {
        return `<div class="prose prose-invert prose-sm max-w-none"><pre class="whitespace-pre-wrap text-sm text-slate-300">${escapeHtml(content)}</pre></div>`;
    }

    // Render object content
    let html = '<div class="space-y-4">';

    for (const [key, value] of Object.entries(content)) {
        if (value === null || value === undefined) continue;

        html += `<div class="bg-slate-800/50 rounded-xl p-4">`;
        html += `<h4 class="text-sm font-semibold text-indigo-400 mb-2">${formatKey(key)}</h4>`;

        if (Array.isArray(value)) {
            html += '<ul class="space-y-1">';
            value.forEach(item => {
                if (typeof item === 'object') {
                    html += `<li class="text-sm text-slate-300 bg-slate-700/30 rounded-lg p-3 mb-2">${renderNestedObject(item)}</li>`;
                } else {
                    html += `<li class="text-sm text-slate-300 flex items-start gap-2"><span class="text-indigo-400">•</span>${escapeHtml(String(item))}</li>`;
                }
            });
            html += '</ul>';
        } else if (typeof value === 'object') {
            html += renderNestedObject(value);
        } else {
            html += `<p class="text-sm text-slate-300">${escapeHtml(String(value))}</p>`;
        }

        html += '</div>';
    }

    html += '</div>';
    return html;
}

function renderNestedObject(obj) {
    let html = '<div class="space-y-1">';
    for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined) continue;
        html += `<div class="flex gap-2"><span class="text-xs font-medium text-slate-500 min-w-[80px]">${formatKey(k)}:</span>`;
        if (Array.isArray(v)) {
            html += `<span class="text-sm text-slate-300">${v.join(', ')}</span>`;
        } else if (typeof v === 'object') {
            html += `<span class="text-sm text-slate-300">${JSON.stringify(v)}</span>`;
        } else {
            html += `<span class="text-sm text-slate-300">${escapeHtml(String(v))}</span>`;
        }
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function formatKey(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase())
        .trim();
}

function formatPlanType(type) {
    return type.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// ============================================================
// CHAT
// ============================================================
function initializeEventListeners() {
    // Project selector change
    document.getElementById('project-selector').addEventListener('change', (e) => {
        selectProject(e.target.value);
    });

    // Refresh button
    document.getElementById('btn-refresh').addEventListener('click', () => {
        loadSources();
        showNotification('Refreshed!', 'success');
    });

    // Chat input
    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    document.getElementById('btn-send-chat').addEventListener('click', sendChatMessage);

    // Suggested questions
    document.querySelectorAll('.suggested-question').forEach(btn => {
        btn.addEventListener('click', () => {
            chatInput.value = btn.textContent;
            sendChatMessage();
        });
    });

    // Regenerate summary
    document.getElementById('btn-regenerate-summary').addEventListener('click', () => {
        generateSummary();
    });

    // Target language selector
    const langSelector = document.getElementById('target-language-selector');
    if (langSelector) {
        // Load saved preference
        const savedLang = localStorage.getItem('knowledgeHub_targetLanguage');
        if (savedLang) {
            langSelector.value = savedLang;
            targetLanguage = savedLang;
        }

        langSelector.addEventListener('change', (e) => {
            targetLanguage = e.target.value;
            localStorage.setItem('knowledgeHub_targetLanguage', targetLanguage);
            showNotification(`Target language changed to ${getLanguageName(targetLanguage)}`, 'success');
            // Regenerate summary with new language
            generateSummary();
        });
    }
}

function getLanguageName(code) {
    const names = {
        'ko': '한국어',
        'en': 'English',
        'ja': '日本語',
        'zh': '中文',
        'es': 'Español'
    };
    return names[code] || code;
}


async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    input.value = '';

    // Add user message
    addChatMessage(message, 'user');

    // Add typing indicator
    const typingId = addTypingIndicator();

    try {
        // Call Cloud Function
        const askKnowledgeHub = firebase.functions().httpsCallable('askKnowledgeHub');
        const result = await askKnowledgeHub({
            projectId: currentProjectId,
            question: message
        });

        // Remove typing indicator
        removeTypingIndicator(typingId);

        if (result.data.success) {
            let answer = result.data.answer;

            // Add source attribution if available
            if (result.data.sources && result.data.sources.length > 0) {
                answer += `\n\n📚 Sources: ${result.data.sources.join(', ')}`;
            }

            addChatMessage(answer, 'bot');
        } else {
            addChatMessage('Sorry, I could not generate an answer. Please try again.', 'bot');
        }
    } catch (error) {
        console.error('Error sending chat message:', error);
        removeTypingIndicator(typingId);
        addChatMessage(`Error: ${error.message || 'Failed to get response'}`, 'bot');
    }
}

function addTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const id = 'typing-' + Date.now();

    const typingEl = document.createElement('div');
    typingEl.id = id;
    typingEl.className = 'chat-message flex gap-3';
    typingEl.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span class="text-lg">🤖</span>
        </div>
        <div class="max-w-md bg-slate-800 rounded-2xl rounded-tl-md px-4 py-3">
            <div class="flex gap-1">
                <span class="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                <span class="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                <span class="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
            </div>
        </div>
    `;

    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function addChatMessage(content, type) {
    const container = document.getElementById('chat-messages');

    const messageEl = document.createElement('div');
    messageEl.className = `chat-message flex gap-3 ${type === 'user' ? 'flex-row-reverse' : ''}`;

    if (type === 'user') {
        messageEl.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <span class="text-xs text-white font-medium">${currentUser?.displayName?.charAt(0) || 'U'}</span>
            </div>
            <div class="max-w-md bg-indigo-600 rounded-2xl rounded-tr-md px-4 py-3">
                <p class="text-sm text-white">${escapeHtml(content)}</p>
            </div>
        `;
    } else {
        messageEl.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span class="text-lg">🤖</span>
            </div>
            <div class="max-w-md bg-slate-800 rounded-2xl rounded-tl-md px-4 py-3">
                <p class="text-sm text-slate-200">${escapeHtml(content)}</p>
            </div>
        `;
    }

    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

async function generateSummary() {
    const activeSources = sources.filter(s => s.isActive !== false && s.status === 'completed');

    if (activeSources.length === 0) {
        document.getElementById('summary-title').textContent = 'No sources available';
        document.getElementById('summary-content').textContent = 'Add sources to generate an AI summary of your brand data.';
        document.getElementById('key-insights').classList.add('hidden');
        return;
    }

    // Show loading state
    document.getElementById('summary-title').textContent = 'Generating summary...';
    document.getElementById('summary-content').textContent = 'Analyzing your documents...';

    try {
        // Call Cloud Function with target language
        const generateKnowledgeSummary = firebase.functions().httpsCallable('generateKnowledgeSummary');
        const result = await generateKnowledgeSummary({
            projectId: currentProjectId,
            targetLanguage: targetLanguage
        });

        if (result.data.success) {
            document.getElementById('summary-title').textContent = 'Brand Summary';
            document.getElementById('summary-content').textContent = result.data.summary;

            // Update suggested questions
            if (result.data.suggestedQuestions && result.data.suggestedQuestions.length > 0) {
                const questionsContainer = document.getElementById('suggested-questions').querySelector('.flex');
                questionsContainer.innerHTML = result.data.suggestedQuestions.map(q => `
                    <button class="suggested-question flex-shrink-0 px-4 py-2 text-xs text-slate-400 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:text-white transition-all">
                        ${escapeHtml(q)}
                    </button>
                `).join('');

                // Re-attach click handlers
                document.querySelectorAll('.suggested-question').forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.getElementById('chat-input').value = btn.textContent.trim();
                        sendChatMessage();
                    });
                });
            }

            showNotification('Summary generated!', 'success');
        }
    } catch (error) {
        console.error('Error generating summary:', error);
        document.getElementById('summary-title').textContent = 'Summary';
        document.getElementById('summary-content').textContent = `Based on ${activeSources.length} active sources. (AI summary failed: ${error.message})`;
    }
}

// ============================================================
// UTILITIES
// ============================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function extractDomain(url) {
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch {
        return url.substring(0, 30);
    }
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container') || createNotificationContainer();

    const notification = document.createElement('div');
    notification.className = `px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all transform translate-x-full ${getNotificationClass(type)}`;
    notification.textContent = message;

    container.appendChild(notification);

    requestAnimationFrame(() => {
        notification.classList.remove('translate-x-full');
    });

    setTimeout(() => {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'fixed top-20 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(container);
    return container;
}

function getNotificationClass(type) {
    switch (type) {
        case 'success': return 'bg-emerald-600 text-white';
        case 'error': return 'bg-red-600 text-white';
        case 'warning': return 'bg-amber-600 text-white';
        case 'info': return 'bg-blue-600 text-white';
        default: return 'bg-slate-700 text-white';
    }
}

// ============================================================
// IMAGE GENERATION
// ============================================================
let lastGeneratedImageUrl = null;

function initializeImageGeneration() {
    const modal = document.getElementById('image-gen-modal');
    const closeBtn = document.getElementById('btn-close-image-modal');
    const cancelBtn = document.getElementById('btn-cancel-image');
    const generateBtn = document.getElementById('btn-generate-image');
    const providerSelect = document.getElementById('image-provider');

    // Close modal handlers
    closeBtn?.addEventListener('click', closeImageModal);
    cancelBtn?.addEventListener('click', closeImageModal);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeImageModal();
    });

    // Generate button
    generateBtn?.addEventListener('click', generateImage);

    // Quick prompt buttons
    document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('image-prompt').value = btn.dataset.prompt;
        });
    });

    // Update credits info when provider changes
    providerSelect?.addEventListener('change', updateCreditsInfo);

    // Handle promo_images plan card
    document.querySelector('[data-plan="promo_images"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openImageModal();
    });
}

function openImageModal() {
    const modal = document.getElementById('image-gen-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Reset state
    document.getElementById('image-prompt').value = '';
    document.getElementById('image-preview-container').classList.add('hidden');
    document.getElementById('image-loading').classList.add('hidden');
    document.getElementById('btn-generate-image').disabled = false;

    updateCreditsInfo();
}

function closeImageModal() {
    const modal = document.getElementById('image-gen-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function updateCreditsInfo() {
    const provider = document.getElementById('image-provider').value;
    const creditsMap = {
        'flux': '~1 credit ($0.003)',
        'stability': '~1 credit ($0.003)',
        'dalle': '~5 credits ($0.04)',
        'ideogram': '~6 credits ($0.05)'
    };
    document.getElementById('image-credits-info').textContent = creditsMap[provider] || '~5 credits';
}

async function generateImage() {
    const prompt = document.getElementById('image-prompt').value.trim();
    if (!prompt) {
        showNotification('Please enter an image description', 'warning');
        return;
    }

    const provider = document.getElementById('image-provider').value;
    const size = document.getElementById('image-size').value;

    // Show loading
    document.getElementById('image-loading').classList.remove('hidden');
    document.getElementById('image-preview-container').classList.add('hidden');
    document.getElementById('btn-generate-image').disabled = true;

    try {
        // Build enhanced prompt with brand context
        let enhancedPrompt = prompt;

        // Get active sources for context
        const activeSources = sources.filter(s => s.isActive && s.status === 'completed');
        if (activeSources.length > 0) {
            const brandContext = activeSources
                .slice(0, 3)
                .map(s => s.analysis?.summary || s.title)
                .join('. ');

            if (brandContext) {
                enhancedPrompt = `${prompt}. Brand context: ${brandContext.substring(0, 200)}`;
            }
        }

        console.log(`[generateImage] Using ${provider}, size: ${size}`);
        console.log(`[generateImage] Prompt: ${enhancedPrompt.substring(0, 100)}...`);

        // Call Cloud Function
        const generateImageFn = firebase.functions().httpsCallable('generateImage');
        const result = await generateImageFn({
            prompt: enhancedPrompt,
            provider: provider,
            size: size,
            projectId: currentProjectId,
            purpose: 'promotional'
        });

        if (result.data.success) {
            lastGeneratedImageUrl = result.data.imageUrl;

            // Show preview
            document.getElementById('generated-image-preview').src = result.data.imageUrl;
            document.getElementById('image-download-link').href = result.data.imageUrl;
            document.getElementById('image-preview-container').classList.remove('hidden');

            showNotification(`Image generated with ${result.data.provider}!`, 'success');
        } else {
            throw new Error('Image generation failed');
        }

    } catch (error) {
        console.error('Error generating image:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        document.getElementById('image-loading').classList.add('hidden');
        document.getElementById('btn-generate-image').disabled = false;
    }
}

async function saveImageToGallery() {
    if (!lastGeneratedImageUrl || !currentProjectId) {
        showNotification('No image to save', 'warning');
        return;
    }

    try {
        // Image is already saved by the Cloud Function when projectId is provided
        showNotification('Image saved to project gallery!', 'success');
        closeImageModal();
    } catch (error) {
        console.error('Error saving image:', error);
        showNotification('Failed to save image', 'error');
    }
}

// Initialize image generation when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other initializations
    setTimeout(initializeImageGeneration, 500);
    setTimeout(initializeScheduling, 600);
});

// ============================================================
// SCHEDULING
// ============================================================
let scheduledItems = [];

function initializeScheduling() {
    const modal = document.getElementById('schedule-modal');
    const closeBtn = document.getElementById('btn-close-schedule-modal');
    const cancelBtn = document.getElementById('btn-cancel-schedule');
    const confirmBtn = document.getElementById('btn-confirm-schedule');

    // Close handlers
    closeBtn?.addEventListener('click', closeScheduleModal);
    cancelBtn?.addEventListener('click', closeScheduleModal);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeScheduleModal();
    });

    // Confirm schedule
    confirmBtn?.addEventListener('click', confirmSchedule);

    // Channel selection toggle
    document.querySelectorAll('.channel-option').forEach(option => {
        option.addEventListener('click', () => {
            option.classList.toggle('selected');
        });
    });

    // Set default date/time to tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('schedule-date').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('schedule-time').value = '10:00';
}

function openScheduleModal() {
    const modal = document.getElementById('schedule-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Populate with current plan data
    if (window.currentPlanForScheduling) {
        const { plan } = window.currentPlanForScheduling;
        document.getElementById('schedule-title').value = plan.title || formatPlanType(plan.type);
    }

    // Reset channels
    document.querySelectorAll('.channel-option').forEach(opt => opt.classList.remove('selected'));
}

function closeScheduleModal() {
    const modal = document.getElementById('schedule-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function confirmSchedule() {
    const date = document.getElementById('schedule-date').value;
    const time = document.getElementById('schedule-time').value;
    const reminder = document.getElementById('schedule-reminder').value;
    const notes = document.getElementById('schedule-notes').value;

    if (!date || !time) {
        showNotification('Please select date and time', 'warning');
        return;
    }

    // Get selected channels
    const selectedChannels = [];
    document.querySelectorAll('.channel-option.selected input').forEach(input => {
        selectedChannels.push(input.value);
    });

    if (selectedChannels.length === 0) {
        showNotification('Please select at least one channel', 'warning');
        return;
    }

    const scheduledDateTime = new Date(`${date}T${time}`);

    if (scheduledDateTime <= new Date()) {
        showNotification('Please select a future date and time', 'warning');
        return;
    }

    try {
        const { plan, planId } = window.currentPlanForScheduling || {};

        // Save to Firestore
        const scheduleData = {
            title: document.getElementById('schedule-title').value,
            contentType: plan?.type || 'content_plan',
            contentPlanId: planId || null,
            scheduledAt: firebase.firestore.Timestamp.fromDate(scheduledDateTime),
            channels: selectedChannels,
            reminder: reminder,
            notes: notes,
            status: 'scheduled', // scheduled, published, failed, cancelled
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser?.uid || null
        };

        await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('scheduledContent')
            .add(scheduleData);

        // Update plan status
        if (planId) {
            await firebase.firestore()
                .collection('projects')
                .doc(currentProjectId)
                .collection('contentPlans')
                .doc(planId)
                .update({ status: 'scheduled' });
        }

        showNotification(`Scheduled for ${scheduledDateTime.toLocaleDateString()} at ${time}`, 'success');
        closeScheduleModal();
        closePlanModal();

        // Refresh saved plans list
        await loadSavedPlans();
        await loadUpcomingSchedules();

    } catch (error) {
        console.error('Error scheduling content:', error);
        showNotification('Failed to schedule: ' + error.message, 'error');
    }
}

async function loadUpcomingSchedules() {
    if (!currentProjectId) return;

    try {
        const now = new Date();
        const snapshot = await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('scheduledContent')
            .where('status', '==', 'scheduled')
            .where('scheduledAt', '>=', firebase.firestore.Timestamp.fromDate(now))
            .orderBy('scheduledAt', 'asc')
            .limit(5)
            .get();

        scheduledItems = [];
        snapshot.forEach(doc => {
            scheduledItems.push({ id: doc.id, ...doc.data() });
        });

        renderUpcomingSchedules();

    } catch (error) {
        console.error('Error loading schedules:', error);
    }
}

function renderUpcomingSchedules() {
    // Find or create the upcoming schedules container
    let container = document.getElementById('upcoming-schedules-container');

    if (!container) {
        // Add to saved plans section
        const savedPlansSection = document.querySelector('#saved-plans-list')?.parentElement;
        if (savedPlansSection) {
            const scheduleSection = document.createElement('div');
            scheduleSection.className = 'border-t border-slate-800 p-3 mt-2';
            scheduleSection.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-semibold text-emerald-400">📅 Upcoming</span>
                </div>
                <div id="upcoming-schedules-container" class="space-y-1"></div>
            `;
            savedPlansSection.after(scheduleSection);
            container = document.getElementById('upcoming-schedules-container');
        }
    }

    if (!container) return;

    if (scheduledItems.length === 0) {
        container.innerHTML = '<p class="text-[11px] text-slate-600 text-center py-2">No upcoming schedules</p>';
        return;
    }

    container.innerHTML = scheduledItems.map(item => {
        const date = item.scheduledAt?.toDate?.() || new Date();
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const channels = item.channels?.map(c => getChannelEmoji(c)).join(' ') || '';

        return `
            <div class="flex items-center justify-between p-2 bg-emerald-900/20 border border-emerald-500/20 rounded-lg">
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-slate-300 truncate">${escapeHtml(item.title)}</p>
                    <p class="text-[10px] text-slate-500">${dateStr} at ${timeStr} ${channels}</p>
                </div>
                <button onclick="cancelSchedule('${item.id}')" class="text-xs text-slate-500 hover:text-red-400 p-1" title="Cancel">✕</button>
            </div>
        `;
    }).join('');
}

function getChannelEmoji(channel) {
    switch (channel) {
        case 'x': return '𝕏';
        case 'instagram': return '📸';
        case 'linkedin': return '💼';
        default: return '📢';
    }
}

async function cancelSchedule(scheduleId) {
    if (!confirm('Cancel this scheduled content?')) return;

    try {
        await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('scheduledContent')
            .doc(scheduleId)
            .update({ status: 'cancelled' });

        showNotification('Schedule cancelled', 'info');
        await loadUpcomingSchedules();
    } catch (error) {
        console.error('Error cancelling schedule:', error);
        showNotification('Failed to cancel', 'error');
    }
}

// ============================================================
// CREDITS & BILLING
// ============================================================
let userCredits = {
    plan: 'free',
    credits: 0,
    dailyLimit: 10,
    creditsUsedToday: 0
};

async function loadUserCredits() {
    try {
        const getUserCredits = firebase.functions().httpsCallable('getUserCredits');
        const result = await getUserCredits({});

        if (result.data.success) {
            userCredits = {
                plan: result.data.plan,
                credits: result.data.credits,
                dailyLimit: result.data.dailyLimit,
                creditsUsedToday: result.data.creditsUsedToday,
                planDetails: result.data.planDetails
            };

            updateCreditsDisplay();
        }
    } catch (error) {
        console.error('Error loading credits:', error);
        // Set default values
        userCredits = { plan: 'free', credits: 50, dailyLimit: 10, creditsUsedToday: 0 };
        updateCreditsDisplay();
    }
}

function updateCreditsDisplay() {
    const creditCountEl = document.getElementById('credit-count');
    const creditDisplayEl = document.getElementById('credit-display');

    if (creditCountEl) {
        creditCountEl.textContent = userCredits.credits;
    }

    if (creditDisplayEl) {
        // Update styling based on remaining credits
        if (userCredits.credits <= 10) {
            creditDisplayEl.classList.add('border-red-500/50', 'text-red-400');
            creditDisplayEl.classList.remove('border-slate-700', 'text-slate-400');
        } else if (userCredits.credits <= 25) {
            creditDisplayEl.classList.add('border-amber-500/50', 'text-amber-400');
            creditDisplayEl.classList.remove('border-slate-700', 'text-slate-400');
        } else {
            creditDisplayEl.classList.remove('border-red-500/50', 'text-red-400', 'border-amber-500/50', 'text-amber-400');
            creditDisplayEl.classList.add('border-slate-700', 'text-slate-400');
        }

        // Add plan badge
        if (userCredits.plan !== 'free') {
            const badge = userCredits.plan === 'pro' ? '⭐' : userCredits.plan === 'starter' ? '🚀' : '💎';
            creditDisplayEl.innerHTML = `${badge} <span id="credit-count">${userCredits.credits}</span> credits`;
        }
    }
}

async function checkAndDeductCredits(operation, customCost = null) {
    const costs = {
        chat_message: 1,
        generate_summary: 2,
        content_plan_quick: 1,
        content_plan_strategy: 10,
        content_plan_knowledge: 5,
        content_plan_create: 15,
        image_flux: 1,
        image_stability: 1,
        image_dalle: 5,
        image_ideogram: 6,
        source_analysis: 1
    };

    const cost = customCost || costs[operation] || 1;

    // Check if enough credits
    if (userCredits.credits < cost) {
        showUpgradeModal('insufficient_credits', cost);
        return false;
    }

    // Check daily limit
    if (userCredits.creditsUsedToday + cost > userCredits.dailyLimit) {
        showUpgradeModal('daily_limit', cost);
        return false;
    }

    try {
        const deductCredits = firebase.functions().httpsCallable('deductCredits');
        const result = await deductCredits({ operation, amount: cost });

        if (result.data.success) {
            userCredits.credits = result.data.remaining;
            userCredits.creditsUsedToday += cost;
            updateCreditsDisplay();
            return true;
        } else {
            if (result.data.error === 'insufficient_credits') {
                showUpgradeModal('insufficient_credits', cost);
            } else if (result.data.error === 'daily_limit_exceeded') {
                showUpgradeModal('daily_limit', cost);
            }
            return false;
        }
    } catch (error) {
        console.error('Error deducting credits:', error);
        // Allow operation but log error
        return true;
    }
}

function showUpgradeModal(reason, requiredCredits) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm';
    modal.id = 'upgrade-modal';

    let title, message, icon;
    if (reason === 'insufficient_credits') {
        title = 'Not Enough Credits';
        message = `This action requires ${requiredCredits} credits. You have ${userCredits.credits} remaining.`;
        icon = '🪙';
    } else if (reason === 'daily_limit') {
        title = 'Daily Limit Reached';
        message = `You've used ${userCredits.creditsUsedToday}/${userCredits.dailyLimit} credits today. Upgrade for higher limits.`;
        icon = '⏰';
    } else {
        title = 'Upgrade Required';
        message = 'This feature requires a higher plan.';
        icon = '💎';
    }

    modal.innerHTML = `
        <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6 text-center">
            <div class="text-5xl mb-4">${icon}</div>
            <h3 class="text-xl font-bold text-white mb-2">${title}</h3>
            <p class="text-slate-400 text-sm mb-6">${message}</p>
            
            <div class="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl p-4 mb-6 border border-indigo-500/30">
                <p class="text-xs text-slate-400 mb-2">Upgrade to Pro for:</p>
                <ul class="text-sm text-white space-y-1">
                    <li>✓ 2,000 credits/month</li>
                    <li>✓ 500 daily limit</li>
                    <li>✓ Advanced analytics</li>
                    <li>✓ Priority support</li>
                </ul>
                <p class="text-lg font-bold text-indigo-400 mt-3">$49/month</p>
            </div>
            
            <div class="flex gap-3">
                <button onclick="closeUpgradeModal()" class="flex-1 py-2.5 text-slate-400 hover:text-white text-sm">
                    Maybe Later
                </button>
                <button onclick="openBillingPage()" class="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-medium">
                    Upgrade Now
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeUpgradeModal();
    });
}

function closeUpgradeModal() {
    document.getElementById('upgrade-modal')?.remove();
}

function openBillingPage() {
    closeUpgradeModal();
    // Navigate to billing page or open Stripe checkout
    window.location.href = 'settings.html?tab=billing';
}

// Check feature access
async function checkFeatureAccess(feature) {
    const features = {
        basic_chat: ['free', 'starter', 'pro', 'enterprise'],
        link_sources: ['free', 'starter', 'pro', 'enterprise'],
        note_sources: ['free', 'starter', 'pro', 'enterprise'],
        drive_sources: ['starter', 'pro', 'enterprise'],
        content_plans: ['starter', 'pro', 'enterprise'],
        image_gen: ['starter', 'pro', 'enterprise'],
        scheduling: ['pro', 'enterprise'],
        analytics: ['pro', 'enterprise']
    };

    const allowedPlans = features[feature] || ['enterprise'];

    if (!allowedPlans.includes(userCredits.plan)) {
        showUpgradeModal('feature', 0);
        return false;
    }
    return true;
}
