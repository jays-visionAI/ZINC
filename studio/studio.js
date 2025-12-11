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
        name: '⚡ Quick Post',
        description: '빠른 단순 포스팅',
        agents: ['planner', 'creator_text', 'manager'],
        contentTypes: ['text'],
        estimatedTime: '30s',
        estimatedCost: 0.02,
    },
    standard: {
        id: 'standard',
        name: '📝 Standard',
        description: '텍스트 + 이미지 기본 조합',
        agents: ['knowledge_curator', 'planner', 'creator_text', 'creator_image', 'compliance', 'manager'],
        contentTypes: ['text', 'image'],
        estimatedTime: '2min',
        estimatedCost: 0.08,
    },
    seo_focused: {
        id: 'seo_focused',
        name: '🔎 SEO Focused',
        description: 'SEO 최적화 중심',
        agents: ['seo_watcher', 'planner', 'creator_text', 'seo_optimizer', 'manager'],
        contentTypes: ['text'],
        estimatedTime: '1.5min',
        estimatedCost: 0.06,
    },
    premium: {
        id: 'premium',
        name: '🏆 Premium',
        description: '전체 에이전트 활용 고품질',
        agents: ['research', 'seo_watcher', 'knowledge_curator', 'kpi', 'planner',
            'creator_text', 'creator_image',
            'compliance', 'seo_optimizer', 'evaluator', 'manager'],
        contentTypes: ['text', 'image'],
        estimatedTime: '5min',
        estimatedCost: 0.25,
    },
    full_media: {
        id: 'full_media',
        name: '🎬 Full Media',
        description: '텍스트 + 이미지 + 영상',
        agents: ['research', 'seo_watcher', 'knowledge_curator', 'kpi', 'planner',
            'creator_text', 'creator_image', 'creator_video',
            'compliance', 'seo_optimizer', 'evaluator', 'manager', 'engagement'],
        contentTypes: ['text', 'image', 'video'],
        estimatedTime: '8min',
        estimatedCost: 0.50,
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
    selectedTemplate: 'standard',
    selectedAgents: [],
    isExecuting: false,
    isPaused: false,
    currentPhase: 0,
    currentAgent: 0,
    timerSeconds: 0,
    timerInterval: null,
    planContext: null, // Context from Knowledge Hub
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
    updateStats();
});

// ============================================
// PROJECT & AGENT TEAM SELECTORS
// ============================================
async function initProjectSelector() {
    const projectSelect = document.getElementById('project-select');
    const agentTeamSelect = document.getElementById('agentteam-select');

    // Add highlight initially to guide user
    projectSelect.classList.add('selection-highlight');

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
                        state.selectedAgentTeam = teamId;

                        const selectedTeamOption = agentTeamSelect.options[agentTeamSelect.selectedIndex];

                        // Verify if the team was actually selected (exists in the list)
                        if (!selectedTeamOption || agentTeamSelect.value !== teamId) {
                            console.warn('[Studio] Target team ID not found in list:', teamId);
                            addLogEntry('⚠️ Selected team not found in project', 'warning');
                            state.selectedAgentTeam = null; // Reset if invalid
                        } else {
                            const teamName = selectedTeamOption.textContent || teamId;
                            addLogEntry(`🤖 Selected team: ${teamName}`, 'info');
                        }

                        await loadSubAgents(teamId);
                        enableStartButton();

                        // If we have a context, we might want to auto-open the DAG or highlight start
                        if (state.planContext) {
                            const startBtn = document.getElementById('start-execution-btn');
                            startBtn.classList.add('animate-pulse'); // Visual cue
                        }

                        if (typeof renderDAGPlaceholder === 'function') {
                            renderDAGPlaceholder();
                        }
                    }
                } else {
                    // Project auto-selected but no agent team - show prominent warning
                    showAgentTeamRequiredWarning();
                }
            }

        } catch (error) {
            console.error('[Studio] Error loading projects:', error);
            projectSelect.innerHTML = '<option value="">Error loading projects</option>';
            addLogEntry('❌ Failed to load projects', 'error');
        }
    });


    // Event: Project change
    projectSelect.addEventListener('change', async (e) => {
        projectSelect.classList.remove('selection-highlight'); // Stop glowing
        const projectId = e.target.value;
        const selectedOption = projectSelect.options[projectSelect.selectedIndex];
        const projectName = selectedOption?.textContent || projectId;
        state.selectedProject = projectId;

        if (projectId) {
            // Sync to global state
            localStorage.setItem('currentProjectId', projectId);

            addLogEntry(`📁 Selected project: ${projectName}`, 'info');

            // Update Preview Profile
            updatePreviewProfile(projectName);

            await loadAgentTeams(projectId);
        } else {
            agentTeamSelect.innerHTML = '<option value="">Select Agent Team...</option>';
            agentTeamSelect.disabled = true;
            addLogEntry('📁 Project deselected', 'info');
        }

        disableStartButton();
    });

    // Event: Agent Team change
    agentTeamSelect.addEventListener('change', async (e) => {
        // Stop all glowing effects
        agentTeamSelect.classList.remove('selection-highlight', 'urgent-highlight');

        // Dismiss warning toast if present
        const toast = document.getElementById('agent-team-warning-toast');
        if (toast) toast.remove();

        state.selectedAgentTeam = e.target.value;
        const selectedOption = agentTeamSelect.options[agentTeamSelect.selectedIndex];
        const teamName = selectedOption?.textContent || e.target.value;

        if (state.selectedProject && state.selectedAgentTeam) {
            addLogEntry(`🤖 Selected team: ${teamName}`, 'info');
            // Load sub-agents for the selected team
            await loadSubAgents(state.selectedAgentTeam);
            enableStartButton();
            renderDAGPlaceholder();
        } else {
            // Reset to default template when no team selected
            resetAgentRoster();
            disableStartButton();
        }
    });
}

