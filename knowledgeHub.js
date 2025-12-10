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

// Selected source state for panel expansion
let selectedSourceId = null;

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
                    });
                    await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
                    gapiInited = true;
                    console.log('GAPI initialized successfully');
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
                        showNotification('Google API connection failed. Please refresh the page.', 'error');
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
            await loadBrandSummaries(); // Load summaries
            updateSourceCounts();
            loadSavedPlans(); // Load saved plans for sidebar
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

    if (!summaryToShow) {
        // Initial State or No Summary
        summaryTitle.textContent = 'Welcome to Brand Intelligence';
        summaryContent.textContent = 'Add sources from the left panel to generate your Brand Summary.';
        keyInsights.classList.add('hidden');
        document.getElementById('summary-actions').classList.add('hidden');
        // Hide card if no summary? Or show placeholder?
        // User requested: "Chat starts with hidden slot, shown when source selected"
        // But also "Brand Summary is history managed".
        // Let's keep it visible but with welcome text if no history.
    } else {
        // Render Summary
        summaryTitle.textContent = summaryToShow.title || 'Brand Summary';

        // If this is a source view, show additional metadata
        if (summaryToShow.isSourceView && summaryToShow.sourceId) {
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

            // Update summary content to include metadata
            summaryContent.innerHTML = `
                <div class="flex items-center gap-4 mb-4 pb-4 border-b border-slate-700/50">
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-500">Importance:</span>
                        <div class="flex gap-1">${starsHtml}</div>
                    </div>
                    <div class="text-xs text-slate-500">
                        Summarized: <span class="text-slate-400">${summarizedAt}</span>
                    </div>
                </div>
                <div class="text-base text-slate-300 leading-relaxed">
                    ${summaryToShow.content || 'No summary available for this source.'}
                </div>
                <div class="mt-4 pt-4 border-t border-slate-700/50 flex gap-2">
                    <button onclick="regenerateSourceSummary('${summaryToShow.sourceId}')" 
                            class="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                        Regenerate Summary
                    </button>
                    <button onclick="confirmDeleteSource('${summaryToShow.sourceId}', '${escapeHtml(summaryToShow.title || 'this source')}')" 
                            class="px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all flex items-center gap-2 border border-red-600/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        </svg>
                        Delete
                    </button>
                </div>
            `;
        } else {
            // For Brand Summary, show content with weight breakdown
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
                            <button onclick="openWeightReport(currentDisplayedSummary?.weightBreakdown, currentDisplayedSummary?.title)" 
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
            summaryContent.innerHTML = weightBreakdownHtml + `<div class="text-base text-slate-300 leading-relaxed">${summaryToShow.content}</div>`;
        }

        // Key Insights (Chips)
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

        // Suggested Questions (Chips in Summary Card)
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

        document.getElementById('summary-actions').classList.remove('hidden');
        currentSummary = summaryToShow; // Update global current for actions
    }

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

// Regenerate summary for a single source document
async function regenerateSourceSummary(sourceId) {
    if (!currentProjectId || !sourceId) return;

    const source = sources.find(s => s.id === sourceId);
    if (!source) {
        showNotification('Source not found', 'error');
        return;
    }

    showNotification('Generating summary...', 'info');

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

        // Call AI to generate summary
        const response = await callGeminiForChat(`
            Please provide a concise summary (3-5 sentences) of the following document content. 
            Focus on the key points and main takeaways.
            
            Document Title: ${source.title || 'Untitled'}
            Document Type: ${source.sourceType}
            Content:
            ${contentToSummarize.substring(0, 5000)}
        `);

        if (response) {
            // Save summary to Firestore
            await firebase.firestore()
                .collection('projects')
                .doc(currentProjectId)
                .collection('knowledgeSources')
                .doc(sourceId)
                .update({
                    summary: response,
                    summarizedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Update local state
            source.summary = response;
            source.summarizedAt = { toDate: () => new Date() };

            // Refresh the view
            openSourceContent(sourceId);

            showNotification('Summary generated successfully!', 'success');
        } else {
            showNotification('Failed to generate summary', 'error');
        }

    } catch (error) {
        console.error('Error regenerating source summary:', error);
        showNotification('Failed to generate summary', 'error');
    }
}

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
        { id: 'email_template', name: 'Email Template', desc: 'Marketing email drafts', credits: 5 },
        { id: 'press_release', name: 'Press Release', desc: 'Media announcement draft', credits: 10 }
    ]
};

