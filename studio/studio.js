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
    selectedTemplate: 'quick', // ✨ Phase 4: Default to Lite Mode
    chatHistory: [], // Interactive Studio Chat history
    selectedAgents: [],
    isExecuting: false,
    isPaused: false,
    currentPhase: 0,
    currentAgent: 0,
    timerSeconds: 0,
    timerInterval: null,
    planContext: null, // Context from Knowledge Hub
    // 🎯 UNIFIED BRAIN: Multi-channel targeting
    targetChannels: ['x'], // Default to X/Twitter
    availableChannels: [
        'x', 'instagram', 'linkedin', 'facebook', 'youtube', 'tiktok',
        'naver_blog', 'naver_smart_store', 'naver_map', 'coupang', 'tmap', 'kakao_navi', 'kakao_map',
        'pinterest', 'reddit', 'threads', 'snapchat', 'discord', 'telegram', 'medium'
    ],
};

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
        .replace(/📂|📁/g, studioIcons.folder)
        .replace(/📄|📝|📋/g, studioIcons.document)
        .replace(/🧠/g, studioIcons.brain)
        .replace(/🤖/g, studioIcons.robot)
        .replace(/✨/g, studioIcons.sparkle)
        .replace(/✅/g, studioIcons.check)
        .replace(/❌|⛔/g, studioIcons.error)
        .replace(/⚠️/g, studioIcons.warning)
        .replace(/ℹ️/g, studioIcons.info)
        .replace(/🚀/g, studioIcons.success)
        .replace(/🔄/g, studioIcons.system)
        .replace(/🎯/g, studioIcons.success);
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
            const projectsSnapshot = await db.collection('projects')
                .where('userId', '==', user.uid)
                .where('isDraft', '==', false)  // Only non-draft projects
                .get();

            console.log('[Studio] Found', projectsSnapshot.size, 'projects');

            projectSelect.innerHTML = '<option value="">Select Project...</option>';

            if (projectsSnapshot.empty) {
                projectSelect.innerHTML = '<option value="" disabled selected>⚠️ Please create a Project in Admin Settings</option>';
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
                projectSelect.innerHTML = '<option value="" disabled selected>⚠️ Please create a Project in Admin Settings</option>';
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
                        addLogEntry(`📂 ${selectedOption.textContent} 프로젝트가 로드되었습니다.`, 'info');
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
                        : `🤖 Auto-loading team: ${teamId}`;
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
            const errorMsg = (typeof t === 'function') ? t('studio.log.failedToLoadProjects') : '❌ Failed to load projects';
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
                    addLogEntry(`📂 ${projectName} 프로젝트가 로드되었습니다.`, 'info');
                }

                // Fetch full project details for context
                try {
                    const projectDoc = await db.collection('projects').doc(projectId).get();
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
 * 🤖 CHAT ENGINE LOGIC (Skywork Style)
 * =====================================================
 */
function initChatEngine() {
    const input = document.getElementById('main-instruction-input');
    const sendBtn = document.getElementById('btn-send-instruction');
    const streamContainer = document.getElementById('chat-stream-log');

    if (!input || !sendBtn) return;

    /**
     * =====================================================
     * 🤖 STUDIO ORCHESTRATOR SYSTEM PROMPT
     * =====================================================
     */
    const STUDIO_ASSISTANT_SYSTEM_PROMPT = `
You are the ZYNK Studio Orchestrator. Your role is to interact with the user to build a "Target Brief" (Final Context) for AI generation.
The "Target Brief" is a living document visible to the user on the left sidebar. AI agents will use this board as the ULTIMATE source of truth.

INTERACTION GUIDELINES:
1. When the user provides info, summarize it and extract key points.
2. USE COMMANDS to update the Target Brief Board.
3. Be proactive: Ask for missing details like Target Audience, Tone, or Schedule.
4. Market Research: If the user mentions a product/market, suggest performing a Search [SEARCH: "query"].

COMMAND PARSING (Strict):
- To update the side-panel Target Brief, append: [CONTEXT: {"name": "Header Name", "content": "Extracted strategy details"}]
- To suggest a research chip, append: [SEARCH: "Topic to research"]

Current Project: {{projectName}}
Language: Respond ONLY in {{targetLanguage}}.
CRITICAL: Maintain the Target Brief Board as the most accurate reflection of the current content plan.
`;

    // Unified Smart Action Handler (Enhanced Interactive AI)
    const handleSmartExecute = async () => {
        const text = input.value.trim();
        const attachments = state.attachments || [];

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

        // --- INTERACTIVE AI PHASE ---
        addLogEntry(text || t('studio.log.processingAttachments'), 'user');
        updateSmartButtonState('loading');

        // Prepare context for AI
        const projectSelect = document.getElementById('project-select');
        const projectName = projectSelect.options[projectSelect.selectedIndex]?.textContent || 'Unknown';

        // Resolve Target Language (Prioritize Content Language)
        const contentLang = localStorage.getItem('zynk-main-language') || localStorage.getItem('zynk-language') || 'en';
        const targetLanguage = contentLang === 'ko' ? 'Korean' : 'English';

        let systemPrompt = STUDIO_ASSISTANT_SYSTEM_PROMPT
            .replace('{{projectName}}', projectName)
            .replace('{{targetLanguage}}', targetLanguage);

        // Add to history
        state.chatHistory.push({ role: 'user', content: text });

        try {
            // Call LLM Router Service
            const response = await window.LLMRouterService.call({
                feature: 'studio_chat', // Custom feature for studio interaction
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...state.chatHistory.slice(-5) // Keep last 5 messages for context
                ],
                qualityTier: 'DEFAULT',
                projectId: state.selectedProject
            });

            const aiMessage = response.content;
            state.chatHistory.push({ role: 'assistant', content: aiMessage });

            // 1. Process AI Commands ([CONTEXT: ...], [SEARCH: ...])
            const cleanMessage = parseAICommands(aiMessage);

            // 2. Display AI Response
            addLogEntry(cleanMessage, 'info');

        } catch (error) {
            console.error('[Studio] Interactive AI Error:', error);

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
                simulatorResponse = `${t('studio.log.orchestrator')}: 네, 질문하신 '시장조사' 기능을 여기 준비했습니다! 
                
아래의 리서치 칩을 클릭하시면 실시간 데이터를 분석하여 에이전트 팀이 정교한 컨텐츠를 만들 수 있도록 돕습니다. 
이미 시장조사를 수행한 것은 아니며, 사용자님이 버튼을 누르시는 순간 시작됩니다. [SEARCH: "2026 블록체인 및 AI 트렌드"]`;
            } else if (isQuestion) {
                simulatorResponse = `${t('studio.log.orchestrator')}: 좋은 질문입니다! 시장조사는 현재 트렌드와 경쟁사 데이터를 분석하여 브랜드에 가장 적합한 키워드와 톤앤매너를 도출하는 과정입니다. 
                
이를 통해 생성되는 콘텐츠는 단순히 텍스트를 나열하는 것이 아니라, 실제 고객이 반응할 확률이 높은 주제와 최적화된 키워드를 포함하게 되어 훨씬 풍성하고 효과적인 결과를 만들어냅니다. 
이제 이 조사를 바탕으로 콘텐츠 생성을 진행해볼까요?`;
            }

            // Always try to extract context if project keywords are present, even inside a question
            if (lowerInput.includes('vision chain') || lowerInput.includes('비전체인')) {
                const contextTag = `[CONTEXT: {"name": "Vision Chain Daily Content", "content": "Daily social media strategy for Vision Chain focusing on 2026 tech trends and community engagement."}]`;

                if (!isQuestion) {
                    simulatorResponse = `${contextTag}
                    
${t('studio.log.orchestrator')}: Vision Chain 프로젝트를 위한 데일리 포스팅 계획을 수립했습니다. 
현재 준비된 컨텍스트:
- 주제: 2026 테크 트렌드 및 커뮤니티 소통
- 채널: X (Twitter), LinkedIn

준비가 되셨다면 아래 '선택한 컨텍스트로 시작' 버튼을 눌러 에이전트 팀을 가동해 보세요! [SEARCH: "2026 블록체인 트렌드"]`;
                } else {
                    // Prepend context extraction to the question response if not already answered by "where is chip"
                    if (!simulatorResponse.includes('[CONTEXT:')) {
                        simulatorResponse = contextTag + "\n\n" + simulatorResponse;
                    }
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
            updateSmartButtonState('default');
        }
    };

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
                icon: '🎯'
            });
            // Auto-triggering search summary or adding a button can be done here.
            // For now, let's just clean the message.
            clean = clean.replace(match[0], '');
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
    // 🎛️ MODE SWITCHER LOGIC
    // ============================================
    const modeAgent = document.getElementById('mode-agent-engine');
    const modeSocial = document.getElementById('mode-social-media');

    if (modeAgent && modeSocial) {
        modeAgent.addEventListener('click', () => {
            modeAgent.classList.add('active');
            modeSocial.classList.remove('active');
            addLogEntry(t('studio.log.switchedToAgentEngineMode'), 'system');

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

            case 'system':
                msgDiv.className = 'msg-system';
                msgDiv.innerHTML = `${studioIcons.system} <strong>${t('studio.log.orchestrator')}:</strong> ${replaceEmojis(message)}`;
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

        return;
    }

    // 3. Legacy Log List Fallback (Left Panel)
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

    // SIMULATED DATA (In production, this would come from a database or agent result)
    let simulationHtml = "";
    const isKorean = (localStorage.getItem('zynk-main-language') === 'ko' || localStorage.getItem('zynk-language') === 'ko');

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
                        <li>블록체인 투자자 및 개발자</li>
                        <li>혁신 기술 기반 사업가</li>
                    </ul>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px;">
                    <div style="color: #FBBF24; font-weight: 600; font-size: 13px; margin-bottom: 10px;">현재 여론/감성</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">📈</span>
                        <span style="font-size: 13px;">긍정적 기대감 (보안 및 확장성에 대한 관심 급증)</span>
                    </div>
                </div>
            </div>

            <h4 style="color: #fff; margin-bottom: 10px; font-size: 15px;">추천 키워드 전략</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">#VisionChain2026</span>
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">#Web3Innovation</span>
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">#BlockchainScaling</span>
            </div>
            
            <div style="margin-top: 25px; padding: 15px; background: rgba(0,255,163,0.05); border-radius: 10px; font-size: 13px; color: #fff;">
                <strong style="color: #00FFA3;">에이전트 제안:</strong> 위 데이터를 바탕으로 '보안성'과 '사용자 중심의 확장'을 핵심 테마로 설정하여 주간 포스팅을 구성하는 것을 추천합니다.
            </div>
        `;
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
                        <li>Blockchain Investors & Developers</li>
                        <li>Entrepreneurs focused on innovation</li>
                    </ul>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px;">
                    <div style="color: #FBBF24; font-weight: 600; font-size: 13px; margin-bottom: 10px;">Public Sentiment</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">📈</span>
                        <span style="font-size: 13px;">Positive (Growing interest in security/scalability)</span>
                    </div>
                </div>
            </div>

            <h4 style="color: #fff; margin-bottom: 10px; font-size: 15px;">Keyword Strategy</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">#VisionChain2026</span>
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">#Web3Innovation</span>
                <span style="background: rgba(0,255,163,0.1); color: #00FFA3; padding: 4px 10px; border-radius: 20px; font-size: 12px;">#BlockchainScaling</span>
            </div>
            
            <div style="margin-top: 25px; padding: 15px; background: rgba(0,255,163,0.05); border-radius: 10px; font-size: 13px; color: #fff;">
                <strong style="color: #00FFA3;">Agent Tip:</strong> We recommend focusing on "Security" and "User-centric Scaling" as core themes for your weekly posts.
            </div>
        `;
    }

    content.innerHTML = simulationHtml;
    modal.style.display = 'flex';
    // Trigger animation frame to ensure display: flex is applied before adding .open
    requestAnimationFrame(() => {
        modal.classList.add('open');
    });
}

