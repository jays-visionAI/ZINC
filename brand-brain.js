/**
 * Brand Brain - JavaScript Logic
 * Handles UI interactions, Firestore CRUD, and health score calculation
 */

// Google Drive Config
// These values are set in env-config.js (loaded before this script)
const GOOGLE_CLIENT_ID = window.ENV_CONFIG?.GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = window.ENV_CONFIG?.GOOGLE_API_KEY || '';
const GOOGLE_DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';

// State
let currentProjectId = null;
let currentSourceProjectId = null; // The original project from Command Center
let currentAgentTeamId = null; // The selected Agent Team
let brandBrainData = null;
let allProjects = []; // List of all user projects
let availableIndustries = []; // List of industries from Firestore
let saveTimeout = null;

// Google API state
let gapiInited = false;
let gisInited = false;
let tokenClient = null;
let accessToken = null;

// Helper: Format file type from MIME type
function formatFileType(mimeType) {
    if (!mimeType) return 'File';
    const mimeMap = {
        'application/pdf': 'PDF',
        'application/vnd.google-apps.document': 'Google Doc',
        'application/vnd.google-apps.spreadsheet': 'Google Sheet',
        'application/vnd.google-apps.presentation': 'Google Slides',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Doc',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
        'text/plain': 'Text',
        'image/png': 'PNG Image',
        'image/jpeg': 'JPEG Image',
    };
    return mimeMap[mimeType] || mimeType.split('/').pop() || 'File';
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initializeBrandBrain();
});

/**
 * Initialize Brand Brain
 */
async function initializeBrandBrain() {
    // Initialize Google APIs
    initializeGoogleAPIs();

    // Load industries first (doesn't require auth)
    await loadIndustries();

    // Wait for auth
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            await loadUserProjects(user.uid);
            initializeEventListeners();
        }
    });
}

/**
 * Load industries from Firestore (same as Command Center)
 */
async function loadIndustries() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('industries')
            .where('isActive', '==', true)
            .get();

        availableIndustries = [];
        snapshot.forEach(doc => {
            availableIndustries.push({ id: doc.id, ...doc.data() });
        });

        // Client-side sort by order
        availableIndustries.sort((a, b) => (a.order || 0) - (b.order || 0));

        populateIndustryDropdown();
    } catch (error) {
        console.error('Error loading industries:', error);
        // Fall back to static options if Firestore fails
    }
}

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
 * Populate industry dropdown with Firestore data
 */
function populateIndustryDropdown() {
    const select = document.getElementById('industry');
    if (!select) return;

    const currentLang = localStorage.getItem('language') || 'en';
    const currentValue = select.value; // Preserve current selection

    if (availableIndustries.length === 0) {
        // Keep static options as fallback
        return;
    }

    select.innerHTML = '<option value="">Select...</option>';

    availableIndustries.forEach(ind => {
        const option = document.createElement('option');
        option.value = ind.key;
        option.textContent = currentLang === 'ko' && ind.labelKo ? ind.labelKo : ind.labelEn;
        select.appendChild(option);
    });

    // Restore previous selection if it exists
    if (currentValue) {
        select.value = currentValue;
    }
}

/**
 * Load all user projects from Firestore (from Command Center)
 */
async function loadUserProjects(userId) {
    try {
        const db = firebase.firestore();
        const projectSelect = document.getElementById('project-select');
        const agentTeamSelect = document.getElementById('agentteam-select'); // May not exist

        // Add glow highlight initially to guide user
        projectSelect.classList.add('selection-highlight');

        // Load projects from the main projects collection
        // Filter client-side to handle projects without isDraft field
        const snapshot = await db.collection('projects')
            .where('userId', '==', userId)
            .get();

        allProjects = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Only include non-draft projects (isDraft is false or undefined)
            if (data.isDraft !== true) {
                allProjects.push({ id: doc.id, ...data });
            }
        });

        // Sort by createdAt
        allProjects.sort((a, b) => {
            const tA = a.createdAt ? a.createdAt.seconds : 0;
            const tB = b.createdAt ? b.createdAt.seconds : 0;
            return tB - tA;
        });

        // Handle empty state
        if (allProjects.length === 0) {
            projectSelect.innerHTML = '<option value="" disabled selected>⚠️ Please create a Project in Command Center</option>';
            projectSelect.classList.remove('selection-highlight');
            if (agentTeamSelect) {
                agentTeamSelect.innerHTML = '<option value="" disabled>No Project Selected</option>';
            }
            return;
        }

        projectSelect.innerHTML = '<option value="">Select Project...</option>';
        allProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.projectName || project.name || 'Untitled Project';
            projectSelect.appendChild(option);
        });

        // Event: Project change
        projectSelect.addEventListener('change', async (e) => {
            projectSelect.classList.remove('selection-highlight'); // Stop glowing
            const selectedId = e.target.value;

            if (selectedId) {
                await loadBrandBrainForProject(userId, selectedId);
                // Only load agent teams if the select exists
                if (agentTeamSelect) {
                    await loadAgentTeams(selectedId);
                }
            } else {
                // Reset agent team dropdown if it exists
                if (agentTeamSelect) {
                    agentTeamSelect.innerHTML = '<option value="">Select Project First...</option>';
                    agentTeamSelect.disabled = true;
                }
            }
        });

        // Event: Agent Team change (only if element exists)
        if (agentTeamSelect) {
            agentTeamSelect.addEventListener('change', async (e) => {
                agentTeamSelect.classList.remove('selection-highlight'); // Stop glowing
                const teamId = e.target.value;

                if (teamId) {
                    currentAgentTeamId = teamId;
                    const selectedOption = agentTeamSelect.options[agentTeamSelect.selectedIndex];
                    showNotification(`Agent Team: ${selectedOption?.textContent || teamId}`);
                }
            });
        }

        // Don't auto-select - let user choose
        // Glow effect remains until user selects a project
        projectSelect.value = '';  // Keep default "Select Project..."

    } catch (error) {
        console.error('Error loading user projects:', error);
        const projectSelect = document.getElementById('project-select');
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">Error loading projects</option>';
            projectSelect.classList.remove('selection-highlight');
        }
    }
}

