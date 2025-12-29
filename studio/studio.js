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
        name: '⚡ Lite Mode (Recommended)',
        description: '핵심 에이전트만 가동 (Planner → Creator → Manager)',
        agents: ['planner', 'creator_text', 'manager'],
        contentTypes: ['text'],
        estimatedTime: '30s',
        estimatedCost: 0.02,
    },
    standard: {
        id: 'standard',
        name: '📝 Standard',
        description: '균형 잡힌 구성 (Research + Planner + Creator)',
        agents: ['strategic_analyst', 'planner', 'creator_text', 'quality_controller', 'manager'],
        contentTypes: ['text'],
        estimatedTime: '1.5min',
        estimatedCost: 0.06,
    },
    premium: {
        id: 'premium',
        name: '🏆 Deep Dive (Full)',
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
        name: '🔧 Custom',
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
    initBoosterToggle(); // New
    updateStats();
});

// ============================================
// PROJECT & AGENT TEAM SELECTORS
// ============================================
// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Resets the DAG visualization to its initial state.
 * This is called when a new agent team is selected.
 */
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
                addLogEntry('📂 No projects found', 'info');
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
                addLogEntry('📂 No valid projects found', 'info');
                return;
            }

            // Sort by createdAt descending (newest first)
            projects.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0);
                const dateB = b.createdAt?.toDate?.() || b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0);
                return dateB - dateA;
            });

            addLogEntry(`📂 Loaded ${projects.length} project(s)`, 'info');

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

                        addLogEntry('📄 Loaded plan from Knowledge Hub', 'success');
                        addLogEntry(`📝 Plan: ${context.planName}`, 'info');
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
                }

                await loadAgentTeams(projectId);

                const teamId = contextTeamId || urlParams.get('team');
                if (teamId) {
                    const agentTeamSelect = document.getElementById('agentteam-select');
                    if (agentTeamSelect) {
                        agentTeamSelect.value = teamId;
                        // Trigger change event manually or call handler
                        agentTeamSelect.classList.remove('selection-highlight');
                    }
                    state.selectedAgentTeam = teamId;

                    addLogEntry(`🤖 Auto-loading team: ${teamId}`, 'info');

                    await loadSubAgents(teamId);
                    enableStartButton();

                    // If we have a context, we might want to auto-open the DAG or highlight start
                    if (state.planContext) {
                        const startBtn = document.getElementById('start-execution-btn');
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
            addLogEntry('❌ Failed to load projects', 'error');
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

            if (projectId) {
                // Sync to global state
                localStorage.setItem('currentProjectId', projectId);

                // Clear any lingering plan context from previous loads/redirects
                state.planContext = null;

                addLogEntry(`📁 Selected project: ${projectName}`, 'info');

                // Update Preview Profile
                updatePreviewProfile(projectName);

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
                        addLogEntry('📄 Loaded project context', 'success');
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
            } else {
                const agentTeamSelect = document.getElementById('agentteam-select');
                if (agentTeamSelect) {
                    agentTeamSelect.innerHTML = '<option value="">Select Agent Team...</option>';
                    agentTeamSelect.disabled = true;
                }
                addLogEntry('📁 Project deselected', 'info');
            }

            disableStartButton();
        });

    }
}

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
                        agentTeamSelect.innerHTML = `<option value="${coreTeamId}" selected>${teamData.name || 'Core Team'}</option>`;
                        agentTeamSelect.value = coreTeamId;
                        agentTeamSelect.disabled = true;
                    }

                    state.selectedAgentTeam = coreTeamId;

                    addLogEntry(`🧠 Core Team auto-loaded: ${teamData.name || 'Core Team'}`, 'success');

                    // Auto-load sub-agents
                    await loadSubAgents(coreTeamId);
                    enableStartButton();
                    renderDAGPlaceholder();

                    // Show multi-channel toggle instead of team selector (if needed in sidebar/elsewhere)
                    showMultiChannelToggle();

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
            showMultiChannelToggle();

            addLogEntry(`🤖 Auto-selected team: ${firstTeamData.name || firstTeamId}`, 'success');
        }

        addLogEntry(`🤖 Found ${teamsSnapshot.size} agent team(s)`, 'info');
        agentTeamSelect.disabled = false;
        if (!state.selectedAgentTeam) {
            agentTeamSelect.classList.add('selection-highlight'); // Only highlight if still nothing selected
        }

    } catch (error) {
        console.error('[Studio] Error loading agent teams:', error);

        // Handle permission errors specifically
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
            agentTeamSelect.innerHTML = '<option value="">No access to this project</option>';
            addLogEntry('⛔ No access to this project', 'error');
        } else {
            agentTeamSelect.innerHTML = '<option value="">Error loading teams</option>';
            addLogEntry('❌ Failed to load agent teams', 'error');
        }
        agentTeamSelect.disabled = true;
    }
}

