/**
 * Brand Brain - JavaScript Logic
 * Handles UI interactions, Firestore CRUD, and health score calculation
 */

// State
let currentProjectId = null;
let currentSourceProjectId = null; // The original project from Command Center
let currentAgentTeamId = null; // The selected Agent Team
let brandBrainData = null;
let allProjects = []; // List of all user projects
let availableIndustries = []; // List of industries from Firestore
let saveTimeout = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initializeBrandBrain();
});

/**
 * Initialize Brand Brain
 */
async function initializeBrandBrain() {
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
        const agentTeamSelect = document.getElementById('agentteam-select');

        // Add glow highlight initially to guide user
        projectSelect.classList.add('selection-highlight');

        // Load projects from the main projects collection
        const snapshot = await db.collection('projects')
            .where('userId', '==', userId)
            .where('isDraft', '==', false)
            .get();

        allProjects = [];
        snapshot.forEach(doc => {
            allProjects.push({ id: doc.id, ...doc.data() });
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
            agentTeamSelect.innerHTML = '<option value="" disabled>No Project Selected</option>';
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
                await loadAgentTeams(selectedId);
            } else {
                // Reset agent team dropdown
                agentTeamSelect.innerHTML = '<option value="">Select Project First...</option>';
                agentTeamSelect.disabled = true;
            }
        });

        // Event: Agent Team change
        agentTeamSelect.addEventListener('change', async (e) => {
            agentTeamSelect.classList.remove('selection-highlight'); // Stop glowing
            const teamId = e.target.value;

            if (teamId) {
                currentAgentTeamId = teamId;
                const selectedOption = agentTeamSelect.options[agentTeamSelect.selectedIndex];
                showNotification(`Agent Team: ${selectedOption?.textContent || teamId}`);
            }
        });

        // Auto-select first project
        if (allProjects.length > 0) {
            projectSelect.value = allProjects[0].id;
            projectSelect.classList.remove('selection-highlight');
            await loadBrandBrainForProject(userId, allProjects[0].id);
            await loadAgentTeams(allProjects[0].id);
        }

    } catch (error) {
        console.error('Error loading user projects:', error);
        const projectSelect = document.getElementById('project-select');
        projectSelect.innerHTML = '<option value="">Error loading projects</option>';
        projectSelect.classList.remove('selection-highlight');
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
    document.getElementById('project-name').value = ci.projectName || '';
    document.getElementById('mission').value = ci.description || '';
    document.getElementById('website-url').value = ci.website || '';

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

    document.getElementById('target').value = ci.targetAudience || '';

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
    document.getElementById('writing-style').value = st.brandVoice?.writingStyle || '';

    // Current Focus
    document.getElementById('focus-topic').value = st.currentFocus?.topic || '';

    // Keywords
    const keywords = st.currentFocus?.keywords || [];
    renderKeywords(keywords);

    // Tone Intensity
    const toneSlider = document.getElementById('tone-slider');
    toneSlider.value = (st.toneIntensity || 0.5) * 100;
    updateToneLabel(toneSlider.value);

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
    document.getElementById('btn-add-link').addEventListener('click', () => {
        const urlInput = document.getElementById('new-link-url');
        if (urlInput.value.trim()) {
            addLink(urlInput.value.trim());
            urlInput.value = '';
        }
    });

    // Add Note
    document.getElementById('btn-add-note').addEventListener('click', addNote);
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
 * Switch Knowledge Base tab
 */
function switchKBTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.kb-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.kb-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
}

/**
 * Calculate health score
 */