/**
 * Load Agent Teams for a project (matching Studio logic)
 */
async function loadAgentTeams(projectId) {
    const agentTeamSelect = document.getElementById('agentteam-select');

    console.log('[BrandBrain] Loading agent teams for project:', projectId);

    try {
        const db = firebase.firestore();

        // Try projectAgentTeamInstances first (new structure)
        let teamsSnapshot = await db.collection('projectAgentTeamInstances')
            .where('projectId', '==', projectId)
            .get();

        console.log('[BrandBrain] Found', teamsSnapshot.size, 'team instances');

        // Fallback to agentTeams if no instances found
        if (teamsSnapshot.empty) {
            console.log('[BrandBrain] No team instances, trying agentTeams collection...');
            teamsSnapshot = await db.collection('agentTeams')
                .where('projectId', '==', projectId)
                .get();
            console.log('[BrandBrain] Found', teamsSnapshot.size, 'agent teams');
        }

        agentTeamSelect.innerHTML = '<option value="">Select Agent Team...</option>';

        if (teamsSnapshot.empty) {
            agentTeamSelect.innerHTML = '<option value="" disabled selected>⚠️ Please create an Agent Team</option>';
            agentTeamSelect.disabled = false; // Enabled so user can see the message
            return;
        }

        teamsSnapshot.forEach(doc => {
            const team = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = team.name || doc.id;
            agentTeamSelect.appendChild(option);
        });

        agentTeamSelect.disabled = false;
        agentTeamSelect.classList.add('selection-highlight'); // Highlight to guide next step

    } catch (error) {
        console.error('[BrandBrain] Error loading agent teams:', error);

        // Handle permission errors specifically
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
            agentTeamSelect.innerHTML = '<option value="">No access to this project</option>';
        } else {
            agentTeamSelect.innerHTML = '<option value="">Error loading teams</option>';
        }
        agentTeamSelect.disabled = true;
    }
}

/**
 * Load Brand Brain data for a specific project
 */
async function loadBrandBrainForProject(userId, projectId) {
    try {
        const db = firebase.firestore();
        currentSourceProjectId = projectId;

        // Check if Brand Brain data exists for this project
        const brandBrainRef = db.collection('brandBrain').doc(userId).collection('projects').doc(projectId);
        const brandBrainDoc = await brandBrainRef.get();

        if (brandBrainDoc.exists) {
            // Load existing Brand Brain data
            currentProjectId = projectId;
            brandBrainData = brandBrainDoc.data();

            // BACKFILL: Check if industry is missing and try to fetch from original project
            if (!brandBrainData.coreIdentity?.industry) {
                console.log('[BrandBrain] Industry missing, checking original project...');
                const projectDoc = await db.collection('projects').doc(projectId).get();
                if (projectDoc.exists) {
                    const projectData = projectDoc.data();
                    if (projectData.industry) {
                        console.log('[BrandBrain] Found industry in project, backfilling:', projectData.industry);

                        // Update local data
                        if (!brandBrainData.coreIdentity) brandBrainData.coreIdentity = {};
                        brandBrainData.coreIdentity.industry = projectData.industry;

                        // Save to Firestore immediately
                        await brandBrainRef.update({
                            'coreIdentity.industry': projectData.industry,
                            'updatedAt': firebase.firestore.FieldValue.serverTimestamp()
                        });

                        showNotification('Project industry synced automatically');
                    }
                }
            }
        } else {
            // Create Brand Brain data from existing project
            const projectDoc = await db.collection('projects').doc(projectId).get();
            const projectData = projectDoc.data();

            // Map existing project data to Brand Brain structure
            brandBrainData = mapProjectToBrandBrain(projectData);

            // Save to Brand Brain collection
            await brandBrainRef.set(brandBrainData);
            currentProjectId = projectId;
        }

        populateUI(brandBrainData);
        calculateHealthScore();

        // Load Knowledge Sources (Unified Collection)
        await loadKnowledgeSources(projectId);

        // Update Knowledge Hub link with projectId
        const kbLink = document.getElementById('kb-manage-link');
        if (kbLink) {
            kbLink.href = `knowledgeHub.html?projectId=${projectId}`;
        }

        showNotification(`Loaded: ${brandBrainData.coreIdentity?.projectName || 'Project'}`);

    } catch (error) {
        console.error('Error loading Brand Brain data:', error);
        showNotification('Error loading project data', 'error');
    }
}

/**
 * Map existing project data to Brand Brain structure
 */