// =====================================================
// 🎯 MULTI-CHANNEL TOGGLE UI (Unified Brain)
// =====================================================
function showMultiChannelToggle() {
    // Hide the agent team selector row
    const teamSelectorRow = document.querySelector('.agentteam-select-container, #agentteam-select')?.closest('.selector-row');
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
            <span class="toggle-label">Target Channels</span>
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
    const projectSelectorRow = document.querySelector('#project-select')?.closest('.selector-row');
    if (projectSelectorRow) {
        projectSelectorRow.insertAdjacentElement('afterend', toggleContainer);
    } else {
        // Fallback: append to sidebar
        const sidebar = document.querySelector('.studio-sidebar, .sidebar');
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
                    addLogEntry('⚠️ At least one channel must be selected', 'warning');
                    return;
                }
                state.targetChannels = state.targetChannels.filter(c => c !== channel);
                label.classList.remove('active');
            }

            addLogEntry(`🎯 Target channels: ${state.targetChannels.join(', ')}`, 'info');
            updateChannelStats();
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
        statsEl.textContent = `${channelCount} channel(s) selected`;
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
        tabsContainer.innerHTML = '<div class="tab-placeholder">Select channels to preview</div>';
        if (viewAllBtn) viewAllBtn.style.display = 'none';
        return;
    }

    // Show view all button if more than 1 channel
    if (viewAllBtn) {
        viewAllBtn.style.display = state.targetChannels.length > 1 ? 'flex' : 'none';
    }

    state.targetChannels.forEach((channel, index) => {
        const tab = document.createElement('div');
        tab.className = `channel-tab ${index === 0 ? 'active' : ''}`;
        tab.dataset.channel = channel;

        const displayName = getChannelDisplayName(channel);
        const icon = getChannelIcon(channel);
        const status = window.channelContents[channel]?.status || 'waiting';

        tab.innerHTML = `
            <span class="tab-icon">${icon}</span>
            <span class="tab-name">${displayName}</span>
            <span class="tab-status ${status}"></span>
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
                    <span class="preview-frame-icon">${icon}</span>
                    <span class="preview-frame-label">${displayName}</span>
                </div>
                <div class="multi-channel-card-body">
                    <div class="preview-placeholder">
                        <span style="font-size: 32px; opacity: 0.3;">${icon}</span>
                        <p>Waiting for ${displayName} content...</p>
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
                <span class="preview-frame-icon">${icon}</span>
                <span class="preview-frame-label">${displayName}</span>
            </div>
            <div class="multi-channel-card-body">
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
            const profileName = profile.name || state.projectName || 'Brand';
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
                            <span class="x-handle">${profileHandle} · 방금</span>
                        </div>
                        <button class="x-more-btn">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></svg>
                        </button>
                    </div>
                    <div class="x-content">${content.text}</div>
                    ${content.imageUrl ? `<img class="x-image" src="${content.imageUrl}" alt="Post image">` : ''}
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
            const igName = igProfile.name || state.projectName || 'brand';
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
                    ${content.imageUrl ? `<img class="insta-image" src="${content.imageUrl}" alt="Post image">` : '<div class="insta-image-placeholder">📷</div>'}
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
            const liName = liProfile.name || state.projectName || 'Brand';
            const liAvatar = liProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(liName)}&backgroundColor=0a66c2`;

            return `
                <div class="preview-linkedin-post">
                    <div class="linkedin-header">
                        <div class="linkedin-avatar">
                            <img src="${liAvatar}" alt="avatar" style="width:100%;height:100%;border-radius:4px;">
                        </div>
                        <div class="linkedin-user-info">
                            <span class="linkedin-name">${liName}</span>
                            <span class="linkedin-title">Company Page</span>
                        </div>
                    </div>
                    <div class="linkedin-content">${content.text}</div>
                    ${content.imageUrl ? `<img class="linkedin-image" src="${content.imageUrl}" alt="Post image">` : ''}
                    <div class="linkedin-actions">
                        <span>👍 Like</span>
                        <span>💬 Comment</span>
                        <span>🔄 Repost</span>
                        <span>📤 Send</span>
                    </div>
                </div>
            `;
        case 'youtube':
            return `
                <div class="preview-youtube-post">
                    <div class="youtube-thumbnail">
                        ${content.imageUrl ? `<img src="${content.imageUrl}" style="width:100%; height:100%; object-fit:cover;">` : '<div class="play-btn">▶</div>'}
                    </div>
                    <div class="youtube-info">
                        <div class="youtube-title">${content.text?.substring(0, 100) || 'Video Title'}</div>
                        <div class="youtube-meta">${state.projectName || 'Channel'} • 0 views</div>
                    </div>
                </div>
            `;
        case 'naver_blog':
            return `
                <div class="preview-naver-post">
                    <div class="naver-header">
                        <span>N</span>
                        <span>네이버 블로그</span>
                    </div>
                    <div class="naver-content">
                        <div class="naver-title">${content.title || 'Blog Post Title'}</div>
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
                    <p style="color: var(--color-text-tertiary); margin: 0;">Content not generated yet...</p>
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
            <h2>📺 All Channel Previews</h2>
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
                        <img src="../assets/default-avatar.png" class="preview-avatar" alt="Avatar">
                        <div class="preview-user-meta">
                            <div class="preview-user-name">Your Brand</div>
                            <div class="preview-user-handle">@yourbrand</div>
                        </div>
                    </div>
                </div>
                <div class="preview-text-content" id="${channel}-text" contenteditable="true">
                    Generated content for ${channel} will appear here...
                </div>
                <div class="preview-media-container" id="${channel}-media">
                    <div class="media-placeholder">
                        <span class="placeholder-icon">🖼️</span>
                        <span>Multi-channel visual context pending</span>
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
                    <h3><span class="insight-icon">🔍</span> Prompt Insight</h3>
                    <button class="prompt-insight-close">&times;</button>
                </div>
                <div class="prompt-insight-body">
                    <div class="prompt-section" id="insight-agent-info"></div>
                    <div class="prompt-section" id="insight-system-prompt">
                        <div class="prompt-section-label">
                            <span class="section-icon">⚙️</span> System Prompt
                        </div>
                        <div class="prompt-section-content system-prompt" id="insight-system-content"></div>
                    </div>
                    <div class="prompt-section" id="insight-user-message">
                        <div class="prompt-section-label">
                            <span class="section-icon">💬</span> User Message
                        </div>
                        <div class="prompt-section-content user-message" id="insight-user-content"></div>
                    </div>
                    <div class="prompt-section" id="insight-ai-response">
                        <div class="prompt-section-label">
                            <span class="section-icon">🤖</span> AI Response
                        </div>
                        <div class="prompt-section-content ai-response" id="insight-response-content"></div>
                    </div>
                </div>
                <div class="prompt-insight-footer">
                    <button class="prompt-copy-btn" id="copy-all-prompts">
                        📋 Copy All
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
            const fullText = `=== AGENT: ${promptData.agentRole || 'Unknown'} ===\n\n` +
                `=== SYSTEM PROMPT ===\n${promptData.systemPrompt || 'N/A'}\n\n` +
                `=== USER MESSAGE ===\n${promptData.userMessage || 'N/A'}\n\n` +
                `=== AI RESPONSE ===\n${promptData.aiResponse || 'N/A'}`;

            navigator.clipboard.writeText(fullText).then(() => {
                addLogEntry('📋 Prompts copied to clipboard', 'success');
            });
        });
    }

    // Populate content
    const channelBadge = promptData.targetChannel
        ? `<span class="channel-badge">${getChannelIcon(promptData.targetChannel)} ${getChannelDisplayName(promptData.targetChannel)}</span>`
        : '';

    modal.querySelector('#insight-agent-info').innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <span style="font-size: 24px;">🤖</span>
            <div>
                <div style="font-weight: 600; font-size: 16px; color: #fff;">${promptData.agentRole || 'Unknown Agent'}</div>
                ${channelBadge}
            </div>
        </div>
    `;
    modal.querySelector('#insight-system-content').textContent = promptData.systemPrompt || 'No system prompt available';
    modal.querySelector('#insight-user-content').textContent = promptData.userMessage || 'No user message available';
    modal.querySelector('#insight-response-content').textContent = promptData.aiResponse || 'No response yet';

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
            teamName: teamData.name || teamData.teamName || 'Core Team',
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
                team = teamDoc.data();
            }
        }

        if (!team) {
            channelName.textContent = 'Team not found';
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

        addLogEntry(`📺 Channel set to: ${channelDisplayNames[provider] || provider}`, 'info');

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
                        addLogEntry(`👤 Profile updated from connected account: ${handle}`, 'success');
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
        channelName.textContent = 'Error loading channel';
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
    if (channelName) channelName.textContent = 'Select Agent Team to see channel';
    channelInfo?.classList.remove('ready');
    state.activeChannel = null;
}