function closeMarketResearchModal() {
    const modal = document.getElementById('market-research-modal');
    if (modal) {
        modal.classList.remove('open');
        // Wait for transition to finish before hiding
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
        // 🧠 UNIFIED BRAIN: First check for coreAgentTeamInstanceId on the project
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (projectDoc.exists) {
            const projectData = projectDoc.data();
            const coreTeamId = projectData.coreAgentTeamInstanceId;

            if (coreTeamId) {
                console.log('[Studio] 🧠 Unified Brain: Auto-loading Core Team:', coreTeamId);

                // Set target channels from project
                state.targetChannels = projectData.targetChannels || ['x'];
                console.log('[Studio] Project Target Channels:', state.targetChannels);

                // Initialize Multi-channel Previews
                renderMultiChannelPreviews();

                // Verify team exists
                const teamDoc = await db.collection('projectAgentTeamInstances').doc(coreTeamId).get();
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
        let teamsSnapshot = await db.collection('projectAgentTeamInstances')
            .where('projectId', '==', projectId)
            .get();

        console.log('[Studio] Found', teamsSnapshot.size, 'team instances');

        // Fallback to agentTeams if no instances found
        if (teamsSnapshot.empty) {
            console.log('[Studio] No team instances, trying agentTeams collection...');
            teamsSnapshot = await db.collection('agentTeams')
                .where('projectId', '==', projectId)
                .get();
            console.log('[Studio] Found', teamsSnapshot.size, 'agent teams');
        }

        agentTeamSelect.innerHTML = '<option value="">Select Agent Team...</option>';

        if (teamsSnapshot.empty) {
            agentTeamSelect.innerHTML = '<option value="" disabled selected>⚠️ Please create an Agent Team in Admin Settings</option>';
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

        // 🧠 UNIFIED BRAIN IMPROVEMENT: Auto-select the first team if none is selected
        if (teamsSnapshot.size > 0 && !state.selectedAgentTeam) {
            const firstTeamId = teamsSnapshot.docs[0].id;
            const firstTeamData = teamsSnapshot.docs[0].data();

            console.log('[Studio] 🧠 Auto-selecting first available team:', firstTeamId);

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
// 🎯 MULTI-CHANNEL TOGGLE UI (Unified Brain)
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
            <span class="toggle-icon">🎯</span>
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
        'reddit': '<svg width="20" height="20" viewBox="0 0 24 24" fill="#FF4500"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>',
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

    // Default SVG icon for unknown channels
    const defaultIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

    return svgIcons[channel] || defaultIcon;
}

function getChannelDisplayName(channel) {
    const names = {
        'x': 'X',
        'instagram': 'Instagram',
        'linkedin': 'LinkedIn',
        'facebook': 'Facebook',
        'youtube': 'YouTube',
        'tiktok': 'TikTok',
        'naver_blog': 'Naver Blog',
        'naver_smart_store': 'N smartstore',
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

function updateChannelStats() {
    const channelCount = state.targetChannels.length;
    const statsEl = document.querySelector('.channel-stats');
    if (statsEl) {
        statsEl.textContent = t('studio.stats.channelsSelected').replace('{{count}}', channelCount);
    }
}

// =====================================================
// 🎛️ TABBED CHANNEL PREVIEW (Studio v2.1)
// =====================================================

// Current active channel for preview
let activePreviewChannel = null;

// Channel content storage
window.channelContents = {};

// Render channel tabs
window.renderChannelTabs = function () {
    const tabsContainer = document.getElementById('channel-preview-tabs');
    const viewAllBtn = document.getElementById('view-all-channels-btn');
    if (!tabsContainer) return;

    console.log('[Studio] Rendering Channel Tabs for:', state.targetChannels);

    // Clear and render tabs
    tabsContainer.innerHTML = '';

    if (state.targetChannels.length === 0) {
        tabsContainer.innerHTML = `<div class="tab-placeholder">${t('studio.preview.selectChannelsToPreview')}</div>`;
        if (viewAllBtn) viewAllBtn.style.display = 'none';
        return;
    }

    // Show view all button if more than 1 channel
    if (viewAllBtn) {
        viewAllBtn.style.display = state.targetChannels.length > 1 ? 'flex' : 'none';
        // Ensure it's not hidden by other styles
        viewAllBtn.classList.add('visible');
    }

    state.targetChannels.forEach((channel) => {
        const displayName = getChannelDisplayName(channel);
        const icon = getChannelIcon(channel);
        const content = window.channelContents[channel];
        const isActive = (channel === activePreviewChannel);

        let statusClass = 'waiting';
        if (content && content.text) statusClass = 'complete';

        const tab = document.createElement('div');
        tab.className = `channel-tab ${isActive ? 'active' : ''} ${statusClass}`;
        tab.dataset.channel = channel;
        tab.innerHTML = `
            <span class="tab-icon">${icon}</span>
            <span class="tab-name">${displayName}</span>
            <span class="tab-status-dot"></span>
        `;

        tab.addEventListener('click', () => switchPreviewTab(channel));
        tabsContainer.appendChild(tab);
    });

    // Set first channel as active
    if (!activePreviewChannel && state.targetChannels.length > 0) {
        activePreviewChannel = state.targetChannels[0];
    }

    renderSingleChannelPreview(activePreviewChannel);
};

// Switch between tabs
window.switchPreviewTab = function (channel) {
    activePreviewChannel = channel;

    // Update tab states
    document.querySelectorAll('.channel-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.channel === channel);
    });

    renderSingleChannelPreview(channel);
};

// Render single channel preview
window.renderSingleChannelPreview = function (channel) {
    const previewArea = document.getElementById('single-channel-preview');
    if (!previewArea || !channel) {
        console.warn('[Studio] renderSingleChannelPreview: previewArea or channel missing', { previewArea, channel });
        return;
    }

    const content = window.channelContents[channel];
    const displayName = getChannelDisplayName(channel);
    const icon = getChannelIcon(channel);

    console.log('[Studio] renderSingleChannelPreview:', { channel, hasContent: !!content, text: content?.text?.substring(0, 50) });

    if (!content || !content.text) {
        previewArea.innerHTML = `
            <div class="multi-channel-card sidebar-preview-frame">
                <div class="multi-channel-card-header">
                    <span class="preview-frame-icon" style="color: #fff; font-size: 24px;">${icon}</span>
                    <span class="preview-frame-label" style="font-size: 14px; font-weight: 600; text-transform: lowercase; color: #eee;">${channel}</span>
                </div>
                <div class="multi-channel-card-body" style="height: 350px; display: flex; align-items: center; justify-content: center; background: #000;">
                    <div class="preview-placeholder" style="opacity: 0.5;">
                        <div style="font-size: 64px; margin-bottom: 16px;">${icon}</div>
                        <p style="font-size: 14px; color: #888;">${t('studio.preview.waitingForContent').replace('{{channelName}}', displayName)}</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Render platform-specific preview
    const formattedHTML = getFormattedPreview(channel, content);

    // Wrap in professional multi-channel-card frame
    previewArea.innerHTML = `
        <div class="multi-channel-card sidebar-preview-frame">
            <div class="multi-channel-card-header">
                <span class="preview-frame-icon" style="color: #fff; font-size: 24px;">${icon}</span>
                <span class="preview-frame-label" style="font-size: 14px; font-weight: 600; text-transform: lowercase; color: #eee;">${channel}</span>
            </div>
            <div class="multi-channel-card-body" style="padding: 16px; background: #000;">
                ${formattedHTML}
            </div>
        </div>
    `;
};

// Get formatted preview based on platform
function getFormattedPreview(channel, content) {
    const displayName = getChannelDisplayName(channel);
    const icon = getChannelIcon(channel);

    switch (channel) {
        case 'x':
            // Use connected account profile if available
            const profile = state.channelProfile || {};
            const profileName = profile.name || state.projectName || t('studio.preview.brand');
            const profileHandle = profile.handle || '@' + (state.projectName || 'brand').toLowerCase().replace(/\s/g, '');
            const avatarSrc = profile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileName)}&backgroundColor=1d9bf0`;

            return `
                <div class="preview-x-post">
                    <div class="x-header">
                        <div class="x-avatar">
                            <img src="${avatarSrc}" alt="avatar" style="width:100%;height:100%;border-radius:50%;">
                        </div>
                        <div class="x-user-info">
                            <div class="x-name-row">
                                <span class="x-name">${profileName}</span>
                                <svg class="x-verified" viewBox="0 0 22 22" width="18" height="18" fill="#1d9bf0"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path></svg>
                            </div>
                            <span class="x-handle">${profileHandle} · ${t('studio.preview.justNow')}</span>
                        </div>
                        <button class="x-more-btn">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></svg>
                        </button>
                    </div>
                    <div class="x-content">${content.text}</div>
                    ${content.imageUrl ? `<img class="x-image" src="${content.imageUrl}" alt="${t('studio.preview.postImage')}">` : ''}
                    <div class="x-actions">
                        <div class="x-action"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></svg><span>96</span></div>
                        <div class="x-action x-retweet"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></svg><span>8</span></div>
                        <div class="x-action x-like"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></svg><span>53</span></div>
                        <div class="x-action"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></svg><span>605</span></div>
                        <div class="x-action-group">
                            <div class="x-action"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"></path></svg></div>
                            <div class="x-action"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"></path></svg></div>
                        </div>
                    </div>
                </div>
            `;
        case 'instagram':
            const igProfile = state.channelProfile || {};
            const igName = igProfile.name || state.projectName || t('studio.preview.brand');
            const igHandle = igProfile.handle || '@' + (state.projectName || 'brand').toLowerCase().replace(/\s/g, '');
            const igAvatar = igProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(igName)}&backgroundColor=e1306c`;

            return `
                <div class="preview-instagram-post">
                    <div class="insta-header">
                        <div class="insta-avatar">
                            <img src="${igAvatar}" alt="avatar" style="width:100%;height:100%;border-radius:50%;">
                        </div>
                        <span class="insta-username">${igName}</span>
                    </div>
                    ${content.imageUrl ? `<img class="insta-image" src="${content.imageUrl}" alt="${t('studio.preview.postImage')}">` : `<div class="insta-image-placeholder">${t('studio.preview.cameraEmoji')}</div>`}
                    <div class="insta-actions">
                        <span>❤️</span>
                        <span>💬</span>
                        <span>📤</span>
                        <span style="margin-left:auto;">🔖</span>
                    </div>
                    <div class="insta-caption"><strong>${igName}</strong> ${content.text}</div>
                </div>
            `;
        case 'linkedin':
            const liProfile = state.channelProfile || {};
            const liName = liProfile.name || state.projectName || t('studio.preview.brand');
            const liAvatar = liProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(liName)}&backgroundColor=0a66c2`;

            return `
                <div class="preview-linkedin-post">
                    <div class="linkedin-header">
                        <div class="linkedin-avatar">
                            <img src="${liAvatar}" alt="avatar" style="width:100%;height:100%;border-radius:4px;">
                        </div>
                        <div class="linkedin-user-info">
                            <span class="linkedin-name">${liName}</span>
                            <span class="linkedin-title">${t('studio.preview.companyPage')}</span>
                        </div>
                    </div>
                    <div class="linkedin-content">${content.text}</div>
                    ${content.imageUrl ? `<img class="linkedin-image" src="${content.imageUrl}" alt="${t('studio.preview.postImage')}">` : ''}
                    <div class="linkedin-actions">
                        <span>👍 ${t('studio.preview.like')}</span>
                        <span>💬 ${t('studio.preview.comment')}</span>
                        <span>🔄 ${t('studio.preview.repost')}</span>
                        <span>📤 ${t('studio.preview.send')}</span>
                    </div>
                </div>
            `;
        case 'youtube':
            return `
                <div class="preview-youtube-post">
                    <div class="youtube-thumbnail">
                        ${content.imageUrl ? `<img src="${content.imageUrl}" style="width:100%; height:100%; object-fit:cover;">` : `<div class="play-btn">${t('studio.preview.playButton')}</div>`}
                    </div>
                    <div class="youtube-info">
                        <div class="youtube-title">${content.text?.substring(0, 100) || t('studio.preview.videoTitle')}</div>
                        <div class="youtube-meta">${state.projectName || t('studio.preview.channel')} • 0 ${t('studio.preview.views')}</div>
                    </div>
                </div>
            `;
        case 'naver_blog':
            return `
                <div class="preview-naver-post">
                    <div class="naver-header">
                        <span>N</span>
                        <span>${t('studio.preview.naverBlog')}</span>
                    </div>
                    <div class="naver-content">
                        <div class="naver-title">${content.title || t('studio.preview.blogPostTitle')}</div>
                        <div class="naver-text">${content.text}</div>
                    </div>
                </div>
            `;
        default:
            return `
                <div class="preview-generic">
                    <div class="generic-header">
                        <span class="generic-icon">${icon}</span>
                        <span class="generic-name">${displayName}</span>
                    </div>
                    <div class="generic-content">${content.text}</div>
                </div>
            `;
    }
}

// Update channel tab status
window.updateChannelTabStatus = function (channel, status) {
    const tab = document.querySelector(`.channel-tab[data-channel="${channel}"]`);
    if (tab) {
        const statusEl = tab.querySelector('.tab-status');
        if (statusEl) {
            statusEl.className = `tab-status ${status}`;
        }
    }
};

// Open Multi-Channel Overview Modal
window.openMultiChannelOverview = function () {
    // Remove existing modal if any
    const existing = document.getElementById('multi-channel-overview-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'multi-channel-overview-modal';
    modal.className = 'multi-channel-modal';

    let cardsHtml = '';
    state.targetChannels.forEach(channel => {
        const displayName = getChannelDisplayName(channel);
        const icon = getChannelIcon(channel);
        const content = window.channelContents[channel];

        // Use getFormattedPreview for platform-specific preview frames
        let previewContent;
        if (content?.text) {
            previewContent = getFormattedPreview(channel, content);
        } else {
            // Show placeholder with platform icon for not-yet-generated content
            previewContent = `
                <div class="preview-placeholder" style="min-height: 200px;">
                    <span style="font-size: 48px; opacity: 0.3;">${icon}</span>
                    <p style="color: var(--color-text-tertiary); margin: 0;">${t('studio.preview.contentNotGeneratedYet')}</p>
                </div>
            `;
        }

        cardsHtml += `
            <div class="multi-channel-card">
                <div class="multi-channel-card-header">
                    <span style="font-size: 20px;">${icon}</span>
                    <span style="font-weight: 600;">${displayName}</span>
                </div>
                <div class="multi-channel-card-body">
                    ${previewContent}
                </div>
            </div>
        `;
    });

    modal.innerHTML = `
        <div class="multi-channel-modal-header">
            <h2>📺 ${t('studio.preview.allChannelPreviews')}</h2>
            <button class="multi-channel-modal-close" onclick="closeMultiChannelOverview()">×</button>
        </div>
        <div class="multi-channel-modal-body">
            ${cardsHtml}
        </div>
    `;

    document.body.appendChild(modal);
};

// Close Multi-Channel Overview Modal
window.closeMultiChannelOverview = function () {
    const modal = document.getElementById('multi-channel-overview-modal');
    if (modal) modal.remove();
};

// Legacy compatibility: redirect old function to new one
window.renderMultiChannelPreviews = function () {
    window.renderChannelTabs();
};

function getChannelPreviewTemplate(channel) {
    // Shared structure for most channels
    return `
            <div class="preview-inner">
                <div class="preview-header">
                    <div class="preview-user-info">
                        <img src="../assets/default-avatar.png" class="preview-avatar" alt="${t('studio.preview.avatar')}">
                        <div class="preview-user-meta">
                            <div class="preview-user-name">${t('studio.preview.yourBrand')}</div>
                            <div class="preview-user-handle">@yourbrand</div>
                        </div>
                    </div>
                </div>
                <div class="preview-text-content" id="${channel}-text" contenteditable="true">
                    ${t('studio.preview.generatedContentWillAppearHere')}
                </div>
                <div class="preview-media-container" id="${channel}-media">
                    <div class="media-placeholder">
                        <span class="placeholder-icon">🖼️</span>
                        <span>${t('studio.preview.multiChannelVisualContextPending')}</span>
                    </div>
                </div>
            </div>
        `;
}

window.toggleCardSize = function (channel) {
    const card = document.getElementById(`preview-card-${channel}`);
    if (card) {
        card.classList.toggle('expanded');
    }
};

// =====================================================
// 🔍 PROMPT INSIGHT MODAL (Unified Brain - Transparency)
// =====================================================
function showPromptInsight(promptData) {
    // promptData: { agentRole, systemPrompt, userMessage, aiResponse, targetChannel }

    // Create modal if doesn't exist
    let modal = document.getElementById('prompt-insight-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'prompt-insight-modal';
        modal.className = 'prompt-insight-modal';
        modal.innerHTML = `
            <div class="prompt-insight-content">
                <div class="prompt-insight-header">
                    <h3><span class="insight-icon">${studioIcons.info}</span> ${t('studio.promptInsight.title')}</h3>
                    <button class="prompt-insight-close">&times;</button>
                </div>
                <div class="prompt-insight-body">
                    <div class="prompt-section" id="insight-agent-info"></div>
                    <div class="prompt-section" id="insight-system-prompt">
                        <div class="prompt-section-label">
                            <span class="section-icon">${studioIcons.system}</span> ${t('studio.promptInsight.systemPrompt')}
                        </div>
                        <div class="prompt-section-content system-prompt" id="insight-system-content"></div>
                    </div>
                    <div class="prompt-section" id="insight-user-message">
                        <div class="prompt-section-label">
                            <span class="section-icon">${studioIcons.user}</span> ${t('studio.promptInsight.userMessage')}
                        </div>
                        <div class="prompt-section-content user-message" id="insight-user-content"></div>
                    </div>
                    <div class="prompt-section" id="insight-ai-response">
                        <div class="prompt-section-label">
                            <span class="section-icon">${studioIcons.robot}</span> ${t('studio.promptInsight.aiResponse')}
                        </div>
                        <div class="prompt-section-content ai-response" id="insight-response-content"></div>
                    </div>
                </div>
                <div class="prompt-insight-footer">
                    <button class="prompt-copy-btn" id="copy-all-prompts">
                        ${studioIcons.document} ${t('studio.promptInsight.copyAll')}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close button handler
        modal.querySelector('.prompt-insight-close').addEventListener('click', () => {
            modal.classList.remove('open');
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('open');
            }
        });

        // Copy all button
        modal.querySelector('#copy-all-prompts').addEventListener('click', () => {
            const fullText = `=== ${t('studio.promptInsight.agent')}: ${promptData.agentRole || t('studio.promptInsight.unknownAgent')} ===\n\n` +
                `=== ${t('studio.promptInsight.systemPrompt').toUpperCase()} ===\n${promptData.systemPrompt || t('studio.promptInsight.notAvailable')}\n\n` +
                `=== ${t('studio.promptInsight.userMessage').toUpperCase()} ===\n${promptData.userMessage || t('studio.promptInsight.notAvailable')}\n\n` +
                `=== ${t('studio.promptInsight.aiResponse').toUpperCase()} ===\n${promptData.aiResponse || t('studio.promptInsight.notAvailable')}`;

            navigator.clipboard.writeText(fullText).then(() => {
                addLogEntry(t('studio.log.promptsCopied'), 'success');
            });
        });
    }

    // Populate content
    const channelBadge = promptData.targetChannel
        ? `<span class="channel-badge">${getChannelIcon(promptData.targetChannel)} ${getChannelDisplayName(promptData.targetChannel)}</span>`
        : '';

    modal.querySelector('#insight-agent-info').innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <span style="font-size: 24px;">${studioIcons.robot}</span>
            <div>
                <div style="font-weight: 600; font-size: 16px; color: #fff;">${promptData.agentRole || t('studio.promptInsight.unknownAgent')}</div>
                ${channelBadge}
            </div>
        </div>
    `;
    modal.querySelector('#insight-system-content').textContent = promptData.systemPrompt || t('studio.promptInsight.noSystemPrompt');
    modal.querySelector('#insight-user-content').textContent = promptData.userMessage || t('studio.promptInsight.noUserMessage');
    modal.querySelector('#insight-ai-response').textContent = promptData.aiResponse || t('studio.promptInsight.noResponseYet');

    // Show modal
    modal.classList.add('open');
}

// Expose for external use
window.showPromptInsight = showPromptInsight;

/**
 * Load sub-agents for the selected Agent Team
 * @param {string} teamId - The selected Agent Team ID
 */
async function loadSubAgents(teamId) {
    try {
        // Fetch Team Instance Data for Directive
        const teamDoc = await db.collection('projectAgentTeamInstances').doc(teamId).get();
        const teamData = teamDoc.exists ? teamDoc.data() : {};

        // 1. Try projectAgentTeamInstances subcollection (Live Instances)
        let subAgentsSnapshot = await db.collection('projectAgentTeamInstances')
            .doc(teamId)
            .collection('subAgents')
            .orderBy('display_order', 'asc')
            .get();

        let subAgents = [];
        if (!subAgentsSnapshot.empty) {
            subAgentsSnapshot.forEach(doc => {
                subAgents.push({ id: doc.id, ...doc.data() });
            });

            console.log('Loaded sub-agents from Instance:', subAgents);
            updateAgentRosterUI(subAgents);
            await updatePreviewChannel(teamId);
        } else if (teamData.roles && Array.isArray(teamData.roles)) {
            // 2. Fallback: Try agentTeams collection (Structure with 'roles' array)
            console.log('No sub-agents in Instance, checking agentTeams roles...');
            teamData.roles.forEach(role => {
                subAgents.push({
                    id: role.type,
                    role_type: role.type,
                    name: role.name,
                });
            });

            console.log('Loaded sub-agents from Team Template:', subAgents);
            updateAgentRosterUI(subAgents);
            await updatePreviewChannel(teamId);
        } else {
            // 3. Final Fallback: Standard 12 agents (Unified Brain Rule)
            console.log('[Studio] Defaulting to standard 12 agents for roster...');
            const standardRoles = [
                { id: 'research', role: 'researcher', name: 'Research' },
                { id: 'seo_watcher', role: 'seo_watcher', name: 'SEO Watcher' },
                { id: 'knowledge_curator', role: 'knowledge_curator', name: 'Knowledge Curator' },
                { id: 'kpi', role: 'kpi_advisor', name: 'KPI Advisor' },
                { id: 'planner', role: 'planner', name: 'Planner' },
                { id: 'creator_text', role: 'writer', name: 'Text Creator' },
                { id: 'creator_image', role: 'image_creator', name: 'Image Creator' },
                { id: 'creator_video', role: 'video_planner', name: 'Video Planner' },
                { id: 'compliance', role: 'compliance', name: 'Compliance' },
                { id: 'seo_optimizer', role: 'seo_optimizer', name: 'SEO Optimizer' },
                { id: 'evaluator', role: 'evaluator', name: 'Evaluator' },
                { id: 'manager', role: 'manager', name: 'Manager' }
            ];
            subAgents = standardRoles.map((r, i) => ({
                id: r.id,
                role: r.role,
                role_type: r.id,
                name: r.name,
                display_order: i
            }));

            updateAgentRosterUI(subAgents);
            await updatePreviewChannel(teamId);
        }

        // Refresh tabs based on newly loaded team channels
        if (typeof window.renderChannelTabs === 'function') {
            window.renderChannelTabs();
        }

        // ✨ Phase 1: Automatically store in state for DAG Executor (No modal required)
        // 🧠 UNIFIED BRAIN: Prioritize project-level teamDirective
        let directive = teamData.directive || teamData.goal || teamData.teamGoal || '';
        try {
            const projectDoc = await db.collection('projects').doc(state.selectedProject).get();
            if (projectDoc.exists && projectDoc.data().teamDirective) {
                directive = projectDoc.data().teamDirective;
            }
        } catch (e) {
            console.warn('[Studio] Could not load project directive for sync:', e);
        }

        state.teamSettings = {
            teamName: teamData.name || teamData.teamName || t('studio.log.coreTeam'),
            directive: directive,
            subAgents: subAgents
        };

        // Sync to executor if already initialized
        if (state.executor) {
            state.executor.setTeamContext(state.teamSettings);
        }

        console.log('[Studio] Team Settings auto-loaded into state:', state.teamSettings);

        if (subAgents.length === 0) {
            console.log('No sub-agents found for team:', teamId);
            const template = WORKFLOW_TEMPLATES[state.selectedTemplate];
            if (template) applyTemplate(template);
        }

    } catch (error) {
        console.error('Error loading sub-agents:', error);
        const template = WORKFLOW_TEMPLATES[state.selectedTemplate];
        if (template) applyTemplate(template);
    }
}

/**
 * Update Live Preview channel info based on Agent Team configuration
 * @param {string} teamId - The selected Agent Team ID
 */
async function updatePreviewChannel(teamId) {
    const channelIcon = document.getElementById('preview-channel-icon');
    const channelName = document.getElementById('preview-channel-name');
    const channelInfo = document.getElementById('preview-channel-info');

    if (!channelIcon || !channelName) return;

    try {
        // Try projectAgentTeamInstances first
        let teamDoc = await db.collection('projectAgentTeamInstances').doc(teamId).get();
        let team = null;

        if (teamDoc.exists) {
            team = teamDoc.data();
        } else {
            // Fallback to agentTeams
            teamDoc = await db.collection('agentTeams').doc(teamId).get();
            if (teamDoc.exists) {
                team = team.data();
            }
        }

        if (!team) {
            channelName.textContent = t('studio.log.teamNotFound');
            return;
        }

        const channels = team.channels || [];
        const bindings = team.channelBindings || {};

        // Channel icon mapping
        const channelIcons = {
            'x': '𝕏',
            'twitter': '𝕏',
            'instagram': '📷',
            'facebook': '📘',
            'linkedin': '💼',
            'youtube': '▶️',
            'tiktok': '🎵'
        };

        const channelDisplayNames = {
            'x': 'X (Twitter)',
            'twitter': 'X (Twitter)',
            'instagram': 'Instagram',
            'facebook': 'Facebook',
            'linkedin': 'LinkedIn',
            'youtube': 'YouTube',
            'tiktok': 'TikTok'
        };

        let provider = 'x'; // Default

        if (channels.length > 0) {
            // Get the first/primary channel
            const primaryChannel = channels[0];

            // Handle different data formats (string ID or object)
            if (typeof primaryChannel === 'string') {
                provider = primaryChannel;
            } else if (typeof primaryChannel === 'object') {
                provider = primaryChannel.provider || primaryChannel.key || primaryChannel.id;
            }
        } else {
            // If checking agentSetTemplate/agentTeams, channels might not be defined or different
            // Templates are usually channel-agnostic, but we can check if they have a default
            console.log('No channels configured for team, defaulting to X');
        }

        // Normalization
        if (provider === 'twitter') provider = 'x';

        // Update Channel Info UI
        channelIcon.textContent = channelIcons[provider] || '📺';
        channelName.textContent = channelDisplayNames[provider] || provider;
        channelInfo?.classList.add('ready');

        // Store in state for later use
        state.activeChannel = provider;

        // Show the appropriate preview panel
        showPreviewForChannel(provider);

        addLogEntry(t('studio.log.channelSetTo').replace('{{channelName}}', channelDisplayNames[provider] || provider), 'info');

        // Check for bindings and update profile
        // Normalize provider key for bindings lookup (handles 'x' vs 'twitter' legacy keys)
        const bindingKey = (provider === 'x' || provider === 'twitter')
            ? (bindings['x'] ? 'x' : 'twitter')
            : provider;

        const credentialId = bindings[bindingKey];
        if (credentialId) {
            try {
                // Fetch credential details to get handle/avatar
                const credDoc = await db.collection('userApiCredentials').doc(credentialId).get();
                if (credDoc.exists) {
                    const credData = credDoc.data();
                    const handle = credData.accountHandle || credData.accountUsername || null;
                    const name = credData.detailedName || credData.accountName || null;
                    const avatarUrl = credData.profileImageUrl || null;

                    if (name || handle) {
                        // Use credential info
                        updatePreviewProfile(name, handle, avatarUrl);
                        addLogEntry(t('studio.log.profileUpdatedFromAccount').replace('{{handle}}', handle), 'success');
                    }
                }
            } catch (credError) {
                console.error('Error loading bound credential:', credError);
            }
        } else {
            // If no binding, we stick with what we have (Project Name based)
            // But we might want to refresh it just in case it was overwritten by previous team selection
            // Get current project name from select
            const projectSelect = document.getElementById('project-select');
            const projectName = projectSelect.options[projectSelect.selectedIndex]?.textContent;
            if (projectName) {
                updatePreviewProfile(projectName);
            }
        }

    } catch (error) {
        console.error('Error loading team channels:', error);
        channelName.textContent = t('studio.log.errorLoadingChannel');
        // Fallback to X on error
        showPreviewForChannel('x');
    }
}

/**
 * Show the preview panel for the specified channel
 * @param {string} provider - Channel provider (x, instagram, etc.)
 */
function showPreviewForChannel(provider) {
    // Map provider to preview panel ID
    const panelMap = {
        'x': 'preview-twitter',
        'twitter': 'preview-twitter',
        'instagram': 'preview-instagram',
        'facebook': 'preview-facebook',
        'linkedin': 'preview-linkedin'
    };

    const panelId = panelMap[provider] || 'preview-twitter';

    // Hide all preview panels
    document.querySelectorAll('.preview-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Show the target panel
    const targetPanel = document.getElementById(panelId);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}

/**
 * Reset preview channel info when no team is selected
 */
function resetPreviewChannel() {
    const channelIcon = document.getElementById('preview-channel-icon');
    const channelName = document.getElementById('preview-channel-name');
    const channelInfo = document.getElementById('preview-channel-info');

    if (channelIcon) channelIcon.textContent = '📺';
    if (channelName) channelName.textContent = t('studio.log.selectAgentTeamToSeeChannel');
    channelInfo?.classList.remove('ready');
    state.activeChannel = null;
}

/**
 * Update Agent Roster UI based on loaded sub-agents
 * @param {Array} subAgents - Array of sub-agent objects from Firestore
 */
function updateAgentRosterUI(subAgents) {
    const grid = document.getElementById('agent-grid-center');
    if (!grid) return;

    grid.innerHTML = ''; // Clear previous

    if (!subAgents || subAgents.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #666; padding-top: 100px;">${t('studio.log.noAgentsInTeam')}</div>`;
        return;
    }

    subAgents.forEach(agent => {
        const card = document.createElement('div');
        card.className = 'agent-card active'; // Default to active for this team
        card.dataset.agent = agent.role_type || agent.type;

        // Simple Icon Mapping based on role
        let iconHtml = '<svg width="24" height="24" fill="#666"><circle cx="12" cy="12" r="10"/></svg>';
        // You can enhance this with the specific SVG mappings if needed later

        card.innerHTML = `
            <div class="agent-icon-wrapper" style="margin-bottom:8px;">${iconHtml}</div>
            <div class="agent-label" style="font-weight:600; color:#eee;">${agent.name || agent.role_type}</div>
            <div class="agent-role" style="font-size:11px; color:#aaa;">${agent.role_type}</div>
        `;

        // Styling for card (quick inline for now, ideally in CSS)
        card.style.cssText = `
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            cursor: default;
        `;

        grid.appendChild(card);
    });

    updateStats();
}

/**
 * Reset Agent Roster to default state
 */
function resetAgentRoster() {
    const cards = document.querySelectorAll('.agent-card');
    cards.forEach(card => {
        if (card.classList.contains('required')) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    // Reset to standard template
    const templateSelect = document.getElementById('workflow-template');
    if (templateSelect) templateSelect.value = 'standard';
    state.selectedTemplate = 'standard';
    applyTemplate(WORKFLOW_TEMPLATES.standard);
    updateStats();
}

// ============================================
// TEMPLATE SELECTOR
// ============================================
function initTemplateSelector() {
    const templateSelect = document.getElementById('workflow-template');
    if (!templateSelect) return;

    templateSelect.addEventListener('change', (e) => {
        const templateId = e.target.value;
        state.selectedTemplate = templateId;

        const template = WORKFLOW_TEMPLATES[templateId];
        if (template && templateId !== 'custom') {
            applyTemplate(template);
        }

        updateStats();
    });
}

function applyTemplate(template) {
    const cards = document.querySelectorAll('.agent-card:not(.disabled)');

    cards.forEach(card => {
        const agent = card.dataset.agent;
        const isInTemplate = template.agents.includes(agent);

        if (isInTemplate) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

// ============================================
// AGENT ROSTER (Card Grid)
// ============================================
// ============================================
// AGENT ROSTER (Dynamic Grid)
// ============================================
function initAgentRoster() {
    // No initialization needed for dynamic grid, handled by loadSubAgents -> updateAgentRosterUI
}

function getSelectedAgents() {
    const activeCards = document.querySelectorAll('#agent-grid-center .agent-card.active');
    return Array.from(activeCards).map(card => card.dataset.agent);
}

// ============================================
// STATS UPDATE
// ============================================

// Agent-specific time and cost estimates (직접 API 원가)
// 현재 Global Routing Default: Gemini 2.0 Flash (거의 무료)
// Image: DALL-E 3 or Imagen (per image cost)
const AGENT_ESTIMATES = {
    research: { time: 15, cost: 0.0001 },        // Gemini: 거의 무료
    seo_watcher: { time: 10, cost: 0.0001 },     // Gemini: 거의 무료
    knowledge_curator: { time: 12, cost: 0.0001 }, // Gemini: 거의 무료
    kpi: { time: 8, cost: 0.0001 },              // Gemini: 거의 무료
    planner: { time: 20, cost: 0.0002 },         // Gemini: 거의 무료
    creator_text: { time: 25, cost: 0.0002 },    // Gemini: 거의 무료
    creator_image: { time: 30, cost: 0.02 },     // Imagen: $0.02/image (Fast)
    creator_video: { time: 60, cost: 0.10 },     // Video API: ~$0.10/clip
    compliance: { time: 10, cost: 0.0001 },      // Gemini: 거의 무료
    seo_optimizer: { time: 12, cost: 0.0001 },   // Gemini: 거의 무료
    evaluator: { time: 15, cost: 0.0001 },       // Gemini: 거의 무료
    manager: { time: 10, cost: 0.0001 }          // Gemini: 거의 무료
};

async function updateStats() {
    const selectedAgents = getSelectedAgents();
    const totalAgents = document.querySelectorAll('.agent-card:not(.disabled)').length;

    // Update agent count display
    document.getElementById('stats-agents').textContent = t('studio.stats.agentsCount').replace('{{selected}}', selectedAgents.length).replace('{{total}}', totalAgents);

    // Calculate time and cost based on selected agents
    let totalTimeSeconds = 0;
    let totalCost = 0;

    selectedAgents.forEach(agentId => {
        const estimate = AGENT_ESTIMATES[agentId];
        if (estimate) {
            totalTimeSeconds += estimate.time;
            totalCost += estimate.cost;
        } else {
            // Default fallback for unknown agents
            totalTimeSeconds += 15;
            totalCost += 0.0001;
        }
    });

    // Format time display
    let timeDisplay;
    if (totalTimeSeconds < 60) {
        timeDisplay = `~${totalTimeSeconds}s`;
    } else {
        const minutes = Math.ceil(totalTimeSeconds / 60);
        timeDisplay = `~${minutes}min`;
    }

    const timeEl = document.getElementById('stats-time');
    if (timeEl) timeEl.textContent = timeDisplay;

    const costEl = document.getElementById('stats-cost');
    if (costEl) costEl.textContent = `$${totalCost.toFixed(4)}`;
}

// ============================================
// PREVIEW TABS
// ============================================
function initPreviewTabs() {
    const tabs = document.querySelectorAll('.preview-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding panel
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.preview-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`preview-${tabId}`).classList.add('active');
        });
    });
}

// ============================================
// FOOTER BUTTONS
// ============================================
function initFooterButtons() {
    const startBtn = document.getElementById('btn-send-instruction');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const retryBtn = document.getElementById('retry-btn');
    const completeBtn = document.getElementById('complete-btn');

    startBtn.addEventListener('click', handleInstructionSubmit);
    pauseBtn.addEventListener('click', togglePause);
    stopBtn.addEventListener('click', stopExecution);
    retryBtn.addEventListener('click', retryExecution);
    completeBtn.addEventListener('click', completeExecution);
    completeBtn.addEventListener('click', completeExecution);
}

// ============================================
// BOOSTER MODE LOGIC
// ============================================
function initBoosterToggle() {
    const boosterBtn = document.getElementById('booster-toggle-btn');
    if (boosterBtn) {
        boosterBtn.addEventListener('click', () => {
            state.isBoostMode = !state.isBoostMode;
            boosterBtn.classList.toggle('active', state.isBoostMode);

            if (state.isBoostMode) {
                addLogEntry(t('studio.log.boosterModeActivated'), 'success');
            } else {
                addLogEntry(t('studio.log.boosterModeDeactivated'), 'info');
            }
        });
    }
}

// ============================================
// SIDEBAR TOGGLE
// ============================================
function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const mainContent = document.querySelector('.studio-main');

    if (toggleBtn && mainContent) {
        toggleBtn.addEventListener('click', () => {
            mainContent.classList.toggle('collapsed');

            // Optional: Adjust zoom on resize if needed (usually automatic via CSS grid)
            // But if we're using canvas, we might need to handle resize events
            /* 
            if (window.dagCanvas) {
                setTimeout(() => {
                    // Trigger resize event to update canvas sizing if needed
                    window.dispatchEvent(new Event('resize'));
                }, 300); // 300ms matches CSS transition
            }
            */
        });
    }
}


function enableStartButton() {
    document.getElementById('btn-send-instruction').disabled = false;
}

function disableStartButton() {
    document.getElementById('btn-send-instruction').disabled = true;
}

// ============================================
// EXECUTION CONTROL
// ============================================

// ============================================
// EXECUTION CONTROL
// ============================================

// Global executor instance
let executor = null;

async function startExecution() {
    if (!state.selectedProject || !state.selectedAgentTeam) {
        alert(t('studio.alert.selectProjectAndTeam'));
        return;
    }

    state.isExecuting = true;
    state.isPaused = false;
    state.currentPhase = 1;
    state.currentAgent = 1;

    // Phase 1 Redesign: Update Studio UI for Running State
    disableStartButton();
    const startBtn = document.getElementById('btn-send-instruction');
    if (startBtn) {
        // startBtn.innerHTML = '<span>⏳</span> Processing...'; // Don't change text, just disable
    }

    // Reset DAG Visualization (if using simplified UI, maybe only Log)
    resetDAG();
    addLogEntry(t('studio.log.startingExecutionPipeline'), 'system');

    // Initialize Executor if needed
    if (!window.dagExecutor) {
        console.error('DAG Executor not initialized!');
        return;
    }

    // ✨ FINAL CONTEXT OVERRIDE: Use the content from the briefing board editor
    const briefEditor = document.getElementById('final-context-editor');
    if (briefEditor && briefEditor.value.trim() !== '') {
        console.log('[Studio] Using finalized brief from board editor.');
        state.planContext = {
            planName: (state.planContext && state.planContext.planName) || 'Finalized Strategy',
            content: briefEditor.value.trim(),
            projectId: state.selectedProject
        };
    }

    // Bind Event Listeners for Editor Updates
    window.dagExecutor.on('onContentGenerated', (data) => {
        // data: { agentId, content: { output, metadata, ... } }
        console.log('[Studio] Content Generated Event:', data);

        const { agentId, content } = data;

        // Determine channel based on agent or metadata
        // For now, assume single channel or check metadata
        let targetChannel = 'x'; // Default fallback
        if (state.targetChannels && state.targetChannels.length > 0) {
            targetChannel = state.targetChannels[0]; // Naive primary target
        }

        // Update Global Content State
        // Ensure structure: { text: "...", image: "...", status: "done" }
        if (!window.channelContents[targetChannel]) {
            window.channelContents[targetChannel] = { status: 'waiting' };
        }

        const channelData = window.channelContents[targetChannel];

        if (agentId === 'creator_text' || agentId.includes('text')) {
            channelData.text = typeof content.output === 'string' ? content.output : JSON.stringify(content.output);
            // Try to extract hashtags if present to help formatting
        }

        if (agentId === 'creator_image' || agentId.includes('image')) {
            // Image output usually contains URL
            const imageUrl = content.output?.url || content.output || (content.metadata && content.metadata.imageUrl);
            if (imageUrl) {
                channelData.image = imageUrl;
            }
        }

        channelData.status = 'done'; // Update status

        // Refresh Editor UI
        if (activePreviewChannel === targetChannel) {
            renderSingleChannelPreview(targetChannel);
        }

        // Also Refresh Tabs Status
        renderChannelTabs();

        addLogEntry(t('studio.log.newContentReceived').replace('{{channel}}', targetChannel), 'success');
    });

    // Start Timer
    startTimer();

    // Call Executor Start
    try {
        const selectedAgents = getSelectedAgents();

        // ✨ Phase 4: Tier & Multi-Channel
        const qualityTier = state.isBoostMode ? 'BOOST' : 'LITE';
        const targetChannels = state.targetChannels || ['x'];

        await window.dagExecutor.start(
            selectedAgents,
            state.selectedProject,
            state.selectedAgentTeam,
            state.planContext,
            qualityTier,
            targetChannels
        );

    } catch (err) {
        console.error('Execution Error:', err);
        addLogEntry(t('studio.log.error').replace('{{message}}', err.message), 'error');
        state.isExecuting = false;
        enableStartButton();
    }
}

function togglePause() {
    state.isPaused = !state.isPaused;
    const pauseBtn = document.getElementById('pause-btn');

    if (state.isPaused) {
        if (executor) executor.pause();
        pauseBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            ${t('studio.button.resume')}
        `;
        stopTimer();
    } else {
        if (executor) executor.resume();
        pauseBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            ${t('studio.button.pause')}
        `;
        startTimer();
    }
}

function stopExecution() {
    if (!confirm(t('studio.alert.confirmStopExecution'))) return;

    if (executor) executor.stop();

    state.isExecuting = false;
    state.isPaused = false;
    stopTimer();

    // Reset UI (with null checks)
    const startBtn = document.getElementById('btn-send-instruction');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const projectSelect = document.getElementById('project-select');
    const agentTeamSelect = document.getElementById('agentteam-select');

    if (startBtn) startBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
    if (projectSelect) projectSelect.disabled = false;
    if (agentTeamSelect) agentTeamSelect.disabled = false;
}

function retryExecution() {
    addLogEntry(t('studio.log.retryingLastFailedAgent'), 'running');
    // TODO: Implement retry logic
}

function completeExecution() {
    state.isExecuting = false;
    stopTimer();

    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    if (pauseBtn) pauseBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
    document.getElementById('retry-btn').disabled = true;
    document.getElementById('complete-btn').disabled = true;

    addLogEntry(t('studio.log.executionCompleted'), 'success');
}

// ============================================
// TIMER
// ============================================
function startTimer() {
    state.timerInterval = setInterval(() => {
        state.timerSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(state.timerSeconds / 60).toString().padStart(2, '0');
    const seconds = (state.timerSeconds % 60).toString().padStart(2, '0');
    document.querySelector('#studio-timer span').textContent = `${minutes}:${seconds}`;
}

// ============================================
// FOOTER PROGRESS
// ============================================
function updateFooterProgress() {
    const totalAgents = getSelectedAgents().length;
    const footerProgress = document.getElementById('footer-progress');
    if (footerProgress) {
        footerProgress.textContent =
            t('studio.footer.progress').replace('{{phase}}', state.currentPhase).replace('{{agent}}', state.currentAgent).replace('{{totalAgents}}', totalAgents);
    }
}

// ============================================
// DAG VISUALIZATION
// ============================================

// DAG execution order for animation
const DAG_EXECUTION_ORDER = [
    // Phase 1: Research (parallel)
    ['node-research', 'node-seo', 'node-knowledge', 'node-kpi'],
    // Aggregator
    ['node-planner'],
    // Phase 2: Creation (parallel)
    ['node-text', 'node-image'],
    // Phase 3: Validation (parallel)
    ['node-compliance', 'node-seo-opt', 'node-evaluator'],
    // Phase 4: Final
    ['node-manager']
];

// Connection paths for particle animation
const DAG_PATHS = {
    'node-research': ['path-research-planner'],
    'node-seo': ['path-seo-planner'],
    'node-knowledge': ['path-knowledge-planner'],
    'node-kpi': ['path-kpi-planner'],
    'node-planner': ['path-planner-text', 'path-planner-image', 'path-planner-video'],
    'node-text': ['path-text-compliance', 'path-text-seo'],
    'node-image': ['path-image-evaluator'],
    'node-compliance': ['path-compliance-manager'],
    'node-seo-opt': ['path-seo-manager'],
    'node-evaluator': ['path-evaluator-manager']
};

// Set node state
function setNodeState(nodeId, state) {
    const node = document.getElementById(nodeId);
    if (node) {
        node.classList.remove('waiting', 'running', 'complete', 'error');
        node.classList.add(state);

        // Add Review Button if complete
        if (state === 'complete') {
            addReviewButton(node, nodeId);
        }
    }
}

// Create particle on path
function createParticle(pathId) {
    const path = document.getElementById(pathId);
    if (!path) return;

    const pathD = path.getAttribute('d');
    const particlesGroup = document.getElementById('dag-particles');

    // Create particle element
    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    particle.setAttribute('r', '4');
    particle.classList.add('dag-particle');

    // Use CSS offset-path for animation
    particle.style.offsetPath = `path('${pathD}')`;
    particle.style.fill = 'url(#particle-gradient)';

    particlesGroup.appendChild(particle);

    // Trigger animation
    requestAnimationFrame(() => {
        particle.style.animation = 'particle-flow 1.2s ease-in-out forwards';
    });

    // Remove particle after animation
    setTimeout(() => {
        particle.remove();
    }, 1300);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Update the profile information in Live Preview
 * @param {string} projectName - Display name of the project
 * @param {string|null} handle - Optional handle override
 * @param {string|null} avatarUrl - Optional avatar URL override
 */
function updatePreviewProfile(projectName, handle = null, avatarUrl = null) {
    if (!projectName) return;

    // Generate handle if not provided
    const displayHandle = handle || '@' + projectName.replace(/\s+/g, '').toLowerCase();

    // Store in state for use by getFormattedPreview
    state.channelProfile = {
        name: projectName,
        handle: displayHandle,
        avatarUrl: avatarUrl
    };
    console.log('[Studio] Profile updated:', state.channelProfile);

    // Update Name and Handle in legacy preview elements
    const nameEl = document.getElementById('preview-profile-name');
    const handleEl = document.getElementById('preview-profile-handle');

    if (nameEl) nameEl.textContent = projectName;
    if (handleEl) handleEl.textContent = displayHandle;

    // Update Avatar
    const avatarContainer = document.getElementById('preview-avatar-container');
    if (avatarContainer) {
        if (avatarUrl) {
            avatarContainer.innerHTML = `<img src="${avatarUrl}" alt="${t('studio.preview.profile')}">`;
        } else {
            // Create initial avatar
            const initial = projectName.charAt(0).toUpperCase();
            avatarContainer.innerHTML = `<div class="avatar-placeholder" style="background:${stringToColor(projectName)}">${initial}</div>`;
        }
    }

    // NEW: Update Orchestrator Header Name
    const headerProjectName = document.getElementById('current-project-name');
    if (headerProjectName) {
        headerProjectName.textContent = projectName;
    }
}

/**
 * Generate a consistent color from a string
 */
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

// Fire particles from node to connected paths
function fireParticles(nodeId) {
    const paths = DAG_PATHS[nodeId];
    if (paths) {
        paths.forEach((pathId, index) => {
            setTimeout(() => {
                createParticle(pathId);
                // Mark path as active
                const path = document.getElementById(pathId);
                if (path) path.classList.add('active');
            }, index * 100);
        });
    }
}

// Simulate execution demo
async function runExecutionDemo() {
    addLogEntry(t('studio.log.startingWorkflowExecutionDemo'), 'running');

    for (let phaseIndex = 0; phaseIndex < DAG_EXECUTION_ORDER.length; phaseIndex++) {
        const phaseNodes = DAG_EXECUTION_ORDER[phaseIndex];

        // Set all nodes in phase to running
        phaseNodes.forEach(nodeId => {
            const node = document.getElementById(nodeId);
            if (node && !node.classList.contains('disabled')) {
                setNodeState(nodeId, 'running');
                addLogEntry(t('studio.log.agentStarted').replace('{{agentId}}', nodeId.replace('node-', '')), 'running');
            }
        });

        // Wait for "processing"
        await sleep(1500);

        // Complete nodes and fire particles
        phaseNodes.forEach(nodeId => {
            const node = document.getElementById(nodeId);
            if (node && !node.classList.contains('disabled')) {
                setNodeState(nodeId, 'complete');
                fireParticles(nodeId);
                addLogEntry(t('studio.log.agentCompleted').replace('{{agentId}}', nodeId.replace('node-', '')), 'success');
            }
        });

        // Trigger content streaming based on which phase completed
        if (phaseIndex === 2) { // Creation phase (Text, Image)
            streamTextContent();
        }

        // Mark outgoing paths as complete
        await sleep(500);
        phaseNodes.forEach(nodeId => {
            const paths = DAG_PATHS[nodeId];
            if (paths) {
                paths.forEach(pathId => {
                    const path = document.getElementById(pathId);
                    if (path) {
                        path.classList.remove('active');
                        path.classList.add('complete');
                    }
                });
            }
        });

        await sleep(500);
    }

    addLogEntry(t('studio.log.workflowExecutionCompleted'), 'success');
    updateContentStats();
}

// ============================================
// CONTENT STREAMING
// ============================================

const SAMPLE_CONTENT = {
    twitter: `🚀 Exciting news! We're thrilled to announce our latest innovation that's changing the game. 

Stay tuned for more updates. The future is here, and we're leading the way! 

#Innovation #Technology #Future #AI`,
    instagram: `✨ Innovation meets creativity! 

We're pushing boundaries and redefining what's possible. This is just the beginning of an incredible journey.

Double tap if you're ready for the future! 💫

#Innovation #Creative #Future #Tech #Inspiration`,
    facebook: `We're excited to share some incredible news with our community! 

After months of hard work and dedication, we're launching something truly special. This represents our commitment to innovation and excellence.

Thank you for being part of this journey with us. Your support means everything! 

👉 Click the link in bio to learn more.`,
    linkedin: `Proud to announce a significant milestone for our company.

Innovation doesn't happen overnight. It takes dedication, teamwork, and an unwavering commitment to excellence.

Today, we're taking the next step in our journey to transform the industry. This achievement reflects the hard work of our incredible team.

What's your take on the future of AI in content creation?

#Leadership #Innovation #AI #ContentCreation #Technology`
};

// Typing animation for text streaming
/**
 * Streams text content into a specific channel's preview card.
 * Updated to use new channelContents system.
 */
async function streamChannelContent(channel, content) {
    console.log('[Studio] streamChannelContent called:', { channel, contentType: typeof content });

    // Extract text from various content formats
    let text = content;
    if (typeof content === 'object' && content !== null) {
        // If it's an object like {text: "..."} or just the content directly
        text = content.text || content.content || JSON.stringify(content);
    }

    // Clean up any remaining JSON format if text starts with {
    if (typeof text === 'string' && text.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(text);
            text = parsed[channel] || parsed.text || parsed.content || text;
        } catch (e) {
            // Keep original text if parsing fails
        }
    }

    console.log('[Studio] Storing content for channel:', channel, 'text length:', text?.length);

    // Store content in the new system
    if (!window.channelContents) {
        window.channelContents = {};
    }
    if (!window.channelContents[channel]) {
        window.channelContents[channel] = { status: 'completed' };
    }
    window.channelContents[channel].text = text;
    window.channelContents[channel].status = 'completed';

    // Update tab status
    const tab = document.querySelector(`.channel-tab[data-channel="${channel}"] .tab-status`);
    if (tab) {
        tab.classList.remove('waiting');
        tab.classList.add('completed');
    }

    // Always re-render the preview for this channel
    // If this channel is active, render immediately; otherwise, set it as active and render
    if (activePreviewChannel === channel) {
        console.log('[Studio] Rendering active channel:', channel);
        renderSingleChannelPreview(channel);
    } else if (!activePreviewChannel || activePreviewChannel === state.targetChannels?.[0]) {
        // If no active channel or it's the first target channel, switch to this one
        activePreviewChannel = channel;
        console.log('[Studio] Switching to channel and rendering:', channel);
        renderSingleChannelPreview(channel);
    }

    // Legacy support: try old DOM element if exists
    const textEl = document.getElementById(`${channel}-text`);
    if (!textEl) {
        // Not a warning - this is expected in the new tabbed preview system
        return;
    }

    // Clear existing content and prepare for streaming
    textEl.innerHTML = '';
    textEl.classList.add('typing-cursor');
    textEl.style.whiteSpace = 'pre-wrap';

    // Update status UI
    const statusEl = document.getElementById(`status-${channel}`);
    if (statusEl) {
        statusEl.classList.remove('waiting');
        statusEl.classList.add('completed');
        statusEl.querySelector('.status-text').textContent = t('studio.status.draftReady');
    }

    // Stream characters
    for (let i = 0; i < text.length; i++) {
        textEl.textContent += text[i];

        // Scroll container if needed
        const cardBody = textEl.closest('.bento-card-body');
        if (cardBody) cardBody.scrollTop = cardBody.scrollHeight;

        // Natural typing delay
        const delay = text[i] === '\n' ? 50 : (Math.random() * 10 + 2);
        await sleep(delay);
    }

    textEl.classList.remove('typing-cursor');
    textEl.classList.add('stream-complete');

    // Show approval controls for this channel
    const approvalEl = document.getElementById(`approval-${channel}`);
    if (approvalEl) approvalEl.style.display = 'block';
}

/**
 * Handles displaying content across multiple channels simultaneously.
 */
function displayMultiChannelContent(content) {
    console.log('[Studio] displayMultiChannelContent called:', { contentType: typeof content, targetChannels: state.targetChannels });

    if (!content) {
        console.log('[Studio] displayMultiChannelContent: content is null/undefined');
        return;
    }

    // If content is a simple string, treat it as primarily for X (legacy support)
    if (typeof content === 'string') {
        console.log('[Studio] Content is string, streaming to x channel');
        streamChannelContent('x', content);
        return;
    }

    // Iterate through all target channels and stream content if available
    console.log('[Studio] Content keys:', Object.keys(content));
    state.targetChannels.forEach(channel => {
        const channelContent = content[channel] || content.content; // Fallback to generic content
        console.log('[Studio] Channel:', channel, 'hasContent:', !!channelContent);
        if (channelContent) {
            streamChannelContent(channel, channelContent);
        }
    });
}

/**
 * Update images across channels if relevant.
 */
function updateMultiChannelImages(imageUrl) {
    if (!imageUrl) return;

    // Store image URL in channelContents for each target channel
    if (!window.channelContents) {
        window.channelContents = {};
    }

    state.targetChannels.forEach(channel => {
        // Store in new system
        if (!window.channelContents[channel]) {
            window.channelContents[channel] = { status: 'completed' };
        }
        window.channelContents[channel].imageUrl = imageUrl;

        // Legacy: Update DOM elements if they exist
        const mediaContainer = document.getElementById(`${channel}-media`);
        if (mediaContainer) {
            mediaContainer.innerHTML = `<img src="${imageUrl}" alt="${channel} ${t('studio.preview.vision')}" class="preview-img">`;
        }
    });

    console.log('[Studio] Image URL stored in channelContents:', imageUrl);
}

// Update Agent Insights circular progress
function updateContentStats(results) {
    console.log('[Studio] updateContentStats called with:', results);

    // SEO Score - from seo_optimizer agent
    const seoResult = results?.seo_optimizer;
    const seoScore = seoResult?.score ?? seoResult?.seoScore ?? null;

    if (seoScore !== null) {
        updateCircularProgress('seo', seoScore);
        document.getElementById('seo-value').textContent = seoScore;
        const seoLabel = seoScore >= 90 ? t('studio.seo.excellent') : seoScore >= 70 ? t('studio.seo.good') : seoScore >= 50 ? t('studio.seo.fair') : t('studio.seo.needsWork');
        document.getElementById('seo-sublabel').textContent = `${seoScore}/100 - ${seoLabel}`;
    } else {
        // No data yet
        updateCircularProgress('seo', 0);
        document.getElementById('seo-value').textContent = '--';
        document.getElementById('seo-sublabel').textContent = `--/100 - ${t('studio.seo.waiting')}`;
    }

    // Compliance - from compliance agent
    const complianceResult = results?.compliance;
    const complianceScore = complianceResult?.score ?? complianceResult?.complianceScore ?? null;
    const compliancePassed = complianceResult?.passed ?? complianceResult?.isCompliant ?? null;

    if (complianceScore !== null) {
        updateCircularProgress('compliance', complianceScore);
        document.getElementById('compliance-value').textContent = complianceScore;
        document.getElementById('compliance-sublabel').textContent = `${t('studio.compliance.status')}: ${compliancePassed ? t('studio.compliance.passed') : t('studio.compliance.issuesFound')}`;
        document.getElementById('compliance-sublabel').classList.toggle('passed', compliancePassed);

        const checkmark = document.getElementById('compliance-check');
        if (checkmark) checkmark.style.display = compliancePassed ? 'flex' : 'none';
    } else if (compliancePassed !== null) {
        // Boolean result only
        updateCircularProgress('compliance', compliancePassed ? 100 : 50);
        document.getElementById('compliance-value').textContent = compliancePassed ? '100' : '50';
        document.getElementById('compliance-sublabel').textContent = `${t('studio.compliance.status')}: ${compliancePassed ? t('studio.compliance.passed') : t('studio.compliance.issuesFound')}`;
        document.getElementById('compliance-sublabel').classList.toggle('passed', compliancePassed);
    } else {
        // No data yet
        updateCircularProgress('compliance', 0);
        document.getElementById('compliance-value').textContent = '--';
        document.getElementById('compliance-sublabel').textContent = `${t('studio.compliance.status')}: ${t('studio.compliance.waiting')}`;
        document.getElementById('compliance-sublabel').classList.remove('passed');
    }
}

// Animate circular progress
function updateCircularProgress(type, percentage) {
    const ring = document.getElementById(`${type}-progress-ring`);
    if (!ring) return;

    // Circle circumference = 2 * PI * radius (42) = ~264
    const circumference = 264;
    const offset = circumference - (percentage / 100) * circumference;

    ring.style.strokeDashoffset = offset;
}

// ============================================
// CONTENT APPROVAL CONTROLS
// ============================================

let contentStatus = 'pending'; // 'pending', 'discarded', 'approved'

function setContentStatus(status) {
    contentStatus = status;

    // Update status badges
    document.querySelectorAll('.status-badge').forEach(badge => {
        badge.classList.remove('active');
    });

    const statusMap = {
        'pending': 'status-pending',
        'discarded': 'status-discarded',
        'approved': 'status-approved'
    };

    const activeBadge = document.getElementById(statusMap[status]);
    if (activeBadge) activeBadge.classList.add('active');
}

// Edit Mode State
let isEditMode = false;

/**
 * Toggle edit mode for content preview
 */
function toggleEditMode() {
    isEditMode = !isEditMode;

    const editBtn = document.getElementById('btn-edit');
    const editBtnText = document.getElementById('btn-edit-text');
    const previewArea = document.getElementById('single-channel-preview');

    // Find editable content elements in the new tabbed preview system
    const editableSelectors = [
        '.x-content',
        '.linkedin-content',
        '.facebook-content',
        '.insta-caption',
        '.blog-content',
        '.youtube-description'
    ];

    const editableElements = previewArea ?
        editableSelectors.map(sel => previewArea.querySelector(sel)).filter(el => el !== null) : [];

    if (isEditMode) {
        // Enable edit mode
        if (editableElements.length === 0) {
            addLogEntry(t('studio.log.noContentToEdit'), 'warning');
            isEditMode = false;
            return;
        }

        editableElements.forEach(el => {
            el.contentEditable = 'true';
            el.classList.add('editable-active');
            el.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
            el.style.cursor = 'text';
            el.style.outline = '2px dashed rgba(99, 102, 241, 0.5)';
            el.style.borderRadius = '8px';
            el.style.padding = '8px';

            // Save original content for potential revert
            el.dataset.originalContent = el.textContent;
        });

        if (editBtn) editBtn.classList.add('active');
        if (editBtnText) editBtnText.textContent = t('studio.button.done');
        addLogEntry(t('studio.log.editModeEnabled'), 'info');
    } else {
        // Disable edit mode and save changes
        editableElements.forEach(el => {
            el.contentEditable = 'false';
            el.classList.remove('editable-active');
            el.style.backgroundColor = '';
            el.style.cursor = '';
            el.style.outline = '';
            el.style.borderRadius = '';
            el.style.padding = '';

            // Update channelContents with edited text
            const newText = el.textContent;
            if (activePreviewChannel && window.channelContents[activePreviewChannel]) {
                window.channelContents[activePreviewChannel].text = newText;
            }
        });

        if (editBtn) editBtn.classList.remove('active');
        if (editBtnText) editBtnText.textContent = t('studio.button.edit');
        addLogEntry(t('studio.log.changesSaved'), 'success');
    }
}

function discardContent() {
    if (!confirm(t('studio.alert.confirmDiscardContent'))) return;

    setContentStatus('discarded');
    addLogEntry(t('studio.log.contentDiscarded'), 'error');

    // Clear Twitter preview
    const twitterContent = document.getElementById('twitter-content');
    if (twitterContent) {
        twitterContent.innerHTML = `<p class="preview-placeholder">${t('studio.preview.contentDiscarded')}</p>`;
    }
}

function regenerateContent() {
    // Phase 1 Redesign: Feedback now comes from the Chat Input (Instruction)
    // If the user typed something in the main input, treat it as feedback for this regeneration.
    const chatInput = document.getElementById('main-instruction-input');
    const feedback = chatInput ? chatInput.value.trim() : '';

    // Clear input if used
    if (chatInput && feedback) {
        // Also log it as a user message
        addLogEntry(feedback, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    setContentStatus('pending');
    addLogEntry(feedback ? t('studio.log.regeneratingWithFeedback').replace('{{feedback}}', feedback) : t('studio.log.regeneratingContent'), 'running');

    // Trigger DAG
    if (window.dagExecutor) {
        window.dagExecutor.regenerateCreation(feedback);
    } else {
        console.error('DAG Executor not found');
        addLogEntry(t('studio.log.systemErrorDagExecutor'), 'error');
    }
}

/**
 * =====================================================
 * ✏️ EDITOR ENGINE LOGIC (Skywork Style)
 * =====================================================
 */
function initEditorEngine() {
    console.log('[Studio] Editor Engine Initialized');

    // Bind Toolbar Actions
    const editBtn = document.getElementById('btn-edit-mode');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            // Re-use existing toggleEditMode legacy function or implement new
            if (typeof toggleEditMode === 'function') {
                toggleEditMode();
                editBtn.classList.toggle('active');
            } else {
                addLogEntry(t('studio.log.editModeNotAvailable'), 'warning');
            }
        });
    }

    const exportBtn = document.querySelector('.btn-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            addLogEntry(t('studio.log.exportingContent'), 'info');
            setTimeout(() => {
                addLogEntry(t('studio.log.exportComplete'), 'success');
            }, 1000);
        });
    }
}

function toggleCodeView() {
    const canvas = document.getElementById('single-channel-preview');
    if (!canvas) return;

    // Simple toggle between visual/code (mock implementation)
    if (canvas.dataset.view === 'code') {
        canvas.dataset.view = 'visual';
        // Restore visual (would trigger re-render)
        if (activePreviewChannel) window.renderSingleChannelPreview(activePreviewChannel);
    } else {
        canvas.dataset.view = 'code';
        const currentHTML = canvas.innerHTML;
        const encoded = currentHTML.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        canvas.innerHTML = `<pre style="color:#aaa; font-family:monospace; padding:12px; overflow:auto; white-space:pre-wrap;">${encoded}</pre>`;
    }
}

function approveContent() {
    setContentStatus('approved');
    addLogEntry(t('studio.log.contentApproved'), 'success');

    // Update approve button style
    const approveBtn = document.getElementById('btn-approve');
    if (approveBtn) {
        approveBtn.classList.add('approved');
        approveBtn.disabled = true;
        approveBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            ${t('studio.button.publishing')}
        `;
    }

    // NEW: Get content from new channel system (window.channelContents)
    let tweetText = '';
    const channel = activePreviewChannel || 'x';

    // Try new system first
    if (window.channelContents && window.channelContents[channel]) {
        tweetText = window.channelContents[channel].text || '';
    }

    // Fallback to legacy system
    if (!tweetText) {
        const twitterContent = document.getElementById('twitter-content');
        tweetText = twitterContent ? twitterContent.textContent.trim() : '';
    }

    // Fallback to single-channel-preview content
    if (!tweetText) {
        const previewArea = document.getElementById('single-channel-preview');
        const contentEl = previewArea?.querySelector('.x-content, .linkedin-content, .facebook-content, .insta-caption');
        tweetText = contentEl ? contentEl.textContent.trim() : '';
    }

    console.log('[Studio] approveContent - channel:', channel, 'text length:', tweetText?.length);

    if (!tweetText || tweetText === t('studio.preview.yourGeneratedTweet')) {
        addLogEntry(t('studio.log.noContentToPublish'), 'error');
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                ${t('studio.button.approve')}
            `;
            approveBtn.classList.remove('approved');
        }
        return;
    }

    // Call postToTwitter Cloud Function
    const postToTwitter = firebase.functions().httpsCallable('postToTwitter');
    const projectId = state.selectedProject;
    const contentId = state.currentContentId || `content_${Date.now()}`;
    const userId = firebase.auth().currentUser?.uid;

    // Get image URL - try new system first, then legacy
    let imageUrl = null;
    if (window.channelContents && window.channelContents[channel]?.imageUrl) {
        imageUrl = window.channelContents[channel].imageUrl;
    }
    if (!imageUrl) {
        const imageContainer = document.getElementById('twitter-image');
        const imageEl = imageContainer?.querySelector('img');
        imageUrl = imageEl?.src || null;
    }
    // Also try single-channel-preview
    if (!imageUrl) {
        const previewArea = document.getElementById('single-channel-preview');
        const imgEl = previewArea?.querySelector('img.preview-img, img.x-media-img');
        imageUrl = imgEl?.src || null;
    }

    console.log('[Studio] Posting with image:', imageUrl);
    addLogEntry(t('studio.log.postingToX'), 'info');

    postToTwitter({ projectId, contentId, tweetText, userId, imageUrl })
        .then((result) => {
            console.log('[Studio] Posted to Twitter:', result);
            addLogEntry(t('studio.log.postedToX').replace('{{tweetId}}', result.data.tweetId), 'success');

            if (approveBtn) {
                approveBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    ${t('studio.button.published')}
                `;
            }
        })
        .catch((error) => {
            console.error('[Studio] Failed to post to Twitter:', error);
            addLogEntry(t('studio.log.failedToPost').replace('{{message}}', error.message), 'error');

            if (approveBtn) {
                approveBtn.disabled = false;
                approveBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    ${t('studio.button.retry')}
                `;
                approveBtn.classList.remove('approved');
            }
        });
}

// Helper: sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Reset DAG to initial state
function resetDAG() {
    // Reset all nodes to waiting
    document.querySelectorAll('.dag-node').forEach(node => {
        node.classList.remove('running', 'complete', 'error');
        node.classList.add('waiting');
    });

    // Reset all paths
    document.querySelectorAll('.dag-path').forEach(path => {
        path.classList.remove('active', 'complete');
    });

    // Clear particles
    const particlesGroup = document.getElementById('dag-particles');
    if (particlesGroup) {
        particlesGroup.innerHTML = '';
    }
}

// Initialize DAG interactivity
function initDAG() {
    // Add click handlers to nodes
    document.querySelectorAll('.dag-node:not(.disabled)').forEach(node => {
        node.addEventListener('click', () => {
            const currentState = node.classList.contains('waiting') ? 'running' :
                node.classList.contains('running') ? 'complete' : 'waiting';

            node.classList.remove('waiting', 'running', 'complete');
            node.classList.add(currentState);

            if (currentState === 'complete') {
                fireParticles(node.id);
            }
        });
    });
}

// ============================================
// ZOOM & PAN CONTROLS
// ============================================
let dagZoom = 1;
let dagPan = { x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };

function initZoomControls() {
    const canvas = document.getElementById('dag-canvas');
    const visualizer = document.getElementById('dag-visualizer');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    const zoomLevelEl = document.getElementById('zoom-level');

    if (!canvas || !zoomInBtn) return;

    // Zoom In
    zoomInBtn.addEventListener('click', () => {
        dagZoom = Math.min(dagZoom + 0.2, 2);
        updateZoom();
    });

    // Zoom Out
    zoomOutBtn.addEventListener('click', () => {
        dagZoom = Math.max(dagZoom - 0.2, 0.5);
        updateZoom();
    });

    // Reset
    zoomResetBtn.addEventListener('click', () => {
        dagZoom = 1;
        dagPan = { x: 0, y: 0 };
        updateZoom();
    });

    // Mouse wheel zoom (reduced sensitivity)
    visualizer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        dagZoom = Math.max(0.5, Math.min(2, dagZoom + delta));
        updateZoom();
    });

    // Pan with mouse drag
    visualizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStart = { x: e.clientX - dagPan.x, y: e.clientY - dagPan.y };
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        dagPan.x = e.clientX - dragStart.x;
        dagPan.y = e.clientY - dragStart.y;
        updateZoom();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    function updateZoom() {
        canvas.style.transform = `translate(${dagPan.x}px, ${dagPan.y}px) scale(${dagZoom})`;
        zoomLevelEl.textContent = `${Math.round(dagZoom * 100)}%`;
    }
}

// Call initDAG, initZoomControls, and initTooltip on load
document.addEventListener('DOMContentLoaded', () => {
    initDAG();
    initZoomControls();
    initTooltip();
});

// ============================================
// TOOLTIP CONTROL
// ============================================
function initTooltip() {
    const icon = document.querySelector('.info-icon');
    const tooltip = document.getElementById('insights-tooltip');

    if (icon && tooltip) {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            tooltip.classList.toggle('visible');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!tooltip.contains(e.target) && !icon.contains(e.target)) {
                tooltip.classList.remove('visible');
            }
        });
    }
}


// ============================================
// AGENT REPORT & REVIEW UI
// ============================================

/**
 * Add Review Button & Model Indicator to Node (SVG)
 */
function addReviewButton(node, nodeId) {
    if (node.querySelector('.node-actions-group')) return;

    // Map Node ID back to Agent ID (fix for Unknown badges)
    const getAgentIdFromNodeId = (nid) => {
        const id = nid.replace('node-', '');
        const map = {
            'seo': 'seo_watcher',
            'knowledge': 'knowledge_curator',
            'text': 'creator_text',
            'image': 'creator_image',
            'video': 'creator_video',
            'seo-opt': 'seo_optimizer'
        };
        return map[id] || id;
    };

    const agentId = getAgentIdFromNodeId(nodeId);

    // 1. Get Metadata & Model Info
    let modelName = t('studio.agentReport.unknownModel');
    let isMock = false;

    // Access DAG Executor results
    const execInstance = window.dagExecutor || executor;
    if (execInstance && execInstance.state.executionResults[agentId]) {
        const res = execInstance.state.executionResults[agentId];
        const meta = res.metadata || (res.data && res.data.metadata);

        if (res.skipped || (meta && meta.isSkipped)) {
            modelName = t('studio.agentReport.reused');
            isMock = false;
        } else if (meta && meta.model) {
            modelName = meta.model;
            isMock = meta.isMock || (meta.provider === 'system');
        } else if (meta && meta.provider) {
            // Fallback: Infer model from provider if model name is missing
            if (meta.provider === 'google') modelName = 'Gemini';
            else if (meta.provider === 'openai') modelName = 'GPT-4';
            else if (meta.provider === 'anthropic') modelName = 'Claude';
            else modelName = meta.provider;
        } else if (res.isMock) {
            isMock = true;
            modelName = t('studio.agentReport.mock');
        }
    }

    // Shorten Model Name for UI
    if (typeof modelName === 'string') {
        if (modelName.toLowerCase().includes('gpt-4')) modelName = 'GPT-4';
        else if (modelName.toLowerCase().includes('gemini')) modelName = 'Gemini';
        else if (modelName.toLowerCase().includes('claude')) modelName = 'Claude';
        else if (modelName.toLowerCase().includes('mock')) modelName = t('studio.agentReport.mock');
        else if (modelName.toLowerCase().includes('reused')) modelName = t('studio.agentReport.reused');
        else if (modelName.length > 8) modelName = modelName.substring(0, 6) + '..';
    }

    // Force override if Boost Mode was active during this run (imperfect check, but helpful)
    if (state.isBoostMode && modelName === 'GPT-4') {
        // If config says Boost=Gemini (which we don't know here easily without reading global config), 
        // we might still show GPT-4 if the backend actually used GPT-4.
        // However, if the user sees 'GPT-4' but expects Gemini, it's confusing.
        // Let's rely on the metadata from `executionResults` which SHOULD be correct if the backend returned it.
    }

    // 2. Create SVG Group
    const btnGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    btnGroup.setAttribute("class", "node-actions-group");
    // Position: Center below node (Node Width 80 -> Center 40)
    // Group Width approx 70 (34 + 2 + 34). Start X = 40 - 35 = 5.
    btnGroup.setAttribute("transform", "translate(5, 65)");
    btnGroup.setAttribute("style", "cursor: pointer");
    btnGroup.setAttribute("onclick", `openAgentReport('${agentId}')`);

    // --- Model Badge (Left) ---
    const badgeRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    badgeRect.setAttribute("width", "34");
    badgeRect.setAttribute("height", "18");
    badgeRect.setAttribute("rx", "4");
    // Color: Mock -> Amber(Dark), Real -> Slate
    badgeRect.setAttribute("fill", isMock ? "#b45309" : "#1e293b");

    const badgeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    badgeText.setAttribute("x", "17");
    badgeText.setAttribute("y", "12");
    badgeText.setAttribute("text-anchor", "middle");
    badgeText.setAttribute("fill", isMock ? "#fff" : "#94a3b8");
    badgeText.setAttribute("font-size", "8");
    badgeText.setAttribute("font-weight", "600");
    badgeText.textContent = modelName;

    // --- Review Button (Right) ---
    const reviewRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    reviewRect.setAttribute("x", "36"); // Gap
    reviewRect.setAttribute("width", "34");
    reviewRect.setAttribute("height", "18");
    reviewRect.setAttribute("rx", "4");
    reviewRect.setAttribute("fill", "#6366f1"); // Indigo
    reviewRect.setAttribute("filter", "url(#glow-running)");

    const reviewText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    reviewText.setAttribute("x", "53");
    reviewText.setAttribute("y", "12");
    reviewText.setAttribute("text-anchor", "middle");
    reviewText.setAttribute("fill", "white");
    reviewText.setAttribute("font-size", "8");
    reviewText.setAttribute("font-weight", "600");
    reviewText.textContent = t('studio.agentReport.view');

    // Append
    btnGroup.appendChild(badgeRect);
    btnGroup.appendChild(badgeText);
    btnGroup.appendChild(reviewRect);
    btnGroup.appendChild(reviewText);

    // Animate In
    btnGroup.style.opacity = '0';
    node.appendChild(btnGroup);

    setTimeout(() => {
        btnGroup.style.transition = 'opacity 0.3s';
        btnGroup.style.opacity = '1';
    }, 100);
}

/**
 * Open Agent Report Modal
 */
window.openAgentReport = (agentId) => {
    const modal = document.getElementById('agent-report-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    // Header
    const agentName = agentId.replace('_', ' ').toUpperCase();
    const nameEl = document.getElementById('report-agent-name');
    if (nameEl) nameEl.textContent = `${agentName} ${t('studio.agentReport.report')}`;

    // Metadata Retrieval
    let metadata = {};
    // Use window.dagExecutor if available, or fallback to any globally stored executor
    // Assuming 'executor' variable in studio.js might be accessible or stored on window
    if (window.DAGExecutor && window.dagExecutor && window.dagExecutor.state && window.dagExecutor.state.executionResults) {
        const result = window.dagExecutor.state.executionResults[agentId];
        metadata = (result && result.metadata) ? result.metadata : {};
    }

    // Fallback Metadata (Simulation) if none exists or empty
    if (!metadata.resources) {
        metadata = {
            model: 'gpt-4o',
            resources: {
                project: true,
                brand: true,
                knowledge: [],
                history: (agentId !== 'research') ? 2 : 0
            },
            weights: {
                project: 20,
                brand: 30,
                knowledge: 15,
                history: 10
            }
        };
    }

    // Update Stats UI
    const modelEl = document.getElementById('report-model');
    if (modelEl) modelEl.textContent = metadata.model || 'gpt-4o';

    const tokensEl = document.getElementById('report-tokens');
    if (tokensEl) tokensEl.textContent = Math.floor(Math.random() * 500 + 200) + ` ${t('studio.agentReport.tokens')}`; // Simulation

    let activeResources = 0;
    if (metadata.resources.project) activeResources++;
    if (metadata.resources.brand) activeResources++;
    if (metadata.resources.knowledge && metadata.resources.knowledge.length > 0) activeResources += metadata.resources.knowledge.length;
    else if (metadata.resources.knowledge) activeResources++;
    if (metadata.resources.history) activeResources++;

    const countEl = document.getElementById('report-resource-count');
    if (countEl) countEl.textContent = activeResources;

    // Render D3 Visualization
    if (window.AgentReportVisualizer) {
        new AgentReportVisualizer('report-vis-container').render(metadata, agentName);
    }

    // Render Details List
    const list = document.getElementById('report-details-list');
    if (list) {
        list.innerHTML = '';

        if (metadata.resources.project) list.innerHTML += `<li class="detail-item" style="color:#3b82f6"><span class="dot blue">●</span> ${t('studio.agentReport.projectContextInjected')}</li>`;
        if (metadata.resources.brand) list.innerHTML += `<li class="detail-item" style="color:#8b5cf6"><span class="dot purple">●</span> ${t('studio.agentReport.brandPersonaActive')}</li>`;

        if (Array.isArray(metadata.resources.knowledge) && metadata.resources.knowledge.length > 0) {
            metadata.resources.knowledge.forEach(k => {
                list.innerHTML += `<li class="detail-item" style="color:#f59e0b"><span class="dot amber">●</span> ${t('studio.agentReport.reference')}: ${k}</li>`;
            });
        } else if (metadata.resources.knowledge) {
            list.innerHTML += `<li class="detail-item" style="color:#f59e0b"><span class="dot amber">●</span> ${t('studio.agentReport.knowledgeBaseAccessed')}</li>`;
        }

        if (metadata.resources.history) {
            list.innerHTML += `<li class="detail-item" style="color:#6366f1"><span class="dot indigo">●</span> ${t('studio.agentReport.usedPreviousContext').replace('{{steps}}', metadata.resources.history)}</li>`;
        }
    }
};

window.closeAgentReport = () => {
    const modal = document.getElementById('agent-report-modal');
    if (modal) modal.style.display = 'none';
};

// ============================================
// TEAM SETTINGS MODAL FUNCTIONS
// ============================================

// State for team settings
// --- Unified Agent Settings Modal (Mission Control Style) ---

let currentSettingsTeamId = null;
let currentSettingsProjectId = null;

/**
 * Open the Team Settings modal and load data - Mission Control Style
 */
/**
 * Open the Team Settings modal and load data - Mission Control Style (100% Identical)
 */
window.openTeamSettingsModal = async function () {
    const modal = document.getElementById('agent-settings-modal');
    if (!modal) return;

    // Proactive state recovery: Try to find IDs from all possible sources
    if (!state.selectedProject) {
        state.selectedProject = document.getElementById('project-select')?.value || localStorage.getItem('currentProjectId');
        if (state.selectedProject) console.log('[Studio] Recovered selectedProject from UI/Storage:', state.selectedProject);
    }

    if (!state.selectedAgentTeam) {
        state.selectedAgentTeam = document.getElementById('agentteam-select')?.value;
        if (state.selectedAgentTeam) console.log('[Studio] Recovered selectedAgentTeam from UI:', state.selectedAgentTeam);
    }

    // Diagnostics for logging
    const projId = state.selectedProject;

    console.log('[Studio] openTeamSettingsModal invoked:', { projId });

    if (!projId) {
        addLogEntry(t('studio.log.noProjectActive'), 'warning');
        return;
    }

    const directiveInput = document.getElementById('setting-directive');
    const subAgentsList = document.getElementById('setting-subagents-list');

    // Show modal with loading state
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('open');
    });

    directiveInput.value = t('studio.settings.loading');
    subAgentsList.innerHTML = `<div class="loading-state" style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">${t('studio.settings.loadingConfiguration')}</div>`;

    try {
        const db = firebase.firestore();

        // 1. Load Project Data
        const projectDoc = await db.collection('projects').doc(projId).get();
        if (!projectDoc.exists) throw new Error('Project not found');

        const projectData = projectDoc.data();

        // 2. Load Directive from project-level
        directiveInput.value = projectData.teamDirective || '';

        // 3. Load Sub-Agents from Core Team
        let coreTeamId = projectData.coreAgentTeamInstanceId;

        // Fallback: If no coreAgentTeamInstanceId, try to find the team instance for this project
        if (!coreTeamId) {
            console.warn('[Studio] No coreAgentTeamInstanceId found on project. Searching for team instance...');
            const teamSnap = await db.collection('projectAgentTeamInstances')
                .where('projectId', '==', projId)
                .limit(1)
                .get();

            if (!teamSnap.empty) {
                coreTeamId = teamSnap.docs[0].id;
                console.log('[Studio] Found team instance via search:', coreTeamId);
            }
        }

        let subAgents = [];
        if (coreTeamId) {
            const teamDoc = await db.collection('projectAgentTeamInstances').doc(coreTeamId).get();
            const teamData = teamDoc.exists ? teamDoc.data() : {};

            const subAgentsSnap = await db.collection('projectAgentTeamInstances')
                .doc(coreTeamId)
                .collection('subAgents')
                .orderBy('display_order', 'asc')
                .get();

            if (!subAgentsSnap.empty) {
                subAgentsSnap.forEach(doc => subAgents.push({ id: doc.id, ...doc.data() }));
            } else if (teamData.roles && Array.isArray(teamData.roles)) {
                // Fallback to roles array if sub-agents subcollection is missing
                subAgents = teamData.roles.map(role => ({
                    id: role.type,
                    role: role.type,
                    role_name: role.name,
                    system_prompt: role.prompt || ''
                }));
            }
        }

        // 4. Final Fallback: If still empty, use the standard 12 agents (Unified Brain Rule)
        if (subAgents.length === 0) {
            console.log('[Studio] Defaulting to standard 12 agents roster...');
            const standardRoles = [
                { id: 'research', role: 'researcher', name: 'Research' },
                { id: 'seo_watcher', role: 'seo_watcher', name: 'SEO Watcher' },
                { id: 'knowledge_curator', role: 'knowledge_curator', name: 'Knowledge Curator' },
                { id: 'kpi', role: 'kpi_advisor', name: 'KPI Advisor' },
                { id: 'planner', role: 'planner', name: 'Planner' },
                { id: 'creator_text', role: 'writer', name: 'Text Creator' },
                { id: 'creator_image', role: 'image_creator', name: 'Image Creator' },
                { id: 'creator_video', role: 'video_planner', name: 'Video Planner' },
                { id: 'compliance', role: 'compliance', name: 'Compliance' },
                { id: 'seo_optimizer', role: 'seo_optimizer', name: 'SEO Optimizer' },
                { id: 'evaluator', role: 'evaluator', name: 'Evaluator' },
                { id: 'manager', role: 'manager', name: 'Manager' }
            ];
            subAgents = standardRoles.map((r, i) => ({
                id: r.id,
                role: r.role,
                role_name: r.name,
                display_order: i,
                system_prompt: ''
            }));
        }

        // 5. Render Sub-Agents
        renderSettingsSubAgents(subAgents);

        // Store for save function
        currentSettingsProjectId = projId;
        currentSettingsTeamId = coreTeamId;

    } catch (error) {
        console.error('[Studio] Error loading settings:', error);
        addLogEntry(t('studio.log.failedToLoadSettings').replace('{{message}}', error.message), 'error');
        closeAgentSettingsModal();
    }
};

