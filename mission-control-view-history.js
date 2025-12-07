// mission-control-view-history.js
// Mission Control - View History Feature Implementation
// Handles synchronization of 3 panels when View History is clicked

(function () {
    'use strict';

    // ===== State Management =====
    let selectedTeamId = null;
    let selectedRunId = null;
    let selectedSubAgentId = null;
    let currentProjectId = null;
    let currentTeamData = null; // Cache team data for connection checks

    // Firestore listeners
    let subAgentsListener = null;
    let runsListener = null;
    let contentsListener = null;
    let teamListener = null;

    // ===== Public API =====

    /**
     * Initialize View History for a specific Agent Team
     * @param {string} projectId - Project ID
     * @param {string} teamInstanceId - Team Instance ID
     */
    window.openViewHistory = function (projectId, teamInstanceId) {
        console.log(`[View History] Opening for team: ${teamInstanceId}`);

        // Store state
        currentProjectId = projectId;
        selectedTeamId = teamInstanceId;
        selectedRunId = null; // Reset run selection

        // Clean up existing listeners
        cleanupListeners();

        // Load all 3 panels
        loadAssignedAgentTeam(projectId, teamInstanceId);
        loadRecentRuns(projectId, teamInstanceId);
        loadGeneratedContent(projectId, teamInstanceId);
    };

    /**
     * Close View History and cleanup
     */
    window.closeViewHistory = function () {
        console.log('[View History] Closing');
        cleanupListeners();
        selectedTeamId = null;
        selectedRunId = null;
        currentProjectId = null;
    };

    /**
     * Select a specific run to filter Generated Content
     * @param {string} runId - AgentRun ID
     */
    window.selectRun = function (runId) {
        // Toggle selection - clicking the same run deselects it
        if (selectedRunId === runId) {
            selectedRunId = null;
        } else {
            selectedRunId = runId;
        }

        // Update UI: Remove '.selected' from all run cards
        document.querySelectorAll('.run-card').forEach(el => el.classList.remove('selected'));

        // Add '.selected' to the newly selected card
        if (selectedRunId) {
            const selectedCard = document.querySelector(`.run-card[data-id="${selectedRunId}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }
        }

        // Update filter indicator in Generated Content header
        const contentFilterIndicator = document.getElementById('content-filter-indicator');
        if (contentFilterIndicator) {
            if (selectedRunId) {
                const selectedCard = document.querySelector(`.run-card[data-id="${selectedRunId}"]`);
                const runPrompt = selectedCard?.querySelector('.run-prompt')?.textContent || 'Selected Run';
                const shortPrompt = runPrompt.length > 25 ? runPrompt.substring(0, 25) + '...' : runPrompt;
                contentFilterIndicator.innerHTML = `${shortPrompt} ✕`;
                contentFilterIndicator.style.display = 'block';
            } else {
                contentFilterIndicator.style.display = 'none';
            }
        }

        // Reload Generated Content panel with run filter
        if (currentProjectId && selectedTeamId) {
            loadGeneratedContent(currentProjectId, selectedTeamId, selectedRunId);
        }
    };

    // Run a single sub-agent
    window.runSubAgent = async function (subAgentId, agentName) {
        console.log(`[View History] Running sub-agent: ${subAgentId}`);

        if (!currentProjectId || !selectedTeamId) {
            alert('Error: Project or Team context not found.');
            return;
        }

        // Custom confirmation using showConfirmModal if available, else native confirm
        const message = `Run "${agentName}" now?\n\nThis will execute the sub-agent and generate content.`;

        // Wrap in Promise to use async/await pattern
        const confirmed = await new Promise(resolve => {
            if (typeof showConfirmModal === 'function') {
                // showConfirmModal uses callback: showConfirmModal(title, message, onConfirm, options)
                showConfirmModal('Run Sub-Agent', message, () => {
                    resolve(true);
                }, {
                    onCancel: () => resolve(false)
                });
            } else {
                // Fallback to native confirm with setTimeout
                setTimeout(() => {
                    resolve(window.confirm(message));
                }, 100);
            }
        });

        if (!confirmed) {
            console.log('[View History] Run cancelled by user');
            return;
        }

        console.log(`[View History] Executing ${agentName}...`);

        try {
            // Show loading state on button
            const btn = document.querySelector(`#sa-card-${subAgentId} .sub-agent-run-btn`);
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="spinner"></span> Running...`;
            }

            // Check if AgentExecutionService is available
            if (typeof AgentExecutionService === 'undefined') {
                throw new Error('AgentExecutionService not loaded');
            }

            // Create a run document for tracking
            const runRef = db.collection('projects').doc(currentProjectId).collection('agentRuns').doc();
            const runData = {
                team_instance_id: selectedTeamId,
                sub_agent_id: subAgentId,
                status: 'pending',
                task_prompt: `Manual run for ${agentName}`,
                started_at: firebase.firestore.FieldValue.serverTimestamp(),
                triggered_by: 'manual_studio'
            };
            await runRef.set(runData);

            // Execute the run
            const result = await AgentExecutionService.executeRun(runRef.id, currentProjectId, selectedTeamId, subAgentId);

            console.log('[View History] Sub-agent run completed:', result);

            // Refresh the runs list
            if (currentProjectId && selectedTeamId) {
                loadRecentRuns(currentProjectId, selectedTeamId, selectedSubAgentId);
            }

        } catch (error) {
            console.error('[View History] Error running sub-agent:', error);
            alert(`Failed to run agent: ${error.message}`);
        } finally {
            // Reset button state
            const btn = document.querySelector(`#sa-card-${subAgentId} .sub-agent-run-btn`);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run`;
            }
        }
    };

    // ===== Tab State =====
    let currentContentTab = 'content'; // 'content' or 'worklog'

    /**
     * Switch between Content and Work Log tabs
     * @param {string} tabName - 'content' or 'worklog'
     */
    window.switchContentTab = function (tabName) {
        currentContentTab = tabName;

        // Update tab button states
        document.querySelectorAll('.content-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Show/hide panels
        const contentPanel = document.getElementById('content-tab-panel');
        const worklogPanel = document.getElementById('worklog-tab-panel');

        if (contentPanel && worklogPanel) {
            if (tabName === 'content') {
                contentPanel.style.display = 'block';
                contentPanel.classList.add('active');
                worklogPanel.style.display = 'none';
                worklogPanel.classList.remove('active');
            } else {
                contentPanel.style.display = 'none';
                contentPanel.classList.remove('active');
                worklogPanel.style.display = 'block';
                worklogPanel.classList.add('active');
            }
        }

        console.log(`[View History] Switched to ${tabName} tab`);
    };

    // ===== Panel 1: Assigned Sub-Agents (Left) =====

    function loadAssignedAgentTeam(projectId, teamId) {
        console.log('[View History] Loading Assigned Sub-Agents...');

        // Try both possible container IDs
        let container = document.getElementById('sub-agent-list');
        if (!container) {
            container = document.getElementById('assigned-agent-team-list');
        }

        if (!container) {
            console.error('[View History] Container not found (tried #sub-agent-list and #assigned-agent-team-list)');
            return;
        }

        // Show loading state
        container.innerHTML = '<div class="loading-state">Loading sub-agents...</div>';

        // 1. Listen to Team Document (for Channels)
        teamListener = db.collection('projectAgentTeamInstances').doc(teamId)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const teamData = doc.data();
                    renderChannelConnections(teamData);
                }
            }, err => console.error("Error loading team data:", err));

        // 2. Listen to Sub-Agents
        subAgentsListener = db.collection('projectAgentTeamInstances')
            .doc(teamId)
            .collection('subAgents')
            .orderBy('display_order', 'asc')
            .onSnapshot(
                (snapshot) => {
                    const subAgents = [];
                    snapshot.forEach(doc => {
                        subAgents.push({ id: doc.id, ...doc.data() });
                    });

                    console.log(`[View History] Loaded ${subAgents.length} sub-agents`);
                    renderSubAgents(subAgents, container);
                },
                (error) => {
                    console.error('[View History] Error loading sub-agents:', error);
                    container.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
                }
            );
    }

    async function renderChannelConnections(teamData) {
        const container = document.getElementById('channel-connections-list');
        const wrapper = document.getElementById('channel-connections-container');

        if (!container || !wrapper) return;

        // Cache team data for connection checks
        currentTeamData = teamData;

        // Use Helper to normalize
        const channels = ChannelOrchestrator.normalizeAgentTeamChannels(teamData);

        if (channels.length === 0) {
            wrapper.style.display = 'none';
            return;
        }

        wrapper.style.display = 'block';
        container.innerHTML = '<div class="loading-state" style="font-size: 12px;">Loading channel status...</div>';

        // Fetch Credential Labels
        const credIds = channels.map(ch => ch.credentialId).filter(id => id);
        const credMap = {};

        if (credIds.length > 0) {
            try {
                // Firestore 'in' query (max 10)
                // Assuming < 10 channels for now
                const credsSnap = await db.collection('userApiCredentials')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', credIds)
                    .get();
                credsSnap.forEach(doc => {
                    credMap[doc.id] = doc.data().label;
                });
            } catch (err) {
                console.error("Error fetching credential labels:", err);
            }
        }

        container.innerHTML = channels.map(ch => {
            if (!ch.enabled) return '';

            const icon = getChannelIcon(ch.provider);
            const label = getChannelLabel(ch.provider);
            const credLabel = ch.credentialId ? (credMap[ch.credentialId] || 'Unknown Key') : '—';

            let statusBadge = '';
            if (ch.status === 'ready') {
                statusBadge = '<span style="color: #22c55e; font-size: 12px;">● Ready</span>';
            } else if (ch.status === 'missing_key') {
                statusBadge = '<span style="color: #eab308; font-size: 12px;">⚠️ Missing Key</span>';
            } else {
                statusBadge = `<span style="color: #ef4444; font-size: 12px;">⛔ Error</span>`;
            }

            const errorMsg = ch.lastErrorMessage ? `<div style="font-size: 11px; color: #ef4444; margin-top: 4px;">${ch.lastErrorMessage}</div>` : '';

            return `
                <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div style="display: flex; align-items: center; gap: 6px; font-weight: 500;">
                            ${icon} ${label}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            ${statusBadge}
                            <button onclick="window.handleCheckConnection('${ch.provider}', '${ch.credentialId || ''}')" 
                                style="background: none; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.6); padding: 2px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; transition: all 0.2s;"
                                onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='white';"
                                onmouseout="this.style.background='none'; this.style.color='rgba(255,255,255,0.6)';">
                                Check Connection
                            </button>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.5); display: flex; justify-content: space-between;">
                        <span>Key: <span style="color: rgba(255,255,255,0.8);">${credLabel}</span></span>
                        <span>${ch.updatedAt ? formatTimeAgo(ch.updatedAt.toDate()) : ''}</span>
                    </div>
                    ${errorMsg}
                </div>
            `;
        }).join('');
    }

    function renderSubAgents(subAgents, container) {
        // Update sub-agent count badge
        const countEl = document.getElementById('sub-agent-count');
        if (countEl) {
            countEl.textContent = subAgents.length;
        }

        if (subAgents.length === 0) {
            container.innerHTML = '<div class="empty-state">No sub-agents assigned</div>';
            return;
        }

        container.innerHTML = subAgents.map(agent => {
            const statusClass = agent.status === 'active' ? 'active' : 'inactive';
            const ratingDisplay = agent.rating_avg ? agent.rating_avg.toFixed(1) : 'N/A';
            const likesDisplay = agent.likes_count || 0;
            const successRate = agent.metrics?.success_rate || 0;
            const lastActive = agent.metrics?.last_active_at
                ? formatTimeAgo(agent.metrics.last_active_at.toDate())
                : 'No activity yet';

            // Runtime info display
            const runtime = agent.effective_runtime || agent.runtime_base;
            const runtimeDisplay = runtime
                ? `${runtime.provider} / ${runtime.model_id} (${runtime.tier})`
                : 'Not configured';

            return `
                <div class="sub-agent-card ${selectedSubAgentId === agent.id ? 'selected' : ''}" 
                     id="sa-card-${agent.id}">
                    <div class="sub-agent-header" onclick="window.selectSubAgent('${agent.id}')">
                        <div class="sub-agent-name">${agent.role_name || 'Unnamed'}</div>
                        <div class="sr-badge">${successRate.toFixed(0)}% SR</div>
                    </div>
                    <div class="sub-agent-role" onclick="window.selectSubAgent('${agent.id}')">${agent.role_type}</div>
                    <div class="sub-agent-meta" style="margin-top: 4px;" onclick="window.selectSubAgent('${agent.id}')">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Last active ${lastActive}
                    </div>
                    <div class="sub-agent-meta" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: rgba(255,255,255,0.5);" onclick="window.selectSubAgent('${agent.id}')">
                        🤖 ${runtimeDisplay}
                    </div>
                    <div class="sub-agent-actions" style="margin-top: 10px; display: flex; gap: 8px;">
                        <button type="button" class="sub-agent-run-btn" onclick="event.stopPropagation(); event.preventDefault(); window.runSubAgent('${agent.id}', '${(agent.role_name || 'Agent').replace(/'/g, "\\'")}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Run
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Update global selection handler
        window.selectSubAgent = function (subAgentId) {
            // Toggle selection - clicking the same sub-agent deselects it
            if (selectedSubAgentId === subAgentId) {
                selectedSubAgentId = null;
            } else {
                selectedSubAgentId = subAgentId;
            }

            // Update UI selection
            document.querySelectorAll('.sub-agent-card').forEach(el => el.classList.remove('selected'));
            let subAgentName = null;
            if (selectedSubAgentId) {
                const card = document.getElementById(`sa-card-${selectedSubAgentId}`);
                if (card) {
                    card.classList.add('selected');
                    // Get sub-agent name from the card
                    const nameEl = card.querySelector('.sub-agent-name');
                    subAgentName = nameEl ? nameEl.textContent : selectedSubAgentId;
                }
            }

            // Update filter indicator in Recent Runs header with sub-agent name
            const filterIndicator = document.getElementById('runs-filter-indicator');
            if (filterIndicator) {
                if (selectedSubAgentId && subAgentName) {
                    filterIndicator.innerHTML = `Filtered by ${subAgentName} ✕`;
                    filterIndicator.style.display = 'inline-block';
                } else {
                    filterIndicator.style.display = 'none';
                }
            }

            // Reload Recent Runs with sub-agent filter
            if (currentProjectId && selectedTeamId) {
                loadRecentRuns(currentProjectId, selectedTeamId, selectedSubAgentId);
            }

            console.log(`[View History] Selected sub-agent: ${selectedSubAgentId || 'none (showing all)'}`);
        };
    }

    // ===== Panel 2: Recent Runs (Center) =====

    function loadRecentRuns(projectId, teamId, subAgentId = null) {
        console.log('[View History] Loading Recent Runs...', { teamId, subAgentId });

        // Try both possible container IDs
        let container = document.getElementById('runs-list');
        if (!container) {
            container = document.getElementById('recent-runs-list');
        }

        if (!container) {
            console.error('[View History] Container not found (tried #runs-list and #recent-runs-list)');
            return;
        }

        // Show loading state
        container.innerHTML = '<div class="loading-state">Loading runs...</div>';

        // Cleanup previous listener
        if (runsListener) {
            runsListener();
            runsListener = null;
        }

        // Build query: projects/{projectId}/agentRuns
        let query = db.collection('projects')
            .doc(projectId)
            .collection('agentRuns')
            .where('team_instance_id', '==', teamId);

        // Add sub-agent filter if selected
        if (subAgentId) {
            query = query.where('sub_agent_id', '==', subAgentId);
        }

        // Order and limit
        query = query.orderBy('started_at', 'desc').limit(20);

        runsListener = query.onSnapshot(
            (snapshot) => {
                const runs = [];
                snapshot.forEach(doc => {
                    runs.push({ id: doc.id, ...doc.data() });
                });

                console.log(`[View History] Loaded ${runs.length} runs for ${subAgentId ? 'sub-agent ' + subAgentId : 'team'}`);
                renderRuns(runs, container, subAgentId);
            },
            (error) => {
                console.error('[View History] Error loading runs:', error);
                container.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
            }
        );
    }

    function renderRuns(runs, container, subAgentId = null) {
        if (runs.length === 0) {
            const message = subAgentId
                ? 'No runs found for this sub-agent. <button onclick="window.selectSubAgent(null)" style="background: rgba(22, 224, 189, 0.1); border: 1px solid rgba(22, 224, 189, 0.3); color: #16e0bd; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-top: 8px;">Show All Runs</button>'
                : 'No runs found';
            container.innerHTML = `<div class="empty-state">${message}</div>`;
            return;
        }

        container.innerHTML = runs.map(run => {
            const statusClass = getRunStatusClass(run.status);
            const statusLabel = getRunStatusLabel(run.status);
            const durationDisplay = run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : 'N/A';
            const timeAgo = run.started_at ? formatTimeAgo(run.started_at.toDate()) : 'Unknown';
            const isSelected = run.id === selectedRunId;

            // Phase 2: Workflow Info
            const workflowBadge = run.workflowTemplateId ?
                `<span class="workflow-badge" title="Workflow: ${run.workflowTemplateId}">
                    🔄 ${getWorkflowLabel(run.workflowTemplateId)}
                </span>` : '';
            const stepBadge = run.workflowStepId ?
                `<span class="step-badge" title="Step: ${run.workflowStepId}">
                    ${getStepLabel(run.workflowStepId)}
                </span>` : '';

            return `
                <div class="run-card ${statusClass} ${isSelected ? 'selected' : ''}" 
                     data-id="${run.id}"
                     data-run-id="${run.id}"
                     style="cursor: pointer;">
                    <div class="run-header" style="pointer-events: none;">
                        <div class="run-status ${statusClass}">${statusLabel}</div>
                        <div class="run-time">${timeAgo}</div>
                    </div>
                    <div class="run-content" style="pointer-events: none;">
                        <div class="run-prompt">${run.task_prompt || 'No description'}</div>
                        <div class="run-meta">
                            <span class="run-agent">${run.sub_agent_role_name || 'Unknown Agent'}</span>
                            <span class="run-duration">${durationDisplay}</span>
                        </div>
                        ${workflowBadge || stepBadge ? `<div class="run-workflow-info">${workflowBadge} ${stepBadge}</div>` : ''}
                    </div>
                    ${run.status === 'blocked_quota' ? renderQuotaInfo(run) : ''}
                </div>
            `;
        }).join('');

        // Add click event listeners using event delegation
        // Only add once per container
        if (!container.dataset.runClickListenerAdded) {
            container.dataset.runClickListenerAdded = 'true';
            container.addEventListener('click', function (e) {
                const runCard = e.target.closest('.run-card');
                if (runCard) {
                    const runId = runCard.dataset.id || runCard.dataset.runId;
                    if (runId && typeof window.selectRun === 'function') {
                        window.selectRun(runId);
                    }
                }
            });
        }
    }

    // Fallback handler for run card clicks
    function handleRunCardClick(runId) {
        // Toggle selection
        if (selectedRunId === runId) {
            selectedRunId = null;
        } else {
            selectedRunId = runId;
        }

        // Update UI
        document.querySelectorAll('.run-card').forEach(el => el.classList.remove('selected'));
        if (selectedRunId) {
            const card = document.querySelector(`.run-card[data-id="${selectedRunId}"]`);
            if (card) card.classList.add('selected');
        }

        // Reload content
        if (currentProjectId && selectedTeamId) {
            loadGeneratedContent(currentProjectId, selectedTeamId, selectedRunId);
        }
    }

    function renderQuotaInfo(run) {
        if (!run.quota_snapshot) return '';

        const reason = run.block_reason === 'team_quota_exceeded'
            ? 'Team quota exceeded'
            : 'Sub-agent quota exceeded';

        return `
            <div class="quota-info">
                <span class="quota-icon">⚠️</span>
                <span class="quota-reason">${reason}</span>
            </div>
        `;
    }

    // ===== Panel 3: Generated Content (Right) =====

    function loadGeneratedContent(projectId, teamId, runId = null) {

        // Try both possible container IDs
        let container = document.getElementById('content-list');
        if (!container) {
            container = document.getElementById('generated-content-list');
        }

        if (!container) {
            console.error('[View History] Container not found (tried #content-list and #generated-content-list)');
            return;
        }

        // Show loading state
        container.innerHTML = '<div class="loading-state">Loading content...</div>';

        // Cleanup previous listener before creating new one
        if (contentsListener) {
            contentsListener();
            contentsListener = null;
        }

        // Build query
        let query = db.collection('projects')
            .doc(projectId)
            .collection('generatedContents');

        if (runId) {
            // Filter by specific run
            query = query.where('run_id', '==', runId);
        } else {
            // Filter by team (show all)
            query = query.where('team_instance_id', '==', teamId);
            query = query.orderBy('created_at', 'desc').limit(20);
        }

        // Execute query
        contentsListener = query.onSnapshot(
            (snapshot) => {
                const contents = [];
                snapshot.forEach(doc => {
                    contents.push({ id: doc.id, ...doc.data() });
                });

                // Separate publishable content from work logs
                // Use content_category if available, fallback to is_meta for backward compatibility
                const publishableContents = contents.filter(c =>
                    c.content_category === 'publishable' ||
                    (!c.content_category && !c.is_meta && c.content_type !== 'meta')
                );
                const workLogContents = contents.filter(c =>
                    c.content_category === 'work_log' ||
                    (!c.content_category && (c.is_meta || c.content_type === 'meta'))
                );

                // Render to Content tab
                renderContents(publishableContents, container);

                // Render to Work Log tab
                const worklogContainer = document.getElementById('worklog-list');
                if (worklogContainer) {
                    renderWorkLogs(workLogContents, worklogContainer);
                }
            },
            (error) => {
                console.error('[View History] Error loading contents:', error);
                container.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
            }
        );
    }

    function renderContents(contents, container) {
        if (contents.length === 0) {
            container.innerHTML = '<div class="empty-state">No publishable content yet.<br><span style="font-size: 12px; opacity: 0.6;">Run an agent to generate content.</span></div>';
            return;
        }

        container.innerHTML = contents.map(content => {
            // Determine if this content should use platform preview
            if (shouldUsePlatformPreview(content)) {
                return renderPlatformPreview(content);
            } else {
                return renderLegacyContent(content);
            }
        }).join('');
    }

    /**
     * Render Work Log timeline
     */
    function renderWorkLogs(logs, container) {
        if (logs.length === 0) {
            container.innerHTML = '<div class="empty-state">No work logs yet.<br><span style="font-size: 12px; opacity: 0.6;">Agent activity logs will appear here.</span></div>';
            return;
        }

        // Group logs by run_id
        const logsByRun = {};
        logs.forEach(log => {
            const runId = log.run_id || 'unknown';
            if (!logsByRun[runId]) {
                logsByRun[runId] = [];
            }
            logsByRun[runId].push(log);
        });

        // Render timeline
        container.innerHTML = `
            <div class="worklog-timeline">
                ${Object.entries(logsByRun).map(([runId, runLogs]) => {
            const firstLog = runLogs[0];
            const runTime = firstLog.created_at?.toDate?.()
                ? firstLog.created_at.toDate().toLocaleString()
                : 'Unknown time';

            return `
                        <div class="worklog-stage">
                            <div class="worklog-stage-header">
                                <span class="worklog-stage-title">Run: ${runId.substring(0, 8)}...</span>
                                <span class="worklog-stage-duration">${runTime}</span>
                            </div>
                            ${runLogs.map(log => renderWorkLogItem(log)).join('')}
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    /**
     * Render individual work log item
     */
    function renderWorkLogItem(log) {
        const title = log.title || log.sub_agent_role || 'Agent Output';
        const status = log.status || 'complete';
        const output = log.content_text || log.preview_text || '';
        const truncatedOutput = output.length > 300 ? output.substring(0, 300) + '...' : output;

        // Stage badge
        const stage = log.execution_stage || '';
        const stageBadge = stage ? `<span class="worklog-stage-badge ${stage}">${stage}</span>` : '';

        // Stage colors: planning=blue, creation=purple, review=green
        const stageStyle = stage === 'planning' ? 'background: rgba(59, 130, 246, 0.15); color: #3b82f6;'
            : stage === 'creation' ? 'background: rgba(139, 92, 246, 0.15); color: #8b5cf6;'
                : stage === 'review' ? 'background: rgba(16, 185, 129, 0.15); color: #10b981;' : '';

        return `
            <div class="worklog-agent">
                <div class="worklog-agent-header">
                    <span class="worklog-agent-name">
                        ${stageBadge ? `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-right: 8px; ${stageStyle}">${stage.toUpperCase()}</span>` : ''}
                        ${title}
                    </span>
                    <span class="worklog-agent-status ${status}">${status === 'complete' ? '✅ Complete' : status}</span>
                </div>
                <div class="worklog-agent-output">${escapeHtml(truncatedOutput)}</div>
            </div>
        `;
    }

    /**
     * Check if content should use platform-specific preview
     */
    function shouldUsePlatformPreview(content) {
        const socialPlatforms = ['x', 'twitter', 'instagram', 'facebook', 'linkedin'];

        // Meta/Internal content uses legacy format
        if (content.is_meta || content.content_type === 'meta') {
            return false;
        }

        // Strategy/Research/Evaluator content uses legacy format
        const nonSocialRoles = ['planner', 'research', 'evaluator', 'compliance'];
        if (nonSocialRoles.includes(content.sub_agent_role_type)) {
            return false;
        }

        return socialPlatforms.includes(content.platform?.toLowerCase());
    }

    /**
     * Render platform-specific preview (X, Instagram, Facebook, LinkedIn)
     */
    function renderPlatformPreview(content) {
        const platform = content.platform?.toLowerCase();
        const statusClass = getContentStatusClass(content.status);
        const statusLabel = getContentStatusLabel(content.status);

        let platformFrame = '';
        switch (platform) {
            case 'x':
            case 'twitter':
                platformFrame = renderXFrame(content);
                break;
            case 'instagram':
                platformFrame = renderInstagramFrame(content);
                break;
            case 'facebook':
                platformFrame = renderFacebookFrame(content);
                break;
            case 'linkedin':
                platformFrame = renderLinkedInFrame(content);
                break;
            default:
                platformFrame = renderBlogFrame(content);
        }

        return `
            <div class="content-preview-card" data-id="${content.id}">
                <div class="preview-status-bar">
                    <span class="content-status ${statusClass}">${statusLabel}</span>
                </div>
                ${platformFrame}
                ${renderActionPanel(content)}
            </div>
        `;
    }

    /**
     * X (Twitter) Frame
     */
    function renderXFrame(content) {
        const text = content.preview_text || content.content?.text || content.body || '';
        const imageUrl = content.preview_image_url || content.content?.media?.[0]?.url || '';
        const authorName = content.author_profile?.display_name || 'Vision Chain';
        const authorUsername = content.author_profile?.username || 'visionchain';
        const avatarUrl = content.author_profile?.avatar_url || '';

        return `
            <div class="platform-frame x-frame">
                <div class="x-post">
                    <div class="x-header">
                        <div class="x-avatar">
                            ${avatarUrl ? `<img src="${avatarUrl}" alt="">` : '<div class="avatar-placeholder">V</div>'}
                        </div>
                        <div class="x-header-content">
                            <div class="x-author-row">
                                <span class="x-name">${authorName}</span>
                                <span class="x-verified">✓</span>
                                <span class="x-username">@${authorUsername}</span>
                            </div>
                            <div class="x-text">${escapeHtml(text)}</div>
                        </div>
                        <div class="x-menu">···</div>
                    </div>
                    ${imageUrl ? `
                        <div class="x-media">
                            <img src="${imageUrl}" alt="Post media">
                        </div>
                    ` : ''}
                    <div class="x-interactions">
                        <div class="x-action">
                            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></svg>
                            <span>0</span>
                        </div>
                        <div class="x-action">
                            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></svg>
                            <span>0</span>
                        </div>
                        <div class="x-action">
                            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></svg>
                            <span>0</span>
                        </div>
                        <div class="x-action">
                            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21v-5.5h2V21H4z"></path></svg>
                            <span>0</span>
                        </div>
                        <div class="x-action-group">
                            <div class="x-action">
                                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"></path></svg>
                            </div>
                            <div class="x-action">
                                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Instagram Frame
     */
    function renderInstagramFrame(content) {
        const text = content.preview_text || content.content?.text || content.body || '';
        const imageUrl = content.preview_image_url || content.content?.media?.[0]?.url || '';
        const authorUsername = content.author_profile?.username || 'visionchain_official';
        const avatarUrl = content.author_profile?.avatar_url || '';

        return `
            <div class="platform-frame instagram-frame">
                <div class="ig-post">
                    <div class="ig-header">
                        <div class="ig-avatar">
                            ${avatarUrl ? `<img src="${avatarUrl}" alt="">` : '<div class="avatar-placeholder">V</div>'}
                        </div>
                        <div class="ig-username">${authorUsername}</div>
                        <span class="ig-menu">•••</span>
                    </div>
                    <div class="ig-image">
                        ${imageUrl ? `<img src="${imageUrl}" alt="Post">` : '<div class="ig-placeholder">📷</div>'}
                    </div>
                    <div class="ig-actions">
                        <div class="ig-left">
                            <span>❤️</span>
                            <span>💬</span>
                            <span>📤</span>
                        </div>
                        <span class="ig-save">🔖</span>
                    </div>
                    <div class="ig-likes">123 likes</div>
                    <div class="ig-caption">
                        <span class="ig-cap-user">${authorUsername}</span> 
                        ${escapeHtml(text.substring(0, 100))}${text.length > 100 ? '...' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Facebook Frame
     */
    function renderFacebookFrame(content) {
        const text = content.preview_text || content.content?.text || content.body || '';
        const imageUrl = content.preview_image_url || content.content?.media?.[0]?.url || '';
        const authorName = content.author_profile?.display_name || 'Vision Chain';
        const avatarUrl = content.author_profile?.avatar_url || '';

        return `
            <div class="platform-frame facebook-frame">
                <div class="fb-post">
                    <div class="fb-header">
                        <div class="fb-avatar">
                            ${avatarUrl ? `<img src="${avatarUrl}" alt="">` : '<div class="avatar-placeholder">V</div>'}
                        </div>
                        <div class="fb-author-info">
                            <div class="fb-name">${authorName}</div>
                            <div class="fb-time">2h · 🌐</div>
                        </div>
                    </div>
                    <div class="fb-text">${escapeHtml(text)}</div>
                    ${imageUrl ? `
                        <div class="fb-image">
                            <img src="${imageUrl}" alt="Post">
                        </div>
                    ` : ''}
                    <div class="fb-stats">
                        <span>👍❤️ 12</span>
                        <span>3 comments · 5 shares</span>
                    </div>
                    <div class="fb-actions">
                        <span>👍 Like</span>
                        <span>💬 Comment</span>
                        <span>↗️ Share</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * LinkedIn Frame
     */
    function renderLinkedInFrame(content) {
        const text = content.preview_text || content.content?.text || content.body || '';
        const imageUrl = content.preview_image_url || content.content?.media?.[0]?.url || '';
        const authorName = content.author_profile?.display_name || 'Vision Chain';
        const avatarUrl = content.author_profile?.avatar_url || '';

        return `
            <div class="platform-frame linkedin-frame">
                <div class="li-post">
                    <div class="li-header">
                        <div class="li-avatar">
                            ${avatarUrl ? `<img src="${avatarUrl}" alt="">` : '<div class="avatar-placeholder">V</div>'}
                        </div>
                        <div class="li-author-info">
                            <div class="li-name">${authorName}</div>
                            <div class="li-headline">Blockchain Technology Company</div>
                            <div class="li-time">2h • 🌐</div>
                        </div>
                    </div>
                    <div class="li-text">${escapeHtml(text)}</div>
                    ${imageUrl ? `
                        <div class="li-image">
                            <img src="${imageUrl}" alt="Post">
                        </div>
                    ` : ''}
                    <div class="li-stats">👍❤️💡 847 · 42 comments · 15 reposts</div>
                    <div class="li-actions">
                        <span>👍 Like</span>
                        <span>💬 Comment</span>
                        <span>🔄 Repost</span>
                        <span>📤 Send</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Blog/Fallback Frame
     */
    function renderBlogFrame(content) {
        const text = content.preview_text || content.content?.text || content.body || '';
        const title = content.title || 'Generated Content';
        const imageUrl = content.preview_image_url || content.content?.media?.[0]?.url || '';

        return `
            <div class="platform-frame blog-frame">
                <div class="blog-post">
                    ${imageUrl ? `
                        <div class="blog-image">
                            <img src="${imageUrl}" alt="Featured">
                        </div>
                    ` : ''}
                    <div class="blog-title">${escapeHtml(title)}</div>
                    <div class="blog-text">${escapeHtml(text)}</div>
                </div>
            </div>
        `;
    }

    /**
     * Action Panel for all platform previews
     */
    function renderActionPanel(content) {
        const isApproved = content.status === 'approved';
        const isPending = content.status === 'pending';

        return `
            <div class="content-action-panel">
                <button class="action-btn action-copy" onclick="event.stopPropagation(); window.copyContent('${content.id}')">
                    📋 Copy
                </button>
                ${isPending ? `
                    <button class="action-btn action-schedule" onclick="event.stopPropagation(); window.scheduleContent('${content.id}')">
                        📅 Schedule
                    </button>
                    <button class="action-btn action-approve" onclick="event.stopPropagation(); window.approveContent('${content.id}')">
                        ✓ Approve
                    </button>
                ` : isApproved ? `
                    <button class="action-btn action-approve approved" disabled>
                        ✓ Approved
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Legacy content rendering (for non-social content)
     */
    function renderLegacyContent(content) {
        const statusClass = getContentStatusClass(content.status);
        const statusLabel = getContentStatusLabel(content.status);
        const platformIcon = getPlatformIcon(content.platform);
        const isMeta = content.is_meta || content.content_type === 'meta';

        // Workflow/Channel Info
        const workflowBadge = content.workflowTemplateId ?
            `<span class="workflow-badge-small" title="Workflow: ${content.workflowTemplateId}">
                🔄 ${getWorkflowLabel(content.workflowTemplateId)}
            </span>` : '';
        const stepBadge = content.workflowStepId ?
            `<span class="step-badge-small" title="Step: ${content.workflowStepId}">
                ${getStepLabel(content.workflowStepId)}
            </span>` : '';
        const channelBadge = content.channelId ?
            `<span class="channel-badge" title="Channel: ${content.channelId}">
                ${getChannelIcon(content.channelId)} ${getChannelLabel(content.channelId)}
            </span>` : '';

        // Meta badge for internal content
        const metaBadge = isMeta ?
            `<span style="background: rgba(99, 102, 241, 0.2); color: #a78bfa; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">Internal</span>` : '';

        return `
            <div class="content-card ${statusClass}" data-id="${content.id}" data-meta="${isMeta}">
                ${content.preview_image_url ? `
                    <div class="content-image">
                        <img src="${content.preview_image_url}" alt="${content.title || 'Content'}" />
                    </div>
                ` : ''}
                <div class="content-body">
                    <div class="content-header">
                        <div class="content-platform ${isMeta ? 'internal' : ''}">${platformIcon} ${content.platform}${metaBadge}</div>
                        <div class="content-status ${statusClass}">${statusLabel}</div>
                    </div>
                    ${content.title ? `<div class="content-title">${content.title}</div>` : ''}
                    ${content.preview_text ? `<div class="content-preview">${content.preview_text}</div>` : ''}
                    ${workflowBadge || stepBadge || channelBadge ?
                `<div class="content-workflow-info">${workflowBadge} ${stepBadge} ${channelBadge}</div>` : ''}
                    <div class="content-footer" style="display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 12px;">
                        <button onclick="event.stopPropagation(); window.viewContentDetails('${content.id}')" title="View Details" style="padding: 8px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); color: #8b5cf6; border-radius: 6px; cursor: pointer;">🔍</button>
                        <button onclick="event.stopPropagation(); window.copyContent('${content.id}')" style="flex: 1; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 6px; cursor: pointer; font-size: 12px;">📋 Copy</button>
                        ${content.status === 'pending' ? `
                            <button onclick="event.stopPropagation(); window.scheduleContent('${content.id}')" style="flex: 1; padding: 8px; background: rgba(22, 224, 189, 0.1); border: 1px solid rgba(22, 224, 189, 0.3); color: #16e0bd; border-radius: 6px; cursor: pointer; font-size: 12px;">📅 Schedule</button>
                            <button onclick="event.stopPropagation(); window.approveContent('${content.id}')" style="flex: 1; padding: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; color: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">✓ Approve</button>
                        ` : content.status === 'published' ? `
                            <button onclick="event.stopPropagation(); window.viewOnPlatform('${content.external_post_url || content.tweet_url || '#'}')" style="flex: 1.5; padding: 8px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #3b82f6; border-radius: 6px; cursor: pointer; font-size: 12px;">🔗 View Post</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== Helper Functions =====

    function cleanupListeners() {
        if (subAgentsListener) {
            subAgentsListener();
            subAgentsListener = null;
        }
        if (runsListener) {
            runsListener();
            runsListener = null;
        }
        if (contentsListener) {
            contentsListener();
            contentsListener = null;
        }
        if (teamListener) {
            teamListener();
            teamListener = null;
        }
    }

    function getRoleIcon(roleType) {
        const icons = {
            'planner': '🎯',
            'creator_text': '✍️',
            'creator_image': '🎨',
            'creator_video': '🎬',
            'research': '🔍',
            'engagement': '💬',
            'compliance': '⚖️',
            'evaluator': '📊',
            'manager': '👔',
            'kpi': '📈',
            'seo_watcher': '🔎',
            'knowledge_curator': '📚'
        };
        return icons[roleType] || '🤖';
    }

    function getRunStatusClass(status) {
        const classes = {
            'success': 'status-success',
            'failed': 'status-failed',
            'running': 'status-running',
            'blocked_quota': 'status-blocked',
            'pending': 'status-pending'
        };
        return classes[status] || 'status-unknown';
    }

    function getRunStatusLabel(status) {
        const labels = {
            'success': 'SUCCESS',
            'failed': 'FAILED',
            'running': 'RUNNING',
            'blocked_quota': 'QUOTA EXCEEDED',
            'pending': 'PENDING'
        };
        return labels[status] || status.toUpperCase();
    }

    function getContentStatusClass(status) {
        const classes = {
            'published': 'status-published',
            'scheduled': 'status-scheduled',
            'draft': 'status-draft',
            'failed': 'status-failed'
        };
        return classes[status] || 'status-default';
    }

    function getContentStatusLabel(status) {
        const labels = {
            'published': 'Published',
            'scheduled': 'Scheduled',
            'draft': 'Draft',
            'pending_approval': 'Pending Approval',
            'approved': 'Approved',
            'failed': 'Failed'
        };
        return labels[status] || status;
    }

    function getPlatformIcon(platform) {
        const icons = {
            'instagram': '📷',
            'x': '🐦',
            'youtube': '📺',
            'tiktok': '🎵',
            'blog': '📝',
            'linkedin': '💼',
            'facebook': '👥'
        };
        return icons[platform] || '📱';
    }

    function formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} mins ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }

    // ===== Phase 2: Workflow/Channel Helpers =====

    function getWorkflowLabel(workflowTemplateId) {
        // TODO: Load from Firestore or cache
        const labels = {
            'wf_tpl_ig_organic_post': 'IG Organic',
            'wf_tpl_x_thread': 'X Thread',
            'wf_tpl_blog_post': 'Blog Post'
        };
        return labels[workflowTemplateId] || workflowTemplateId.replace('wf_tpl_', '').replace(/_/g, ' ');
    }

    function getStepLabel(workflowStepId) {
        // Extract step name from ID (e.g., step_001_planning -> Planning)
        const match = workflowStepId.match(/step_\d+_(.+)/);
        if (match) {
            return match[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return workflowStepId;
    }

    function getChannelIcon(channelId) {
        // Extract platform from channelId (e.g., ch_instagram_main -> instagram)
        if (channelId.includes('instagram')) return '📷';
        if (channelId.includes('x') || channelId.includes('twitter')) return '🐦';
        if (channelId.includes('youtube')) return '📺';
        if (channelId.includes('tiktok')) return '🎵';
        if (channelId.includes('blog')) return '📝';
        if (channelId.includes('linkedin')) return '💼';
        if (channelId.includes('facebook')) return '👥';
        return '📱';
    }

    function getChannelLabel(channelId) {
        // Extract readable label from channelId
        return channelId.replace('ch_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // ===== Phase 2: Channel Connection Check Logic =====

    window.handleCheckConnection = async function (provider, credentialId) {
        if (!selectedTeamId) return;

        if (!credentialId) {
            alert('No credential configured for this channel.\n\nPlease add a credential in Settings → Connections first.');
            return;
        }

        const button = event.target;
        const originalText = button.textContent;

        try {
            button.disabled = true;
            button.textContent = 'Checking...';
            button.style.opacity = '0.6';

            // Get credential from Firestore
            const credDoc = await db.collection('userApiCredentials').doc(credentialId).get();

            if (!credDoc.exists) {
                throw new Error('Credential not found');
            }

            const credData = credDoc.data();

            // Use AgentRuntimeService to check connection
            const context = await AgentRuntimeService.prepareExecutionContext(selectedTeamId, firebase.auth().currentUser.uid);

            console.log('[CheckConnection] Provider:', provider);
            console.log('[CheckConnection] Context Channels:', context.channels.map(c => c.provider));

            // Case-insensitive lookup
            const channelContext = context.channels.find(ch =>
                ch.provider.toLowerCase() === provider.toLowerCase()
            );

            if (!channelContext) {
                throw new Error(`Channel '${provider}' not found in agent team`);
            }

            if (channelContext.status === 'ready') {
                button.textContent = '✓ Connected';
                button.style.color = '#22c55e';

                // Update UI to show success
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.color = '';
                    button.disabled = false;
                    button.style.opacity = '1';

                    // Reload channel connections to show updated status
                    if (currentTeamData) {
                        renderChannelConnections(currentTeamData);
                    }
                }, 2000);

                alert('✅ Connection successful!\n\nThe API credential is working properly.');
            } else {
                throw new Error(channelContext.error || 'Connection failed');
            }

        } catch (error) {
            console.error('Connection check failed:', error);
            button.textContent = '✗ Failed';
            button.style.color = '#ef4444';

            setTimeout(() => {
                button.textContent = originalText;
                button.style.color = '';
                button.disabled = false;
                button.style.opacity = '1';
            }, 2000);

            alert(`❌ Connection failed:\n\n${error.message}\n\nPlease check your credential in Settings → Connections.`);
        }
    };

    // Keep old function for backward compatibility
    window.handleChangeChannelKey = function (provider) {
        if (!selectedTeamId) return;
        alert('To change the API credential, please go to:\n\nSettings → Connections\n\nThen select or add a new credential for this channel.');
    };

    window.closeCredentialSelector = function () {
        const modal = document.getElementById('credential-selector-modal');
        if (modal) modal.style.display = 'none';
    };

    async function openCredentialSelector(provider) {
        const modal = createCredentialSelectorModal();
        const listContainer = document.getElementById('cred-selector-list');

        modal.style.display = 'flex';
        listContainer.innerHTML = '<div class="loading-state">Loading credentials...</div>';

        try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error("User not authenticated");

            const snapshot = await db.collection('userApiCredentials')
                .where('userId', '==', user.uid)
                .where('provider', '==', provider)
                .where('status', '==', 'active')
                .get();

            if (snapshot.empty) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">
                        No active credentials found for ${getChannelLabel(provider)}.<br>
                        <a href="user-settings.html#connections" style="color: #3b82f6; text-decoration: none; margin-top: 8px; display: inline-block;">Manage Credentials</a>
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = '';

            const docs = [];
            snapshot.forEach(doc => docs.push(doc));

            // Sort in memory
            docs.sort((a, b) => {
                const timeA = a.data().createdAt?.toMillis() || 0;
                const timeB = b.data().createdAt?.toMillis() || 0;
                return timeB - timeA;
            });

            docs.forEach(doc => {
                const cred = doc.data();
                const el = document.createElement('div');
                el.style.cssText = `
                    background: rgba(255,255,255,0.05); 
                    padding: 12px; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    border: 1px solid transparent;
                    transition: all 0.2s;
                `;
                el.innerHTML = `
                    <div style="font-weight: 500;">${cred.accountName || 'Unnamed Account'}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.5);">@${cred.accountHandle || 'unknown'}</div>
                `;
                el.onmouseover = () => el.style.borderColor = 'rgba(255,255,255,0.2)';
                el.onmouseout = () => el.style.borderColor = 'transparent';
                el.onclick = () => updateAgentTeamChannelBinding(selectedTeamId, provider, doc.id);

                listContainer.appendChild(el);
            });

        } catch (error) {
            console.error("Error loading credentials:", error);
            listContainer.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
        }
    }

    function createCredentialSelectorModal() {
        let modal = document.getElementById('credential-selector-modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'credential-selector-modal';
        modal.className = 'admin-modal';
        modal.style.zIndex = '2000'; // Ensure it's on top
        modal.innerHTML = `
            <div class="admin-modal-content" style="max-width: 400px; width: 100%;">
                <div class="admin-modal-header">
                    <h3 class="modal-title">Select API Credential</h3>
                    <button class="admin-modal-close" onclick="closeCredentialSelector()">×</button>
                </div>
                <div class="admin-modal-body" style="padding: 16px;">
                    <div id="cred-selector-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
                </div>
                <div class="admin-modal-footer">
                    <button class="admin-btn-secondary" onclick="closeCredentialSelector()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    async function updateAgentTeamChannelBinding(teamId, provider, credentialId) {
        const listContainer = document.getElementById('cred-selector-list');
        listContainer.innerHTML = '<div class="loading-state">Updating binding...</div>';

        const teamRef = db.collection('projectAgentTeamInstances').doc(teamId);

        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(teamRef);
                if (!doc.exists) throw "Team not found";

                const data = doc.data();
                const channels = data.channels || [];
                const channelBindings = data.channelBindings || {};

                // Update bindings
                channelBindings[provider] = credentialId;

                // Update channels array
                let channelFound = false;
                const updatedChannels = channels.map(ch => {
                    if (ch.provider === provider) {
                        channelFound = true;
                        return {
                            ...ch,
                            credentialId: credentialId,
                            status: credentialId ? 'ready' : 'missing_key',
                            updatedAt: firebase.firestore.Timestamp.now()
                        };
                    }
                    return ch;
                });

                // If channel not in array but we are binding it (edge case), add it
                if (!channelFound) {
                    updatedChannels.push({
                        provider: provider,
                        credentialId: credentialId,
                        status: 'ready',
                        enabled: true,
                        updatedAt: firebase.firestore.Timestamp.now(),
                        lastErrorMessage: null
                    });
                }

                transaction.update(teamRef, {
                    channelBindings: channelBindings,
                    channels: updatedChannels,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            window.closeCredentialSelector();
            // Listener will auto-update UI

        } catch (e) {
            console.error("Error updating binding:", e);
            alert("Failed to update credential binding: " + e.message);
            window.closeCredentialSelector();
        }
    }

    // ===== Content Action Handlers =====

    /**
     * View detailed input/output of a content item
     * Shows what prompts were sent to the sub-agent
     */
    window.viewContentDetails = async function (contentId) {
        try {
            const contentDoc = await firebase.firestore()
                .collection('projects')
                .doc(currentProjectId)
                .collection('generatedContents')
                .doc(contentId)
                .get();

            if (!contentDoc.exists) {
                alert('Content not found.');
                return;
            }

            const content = contentDoc.data();
            const input = content.input_prompts;

            let modalContent = `
                <div style="max-height: 80vh; overflow-y: auto;">
                    <h3 style="margin: 0 0 16px 0; color: #16e0bd;">🔍 Content Details</h3>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">SUB-AGENT</div>
                        <div style="font-size: 14px; color: #fff; font-weight: 600;">${content.sub_agent_role || 'Unknown'}</div>
                    </div>
            `;

            if (input) {
                modalContent += `
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">📋 SYSTEM PROMPT (Behavior Instructions)</div>
                        <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); padding: 12px; border-radius: 8px; font-size: 13px; color: rgba(255,255,255,0.9); white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
                            ${input.system_prompt || 'Not available'}
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">🎯 TEAM DIRECTIVE</div>
                        <div style="background: rgba(22, 224, 189, 0.1); border: 1px solid rgba(22, 224, 189, 0.3); padding: 12px; border-radius: 8px; font-size: 13px; color: rgba(255,255,255,0.9);">
                            ${input.team_directive || 'Not available'}
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">💬 USER MESSAGE (Full Context)</div>
                        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 12px; border-radius: 8px; font-size: 13px; color: rgba(255,255,255,0.9); white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
                            ${input.user_message || 'Not available'}
                        </div>
                    </div>
                `;
            } else {
                modalContent += `
                    <div style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">
                        ⚠️ Input prompts not available for this content.<br>
                        <span style="font-size: 12px;">This may be from an older run before prompt logging was enabled.</span>
                    </div>
                `;
            }

            modalContent += `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 4px;">✅ GENERATED OUTPUT</div>
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px; border-radius: 8px; font-size: 13px; color: rgba(255,255,255,0.9); white-space: pre-wrap; max-height: 300px; overflow-y: auto;">
                        ${content.content_text || 'No output'}
                    </div>
                </div>
                </div>
            `;

            showDetailsModal('Content Details', modalContent);

        } catch (error) {
            console.error('[viewContentDetails] Error:', error);
            alert('Failed to load content details: ' + error.message);
        }
    };

    function showDetailsModal(title, content) {
        const existing = document.getElementById('details-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'details-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="this.parentNode.remove()">
                <div style="background: #1a1d24; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; max-width: 600px; width: 90%; max-height: 90vh; overflow: hidden;" onclick="event.stopPropagation()">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h2 style="margin: 0; color: #fff; font-size: 18px;">${title}</h2>
                        <button onclick="document.getElementById('details-modal').remove()" style="background: none; border: none; color: rgba(255,255,255,0.6); font-size: 24px; cursor: pointer;">&times;</button>
                    </div>
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.copyContent = async function (contentId) {
        try {
            const contentDoc = await firebase.firestore()
                .collection('projects')
                .doc(currentProjectId)
                .collection('generatedContents')
                .doc(contentId)
                .get();

            if (!contentDoc.exists) {
                alert('Content not found.');
                return;
            }

            const contentData = contentDoc.data();
            const textToCopy = contentData.content_text || contentData.preview_text || '';

            if (navigator.clipboard && textToCopy) {
                await navigator.clipboard.writeText(textToCopy);
                alert('📋 Content copied to clipboard!');
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = textToCopy;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('📋 Content copied to clipboard!');
            }
        } catch (error) {
            console.error('[copyContent] Error:', error);
            alert('Failed to copy content: ' + error.message);
        }
    };

    window.scheduleContent = function (contentId) {
        const scheduledTime = prompt('Enter scheduled time (e.g., 2024-12-07 10:00):');
        if (!scheduledTime) return;

        firebase.firestore()
            .collection('projects')
            .doc(currentProjectId)
            .collection('generatedContents')
            .doc(contentId)
            .update({
                status: 'scheduled',
                scheduled_for: new Date(scheduledTime),
                scheduled_at: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                alert('📅 Content scheduled for: ' + scheduledTime);
                if (selectedRunId) loadRunContentWithActions(selectedRunId);
            })
            .catch(error => alert('Failed to schedule: ' + error.message));
    };

    window.approveContent = function (contentId) {
        // Show custom confirmation modal instead of browser confirm
        showConfirmModal(
            'Approve Content',
            'Are you sure you want to approve and post this content to X (Twitter)?',
            async () => {
                try {
                    const contentDoc = await firebase.firestore()
                        .collection('projects')
                        .doc(currentProjectId)
                        .collection('generatedContents')
                        .doc(contentId)
                        .get();

                    if (!contentDoc.exists) {
                        alert('Content not found.');
                        return;
                    }

                    const contentData = contentDoc.data();
                    const tweetText = contentData.content_text || contentData.content || contentData.text;

                    if (!tweetText) {
                        alert('No text content to post.');
                        return;
                    }

                    // Update status to posting
                    await firebase.firestore()
                        .collection('projects')
                        .doc(currentProjectId)
                        .collection('generatedContents')
                        .doc(contentId)
                        .update({
                            status: 'posting',
                            approved_at: firebase.firestore.FieldValue.serverTimestamp()
                        });

                    try {
                        const postToTwitter = firebase.functions().httpsCallable('postToTwitter');
                        const result = await postToTwitter({
                            projectId: currentProjectId,
                            contentId: contentId,
                            tweetText: tweetText
                        });

                        if (result.data.success) {
                            alert(`✅ Posted to X successfully!\n\nTweet URL: ${result.data.tweetUrl}`);
                        } else {
                            alert('❌ Failed to post to X.');
                        }
                    } catch (postError) {
                        console.error('[approveContent] Post error:', postError);

                        // Check for specific error types
                        const errorMessage = postError.message || '';

                        if (errorMessage.includes('credentials not configured') ||
                            errorMessage.includes('failed-precondition')) {
                            alert('❌ X (Twitter) API 자격 증명이 설정되지 않았습니다.\n\n' +
                                '설정 방법:\n' +
                                '1. Settings > Connections 메뉴로 이동\n' +
                                '2. X (Twitter) 채널 연결을 추가하세요');
                        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
                            alert('❌ X API 권한이 부족합니다.\n\n' +
                                'Twitter Developer Portal에서 앱 권한을 확인하세요:\n' +
                                '- Read and Write 권한이 필요합니다');
                        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                            alert('❌ X API 자격 증명이 유효하지 않습니다.\n\n' +
                                'API 키를 다시 확인해주세요.');
                        } else {
                            alert('❌ Error posting to X: ' + errorMessage);
                        }

                        // Revert status to pending
                        await firebase.firestore()
                            .collection('projects')
                            .doc(currentProjectId)
                            .collection('generatedContents')
                            .doc(contentId)
                            .update({
                                status: 'pending',
                                publish_error: errorMessage
                            });
                    }

                    if (selectedRunId) loadRunContentWithActions(selectedRunId);
                } catch (error) {
                    console.error('[approveContent] Error:', error);
                    alert('Error: ' + (error.message || 'Unknown error'));
                }
            }
        );
    };

    /**
     * Custom confirmation modal that doesn't disappear
     */
    function showConfirmModal(title, message, onConfirm) {
        const existing = document.getElementById('confirm-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10001; display: flex; align-items: center; justify-content: center;">
                <div style="background: #1a1d24; border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 28px; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    <h3 style="margin: 0 0 16px 0; color: #fff; font-size: 18px; font-weight: 600;">${title}</h3>
                    <p style="margin: 0 0 24px 0; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6;">${message}</p>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="confirm-modal-cancel" style="padding: 12px 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                            Cancel
                        </button>
                        <button id="confirm-modal-ok" style="padding: 12px 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; color: #fff; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                            ✓ Confirm
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('confirm-modal-cancel').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('confirm-modal-ok').addEventListener('click', () => {
            modal.remove();
            onConfirm();
        });
    }

    window.rejectContent = async function (contentId) {
        if (!confirm('Are you sure you want to reject this content?')) return;

        try {
            await firebase.firestore()
                .collection('projects')
                .doc(currentProjectId)
                .collection('generatedContents')
                .doc(contentId)
                .update({ status: 'rejected', rejected_at: firebase.firestore.FieldValue.serverTimestamp() });

            alert('❌ Content rejected');
            if (selectedRunId) loadRunContentWithActions(selectedRunId);
        } catch (error) {
            alert('Error rejecting content: ' + error.message);
        }
    };

    window.editContent = function (contentId) {
        alert('Edit modal coming soon! Content ID: ' + contentId);
    };

    window.viewOnPlatform = function (url) {
        if (url && url !== '#') {
            window.open(url, '_blank');
        } else {
            alert('Post URL not available yet.');
        }
    };

    console.log('[View History] Module loaded');
})();