function mapProjectToBrandBrain(projectData) {
    return {
        coreIdentity: {
            projectName: projectData.projectName || projectData.name || '',
            description: projectData.description || projectData.mainProduct || '',
            website: projectData.websiteUrl || '',
            websiteAnalysis: null,
            industry: projectData.industry || '',
            targetAudience: projectData.targetAudience || projectData.targetMarkets?.join(', ') || ''
        },
        strategy: {
            brandVoice: {
                personality: projectData.preferredTone ? [projectData.preferredTone] : [],
                writingStyle: '',
                dos: [],
                donts: []
            },
            currentFocus: {
                topic: projectData.primaryObjective || '',
                keywords: []
            },
            toneIntensity: 0.5,
            platformPriority: ['x', 'instagram', 'linkedin']
        },
        healthScore: {
            score: 0,
            breakdown: {},
            lastCalculated: null
        },
        syncStatus: {
            lastSynced: null,
            pendingChanges: 0,
            pendingItems: []
        },
        sourceProjectId: currentSourceProjectId || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
}

/**
 * Get default brand brain data structure
 */
function getDefaultBrandBrainData() {
    return {
        coreIdentity: {
            projectName: '',
            description: '',
            website: '',
            websiteAnalysis: null,
            industry: '',
            targetAudience: ''
        },
        strategy: {
            brandVoice: {
                personality: [],
                writingStyle: '',
                dos: [],
                donts: []
            },
            currentFocus: {
                topic: '',
                keywords: []
            },
            toneIntensity: 0.5,
            platformPriority: ['x', 'instagram', 'linkedin']
        },
        healthScore: {
            score: 0,
            breakdown: {},
            lastCalculated: null
        },
        syncStatus: {
            lastSynced: null,
            pendingChanges: 0,
            pendingItems: []
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
}

/**
 * Populate UI with data
 */
function populateUI(data) {
    if (!data) return;

    // Core Identity
    const ci = data.coreIdentity || {};
    if (document.getElementById('project-name')) document.getElementById('project-name').value = ci.projectName || '';
    if (document.getElementById('mission')) document.getElementById('mission').value = ci.description || '';
    if (document.getElementById('website-url')) document.getElementById('website-url').value = ci.website || '';

    // Industry - ensure the option exists before setting
    const industrySelect = document.getElementById('industry');
    if (ci.industry && industrySelect) {
        // Check if option exists
        const optionExists = Array.from(industrySelect.options).some(opt => opt.value === ci.industry);
        if (!optionExists && ci.industry) {
            // Add the option if it doesn't exist (for legacy data)
            const newOption = document.createElement('option');
            newOption.value = ci.industry;
            newOption.textContent = ci.industry; // Use key as label if not in Firestore
            industrySelect.appendChild(newOption);
        }
        industrySelect.value = ci.industry;
    }

    if (document.getElementById('target')) document.getElementById('target').value = ci.targetAudience || '';

    // Website Analysis Status
    if (ci.websiteAnalysis) {
        const statusEl = document.getElementById('website-analysis-status');
        statusEl.innerHTML = `✅ Analysis Complete: ${ci.websiteAnalysis.pageCount || 0} pages parsed`;
    }

    // Strategy
    const st = data.strategy || {};

    // Brand Voice Tags
    const voiceTags = st.brandVoice?.personality || [];
    document.querySelectorAll('#brand-voice-tags .tag').forEach(tag => {
        const value = tag.dataset.value;
        if (voiceTags.includes(value)) {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });

    // Writing Style

    // Writing Style
    if (document.getElementById('writing-style')) document.getElementById('writing-style').value = st.brandVoice?.writingStyle || '';

    // Current Focus
    if (document.getElementById('focus-topic')) document.getElementById('focus-topic').value = st.currentFocus?.topic || '';

    // Keywords
    const keywords = st.currentFocus?.keywords || [];
    renderKeywords(keywords);

    // Tone Intensity
    const toneSlider = document.getElementById('tone-slider');
    if (toneSlider) {
        toneSlider.value = (st.toneIntensity || 0.5) * 100;
        updateToneLabel(toneSlider.value);
    }

    // Do's and Don'ts
    renderDosDonts(st.brandVoice?.dos || [], st.brandVoice?.donts || []);

    // Sync Status
    const sync = data.syncStatus || {};
    if (sync.pendingChanges > 0) {
        document.getElementById('updates-count').textContent = `${sync.pendingChanges} Updates`;
    } else {
        document.getElementById('updates-count').textContent = 'All Synced';
    }

    if (sync.lastSynced) {
        const lastSyncDate = sync.lastSynced.toDate ? sync.lastSynced.toDate() : new Date(sync.lastSynced);
        document.getElementById('last-sync').textContent = `Last Synced: ${formatRelativeTime(lastSyncDate)}`;
    }
}

/**
 * Render keywords
 */
function renderKeywords(keywords) {
    const container = document.getElementById('focus-keywords');
    const input = document.getElementById('keyword-input');

    // Clear existing keywords but keep input
    container.innerHTML = '';

    keywords.forEach(kw => {
        const span = document.createElement('span');
        span.className = 'keyword';
        span.innerHTML = `${kw} <button class="keyword-remove" data-keyword="${kw}">×</button>`;
        container.appendChild(span);
    });

    container.appendChild(input);
}

/**
 * Render Do's and Don'ts
 */
function renderDosDonts(dos, donts) {
    const doList = document.getElementById('do-list');
    const dontList = document.getElementById('dont-list');

    doList.innerHTML = dos.map(item => `<li>${item}</li>`).join('');
    dontList.innerHTML = donts.map(item => `<li>${item}</li>`).join('');
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Auto-save for text inputs
    const textInputs = ['project-name', 'mission', 'website-url', 'industry', 'target', 'writing-style', 'focus-topic'];
    textInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', debounce(() => saveData(), 1000));
        }
    });

    // Brand Voice Tags
    document.querySelectorAll('#brand-voice-tags .tag').forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('active');
            saveData();
        });
    });

    // Tone Slider
    const toneSlider = document.getElementById('tone-slider');
    toneSlider.addEventListener('input', (e) => {
        updateToneLabel(e.target.value);
    });
    toneSlider.addEventListener('change', () => {
        saveData();
    });

    // Keyword Input
    const keywordInput = document.getElementById('keyword-input');
    keywordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && keywordInput.value.trim()) {
            e.preventDefault();
            addKeyword(keywordInput.value.trim());
            keywordInput.value = '';
        }
    });

    // Keyword Remove (event delegation)
    document.getElementById('focus-keywords').addEventListener('click', (e) => {
        if (e.target.classList.contains('keyword-remove')) {
            const kw = e.target.dataset.keyword;
            removeKeyword(kw);
        }
    });

    // Do/Don't Add buttons
    document.querySelectorAll('.btn-add-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const listType = btn.dataset.list;
            addDoDontItem(listType);
        });
    });

    // Knowledge Base Tabs
    document.querySelectorAll('.kb-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchKBTab(tab.dataset.tab);
        });
    });

    // Sync Button
    document.getElementById('btn-sync').addEventListener('click', syncWithHiveMind);

    // Schedule Settings Button
    document.getElementById('btn-sync-schedule')?.addEventListener('click', openScheduleModal);
    document.getElementById('btn-close-schedule-modal')?.addEventListener('click', closeScheduleModal);
    document.getElementById('btn-cancel-schedule')?.addEventListener('click', closeScheduleModal);
    document.getElementById('btn-save-schedule')?.addEventListener('click', saveScheduleSettings);

    // Toggle schedule settings visibility based on enabled state
    document.getElementById('auto-sync-enabled')?.addEventListener('change', (e) => {
        const container = document.getElementById('schedule-settings-container');
        if (container) {
            container.style.opacity = e.target.checked ? '1' : '0.5';
            container.style.pointerEvents = e.target.checked ? 'auto' : 'none';
        }
    });

    // Close modal on backdrop click
    document.getElementById('sync-schedule-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'sync-schedule-modal') {
            closeScheduleModal();
        }
    });

    // Save Identity Button
    document.getElementById('btn-save-identity').addEventListener('click', () => {
        saveData();
        showNotification('Changes saved successfully!');
    });

    // Add Link
    document.getElementById('btn-add-link')?.addEventListener('click', () => {
        const urlInput = document.getElementById('new-link-url');
        if (urlInput && urlInput.value.trim()) {
            addLink(urlInput.value.trim());
            urlInput.value = '';
        }
    });

    // Add Note
    document.getElementById('btn-add-note')?.addEventListener('click', addNote);

    // Connect Google Drive
    document.getElementById('btn-connect-drive')?.addEventListener('click', connectGoogleDrive);
}