/**
 * Update Agent Roster UI based on loaded sub-agents
 * @param {Array} subAgents - Array of sub-agent objects from Firestore
 */
function updateAgentRosterUI(subAgents) {
    const cards = document.querySelectorAll('.agent-card');

    // Create a map of role_type to sub-agent data
    const subAgentMap = {};
    subAgents.forEach(agent => {
        // Normalize role_type names (e.g., 'planner', 'creator_text', etc.)
        const roleType = agent.role_type || agent.type || '';
        subAgentMap[roleType.toLowerCase()] = agent;
    });

    console.log('Sub-agent map:', subAgentMap);

    // Update each card based on sub-agent availability
    cards.forEach(card => {
        const agentId = card.dataset.agent;

        // Check if this agent is in the team's sub-agents
        const isInTeam = subAgentMap[agentId] ||
            subAgentMap[agentId.replace('_', '')] ||
            subAgentMap[agentId.replace('creator_', '')] ||
            subAgentMap[agentId.replace('_watcher', '')] ||
            subAgentMap[agentId.replace('_curator', '')] ||
            subAgentMap[agentId.replace('_optimizer', '')];

        if (isInTeam || subAgents.length >= 10) { // If it's a full team or found in team
            card.classList.add('active');
            card.classList.remove('disabled');
        } else {
            // Keep required agents active
            if (card.classList.contains('required')) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        }
    });

    // Switch to custom template mode since we're using team config
    document.getElementById('workflow-template').value = 'custom';
    state.selectedTemplate = 'custom';

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
    document.getElementById('workflow-template').value = 'standard';
    state.selectedTemplate = 'standard';
    applyTemplate(WORKFLOW_TEMPLATES.standard);
    updateStats();
}

