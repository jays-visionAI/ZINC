/**
 * ============================================
 * Studio V2.0 - Main JavaScript
 * ============================================
 */


// ============================================
// WORKFLOW TEMPLATES
// ============================================
const WORKFLOW_TEMPLATES = {
    quick: {
        id: 'quick',
        name: 'Lite Mode',
        description: '핵심 에이전트만 가동 (Planner → Creator → Manager)',
        agents: ['planner', 'creator_text', 'manager'],
        contentTypes: ['text'],
        estimatedTime: '30s',
        estimatedCost: 0.02,
    },
    standard: {
        id: 'standard',
        name: 'Standard',
        description: '균형 잡힌 구성 (Research + Planner + Creator)',
        agents: ['strategic_analyst', 'planner', 'creator_text', 'quality_controller', 'manager'],
        contentTypes: ['text'],
        estimatedTime: '1.5min',
        estimatedCost: 0.06,
    },
    premium: {
        id: 'premium',
        name: 'Deep Dive',
        description: '12명 전체 에이전트 정밀 가동',
        agents: ['research', 'seo_watcher', 'knowledge_curator', 'kpi', 'planner',
            'creator_text', 'creator_image', 'creator_video',
            'compliance', 'seo_optimizer', 'evaluator', 'manager'],
        contentTypes: ['text', 'image', 'video'],
        estimatedTime: '5min',
        estimatedCost: 0.25,
    },
    custom: {
        id: 'custom',
        name: 'Custom',
        description: '에이전트 직접 선택',
        agents: [],
        contentTypes: [],
        estimatedTime: 'varies',
        estimatedCost: 0,
    }
};

// Required agents that cannot be unchecked
const REQUIRED_AGENTS = ['planner', 'creator_text', 'manager'];

// ============================================
// STATE
// ============================================
let state = {
    selectedProject: null,
    selectedAgentTeam: null,
    selectedTemplate: 'quick', // Phase 4: Default to Lite Mode
    chatHistory: [], // Interactive Studio Chat history
    currentThinkingBubble: null, // Track the thinking bubble element
    thinkingTimer: null,        // Timer for dot animation
    selectedAgents: [],
    isExecuting: false,
    isPaused: false,
    currentPhase: 0,
    currentAgent: 0,
    timerSeconds: 0,
    timerInterval: null,
    planContext: null, // Context from Knowledge Hub
    isThinking: false, // Track if AI is currently thinking (processing a message)
    messageQueue: [],  // Queue for messages sent while AI is thinking
    attachments: [],   // Current attachments in the command bar
    // UNIFIED BRAIN: Multi-channel targeting
    targetChannels: ['x'], // Default to X/Twitter
    availableChannels: [
        'x', 'instagram', 'linkedin', 'facebook', 'youtube', 'tiktok',
        'naver_blog', 'naver_smart_store', 'naver_map', 'coupang', 'tmap', 'kakao_navi', 'kakao_map',
        'pinterest', 'reddit', 'threads', 'snapchat', 'discord', 'telegram', 'medium'
    ],
    maxFiles: 5, // Maximum attachments allowed
    isThinking: false, // Track if AI is currently thinking
};

// ============================================
// FIRESTORE HELPER
// ============================================
/**
 * Safe Firestore accessor - falls back to firebase.firestore() if db is undefined
 */
function getFirestore() {
    if (typeof db !== 'undefined' && db) {
        return db;
    }
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        return firebase.firestore();
    }
    console.error('[Studio] Firestore not available');
    return null;
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initProjectSelector();
    initTemplateSelector();
    initAgentRoster();
    initPreviewTabs();
    initFooterButtons();
    initSidebarToggle();
    initBoosterToggle();
    initBriefingBoard();
    // initChatEngine(); // Removed as it is called inside initProjectSelector -> onAuthStateChanged
    updateStats();

    // Initialize Content Language Selector
    if (typeof UI !== 'undefined' && UI.renderContentLangSelector) {
        UI.renderContentLangSelector('content-lang-container');
    }

    // Localize Studio UI
    localizeStudioUI();

    // Listen for Content Language changes
    window.addEventListener('zynk-content-lang-changed', (e) => {
        const newLang = e.detail?.lang || localStorage.getItem('zynk-main-language');
        console.log('[Studio] Content language changed, re-localizing UI to:', newLang);

        // Re-localize static elements
        localizeStudioUI();

        // Update voice language default if applicable
        const voiceLangSelect = document.getElementById('select-voice-lang');
        if (voiceLangSelect) {
            voiceLangSelect.value = newLang === 'ko' ? 'ko-KR' : 'en-US';
            // Also notify STT system if it exists
            if (typeof setVoiceLanguage === 'function') {
                setVoiceLanguage(newLang === 'ko' ? 'ko-KR' : 'en-US');
            }
        }
    });
});

/**
 * Localize Studio UI elements based on current language
 */
function localizeStudioUI() {
    if (typeof t !== 'function') return;

    // Welcome State
    const welcomeTitle = document.querySelector('#engine-welcome-state h3');
    const welcomeSub = document.querySelector('#engine-welcome-state p');
    if (welcomeTitle) welcomeTitle.textContent = t('studio.welcome.title');
    if (welcomeSub) welcomeSub.textContent = t('studio.welcome.subtitle');

    // Input Placeholder
    const mainInput = document.getElementById('main-instruction-input');
    if (mainInput) mainInput.placeholder = t('studio.input.placeholder');

    // Voice Language Select
    const voiceLangSelect = document.getElementById('select-voice-lang');
    if (voiceLangSelect) {
        const currentLang = localStorage.getItem('zynk-language') || 'en';
        voiceLangSelect.value = currentLang === 'ko' ? 'ko-KR' : 'en-US';
    }
}

// ============================================
// HELPER FUNCTIONS & ICONS
// ============================================

/**
 * Global Icon Set for Studio (SVG replacements for Emojis)
 */
const studioIcons = {
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #3B82F6; vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #10B981; vertical-align: middle; margin-right: 4px;"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #EF4444; vertical-align: middle; margin-right: 4px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #F59E0B; vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    system: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #8B5CF6; vertical-align: middle; margin-right: 4px;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #ccc; vertical-align: middle; margin-right: 4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    mcp: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #FBBF24; vertical-align: middle; margin-right: 4px;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a2 2 0 0 1-2.83-2.83l-3.94 3.6z"/><circle cx="12" cy="12" r="10"/></svg>`,
    folder: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #60A5FA; vertical-align: middle; margin-right: 4px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    document: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #888; vertical-align: middle; margin-right: 4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    brain: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #EC4899; vertical-align: middle; margin-right: 4px;"><path d="M9.5 2C7.57 2 6 3.57 6 5.5c0 .69.2 1.33.53 1.88C5.06 8.28 4 9.77 4 11.5c0 1.5 1.05 2.75 2.5 3.1-.12.44-.19.9-.19 1.38 0 2.5 2.02 4.52 4.52 4.52.54 0 1.05-.1 1.53-.27C13.25 21.6 15.03 22 17 22c2.76 0 5-2.24 5-5 0-1.7-.85-3.2-2.14-4.09.43-.8.64-1.68.64-2.58 0-3.04-2.46-5.52-5.52-5.52-.37 0-.74.04-1.1.1.18-.54.28-1.12.28-1.71 0-1.74-1.42-3.16-3.16-3.16z"/></svg>`,
    robot: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #8B5CF6; vertical-align: middle; margin-right: 4px;"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h0M16 16h0"/></svg>`,
    sparkle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #FBBF24; vertical-align: middle; margin-right: 4px;"><path d="M12 3l1.91 5.89L20 10l-5.89 1.91L12 18l-1.91-5.89L4 10l5.89-1.91z"/></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #10B981; vertical-align: middle; margin-right: 4px;"><polyline points="20 6 9 17 4 12"/></svg>`,
    running: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="studio-icon-svg" style="color: #3B82F6; vertical-align: middle; margin-right: 4px; animation: spin 2s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`
};

/**
 * Helper to replace common emojis with SVG icons for a consistent UI
 */
function replaceEmojis(text) {
    if (typeof text !== 'string') return text;

    return text
        .replace(/\uD83D\uDCC2|\uD83D\uDCC1/g, studioIcons.folder)
        .replace(/\uD83D\uDCC4|\uD83D\uDCDD|\uD83D\uDCCB/g, studioIcons.document)
        .replace(/\uD83E\uDDE0/g, studioIcons.brain)
        .replace(/\uD83E\uDD16/g, studioIcons.robot)
        .replace(/\u2728/g, studioIcons.sparkle)
        .replace(/\u2705/g, studioIcons.check)
        .replace(/\u274C|\u26D4/g, studioIcons.error)
        .replace(/\u26A0\uFE0F/g, studioIcons.warning)
        .replace(/\u2139\uFE0F/g, studioIcons.info)
        .replace(/\uD83D\uDE80/g, studioIcons.success)
        .replace(/\uD83D\uD004/g, studioIcons.system)
        .replace(/\uD83C\uDFAF/g, studioIcons.success);
}

/**
 * Helper to format message with simple markdown and emojis
 */
function formatMessage(text) {
    if (typeof text !== 'string') return text;
    let formatted = text
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\s*-\s+(.*)$/gm, '• $1'); // Bullet points
    return replaceEmojis(formatted);
}

/**
/**
 * Resets the DAG visualization
 */
window.resetDAG = function () {
    window.renderDAGPlaceholder();
};
/**
 * Resets the DAG visualization to its initial state.
 * This is called when a new agent team is selected.
 */
window.renderDAGPlaceholder = function () {
    // Reset all DAG nodes to 'waiting' state
    const nodes = document.querySelectorAll('.dag-node');
    nodes.forEach(node => {
        node.classList.remove('running', 'completed', 'failed');
        node.classList.add('waiting');
    });

    // Reset all paths
    const paths = document.querySelectorAll('.dag-path');
    paths.forEach(path => {
        path.classList.remove('active');
        path.style.strokeDasharray = '';
        path.style.strokeDashoffset = '';
    });

    // Clear any particles
    const particleGroup = document.getElementById('dag-particles');
    if (particleGroup) {
        particleGroup.innerHTML = '';
    }

    console.log('[Studio] DAG visualization reset (Global).');
};