/**
 * Save data to Firestore
 */
async function saveData() {
    if (!currentProjectId) return;

    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
        const db = firebase.firestore();
        const projectRef = db.collection('brandBrain').doc(user.uid).collection('projects').doc(currentProjectId);

        // Collect data from UI
        const updatedData = {
            coreIdentity: {
                projectName: document.getElementById('project-name').value,
                description: document.getElementById('mission').value,
                website: document.getElementById('website-url').value,
                websiteAnalysis: brandBrainData?.coreIdentity?.websiteAnalysis || null,
                industry: document.getElementById('industry').value,
                targetAudience: document.getElementById('target').value
            },
            strategy: {
                brandVoice: {
                    personality: getActiveVoiceTags(),
                    writingStyle: document.getElementById('writing-style').value,
                    dos: getListItems('do-list'),
                    donts: getListItems('dont-list')
                },
                currentFocus: {
                    topic: document.getElementById('focus-topic').value,
                    keywords: getCurrentKeywords()
                },
                toneIntensity: parseInt(document.getElementById('tone-slider').value) / 100,
                platformPriority: brandBrainData?.strategy?.platformPriority || ['x', 'instagram', 'linkedin']
            },
            syncStatus: {
                lastSynced: brandBrainData?.syncStatus?.lastSynced || null,
                pendingChanges: (brandBrainData?.syncStatus?.pendingChanges || 0) + 1,
                pendingItems: [...(brandBrainData?.syncStatus?.pendingItems || []), 'Data updated']
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await projectRef.update(updatedData);
        brandBrainData = { ...brandBrainData, ...updatedData };

        // Update sync status UI
        document.getElementById('updates-count').textContent = `${updatedData.syncStatus.pendingChanges} Updates`;

        // Recalculate health score
        calculateHealthScore();

    } catch (error) {
        console.error('Error saving data:', error);
    }
}

/**
 * Get active voice tags
 */
function getActiveVoiceTags() {
    const tags = [];
    document.querySelectorAll('#brand-voice-tags .tag.active').forEach(tag => {
        if (tag.dataset.value) {
            tags.push(tag.dataset.value);
        }
    });
    return tags;
}

/**
 * Get list items
 */
function getListItems(listId) {
    const items = [];
    document.querySelectorAll(`#${listId} li`).forEach(li => {
        items.push(li.textContent.trim());
    });
    return items;
}

/**
 * Get current keywords
 */
function getCurrentKeywords() {
    const keywords = [];
    document.querySelectorAll('#focus-keywords .keyword').forEach(kw => {
        const text = kw.textContent.replace('×', '').trim();
        if (text) keywords.push(text);
    });
    return keywords;
}

/**
 * Add keyword
 */
function addKeyword(keyword) {
    const keywords = getCurrentKeywords();
    if (!keyword.startsWith('#')) {
        keyword = '#' + keyword;
    }
    if (!keywords.includes(keyword)) {
        keywords.push(keyword);
        renderKeywords(keywords);
        saveData();
    }
}

/**
 * Remove keyword
 */
function removeKeyword(keyword) {
    let keywords = getCurrentKeywords();
    keywords = keywords.filter(k => k !== keyword);
    renderKeywords(keywords);
    saveData();
}

/**
 * Add Do/Don't item
 */
function addDoDontItem(listType) {
    const listId = listType === 'do' ? 'do-list' : 'dont-list';
    const list = document.getElementById(listId);

    const item = prompt(`Add new "${listType.toUpperCase()}" item:`);
    if (item && item.trim()) {
        const li = document.createElement('li');
        li.textContent = item.trim();
        list.appendChild(li);
        saveData();
    }
}

/**
 * Update tone label
 */
function updateToneLabel(value) {
    const label = document.getElementById('tone-value-label');
    if (value < 33) {
        label.textContent = 'Informational';
    } else if (value < 66) {
        label.textContent = 'Balanced';
    } else {
        label.textContent = 'Action-Oriented';
    }
}

/**
 * Connect Google Drive - opens file picker
 */
/**
 * Connect Google Drive - opens file picker (Inline)
 */
async function connectGoogleDrive() {
    if (!currentProjectId) {
        showNotification('Please select a project first', 'error');
        return;
    }

    if (!gapiInited) {
        showNotification('Google API not loaded. Please refresh the page.', 'error');
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
        .setOAuthToken(accessToken)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setCallback(handlePickerCallback)
        .setTitle('Select files from Drive')
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .build();

    picker.setVisible(true);
}

/**
 * Handle Google Picker callback (Unified)
 */
async function handlePickerCallback(data) {
    if (data.action === google.picker.Action.PICKED) {
        const files = data.docs;

        for (const file of files) {
            await addGoogleDriveSource(file);
        }

        // Refresh Lists
        await loadKnowledgeSources(currentProjectId);
        showNotification(`Added ${files.length} file(s) from Google Drive`, 'success');
    }
}

/**
 * Add a Google Drive file as a source (Unified)
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

        const db = firebase.firestore();
        if (!currentProjectId) {
            console.error('Cannot add source: Project ID is missing');
            showNotification('Error: Project ID is missing', 'error');
            return;
        }

        console.log(`[BrandBrain] Adding source to projects/${currentProjectId}/knowledgeSources`);

        await db.collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .add(sourceData);

    } catch (error) {
        console.error('Error adding Drive source:', error);
        showNotification(`Failed to add ${file.name}`, 'error');
    }
}

/**
 * Load Knowledge Sources (Unified)
 */
async function loadKnowledgeSources(projectId) {
    const driveContainer = document.getElementById('drive-files');
    const linksContainer = document.getElementById('kb-links');
    const notesContainer = document.getElementById('kb-notes');

    // Clear and Show Loading
    driveContainer.innerHTML = '<div class="text-center py-4"><div class="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>';
    linksContainer.innerHTML = '<div class="text-center py-4"><div class="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>';
    notesContainer.innerHTML = '<div class="text-center py-4"><div class="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>';

    try {
        if (!projectId) throw new Error('Project ID is missing');

        const db = firebase.firestore();
        const snapshot = await db.collection('projects')
            .doc(projectId)
            .collection('knowledgeSources')
            .get(); // Removed orderBy to prevent index errors

        // Clear Loading
        driveContainer.innerHTML = '';
        linksContainer.innerHTML = '';
        notesContainer.innerHTML = '';

        let driveCount = 0;
        let linksCount = 0;
        let notesCount = 0;

        const sources = [];
        snapshot.forEach(doc => {
            sources.push({ id: doc.id, ...doc.data() });
        });

        // Client-side sort
        sources.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });

        sources.forEach(source => {
            // Populate based on type
            if (source.sourceType === 'google_drive') {
                renderDriveSource(source, driveContainer);
                driveCount++;
            } else if (source.sourceType === 'link') {
                renderLinkSource(source, linksContainer);
                linksCount++;
            } else if (source.sourceType === 'note') {
                renderNoteSource(source, notesContainer);
                notesCount++;
            }
        });

        // Empty States
        if (driveCount === 0) driveContainer.innerHTML = '<p class="text-center text-slate-500 text-xs py-4">No files connected yet</p>';
        if (linksCount === 0) linksContainer.innerHTML = '<p class="text-center text-slate-500 text-xs py-4">No links added yet</p>';
        if (notesCount === 0) notesContainer.innerHTML = '<p class="text-center text-slate-500 text-xs py-4">No notes added yet</p>';

    } catch (error) {
        console.error('Error loading sources:', error);
        driveContainer.innerHTML = '<p class="text-center text-red-400 text-xs">Error loading files</p>';
    }
}