let selectedCategory = null;

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

    // Load saved plans and schedules
    loadSavedPlans();
    loadUpcomingSchedules();
}

/**
 * Select a plan category and show its items
 */
function selectPlanCategory(category) {
    selectedCategory = category;

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
        // Fallback UI handled in updateSummarySection
        showNotification('No active sources to analyze', 'warning');
        return;
    }

    // Show loading state
    document.getElementById('summary-title').textContent = 'Generating summary...';
    document.getElementById('summary-content').textContent = 'Analyzing your documents...';
    const btnRegenerate = document.getElementById('btn-regenerate-summary');
    if (btnRegenerate) btnRegenerate.disabled = true;

    try {
        // Prepare source weights for AI (importance: 1=20%, 2=35%, 3=45%)
        const sourceWeights = activeSources.map(s => ({
            id: s.id,
            title: s.title,
            importance: s.importance || 2,
            weightPercent: s.importance === 3 ? 45 : (s.importance === 1 ? 20 : 35)
        }));

        // Call Cloud Function with target language and weights
        const generateKnowledgeSummary = firebase.functions().httpsCallable('generateKnowledgeSummary');
        const result = await generateKnowledgeSummary({
            projectId: currentProjectId,
            targetLanguage: targetLanguage,
            sourceWeights: sourceWeights  // Pass weights to Cloud Function
        });

        if (result.data.success) {
            // Calculate total weight points and percentages
            const totalWeightPoints = sourceWeights.reduce((sum, s) => sum + (s.importance === 3 ? 3 : (s.importance === 1 ? 1 : 2)), 0);
            const weightBreakdown = sourceWeights.map(s => {
                const points = s.importance === 3 ? 3 : (s.importance === 1 ? 1 : 2);
                const percent = Math.round((points / totalWeightPoints) * 100);
                return {
                    id: s.id,
                    title: s.title,
                    importance: s.importance,
                    percent: percent
                };
            }).sort((a, b) => b.importance - a.importance); // Sort by importance desc

            // Create Summary Object
            const newSummary = {
                title: `Brand Summary - ${new Date().toLocaleDateString()}`,
                content: result.data.summary,
                suggestedQuestions: result.data.suggestedQuestions || [],
                keyInsights: result.data.keyInsights || [], // Ensure cloud function returns this or we extract it
                sourceCount: activeSources.length,
                sourceNames: result.data.sourceNames || activeSources.map(s => s.title),
                weightBreakdown: weightBreakdown,  // Store weight breakdown for display
                targetLanguage: targetLanguage,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser?.uid
            };

            // Save to brandSummaries collection
            const docRef = await firebase.firestore()
                .collection('projects')
                .doc(currentProjectId)
                .collection('brandSummaries')
                .add(newSummary);

            // Fetch back to get valid timestamp
            const savedDoc = await docRef.get();
            const savedSummary = { id: savedDoc.id, ...savedDoc.data() };

            // Update local state (prepend)
            brandSummaries.unshift(savedSummary);
            if (brandSummaries.length > MAX_SUMMARY_HISTORY) {
                brandSummaries.pop();
            }

            // Set as current display
            currentDisplayedSummary = savedSummary;
            updateSummarySection();

            // Store current for actions
            currentSummary = savedSummary;

            // Cleanup old summaries in DB (Async)
            cleanupOldBrandSummaries();

            showNotification('Summary generated!', 'success');
        }
    } catch (error) {
        console.error('Error generating summary:', error);
        document.getElementById('summary-title').textContent = 'Summary Failed';
        document.getElementById('summary-content').textContent = `Failed to generate summary: ${error.message}`;
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
            const batch = firebase.firestore().batch();
            let count = 0;
            snapshot.forEach(doc => {
                count++;
                if (count > MAX_SUMMARY_HISTORY) {
                    batch.delete(doc.ref);
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
            { id: 'email-type', type: 'select', label: 'Email Type', options: ['Newsletter', 'Promotional', 'Welcome', 'Follow-up', 'Announcement'] },
            { id: 'email-subject', type: 'text', label: 'Subject Line (optional)', placeholder: 'e.g., Introducing our new feature...' },
            { id: 'email-keypoints', type: 'textarea', label: 'Key Points', placeholder: 'Enter key points to include (one per line)' },
            { id: 'email-cta', type: 'text', label: 'Call to Action', placeholder: 'e.g., Try it now, Learn more' },
            { id: 'email-tone', type: 'select', label: 'Tone', options: ['Professional', 'Friendly', 'Urgent', 'Casual', 'Formal'] }
        ]
    },
    press_release: {
        name: 'Press Release',
        subtitle: 'Generate a media-ready press release',
        buttonLabel: 'Press Release',
        credits: 10,
        controls: [
            { id: 'pr-headline', type: 'text', label: 'Headline', placeholder: 'Main announcement headline' },
            { id: 'pr-subheadline', type: 'text', label: 'Subheadline (optional)', placeholder: 'Supporting detail' },
            { id: 'pr-announcement', type: 'textarea', label: 'Announcement Details', placeholder: 'What are you announcing? Key facts and details...' },
            { id: 'pr-quote', type: 'textarea', label: 'Quote (optional)', placeholder: 'A quote from the CEO or spokesperson' },
            { id: 'pr-boilerplate', type: 'checkbox', label: 'Include company boilerplate' }
        ]
    },
    product_brochure: {
        name: 'Product Brochure',
        subtitle: 'Generate a high-quality PDF brochure',
        buttonLabel: 'Brochure',
        credits: 20,
        controls: [
            { id: 'brochure-title', type: 'text', label: 'Title', placeholder: 'Brochure title' },
            { id: 'brochure-sections', type: 'select', label: 'Sections', options: ['3 sections', '4 sections', '5 sections'] },
            { id: 'brochure-content', type: 'textarea', label: 'Key Content Points', placeholder: 'Main features, benefits, use cases...' }
        ]
    },
    promo_images: {
        name: 'Promo Images',
        subtitle: 'Generate promotional images',
        buttonLabel: 'Images',
        credits: 5,
        controls: [
            { id: 'promo-concept', type: 'textarea', label: 'Image Concept', placeholder: 'Describe the image you want...' },
            { id: 'promo-style', type: 'select', label: 'Style', options: ['Modern', 'Minimalist', 'Bold', 'Corporate', 'Creative'] }
        ]
    },
    one_pager: {
        name: '1-Pager PDF',
        subtitle: 'Generate a single-page summary document',
        buttonLabel: '1-Pager',
        credits: 15,
        controls: [
            { id: 'onepager-title', type: 'text', label: 'Document Title', placeholder: 'Title for the document' },
            { id: 'onepager-content', type: 'textarea', label: 'Main Content', placeholder: 'Key information to include...' }
        ]
    },
    pitch_deck: {
        name: 'Pitch Deck Outline',
        subtitle: 'Generate a presentation outline',
        buttonLabel: 'Outline',
        credits: 10,
        controls: [
            { id: 'pitch-topic', type: 'text', label: 'Topic', placeholder: 'What is this pitch about?' },
            { id: 'pitch-slides', type: 'select', label: 'Number of Slides', options: ['5 slides', '8 slides', '10 slides', '12 slides'] },
            { id: 'pitch-audience', type: 'text', label: 'Target Audience', placeholder: 'e.g., Investors, Partners, Customers' }
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

    // Generate controls
    const controlsContainer = document.getElementById('creative-controls-container');
    controlsContainer.innerHTML = generateCreativeControls(config.controls);

    // Reset preview area
    document.getElementById('creative-placeholder').classList.remove('hidden');
    document.getElementById('creative-loading').classList.add('hidden');
    document.getElementById('creative-result-container').classList.add('hidden');
    document.getElementById('btn-creative-download').classList.add('hidden');
    document.getElementById('btn-creative-copy').classList.add('hidden');

    // Show modal
    document.getElementById('creative-modal').style.display = 'block';
    console.log('[CreativeModal] Opened for:', planType);
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
                inputHTML = `<label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="${ctrl.id}" class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500">
                    <span class="text-sm text-slate-300">${ctrl.label}</span>
                </label>`;
                return `<div class="space-y-1">${inputHTML}</div>`;
        }

        return `
            <div class="space-y-1">
                <label class="block text-xs text-slate-400 font-medium">${ctrl.label}</label>
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

    // Collect input values
    const inputs = {};
    config.controls.forEach(ctrl => {
        const el = document.getElementById(ctrl.id);
        if (el) {
            inputs[ctrl.id] = ctrl.type === 'checkbox' ? el.checked : el.value;
        }
    });

    console.log('[CreativeModal] Generating with inputs:', inputs);

    // Show loading
    document.getElementById('creative-placeholder').classList.add('hidden');
    document.getElementById('creative-loading').classList.remove('hidden');
    document.getElementById('creative-loading').style.display = 'flex';

    try {
        // TODO: Replace with actual backend call
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

        // Mock result for Email/Press Release (text-based)
        let mockResult = '';
        if (currentCreativeType === 'email_template') {
            mockResult = generateMockEmail(inputs);
        } else if (currentCreativeType === 'press_release') {
            mockResult = generateMockPressRelease(inputs);
        } else {
            mockResult = `<p class="text-slate-400">Generation for ${config.name} coming soon!</p>`;
        }

        // Show result
        document.getElementById('creative-loading').classList.add('hidden');
        document.getElementById('creative-loading').style.display = 'none';
        document.getElementById('creative-result-container').classList.remove('hidden');
        document.getElementById('creative-result-container').innerHTML = `
            <div class="prose prose-invert max-w-none h-full overflow-auto p-4 bg-slate-900 rounded-lg border border-slate-800">
                ${mockResult}
            </div>
        `;

        // Show action buttons
        document.getElementById('btn-creative-copy').classList.remove('hidden');
        document.getElementById('btn-creative-copy').style.display = 'flex';

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

async function generateCreativeItem() {
    if (!currentCreativeType) return;

    // 1. Gather Inputs
    const topic = document.getElementById('creative-input-topic')?.value || '';
    const audience = document.getElementById('creative-input-audience')?.value || '';
    const tone = document.getElementById('creative-input-tone')?.value || '';

    // Construct specific inputs based on type
    let specificInputs = {};
    const container = document.getElementById('creative-controls-container');

    if (currentCreativeType === 'product_brochure') {
        // Find selected format button
        const buttons = container.querySelectorAll('button');
        let format = 'Tri-Fold';
        buttons.forEach(btn => {
            if (btn.classList.contains('border-indigo-500')) format = btn.textContent;
        });
        specificInputs.format = format;

        const styleSelect = container.querySelectorAll('select')[1]; // Second select is style
        specificInputs.style = styleSelect ? styleSelect.value : '';
    }
    else if (currentCreativeType === 'pitch_deck') {
        const buttons = container.querySelectorAll('button');
        let slideCount = '10';
        buttons.forEach(btn => {
            if (btn.classList.contains('border-indigo-500')) slideCount = btn.textContent.replace(' Slides', '');
        });
        specificInputs.slideCount = slideCount;

        const purposeSelect = container.querySelectorAll('select')[1];
        specificInputs.purpose = purposeSelect ? purposeSelect.value : '';
    }
    else if (currentCreativeType === 'promo_images') {
        const buttons = container.querySelectorAll('button');
        let ratio = 'Square (1:1)';
        buttons.forEach(btn => {
            if (btn.classList.contains('border-indigo-500')) ratio = btn.textContent;
        });
        specificInputs.ratio = ratio;

        const styleSelect = container.querySelectorAll('select')[1];
        specificInputs.style = styleSelect ? styleSelect.value : '';
        const negInput = container.querySelector('input[placeholder*="text, blur"]');
        specificInputs.negativePrompt = negInput ? negInput.value : '';
    }
    else if (currentCreativeType === 'email_template') {
        const typeSelect = container.querySelectorAll('select')[1];
        specificInputs.emailType = typeSelect ? typeSelect.value : '';
        const senderInput = container.querySelector('input[placeholder*="John Doe"]');
        specificInputs.senderName = senderInput ? senderInput.value : '';
    }
    else if (currentCreativeType === 'press_release') {
        const typeSelect = container.querySelectorAll('select')[1];
        specificInputs.announcementType = typeSelect ? typeSelect.value : '';
        const quoteInput = container.querySelector('input[placeholder*="CEO"]');
        specificInputs.quoteRole = quoteInput ? quoteInput.value : '';
    }

    // 2. Prepare Context (Active Sources)
    const activeSources = sources.filter(s => s.isActive !== false);
    const contextText = activeSources.map(s => `${s.title}: ${s.content ? s.content.substring(0, 500) : 'No content'}`).join('\n\n');

    const requestData = {
        type: currentCreativeType,
        inputs: {
            topic,
            audience,
            tone,
            ...specificInputs
        },
        projectContext: contextText,
        targetLanguage: targetLanguage || 'English'
    };

    // 3. UI Loading State
    document.getElementById('creative-placeholder').style.display = 'none';
    document.getElementById('creative-result-container').classList.add('hidden');
    document.getElementById('creative-loading').style.display = 'flex';
    document.querySelector('.loading-text').textContent = 'Generating with AI...';

    try {
        // 4. Call Cloud Function
        const generateFn = firebase.functions().httpsCallable('generateCreativeContent');
        const result = await generateFn(requestData);

        if (result.data.success) {
            currentCreativeData = result.data.type === 'image' ? result.data.data : result.data.content;

            // 5. Render Real Result
            if (result.data.type === 'image') {
                renderCreativeImages(currentCreativeData);
            } else {
                renderCreativeResult(currentCreativeType, currentCreativeData);
            }
        } else {
            throw new Error(result.data.error || 'Generation failed');
        }

    } catch (error) {
        console.error('Generation Error:', error);
        showNotification('Generation failed: ' + error.message, 'error');
        document.getElementById('creative-placeholder').style.display = 'block';
        document.getElementById('creative-placeholder').innerHTML = `<p class="text-red-400">Error: ${error.message}</p>`;
    } finally {
        document.getElementById('creative-loading').style.display = 'none';

        // If success, show actions
        if (currentCreativeData) {
            document.getElementById('creative-result-container').style.display = 'block';
            document.getElementById('creative-result-container').classList.remove('hidden');
            document.getElementById('btn-creative-download').classList.remove('hidden');
            document.getElementById('btn-creative-copy').classList.remove('hidden');
        }
    }
}

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

        // Call Cloud Function (to be implemented)
        const generateContentPlan = firebase.functions().httpsCallable('generateContentPlan');
        const result = await generateContentPlan({
            projectId: currentProjectId,
            planType: currentPlan.type,
            targetLanguage: targetLanguage,
            additionalInstructions: instructions
        });

        if (result.data.success) {
            const version = {
                id: Date.now(),
                content: result.data.content,
                createdAt: new Date()
            };
            planVersions.push(version);

            showPlanResult();
            showNotification('Plan generated successfully!', 'success');
        } else {
            throw new Error(result.data.error || 'Generation failed');
        }
    } catch (error) {
        console.error('Error generating plan:', error);
        showPlanStep('options');
        showNotification(`Error: ${error.message}`, 'error');
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
function selectPlanVersion(index) {
    const version = planVersions[index];
    if (!version) return;

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
    const contentDiv = document.getElementById('plan-result-content').querySelector('.prose');
    contentDiv.innerHTML = formatPlanContent(version.content);
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

        // Get latest version for this plan type
        const latestSnapshot = await db.collection('projects').doc(currentProjectId)
            .collection('savedPlans')
            .where('planType', '==', currentPlan.type)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        let versionNumber = 'v1.0.0';

        if (!latestSnapshot.empty) {
            const latestPlan = latestSnapshot.docs[0].data();
            const lastVersion = latestPlan.version || 'v1.0.0';
            const [major, minor, patch] = lastVersion.replace('v', '').split('.').map(Number);

            // Check if this is a regeneration (same session) or new session
            const isRegeneration = currentPlan.sessionId === latestPlan.sessionId;

            if (isRegeneration) {
                // Patch increment for regeneration
                versionNumber = `v${major}.${minor}.${patch + 1}`;
            } else {
                // Minor increment for new session of same plan type
                versionNumber = `v${major}.${minor + 1}.0`;
            }
        }

        await db.collection('projects').doc(currentProjectId)
            .collection('savedPlans').add({
                planType: currentPlan.type,
                planName: currentPlan.name,
                content: version.content,
                language: targetLanguage,
                creditsUsed: currentPlan.credits,
                version: versionNumber,
                sessionId: currentPlan.sessionId || generateSessionId(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser?.uid
            });

        showNotification(`Plan saved as ${versionNumber}!`, 'success');
        loadSavedPlans(); // Refresh saved plans list
    } catch (error) {
        console.error('Error saving plan:', error);
        showNotification('Failed to save plan', 'error');
    }
}

/**
 * Generate unique session ID for plan generation session
 */
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        const snapshot = await db.collection('agentTeams')
            .where('projectId', '==', currentProjectId)
            .get();

        if (snapshot.empty) {
            list.innerHTML = `
                <div class="text-center py-4 text-slate-500 text-sm">
                    No agent teams found for this project.<br>
                    <a href="admin-agentteams.html" class="text-indigo-400 hover:underline mt-2 inline-block">Create a Team</a>
                </div>
            `;
            return;
        }

        list.innerHTML = snapshot.docs.map(doc => {
            const team = doc.data();
            return `
                <div class="agent-team-option p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 cursor-pointer transition-all flex items-center justify-between"
                    onclick="selectAgentTeam('${doc.id}', this)">
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

    const currentVersionIndex = document.querySelector('.plan-version-tab.bg-indigo-600')?.textContent.match(/\d+/) - 1 || 0;
    const version = planVersions[currentVersionIndex];

    if (!version) return;

    localStorage.setItem('studioContext', JSON.stringify({
        type: 'plan',
        planType: currentPlan.type,
        planName: currentPlan.name,
        content: version.content,
        projectId: currentProjectId,
        agentTeamId: selectedAgentTeam
    }));

    window.location.href = 'studio/index.html';
}

/**
 * Load saved plans for sidebar
 */
async function loadSavedPlans() {
    if (!currentProjectId) return;

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('projects').doc(currentProjectId)
            .collection('savedPlans')
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
            const item = document.createElement('div');
            item.className = 'p-2 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-all';
            item.innerHTML = `
                <div class="flex items-center justify-between">
                    <p class="text-xs text-white font-medium truncate flex-1">${plan.planName}</p>
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
        type: plan.planType,
        name: plan.planName,
        credits: plan.creditsUsed || 0
    };
    planVersions = [{
        id: id,
        content: plan.content,
        createdAt: plan.createdAt?.toDate() || new Date()
    }];

    document.getElementById('plan-modal-title').textContent = plan.planName;
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
        let query = db.collection('projects').doc(currentProjectId)
            .collection('savedPlans')
            .orderBy('createdAt', 'desc');

        if (historyFilter) {
            query = query.where('planType', '==', historyFilter);
        }

        const snapshot = await query.limit(50).get();

        if (snapshot.empty) {
            list.innerHTML = '<div class="text-center py-10 text-slate-500">No saved plans found.</div>';
            return;
        }

        historyDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        list.innerHTML = historyDocs.map((plan, index) => {
            const planDef = PLAN_DEFINITIONS[plan.planType] || { name: plan.planType };
            const langLabel = plan.language === 'ko' ? '🇰🇷 Korean' : plan.language === 'ja' ? '🇯🇵 Japanese' : plan.language ? '🇺🇸 English' : 'Unknown';
            const dateStr = plan.createdAt?.toDate ? formatRelativeTime(plan.createdAt.toDate()) : 'Unknown date';
            const contentPreview = plan.content ? plan.content.substring(0, 150) + '...' : 'No content';
            const versionBadges = plan.version ? `<span class="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono ml-2">${plan.version}</span>` : '';

            return `
                <div class="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer group"
                    onclick="openHistoryPlan(${index})">
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center">
                            <span class="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">${plan.planName}</span>
                            ${versionBadges}
                        </div>
                        <span class="text-xs text-slate-500">${dateStr}</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-slate-400 mb-2">
                        <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-500">${planDef.name}</span>
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

// Alias for HTML button
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