async function initProjectSelector() {
    const projectSelect = document.getElementById('project-select');

    // Add highlight initially to guide user
    if (projectSelect) projectSelect.classList.add('selection-highlight');

    // Ensure Firestore is available
    const firestore = getFirestore();
    if (!firestore) {
        if (projectSelect) projectSelect.innerHTML = '<option value="">Firestore not initialized</option>';
        return;
    }

    // Wait for Firebase auth
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            console.log('[Studio] No user logged in, redirecting...');
            window.location.href = '../index.html';
            return;
        }

        console.log('[Studio] User authenticated:', user.uid);

        try {
            // Load projects (matching user-settings.js approach)
            console.log('[Studio] Loading projects for user:', user.uid);
            const projectsSnapshot = await firestore.collection('projects')
                .where('userId', '==', user.uid)
                .where('isDraft', '==', false)  // Only non-draft projects
                .get();

            console.log('[Studio] Found', projectsSnapshot.size, 'projects');

            projectSelect.innerHTML = '<option value="">Select Project...</option>';

            if (projectsSnapshot.empty) {
                projectSelect.innerHTML = '<option value="" disabled selected> Please create a Project in Admin Settings</option>';
                projectSelect.classList.remove('selection-highlight'); // Remove glow if empty
                addLogEntry(t('studio.log.noProjectsFound'), 'info');
                return;
            }

            // Collect and sort projects client-side
            const projects = [];
            projectsSnapshot.forEach(doc => {
                const data = doc.data();

                // Log for debugging
                console.log('[Studio] Project:', doc.id, 'projectName:', data.projectName, 'name:', data.name);

                // Use projectName (new) or name/businessName (legacy) 
                const displayName = data.projectName || data.name || data.businessName;

                if (displayName) {
                    projects.push({
                        id: doc.id,
                        displayName,
                        createdAt: data.createdAt
                    });
                } else {
                    // Skipping project without name
                }
            });

            if (projects.length === 0) {
                projectSelect.innerHTML = '<option value="" disabled selected> Please create a Project in Admin Settings</option>';
                projectSelect.classList.remove('selection-highlight');
                addLogEntry(t('studio.log.noValidProjectsFound'), 'info');
                return;
            }

            // Sort by createdAt descending (newest first)
            projects.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0);
                const dateB = b.createdAt?.toDate?.() || b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0);
                return dateB - dateA;
            });

            // Removed generic log entry as per user request

            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.displayName;
                projectSelect.appendChild(option);

            });

            // Check for Knowledge Hub Context first
            const studioContextStr = localStorage.getItem('studioContext');
            let contextProjectId = null;
            let contextTeamId = null;

            if (studioContextStr) {
                try {
                    const context = JSON.parse(studioContextStr);


                    if (context.projectId) {
                        contextProjectId = context.projectId;
                        contextTeamId = context.agentTeamId;
                        state.planContext = context;

                        addLogEntry(t('studio.log.planLoadedFromKnowledgeHub'), 'success');
                        addLogEntry(t('studio.log.planName').replace('{{planName}}', context.planName), 'info');

                        // SYNC Briefing Board
                        syncBriefingBoard(context.content || '', 'replace');

                        // Update Source Context UI
                        // Update Source Context UI
                        const sourceDisplay = document.getElementById('source-context-display');
                        if (sourceDisplay) {
                            sourceDisplay.innerHTML = ''; // Clear placeholder

                            const row = document.createElement('div');
                            row.style.cssText = `
                                display: flex; 
                                align-items: center; 
                                gap: 10px; 
                                padding: 8px 12px; 
                                background: rgba(255,255,255,0.05); 
                                border: 1px solid rgba(255,255,255,0.1); 
                                border-radius: 6px;
                            `;

                            const radio = document.createElement('input');
                            radio.type = 'radio';
                            radio.name = 'source_context_selection'; // Group name
                            radio.checked = true; // Default active
                            radio.style.accentColor = '#8B5CF6'; // Theme color

                            const label = document.createElement('span');
                            label.style.cssText = 'color: #fff; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                            // Use plan name as primary title, or content preview
                            label.textContent = context.planName || t('studio.log.loadedSourceContext');
                            label.title = context.planName; // Tooltip

                            row.appendChild(radio);
                            row.appendChild(label);
                            sourceDisplay.appendChild(row);
                        }
                    }

                    // Clear after loading
                    localStorage.removeItem('studioContext');
                } catch (e) {
                    console.error('Error parsing studioContext:', e);
                }
            }

            // Priority: 1) studioContext, 2) URL param, 3) global localStorage
            const urlParams = new URLSearchParams(window.location.search);
            const globalProjectId = localStorage.getItem('currentProjectId');
            const projectId = contextProjectId || urlParams.get('project') ||
                (globalProjectId && projects.find(p => p.id === globalProjectId) ? globalProjectId : null);

            if (projectId) {
                projectSelect.value = projectId;
                projectSelect.classList.remove('selection-highlight');
                state.selectedProject = projectId;

                // Sync to global state
                localStorage.setItem('currentProjectId', projectId);

                // Update Preview Profile for auto-selected project
                const selectedOption = Array.from(projectSelect.options).find(opt => opt.value === projectId);
                if (selectedOption) {
                    updatePreviewProfile(selectedOption.textContent);
                    if (typeof t === 'function') {
                        addLogEntry(t('studio.log.projectLoaded').replace('{{name}}', selectedOption.textContent), 'info');
                    } else {
                        addLogEntry(`[OK] ${selectedOption.textContent} 프로젝트가 로드되었습니다.`, 'info');
                    }
                }

                await loadAgentTeams(projectId);

                // Only load recent plans if we don't already have a context from Knowledge Hub
                if (!state.planContext) {
                    loadContentPlans(projectId); // Load Contexts
                }

                const teamId = contextTeamId || urlParams.get('team');
                if (teamId) {
                    const agentTeamSelect = document.getElementById('agentteam-select');
                    if (agentTeamSelect) {
                        agentTeamSelect.value = teamId;
                        // Trigger change event manually or call handler
                        agentTeamSelect.classList.remove('selection-highlight');
                    }
                    state.selectedAgentTeam = teamId;

                    const msg = (typeof t === 'function')
                        ? t('studio.log.autoLoadingTeam').replace('{{teamId}}', teamId)
                        : `[SYSTEM] Auto-loading team: ${teamId}`;
                    addLogEntry(msg, 'info');

                    await loadSubAgents(teamId);
                    enableStartButton();

                    // If we have a context, we might want to auto-open the DAG or highlight start
                    if (state.planContext) {
                        const startBtn = document.getElementById('btn-send-instruction');
                        if (startBtn) startBtn.classList.add('animate-pulse'); // Visual cue
                    }

                    if (typeof renderDAGPlaceholder === 'function') {
                        renderDAGPlaceholder();
                    }
                }
            } else {
                // No project auto-selected
            }
        } catch (error) {
            console.error('[Studio] Error loading projects:', error);
            if (projectSelect) projectSelect.innerHTML = '<option value="">Error loading projects</option>';
            const errorMsg = (typeof t === 'function') ? t('studio.log.failedToLoadProjects') : '[ERROR] Failed to load projects';
            addLogEntry(errorMsg, 'error');
        }
    });
    // Event: Project change
    if (projectSelect) {
        projectSelect.addEventListener('change', async (e) => {
            projectSelect.classList.remove('selection-highlight'); // Stop glowing
            const projectId = e.target.value;
            const selectedOption = projectSelect.options[projectSelect.selectedIndex];
            const projectName = selectedOption?.textContent || projectId;
            state.selectedProject = projectId;

            // Update Orchestrator Header Name
            const headerProjectName = document.getElementById('current-project-name');
            if (headerProjectName) {
                headerProjectName.textContent = projectName;
            }

            if (projectId) {
                // Sync to global state
                localStorage.setItem('currentProjectId', projectId);

                // Clear any lingering plan context from previous loads/redirects
                state.planContext = null;
                // Enable Global Start Button
                const startBtn = document.getElementById('btn-send-instruction');
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    // Update text intent
                    startBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
            ${t('studio.button.startWithSelectedContext')}
        `;
                    startBtn.style.background = '#8B5CF6'; // Purple active
                    startBtn.style.color = '#fff';
                }

                // Update Preview Profile
                updatePreviewProfile(projectName);
                if (typeof t === 'function') {
                    addLogEntry(t('studio.log.projectLoaded').replace('{{name}}', projectName), 'info');
                } else {
                    addLogEntry(`[OK] ${projectName} 프로젝트가 로드되었습니다.`, 'info');
                }

                // Fetch full project details for context
                try {
                    const projectDoc = await getFirestore().collection('projects').doc(projectId).get();
                    if (projectDoc.exists) {
                        const pData = projectDoc.data();
                        const description = pData.description || pData.businessDescription || `Content creation for ${projectName}`;

                        state.planContext = {
                            planName: `Content Plan for ${projectName}`,
                            content: description,
                            projectId: projectId
                        };
                        addLogEntry(t('studio.log.projectContextLoaded'), 'success');
                        // SYNC Briefing Board
                        syncBriefingBoard(description, 'replace');
                    }
                } catch (err) {
                    console.warn('[Studio] Error fetching project details:', err);
                    // Fallback context
                    state.planContext = {
                        planName: `Project: ${projectName}`,
                        content: `Create content for ${projectName}`,
                        projectId: projectId
                    };
                }

                await loadAgentTeams(projectId);
                loadContentPlans(projectId); // Load Contexts

                // [SESSION HISTORY] Load and auto-resume last session
                if (window.SessionHistoryService) {
                    await loadSessions(projectId);

                    // Auto-resume last session if it exists and is recent (handled by ensureSession)
                    const sessionId = await window.SessionHistoryService.ensureSession(projectId, projectName);
                    if (sessionId) {
                        await switchSession(sessionId, true); // Force UI update
                    }
                }

                // [PROACTIVE] Auto-load Target Brief from Knowledge Hub sources
                await loadAndAnalyzeTargetBrief(projectId, projectName);
            } else {
                const agentTeamSelect = document.getElementById('agentteam-select');
                if (agentTeamSelect) {
                    agentTeamSelect.innerHTML = '<option value="">Select Agent Team...</option>';
                    agentTeamSelect.disabled = true;
                }
                addLogEntry(t('studio.log.projectDeselected'), 'info');
            }

            disableStartButton();
        });

    }

    // Initialize Engines
    initChatEngine();
    initEditorEngine();
}

/**
 * =====================================================
 * [SYSTEM] CHAT ENGINE LOGIC (Skywork Style)
 * =====================================================
 */
function initChatEngine() {
    const input = document.getElementById('main-instruction-input');
    const sendBtn = document.getElementById('btn-send-instruction');
    const streamContainer = document.getElementById('chat-stream-log');

    if (!input || !sendBtn) return;

    /**
     * =====================================================
     * [SYSTEM] STUDIO ORCHESTRATOR SYSTEM PROMPT
     * =====================================================
     */
    // maxFiles moved to global state

    const STUDIO_ASSISTANT_SYSTEM_PROMPT = `
You are the ZYNK Architect and Vision Expert. Your primary goal is to finalize the definitive "Target Brief" for the project: {{projectName}}.

360-DEGREE CONTEXT SYNC (Automatic):
You have direct access to four core intelligence pillars. You must never ask for information already present in:
1. [CORE INFO]: Project description, target audience, and USP from the Command Center.
2. [BRAND BRAIN]: Personality, tone, values, and brand health metrics.
3. [KNOWLEDGE HUB]: Detailed assets, PDF contents, and the latest Unified Summary.
4. [MARKET PULSE]: Live trends, sentiment analysis, and competitor footprints.

GAP ANALYSIS PROTOCOL:
- Phase 1 (Sync): Silently review all 4 pillars provided in your system context.
- Phase 2 (Gap ID): Identify exactly what's missing (e.g., "I know the target is X, but I don't see their budget range in any document").
- Phase 3 (Proactive Request): List the missing items clearly to the user and suggest how they can provide them (upload, text, or [SEARCH]).

OPERATING PRINCIPLES:
- Proactive Vision Analysis: Extracted data from images is high-priority truth.
- Command Parsing: Use [BLOCK], [CONTEXT], and [SEARCH] strictly for updates.

Response Language: KO (Korean).
Current Project Context: {{projectName}}
`;

    // Helper: Check if there's any content to send and update button state
    window.checkInputState = function () {
        const input = document.getElementById('main-instruction-input');
        const sendBtn = document.getElementById('btn-send-instruction');
        if (!input || !sendBtn) return;

        const hasContent = input.value.trim().length > 0 || state.attachments.length > 0;

        if (!state.isThinking) {
            sendBtn.disabled = !hasContent;
            sendBtn.style.opacity = hasContent ? '1' : '0.5';
            sendBtn.style.cursor = hasContent ? 'pointer' : 'default';
        } else {
            // When thinking, the button should still look enabled if they are typing a stacked message
            sendBtn.disabled = !hasContent;
            sendBtn.style.opacity = hasContent ? '1' : '0.5';
        }
    };

    // Unified Smart Action Handler (Enhanced Interactive AI)
    const handleSmartExecute = async () => {
        const text = input.value.trim();
        const userMsg = text || t('studio.log.processingAttachments');
        const attachments = [...state.attachments];

        if (!text && attachments.length === 0) {
            if (!state.selectedAgentTeam) {
                addLogEntry(t('studio.log.selectProjectAndTeam'), 'error');
                return;
            }
            if (state.isExecuting) return;
            updateSmartButtonState('loading');
            setTimeout(() => {
                if (typeof startExecution === 'function') startExecution();
            }, 100);
            return;
        }

        // Implicit instructions for images if no text
        let promptText = text;
        if (!text && attachments.length > 0) {
            promptText = `[VISION_MODE] Attached images contain project data for "${projectName}". Please analyze them, extract core values and target info, and propose an updated Target Brief.`;
        }

        // --- MESSAGE QUEUEING ---
        if (state.isThinking) {
            state.messageQueue.push({ text, attachments });

            // Clear current input for next queued message
            input.value = '';
            input.style.height = 'auto';
            state.attachments = [];
            const previewArea = document.getElementById('command-preview-area');
            if (previewArea) {
                previewArea.innerHTML = '';
                previewArea.style.display = 'none';
            }

            addLogEntry(t('studio.log.messageQueued'), 'info');
            window.checkInputState();
            return;
        }

        // --- INTERACTIVE AI PHASE ---
        state.isThinking = true;

        // Clear input immediately
        input.value = '';
        input.style.height = 'auto';
        state.attachments = [];
        const previewArea = document.getElementById('command-preview-area');
        if (previewArea) {
            previewArea.innerHTML = '';
            previewArea.style.display = 'none';
        }

        addLogEntry(text || t('studio.log.processingAttachments'), 'user');

        // --- SHOW THINKING STATE ---
        showAIThinking(t('studio.log.thinkingAnalyzing'));
        updateSmartButtonState('loading');
        window.checkInputState();

        // SIMULATED PROGRESS (For Visual Dynamics)
        setTimeout(() => updateAIThinking(t('studio.log.thinkingCore')), 800);
        setTimeout(() => updateAIThinking(t('studio.log.thinkingBrain')), 1800);
        setTimeout(() => updateAIThinking(t('studio.log.thinkingKnowledge')), 3000);

        // Prepare context for AI
        const projectSelect = document.getElementById('project-select');
        const projectName = projectSelect.options[projectSelect.selectedIndex]?.textContent || 'Unknown';

        // Resolve Target Language (Prioritize Content Language)
        const contentLang = window.zynk_main_lang || 'en';
        const targetLanguage = contentLang === 'ko' ? 'Korean' : 'English';

        let systemPrompt = STUDIO_ASSISTANT_SYSTEM_PROMPT
            .replaceAll('{{projectName}}', projectName);

        // Convert images to base64 if any
        const images = [];
        if (attachments.length > 0) {
            updateAIThinking(t('studio.log.processingAttachments'));
            for (const att of attachments) {
                if (att.type === 'image') {
                    try {
                        const base64 = await fileToBase64(att.file);
                        images.push(base64);
                    } catch (e) {
                        console.error('Failed to convert image to base64:', e);
                    }
                }
            }
        }

        // Add to history
        state.chatHistory.push({
            role: 'user',
            content: promptText,
            images: images.length > 0 ? images : undefined
        });

        // [SESSION HISTORY] Save user message to Firestore
        if (window.SessionHistoryService && state.selectedProject) {
            await window.SessionHistoryService.ensureSession(state.selectedProject, projectName);
            window.SessionHistoryService.saveMessage('user', promptText, {
                projectName,
                hasImages: images.length > 0
            });
        }

        try {
            // Call LLM Router Service
            if (window.LLMRouterService) {
                // Load persisted context if available
                let contextMessages = state.chatHistory.slice(-20); // Increased from 5 to 20

                if (window.SessionHistoryService && state.selectedProject) {
                    const session = window.SessionHistoryService.getCurrentSession();
                    if (session.id) {
                        const persistedContext = await window.SessionHistoryService.loadLLMContext(
                            state.selectedProject, session.id
                        );
                        if (persistedContext.length > 0) {
                            contextMessages = persistedContext;
                        }
                    }
                }

                setTimeout(() => updateAIThinking(t('studio.log.thinkingMarket')), 4200);
                setTimeout(() => updateAIThinking(t('studio.log.thinkingGap')), 5500);

                // Final state before call or during call
                setTimeout(() => updateAIThinking(t('studio.log.generatingResponse')), 6800);

                // [TESTING PHASE] Direct DeepSeek Call
                // Use 'callOpenAI' directly to bypass router logic as requested
                const callOpenAI = firebase.functions().httpsCallable('callOpenAI');
                const result = await callOpenAI({
                    provider: 'deepseek',
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...contextMessages
                    ],
                    images: images.length > 0 ? images : undefined,
                    temperature: 0.7
                });

                const response = result.data;

                const aiMessage = response.content;
                state.chatHistory.push({ role: 'assistant', content: aiMessage });

                // Clear input and attachments
                input.value = '';
                state.attachments = [];
                const previewArea = document.getElementById('command-preview-area');
                if (previewArea) {
                    previewArea.innerHTML = '';
                    previewArea.style.display = 'none';
                }

                // [SESSION HISTORY] Save AI response to Firestore
                if (window.SessionHistoryService && state.selectedProject) {
                    window.SessionHistoryService.saveMessage('assistant', aiMessage, {
                        model: response.model,
                        tokens: response.usage?.totalTokens
                    });
                }

                // REMOVE THINKING STATE before showing response
                removeAIThinking();

                // 1. Process AI Commands ([CONTEXT: ...], [SEARCH: ...])
                const cleanMessage = parseAICommands(aiMessage);

                state.isThinking = false;

                // 2. Display AI Response (System/Assistant role)
                addLogEntry(cleanMessage, 'info');

                // 3. Smart Redirection (Studio -> Knowledge Hub)
                const analysisKeywords = ['deep analyze', 'analyze documents', 'knowledge base', 'pdf', 'insight from sources', '문서 분석', '나리지 베이스', '심층 분석'];
                const searchStr = (text || userMsg || "").toLowerCase();
                const needsDeepAnalysis = analysisKeywords.some(kw => searchStr.includes(kw));
                if (needsDeepAnalysis && typeof t === 'function') {
                    addLogEntry(t('studio.suggestion.gotoKnowledgeHub'), 'success');
                }
            } else {
                throw new Error('LLMRouterService not loaded');
            }

        } catch (error) {
            console.error('[Studio] Interactive AI Error:', error);
            removeAIThinking(); // Clear thinking state on error

            // DEMO FALLBACK: If service fails, use a local simulator to allow testing the workflow
            console.log('[Studio] LLM Service unreachable, activating Studio Simulator Fallback...');

            let simulatorResponse = "";
            const lowerInput = text.toLowerCase();
            const trimmedInput = text.trim().toLowerCase();

            // Enhanced Question Detection (including common Korean endings and verification checks)
            const isQuestion =
                trimmedInput.includes('?') ||
                trimmedInput.includes('어떻게') || trimmedInput.includes('왜') ||
                trimmedInput.includes('설명') || trimmedInput.includes('방법') ||
                trimmedInput.includes('뭐야') || trimmedInput.includes('무슨') ||
                trimmedInput.includes('했어') || trimmedInput.includes('수행') || // Verification checks
                trimmedInput.endsWith('야') || trimmedInput.endsWith('니') ||
                trimmedInput.endsWith('가') || trimmedInput.endsWith('요') ||
                trimmedInput.endsWith('까') || trimmedInput.endsWith('죠') ||
                trimmedInput.includes('how') || trimmedInput.includes('why') ||
                trimmedInput.includes('what') || trimmedInput.includes('explain');

            if (trimmedInput.includes('시장조사') || trimmedInput.includes('research') || trimmedInput.includes('칩')) {
                simulatorResponse = `안녕하세요! ${projectName} 프로젝트의 성공적인 전략 수립을 위해 시장 조사를 시작합니다.
                
[BLOCK: {"title": "시장 조사 및 현황 분석", "icon": "brain", "status": "running", "content": "1. 국내 시장 점유율 데이터 수집\\n2. 경쟁사 톤앤매너 분석\\n3. 핵심 키워드 도출"}]
                
아래 리서치 도구들을 사용하여 실시간 데이터를 분석하겠습니다. [SEARCH: "2026 테크 트렌드 및 AI 시장 동향"] [SEARCH: "글로벌 소셜 미디어 마케팅 성공 사례"]`;
            } else if (isQuestion) {
                simulatorResponse = `질문하신 내용에 대해 답변 드립니다. [BLOCK: {"title": "전문 데이터 분석", "icon": "robot", "status": "done", "content": "시장조사는 현재 트렌드와 경쟁사 데이터를 분석하여 브랜드에 가장 적합한 키워드와 톤앤매너를 도출하는 과정입니다. 이를 통해 단순한 텍스트 이상의 정교한 전략 수립이 가능합니다."}]
                
이제 이 조사를 바탕으로 콘텐츠 생성을 진행해볼까요?`;
            }

            // Dynamic Project-based Simulator Logic
            const hasProjectMention = lowerInput.includes(projectName.toLowerCase()) ||
                (contentLang === 'ko' && lowerInput.includes('프로젝트'));

            if (hasProjectMention || lowerInput.includes('전략') || lowerInput.includes('strategy')) {
                const contextTag = `[CONTEXT: {"name": "${projectName} Strategy", "content": "Comprehensive content strategy for ${projectName} focusing on current market trends and core values."}]`;

                if (!isQuestion) {
                    simulatorResponse = `${contextTag}
                    
${t('studio.log.orchestrator')}: ${projectName} 프로젝트를 위한 전용 전략 계획을 수립했습니다. 
현재 준비된 컨텍스트:
- 주제: 브랜드 코어 가치 및 시장 트렌드 통합
- 채널: ${state.targetChannels.join(', ').toUpperCase()}

준비가 되셨다면 아래 '선택한 컨텍스트로 시작' 버튼을 눌러 에이전트 팀을 가동해 보세요! [SEARCH: "${projectName} 관련 최신 트렌드"]`;
                } else if (!simulatorResponse) {
                    simulatorResponse = contextTag + "\n\n" + `${projectName} 프로젝트의 세부 전략에 대해 말씀해 주시면 더 정교한 분석이 가능합니다.`;
                }
            } else if (!isQuestion && !simulatorResponse) {
                simulatorResponse = `[CONTEXT: {"name": "Demo Context", "content": "${text}"}]
                
${t('studio.log.orchestrator')}: 입력하신 내용을 바탕으로 컨텍스트를 생성했습니다. 현재 서버 연결이 제한적이지만, 시뮬레이터 모드에서 워크플로우를 계속 테스트하실 수 있습니다. 
아래 버튼을 눌러 AI 에이전트 팀이 이 내용을 어떻게 처리하는지 확인해 보세요.`;
            }

            // Final fallback if somehow nothing matches
            if (!simulatorResponse) {
                simulatorResponse = `${t('studio.log.orchestrator')}: 말씀하신 내용을 이해했습니다. 원활한 테스트를 위해 '시장조사' 칩을 활용하거나, '처음부터 생성하기' 버튼을 눌러보세요. [SEARCH: "최신 소셜 미디어 트렌드"]`;
            }

            // Process Simulator Response
            const cleanMessage = parseAICommands(simulatorResponse);
            addLogEntry(cleanMessage, 'info');

            // Don't show the error if we successfully simulated
            // addLogEntry(t('studio.log.aiOrchestratorFailed'), 'error');
        } finally {
            // Clear Command Bar
            input.value = '';
            input.style.height = 'auto';
            state.attachments = [];
            const previewArea = document.getElementById('command-preview-area');
            if (previewArea) {
                previewArea.innerHTML = '';
                previewArea.style.display = 'none';
            }
            removeAIThinking(); // Final safety clear
            state.isThinking = false;
            updateSmartButtonState('default');
            checkInputState();

            // PROCESS QUEUE if any
            if (state.messageQueue.length > 0) {
                const nextMessage = state.messageQueue.shift();
                setTimeout(() => {
                    const input = document.getElementById('main-instruction-input');
                    if (input) {
                        input.value = nextMessage.text;
                        state.attachments = nextMessage.attachments;
                        // Re-render thumbnails if there are attachments
                        const previewArea = document.getElementById('command-preview-area');
                        if (previewArea && state.attachments.length > 0) {
                            previewArea.innerHTML = '';
                            state.attachments.forEach(att => renderAttachmentThumbnail(att));
                            previewArea.style.display = 'flex';
                        }
                        handleSmartExecute();
                    }
                }, 1000);
            }
        }
    };

    /**
     * Helper: Convert File to Base64
     */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Drag & Drop is initialized globally below line 1680.

    /**
     * Parse and execute commands embedded in AI response
     */
    function parseAICommands(message) {
        let clean = message;

        // --- [CONTEXT] Command ---
        const contextRegex = /\[CONTEXT:\s*(\{.*?\})\s*\]/g;
        let match;
        while ((match = contextRegex.exec(message)) !== null) {
            try {
                const data = JSON.parse(match[1]);
                addLogEntry(t('studio.log.extractedContext').replace('{{name}}', data.name), 'success');

                const newPlan = {
                    id: 'ctx_ai_' + Date.now() + Math.random().toString(36).substr(2, 5),
                    planName: data.name,
                    content: data.content,
                    createdAt: new Date().toISOString()
                };

                if (!window.cachedPlans) window.cachedPlans = [];
                window.cachedPlans.push(newPlan);
                if (typeof updateSourceContextUI === 'function') updateSourceContextUI(window.cachedPlans);
                if (typeof selectSourceContext === 'function') selectSourceContext(newPlan.id);

                // SYNC Briefing Board (Append AI extracted context)
                const briefEntry = `\n### ${data.name}\n${data.content}`;
                syncBriefingBoard(briefEntry, 'append');

                clean = clean.replace(match[0], '');
            } catch (e) {
                console.error('Failed to parse CONTEXT command:', e);
            }
        }

        // --- [SEARCH] Command ---
        const searchRegex = /\[SEARCH:\s*"(.*?)"\s*\]/g;
        while ((match = searchRegex.exec(message)) !== null) {
            const query = match[1];
            addLogEntry(t('studio.log.suggestedMarketResearch').replace('{{query}}', query), 'mcp', {
                tool: t('studio.log.marketResearch'),
                detail: t('studio.log.clickToPerformResearch').replace('{{query}}', query),
                icon: 'target'
            });
            clean = clean.replace(match[0], '');
        }

        // --- [BLOCK] Command (Skywork Card) ---
        const blockRegex = /\[BLOCK:\s*({.*?})\s*\]/g;
        while ((match = blockRegex.exec(message)) !== null) {
            try {
                const data = JSON.parse(match[1]);
                addLogEntry(data.content, 'card', {
                    title: data.title,
                    icon: data.icon,
                    status: data.status
                });
                clean = clean.replace(match[0], '');
            } catch (e) { console.error('Error parsing BLOCK command:', e); }
        }

        return clean.trim();
    }

    // Helper: Update Button Visuals
    window.updateSmartButtonState = function (state) {
        const btn = document.getElementById('btn-send-instruction');
        if (!btn) return;

        if (state === 'loading') {
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 2s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
            btn.classList.add('loading');
        } else if (state === 'regenerate') {
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
            btn.title = t('studio.button.regenerateRefine');
            btn.classList.remove('loading');
        } else {
            // Default Send/Spark
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 2l-7 20-4-9-9-4Z"/><path d="M22 2L11 13"/>
                </svg>
            `;
            btn.classList.remove('loading');
        }
    };

    // Event Listeners
    sendBtn.addEventListener('click', handleSmartExecute);
    input.addEventListener('input', window.checkInputState);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Fix for Korean IME composition duplicating last character
            if (e.isComposing) return;

            e.preventDefault();
            handleSmartExecute();
        }
    });

    // Auto-resize input
    input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // welcome state toggle
    const welcome = document.getElementById('engine-welcome-state');
    if (welcome && streamContainer && streamContainer.children.length > 0) {
        welcome.style.display = 'none';
    }

    // ============================================
    //  MODE SWITCHER LOGIC
    // ============================================
    const modeAgent = document.getElementById('mode-agent-engine');
    const modeSocial = document.getElementById('mode-social-media');

    if (modeAgent && modeSocial) {
        modeAgent.addEventListener('click', () => {
            modeAgent.classList.add('active');
            modeSocial.classList.remove('active');
            addLogEntry(t('studio.log.switchedToOrchestratorMode') || 'Switched to Orchestrator Mode', 'system');

            // Show Chat Interface
            if (streamContainer) {
                const parent = streamContainer.closest('.engine-stream-container');
                if (parent) parent.style.display = 'flex';
            }
        });

        modeSocial.addEventListener('click', () => {
            modeSocial.classList.add('active');
            modeAgent.classList.remove('active');
            addLogEntry(t('studio.log.switchedToSocialMediaMode'), 'system');

            // Future: Switch center panel to Content Calendar/Feed
            // For now, allow viewing but log intended behavior
        });
    }

    // Initialize Drag & Drop for the Command Bar
    if (typeof initDragDrop === 'function') {
        initDragDrop();
    }

    // Initial check
    if (typeof window.checkInputState === 'function') window.checkInputState();
}

/**
 * Enhanced Log Entry for Chat Engine
 * Overrides/Extends the previous simple log
 * @param {string} message - Text content
 * @param {string} type - 'info', 'success', 'error', 'warning', 'system', 'user', 'mcp'
 * @param {object} meta - Optional metadata (e.g., mcp tool details)
 */
function addLogEntry(message, type = 'info', meta = null) {
    // 1. Console Fallback
    console.log(`[${type.toUpperCase()}] ${message}`, meta || '');

    // 2. Chat Stream Renderer (New UI)
    const streamContainer = document.getElementById('chat-stream-log');
    const welcome = document.getElementById('engine-welcome-state');

    if (streamContainer) {
        // Hide welcome message on first log
        if (welcome) welcome.style.display = 'none';

        const msgDiv = document.createElement('div');

        switch (type) {
            case 'user':
                msgDiv.className = 'user-bubble'; // Use bubble for user
                msgDiv.innerHTML = formatMessage(message);
                break;

            case 'mcp': // Special Skywork-style Chip
                msgDiv.className = 'mcp-chip';
                // meta should contain { tool: 'Web Search', detail: 'query...' }
                const toolName = meta?.tool || 'Tool';
                const toolIcon = replaceEmojis(meta?.icon) || studioIcons.mcp;
                const toolDetail = replaceEmojis(meta?.detail || message);

                msgDiv.innerHTML = `
                    <span class="mcp-chip-icon">${toolIcon}</span>
                    <span class="mcp-chip-label">${toolName}</span>
                    <span class="mcp-chip-detail">${toolDetail}</span>
                `;

                // INTERACTIVITY: Handle clicks on chips (e.g., show research details)
                msgDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (toolName.includes('Research') || toolName.includes('조사')) {
                        showMarketResearchDetails(toolDetail);
                    } else {
                        console.log('Clicked MCP Chip:', toolName, toolDetail);
                    }
                });
                break;

            case 'card': // Skywork-style Card/Block
                msgDiv.className = 'studio-card';
                const cardIcon = studioIcons[meta?.icon] || studioIcons.brain;
                const cardTitle = replaceEmojis(meta?.title || 'System Block');
                const cardStatus = meta?.status || 'done';
                const cardContent = formatMessage(message);

                msgDiv.innerHTML = `
                    <div class="studio-card-header">
                        <div class="studio-card-icon">${cardIcon}</div>
                        <div class="studio-card-title">${cardTitle}</div>
                        <div class="studio-card-status ${cardStatus}">${cardStatus.toUpperCase()}</div>
                    </div>
                    <div class="studio-card-body">
                        ${cardContent}
                    </div>
                `;
                break;

            case 'system':
                msgDiv.className = 'msg-system';
                msgDiv.innerHTML = `${studioIcons.system} <strong>${t('studio.log.orchestrator')}:</strong> ${replaceEmojis(message)}`;
                break;

            case 'thinking':
                msgDiv.className = 'thinking-bubble';
                msgDiv.id = 'ai-thinking-state';
                msgDiv.innerHTML = `
                    <div class="thinking-header">
                        <span>${t('studio.log.thinking') || 'Thinking...'}</span>
                        <div class="thinking-dots-container">
                            <div class="thinking-dot active"></div>
                            <div class="thinking-dot"></div>
                            <div class="thinking-dot"></div>
                            <div class="thinking-spinner"></div>
                        </div>
                    </div>
                    <div class="thinking-process-section">
                        <div class="thinking-process-label">${t('studio.log.thinkingProcess') || 'Thinking Process'}</div>
                        <div class="thinking-process-list">
                            <div class="thinking-process-step active">
                                <span class="thinking-step-status"></span>
                                <span class="thinking-step-text">${replaceEmojis(message)}</span>
                            </div>
                        </div>
                        <div class="thinking-process-text">${replaceEmojis(message)}</div>
                    </div>
                `;
                state.currentThinkingBubble = msgDiv;
                break;

            default: // Legacy types (info, success, error) -> Treat as System logs or Notifications
                msgDiv.className = 'msg-system';
                const prefix = studioIcons[type] || studioIcons.info;
                msgDiv.innerHTML = `${prefix} ${formatMessage(message)}`;
                break;
        }

        streamContainer.appendChild(msgDiv);

        // Auto-scroll
        const parent = streamContainer.closest('.engine-stream-container') || streamContainer;
        parent.scrollTop = parent.scrollHeight;

        // START Dot Animation if it's the thinking bubble
        if (type === 'thinking') {
            startThinkingAnimation();
        }

        return;
    }
}

/**
 * AI Thinking UI Animation
 */
function showAIThinking(processText) {
    if (state.currentThinkingBubble) removeAIThinking();
    addLogEntry(processText, 'thinking');
}

function updateAIThinking(newProcessText, status = 'active') {
    if (state.currentThinkingBubble) {
        const listContainer = state.currentThinkingBubble.querySelector('.thinking-process-list');
        if (listContainer) {
            // Check if this text is already in the list to prevent duplicates on rapid calls
            const steps = listContainer.querySelectorAll('.thinking-process-step');
            let alreadyExists = false;
            steps.forEach(s => {
                const stepText = s.querySelector('.thinking-step-text')?.textContent;
                if (stepText === newProcessText) alreadyExists = true;
            });

            if (alreadyExists) return;

            // Mark previous steps as done
            steps.forEach(s => {
                s.classList.remove('active');
                s.classList.add('done');
            });

            // Add new step
            const stepDiv = document.createElement('div');
            stepDiv.className = `thinking-process-step ${status}`;
            stepDiv.innerHTML = `
                <span class="thinking-step-status"></span>
                <span class="thinking-step-text">${newProcessText}</span>
            `;
            listContainer.appendChild(stepDiv);
        }

        // Keep fallback for legacy/safety
        const textEl = state.currentThinkingBubble.querySelector('.thinking-process-text');
        if (textEl) textEl.textContent = newProcessText;
    }
}

function removeAIThinking() {
    if (state.currentThinkingBubble && state.currentThinkingBubble.parentNode) {
        state.currentThinkingBubble.parentNode.removeChild(state.currentThinkingBubble);
    }
    state.currentThinkingBubble = null;
    if (state.thinkingTimer) {
        clearInterval(state.thinkingTimer);
        state.thinkingTimer = null;
    }
}

function startThinkingAnimation() {
    if (state.thinkingTimer) clearInterval(state.thinkingTimer);

    let step = 0;
    state.thinkingTimer = setInterval(() => {
        if (!state.currentThinkingBubble) {
            clearInterval(state.thinkingTimer);
            return;
        }

        const dots = state.currentThinkingBubble.querySelectorAll('.thinking-dot');

        step = (step + 1) % 3; // Cycle 0, 1, 2

        dots.forEach((dot, idx) => {
            if (idx <= step) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Move spinner logic is handled by dots growing and layout, 
        // but we ensure it follows the dots in the DOM.
    }, 1000);
}

/**
 * Show Market Research Details in a Modal
 */
function showMarketResearchDetails(query) {
    const modal = document.getElementById('market-research-modal');
    const title = document.getElementById('research-modal-title');
    const content = document.getElementById('research-modal-content');

    if (!modal || !content) return;

    // Set Title (Clean potential SVG tags from detailed query if any)
    const cleanTitle = query.replace(/<svg[^>]*>.*?<\/svg>/g, '').replace(/"/g, '').trim();
    title.textContent = `${t('studio.log.marketResearch')}: ${cleanTitle}`;

    // SIMULATED DATA
    let simulationHtml = "";
    const isKorean = (localStorage.getItem('zynk-main-language') === 'ko' || localStorage.getItem('zynk-language') === 'ko');

    const projectSelect = document.getElementById('project-select');
    const projectName = projectSelect.options[projectSelect.selectedIndex]?.textContent || 'Project';
    const projectTag = `#${projectName.replace(/\s+/g, '')}`;
    const innovationTag = isKorean ? '#기술혁신' : '#Innovation';

    if (isKorean) {
        simulationHtml = `
            <div style="margin-bottom: 20px; border-left: 3px solid #00FFA3; padding-left: 15px;">
                <h4 style="color: #fff; margin-bottom: 5px;">실시간 리서치 결과 하이라이트</h4>
                <p style="font-size: 14px;">"${query.replace(/"/g, '')}"에 대한 최신 트렌드를 분석했습니다.</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px;">
                    <div style="color: #00FFA3; font-weight: 600; font-size: 13px; margin-bottom: 10px;">타겟 오디언스</div>
                    <ul style="padding-left: 20px; font-size: 13px; margin: 0;">
                        <li>테크 얼리어답터 (20-30대)</li>
                        <li>산업 분야 리더 및 전문가</li>
                        <li>혁신 기술 기반 사업가</li>
                    </ul>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span></span>
                        <span style="font-size: 13px;">긍정적 기대감 (핵심 가치 및 시장성에 대한 관심 급증)</span>
                    </div>
                </div>
            </div>

            <h4 style="color: #fff; margin-bottom: 10px; font-size: 15px;">추천 키워드 전략</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">${projectTag}</span>
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">${innovationTag}</span>
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">#MarketTrend</span>
            </div>
            
            <div id="research-result-summary" style="margin-top: 25px; padding: 15px; background: rgba(0,255,163,0.05); border-radius: 10px; font-size: 13px; color: #fff;">
                <strong style="color: #00FFA3;">에이전트 제안:</strong> 위 데이터를 바탕으로 현재 시장 트렌드와 본 프로젝트의 핵심 가치를 결합하여 독창적인 콘텐츠를 구성하는 것을 추천합니다.
            </div>
        `;
        state.lastResearchSummary = `### 시장 리서치: ${cleanTitle}\n- 타겟: 관련 분야 얼리어답터 및 전문가\n- 여론: 긍정적 기대감 확인\n- 키워드: ${projectTag}, ${innovationTag}\n- 제안: 시장 트렌드와 핵심 가치 통합 전략 수립.`;
    } else {
        simulationHtml = `
            <div style="margin-bottom: 20px; border-left: 3px solid #00FFA3; padding-left: 15px;">
                <h4 style="color: #fff; margin-bottom: 5px;">Direct Intelligence Highlights</h4>
                <p style="font-size: 14px;">Recent trends analyzed for "${query.replace(/"/g, '')}".</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px;">
                    <div style="color: #00FFA3; font-weight: 600; font-size: 13px; margin-bottom: 10px;">Target Audience</div>
                    <ul style="padding-left: 20px; font-size: 13px; margin: 0;">
                        <li>Tech Early Adopters (20s-30s)</li>
                        <li>Industry Leaders & Experts</li>
                    </ul>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span></span>
                        <span style="font-size: 13px;">Positive (Growing interest in core project values)</span>
                    </div>
                </div>
            </div>

            <h4 style="color: #fff; margin-bottom: 10px; font-size: 15px;">Keyword Strategy</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">${projectTag}</span>
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">${innovationTag}</span>
            </div>
            
            <div id="research-result-summary" style="margin-top: 25px; padding: 15px; background: rgba(0,255,163,0.05); border-radius: 10px; font-size: 13px; color: #fff;">
                <strong style="color: #00FFA3;">Agent Suggestion:</strong> Focus on combining market trends with core project positioning.
            </div>
        `;
        state.lastResearchSummary = `### Market Research: ${cleanTitle}\n- Target: Relevant early adopters\n- Sentiment: Positive expectations around innovation.\n- Keywords: ${projectTag}, ${innovationTag}\n- Suggestion: Integrate market trends with unique value propositions.`;
    }

    content.innerHTML = simulationHtml;
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('open');
    });
}

