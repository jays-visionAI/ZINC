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
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file';

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
let creativeProjectsUnsubscribe = null; // Unsubscribe listener for creative projects
let creativeProjects = []; // List of creative generation projects
// Creative Studio State
let currentCreativeId = null;
let currentCreativeType = null;
let currentViewportType = 'responsive';
let currentUserPerformanceMode = 'balanced';
let currentRefineState = { docId: null, index: null, element: null };
let currentCreativeData = {};
let zActiveTarget = null;
let zActiveSelection = "";

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
            loadCreativeProjects(); // NEW: Load background generation history
            initializeUploadHandlers(); // NEW: File upload logic
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

/**
 * Get comprehensive knowledge context from the current project
 * Used for prefilling context fields in creative tools
 */
async function getCurrentKnowledgeContext() {
    if (!currentProject) {
        console.warn('[getCurrentKnowledgeContext] No current project');
        return '';
    }

    let contextParts = [];

    // 1. Basic project info
    const projectName = currentProject.name || currentProject.brandName || '';
    if (projectName) {
        contextParts.push(`📌 Project/Brand: ${projectName}`);
    }

    // 2. Brand description/overview
    if (currentProject.description) {
        contextParts.push(`📝 Description: ${currentProject.description}`);
    }

    // 3. Core identity fields
    if (currentProject.coreIdentity) {
        const ci = currentProject.coreIdentity;
        if (ci.mission) contextParts.push(`🎯 Mission: ${ci.mission}`);
        if (ci.vision) contextParts.push(`🔮 Vision: ${ci.vision}`);
        if (ci.values) contextParts.push(`💎 Values: ${ci.values}`);
        if (ci.targetAudience) contextParts.push(`👥 Target Audience: ${ci.targetAudience}`);
        if (ci.uniqueValue) contextParts.push(`⭐ Unique Value: ${ci.uniqueValue}`);
    }

    // 4. Industry/category
    if (currentProject.industry) {
        contextParts.push(`🏢 Industry: ${currentProject.industry}`);
    }

    // 5. Current summary (if available)
    if (currentSummary && currentSummary.content) {
        const summaryText = typeof currentSummary.content === 'string'
            ? currentSummary.content
            : JSON.stringify(currentSummary.content);
        contextParts.push(`\n📋 Brand Summary:\n${summaryText.substring(0, 2000)}`);
    }

    // 6. Recent insights from sources (abbreviated)
    if (sources && sources.length > 0) {
        const processedSources = sources.filter(s => s.processed && s.summary);
        if (processedSources.length > 0) {
            const sourceInsights = processedSources.slice(0, 3).map(s =>
                `• ${s.name}: ${(s.summary || '').substring(0, 200)}`
            ).join('\n');
            contextParts.push(`\n📚 Knowledge Sources:\n${sourceInsights}`);
        }
    }

    return contextParts.join('\n\n');
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
        summaryTitle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg> <span class="ml-2">Brand Intelligence</span>`;
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
        summaryTitle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg> <span class="ml-2 text-white">${summaryToShow.title}</span>`;

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
        summaryTitle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg> <span class="ml-2">${summaryToShow.title}</span>`;

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
                                    <span class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">${w.importance === 3 ? 'High' : w.importance === 2 ? 'Med' : 'Low'}</span>
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
            if (filter === 'uploads') return s.sourceType === 'file';
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
        case 'file':
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
        default:
            return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>`;
    }
}

function getSourceBgColor(type) {
    switch (type) {
        case 'google_drive': return 'bg-blue-500/20';
        case 'link': return 'bg-emerald-500/20';
        case 'note': return 'bg-amber-500/20';
        case 'file': return 'bg-indigo-500/20';
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

    // Initialize Upload Handlers
    initializeUploadHandlers();
}

let selectedSourceFile = null;

function initializeUploadHandlers() {
    const dropzone = document.getElementById('source-upload-dropzone');
    const fileInput = document.getElementById('source-file-input');
    const selectedFileDiv = document.getElementById('selected-file-name');
    const fileNameText = document.getElementById('file-name-text');
    const btnClear = document.getElementById('btn-clear-file');
    const btnUpload = document.getElementById('btn-upload-source');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleSelectedFile(e.target.files[0]);
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-indigo-500', 'bg-indigo-500/5');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-indigo-500', 'bg-indigo-500/5');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-indigo-500', 'bg-indigo-500/5');
        if (e.dataTransfer.files.length > 0) {
            handleSelectedFile(e.dataTransfer.files[0]);
        }
    });

    btnClear?.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedSourceFile = null;
        fileInput.value = '';
        selectedFileDiv.classList.add('hidden');
        dropzone.classList.remove('hidden');
        btnUpload.disabled = true;
    });

    btnUpload?.addEventListener('click', uploadSourceFile);

    function handleSelectedFile(file) {
        if (file.size > 10 * 1024 * 1024) {
            showNotification('File exceeds 10MB limit. Please convert to PDF to reduce file size before uploading.', 'error');
            return;
        }
        selectedSourceFile = file;
        fileNameText.textContent = file.name;
        selectedFileDiv.classList.remove('hidden');
        dropzone.classList.add('hidden');
        btnUpload.disabled = false;
    }
}

async function uploadSourceFile() {
    if (!selectedSourceFile || !currentProjectId) return;

    const btn = document.getElementById('btn-upload-source');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Uploading...';

    try {
        const fileName = `${Date.now()}_${selectedSourceFile.name}`;
        const storagePath = `projects/${currentProjectId}/knowledgeSources/${fileName}`;
        const storageRef = firebase.storage().ref(storagePath);

        // Upload to Storage
        await storageRef.put(selectedSourceFile);
        const downloadUrl = await storageRef.getDownloadURL();

        // Save to Firestore
        const sourceData = {
            sourceType: 'file',
            title: selectedSourceFile.name,
            fileName: fileName,
            fileUrl: downloadUrl,
            contentType: selectedSourceFile.type,
            isActive: true,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .add(sourceData);

        showNotification('File uploaded successfully!', 'success');
        closeModal('add-source-modal');

        // Reset state
        selectedSourceFile = null;
        document.getElementById('selected-file-name').classList.add('hidden');
        document.getElementById('source-upload-dropzone').classList.remove('hidden');
        btn.textContent = originalText;

        await loadSources();
    } catch (error) {
        console.error('Error uploading source:', error);
        showNotification('Failed to upload file', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
    }
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

        showNotification(`Document importance set to Level ${validImportance}`, 'success');

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
    // Reset to show the latest brand summary
    selectedSourceId = null;

    // Show latest brand summary if available
    if (brandSummaries && brandSummaries.length > 0) {
        currentDisplayedSummary = brandSummaries[0]; // Most recent
        currentSummary = brandSummaries[0];
    } else {
        currentDisplayedSummary = null;
    }

    // Update UI
    updateSummarySection();
    renderSummaryHeader('brand'); // Reset to brand summary style

    // Deselect any selected source in the list
    document.querySelectorAll('.source-item').forEach(item => {
        item.classList.remove('ring-2', 'ring-indigo-500');
    });

    console.log('[KnowledgeHub] Returned to Brand Summary view');
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

    showNotification(`[AI] Market Analyst: Analyzing (${boostActive ? 'Boosted' : 'Standard'})...`, 'info');

    try {
        // Get content to summarize based on source type
        let contentToSummarize = '';

        if (source.sourceType === 'note') {
            contentToSummarize = source.note?.content || source.content || '';
        } else if (source.sourceType === 'link') {
            contentToSummarize = source.link?.extractedContent || source.content || source.link?.url || '';
        } else if (source.sourceType === 'google_drive') {
            contentToSummarize = source.googleDrive?.extractedContent || source.content || source.googleDrive?.fileName || '';
        } else if (source.sourceType === 'file') {
            // Use the extracted content from the initial analysis
            contentToSummarize = source.content || '';
        }

        if (!contentToSummarize) {
            showNotification('No content available to summarize', 'error');
            return;
        }

        // Call AI via routeLLM (PRD 11.6 Router)
        const routeLLM = firebase.app().functions('us-central1').httpsCallable('routeLLM');

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
        { id: 'email_template', name: 'Email Template', desc: 'Marketing email drafts', credits: 5 },
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
        { id: 'press_release', name: 'Press Release', desc: 'Professional media announcement', credits: 20 }
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
            if (cat === 'knowledge') btn.classList.add('ring-amber-500');
            else if (cat === 'strategic') btn.classList.add('ring-indigo-500');
            else if (cat === 'quick') btn.classList.add('ring-emerald-500');
            else if (cat === 'create') btn.classList.add('ring-rose-500');
        } else {
            btn.classList.remove('ring-2', 'ring-offset-2', 'ring-offset-slate-900',
                'ring-amber-500', 'ring-indigo-500', 'ring-emerald-500', 'ring-rose-500');
        }
    });

    // Unhide category details area if hidden
    const details = document.getElementById('plan-category-details');
    if (details) details.classList.remove('hidden');

    // If 'create' category selected, maybe suggest switching to Studio tab?
    // Actually, let's keep it manual or auto-switch for better UX
    if (category === 'create') {
        switchAssetTab('studio');
    } else {
        switchAssetTab('plans');
    }

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
    showNotification(`[AI] Strategy Planner: Generating ${formatPlanType(planType)}...`, 'info');

    try {
        // Call Cloud Function
        const generateContentPlan = firebase.app().functions('us-central1').httpsCallable('generateContentPlan');
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
        case 'sent': return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg> Sent`;
        case 'completed': return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg> Completed`;
        default: return status;
    }
}