/**
 * Render Drive Source Item
 */
function renderDriveSource(source, container) {
    const file = source.googleDrive || {};
    const div = document.createElement('div');
    div.className = 'flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700';
    div.innerHTML = `
        <div class="p-2 bg-blue-500/20 rounded-lg text-blue-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14,2 14,8 20,8"/>
            </svg>
        </div>
        <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">${source.title}</p>
             <p class="text-xs text-slate-500">${formatFileType(file.mimeType)}</p>
        </div>
         <button onclick="deleteSource('${source.id}', 'drive')" class="text-slate-500 hover:text-red-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
        </button>
    `;
    container.appendChild(div);
}

/**
 * Render Link Source Item
 */
function renderLinkSource(source, container) {
    const div = document.createElement('div');
    div.className = 'kb-link'; // Using CSS from brand-brain OR add inline styles if needed
    div.style.cssText = "display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; border: 1px solid rgba(51, 65, 85, 0.5); margin-bottom: 8px;";
    div.innerHTML = `
        <span class="link-icon">🌐</span>
        <div class="link-info" style="flex:1; min-width:0;">
            <div class="link-url" style="color: #e2e8f0; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${source.url}</div>
            <div class="link-status" style="color: #64748b; font-size: 0.75rem;">${source.status === 'completed' ? 'Analyzed' : 'Pending...'}</div>
        </div>
        <button class="btn-remove" onclick="deleteSource('${source.id}', 'link')" style="color: #64748b; padding: 4px;">×</button>
    `;
    container.appendChild(div);
}

/**
 * Render Note Source Item
 */
