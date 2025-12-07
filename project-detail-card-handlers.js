
// --- PRD 11.3: Agent Swarm Card Event Handlers ---

// Global state for selected card
let selectedTeamId = null;

/**
 * Handle card click for selection
 */
window.handleCardClick = function (event, teamId) {
    // Prevent propagation if clicking on buttons
    if (event.target.closest('button')) {
        return;
    }

    // Toggle selection
    const cards = document.querySelectorAll('.agent-card');
    cards.forEach(card => {
        if (card.dataset.teamId === teamId) {
            if (selectedTeamId === teamId) {
                // Deselect
                card.classList.remove('agent-card--selected');
                selectedTeamId = null;
            } else {
                // Select
                card.classList.add('agent-card--selected');
                selectedTeamId = teamId;
            }
        } else {
            // Deselect others
            card.classList.remove('agent-card--selected');
        }
    });
};

/**
 * Handle delete team button
 */
window.handleDeleteTeam = async function (event, teamId) {
    event.stopPropagation();

    if (!confirm("Are you sure you want to delete this Agent Team instance?")) {
        return;
    }

    try {
        // Call existing delete logic if available
        if (typeof deleteAgentTeamInstance === 'function') {
            await deleteAgentTeamInstance(teamId);
        } else {
            // Fallback: Direct Firestore delete
            await db.collection('projectAgentTeamInstances').doc(teamId).delete();
            console.log(`Deleted team instance: ${teamId}`);

            // Refresh the swarm
            const projectId = new URLSearchParams(window.location.search).get('id');
            if (projectId) {
                await loadAgentSwarm(projectId);
            }
        }

        // Clear selection
        selectedTeamId = null;

    } catch (error) {
        console.error('Error deleting team:', error);
        alert(`Failed to delete team: ${error.message}`);
    }
};

/**
 * Handle view history button (legacy, redirecting to Studio)
 */
window.handleViewHistory = function (event, teamId) {
    event.stopPropagation();
    handleViewStudio(event, teamId);
};

/**
 * Handle view Studio button
 * Opens the Sub-Agent Studio section for the selected team
 */