// ============================================
// TEMPLATE SELECTOR
// ============================================
function initTemplateSelector() {
    const templateSelect = document.getElementById('workflow-template');

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
function initAgentRoster() {
    const agentCards = document.querySelectorAll('.agent-card:not(.disabled)');

    agentCards.forEach(card => {
        card.addEventListener('click', () => {
            // Toggle active state (border highlight)
            card.classList.toggle('active');

            // Switch to custom template
            if (state.selectedTemplate !== 'custom') {
                document.getElementById('workflow-template').value = 'custom';
                state.selectedTemplate = 'custom';
            }

            updateStats();
        });
    });
}

function getSelectedAgents() {
    const activeCards = document.querySelectorAll('.agent-card.active');
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
    document.getElementById('stats-agents').textContent = `${selectedAgents.length}/${totalAgents} agents`;

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

    document.getElementById('stats-time').textContent = timeDisplay;
    document.getElementById('stats-cost').textContent = `$${totalCost.toFixed(4)}`;
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
    const startBtn = document.getElementById('start-execution-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const retryBtn = document.getElementById('retry-btn');
    const completeBtn = document.getElementById('complete-btn');

    startBtn.addEventListener('click', startExecution);
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
                addLogEntry('🚀 Booster Mode ACTIVATED: Max Performance', 'success');
            } else {
                addLogEntry('Booster Mode Deactivated: Standard routing', 'info');
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
    document.getElementById('start-execution-btn').disabled = false;
}

function disableStartButton() {
    document.getElementById('start-execution-btn').disabled = true;
}

// ============================================
// EXECUTION CONTROL
// ============================================

// Global executor instance
let executor = null;

async function startExecution() {
    if (!state.selectedProject || !state.selectedAgentTeam) {
        alert('Please select a Project and Agent Team first.');
        return;
    }

    // ✨ Phase 2: Market Pulse Check (Pre-execution)
    let marketPulseData = null;
    try {
        const lpDoc = await db.collection('projects')
            .doc(state.selectedProject)
            .collection('marketPulse')
            .doc('latest')
            .get();
        if (lpDoc.exists) {
            marketPulseData = lpDoc.data();
            console.log('[Studio] Latest Market Pulse data found for context-skipping');
        }
    } catch (e) {
        console.warn('[Studio] Failed to fetch market pulse data for skipping logic:', e);
    }

    state.isExecuting = true;
    state.isPaused = false;
    state.currentPhase = 1;
    state.currentAgent = 1;

    // Update UI (with null checks)
    const startBtn = document.getElementById('start-execution-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const projectSelect = document.getElementById('project-select');
    const agentTeamSelect = document.getElementById('agentteam-select');

    if (startBtn) startBtn.disabled = true;
    if (pauseBtn) pauseBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = false;
    if (projectSelect) projectSelect.disabled = true;
    if (agentTeamSelect) agentTeamSelect.disabled = true;

    // Start timer
    startTimer();

    // Reset DAG visualization
    resetDAG();

    // Initialize DAGExecutor
    executor = new DAGExecutor();
    window.dagExecutor = executor; // Expose for UI helpers

    // Register event callbacks
    executor
        .on('onNodeStart', ({ nodeId }) => {
            setNodeState(nodeId, 'running');
        })
        .on('onNodeComplete', ({ nodeId, agentId, result }) => {
            // DEBUG: Detailed log to help verify model/provider
            console.log('[Studio] Node Complete:', agentId, result);
            const meta = result?.metadata || {};
            const isReused = result?.skipped || meta.isSkipped;
            const logModel = isReused ? 'REUSED' : (meta.model || 'N/A');
            const logProvider = isReused ? 'context' : (meta.provider || 'N/A');

            addLogEntry(`🔍 DEBUG: ${agentId} finished. Model: ${logModel}, Provider: ${logProvider}`, 'info');

            setNodeState(nodeId, 'complete');
            fireParticles(nodeId);

            // Mark outgoing paths
            const paths = DAG_PATHS[nodeId];
            if (paths) {
                paths.forEach(pathId => {
                    const path = document.getElementById(pathId);
                    if (path) path.classList.add('complete');
                });
            }
        })
        .on('onNodeError', ({ nodeId }) => {
            setNodeState(nodeId, 'error');
        })
        .on('onLog', ({ message, type }) => {
            // ✨ Phase 4: Show "Smart Optimization" benefit in logs
            if (message.includes('Skipping')) {
                addLogEntry(`💡 ${message}`, 'success');
                addLogEntry('💰 Smart Optimization: Credits and time saved!', 'info');
            } else {
                addLogEntry(message, type);
            }
        })
        .on('onContentGenerated', ({ agentId, content }) => {
            console.log('[Studio] ✅ onContentGenerated EVENT FIRED:', { agentId, contentType: typeof content });
            console.log('[Studio] Content preview:', JSON.stringify(content).substring(0, 200));

            if (agentId === 'creator_text') {
                console.log('[Studio] Processing creator_text content...');
                try {
                    // Attempt to parse JSON for multi-channel content
                    let contentStr = content.content || content;
                    console.log('[Studio] contentStr type:', typeof contentStr);

                    // If already an object, use directly
                    if (typeof contentStr === 'object') {
                        console.log('[Studio] Content is object, calling displayMultiChannelContent with object');
                        displayMultiChannelContent(contentStr);
                        return;
                    }

                    // Clean up common LLM JSON issues
                    contentStr = contentStr
                        .replace(/```json\s*/gi, '')  // Remove markdown code blocks
                        .replace(/```\s*/gi, '')
                        .replace(/^\s*\n+/, '')       // Remove leading newlines
                        .replace(/\n+\s*$/, '')       // Remove trailing newlines
                        .trim();

                    // Try to extract JSON if wrapped in other text
                    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        contentStr = jsonMatch[0];
                    }

                    // Fix trailing commas before closing braces
                    contentStr = contentStr.replace(/,(\s*[}\]])/g, '$1');

                    const parsed = JSON.parse(contentStr);
                    console.log('[Studio] Parsed JSON, calling displayMultiChannelContent with parsed:', Object.keys(parsed));
                    displayMultiChannelContent(parsed);
                } catch (e) {
                    // Fallback to simple text content - this is normal for non-JSON responses
                    console.log('[Studio] Content is plain text (parse failed), using as-is. Error:', e.message);
                    displayMultiChannelContent(content.content || content);
                }
            } else if (agentId === 'creator_image') {
                console.log('[Studio] Image URL:', content?.imageUrl);
                updateMultiChannelImages(content?.imageUrl);

                if (content?.imageUrl) {
                    const shortUrl = content.imageUrl.length > 50 ? 'View Generated Image' : content.imageUrl;
                    addLogEntry(`🖼️ Image generated: <a href="${content.imageUrl}" target="_blank" style="color:#3b82f6;text-decoration:underline;">${shortUrl}</a>`, 'success');
                } else {
                    addLogEntry('⚠️ Image generation returned no URL', 'warning');
                }
            }
        })
        .on('onExecutionComplete', ({ success, results }) => {
            state.isExecuting = false;
            stopTimer();

            if (success) {
                updateContentStats(results);
                document.getElementById('complete-btn').disabled = false;
            }

            // Re-enable UI
            const projectSelect = document.getElementById('project-select');
            const agentTeamSelect = document.getElementById('agentteam-select');
            const startBtn = document.getElementById('start-execution-btn');

            if (projectSelect) projectSelect.disabled = false;
            if (agentTeamSelect) agentTeamSelect.disabled = false;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.classList.remove('running');
                startBtn.innerHTML = '<span>🚀</span> Start Content Team';
            }
            const pauseBtnEl = document.getElementById('pause-btn');
            const stopBtnEl = document.getElementById('stop-btn');
            if (pauseBtnEl) pauseBtnEl.disabled = true;
            if (stopBtnEl) stopBtnEl.disabled = true;
        });

    // Standardize context field: ensure brandContext is set for Layer 3
    const executionContext = {
        ...state.planContext,
        marketPulseData: marketPulseData, // ✨ For Research Phase Skip
        source: state.planContext?.source || (state.planContext?.planName ? 'knowledge-hub' : 'direct')
    };

    if (executionContext.content && !executionContext.brandContext) {
        executionContext.brandContext = executionContext.content;
    }

    // Start Executor with targetChannels for multi-channel content generation
    const selectedAgents = getSelectedAgents();
    executor.start(selectedAgents, state.selectedProject, state.selectedAgentTeam, executionContext, state.isBoostMode ? 'BOOST' : null, state.targetChannels);

    // Switch to DAG View (Center Panel)
    updateFooterProgress();

    console.log('🚀 Starting execution with DAGExecutor:', {
        project: state.selectedProject,
        team: state.selectedAgentTeam,
        template: state.selectedTemplate,
        agents: selectedAgents,
        targetChannels: state.targetChannels, // 🎯 Multi-channel targeting
        context: state.planContext
    });
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
            Resume
        `;
        stopTimer();
    } else {
        if (executor) executor.resume();
        pauseBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            Pause
        `;
        startTimer();
    }
}