function getPlanIcon(category) {
    switch (category) {
        case 'strategic': return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1 text-rose-400"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
        case 'quick_action': return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1 text-amber-400"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
        case 'knowledge': return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1 text-indigo-400"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>`;
        case 'create_now': return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-1 text-emerald-400"><path d="M4.5 16.5c-1.5 1.26-2 2.6-2 3.5 0 1 1 1.5 1.5 1.5.9 0 2.24-.5 3.5-2"/><path d="m21 3-9 9"/></svg>`;
        default: return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1 opacity-50"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
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
        'zh': '中文',
        'hi': 'हिन्दी',
        'es': 'Español',
        'fr': 'Français',
        'ar': 'العربية',
        'bn': 'বাংলা',
        'ru': 'Русский',
        'pt': 'Português',
        'ur': 'اردو',
        'id': 'Indonesia',
        'de': 'Deutsch',
        'ja': '日本語',
        'vi': 'Tiếng Việt',
        'tr': 'Türkçe',
        'it': 'Italiano',
        'th': 'ไทย',
        'tl': 'Tagalog',
        'mr': 'मराठी',
        'te': 'తెలుగు',
        'ta': 'தமிழ்'
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

    const persona = document.getElementById('chat-expert-persona')?.value || 'general';

    try {
        // Call Cloud Function with target language for translation
        const askKnowledgeHub = firebase.app().functions('us-central1').httpsCallable('askKnowledgeHub');
        const result = await askKnowledgeHub({
            projectId: currentProjectId,
            question: message,
            targetLanguage: targetLanguage || 'ko', // Pass selected language
            persona: persona // Pass selected expert persona
        });

        // Remove typing indicator
        removeTypingIndicator(typingId);

        if (result.data.success) {
            let answer = result.data.answer;
            const suggestedAction = result.data.suggestedAction;

            // Add source attribution if available
            if (result.data.sources && result.data.sources.length > 0) {
                answer += `\n\nSources: ${result.data.sources.join(', ')}`;
            }

            addChatMessage(answer, 'bot', suggestedAction);
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
            <span class="flex items-center justify-center w-6 h-6 rounded bg-indigo-500/10 text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </span>
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

function addChatMessage(content, type, suggestedAction = null) {
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
                <span class="flex items-center justify-center w-6 h-6 rounded bg-indigo-500/10 text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                </span>
            </div>
            <div class="flex-1 max-w-lg">
                <div class="bg-slate-800 rounded-2xl rounded-tl-md px-4 py-3">
                    <p class="text-sm text-slate-200 whitespace-pre-wrap">${escapeHtml(content)}</p>
                </div>

                <!-- Actionable Chat: Magic Button / Report Selection / More Info -->
                ${suggestedAction ? (() => {
                if (suggestedAction.type === 'report_selection') {
                    return `
                        <div class="mt-3 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 animate-in fade-in zoom-in duration-300">
                            <div class="flex items-center gap-2 mb-4">
                                <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11.5 15-2 2-2-2"/><path d="M12 9V3"/><path d="M20 12V6a2 2 0 0 0-2-2h-3.5"/><path d="M3 10V6a2 2 0 0 1 2-2h3.5"/><path d="M7 21h10"/><path d="M9 17v4"/><path d="M15 17v4"/></svg>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Report Configuration</p>
                                    <p class="text-xs text-white">Select the desired analysis level for your report.</p>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-3" id="report-selection-grid-${messageId}">
                                <!-- Standard Option -->
                                <button onclick="selectReportLevel('${messageId}', 'standard', this)" 
                                        class="flex flex-col items-center gap-2 p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-indigo-500/50 transition-all group">
                                    <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                    </div>
                                    <div class="text-center">
                                        <p class="text-xs font-bold text-white mb-0.5">Standard</p>
                                        <p class="text-[9px] text-slate-500 leading-tight">Quick 핵심 요약 중심</p>
                                    </div>
                                </button>
                                
                                <!-- Depth Option -->
                                <button onclick="selectReportLevel('${messageId}', 'depth', this)" 
                                        class="flex flex-col items-center gap-2 p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-purple-500/50 transition-all group">
                                    <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-purple-500/10 group-hover:text-purple-400 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                                    </div>
                                    <div class="text-center">
                                        <p class="text-xs font-bold text-white mb-0.5">Depth Report</p>
                                        <p class="text-[9px] text-slate-500 leading-tight">A4 규격 심층 분석 보고서</p>
                                    </div>
                                </button>
                            </div>
                            
                            <div id="report-confirm-area-${messageId}" class="hidden mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                                 <p class="text-[10px] text-slate-500">Ready to build your report?</p>
                                 <button onclick="finalizeReportGeneration('${messageId}', this)" 
                                         class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                                     Accept & Generate
                                 </button>
                            </div>
                        </div>
                        `;
                } else if (suggestedAction.type === 'need_more_info') {
                    const missingItems = suggestedAction.params?.missing || [];
                    return `
                        <div class="mt-3 bg-slate-800/50 border border-amber-500/30 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Information Readiness Check</p>
                                    <p class="text-xs text-white">Missing details for ${suggestedAction.params?.task?.replace('_', ' ') || 'content'}.</p>
                                </div>
                            </div>
                            
                            <div class="space-y-2 mb-4">
                                ${missingItems.map(item => `
                                    <div class="flex items-center gap-2 overflow-hidden">
                                        <div class="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 animate-pulse"></div>
                                        <p class="text-[11px] text-slate-400 truncate">${escapeHtml(item)}</p>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <div class="relative">
                                <textarea id="missing-info-input-${messageId}" 
                                          class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder-slate-600 transition-all"
                                          placeholder="Enter the missing information here..." rows="3"></textarea>
                                <div class="absolute bottom-2 right-2 flex gap-2">
                                    <button onclick="submitAdditionalInfo('${messageId}', '${suggestedAction.params?.task}')" 
                                            class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-2">
                                        Provide Info
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="mt-3 flex justify-between items-center">
                                <button onclick="launchStudioFromChat('${btoa(JSON.stringify({ type: 'creative_studio', params: { type: suggestedAction.params.task } }))}')" 
                                        class="text-[10px] text-slate-500 hover:text-slate-300 transition-all bg-transparent border-none">
                                    Proceed anyway (Low quality)
                                </button>
                                <label class="flex items-center gap-2 text-[10px] text-slate-500 cursor-pointer hover:text-white transition-all">
                                    <input type="file" class="hidden" onchange="handleInfoFileUpload(event, '${messageId}')">
                                    <button onclick="this.previousElementSibling.click()" class="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                        Attach File
                                    </button>
                                </label>
                            </div>
                        </div>
                        `;
                } else {
                    return `
                        <div class="mt-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                     <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                                     </div>
                                     <div>
                                        <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Magic Action</p>
                                        <p class="text-xs text-white">I've prepared the ${suggestedAction.params?.type?.replace('_', ' ') || 'content'} for you.</p>
                                     </div>
                                </div>
                                <button onclick="launchStudioFromChat('${btoa(JSON.stringify(suggestedAction))}')" 
                                        class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 group">
                                    Launch Studio
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                </button>
                            </div>
                        </div>
                        `;
                }
            })() : ''}

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

// Actionable Chat: Studio Launch Logic
function launchStudioFromChat(base64Action) {
    try {
        const action = JSON.parse(atob(base64Action));
        if (action.type === 'creative_studio') {
            // 1. Switch to 'Create Now' tab in sidebar
            const createTab = document.querySelector('[data-category="create"]');
            if (createTab) createTab.click();

            // 2. Open the specific plan modal
            const type = action.params?.type;
            if (type) {
                openPlanModal(type);

                // 3. Pre-fill inputs (with slight delay for modal render)
                setTimeout(() => {
                    const topicEl = document.getElementById('creative-input-topic');
                    const audienceEl = document.getElementById('creative-input-audience');
                    const toneEl = document.getElementById('creative-input-tone');

                    if (topicEl && action.params.topic) topicEl.value = action.params.topic;
                    if (audienceEl && action.params.audience) audienceEl.value = action.params.audience;
                    if (toneEl && action.params.tone) toneEl.value = action.params.tone;

                    showNotification(`Drafting your ${type.replace('_', ' ')} based on chat context...`, 'success');
                }, 400);
            }
        }
    } catch (e) {
        console.error('Failed to launch studio from chat:', e);
        showNotification('Failed to launch studio', 'error');
    }
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
        const langLabels = {
            'ko': 'Korean', 'en': 'English', 'zh': 'Chinese', 'hi': 'Hindi', 'es': 'Spanish',
            'fr': 'French', 'ar': 'Arabic', 'bn': 'Bengali', 'ru': 'Russian', 'pt': 'Portuguese',
            'ur': 'Urdu', 'id': 'Indonesian', 'de': 'German', 'ja': 'Japanese', 'vi': 'Vietnamese',
            'tr': 'Turkish', 'it': 'Italian', 'th': 'Thai', 'tl': 'Tagalog', 'mr': 'Marathi',
            'te': 'Telugu', 'ta': 'Tamil'
        };
        const labelText = langLabels[targetLanguage] || 'Default';

        // Define qualityTier based on boost status
        const qualityTier = boostActive ? 'boost' : 'standard';

        const userPrompt = `Please analyze the following source documents and generate a comprehensive Brand Summary in ${labelText}.

IMPORTANT: Generate a DETAILED summary with 3-4 paragraphs covering:
1. Core business overview and mission
2. Key products/services and unique value proposition  
3. Market position and competitive advantages
4. Strategic direction and growth opportunities

Source Weights (Importance 1-3):
${sourceWeights.map(s => `- ${s.title} (Importance: ${s.importance})`).join('\n')}

Output Format (JSON):
{
    "summary": "A comprehensive 3-4 paragraph summary (minimum 300 words). Cover the full scope of the brand including mission, products, market position, and strategy. Be specific and insightful, not generic.",
    "keyInsights": ["Insight 1 (specific and actionable)...", "Insight 2...", "Insight 3...", "Insight 4...", "Insight 5..."],
    "suggestedQuestions": ["Question 1?", "Question 2?"],
    "sourceNames": ["Source 1", "Source 2"]
}

Sources Content:
${activeSources.map(s => `--- Source: ${s.title} ---\n${s.summary || s.content?.substring(0, 5000) || ''}`).join('\n\n')}`;

        // Call LLM Router Cloud Function
        const routeLLM = firebase.app().functions('us-central1').httpsCallable('routeLLM');

        // Helper: Infer provider from model name
        function inferProviderFromModel(model) {
            if (!model) return 'openai';
            const m = model.toLowerCase();
            if (m.includes('deepseek')) return 'deepseek';
            if (m.includes('claude')) return 'anthropic';
            if (m.includes('gemini')) return 'google';
            if (m.includes('gpt') || m.includes('o1') || m.includes('o3')) return 'openai';
            return 'openai'; // Default fallback
        }

        // Get model from Admin Pipeline Settings
        const selectedModel = agentConfig.model || (analysisLevel === 'depth' ? 'gpt-4o' : 'gpt-4o-mini');
        // Infer provider from model name (since Admin UI only saves model, not provider)
        const selectedProvider = agentConfig.provider || inferProviderFromModel(selectedModel);

        console.log(`[KnowledgeHub] Using model from Pipeline: ${selectedProvider}/${selectedModel}`);

        const result = await routeLLM({
            feature: 'knowledge_hub.brand_summary',
            qualityTier: qualityTier,
            systemPrompt: systemPrompt,
            userPrompt: userPrompt,
            temperature: agentConfig.temperature || 0.2,
            provider: selectedProvider,  // Pass provider from Admin settings
            model: selectedModel,
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

            if (notesToDelete.length > 0) {
                const batch = firebase.firestore().batch();
                notesToDelete.forEach(ref => batch.delete(ref));
                await batch.commit();
                console.log(`[KnowledgeHub] Cleaned up ${notesToDelete.length} old summaries`);
            }
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
const selectedReportLevels = {};

function selectReportLevel(messageId, level, btn) {
    selectedReportLevels[messageId] = level;

    // Update UI in the grid
    const grid = document.getElementById(`report-selection-grid-${messageId}`);
    const buttons = grid.querySelectorAll('button');

    buttons.forEach(b => {
        b.classList.remove('border-indigo-500', 'border-purple-500', 'bg-indigo-500/5', 'bg-purple-500/5');
        const iconDiv = b.querySelector('.w-10');
        iconDiv.classList.remove('bg-indigo-500/10', 'text-indigo-400', 'bg-purple-500/10', 'text-purple-400');
    });

    if (level === 'standard') {
        btn.classList.add('border-indigo-500', 'bg-indigo-500/5');
        btn.querySelector('.w-10').classList.add('bg-indigo-500/10', 'text-indigo-400');
    } else {
        btn.classList.add('border-purple-500', 'bg-purple-500/5');
        btn.querySelector('.w-10').classList.add('bg-purple-500/10', 'text-purple-400');
    }

    // Show confirm area
    const confirmArea = document.getElementById(`report-confirm-area-${messageId}`);
    confirmArea.classList.remove('hidden');
    confirmArea.classList.add('flex');
}

async function finalizeReportGeneration(messageId, btn) {
    const level = selectedReportLevels[messageId];
    if (!level) return;

    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...';

    try {
        // Set the global level hidden input so the logic uses it
        document.getElementById('current-analysis-level').value = level;

        // Trigger report generation logic (existing)
        // Note: This would typically call generateKnowledgeSummary or similar
        await generateSummary();

        showNotification('Report generation started!', 'success');

        // Update card to show success
        const confirmArea = document.getElementById(`report-confirm-area-${messageId}`);
        confirmArea.innerHTML = `
            <div class="flex items-center gap-2 text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                <span class="text-[10px] font-bold">Successfully generated</span>
            </div>
            <button onclick="viewReportDetail()" class="text-[10px] font-bold text-indigo-400 hover:underline">View Report</button>
        `;
    } catch (error) {
        console.error('Report generation failed:', error);
        showNotification('Failed to generate report', 'error');
        btn.disabled = false;
        btn.textContent = 'Accept & Generate';
    }
}

function viewReportDetail() {
    const summarySection = document.getElementById('summary-section');
    if (summarySection) {
        summarySection.scrollIntoView({ behavior: 'smooth' });
        // Add a subtle highlight effect
        summarySection.classList.add('ring-2', 'ring-indigo-500/50');
        setTimeout(() => summarySection.classList.remove('ring-2', 'ring-indigo-500/50'), 2000);
    }
}

function submitAdditionalInfo(messageId, taskType) {
    const input = document.getElementById(`missing-info-input-${messageId}`);
    const info = input?.value?.trim();
    if (!info) {
        showNotification('Please enter some information', 'warning');
        return;
    }

    // Prepare message
    const prompt = `Here is the additional information for the ${taskType.replace('_', ' ')}: \n\n${info}`;

    // Set input and send
    document.getElementById('chat-input').value = prompt;
    sendChatMessage();

    // Disable the card button
    const btn = document.querySelector(`[onclick*="submitAdditionalInfo('${messageId}'"]`);
    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50');
        btn.innerHTML = 'Information Sent ✓';
    }
}

function handleInfoFileUpload(event, messageId) {
    const file = event.target.files[0];
    if (!file) return;

    // Show a notification and guide to the upload tab
    showNotification(`Selected ${file.name}. Please upload it via the "Upload" tab to integrate it into the knowledge base.`, 'info');

    // Switch to upload tab for them
    const uploadTabBtn = document.querySelector('[data-tab="upload"]');
    if (uploadTabBtn) uploadTabBtn.click();
}

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
    pitch_deck: { name: 'Pitch Deck', credits: 25, category: 'create' },
    email_template: { name: 'Email Template', credits: 5, category: 'quick' },
    press_release: { name: 'Press Release', credits: 20, category: 'create' }
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


// Creative Studio Configs below

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
            { id: 'contentTone', type: 'select', label: 'Content Tone', icon: 'fa-bullhorn', options: ['Professional', 'Persuasive', 'Technical', 'Creative', 'Academic'] },
            { id: 'imageStyle', type: 'select', label: 'AI Image Style', icon: 'fa-paint-brush', options: ['Photorealistic', '3D Render', 'Minimalist Illustration', 'Cyberpunk Digital Art', 'Abstract'] },
            { id: 'iconStyle', type: 'select', label: 'Icon Style', icon: 'fa-icons', options: ['Heroicons', 'Phosphor'] },
            { id: 'includeCharts', type: 'select', label: 'Data Visualization', icon: 'fa-chart-pie', options: ['None', 'Bar Charts', 'Line Graphs', 'Progress Rings', 'Infographic Cards'] },
            { id: 'layoutDensity', type: 'select', label: 'Layout Density', icon: 'fa-table-cells', options: ['Spacious', 'Balanced', 'Compact'] },
            { id: 'imageCount', type: 'select', label: 'AI Images', icon: 'fa-images', options: ['1', '2', '3', '4', '5'] },
            { id: 'aspectRatio', type: 'select', label: 'Image Aspect Ratio', icon: 'fa-crop', options: ['16:9 (Landscape)', '1:1 (Square)', '9:16 (Portrait)', '4:3', '3:2'] },
            { id: 'colorTone', type: 'select', label: 'Color Tone', icon: 'fa-palette', options: ['Vibrant', 'Muted', 'Warm', 'Cool', 'Pastel', 'Monochrome'] },
            { id: 'lighting', type: 'select', label: 'Lighting', icon: 'fa-bolt', options: ['Natural', 'Studio', 'Dramatic', 'Soft', 'Neon'] },
            { id: 'glassmorphism', type: 'checkbox', label: 'Glassmorphism Cards', icon: 'fa-square' },
            { id: 'floatingBlobs', type: 'checkbox', label: 'Floating Gradient Blobs', icon: 'fa-circle' },
            { id: 'customPrompt', type: 'textarea', label: 'Custom Instructions', icon: 'fa-comment-dots', placeholder: 'Add any specific design instructions...' }
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
            { id: 'knowledgeContext', type: 'textarea', label: 'Knowledge Context', placeholder: 'Knowledge Hub에서 가져온 정보가 여기에 표시됩니다. 필요시 수정하세요...', rows: 9, prefillFromKnowledgeHub: true },
            { id: 'style', type: 'select', label: 'Layout Style', options: ['Corporate', 'Startup', 'Data-Heavy', 'Newsletter', 'Modern Tech', 'Luxury'] },
            { id: 'contactInfo', type: 'text', label: 'Contact Info', placeholder: 'e.g., sales@zynk.ai' }
        ],
        advancedControls: [
            { id: 'colorScheme', type: 'select', label: 'Color Scheme', icon: 'fa-palette', options: ['Indigo/Purple (Default)', 'Blue/Cyan', 'Green/Teal', 'Orange/Red', 'Monochrome', 'Custom Gradient'] },
            { id: 'contentTone', type: 'select', label: 'Content Tone', icon: 'fa-bullhorn', options: ['Professional', 'Persuasive', 'Technical', 'Creative', 'Academic'] },
            { id: 'imageStyle', type: 'select', label: 'AI Image Style', icon: 'fa-paint-brush', options: ['Photorealistic', '3D Render', 'Minimalist Illustration', 'Cyberpunk Digital Art', 'Abstract'] },
            { id: 'iconStyle', type: 'select', label: 'Icon Style', icon: 'fa-icons', options: ['Heroicons', 'Phosphor'] },
            { id: 'includeCharts', type: 'select', label: 'Data Visualization', icon: 'fa-chart-pie', options: ['None', 'Bar Charts', 'Line Graphs', 'Progress Rings', 'Infographic Cards'] },
            { id: 'layoutDensity', type: 'select', label: 'Layout Density', icon: 'fa-table-cells', options: ['Spacious', 'Balanced', 'Compact'] },
            { id: 'imageCount', type: 'select', label: 'AI Images', icon: 'fa-images', options: ['1', '2', '3'] },
            { id: 'aspectRatio', type: 'select', label: 'Image Aspect Ratio', icon: 'fa-crop', options: ['16:9 (Landscape)', '1:1 (Square)', '9:16 (Portrait)', '4:3', '3:2'] },
            { id: 'colorTone', type: 'select', label: 'Color Tone', icon: 'fa-palette', options: ['Vibrant', 'Muted', 'Warm', 'Cool', 'Pastel', 'Monochrome'] },
            { id: 'lighting', type: 'select', label: 'Lighting', icon: 'fa-bolt', options: ['Natural', 'Studio', 'Dramatic', 'Soft', 'Neon'] },
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
            { id: 'contentTone', type: 'select', label: 'Content Tone', icon: 'fa-bullhorn', options: ['Professional', 'Persuasive', 'Technical', 'Creative', 'Academic'] },
            { id: 'imageStyle', type: 'select', label: 'AI Image Style', icon: 'fa-paint-brush', options: ['Photorealistic', '3D Render', 'Minimalist Illustration', 'Cyberpunk Digital Art', 'Abstract'] },
            { id: 'iconStyle', type: 'select', label: 'Icon Style', icon: 'fa-icons', options: ['Heroicons', 'Phosphor'] },
            { id: 'includeCharts', type: 'select', label: 'Data Visualization', icon: 'fa-chart-pie', options: ['None', 'Bar Charts', 'Line Graphs', 'Progress Rings', 'Infographic Cards'] },
            { id: 'layoutDensity', type: 'select', label: 'Layout Density', icon: 'fa-table-cells', options: ['Spacious', 'Balanced', 'Compact'] },
            { id: 'imageCount', type: 'select', label: 'AI Images per Slide', icon: 'fa-images', options: ['1', '2', '3'] },
            { id: 'aspectRatio', type: 'select', label: 'Image Aspect Ratio', icon: 'fa-crop', options: ['16:9 (Landscape)', '1:1 (Square)', '9:16 (Portrait)', '4:3', '3:2'] },
            { id: 'colorTone', type: 'select', label: 'Color Tone', icon: 'fa-palette', options: ['Vibrant', 'Muted', 'Warm', 'Cool', 'Pastel', 'Monochrome'] },
            { id: 'lighting', type: 'select', label: 'Lighting', icon: 'fa-bolt', options: ['Natural', 'Studio', 'Dramatic', 'Soft', 'Neon'] },
            { id: 'slideTransition', type: 'select', label: 'Slide Transitions', icon: 'fa-shuffle', options: ['Fade', 'Slide', 'Zoom', 'None'] },
            { id: 'glassmorphism', type: 'checkbox', label: 'Glassmorphism Cards', icon: 'fa-square' },
            { id: 'floatingBlobs', type: 'checkbox', label: 'Floating Gradient Blobs', icon: 'fa-circle' },
            { id: 'customPrompt', type: 'textarea', label: 'Custom Instructions', icon: 'fa-comment-dots', placeholder: 'Add any specific design instructions...\ne.g., "Make the traction slide more impactful, use testimonial quotes"' }
        ]
    },
    promo_images: {
        name: 'Promo Template',
        subtitle: 'AI-powered posters, cards, and banners with editable text',
        buttonLabel: 'Promo',
        credits: 5,
        controls: [
            {
                id: 'templateType',
                type: 'visual-pick',
                label: 'Template Type',
                options: [
                    { value: 'event_poster', label: 'Event Poster', icon: 'fa-calendar-star', desc: 'A4 Portrait' },
                    { value: 'invitation', label: 'Invitation', icon: 'fa-envelope-open-text', desc: 'Formal card' },
                    { value: 'social_banner', label: 'Social Banner', icon: 'fa-hashtag', desc: '1200x630' },
                    { value: 'business_card', label: 'Business Card', icon: 'fa-id-card', desc: 'Compact' },
                    { value: 'newsletter_header', label: 'Newsletter', icon: 'fa-newspaper', desc: 'Email header' },
                    { value: 'product_announce', label: 'Product Launch', icon: 'fa-bullhorn', desc: 'Announcement' }
                ]
            },
            { id: 'topic', type: 'text', label: 'Headline / Title', placeholder: 'e.g., Vision Chain 2026 Summit, Summer Sale 50% OFF...' },
            { id: 'campaignMessage', type: 'textarea', label: 'Subtext / Details', placeholder: 'e.g., January 15, 2026 | Grand Ballroom, Seoul\nKeynote by CEO John Smith' },
            {
                id: 'templateStyle',
                type: 'visual-pick',
                label: 'Design Style',
                options: [
                    { value: 'modern_tech', label: 'Modern Tech', icon: 'fa-microchip', desc: 'Gradient glow' },
                    { value: 'corporate_elegant', label: 'Elegant', icon: 'fa-gem', desc: 'Gold accents' },
                    { value: 'cyberpunk', label: 'Cyberpunk', icon: 'fa-bolt', desc: 'Neon vibes' }
                ]
            }
        ],
        advancedControls: [
            {
                id: 'colorTone',
                type: 'visual-pick',
                label: 'Color Tone & Mood',
                options: [
                    { value: 'Vibrant', label: 'Vibrant', icon: 'fa-sun', desc: 'Saturated' },
                    { value: 'Muted', label: 'Muted', icon: 'fa-cloud', desc: 'Soft & Dull' },
                    { value: 'Warm', label: 'Warm', icon: 'fa-fire', desc: 'Red/Orange' },
                    { value: 'Cool', label: 'Cool', 'icon': 'fa-snowflake', desc: 'Blue/Teal' },
                    { value: 'Pastel', label: 'Pastel', icon: 'fa-candy-cane', desc: 'Soft Candy' },
                    { value: 'Monochrome', label: 'Mono', icon: 'fa-adjust', desc: 'Black & White' },
                    { value: 'Sepia', label: 'Sepia', icon: 'fa-history', desc: 'Vintage Brown' },
                    { value: 'Neon', label: 'Neon', icon: 'fa-lightbulb', desc: 'Glow Lights' },
                    { value: 'Ethereal', label: 'Ethereal', icon: 'fa-ghost', desc: 'Dreamy & Light' },
                    { value: 'Dark Nord', label: 'Nord', icon: 'fa-moon', desc: 'Dark & Cold' },
                    { value: 'Midnight', label: 'Midnight', icon: 'fa-star', desc: 'Deep Blues' },
                    { value: 'Earth Tones', label: 'Earth', icon: 'fa-leaf', desc: 'Natural Brown' },
                    { value: 'Royal Gold', label: 'Gold', icon: 'fa-crown', desc: 'Luxury Accents' },
                    { value: 'High Contrast', label: 'Hi-Contrast', icon: 'fa-circle-half-stroke', desc: 'Sharp edges' },
                    { value: 'Low Contrast', label: 'Lo-Contrast', icon: 'fa-cloud-sun', desc: 'Faded look' },
                    { value: 'Sunset Glow', label: 'Sunset', icon: 'fa-mountain-sun', desc: 'Warm Gradient' },
                    { value: 'Cyber Green', label: 'Cyber', icon: 'fa-microchip', desc: 'Matrix vibes' },
                    { value: 'Retro 8-bit', label: 'Retro', icon: 'fa-gamepad', desc: 'Limited palette' },
                    { value: 'Industrial', label: 'Industrial', icon: 'fa-city', desc: 'Gray & Cold' },
                    { value: 'Luxury Dark', label: 'Luxury', icon: 'fa-gem', desc: 'Dark & Gold' },
                    { value: 'Oceanic', label: 'Ocean', icon: 'fa-water', desc: 'Deep Sea' },
                    { value: 'Desert Bloom', label: 'Desert', icon: 'fa-cactus', desc: 'Ochre & Sand' },
                    { value: 'Forest Mist', label: 'Forest', icon: 'fa-tree', desc: 'Deep Greens' },
                    { value: 'Cinematic Teal/Orange', label: 'Hollywood', icon: 'fa-video', desc: 'Classic Look' }
                ]
            },
            { id: 'lighting', type: 'select', label: 'Lighting', icon: 'fa-bolt', options: ['Natural', 'Studio', 'Dramatic', 'Soft', 'Neon'] },
            { id: 'customPrompt', type: 'textarea', label: 'Additional Prompt', icon: 'fa-comment-dots', placeholder: 'Add more details for image generation...\ne.g., "4k, trending on artstation, octane render"' }
        ]
    },
    press_release: {
        name: 'Professional Press Release',
        subtitle: 'High-impact media announcements with AI visuals',
        buttonLabel: 'Press Release',
        credits: 20,
        controls: [
            {
                id: 'newsType',
                type: 'select',
                label: 'News Category',
                options: [
                    'Product Launch / Expansion',
                    'Funding & Investment',
                    'Strategic Partnership',
                    'Company Milestone / Award',
                    'Event / Grand Opening',
                    'New Executive Hire',
                    'Thought Leadership / Research',
                    'Crisis Response / Official Statement'
                ],
                onChange: 'handleNewsTypeChange'
            },
            { id: 'topic', type: 'text', label: 'Main Headline Subject', placeholder: 'e.g., ZYNK Series A Funding' },
            { id: 'keyDetails', type: 'textarea', label: 'Core Announcement Details', placeholder: 'List key facts, figures, or the main news story...' },
            { id: 'quotes', type: 'textarea', label: 'Quote from Spokesperson', placeholder: 'e.g., "This partnership marks a new era for..."' },
            {
                id: 'executivePhoto',
                type: 'file',
                label: 'Executive Photo',
                placeholder: 'Upload a professional headshot of the new executive',
                accept: 'image/*',
                conditionalOn: { field: 'newsType', value: 'New Executive Hire' },
                required: true
            },
            {
                id: 'executiveName',
                type: 'text',
                label: 'Executive Name & Title',
                placeholder: 'e.g., John Doe, Chief Technology Officer',
                conditionalOn: { field: 'newsType', value: 'New Executive Hire' }
            }
        ],
        advancedControls: [
            { id: 'mediaStyle', type: 'select', label: 'Press Style', icon: 'fa-newspaper', options: ['Reuters Standard (Objective)', 'Start-Up Hype', 'Corporate Formal', 'Aggressive Market Move', 'Educational / Informative'] },
            { id: 'targetMedia', type: 'text', label: 'Target Outlets', icon: 'fa-bullhorn', placeholder: 'e.g., TechCrunch, Financial Times' },
            { id: 'imageStyle', type: 'select', label: 'AI Image Style', icon: 'fa-paint-brush', options: ['Photorealistic', '3D Render', 'Minimalist Illustration', 'Data Visualization Style', 'Abstract'] },
            { id: 'visualSubject', type: 'text', label: 'Image Subject Description', icon: 'fa-image', placeholder: 'What should the news image show?' },
            { id: 'imageCount', type: 'select', label: 'Number of AI Images', icon: 'fa-images', options: ['1', '2', '3'] },
            { id: 'aspectRatio', type: 'select', label: 'Image Aspect Ratio', icon: 'fa-crop', options: ['16:9 (Landscape)', '3:2', '4:3', '1:1 (Square)'] }
        ]
    }
};
;

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

    // Reset action buttons
    document.querySelectorAll('.btn-creative-injected').forEach(b => b.remove());
    const copyBtn = document.getElementById('btn-creative-copy');
    if (copyBtn) {
        copyBtn.classList.add('hidden');
        copyBtn.style.display = 'none';
    }
    const downloadBtn = document.getElementById('btn-creative-download');
    if (downloadBtn) {
        downloadBtn.classList.add('hidden');
        downloadBtn.style.display = 'none';
    }

    const previewContent = document.getElementById('creative-preview-content');
    if (previewContent) previewContent.innerHTML = ''; // FORCE CLEAR PREVIEW

    document.getElementById('btn-creative-download').classList.add('hidden');
    document.getElementById('btn-creative-copy').classList.add('hidden');

    // Remove old log container if exists
    const oldLog = document.getElementById('generation-log-container');
    if (oldLog) oldLog.remove();

    // === Prefill Knowledge Hub context for marked fields ===
    setTimeout(async () => {
        const prefillFields = document.querySelectorAll('[data-prefill-knowledge-hub="true"]');
        if (prefillFields.length > 0) {
            try {
                const knowledgeContext = await getCurrentKnowledgeContext();
                if (knowledgeContext && knowledgeContext.trim()) {
                    prefillFields.forEach(field => {
                        if (!field.value || field.value.trim() === '') {
                            field.value = knowledgeContext;
                        }
                    });
                    console.log('[CreativeModal] Knowledge Hub context prefilled');
                }
            } catch (e) {
                console.warn('[CreativeModal] Failed to prefill knowledge context:', e);
            }
        }
    }, 100);

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

        // Conditional visibility attributes
        const conditionalAttr = ctrl.conditionalOn
            ? `data-conditional-field="${ctrl.conditionalOn.field}" data-conditional-value="${ctrl.conditionalOn.value}" style="display:none;"`
            : '';

        switch (ctrl.type) {
            case 'text':
                inputHTML = `<input type="text" id="${ctrl.id}" placeholder="${ctrl.placeholder || ''}" 
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">`;
                break;
            case 'textarea':
                const textareaRows = ctrl.rows || 3;
                const prefillAttr = ctrl.prefillFromKnowledgeHub ? 'data-prefill-knowledge-hub="true"' : '';
                inputHTML = `<textarea id="${ctrl.id}" placeholder="${ctrl.placeholder || ''}" rows="${textareaRows}" ${prefillAttr}
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"></textarea>`;
                break;
            case 'select':
                const options = ctrl.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                const onChangeAttr = ctrl.onChange ? `onchange="${ctrl.onChange}(this)"` : '';
                inputHTML = `<select id="${ctrl.id}" ${onChangeAttr}
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
                    ${options}
                </select>`;
                break;
            case 'file':
                const acceptAttr = ctrl.accept ? `accept="${ctrl.accept}"` : '';
                const requiredText = ctrl.required ? '<span class="text-red-400 ml-1">*</span>' : '';
                inputHTML = `
                    <div class="flex flex-col gap-2">
                        <div class="relative">
                            <input type="file" id="${ctrl.id}" ${acceptAttr}
                                class="hidden" onchange="handleCreativeFileUpload(this, '${ctrl.id}')">
                            <label for="${ctrl.id}" 
                                class="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-slate-700/50 transition-all">
                                <i class="fas fa-cloud-upload-alt text-indigo-400"></i>
                                <span class="text-sm text-slate-300">${ctrl.placeholder || 'Upload file'}</span>
                            </label>
                        </div>
                        <div id="${ctrl.id}-preview" class="hidden">
                            <img src="" alt="Preview" class="w-24 h-24 object-cover rounded-lg border border-slate-600">
                            <span id="${ctrl.id}-filename" class="text-xs text-slate-400 ml-2"></span>
                        </div>
                    </div>`;
                // Add required star to label
                if (ctrl.required) {
                    const labelIcon = ctrl.icon ? `<i class="fas ${ctrl.icon} text-indigo-400 mr-2"></i>` : '';
                    return `
                        <div class="space-y-1 conditional-control" ${conditionalAttr}>
                            <label class="block text-xs text-slate-400 font-medium">${labelIcon}${ctrl.label}${requiredText}</label>
                            ${inputHTML}
                        </div>
                    `;
                }
                break;
            case 'checkbox':
                const checkboxIcon = ctrl.icon ? `<i class="fas ${ctrl.icon} text-indigo-400 mr-2"></i>` : '';
                inputHTML = `<label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="${ctrl.id}" class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500">
                    <span class="text-sm text-slate-300">${checkboxIcon}${ctrl.label}</span>
                </label>`;
                return `<div class="space-y-1 conditional-control" ${conditionalAttr}>${inputHTML}</div>`;
            case 'visual-pick':
                const gridOptions = ctrl.options.map((opt, idx) => `
                    <div class="visual-option group relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 cursor-pointer transition-all hover:bg-slate-700/50 hover:border-indigo-500/50 ${idx === 0 ? 'selected ring-2 ring-indigo-500 bg-indigo-500/10' : ''}" 
                         data-value="${opt.value}" onclick="selectVisualOption(this, '${ctrl.id}')">
                        <div class="text-xl mb-1.5 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                            <i class="fas ${opt.icon}"></i>
                        </div>
                        <div class="text-[10px] font-bold text-white text-center leading-normal mb-1">${opt.label}</div>
                        <div class="text-[8px] text-slate-500 text-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">${opt.desc}</div>
                        <div class="absolute top-1 right-1 opacity-0 check-mark">
                           <i class="fas fa-check-circle text-indigo-400 text-[10px]"></i>
                        </div>
                    </div>
                `).join('');
                inputHTML = `
                    <div class="grid grid-cols-3 gap-2 mt-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        ${gridOptions}
                    </div>
                    <input type="hidden" id="${ctrl.id}" value="${ctrl.options[0].value}">
                `;
                break;
        }

        // Render icon if present
        const labelIcon = ctrl.icon ? `<i class="fas ${ctrl.icon} text-indigo-400 mr-2"></i>` : '';

        return `
            <div class="space-y-1 conditional-control" ${conditionalAttr}>
                <label class="block text-xs text-slate-400 font-medium">${labelIcon}${ctrl.label}</label>
                ${inputHTML}
            </div>
        `;
    }).join('');
}

/**
 * Download the generated creative as PDF
 * For Press Release: Uses server-side Playwright for true WYSIWYG
 * For others: Uses client-side html2pdf.js
 */
async function downloadCreativeAsPDF(options = {}) {
    const resultContainer = document.getElementById('creative-result-container');
    if (!resultContainer || !resultContainer.innerHTML.trim()) {
        showNotification('No content to export', 'error');
        return;
    }

    const iframe = resultContainer.querySelector('iframe');

    // === HIGH QUALITY PDF (Server-side Puppeteer) ===
    // Use server-side for Press Releases and Pitch Decks to ensure WYSIWYG and perfect pagination
    const normalizedType = (currentCreativeType || '').toLowerCase().trim();
    const isHQType = normalizedType === 'press_release' || normalizedType === 'news' || normalizedType === 'pitch_deck';

    if (isHQType && iframe) {
        showNotification('Generating high-quality PDF (server-side)...', 'info');

        try {
            let htmlContent = iframe.contentDocument.documentElement.outerHTML;

            // Add Pitch Deck specific pagination fixes
            if (normalizedType === 'pitch_deck') {
                const paginationCSS = `
                <style>
                    section {
                        height: 100vh !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        position: relative !important;
                        overflow: hidden !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: center !important;
                        align-items: center !important;
                    }
                    /* Remove scroll bars and nav for PDF */
                    body { overflow: hidden !important; }
                    nav.fixed { display: none !important; }
                    .refine-btn, .img-overlay, .editor-status-badge, [id*="refine-btn"] { display: none !important; }
                </style>`;

                if (htmlContent.includes('</head>')) {
                    htmlContent = htmlContent.replace('</head>', paginationCSS + '</head>');
                } else {
                    htmlContent = paginationCSS + htmlContent;
                }
            }

            const config = CREATIVE_CONFIGS[currentCreativeType] || { name: 'ZINC_Creative' };
            const filename = `${config.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

            // Determine orientation
            let landscape = (currentCreativeType === 'pitch_deck' || currentViewportType === 'a4-l');
            let pageFormat = (currentCreativeType === 'pitch_deck') ? 'A4' : 'A4'; // Both use A4, but orient differently


            // Call server-side renderer v3 (optimized sparticuz/chromium)
            const renderFn = firebase.app().functions('us-central1').httpsCallable('renderPressReleasePDF_v3', { timeout: 300000 });
            const result = await renderFn({
                htmlContent: htmlContent,
                pageFormat: 'A4',
                landscape: landscape,
                documentId: currentCreativeId || null
            });

            if (result.data && result.data.success) {
                const pdfBlob = base64ToBlob(result.data.pdfBase64, 'application/pdf');
                const url = URL.createObjectURL(pdfBlob);

                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showNotification(`PDF Downloaded! (${result.data.sizeKB} KB)`, 'success');
            } else {
                throw new Error(result.data?.error || 'PDF generation failed');
            }
            return;
        } catch (error) {
            console.error('[HQ PDF] Server render failed:', error);
            showNotification('Server PDF failed, using browser print fallback...', 'warning');
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            return;
        }
    }

    // === OTHER TYPES: Client-side html2pdf.js ===
    // Load html2pdf if not present
    if (typeof html2pdf === 'undefined') {
        showNotification('Loading PDF engine...', 'info');
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    showNotification('Preparing PDF...', 'info');

    try {
        const config = CREATIVE_CONFIGS[currentCreativeType] || { name: 'ZINC_Creative' };
        const filename = `${config.name.replace(/\\s+/g, '_')}_${Date.now()}.pdf`;

        // === PROMO TEMPLATES: Use browser print (bypasses CORS issues) ===
        if (normalizedType === 'promo_images' || normalizedType === 'templates') {
            showNotification('Preparing PDF... (새 창이 열립니다)', 'info');

            // Get the actual rendered content
            const printContent = resultContainer.innerHTML;

            // Create a printable window with proper styling
            const printWindow = window.open('', '_blank', 'width=900,height=1200');
            if (!printWindow) {
                showNotification('팝업이 차단되었습니다. 팝업을 허용해주세요.', 'error');
                return;
            }

            printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${filename}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', sans-serif; 
            background: #0a0a0a; 
            min-height: 100vh;
        }
        .loading-overlay {
            position: fixed; inset: 0; background: #0a0a0a; 
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 18px; z-index: 9999;
        }
        @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .loading-overlay { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="loading-overlay" id="loading">PDF 준비 중... 잠시만 기다려주세요.</div>
    ${printContent}
    <script>
        // Wait for everything to load
        window.addEventListener('load', function() {
            setTimeout(function() {
                document.getElementById('loading').style.display = 'none';
                window.print();
            }, 2000);
        });
        // Fallback in case load doesn't fire
        setTimeout(function() {
            document.getElementById('loading').style.display = 'none';
            window.print();
        }, 5000);
    <\/script>
</body>
</html>
            `);
            printWindow.document.close();
            return;
        }

        // Determine capture width based on current viewport
        let captureWidth = 1200; // Reference width
        let pdfFormat = 'a4';
        let pdfOrientation = 'portrait';

        // Respect the user's selected viewport if available
        if (currentViewportType === 'a4-l') {
            captureWidth = 1123; // A4 Landscape width
            pdfOrientation = 'landscape';
        } else if (currentViewportType === 'a4-p') {
            captureWidth = 794; // A4 Portrait width
            pdfOrientation = 'portrait';
        } else if (currentViewportType === 'desktop') {
            captureWidth = 1280;
        } else if (currentViewportType === 'mobile') {
            captureWidth = 375;
        }

        const isFlexibleHeight = (currentCreativeType === 'promo_images' || currentCreativeType === 'one_pager' || currentCreativeType === 'product_brochure');

        if (currentCreativeType === 'pitch_deck') {
            pdfOrientation = 'landscape';
            pdfFormat = [297, 167]; // 16:9 Format
            captureWidth = 1280;
        }

        // CLONE the entire document
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-10000px';
        tempContainer.style.top = '0';
        tempContainer.style.width = captureWidth + 'px';

        // Deep clone content (iframe or direct container)
        let contentClone;
        if (iframe && iframe.contentDocument) {
            contentClone = iframe.contentDocument.documentElement.cloneNode(true);
        } else {
            // For non-iframe content (e.g., Promo Templates)
            contentClone = document.createElement('html');
            contentClone.innerHTML = `<head><meta charset="UTF-8"></head><body>${resultContainer.innerHTML}</body>`;
        }

        // EXTRA: STRIP SCRIPTS (Crucial for preventing UI element re-addition)
        contentClone.querySelectorAll('script').forEach(s => s.remove());

        // EXTRA: REMOVE UI ELEMENTS
        contentClone.querySelectorAll('.refine-btn, .img-overlay, .editor-status-badge, [id*="refine-btn"]').forEach(el => el.remove());

        // Fix layout and background for body
        const bodyClone = contentClone.querySelector('body');
        if (bodyClone) {
            bodyClone.style.overflow = 'hidden';
            bodyClone.style.width = captureWidth + 'px';
            bodyClone.style.height = 'auto';
            bodyClone.style.background = 'transparent'; // Let CSS handle it
        }

        // Add PDF-specific fixes to the clone
        const styleFix = document.createElement('style');
        styleFix.innerHTML = `
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .z-gradient-text { background-clip: text; -webkit-background-clip: text; color: inherit !important; }
            body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; background-color: #0A0A0F !important; }
            section { page-break-after: always !important; break-after: page !important; position: relative !important; overflow: hidden !important; }
            .no-print, .refine-btn, .img-overlay { display: none !important; opacity: 0 !important; visibility: hidden !important; }
            /* Fix for navbar items overlapping in flex layout */
            header nav { width: 100% !important; justify-content: space-between !important; }
            .flex { display: flex !important; }
        `;
        contentClone.querySelector('head').appendChild(styleFix);

        // Create an internal iframe for export
        const exportIframe = document.createElement('iframe');
        exportIframe.style.width = captureWidth + 'px';
        exportIframe.style.height = '5000px';
        exportIframe.style.visibility = 'hidden';

        tempContainer.appendChild(exportIframe);
        document.body.appendChild(tempContainer);

        exportIframe.contentDocument.open();
        exportIframe.contentDocument.write(contentClone.outerHTML);
        exportIframe.contentDocument.close();

        // 1. Wait for Fonts
        if (exportIframe.contentWindow.document.fonts) {
            await exportIframe.contentWindow.document.fonts.ready;
        }

        // 2. Wait for Images
        const images = exportIframe.contentDocument.querySelectorAll('img');
        const imgPromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        });

        // 3. Wait for Styles & Rendering
        await new Promise(r => setTimeout(r, 1500)); // Slightly longer wait for heavy layouts
        await Promise.all(imgPromises);

        // EXTRA: Measure height for flexible formats
        if (isFlexibleHeight && currentViewportType !== 'a4-p' && currentViewportType !== 'a4-l') {
            const body = exportIframe.contentDocument.body;
            const contentHeight = Math.max(body.scrollHeight, body.offsetHeight);
            const mmPerPx = 210 / captureWidth;
            pdfFormat = [210, contentHeight * mmPerPx];
            pdfOrientation = (contentHeight * mmPerPx < 210) ? 'landscape' : 'portrait';
        } else if (currentViewportType === 'a4-p') {
            pdfFormat = 'a4';
            pdfOrientation = 'portrait';
        } else if (currentViewportType === 'a4-l') {
            pdfFormat = 'a4';
            pdfOrientation = 'landscape';
        }

        const isPrint = options && options.isPrint;
        const opt = {
            margin: [0, 0],
            filename: filename,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: {
                scale: isPrint ? 3 : 2,
                useCORS: true,
                letterRendering: true,
                allowTaint: true,
                width: captureWidth,
                windowWidth: captureWidth,
                scrollX: 0,
                scrollY: 0,
                backgroundColor: '#0A0A0F',
                logging: false,
                imageTimeout: 15000,
                onclone: function (clonedDoc) {
                    // Convert background-image CSS to inline <img> for PDF capture
                    try {
                        const elementsWithBg = clonedDoc.querySelectorAll('[style*="background-image"]');
                        for (const el of elementsWithBg) {
                            const bgMatch = el.style.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                            if (bgMatch && bgMatch[1]) {
                                const imgUrl = bgMatch[1];
                                const img = clonedDoc.createElement('img');
                                img.src = imgUrl;
                                img.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1;';
                                img.crossOrigin = 'anonymous';
                                el.style.position = 'relative';
                                el.insertBefore(img, el.firstChild);
                                el.style.backgroundImage = 'none';
                            }
                        }
                    } catch (e) {
                        console.warn('Background image pre-processing failed:', e);
                    }
                }
            },
            jsPDF: { unit: 'mm', format: pdfFormat, orientation: pdfOrientation, compress: true }
        };

        // Target the iframe body
        await html2pdf().set(opt).from(exportIframe.contentDocument.body).save();

        document.body.removeChild(tempContainer);
        showNotification('PDF Downloaded!', 'success');
    } catch (error) {
        console.error('PDF Error:', error);
        showNotification('Failed to generate PDF: ' + error.message, 'error');
    }
}

/**
 * Toggle Edit Mode for the generated content
 */
let isEditMode = false;
function toggleEditMode() {
    const resultContainer = document.getElementById('creative-result-container');
    const iframe = resultContainer.querySelector('iframe');
    const editBtn = document.getElementById('btn-creative-edit');
    if (!editBtn) return;

    isEditMode = !isEditMode;

    if (iframe) {
        const doc = iframe.contentDocument;
        if (isEditMode) {
            doc.body.contentEditable = 'true';
            doc.body.focus();
            doc.body.style.outline = '2px dashed #6366f1';
            doc.body.style.padding = '10px';
            editBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Edit Mode: ACTIVE';
            editBtn.classList.remove('text-indigo-400', 'bg-indigo-500/10', 'border-indigo-500/20');
            editBtn.classList.add('text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20', 'ring-2', 'ring-emerald-500/40');
            showNotification('Edit Mode Enabled. You can now modify content directly.', 'info');
        } else {
            doc.body.contentEditable = 'false';
            doc.body.style.outline = 'none';
            doc.body.style.padding = '0';
            editBtn.innerHTML = '<i class="fas fa-eye mr-2"></i>View Mode (Switch to Edit)';
            editBtn.classList.remove('text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20', 'ring-2', 'ring-emerald-500/40');
            editBtn.classList.add('text-indigo-400', 'bg-indigo-500/10', 'border-indigo-500/20');

            // Sync changes to Firestore
            syncCreativeChanges(currentCreativeId);
            showNotification('Changes saved. View Mode restored.', 'success');
        }
    } else {
        const prose = resultContainer.querySelector('.prose');
        if (prose) {
            if (isEditMode) {
                prose.contentEditable = 'true';
                prose.focus();
                prose.classList.add('ring-2', 'ring-indigo-500', 'p-4');
                editBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Edit Mode: ACTIVE';
                editBtn.classList.remove('text-indigo-400', 'bg-indigo-500/10', 'border-indigo-500/20');
                editBtn.classList.add('text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20', 'ring-2', 'ring-emerald-500/40');
            } else {
                prose.contentEditable = 'false';
                prose.classList.remove('ring-2', 'ring-indigo-500', 'p-4');
                editBtn.innerHTML = '<i class="fas fa-eye mr-2"></i>View Mode (Switch to Edit)';
                editBtn.classList.remove('text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20', 'ring-2', 'ring-emerald-500/40');
                editBtn.classList.add('text-indigo-400', 'bg-indigo-500/10', 'border-indigo-500/20');
                syncCreativeChanges(currentCreativeId);
            }
        }
    }
}

/**
 * Close creative modal and reset states
 */
function closeCreativeModal() {
    document.getElementById('creative-modal').style.display = 'none';
    currentCreativeType = null;
    currentCreativeData = {};

    // Reset Edit Mode
    isEditMode = true; // Set opposite to trigger reset in toggleEditMode
    toggleEditMode(); // This will set isEditMode to false and reset UI

    const editBtn = document.getElementById('btn-creative-edit');
    if (editBtn) editBtn.classList.add('hidden');

    document.getElementById('btn-creative-copy').classList.add('hidden');
    document.getElementById('btn-creative-download').classList.add('hidden');

    // Hide Progress & Logs
    const progressContainer = document.getElementById('generation-progress-container');
    if (progressContainer) progressContainer.style.display = 'none';
    const logContainer = document.getElementById('generation-log-container');
    if (logContainer) logContainer.style.display = 'none';

    // NEW: Ensure all floating AI menus/modals are dismissed
    hideZContextMenu();
    closeZCommandBar();
    closeRefinePalette();
    hideZStyleBar();

    console.log('[CreativeModal] Closed and reset.');
}

/**
 * Generate creative item (Enhanced: Async, Auto-save, Refinement)
 */
async function generateCreativeItem() {
    if (!currentCreativeType) return;
    const config = CREATIVE_CONFIGS[currentCreativeType];
    if (!config) return;

    // 1. Collect inputs
    const inputs = {};
    config.controls.forEach(ctrl => {
        const el = document.getElementById(ctrl.id);
        if (el) inputs[ctrl.id] = (ctrl.type === 'checkbox') ? el.checked : el.value;
    });

    const advancedOptions = {};
    if (config.advancedControls) {
        config.advancedControls.forEach(ctrl => {
            const el = document.getElementById(ctrl.id);
            if (el) advancedOptions[ctrl.id] = (ctrl.type === 'checkbox') ? el.checked : el.value;
        });
    }

    const topic = inputs.topic || config.name;
    const activeSources = sources.filter(s => s.isActive !== false);
    const contextText = activeSources.map(s => `${s.title}: ${s.content ? s.content.substring(0, 2000) : 'No content'}`).join('\n\n');

    // Add uploaded executive photo URL if available
    if (uploadedExecutivePhotoUrl && inputs.newsType === 'New Executive Hire') {
        inputs.executivePhotoUrl = uploadedExecutivePhotoUrl;
        console.log('[Creative] Including executive photo URL:', uploadedExecutivePhotoUrl);
    }

    // 2. Initialize Firestore Record (Auto-save)
    showNotification('Starting creation workspace...', 'info');
    const db = firebase.firestore();
    let projectId;
    try {
        const projectRef = await db.collection('creativeProjects').add({
            userId: currentUser.uid,
            mainProjectId: currentProjectId,
            topic: topic,
            type: currentCreativeType,
            status: 'processing',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            inputs: inputs,
            advancedOptions: advancedOptions,
            configName: config.name
        });
        projectId = projectRef.id;
    } catch (e) {
        showNotification('Storage initialization failed.', 'error');
        return;
    }

    // UI Loading state
    document.getElementById('creative-placeholder').classList.add('hidden');
    const loadingEl = document.getElementById('creative-loading');
    loadingEl.classList.remove('hidden');
    loadingEl.style.display = 'flex';
    document.getElementById('creative-result-container').classList.add('hidden');

    startProgressBar();
    renderLogWindow();
    addLog(`Workspace created: ${projectId}`, 'info');

    try {
        const generateFn = firebase.app().functions('us-central1').httpsCallable('generateCreativeContent', { timeout: 600000 });
        const result = await generateFn({
            projectId: projectId,
            type: currentCreativeType,
            inputs: inputs,
            advancedOptions: advancedOptions,
            projectContext: contextText,
            targetLanguage: targetLanguage || 'ko',
            performanceMode: currentUserPerformanceMode || 'balanced'
        });

        stopProgressBar(100);
        addLog('Generation Success!', 'success');

        // The backend already updates the document status and HTML. 
        // We just need to trigger the view.
        viewCreativeProject(projectId);

    } catch (error) {
        console.error('[Creative] Failed:', error);
        stopProgressBar();
        addLog(`Error: ${error.message}`, 'error');
        const db = firebase.firestore();
        if (projectId) db.collection('creativeProjects').doc(projectId).update({ status: 'failed', error: error.message });
        showNotification('Creation failed: ' + error.message, 'error');
    }
}

/**
 * View Project in detail with Granular Edit hooks
 */
async function viewCreativeProject(docId) {
    const proj = creativeProjects.find(p => p.id === docId);
    if (!proj) return;

    currentCreativeId = docId;
    currentCreativeType = proj.type;
    isEditMode = false;

    openCreativeModal(proj.type);

    if (proj.status === 'processing') {
        const placeholder = document.getElementById('creative-placeholder');
        const loadingEl = document.getElementById('creative-loading');
        const resultContainer = document.getElementById('creative-result-container');

        placeholder.classList.add('hidden');
        resultContainer.classList.add('hidden');
        loadingEl.classList.remove('hidden');
        loadingEl.style.display = 'flex';

        // Show status in loading screen
        const loadingText = loadingEl.querySelector('p');
        if (loadingText) loadingText.textContent = `Generating "${proj.topic}"... This may take a minute. It's safe to stay here or continue working elsewhere.`;

        // Re-start progress bar with resume context
        startProgressBar(proj);
        return;
    }

    if (proj.status === 'failed') {
        const placeholder = document.getElementById('creative-placeholder');
        const loadingEl = document.getElementById('creative-loading');
        const resultContainer = document.getElementById('creative-result-container');

        loadingEl.classList.add('hidden');
        resultContainer.classList.add('hidden');
        placeholder.classList.remove('hidden');

        const title = placeholder.querySelector('h2');
        if (title) title.textContent = "Generation Failed";
        const desc = placeholder.querySelector('p');
        if (desc) desc.textContent = `Error: ${proj.error || 'Unknown error occurred during generation.'}`;
        return;
    }

    currentCreativeData = { html: proj.htmlContent };

    document.getElementById('creative-placeholder').classList.add('hidden');
    document.getElementById('creative-loading').classList.add('hidden');
    document.getElementById('creative-loading').style.display = 'none';
    const resultContainer = document.getElementById('creative-result-container');
    resultContainer.classList.remove('hidden');
    resultContainer.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.id = 'creative-result-iframe';
    iframe.style.width = '100%';
    iframe.style.height = '1000px'; // Default height, will be auto-adjusted or scrollable
    iframe.style.border = 'none';
    iframe.style.display = 'block';

    const fullHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                body { margin: 0; padding: 0; background: transparent; overflow-x: hidden; }
                /* Custom scrollbar for iframe content */
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; }

                .refine-btn { position: absolute; z-index: 50; display: none; }
                section:hover .refine-btn { display: flex; }
                .img-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; color: white; cursor: pointer; border-radius: inherit; }
                .img-container:hover .img-overlay { display: flex; }

                /* Z-Editor Gradient Support */
                .z-gradient-text {
                    background-size: 100%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    display: inline-block;
                }
            </style>
        </head>
        <body class="bg-black text-white">
            ${proj.htmlContent}
        </body>
        </html>
    `;

    resultContainer.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(fullHTML);
    iframe.contentWindow.document.close();

    // Setup action bar (Edit, PDF etc)
    injectActionButtonsToHeader();

    // APPLY VIEWPORT & RULER
    setTimeout(() => {
        if (proj.type === 'pitch_deck') {
            setCreativeViewport('a4-l');
        } else if (proj.type === 'one_pager') {
            setCreativeViewport('a4-p');
        } else {
            setCreativeViewport(currentViewportType || 'responsive');
        }
        updateRulers();
    }, 100);

    iframe.onload = () => {
        setupDetailedEditing(iframe, docId);
        initZEditor(iframe);
    };
}

/**
 * Add History management functions (Load, Render, Delete)
 */
let lastProjectCount = 0;
let prevCurrentStatus = null; // Track previous status for auto-refresh logic
async function loadCreativeProjects() {
    if (!currentUser || !currentProjectId) return;
    if (creativeProjectsUnsubscribe) creativeProjectsUnsubscribe();

    creativeProjectsUnsubscribe = db.collection('creativeProjects')
        .where('userId', '==', currentUser.uid)
        .where('mainProjectId', '==', currentProjectId)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            const newProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Capture OLD state BEFORE updating for comparison
            const oldProjects = [...creativeProjects];
            const oldLastCount = lastProjectCount;
            const oldCurrentStatus = prevCurrentStatus;

            // Update state
            creativeProjects = newProjects;
            lastProjectCount = creativeProjects.length;

            // Update prevCurrentStatus for next snapshot
            if (currentCreativeId) {
                const curr = newProjects.find(p => p.id === currentCreativeId);
                prevCurrentStatus = curr?.status || null;
            }

            // 1. Auto-refresh if current viewed project status changed (e.g., from processing to completed)
            if (currentCreativeId) {
                const updatedCurrent = newProjects.find(p => p.id === currentCreativeId);
                if (updatedCurrent && oldCurrentStatus && updatedCurrent.status !== oldCurrentStatus) {
                    if (updatedCurrent.status === 'completed' || updatedCurrent.status === 'failed') {
                        console.log('[CreativeStore] Current project finished, auto-refreshing view...');
                        viewCreativeProject(currentCreativeId);
                    }
                }
            }

            // 2. UX: Notification for background completion
            if (oldLastCount > 0 && newProjects.length === oldLastCount) {
                for (let i = 0; i < newProjects.length; i++) {
                    if (newProjects[i].status === 'completed' && oldProjects[i]?.status === 'processing') {
                        showNotification(`Success: "${newProjects[i].topic}" generation complete!`, 'success');
                        break;
                    }
                }
            }

            renderCreativeHistory();
        }, error => {
            console.error('[CreativeStore] Snapshot listener failed:', error);
            if (creativeProjects.length === 0) renderCreativeHistory();
        });
}

function renderCreativeHistory() {
    const listContainer = document.getElementById('creative-history-list');
    if (!listContainer) return;

    if (creativeProjects.length === 0) {
        listContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 opacity-40">
                <i class="fas fa-folder-open text-2xl mb-2"></i>
                <p class="text-[10px] italic">No studio assets found</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = creativeProjects.map(proj => {
        let isProcessing = proj.status === 'processing';
        let statusColor = isProcessing ? 'indigo' : (proj.status === 'completed' ? 'emerald' : 'rose');
        let icon = proj.type === 'pitch_deck' ? 'fa-presentation-screen' : (proj.type === 'product_brochure' ? 'fa-file-invoice' : 'fa-lightbulb');
        let pulseClass = isProcessing ? 'animate-pulse' : '';

        return `
            <div class="group relative p-3 ${isProcessing ? 'bg-indigo-500/5' : 'bg-slate-800/40'} hover:bg-slate-700/60 border ${isProcessing ? 'border-indigo-500/30' : 'border-slate-700/50'} rounded-xl mb-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-indigo-500/10" 
                 onclick="viewCreativeProject('${proj.id}')">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-${statusColor}-500/10 flex items-center justify-center ${pulseClass}">
                            <i class="fas ${icon} text-${statusColor}-400 text-[10px]"></i>
                        </div>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${proj.configName || proj.type}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[8px] font-bold text-${statusColor}-400 ${pulseClass}">${proj.status}</span>
                        <button onclick="event.stopPropagation(); deleteCreativeProject('${proj.id}')" 
                                class="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 transition-all">
                            <i class="fas fa-trash-alt text-[10px]"></i>
                        </button>
                    </div>
                </div>
                <h4 class="text-[11px] font-semibold text-slate-100 truncate pr-4">${proj.topic}</h4>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-[8px] text-slate-600">${proj.createdAt ? new Date(proj.createdAt.toDate()).toLocaleDateString() : 'Just now'}</span>
                    <i class="fas fa-chevron-right text-[8px] text-slate-700 group-hover:text-indigo-400 transition-colors"></i>
                </div>
            </div>
        `;
    }).join('');
}

function injectActionButtonsToHeader() {
    // Target the toolbar on the right side
    let actionsContainer = document.querySelector('#creative-preview-toolbar .flex.items-center.gap-2:last-child');
    if (!actionsContainer) {
        console.warn('[Creative] Actions container not found in toolbar');
        // Fallback to header
        actionsContainer = document.querySelector('#creative-modal .flex.items-center.gap-3:last-child');
    }
    if (!actionsContainer) return;

    // Remove any previously injected buttons to avoid duplicates
    actionsContainer.querySelectorAll('.btn-creative-injected').forEach(b => b.remove());

    // Create Edit Button
    const editBtn = document.createElement('button');
    editBtn.id = 'btn-creative-edit';
    editBtn.className = 'btn-creative-injected px-3 py-1.5 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded hover:bg-indigo-500/20 flex items-center gap-1.5 transition-all';
    editBtn.innerHTML = isEditMode ? '<i class="fas fa-check-circle mr-2"></i>Edit Mode: ACTIVE' : '<i class="fas fa-eye mr-2"></i>View Mode (Switch to Edit)';
    if (isEditMode) {
        editBtn.classList.remove('text-indigo-400', 'bg-indigo-500/10', 'border-indigo-500/20');
        editBtn.classList.add('text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20', 'ring-2', 'ring-emerald-500/40');
    }
    editBtn.onclick = () => toggleEditMode();

    // Setup PDF Download Button (Already in HTML, just show and fix it)
    const pdfBtn = document.getElementById('btn-creative-download-pdf');
    if (pdfBtn) {
        pdfBtn.classList.remove('hidden');
        pdfBtn.style.display = 'flex';
        pdfBtn.onclick = () => downloadCreativeAsPDF({ isPrint: false });
    }

    const printBtn = document.getElementById('btn-creative-download-print');
    if (printBtn) {
        printBtn.classList.remove('hidden');
        printBtn.style.display = 'flex';
        printBtn.onclick = () => downloadCreativeAsPDF({ isPrint: true });
    }

    // Hide the legacy download btn if redundant
    const legacyDownloadBtn = document.getElementById('btn-creative-download');
    if (legacyDownloadBtn) {
        legacyDownloadBtn.classList.add('hidden');
        legacyDownloadBtn.style.display = 'none';
    }

    // Prepend Edit to the container
    actionsContainer.prepend(editBtn);

    // Show Copy button
    const copyBtn = document.getElementById('btn-creative-copy');
    if (copyBtn) {
        copyBtn.classList.remove('hidden');
        copyBtn.style.display = 'flex';
    }
}

/**
 * Delete a creative project from Firestore
 */
async function deleteCreativeProject(docId) {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
        await db.collection('creativeProjects').doc(docId).delete();
        showNotification('Asset deleted', 'success');
    } catch (e) {
        showNotification('Failed to delete asset', 'error');
    }
}

/**
 * Setup Detailed Editing (Section refinement, Image swap)
 */
function setupDetailedEditing(iframe, docId) {
    const doc = iframe.contentDocument;
    if (!doc) return;

    // 1. Image Swap Overlays
    doc.querySelectorAll('img').forEach(img => {
        if (img.classList.contains('zynk-managed-img') || img.closest('.img-container')) return;
        img.classList.add('zynk-managed-img');

        const wrapper = doc.createElement('div');
        wrapper.className = 'relative inline-block img-container w-full h-full';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);

        const overlay = doc.createElement('div');
        overlay.className = 'img-overlay';
        overlay.innerHTML = '<div class="flex flex-col items-center gap-1"><i class="fas fa-sync-alt"></i><span class="text-[8px] font-bold uppercase tracking-widest">Swap with AI</span></div>';
        overlay.onclick = (e) => {
            e.stopPropagation();
            swapCreativeImage(docId, img);
        };
        wrapper.appendChild(overlay);
    });

    // 2. Section Refinement
    doc.querySelectorAll('section').forEach((section, idx) => {
        if (section.querySelector('.refine-btn')) return; // IDEMPOTENT Check

        section.classList.add('relative', 'group');

        const refineBtn = doc.createElement('button');
        refineBtn.className = 'refine-btn top-4 right-4 bg-indigo-600/90 hover:bg-indigo-500 text-white text-[9px] font-bold py-1.5 px-3 rounded-full flex items-center shadow-2xl transition-all hover:scale-105';
        refineBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles mr-2"></i>Refine Section';
        refineBtn.onclick = (e) => {
            e.stopPropagation();
            refineCreativeSection(docId, idx, section);
        };
        section.appendChild(refineBtn);
    });
}

/**
 * Sync updated HTML from iframe back to Firestore
 */
async function syncCreativeChanges(docId) {
    const targetId = docId || currentCreativeId;
    if (!targetId) return;

    const iframe = document.getElementById('creative-result-iframe');
    const resultContainer = document.getElementById('creative-result-container');

    let updatedHtml = '';

    if (iframe && iframe.contentDocument) {
        // Clone and clean for storage (remove UI buttons before saving)
        const docClone = iframe.contentDocument.documentElement.cloneNode(true);
        docClone.querySelectorAll('.refine-btn, .img-overlay').forEach(el => el.remove());
        updatedHtml = docClone.querySelector('body').innerHTML.trim();
    } else if (resultContainer) {
        const prose = resultContainer.querySelector('.prose');
        if (prose) updatedHtml = prose.innerHTML.trim();
    }

    if (!updatedHtml) return;

    try {
        await db.collection('creativeProjects').doc(targetId).update({
            htmlContent: updatedHtml,
            lastModified: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('[Creative] Changes synced to Cloud for:', targetId);
    } catch (e) {
        console.error('Failed to sync changes:', e);
    }
}

/**
 * Refine a specific section using AI (Enhanced UX with Palette)
 */
async function refineCreativeSection(docId, sectionIdx, sectionEl) {
    // SECURITY/UX Check: Ensure Edit Mode is active
    if (!isEditMode) {
        showNotification('Please activate Edit Mode to refine content.', 'warning');
        const editBtn = document.getElementById('btn-creative-edit');
        if (editBtn) {
            editBtn.classList.add('animate-bounce');
            setTimeout(() => editBtn.classList.remove('animate-bounce'), 2000);
        }
        return;
    }

    // Save state and open palette
    currentRefineState = { docId: docId, index: sectionIdx, element: sectionEl };
    openRefinePalette();
}

/**
 * Palette UI Controllers
 */
function openRefinePalette() {
    const palette = document.getElementById('zync-refine-palette');
    const card = document.getElementById('refine-palette-card');
    const input = document.getElementById('refine-instruction');

    if (input) input.value = '';
    palette.classList.remove('hidden');
    setTimeout(() => card.classList.remove('scale-95'), 10);
}

function closeRefinePalette() {
    const palette = document.getElementById('zync-refine-palette');
    const card = document.getElementById('refine-palette-card');
    card.classList.add('scale-95');
    setTimeout(() => palette.classList.add('hidden'), 200);
}

function applyRefinePreset(text) {
    const input = document.getElementById('refine-instruction');
    if (input) {
        input.value = text;
        input.focus();
    }
}

async function submitRefinePalette() {
    const { docId, index, element } = currentRefineState;
    const instruction = document.getElementById('refine-instruction').value;
    const submitBtn = event.currentTarget.closest('button') || document.querySelector('#zync-refine-palette button[onclick="submitRefinePalette()"]');

    if (!instruction) return;

    // 1. Button Loading State
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> PROCESSING...';

    // 2. Prepare Overlay in IFRAME's document
    const iframeDoc = element.ownerDocument;
    const loadingOverlay = iframeDoc.createElement('div');
    loadingOverlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        z-index: 5000; color: white; border-radius: inherit;
        animation: fadeIn 0.4s ease-out; pointer-events: all;
    `;
    loadingOverlay.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 40px; margin-bottom: 15px; color: #6366f1;">
                <i class="fas fa-wand-magic-sparkles fa-pulse"></i>
            </div>
            <div style="font-family: sans-serif; font-weight: 800; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">
                Zync AI is Refining...
            </div>
            <div style="font-family: sans-serif; font-size: 10px; color: #94a3b8; margin-top: 8px;">
                Updating section design and content
            </div>
        </div>
    `;

    // Ensure parent is relative
    element.style.position = 'relative';
    element.appendChild(loadingOverlay);

    // 3. Show Refinement Log at the bottom
    renderLogWindow('AI Refinement Log');
    addLog('Starting refinement workspace...', 'info');
    addLog('Analyzing section structure and assets...', 'info');

    // Briefly show button loading before closing palette
    setTimeout(() => {
        closeRefinePalette();
        showNotification('AI Refinement started...', 'info');
    }, 500);

    // CLEAN CONTENT FOR AI
    const sectionClone = element.cloneNode(true);
    sectionClone.querySelectorAll('.refine-btn, .img-overlay, div[style*="z-index"]').forEach(el => el.remove());
    const cleanHTML = sectionClone.innerHTML;

    try {
        addLog('Calling Elite AI Refinement agent (Gemini Pro)...', 'info');
        const refineFn = firebase.app().functions('us-central1').httpsCallable('refineCreativeContent');
        const result = await refineFn({
            projectId: docId,
            sectionIndex: index,
            instruction: instruction,
            currentContent: cleanHTML
        });

        if (result.data && result.data.newHtml) {
            addLog('AI response received. Processing layout updates...', 'success');
            let rawHtml = result.data.newHtml.replace(/```html|```/gi, '').trim();
            element.innerHTML = rawHtml;
            addLog('Section updated successfully in preview.', 'success');
            showNotification('Section updated successfully!', 'success');

            addLog('Syncing changes to Firestore...', 'info');
            const iframe = document.getElementById('creative-result-iframe');
            if (iframe) setupDetailedEditing(iframe, docId);
            await syncCreativeChanges(docId);
            addLog('All changes persisted safely.', 'success');

            // Hide log window after a short delay
            setTimeout(() => {
                const logContainer = document.getElementById('generation-log-container');
                if (logContainer) logContainer.style.display = 'none';
            }, 5000);
        }
    } catch (error) {
        addLog(`Refinement failed: ${error.message}`, 'error');
        showNotification('Refinement failed: ' + error.message, 'error');
    } finally {
        if (loadingOverlay) loadingOverlay.remove();
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
    }
}

/**
 * Swap or Refine Image with AI (Enhanced UX)
 */
async function swapCreativeImage(docId, imgEl) {
    // SECURITY/UX Check: Ensure Edit Mode is active
    if (!isEditMode) {
        showNotification('Please activate Edit Mode to change images.', 'warning');
        const editBtn = document.getElementById('btn-creative-edit');
        if (editBtn) {
            editBtn.classList.add('animate-bounce');
            setTimeout(() => editBtn.classList.remove('animate-bounce'), 2000);
        }
        return;
    }

    const promptText = prompt('Describe the new image for this spot:');
    if (promptText === null) return;

    showNotification('Generating new visual...', 'info');
    imgEl.classList.add('animate-pulse', 'brightness-50');

    try {
        const swapFn = firebase.app().functions('us-central1').httpsCallable('refreshCreativeImage');
        const result = await swapFn({
            projectId: docId,
            prompt: promptText,
            currentUrl: imgEl.src
        });

        if (result.data && result.data.imageUrl) {
            imgEl.src = result.data.imageUrl;
            showNotification('Image updated!', 'success');

            // AUTO-SAVE
            await syncCreativeChanges(docId);
        }
    } catch (error) {
        showNotification('Image swap failed.', 'error');
    } finally {
        imgEl.classList.remove('animate-pulse', 'brightness-50');
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

// ============================================================
// Z-EDITOR (PROFESSIONAL AI CREATIVE EDITOR)
// ============================================================

let zActiveSelectionRange = null;

function initZEditor(iframe) {
    const doc = iframe.contentDocument;
    if (!doc) return;

    console.log('[Z-Editor] Initializing on iframe...');

    // Inject Selection/Highlight CSS
    const highlightCss = `
        .z-editing-target {
            outline: 4px solid #6366f1 !important;
            outline-offset: 4px !important;
            transition: outline 0.3s ease !important;
            box-shadow: 0 0 20px rgba(99,102,241,0.4) !important;
        }
    `;
    const styleTag = doc.createElement('style');
    styleTag.textContent = highlightCss;
    doc.head.appendChild(styleTag);

    // Intercept Right Click
    doc.addEventListener('contextmenu', (e) => {
        // Prevent default browser menu
        e.preventDefault();

        // Capture context
        zActiveTarget = e.target;
        zActiveSelection = doc.getSelection() ? doc.getSelection().toString() : "";

        // Handle coordinates (adjusted for iframe position)
        const rect = iframe.getBoundingClientRect();
        const x = e.clientX + rect.left;
        const y = e.clientY + rect.top;

        showZContextMenu(x, y);
    });

    // Dismiss menu on click
    doc.addEventListener('mousedown', () => {
        hideZContextMenu();
        hideZStyleBar();
    });

    // Handle Selection for Style Bar
    doc.addEventListener('mouseup', () => {
        const sel = doc.getSelection();
        if (sel && sel.toString().trim().length > 0) {
            const range = sel.getRangeAt(0);
            zActiveSelectionRange = range;

            const rects = range.getClientRects();
            if (rects.length > 0) {
                const rect = rects[0];
                const iframeRect = iframe.getBoundingClientRect();

                // Position above selection
                const x = (rect.left + rect.right) / 2 + iframeRect.left;
                const y = rect.top + iframeRect.top - 50;

                showZStyleBar(x, y);
            }
        } else {
            hideZStyleBar();
        }
    });

    // ESC to hide all
    doc.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideZContextMenu();
            hideZStyleBar();
            closeZCommandBar();
        }
    });
}

function showZContextMenu(x, y) {
    const menu = document.getElementById('z-context-menu');
    if (!menu) return;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';
}

function hideZContextMenu() {
    const menu = document.getElementById('z-context-menu');
    if (menu) menu.style.display = 'none';
}

/**
 * Style Bar UI
 */
function showZStyleBar(x, y) {
    const bar = document.getElementById('z-style-bar');
    if (!bar) return;

    // Ensure it stays within viewport
    const safeX = Math.max(10, Math.min(window.innerWidth - 300, x - 150));
    const safeY = Math.max(80, y);

    bar.style.left = `${safeX}px`;
    bar.style.top = `${safeY}px`;
    bar.style.display = 'flex';
}

function hideZStyleBar() {
    const bar = document.getElementById('z-style-bar');
    if (bar) bar.style.display = 'none';
}

/**
 * Formatting Operations
 */
window.applyZStyle = function (command, value = null) {
    const iframe = document.getElementById('creative-result-iframe');
    if (!iframe) return;

    iframe.contentWindow.document.execCommand(command, false, value);
    iframe.contentWindow.focus();
    syncCreativeChanges(currentCreativeId);
};

window.applyZColor = function (color) {
    const iframe = document.getElementById('creative-result-iframe');
    if (!iframe) return;
    iframe.contentWindow.document.execCommand('foreColor', false, color);
    iframe.contentWindow.focus();
    syncCreativeChanges(currentCreativeId);
};

window.applyZAlign = function (align) {
    const iframe = document.getElementById('creative-result-iframe');
    const doc = iframe.contentWindow.document;
    const sel = doc.getSelection();
    if (!sel.rangeCount) return;

    // Find nearest block parent
    let node = sel.anchorNode;
    if (node.nodeType === 3) node = node.parentElement;

    const blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'section', 'li'];
    let target = node;
    while (target && !blockTags.includes(target.tagName.toLowerCase())) {
        target = target.parentElement;
    }

    if (target) {
        target.style.textAlign = align;
        target.style.display = 'block'; // Ensure it's a block for alignment to work
        iframe.contentWindow.focus();
        syncCreativeChanges(currentCreativeId);
    }
};

window.applyFontSize = function (dir) {
    const iframe = document.getElementById('creative-result-iframe');
    if (!iframe) return;
    const win = iframe.contentWindow;
    const doc = win.document;
    const sel = win.getSelection();

    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    // Detect current size from selection
    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentElement;

    let currentSize = 16;
    try {
        currentSize = parseInt(win.getComputedStyle(node).fontSize) || 16;
    } catch (e) { }

    let newSize = dir === 'increase' ? currentSize + 2 : currentSize - 2;
    newSize = Math.max(8, Math.min(120, newSize));

    // Force styleWithCSS to false to get predictable <font> tags for marking
    doc.execCommand('styleWithCSS', false, false);
    doc.execCommand('fontSize', false, '7');

    // Find all potential markers created by execCommand
    const fonts = doc.querySelectorAll('font[size="7"]');
    if (fonts.length > 0) {
        fonts.forEach(f => {
            f.removeAttribute('size');
            f.style.fontSize = `${newSize}px`;
            f.style.display = 'inline-block';
        });
    } else {
        // Fallback: If styleWithCSS was somehow true or browser preferred span
        const allSpans = doc.querySelectorAll('span');
        allSpans.forEach(s => {
            const fs = s.style.fontSize;
            if (fs === 'xxx-large' || fs === '36px' || fs === '48px') {
                s.style.fontSize = `${newSize}px`;
            }
        });
    }

    // Restore focus to keep selection active
    win.focus();
    syncCreativeChanges(currentCreativeId);
};

window.syncZGradient = function () {
    const c1 = document.getElementById('z-style-color-1').value;
    const c2 = document.getElementById('z-style-color-2').value;
    const angle = document.getElementById('z-gradient-angle').value;
    document.getElementById('z-gradient-angle-text').textContent = `${angle}°`;

    applyZGradient(c1, c2, angle);
};

window.applyZGradient = function (c1, c2, angle) {
    const iframe = document.getElementById('creative-result-iframe');
    const doc = iframe.contentWindow.document;
    const sel = doc.getSelection();
    if (!sel || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === 3) parent = parent.parentElement;

    // PERFORMANCE/COMPAT: If colors are the same, use standard text color
    const isSolid = (c1.toLowerCase() === c2.toLowerCase());

    if (isSolid) {
        if (parent.tagName === 'SPAN' && parent.classList.contains('z-gradient-text')) {
            parent.style.backgroundImage = 'none';
            parent.style.webkitBackgroundClip = 'initial';
            parent.style.webkitTextFillColor = 'initial';
            parent.style.color = c1;
            parent.classList.remove('z-gradient-text');
        } else {
            doc.execCommand('foreColor', false, c1);
        }
    } else {
        const gradientCss = `linear-gradient(${angle}deg, ${c1}, ${c2})`;

        if (parent.tagName === 'SPAN' && parent.classList.contains('z-gradient-text')) {
            parent.style.backgroundImage = gradientCss;
        } else {
            const span = document.createElement('span');
            span.className = 'z-gradient-text';
            span.style.cssText = `
                background-image: ${gradientCss};
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                display: inline-block;
                transition: all 0.2s;
            `;
            try {
                range.surroundContents(span);
            } catch (e) {
                doc.execCommand('foreColor', false, c1); // Fallback if surround fails
            }
        }
    }

    iframe.contentWindow.focus();
    syncCreativeChanges(currentCreativeId);
};

/**
 * Handle Menu Operations
 */
function handleZMenu(action) {
    hideZContextMenu();
    if (!zActiveTarget) return;

    // SECURITY/UX Check: Ensure Edit Mode is active for all AI operations
    if (!isEditMode && action !== 'delete') {
        showNotification('Please activate Edit Mode to use AI tools.', 'warning');
        const editBtn = document.getElementById('btn-creative-edit');
        if (editBtn) {
            editBtn.classList.add('animate-bounce');
            setTimeout(() => editBtn.classList.remove('animate-bounce'), 2000);
        }
        return;
    }

    switch (action) {
        case 'refine-content':
            openZCommandBar('refine');
            break;
        case 'change-layout':
            openZCommandBar('layout');
            break;
        case 'style-lab':
            openZCommandBar('style');
            break;
        case 'delete':
            if (confirm('Are you sure you want to remove this element?')) {
                zActiveTarget.remove();
                syncCreativeChanges(currentCreativeId);
            }
            break;
    }
}

function openZCommandBar(mode = 'refine') {
    const bar = document.getElementById('z-command-bar');
    const title = document.getElementById('z-command-title');
    const targetDisplay = document.getElementById('z-target-display');
    const preview = document.getElementById('z-target-text-preview');
    const input = document.getElementById('z-ai-instruction');
    const localeDisplay = document.querySelector('#z-command-bar span.italic');

    if (!zActiveTarget) return;

    // Remove highlight from previous target if any
    const iframe = document.getElementById('creative-result-iframe');
    if (iframe && iframe.contentDocument) {
        iframe.contentDocument.querySelectorAll('.z-editing-target').forEach(el => el.classList.remove('z-editing-target'));
    }

    // Add Highlight to current target
    zActiveTarget.classList.add('z-editing-target');

    // Identify target type with Human-friendly labels
    const tagLabels = {
        'h1': 'Main Headline',
        'h2': 'Sub-Headline',
        'h3': 'Heading',
        'p': 'Text Paragraph',
        'img': 'Image / Photo',
        'button': 'Call to Action Button',
        'a': 'Link / Button',
        'section': 'Full Section Block',
        'li': 'List Item',
        'span': 'Text Fragment'
    };

    const tagName = zActiveTarget.tagName.toLowerCase();
    const label = tagLabels[tagName] || tagName.toUpperCase();

    // Add hierarchical context (Section #)
    let sectionInfo = "";
    const section = zActiveTarget.closest('section');
    if (section) {
        const sections = Array.from(zActiveTarget.ownerDocument.querySelectorAll('section'));
        const index = sections.indexOf(section) + 1;
        sectionInfo = ` in Section #${index}`;
    }

    targetDisplay.innerHTML = `<span class="text-indigo-400 font-black mr-2">${label}</span> <span class="text-slate-500 text-[9px]">${sectionInfo}</span>`;

    // Configure UI based on Mode
    if (mode === 'layout') {
        title.innerHTML = '<i class="fas fa-th-large text-emerald-400"></i> Change Layout';
        input.placeholder = "e.g., 'Make it 3 columns', 'Center-align this block', 'Add more padding around this'...";
        if (localeDisplay) localeDisplay.textContent = "AI LAYOUT AGENT (Global Standard)";
    } else if (mode === 'style') {
        title.innerHTML = '<i class="fas fa-palette text-rose-400"></i> Style Lab (CSS)';
        input.placeholder = "e.g., 'Make it neon purple', 'Add a glassmorphism effect', 'Make the font bold and larger'...";
        if (localeDisplay) localeDisplay.textContent = "AI STYLE DESIGNER (Premium CSS)";
    } else {
        title.innerHTML = '<i class="fas fa-wand-magic-sparkles text-indigo-400"></i> AI Command Center';
        input.placeholder = "e.g., '전문 용어를 섞어서 정중한 문체로 바꿔줘', '이미지를 좀 더 화사하고 3D 느낌나게 수정해줘'";
        if (localeDisplay) localeDisplay.textContent = "AI INSTRUCTIONS (Multilingual)";
    }

    // Provide preview
    if (tagName === 'img') {
        preview.innerHTML = `<div class="flex justify-center p-2"><img src="${zActiveTarget.src}" class="max-h-24 w-auto rounded-lg shadow-lg border border-slate-700"></div>`;
    } else {
        const fullText = zActiveTarget.innerText;
        const previewText = zActiveSelection || (fullText.length > 200 ? fullText.substring(0, 197) + '...' : fullText);
        preview.textContent = `"${previewText}"`;
    }

    bar.style.display = 'block';

    // Auto-scroll the iframe to make target visible if needed
    zActiveTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });

    input.focus();
}