window.handleViewStudio = function (event, teamId) {
    event.stopPropagation();

    // Show the Sub-Agent Studio section
    const studioSection = document.getElementById('sub-agent-studio-section');
    if (studioSection) {
        studioSection.style.display = 'block';

        // Smooth scroll to the section
        studioSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Get project ID from URL
    const projectId = new URLSearchParams(window.location.search).get('id');

    // Call openViewHistory to load the 3-panel data (sub-agents, runs, content)
    if (typeof window.openViewHistory === 'function' && projectId) {
        console.log('[handleViewStudio] Opening view history for team:', teamId);
        window.openViewHistory(projectId, teamId);
    } else {
        console.log('[handleViewStudio] View Studio for team:', teamId);
        // openViewHistory not available or no projectId
    }
};

/**
 * Close the Sub-Agent Studio section
 */
window.closeStudioSection = function () {
    const studioSection = document.getElementById('sub-agent-studio-section');
    if (studioSection) {
        studioSection.style.display = 'none';
    }
};

/**
 * Toggle Run Mode between "Run Now" and "Schedule"
 * NOTE: "Run Now" and "Schedule" are MODE NAMES, NOT action buttons!
 * The actual execution is triggered by the "Activate" button in the footer.
 */
window.toggleRunMode = function (event, teamId, mode) {
    event.stopPropagation();

    // Get the run-mode container for this team
    const runModeContainer = document.querySelector(`.agent-card__run-mode[data-team-id="${teamId}"]`);
    if (!runModeContainer) return;

    // Update mode attribute
    runModeContainer.dataset.mode = mode;

    // Update toggle button states
    const runNowOption = document.getElementById(`mode-run-now-${teamId}`);
    const scheduleOption = document.getElementById(`mode-schedule-${teamId}`);
    const scheduleConfig = document.getElementById(`schedule-config-${teamId}`);

    if (runNowOption && scheduleOption) {
        runNowOption.classList.toggle('active', mode === 'run-now');
        scheduleOption.classList.toggle('active', mode === 'schedule');
    }

    // Show/hide schedule configuration UI
    if (scheduleConfig) {
        scheduleConfig.classList.toggle('visible', mode === 'schedule');

        // Initialize timezone dropdown when schedule mode is shown
        if (mode === 'schedule') {
            initializeTimezoneDropdown(teamId);
        }
    }

    console.log(`[toggleRunMode] Team ${teamId} set to mode: ${mode}`);
};

/**
 * Initialize timezone dropdown with common timezones
 * Auto-selects user's current timezone
 */
function initializeTimezoneDropdown(teamId) {
    const tzSelect = document.getElementById(`schedule-timezone-${teamId}`);
    if (!tzSelect || tzSelect.options.length > 0) return; // Already initialized

    // Get user's current timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Common timezones with UTC offset
    const timezones = [
        { value: 'Pacific/Honolulu', label: 'Hawaii (UTC-10)', offset: -10 },
        { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)', offset: -8 },
        { value: 'America/Denver', label: 'Denver (UTC-7)', offset: -7 },
        { value: 'America/Chicago', label: 'Chicago (UTC-6)', offset: -6 },
        { value: 'America/New_York', label: 'New York (UTC-5)', offset: -5 },
        { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)', offset: -3 },
        { value: 'UTC', label: 'UTC (UTC+0)', offset: 0 },
        { value: 'Europe/London', label: 'London (UTC+0)', offset: 0 },
        { value: 'Europe/Paris', label: 'Paris (UTC+1)', offset: 1 },
        { value: 'Europe/Berlin', label: 'Berlin (UTC+1)', offset: 1 },
        { value: 'Africa/Cairo', label: 'Cairo (UTC+2)', offset: 2 },
        { value: 'Europe/Moscow', label: 'Moscow (UTC+3)', offset: 3 },
        { value: 'Asia/Dubai', label: 'Dubai (UTC+4)', offset: 4 },
        { value: 'Asia/Karachi', label: 'Karachi (UTC+5)', offset: 5 },
        { value: 'Asia/Kolkata', label: 'Mumbai (UTC+5:30)', offset: 5.5 },
        { value: 'Asia/Dhaka', label: 'Dhaka (UTC+6)', offset: 6 },
        { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7)', offset: 7 },
        { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh (UTC+7)', offset: 7 },
        { value: 'Asia/Singapore', label: 'Singapore (UTC+8)', offset: 8 },
        { value: 'Asia/Hong_Kong', label: 'Hong Kong (UTC+8)', offset: 8 },
        { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)', offset: 8 },
        { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)', offset: 9 },
        { value: 'Asia/Seoul', label: 'Seoul (UTC+9)', offset: 9 },
        { value: 'Australia/Sydney', label: 'Sydney (UTC+11)', offset: 11 },
        { value: 'Pacific/Auckland', label: 'Auckland (UTC+12)', offset: 12 }
    ];

    // Sort by offset
    timezones.sort((a, b) => a.offset - b.offset);

    // Check if user's timezone is in the list
    let userTzInList = timezones.some(tz => tz.value === userTimezone);

    // If not in list, add it at the top
    if (!userTzInList) {
        const offset = new Date().getTimezoneOffset() / -60;
        const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
        timezones.unshift({
            value: userTimezone,
            label: `${userTimezone} (UTC${offsetStr}) ★`,
            offset: offset
        });
    }

    // Populate dropdown
    timezones.forEach(tz => {
        const option = document.createElement('option');
        option.value = tz.value;
        option.textContent = tz.label;
        if (tz.value === userTimezone) {
            option.selected = true;
        }
        tzSelect.appendChild(option);
    });

    console.log(`[initializeTimezoneDropdown] Initialized with user timezone: ${userTimezone}`);
}

/**
 * Handle Run Now / Activate Agent Team button
 * Opens the Activation Modal
 */
window.handleActivateAgentTeam = function (event, teamId) {
    event.stopPropagation();
    openActivationModal(teamId);
};

/**
 * Open Activation Modal
 * Shows team info and custom instructions input
 */
async function openActivationModal(teamId) {
    // Remove existing modal
    const existing = document.getElementById('activation-modal');
    if (existing) existing.remove();

    // Get project ID
    const projectId = new URLSearchParams(window.location.search).get('id');

    // Fetch team data
    let teamData = { name: 'Agent Team', subAgentCount: 0 };
    try {
        const teamDoc = await firebase.firestore()
            .collection('projectAgentTeamInstances')
            .doc(teamId)
            .get();
        if (teamDoc.exists) {
            teamData = { ...teamData, ...teamDoc.data() };
        }
    } catch (e) {
        console.error('Error fetching team:', e);
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'activation-modal';
    modal.innerHTML = `
        <div class="activation-modal-overlay" onclick="closeActivationModal()">
            <div class="activation-modal-content" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="activation-modal-header">
                    <div class="activation-modal-orb"></div>
                    <h2>Activate Agent Team</h2>
                    <button class="activation-modal-close" onclick="closeActivationModal()">×</button>
                </div>
                
                <!-- Team Info -->
                <div class="activation-modal-team-info">
                    <div class="team-name">${teamData.name}</div>
                    <div class="team-stats">
                        <span class="stat">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            ${teamData.subAgentCount || 0} Sub-Agents
                        </span>
                    </div>
                </div>
                
                <!-- Active Directive -->
                <div class="activation-modal-directive">
                    <label>Active Directive:</label>
                    <p>${teamData.active_directive?.summary || teamData.activeDirective || 'System initialized. Awaiting instructions.'}</p>
                </div>
                
                <!-- Custom Instructions -->
                <div class="activation-modal-field">
                    <label for="custom-instructions">Custom Instructions (Optional)</label>
                    <textarea id="custom-instructions" placeholder="Add any additional instructions for this run..."></textarea>
                </div>
                
                <!-- Actions -->
                <div class="activation-modal-actions">
                    <button class="btn-cancel" onclick="closeActivationModal()">Cancel</button>
                    <button class="btn-start" onclick="startAgentRun('${teamId}', '${projectId}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Start Run
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add styles if not exists
    if (!document.getElementById('activation-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'activation-modal-styles';
        styles.textContent = `
            .activation-modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.85);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .activation-modal-content {
                background: linear-gradient(135deg, #1a1d24 0%, #0f1115 100%);
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 20px;
                padding: 28px;
                max-width: 480px;
                width: 90%;
                box-shadow: 0 25px 80px rgba(139, 92, 246, 0.2);
                animation: slideUp 0.3s ease;
            }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .activation-modal-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 24px;
                position: relative;
            }
            .activation-modal-orb {
                width: 40px; height: 40px;
                background: linear-gradient(135deg, #8b5cf6, #a855f7);
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            @keyframes pulse { 0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.5); } 50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.8); } }
            .activation-modal-header h2 { margin: 0; color: #fff; font-size: 20px; font-weight: 600; }
            .activation-modal-close {
                position: absolute; right: 0; top: 0;
                background: none; border: none; color: rgba(255,255,255,0.5);
                font-size: 28px; cursor: pointer; line-height: 1;
            }
            .activation-modal-close:hover { color: #fff; }
            .activation-modal-team-info {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 20px;
            }
            .team-name { color: #fff; font-size: 16px; font-weight: 600; margin-bottom: 8px; }
            .team-stats { display: flex; gap: 16px; }
            .stat { display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.6); font-size: 13px; }
            .stat svg { stroke: #8b5cf6; }
            .activation-modal-directive {
                background: rgba(139, 92, 246, 0.1);
                border: 1px solid rgba(139, 92, 246, 0.2);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 20px;
            }
            .activation-modal-directive label { color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .activation-modal-directive p { margin: 8px 0 0; color: #fff; font-size: 14px; line-height: 1.5; }
            .activation-modal-field { margin-bottom: 24px; }
            .activation-modal-field label { display: block; color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 8px; }
            .activation-modal-field textarea {
                width: 100%; min-height: 80px; resize: vertical;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 10px;
                padding: 12px;
                color: #fff;
                font-size: 14px;
                box-sizing: border-box;
            }
            .activation-modal-field textarea:focus { outline: none; border-color: #8b5cf6; }
            .activation-modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
            .btn-cancel {
                padding: 12px 24px;
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                color: #fff;
                border-radius: 10px;
                font-size: 14px;
                cursor: pointer;
            }
            .btn-cancel:hover { background: rgba(255,255,255,0.12); }
            .btn-start {
                padding: 12px 24px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border: none;
                color: #fff;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
            }
            .btn-start:hover { transform: translateY(-1px); box-shadow: 0 6px 25px rgba(16, 185, 129, 0.4); }
            
            /* Toast Notification */
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10002;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .toast {
                background: linear-gradient(135deg, #1a1d24 0%, #0f1115 100%);
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 12px;
                padding: 16px 20px;
                min-width: 320px;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                animation: slideIn 0.3s ease;
            }
            @keyframes slideIn { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
            .toast--running { border-color: rgba(59, 130, 246, 0.5); }
            .toast--running .toast-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); animation: spin 1s linear infinite; }
            .toast--success { border-color: rgba(16, 185, 129, 0.5); }
            .toast--success .toast-icon { background: linear-gradient(135deg, #10b981, #059669); }
            .toast--error { border-color: rgba(239, 68, 68, 0.5); }
            .toast--error .toast-icon { background: linear-gradient(135deg, #ef4444, #dc2626); }
            .toast-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .toast-icon svg { stroke: #fff; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .toast-content { flex: 1; }
            .toast-title { color: #fff; font-size: 14px; font-weight: 600; margin-bottom: 2px; }
            .toast-message { color: rgba(255,255,255,0.6); font-size: 13px; }
            .toast-close { background: none; border: none; color: rgba(255,255,255,0.4); font-size: 20px; cursor: pointer; line-height: 1; }
            .toast-close:hover { color: #fff; }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(modal);
}

window.closeActivationModal = function () {
    const modal = document.getElementById('activation-modal');
    if (modal) modal.remove();
};

/**
 * Start Agent Run
 */
window.startAgentRun = async function (teamId, projectId) {
    const customInstructions = document.getElementById('custom-instructions')?.value || '';

    // Close modal
    closeActivationModal();

    // Show running toast
    const toastId = showToast('running', 'Agent Team Running', 'Executing sub-agents...');

    try {
        // Fetch team data
        const teamDoc = await firebase.firestore()
            .collection('projectAgentTeamInstances')
            .doc(teamId)
            .get();

        const teamData = teamDoc.exists ? teamDoc.data() : { name: 'Agent Team' };

        // Create run record
        const runRef = await firebase.firestore()
            .collection('projects')
            .doc(projectId)
            .collection('agentRuns')
            .add({
                team_instance_id: teamId,
                team_name: teamData.name || 'Agent Team',
                status: 'running',
                started_at: firebase.firestore.FieldValue.serverTimestamp(),
                triggered_by: 'manual',
                custom_instructions: customInstructions,
                steps_completed: []
            });

        console.log('[startAgentRun] Created run:', runRef.id);

        // Execute using AgentExecutionService
        if (window.AgentExecutionService) {
            // NOTE: executeRun handles status updates and content saving internally
            const result = await window.AgentExecutionService.executeRun(
                runRef.id,
                projectId
            );

            // Update toast based on result
            if (result.success) {
                updateToast(toastId, 'success', 'Run Completed', 'Agent team finished successfully!');
            } else {
                updateToast(toastId, 'error', 'Run Failed', result.error || 'Unknown error');
            }
        } else {
            throw new Error('AgentExecutionService not loaded');
        }

        // Reload agent swarm
        if (typeof loadAgentSwarm === 'function') {
            loadAgentSwarm(projectId);
        }

    } catch (error) {
        console.error('[startAgentRun] Error:', error);
        updateToast(toastId, 'error', 'Run Failed', error.message);
    }
};

/**
 * Toast Notification System
 */
let toastCounter = 0;

function showToast(type, title, message) {
    // Ensure container exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const id = `toast-${++toastCounter}`;
    const iconSvg = type === 'running'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="40" stroke-dashoffset="10"></circle></svg>'
        : type === 'success'
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="dismissToast('${id}')">×</button>
    `;

    container.appendChild(toast);

    // Auto dismiss after 10 seconds for success/error
    if (type !== 'running') {
        setTimeout(() => dismissToast(id), 10000);
    }

    return id;
}

function updateToast(id, type, title, message) {
    const toast = document.getElementById(id);
    if (!toast) return;

    const iconSvg = type === 'success'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    toast.className = `toast toast--${type}`;
    toast.querySelector('.toast-icon').innerHTML = iconSvg;
    toast.querySelector('.toast-title').textContent = title;
    toast.querySelector('.toast-message').textContent = message;

    // Auto dismiss
    setTimeout(() => dismissToast(id), 10000);
}

function dismissToast(id) {
    const toast = document.getElementById(id);
    if (toast) {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }
}

/**
 * Handle Pause Team button
 */
window.handlePauseTeam = async function (event, teamId) {
    event.stopPropagation();

    try {
        await firebase.firestore()
            .collection('projectAgentTeamInstances')
            .doc(teamId)
            .update({
                status: 'paused',
                paused_at: firebase.firestore.FieldValue.serverTimestamp()
            });

        showAlertModal('Team Paused', '⏸️ Agent team has been paused successfully.');

        // Reload to update UI
        const projectId = new URLSearchParams(window.location.search).get('id');
        if (typeof loadAgentSwarm === 'function') {
            loadAgentSwarm(projectId);
        }
    } catch (error) {
        console.error('[handlePauseTeam] Error:', error);
        showAlertModal('Error', '❌ Failed to pause team: ' + error.message);
    }
};

/**
 * Handle Schedule button (placeholder)
 */
window.handleSchedule = function (event, teamId) {
    event.stopPropagation();
    showAlertModal('Coming Soon', '⏰ Schedule feature is coming soon!');
};

/**
 * Custom alert modal that doesn't disappear
 */
function showAlertModal(title, message) {
    const existing = document.getElementById('alert-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'alert-modal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10001; display: flex; align-items: center; justify-content: center;">
            <div style="background: #1a1d24; border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 28px; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <h3 style="margin: 0 0 16px 0; color: #fff; font-size: 18px; font-weight: 600;">${title}</h3>
                <p style="margin: 0 0 24px 0; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6;">${message}</p>
                <div style="display: flex; justify-content: flex-end;">
                    <button id="alert-modal-ok" style="padding: 12px 32px; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); border: none; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                        OK
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('alert-modal-ok').addEventListener('click', () => {
        modal.remove();
    });
}

/**
 * Handle Activate Team button (when paused or for triggering run based on mode)
 * This button now checks the selected Run Mode and acts accordingly:
 * - "run-now": Opens activation modal for immediate execution
 * - "schedule": Saves schedule settings and activates scheduled execution
 */
window.handleActivateTeam = async function (event, teamId) {
    event.stopPropagation();

    // Get the current run mode for this team's card
    const runModeContainer = document.querySelector(`.agent-card__run-mode[data-team-id="${teamId}"]`);
    const currentMode = runModeContainer?.dataset.mode || 'run-now';

    console.log(`[handleActivateTeam] Team: ${teamId}, Mode: ${currentMode}`);

    if (currentMode === 'schedule') {
        // SCHEDULE MODE: Save schedule settings and show confirmation
        try {
            // Get all schedule settings from the UI
            const freqSelect = document.getElementById(`schedule-freq-${teamId}`);
            const timeInput = document.getElementById(`schedule-time-${teamId}`);
            const quantitySelect = document.getElementById(`schedule-quantity-${teamId}`);
            const endTimeInput = document.getElementById(`schedule-endtime-${teamId}`);
            const timezoneSelect = document.getElementById(`schedule-timezone-${teamId}`);

            const frequency = freqSelect?.value || 'daily';
            const startTime = timeInput?.value || '09:00';
            const quantity = parseInt(quantitySelect?.value || '3', 10);
            const endTime = endTimeInput?.value || '18:00';
            const timezone = timezoneSelect?.value || Intl.DateTimeFormat().resolvedOptions().timeZone;

            // Update Firestore with schedule settings
            await firebase.firestore()
                .collection('projectAgentTeamInstances')
                .doc(teamId)
                .update({
                    status: 'active',
                    run_mode: 'schedule',
                    schedule: {
                        frequency: frequency,
                        start_time: startTime,
                        end_time: endTime,
                        quantity: quantity,
                        timezone: timezone,
                        enabled: true,
                        updated_at: firebase.firestore.FieldValue.serverTimestamp()
                    },
                    activated_at: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Show schedule summary in the card
            updateScheduleSummary(teamId, { frequency, startTime, endTime, quantity, timezone });

            // Create friendly frequency label and timezone short name
            const freqLabels = { 'daily': 'Daily', 'weekly': 'Weekly', 'hourly': 'Every 6 Hours' };
            const freqLabel = freqLabels[frequency] || frequency;
            const tzShort = timezone.split('/').pop().replace('_', ' ');

            showAlertModal('Schedule Saved', `⏰ Agent team scheduled!\n\n📅 ${freqLabel} × ${quantity} runs\n🕐 ${startTime} - ${endTime}\n🌍 ${tzShort}`);

            // Reload to update UI
            const projectId = new URLSearchParams(window.location.search).get('id');
            if (typeof loadAgentSwarm === 'function') {
                loadAgentSwarm(projectId);
            }
        } catch (error) {
            console.error('[handleActivateTeam] Schedule Error:', error);
            showAlertModal('Error', '❌ Failed to save schedule: ' + error.message);
        }
    } else {
        // RUN NOW MODE: Open activation modal for immediate execution
        // NOTE: openActivationModal is defined elsewhere and handles the actual agent run
        openActivationModal(teamId);
    }
};

/**
 * Update Schedule Summary display in the card
 */
function updateScheduleSummary(teamId, settings) {
    const summaryEl = document.getElementById(`schedule-summary-${teamId}`);
    if (!summaryEl) return;

    const freqLabels = { 'daily': 'Daily', 'weekly': 'Weekly', 'hourly': 'Every 6H' };
    const freqLabel = freqLabels[settings.frequency] || settings.frequency;

    // Get short timezone name (e.g., "Seoul" from "Asia/Seoul")
    const tzShort = settings.timezone ? settings.timezone.split('/').pop().replace('_', ' ') : '';

    const summaryText = `${freqLabel} × ${settings.quantity} | ${settings.startTime} - ${settings.endTime}${tzShort ? ` (${tzShort})` : ''}`;

    summaryEl.querySelector('.schedule-summary-text').textContent = summaryText;
    summaryEl.style.display = 'flex';
}

/**
 * Handle settings button
 */
// Global state for settings
let currentSettingsTeamId = null;

/**
 * Open Settings Modal for Agent Team
 * @param {Event} event 
 * @param {string} teamId 
 */
window.handleOpenSettings = async function (event, teamId) {
    if (event) event.stopPropagation();

    currentSettingsTeamId = teamId;
    const modal = document.getElementById('agent-settings-modal');
    const directiveInput = document.getElementById('setting-directive');
    const subAgentsList = document.getElementById('setting-subagents-list');

    if (!modal) return;

    // Show modal with loading state
    modal.style.display = 'flex';
    // Small delay to allow display:flex to apply before adding opacity class for transition
    requestAnimationFrame(() => {
        modal.classList.add('open');
    });

    directiveInput.value = 'Loading...';
    subAgentsList.innerHTML = '<div class="loading-state">Loading configuration...</div>';

    try {
        const db = firebase.firestore();

        // 1. Load Team Data (Directive)
        const teamDoc = await db.collection('projectAgentTeamInstances').doc(teamId).get();
        if (!teamDoc.exists) throw new Error('Team not found');

        const teamData = teamDoc.data();
        directiveInput.value = teamData.active_directive?.summary || teamData.activeDirective || '';

        // 2. Load Sub-Agents
        const subAgentsSnap = await db.collection('projectAgentTeamInstances')
            .doc(teamId)
            .collection('subAgents')
            .orderBy('display_order', 'asc')
            .get();

        const subAgents = [];
        subAgentsSnap.forEach(doc => subAgents.push({ id: doc.id, ...doc.data() }));

        // 3. Render Sub-Agents
        renderSettingsSubAgents(subAgents);

    } catch (error) {
        console.error('Error loading settings:', error);
        alert('Failed to load settings: ' + error.message);
        modal.classList.remove('open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }
};

/**
 * Close Settings Modal
 */
window.closeAgentSettingsModal = function () {
    const modal = document.getElementById('agent-settings-modal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200); // Match transition duration
    }
};

function renderSettingsSubAgents(subAgents) {
    const list = document.getElementById('setting-subagents-list');

    if (subAgents.length === 0) {
        list.innerHTML = '<div class="empty-state">No sub-agents found.</div>';
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
                    <div style="font-weight: 600; color: #fff; font-size: 16px; margin-bottom: 4px;">${agent.role_name || agent.role}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #3B82F6;"></span>
                        ${agent.model_id || 'Default Model'}
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px; color: rgba(255,255,255,0.7);">
                    ${agent.role || 'Agent'}
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label" style="font-size: 13px; color: rgba(255,255,255,0.9);">
                    📝 Behavior Instructions (System Prompt)
                </label>
                <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 8px;">
                    Define how this agent should act, its personality, and specific rules to follow.
                </div>
                <textarea class="form-input sub-agent-prompt" 
                    data-id="${agent.id}" 
                    rows="5" 
                    style="font-size: 13px; font-family: 'Menlo', 'Monaco', 'Courier New', monospace; line-height: 1.5; background: rgba(0,0,0,0.3);"
                    placeholder="${placeholder}">${agent.system_prompt || ''}</textarea>
            </div>
        </div>
        `;
    }).join('');
}

window.saveAgentSettings = async function () {
    if (!currentSettingsTeamId) return;

    const btn = document.querySelector('#agent-settings-modal .btn-primary');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const db = firebase.firestore();
        const batch = db.batch();

        // 1. Update Directive
        const directive = document.getElementById('setting-directive').value;
        const teamRef = db.collection('projectAgentTeamInstances').doc(currentSettingsTeamId);

        batch.update(teamRef, {
            'active_directive.summary': directive,
            'activeDirective': directive, // Legacy support
            'updatedAt': firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update Sub-Agents
        const promptInputs = document.querySelectorAll('.sub-agent-prompt');
        promptInputs.forEach(input => {
            const agentId = input.dataset.id;
            const newPrompt = input.value;

            const agentRef = teamRef.collection('subAgents').doc(agentId);
            batch.update(agentRef, {
                system_prompt: newPrompt,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();

        alert('✅ Settings saved successfully!');
        window.closeAgentSettingsModal();

        // Refresh page to show changes (or reload specific parts if possible)
        // For now, simple reload is safest to update all UI components
        window.location.reload();

    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};