/**
 * Close the Agent Settings modal
 */
window.closeAgentSettingsModal = function () {
    const modal = document.getElementById('agent-settings-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }
};

/**
 * Render sub-agent configuration list in modal - 100% Identical to Mission Control
 */
function renderSettingsSubAgents(subAgents) {
    const list = document.getElementById('setting-subagents-list');
    if (!list) return;

    if (subAgents.length === 0) {
        list.innerHTML = `<div class="empty-state" style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">${t('studio.settings.noSubAgentsFound')}</div>`;
        return;
    }

    // Role-based placeholders for better UX
    const placeholders = {
        'researcher': t('studio.settings.placeholder.researcher'),
        'writer': t('studio.settings.placeholder.writer'),
        'planner': t('studio.settings.placeholder.planner'),
        'reviewer': t('studio.settings.placeholder.reviewer'),
        'default': t('studio.settings.placeholder.default')
    };

    list.innerHTML = subAgents.map(agent => {
        const roleKey = (agent.role || '').toLowerCase();
        const roleName = agent.role_name || agent.role || agent.id || t('studio.settings.agent');
        const roleType = agent.role || agent.id || '';
        const displayOrder = agent.display_order || 0;

        // Find best matching placeholder
        let placeholder = placeholders['default'];
        if (roleKey.includes('research') || roleKey.includes('search')) placeholder = placeholders['researcher'];
        else if (roleKey.includes('writ') || roleKey.includes('copy')) placeholder = placeholders['writer'];
        else if (roleKey.includes('plan') || roleKey.includes('strateg')) placeholder = placeholders['planner'];
        else if (roleKey.includes('review') || roleKey.includes('compliance')) placeholder = placeholders['reviewer'];

        return `
        <div class="sub-agent-setting-card" style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                <div>
                    <div style="font-weight: 600; color: #fff; font-size: 16px; margin-bottom: 4px;">${roleName}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #3B82F6;"></span>
                        ${agent.model_id || t('studio.settings.defaultModel')}
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px; color: rgba(255,255,255,0.7);">
                    ${roleType}
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" style="display: block; font-size: 13px; color: rgba(255,255,255,0.9); margin-bottom: 6px;">
                    📝 ${t('studio.settings.behaviorInstructions')}
                </label>
                <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 8px;">
                    ${t('studio.settings.defineAgentBehavior')}
                </div>
                <textarea class="form-input sub-agent-prompt" 
                    data-id="${agent.id}" 
                    data-role-name="${roleName}"
                    data-role-type="${roleType}"
                    data-order="${displayOrder}"
                    rows="5" 
                    style="width: 100%; font-size: 13px; font-family: 'Menlo', 'Monaco', 'Courier New', monospace; line-height: 1.5; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; padding: 12px; resize: vertical;"
                    placeholder="${placeholder}">${agent.system_prompt || ''}</textarea>
            </div>
        </div>
        `;
    }).join('');
}

/**
 * Save Agent Settings - 100% Identical to Mission Control
 */
window.saveAgentSettings = async function () {
    if (!currentSettingsProjectId) return;

    const btn = document.querySelector('#agent-settings-modal .btn-primary');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = t('studio.button.saving');

    try {
        const db = firebase.firestore();
        const batch = db.batch();

        // 1. Update Directive at PROJECT level
        const directive = document.getElementById('setting-directive').value;
        const projectRef = db.collection('projects').doc(currentSettingsProjectId);

        batch.update(projectRef, {
            teamDirective: directive,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update Sub-Agents
        const teamRef = db.collection('projectAgentTeamInstances').doc(currentSettingsTeamId);

        const promptInputs = document.querySelectorAll('.sub-agent-prompt');
        const updatedSubAgents = [];

        promptInputs.forEach(input => {
            const agentId = input.dataset.id;
            const newPrompt = input.value;

            const agentRef = teamRef.collection('subAgents').doc(agentId);
            // ROBUSTNESS: Use set with merge:true to create if missing
            batch.set(agentRef, {
                role_name: input.dataset.roleName || '',
                role_type: input.dataset.roleType || agentId,
                display_order: parseInt(input.dataset.order || '0'),
                system_prompt: newPrompt,
                is_active: true,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            updatedSubAgents.push({ id: agentId, systemPrompt: newPrompt });
        });

        await batch.commit();

        // 🧠 Sync to local executor state
        if (state.executor) {
            state.executor.setTeamContext({
                directive: directive,
                subAgents: updatedSubAgents
            });
        }

        addLogEntry(t('studio.log.settingsSaved'), 'success');
        window.closeAgentSettingsModal();

    } catch (error) {
        console.error('[Studio] Error saving settings:', error);
        addLogEntry(t('studio.log.failedToSaveSettings').replace('{{message}}', error.message), 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

/**
 * Toggle sub-agent config card expand/collapse (Stub for compatibility if needed)
 */
window.toggleSubAgentCard = function (agentId) {
    // Legacy support
};

/**
 * Helper: Escape HTML for safe display
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Mark a specific channel's content as approved.
 */
window.approveChannel = function (channel) {
    const statusEl = document.getElementById(`status-${channel}`);
    if (statusEl) {
        statusEl.querySelector('.status-text').textContent = `✅ ${t('studio.status.approved')}`;
        statusEl.classList.add('approved');
        statusEl.classList.remove('completed');
    }

    const approvalEl = document.getElementById(`approval-${channel}`);
    if (approvalEl) approvalEl.style.display = 'none';

    addLogEntry(t('studio.log.contentApprovedForChannel').replace('{{channelName}}', getChannelDisplayName(channel)), 'success');
};

// ============================================
// CONTEXT MANAGEMENT (Source Inputs)
// ============================================

/**
 * Load Content Plans from Firestore
 */
async function loadContentPlans(projectId) {
    if (!projectId) return;

    try {
        console.log('[Studio] Loading content plans for project:', projectId);
        const snapshot = await db.collection('projects')
            .doc(projectId)
            .collection('contentPlans')
            .orderBy('createdAt', 'desc')
            .limit(10) // Reduced from 20 to focus on recent
            .get();

        const plans = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Filter out "Campaign Brief" or default seeds if user considers them "unnecessary"
            // We assume user wants to see their "Analysis Results" or Manual Inputs
            if (data.planName && data.planName.includes('Campaign Brief')) {
                return;
            }
            plans.push({ id: doc.id, ...data });
        });

        console.log('[Studio] Loaded plans:', plans.length);
        updateSourceContextUI(plans);

    } catch (error) {
        console.error('Error loading content plans:', error);
        addLogEntry(t('studio.log.failedToLoadContentPlans'), 'error');
    }
}

/**
 * Update Source Context UI with loaded plans
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
const dropZone = document.getElementById('command-bar');
if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.style.borderColor = '#8B5CF6'; // Theme Highlight
        dropZone.style.background = 'rgba(139, 92, 246, 0.1)';
    }

    function unhighlight(e) {
        dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
        dropZone.style.background = 'rgba(30,30,33, 0.6)';
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (typeof handleFileSelection === 'function') {
            handleFileSelection({ files: files }, 'file');
        }
    }
}

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

window.handleFileSelection = function (input, type) {
    if (!input.files || input.files.length === 0) return;

    const newFiles = Array.from(input.files);

    if (currentCount + newFiles.length > maxFiles) {
        addLogEntry(t('studio.log.maxAttachments').replace('{{count}}', maxFiles), 'warning');
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
        img.style.cssText = "width:100%; height:100%; object-fit:cover;";
        thumb.appendChild(img);
    } else {
        // File Icon
        thumb.innerHTML = `<span style="font-size:24px; display: flex; align-items: center; justify-content: center;">${studioIcons.document}</span>`;
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
    state.attachments = state.attachments.filter(a => a.id !== id);
    const thumb = document.getElementById(id);
    if (thumb) thumb.remove();

    // Hide area if empty
    if (state.attachments.length === 0) {
        const previewArea = document.getElementById('command-preview-area');
        if (previewArea) previewArea.style.display = 'none';
    }
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
        const snapshot = await db.collection('projects').doc(currentProjectId)
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
    db.collection('projects').doc(currentProjectId).collection('contentPlans').doc(assetId).get()
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