function closeMarketResearchModal() {
    const modal = document.getElementById('market-research-modal');
    if (modal) {
        modal.classList.remove('open');

        // Save research summary to Target Brief
        if (state.lastResearchSummary) {
            console.log('[Studio] Saving research summary to Target Brief...');
            syncBriefingBoard('\n' + state.lastResearchSummary, 'append');
            addLogEntry(t('studio.log.researchInsightsAddedToBrief'), 'success');
            state.lastResearchSummary = null;
        }

        setTimeout(() => {
            if (!modal.classList.contains('open')) {
                modal.style.display = 'none';
            }
        }, 300);
    }
}

window.closeMarketResearchModal = closeMarketResearchModal;

async function loadAgentTeams(projectId) {
    const agentTeamSelect = document.getElementById('agentteam-select');

    console.log('[Studio] Loading agent teams for project:', projectId);

    try {
        //  UNIFIED BRAIN: First check for coreAgentTeamInstanceId on the project
        const projectDoc = await getFirestore().collection('projects').doc(projectId).get();
        if (projectDoc.exists) {
            const projectData = projectDoc.data();
            const coreTeamId = projectData.coreAgentTeamInstanceId;

            if (coreTeamId) {
                console.log('[Studio]  Unified Brain: Auto-loading Core Team:', coreTeamId);

                // Set target channels from project
                state.targetChannels = projectData.targetChannels || ['x'];
                console.log('[Studio] Project Target Channels:', state.targetChannels);

                // Initialize Multi-channel Previews
                renderMultiChannelPreviews();

                // Verify team exists
                const teamDoc = await getFirestore().collection('projectAgentTeamInstances').doc(coreTeamId).get();
                if (teamDoc.exists) {
                    const teamData = teamDoc.data();

                    // Update UI (Team selector is removed from HTML, but we still update state)
                    if (agentTeamSelect) {
                        agentTeamSelect.innerHTML = `<option value="${coreTeamId}" selected>${teamData.name || t('studio.log.coreTeam')}</option>`;
                        agentTeamSelect.value = coreTeamId;
                        agentTeamSelect.disabled = true;
                    }

                    state.selectedAgentTeam = coreTeamId;

                    addLogEntry(t('studio.log.coreTeamAutoLoaded').replace('{{teamName}}', teamData.name || t('studio.log.coreTeam')), 'success');

                    // Auto-load sub-agents
                    await loadSubAgents(coreTeamId);
                    enableStartButton();
                    renderDAGPlaceholder();

                    // Show multi-channel toggle instead of team selector (if needed in sidebar/elsewhere)
                    // showMultiChannelToggle();

                    return; // Skip legacy team loading
                }
            } else {
                // Fallback for projects without core team - reset previews to default or empty
                state.targetChannels = projectData.targetChannels || ['x'];
                renderMultiChannelPreviews();
            }
        }

        // Legacy fallback: Try projectAgentTeamInstances first (old structure)
        let teamsSnapshot = await getFirestore().collection('projectAgentTeamInstances')
            .where('projectId', '==', projectId)
            .get();

        console.log('[Studio] Found', teamsSnapshot.size, 'team instances');

        // Fallback to agentTeams if no instances found
        if (teamsSnapshot.empty) {
            console.log('[Studio] No team instances, trying agentTeams collection...');
            teamsSnapshot = await getFirestore().collection('agentTeams')
                .where('projectId', '==', projectId)
                .get();
            console.log('[Studio] Found', teamsSnapshot.size, 'agent teams');
        }

        agentTeamSelect.innerHTML = '<option value="">Select Agent Team...</option>';

        if (teamsSnapshot.empty) {
            agentTeamSelect.innerHTML = '<option value="" disabled selected> Please create an Agent Team in Admin Settings</option>';
            agentTeamSelect.disabled = false; // Enabled so user can see the message
            return;
        }

        teamsSnapshot.forEach(doc => {
            const team = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = team.name || doc.id;
            agentTeamSelect.appendChild(option);
            console.log('[Studio] Added team:', doc.id, team.name);
        });

        //  UNIFIED BRAIN IMPROVEMENT: Auto-select the first team if none is selected
        if (teamsSnapshot.size > 0 && !state.selectedAgentTeam) {
            const firstTeamId = teamsSnapshot.docs[0].id;
            const firstTeamData = teamsSnapshot.docs[0].data();

            console.log('[Studio]  Auto-selecting first available team:', firstTeamId);

            agentTeamSelect.value = firstTeamId;
            state.selectedAgentTeam = firstTeamId;

            // Auto-load sub-agents for this team
            await loadSubAgents(firstTeamId);
            enableStartButton();
            renderDAGPlaceholder();
            // showMultiChannelToggle();

            addLogEntry(t('studio.log.autoSelectedTeam').replace('{{teamName}}', firstTeamData.name || firstTeamId), 'success');
        }

        addLogEntry(t('studio.log.foundAgentTeams').replace('{{count}}', teamsSnapshot.size), 'info');
        agentTeamSelect.disabled = false;
        if (!state.selectedAgentTeam) {
            agentTeamSelect.classList.add('selection-highlight'); // Only highlight if still nothing selected
        }

    } catch (error) {
        console.error('[Studio] Error loading agent teams:', error);

        // Handle permission errors specifically
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
            agentTeamSelect.innerHTML = '<option value="">No access to this project</option>';
            addLogEntry(t('studio.log.noAccessToProject'), 'error');
        } else {
            agentTeamSelect.innerHTML = '<option value="">Error loading teams</option>';
            addLogEntry(t('studio.log.failedToLoadAgentTeams'), 'error');
        }
        agentTeamSelect.disabled = true;
    }
}

