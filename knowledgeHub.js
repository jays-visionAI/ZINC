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
// const GOOGLE_DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
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
let currentSummary = null; // Store current summary for save/copy
let brandSummaries = []; // Store brand summary history
let currentDisplayedSummary = null; // Currently displayed summary (could be history or latest)
const MAX_SUMMARY_HISTORY = 20; // Maximum number of summary notes to keep

// Plan Management State
let currentPlanCategory = 'knowledge'; // Default
let cachedSavedPlans = []; // Store fetched plans for client-side filtering

// Chat Configuration
let chatConfig = {
    style: 'default',      // default, learning, custom
    length: 'default',     // default, longer, shorter
    customPrompt: ''
};

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
    initializeMobileTabs();
    setPerformanceMode('balanced'); // Init UI
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
            loadChatConfig(); // Load saved chat configuration
            initializePanelClickOutside();  // Initialize panel collapse on outside click
        } else {
            window.location.href = 'index.html';
        }
    });
}

// Performance Elasticity Logic
function setPerformanceMode(mode) {
    currentUserPerformanceMode = mode;

    // Update UI Toggles
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === mode) {
            // Active Styles
            if (mode === 'eco') btn.className = 'mode-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
            if (mode === 'balanced') btn.className = 'mode-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all text-indigo-400 bg-indigo-500/10 border border-indigo-500/20';
            if (mode === 'pro') btn.className = 'mode-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all text-rose-400 bg-rose-500/10 border border-rose-500/20';
        } else {
            // Inactive Styles
            btn.className = 'mode-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all text-slate-400 hover:text-white';
        }
    });

    // Update Cost Estimation in UI (Visual feedback)
    const costEl = document.getElementById('creative-cost');
    if (costEl) {
        let baseCost = 10;
        if (currentCreativeType && CREATIVE_CONFIGS[currentCreativeType]) {
            baseCost = CREATIVE_CONFIGS[currentCreativeType].credits;
        }

        let multiplier = 1;
        if (mode === 'eco') multiplier = 0.5;
        if (mode === 'pro') multiplier = 3; // Arena is expensive

        costEl.textContent = `${Math.ceil(baseCost * multiplier)} cr`;
    }
}

// ============================================================
// GOOGLE DRIVE INTEGRATION
// ============================================================

/**
 * Initialize Google APIs (GAPI + GIS)
 */
function initializeGoogleAPIs() {
    // Load GAPI with retry logic
    if (typeof gapi !== 'undefined') {
        gapi.load('client:picker', async () => {
            const maxRetries = 3;
            let retryCount = 0;

            const initGAPI = async () => {
                try {
                    await gapi.client.init({
                        apiKey: GOOGLE_API_KEY,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    });

                    gapiInited = true;
                    console.log('GAPI initialized successfully (v3)');
                    maybeEnableGoogleDrive();
                } catch (error) {
                    console.error('Error initializing GAPI (attempt ' + (retryCount + 1) + '):', error);

                    // Retry on transient errors (502, 503, network errors)
                    if (retryCount < maxRetries - 1) {
                        retryCount++;
                        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
                        console.log(`Retrying GAPI init in ${delay / 1000}s...`);
                        setTimeout(initGAPI, delay);
                    } else {
                        console.error('GAPI initialization failed after ' + maxRetries + ' attempts');
                        // Suppress UI notification for GAPI failure to avoid blocking other features
                        console.warn('Google API connection failed. Drive features will be unavailable.');
                    }
                }
            };

            await initGAPI();
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
 * NEW: Set Analysis Level for Brand Intelligence
 * @param {string} level - 'standard' or 'depth'
 */
function setAnalysisLevel(level) {
    const standardBtn = document.getElementById('btn-analysis-standard');
    const depthBtn = document.getElementById('btn-analysis-depth');
    const depthOptions = document.getElementById('depth-options');
    const levelInput = document.getElementById('current-analysis-level');

    if (!standardBtn || !depthBtn || !levelInput) return;

    levelInput.value = level;
    console.log('[KnowledgeHub] setting analysis level to:', level);

    if (level === 'standard') {
        // Active: Standard
        standardBtn.classList.remove('text-slate-500', 'hover:text-slate-300');
        standardBtn.classList.add('bg-indigo-600', 'text-white');

        // Inactive: Depth
        depthBtn.classList.remove('bg-indigo-600', 'text-white');
        depthBtn.classList.add('text-slate-500', 'hover:text-slate-300');

        if (depthOptions) depthOptions.classList.add('hidden');
    } else {
        // Inactive: Standard
        standardBtn.classList.remove('bg-indigo-600', 'text-white');
        standardBtn.classList.add('text-slate-500', 'hover:text-slate-300');

        // Active: Depth
        depthBtn.classList.remove('text-slate-500', 'hover:text-slate-300');
        depthBtn.classList.add('bg-indigo-600', 'text-white');

        if (depthOptions) depthOptions.classList.remove('hidden');
    }
}
window.setAnalysisLevel = setAnalysisLevel;

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
        showNotification(`Extracting content from ${file.name}...`, 'info');

        let extractedText = '';

        // 1. Fetch File Content using GAPI (Client-side)
        // We use the accessToken already obtained from the Picker flow
        if (gapiInited && accessToken) {
            try {
                // Determine if it's a Google Doc or binary file
                const isGoogleDoc = file.mimeType.startsWith('application/vnd.google-apps.');

                if (isGoogleDoc) {
                    // Export Google Docs as plain text
                    const response = await gapi.client.drive.files.export({
                        fileId: file.id,
                        mimeType: 'text/plain'
                    });
                    extractedText = response.body || '';
                } else {
                    // For PDFs/Text files, try to get media content if text-based
                    // Note: Browser-side binary extraction is complex. 
                    // For now, we prioritize Google Docs. 
                    // If it's a text file, download it.
                    if (file.mimeType.startsWith('text/') || file.mimeType === 'application/json') {
                        const response = await gapi.client.drive.files.get({
                            fileId: file.id,
                            alt: 'media'
                        });
                        extractedText = response.body || '';
                    } else {
                        extractedText = `(Binary file: ${file.name}. Analysis relies on metadata.)`;
                    }
                }
            } catch (err) {
                console.warn('Failed to extract Drive content client-side:', err);
                extractedText = `(Content extraction failed: ${err.message})`;
            }
        }

        const sourceData = {
            sourceType: 'google_drive',
            title: file.name,
            isActive: true,
            status: 'pending',
            extractedText: extractedText, // Save extracted text directly
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

        console.log('Added Drive source with content:', file.name);

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
            <div class="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                 <h4 class="text-xs font-semibold text-slate-300 mb-2">Supported Formats</h4>
                 <ul class="text-xs text-slate-500 list-disc list-inside space-y-1">
                    <li>Google Docs (converted to text)</li>
                    <li>PDF (text-based)</li>
                    <li>Text Files (.txt, .md, .json)</li>
                    <li>Word (.docx), PowerPoint (.pptx)</li>
                 </ul>
                 <p class="text-[10px] text-slate-600 mt-2">* Large files (>5MB) may take longer to process.</p>
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

        // Priority: 1) URL param, 2) Global localStorage, 3) First project
        const urlParams = new URLSearchParams(window.location.search);
        const projectIdFromUrl = urlParams.get('projectId');
        const globalProjectId = localStorage.getItem('currentProjectId');

        let selectedProjectId = null;

        if (projectIdFromUrl && projects.find(p => p.id === projectIdFromUrl)) {
            selectedProjectId = projectIdFromUrl;
            // Also save to global state
            localStorage.setItem('currentProjectId', projectIdFromUrl);
        } else if (globalProjectId && projects.find(p => p.id === globalProjectId)) {
            selectedProjectId = globalProjectId;
        } else if (projects.length > 0) {
            selectedProjectId = projects[0].id;
            localStorage.setItem('currentProjectId', selectedProjectId);
        }

        if (selectedProjectId) {
            projectSelector.value = selectedProjectId;
            await selectProject(selectedProjectId);
        }

        // Add change listener to sync to global state
        projectSelector.addEventListener('change', async (e) => {
            const newProjectId = e.target.value;
            if (newProjectId) {
                localStorage.setItem('currentProjectId', newProjectId);
                await selectProject(newProjectId);
            }
        });

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

            // Optimize loading with parallel execution using Promise.all
            await Promise.all([
                loadSources(),
                loadBrandSummaries(),
                loadSavedPlans()
            ]);

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
                // Phase 1: Knowledge Score
                calculateKnowledgeScore(sources);
            }, (error) => {
                console.error('Error loading sources:', error);
                showNotification('Failed to load sources', 'error');
            });

    } catch (error) {
        console.error('Error setting up sources listener:', error);
        showNotification('Failed to setup sources listener', 'error');
    }
}

// Load Brand Summaries (History)
async function loadBrandSummaries() {
    if (!currentProjectId) return;

    try {
        const snapshot = await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('brandSummaries')
            .orderBy('createdAt', 'desc')
            .limit(MAX_SUMMARY_HISTORY)
            .get();

        brandSummaries = [];
        snapshot.forEach(doc => {
            brandSummaries.push({ id: doc.id, ...doc.data() });
        });

        // Loop to delete excess if any (though limit above handles fetch, we should cleanup DB if needed)
        // For simplicity, we handle cleanup on save.

        updateSummarySection();

    } catch (error) {
        console.error('Error loading brand summaries:', error);
    }
}

function updateSummarySection() {
    const summaryCard = document.getElementById('brand-summary-card');
    const summaryTitle = document.getElementById('summary-title');
    const summaryContent = document.getElementById('summary-content');
    const keyInsights = document.getElementById('key-insights');
    const insightsList = document.getElementById('insights-list');
    const btnRegenerate = document.getElementById('btn-regenerate-summary');

    // 1. Determine which summary to show
    // Priority: currentDisplayedSummary (manual override) -> Latest from history -> Loading/Empty

    let summaryToShow = currentDisplayedSummary;
    if (!summaryToShow && brandSummaries.length > 0) {
        summaryToShow = brandSummaries[0];
    }

    // Store for View Report button access
    window.activeSummaryToShow = summaryToShow;

    // 2. Render Based on State
    if (!summaryToShow) {
        // State: No Summary Available (Welcome Screen)
        renderSummaryHeader('brand');
        summaryTitle.innerHTML = '🤖 <span class="ml-2">Brand Intelligence</span>';
        summaryContent.textContent = 'Add sources from the left panel to generate your Brand Summary.';

        // Hide details
        keyInsights.classList.add('hidden');
        document.getElementById('summary-actions').classList.add('hidden');

        const questionsContainer = document.getElementById('suggested-questions-container');
        if (questionsContainer) questionsContainer.classList.add('hidden');
        return;
    }

    // State: Summary Content Available

    // A. Render Main Card (Choice: Source View vs Brand Summary)
    if (summaryToShow.isSourceView && summaryToShow.sourceId) {
        // --- Source View ---
        renderSummaryHeader('source');
        summaryTitle.innerHTML = `<span class="text-emerald-400">📄</span> <span class="ml-2">${summaryToShow.title}</span>`;

        const importance = summaryToShow.importance || 2;
        const summarizedAt = summaryToShow.summarizedAt || 'Not yet';

        // Build star rating HTML
        const starsHtml = [1, 2, 3].map(star => `
            <span class="importance-star cursor-pointer text-lg transition-transform hover:scale-125 ${star <= importance ? 'text-yellow-400' : 'text-slate-600'}" 
                  onclick="updateSourceImportance('${summaryToShow.sourceId}', ${star})"
                  title="Set importance to ${star}">
                ${star <= importance ? '★' : '☆'}
            </span>
        `).join('');

        summaryContent.innerHTML = `
            <div class="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
                 <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-500">Importance:</span>
                        <div class="flex gap-1">${starsHtml}</div>
                    </div>
                    <div class="text-xs text-slate-500">
                        Summarized: <span class="text-slate-400">${summarizedAt}</span>
                    </div>
                 </div>
                 <button onclick="closeSourceView()" class="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    Close
                 </button>
            </div>
            <div class="text-base text-slate-300 leading-relaxed font-light">
                ${summaryToShow.content || 'No summary available for this source.'}
            </div>
            <div class="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                <div class="flex gap-2">
                    <button onclick="regenerateSourceSummary('${summaryToShow.sourceId}')" 
                            class="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                        Regenerate Analysis
                    </button>
                    <button onclick="useSourceInStudio()" 
                            class="px-3 py-1.5 text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg transition-all flex items-center gap-2 border border-emerald-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        Use in Studio
                    </button>
                </div>
                <button onclick="closeSourceView()" 
                        class="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all">
                    Back to Overview
                </button>
            </div>
        `;

        // Hide standard actions in source view
        document.getElementById('summary-actions').classList.add('hidden');

    } else {
        // --- Brand Summary View ---
        renderSummaryHeader('brand');
        summaryTitle.innerHTML = `🤖 <span class="ml-2">${summaryToShow.title}</span>`;

        // Weight Breakdown Logic
        let weightBreakdownHtml = '';
        if (summaryToShow.weightBreakdown && summaryToShow.weightBreakdown.length > 0) {
            const maxPercent = Math.max(...summaryToShow.weightBreakdown.map(w => w.percent));
            weightBreakdownHtml = `
                <div class="mb-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 3v18h18"/>
                                <path d="M7 16l4-8 4 4 5-9"/>
                            </svg>
                            Weight Distribution
                        </h4>
                        <button onclick="openWeightReport(window.activeSummaryToShow?.weightBreakdown, window.activeSummaryToShow?.title)" 
                                class="px-2 py-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg transition-all flex items-center gap-1.5 border border-indigo-600/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"/>
                            </svg>
                            View Report
                        </button>
                    </div>
                    <div class="space-y-2">
                        ${summaryToShow.weightBreakdown.slice(0, 4).map(w => `
                            <div class="flex items-center gap-3">
                                <span class="text-xs ${w.importance === 3 ? 'text-red-400' : (w.importance === 2 ? 'text-yellow-400' : 'text-slate-400')}">
                                    ${'⭐'.repeat(w.importance)}
                                </span>
                                <span class="text-xs text-slate-300 truncate flex-1" title="${escapeHtml(w.title)}">${escapeHtml(w.title.substring(0, 30))}${w.title.length > 30 ? '...' : ''}</span>
                                <div class="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div class="h-full bg-indigo-500 rounded-full transition-all" style="width: ${(w.percent / maxPercent) * 100}%"></div>
                                </div>
                                <span class="text-xs text-indigo-400 font-medium w-8 text-right">${w.percent}%</span>
                            </div>
                        `).join('')}
                        ${summaryToShow.weightBreakdown.length > 4 ? `
                            <div class="text-xs text-slate-500 text-center pt-1">+${summaryToShow.weightBreakdown.length - 4} more documents • Click "View Report" for details</div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        summaryContent.innerHTML = weightBreakdownHtml + `
            <div class="text-base text-slate-300 leading-relaxed">
                ${summaryToShow.content}
            </div>
        `;
        // Show standard actions
        document.getElementById('summary-actions').classList.remove('hidden');
    }

    // B. Render Key Insights (Common)
    if (summaryToShow.keyInsights && summaryToShow.keyInsights.length > 0) {
        keyInsights.classList.remove('hidden');
        insightsList.innerHTML = summaryToShow.keyInsights.map(insight => `
            <span class="px-3 py-1 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                ${escapeHtml(insight)}
            </span>
        `).join('');
    } else {
        keyInsights.classList.add('hidden');
    }

    // C. Render Suggested Questions (Common)
    const questionsContainer = document.getElementById('suggested-questions-container');
    if (questionsContainer) {
        if (summaryToShow.suggestedQuestions && summaryToShow.suggestedQuestions.length > 0) {
            questionsContainer.classList.remove('hidden');
            const questionsList = questionsContainer.querySelector('.flex');
            if (questionsList) {
                questionsList.innerHTML = summaryToShow.suggestedQuestions.map(q => `
                    <button class="suggested-question px-4 py-2 text-sm text-slate-300 bg-slate-800 rounded-full hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
                            onclick="setInput('${escapeHtml(q)}')">${escapeHtml(q)}
                    </button>
                `).join('');
            }
        } else {
            questionsContainer.classList.add('hidden');
        }
    }

    currentSummary = summaryToShow; // Update global current for actions

    // 2. Logic for Regenerate Button
    // Check if new sources added or updated since last summary
    if (btnRegenerate) {
        const activeSources = sources.filter(s => s.isActive !== false);
        if (activeSources.length === 0) {
            btnRegenerate.disabled = true;
            btnRegenerate.classList.add('opacity-50', 'cursor-not-allowed');
            return;
        }

        btnRegenerate.disabled = false;
        btnRegenerate.classList.remove('opacity-50', 'cursor-not-allowed');

        // Optional: Highlight if new data available
        // Find latest source update
        const latestSourceUpdate = activeSources.reduce((latest, s) => {
            const date = s.updatedAt?.toDate?.() || new Date(0);
            return date > latest ? date : latest;
        }, new Date(0));

        const lastSummaryDate = brandSummaries.length > 0 && brandSummaries[0].createdAt ?
            brandSummaries[0].createdAt.toDate() : new Date(0);

        if (latestSourceUpdate > lastSummaryDate) {
            btnRegenerate.classList.add('ring-2', 'ring-indigo-500', 'animate-pulse');
            btnRegenerate.textContent = 'Update Summary (New Data)';
        } else {
            btnRegenerate.classList.remove('ring-2', 'ring-indigo-500', 'animate-pulse');
            btnRegenerate.textContent = 'Regenerate';
        }
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
    const importanceStars = getImportanceIndicator(source.importance || 2);

    div.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg ${getSourceBgColor(source.sourceType)} flex items-center justify-center flex-shrink-0">
                ${icon}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-white truncate">${escapeHtml(source.title || 'Untitled')}</span>
                    ${statusBadge}
                    ${importanceStars}
                </div>
                <p class="text-[11px] text-slate-500 truncate">${getSourceDescription(source)}</p>
            </div>
            <div class="flex items-center gap-2">
                <div class="toggle-switch ${source.isActive !== false ? 'active' : ''}" data-source-id="${source.id}"></div>
                <button class="delete-source-btn text-slate-500 hover:text-red-400 transition-colors p-1" data-source-id="${source.id}" title="Delete source">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    // Row Click - Open Source Summary/Content
    div.addEventListener('click', (e) => {
        // Don't trigger if clicking on delete or toggle
        if (e.target.closest('.delete-source-btn') || e.target.closest('.toggle-switch')) return;
        openSourceContent(source.id);
    });

    // Toggle click handler
    const toggle = div.querySelector('.toggle-switch');
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSourceActive(source.id, !toggle.classList.contains('active'));
    });

    // Delete click handler
    const deleteBtn = div.querySelector('.delete-source-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeleteSource(source.id, source.title);
    });

    return div;
}

