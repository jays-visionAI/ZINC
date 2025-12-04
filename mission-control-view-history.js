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
        console.log(`[View History] Selecting run: ${runId}`);
        selectedRunId = runId;

        // Reload Generated Content panel with run filter
        if (currentProjectId && selectedTeamId) {
            loadGeneratedContent(currentProjectId, selectedTeamId, runId);
        }
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
                     onclick="window.selectSubAgent('${agent.id}')" 
                     id="sa-card-${agent.id}">
                    <div class="sub-agent-header">
                        <div class="sub-agent-name">${agent.role_name || 'Unnamed'}</div>
                        <div class="sr-badge">${successRate.toFixed(0)}% SR</div>
                    </div>
                    <div class="sub-agent-role">${agent.role_type}</div>
                    <div class="sub-agent-meta" style="margin-top: 4px;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Last active ${lastActive}
                    </div>
                    <div class="sub-agent-meta" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: rgba(255,255,255,0.5);">
                        🤖 ${runtimeDisplay}
                    </div>
                </div>
            `;
        }).join('');

        // Update global selection handler
        window.selectSubAgent = function (subAgentId) {
            selectedSubAgentId = subAgentId;

            // Update UI selection
            document.querySelectorAll('.sub-agent-card').forEach(el => el.classList.remove('selected'));
            const card = document.getElementById(`sa-card-${subAgentId}`);
            if (card) card.classList.add('selected');

            // Note: In the original design, selecting a sub-agent would filter runs
            // For now, we keep showing all team runs
            console.log(`[View History] Selected sub-agent: ${subAgentId}`);
        };
    }

    // ===== Panel 2: Recent Runs (Center) =====

    function loadRecentRuns(projectId, teamId) {
        console.log('[View History] Loading Recent Runs...');

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

        // Query: projects/{projectId}/agentRuns
        // Where: team_instance_id == teamId
        // Order by: started_at DESC
        runsListener = db.collection('projects')
            .doc(projectId)
            .collection('agentRuns')
            .where('team_instance_id', '==', teamId)
            .orderBy('started_at', 'desc')
            .limit(20)
            .onSnapshot(
                (snapshot) => {
                    const runs = [];
                    snapshot.forEach(doc => {
                        runs.push({ id: doc.id, ...doc.data() });
                    });

                    console.log(`[View History] Loaded ${runs.length} runs`);
                    renderRuns(runs, container);
                },
                (error) => {
                    console.error('[View History] Error loading runs:', error);
                    container.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
                }
            );
    }

    function renderRuns(runs, container) {
        if (runs.length === 0) {
            container.innerHTML = '<div class="empty-state">No runs found</div>';
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
                     onclick="selectRun('${run.id}')">
                    <div class="run-header">
                        <div class="run-status ${statusClass}">${statusLabel}</div>
                        <div class="run-time">${timeAgo}</div>
                    </div>
                    <div class="run-content">
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
        console.log('[View History] Loading Generated Content...', { teamId, runId });

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

        // Build query
        let query = db.collection('projects')
            .doc(projectId)
            .collection('generatedContents');

        if (runId) {
            // Filter by specific run
            query = query.where('run_id', '==', runId);
        } else {
            // Filter by team
            query = query.where('team_instance_id', '==', teamId);
        }

        query = query.orderBy('created_at', 'desc').limit(20);

        // Execute query
        contentsListener = query.onSnapshot(
            (snapshot) => {
                const contents = [];
                snapshot.forEach(doc => {
                    contents.push({ id: doc.id, ...doc.data() });
                });

                console.log(`[View History] Loaded ${contents.length} contents`);
                renderContents(contents, container);
            },
            (error) => {
                console.error('[View History] Error loading contents:', error);
                container.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
            }
        );
    }

    function renderContents(contents, container) {
        if (contents.length === 0) {
            container.innerHTML = '<div class="empty-state">No content generated</div>';
            return;
        }

        container.innerHTML = contents.map(content => {
            const statusClass = getContentStatusClass(content.status);
            const statusLabel = getContentStatusLabel(content.status);
            const platformIcon = getPlatformIcon(content.platform);
            const hasExternalLink = !!content.external_post_url;

            // Phase 2: Workflow/Channel Info
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

            return `
                <div class="content-card ${statusClass}" data-id="${content.id}">
                    ${content.preview_image_url ? `
                        <div class="content-image">
                            <img src="${content.preview_image_url}" alt="${content.title || 'Content'}" />
                        </div>
                    ` : ''}
                    <div class="content-body">
                        <div class="content-header">
                            <div class="content-platform">${platformIcon} ${content.platform}</div>
                            <div class="content-status ${statusClass}">${statusLabel}</div>
                        </div>
                        ${content.title ? `<div class="content-title">${content.title}</div>` : ''}
                        ${content.preview_text ? `<div class="content-preview">${content.preview_text}</div>` : ''}
                        ${workflowBadge || stepBadge || channelBadge ?
                    `<div class="content-workflow-info">${workflowBadge} ${stepBadge} ${channelBadge}</div>` : ''}
                        <div class="content-footer">
                            ${hasExternalLink ? `
                                <button class="btn-view-external" onclick="window.open('${content.external_post_url}', '_blank')">
                                    View on ${content.platform}
                                </button>
                            ` : `
                                <span class="not-published">Not published yet</span>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
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

    console.log('[View History] Module loaded');
})();