// =====================================================
//  MULTI-CHANNEL TOGGLE UI (Unified Brain)
// =====================================================
function showMultiChannelToggle() {
    return; // Disabled per user request due to UI issues
    // Hide the agent team selector row
    const teamSelectorRow = document.querySelector('.agentteam-select-container, #agentteam-select')?.closest('.selector-row, .studio-selector');
    if (teamSelectorRow) {
        teamSelectorRow.style.display = 'none';
    }

    // Check if toggle already exists
    if (document.getElementById('channel-toggle-container')) return;

    // Create multi-channel toggle UI
    const toggleContainer = document.createElement('div');
    toggleContainer.id = 'channel-toggle-container';
    toggleContainer.className = 'channel-toggle-container';
    toggleContainer.innerHTML = `
        <div class="channel-toggle-header">
            <span class="toggle-icon"></span>
            <span class="toggle-label">${t('studio.label.targetChannels')}</span>
        </div>
        <div class="channel-toggle-grid">
            ${state.availableChannels.map(channel => `
                <label class="channel-toggle-item ${state.targetChannels.includes(channel) ? 'active' : ''}" data-channel="${channel}">
                    <input type="checkbox" 
                           value="${channel}" 
                           ${state.targetChannels.includes(channel) ? 'checked' : ''}>
                    <span class="channel-icon">${getChannelIcon(channel)}</span>
                    <span class="channel-name">${getChannelDisplayName(channel)}</span>
                </label>
            `).join('')}
        </div>
    `;

    // Insert after project selector
    const projectSelectorRow = document.querySelector('#project-select')?.closest('.selector-row, .studio-selector');
    if (projectSelectorRow) {
        projectSelectorRow.insertAdjacentElement('afterend', toggleContainer);
    } else {
        // Fallback: append to sidebar or left panel
        const sidebar = document.querySelector('.studio-sidebar, .sidebar, .studio-panel-left');
        if (sidebar) sidebar.appendChild(toggleContainer);
    }

    // Add event listeners
    toggleContainer.querySelectorAll('.channel-toggle-item input').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const channel = e.target.value;
            const label = e.target.closest('.channel-toggle-item');

            if (e.target.checked) {
                if (!state.targetChannels.includes(channel)) {
                    state.targetChannels.push(channel);
                }
                label.classList.add('active');
            } else {
                // Prevent unchecking if it's the last one
                if (state.targetChannels.length <= 1) {
                    e.target.checked = true;
                    addLogEntry(t('studio.log.atLeastOneChannel'), 'warning');
                    return;
                }
                state.targetChannels = state.targetChannels.filter(c => c !== channel);
                label.classList.remove('active');
            }

            addLogEntry(t('studio.log.targetChannels').replace('{{channels}}', state.targetChannels.join(', ')), 'info');
            updateChannelStats();
            if (typeof window.renderChannelTabs === 'function') {
                window.renderChannelTabs();
            }
        });
    });
}