function closeZCommandBar() {
    // Remove highlights on close
    const iframe = document.getElementById('creative-result-iframe');
    if (iframe && iframe.contentDocument) {
        iframe.contentDocument.querySelectorAll('.z-editing-target').forEach(el => el.classList.remove('z-editing-target'));
    }
    document.getElementById('z-command-bar').style.display = 'none';
}

/**
 * Execute AI Refinement via Z-Editor
 */
async function executeAIRefine() {
    if (!zActiveTarget || !currentCreativeId) return;

    const instruction = document.getElementById('z-ai-instruction').value.trim();
    if (!instruction) {
        showNotification('Please enter AI instructions.', 'warning');
        return;
    }

    showNotification('AI Refinement in progress...', 'info');
    zActiveTarget.classList.add('animate-pulse', 'brightness-50');
    closeZCommandBar();

    const isImage = zActiveTarget.tagName.toLowerCase() === 'img';

    try {
        if (isImage) {
            const swapFn = firebase.app().functions('us-central1').httpsCallable('refreshCreativeImage');
            const result = await swapFn({
                projectId: currentCreativeId,
                prompt: instruction,
                currentUrl: zActiveTarget.src
            });
            if (result.data?.imageUrl) {
                zActiveTarget.src = result.data.imageUrl;
                showNotification('Image refined by AI!', 'success');
            }
        } else {
            const refineFn = firebase.app().functions('us-central1').httpsCallable('refineCreativeContent');
            const result = await refineFn({
                projectId: currentCreativeId,
                instruction: instruction,
                targetText: zActiveSelection || null, // Specific phrase selection support
                currentContent: zActiveTarget.innerHTML,
                isPartial: !!zActiveSelection
            });

            if (result.data?.newHtml) {
                if (zActiveSelection) {
                    // Precise replacement logic
                    zActiveTarget.innerHTML = zActiveTarget.innerHTML.replace(zActiveSelection, result.data.newHtml);
                } else {
                    zActiveTarget.innerHTML = result.data.newHtml;
                }
                showNotification('Content updated successfully!', 'success');
            }
        }

        // Persistence
        await syncCreativeChanges(currentCreativeId);

    } catch (error) {
        console.error('[Z-Editor] AI Error:', error);
        showNotification('AI Refinement failed: ' + error.message, 'error');
    } finally {
        zActiveTarget.classList.remove('animate-pulse', 'brightness-50');
        document.getElementById('z-ai-instruction').value = ""; // Clear
    }
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
        </div >
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
    console.log(`[PlanModal] Switching to step: ${step}`);
    const steps = ['options', 'generating', 'result'];
    steps.forEach(s => {
        const el = document.getElementById(`plan-step-${s}`);
        if (el) el.classList.add('hidden');
        else console.warn(`[PlanModal] Element not found: plan-step-${s}`);
    });

    const target = document.getElementById(`plan-step-${step}`);
    if (target) {
        target.classList.remove('hidden');
    } else {
        console.error(`[PlanModal] Target step element not found: plan-step-${step}`);
    }

    // Update footer visibility
    const footer = document.getElementById('plan-modal-footer');
    if (footer) {
        if (step === 'generating') footer.classList.add('hidden');
        else footer.classList.remove('hidden');
    } else {
        console.warn(`[PlanModal] Footer element not found: plan-modal-footer`);
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

// Note: downloadCreativeAsPDF is defined earlier (around line 4289) with full implementation

/**
 * Render creative text/HTML result
 */
function renderCreativeResult(type, content) {
    const container = document.getElementById('creative-result-container');

    // Clean up content - remove markdown code blocks if present
    let cleanContent = content;
    if (typeof content === 'string') {
        cleanContent = content.replace(/```html ?\n ? /gi, '').replace(/```\n?/g, '');
    }

    container.innerHTML = `
        <div class="w-full h-full overflow-y-auto bg-white text-slate-800 rounded-lg">
            <div class="prose max-w-none p-6">
                ${cleanContent}
            </div>
        </div >
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
        let sysPrompt = `You are an expert content strategist.Create a detailed ${currentPlan.name} based on the provided brand sources.`;
        let usrPrompt = `Generate a ${currentPlan.name} (${currentPlan.category}).

    Context / Instructions:
${document.getElementById('plan-instructions').value}

Target Language: ${targetLanguage === 'ko' ? 'Korean' : 'English'}

    Sources:
${activeSources.map(s => `- ${s.title}`).join('\n')} `;

        // Special handling for Brand Mind Map
        if (currentPlan.type === 'brand_mind_map') {
            sysPrompt = `You are an expert brand strategist.Your goal is to provide a comprehensive brand analysis.
You must output TWO distinct parts in your response:
    1. A readable Markdown text report for the user.
2. A raw JSON code block for the system to render a Mind Map.`;

            usrPrompt += `\n\nOUTPUT FORMAT INSTRUCTIONS(Strictly Follow):
    --------------------------------------------------
        PART 1: TEXT REPORT(Markdown)
Write a detailed, structured analysis.Use H1 for Title, H2 for Sections, and bullet points.
        Cover: Executive Summary, Core Identity, Target Audience, Positioning, etc.
(Make this easy to read for a human)

PART 2: VISUALIZATION DATA(Hidden JSON)
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
        const routeLLM = firebase.app().functions('us-central1').httpsCallable('routeLLM');
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

            // NEW: Auto-save to Firestore if category is 'quick'
            if (currentPlan.category === 'quick') {
                savePlanToFirestore();
            }
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
// UI PANEL / TAB LOGIC
// ============================================================
// Function togglePanel removed as it's replaced by widening expansion

function switchAssetTab(tab) {
    const isPlans = tab === 'plans';
    const plansBtn = document.getElementById('tab-plans');
    const studioBtn = document.getElementById('tab-studio');
    const plansContainer = document.getElementById('asset-container-plans');
    const studioContainer = document.getElementById('asset-container-studio');

    if (!plansBtn || !studioBtn) return;

    if (isPlans) {
        plansBtn.classList.add('active');
        plansBtn.classList.remove('opacity-50');
        studioBtn.classList.remove('active');
        studioBtn.classList.add('opacity-50');
        plansContainer.classList.remove('hidden');
        studioContainer.classList.add('hidden');
    } else {
        studioBtn.classList.add('active');
        studioBtn.classList.remove('opacity-50');
        plansBtn.classList.remove('active');
        plansBtn.classList.add('opacity-50');
        studioContainer.classList.remove('hidden');
        plansContainer.classList.add('hidden');
    }
}

function selectVisualOption(el, inputId) {
    const parent = el.parentElement;
    // Unselect others
    parent.querySelectorAll('.visual-option').forEach(opt => {
        opt.classList.remove('selected', 'ring-2', 'ring-indigo-500', 'bg-indigo-500/10');
        opt.querySelector('.check-mark')?.classList.add('opacity-0');
    });
    // Select current
    el.classList.add('selected', 'ring-2', 'ring-indigo-500', 'bg-indigo-500/10');
    el.querySelector('.check-mark')?.classList.remove('opacity-0');

    // Update hidden input
    const input = document.getElementById(inputId);
    if (input) {
        input.value = el.dataset.value;
        console.log(`[UI] Visual Style selected: ${input.value}`);
    }
}

/**
 * Handle News Type Change - Show/Hide conditional fields
 */
function handleNewsTypeChange(selectElement) {
    const selectedValue = selectElement.value;
    console.log(`[PR] News type changed to: ${selectedValue}`);

    // Find all conditional controls
    const controls = document.querySelectorAll('.conditional-control[data-conditional-field]');
    controls.forEach(control => {
        const requiredField = control.dataset.conditionalField;
        const requiredValue = control.dataset.conditionalValue;

        if (requiredField === 'newsType') {
            if (selectedValue === requiredValue) {
                control.style.display = '';
                control.classList.add('animate-fade-in');
            } else {
                control.style.display = 'none';
            }
        }
    });
}

/**
 * Handle file upload for Creative Studio controls
 */
let uploadedExecutivePhotoUrl = null;

async function handleCreativeFileUpload(inputElement, fieldId) {
    const file = inputElement.files[0];
    if (!file) return;

    const previewContainer = document.getElementById(`${fieldId}-preview`);
    const filenameSpan = document.getElementById(`${fieldId}-filename`);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
        previewContainer.classList.remove('hidden');
        previewContainer.querySelector('img').src = e.target.result;
        filenameSpan.textContent = file.name;
    };
    reader.readAsDataURL(file);

    // Upload to Firebase Storage
    try {
        showNotification('Uploading photo...', 'info');
        const storageRef = firebase.storage().ref();
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const filePath = `creative-uploads/${currentProjectId || 'temp'}/${fieldId}_${timestamp}.${ext}`;
        const uploadRef = storageRef.child(filePath);

        await uploadRef.put(file);
        uploadedExecutivePhotoUrl = await uploadRef.getDownloadURL();

        console.log(`[PR] Executive photo uploaded: ${uploadedExecutivePhotoUrl}`);
        showNotification('Photo uploaded successfully!', 'success');
    } catch (error) {
        console.error('[PR] Photo upload failed:', error);
        showNotification('Photo upload failed: ' + error.message, 'error');
        uploadedExecutivePhotoUrl = null;
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

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64, mimeType = 'application/octet-stream') {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
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
        const generateImageFn = firebase.app().functions('us-central1').httpsCallable('generateImage');
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
// PROGRESS BAR UI
// ============================================================
let progressInterval = null;
let currentProgress = 0;

function startProgressBar(proj = null) {
    currentProgress = 0;

    // Resume logic: If project exists and has been running, jump progress
    if (proj && proj.createdAt) {
        const startTime = proj.createdAt.toDate ? proj.createdAt.toDate().getTime() : proj.createdAt;
        const elapsedSec = (Date.now() - startTime) / 1000;
        if (elapsedSec > 5) {
            currentProgress = Math.min(85, Math.floor(elapsedSec * 1.5)); // heuristic: 1.5% per second up to 85%
        }
    }

    // Create progress bar if not exists
    const container = document.getElementById('creative-preview-column');
    if (!container) return;

    let progressContainer = document.getElementById('generation-progress-container');
    if (!progressContainer) {
        const progressHtml = `
            <div id="generation-progress-container" class="absolute bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700 p-5 z-30 shadow-2xl animate-fade-in-up">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span class="text-sm text-white font-semibold">Generating Creative...</span>
                    </div>
                    <span id="progress-percentage" class="text-xs text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">0%</span>
                </div>
                <div class="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden border border-slate-700/50">
                    <div id="progress-bar" class="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out" style="width: 0%"></div>
                </div>
                <div id="progress-step" class="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                    <span class="step-text">Initializing workspace...</span>
                    <span class="text-slate-600">Please wait</span>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', progressHtml);
    }

    document.getElementById('generation-progress-container').style.display = 'block';

    // Simulate progress (0-90% over ~2 minutes, leaving 10% for completion)
    const steps = [
        { percent: 10, msg: 'Initializing agent...', duration: 2000 },
        { percent: 20, msg: 'Reading Knowledge Hub context...', duration: 3000 },
        { percent: 35, msg: 'Generating AI images with Vertex AI...', duration: 15000 },
        { percent: 55, msg: 'Building HTML structure...', duration: 10000 },
        { percent: 70, msg: 'Applying styling and animations...', duration: 30000 },
        { percent: 85, msg: 'Finalizing document...', duration: 60000 },
        { percent: 90, msg: 'Almost there...', duration: 30000 }
    ];

    let stepIndex = 0;

    function runStep() {
        if (stepIndex >= steps.length) return;

        const step = steps[stepIndex];
        animateProgress(currentProgress, step.percent, step.duration);
        updateProgressStep(step.msg);

        stepIndex++;
        setTimeout(runStep, step.duration);
    }

    runStep();
}

function animateProgress(from, to, duration) {
    const progressBar = document.getElementById('progress-bar');
    const percentText = document.getElementById('progress-percentage');
    if (!progressBar || !percentText) return;

    const startTime = Date.now();
    const increment = to - from;

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = from + (increment * progress);

        progressBar.style.width = `${current}%`;
        percentText.textContent = `${Math.round(current)}%`;
        currentProgress = current;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

function updateProgressStep(message) {
    const stepEl = document.getElementById('progress-step');
    if (stepEl) {
        const textEl = stepEl.querySelector('.step-text');
        if (textEl) textEl.textContent = message;
        else stepEl.textContent = message;
    }
    addLog(message, 'info');
}

function stopProgressBar(finalPercent = 100) {
    const progressBar = document.getElementById('progress-bar');
    const percentText = document.getElementById('progress-percentage');
    const stepEl = document.getElementById('progress-step');

    if (progressBar) progressBar.style.width = `${finalPercent}%`;
    if (percentText) percentText.textContent = `${finalPercent}%`;
    if (stepEl) {
        const textEl = stepEl.querySelector('.step-text');
        const msg = finalPercent === 100 ? 'Complete!' : 'Failed';
        if (textEl) textEl.textContent = msg;
        else stepEl.textContent = msg;
    }

    addLog(finalPercent === 100 ? 'Generation complete!' : 'Generation failed', finalPercent === 100 ? 'success' : 'error');

    // Hide after 2 seconds on success
    if (finalPercent === 100) {
        setTimeout(() => {
            const container = document.getElementById('generation-progress-container');
            if (container) container.style.display = 'none';
        }, 2000);
    }
}

// ============================================================
// REAL-TIME LOG UI
// ============================================================
function renderLogWindow(title = 'Generation Log') {
    // Append to the modal itself (not the preview panel) so it's at the absolute bottom
    const modal = document.getElementById('creative-modal');
    if (!modal) return;

    // Create log container if not exists
    let logContainer = document.getElementById('generation-log-container');
    if (!logContainer) {
        const logHtml = `
            <div id="generation-log-container" class="absolute bottom-4 left-4 right-4 bg-slate-950/98 backdrop-blur-md rounded-lg border border-slate-700 p-3 font-mono text-xs text-slate-400 max-h-40 overflow-y-auto z-50 shadow-2xl ring-1 ring-white/10">
                <div class="flex items-center gap-2 mb-2 border-b border-slate-700 pb-1 sticky top-0 bg-slate-950/95">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span id="generation-log-title" class="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">${title}</span>
                </div>
                <div id="generation-logs" class="space-y-0.5"></div>
            </div>
        `;
        modal.insertAdjacentHTML('beforeend', logHtml);
    } else {
        const titleEl = document.getElementById('generation-log-title');
        if (titleEl) titleEl.textContent = title;
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
        const getUserCredits = firebase.app().functions('us-central1').httpsCallable('getUserCredits');
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
        const deductCredits = firebase.app().functions('us-central1').httpsCallable('deductCredits');
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
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400"><circle cx="12" cy="12" r="8"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
    } else if (reason === 'daily_limit') {
        title = 'Daily Limit Reached';
        message = `You've used ${userCredits.creditsUsedToday}/${userCredits.dailyLimit} credits today. Upgrade for higher limits.`;
        icon = '⏰';
    } else {
        title = 'Upgrade Required';
        message = 'This feature requires a higher plan.';
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M11 3 8 9l3 12 3-12-3-6Z"/><path d="M2 9h20"/></svg>`;
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
                All Contents
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

        // 1. Fetch contentPlans
        let plansQuery = db.collection('projects').doc(currentProjectId)
            .collection('contentPlans');
        if (historyFilter) {
            plansQuery = plansQuery.where('type', '==', historyFilter);
        }
        const plansSnapshot = await plansQuery.limit(50).get();
        const plansData = plansSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            collection: 'contentPlans'
        }));

        // 2. Fetch creativeProjects
        let creativeData = [];
        const isCreateCategory = !historyFilter || (PLAN_DEFINITIONS[historyFilter]?.category === 'create');

        if (isCreateCategory) {
            let creativeQuery = db.collection('creativeProjects')
                .where('mainProjectId', '==', currentProjectId)
                .where('userId', '==', currentUser.uid);

            if (historyFilter && historyFilter !== null) {
                creativeQuery = creativeQuery.where('type', '==', historyFilter);
            }

            const creativeSnapshot = await creativeQuery.limit(50).get();
            creativeData = creativeSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                collection: 'creativeProjects',
                isCreative: true
            }));
        }

        // Combine
        historyDocs = [...plansData, ...creativeData]
            .sort((a, b) => {
                const getTs = (val) => {
                    if (!val) return 0;
                    if (val.toMillis) return val.toMillis();
                    if (val instanceof Date) return val.getTime();
                    return new Date(val).getTime();
                };
                return getTs(b.createdAt) - getTs(a.createdAt);
            });

        if (historyDocs.length === 0) {
            list.innerHTML = '<div class="text-center py-10 text-slate-500">No saved contents found.</div>';
            return;
        }

        list.innerHTML = historyDocs.map((plan, index) => {
            // Handle legacy field names
            const pType = plan.type || plan.planType;
            const pName = plan.title || plan.topic || plan.planName || 'Untitled';

            const planDef = PLAN_DEFINITIONS[pType] || { name: pType };
            const langLabel = plan.language === 'ko' ? '🇰🇷 Korean' : plan.language === 'ja' ? '🇯🇵 Japanese' : '🇺🇸 English';
            const dateStr = plan.createdAt?.toDate ? formatRelativeTime(plan.createdAt.toDate()) : 'Recently';

            let contentPreview = '';
            if (plan.isCreative) {
                contentPreview = `Studio generated ${planDef.name || 'document'}`;
            } else {
                contentPreview = plan.content ? (typeof plan.content === 'string' ? plan.content.substring(0, 150) + '...' : JSON.stringify(plan.content).substring(0, 150) + '...') : 'No content';
            }

            const versionBadges = plan.version ? `<span class="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono ml-2">${plan.version}</span>` : '';

            return `
                <div class="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer group"
                    onclick="openHistoryPlan(${index})">
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center">
                            <span class="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">${escapeHtml(pName)} ${plan.isCreative ? '<i class="fas fa-wand-magic-sparkles text-[10px] ml-2 text-indigo-400"></i>' : ''}</span>
                            ${versionBadges}
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-slate-500">${dateStr}</span>
                            <button onclick="deletePlan(event, '${plan.id}'); setTimeout(loadHistoryItems, 500);" 
                                class="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors" 
                                title="Delete Content">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-slate-400 mb-2">
                        <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-500">${planDef.name || pType}</span>
                        ${!plan.isCreative ? `<span>${langLabel}</span>` : ''}
                         <span>${plan.creditsUsed || plan.credits || 0} cr</span>
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
        if (plan.isCreative) {
            viewCreativeProject(plan.id);
        } else {
            viewSavedPlan(plan.id, plan);
        }
        closeHistoryModal(); // Stack modal behavior: close history, open plan
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
    if (event) event.stopPropagation();

    if (!confirm("Are you sure you want to delete this item?\n\nThis action cannot be undone.")) {
        return;
    }

    try {
        if (!currentProjectId) throw new Error("No project selected");

        // Unified delete: check which collection the item belongs to
        const item = historyDocs.find(p => p.id === planId) || { id: planId };

        if (item.collection === 'creativeProjects' || item.isCreative) {
            await firebase.firestore().collection('creativeProjects').doc(planId).delete();
        } else {
            await firebase.firestore()
                .collection('projects')
                .doc(currentProjectId)
                .collection('contentPlans')
                .doc(planId)
                .delete();
        }

        showNotification("Deleted successfully", "success");
        loadSavedPlans(); // Refresh dashboard list if needed
    } catch (e) {
        console.error("Error deleting content:", e);
        showNotification("Failed to delete: " + e.message, "error");
    }
};
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

/**
 * Viewport & Workspace Controls
 */

window.setCreativeViewport = function (type) {
    const container = document.getElementById('creative-result-container');
    const sizeIndicator = document.getElementById('current-viewport-size');
    const btns = document.querySelectorAll('.viewport-btn');

    currentViewportType = type;

    // UI Update
    btns.forEach(b => {
        b.classList.remove('bg-indigo-500', 'text-white');
        b.classList.add('text-slate-400');
    });
    const activeBtn = Array.from(btns).find(b => b.title.toLowerCase().includes(type.split('-')[0]));
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-500', 'text-white');
        activeBtn.classList.remove('text-slate-400');
    }

    // Dimension Update
    container.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

    switch (type) {
        case 'responsive':
            container.style.width = '100%';
            container.style.height = 'auto';
            container.style.minHeight = '800px';
            sizeIndicator.textContent = 'Responsive';
            break;
        case 'desktop':
            container.style.width = '1280px';
            container.style.height = 'auto';
            container.style.minHeight = '100vh';
            sizeIndicator.textContent = '1280 × Auto';
            break;
        case 'mobile':
            container.style.width = '375px';
            container.style.height = '667px';
            sizeIndicator.textContent = '375 × 667 (iPhone)';
            break;
        case 'a4-p':
            container.style.width = '794px'; // 210mm at 96dpi
            container.style.height = '1123px'; // 297mm at 96dpi
            sizeIndicator.textContent = 'A4 Portrait (210mm)';
            break;
        case 'a4-l':
            container.style.width = '1123px';
            container.style.height = '794px';
            sizeIndicator.textContent = 'A4 Landscape (297mm)';
            break;
    }

    // Scroll to top of preview
    document.getElementById('creative-canvas-container').scrollTop = 0;

    setTimeout(updateRulers, 500);
};

window.updateRulers = function () {
    const topRuler = document.getElementById('creative-ruler-top');
    const leftRuler = document.getElementById('creative-ruler-left');
    if (!topRuler || !leftRuler) return;

    topRuler.innerHTML = '';
    leftRuler.innerHTML = '';

    // Top Ruler (Width)
    const maxWidth = 3000;
    for (let i = 0; i < maxWidth; i += 10) {
        const tick = document.createElement('div');
        tick.style.position = 'absolute';
        tick.style.left = i + 'px';

        if (i % 100 === 0) {
            tick.className = 'h-full border-l border-slate-600';
            const label = document.createElement('span');
            label.className = 'text-[8px] text-slate-500 absolute left-1 top-0.5';
            label.textContent = i;
            tick.appendChild(label);
        } else if (i % 50 === 0) {
            tick.className = 'h-3/4 border-l border-slate-700 self-end';
        } else {
            tick.className = 'h-1/4 border-l border-slate-800 self-end';
        }
        topRuler.appendChild(tick);
    }

    // Left Ruler (Height)
    const maxHeight = 5000;
    for (let i = 0; i < maxHeight; i += 10) {
        const tick = document.createElement('div');
        tick.style.position = 'absolute';
        tick.style.top = i + 'px';
        tick.style.left = '0';
        tick.style.width = '100%';

        if (i % 100 === 0) {
            tick.className = 'w-full border-t border-slate-600';
            const label = document.createElement('span');
            label.className = 'text-[8px] text-slate-500 absolute top-1 left-0.5 origin-left -rotate-90';
            label.textContent = i;
            tick.appendChild(label);
        } else if (i % 50 === 0) {
            tick.className = 'w-3/4 border-t border-slate-700 float-right';
        } else {
            tick.className = 'w-1/4 border-t border-slate-800 float-right';
        }
        leftRuler.appendChild(tick);
    }
};

// Listen for window resize to update rulers
window.addEventListener('resize', () => {
    if (document.getElementById('creative-modal').style.display === 'block') {
        updateRulers();
    }
});
