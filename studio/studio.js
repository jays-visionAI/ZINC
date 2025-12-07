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
    updateStats();
});

// ============================================
// PROJECT & AGENT TEAM SELECTORS
// ============================================
async function initProjectSelector() {
    const projectSelect = document.getElementById('project-select');
    const agentTeamSelect = document.getElementById('agentteam-select');

    // Wait for Firebase auth
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../index.html';
            return;
        }

        try {
            // Load projects
            const projectsSnapshot = await db.collection('projects')
                .where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .get();

            projectSelect.innerHTML = '<option value="">Select Project...</option>';

            projectsSnapshot.forEach(doc => {
                const project = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = project.name || project.businessName || doc.id;
                projectSelect.appendChild(option);
            });

            // If URL has project param, auto-select
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('project');
            if (projectId) {
                projectSelect.value = projectId;
                await loadAgentTeams(projectId);

                const teamId = urlParams.get('team');
                if (teamId) {
                    agentTeamSelect.value = teamId;
                    state.selectedAgentTeam = teamId;
                    enableStartButton();
                }
            }

        } catch (error) {
            console.error('Error loading projects:', error);
        }
    });

    // Event: Project change
    projectSelect.addEventListener('change', async (e) => {
        const projectId = e.target.value;
        state.selectedProject = projectId;

        if (projectId) {
            await loadAgentTeams(projectId);
        } else {
            agentTeamSelect.innerHTML = '<option value="">Select Agent Team...</option>';
            agentTeamSelect.disabled = true;
        }

        disableStartButton();
    });

    // Event: Agent Team change
    agentTeamSelect.addEventListener('change', (e) => {
        state.selectedAgentTeam = e.target.value;

        if (state.selectedProject && state.selectedAgentTeam) {
            enableStartButton();
            renderDAGPlaceholder();
        } else {
            disableStartButton();
        }
    });
}

async function loadAgentTeams(projectId) {
    const agentTeamSelect = document.getElementById('agentteam-select');

    try {
        const teamsSnapshot = await db.collection('agentTeams')
            .where('projectId', '==', projectId)
            .get();

        agentTeamSelect.innerHTML = '<option value="">Select Agent Team...</option>';

        teamsSnapshot.forEach(doc => {
            const team = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = team.name || doc.id;
            agentTeamSelect.appendChild(option);
        });

        agentTeamSelect.disabled = false;

    } catch (error) {
        console.error('Error loading agent teams:', error);
        agentTeamSelect.innerHTML = '<option value="">Error loading teams</option>';
    }
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
function updateStats() {
    const selectedAgents = getSelectedAgents();
    const totalAgents = document.querySelectorAll('#agent-roster input[type="checkbox"]').length;

    document.getElementById('stats-agents').textContent = `${selectedAgents.length}/${totalAgents} agents`;

    const template = WORKFLOW_TEMPLATES[state.selectedTemplate];
    if (template && state.selectedTemplate !== 'custom') {
        document.getElementById('stats-time').textContent = `~${template.estimatedTime}`;
        document.getElementById('stats-cost').textContent = `$${template.estimatedCost.toFixed(2)}`;
    } else {
        // Estimate for custom
        const costPerAgent = 0.02;
        const cost = selectedAgents.length * costPerAgent;
        const timePerAgent = 20; // seconds
        const totalSeconds = selectedAgents.length * timePerAgent;
        const minutes = Math.ceil(totalSeconds / 60);

        document.getElementById('stats-time').textContent = `~${minutes}min`;
        document.getElementById('stats-cost').textContent = `$${cost.toFixed(2)}`;
    }
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
            if (agentId === 'text') {
                streamTextContent();
            }
        })
        .on('onExecutionComplete', ({ success }) => {
            state.isExecuting = false;
            stopTimer();

            if (success) {
                updateContentStats();
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
    executor.start(selectedAgents, state.selectedProject, state.selectedAgentTeam);

    // Update footer progress
    updateFooterProgress();

    console.log('Starting execution with DAGExecutor:', {
        project: state.selectedProject,
        team: state.selectedAgentTeam,
        template: state.selectedTemplate,
        agents: selectedAgents
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
async function streamTextContent() {
    const twitterContent = document.getElementById('twitter-content');
    const content = SAMPLE_CONTENT.twitter;

    // Clear placeholder
    twitterContent.innerHTML = '<p class="streaming-text"></p>';
    const textEl = twitterContent.querySelector('.streaming-text');

    // Add cursor
    textEl.classList.add('typing-cursor');

    // Stream characters
    for (let i = 0; i < content.length; i++) {
        textEl.textContent += content[i];

        // Scroll to keep cursor visible
        twitterContent.scrollTop = twitterContent.scrollHeight;

        // Variable speed for natural feel
        const delay = content[i] === '\n' ? 100 : (Math.random() * 20 + 10);
        await sleep(delay);
    }

    // Remove cursor after completion
    textEl.classList.remove('typing-cursor');
    textEl.classList.add('stream-complete');

    // Update stats
    updateCharacterCount(content.length);

    // Also update other platforms (simplified - just show content)
    updateOtherPlatforms();
}

// Update character count in stats
function updateCharacterCount(count) {
    const charCountEl = document.getElementById('stat-char-count');
    if (charCountEl) {
        charCountEl.textContent = `${count}/280`;
    }
}

// Update other platform previews
function updateOtherPlatforms() {
    // Instagram caption
    const instagramCaption = document.querySelector('.instagram-caption');
    if (instagramCaption) {
        instagramCaption.innerHTML = `<strong>yourbrand</strong> ${SAMPLE_CONTENT.instagram.substring(0, 100)}... <span style="color:#8e8e8e">more</span>`;
    }

    // Facebook
    const facebookContent = document.querySelector('#preview-facebook .social-content');
    if (facebookContent) {
        facebookContent.innerHTML = `<p>${SAMPLE_CONTENT.facebook.substring(0, 150)}... <a href="#" style="color:#1877f2">See more</a></p>`;
    }

    // LinkedIn
    const linkedinContent = document.querySelector('#preview-linkedin .social-content');
    if (linkedinContent) {
        linkedinContent.innerHTML = `<p>${SAMPLE_CONTENT.linkedin.substring(0, 150)}... <a href="#" style="color:#0a66c2">see more</a></p>`;
    }
}

// Update Agent Insights circular progress
function updateContentStats() {
    // SEO Score: 92%
    const seoScore = 92;
    updateCircularProgress('seo', seoScore);
    document.getElementById('seo-value').textContent = seoScore;
    document.getElementById('seo-sublabel').textContent = `${seoScore}/100 - Excellent`;

    // Compliance: 100%
    const complianceScore = 100;
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

// Call initDAG and initZoomControls on load
document.addEventListener('DOMContentLoaded', () => {
    initDAG();
    initZoomControls();
});