function getChannelIcon(channel) {
    // Try to get icon from cached Firestore data first
    if (window.ChannelProfilesUtils && window.ChannelProfilesUtils._cache) {
        const profile = window.ChannelProfilesUtils._cache.find(c => c.key === channel);
        if (profile && profile.icon) {
            return profile.icon;
        }
    }

    // Fallback to inline SVG icons (no emojis!)
    const svgIcons = {
        'x': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
        'instagram': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
        'linkedin': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
        'facebook': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
        'youtube': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
        'tiktok': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
        'naver_blog': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#03C75A"><path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/></svg>',
        'naver_smart_store': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#03C75A"><path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/></svg>',
        'naver_map': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#03C75A"><path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/></svg>',
        'pinterest': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#E60023"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>',
        'reddit': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>',
        'threads': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.108-1.152 3.457-1.191 1.122-.032 2.181.15 3.152.544-.01-.663-.141-1.2-.392-1.599-.336-.532-.924-.836-1.745-.909-1.598-.14-2.632.456-3.07.886l-1.326-1.54c.787-.677 2.256-1.471 4.503-1.278 1.379.119 2.478.619 3.266 1.485.774.85 1.166 1.968 1.166 3.322v.238c1.108.672 1.953 1.56 2.474 2.6.745 1.485.818 3.584-.69 6.027-1.907 3.09-5.293 3.824-8.227 3.843z"/><path d="M12.297 13.564c-.906.026-1.644.242-2.133.625-.47.369-.68.833-.658 1.42.019.485.242.932.628 1.257.424.357.984.55 1.578.55.05 0 .1-.001.15-.004.921-.05 1.65-.379 2.168-1.022.431-.537.703-1.228.806-2.05-.81-.282-1.684-.436-2.539-.436z"/></svg>',
        'snapchat': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFC00"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.501.054.027.118.05.198.07.472.117.757.29.99.618.348.49.357 1.133.027 1.697-.17.29-.412.51-.698.69-.138.087-.287.157-.435.218-.127.053-.263.1-.404.14-.02.158-.03.323-.03.49 0 .189.013.382.04.578.096.688.456 1.364.918 2.194.17.307.343.615.523.94.18.322.391.707.566 1.117.283.661.343 1.22.178 1.684-.205.578-.74.95-1.39 1.1-.358.083-.763.128-1.166.128-.227 0-.453-.016-.674-.053-.38-.062-.739-.185-1.094-.381a6.21 6.21 0 0 1-.405-.249 4.96 4.96 0 0 0-.694-.408 4.056 4.056 0 0 0-1.09-.342c-.22-.036-.445-.067-.67-.105-.145.252-.282.51-.402.778-.24.532-.4 1.084-.478 1.643-.08.576-.027 1.054.153 1.381.127.229.304.389.54.49.42.178.862.262 1.447.262.247 0 .506-.017.766-.04l.14-.012c.207-.018.428-.038.64-.038.213 0 .428.02.64.07.21.05.408.127.592.232.185.105.357.236.51.39.152.153.287.323.402.508.115.185.21.386.285.6.075.214.131.442.165.68.034.24.047.49.04.75-.007.26-.04.53-.102.81a5.8 5.8 0 0 1-.234.76 6.93 6.93 0 0 1-.327.68 7.13 7.13 0 0 1-.42.61H3.07a7.13 7.13 0 0 1-.42-.61c-.111-.21-.22-.44-.326-.69a5.8 5.8 0 0 1-.235-.76 3.93 3.93 0 0 1-.102-.81 3.45 3.45 0 0 1 .04-.75c.034-.238.09-.466.165-.68.075-.214.17-.415.285-.6.115-.185.25-.355.402-.508.153-.154.325-.285.51-.39.185-.105.383-.182.593-.232.212-.05.427-.07.64-.07.212 0 .433.02.64.038l.14.012c.26.023.519.04.766.04.585 0 1.027-.084 1.447-.262.236-.101.413-.261.54-.49.18-.327.233-.805.153-1.381a5.893 5.893 0 0 0-.478-1.643 9.76 9.76 0 0 0-.402-.778c-.225.038-.45.069-.67.105a4.056 4.056 0 0 0-1.09.342 4.96 4.96 0 0 0-.694.408c-.13.083-.267.166-.405.249-.355.196-.713.319-1.094.381a4.24 4.24 0 0 1-.674.053c-.403 0-.808-.045-1.166-.128-.65-.15-1.185-.522-1.39-1.1-.165-.464-.105-1.023.178-1.684.175-.41.386-.795.566-1.117.18-.325.354-.633.523-.94.462-.83.822-1.506.918-2.194.027-.196.04-.389.04-.578 0-.167-.01-.332-.03-.49a4.178 4.178 0 0 1-.404-.14 2.64 2.64 0 0 1-.435-.218 1.553 1.553 0 0 1-.698-.69c-.33-.564-.32-1.207.027-1.697.233-.328.518-.501.99-.618.08-.02.144-.043.198-.07a19.12 19.12 0 0 1-.03-.501l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.859 1.069 11.216.793 12.206.793z"/></svg>',
        'discord': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
        'telegram': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#26A5E4"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
        'medium': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>',
        'coupang': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#E31837"><rect x="2" y="2" width="20" height="20" rx="4"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">C</text></svg>',
        'tmap': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#1B64DA"><rect x="2" y="2" width="20" height="20" rx="4"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="bold">T</text></svg>',
        'kakao_navi': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#FEE500"><rect x="2" y="2" width="20" height="20" rx="4"/><path fill="#3C1E1E" d="M12 6c-3.314 0-6 2.239-6 5 0 1.762 1.156 3.308 2.906 4.195l-.74 2.735c-.045.166.146.302.288.205l3.1-2.16c.148.011.296.025.446.025 3.314 0 6-2.239 6-5s-2.686-5-6-5z"/></svg>',
        'kakao_map': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#FEE500"><rect x="2" y="2" width="20" height="20" rx="4"/><path fill="#3C1E1E" d="M12 6c-3.314 0-6 2.239-6 5 0 1.762 1.156 3.308 2.906 4.195l-.74 2.735c-.045.166.146.302.288.205l3.1-2.16c.148.011.296.025.446.025 3.314 0 6-2.239 6-5s-2.686-5-6-5z"/></svg>'
    };
    return svgIcons[channel] || svgIcons['medium'];
}

/**
 * Updates the UI list of source context plans
 * @param {Array} plans - The context plans from Knowledge Hub
 */
function updateSourceContextUI(plans) {
    const sourceDisplay = document.getElementById('source-context-display');
    if (!sourceDisplay) return;

    // Header for Direct Input (Default)
    let html = `
        <div class="source-item active" onclick="selectSourceContext('manual')" style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(139, 92, 246, 0.1); border: 1px solid #8B5CF6; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
            <input type="radio" name="source_context_selection" value="manual" checked style="accent-color: #8B5CF6; cursor: pointer;">
            <div style="flex:1; min-width:0;">
                <div style="color: #fff; font-size: 13px; font-weight: 500;">${t('studio.sourceContext.directInput')}</div>
            </div>
        </div>
    `;

    if (plans && plans.length > 0) {
        plans.forEach(plan => {
            const planName = plan.planName || plan.title || t('studio.sourceContext.untitledPlan');
            // Clean content for preview (remove markdown, html)
            const rawContent = plan.content || plan.planContent || '';
            let shortContent = String(typeof rawContent === 'object' ? JSON.stringify(rawContent) : rawContent).replace(/<[^>]*>?/gm, '');
            shortContent = shortContent.substring(0, 40) + (shortContent.length > 40 ? '...' : '');

            // Format Date
            let dateStr = '';
            if (plan.createdAt) {
                try {
                    // Handle Firestore Timestamp or ISO String
                    const date = plan.createdAt.toDate ? plan.createdAt.toDate() : new Date(plan.createdAt);
                    dateStr = date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
                } catch (e) { dateStr = ''; }
            }

            html += `
                <div class="source-item" onclick="selectSourceContext('${plan.id}')" style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer; transition: all 0.2s; margin-top: 8px; position: relative; group">
                    <input type="radio" name="source_context_selection" value="${plan.id}" style="accent-color: #8B5CF6; cursor: pointer;">
                    <div style="flex:1; min-width:0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="color: #eee; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;">${planName}</div>
                            <div style="color: #666; font-size: 10px; margin-right: 24px;">${dateStr}</div>
                        </div>
                        <div style="color: #888; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">${shortContent}</div>
                    </div>
                    
                    <!-- Merge Button -->
                    <button onclick="mergeSourceContext('${plan.id}', event)" title="${t('studio.sourceContext.mergeContext')}"
                        style="position: absolute; right: 32px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: #666; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s; z-index: 2;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none; color: #00FFA3;">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>

                    <!-- Delete Button -->
                    <button onclick="deleteSourceContext('${plan.id}', event)" title="${t('studio.sourceContext.removeContext')}"
                        style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: #666; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s; z-index: 2;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;
        });
    }

    sourceDisplay.innerHTML = html;
    window.cachedPlans = plans;
}

/**
 * Merges a historical context into the current Target Brief
 */
window.mergeSourceContext = function (planId, event) {
    if (event) event.stopPropagation();

    const plan = (window.cachedPlans || []).find(p => p.id === planId);
    if (!plan) return;

    const content = plan.content || plan.planContent || plan.adCopy || "";
    if (!content) return;

    const mergeText = `\n\n--- [Merged: ${plan.planName || plan.title}] ---\n${content}`;
    syncBriefingBoard(mergeText, 'append');
    addLogEntry(`Merged context: ${plan.planName || plan.title}`, 'success');
};

/**
 * Delete a specific source context plan
 */
window.deleteSourceContext = async function (planId, event) {
    if (event) {
        event.stopPropagation(); // Prevent selection
    }

    if (!confirm(t('studio.alert.confirmDeleteContext'))) return;

    // Remove from local state
    if (window.cachedPlans) {
        window.cachedPlans = window.cachedPlans.filter(p => p.id !== planId);
    }

    // Refresh UI
    updateSourceContextUI(window.cachedPlans);

    // If it was selected, revert to Manual
    const currentSelected = document.querySelector('input[name="source_context_selection"]:checked');
    if (!currentSelected || currentSelected.value === planId) {
        selectSourceContext('manual');
    }

    // Optional: Delete from Firestore if it exists there
    // For now, we only remove from the UI list as requested for "Analysis Result" types mostly.
    // If we want DB deletion, we'd add db.collection(...).doc(planId).delete().
};

/**
 * Handle Source Selection
 */
window.selectSourceContext = function (planId) {
    // Update radio button
    const radio = document.querySelector(`input[name="source_context_selection"][value="${planId}"]`);
    if (radio) radio.checked = true;

    // Visual updates
    document.querySelectorAll('.source-item').forEach(item => {
        item.classList.remove('active');
        item.style.borderColor = 'rgba(255,255,255,0.1)';
        item.style.background = 'rgba(255,255,255,0.05)';
    });

    if (radio) {
        const activeItem = radio.closest('.source-item');
        if (activeItem) {
            activeItem.classList.add('active');
            activeItem.style.borderColor = '#8B5CF6';
            activeItem.style.background = 'rgba(139, 92, 246, 0.1)';
        }
    }

    // Logic updates
    if (planId === 'manual') {
        state.planContext = null;
        const mainInput = document.getElementById('main-instruction-input');
        if (mainInput) mainInput.placeholder = t('studio.input.directPlaceholder');

        // Update Welcome Message for Direct Input Guidance
        const welcomeTitle = document.querySelector('#engine-welcome-state h3');
        const welcomeSub = document.querySelector('#engine-welcome-state p');
        const welcomeContainer = document.getElementById('engine-welcome-state');

        if (welcomeTitle) welcomeTitle.textContent = t('studio.welcome.directTitle');
        if (welcomeSub) welcomeSub.textContent = t('studio.welcome.directSubtitle');
        if (welcomeContainer) welcomeContainer.style.display = 'block'; // Show if hidden
        // SYNC Briefing Board (Clear)
        syncBriefingBoard('', 'replace');

        // Reset Global Start Button for Manual Input
        const startBtn = document.getElementById('btn-send-instruction');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
                ${t('studio.button.generateFromScratch')}
            `;
            startBtn.style.background = '#3B82F6'; // Blue for manual
        }

        addLogEntry(t('studio.log.switchedToDirectInput'), 'info');
    } else {
        const plan = window.cachedPlans?.find(p => p.id === planId);
        if (plan) {
            state.planContext = {
                planName: plan.planName || plan.title,
                content: plan.content || plan.planContent || plan.adCopy // Fallback structure
            };
            addLogEntry(t('studio.log.contextLoaded').replace('{{name}}', state.planContext.planName), 'success');
            // SYNC Briefing Board
            syncBriefingBoard(state.planContext.content, 'replace');
        }
    }
};


// ============================================
// UI INTERACTION: Attachment Menu
// ============================================
// DOM Content Loaded is handled above for toggleAttachmentMenu

// ============================================
// DRAG AND DROP SUPPORT
// ============================================
const dropArea = document.getElementById('command-bar');
if (dropArea) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('drag-over'), false);
    });

    dropArea.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            // Group by type
            const images = files.filter(f => f.type.startsWith('image/'));
            const nonImages = files.filter(f => !f.type.startsWith('image/'));

            if (images.length > 0) handleFileSelection({ files: images }, 'image');
            if (nonImages.length > 0) handleFileSelection({ files: nonImages }, 'file');
        }
    }, false);
}