/**
 * Show prominent warning when agent team is not selected after project auto-load
 */
function showAgentTeamRequiredWarning() {
    const agentTeamSelect = document.getElementById('agentteam-select');

    // Enhanced glow effect on the agent team selector
    if (agentTeamSelect) {
        agentTeamSelect.classList.add('selection-highlight', 'urgent-highlight');
    }

    // Create toast notification
    const existingToast = document.getElementById('agent-team-warning-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'agent-team-warning-toast';
    toast.className = 'agent-team-warning-toast';
    toast.innerHTML = `
        <div class="toast-icon">⚠️</div>
        <div class="toast-content">
            <div class="toast-title">Agent Team Required</div>
            <div class="toast-message">Please select an Agent Team to start content generation</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    // Add styles if not already present
    if (!document.getElementById('agent-team-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'agent-team-toast-styles';
        style.textContent = `
            .agent-team-warning-toast {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                align-items: center;
                gap: 12px;
                background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(255, 107, 53, 0.4);
                z-index: 10000;
                animation: toastSlideIn 0.4s ease-out, toastPulse 2s ease-in-out infinite;
            }
            @keyframes toastSlideIn {
                from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes toastPulse {
                0%, 100% { box-shadow: 0 8px 32px rgba(255, 107, 53, 0.4); }
                50% { box-shadow: 0 8px 48px rgba(255, 107, 53, 0.7); }
            }
            .toast-icon { font-size: 24px; }
            .toast-title { font-weight: bold; font-size: 14px; }
            .toast-message { font-size: 12px; opacity: 0.9; margin-top: 2px; }
            .toast-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
            }
            .toast-close:hover { background: rgba(255,255,255,0.3); }
            
            /* Enhanced urgent glow for agent team selector */
            .urgent-highlight {
                animation: urgentGlow 1.5s ease-in-out infinite !important;
                border-color: #ff6b35 !important;
            }
            @keyframes urgentGlow {
                0%, 100% { box-shadow: 0 0 8px #ff6b35, 0 0 16px #ff6b35; }
                50% { box-shadow: 0 0 16px #ff6b35, 0 0 32px #f7931e, 0 0 48px #ff6b35; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'toastSlideIn 0.3s ease-in reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 8000);

    addLogEntry('⚠️ Please select an Agent Team', 'warning');
}

async function loadAgentTeams(projectId) {
    const agentTeamSelect = document.getElementById('agentteam-select');

    console.log('[Studio] Loading agent teams for project:', projectId);

    try {
        // Try projectAgentTeamInstances first (new structure)
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

        addLogEntry(`🤖 Found ${teamsSnapshot.size} agent team(s)`, 'info');
        agentTeamSelect.disabled = false;
        agentTeamSelect.classList.add('selection-highlight'); // Highlight to guide next step

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

/**
 * Load sub-agents for the selected Agent Team
 * @param {string} teamId - The selected Agent Team ID
 */
async function loadSubAgents(teamId) {
    try {
        // Fetch sub-agents from projectAgentTeamInstances/{teamId}/subAgents
        const subAgentsSnapshot = await db.collection('projectAgentTeamInstances')
            .doc(teamId)
            .collection('subAgents')
            .orderBy('display_order', 'asc')
            .get();

        if (subAgentsSnapshot.empty) {
            console.log('No sub-agents found for team:', teamId);
            // Use default template selection
            const template = WORKFLOW_TEMPLATES[state.selectedTemplate];
            if (template) {
                applyTemplate(template);
            }
            return;
        }

        const subAgents = [];
        subAgentsSnapshot.forEach(doc => {
            subAgents.push({ id: doc.id, ...doc.data() });
        });

        console.log('Loaded sub-agents:', subAgents);

        // Update Agent Roster UI
        updateAgentRosterUI(subAgents);

        // Update preview channel based on team configuration
        await updatePreviewChannel(teamId);

    } catch (error) {
        console.error('Error loading sub-agents:', error);
        // Fallback to default template
        const template = WORKFLOW_TEMPLATES[state.selectedTemplate];
        if (template) {
            applyTemplate(template);
        }
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
        // Fetch the Agent Team document to get channel config
        const teamDoc = await db.collection('projectAgentTeamInstances').doc(teamId).get();

        if (!teamDoc.exists) {
            channelName.textContent = 'Team not found';
            return;
        }

        const team = teamDoc.data();
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
        const credentialId = bindings[provider];
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

        if (isInTeam) {
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

// Agent-specific time and cost estimates (based on typical API usage)
const AGENT_ESTIMATES = {
    research: { time: 15, cost: 0.03 },        // Web search + analysis
    seo_watcher: { time: 10, cost: 0.02 },     // SEO monitoring
    knowledge_curator: { time: 12, cost: 0.025 }, // Knowledge retrieval
    kpi: { time: 8, cost: 0.015 },             // KPI analysis
    planner: { time: 20, cost: 0.04 },         // Content planning (core)
    creator_text: { time: 25, cost: 0.05 },    // Text generation (core)
    creator_image: { time: 30, cost: 0.08 },   // Image generation (API intensive)
    creator_video: { time: 60, cost: 0.15 },   // Video planning
    compliance: { time: 10, cost: 0.02 },      // Compliance check
    seo_optimizer: { time: 12, cost: 0.025 },  // SEO optimization
    evaluator: { time: 15, cost: 0.03 },       // Quality evaluation
    manager: { time: 10, cost: 0.02 }          // Final coordination
};

function updateStats() {
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
            totalCost += 0.02;
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
    document.getElementById('stats-cost').textContent = `$${totalCost.toFixed(2)}`;
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

function startExecution() {
    if (!state.selectedProject || !state.selectedAgentTeam) {
        alert('Please select a Project and Agent Team first.');
        return;
    }

    state.isExecuting = true;
    state.isPaused = false;
    state.currentPhase = 1;
    state.currentAgent = 1;

    // Update UI
    document.getElementById('start-execution-btn').disabled = true;
    document.getElementById('pause-btn').disabled = false;
    document.getElementById('stop-btn').disabled = false;
    document.getElementById('project-select').disabled = true;
    document.getElementById('agentteam-select').disabled = true;

    // Start timer
    startTimer();

    // Reset DAG visualization
    resetDAG();

    // Initialize DAGExecutor
    executor = new DAGExecutor();

    // Register event callbacks
    executor
        .on('onNodeStart', ({ nodeId }) => {
            setNodeState(nodeId, 'running');
        })
        .on('onNodeComplete', ({ nodeId }) => {
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
            addLogEntry(message, type);
        })
        .on('onContentGenerated', ({ agentId, content }) => {
            if (agentId === 'creator_text') {
                streamTextContent(content.content);
            } else if (agentId === 'creator_image') {
                const imageContainer = document.getElementById('twitter-image');
                if (imageContainer) {
                    imageContainer.style.display = 'block'; // Ensure it's visible
                    imageContainer.innerHTML = `<img src="${content.imageUrl}" alt="Generated Content" style="width:100%; height:100%; object-fit:cover; border-radius: 12px; border: 1px solid var(--color-border);">`;

                    // Add log with image link
                    const shortUrl = content.imageUrl.length > 50 ? 'View Generated Image' : content.imageUrl;
                    addLogEntry(`🖼️ Image generated: <a href="${content.imageUrl}" target="_blank" style="color:#3b82f6;text-decoration:underline;">${shortUrl}</a>`, 'success');
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
            document.getElementById('project-select').disabled = false;
            document.getElementById('agentteam-select').disabled = false;
            document.getElementById('start-execution-btn').disabled = false;
            document.getElementById('pause-btn').disabled = true;
            document.getElementById('stop-btn').disabled = true;
        });

    // Start execution
    const selectedAgents = getSelectedAgents();
    executor.start(selectedAgents, state.selectedProject, state.selectedAgentTeam, state.planContext);

    // Update footer progress
    updateFooterProgress();

    console.log('Starting execution with DAGExecutor:', {
        project: state.selectedProject,
        team: state.selectedAgentTeam,
        template: state.selectedTemplate,
        agents: selectedAgents,
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

    // Reset UI
    document.getElementById('start-execution-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    document.getElementById('stop-btn').disabled = true;
    document.getElementById('project-select').disabled = false;
    document.getElementById('agentteam-select').disabled = false;
}

function retryExecution() {
    addLogEntry('🔄 Retrying last failed agent...', 'running');
    // TODO: Implement retry logic
}

function completeExecution() {
    state.isExecuting = false;
    stopTimer();

    document.getElementById('pause-btn').disabled = true;
    document.getElementById('stop-btn').disabled = true;
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

    // Update Name and Handle
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
// Typing animation for text streaming
async function streamTextContent(contentText) {
    const twitterContent = document.getElementById('twitter-content');
    // Use provided content or fallback to sample
    const content = contentText || SAMPLE_CONTENT.twitter;

    if (!twitterContent) return;

    // Clear placeholder
    twitterContent.innerHTML = '<p class="streaming-text" style="white-space: pre-wrap; margin: 0;"></p>';
    const textEl = twitterContent.querySelector('.streaming-text');

    // Add cursor
    textEl.classList.add('typing-cursor');

    // Stream characters
    for (let i = 0; i < content.length; i++) {
        textEl.textContent += content[i];

        // Scroll to keep cursor visible
        twitterContent.scrollTop = twitterContent.scrollHeight;

        // Variable speed for natural feel
        const delay = content[i] === '\n' ? 50 : (Math.random() * 15 + 5);
        await sleep(delay);
    }

    // Remove cursor after completion
    textEl.classList.remove('typing-cursor');
    textEl.classList.add('stream-complete');

    // Update stats
    updateCharacterCount(content.length);

    // Also update other platforms (simplified - just show content)
    updateOtherPlatforms(content);
}

// Update character count in stats
function updateCharacterCount(count) {
    const charCountEl = document.getElementById('stat-char-count');
    if (charCountEl) {
        charCountEl.textContent = `${count}/280`;
    }
}

// Update other platform previews
function updateOtherPlatforms(contentText) {
    const text = contentText || SAMPLE_CONTENT.twitter;

    // Instagram caption
    const instagramCaption = document.querySelector('.instagram-caption');
    if (instagramCaption) {
        // Find the username element to preserve it
        const username = instagramCaption.querySelector('strong')?.textContent || 'yourbrand';
        instagramCaption.innerHTML = `<strong>${username}</strong> ${text.substring(0, 100)}... <span style="color:#8e8e8e">more</span>`;
    }

    // Facebook
    const facebookContent = document.querySelector('#preview-facebook .social-content');
    if (facebookContent) {
        facebookContent.innerHTML = `<p>${text.substring(0, 150)}... <a href="#" style="color:#1877f2">See more</a></p>`;
    }

    // LinkedIn
    const linkedinContent = document.querySelector('#preview-linkedin .social-content');
    if (linkedinContent) {
        linkedinContent.innerHTML = `<p>${text.substring(0, 150)}... <a href="#" style="color:#0a66c2">see more</a></p>`;
    }
}

// Update Agent Insights circular progress
function updateContentStats(results) {
    // SEO Score
    const seoScore = results?.seo_optimizer?.score || 92;
    updateCircularProgress('seo', seoScore);
    document.getElementById('seo-value').textContent = seoScore;
    document.getElementById('seo-sublabel').textContent = `${seoScore}/100 - Excellent`;

    // Compliance
    const complianceScore = results?.compliance?.score || 100;
    updateCircularProgress('compliance', complianceScore);
    document.getElementById('compliance-value').textContent = complianceScore;
    document.getElementById('compliance-sublabel').textContent = 'Status: Passed -';
    document.getElementById('compliance-sublabel').classList.add('passed');

    // Show checkmark
    const checkmark = document.getElementById('compliance-check');
    if (checkmark) checkmark.style.display = 'flex';
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

    // Simulate regeneration
    setTimeout(() => {
        streamTextContent();
        addLogEntry('✓ Content regenerated', 'success');
    }, 500);
}

function approveContent() {
    setContentStatus('approved');
    addLogEntry('✅ Content approved and ready for publishing', 'success');

    // Update approve button style
    const approveBtn = document.getElementById('btn-approve');
    if (approveBtn) {
        approveBtn.classList.add('approved');
        approveBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Approved!
        `;
    }
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