function renderNoteSource(source, container) {
    const div = document.createElement('div');
    div.className = 'kb-note';
    div.style.cssText = "padding: 12px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; border: 1px solid rgba(51, 65, 85, 0.5); margin-bottom: 8px;";
    div.innerHTML = `
        <div class="note-header" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span class="note-title" style="color: #e2e8f0; font-weight: 500; font-size: 0.875rem;">${source.title}</span>
            <button class="btn-remove" onclick="deleteSource('${source.id}', 'note')" style="color: #64748b;">×</button>
        </div>
        <p class="note-content" style="color: #94a3b8; font-size: 0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${source.content}</p>
    `;
    container.appendChild(div);
}

/**
 * Delete Source (Unified)
 */
async function deleteSource(sourceId, type) {
    if (!confirm('Are you sure you want to remove this source?')) return;

    try {
        const db = firebase.firestore();
        await db.collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .doc(sourceId)
            .delete();

        await loadKnowledgeSources(currentProjectId); // Refresh
        showNotification('Source removed', 'info');

    } catch (error) {
        console.error('Error deleting source:', error);
        showNotification('Error removing source', 'error');
    }
}

/**
 * Switch Knowledge Base tab
 */
function switchKBTab(tabName) {
    // Update tab buttons - remove active from all, add to selected
    document.querySelectorAll('.kb-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update tab content - hide all, show selected
    document.querySelectorAll('.kb-tab-content').forEach(content => {
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

/**
 * Calculate health score
 */

/**
 * Sync with Hive Mind - Push Brand Brain data to all Agent Teams
 * Phase 1 Implementation: Manual sync to all teams under current project
 */
async function syncWithHiveMind() {
    const btn = document.getElementById('btn-sync');
    const originalHTML = btn.innerHTML;

    btn.innerHTML = `
        <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path>
        </svg>
        Syncing...
    `;
    btn.disabled = true;

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        if (!currentSourceProjectId) {
            throw new Error('No project selected');
        }

        if (!brandBrainData) {
            throw new Error('Brand Brain data not loaded');
        }

        const db = firebase.firestore();

        // 1. Collect Brand Brain data for sync
        console.log('[BrandBrain Sync] Collecting brand context data...');
        const brandContext = buildBrandContext(brandBrainData);
        console.log('[BrandBrain Sync] Brand context:', brandContext);

        // 2. Find all Agent Teams under this project
        console.log('[BrandBrain Sync] Finding Agent Teams for project:', currentSourceProjectId);

        // Try projectAgentTeamInstances first
        let teamsSnapshot = await db.collection('projectAgentTeamInstances')
            .where('projectId', '==', currentSourceProjectId)
            .get();

        // Fallback to agentTeams collection
        if (teamsSnapshot.empty) {
            console.log('[BrandBrain Sync] No team instances, trying agentTeams...');
            teamsSnapshot = await db.collection('agentTeams')
                .where('projectId', '==', currentSourceProjectId)
                .get();
        }

        if (teamsSnapshot.empty) {
            showNotification('⚠️ No Agent Teams found for this project. Create an Agent Team first.', 'warning');
            return;
        }

        // 3. Batch update all Agent Teams with brandContext
        console.log(`[BrandBrain Sync] Syncing to ${teamsSnapshot.size} Agent Team(s)...`);

        const batch = db.batch();
        const syncTimestamp = firebase.firestore.FieldValue.serverTimestamp();
        const syncVersion = (brandBrainData.syncStatus?.syncVersion || 0) + 1;

        teamsSnapshot.forEach(doc => {
            const teamRef = doc.ref;
            batch.update(teamRef, {
                brandContext: {
                    syncedAt: syncTimestamp,
                    syncVersion: syncVersion,
                    syncedBy: user.uid,
                    data: brandContext
                }
            });
        });

        await batch.commit();
        console.log('[BrandBrain Sync] Batch update complete');

        // 4. Update Brand Brain sync status
        const brandBrainRef = db.collection('brandBrain').doc(user.uid).collection('projects').doc(currentSourceProjectId);
        await brandBrainRef.update({
            'syncStatus.lastSynced': syncTimestamp,
            'syncStatus.syncVersion': syncVersion,
            'syncStatus.pendingChanges': 0,
            'syncStatus.pendingItems': [],
            'syncStatus.lastSyncedTeamCount': teamsSnapshot.size
        });

        // 5. Update local state
        brandBrainData.syncStatus = {
            ...brandBrainData.syncStatus,
            lastSynced: new Date(),
            syncVersion: syncVersion,
            pendingChanges: 0,
            pendingItems: [],
            lastSyncedTeamCount: teamsSnapshot.size
        };

        // 6. Update UI
        document.getElementById('updates-count').textContent = 'All Synced';
        document.getElementById('last-sync').textContent = 'Last Synced: Just now';

        showNotification(`✅ ${teamsSnapshot.size} Agent Team(s)에 브랜드 정보가 동기화되었습니다!`);

    } catch (error) {
        console.error('[BrandBrain Sync] Error:', error);
        showNotification(`❌ Sync failed: ${error.message}`, 'error');
    } finally {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
            Sync with Hive Mind
        `;
        btn.disabled = false;
    }
}

/**
 * Build brand context object from Brand Brain data
 * This is the data structure that will be injected into Agent System Prompts
 */
function buildBrandContext(data) {
    const ci = data.coreIdentity || {};
    const st = data.strategy || {};
    const bv = st.brandVoice || {};
    const cf = st.currentFocus || {};

    return {
        // Core Identity
        brandName: ci.projectName || '',
        mission: ci.description || '',
        industry: ci.industry || '',
        targetAudience: ci.targetAudience || '',
        website: ci.website || '',

        // Brand Voice
        voiceTone: bv.personality || [],
        writingStyle: bv.writingStyle || '',
        toneIntensity: st.toneIntensity || 0.5,

        // Content Rules
        dos: bv.dos || [],
        donts: bv.donts || [],

        // Focus
        currentFocus: cf.topic || '',
        keywords: cf.keywords || [],

        // Platform Priority
        platformPriority: st.platformPriority || []
    };
}

/**
 * Add link (Unified)
 */
async function addLink(url) {
    if (!currentProjectId) return;

    try {
        const db = firebase.firestore();
        await db.collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .add({
                sourceType: 'link',
                title: url, // Assuming URL as title initially
                url: url,
                isActive: true,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        await loadKnowledgeSources(currentProjectId);
        showNotification('Link added! Analysis will begin shortly.');
    } catch (error) {
        console.error('Error adding link:', error);
        showNotification('Failed to add link', 'error');
    }
}

/**
 * Add note (Unified) - Uses textarea instead of prompt
 */
async function addNote() {
    if (!currentProjectId) {
        showNotification('Please select a project first', 'error');
        return;
    }

    const textarea = document.getElementById('new-note-content');
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) {
        showNotification('Please enter note content', 'error');
        return;
    }

    // Generate a title from the first line or first 50 chars
    const firstLine = content.split('\n')[0];
    const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;

    try {
        const db = firebase.firestore();
        await db.collection('projects')
            .doc(currentProjectId)
            .collection('knowledgeSources')
            .add({
                sourceType: 'note',
                title: title,
                content: content,
                isActive: true,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Clear textarea
        textarea.value = '';

        // Reload sources
        await loadKnowledgeSources(currentProjectId);
        showNotification('Note added successfully!', 'success');
    } catch (error) {
        console.error('Error adding note:', error);
        showNotification('Failed to add note: ' + error.message, 'error');
    }
}

/**
 * Utility: Debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility: Format relative time
 */
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Calculate Brand Health Score (Real-time)
 */
function calculateHealthScore() {
    try {
        if (!brandBrainData) return;

        let score = 0;
        let checks = {
            identity: 0,
            strategy: 0,
            knowledge: 0, // Will be updated by knowledge sources check
            consistency: 0
        };

        // 1. Core Identity (30%)
        if (brandBrainData.coreIdentity) {
            if (brandBrainData.coreIdentity.projectName) checks.identity += 10;
            if (brandBrainData.coreIdentity.description) checks.identity += 10;
            if (brandBrainData.coreIdentity.targetAudience) checks.identity += 10;
        }

        // 2. Strategy (30%)
        if (brandBrainData.strategy) {
            if (brandBrainData.strategy.brandVoice?.writingStyle) checks.strategy += 10;
            if (brandBrainData.strategy.currentFocus?.topic) checks.strategy += 10;
            if (brandBrainData.strategy.brandVoice?.dos?.length > 0) checks.strategy += 10;
        }

        // 3. Knowledge Source (20%) - Placeholder
        // 4. Consistency (20%) - Placeholder
        if (brandBrainData.healthScore?.score > 80) checks.consistency = 20;
        else checks.consistency = 10;

        // Calculate Total
        score = checks.identity + checks.strategy + checks.consistency; // + checks.knowledge

        // Update UI directly
        const healthScoreEl = document.querySelector('.health-score-value, #health-score-value');
        const completenessEl = document.querySelector('.health-completeness, #health-completeness');

        if (healthScoreEl) {
            healthScoreEl.textContent = score;
        }
        if (completenessEl) {
            completenessEl.textContent = `${score}%`;
        }

        // Update individual score elements if they exist
        const identityScoreEl = document.getElementById('identity-score');
        const strategyScoreEl = document.getElementById('strategy-score');

        if (identityScoreEl) identityScoreEl.textContent = `${checks.identity}/25`;
        if (strategyScoreEl) strategyScoreEl.textContent = `${checks.strategy}/25`;

    } catch (error) {
        console.error('Error calculating health score:', error);
    }
}

/**
 * Utility: Show notification
 */
function showNotification(message, type = 'success') {
    // Simple notification - can be enhanced
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #16E0BD, #10B981)' : 'linear-gradient(135deg, #EF4444, #DC2626)'};
        color: ${type === 'success' ? '#000' : '#fff'};
        border-radius: 12px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

/**
 * ============================================================
 * AUTO-SYNC SCHEDULE MODAL FUNCTIONS
 * ============================================================
 */

// Common timezones with UTC offset
const TIMEZONES = [
    { value: 'Pacific/Honolulu', label: 'Honolulu', offset: -10 },
    { value: 'America/Los_Angeles', label: 'Los Angeles', offset: -8 },
    { value: 'America/Denver', label: 'Denver', offset: -7 },
    { value: 'America/Chicago', label: 'Chicago', offset: -6 },
    { value: 'America/New_York', label: 'New York', offset: -5 },
    { value: 'America/Sao_Paulo', label: 'São Paulo', offset: -3 },
    { value: 'Europe/London', label: 'London', offset: 0 },
    { value: 'Europe/Paris', label: 'Paris', offset: 1 },
    { value: 'Europe/Berlin', label: 'Berlin', offset: 1 },
    { value: 'Europe/Moscow', label: 'Moscow', offset: 3 },
    { value: 'Asia/Dubai', label: 'Dubai', offset: 4 },
    { value: 'Asia/Kolkata', label: 'Mumbai', offset: 5.5 },
    { value: 'Asia/Bangkok', label: 'Bangkok', offset: 7 },
    { value: 'Asia/Singapore', label: 'Singapore', offset: 8 },
    { value: 'Asia/Shanghai', label: 'Shanghai', offset: 8 },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong', offset: 8 },
    { value: 'Asia/Seoul', label: 'Seoul', offset: 9 },
    { value: 'Asia/Tokyo', label: 'Tokyo', offset: 9 },
    { value: 'Australia/Sydney', label: 'Sydney', offset: 11 },
    { value: 'Pacific/Auckland', label: 'Auckland', offset: 13 }
];

/**
 * Open schedule settings modal
 */
function openScheduleModal() {
    const modal = document.getElementById('sync-schedule-modal');
    if (!modal) return;

    // Initialize timezone dropdown
    initializeTimezoneDropdown();

    // Load current settings
    loadScheduleSettings();

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * Close schedule settings modal
 */
function closeScheduleModal() {
    const modal = document.getElementById('sync-schedule-modal');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

/**
 * Initialize timezone dropdown with user's timezone selected
 */
function initializeTimezoneDropdown() {
    const tzSelect = document.getElementById('auto-sync-timezone');
    if (!tzSelect || tzSelect.options.length > 1) return; // Already initialized

    // Get user's current timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Sort by offset
    const sortedTimezones = [...TIMEZONES].sort((a, b) => a.offset - b.offset);

    // Check if user's timezone is in the list
    let userTzInList = sortedTimezones.some(tz => tz.value === userTimezone);

    // If not in list, add it
    if (!userTzInList) {
        const offset = new Date().getTimezoneOffset() / -60;
        const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
        sortedTimezones.unshift({
            value: userTimezone,
            label: `${userTimezone.split('/').pop().replace('_', ' ')} ★`,
            offset: offset
        });
    }

    // Populate dropdown
    tzSelect.innerHTML = '';
    sortedTimezones.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz.value;
        const offsetStr = tz.offset >= 0 ? `+${tz.offset}` : `${tz.offset}`;
        option.textContent = `${tz.label} (UTC${offsetStr})`;

        if (tz.value === userTimezone) {
            option.selected = true;
        }

        tzSelect.appendChild(option);
    });
}

/**
 * Load current schedule settings from Brand Brain data
 */
function loadScheduleSettings() {
    if (!brandBrainData) return;

    const syncStatus = brandBrainData.syncStatus || {};

    // Set enabled state
    const enabledCheckbox = document.getElementById('auto-sync-enabled');
    if (enabledCheckbox) {
        enabledCheckbox.checked = syncStatus.autoSyncEnabled !== false; // Default to true

        // Update settings container opacity
        const container = document.getElementById('schedule-settings-container');
        if (container) {
            container.style.opacity = enabledCheckbox.checked ? '1' : '0.5';
            container.style.pointerEvents = enabledCheckbox.checked ? 'auto' : 'none';
        }
    }

    // Set time
    const timeInput = document.getElementById('auto-sync-time');
    if (timeInput && syncStatus.autoSyncTime) {
        timeInput.value = syncStatus.autoSyncTime;
    }

    // Set timezone
    const tzSelect = document.getElementById('auto-sync-timezone');
    if (tzSelect && syncStatus.autoSyncTimezone) {
        tzSelect.value = syncStatus.autoSyncTimezone;
    }

    // Update status text
    updateAutoSyncStatusText(syncStatus);
}

/**
 * Save schedule settings to Firestore
 */
async function saveScheduleSettings() {
    const user = firebase.auth().currentUser;
    if (!user || !currentSourceProjectId) {
        showNotification('❌ Please select a project first', 'error');
        return;
    }

    const enabled = document.getElementById('auto-sync-enabled')?.checked ?? true;
    const syncTime = document.getElementById('auto-sync-time')?.value || '09:00';
    const timezone = document.getElementById('auto-sync-timezone')?.value || 'UTC';

    const db = firebase.firestore();
    const brandBrainRef = db.collection('brandBrain').doc(user.uid).collection('projects').doc(currentSourceProjectId);

    try {
        const scheduleSettings = {
            'syncStatus.autoSyncEnabled': enabled,
            'syncStatus.autoSyncTime': syncTime,
            'syncStatus.autoSyncTimezone': timezone,
            'syncStatus.autoSyncUpdatedAt': firebase.firestore.FieldValue.serverTimestamp()
        };

        await brandBrainRef.update(scheduleSettings);

        // Update local data
        if (!brandBrainData.syncStatus) brandBrainData.syncStatus = {};
        brandBrainData.syncStatus.autoSyncEnabled = enabled;
        brandBrainData.syncStatus.autoSyncTime = syncTime;
        brandBrainData.syncStatus.autoSyncTimezone = timezone;

        // Update status text
        updateAutoSyncStatusText(brandBrainData.syncStatus);

        closeScheduleModal();

        if (enabled) {
            const tzShort = timezone.split('/').pop().replace('_', ' ');
            showNotification(`✅ Auto-sync scheduled: ${syncTime} (${tzShort})`);
        } else {
            showNotification('ℹ️ Auto-sync disabled');
        }

    } catch (error) {
        console.error('[BrandBrain] Error saving schedule:', error);
        showNotification('❌ Failed to save schedule settings', 'error');
    }
}

/**
 * Update the auto-sync status text in the UI
 */
function updateAutoSyncStatusText(syncStatus) {
    const statusEl = document.getElementById('auto-sync-status');
    if (!statusEl) return;

    if (syncStatus?.autoSyncEnabled === false) {
        statusEl.textContent = 'Auto-sync disabled';
        statusEl.classList.add('text-slate-500');
        statusEl.classList.remove('text-indigo-200/60');
    } else if (syncStatus?.autoSyncTime && syncStatus?.autoSyncTimezone) {
        const tzShort = syncStatus.autoSyncTimezone.split('/').pop().replace('_', ' ');
        statusEl.textContent = `Auto-sync: ${syncStatus.autoSyncTime} (${tzShort})`;
        statusEl.classList.remove('text-slate-500');
        statusEl.classList.add('text-indigo-200/60');
    } else {
        statusEl.textContent = 'Ready to sync with Hive Mind';
        statusEl.classList.remove('text-slate-500');
        statusEl.classList.add('text-indigo-200/60');
    }
}