/**
 * Image Lightbox Functions
 */
window.openLightbox = function (url) {
    const lightbox = document.getElementById('image-lightbox');
    const img = document.getElementById('lightbox-img');
    if (lightbox && img) {
        img.src = url;
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeLightbox = function () {
    const lightbox = document.getElementById('image-lightbox');
    if (lightbox) {
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
    }
};

// ============================================
// 🖇️ COMMAND BAR: ATTACHMENT & DRAG-DROP
// ============================================

window.toggleAttachmentMenu = function () {
    const menu = document.getElementById('attachment-menu');
    const btn = document.getElementById('btn-toggle-attachments');
    if (menu && btn) {
        const isVisible = menu.style.display === 'block';
        menu.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            btn.classList.add('active');
            // Close on click outside
            const closeMenu = (e) => {
                if (!menu.contains(e.target) && !btn.contains(e.target)) {
                    menu.style.display = 'none';
                    btn.classList.remove('active');
                    document.removeEventListener('click', closeMenu);
                }
            };
            setTimeout(() => document.addEventListener('click', closeMenu), 10);
        } else {
            btn.classList.remove('active');
        }
    }
};

window.triggerAttachment = function (type) {
    // Hide menu first
    const menu = document.getElementById('attachment-menu');
    const btn = document.getElementById('btn-toggle-attachments');
    if (menu) menu.style.display = 'none';
    if (btn) btn.classList.remove('active');

    if (type === 'image') {
        const fileInput = document.getElementById('input-image-upload');
        if (fileInput) fileInput.click();
    } else if (type === 'file') {
        const fileInput = document.getElementById('input-file-upload');
        if (fileInput) fileInput.click();
    } else if (type === 'mention') {
        const textarea = document.getElementById('main-instruction-input'); // Target main-instruction-input
        if (textarea) {
            textarea.value += '@';
        }
    }
    addLogEntry(`📎 ${t('studio.log.actionTriggered').replace('{{type}}', type)}`, 'info');
};

// State for attachments
state.attachments = [];
state.messageQueue = []; // Initialize message queue

window.handleFileSelection = function (input, type) {
    if (!input.files || input.files.length === 0) return;
    console.log('[Studio] Selection:', input.files.length, 'files of type', type);

    const newFiles = Array.from(input.files);
    const currentCount = state.attachments.length;

    if (currentCount + newFiles.length > state.maxFiles) {
        addLogEntry(t('studio.log.maxAttachments').replace('{{count}}', state.maxFiles), 'warning');
        return;
    }

    newFiles.forEach(file => {
        const attachment = {
            id: 'att_' + Date.now() + Math.random().toString(36).substr(2, 9),
            file: file,
            type: type,
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file)
        };
        state.attachments.push(attachment);
        renderAttachmentThumbnail(attachment);
        addLogEntry(t('studio.log.addedFile').replace('{{name}}', file.name), 'info');
    });

    input.value = '';
    const previewArea = document.getElementById('command-preview-area');
    if (previewArea) previewArea.style.display = 'flex';
    checkInputState();
};

function renderAttachmentThumbnail(attachment) {
    const previewArea = document.getElementById('command-preview-area');
    if (!previewArea) return;

    const thumb = document.createElement('div');
    thumb.className = 'att-thumbnail';
    thumb.id = attachment.id;
    thumb.style.cssText = `
        position: relative;
        width: 64px;
        height: 64px;
        border-radius: 8px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    // Inner Content (Image or Icon)
    if (attachment.type === 'image') {
        const img = document.createElement('img');
        img.src = attachment.url;
        img.style.cssText = "width:100%; height:100%; object-fit:cover; cursor: zoom-in;";
        img.title = "Click to enlarge";
        img.onclick = () => openLightbox(attachment.url);
        thumb.appendChild(img);
    } else {
        // File Icon - Updated with proper SVG sizing for thumbnails
        const iconHtml = studioIcons.document.replace('width="14"', 'width="24"').replace('height="14"', 'height="24"');
        thumb.innerHTML = `<span style="display: flex; align-items: center; justify-content: center;">${iconHtml}</span>`;
    }

    // Delete Button (X)
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '×';
    delBtn.style.cssText = `
        position: absolute;
        top: 2px;
        right: 2px;
        width: 16px;
        height: 16px;
        background: rgba(0,0,0,0.6);
        color: white;
        border: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        cursor: pointer;
        line-height: 1;
    `;
    delBtn.onclick = (e) => {
        e.stopPropagation();
        removeAttachment(attachment.id);
    };
    thumb.appendChild(delBtn);

    previewArea.appendChild(thumb);
}

function removeAttachment(id) {
    const thumb = document.getElementById(id);
    if (thumb) thumb.remove();

    state.attachments = state.attachments.filter(a => a.id !== id);

    // Hide preview area if last attachment removed
    if (state.attachments.length === 0) {
        const previewArea = document.getElementById('command-preview-area');
        if (previewArea) previewArea.style.display = 'none';
    }

    if (typeof window.checkInputState === 'function') window.checkInputState();
}

// Drag & Drop Setup for Command Bar
function initDragDrop() {
    const dropZone = document.getElementById('command-bar');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('dragenter', () => dropZone.style.borderColor = '#3B82F6');
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'rgba(255, 255, 255, 0.1)');
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        dropZone.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        const dt = e.dataTransfer;
        const files = dt.files;

        // Mock input object for handleFileSelection
        handleFileSelection({ files: files }, 'file'); // Default to file type
    }
}

// ============================================
// 🎙️ VOICE INPUT (STT) - Command Bar Integrated
// ============================================
let recognition = null;
let isRecording = false;
window.currentVoiceLang = 'ko-KR'; // Default

window.setVoiceLanguage = function (lang) {
    if (!lang) return;
    window.currentVoiceLang = lang;
    addLogEntry(`🌐 ${t('studio.log.voiceLanguageSet').replace('{{lang}}', lang)}`, 'info');

    // If recording, restart to apply new language
    if (isRecording && recognition) {
        recognition.stop();
        setTimeout(() => window.toggleVoiceInput(), 500); // Restart
    }
};

window.toggleVoiceInput = function () {
    const btn = document.getElementById('btn-voice-input');
    const textarea = document.getElementById('main-instruction-input'); // Target main-instruction-input

    if (!('webkitSpeechRecognition' in window)) {
        alert(t('studio.log.voiceNotSupported'));
        return;
    }

    if (!recognition) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true; // Allow long dictation
        recognition.interimResults = true; // Show real-time results

        recognition.onstart = () => {
            isRecording = true;
            if (btn) {
                btn.style.color = '#EF4444';
                btn.classList.add('animate-pulse');
            }
            addLogEntry(t('studio.log.recordingStarted').replace('{{lang}}', window.currentVoiceLang), 'info');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed') {
                isRecording = false;
                if (btn) {
                    btn.style.color = '#888';
                    btn.classList.remove('animate-pulse');
                }
                alert(t('studio.log.micAccessDenied'));
            } else if (event.error === 'no-speech') {
                addLogEntry(t('studio.log.noSpeechDetected'), 'warning');
            }
            isRecording = false;
            if (btn) {
                btn.style.color = '#888';
                btn.classList.remove('animate-pulse');
            }
        };

        recognition.onend = () => {
            if (isRecording) {
                isRecording = false;
            }
            if (btn) {
                btn.style.color = '#888';
                btn.classList.remove('animate-pulse');
            }
            addLogEntry(t('studio.log.recordingStopped'), 'info');
        };

        let currentInterimTranscript = ''; // To manage interim results

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            if (textarea) {
                // Remove previous interim text if any
                const currentText = textarea.value;
                const textWithoutInterim = currentText.endsWith(currentInterimTranscript)
                    ? currentText.substring(0, currentText.length - currentInterimTranscript.length)
                    : currentText;

                if (final) {
                    textarea.value = textWithoutInterim + (textWithoutInterim ? ' ' : '') + final;
                    currentInterimTranscript = ''; // Reset interim after a final result
                } else if (interim) {
                    textarea.value = textWithoutInterim + (textWithoutInterim ? ' ' : '') + interim;
                    currentInterimTranscript = interim;
                }
                textarea.scrollTop = textarea.scrollHeight; // Auto-scroll
            }
        };
    }

    if (isRecording) {
        recognition.stop();
        isRecording = false; // Ensure state is updated
        return;
    }

    // ALWAYS update language before starting
    recognition.lang = window.currentVoiceLang || 'ko-KR';
    recognition.start();
};

// ============================================
// ELASTIC LAYOUT INTERACTION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const leftPanel = document.querySelector('.studio-panel-left');
    const mainContainer = document.querySelector('.studio-main');

    if (leftPanel && mainContainer) {
        // Expand on click inside left panel
        // Use capturing or bubbling? Bubbling is fine.
        // We want to detect ANY click inside.
        leftPanel.addEventListener('click', (e) => {
            // Click inside left panel triggers expansion
            if (!mainContainer.classList.contains('left-expanded')) {
                mainContainer.classList.add('left-expanded');
            }
            // Bubbling continues, but we need to stop it from reaching document listener?
            // Yes, otherwise document listener immediately removes it.
            e.stopPropagation();
        });

        // Close when clicking outside (Center/Right panels)
        document.addEventListener('click', (event) => {
            // If mainContainer has the class, and click is NOT inside leftPanel
            if (mainContainer.classList.contains('left-expanded') && !leftPanel.contains(event.target)) {
                mainContainer.classList.remove('left-expanded');
            }
        });

        // Also ensure specific panels reset it
        const otherPanels = document.querySelectorAll('.studio-panel-center, .studio-panel-right, .studio-header');
        otherPanels.forEach(panel => {
            panel.addEventListener('click', () => {
                mainContainer.classList.remove('left-expanded');
            });
        });
    }
});

// ============================================
// CONTEXT IMPORT FEATURE
// ============================================
window.showContextImportModal = async function () {
    // 1. Create Modal HTML if not exists
    let modal = document.getElementById('context-import-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'context-import-modal';
        modal.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                <div style="width: 500px; max-height: 80vh; background: #1e1e1e; border: 1px solid #333; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    <div style="padding: 16px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: #fff; font-size: 16px; font-weight: 600;">Import from Knowledge Base</h3>
                        <button onclick="document.getElementById('context-import-modal').style.display='none'" style="background: none; border: none; color: #888; cursor: pointer; font-size: 20px;">×</button>
                    </div>
                    <div id="import-list-container" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="text-align: center; color: #666; padding: 20px;">Loading assets...</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.style.display = 'flex';
    }

    // 2. Fetch "Asset" type plans from Firestore
    const listContainer = document.getElementById('import-list-container');
    listContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Loading assets...</div>';

    try {
        if (!currentProjectId) throw new Error("No project selected");

        // Fetch recent contexts to simulate "Asset References" 
        // In a real scenario, this would filter by type='asset' or look into a specific 'knowledge' collection
        // For now, we list ALL recent content plans as potential "Reference Assets".
        const snapshot = await getFirestore().collection('projects').doc(currentProjectId)
            .collection('contentPlans')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const assets = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            assets.push({ id: doc.id, ...data });
        });

        if (assets.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No contexts found.</div>';
            return;
        }

        // Render List
        let html = '';
        assets.forEach(asset => {
            const name = asset.planName || asset.title || 'Untitled';

            // Safe date handling
            let dateStr = '';
            try {
                const d = asset.createdAt ? (asset.createdAt.toDate ? asset.createdAt.toDate() : new Date(asset.createdAt)) : new Date();
                dateStr = d.toLocaleDateString();
            } catch (e) { dateStr = 'Unknown Date'; }

            html += `
                <div onclick="importContext('${asset.id}')" 
                    style="padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; background: rgba(139, 92, 246, 0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #a78bfa;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div style="flex: 1;">
                        <div style="color: #eee; font-size: 14px; font-weight: 500;">${name}</div>
                        <div style="color: #666; font-size: 12px;">${dateStr}</div>
                    </div>
                    <div style="color: #888; font-size: 20px;">+</div>
                </div>
            `;
        });
        listContainer.innerHTML = html;

    } catch (e) {
        console.error("Error loading assets:", e);
        listContainer.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 20px;">Failed to load assets.</div>';
    }
};

window.importContext = function (assetId) {
    // 1. Close Modal
    document.getElementById('context-import-modal').style.display = 'none';

    // 2. Fetch the plan data
    getFirestore().collection('projects').doc(currentProjectId).collection('contentPlans').doc(assetId).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const importedPlan = { id: doc.id, ...data };

                // Add to cache if not exists
                if (!window.cachedPlans) window.cachedPlans = [];

                // Remove if duplicate to move to top
                window.cachedPlans = window.cachedPlans.filter(p => p.id !== assetId);

                // Unshift to top
                window.cachedPlans.unshift(importedPlan);

                // Update UI
                updateSourceContextUI(window.cachedPlans);

                // SYNC Briefing Board
                syncBriefingBoard(data.content || '', 'replace');

                // Auto Select
                selectSourceContext(assetId);

                addLogEntry(t('studio.log.contextLoaded').replace('{{name}}', data.planName || 'Untitled'), 'success');
            }
        });
};

/**
 * ============================================
 * 🎯 TARGET BRIEF (FINAL CONTEXT) MANAGEMENT
 * ============================================
 */

function initBriefingBoard() {
    const editor = document.getElementById('final-context-editor');
    const clearBtn = document.getElementById('btn-clear-brief');
    const charCount = document.getElementById('brief-char-count');
    const titleSpan = document.querySelector('.briefing-section .panel-title');
    const syncIndicator = document.getElementById('brief-sync-indicator');

    if (!editor) return;

    // Localize
    if (titleSpan) titleSpan.innerHTML = `<span style="color: #00FFA3;">🎯</span> ${t('studio.brief.title')}`;
    if (editor) editor.placeholder = t('studio.brief.placeholder');
    if (syncIndicator) syncIndicator.textContent = t('studio.brief.synced');

    // 1. Sync Text -> State
    editor.addEventListener('input', () => {
        const text = editor.value;
        if (state.planContext) {
            state.planContext.content = text;
        } else {
            state.planContext = {
                planName: 'Manual Brief',
                content: text
            };
        }

        // Update character count
        if (charCount) {
            charCount.textContent = t('studio.brief.charCount').replace('{{count}}', text.length);
        }
    });

    // 2. Clear Brief
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm(t('studio.brief.clearConfirm'))) {
                editor.value = '';
                state.planContext = null;
                if (charCount) charCount.textContent = t('studio.brief.charCount').replace('{{count}}', 0);
                addLogEntry(t('studio.brief.cleared'), 'info');
            }
        });
    }

    console.log('[Studio] Briefing Board initialized.');
}

/**
 * Sync logic to update the Briefing Board from external sources
 * @param {string} content - The textual content to set
 * @param {string} mode - 'replace' or 'append'
 */
function syncBriefingBoard(content, mode = 'replace') {
    const editor = document.getElementById('final-context-editor');
    const indicator = document.getElementById('brief-sync-indicator');
    const charCount = document.getElementById('brief-char-count');

    if (!editor) return;

    if (mode === 'append' && editor.value.trim() !== '') {
        editor.value += "\n\n" + content;
    } else {
        editor.value = content;
    }

    // Update character count
    if (charCount) {
        charCount.textContent = `${editor.value.length} characters`;
    }

    // Visual Feedback (Flash Synced Indicator)
    if (indicator) {
        indicator.style.opacity = '1';
        indicator.classList.remove('sync-active');
        void indicator.offsetWidth; // Trigger reflow
        indicator.classList.add('sync-active');

        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    }

    // Scroll to bottom if appending
    if (mode === 'append') {
        editor.scrollTop = editor.scrollHeight;
    }
}

// Make globally accessible
window.syncBriefingBoard = syncBriefingBoard;

/**
 * =====================================================
 * [PROACTIVE] Load and Analyze Target Brief
 * =====================================================
 * 1. Load Knowledge Hub sources for the project
 * 2. Merge them into a Target Brief
 * 3. Analyze brief quality using AI
 * 4. Proactively suggest what additional materials are needed
 */
async function loadAndAnalyzeTargetBrief(projectId, projectName) {
    if (!projectId) return;

    const firestore = getFirestore();
    if (!firestore) return;

    const contentLang = window.zynk_main_lang || 'en';
    const isKorean = contentLang === 'ko';

    try {
        // 1. Load Knowledge Hub sources
        addLogEntry(isKorean ? '컨텍스트 추출 중: 프로젝트 정보' : 'Context Extraction: Loading project info', 'info');

        const sourcesSnapshot = await firestore.collection('projects').doc(projectId)
            .collection('sources')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const sources = [];
        sourcesSnapshot.forEach(doc => {
            sources.push({ id: doc.id, ...doc.data() });
        });

        // 2. Merge sources into Target Brief
        let briefContent = '';
        let sourceTypes = new Set();

        if (sources.length > 0) {
            sources.forEach(src => {
                sourceTypes.add(src.type || 'document');
                if (src.content || src.summary) {
                    briefContent += `### ${src.title || src.name || 'Source'}\n`;
                    briefContent += (src.content || src.summary) + '\n\n';
                }
            });

            addLogEntry(isKorean
                ? `Context loaded: ${sources.length}개 소스 로드 완료`
                : `Context loaded: Loaded ${sources.length} sources`, 'success');

            syncBriefingBoard(briefContent.trim(), 'replace');
        }

        // 3. Analyze brief quality and identify gaps
        await analyzeBriefQuality(projectId, projectName, briefContent, sources, sourceTypes);

    } catch (error) {
        console.warn('[Studio] Error loading Target Brief:', error);
        addLogEntry(isKorean
            ? 'Knowledge Hub 연결 대기 중...'
            : 'Waiting for Knowledge Hub connection...', 'info');
    }
}