function stopExecution() {
    if (!confirm('Are you sure you want to stop the execution?')) return;

    if (executor) executor.stop();

    state.isExecuting = false;
    state.isPaused = false;
    stopTimer();

    // Reset UI (with null checks)
    const startBtn = document.getElementById('start-execution-btn');
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
    addLogEntry('🔄 Retrying last failed agent...', 'running');
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

    addLogEntry('✅ Execution completed!', 'success');
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
// ACTIVITY LOG
// ============================================
function addLogEntry(message, type = '') {
    const log = document.getElementById('activity-log');
    const now = new Date();
    const time = now.toTimeString().slice(0, 8);

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="log-message">${message}</span>
    `;

    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// ============================================
// FOOTER PROGRESS
// ============================================
function updateFooterProgress() {
    const totalAgents = getSelectedAgents().length;
    const footerProgress = document.getElementById('footer-progress');
    if (footerProgress) {
        footerProgress.textContent =
            `Phase ${state.currentPhase}/4 • Agent ${state.currentAgent}/${totalAgents}`;
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
            avatarContainer.innerHTML = `<img src="${avatarUrl}" alt="Profile">`;
        } else {
            // Create initial avatar
            const initial = projectName.charAt(0).toUpperCase();
            avatarContainer.innerHTML = `<div class="avatar-placeholder" style="background:${stringToColor(projectName)}">${initial}</div>`;
        }
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
    addLogEntry('Starting workflow execution demo...', 'running');

    for (let phaseIndex = 0; phaseIndex < DAG_EXECUTION_ORDER.length; phaseIndex++) {
        const phaseNodes = DAG_EXECUTION_ORDER[phaseIndex];

        // Set all nodes in phase to running
        phaseNodes.forEach(nodeId => {
            const node = document.getElementById(nodeId);
            if (node && !node.classList.contains('disabled')) {
                setNodeState(nodeId, 'running');
                addLogEntry(`Agent ${nodeId.replace('node-', '')} started`, 'running');
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
                addLogEntry(`Agent ${nodeId.replace('node-', '')} completed`, 'success');
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

    addLogEntry('Workflow execution completed!', 'success');
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
        statusEl.querySelector('.status-text').textContent = 'Draft Ready';
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
            mediaContainer.innerHTML = `<img src="${imageUrl}" alt="${channel} vision" class="preview-img">`;
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
        const seoLabel = seoScore >= 90 ? 'Excellent' : seoScore >= 70 ? 'Good' : seoScore >= 50 ? 'Fair' : 'Needs Work';
        document.getElementById('seo-sublabel').textContent = `${seoScore}/100 - ${seoLabel}`;
    } else {
        // No data yet
        updateCircularProgress('seo', 0);
        document.getElementById('seo-value').textContent = '--';
        document.getElementById('seo-sublabel').textContent = '--/100 - Waiting';
    }

    // Compliance - from compliance agent
    const complianceResult = results?.compliance;
    const complianceScore = complianceResult?.score ?? complianceResult?.complianceScore ?? null;
    const compliancePassed = complianceResult?.passed ?? complianceResult?.isCompliant ?? null;

    if (complianceScore !== null) {
        updateCircularProgress('compliance', complianceScore);
        document.getElementById('compliance-value').textContent = complianceScore;
        document.getElementById('compliance-sublabel').textContent = `Status: ${compliancePassed ? 'Passed' : 'Issues Found'}`;
        document.getElementById('compliance-sublabel').classList.toggle('passed', compliancePassed);

        const checkmark = document.getElementById('compliance-check');
        if (checkmark) checkmark.style.display = compliancePassed ? 'flex' : 'none';
    } else if (compliancePassed !== null) {
        // Boolean result only
        updateCircularProgress('compliance', compliancePassed ? 100 : 50);
        document.getElementById('compliance-value').textContent = compliancePassed ? '100' : '50';
        document.getElementById('compliance-sublabel').textContent = `Status: ${compliancePassed ? 'Passed' : 'Issues Found'}`;
        document.getElementById('compliance-sublabel').classList.toggle('passed', compliancePassed);
    } else {
        // No data yet
        updateCircularProgress('compliance', 0);
        document.getElementById('compliance-value').textContent = '--';
        document.getElementById('compliance-sublabel').textContent = 'Status: Waiting';
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
            addLogEntry('⚠️ No content to edit yet. Wait for content generation.', 'warning');
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
        if (editBtnText) editBtnText.textContent = 'Done';
        addLogEntry('✏️ Edit mode enabled - Click on content to edit', 'info');
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
        if (editBtnText) editBtnText.textContent = 'Edit';
        addLogEntry('✅ Changes saved', 'success');
    }
}

function discardContent() {
    if (!confirm('Are you sure you want to discard this content?')) return;

    setContentStatus('discarded');
    addLogEntry('❌ Content discarded', 'error');

    // Clear Twitter preview
    const twitterContent = document.getElementById('twitter-content');
    if (twitterContent) {
        twitterContent.innerHTML = '<p class="preview-placeholder">Content discarded. Click Regenerate to create new content.</p>';
    }
}

function regenerateContent() {
    const feedback = document.getElementById('feedback-input').value.trim();

    setContentStatus('pending');

    if (feedback) {
        addLogEntry(`🔄 Regenerating with feedback: "${feedback}"`, 'running');
    } else {
        addLogEntry('🔄 Regenerating content...', 'running');
    }

    // Clear feedback input
    document.getElementById('feedback-input').value = '';

    // Trigger Real Regeneration via DAG Executor
    if (window.dagExecutor) {
        window.dagExecutor.regenerateCreation(feedback);
    } else {
        console.error('DAG Executor not found');
        addLogEntry('❌ System Error: DAG Executor not initialized', 'error');
    }
}

function approveContent() {
    setContentStatus('approved');
    addLogEntry('✅ Content approved and ready for publishing', 'success');

    // Update approve button style
    const approveBtn = document.getElementById('btn-approve');
    if (approveBtn) {
        approveBtn.classList.add('approved');
        approveBtn.disabled = true;
        approveBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Publishing...
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

    if (!tweetText || tweetText === 'Your generated tweet will appear here...') {
        addLogEntry('❌ No content to publish', 'error');
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Approve
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
    addLogEntry('📤 Posting to X (Twitter)...', 'info');

    postToTwitter({ projectId, contentId, tweetText, userId, imageUrl })
        .then((result) => {
            console.log('[Studio] Posted to Twitter:', result);
            addLogEntry(`✅ Posted to X! Tweet ID: ${result.data.tweetId}`, 'success');

            if (approveBtn) {
                approveBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Published!
                `;
            }
        })
        .catch((error) => {
            console.error('[Studio] Failed to post to Twitter:', error);
            addLogEntry(`❌ Failed to post: ${error.message}`, 'error');

            if (approveBtn) {
                approveBtn.disabled = false;
                approveBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Retry
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
    let modelName = 'Unknown Model';
    let isMock = false;

    // Access DAG Executor results
    const execInstance = window.dagExecutor || executor;
    if (execInstance && execInstance.state.executionResults[agentId]) {
        const res = execInstance.state.executionResults[agentId];
        const meta = res.metadata || (res.data && res.data.metadata);

        if (res.skipped || (meta && meta.isSkipped)) {
            modelName = 'REUSED';
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
            modelName = 'MOCK';
        }
    }

    // Shorten Model Name for UI
    if (typeof modelName === 'string') {
        if (modelName.toLowerCase().includes('gpt-4')) modelName = 'GPT-4';
        else if (modelName.toLowerCase().includes('gemini')) modelName = 'Gemini';
        else if (modelName.toLowerCase().includes('claude')) modelName = 'Claude';
        else if (modelName.toLowerCase().includes('mock')) modelName = 'MOCK';
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
    reviewText.textContent = "VIEW";

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
    if (nameEl) nameEl.textContent = `${agentName} REPORT`;

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
    if (tokensEl) tokensEl.textContent = Math.floor(Math.random() * 500 + 200) + ' tokens'; // Simulation

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

        if (metadata.resources.project) list.innerHTML += `<li class="detail-item" style="color:#3b82f6"><span class="dot blue">●</span> Project Context Injected</li>`;
        if (metadata.resources.brand) list.innerHTML += `<li class="detail-item" style="color:#8b5cf6"><span class="dot purple">●</span> Brand Persona Active</li>`;

        if (Array.isArray(metadata.resources.knowledge) && metadata.resources.knowledge.length > 0) {
            metadata.resources.knowledge.forEach(k => {
                list.innerHTML += `<li class="detail-item" style="color:#f59e0b"><span class="dot amber">●</span> Reference: ${k}</li>`;
            });
        } else if (metadata.resources.knowledge) {
            list.innerHTML += `<li class="detail-item" style="color:#f59e0b"><span class="dot amber">●</span> Knowledge Base Accessed</li>`;
        }

        if (metadata.resources.history) {
            list.innerHTML += `<li class="detail-item" style="color:#6366f1"><span class="dot indigo">●</span> Used Previous Context (${metadata.resources.history} steps)</li>`;
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
        addLogEntry('⚠️ No project active. Please select a project at the top.', 'warning');
        return;
    }

    const directiveInput = document.getElementById('setting-directive');
    const subAgentsList = document.getElementById('setting-subagents-list');

    // Show modal with loading state
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        modal.classList.add('open');
    });

    directiveInput.value = 'Loading...';
    subAgentsList.innerHTML = '<div class="loading-state" style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">Loading configuration...</div>';

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
        addLogEntry('❌ Failed to load settings: ' + error.message, 'error');
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
        list.innerHTML = '<div class="empty-state" style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">No sub-agents found.</div>';
        return;
    }

    // Role-based placeholders for better UX
    const placeholders = {
        'researcher': 'e.g., Search for latest tech news from reliable sources like TechCrunch and The Verge. Focus on AI developments...',
        'writer': 'e.g., Write in a professional yet engaging tone. Use emojis sparingly. Avoid jargon...',
        'planner': 'e.g., Create a content plan that balances educational posts with promotional content. Schedule posts for optimal times...',
        'reviewer': 'e.g., Check for grammatical errors and ensure the tone matches our brand voice. Verify all facts...',
        'default': 'e.g., define the specific tasks and behavioral guidelines for this agent...'
    };

    list.innerHTML = subAgents.map(agent => {
        const roleKey = (agent.role || '').toLowerCase();
        const roleName = agent.role_name || agent.role || agent.id || 'Agent';
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
                        ${agent.model_id || 'Default Model'}
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px; color: rgba(255,255,255,0.7);">
                    ${roleType}
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" style="display: block; font-size: 13px; color: rgba(255,255,255,0.9); margin-bottom: 6px;">
                    📝 Behavior Instructions (System Prompt)
                </label>
                <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 8px;">
                    Define how this agent should act, its personality, and specific rules to follow.
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
    btn.textContent = 'Saving...';

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

        addLogEntry('✅ Settings saved successfully!', 'success');
        window.closeAgentSettingsModal();

    } catch (error) {
        console.error('[Studio] Error saving settings:', error);
        addLogEntry('❌ Failed to save settings: ' + error.message, 'error');
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
        statusEl.querySelector('.status-text').textContent = '✅ Approved';
        statusEl.classList.add('approved');
        statusEl.classList.remove('completed');
    }

    const approvalEl = document.getElementById(`approval-${channel}`);
    if (approvalEl) approvalEl.style.display = 'none';

    addLogEntry(`✨ Content for ${getChannelDisplayName(channel)} approved!`, 'success');
};