function calculateHealthScore() {
    let score = 0;
    const breakdown = {
        identity: 0,
        knowledge: 0,
        strategy: 0,
        update: 0,
        feedback: 0
    };

    const ci = brandBrainData?.coreIdentity || {};
    const st = brandBrainData?.strategy || {};

    // Identity (25 points)
    if (ci.projectName) breakdown.identity += 5;
    if (ci.description) breakdown.identity += 5;
    if (ci.website) breakdown.identity += 5;
    if (ci.industry) breakdown.identity += 5;
    if (ci.targetAudience) breakdown.identity += 5;

    // Knowledge (25 points) - placeholder for now
    breakdown.knowledge = 15; // Base points

    // Strategy (25 points)
    if (st.brandVoice?.personality?.length > 0) breakdown.strategy += 8;
    if (st.brandVoice?.writingStyle) breakdown.strategy += 4;
    if (st.currentFocus?.topic) breakdown.strategy += 5;
    if (st.currentFocus?.keywords?.length > 0) breakdown.strategy += 4;
    if (st.brandVoice?.dos?.length > 0) breakdown.strategy += 2;
    if (st.brandVoice?.donts?.length > 0) breakdown.strategy += 2;

    // Update (25 points) - based on last update
    const lastUpdate = brandBrainData?.updatedAt;
    if (lastUpdate) {
        const daysSinceUpdate = (Date.now() - (lastUpdate.toDate ? lastUpdate.toDate() : new Date(lastUpdate)).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 1) breakdown.update = 10;
        else if (daysSinceUpdate < 7) breakdown.update = 7;
        else if (daysSinceUpdate < 30) breakdown.update = 4;
        else breakdown.update = 0;
    }

    // Feedback (25 points) - placeholder
    breakdown.feedback = 8;

    // Calculate total
    score = breakdown.identity + breakdown.knowledge + breakdown.strategy + breakdown.update + breakdown.feedback;

    // Update UI
    document.getElementById('health-score-value').textContent = score;
    document.getElementById('health-bar').style.width = `${score}%`;

    document.getElementById('score-identity').textContent = `${breakdown.identity}/25`;
    document.getElementById('score-knowledge').textContent = `${breakdown.knowledge}/25`;
    document.getElementById('score-strategy').textContent = `${breakdown.strategy}/25`;
    document.getElementById('score-update').textContent = `${breakdown.update}/25`;
    document.getElementById('score-feedback').textContent = `${breakdown.feedback}/25`;

    // Status label
    const statusLabel = document.getElementById('health-status-label');
    if (score >= 80) {
        statusLabel.textContent = 'Excellent';
        statusLabel.parentElement.style.background = 'rgba(22, 224, 189, 0.15)';
        statusLabel.parentElement.style.borderColor = 'rgba(22, 224, 189, 0.3)';
        statusLabel.style.color = '#16E0BD';
    } else if (score >= 60) {
        statusLabel.textContent = 'Good';
        statusLabel.parentElement.style.background = 'rgba(59, 130, 246, 0.15)';
        statusLabel.parentElement.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        statusLabel.style.color = '#3B82F6';
    } else {
        statusLabel.textContent = 'Needs Attention';
        statusLabel.parentElement.style.background = 'rgba(251, 191, 36, 0.15)';
        statusLabel.parentElement.style.borderColor = 'rgba(251, 191, 36, 0.3)';
        statusLabel.style.color = '#FBBF24';
    }
}
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
 * Add link
 */
function addLink(url) {
    const linksContainer = document.getElementById('kb-links');
    const linkDiv = document.createElement('div');
    linkDiv.className = 'kb-link';
    linkDiv.innerHTML = `
        <span class="link-icon">🌐</span>
        <div class="link-info">
            <span class="link-url">${url}</span>
            <span class="link-status">Pending analysis...</span>
        </div>
        <button class="btn-remove" onclick="this.parentElement.remove()">×</button>
    `;
    linksContainer.appendChild(linkDiv);

    // TODO: Save to Firestore
    showNotification('Link added! Analysis will begin shortly.');
}

/**
 * Add note
 */
function addNote() {
    const title = prompt('Note title:');
    if (!title) return;

    const content = prompt('Note content:');
    if (!content) return;

    const notesContainer = document.getElementById('kb-notes');
    const noteDiv = document.createElement('div');
    noteDiv.className = 'kb-note';
    noteDiv.innerHTML = `
        <div class="note-header">
            <span class="note-title">${title}</span>
            <button class="btn-remove" onclick="this.closest('.kb-note').remove()">×</button>
        </div>
        <p class="note-content">${content}</p>
    `;
    notesContainer.appendChild(noteDiv);

    // TODO: Save to Firestore
    showNotification('Note added!');
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