/**
 * [PROACTIVE - STRATEGIC_INSIGHT] Analyze Brief Quality and Suggest Improvements
 */
async function analyzeBriefQuality(projectId, projectName, briefContent, sources, sourceTypes) {
    const contentLang = window.zynk_main_lang || 'en';
    const isKorean = contentLang === 'ko';

    // Quality metrics
    const metrics = {
        sourceCount: sources.length,
        charCount: briefContent.length,
        hasMarketData: /market|시장|경쟁|competitor/i.test(briefContent),
        hasBrandInfo: /brand|브랜드|identity|아이덴티티/i.test(briefContent),
        hasAudienceInfo: /audience|타겟|target|고객|customer/i.test(briefContent),
        hasToneGuide: /tone|톤앤매너|voice|스타일/i.test(briefContent),
        hasGoals: /goal|목표|objective|KPI/i.test(briefContent)
    };

    // Determine missing elements
    const missingElements = [];

    if (!metrics.hasBrandInfo) {
        missingElements.push({
            topic: isKorean ? '브랜드 정보' : 'Brand Information',
            description: isKorean
                ? '브랜드 아이덴티티, 핵심 가치, 차별화 포인트'
                : 'Brand identity, core values, differentiation points',
            suggestedType: 'document'
        });
    }

    if (!metrics.hasAudienceInfo) {
        missingElements.push({
            topic: isKorean ? '타겟 오디언스' : 'Target Audience',
            description: isKorean
                ? '주요 고객층 프로파일, 페르소나, 니즈 분석'
                : 'Customer profiles, personas, needs analysis',
            suggestedType: 'document'
        });
    }

    if (!metrics.hasMarketData) {
        missingElements.push({
            topic: isKorean ? '시장 데이터' : 'Market Data',
            description: isKorean
                ? '시장 트렌드, 경쟁사 분석, 산업 동향'
                : 'Market trends, competitor analysis, industry insights',
            suggestedType: 'web_link'
        });
    }

    if (!metrics.hasToneGuide) {
        missingElements.push({
            topic: isKorean ? '톤앤매너 가이드' : 'Tone & Manner Guide',
            description: isKorean
                ? '브랜드 보이스, 커뮤니케이션 스타일'
                : 'Brand voice, communication style guidelines',
            suggestedType: 'document'
        });
    }

    if (!metrics.hasGoals) {
        missingElements.push({
            topic: isKorean ? '캠페인 목표' : 'Campaign Goals',
            description: isKorean
                ? 'KPI, 성과 지표, 달성하고자 하는 결과'
                : 'KPIs, success metrics, desired outcomes',
            suggestedType: 'note'
        });
    }

    // Brief is insufficient - Start conversational onboarding
    if (metrics.charCount < 200 || missingElements.length >= 3) {
        // [PROACTIVE] Step 1: Project Confirmation Card
        const cardTitle = isKorean ? '프로젝트 이름 확인' : 'Project Name Confirmed';
        const projectInfo = isKorean
            ? `사용자가 제시한 프로젝트는 "**${projectName}**" 입니다. 이는 우리가 구축할 "Target Brief"의 핵심 주제입니다.`
            : `The project you selected is "**${projectName}**". This will be the core subject of the Target Brief we'll build together.`;

        addLogEntry(projectInfo, 'card', {
            title: cardTitle,
            icon: 'check',
            status: 'done'
        });

        // [PROACTIVE] Step 2: Explain WHY Target Brief matters
        setTimeout(() => {
            const whyTitle = isKorean ? 'Target Brief란?' : 'What is Target Brief?';
            const whyContent = isKorean
                ? `**Target Brief**는 AI 에이전트 팀이 최고의 콘텐츠를 만들기 위한 "설계도"입니다.\n\n` +
                `좋은 Target Brief가 있으면:\n` +
                `• 브랜드 톤에 맞는 일관된 콘텐츠 생성\n` +
                `• 타겟 고객에게 정확히 어필하는 메시지\n` +
                `• 경쟁사와 차별화되는 독창적인 아이디어\n\n` +
                `**저와 함께 몇 가지 질문에 답하면, 최적의 Target Brief를 완성할 수 있습니다.**`
                : `**Target Brief** is the "blueprint" for AI agents to create the best content.\n\n` +
                `With a good Target Brief:\n` +
                `• Consistent content matching your brand tone\n` +
                `• Messages that resonate with your target audience\n` +
                `• Creative ideas that differentiate from competitors\n\n` +
                `**Answer a few questions with me, and we'll complete the optimal Target Brief together.**`;

            addLogEntry(whyContent, 'card', {
                title: whyTitle,
                icon: 'brain',
                status: 'done'
            });
        }, 500);

        // [PROACTIVE] Step 3: Start the conversation with first question
        setTimeout(() => {
            const firstQuestion = isKorean
                ? `이제 **${projectName}** 프로젝트에 대한 "Target Brief"를 함께 구체화해 나가겠습니다.\n\n` +
                `첫 번째 단계로, 이 프로젝트의 **핵심 목표와 비전**을 이해해야 합니다.\n\n` +
                `**${projectName}**은 어떤 문제를 해결하거나, 어떤 기회를 포착하기 위한 프로젝트인가요?\n` +
                `간단히 말해, 이 프로젝트의 존재 이유는 무엇인가요?\n\n` +
                `이 정보를 바탕으로 다음 단계를 진행하겠습니다.`
                : `Now let's build the "Target Brief" for **${projectName}** together.\n\n` +
                `First, I need to understand the **core goals and vision** of this project.\n\n` +
                `What problem does **${projectName}** solve, or what opportunity is it capturing?\n` +
                `Simply put, what is the reason this project exists?\n\n` +
                `Based on this, we'll proceed to the next steps.`;

            addLogEntry(firstQuestion, 'info');

            // Add a suggested action button
            const actionBtnHtml = isKorean
                ? `<button class="brief-action-btn" onclick="showBriefQuestionHelper()" style="margin-top: 12px; padding: 10px 20px; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.5); border-radius: 8px; color: #a78bfa; cursor: pointer; font-size: 13px;">아직 형성된 Target Brief는 없어?</button>`
                : `<button class="brief-action-btn" onclick="showBriefQuestionHelper()" style="margin-top: 12px; padding: 10px 20px; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.5); border-radius: 8px; color: #a78bfa; cursor: pointer; font-size: 13px;">Don't have a Target Brief yet?</button>`;

            // Find the last log entry and append the button
            const streamContainer = document.getElementById('chat-stream-log');
            if (streamContainer && streamContainer.lastElementChild) {
                const btnWrapper = document.createElement('div');
                btnWrapper.innerHTML = actionBtnHtml;
                streamContainer.lastElementChild.appendChild(btnWrapper);
            }
        }, 1200);

    } else {
        // Brief is sufficient - Ready to go
        const readyTitle = isKorean ? '프로젝트 확인' : 'Project Verified';
        const readyContent = isKorean
            ? `**${projectName}** 프로젝트가 로드되었습니다.\n\n` +
            `Target Brief가 준비되었습니다 (${metrics.charCount}자, ${sources.length}개 소스).\n\n` +
            `✓ 콘텐츠 생성을 시작하려면 아래에서 채널을 선택하세요.\n` +
            `✓ 추가 지시사항이 있다면 채팅창에 입력해 주세요.`
            : `**${projectName}** project loaded.\n\n` +
            `Target Brief is ready (${metrics.charCount} chars, ${sources.length} sources).\n\n` +
            `✓ Select channels below to start content generation.\n` +
            `✓ Provide additional instructions in the chat if needed.`;

        addLogEntry(readyContent, 'card', {
            title: readyTitle,
            icon: 'check',
            status: 'done'
        });
    }
}

/**
 * Helper function to show guided questions for building Target Brief
 */
window.showBriefQuestionHelper = function () {
    const contentLang = window.zynk_main_lang || 'en';
    const isKorean = contentLang === 'ko';

    const helperContent = isKorean
        ? `**Target Brief 빠른 구축 가이드**\n\n` +
        `아래 질문에 답하면 AI가 자동으로 Target Brief를 구성해 드립니다:\n\n` +
        `1️⃣ **브랜드/제품**: 무엇을 홍보하나요?\n` +
        `2️⃣ **타겟 고객**: 누구에게 전달하나요? (연령, 관심사)\n` +
        `3️⃣ **핵심 메시지**: 무엇을 말하고 싶나요?\n` +
        `4️⃣ **톤앤매너**: 어떤 느낌으로? (친근, 전문적, 유머)\n` +
        `5️⃣ **목표**: 어떤 결과를 원하나요? (인지도, 전환, 참여)\n\n` +
        `채팅창에 자유롭게 답변해 주세요. 완벽하지 않아도 됩니다!`
        : `**Quick Target Brief Builder**\n\n` +
        `Answer these questions and AI will automatically build your Target Brief:\n\n` +
        `1️⃣ **Brand/Product**: What are you promoting?\n` +
        `2️⃣ **Target Audience**: Who are you reaching? (age, interests)\n` +
        `3️⃣ **Key Message**: What do you want to say?\n` +
        `4️⃣ **Tone & Manner**: What's the vibe? (friendly, professional, humorous)\n` +
        `5️⃣ **Goals**: What results do you want? (awareness, conversion, engagement)\n\n` +
        `Feel free to answer in the chat. It doesn't have to be perfect!`;

    addLogEntry(helperContent, 'card', {
        title: isKorean ? '빠른 가이드' : 'Quick Guide',
        icon: 'robot',
        status: 'done'
    });
};

// ============================================
// MISSING INIT FUNCTIONS (STUBS)
// ============================================

/**
 * Initialize Template Selector (Lite Mode, Standard, Deep Dive, Custom)
 */
function initTemplateSelector() {
    const templateBtns = document.querySelectorAll('[data-template]');
    if (!templateBtns.length) {
        console.log('[Studio] Template selector not found in DOM, skipping initialization.');
        return;
    }

    templateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const templateId = btn.dataset.template;
            if (WORKFLOW_TEMPLATES[templateId]) {
                state.selectedTemplate = templateId;
                templateBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                console.log('[Studio] Template selected:', templateId);
            }
        });
    });
    console.log('[Studio] Template selector initialized.');
}

/**
 * Initialize Agent Roster (Agent selection UI)
 */
function initAgentRoster() {
    console.log('[Studio] Agent roster initialized (placeholder).');
}

/**
 * Initialize Preview Tabs (Channel preview tabs)
 */
function initPreviewTabs() {
    console.log('[Studio] Preview tabs initialized (placeholder).');
}

/**
 * Initialize Footer Buttons (Action buttons at footer)
 */
function initFooterButtons() {
    console.log('[Studio] Footer buttons initialized (placeholder).');
}