// Get importance indicator (dots for compact display)
function getImportanceIndicator(importance) {
    const level = importance || 2;
    const colors = {
        1: 'text-slate-500',
        2: 'text-yellow-500',
        3: 'text-red-500'
    };
    const dots = '●'.repeat(level) + '○'.repeat(3 - level);
    return `<span class="text-[10px] ${colors[level]} ml-1" title="Importance: ${level}/3">${dots}</span>`;
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

function openSourceContent(sourceId) {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    // Track selected source for panel expansion
    selectedSourceId = sourceId;
    expandSourcesPanel();

    // Use source.summary if available, otherwise description or content
    // PRD says: Source Summary (3-5 sentences).
    const content = source.summary || source.description || source.content || 'No summary available for this source.';
    const summarizedAt = source.summarizedAt ? new Date(source.summarizedAt.toDate()).toLocaleDateString() : 'Not yet';
    const importance = source.importance || 2;

    // Create a temporary summary object for display
    const tempSummary = {
        title: `📄 ${source.title}`,
        content: content,
        keyInsights: source.keyInsights || [],
        suggestedQuestions: [], // Questions usually apply to global summary
        isSourceView: true,
        sourceId: source.id,
        summarizedAt: summarizedAt,
        importance: importance
    };

    currentDisplayedSummary = tempSummary;
    updateSummarySection();

    // Scroll to top
    const chatContent = document.getElementById('chat-content');
    if (chatContent) {
        chatContent.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Animation
    const summaryCard = document.getElementById('brand-summary-card');
    if (summaryCard) {
        summaryCard.classList.remove('animate-slide-down');
        void summaryCard.offsetWidth; // Trigger reflow
        summaryCard.classList.add('animate-slide-down');
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

    // Block Google Drive/Docs Links
    if (url.includes('docs.google.com') || url.includes('drive.google.com')) {
        showNotification('Please use the "Drive" tab to add Google Docs/Drive files.', 'warning');
        // Optional: Auto-switch tab?
        // document.querySelector('[data-type="drive"]').click();
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
// DELETE SOURCE
// ============================================================

// Confirm delete with modal
function confirmDeleteSource(sourceId, sourceTitle) {
    const confirmed = confirm(`Delete "${sourceTitle || 'this source'}"?\n\nThis will remove it from your Knowledge Hub and may affect your Brand Summary.`);
    if (confirmed) {
        deleteSource(sourceId);
    }
}

// Delete source from Firestore
async function deleteSource(sourceId) {
    if (!currentProjectId || !sourceId) return;

    try {
        // Delete from Firestore
        await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .doc(sourceId)
            .delete();

        // Remove from local state
        sources = sources.filter(s => s.id !== sourceId);

        // Re-render sources list
        renderSources();

        // If the deleted source was being displayed, clear the summary view
        if (currentDisplayedSummary?.sourceId === sourceId) {
            currentDisplayedSummary = null;
            updateSummarySection();
        }

        showNotification('Source deleted successfully', 'success');
        updateSourceCounts();

    } catch (error) {
        console.error('Error deleting source:', error);
        showNotification('Failed to delete source', 'error');
    }
}

// ============================================================
// PANEL EXPANSION
// ============================================================

// Expand sources panel
function expandSourcesPanel() {
    const panel = document.getElementById('sources-panel');
    if (panel) {
        panel.classList.add('expanded');
    }
}

// Collapse sources panel
function collapseSourcesPanel() {
    const panel = document.getElementById('sources-panel');
    if (panel) {
        panel.classList.remove('expanded');
    }
    selectedSourceId = null;
}

// Initialize click-outside detection for panel collapse
function initializePanelClickOutside() {
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('sources-panel');
        if (!panel || !panel.classList.contains('expanded')) return;

        // Check if click is outside the sources panel
        if (!panel.contains(e.target)) {
            collapseSourcesPanel();
        }
    });
}

// Select a source and expand panel with details
function selectSourceForDetail(sourceId) {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    selectedSourceId = sourceId;
    expandSourcesPanel();

    // Also show in right panel (Brand Intelligence)
    openSourceContent(sourceId);
}

// ============================================================
// SOURCE IMPORTANCE (WEIGHT)
// ============================================================

// Update source importance (1-3 stars)
async function updateSourceImportance(sourceId, importance) {
    if (!currentProjectId || !sourceId) return;

    const validImportance = Math.max(1, Math.min(3, importance));

    try {
        await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .doc(sourceId)
            .update({
                importance: validImportance,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Update local state
        const source = sources.find(s => s.id === sourceId);
        if (source) source.importance = validImportance;

        // Re-render sources list (updates the dots on cards)
        renderSources();

        showNotification(`Document importance set to ${'⭐'.repeat(validImportance)}`, 'success');

        // Force re-render the summary section with updated stars
        // Check if current displayed summary is for this source
        if (currentDisplayedSummary && currentDisplayedSummary.sourceId === sourceId) {
            currentDisplayedSummary.importance = validImportance;
            updateSummarySection();
        }

    } catch (error) {
        console.error('Error updating importance:', error);
        showNotification('Failed to update importance', 'error');
    }
}

// ============================================================
// INDIVIDUAL SOURCE SUMMARY REGENERATION
// ============================================================

// Helper to switch visual styles
function renderSummaryHeader(mode) {
    const card = document.getElementById('brand-summary-card');
    if (!card) return;

    if (mode === 'source') {
        // Active Source View Style
        card.classList.remove('border-slate-800', 'bg-slate-900/50');
        card.classList.add('border-indigo-500/30', 'bg-slate-900');
    } else {
        // Default Brand Summary Style
        card.classList.remove('border-indigo-500/30', 'bg-slate-900');
        card.classList.add('border-slate-800', 'bg-slate-900/50');
    }
}

function closeSourceView() {
    currentDisplayedSummary = null; // Reset to show default/latest
    updateSummarySection();
}

/**
 * Regenerate Source Summary
 */
async function regenerateSourceSummary(sourceId) {
    if (!currentProjectId || !sourceId) return;

    const source = sources.find(s => s.id === sourceId);
    if (!source) {
        showNotification('Source not found', 'error');
        return;
    }

    // Check for Boost Mode
    const boostActive = document.getElementById('summary-boost-active')?.value === 'true';
    const qualityTier = boostActive ? 'BOOST' : 'DEFAULT';  // "BOOST" uses Gemini 3.0 Pro, "DEFAULT" uses Gemini 2.0 Flash

    showNotification(`🤖 Market Analyst: Analyzing (${boostActive ? 'Boosted 🚀' : 'Standard'})...`, 'info');

    try {
        // Get content to summarize based on source type
        let contentToSummarize = '';

        if (source.sourceType === 'note') {
            contentToSummarize = source.note?.content || '';
        } else if (source.sourceType === 'link') {
            contentToSummarize = source.link?.extractedContent || source.link?.url || '';
        } else if (source.sourceType === 'google_drive') {
            contentToSummarize = source.googleDrive?.extractedContent || source.googleDrive?.fileName || '';
        }

        if (!contentToSummarize) {
            showNotification('No content available to summarize', 'error');
            return;
        }

        // Call AI via routeLLM (PRD 11.6 Router)
        const routeLLM = firebase.functions().httpsCallable('routeLLM');

        const result = await routeLLM({
            feature: 'brandbrain.analysis', // Maps to Gemini 3.0 Pro (Boost) or Gemini 2.0 Flash (Default)
            qualityTier: qualityTier,
            systemPrompt: 'You are a helpful assistant that creates concise document summaries. Structure your response with a clear summary followed by key bullet points.',
            userPrompt: `Please provide a concise summary of the following document content. Focus on the main strategy, key insights, and actionable items.
            
Document Title: ${source.title || 'Untitled'}
Document Type: ${source.sourceType}
Content:
${contentToSummarize.substring(0, 15000)}` // Increased limit for Gemini
        });

        // routeLLM returns { content: "...", model: "...", ... }
        const responseText = result.data?.content;

        if (responseText) {
            // Save summary to Firestore
            await firebase.firestore()
                .collection('projects')
                .doc(currentProjectId)
                .collection('knowledgeSources')
                .doc(sourceId)
                .update({
                    summary: responseText, // Use responseText
                    summarizedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Update local state
            source.summary = responseText;
            source.summarizedAt = { toDate: () => new Date() };

            // Refresh the view
            openSourceContent(sourceId);

            showNotification(`Market Analyst: Analysis complete! (${qualityTier})`, 'success');
        } else {
            console.error('RouteLLM Empty Response:', result.data);
            showNotification(`Failed to generate: ${result.data?.error || 'No content returned from AI'}`, 'error');
        }

    } catch (error) {
        console.error('Error regenerating source summary:', error);
        // Show detailed error from Cloud Function
        const errorMsg = error.details?.message || error.message || 'Unknown error';
        showNotification(`Generation Error: ${errorMsg}`, 'error');
    }
}

// Boost Toggle Logic
window.toggleBoost = function (context) {
    const btnId = `btn-boost-${context}`;
    const inputId = `${context}-boost-active`;
    const iconId = `boost-icon-${context}`;

    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (!btn || !input) return;

    const isActive = input.value === 'true';
    const newState = !isActive;

    input.value = newState;

    if (newState) {
        // Active State
        btn.classList.remove('bg-slate-700/50', 'text-slate-300', 'border-slate-600/50');
        btn.classList.add('bg-indigo-600', 'text-white', 'border-indigo-500', 'ring-2', 'ring-indigo-500/30');
        if (icon) icon.classList.remove('grayscale');
    } else {
        // Inactive State
        btn.classList.add('bg-slate-700/50', 'text-slate-300', 'border-slate-600/50');
        btn.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-500', 'ring-2', 'ring-indigo-500/30');
        if (icon) icon.classList.add('grayscale');
    }
};

// ============================================================
// CONTENT PLANS
// ============================================================

// Category items definitions
const PLAN_CATEGORY_ITEMS = {
    knowledge: [
        { id: 'brand_mind_map', name: 'Brand Mind Map', desc: 'Visual brand summary', credits: 5 },
        { id: 'competitor_analysis', name: 'Competitor Analysis', desc: 'Competitive landscape report', credits: 5 },
        { id: 'audience_persona', name: 'Audience Persona', desc: 'Target customer profiles', credits: 5 },
        { id: 'key_messages_bank', name: 'Key Messages Bank', desc: 'Core messaging library', credits: 5 }
    ],
    strategic: [
        { id: 'campaign_brief', name: 'Campaign Brief', desc: 'Full campaign strategy document', credits: 10 },
        { id: 'content_calendar', name: 'Content Calendar', desc: 'Monthly posting schedule', credits: 10 },
        { id: 'channel_strategy', name: 'Channel Strategy', desc: 'Platform-specific approach', credits: 10 },
        { id: 'messaging_framework', name: 'Messaging Framework', desc: 'Brand voice guidelines', credits: 10 }
    ],
    quick: [
        { id: 'social_post_ideas', name: 'Social Post Ideas', desc: '5-10 post concepts', credits: 1 },
        { id: 'ad_copy', name: 'Ad Copy Variants', desc: 'Multiple ad copy options', credits: 1 },
        { id: 'trend_response', name: 'Trend Response', desc: 'Quick trend-based content', credits: 1 },
        { id: 'action_items', name: 'Action Items', desc: 'Weekly task list', credits: 1 }
    ],
    create: [
        { id: 'product_brochure', name: 'Product Brochure', desc: 'PDF + Image brochure', credits: 20 },
        { id: 'promo_images', name: 'Promo Images', desc: 'AI-generated images', credits: 5 },
        { id: 'one_pager', name: '1-Pager PDF', desc: 'Executive summary document', credits: 15 },
        { id: 'pitch_deck', name: 'Pitch Deck', desc: 'Full presentation with AI visuals', credits: 25 },
        { id: 'email_template', name: 'Email Template', desc: 'Marketing email drafts', credits: 5 },
        { id: 'press_release', name: 'Press Release', desc: 'Media announcement draft', credits: 10 }
    ]
};

// let selectedCategory = null; // Replaced by currentPlanCategory

function initializePlanCards() {
    // Select first category by default
    selectPlanCategory('knowledge');

    // Event delegation for dynamically rendered plan items
    const container = document.getElementById('plan-items-container');
    if (container) {
        container.addEventListener('click', (e) => {
            const planCard = e.target.closest('.plan-card');
            if (planCard) {
                const planType = planCard.dataset.plan;
                if (planType) {
                    openPlanModal(planType);
                }
            }
        });
    }

    // Load saved plans
    loadSavedPlans();
}

/**
 * Select a plan category and show its items
 */
function selectPlanCategory(category) {
    currentPlanCategory = category;

    // Update category button styles
    document.querySelectorAll('.plan-category-btn').forEach(btn => {
        const cat = btn.dataset.category;
        if (cat === category) {
            btn.classList.add('ring-2', 'ring-offset-2', 'ring-offset-slate-900');
            // Add ring color based on category
            if (cat === 'knowledge') btn.classList.add('ring-amber-500');
            else if (cat === 'strategic') btn.classList.add('ring-indigo-500');
            else if (cat === 'quick') btn.classList.add('ring-emerald-500');
            else if (cat === 'create') btn.classList.add('ring-rose-500');
        } else {
            btn.classList.remove('ring-2', 'ring-offset-2', 'ring-offset-slate-900',
                'ring-amber-500', 'ring-indigo-500', 'ring-emerald-500', 'ring-rose-500');
        }
    });

    // Render category items
    renderCategoryItems(category);

    // Filter and render saved plans for this category
    renderSavedPlansList();
}

/**
 * Render items for selected category
 */
function renderCategoryItems(category) {
    const container = document.getElementById('plan-items-container');
    const items = PLAN_CATEGORY_ITEMS[category] || [];

    if (items.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">No items in this category</p>';
        return;
    }

    // Get category color
    const colorMap = {
        knowledge: { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
        strategic: { text: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30' },
        quick: { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
        create: { text: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/30' }
    };
    const colors = colorMap[category] || colorMap.knowledge;

    container.innerHTML = items.map(item => `
        <button class="plan-card w-full p-3 bg-slate-800/50 hover:bg-slate-800 border ${colors.border} rounded-xl text-left transition-all group cursor-pointer"
            data-plan="${item.id}" onclick="window.handlePlanItemClick('${item.id}')">
            <div class="flex items-center justify-between mb-1 pointer-events-none">
                <span class="text-sm font-medium text-white">${item.name}</span>
                <span class="text-[10px] ${colors.text} ${colors.bg} px-1.5 py-0.5 rounded">${item.credits} cr</span>
            </div>
            <p class="text-xs text-slate-500 pointer-events-none">${item.desc}</p>
        </button>
    `).join('');
}

// Global function for plan item clicks
window.handlePlanItemClick = function (planType) {
    openPlanModal(planType);
};

async function handlePlanClick(planType) {
    const activeSources = sources.filter(s => s.isActive !== false && s.status === 'completed');

    if (activeSources.length === 0) {
        showNotification('Please add sources and wait for analysis to complete', 'warning');
        return;
    }

    // Show loading indicator
    // Show loading indicator with Agent Persona (Standard Studio Agent)
    showNotification(`🤖 Strategy Planner: Generating ${formatPlanType(planType)}...`, 'info');

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
    // If no project, clear and returrn
    if (!currentProjectId) {
        const savedPlansList = document.getElementById('saved-plans-list');
        if (savedPlansList) savedPlansList.innerHTML = '<p class="text-[11px] text-slate-600 text-center py-2">No saved plans yet</p>';
        return;
    }

    try {
        // Fetch more items to ensure we have enough after filtering (limit 50)
        const snapshot = await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('contentPlans')
            .limit(50)
            .get();

        if (snapshot.empty) {
            cachedSavedPlans = [];
        } else {
            // Cache and sort results
            cachedSavedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const tA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
                    const tB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
                    return tB - tA;
                });
        }

        // Render the filtered list
        renderSavedPlansList();

    } catch (error) {
        console.error('Error loading saved plans:', error);
    }
}

/**
 * Render saved plans list filtered by current category
 */
function renderSavedPlansList() {
    const savedPlansList = document.getElementById('saved-plans-list');
    if (!savedPlansList) return;

    // Map UI category to DB category
    const categoryMap = {
        'knowledge': 'knowledge',
        'strategic': 'strategic',
        'quick': 'quick_action',
        'create': 'create_now'
    };

    const targetDbCategory = categoryMap[currentPlanCategory];

    // Filter plans
    // If category is set, show only matches. If invalid/all, show all?
    // User requested sorting/filtering by category.
    const filteredPlans = currentPlanCategory ?
        cachedSavedPlans.filter(p => p.category === targetDbCategory) :
        cachedSavedPlans;

    if (filteredPlans.length === 0) {
        const catName = currentPlanCategory ? currentPlanCategory.charAt(0).toUpperCase() + currentPlanCategory.slice(1) : 'Saved';
        savedPlansList.innerHTML = `<p class="text-[11px] text-slate-600 text-center py-2">No ${catName} plans found</p>`;
        return;
    }

    savedPlansList.innerHTML = '';
    filteredPlans.forEach(plan => {
        const planEl = document.createElement('div');
        planEl.className = 'group flex items-center justify-between p-2 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-all';
        planEl.onclick = () => showPlanResultModal(plan, plan.id);

        planEl.innerHTML = `
            <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-slate-300 truncate">${escapeHtml(plan.title || formatPlanType(plan.type))}</p>
                <div class="flex items-center gap-2 mt-0.5">
                     <p class="text-[10px] text-slate-500">${getStatusBadgeText(plan.status)}</p>
                     <span class="text-[9px] text-slate-600">• ${timeAgo(plan.createdAt)}</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-slate-600">${getPlanIcon(plan.category)}</span>
                <button onclick="deletePlan(event, '${plan.id}')" class="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded opacity-60 hover:opacity-100 transition-all duration-200" title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c0-1-2-2-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"></path></svg>
                </button>
            </div>
        `;
        savedPlansList.appendChild(planEl);
    });
}

function timeAgo(dateParam) {
    if (!dateParam) return '';
    const date = typeof dateParam === 'object' && dateParam.toDate ? dateParam.toDate() : new Date(dateParam);
    const today = new Date();
    const seconds = Math.round((today - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const months = Math.round(days / 30);
    const years = Math.round(days / 365);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
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

function generateMockCreativeResult(type) {
    if (type === 'product_brochure') {
        return `
            <div class="w-full h-full overflow-y-auto bg-slate-900/50 p-4">
                <div class="w-[210mm] bg-white text-slate-900 shadow-2xl mx-auto min-h-[297mm] flex flex-col relative overflow-hidden mb-8">
                     <!-- Cover Page -->
                    <div class="h-1/2 bg-slate-100 relative">
                        <div class="absolute inset-0 flex items-center justify-center text-slate-300 bg-slate-200">
                             <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                        <div class="absolute bottom-8 left-8 p-6 bg-white/90 backdrop-blur-sm shadow-sm max-w-sm">
                            <div class="text-xs font-bold text-indigo-600 tracking-wider uppercase mb-2">2025 Collection</div>
                            <h1 class="text-4xl font-bold text-slate-900 leading-tight">Future of Innovation</h1>
                        </div>
                    </div>
                    <div class="p-12 flex-1">
                        <div class="flex gap-8 mb-8">
                             <div class="flex-1">
                                <h2 class="text-2xl font-bold text-indigo-900 mb-4">Redefining Possibilities</h2>
                                <p class="text-slate-600 text-sm leading-relaxed mb-4">Our latest product line brings unprecedented efficiency to your workflow. Designed with the user in mind, every feature is tailored to enhance productivity and creativity.</p>
                                <ul class="space-y-2 text-sm text-slate-700">
                                    <li class="flex items-center gap-2"><div class="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>AI-Powered Analytics</li>
                                    <li class="flex items-center gap-2"><div class="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>Real-time Collaboration</li>
                                    <li class="flex items-center gap-2"><div class="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>Enterprise Security</li>
                                </ul>
                             </div>
                             <div class="w-1/3 bg-slate-50 p-6 rounded-lg border border-slate-100">
                                <h3 class="font-bold text-slate-900 mb-2">Key Specs</h3>
                                <div class="space-y-3 text-xs">
                                    <div class="flex justify-between border-b border-slate-200 pb-1"><span>Speed</span> <span class="font-medium">10x Faster</span></div>
                                    <div class="flex justify-between border-b border-slate-200 pb-1"><span>Uptime</span> <span class="font-medium">99.99%</span></div>
                                    <div class="flex justify-between border-b border-slate-200 pb-1"><span>Support</span> <span class="font-medium">24/7 Global</span></div>
                                </div>
                             </div>
                        </div>
                        <div class="border-t border-slate-200 pt-8 flex justify-between items-center text-xs text-slate-500">
                            <div>www.company.com</div>
                            <div>contact@company.com</div>
                        </div>
                    </div>
                </div>
                
                <!-- Page 2 (Mock) -->
                <div class="w-[210mm] bg-white text-slate-900 shadow-2xl mx-auto min-h-[297mm] flex flex-col p-12 relative overflow-hidden opacity-50 hover:opacity-100 transition-opacity">
                    <div class="absolute inset-0 flex items-center justify-center text-slate-300 font-bold text-4xl uppercase tracking-widest border-4 border-slate-200 border-dashed m-8">Second Page Preview</div>
                </div>
            </div>
        `;
    }
    else if (type === 'one_pager') {
        return `
            <div class="w-full h-full overflow-y-auto bg-slate-900/50 p-4">
                <div class="w-[210mm] bg-white text-slate-900 shadow-xl mx-auto min-h-[297mm] p-10 flex flex-col">
                    <div class="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                        <div>
                            <h1 class="text-3xl font-bold text-slate-900">Project Alpha</h1>
                            <p class="text-lg text-slate-500 font-light mt-1">Executive Strategy Overview</p>
                        </div>
                        <div class="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-xl">A</div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-8 flex-1">
                        <div class="col-span-2 space-y-8">
                            <section>
                                <h3 class="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">The Challenge</h3>
                                <p class="text-sm text-slate-700 leading-relaxed">Current market solutions lack the scalability required for enterprise-level deployment, creating a significant bottleneck in operational efficiency.</p>
                            </section>
                            <section>
                                <h3 class="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">Our Approach</h3>
                                <p class="text-sm text-slate-700 leading-relaxed mb-3">We propose a hybrid cloud architecture that leverages edge computing to minimize latency while maintaining data sovereignty.</p>
                                <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-indigo-900">
                                    "This solution reduces infrastructure costs by 40% while improving response times."
                                </div>
                            </section>
                             <section>
                                <h3 class="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">Roadmap</h3>
                                <div class="space-y-3">
                                    <div class="flex gap-3 text-sm"><span class="font-bold w-12 text-slate-400">Q1</span> <span>Prototype Development & Internal Testing</span></div>
                                    <div class="flex gap-3 text-sm"><span class="font-bold w-12 text-slate-400">Q2</span> <span>Beta Launch with Key Partners</span></div>
                                    <div class="flex gap-3 text-sm"><span class="font-bold w-12 text-slate-400">Q3</span> <span>Global Rollout</span></div>
                                </div>
                            </section>
                        </div>
                        <div class="col-span-1 bg-slate-50 p-6 rounded-xl space-y-6">
                            <div>
                                <div class="text-xs text-slate-500 uppercase font-medium mb-1">Target Market</div>
                                <div class="text-2xl font-bold text-slate-900">$4.5B</div>
                            </div>
                            <div>
                                <div class="text-xs text-slate-500 uppercase font-medium mb-1">CAGR</div>
                                <div class="text-2xl font-bold text-slate-900">12.5%</div>
                            </div>
                            <div class="h-px bg-slate-200 w-full"></div>
                            <div>
                                <div class="text-xs text-slate-500 uppercase font-medium mb-1">Team Size</div>
                                <div class="text-lg font-semibold text-slate-900">12 Specialists</div>
                            </div>
                             <div>
                                <div class="text-xs text-slate-500 uppercase font-medium mb-1">Timeline</div>
                                <div class="text-lg font-semibold text-slate-900">6 Months</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
                        Confidential & Proprietary - Do Not Distribute
                    </div>
                </div>
            </div>
         `;
    }
    else if (type === 'pitch_deck') {
        return `
            <div class="w-full h-full overflow-y-auto p-4">
                <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Slide 1 -->
                    <div class="aspect-video bg-white text-black p-5 rounded-lg shadow-lg flex flex-col relative group cursor-pointer hover:ring-2 ring-indigo-500 transition-all">
                        <div class="absolute top-2 left-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 font-bold">01</div>
                        <div class="flex-1 flex flex-col justify-center text-center">
                            <h2 class="text-xl font-bold text-slate-900">Brand Name</h2>
                            <p class="text-xs text-slate-500 mt-1">Investor Pitch 2025</p>
                        </div>
                        <div class="h-1 w-12 bg-indigo-500 mx-auto mt-4"></div>
                    </div>
                     <!-- Slide 2 -->
                    <div class="aspect-video bg-white text-black p-5 rounded-lg shadow-lg flex flex-col relative group cursor-pointer hover:ring-2 ring-indigo-500 transition-all">
                         <div class="absolute top-2 left-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 font-bold">02</div>
                        <h3 class="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-2">The Problem</h3>
                        <ul class="list-disc pl-4 mt-1 text-[10px] space-y-1.5 text-slate-700 leading-snug">
                            <li>Process inefficiencies costing $2B/year</li>
                            <li>Legacy systems are incompatible</li>
                            <li>Poor user experience drives churn</li>
                        </ul>
                         <div class="mt-auto flex justify-end">
                            <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center opacity-50">Icon</div>
                         </div>
                    </div>
                    <!-- Slide 3 -->
                    <div class="aspect-video bg-white text-black p-5 rounded-lg shadow-lg flex flex-col relative group cursor-pointer hover:ring-2 ring-indigo-500 transition-all">
                        <div class="absolute top-2 left-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 font-bold">03</div>
                        <h3 class="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-2">The Solution</h3>
                        <div class="flex-1 flex items-center justify-center bg-slate-50 rounded border border-dashed border-slate-200 mb-2">
                            <span class="text-[10px] text-slate-400">Diagram Placeholder</span>
                        </div>
                        <p class="text-[10px] text-center text-slate-600 font-medium">Unified Platform Architecture</p>
                    </div>
                     <!-- Slide 4 -->
                    <div class="aspect-video bg-white text-black p-5 rounded-lg shadow-lg flex flex-col relative group cursor-pointer hover:ring-2 ring-indigo-500 transition-all">
                        <div class="absolute top-2 left-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 font-bold">04</div>
                        <h3 class="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-2">Market Size</h3>
                        <div class="flex items-end gap-2 mt-2 h-16">
                            <div class="w-1/3 bg-indigo-200 h-1/2 rounded-t flex items-end justify-center pb-1 text-[8px] font-bold">SAM</div>
                            <div class="w-1/3 bg-indigo-400 h-3/4 rounded-t flex items-end justify-center pb-1 text-[8px] font-bold text-white">TAM</div>
                            <div class="w-1/3 bg-indigo-600 h-full rounded-t flex items-end justify-center pb-1 text-[8px] font-bold text-white">SOM</div>
                        </div>
                    </div>
                     <!-- Slide 5 -->
                    <div class="aspect-video bg-white text-black p-5 rounded-lg shadow-lg flex flex-col relative group cursor-pointer hover:ring-2 ring-indigo-500 transition-all">
                        <div class="absolute top-2 left-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 font-bold">05</div>
                         <h3 class="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-2">The Team</h3>
                         <div class="flex justify-between gap-2 mt-2">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-slate-200 rounded-full mx-auto mb-1"></div>
                                <div class="text-[8px] font-bold">CEO</div>
                            </div>
                             <div class="text-center">
                                <div class="w-8 h-8 bg-slate-200 rounded-full mx-auto mb-1"></div>
                                <div class="text-[8px] font-bold">CTO</div>
                            </div>
                             <div class="text-center">
                                <div class="w-8 h-8 bg-slate-200 rounded-full mx-auto mb-1"></div>
                                <div class="text-[8px] font-bold">COO</div>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
        `;
    }
    else if (type === 'email_template') {
        return `
            <div class="w-full h-full overflow-y-auto bg-slate-900/50 p-6 flex justify-center">
                <div class="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col">
                    <!-- Email Header -->
                    <div class="bg-slate-50 p-4 border-b border-slate-100">
                        <div class="flex gap-3 mb-2">
                             <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">JD</div>
                             <div>
                                <div class="text-sm font-bold text-slate-900">John Doe <span class="text-slate-400 font-normal">&lt;john@company.com&gt;</span></div>
                                <div class="text-xs text-slate-500">To: Potential Client</div>
                             </div>
                        </div>
                        <div class="text-sm font-medium text-slate-900 ml-11">Subject: Partnership Opportunity with [Company Name]</div>
                    </div>
                    
                    <!-- Email Body -->
                    <div class="p-8 text-slate-800 text-sm leading-relaxed space-y-4">
                        <p>Hi [Name],</p>
                        <p>I hope this email finds you well.</p>
                        <p>I'm reaching out because I noticed that [Target Company] is looking to expand its capabilities in [Sector]. At [Our Company], we've developed a platform that specifically addresses these challenges.</p>
                        
                        <div class="my-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex gap-4 items-center">
                            <div class="w-16 h-16 bg-white rounded flex-shrink-0 flex items-center justify-center border border-indigo-50 text-indigo-200">IMG</div>
                            <div>
                                <h4 class="font-bold text-indigo-900 mb-1">See it in action</h4>
                                <p class="text-xs text-indigo-700">Watch our 2-minute demo video covering key features.</p>
                            </div>
                        </div>

                        <p>Would you be open to a brief 15-minute call next Tuesday to discuss how we could help achieve your Q3 goals?</p>

                        <p class="mt-8">Best regards,</p>
                        <div class="font-bold">John Doe</div>
                        <div class="text-xs text-slate-500">Head of Growth | Company Inc.</div>
                        <div class="text-xs text-indigo-600 mt-1">www.company.com</div>
                    </div>

                    <!-- Email Footer -->
                     <div class="bg-slate-50 p-4 text-center text-[10px] text-slate-400 border-t border-slate-100">
                        You received this email because you signed up for our newsletter. <a href="#" class="underline">Unsubscribe</a>
                     </div>
                </div>
            </div>
        `;
    }
    else if (type === 'press_release') {
        return `
             <div class="w-full h-full overflow-y-auto bg-slate-900/50 p-4">
                <div class="w-[210mm] bg-white text-slate-900 shadow-xl mx-auto min-h-[297mm] p-12 relative font-serif">
                   <div class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8 border-b border-black pb-2">For Immediate Release</div>
                   
                   <div class="mb-8">
                       <h1 class="text-3xl font-bold text-slate-900 mb-4 leading-tight">Company Inc. Announces Revolutionary New AI Platform for Enterprise Creativity</h1>
                       <div class="text-sm text-slate-600 italic">San Francisco, CA — October 24, 2025</div>
                   </div>

                   <div class="space-y-6 text-sm leading-relaxed text-slate-800">
                       <p><span class="font-bold">Company Inc.</span>, a leader in digital innovation, today unveiled its latest platform designed to transform how enterprises manage creative workflows. This new solution integrates advanced AI agents directly into the design process.</p>
                       
                       <div class="pl-4 border-l-4 border-slate-200 my-6 italic text-slate-600">
                           "This is not just an update; it's a fundamental shift in how we approach creative problem solving," said Jane Smith, CEO of Company Inc. "By empowering teams with intelligent agents, we unlock potential that was previously stifled by repetitive tasks."
                       </div>

                       <p>The platform features include:</p>
                       <ul class="list-disc pl-6 space-y-2">
                           <li>Automated asset generation using proprietary models</li>
                           <li>Seamless integration with existing enterprise tools</li>
                           <li>Real-time collaboration across distributed teams</li>
                       </ul>

                       <p>Industry analysts predict that adoption of such tools will increase operational efficiency by over 40% within the first year of deployment.</p>

                       <div class="mt-12 text-center">
                           <div class="font-bold mb-1">###</div>
                       </div>
                       
                       <div class="mt-8 pt-8 border-t border-slate-200">
                           <h4 class="font-bold mb-2 uppercase text-xs tracking-wider text-slate-500">Media Contact</h4>
                           <div class="text-sm">
                               <div class="font-bold">Media Relations Team</div>
                               <div>media@company.com</div>
                               <div>+1 (555) 0123-4567</div>
                           </div>
                       </div>
                   </div>
                </div>
            </div>
        `;
    }
    else if (type === 'promo_images') {
        return `
            <div class="w-full h-full p-6 overflow-y-auto">
                <div class="grid grid-cols-2 gap-4">
                    <div class="aspect-square bg-slate-800 rounded-xl overflow-hidden relative group cursor-pointer hover:ring-2 ring-indigo-500">
                        <img src="https://picsum.photos/seed/promo1/800/800" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="AI Generated Image 1">
                        <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="text-xs bg-white text-black px-2 py-1 rounded shadow hover:bg-slate-200">Download</button>
                        </div>
                    </div>
                     <div class="aspect-square bg-slate-800 rounded-xl overflow-hidden relative group cursor-pointer hover:ring-2 ring-indigo-500">
                        <img src="https://picsum.photos/seed/promo2/800/800" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="AI Generated Image 2">
                        <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="text-xs bg-white text-black px-2 py-1 rounded shadow hover:bg-slate-200">Download</button>
                        </div>
                    </div>
                     <div class="aspect-square bg-slate-800 rounded-xl overflow-hidden relative group cursor-pointer hover:ring-2 ring-indigo-500">
                        <img src="https://picsum.photos/seed/promo3/800/800" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="AI Generated Image 3">
                        <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="text-xs bg-white text-black px-2 py-1 rounded shadow hover:bg-slate-200">Download</button>
                        </div>
                    </div>
                     <div class="aspect-square bg-slate-800 rounded-xl overflow-hidden relative group cursor-pointer hover:ring-2 ring-indigo-500">
                        <img src="https://picsum.photos/seed/promo4/800/800" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="AI Generated Image 4">
                        <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="text-xs bg-white text-black px-2 py-1 rounded shadow hover:bg-slate-200">Download</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    // Default
    return `<div class="text-white p-4">Generated content for ${type}...</div>`;
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
            if (window.showNotification) window.showNotification(`Target language changed to ${getLanguageName(targetLanguage)}`, 'success');
            // Regenerate summary with new language
            generateSummary();
        });
    }

    // Analysis Level Toggles
    const btnStandard = document.getElementById('btn-analysis-standard');
    const btnDepth = document.getElementById('btn-analysis-depth');
    if (btnStandard) btnStandard.addEventListener('click', () => setAnalysisLevel('standard'));
    if (btnDepth) btnDepth.addEventListener('click', () => setAnalysisLevel('depth'));
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
        // Call Cloud Function with target language for translation
        const askKnowledgeHub = firebase.functions().httpsCallable('askKnowledgeHub');
        const result = await askKnowledgeHub({
            projectId: currentProjectId,
            question: message,
            targetLanguage: targetLanguage || 'ko'  // Pass selected language
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

function renderCreativeControls(type) {
    const container = document.getElementById('creative-controls-container');
    container.innerHTML = ''; // Clear

    // Common: Topic/Context Input
    const topicGroup = document.createElement('div');
    topicGroup.innerHTML = `
        <label class="block text-sm font-medium text-slate-400 mb-2">Topic / Focus</label>
        <textarea id="creative-input-topic" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-indigo-500 focus:outline-none" placeholder="Describe the specific topic or focus for this content..."></textarea>
    `;
    container.appendChild(topicGroup);

    // Common: Target Audience (New)
    const audienceGroup = document.createElement('div');
    audienceGroup.innerHTML = `
        <label class="block text-sm font-medium text-slate-400 mb-2">Target Audience</label>
        <input type="text" id="creative-input-audience" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none" placeholder="e.g. Investors, Gen Z, Enterprise CTOs">
    `;
    container.appendChild(audienceGroup);

    // Common: Tone/Style
    const toneGroup = document.createElement('div');
    toneGroup.innerHTML = `
        <label class="block text-sm font-medium text-slate-400 mb-2">Tone & Style</label>
        <select id="creative-input-tone" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none">
            <option value="professional">Professional & Corporate</option>
            <option value="exciting">Exciting & High Energy</option>
            <option value="persuasive">Persuasive / Sales-driven</option>
            <option value="informative">Informative / Educational</option>
            <option value="friendly">Friendly & Approachable</option>
            <option value="luxury">Luxury & Premium</option>
        </select>
    `;
    container.appendChild(toneGroup);

    // --- Type Specifics ---

    if (type === 'product_brochure') {
        const layoutGroup = document.createElement('div');
        layoutGroup.innerHTML = `
            <label class="block text-sm font-medium text-slate-400 mb-2">Brochure Format</label>
            <div class="grid grid-cols-2 gap-2">
                <button type="button" class="ctrl-btn p-3 rounded-lg border border-indigo-500 bg-indigo-500/20 text-white text-sm font-medium text-center transition-all" onclick="selectControl(this, 'format')">Tri-Fold</button>
                <button type="button" class="ctrl-btn p-3 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 text-sm font-medium text-center hover:bg-slate-700 transition-all" onclick="selectControl(this, 'format')">Z-Fold</button>
            </div>
            
            <label class="block text-sm font-medium text-slate-400 mt-4 mb-2">Visual Style</label>
            <select class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm">
                <option>Modern (Image Heavy)</option>
                <option>Classic (Text Heavy)</option>
                <option>Minimalist</option>
            </select>
        `;
        container.appendChild(layoutGroup);
    }
    else if (type === 'one_pager') {
        const typeGroup = document.createElement('div');
        typeGroup.innerHTML = `
            <label class="block text-sm font-medium text-slate-400 mb-2">Template Type</label>
            <select class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm">
                <option>Executive Summary</option>
                <option>Technical Specification</option>
                <option>Product Sheet</option>
                <option>Investment Teaser</option>
            </select>
         `;
        container.appendChild(typeGroup);
    }
    else if (type === 'pitch_deck') {
        const pagesGroup = document.createElement('div');
        pagesGroup.innerHTML = `
            <label class="block text-sm font-medium text-slate-400 mb-2">Slide Count</label>
            <div class="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                <button class="flex-1 py-1.5 text-xs text-white bg-indigo-600 rounded">5 Slides</button>
                <button class="flex-1 py-1.5 text-xs text-slate-400 hover:text-white">10 Slides</button>
                <button class="flex-1 py-1.5 text-xs text-slate-400 hover:text-white">15 Slides</button>
            </div>
             <label class="block text-sm font-medium text-slate-400 mt-4 mb-2">Presentation Purpose</label>
            <select class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm">
                <option>Investor Pitch (Seed)</option>
                <option>Sales Deck (B2B)</option>
                <option>Internal Update</option>
            </select>
        `;
        container.appendChild(pagesGroup);
    }
    else if (type === 'email_template') {
        const emailGroup = document.createElement('div');
        emailGroup.innerHTML = `
            <label class="block text-sm font-medium text-slate-400 mb-2">Email Type</label>
            <select class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm">
                <option>Cold Outreach</option>
                <option>Newsletter / Update</option>
                <option>Welcome Sequence</option>
                <option>Event Invitation</option>
            </select>
             <div class="mt-4">
                <label class="block text-sm font-medium text-slate-400 mb-2">Sender Name</label>
                <input type="text" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm" placeholder="e.g. John Doe">
             </div>
         `;
        container.appendChild(emailGroup);
    }
    else if (type === 'press_release') {
        const prGroup = document.createElement('div');
        prGroup.innerHTML = `
            <label class="block text-sm font-medium text-slate-400 mb-2">Announcement Type</label>
            <select class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm">
                <option>Product Launch</option>
                <option>Partnership Announcement</option>
                <option>Funding News</option>
                <option>Executive Hire</option>
            </select>
            <div class="mt-4">
                <label class="block text-sm font-medium text-slate-400 mb-2">Quote From (Role)</label>
                <input type="text" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm" placeholder="e.g. CEO">
             </div>
         `;
        container.appendChild(prGroup);
    }
    else if (type === 'promo_images') {
        const ratioGroup = document.createElement('div');
        ratioGroup.innerHTML = `
            <label class="block text-sm font-medium text-slate-400 mb-2">Aspect Ratio</label>
            <div class="grid grid-cols-3 gap-2">
                <button type="button" class="ctrl-btn p-2 border border-indigo-500 bg-indigo-500/20 rounded text-xs text-white font-medium" onclick="selectControl(this, 'ratio')">Square (1:1)</button>
                <button type="button" class="ctrl-btn p-2 border border-slate-700 bg-slate-800 rounded text-xs text-slate-400" onclick="selectControl(this, 'ratio')">Portrait (9:16)</button>
                <button type="button" class="ctrl-btn p-2 border border-slate-700 bg-slate-800 rounded text-xs text-slate-400" onclick="selectControl(this, 'ratio')">Landscape</button>
            </div>

            <label class="block text-sm font-medium text-slate-400 mt-4 mb-2">Art Style</label>
            <select class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm">
                <option>Photorealistic</option>
                <option>3D Render</option>
                <option>Illustration / Vector</option>
                <option>Pop Art</option>
                <option>Cyberpunk / Neon</option>
            </select>
            
            <div class="mt-4">
                <label class="block text-sm font-medium text-slate-400 mb-2">Negative Prompt (Exclude)</label>
                <input type="text" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm" placeholder="e.g. text, blur, distorted faces">
             </div>
        `;
        container.appendChild(ratioGroup);
    }
}

// Helper for selecting buttons
function selectControl(btn, groupName) {
    const parent = btn.parentElement;
    parent.querySelectorAll('.ctrl-btn').forEach(b => {
        b.classList.remove('border-indigo-500', 'bg-indigo-500/20', 'text-white');
        b.classList.add('border-slate-700', 'bg-slate-800', 'text-slate-400');
    });
    btn.classList.remove('border-slate-700', 'bg-slate-800', 'text-slate-400');
    btn.classList.add('border-indigo-500', 'bg-indigo-500/20', 'text-white');
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
    const messageId = Date.now(); // Unique ID for this message

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
            <div class="flex-1 max-w-lg">
                <div class="bg-slate-800 rounded-2xl rounded-tl-md px-4 py-3">
                    <p class="text-sm text-slate-200 whitespace-pre-wrap">${escapeHtml(content)}</p>
                </div>
                <!-- Action Buttons (NotebookLM Style) -->
                <div class="flex items-center gap-2 mt-2 ml-1">
                    <button onclick="saveChatToNote('${messageId}', this)" 
                        class="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 hover:text-white hover:bg-slate-800/50 rounded-md transition-all"
                        data-content="${escapeHtml(content).replace(/"/g, '&quot;')}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                            <polyline points="14,2 14,8 20,8"/>
                        </svg>
                        Save to note
                    </button>
                    <!-- Save Plan Button -->
                    <button onclick="saveChatToPlan('${messageId}', this)" 
                        class="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50 rounded-md transition-all"
                        data-content="${escapeHtml(content).replace(/"/g, '&quot;')}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        Save Plan
                    </button>
                    <!-- Use in Studio Button -->
                    <button onclick="useChatInStudio('${messageId}', this)" 
                        class="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500 hover:text-emerald-400 hover:bg-slate-800/50 rounded-md transition-all"
                        data-content="${escapeHtml(content).replace(/"/g, '&quot;')}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        Use in Studio
                    </button>
                    <button onclick="copyText(this)" 
                        class="p-1 text-slate-500 hover:text-white hover:bg-slate-800/50 rounded-md transition-all"
                        data-content="${escapeHtml(content).replace(/"/g, '&quot;')}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    </button>
                    <button onclick="rateChatMessage('${messageId}', 'up', this)" 
                        class="p-1 text-slate-500 hover:text-green-400 hover:bg-slate-800/50 rounded-md transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M7 10v12"/>
                            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
                        </svg>
                    </button>
                    <button onclick="rateChatMessage('${messageId}', 'down', this)" 
                        class="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800/50 rounded-md transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 14V2"/>
                            <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

async function generateSummary() {
    const activeSources = sources.filter(s => s.isActive !== false && s.status === 'completed');

    if (activeSources.length === 0) {
        showNotification('No active sources to analyze', 'warning');
        return;
    }

    // UI Loading State
    const summaryTitle = document.getElementById('summary-title');
    const summaryContent = document.getElementById('summary-content');
    const btnRegenerate = document.getElementById('btn-regenerate-summary');
    const analysisLevel = document.getElementById('current-analysis-level')?.value || 'standard';
    const analysisFocus = document.getElementById('analysis-focus')?.value || 'general';

    if (summaryTitle) summaryTitle.textContent = analysisLevel === 'depth' ? 'Generating Depth Report...' : 'Generating summary...';
    if (summaryContent) summaryContent.textContent = 'Analyzing your documents...';
    if (btnRegenerate) btnRegenerate.disabled = true;

    try {
        // 0. Fetch Pipeline Settings from Firestore (via chatbotConfig workaround for rules)
        console.log('[KnowledgeHub] Fetching Pipeline Settings...');
        const settingsDoc = await db.collection('chatbotConfig').doc('pipeline_knowledge_hub').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : {};

        // Select Agent Config
        const agentConfig = analysisLevel === 'depth' ? (settings.depth || {}) : (settings.standard || {});

        // Finalize Prompts
        let systemPrompt = agentConfig.systemPrompt || (analysisLevel === 'depth'
            ? 'You are a Senior Strategic Brand Analyst. Generate a deep, A4-length report.'
            : 'You are a Brand Intelligence AI. Generate a comprehensive brand summary.');

        // Add focus if depth mode
        if (analysisLevel === 'depth' && analysisFocus !== 'general') {
            systemPrompt += `\n\n### FOCUS AREA: ${analysisFocus.toUpperCase()}\nPlease provide extra detail and strategic depth in this specific area while maintaining the overall report structure.`;
        }

        // Prepare Context
        // Calculate percentages
        const totalPoints = activeSources.reduce((sum, s) => sum + (s.importance === 3 ? 3 : (s.importance === 1 ? 1 : 2)), 0);

        const sourceWeights = activeSources.map(s => {
            const points = s.importance === 3 ? 3 : (s.importance === 1 ? 1 : 2);
            return {
                id: s.id,
                title: s.title,
                importance: s.importance || 2,
                percent: Math.round((points / totalPoints) * 100)
            };
        });

        // Determine Tier (Standard vs Boost)
        const boostActiveEl = document.getElementById('main-summary-boost-active');
        const boostActive = boostActiveEl ? boostActiveEl.value === 'true' : false;
        const qualityTier = (analysisLevel === 'depth' || boostActive) ? 'BOOST' : 'DEFAULT';

        // Prepare Prompts
        const userPrompt = `Please analyze the following source documents and generate a Brand Summary in ${targetLanguage === 'ko' ? 'Korean' : 'English'}.
            
Source Weights (Importance 1-3):
${sourceWeights.map(s => `- ${s.title} (Importance: ${s.importance})`).join('\n')}

Output Format (JSON):
{
    "summary": "Executive summary text (A4 level detail)...",
    "keyInsights": ["Insight 1...", "Insight 2..."],
    "suggestedQuestions": ["Question 1?", "Question 2?"],
    "sourceNames": ["Source 1", "Source 2"]
}

Sources Content:
${activeSources.map(s => `--- Source: ${s.title} ---\n${s.summary || s.content?.substring(0, 5000) || ''}`).join('\n\n')}`;

        // Call LLM Router Cloud Function
        const routeLLM = firebase.functions().httpsCallable('routeLLM');
        const result = await routeLLM({
            feature: 'studio.content_gen', // Using generic content gen feature policy
            qualityTier: qualityTier,
            systemPrompt: systemPrompt,
            userPrompt: userPrompt,
            temperature: agentConfig.temperature || 0.2, // Lower temp for factual summary
            model: agentConfig.model || (analysisLevel === 'depth' ? 'gpt-4o' : 'gpt-4o-mini'),
            projectId: currentProjectId
        });

        // Handle Response
        if (!result.data.success) {
            throw new Error(result.data.error || 'Unknown error from LLM Router');
        }

        let responseText = result.data.content;

        // Log if failover occurred
        if (result.data.routing?.failover) {
            console.warn('⚠️ Auto-Failover triggered:', result.data.routing.originalError);
            showNotification('Optimized route used for stability', 'info');
        }

        // Parse JSON
        let parsedResult;
        try {
            // Clean markdown blocks if present (common with LLMs)
            responseText = responseText.replace(/```json\n?|```/g, '');
            parsedResult = JSON.parse(responseText);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            parsedResult = { summary: responseText, keyInsights: [], suggestedQuestions: [] };
        }

        // 6. Save & Update UI (Existing logic follows...)
        const summaryData = {
            title: `Brand Summary - ${new Date().toLocaleDateString()}`,
            content: parsedResult.summary || "Summary generated.",
            suggestedQuestions: parsedResult.suggestedQuestions || [],
            keyInsights: parsedResult.keyInsights || [],
            sourceCount: activeSources.length,
            sourceNames: parsedResult.sourceNames || activeSources.map(s => s.title),
            targetLanguage: targetLanguage,
            weightBreakdown: sourceWeights,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser?.uid
        };

        const docRef = await db.collection('projects').doc(currentProjectId)
            .collection('brandSummaries').add(summaryData);

        const savedDoc = await docRef.get();
        const savedSummary = { id: savedDoc.id, ...savedDoc.data() };

        brandSummaries.unshift(savedSummary);
        if (brandSummaries.length > MAX_SUMMARY_HISTORY) brandSummaries.pop();

        currentDisplayedSummary = savedSummary;
        currentSummary = savedSummary;

        updateSummarySection();
        cleanupOldBrandSummaries();

        showNotification(`Summary generated successfully! (${qualityTier})`, 'success');

    } catch (error) {
        console.error('Error generating summary:', error);
        if (summaryTitle) summaryTitle.textContent = 'Summary Failed';
        if (summaryContent) summaryContent.textContent = `Failed to generate summary: ${error.message}`;
        showNotification(`Generation Error: ${error.message}`, 'error');
    } finally {
        if (btnRegenerate) btnRegenerate.disabled = false;
    }
}

async function cleanupOldBrandSummaries() {
    try {
        const snapshot = await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('brandSummaries')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.size > MAX_SUMMARY_HISTORY) {
            const notesToDelete = [];
            let count = 0;
            snapshot.forEach(doc => {
                count++;
                if (count > MAX_SUMMARY_HISTORY) {
                    notesToDelete.push(doc.ref);
                }
            });
            await batch.commit();
        }
    } catch (e) {
        console.error('Cleanup error:', e);
    }
}

function displaySummaryOverride(summaryId) {
    const summary = brandSummaries.find(s => s.id === summaryId);
    if (summary) {
        currentDisplayedSummary = summary;
        updateSummarySection();
        // Scroll to top of chat to see summary
        const chatContainer = document.getElementById('chat-content');
        if (chatContainer) chatContainer.scrollTop = 0;
    }
}

// History Modal Functions
function openSummaryHistory() {
    const modal = document.getElementById('summary-history-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        renderSummaryHistory();
    }
}

function closeSummaryHistory() {
    const modal = document.getElementById('summary-history-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function renderSummaryHistory() {
    const container = document.getElementById('summary-history-list');
    if (!container) return;

    if (brandSummaries.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 py-10">No history available</div>';
        return;
    }

    container.innerHTML = brandSummaries.map(summary => {
        const date = summary.createdAt?.toDate ? summary.createdAt.toDate() : new Date();
        const dateStr = date.toLocaleString();

        return `
            <div class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/50 transition-all cursor-pointer group" onclick="selectHistoryItem('${summary.id}')">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-white">${summary.title || 'Brand Summary'}</h4>
                    <span class="text-xs text-slate-500">${dateStr}</span>
                </div>
                <p class="text-sm text-slate-400 line-clamp-2 mb-2">${escapeHtml(summary.content)}</p>
                <div class="flex items-center gap-2 text-xs text-slate-500">
                    <span>${summary.sourceCount || 0} sources</span>
                    <span class="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to view</span>
                </div>
            </div>
        `;
    }).join('');
}

function selectHistoryItem(summaryId) {
    displaySummaryOverride(summaryId);
    closeSummaryHistory();
}

// ============================================================
// SUMMARY ACTION FUNCTIONS (NotebookLM Style)
// ============================================================

/**
 * Save current summary to notes with history limit
 */
async function saveToNote() {
    if (!currentSummary || !currentProjectId) {
        showNotification('No summary to save', 'error');
        return;
    }

    try {
        const db = firebase.firestore();
        const date = new Date();
        const dateStr = date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Create note document
        const noteData = {
            title: `Brand Summary - ${dateStr}`,
            sourceType: 'note',
            noteType: 'summary', // Special type to identify summary notes
            content: currentSummary.content,
            suggestedQuestions: currentSummary.suggestedQuestions,
            sourceNames: currentSummary.sourceNames,
            sourceCount: currentSummary.sourceCount,
            targetLanguage: currentSummary.targetLanguage,
            isActive: true,
            status: 'completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser?.uid
        };

        // Add the new note
        await db.collection('projects').doc(currentProjectId)
            .collection('knowledgeSources').add(noteData);

        // Cleanup: Delete oldest summary notes if exceeding limit
        await cleanupOldSummaryNotes();

        showNotification('Summary saved to notes!', 'success');
    } catch (error) {
        console.error('Error saving summary to note:', error);
        showNotification('Failed to save: ' + error.message, 'error');
    }
}

/**
 * Delete oldest summary notes if exceeding MAX_SUMMARY_HISTORY
 */
async function cleanupOldSummaryNotes() {
    try {
        const db = firebase.firestore();
        const summaryNotes = await db.collection('projects').doc(currentProjectId)
            .collection('knowledgeSources')
            .where('noteType', '==', 'summary')
            .orderBy('createdAt', 'desc')
            .get();

        if (summaryNotes.size > MAX_SUMMARY_HISTORY) {
            const notesToDelete = [];
            let count = 0;

            summaryNotes.forEach(doc => {
                count++;
                if (count > MAX_SUMMARY_HISTORY) {
                    notesToDelete.push(doc.ref);
                }
            });

            // Delete excess notes
            const batch = db.batch();
            notesToDelete.forEach(ref => batch.delete(ref));
            await batch.commit();

            console.log(`Cleaned up ${notesToDelete.length} old summary notes`);
        }
    } catch (error) {
        console.error('Error cleaning up old summary notes:', error);
    }
}

/**
 * Copy summary to clipboard
 */
async function copySummary() {
    if (!currentSummary) {
        showNotification('No summary to copy', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(currentSummary.content);
        showNotification('Summary copied to clipboard!', 'success');
    } catch (error) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = currentSummary.content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('Summary copied!', 'success');
    }
}

/**
 * Rate summary (thumbs up/down)
 */
async function rateSummary(rating) {
    if (!currentSummary || !currentProjectId) return;

    const thumbsUp = document.getElementById('summary-thumbs-up');
    const thumbsDown = document.getElementById('summary-thumbs-down');

    if (rating === 'up') {
        thumbsUp.classList.add('text-green-400');
        thumbsUp.classList.remove('text-slate-500');
        thumbsDown.classList.remove('text-red-400');
        thumbsDown.classList.add('text-slate-500');
    } else {
        thumbsDown.classList.add('text-red-400');
        thumbsDown.classList.remove('text-slate-500');
        thumbsUp.classList.remove('text-green-400');
        thumbsUp.classList.add('text-slate-500');
    }

    // Optionally save rating to Firestore for analytics
    try {
        const db = firebase.firestore();
        await db.collection('projects').doc(currentProjectId)
            .collection('summaryFeedback').add({
                rating: rating,
                summaryContent: currentSummary.content.substring(0, 200), // First 200 chars
                targetLanguage: currentSummary.targetLanguage,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: currentUser?.uid
            });
    } catch (error) {
        console.error('Error saving feedback:', error);
    }

    showNotification(rating === 'up' ? 'Thanks for your feedback! 👍' : 'Thanks for your feedback! We\'ll improve.', 'success');
}

// ============================================================
// CHAT MESSAGE ACTION FUNCTIONS
// ============================================================

/**
 * Save chat message to note
 */
async function saveChatToNote(messageId, btn) {
    const content = btn.dataset.content;
    if (!content || !currentProjectId) {
        showNotification('Unable to save', 'error');
        return;
    }

    try {
        const db = firebase.firestore();
        const date = new Date();
        const dateStr = date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        await db.collection('projects').doc(currentProjectId)
            .collection('knowledgeSources').add({
                title: `Chat Response - ${dateStr}`,
                sourceType: 'note',
                noteType: 'chat',
                content: content,
                isActive: true,
                status: 'completed',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser?.uid
            });

        showNotification('Saved to notes!', 'success');
    } catch (error) {
        console.error('Error saving to note:', error);
        showNotification('Failed to save', 'error');
    }
}

/**
 * Save chat message as a Content Plan draft
 */
async function saveChatToPlan(messageId, btn) {
    const content = btn.dataset.content;
    if (!content || !currentProjectId) {
        showNotification('Unable to save', 'error');
        return;
    }

    try {
        const db = firebase.firestore();
        const date = new Date();
        const dateStr = date.toLocaleDateString('ko-KR');

        // Create a new drafted plan
        await db.collection('projects').doc(currentProjectId)
            .collection('contentPlans').add({
                title: `Plan from Chat - ${dateStr}`,
                type: 'custom',
                category: 'strategic', // Default to strategic
                status: 'draft',
                content: {
                    raw_chat: content,
                    notes: 'Saved from Knowledge Hub chat'
                },
                summary: content.substring(0, 100) + '...',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser?.uid
            });

        showNotification('Saved as Draft Plan!', 'success');

        // Refresh Saved Plans list if visible
        if (typeof loadSavedPlans === 'function') {
            loadSavedPlans();
        }
    } catch (error) {
        console.error('Error saving to plan:', error);
        showNotification('Failed to save plan', 'error');
    }
}

// Global variable to hold content pending for Studio
let pendingStudioContent = null;

/**
 * Send content to Studio (Opens Agent Team Modal)
 */
async function useChatInStudio(messageId, btn) {
    const content = btn.dataset.content;
    if (!content) return;

    // Store content for the modal confirmation
    pendingStudioContent = {
        type: 'chat',
        content: content,
        planName: 'Insight from Brand Intelligence'
    };

    openAgentSelectionModal();
}

/**
 * Send Source Summary to Studio (Opens Agent Team Modal)
 */
function useSourceInStudio() {
    if (!currentDisplayedSummary) return;

    pendingStudioContent = {
        type: 'chat', // Treating summary as chat/text content for now
        content: currentDisplayedSummary.content,
        planName: `Source: ${currentDisplayedSummary.title.replace('📄 ', '')}`
    };

    openAgentSelectionModal();
}

/* Function openStudioAgentModal removed as it duplicated/broke openAgentSelectionModal */

/**
 * Copy text to clipboard
 */
async function copyText(btn) {
    const content = btn.dataset.content;
    if (!content) return;

    try {
        await navigator.clipboard.writeText(content);
        showNotification('Copied!', 'success');
    } catch (error) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('Copied!', 'success');
    }
}

/**
 * Rate a chat message
 */
function rateChatMessage(messageId, rating, btn) {
    const parent = btn.parentElement;
    const thumbsUp = parent.querySelector('button:nth-child(3)');
    const thumbsDown = parent.querySelector('button:nth-child(4)');

    if (rating === 'up') {
        thumbsUp.classList.add('text-green-400');
        thumbsUp.classList.remove('text-slate-500');
        thumbsDown.classList.remove('text-red-400');
        thumbsDown.classList.add('text-slate-500');
    } else {
        thumbsDown.classList.add('text-red-400');
        thumbsDown.classList.remove('text-slate-500');
        thumbsUp.classList.remove('text-green-400');
        thumbsUp.classList.add('text-slate-500');
    }

    showNotification(rating === 'up' ? '👍' : 'Thanks for feedback', 'success');
}

// ============================================================
// CONFIGURATION MODAL FUNCTIONS
// ============================================================

/**
 * Open the configuration modal
 */
function openConfigModal() {
    const modal = document.getElementById('config-modal');
    modal.classList.remove('hidden');

    // Initialize button states from current config
    document.querySelectorAll('.config-option-btn').forEach(btn => {
        const configType = btn.dataset.config;
        const value = btn.dataset.value;

        if (chatConfig[configType] === value) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    // Show/hide custom prompt section
    updateCustomPromptVisibility();

    // Set custom prompt value
    const customInput = document.getElementById('custom-prompt-input');
    if (customInput) {
        customInput.value = chatConfig.customPrompt || '';
    }

    // Add event listeners for option buttons
    document.querySelectorAll('.config-option-btn').forEach(btn => {
        btn.onclick = () => selectConfigOption(btn);
    });
}

/**
 * Close the configuration modal
 */
function closeConfigModal() {
    const modal = document.getElementById('config-modal');
    modal.classList.add('hidden');
}

/**
 * Select a configuration option
 */
function selectConfigOption(btn) {
    const configType = btn.dataset.config;
    const value = btn.dataset.value;

    // Update selection UI
    document.querySelectorAll(`.config-option-btn[data-config="${configType}"]`).forEach(b => {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');

    // Update style description
    if (configType === 'style') {
        const descriptions = {
            'default': 'Best for general purpose research and brainstorming tasks.',
            'learning': 'Explains concepts step by step like a helpful tutor.',
            'custom': 'Use your own custom instructions for personalized responses.'
        };
        document.getElementById('style-description').textContent = descriptions[value] || '';

        // Show/hide custom prompt section
        updateCustomPromptVisibility();
    }
}

/**
 * Toggle custom prompt section visibility
 */
function updateCustomPromptVisibility() {
    const customSection = document.getElementById('custom-prompt-section');
    const selectedStyle = document.querySelector('.config-option-btn[data-config="style"].selected');

    if (selectedStyle && selectedStyle.dataset.value === 'custom') {
        customSection.classList.remove('hidden');
    } else {
        customSection.classList.add('hidden');
    }
}

/**
 * Save configuration
 */
function saveConfig() {
    // Get selected values
    const styleBtn = document.querySelector('.config-option-btn[data-config="style"].selected');
    const lengthBtn = document.querySelector('.config-option-btn[data-config="length"].selected');
    const customPrompt = document.getElementById('custom-prompt-input')?.value || '';

    chatConfig.style = styleBtn?.dataset.value || 'default';
    chatConfig.length = lengthBtn?.dataset.value || 'default';
    chatConfig.customPrompt = customPrompt;

    // Save to localStorage
    localStorage.setItem('knowledgeHub_chatConfig', JSON.stringify(chatConfig));

    closeConfigModal();
    showNotification('Configuration saved!', 'success');
}

/**
 * Load configuration from localStorage
 */
function loadChatConfig() {
    const saved = localStorage.getItem('knowledgeHub_chatConfig');
    if (saved) {
        try {
            chatConfig = { ...chatConfig, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Error loading chat config:', e);
        }
    }
}

// ============================================================
// PLAN GENERATION FUNCTIONS
// ============================================================

// Plan definitions
const PLAN_DEFINITIONS = {
    // Strategic Plans
    campaign_brief: { name: 'Campaign Brief', credits: 10, category: 'strategic' },
    content_calendar: { name: 'Content Calendar', credits: 10, category: 'strategic' },
    channel_strategy: { name: 'Channel Strategy', credits: 10, category: 'strategic' },
    brand_positioning: { name: 'Brand Positioning', credits: 10, category: 'strategic' },
    messaging_framework: { name: 'Messaging Framework', credits: 10, category: 'strategic' },

    // Quick Actions
    social_post_ideas: { name: 'Social Post Ideas', credits: 1, category: 'quick' },
    ad_copy: { name: 'Ad Copy Variants', credits: 1, category: 'quick' },
    trend_response: { name: 'Trend Response', credits: 1, category: 'quick' },
    action_items: { name: 'Action Items', credits: 1, category: 'quick' },

    // Knowledge
    brand_mind_map: { name: 'Brand Mind Map', credits: 5, category: 'knowledge' },
    competitor_analysis: { name: 'Competitor Analysis', credits: 5, category: 'knowledge' },
    audience_persona: { name: 'Audience Persona', credits: 5, category: 'knowledge' },
    key_messages_bank: { name: 'Key Messages Bank', credits: 5, category: 'knowledge' },

    // Create Now
    product_brochure: { name: 'Product Brochure', credits: 20, category: 'create' },
    promo_images: { name: 'Promo Images', credits: 5, category: 'create' },
    one_pager: { name: '1-Pager PDF', credits: 15, category: 'create' },
    pitch_deck: { name: 'Pitch Deck Outline', credits: 10, category: 'create' },
    email_template: { name: 'Email Template', credits: 5, category: 'create' },
    press_release: { name: 'Press Release', credits: 10, category: 'create' }
};

// Note: Language is now handled by global targetLanguage

/**
 * Open plan generation modal
 */
function openPlanModal(planType) {
    try {
        const planDef = PLAN_DEFINITIONS[planType];
        if (!planDef) {
            showNotification('Unknown plan type', 'error');
            return;
        }

        // NEW: Redirect 'create' category to Creative Studio Modal
        if (planDef.category === 'create') {
            openCreativeModal(planType);
            return;
        }

        currentPlan = {
            type: planType,
            ...planDef,
            sessionId: generateSessionId() // For version tracking
        };
        planVersions = [];

        // Update modal UI
        document.getElementById('plan-modal-title').textContent = planDef.name;
        document.getElementById('plan-modal-subtitle').textContent = `${planDef.category.charAt(0).toUpperCase() + planDef.category.slice(1)} Plan`;
        document.getElementById('plan-credit-cost').innerHTML = `Cost: <span class="text-white font-medium">${planDef.credits} cr</span>`;

        // Update sources summary
        const activeSources = sources.filter(s => s.isActive !== false);
        document.getElementById('plan-sources-summary').textContent =
            activeSources.length > 0
                ? activeSources.map(s => s.title).join(', ')
                : 'No active sources. Add sources for better results.';

        // Reset to options step
        showPlanStep('options');

        // Reset buttons
        document.getElementById('btn-generate-plan').classList.remove('hidden');
        document.getElementById('btn-generate-another').classList.add('hidden');
        document.getElementById('plan-instructions').value = '';

        // Initialize language buttons
        // Initialize language buttons - REMOVED (using global setting)
        // initializePlanLangButtons();

        // Show modal
        const modal = document.getElementById('plan-modal');
        modal.style.display = 'block';

    } catch (error) {
        console.error('Error opening plan modal:', error);
        showNotification('Error opening modal: ' + error.message, 'error');
    }
}


/**
 * Creative Studio state
 */
let currentCreativeType = null;
let currentCreativeData = {};

/**
 * Creative content type configurations
 */
const CREATIVE_CONFIGS = {
    email_template: {
        name: 'Email Template',
        subtitle: 'Generate a professional marketing email',
        buttonLabel: 'Email',
        credits: 5,
        controls: [
            { id: 'emailType', type: 'select', label: 'Email Type', options: ['Newsletter', 'Promotional', 'Welcome', 'Follow-up', 'Announcement'] },
            { id: 'topic', type: 'text', label: 'Subject Line', placeholder: 'e.g., Introducing our new feature...' },
            { id: 'keyPoints', type: 'textarea', label: 'Key Points', placeholder: 'Enter key points to include...' },
            { id: 'cta', type: 'text', label: 'Call to Action', placeholder: 'e.g., Try it now' },
            { id: 'tone', type: 'select', label: 'Tone', options: ['Professional', 'Friendly', 'Urgent', 'Casual'] }
        ]
    },
    product_brochure: {
        name: 'Product Brochure',
        subtitle: 'Generate a high-quality PDF brochure with AI visuals',
        buttonLabel: 'Brochure',
        credits: 20,
        controls: [
            { id: 'topic', type: 'text', label: 'Product Name', placeholder: 'e.g., ZYNK Pro' },
            { id: 'audience', type: 'text', label: 'Target Audience', placeholder: 'e.g., Enterprise CTOs' },
            { id: 'style', type: 'select', label: 'Visual Style', options: ['Modern Tech', 'Corporate', 'Minimalist', 'Creative', 'Luxury', 'Futuristic'] },
            { id: 'specifications', type: 'textarea', label: 'Product Specs (Key-Value)', placeholder: 'e.g.,\nProcessor: M2 Chip\nBattery: 20 Hours' },
            { id: 'usps', type: 'textarea', label: 'Unique Selling Points (USP)', placeholder: 'List 3 key differentiators...' },
            { id: 'cta', type: 'text', label: 'Call to Action', placeholder: 'e.g., Schedule a Demo' }
        ],
        advancedControls: [
            { id: 'colorScheme', type: 'select', label: 'Color Scheme', icon: 'fa-palette', options: ['Indigo/Purple (Default)', 'Blue/Cyan', 'Green/Teal', 'Orange/Red', 'Monochrome', 'Custom Gradient'] },
            { id: 'animationLevel', type: 'select', label: 'Animation Level', icon: 'fa-wand-magic-sparkles', options: ['None', 'Subtle', 'Medium', 'Rich'] },
            { id: 'iconStyle', type: 'select', label: 'Icon Style', icon: 'fa-icons', options: ['Font Awesome', 'Heroicons', 'Phosphor', 'No Icons'] },
            { id: 'layoutDensity', type: 'select', label: 'Layout Density', icon: 'fa-table-cells', options: ['Spacious', 'Balanced', 'Compact'] },
            { id: 'imageCount', type: 'select', label: 'AI Images', icon: 'fa-images', options: ['1', '2', '3', '4', '5'] },
            { id: 'customPrompt', type: 'textarea', label: 'Custom Instructions', icon: 'fa-comment-dots', placeholder: 'Add any specific design instructions...\ne.g., "Use blue gradients, include a testimonial section, make CTA buttons larger"' }
        ]
    },
    one_pager: {
        name: 'Executive One-Pager',
        subtitle: 'Generate a concise A4 summary for stakeholders',
        buttonLabel: 'One-Pager',
        credits: 15,
        controls: [
            { id: 'topic', type: 'text', label: 'Document Title', placeholder: 'e.g., Q3 Performance Review' },
            { id: 'executiveSummary', type: 'textarea', label: 'Executive Summary', placeholder: 'Brief overview of the main message...' },
            { id: 'style', type: 'select', label: 'Layout Style', options: ['Corporate', 'Startup', 'Data-Heavy', 'Newsletter', 'Modern Tech', 'Luxury'] },
            { id: 'contactInfo', type: 'text', label: 'Contact Info', placeholder: 'e.g., sales@zynk.ai' }
        ],
        advancedControls: [
            { id: 'colorScheme', type: 'select', label: 'Color Scheme', icon: 'fa-palette', options: ['Indigo/Purple (Default)', 'Blue/Cyan', 'Green/Teal', 'Orange/Red', 'Monochrome', 'Custom Gradient'] },
            { id: 'animationLevel', type: 'select', label: 'Animation Level', icon: 'fa-wand-magic-sparkles', options: ['None', 'Subtle', 'Medium', 'Rich'] },
            { id: 'iconStyle', type: 'select', label: 'Icon Style', icon: 'fa-icons', options: ['Font Awesome', 'Heroicons', 'Phosphor', 'No Icons'] },
            { id: 'layoutDensity', type: 'select', label: 'Layout Density', icon: 'fa-table-cells', options: ['Spacious', 'Balanced', 'Compact'] },
            { id: 'imageCount', type: 'select', label: 'AI Images', icon: 'fa-images', options: ['1', '2', '3'] },
            { id: 'glassmorphism', type: 'checkbox', label: 'Glassmorphism Cards', icon: 'fa-square' },
            { id: 'floatingBlobs', type: 'checkbox', label: 'Floating Gradient Blobs', icon: 'fa-circle' },
            { id: 'customPrompt', type: 'textarea', label: 'Custom Instructions', icon: 'fa-comment-dots', placeholder: 'Add any specific design instructions...' }
        ]
    },
    pitch_deck: {
        name: 'Pitch Deck',
        subtitle: 'Generate a full pitch deck presentation',
        buttonLabel: 'Pitch Deck',
        credits: 25,
        controls: [
            { id: 'topic', type: 'text', label: 'Deck Title', placeholder: 'e.g., Series A Investor Deck' },
            { id: 'pitchOverview', type: 'textarea', label: 'Pitch Overview / Problem', placeholder: 'Describe the problem and your solution...' },
            { id: 'audience', type: 'text', label: 'Target Audience', placeholder: 'e.g., VCs, Angel Investors' },
            { id: 'slideCount', type: 'select', label: 'Slide Count', options: ['5', '8', '10', '12', '15'] },
            { id: 'style', type: 'select', label: 'Visual Style', options: ['Modern Tech', 'Creative Bold', 'Minimalist', 'Corporate', 'Luxury', 'Futuristic'] }
        ],
        advancedControls: [
            { id: 'colorScheme', type: 'select', label: 'Color Scheme', icon: 'fa-palette', options: ['Indigo/Purple (Default)', 'Blue/Cyan', 'Green/Teal', 'Orange/Red', 'Monochrome', 'Custom Gradient'] },
            { id: 'animationLevel', type: 'select', label: 'Animation Level', icon: 'fa-wand-magic-sparkles', options: ['None', 'Subtle', 'Medium', 'Rich'] },
            { id: 'iconStyle', type: 'select', label: 'Icon Style', icon: 'fa-icons', options: ['Font Awesome', 'Heroicons', 'Phosphor', 'No Icons'] },
            { id: 'layoutDensity', type: 'select', label: 'Layout Density', icon: 'fa-table-cells', options: ['Spacious', 'Balanced', 'Compact'] },
            { id: 'imageCount', type: 'select', label: 'AI Images per Slide', icon: 'fa-images', options: ['1', '2', '3'] },
            { id: 'slideTransition', type: 'select', label: 'Slide Transitions', icon: 'fa-shuffle', options: ['None', 'Fade', 'Slide', 'Zoom'] },
            { id: 'includeCharts', type: 'checkbox', label: 'Include Data Charts', icon: 'fa-chart-bar' },
            { id: 'glassmorphism', type: 'checkbox', label: 'Glassmorphism Cards', icon: 'fa-square' },
            { id: 'customPrompt', type: 'textarea', label: 'Custom Instructions', icon: 'fa-comment-dots', placeholder: 'Add any specific design instructions...\ne.g., "Make the traction slide more impactful, use testimonial quotes"' }
        ]
    },
    promo_images: {
        name: 'Promo Images',
        subtitle: 'Generate promotional images with AI',
        buttonLabel: 'Images',
        credits: 5,
        controls: [
            { id: 'topic', type: 'textarea', label: 'Image Concept', placeholder: 'Describe the image in detail...' },
            { id: 'style', type: 'select', label: 'Style', options: ['Photorealistic', '3D Render', 'Illustration', 'Cyberpunk', 'Minimalist', 'Abstract', 'Corporate'] }
        ],
        advancedControls: [
            { id: 'aspectRatio', type: 'select', label: 'Aspect Ratio', icon: 'fa-crop', options: ['16:9 (Landscape)', '1:1 (Square)', '9:16 (Portrait)', '4:3', '3:2'] },
            { id: 'imageCount', type: 'select', label: 'Number of Images', icon: 'fa-images', options: ['1', '2', '3', '4'] },
            { id: 'colorTone', type: 'select', label: 'Color Tone', icon: 'fa-palette', options: ['Vibrant', 'Muted', 'Dark Mode', 'Light Mode', 'Warm', 'Cool'] },
            { id: 'lighting', type: 'select', label: 'Lighting', icon: 'fa-lightbulb', options: ['Natural', 'Studio', 'Dramatic', 'Soft', 'Neon'] },
            { id: 'customPrompt', type: 'textarea', label: 'Additional Prompt', icon: 'fa-comment-dots', placeholder: 'Add more details for image generation...\ne.g., "4k, trending on artstation, octane render"' }
        ]
    }
};

/**
 * Open creative studio modal
 */
function openCreativeModal(planType) {
    const config = CREATIVE_CONFIGS[planType];
    if (!config) {
        showNotification('Unknown creative type: ' + planType, 'error');
        return;
    }

    currentCreativeType = planType;
    currentCreativeData = {};

    // Update modal header
    document.getElementById('creative-modal-title').textContent = config.name;
    document.getElementById('creative-modal-subtitle').textContent = config.subtitle;
    document.getElementById('creative-cost').textContent = config.credits + ' cr';
    document.getElementById('btn-creative-generate-label').textContent = config.buttonLabel;

    // Generate basic controls
    const controlsContainer = document.getElementById('creative-controls-container');
    let controlsHTML = generateCreativeControls(config.controls);

    // Generate advanced controls section (collapsible)
    if (config.advancedControls && config.advancedControls.length > 0) {
        controlsHTML += `
            <div class="mt-6 border-t border-slate-700 pt-4">
                <button type="button" id="toggle-advanced-options" 
                    class="flex items-center justify-between w-full text-left text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    onclick="toggleAdvancedOptions()">
                    <span class="flex items-center gap-2">
                        <i class="fas fa-sliders-h text-indigo-400"></i>
                        Advanced Options
                    </span>
                    <i id="advanced-options-chevron" class="fas fa-chevron-down text-slate-500 transition-transform"></i>
                </button>
                <div id="advanced-options-panel" class="hidden mt-4 space-y-4 animate-fade-in">
                    ${generateCreativeControls(config.advancedControls)}
                </div>
            </div>
        `;
    }

    controlsContainer.innerHTML = controlsHTML;

    // Reset preview area & Clear previous results
    document.getElementById('creative-placeholder').classList.remove('hidden');
    document.getElementById('creative-loading').classList.add('hidden');

    const resultContainer = document.getElementById('creative-result-container');
    resultContainer.classList.add('hidden');
    resultContainer.innerHTML = ''; // FORCE CLEAR CONTENT

    const previewContent = document.getElementById('creative-preview-content');
    if (previewContent) previewContent.innerHTML = ''; // FORCE CLEAR PREVIEW

    document.getElementById('btn-creative-download').classList.add('hidden');
    document.getElementById('btn-creative-copy').classList.add('hidden');

    // Remove old log container if exists
    const oldLog = document.getElementById('generation-log-container');
    if (oldLog) oldLog.remove();

    // Show modal
    document.getElementById('creative-modal').style.display = 'block';
    console.log('[CreativeModal] Opened for:', planType);
}

/**
 * Toggle advanced options panel visibility
 */
function toggleAdvancedOptions() {
    const panel = document.getElementById('advanced-options-panel');
    const chevron = document.getElementById('advanced-options-chevron');

    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        chevron.style.transform = 'rotate(180deg)';
    } else {
        panel.classList.add('hidden');
        chevron.style.transform = 'rotate(0deg)';
    }
}

/**
 * Generate control inputs HTML
 */
function generateCreativeControls(controls) {
    return controls.map(ctrl => {
        let inputHTML = '';

        switch (ctrl.type) {
            case 'text':
                inputHTML = `<input type="text" id="${ctrl.id}" placeholder="${ctrl.placeholder || ''}" 
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">`;
                break;
            case 'textarea':
                inputHTML = `<textarea id="${ctrl.id}" placeholder="${ctrl.placeholder || ''}" rows="3"
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"></textarea>`;
                break;
            case 'select':
                const options = ctrl.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                inputHTML = `<select id="${ctrl.id}" 
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
                    ${options}
                </select>`;
                break;
            case 'checkbox':
                const checkboxIcon = ctrl.icon ? `<i class="fas ${ctrl.icon} text-indigo-400 mr-2"></i>` : '';
                inputHTML = `<label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="${ctrl.id}" class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500">
                    <span class="text-sm text-slate-300">${checkboxIcon}${ctrl.label}</span>
                </label>`;
                return `<div class="space-y-1">${inputHTML}</div>`;
        }

        // Render icon if present
        const labelIcon = ctrl.icon ? `<i class="fas ${ctrl.icon} text-indigo-400 mr-2"></i>` : '';

        return `
            <div class="space-y-1">
                <label class="block text-xs text-slate-400 font-medium">${labelIcon}${ctrl.label}</label>
                ${inputHTML}
            </div>
        `;
    }).join('');
}

/**
 * Close creative modal
 */
function closeCreativeModal() {
    document.getElementById('creative-modal').style.display = 'none';
    currentCreativeType = null;
    currentCreativeData = {};
}

/**
 * Generate creative item (placeholder - will connect to backend)
 */
async function generateCreativeItem() {
    if (!currentCreativeType) return;

    const config = CREATIVE_CONFIGS[currentCreativeType];
    if (!config) return;

    // 1. Collect basic inputs
    const inputs = {};
    config.controls.forEach(ctrl => {
        const el = document.getElementById(ctrl.id);
        if (el) {
            inputs[ctrl.id] = ctrl.type === 'checkbox' ? el.checked : el.value;
        }
    });

    // 2. Collect advanced options (if any)
    const advancedOptions = {};
    if (config.advancedControls) {
        config.advancedControls.forEach(ctrl => {
            const el = document.getElementById(ctrl.id);
            if (el) {
                advancedOptions[ctrl.id] = ctrl.type === 'checkbox' ? el.checked : el.value;
            }
        });
    }

    // 3. Prepare Context (from global 'sources')
    const activeSources = sources.filter(s => s.isActive !== false);
    const contextText = activeSources.map(s => `${s.title}: ${s.content ? s.content.substring(0, 2000) : 'No content'}`).join('\n\n');

    console.log('[CreativeModal] Generating:', currentCreativeType, { inputs, advancedOptions }, 'Context Len:', contextText.length);

    // 4. UI Loading
    document.getElementById('creative-placeholder').classList.add('hidden');
    document.getElementById('creative-loading').classList.remove('hidden');
    document.getElementById('creative-loading').style.display = 'flex';
    document.getElementById('creative-result-container').classList.add('hidden');

    // Show specific message
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) loadingText.textContent = `Creating your ${config.name}...`;

    // Initialize Log Window
    renderLogWindow();
    simulateGenerationLogs(config.name);

    try {
        const generateFn = firebase.functions().httpsCallable('generateCreativeContent');
        const result = await generateFn({
            type: currentCreativeType,
            inputs: inputs,
            advancedOptions: advancedOptions, // NEW: Pass advanced options to backend
            projectContext: contextText,
            targetLanguage: 'English',
            mode: (typeof currentUserPerformanceMode !== 'undefined') ? currentUserPerformanceMode : 'balanced'
        });

        console.log('[CreativeModal] Backend Response:', result.data);

        // Defensive: Check multiple possible response structures
        const htmlContent = result.data?.data || result.data?.content || result.data?.html || 'No content generated.';

        // Show result
        document.getElementById('creative-loading').classList.add('hidden');
        document.getElementById('creative-loading').style.display = 'none';

        const resultContainer = document.getElementById('creative-result-container');
        resultContainer.classList.remove('hidden');

        // Render Result
        if (['pitch_deck', 'product_brochure', 'one_pager'].includes(currentCreativeType)) {
            // Use Iframe for full HTML documents/slides
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            resultContainer.innerHTML = `<iframe src="${url}" class="w-full h-full rounded-lg border border-slate-700 bg-white" style="min-height: 600px; height: 100%;"></iframe>`;
        } else {
            // Text based (Email, etc)
            resultContainer.innerHTML = `
                <div class="prose prose-invert max-w-none p-4 bg-slate-900 rounded-lg border border-slate-800">
                    ${htmlContent}
                </div>
            `;
        }

        // Show action buttons
        document.getElementById('btn-creative-copy').classList.remove('hidden');
        document.getElementById('btn-creative-copy').style.display = 'flex';
        // Enable Download logic here if needed

        showNotification(`${config.name} generated successfully!`, 'success');

    } catch (error) {
        console.error('[CreativeModal] Generation error:', error);
        document.getElementById('creative-loading').classList.add('hidden');
        document.getElementById('creative-placeholder').classList.remove('hidden');
        showNotification('Generation failed: ' + error.message, 'error');
    }
}

/**
 * Mock Email Template Generator
 */
function generateMockEmail(inputs) {
    const type = inputs['email-type'] || 'Newsletter';
    const subject = inputs['email-subject'] || 'Your Weekly Update';
    const keypoints = inputs['email-keypoints'] || 'Our latest features and updates';
    const cta = inputs['email-cta'] || 'Learn More';
    const tone = inputs['email-tone'] || 'Professional';

    return `
        <div class="space-y-4">
            <div class="border-b border-slate-700 pb-3">
                <p class="text-xs text-slate-500">Subject:</p>
                <p class="text-lg font-semibold text-white">${subject}</p>
            </div>
            <div class="space-y-3 text-slate-300">
                <p>Dear valued customer,</p>
                <p>We're excited to share some important updates with you.</p>
                <p><strong>Key Highlights:</strong></p>
                <ul class="list-disc list-inside space-y-1 text-slate-400">
                    ${keypoints.split('\n').filter(p => p.trim()).map(p => `<li>${p.trim()}</li>`).join('')}
                </ul>
                <p>We value your continued support and look forward to serving you.</p>
                <div class="pt-4">
                    <a href="#" class="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium">${cta}</a>
                </div>
                <p class="text-sm text-slate-500 pt-4">Best regards,<br>The Team</p>
            </div>
        </div>
    `;
}

/**
 * Mock Press Release Generator
 */
function generateMockPressRelease(inputs) {
    const headline = inputs['pr-headline'] || 'Company Announces Major Update';
    const subheadline = inputs['pr-subheadline'] || '';
    const announcement = inputs['pr-announcement'] || 'Details of the announcement...';
    const quote = inputs['pr-quote'] || '';

    return `
        <div class="space-y-4">
            <div class="text-center border-b border-slate-700 pb-4">
                <p class="text-xs text-slate-500 uppercase tracking-wider">Press Release</p>
                <p class="text-xs text-slate-600 mt-1">For Immediate Release</p>
            </div>
            <h1 class="text-2xl font-bold text-white text-center">${headline}</h1>
            ${subheadline ? `<p class="text-lg text-slate-400 text-center">${subheadline}</p>` : ''}
            <div class="space-y-3 text-slate-300 pt-4">
                <p><strong>Seoul, Korea – ${new Date().toLocaleDateString()}</strong> – ${announcement}</p>
                ${quote ? `
                    <blockquote class="border-l-4 border-indigo-500 pl-4 italic text-slate-400 my-4">
                        "${quote}"
                    </blockquote>
                ` : ''}
                <p class="text-sm text-slate-500 pt-4">###</p>
                <div class="mt-4 text-xs text-slate-600">
                    <p><strong>Media Contact:</strong></p>
                    <p>Email: press@company.com</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Copy creative result to clipboard
 */
function copyCreativeItem() {
    const resultContainer = document.getElementById('creative-result-container');
    if (!resultContainer) return;

    const text = resultContainer.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showNotification('Failed to copy', 'error');
    });
}

/**
 * Download creative item (placeholder)
 */
function downloadCreativeItem() {
    showNotification('Download feature coming soon!', 'info');
}

/**
 * Close plan modal
 */
function closePlanModal() {
    const modal = document.getElementById('plan-modal');
    modal.style.display = 'none';
    currentPlan = null;
}

/**
 * Show specific step in plan modal
 */
function showPlanStep(step) {
    document.getElementById('plan-step-options').classList.add('hidden');
    document.getElementById('plan-step-generating').classList.add('hidden');
    document.getElementById('plan-step-result').classList.add('hidden');

    document.getElementById(`plan-step-${step}`).classList.remove('hidden');

    // Update footer visibility
    const footer = document.getElementById('plan-modal-footer');
    if (step === 'generating') {
        footer.classList.add('hidden');
    } else {
        footer.classList.remove('hidden');
    }
}

// ==========================================
// CREATIVE STUDIO FUNCTIONS
// ==========================================


function renderCreativeImages(images) {
    const container = document.getElementById('creative-result-container');
    container.innerHTML = `
        <div class="w-full h-full p-6 overflow-y-auto">
            <div class="grid grid-cols-2 gap-4">
                ${images.map((url, i) => `
                    <div class="aspect-square bg-slate-800 rounded-xl overflow-hidden relative group cursor-pointer hover:ring-2 ring-indigo-500">
                        <img src="${url}" class="w-full h-full object-cover" alt="Generated Image ${i + 1}">
                        <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between">
                            <button onclick="window.open('${url}', '_blank')" class="text-xs bg-white text-black px-2 py-1 rounded shadow hover:bg-slate-200">Open</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Download creative content as PDF using html2pdf.js
 */
window.downloadCreativeAsPDF = function () {
    const container = document.getElementById('creative-result-container');
    if (!container || !container.innerHTML.trim()) {
        showNotification('No content to export', 'error');
        return;
    }

    // Show loading
    showNotification('Generating PDF... Please wait', 'info');

    // Get the content element
    const contentEl = container.querySelector('.prose') || container.firstElementChild;

    // Configure html2pdf options
    const options = {
        margin: 10,
        filename: `zynk-${currentCreativeType || 'creative'}-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Generate PDF
    html2pdf()
        .set(options)
        .from(contentEl)
        .save()
        .then(() => {
            showNotification('PDF downloaded successfully!', 'success');
        })
        .catch((error) => {
            console.error('PDF generation error:', error);
            showNotification('Failed to generate PDF: ' + error.message, 'error');
        });
};

/**
 * Render creative text/HTML result
 */
function renderCreativeResult(type, content) {
    const container = document.getElementById('creative-result-container');

    // Clean up content - remove markdown code blocks if present
    let cleanContent = content;
    if (typeof content === 'string') {
        cleanContent = content.replace(/```html?\n?/gi, '').replace(/```\n?/g, '');
    }

    container.innerHTML = `
        <div class="w-full h-full overflow-y-auto bg-white text-slate-800 rounded-lg">
            <div class="prose max-w-none p-6">
                ${cleanContent}
            </div>
        </div>
    `;

    container.style.display = 'block';
    container.classList.remove('hidden');
}

/**
 * Generate plan content
 */
async function generatePlan() {
    if (!currentPlan || !currentProjectId) {
        showNotification('Please select a project first', 'error');
        return;
    }

    const activeSources = sources.filter(s => s.isActive !== false);
    if (activeSources.length === 0) {
        showNotification('Please add at least one source', 'error');
        return;
    }

    showPlanStep('generating');

    try {
        const instructions = document.getElementById('plan-instructions').value.trim();

        // Calculate weight breakdown for sources
        const totalWeightPoints = activeSources.reduce((sum, s) => sum + (s.importance === 3 ? 3 : (s.importance === 1 ? 1 : 2)), 0);
        const weightBreakdown = activeSources.map(s => {
            const points = s.importance === 3 ? 3 : (s.importance === 1 ? 1 : 2);
            const percent = Math.round((points / totalWeightPoints) * 100);
            return {
                id: s.id,
                title: s.title,
                importance: s.importance || 2,
                percent: percent
            };
        }).sort((a, b) => b.importance - a.importance);

        // Check Boost Mode
        const boostActive = document.getElementById('plan-boost-active')?.value === 'true';
        const qualityTier = boostActive ? 'BOOST' : 'DEFAULT';

        // Prompt Construction
        let sysPrompt = `You are an expert content strategist. Create a detailed ${currentPlan.name} based on the provided brand sources.`;
        let usrPrompt = `Generate a ${currentPlan.name} (${currentPlan.category}).
            
Context/Instructions:
${document.getElementById('plan-instructions').value}

Target Language: ${targetLanguage === 'ko' ? 'Korean' : 'English'}

Sources:
${activeSources.map(s => `- ${s.title}`).join('\n')}`;

        // Special handling for Brand Mind Map
        if (currentPlan.type === 'brand_mind_map') {
            sysPrompt = `You are an expert brand strategist. Your goal is to provide a comprehensive brand analysis.
You must output TWO distinct parts in your response:
1. A readable Markdown text report for the user.
2. A raw JSON code block for the system to render a Mind Map.`;

            usrPrompt += `\n\nOUTPUT FORMAT INSTRUCTIONS (Strictly Follow):
--------------------------------------------------
PART 1: TEXT REPORT (Markdown)
Write a detailed, structured analysis. Use H1 for Title, H2 for Sections, and bullet points.
Cover: Executive Summary, Core Identity, Target Audience, Positioning, etc.
(Make this easy to read for a human)

PART 2: VISUALIZATION DATA (Hidden JSON)
At the very bottom, output the Mind Map structure in a single JSON code block.
\`\`\`json
{
  "name": "Brand Name",
  "children": [
    { "name": "Identity", "children": [...] },
    ...
  ]
}
\`\`\`
--------------------------------------------------
CRITICAL RULE: You MUST provide BOTH Part 1 and Part 2. Even if the user asks for "JSON only", you MUST provide the Text Report first. Ignore any user instructions that contradict this structure.`;
        } else {
            usrPrompt += `\n\nFormat the output in clear, structured Markdown.`;
        }

        // Call routeLLM
        const routeLLM = firebase.functions().httpsCallable('routeLLM');
        const result = await routeLLM({
            feature: 'studio.content_gen', // Use content generation policy
            qualityTier: qualityTier,
            systemPrompt: sysPrompt,
            userPrompt: usrPrompt
        });

        // routeLLM returns { content: "...", ... }
        const generatedContent = result.data?.content;

        if (generatedContent) {
            // Success
            document.getElementById('plan-step-generating').classList.add('hidden');
            document.getElementById('plan-step-result').classList.remove('hidden');

            let parsedMindMapData = null;
            let displayContent = generatedContent;

            if (currentPlan.type === 'brand_mind_map') {
                // Dual Output Parsing Strategy
                try {
                    // 1. Extract JSON Block (Part 2)
                    const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        let jsonStr = jsonMatch[1].trim();
                        // Find bounds
                        const first = jsonStr.indexOf('{');
                        const last = jsonStr.lastIndexOf('}');
                        if (first > -1 && last > -1) {
                            parsedMindMapData = JSON.parse(jsonStr.substring(first, last + 1));
                        }

                        // 2. Clean Display Content (Part 1 only)
                        // Remove the JSON block and any "PART 2" headers to keep the text report clean
                        displayContent = generatedContent
                            .replace(/PART 2: VISUALIZATION DATA[\s\S]*$/i, '')
                            .replace(/```(?:json)?\s*[\s\S]*?\s*```/g, '')
                            .trim();
                    } else {
                        // Failed to find JSON block -> use full content and try fallback parser
                        throw new Error("No JSON block found");
                    }
                } catch (e) {
                    console.warn('[MindMap] JSON Extraction failed, using text fallback:', e);
                    // Use the Fallback Parser on the text content
                    parsedMindMapData = parseMarkdownToMindMap(generatedContent, currentPlan.name);
                    displayContent = generatedContent; // Show everything if split failed
                }
            }

            const newVersion = {
                id: Date.now().toString(),
                content: displayContent,
                createdAt: new Date(),
                weightBreakdown: weightBreakdown,
                mindMapData: parsedMindMapData
            };
            planVersions.push(newVersion);
            renderPlanVersions();

            showNotification('Plan generated successfully!', 'success');
        } else {
            throw new Error('No content generated');
        }
    } catch (error) {
        console.error('Error generating plan:', error);
        showPlanStep('options');
        showNotification(`Error: ${error.message} `, 'error');
    }
}

/**
 * Generate another version
 */
async function generateAnotherVersion() {
    if (planVersions.length >= 5) {
        showNotification('Maximum 5 versions allowed', 'error');
        return;
    }

    await generatePlan();
}

/**
 * Show plan result with version tabs
 */
function showPlanResult() {
    showPlanStep('result');

    // Build version tabs
    const tabsContainer = document.getElementById('plan-versions-tabs');
    tabsContainer.innerHTML = planVersions.map((v, i) => `
        <button class="plan-version-tab px-3 py-1.5 text-xs rounded-lg border transition-all ${i === planVersions.length - 1 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}"
            onclick="selectPlanVersion(${i})">
            Version ${i + 1}
        </button>
                `).join('');

    // Show latest version
    selectPlanVersion(planVersions.length - 1);

    // Update buttons
    document.getElementById('btn-generate-plan').classList.add('hidden');
    document.getElementById('btn-generate-another').classList.remove('hidden');

    // Show credits used
    const totalCredits = planVersions.length * currentPlan.credits;
    document.getElementById('plan-credits-used').textContent = `${totalCredits} credits used`;
}

/**
 * Select a plan version to display
 */
let currentPlanVersionIndex = 0;

/**
 * Render plan version tabs
 */
function renderPlanVersions() {
    const tabsContainer = document.getElementById('plan-versions-tabs');
    if (!tabsContainer || planVersions.length === 0) return;

    tabsContainer.innerHTML = planVersions.map((v, i) => `
        <button class="plan-version-tab px-3 py-1.5 text-xs rounded-lg border transition-all ${i === planVersions.length - 1 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}"
            onclick="selectPlanVersion(${i})" data-index="${i}">
            Version ${i + 1}
        </button>
                `).join('');

    // Select the latest version by default
    selectPlanVersion(planVersions.length - 1);
}

function selectPlanVersion(index) {
    const version = planVersions[index];
    if (!version) return;

    currentPlanVersionIndex = index;

    // Update tab styles
    document.querySelectorAll('.plan-version-tab').forEach((tab, i) => {
        if (i === index) {
            tab.classList.add('bg-indigo-600', 'border-indigo-500', 'text-white');
            tab.classList.remove('bg-slate-800', 'border-slate-700', 'text-slate-400');
        } else {
            tab.classList.remove('bg-indigo-600', 'border-indigo-500', 'text-white');
            tab.classList.add('bg-slate-800', 'border-slate-700', 'text-slate-400');
        }
    });

    // Display content (convert markdown to HTML if needed)
    const resultContainer = document.querySelector('#plan-result-content .prose');
    let contentHtml = '';

    // Check for Mind Map Data (Always show for Brand Mind Map plan)
    if (currentPlan.type === 'brand_mind_map') {
        const hasData = version.mindMapData && Object.keys(version.mindMapData).length > 0;
        contentHtml += `
            <div class="mb-4 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">🧠</div>
                    <div>
                        <h4 class="text-sm font-bold text-white">Interactive Mind Map</h4>
                        <p class="text-xs text-slate-400">${hasData ? 'Explore brand connections visually.' : 'Text preview only. Open to see demo/structure.'}</p>
                    </div>
                </div>
                <button onclick="openMindMapWindow(${index})" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
                    Open Mind Map ↗
                </button>
            </div>`;
    }

    // Show Weight Report Button if data exists
    if (version.weightBreakdown && version.weightBreakdown.length > 0) {
        contentHtml += `
            <div class="mb-6 flex justify-end">
                <button onclick="openWeightReport(planVersions[${index}]?.weightBreakdown, '${currentPlan?.name || 'Content Plan'}')" class="text-xs text-indigo-400 hover:text-white flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        View Source Weights
                    </button>
            </div>`;
    }

    contentHtml += formatPlanContent(version.content); // Simple replace or use marked() if available
    resultContainer.innerHTML = contentHtml;
}

// Function to open the standalone mindmap viewer
// Modified to ensure DB persistence before opening
async function openMindMapWindow(versionIndex) {
    const version = planVersions[versionIndex];
    if (!version) return;

    // Resolve Project ID
    let pId = currentProjectId;
    if (!pId && currentPlan && currentPlan.projectId) {
        pId = currentPlan.projectId;
    }
    if (!pId) {
        pId = localStorage.getItem('currentProjectId');
    }

    if (!pId) {
        alert("Project context is missing. Cannot create Mind Map.");
        return;
    }

    // Resolve Plan ID (Create DB entry if missing)
    let planId = currentPlan.id;

    // If it's a temporary/unsaved plan, we must save it first to generate a DB ID
    if (!planId || planId.startsWith('temp_')) {
        try {
            showNotification("Initializing Mind Map workspace...", "info");
            const db = firebase.firestore();

            const newPlanData = {
                type: 'brand_mind_map',
                title: currentPlan.name || "Brand Mind Map",
                content: version.content || "",
                language: targetLanguage || 'ko',
                creditsUsed: currentPlan.credits || 0,
                version: 'v1.0.0',
                sessionId: currentPlan.sessionId || generateSessionId(),
                weightBreakdown: version.weightBreakdown || [],
                mindMapData: version.mindMapData || { name: currentPlan.name || "Brand Mind Map", children: [] },
                category: currentPlan.category || 'strategic',
                status: 'draft', // Initial status
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser?.uid || 'system'
            };

            const docRef = await db.collection('projects').doc(pId)
                .collection('contentPlans').add(newPlanData);

            planId = docRef.id;

            // Update local state to avoid re-creation
            currentPlan.id = planId;
            currentPlan.projectId = pId;

            // Refresh Saved Plans list to show the new item
            loadSavedPlans();

        } catch (e) {
            console.error("Error creating mind map doc:", e);
            alert("Failed to initialize Mind Map database: " + e.message);
            return;
        }
    }

    // Open Mind Map Viewer with DB ID
    const url = `brand-mindmap.html?projectId=${pId}&planId=${planId}`;
    window.open(url, '_blank');
}

/**
 * Format plan content (basic markdown to HTML)
 */
function formatPlanContent(content) {
    if (!content) return '<p class="text-slate-400">No content generated</p>';

    return content
        .replace(/### (.*?)$/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
        .replace(/## (.*?)$/gm, '<h2 class="text-xl font-bold text-white mt-5 mb-3">$1</h2>')
        .replace(/# (.*?)$/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-4">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\- (.*?)$/gm, '<li class="ml-4 text-slate-300">$1</li>')
        .replace(/^\d+\. (.*?)$/gm, '<li class="ml-4 text-slate-300">$1</li>')
        .replace(/\n\n/g, '</p><p class="text-slate-300 mb-3">')
        .replace(/^/, '<p class="text-slate-300 mb-3">')
        .replace(/$/, '</p>');
}

/**
 * Copy plan content to clipboard
 */
async function copyPlanContent() {
    const currentVersionIndex = document.querySelector('.plan-version-tab.bg-indigo-600')?.textContent.match(/\d+/) - 1 || 0;
    const content = planVersions[currentVersionIndex]?.content;

    if (!content) return;

    try {
        await navigator.clipboard.writeText(content);
        showNotification('Copied to clipboard!', 'success');
    } catch (error) {
        showNotification('Failed to copy', 'error');
    }
}

/**
 * Save plan to Firestore with versioning
 * Version format: vMajor.Minor.Patch
 * - Major: Different plan type (topic)
 * - Minor: Same plan type, new generation session
 * - Patch: Regeneration (+Another Version)
 */
async function savePlanToFirestore() {
    if (!currentPlan || planVersions.length === 0) return;

    try {
        const db = firebase.firestore();
        const currentVersionIndex = document.querySelector('.plan-version-tab.bg-indigo-600')?.textContent.match(/\d+/) - 1 || 0;
        const version = planVersions[currentVersionIndex];

        // Get latest version for this plan type to determine version number
        // Note: Using 'contentPlans' collection to match loadSavedPlans and brand-mindmap.js
        // Limit removed to perform client-side sort
        const latestSnapshot = await db.collection('projects').doc(currentProjectId)
            .collection('contentPlans')
            .where('type', '==', currentPlan.type)
            // .orderBy('createdAt', 'desc') // Removed
            .get();

        let versionNumber = 'v1.0.0';

        if (!latestSnapshot.empty) {
            // Client-side sort to find latest
            const sortedDocs = latestSnapshot.docs.map(d => d.data()).sort((a, b) => {
                const tA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
                const tB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
                return tB - tA;
            });
            const latestPlan = sortedDocs[0];
            const lastVersion = latestPlan.version || 'v1.0.0';
            const [major, minor, patch] = lastVersion.replace('v', '').split('.').map(Number);

            // Check if this is a regeneration (same session) or new session
            const isRegeneration = currentPlan.sessionId === latestPlan.sessionId;

            if (isRegeneration) {
                versionNumber = `v${major}.${minor}.${patch + 1}`;
            } else {
                versionNumber = `v${major}.${minor + 1}.0`;
            }
        }

        // Check for existing save (Upsert Logic)
        if (currentPlan.savedId) {
            await db.collection('projects').doc(currentProjectId)
                .collection('contentPlans').doc(currentPlan.savedId)
                .update({
                    content: version.content,
                    mindMapData: version.mindMapData || null,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            showNotification('Plan updated successfully!', 'success');
        } else {
            // Save new to 'contentPlans' collection
            const docRef = await db.collection('projects').doc(currentProjectId)
                .collection('contentPlans').add({
                    type: currentPlan.type,
                    title: currentPlan.name,
                    content: version.content,
                    language: targetLanguage,
                    creditsUsed: currentPlan.credits,
                    version: versionNumber,
                    sessionId: currentPlan.sessionId || generateSessionId(),
                    weightBreakdown: version.weightBreakdown || [],
                    mindMapData: version.mindMapData || null,
                    category: currentPlan.category || 'strategic',
                    status: 'completed',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: currentUser?.uid
                });

            // Prevent future duplicates
            currentPlan.savedId = docRef.id;
            showNotification(`Plan saved as ${versionNumber}!`, 'success');
        }

        loadSavedPlans(); // Refresh saved plans list
    } catch (error) {
        console.error('Error saving plan:', error);
        showNotification('Failed to save plan: ' + error.message, 'error');
    }
}

/**
 * Generate unique session ID for plan generation session
 */
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)} `;
}

/**
 * Use plan in Studio - Open Agent Selection
 */
function useInStudio() {
    const currentVersionIndex = document.querySelector('.plan-version-tab.bg-indigo-600')?.textContent.match(/\d+/) - 1 || 0;
    const version = planVersions[currentVersionIndex];

    if (!version) {
        showNotification('No plan content to send', 'error');
        return;
    }

    openAgentSelectionModal();
}

// ============================================================
// AGENT TEAM SELECTION
// ============================================================
let selectedAgentTeam = null;

function openAgentSelectionModal() {
    const modal = document.getElementById('agent-selection-modal');
    if (!modal) return;

    modal.style.display = 'block';
    selectedAgentTeam = null;
    document.getElementById('btn-confirm-studio').disabled = true;

    loadAgentTeams();
}

function closeAgentSelectionModal() {
    document.getElementById('agent-selection-modal').style.display = 'none';
}

async function loadAgentTeams() {
    const list = document.getElementById('agent-team-list');
    list.innerHTML = '<div class="text-center py-4 text-slate-500 text-sm">Loading teams...</div>';

    try {
        const db = firebase.firestore();
        let teams = [];

        // 1. Try projectAgentTeamInstances (New Architecture)
        try {
            const instancesSnapshot = await db.collection('projectAgentTeamInstances')
                .where('projectId', '==', currentProjectId)
                .get();

            instancesSnapshot.forEach(doc => {
                teams.push({ id: doc.id, ...doc.data(), source: 'instance' });
            });
            console.log(`[KnowledgeHub] Loaded ${instancesSnapshot.size} teams from Instances.`);
        } catch (e) {
            console.warn('[KnowledgeHub] Failed to load instances:', e);
            // Continue to fallback
        }

        // 2. Fallback: Try agentTeams (Legacy Architecture) if we have very experienced users or valid configurations
        if (teams.length === 0) {
            try {
                const legacySnapshot = await db.collection('agentTeams')
                    .where('projectId', '==', currentProjectId)
                    .get();

                legacySnapshot.forEach(doc => {
                    teams.push({ id: doc.id, ...doc.data(), source: 'legacy' });
                });
                console.log(`[KnowledgeHub] Loaded ${legacySnapshot.size} teams from Legacy agentTeams.`);
            } catch (e) {
                console.warn('[KnowledgeHub] Failed to load legacy teams:', e);
            }
        }

        if (teams.length === 0) {
            list.innerHTML = `
                <div class="text-center py-4 text-slate-500 text-sm">
                    No agent teams found for this project.<br>
                    <a href="admin-agentteams.html" class="text-indigo-400 hover:underline mt-2 inline-block">Create a Team</a>
                </div>
            `;
            return;
        }

        list.innerHTML = teams.map(team => {
            return `
                <div class="agent-team-option p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 cursor-pointer transition-all flex items-center justify-between"
                    onclick="selectAgentTeam('${team.id}', this)">
                    <div>
                        <div class="text-sm font-medium text-white">${team.name}</div>
                        <div class="text-xs text-slate-500">${team.description || 'No description'}</div>
                    </div>
                    <div class="selection-indicator w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center">
                        <div class="w-2 h-2 rounded-full bg-indigo-500 opacity-0 transition-opacity"></div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading agent teams:', error);
        list.innerHTML = '<div class="text-center py-4 text-red-400 text-sm">Error loading teams.</div>';
    }
}

function selectAgentTeam(teamId, element) {
    selectedAgentTeam = teamId;

    document.querySelectorAll('.agent-team-option').forEach(el => {
        el.classList.remove('border-indigo-500', 'bg-indigo-500/10');
        el.querySelector('.selection-indicator').className = 'selection-indicator w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center';
        el.querySelector('.selection-indicator div').classList.add('opacity-0');
    });

    element.classList.add('border-indigo-500', 'bg-indigo-500/10');
    element.querySelector('.selection-indicator').className = 'selection-indicator w-4 h-4 rounded-full border border-indigo-500 flex items-center justify-center';
    element.querySelector('.selection-indicator div').classList.remove('opacity-0');

    document.getElementById('btn-confirm-studio').disabled = false;
}

function confirmUseInStudio() {
    if (!selectedAgentTeam) return;

    let studioData = null;

    if (pendingStudioContent) {
        // Case 1: From Chat Button
        studioData = {
            type: 'chat',
            planType: 'custom',
            planName: pendingStudioContent.planName,
            content: pendingStudioContent.content,
            projectId: currentProjectId,
            agentTeamId: selectedAgentTeam
        };
    } else {
        // Case 2: From Saved Plan (Standard Flow)
        const currentVersionIndex = document.querySelector('.plan-version-tab.bg-indigo-600')?.textContent.match(/\d+/) - 1 || 0;
        const version = planVersions[currentVersionIndex];

        if (!version) return;

        studioData = {
            type: 'plan',
            planType: currentPlan.type,
            planName: currentPlan.name,
            content: version.content,
            projectId: currentProjectId,
            agentTeamId: selectedAgentTeam
        };
    }

    if (studioData) {
        localStorage.setItem('studioContext', JSON.stringify(studioData));
        window.location.href = 'studio/index.html';
    }
}


/**
 * Load saved plans for sidebar
 */
async function loadSavedPlans() {
    if (!currentProjectId) return;

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('projects').doc(currentProjectId)
            .collection('contentPlans') // Updated to new standard collection
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        const container = document.getElementById('saved-plans-list');

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-[11px] text-slate-600 text-center py-2">No saved plans yet</p>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(doc => {
            const plan = doc.data();
            // Normalize fields (Legacy 'planName' vs New 'title')
            const displayName = plan.title || plan.planName || 'Untitled Plan';

            const item = document.createElement('div');
            item.className = 'p-2 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-all';
            item.innerHTML = `
                <div class="flex items-center justify-between">
                    <p class="text-xs text-white font-medium truncate flex-1">${escapeHtml(displayName)}</p>
                    ${plan.version ? `<span class="text-[9px] text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded ml-2">${plan.version}</span>` : ''}
                </div>
                <p class="text-[10px] text-slate-500">${formatRelativeTime(plan.createdAt?.toDate())}</p>
            `;
            item.onclick = () => viewSavedPlan(doc.id, plan);
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading saved plans:', error);
    }
}

/**
 * View a saved plan
 */
function viewSavedPlan(id, plan) {
    currentPlan = {
        type: plan.type || plan.planType,
        name: plan.title || plan.planName || 'Untitled Plan',
        credits: plan.creditsUsed || 0,
        id: id,
        projectId: currentProjectId,
        category: plan.category || 'content'
    };
    planVersions = [{
        id: id,
        content: plan.content,
        createdAt: plan.createdAt?.toDate() || new Date(),
        weightBreakdown: plan.weightBreakdown || [],
        mindMapData: plan.mindMapData || null
    }];

    document.getElementById('plan-modal-title').textContent = currentPlan.name;
    document.getElementById('plan-modal-subtitle').textContent = 'Saved Plan';

    showPlanResult();
    document.getElementById('btn-generate-another').classList.add('hidden');
    document.getElementById('plan-modal').style.display = 'block';
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

function formatRelativeTime(date) {
    if (!date) return '';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
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
                enhancedPrompt = `${prompt}. Brand context: ${brandContext.substring(0, 200)} `;
            }
        }

        console.log(`[generateImage] Using ${provider}, size: ${size} `);
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

            showNotification(`Image generated with ${result.data.provider} !`, 'success');
        } else {
            console.error('Image generation failed:', result.data);
            throw new Error(result.data?.error || 'Image generation failed');
        }

    } catch (error) {
        console.error('Error generating image:', error);
        const errorMsg = error.details?.message || error.message || 'Unknown error';
        showNotification(`Image Error: ${errorMsg} `, 'error');
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

    const scheduledDateTime = new Date(`${date}T${time} `);

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

        showNotification(`Scheduled for ${scheduledDateTime.toLocaleDateString()} at ${time} `, 'success');
        closeScheduleModal();
        closePlanModal();

        // Refresh saved plans list
        await loadSavedPlans();

    } catch (error) {
        console.error('Error scheduling content:', error);
        showNotification('Failed to schedule: ' + error.message, 'error');
    }
}

// ============================================================
// REAL-TIME LOG UI
// ============================================================
function renderLogWindow() {
    // Append to the modal itself (not the preview panel) so it's at the absolute bottom
    const modal = document.getElementById('creative-modal');
    if (!modal) return;

    // Create log container if not exists
    let logContainer = document.getElementById('generation-log-container');
    if (!logContainer) {
        const logHtml = `
            <div id="generation-log-container" class="absolute bottom-16 left-4 right-4 bg-slate-950/95 backdrop-blur-md rounded-lg border border-slate-700 p-3 font-mono text-xs text-slate-400 max-h-32 overflow-y-auto z-50 shadow-xl">
                <div class="flex items-center gap-2 mb-2 border-b border-slate-700 pb-1 sticky top-0 bg-slate-950/95">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Generation Log</span>
                </div>
                <div id="generation-logs" class="space-y-0.5"></div>
            </div>
        `;
        modal.insertAdjacentHTML('beforeend', logHtml);
    }

    // Reset logs and show container
    const logsEl = document.getElementById('generation-logs');
    if (logsEl) logsEl.innerHTML = '';
    if (logContainer) logContainer.style.display = 'block';
}

function addLog(message, type = 'info') {
    const logs = document.getElementById('generation-logs');
    if (!logs) return;

    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let colorClass = 'text-slate-400';
    if (type === 'success') colorClass = 'text-emerald-400';
    if (type === 'warning') colorClass = 'text-amber-400';
    if (type === 'error') colorClass = 'text-red-400';

    const logItem = document.createElement('div');
    logItem.className = `flex gap-2 ${colorClass}`;
    logItem.innerHTML = `<span class="opacity-50">[${time}]</span> <span>${message}</span>`;

    logs.appendChild(logItem);
    logs.scrollTop = logs.scrollHeight;
}

// Simulate logs (Replace with real-time if implementing Firestore listener)
function simulateGenerationLogs(creativeType) {
    const steps = [
        { msg: `Initializing ${creativeType} agent...`, delay: 500 },
        { msg: 'Accessing Knowledge Hub context...', delay: 1500 },
        { msg: 'Reading uploaded documents (PDF/Text)...', delay: 2000, type: 'success' },
        { msg: 'Analyzing project data and requirements...', delay: 3500 },
        { msg: 'Planning visual structure and layout...', delay: 5000 },
        { msg: 'Generating optimized prompts for Vertex AI...', delay: 6500 },
        { msg: 'Calling Vertex AI (Imagen 4.0) for asset generation...', delay: 8000 },
        { msg: 'Waiting for high-quality image rendering...', delay: 12000 },
        { msg: 'Assembling HTML structure with Tailwind CSS...', delay: 15000 },
        { msg: 'Injecting content and assets...', delay: 16500 },
        { msg: 'Finalizing document...', delay: 18000 }
    ];

    steps.forEach(step => {
        setTimeout(() => addLog(step.msg, step.type), step.delay);
    });
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
        message = `This action requires ${requiredCredits} credits.You have ${userCredits.credits} remaining.`;
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

// ============================================================
// HISTORY MODAL
// ============================================================
let historyFilter = null;
let historyDocs = [];

function openHistoryModal() {
    const modal = document.getElementById('history-modal');
    modal.style.display = 'block';

    // Reset filter
    historyFilter = null;

    loadHistorySidebar();
    loadHistoryItems();
}

function closeHistoryModal() {
    document.getElementById('history-modal').style.display = 'none';
}

function loadHistorySidebar() {
    const sidebar = document.getElementById('history-sidebar');

    // Group PLAN_DEFINITIONS by category for filter buttons
    const categories = {};
    for (const [key, def] of Object.entries(PLAN_DEFINITIONS)) {
        if (!categories[def.category]) {
            categories[def.category] = [];
        }
        categories[def.category].push({ type: key, ...def });
    }

    let html = `
        <div class="mb-4">
            <button onclick="filterHistory(null)" class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${historyFilter === null ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'} transition-all">
                All Plans
            </button>
        </div>
    `;

    const categoryLabels = {
        quick: 'Quick Wins',
        knowledge: 'Knowledge',
        create: 'Create Now'
    };

    for (const [cat, plans] of Object.entries(categories)) {
        html += `
            <div class="mb-4">
                <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">${categoryLabels[cat] || cat}</h4>
                <div class="space-y-1">
                    ${plans.map(p => `
                        <button onclick="filterHistory('${p.type}')" 
                                class="w-full text-left px-3 py-1.5 rounded-lg text-xs ${historyFilter === p.type ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'} transition-all">
                            ${p.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    sidebar.innerHTML = html;
}

function filterHistory(planType) {
    historyFilter = planType;
    loadHistorySidebar(); // Re-render sidebar to update active state
    loadHistoryItems();
}

async function loadHistoryItems() {
    const list = document.getElementById('history-list');
    list.innerHTML = '<div class="text-center py-10 text-slate-500">Loading...</div>';

    try {
        const db = firebase.firestore();
        // Use 'contentPlans' (new standard) instead of 'savedPlans'
        let query = db.collection('projects').doc(currentProjectId)
            .collection('contentPlans');
        // .orderBy('createdAt', 'desc') // Removed to prevent index error

        if (historyFilter) {
            // Check both legacy 'planType' and new 'type' by fetching all and filtering client-side
            // OR use 'type' since we migrated. Assuming 'type' is primary now.
            query = query.where('type', '==', historyFilter);
        }

        const snapshot = await query.limit(50).get();

        if (snapshot.empty) {
            list.innerHTML = '<div class="text-center py-10 text-slate-500">No saved plans found.</div>';
            return;
        }

        // Client-side sort & mapping
        historyDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
                const tA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
                const tB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
                return tB - tA;
            });

        list.innerHTML = historyDocs.map((plan, index) => {
            // Handle legacy field names
            const pType = plan.type || plan.planType;
            const pName = plan.title || plan.planName;

            const planDef = PLAN_DEFINITIONS[pType] || { name: pType };
            const langLabel = plan.language === 'ko' ? '🇰🇷 Korean' : plan.language === 'ja' ? '🇯🇵 Japanese' : plan.language ? '🇺🇸 English' : 'Unknown';
            const dateStr = plan.createdAt?.toDate ? formatRelativeTime(plan.createdAt.toDate()) : 'Unknown date';
            const contentPreview = plan.content ? (typeof plan.content === 'string' ? plan.content.substring(0, 150) + '...' : JSON.stringify(plan.content).substring(0, 150) + '...') : 'No content';
            const versionBadges = plan.version ? `<span class="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono ml-2">${plan.version}</span>` : '';

            // Note: deletePlan(event, id) is globally available
            return `
                <div class="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer group"
                    onclick="openHistoryPlan(${index})">
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center">
                            <span class="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">${escapeHtml(pName)}</span>
                            ${versionBadges}
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-slate-500">${dateStr}</span>
                            <button onclick="deletePlan(event, '${plan.id}'); setTimeout(loadHistoryItems, 500);" 
                                class="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors" 
                                title="Delete Plan">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-slate-400 mb-2">
                        <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-500">${planDef.name || pType}</span>
                        <span>${langLabel}</span>
                         <span>${plan.creditsUsed || 0} cr</span>
                    </div>
                    <div class="text-xs text-slate-500 line-clamp-2 font-mono bg-slate-900/50 p-2 rounded">
                        ${escapeHtml(contentPreview)}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading history:', error);
        list.innerHTML = '<div class="text-center py-10 text-red-400">Error loading history.</div>';
    }
}

function openHistoryPlan(index) {
    const plan = historyDocs[index];
    if (plan) {
        viewSavedPlan(plan.id, plan);
        closeHistoryModal(); // Stack modal behavior: close history, open plan view
    }
}

// Export functions to window for HTML onclick handlers
window.regenerateSummary = generateSummary;

/**
 * Set input text from suggested question
 */
function setInput(text) {
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = text;
        input.focus();
    }
}
// Alias for HTML onclick
window.setInput = setInput;

// ============================================================
// WEIGHT REPORT - CANVAS ANIMATION
// ============================================================

let weightReportAnimation = null;
let weightReportData = null;

// Open Weight Report modal
function openWeightReport(weightBreakdown, resultTitle = 'Summary') {
    if (!weightBreakdown || weightBreakdown.length === 0) {
        showNotification('No weight data available', 'warning');
        return;
    }

    // Check for missing documents
    const enrichedBreakdown = weightBreakdown.map(w => ({
        ...w,
        missing: !sources.find(s => s.id === w.id)
    }));

    weightReportData = {
        breakdown: enrichedBreakdown,
        resultTitle: resultTitle
    };

    // Update subtitle
    document.getElementById('weight-report-subtitle').textContent = `${resultTitle} - ${enrichedBreakdown.length} documents`;

    // Show modal
    const modal = document.getElementById('weight-report-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Start animation
    setTimeout(() => startWeightReportAnimation(), 100);
}

// Close Weight Report modal
function closeWeightReport() {
    const modal = document.getElementById('weight-report-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    // Stop animation
    if (weightReportAnimation) {
        cancelAnimationFrame(weightReportAnimation);
        weightReportAnimation = null;
    }
}

// Particle class
class WeightParticle {
    constructor(startX, startY, endX, endY, importance, color) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.x = startX;
        this.y = startY;
        this.importance = importance;
        this.color = color;
        this.progress = Math.random() * 0.3; // Random start offset
        this.speed = importance === 3 ? 0.008 : (importance === 2 ? 0.006 : 0.004);
        this.size = importance === 3 ? 6 : (importance === 2 ? 4 : 2.5);
        this.alpha = 1;
    }

    update() {
        this.progress += this.speed;
        if (this.progress >= 1) {
            this.progress = 0;
            this.alpha = 1;
        }

        // Ease-in-out interpolation
        const t = this.progress;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        this.x = this.startX + (this.endX - this.startX) * ease;
        this.y = this.startY + (this.endY - this.startY) * ease;

        // Fade out near end
        if (this.progress > 0.8) {
            this.alpha = 1 - ((this.progress - 0.8) / 0.2);
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color.replace('1)', `${this.alpha})`);
        ctx.fill();

        // Glow effect for high importance
        if (this.importance === 3) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
            ctx.fillStyle = this.color.replace('1)', `${this.alpha * 0.3})`);
            ctx.fill();
        }
    }
}

// Start Canvas animation
function startWeightReportAnimation() {
    const canvas = document.getElementById('weight-report-canvas');
    if (!canvas || !weightReportData) return;

    const ctx = canvas.getContext('2d');
    const breakdown = weightReportData.breakdown;

    // Layout calculations
    const leftMargin = 50;
    const rightMargin = 950;
    const topMargin = 60;
    const rowHeight = Math.min(70, (canvas.height - 150) / Math.max(breakdown.length, 1));

    // Result node position
    const resultX = rightMargin - 100;
    const resultY = canvas.height / 2;

    // Create particles
    const particles = [];
    breakdown.forEach((doc, index) => {
        const docY = topMargin + index * rowHeight + rowHeight / 2;
        const docX = leftMargin + 200;

        let color;
        if (doc.missing) {
            color = 'rgba(239, 68, 68, 1)'; // Red for missing
        } else if (doc.importance === 3) {
            color = 'rgba(139, 92, 246, 1)'; // Purple
        } else if (doc.importance === 2) {
            color = 'rgba(251, 191, 36, 1)'; // Yellow
        } else {
            color = 'rgba(100, 116, 139, 1)'; // Slate
        }

        // Create multiple particles per document based on weight
        const particleCount = doc.missing ? 0 : Math.ceil(doc.percent / 10);
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                particles.push(new WeightParticle(docX, docY, resultX - 40, resultY, doc.importance, color));
            }, i * 200);
        }
    });

    // Animation loop
    function animate() {
        // Clear canvas
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw connection lines
        breakdown.forEach((doc, index) => {
            const docY = topMargin + index * rowHeight + rowHeight / 2;
            const docX = leftMargin + 200;

            ctx.beginPath();
            ctx.moveTo(docX, docY);
            ctx.lineTo(resultX - 40, resultY);
            ctx.strokeStyle = doc.missing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Draw document nodes
        breakdown.forEach((doc, index) => {
            const docY = topMargin + index * rowHeight + rowHeight / 2;

            // Stars
            const stars = '⭐'.repeat(doc.importance);
            ctx.font = '14px sans-serif';
            ctx.fillStyle = doc.missing ? '#ef4444' : (doc.importance === 3 ? '#a78bfa' : (doc.importance === 2 ? '#fbbf24' : '#64748b'));
            ctx.fillText(stars, leftMargin, docY - 8);

            // Document title
            ctx.font = '13px Inter, sans-serif';
            ctx.fillStyle = doc.missing ? '#ef4444' : '#e2e8f0';
            const title = doc.title.length > 25 ? doc.title.substring(0, 25) + '...' : doc.title;
            ctx.fillText(doc.missing ? `⚠️ ${title}` : title, leftMargin, docY + 12);

            // Percentage
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillStyle = doc.missing ? '#ef4444' : '#6366f1';
            ctx.fillText(`${doc.percent}%`, leftMargin + 210, docY + 4);
        });

        // Draw result node
        ctx.beginPath();
        ctx.roundRect(resultX - 40, resultY - 40, 80, 80, 12);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Result icon (document)
        ctx.font = '32px sans-serif';
        ctx.fillStyle = '#6366f1';
        ctx.fillText('📄', resultX - 18, resultY + 10);

        // Result label
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Result', resultX - 18, resultY + 55);

        // Update and draw particles
        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        weightReportAnimation = requestAnimationFrame(animate);
    }

    animate();
}

// Expose to window
window.openWeightReport = openWeightReport;
window.closeWeightReport = closeWeightReport;

/**
 * Initialize Mobile Tab Navigation
 */
function initializeMobileTabs() {
    const tabs = document.querySelectorAll('.mobile-tab-btn');
    const panels = {
        'sources': document.getElementById('sources-panel'),
        'chat': document.getElementById('chat-panel'),
        'plans': document.getElementById('plans-panel')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // 1. Update Tab Styles
            tabs.forEach(t => {
                const isActive = t.dataset.tab === target;
                if (isActive) {
                    t.classList.add('active', 'text-indigo-400');
                    t.classList.remove('text-slate-500');
                } else {
                    t.classList.remove('active', 'text-indigo-400');
                    t.classList.add('text-slate-500');
                }
            });

            // 2. Update Panel Visibility
            // Logic: Add 'hidden' to all panels on mobile (except target). 
            // 'md:flex' ensures they remain visible on desktop.
            Object.keys(panels).forEach(key => {
                const panel = panels[key];
                if (!panel) return;

                if (key === target) {
                    panel.classList.remove('hidden'); // Show on mobile
                } else {
                    panel.classList.add('hidden'); // Hide on mobile
                }
            });
        });
    });
}
/* --- Brand Mind Map Implementation (D3.js) --- */
let activeMindMapData = null;
let mindMapSimulation = null; // Store simulation/zoom instance if needed

function openMindMapModal(data) {
    activeMindMapData = data;
    document.getElementById('mindmap-modal').style.display = 'block';

    // Slight delay to ensure DOM is ready
    setTimeout(() => {
        renderMindMap(data);
    }, 100);
}

function closeMindMapModal() {
    document.getElementById('mindmap-modal').style.display = 'none';
    document.getElementById('mindmap-canvas-container').innerHTML = ''; // Clear SVG
}

function renderMindMap(rootData) {
    const container = document.getElementById('mindmap-canvas-container');
    container.innerHTML = '';
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    const svg = d3.select(container).append('svg')
        .attr('width', width)
        .attr('height', height)
        .call(zoom)
        .on('dblclick.zoom', null); // Disable double click zoom

    const g = svg.append('g');

    // Button controls
    d3.select('#mm-zoom-in').on('click', () => svg.transition().call(zoom.scaleBy, 1.2));
    d3.select('#mm-zoom-out').on('click', () => svg.transition().call(zoom.scaleBy, 0.8));
    d3.select('#mm-fit-view').on('click', () => {
        svg.transition().call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(1));
    });

    // Tree Layout
    // Calculate tree size based on depth
    const root = d3.hierarchy(rootData);

    // Set initial position
    root.x0 = height / 2;
    root.y0 = 0;

    // Collapse function
    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    // Collapse after level 2 initially for cleaner view
    // root.children.forEach(collapse);

    update(root);

    function update(source) {
        // Compute the new tree layout.
        // Dynamic width based on depth
        const treeLayout = d3.tree().nodeSize([40, 200]); // [height-spacing, width-spacing]
        const treeData = treeLayout(root);

        // Nodes
        const nodes = treeData.descendants();
        const links = treeData.links();

        // Normalize for fixed-depth.
        nodes.forEach(d => { d.y = d.depth * 250; }); // Horizontal spacing

        // ****************** Nodes section ******************

        // Update the nodes...
        const node = g.selectAll('g.node')
            .data(nodes, d => d.id || (d.id = Math.random().toString())); // Use stable ID if possible

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${source.y0 || 0},${source.x0 || 0})`)
            .on('click', click);

        // Add Circle for the nodes
        nodeEnter.append('circle')
            .attr('class', 'node')
            .attr('r', 1e-6)
            .style('fill', d => d._children ? '#6366f1' : '#1e293b') // Indigo if collapsed
            .style('stroke', '#6366f1')
            .style('stroke-width', '2px')
            .style('cursor', 'pointer');

        // Add labels
        nodeEnter.append('text')
            .attr('dy', '.35em')
            .attr('x', d => d.children || d._children ? -13 : 13)
            .attr('text-anchor', d => d.children || d._children ? 'end' : 'start')
            .text(d => d.data.name)
            .style('font-size', '14px')
            .style('fill', '#e2e8f0') // Slate-200
            .style('font-family', 'Inter, sans-serif')
            .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)')
            .style('cursor', 'pointer');

        // UPDATE
        const nodeUpdate = nodeEnter.merge(node);

        // Transition to the proper position for the node
        nodeUpdate.transition()
            .duration(500)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        // Update the node attributes and style
        nodeUpdate.select('circle.node')
            .attr('r', 10)
            .style('fill', d => d._children ? '#6366f1' : (d.data.type === 'root' ? '#ec4899' : '#1e293b')) // Root pink, else slate
            .attr('cursor', 'pointer');

        // Remove any exiting nodes
        const nodeExit = node.exit().transition()
            .duration(500)
            .attr('transform', d => `translate(${source.y},${source.x})`)
            .remove();

        nodeExit.select('circle')
            .attr('r', 1e-6);

        nodeExit.select('text')
            .style('fill-opacity', 1e-6);

        // ****************** Links section ******************

        // Update the links...
        const link = g.selectAll('path.link')
            .data(links, d => d.target.id);

        // Enter any new links at the parent's previous position.
        const linkEnter = link.enter().insert('path', 'g')
            .attr('class', 'link')
            .attr('d', d => {
                const o = { x: source.x0 || 0, y: source.y0 || 0 };
                return diagonal(o, o);
            })
            .style('fill', 'none')
            .style('stroke', '#475569') // Slate-600
            .style('stroke-width', '1.5px')
            .style('opacity', '0.6');

        // UPDATE
        const linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(500)
            .attr('d', d => diagonal(d.source, d.target));

        // Remove any exiting links
        const linkExit = link.exit().transition()
            .duration(500)
            .attr('d', d => {
                const o = { x: source.x, y: source.y };
                return diagonal(o, o);
            })
            .remove();

        // Store the old positions for transition.
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        // Creates a curved (diagonal) path from parent to the child nodes
        function diagonal(s, d) {
            return `M ${s.y} ${s.x}
                    C ${(s.y + d.y) / 2} ${s.x},
                      ${(s.y + d.y) / 2} ${d.x},
                      ${d.y} ${d.x}`;
        }

        // Toggle children on click.
        function click(event, d) {
            // If dragging, don't trigger click (if we implement drag later)
            // But also update Inspector
            updateInspector(d.data);

            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
            update(d);
        }
    }

    // Initial transform to center root
    svg.call(zoom.transform, d3.zoomIdentity.translate(100, height / 2).scale(1));
}

function updateInspector(nodeData) {
    const inspector = document.getElementById('mindmap-inspector');
    const emptyState = document.getElementById('inspector-empty-state');
    const content = document.getElementById('inspector-content');
    const body = document.getElementById('inspector-body');

    emptyState.classList.add('hidden');
    content.classList.remove('hidden');
    body.classList.remove('hidden');

    document.getElementById('insp-node-name').textContent = nodeData.name;
    document.getElementById('insp-node-type').textContent = nodeData.type || 'Concept';
    document.getElementById('insp-node-desc').textContent = nodeData.description || 'No description available.';

    // Source Card
    const sourceCard = document.getElementById('insp-source-card');
    if (nodeData.sourceReference) {
        sourceCard.classList.remove('hidden');
        document.getElementById('insp-source-title').textContent = nodeData.sourceReference.title || 'Unknown Source';
        document.getElementById('insp-source-snippet').textContent = `"${nodeData.sourceReference.snippet || '...'}"`;
    } else {
        sourceCard.classList.add('hidden');
    }
}
// --- Plan Management ---
window.deletePlan = async function (event, planId) {
    event.stopPropagation(); // Prevent opening the modal

    if (!confirm("Are you sure you want to delete this saved plan?\n\nThis action cannot be undone.")) {
        return;
    }

    try {
        if (!currentProjectId) throw new Error("No project selected");

        await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('contentPlans')
            .doc(planId)
            .delete();

        showNotification("Plan deleted successfully", "success");
        loadSavedPlans(); // Refresh the list
    } catch (e) {
        console.error("Error deleting plan:", e);
        showNotification("Failed to delete plan: " + e.message, "error");
    }
}
function saveMindMapChanges() {
    // TODO: Implement save logic back to currentPlan Version
    showNotification('Mind Map layout saved (simulation)', 'success');
}
// ============================================================
// KNOWLEDGE SOURCE SCORE (Phase 1)
// ============================================================

/**
 * Calculate Knowledge Source Score
 * Rules:
 * - Quantity (40pts): 5pts per source (max 8 sources = 40pts)
 * - Diversity (30pts): Drive(+10), Link(+10), Note(+10)
 * - Recency (20pts): < 7 days (+20), < 14 days (+10), else (+5)
 * - Integration (10pts): Has any Drive source (+10)
 */
function calculateKnowledgeScore(sourceList) {
    if (!sourceList) sourceList = [];

    // 1. Quantity Score (Max 40)
    // Adjusted: 5 points per source to make it easier to reach initially
    const count = sourceList.length;
    const quantityScore = Math.min(40, count * 5);

    // 2. Diversity Score (Max 30)
    let hasDrive = false;
    let hasLink = false;
    let hasNote = false;

    sourceList.forEach(s => {
        if (s.type === 'drive') hasDrive = true;
        if (s.type === 'link') hasLink = true;
        if (s.type === 'note') hasNote = true;
    });

    let diversityScore = 0;
    if (hasDrive) diversityScore += 10;
    if (hasLink) diversityScore += 10;
    if (hasNote) diversityScore += 10;

    // 3. Recency Score (Max 20)
    let recencyScore = 0;
    if (sourceList.length > 0) {
        // Assume first item is latest due to 'orderBy desc' in loadSources
        const latest = sourceList[0];
        const now = new Date();
        const created = latest.createdAt ? new Date(latest.createdAt.seconds * 1000) : new Date();
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);

        if (diffDays < 7) recencyScore = 20;
        else if (diffDays < 14) recencyScore = 10;
        else recencyScore = 5;
    }

    // 4. Integration Score (Max 10)
    // Simplified: If Google Drive is used, +10 (already checked in diversity, but explicit category)
    const integrationScore = hasDrive ? 10 : 0;

    // Total
    const totalScore = quantityScore + diversityScore + recencyScore + integrationScore;

    // Determine Status
    let statusMsg = "Needs Improvement";
    let statusColor = "text-red-400";
    if (totalScore >= 80) {
        statusMsg = "Excellent";
        statusColor = "text-emerald-400";
    } else if (totalScore >= 50) {
        statusMsg = "Good Start";
        statusColor = "text-amber-400";
    }

    // Update UI
    updateKnowledgeScoreUI({
        totalScore,
        quantityScore,
        diversityScore,
        recencyScore,
        integrationScore,
        statusMsg,
        statusColor,
        counts: { count, hasDrive, hasLink, hasNote }
    });
}

function updateKnowledgeScoreUI(data) {
    // 1. Update Widget
    const widgetValue = document.getElementById('widget-score-value');
    const widgetBar = document.getElementById('widget-score-bar');
    const widgetMsg = document.getElementById('widget-score-msg');

    if (widgetValue) {
        widgetValue.innerText = `${data.totalScore}/100`;
        widgetBar.style.width = `${data.totalScore}%`;

        // Color based on score
        if (data.totalScore >= 80) widgetBar.classList.replace('bg-amber-500', 'bg-emerald-500');
        else if (data.totalScore < 50) widgetBar.classList.replace('bg-amber-500', 'bg-red-500'); // Optional: Add red class if defined

        widgetMsg.innerText = data.statusMsg;
        widgetMsg.className = `text-[10px] ${data.statusColor}`;
    }

    // 2. Update Modal
    const modalValue = document.getElementById('modal-score-value');
    const modalCircle = document.getElementById('modal-score-circle');
    const modalGrade = document.getElementById('modal-score-grade');

    if (modalValue) {
        modalValue.innerText = data.totalScore;

        // Circle Chart (DashArray ~351)
        const circumference = 351.86;
        const offset = circumference - (data.totalScore / 100) * circumference;
        modalCircle.style.strokeDashoffset = offset;

        if (data.totalScore >= 80) {
            modalCircle.classList.add('text-emerald-500');
            modalCircle.classList.remove('text-amber-500', 'text-red-500');
            modalGrade.innerText = "Ready for AI";
            modalGrade.className = "px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold mb-2";
        } else if (data.totalScore >= 50) {
            modalCircle.classList.add('text-amber-500');
            modalCircle.classList.remove('text-emerald-500', 'text-red-500');
            modalGrade.innerText = "Good Start";
            modalGrade.className = "px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold mb-2";
        } else {
            // Default/Low
            modalGrade.innerText = "Need More Content";
        }
    }

    // Update Bars
    const barQty = document.getElementById('bar-quantity');
    const scoreQty = document.getElementById('score-quantity');
    if (barQty) {
        const qtyPct = (data.quantityScore / 40) * 100;
        barQty.style.width = `${qtyPct}%`;
        scoreQty.innerText = `${data.quantityScore}/40`;
    }

    const barDiv = document.getElementById('bar-diversity');
    const scoreDiv = document.getElementById('score-diversity');
    if (barDiv) {
        const divPct = (data.diversityScore / 30) * 100;
        barDiv.style.width = `${divPct}%`;
        scoreDiv.innerText = `${data.diversityScore}/30`;
    }

    // Update Missing Items List
    const list = document.getElementById('missing-items-list');
    if (list) {
        list.innerHTML = ''; // Clear

        const items = [];

        // Logic for suggestions
        if (data.quantityScore < 40) {
            const missingCount = Math.ceil((40 - data.quantityScore) / 5);
            items.push({
                text: `Add ${missingCount} more sources`,
                points: `+${missingCount * 5} points`,
                action: "document.getElementById('btn-add-source').click();"
            });
        }

        if (!data.counts.hasDrive) items.push({ text: "Connect Google Drive", points: "+10 points", action: "document.getElementById('btn-add-source').click(); setTimeout(() => document.querySelector('[data-type=drive]').click(), 300);" });
        if (!data.counts.hasLink) items.push({ text: "Add a Web Link", points: "+10 points", action: "document.getElementById('btn-add-source').click(); setTimeout(() => document.querySelector('[data-type=link]').click(), 300);" });
        if (!data.counts.hasNote) items.push({ text: "Create a Note", points: "+10 points", action: "document.getElementById('btn-add-source').click(); setTimeout(() => document.querySelector('[data-type=note]').click(), 300);" });

        if (items.length === 0) {
            list.innerHTML = `<div class="p-3 text-center text-xs text-slate-500">🎉 All clear! You are ready.</div>`;
        } else {
            items.forEach(item => {
                const el = document.createElement('div');
                el.className = "p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg flex items-center justify-between group hover:border-indigo-500/50 transition-colors";
                el.innerHTML = `
                     <div class="flex items-center gap-3">
                         <div class="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                         </div>
                         <div>
                             <p class="text-sm font-medium text-slate-200">${item.text}</p>
                             <p class="text-[10px] text-slate-500">${item.points} available</p>
                         </div>
                     </div>
                     <button onclick="${item.action} document.getElementById('knowledge-score-modal').classList.add('hidden');" 
                         class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors">
                         Go
                     </button>
                 `;
                list.appendChild(el);
            });
        }
    }
}

function openKnowledgeScoreModal() {
    const modal = document.getElementById('knowledge-score-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