/**
 * Initialize Sidebar Toggle
 */
function initSidebarToggle() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar, .left-sidebar');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    console.log('[Studio] Sidebar toggle initialized.');
}

/**
 * Initialize Booster Toggle (BOOST mode)
 */
function initBoosterToggle() {
    const boostBtn = document.getElementById('boost-toggle');
    if (boostBtn) {
        boostBtn.addEventListener('click', () => {
            boostBtn.classList.toggle('active');
            state.boostMode = boostBtn.classList.contains('active');
            console.log('[Studio] Boost mode:', state.boostMode);
        });
    }
    console.log('[Studio] Booster toggle initialized.');
}

/**
 * Update stats display
 */
function updateStats() {
    // Placeholder for stats update logic
    console.log('[Studio] Stats updated.');
}

/**
 * Initialize Editor Engine (Right Panel)
 */
function initEditorEngine() {
    const editorCanvas = document.getElementById('editor-canvas');
    const codeEditorArea = document.getElementById('code-editor-area');
    const btnCodeView = document.getElementById('btn-code-view');
    const btnEditMode = document.getElementById('btn-edit-mode');

    // Toggle code view
    if (btnCodeView) {
        btnCodeView.addEventListener('click', () => {
            if (codeEditorArea) {
                const isVisible = codeEditorArea.style.display !== 'none';
                codeEditorArea.style.display = isVisible ? 'none' : 'block';
                btnCodeView.classList.toggle('active', !isVisible);
            }
        });
    }

    // Toggle edit mode
    if (btnEditMode) {
        btnEditMode.addEventListener('click', () => {
            btnEditMode.classList.toggle('active');
            console.log('[Studio] Edit mode toggled');
        });
    }

    console.log('[Studio] Editor engine initialized.');
}

/**
 * Update Preview Profile display with project name
 */
function updatePreviewProfile(projectName) {
    const projectNameEl = document.getElementById('current-project-name');
    if (projectNameEl) {
        projectNameEl.textContent = projectName || 'Select Project...';
    }

    // Update header project display if exists
    const headerProjectName = document.querySelector('.project-name');
    if (headerProjectName) {
        headerProjectName.textContent = projectName || 'Select Project...';
    }

    console.log('[Studio] Preview profile updated:', projectName);
}

/**
 * Update Smart Button State
 */
function updateSmartButtonState(state) {
    const btn = document.getElementById('btn-send-instruction');
    if (!btn) return;

    switch (state) {
        case 'loading':
            btn.disabled = true;
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
            `;
            break;
        case 'default':
        default:
            btn.disabled = false;
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
                </svg>
            `;
            break;
    }
}

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

/**
 * Render Multi-Channel Previews in the right panel
 */
function renderMultiChannelPreviews() {
    const previewContainer = document.getElementById('single-channel-preview');
    const tabsContainer = document.getElementById('channel-preview-tabs');

    if (!previewContainer) {
        console.log('[Studio] Preview container not found');
        return;
    }

    if (!state.targetChannels || state.targetChannels.length === 0) {
        previewContainer.innerHTML = `
            <div class="preview-placeholder">
                <p>No channels selected</p>
            </div>
        `;
        return;
    }

    // Render channel tabs
    if (tabsContainer) {
        tabsContainer.innerHTML = state.targetChannels.map((channel, idx) => `
            <button class="channel-tab ${idx === 0 ? 'active' : ''}" data-channel="${channel}">
                ${getChannelIcon(channel)}
                <span>${getChannelName(channel)}</span>
            </button>
        `).join('');

        // Add tab click handlers
        tabsContainer.querySelectorAll('.channel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                tabsContainer.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderSingleChannelPreview(tab.dataset.channel);
            });
        });
    }

    // Render first channel preview
    renderSingleChannelPreview(state.targetChannels[0]);
    console.log('[Studio] Multi-channel previews rendered:', state.targetChannels);
}

/**
 * Render single channel preview
 */
function renderSingleChannelPreview(channel) {
    const previewContainer = document.getElementById('single-channel-preview');
    if (!previewContainer) return;

    previewContainer.innerHTML = `
        <div class="preview-placeholder">
            <div class="placeholder-icon">
                ${getChannelIcon(channel)}
            </div>
            <p>Preview for ${getChannelName(channel)}</p>
            <span style="color: rgba(255,255,255,0.4); font-size: 11px;">Run the workflow to generate content</span>
        </div>
    `;
}

/**
 * Get channel icon SVG
 */
function getChannelIcon(channel) {
    const icons = {
        'x': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
        'instagram': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
        'linkedin': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
        'facebook': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
        'youtube': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
        'tiktok': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>'
    };
    return icons[channel] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
}

/**
 * Get channel display name
 */
function getChannelName(channel) {
    const names = {
        'x': 'X (Twitter)',
        'instagram': 'Instagram',
        'linkedin': 'LinkedIn',
        'facebook': 'Facebook',
        'youtube': 'YouTube',
        'tiktok': 'TikTok',
        'naver_blog': 'Naver Blog',
        'naver_smart_store': 'Naver Smart Store',
        'naver_map': 'Naver Map',
        'coupang': 'Coupang',
        'tmap': 'T-Map',
        'kakao_navi': 'Kakao Navi',
        'kakao_map': 'Kakao Map',
        'pinterest': 'Pinterest',
        'reddit': 'Reddit',
        'threads': 'Threads',
        'snapchat': 'Snapchat',
        'discord': 'Discord',
        'telegram': 'Telegram',
        'medium': 'Medium'
    };
    return names[channel] || channel;
}

/**
 * Load content plans for a project
 */
async function loadContentPlans(projectId) {
    if (!projectId) return;

    const firestore = getFirestore();
    if (!firestore) return;

    try {
        const plansSnapshot = await firestore.collection('projects').doc(projectId)
            .collection('contentPlans')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const plans = [];
        plansSnapshot.forEach(doc => {
            plans.push({
                id: doc.id,
                ...doc.data()
            });
        });

        window.cachedPlans = plans;
        updateSourceContextUI(plans);
        console.log('[Studio] Loaded', plans.length, 'content plans');
    } catch (error) {
        console.log('[Studio] No content plans found or error:', error.message);
        window.cachedPlans = [];
        updateSourceContextUI([]);
    }
}

/**
 * Update Source Context UI with plan list
 */
function updateSourceContextUI(plans) {
    const container = document.getElementById('source-context-display');
    if (!container) return;

    if (!plans || plans.length === 0) {
        container.innerHTML = '<div style="color: #666; font-size: 12px; padding: 8px;">No contexts available</div>';
        return;
    }

    container.innerHTML = plans.map((plan, idx) => `
        <div class="context-item" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer;" onclick="selectSourceContext('${plan.id}')">
            <input type="radio" name="source_context_selection" ${idx === 0 ? 'checked' : ''} style="accent-color: #8B5CF6;">
            <span style="color: #fff; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${plan.planName || plan.title || 'Untitled'}</span>
        </div>
    `).join('');
}

/**
 * =====================================================
 * [SESSION HISTORY] UI Functions
 * =====================================================
 */

/**
 * Load and render studio chat sessions
 */
async function loadSessions(projectId) {
    if (!projectId || !window.SessionHistoryService) return;

    // Localize Titles
    const sessionTitle = document.querySelector('.session-section .panel-title');
    const ctxTitle = document.querySelector('.history-section .panel-title');
    const newBtn = document.getElementById('btn-new-session');

    if (sessionTitle) sessionTitle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #8B5CF6;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> ${t('studio.label.chatHistory')}`;
    if (ctxTitle) ctxTitle.textContent = t('studio.label.contextHistory');
    if (newBtn) newBtn.textContent = t('studio.label.newSession');

    const container = document.getElementById('session-list-container');
    if (!container) return;

    try {
        const sessions = await window.SessionHistoryService.listSessions(projectId, 10);
        renderSessionList(sessions);
    } catch (error) {
        console.error('[Studio] Error loading sessions:', error);
    }
}

/**
 * Render session list items
 */
function renderSessionList(sessions) {
    const container = document.getElementById('session-list-container');
    if (!container) return;

    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<div class="session-empty-state" style="color: #555; font-size: 12px; padding: 12px; text-align: center;">No previous sessions</div>';
        return;
    }

    const currentSessionId = window.SessionHistoryService.getCurrentSession().id;

    container.innerHTML = sessions.map(session => {
        const isActive = session.id === currentSessionId;
        const date = session.updatedAt?.toDate?.() || new Date();
        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        return `
            <div class="session-item ${isActive ? 'active' : ''}" 
                style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: ${isActive ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isActive ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)'}; border-radius: 6px; cursor: pointer; position: relative;"
                onclick="switchSession('${session.id}')"
            >
                <div style="flex: 1; overflow: hidden;">
                    <div style="color: ${isActive ? '#a78bfa' : '#eee'}; font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${session.title || 'New Session'}</div>
                    <div style="color: #666; font-size: 10px;">${dateStr} • ${session.messageCount || 0} msgs</div>
                </div>
                <button onclick="event.stopPropagation(); deleteSessionUI('${session.id}')" 
                    style="opacity: 0; color: #666; transition: all 0.2s; padding: 4px;"
                    class="delete-session-btn"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
    }).join('');

    // Add CSS for hover effect if not exist
    if (!document.getElementById('session-history-styles')) {
        const style = document.createElement('style');
        style.id = 'session-history-styles';
        style.textContent = `
            .session-item:hover .delete-session-btn { opacity: 1 !important; }
            .session-item .delete-session-btn:hover { color: #ef4444 !important; }
            .session-item:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.1) !important; }
            .session-item.active:hover { background: rgba(139, 92, 246, 0.2) !important; border-color: rgba(139, 92, 246, 0.4) !important; }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Handle new session creation
 */
async function createNewSession() {
    const projectId = document.getElementById('project-select')?.value;
    const projectSelect = document.getElementById('project-select');
    const projectName = projectSelect?.options[projectSelect.selectedIndex]?.textContent;

    if (!projectId || !window.SessionHistoryService) return;

    // Create session
    const sessionId = await window.SessionHistoryService.createSession(projectId, projectName);

    if (sessionId) {
        // Clear local state
        state.chatHistory = [];

        // Use switchSession to properly initialize the UI for the new session
        await switchSession(sessionId, true);

        addLogEntry(t('studio.log.sessionStarted'), 'success');
    }
}

/**
 * Switch to a different session
 */
async function switchSession(sessionId, force = false) {
    const projectId = document.getElementById('project-select')?.value;
    if (!projectId || !window.SessionHistoryService) return;

    const currentSessionId = window.SessionHistoryService.getCurrentSession().id;
    if (!force && sessionId === currentSessionId) return;

    try {
        const success = await window.SessionHistoryService.resumeSession(projectId, sessionId);
        if (success) {
            // Clear chat UI
            const streamContainer = document.getElementById('chat-stream-log');
            if (streamContainer) streamContainer.innerHTML = '';

            // Load messages
            const messages = await window.SessionHistoryService.loadSessionMessages(projectId, sessionId, 100); // Load up to 100

            // Update local state and display messages
            state.chatHistory = messages.map(msg => ({ role: msg.role, content: msg.content }));

            messages.forEach(msg => {
                addLogEntry(msg.content, msg.role === 'user' ? 'user' : 'info');
            });

            // Reload list to update active state
            const sessions = await window.SessionHistoryService.listSessions(projectId, 10);
            renderSessionList(sessions);

            if (!force) {
                addLogEntry(t('studio.log.sessionRestored'), 'success');
            }
        }
    } catch (error) {
        console.error('[Studio] Error switching session:', error);
    }
}

/**
 * Delete session with confirmation
 */
async function deleteSessionUI(sessionId) {
    if (!confirm('이 대화 기록을 삭제하시겠습니까?')) return;

    const projectId = document.getElementById('project-select')?.value;
    if (!projectId || !window.SessionHistoryService) return;

    try {
        const success = await window.SessionHistoryService.deleteSession(projectId, sessionId);
        if (success) {
            await loadSessions(projectId);

            // If current session was deleted, clear UI
            if (window.SessionHistoryService.getCurrentSession().id === null) {
                const streamContainer = document.getElementById('chat-stream-log');
                if (streamContainer) streamContainer.innerHTML = '';
                state.chatHistory = [];
            }
        }
    } catch (error) {
        console.error('[Studio] Error deleting session:', error);
    }
}

// Global exposure
window.createNewSession = createNewSession;
window.switchSession = switchSession;
window.deleteSessionUI = deleteSessionUI;

/**
 * Select source context by ID
 */
function selectSourceContext(contextId) {
    const plans = window.cachedPlans || [];
    const selected = plans.find(p => p.id === contextId);

    if (selected) {
        state.planContext = {
            id: selected.id,
            planName: selected.planName || selected.title,
            content: selected.content || selected.description || ''
        };

        // Update radio buttons
        document.querySelectorAll('[name="source_context_selection"]').forEach((radio, idx) => {
            radio.checked = plans[idx]?.id === contextId;
        });

        // Sync to briefing board
        if (typeof syncBriefingBoard === 'function' && selected.content) {
            syncBriefingBoard(selected.content, 'replace');
        }

        console.log('[Studio] Context selected:', selected.planName);
    }
}

/**
 * Load sub-agents for a team
 */
async function loadSubAgents(teamId) {
    if (!teamId) return;

    const firestore = getFirestore();
    if (!firestore) return;

    try {
        const teamDoc = await firestore.collection('projectAgentTeamInstances').doc(teamId).get();
        if (teamDoc.exists) {
            const teamData = teamDoc.data();
            state.selectedAgents = teamData.subAgents || [];
            console.log('[Studio] Loaded', state.selectedAgents.length, 'sub-agents');
        }
    } catch (error) {
        console.log('[Studio] Error loading sub-agents:', error.message);
    }
}

/**
 * Enable start button
 */
function enableStartButton() {
    const btn = document.getElementById('btn-send-instruction');
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    }
}

/**
 * Disable start button
 */
function disableStartButton() {
    const btn = document.getElementById('btn-send-instruction');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    }
}

/**
 * Open multi-channel overview modal
 */
function openMultiChannelOverview() {
    console.log('[Studio] Opening multi-channel overview');
    // Placeholder for multi-channel overview modal
}

/**
 * Toggle code view in editor
 */
function toggleCodeView() {
    const codeEditor = document.getElementById('code-editor-area');
    const previewContainer = document.getElementById('single-channel-preview');

    if (codeEditor && previewContainer) {
        const isCodeVisible = codeEditor.style.display !== 'none';
        codeEditor.style.display = isCodeVisible ? 'none' : 'block';
        previewContainer.style.display = isCodeVisible ? 'block' : 'none';
    }
}

