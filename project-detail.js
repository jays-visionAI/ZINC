// project-detail.js
// Mission Control Logic

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    let currentUser = null;

    if (!projectId) {
        alert("No project ID specified.");
        window.location.href = "command-center.html";
        return;
    }

    // PRD 11.2 - Channel API Field Definitions (Static Schema)
    const CHANNEL_API_FIELD_DEFS = {
        instagram: [
            { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "Meta Developer Long-Lived Access Token" },
            { key: "page_id", label: "Page ID", type: "text", required: true, helperText: "Facebook Page ID connected to Instagram" }
        ],
        youtube: [
            { key: "api_key", label: "API Key", type: "password", required: true, helperText: "Google Cloud API Key" },
            { key: "channel_id", label: "Channel ID", type: "text", required: true, helperText: "YouTube Channel ID" }
        ],
        tiktok: [
            { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "TikTok Developer Access Token" },
            { key: "client_key", label: "Client Key", type: "text", required: true, helperText: "TikTok App Client Key" }
        ],
        linkedin: [
            { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "LinkedIn OAuth2 Access Token" },
            { key: "urn", label: "Organization URN", type: "text", required: true, helperText: "LinkedIn Organization URN" }
        ],
        x: [
            { key: "api_key", label: "API Key", type: "password", required: true, helperText: "X (Twitter) API Key" },
            { key: "api_secret", label: "API Secret", type: "password", required: true, helperText: "X (Twitter) API Secret" },
            { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "X (Twitter) Access Token" },
            { key: "access_token_secret", label: "Access Token Secret", type: "password", required: true, helperText: "X (Twitter) Access Token Secret" }
        ],
        default: [
            { key: "api_key", label: "API Key", type: "password", required: true, helperText: "API Key for this channel" }
        ]
    };

    // Deployment Wizard State
    let deployStep = 1;
    let deployData = {
        channelId: '',
        channelName: '',
        templateId: '',
        templateName: '',
        roles: []
    };
    let channelProfiles = [];
    let teamTemplates = [];

    // Credential listener (for real-time updates)
    let credentialListener = null;

    // 🔹 Auth Check
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }
        currentUser = user;
        loadProjectData(projectId);

        // Setup real-time credential listener
        setupCredentialListener(user.uid);
    });

    async function loadProjectData(id) {
        try {
            const doc = await db.collection("projects").doc(id).get();
            if (!doc.exists) {
                alert("Project not found.");
                window.location.href = "command-center.html";
                return;
            }

            const project = doc.data();
            renderProjectInfo(project);

            // Load Agent Swarm (Active Deployments)
            loadAgentSwarm(id);

            // Load KPIs (using project data for now)
            renderKPIs(project);

            setupDeploymentListeners();

        } catch (error) {
            console.error("Error loading project:", error);
            alert("Error loading project data.");
        }
    }

    /**
     * Setup real-time listener for user credentials
     * Automatically refreshes agent cards when credentials are updated
     */
    function setupCredentialListener(userId) {
        // Clean up existing listener
        if (credentialListener) {
            credentialListener();
        }

        credentialListener = db.collection('userApiCredentials')
            .where('userId', '==', userId)
            .onSnapshot((snapshot) => {
                console.log('Credentials updated, refreshing agent cards...');

                // Reload agent swarm to reflect credential changes
                if (projectId) {
                    loadAgentSwarm(projectId);
                }
            }, (error) => {
                console.error('Error listening to credentials:', error);
            });
    }

    // Cleanup listener on page unload
    window.addEventListener('beforeunload', () => {
        if (credentialListener) {
            credentialListener();
        }
    });

    function renderProjectInfo(project) {
        document.getElementById("project-title").textContent = project.projectName || "Untitled Project";
        document.title = `ZYNK - ${project.projectName}`;
    }

    function renderKPIs(project) {
        document.getElementById("kpi-content").textContent = project.totalContentCreated || 0;
        document.getElementById("kpi-pending").textContent = project.pendingApprovals || 0;
        document.getElementById("kpi-engagement").textContent = `${project.engagementRate || 0}%`;
        document.getElementById("kpi-growth").textContent = `${project.followerGrowth30d || 0}%`;
    }

    async function loadAgentTeam(projectId, agentSetId) {
        try {
            // 1. Get Agent Set Info
            const setDoc = await db.collection(`projects/${projectId}/agentSets`).doc(agentSetId).get();
            if (setDoc.exists) {
                const setData = setDoc.data();
                document.getElementById("agent-team-name").textContent = setData.name;
                document.getElementById("team-status-badge").innerHTML = getStatusBadge(setData.status);
            }

            // 2. Get Sub-Agents
            const agentsSnapshot = await db.collection(`projects/${projectId}/subAgents`)
                .where("agent_set_id", "==", agentSetId)
                .get();

            const agents = [];
            agentsSnapshot.forEach(doc => agents.push({ id: doc.id, ...doc.data() }));

            renderAgentsTable(agents);

        } catch (error) {
            console.error("Error loading agent team:", error);
            document.getElementById("agent-team-name").textContent = "Error loading team";
        }
    }

    function renderNoTeamState() {
        document.getElementById("agent-team-name").textContent = "No Active Team";
        document.getElementById("agents-table-body").innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                    No active agents found. Please configure an agent team.
                </td>
            </tr>
        `;
    }

    function renderAgentsTable(agents) {
        const tbody = document.getElementById("agents-table-body");
        if (agents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        No agents in this team.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = agents.map(agent => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">${getRoleIcon(agent.type)}</span>
                        <div>
                            <div style="font-weight: 600; text-transform: capitalize;">${agent.type?.replace('_', ' ') || 'Unknown'}</div>
                            <div style="font-size: 11px; color: rgba(255,255,255,0.5);">v${agent.version}</div>
                        </div>
                    </div>
                </td>
                <td>${getStatusBadge(agent.status)}</td>
                <td>
                    <span style="color: rgba(255,255,255,0.7); font-size: 13px;">
                        ${agent.current_task || 'Idle'}
                    </span>
                </td>
                <td>${formatDate(agent.updated_at)}</td>
                <td>
                    <button class="admin-btn-secondary" style="padding: 4px 12px; font-size: 12px;" onclick="viewAgentLogs('${agent.id}')">
                        Logs
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function getRoleIcon(role) {
        const icons = {
            planner: '🎯',
            research: '🔍',
            creator_text: '✍️',
            creator_image: '🎨',
            creator_video: '🎬',
            compliance: '⚖️',
            engagement: '💬',
            evaluator: '📊',
            manager: '👔',
            kpi_engine: '📈'
        };
        return icons[role] || '🤖';
    }

    function getStatusBadge(status) {
        const badges = {
            active: '<span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✅ Active</span>',
            idle: '<span style="background: rgba(148, 163, 184, 0.2); color: #94a3b8; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">💤 Idle</span>',
            working: '<span style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">⚡ Working</span>',
            error: '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">⚠️ Error</span>'
        };
        return badges[status] || status;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
    }

    window.viewAgentLogs = function (agentId) {
        alert(`Logs for agent ${agentId} (Coming Soon)`);
    };

    // Manage Team Button (check if exists on this page)
    const manageTeamBtn = document.getElementById("btn-manage-team");
    if (manageTeamBtn) {
        manageTeamBtn.addEventListener("click", () => {
            alert("Team Management features coming in next update.");
        });
    }

    // --- Deployment Wizard Logic ---

    function setupDeploymentListeners() {
        const deployBtn = document.getElementById("btn-deploy-team");
        const modalClose = document.getElementById("deploy-modal-close");
        const modalCancel = document.getElementById("deploy-cancel");
        const nextBtn = document.getElementById("deploy-next");
        const prevBtn = document.getElementById("deploy-prev");

        if (deployBtn) deployBtn.addEventListener("click", openDeployWizard);
        if (modalClose) modalClose.addEventListener("click", closeDeployWizard);
        if (modalCancel) modalCancel.addEventListener("click", closeDeployWizard);

        if (nextBtn) nextBtn.addEventListener("click", handleDeployNext);
        if (prevBtn) prevBtn.addEventListener("click", handleDeployPrev);
    }

    window.openDeployWizard = function () {
        console.log('[DEBUG] openDeployWizard called');
        deployStep = 1;
        deployData = {
            teamName: '',
            description: '',
            templateId: '',
            templateName: '',
            roles: [],
            channels: [] // Array of { provider, credentialId, enabled }
        };

        const modal = document.getElementById("deploy-modal");
        if (!modal) return;

        modal.style.display = "flex";
        modal.classList.add('open');

        // Reset inputs
        document.getElementById("team-name").value = "";
        document.getElementById("team-description").value = "";

        updateDeployUI();
        loadDeployChannels();
    };

    function loadDeployChannels() {
        const selectElement = document.getElementById('deploy-channel-select');
        if (!selectElement) return;

        db.collection('channelProfiles')
            .get()
            .then(snapshot => {
                const channels = [];
                snapshot.forEach(doc => {
                    channels.push({ id: doc.id, ...doc.data() });
                });

                channels.sort((a, b) => a.name.localeCompare(b.name));

                selectElement.innerHTML = '<option value="">-- Select a channel --</option>';

                channels.forEach(channel => {
                    const slug = channel.slug || channel.channel_type;
                    const option = document.createElement('option');
                    option.value = JSON.stringify({ id: channel.id, name: channel.name, slug: slug, icon: channel.icon || '📺' });
                    option.textContent = `${channel.icon || '📺'} ${channel.name}`;
                    selectElement.appendChild(option);
                });

                selectElement.onchange = function () {
                    if (this.value) {
                        const channelData = JSON.parse(this.value);
                        deployData.targetChannel = channelData;
                    } else {
                        deployData.targetChannel = null;
                    }
                    updateDeployTeamNamePrefix();
                };
            })
            .catch(error => {
                console.error("Error loading channels:", error);
                selectElement.innerHTML = '<option value="">Error loading channels</option>';
            });
    }

    function updateDeployTeamNamePrefix() {
        const teamNameInput = document.getElementById('team-name');
        if (!teamNameInput) return;

        const currentValue = teamNameInput.value;
        const withoutPrefix = currentValue.replace(/^\[.*?\]\s*/, '');

        if (deployData.targetChannel && deployData.targetChannel.name) {
            teamNameInput.value = `[${deployData.targetChannel.name}] ${withoutPrefix}`.trim();
        } else {
            teamNameInput.value = withoutPrefix;
        }
    }

    window.updateDeployChannelCredential = function (key, value) {
        if (!deployData.channelCredentials) deployData.channelCredentials = {};
        deployData.channelCredentials[key] = value;
    };

    window.closeDeployWizard = function () {
        const modal = document.getElementById("deploy-modal");
        if (modal) {
            modal.style.display = "none";
            modal.classList.remove('open');
        }
    }

    function updateDeployUI() {
        document.getElementById("deploy-step-num").textContent = deployStep;
        const titles = {
            1: "Basic Info",
            2: "Select Template",
            3: "Runtime Summary",
            4: "Channels & Credentials"
        };
        document.getElementById("deploy-step-title").textContent = titles[deployStep];

        const progress = (deployStep / 4) * 100;
        document.getElementById("deploy-progress").style.width = `${progress}%`;

        // Hide all steps
        for (let i = 1; i <= 4; i++) {
            const stepEl = document.getElementById(`deploy-step-${i}`);
            if (stepEl) stepEl.style.display = "none";
        }

        // Show current step
        const currentStepEl = document.getElementById(`deploy-step-${deployStep}`);
        if (currentStepEl) currentStepEl.style.display = "block";

        // Buttons
        document.getElementById("deploy-prev").style.visibility = deployStep === 1 ? "hidden" : "visible";
        const nextBtn = document.getElementById("deploy-next");

        if (deployStep === 4) {
            nextBtn.textContent = "Create Agent Team";
            nextBtn.classList.add("btn-success"); // Optional styling

            // Update channel info
            if (deployData.targetChannel) {
                document.getElementById('deploy-selected-channel-icon').textContent = deployData.targetChannel.icon || '📺';
                document.getElementById('deploy-selected-channel-title').textContent = `${deployData.targetChannel.name} API Settings`;
                document.getElementById('deploy-selected-channel-name').textContent = `Channel: ${deployData.targetChannel.slug}`;
            }

            // Render API Fields
            const apiForm = document.getElementById('deploy-channel-api-form');
            if (deployData.targetChannel) {
                const slug = deployData.targetChannel.slug;
                const fieldDefs = CHANNEL_API_FIELD_DEFS[slug] || CHANNEL_API_FIELD_DEFS['default'];

                apiForm.innerHTML = fieldDefs.map(def => {
                    const value = deployData.channelCredentials?.[def.key] || '';
                    return `
                        <div class="admin-form-group">
                            <label class="admin-form-label">${def.label} ${def.required ? '<span style="color: #ef4444;">*</span>' : ''}</label>
                            <input type="${def.type}" class="admin-form-input" 
                                value="${value}"
                                onchange="window.updateDeployChannelCredential('${def.key}', this.value)"
                                placeholder="${def.helperText}"
                            >
                            <small style="color: rgba(255,255,255,0.5);">${def.helperText}</small>
                        </div>
                        `;
                }).join('');
            }
        } else {
            nextBtn.textContent = "Next Step";
            nextBtn.classList.remove("btn-success");
        }

        // Load data for specific steps
        if (deployStep === 2) {
            loadTeamTemplates();
        } else if (deployStep === 4) {
            // If we are on step 4 and targetChannel is not set, reset button
            if (!deployData.targetChannel) {
                nextBtn.textContent = "Next Step";
                nextBtn.classList.remove("btn-success");
            }
        }
    }

    async function loadChannels() {
        const grid = document.getElementById("channel-selection-grid");
        grid.innerHTML = '<div style="text-align: center; padding: 20px;">Loading Channels...</div>';

        try {
            console.log('[DEBUG] Loading channels for projectId:', projectId);

            // 1. Get all active channels
            const snapshot = await db.collection("channelProfiles").where("status", "==", "active").get();
            let allChannels = [];
            snapshot.forEach(doc => allChannels.push({ id: doc.id, ...doc.data() }));

            // [MOCK DATA REMOVED] - We only use real data from channelProfiles
            // If no channels are found, auto-generate them
            if (allChannels.length === 0) {
                console.log('[DEBUG] No channels in DB. Auto-generating channel profiles...');
                await window.generateChannelProfiles();
                // Reload channels after generation
                const retrySnapshot = await db.collection("channelProfiles").where("status", "==", "active").get();
                retrySnapshot.forEach(doc => allChannels.push({ id: doc.id, ...doc.data() }));
            }

            console.log('[DEBUG] All active channels found:', allChannels.length, allChannels);

            // 2. Get already deployed channels for this project
            const deployedSnapshot = await db.collection("projectAgentTeamInstances")
                .where("projectId", "==", projectId)
                .where("status", "==", "active")
                .get();

            const deployedChannelIds = new Set();
            const deployedPlatforms = new Set(); // Track platforms for demo mode filtering

            deployedSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.channelId) deployedChannelIds.add(data.channelId);
                if (data.platform) deployedPlatforms.add(data.platform);
            });
            console.log('[DEBUG] Already deployed channelIds:', Array.from(deployedChannelIds));

            // 3. Filter out already deployed channels
            // If no real instances exist, we are in "Demo Mode" showing placeholders for X and LinkedIn
            // So we should filter out X and LinkedIn from the available options
            if (deployedSnapshot.empty) {
                console.log('[DEBUG] No real instances found. Filtering out demo placeholders (X, LinkedIn)');
                channelProfiles = allChannels.filter(channel =>
                    channel.platform !== 'x' && channel.platform !== 'linkedin'
                );
            } else {
                // [MODIFIED] We allow multiple teams per channel, so we DO NOT filter out deployed channels.
                // channelProfiles = allChannels.filter(channel => !deployedChannelIds.has(channel.id));
                channelProfiles = allChannels;
            }

            console.log('[DEBUG] Available channels after filtering:', channelProfiles.length, channelProfiles);

            if (channelProfiles.length === 0) {
                if (deployedChannelIds.size > 0 || deployedSnapshot.empty) {
                    grid.innerHTML = '<div style="text-align: center; padding: 20px;">All available channels already have agent teams deployed.</div>';
                } else {
                    grid.innerHTML = '<div style="text-align: center; padding: 20px;">No active channels found.</div>';
                }
                return;
            }

            grid.innerHTML = channelProfiles.map(channel => `
                <div class="channel-card-select ${deployData.channelId === channel.id ? 'selected' : ''}" 
                     onclick="selectChannel('${channel.id}', '${channel.name}')"
                     style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 8px;">${getChannelIcon(channel.platform)}</div>
                    <div style="font-weight: 600;">${channel.name}</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 4px;">${channel.name} Team</div>
                </div>
            `).join('');

            // Add style for selection
            if (!document.getElementById('channel-select-style')) {
                const style = document.createElement('style');
                style.id = 'channel-select-style';
                style.innerHTML = `.channel-card-select.selected { border-color: #16e0bd !important; background: rgba(22, 224, 189, 0.1) !important; }`;
                document.head.appendChild(style);
            }

        } catch (error) {
            console.error("Error loading channels:", error);
            grid.innerHTML = '<div style="text-align: center; color: #ef4444;">Error loading channels.</div>';
        }
    }

    window.selectChannel = function (id, name) {
        deployData.channelId = id;
        deployData.channelName = name;
        loadChannels(); // Re-render to show selection
    };

    async function loadTeamTemplates() {
        const grid = document.getElementById("template-selection-grid");
        grid.innerHTML = '<div style="text-align: center; padding: 20px;">Loading Templates...</div>';

        try {
            const snapshot = await db.collection("agentSetTemplates").get();
            teamTemplates = [];
            snapshot.forEach(doc => teamTemplates.push({ id: doc.id, ...doc.data() }));

            if (teamTemplates.length === 0) {
                grid.innerHTML = '<div style="text-align: center; padding: 20px;">No active templates found.</div>';
                return;
            }

            grid.innerHTML = teamTemplates.map(tpl => {
                // Get role icons
                const roleIcons = (tpl.roles || []).map(role => getRoleIcon(role.type)).join(' ');
                const description = tpl.description || 'No description available';

                return `
                <div class="template-card-select ${deployData.templateId === tpl.id ? 'selected' : ''}" 
                     onclick="selectTemplate('${tpl.id}', '${tpl.name}')"
                     style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;">
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #fff;">${tpl.name}</div>
                    <div style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 12px; line-height: 1.4;">${description}</div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <div style="font-size: 20px; display: flex; gap: 6px;">${roleIcons}</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${tpl.roles ? tpl.roles.length : 0} Roles</div>
                    </div>
                </div>
            `}).join('');

            // Add style for selection
            if (!document.getElementById('template-select-style')) {
                const style = document.createElement('style');
                style.id = 'template-select-style';
                style.innerHTML = `.template-card-select.selected { border-color: #16e0bd !important; background: rgba(22, 224, 189, 0.1) !important; }`;
                document.head.appendChild(style);
            }

        } catch (error) {
            console.error("Error loading templates:", error);
            grid.innerHTML = '<div style="text-align: center; color: #ef4444;">Error loading templates.</div>';
        }
    }

    window.selectTemplate = function (id, name) {
        deployData.templateId = id;
        deployData.templateName = name;

        const tpl = teamTemplates.find(t => t.id === id);
        if (tpl) {
            deployData.roles = tpl.roles || [];
        }

        loadTeamTemplates(); // Re-render
    };

    async function handleDeployNext() {
        if (deployStep === 1) {
            // Validate Step 1
            if (!deployData.targetChannel) {
                alert("Please select a target channel.");
                return;
            }

            let teamName = document.getElementById("team-name").value.trim();
            // If team name is empty or only has the prefix, use default name
            if (!teamName || teamName === `[${deployData.targetChannel.name}]`) {
                teamName = `[${deployData.targetChannel.name}] Team`;
            }

            // Ensure the team name has the channel prefix
            if (!teamName.startsWith(`[${deployData.targetChannel.name}]`)) {
                teamName = `[${deployData.targetChannel.name}] ${teamName}`;
            }

            deployData.teamName = teamName;
            deployData.description = document.getElementById("team-description").value;

            deployStep++;
            updateDeployUI();
            return;
        } else if (deployStep === 2) {
            if (!deployData.templateId) { alert("Please select a template."); return; }
            deployStep++;
            await renderDeployStep3(); // Await async function
        } else if (deployStep === 3) {
            deployStep++;
            // Step 4 UI is handled by updateDeployUI()
        } else if (deployStep === 4) {
            await deployTeam(); // Also await this
            return; // Don't call updateDeployUI after team creation
        }
        updateDeployUI();
    }

    function handleDeployPrev() {
        if (deployStep > 1) {
            deployStep--;
            if (deployStep === 4) {
                // Update channel info
                if (deployData.targetChannel) {
                    document.getElementById('deploy-selected-channel-icon').textContent = deployData.targetChannel.icon || '📺';
                    document.getElementById('deploy-selected-channel-title').textContent = `${deployData.targetChannel.name} API Settings`;
                    document.getElementById('deploy-selected-channel-name').textContent = `Channel: ${deployData.targetChannel.slug}`;
                }

                // Render API Fields
                const apiForm = document.getElementById('deploy-channel-api-form');
                if (deployData.targetChannel) {
                    const slug = deployData.targetChannel.slug;
                    const fieldDefs = CHANNEL_API_FIELD_DEFS[slug] || CHANNEL_API_FIELD_DEFS['default'];

                    apiForm.innerHTML = fieldDefs.map(def => {
                        const value = deployData.channelCredentials?.[def.key] || '';
                        return `
                            <div class="admin-form-group">
                                <label class="admin-form-label">${def.label} ${def.required ? '<span style="color: #ef4444;">*</span>' : ''}</label>
                                <input type="${def.type}" class="admin-form-input" 
                                    value="${value}"
                                    onchange="window.updateDeployChannelCredential('${def.key}', this.value)"
                                    placeholder="${def.helperText}"
                                >
                                <small style="color: rgba(255,255,255,0.5);">${def.helperText}</small>
                            </div>
                            `;
                    }).join('');
                }
            }
            updateDeployUI();
        }
    }

    async function renderDeployStep3() {
        const container = document.getElementById("runtime-summary-container");
        container.innerHTML = `
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 12px 0; color: #16e0bd;">Team Summary</h4>
                <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; font-size: 14px;">
                    <div style="color: rgba(255,255,255,0.5);">Team Name:</div>
                    <div style="font-weight: 600;">${deployData.teamName}</div>

                    <div style="color: rgba(255,255,255,0.5);">Template:</div>
                    <div style="font-weight: 600;">${deployData.templateName}</div>
                </div>
            </div>

            <h4 style="margin: 0 0 12px 0;">Runtime Configuration (Read-only)</h4>
            <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 16px; padding: 12px; background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 6px;">
                ℹ️ Runtime settings are automatically optimized for your current plan.<br>
                Advanced customization (Tier, Language) will be available in premium plans.
            </div>
            <div id="runtime-configs-list" style="display: flex; flex-direction: column; gap: 8px;">
                <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">
                    Resolving runtime configurations...
                </div>
            </div>
        `;

        // Resolve runtime configs for each role
        try {
            const runtimeConfigs = [];

            for (const role of deployData.roles) {
                const roleType = role.type || role.role_type || 'planner';
                const runtimeConfig = await RuntimeResolver.resolveRuntimeConfig({
                    role_type: roleType,
                    language: 'global',
                    tier: 'balanced'
                });

                runtimeConfigs.push({
                    role: role,
                    runtime: runtimeConfig
                });
            }

            // Store resolved configs in deployData for later use
            deployData.resolvedRuntimes = runtimeConfigs;

            // Render runtime configs
            const configsList = document.getElementById('runtime-configs-list');
            if (configsList) {
                configsList.innerHTML = runtimeConfigs.map(({ role, runtime }) => `
                    <div style="padding: 16px; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
                            <div>
                                <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${role.name || role.role}</div>
                                <div style="font-size: 12px; color: rgba(255,255,255,0.5);">Engine: ${role.type || 'N/A'}</div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 12px;">
                                <div>
                                    <div style="color: rgba(255,255,255,0.5); margin-bottom: 2px;">Provider / Model</div>
                                    <div style="font-weight: 500;">${runtime.provider} / ${runtime.model_id}</div>
                                </div>
                                <div>
                                    <div style="color: rgba(255,255,255,0.5); margin-bottom: 2px;">Tier / Language</div>
                                    <div style="font-weight: 500;">${RuntimeResolver.getTierLabel(runtime.tier)} / ${RuntimeResolver.getLanguageLabel(runtime.language)}</div>
                                </div>
                                <div>
                                    <div style="color: rgba(255,255,255,0.5); margin-bottom: 2px;">Max Tokens</div>
                                    <div style="font-weight: 500;">${runtime.max_tokens}</div>
                                </div>
                                <div>
                                    <div style="color: rgba(255,255,255,0.5); margin-bottom: 2px;">Temperature</div>
                                    <div style="font-weight: 500;">${runtime.temperature}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

        } catch (error) {
            console.error('[Deploy Wizard] Error resolving runtime configs:', error);
            const configsList = document.getElementById('runtime-configs-list');
            if (configsList) {
                configsList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #ef4444;">
                        Error loading runtime configurations. Please try again.
                    </div>
                `;
            }
        }
    }

    async function renderDeployStep4() {
        const container = document.getElementById("channel-config-list");
        container.innerHTML = '<div style="text-align: center; padding: 20px;">Loading Channels...</div>';

        try {
            // 1. Load Available Channels from channelProfiles
            const channels = await ChannelProfilesUtils.loadAvailableChannels();

            if (channels.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); padding: 40px;">No active channels found. Please contact admin.</div>';
                return;
            }

            // Store channels in deployData for later use
            deployData.availableChannels = channels;

            // 2. Load User Credentials
            const credsSnapshot = await db.collection("userApiCredentials")
                .where("userId", "==", currentUser.uid)
                .where("status", "==", "active")
                .get();

            const credentials = [];
            credsSnapshot.forEach(doc => credentials.push({ id: doc.id, ...doc.data() }));

            // 3. Render UI dynamically based on channelProfiles
            container.innerHTML = channels.map(ch => {
                // Match credentials by provider (using 'key' field from channelProfiles)
                const channelKey = ch.key || ch.id;
                const chCreds = credentials.filter(c => c.provider === channelKey);
                const options = chCreds.map(c => `<option value="${c.id}">${c.label} (${c.maskedKey})</option>`).join('');

                // Get icon (use emoji from channelProfiles or fallback)
                const icon = getChannelIconById(channelKey);

                return `
                <div class="channel-config-item" style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <input type="checkbox" id="ch-enable-${ch.id}" class="admin-checkbox" 
                               data-channel-key="${channelKey}"
                               onchange="toggleChannelConfig('${ch.id}')">
                        <div style="font-size: 20px;">${icon}</div>
                        <div style="font-weight: 600;">${ch.name || channelKey}</div>
                    </div>
                    
                    <div id="ch-config-${ch.id}" style="display: none; padding-left: 28px;">
                        <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 4px;">Select API Credential</div>
                        <div style="display: flex; gap: 8px;">
                            <select id="ch-cred-${ch.id}" class="admin-form-input" style="flex: 1;">
                                <option value="">-- Select Credential --</option>
                                ${options}
                            </select>
                            <button class="admin-btn-secondary" onclick="window.open('user-settings.html', '_blank')">Manage Keys</button>
                        </div>
                        ${chCreds.length === 0 ? '<div style="font-size: 11px; color: #ef4444; margin-top: 4px;">No credentials found. Please add one in Settings.</div>' : ''}
                    </div>
                </div>
            `}).join('');

            // Helper to toggle visibility
            window.toggleChannelConfig = function (chId) {
                const isChecked = document.getElementById(`ch-enable-${chId}`).checked;
                document.getElementById(`ch-config-${chId}`).style.display = isChecked ? "block" : "none";
            };

        } catch (error) {
            console.error("Error loading Step 4:", error);
            container.innerHTML = '<div style="text-align: center; color: #ef4444;">Error loading channels. Please try again.</div>';
        }
    }

    async function deployTeam() {
        const btn = document.getElementById("deploy-next");

        // Collect Channel Config from dynamically loaded channels
        const selectedChannels = [];
        const targetChannelIds = [];
        const targetChannelKeys = [];
        const channelBindings = {};

        // Use the target channel selected in Step 1
        if (deployData.targetChannel) {
            const ch = deployData.targetChannel;
            const channelKey = ch.slug || ch.channel_type || ch.id;

            // Capture selected credential ID from DOM
            const credSelect = document.getElementById(`ch-cred-${ch.id}`);
            const selectedCredId = credSelect ? credSelect.value : null;

            // Construct channel object
            const channelObj = {
                provider: channelKey,
                credentialId: selectedCredId, // Phase 2: Link to userApiCredentials
                enabled: true,
                updatedAt: firebase.firestore.Timestamp.now(),
                lastErrorMessage: null,
                config: deployData.channelCredentials || {}
            };

            // Compute status
            channelObj.status = selectedCredId ? 'ready' : 'missing_key';

            selectedChannels.push(channelObj);
            targetChannelIds.push(ch.id);
            targetChannelKeys.push(channelKey);

            if (selectedCredId) {
                channelBindings[channelKey] = selectedCredId;
            }
        }

        const hasApiKeys = Object.keys(channelBindings).length > 0;

        if (!hasApiKeys) {
            if (!confirm("Are you sure you want to create the agent team instance without configuring any API keys?")) return;
        }

        try {
            btn.disabled = true;
            btn.textContent = "Creating Team...";

            // 1. Create projectAgentTeamInstance
            const instanceId = `team_${Date.now()}`;
            const instanceData = {
                id: instanceId,
                projectId: projectId,
                templateId: deployData.templateId,
                name: deployData.teamName,
                description: deployData.description,
                status: 'active',

                // PRD 12.0 Phase 2: Channel Bindings
                channelBindings: channelBindings,

                // PRD 11.0 Phase 2: Channels Array
                channels: selectedChannels,

                // PRD 11.0 Phase 3: Target Channels (channelProfiles references)
                targetChannels: targetChannelIds,
                targetChannelKeys: targetChannelKeys,

                // Legacy Compatibility
                channelId: selectedChannels.length > 0 ? selectedChannels[0].provider : 'none',
                platform: selectedChannels.length > 0 ? selectedChannels[0].provider : 'none',

                deployedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deployedBy: currentUser.uid,

                // PRD 5.0 Metadata
                configProfileId: 'default',
                engineVersionSet: 'v1.0.0',
                channel: 'stable',
                ruleProfileId: null
            };

            await db.collection("projectAgentTeamInstances").doc(instanceId).set(instanceData);

            // 2. Create Sub-Agent Instances
            const templateIds = deployData.roles.map(r => r.defaultTemplateId).filter(id => id);
            const templateMap = {};

            if (templateIds.length > 0) {
                try {
                    // Chunk queries if > 10 items (omitted for brevity as roles usually < 10)
                    const templatesSnap = await db.collection('subAgentTemplates')
                        .where(firebase.firestore.FieldPath.documentId(), 'in', templateIds)
                        .get();
                    templatesSnap.forEach(doc => {
                        templateMap[doc.id] = doc.data();
                    });
                } catch (err) {
                    console.error("Error fetching templates:", err);
                }
            }

            const batch = db.batch();

            deployData.roles.forEach((role, index) => {
                const agentId = `agent_${instanceId}_${index}`;
                const agentRef = db.collection('projectAgentTeamInstances').doc(instanceId).collection('subAgents').doc(agentId);

                const templateId = role.defaultTemplateId || 'tpl_default';
                const template = templateMap[templateId] || {};
                const runtimeProfileId = template.runtime_profile_id || null;

                // Get resolved runtime config from Step 3
                const resolvedRuntime = deployData.resolvedRuntimes?.find(r => r.role === role);
                const runtimeBase = resolvedRuntime?.runtime || null;

                batch.set(agentRef, {
                    id: agentId,
                    project_id: projectId,
                    team_instance_id: instanceId,
                    role_name: role.name,
                    role_type: role.type,
                    template_id: templateId,
                    runtime_profile_id: runtimeProfileId, // Legacy field
                    display_order: index,
                    status: 'active',

                    // Phase 3: Runtime Configuration Snapshots
                    runtime_base: runtimeBase,
                    runtime_override: null, // Reserved for future premium plan customization
                    effective_runtime: runtimeBase, // Currently same as runtime_base

                    metrics: {
                        success_rate: 100,
                        total_runs: 0,
                        daily_actions_completed: 0,
                        daily_actions_quota: 10,
                        last_active_at: null
                    },
                    version: '1.0.0',
                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();

            alert("✅ Agent Team Created Successfully!");
            closeDeployWizard();
            loadAgentSwarm(projectId);

        } catch (error) {
            console.error("Error creating team:", error);
            alert(`Creation failed: ${error.message}`);
        } finally {
            btn.disabled = false;
        }
    }

    async function loadAgentSwarm(projectId) {
        const grid = document.getElementById("agent-swarm-grid");
        if (!grid) return;

        try {
            const snapshot = await db.collection("projectAgentTeamInstances")
                .where("projectId", "==", projectId)
                .where("status", "==", "active")
                .get();

            const instances = [];
            snapshot.forEach(doc => instances.push({ id: doc.id, ...doc.data() }));

            let html = '';

            // Render Instances with Runtime Context
            if (instances.length > 0) {
                // Use batch prepare for performance
                const instanceIds = instances.map(inst => inst.id);
                const contextMap = await AgentRuntimeService.batchPrepareContexts(
                    instanceIds,
                    currentUser.uid
                );

                html += instances.map(inst => {
                    const context = contextMap.get(inst.id);
                    return renderAgentCard(inst, context);
                }).join('');
            } else {
                // Render Dummy/Placeholder Cards if no instances
                html += renderPlaceholderCard('x', 'Vanguard (X)', 'Trend Setter', 'active');
                html += renderPlaceholderCard('linkedin', 'Strategist (LI)', 'Thought Leader', 'cooldown');
            }

            // Add "Deploy New Agent" Card
            html += `
                <div class="add-agent-card" onclick="openDeployWizard()">
                    <div class="add-icon-circle">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </div>
                    <div class="add-text">Deploy New Agent</div>
                </div>
            `;

            grid.innerHTML = html;

        } catch (error) {
            console.error("Error loading agent swarm:", error);
            grid.innerHTML = '<div style="text-align: center; color: #ef4444;">Error loading agent swarm.</div>';
        }
    }

    function renderAgentCard(inst, runtimeContext) {
        // 1. Normalize Channels
        const channels = ChannelOrchestrator.normalizeAgentTeamChannels(inst);

        // 2. Get primary channel for display
        const primaryChannel = channels.find(ch => ch.enabled) || { provider: 'unknown', status: 'missing_key' };
        const channelIcon = getChannelIconById(primaryChannel.provider);
        const channelType = primaryChannel.provider || 'unknown';

        // 3. Status mapping
        const statusMap = {
            'active': 'ACTIVE',
            'paused': 'PAUSED',
            'cooldown': 'COOLDOWN',
            'error': 'NEEDS SETUP'
        };
        const displayStatus = statusMap[inst.status] || inst.status.toUpperCase();

        // 4. Status class for styling
        let statusClass = 'agent-card--active';
        if (inst.status === 'cooldown') statusClass = 'agent-card--cooldown';
        if (inst.status === 'error' || inst.status === 'paused') statusClass = 'agent-card--needs-setup';

        // 5. Extract metrics with fallbacks
        const dailyActionsCurrent = inst.metrics?.daily_actions_completed || inst.metrics?.dailyActions?.current || 0;
        const dailyActionsQuota = inst.metrics?.daily_actions_quota || inst.metrics?.dailyActions?.quota || 15;
        const totalRunsCurrent = inst.metrics?.total_runs || inst.metrics?.totalRuns?.current || 0;
        const totalRunsQuota = inst.metrics?.totalRuns?.quota || null;

        // 6. Calculate progress percentages
        function getProgress(current, quota) {
            if (!quota || quota <= 0) return 0;
            const ratio = current / quota;
            return Math.max(0, Math.min(100, ratio * 100));
        }

        const dailyProgress = getProgress(dailyActionsCurrent, dailyActionsQuota);
        const totalRunsProgress = totalRunsQuota ? getProgress(totalRunsCurrent, totalRunsQuota) : 0;

        // 7. Format display values
        const dailyActionsDisplay = `${dailyActionsCurrent}/${dailyActionsQuota}`;
        const totalRunsDisplay = totalRunsQuota ? `${totalRunsCurrent}/${totalRunsQuota}` : `${totalRunsCurrent}`;

        // 8. Active Directive
        const activeDirective = inst.active_directive?.summary ||
            inst.activeDirective ||
            'System initialized. Waiting for task assignment.';

        // 9. Alert icon using Runtime Context
        const isReady = runtimeContext?.isReady || false;
        const hasAlert = !isReady || inst.status === 'error';

        // Build detailed alert message
        let alertMessage = 'All systems operational';
        if (!isReady && runtimeContext?.errors) {
            const errorMessages = runtimeContext.errors.map(err => {
                const providerName = err.provider ? err.provider.toUpperCase() : 'Unknown';
                return `${providerName}: ${err.error}`;
            });
            alertMessage = errorMessages.join('\n');
        } else if (inst.status === 'error') {
            alertMessage = 'Agent team error - check configuration';
        }

        // Icon and styling
        const alertIcon = hasAlert
            ? `<span class="agent-card__alert-icon agent-card__alert-icon--error" title="${alertMessage}">!</span>`
            : `<span class="agent-card__alert-icon agent-card__alert-icon--success" title="${alertMessage}">✓</span>`;

        return `
            <div class="agent-card ${statusClass}" data-team-id="${inst.id}" onclick="handleCardClick(event, '${inst.id}')">
                <div class="agent-card__header">
                    <div class="agent-card__channel">
                        <span class="agent-card__channel-icon">${channelIcon}</span>
                        <span class="agent-card__title">${inst.name}</span>
                    </div>
                    
                    <div class="agent-card__status-area">
                        ${alertIcon}
                        <span class="agent-card__status-pill agent-card__status-pill--${inst.status}">${displayStatus}</span>
                        <button class="agent-card__delete-btn" onclick="handleDeleteTeam(event, '${inst.id}')" aria-label="Delete team" title="Delete this agent team">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="agent-card__role">${inst.description || 'Autonomous Agent Team'}</div>
                
                <div class="agent-card__directive">
                    <div class="agent-card__directive-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        Active Directive:
                    </div>
                    <div class="agent-card__directive-body">${activeDirective}</div>
                </div>
                
                <div class="agent-card__metrics">
                    <!-- Daily Actions -->
                    <div class="agent-card__metric-row">
                        <div class="agent-card__metric-label">Daily Actions</div>
                        <div class="agent-card__metric-progress">
                            <div class="agent-card__metric-progress-bar agent-card__metric-progress-bar--daily">
                                <div class="agent-card__metric-progress-fill agent-card__metric-progress-fill--daily" style="width: ${dailyProgress}%"></div>
                            </div>
                            <div class="agent-card__metric-value">${dailyActionsDisplay}</div>
                        </div>
                    </div>
                    
                    <!-- Total Runs -->
                    <div class="agent-card__metric-row">
                        <div class="agent-card__metric-label">Total Runs</div>
                        <div class="agent-card__metric-progress">
                            <div class="agent-card__metric-progress-bar agent-card__metric-progress-bar--runs">
                                <div class="agent-card__metric-progress-fill agent-card__metric-progress-fill--runs" style="width: ${totalRunsProgress}%"></div>
                            </div>
                            <div class="agent-card__metric-value">${totalRunsDisplay}</div>
                        </div>
                    </div>
                </div>
                
                <div class="agent-card__footer">
                    <button class="agent-card__history-btn" onclick="handleViewHistory(event, '${inst.id}')">View History</button>
                    <button class="agent-card__settings-btn" onclick="handleOpenSettings(event, '${inst.id}')" aria-label="Open settings" title="Team settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    function renderPlaceholderCard(platform, name, role, status) {
        const isCooldown = status === 'cooldown';
        const channelIcon = getChannelIcon(platform);

        // Status mapping
        const statusMap = {
            'active': 'ACTIVE',
            'cooldown': 'COOLDOWN',
            'paused': 'PAUSED'
        };
        const displayStatus = statusMap[status] || status.toUpperCase();

        // Status class
        let statusClass = 'agent-card--active';
        if (status === 'cooldown') statusClass = 'agent-card--cooldown';

        // Metrics
        const dailyActionsCurrent = isCooldown ? 5 : 13;
        const dailyActionsQuota = isCooldown ? 5 : 15;
        const totalRunsCurrent = isCooldown ? 128 : 97;

        const dailyProgress = (dailyActionsCurrent / dailyActionsQuota) * 100;
        const dailyActionsDisplay = `${dailyActionsCurrent}/${dailyActionsQuota}`;
        const totalRunsDisplay = `${totalRunsCurrent}`;

        const activeDirective = isCooldown ?
            "Cooldown complete. Resuming autonomous operations." :
            "Cross-referencing market data with brand matrix...";

        return `
            <div class="agent-card ${statusClass}" style="opacity: 0.8;" data-team-id="demo-${platform}">
                <div class="agent-card__header">
                    <div class="agent-card__channel">
                        <span class="agent-card__channel-icon">${channelIcon}</span>
                        <span class="agent-card__title">${name}</span>
                    </div>
                    
                    <div class="agent-card__status-area">
                        <span class="agent-card__status-pill agent-card__status-pill--${status}">${displayStatus}</span>
                    </div>
                </div>
                
                <div class="agent-card__role">${role}</div>
                
                <div class="agent-card__directive">
                    <div class="agent-card__directive-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        Active Directive:
                    </div>
                    <div class="agent-card__directive-body">${activeDirective}</div>
                </div>
                
                <div class="agent-card__metrics">
                    <!-- Daily Actions -->
                    <div class="agent-card__metric-row">
                        <div class="agent-card__metric-label">Daily Actions</div>
                        <div class="agent-card__metric-progress">
                            <div class="agent-card__metric-progress-bar agent-card__metric-progress-bar--daily">
                                <div class="agent-card__metric-progress-fill agent-card__metric-progress-fill--daily" style="width: ${dailyProgress}%"></div>
                            </div>
                            <div class="agent-card__metric-value">${dailyActionsDisplay}</div>
                        </div>
                    </div>
                    
                    <!-- Total Runs -->
                    <div class="agent-card__metric-row">
                        <div class="agent-card__metric-label">Total Runs</div>
                        <div class="agent-card__metric-progress">
                            <div class="agent-card__metric-progress-bar agent-card__metric-progress-bar--runs">
                                <div class="agent-card__metric-progress-fill agent-card__metric-progress-fill--runs" style="width: 0%"></div>
                            </div>
                            <div class="agent-card__metric-value">${totalRunsDisplay}</div>
                        </div>
                    </div>
                </div>
                
                <div class="agent-card__footer">
                    <button class="agent-card__history-btn" onclick="alert('This is a demo agent.')">View History</button>
                    <button class="agent-card__settings-btn" onclick="alert('This is a demo agent.')" aria-label="Open settings" title="Team settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    function getChannelIcon(platform) {
        // Map platform to icon
        const icons = {
            instagram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
            x: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>',
            twitter: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>',
            youtube: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>',
            linkedin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>',
            medium: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6.5" cy="12" r="5.5"></circle><ellipse cx="17.5" cy="12" rx="3.5" ry="5.5"></ellipse><ellipse cx="23" cy="12" rx="1" ry="5.5"></ellipse></svg>',
            discord: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="1"></circle><circle cx="15" cy="12" r="1"></circle><path d="M7.5 7.5c3.5-1 5.5-1 9 0 1.5 5.5 1.5 10 0 15.5-3.5 1-5.5 1-9 0-1.5-5.5-1.5-10 0-15.5z"></path></svg>',
            facebook: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>',
            pinterest: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"></path><path d="M12 2a10 10 0 0 0-3.5 19.4C9 20 9 19 9 18c0-1 0-3 0-4 0-3-2-5-2-5s1-1 3-1 3 2 3 5c0 3-2 5-4 5-1 0-2-1-2-2 0-2 1-4 2-5 1-1 1-2 0-2-2 0-3 2-3 5 0 2 1 4 2 5"></path></svg>', // Approximate
            reddit: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M17 13c0 2-2 3-5 3s-5-1-5-3"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
            snapchat: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c-4 0-6 3-6 6 0 2 1 3 1 4 0 2-2 3-2 5 0 2 3 4 7 4s7-2 7-4c0-2-2-3-2-5 0-1 1-2 1-4 0-3-2-6-6-6z"></path></svg>', // Approximate
            telegram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
            threads: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10zm0 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"></path></svg>', // Approximate
            tiktok: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>'
        };

        // Normalize platform string
        const key = platform?.toLowerCase().replace(/\s+/g, '');

        // Try exact match, then loose match
        if (icons[key]) return icons[key];

        // Handle variations
        if (key.includes('twitter')) return icons['x'];
        if (key.includes('facebook')) return icons['facebook'];
        if (key.includes('insta')) return icons['instagram'];
        if (key.includes('linked')) return icons['linkedin'];
        if (key.includes('tube')) return icons['youtube'];
        if (key.includes('tok')) return icons['tiktok'];
        if (key.includes('snap')) return icons['snapchat'];
        if (key.includes('tele')) return icons['telegram'];
        if (key.includes('disc')) return icons['discord'];
        if (key.includes('red')) return icons['reddit'];
        if (key.includes('pin')) return icons['pinterest'];
        if (key.includes('thread')) return icons['threads'];

        return icons['instagram']; // Fallback
    }

    function getChannelIconById(id) {
        // Simple mapping based on ID containing platform name
        if (id.includes('instagram')) return getChannelIcon('instagram');
        if (id.includes('x') || id.includes('twitter')) return getChannelIcon('x');
        if (id.includes('youtube')) return getChannelIcon('youtube');
        if (id.includes('linkedin')) return getChannelIcon('linkedin');
        if (id.includes('medium')) return getChannelIcon('medium');
        return getChannelIcon('instagram');
    }

    // --- Configuration Panel Logic ---

    let configResolver = null;
    let currentConfigInstanceId = null;
    let currentConfigData = null; // Stores current effective config
    let currentOverrides = {}; // Stores pending overrides
    let currentPlatform = 'x'; // Default platform

    // --- Configuration Schemas ---
    const CONFIG_SCHEMAS = {
        x: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.35 },
                { key: 'clicks', type: 'slider', label: 'Link Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'impressions', type: 'slider', label: 'Impressions', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.15 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1-3/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5-10/day)' },
                        { value: 'aggressive', label: 'Aggressive (10+/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.shortTweet', type: 'slider', label: 'Short Tweet', min: 0, max: 100, default: 60 },
                { key: 'formatMix.thread', type: 'slider', label: 'Thread', min: 0, max: 100, default: 80 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Post', min: 0, max: 100, default: 30 },
                { key: 'formatMix.videoPost', type: 'slider', label: 'Video Post', min: 0, max: 100, default: 10 },
                {
                    key: 'experimentIntensity', type: 'select', label: 'Experiment Intensity', options: [
                        { value: 'low', label: 'Low (Safe)' },
                        { value: 'medium', label: 'Medium (Balanced)' },
                        { value: 'high', label: 'High (Experimental)' },
                        { value: 'aggressive', label: 'Aggressive' }
                    ], default: 'medium'
                },
                { key: 'avgThreadLength', type: 'slider', label: 'Target Thread Length', min: 3, max: 25, step: 1, default: 7 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone Preset', options: [
                        { value: 'calm', label: 'Calm & Thoughtful' },
                        { value: 'professional', label: 'Professional & Clear' },
                        { value: 'bold', label: 'Bold & Confident' },
                        { value: 'humorous', label: 'Humorous & Witty' },
                        { value: 'provocative', label: 'Provocative & Contrarian' }
                    ], default: 'professional'
                },
                {
                    key: 'hookStyle', type: 'multi-select', label: 'Hook Style (Select 1-3)', options: [
                        { value: 'question', label: 'Question ("What if...")' },
                        { value: 'stat', label: 'Statistic ("93% of...")' },
                        { value: 'story', label: 'Story ("Last week...")' },
                        { value: 'contrarian', label: 'Contrarian ("Everyone is wrong...")' },
                        { value: 'value_prop', label: 'Value Prop ("How to 10x...")' }
                    ], default: ['question', 'stat']
                },
                { key: 'hashtagCount', type: 'slider', label: 'Hashtags per Post', min: 0, max: 5, step: 1, default: 3 },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal (1-2)' },
                        { value: 'moderate', label: 'Moderate (3-5)' },
                        { value: 'high', label: 'High (5+)' }
                    ], default: 'minimal'
                },
                {
                    key: 'ctaIntensity', type: 'select', label: 'Call-to-Action Intensity', options: [
                        { value: 'soft', label: 'Soft ("Learn more")' },
                        { value: 'medium', label: 'Medium ("Check it out")' },
                        { value: 'aggressive', label: 'Aggressive ("Sign up NOW")' }
                    ], default: 'medium'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off (Manual Only)' },
                        { value: 'low', label: 'Low (@Mentions Only)' },
                        { value: 'medium', label: 'Medium (+ Keywords)' },
                        { value: 'high', label: 'High (Proactive)' }
                    ], default: 'medium'
                },
                { key: 'dailyReplyCap', type: 'slider', label: 'Max Replies/Day', min: 0, max: 200, step: 5, default: 50 },
                { key: 'replyToMentions', type: 'toggle', label: 'Reply to @Mentions', default: true },
                { key: 'replyToKeywords', type: 'tag-input', label: 'Keywords (Press Enter)', default: [] },
                {
                    key: 'escalationTriggers', type: 'multi-select', label: 'Escalation Rules (Alert Human)', options: [
                        { value: 'negative_sentiment', label: 'Negative Sentiment' },
                        { value: 'complaint', label: 'Complaints' },
                        { value: 'support_question', label: 'Support Questions' },
                        { value: 'pricing_inquiry', label: 'Pricing Inquiries' }
                    ], default: ['complaint']
                }
            ]
        },
        instagram: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'clicks', type: 'slider', label: 'Link Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Feed Post Frequency', options: [
                        { value: 'low', label: 'Low (3-4/week)' },
                        { value: 'medium', label: 'Medium (1/day)' },
                        { value: 'high', label: 'High (1-2/day)' },
                        { value: 'aggressive', label: 'Aggressive (3+/day)' }
                    ], default: 'medium'
                },
                {
                    key: 'storyFrequency', type: 'select', label: 'Story Frequency', options: [
                        { value: 'low', label: 'Low (1-2/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5-10/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.reel', type: 'slider', label: 'Reels', min: 0, max: 100, default: 60 },
                { key: 'formatMix.carousel', type: 'slider', label: 'Carousel', min: 0, max: 100, default: 30 },
                { key: 'formatMix.singleImage', type: 'slider', label: 'Single Image', min: 0, max: 100, default: 10 },
                { key: 'formatMix.story', type: 'slider', label: 'Story Weight', min: 0, max: 100, default: 50 },
                {
                    key: 'visualStyle', type: 'select', label: 'Visual Style', options: [
                        { value: 'minimalist', label: 'Minimalist' },
                        { value: 'vibrant', label: 'Vibrant' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'grunge', label: 'Grunge' },
                        { value: 'pastel', label: 'Pastel' }
                    ], default: 'professional'
                },
                { key: 'filterIntensity', type: 'slider', label: 'Filter Intensity', min: 0, max: 100, default: 20 }
            ],
            creator_text: [
                {
                    key: 'captionLength', type: 'select', label: 'Caption Length', options: [
                        { value: 'short', label: 'Short (1-2 lines)' },
                        { value: 'medium', label: 'Medium (Paragraph)' },
                        { value: 'microblog', label: 'Microblog (Long Form)' }
                    ], default: 'medium'
                },
                {
                    key: 'tonePreset', type: 'select', label: 'Tone Preset', options: [
                        { value: 'friendly', label: 'Friendly & Casual' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'inspirational', label: 'Inspirational' },
                        { value: 'witty', label: 'Witty' }
                    ], default: 'professional'
                },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'heavy', label: 'Heavy' }
                    ], default: 'moderate'
                },
                { key: 'hashtagCount', type: 'slider', label: 'Hashtags', min: 0, max: 30, step: 1, default: 15 },
                {
                    key: 'hashtagStrategy', type: 'select', label: 'Hashtags Strategy', options: [
                        { value: 'broad', label: 'Broad Only' },
                        { value: 'niche', label: 'Niche Only' },
                        { value: 'mixed', label: 'Mixed' }
                    ], default: 'mixed'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'medium'
                },
                { key: 'replyToComments', type: 'toggle', label: 'Reply to Comments', default: true },
                { key: 'replyToDMs', type: 'toggle', label: 'Reply to DMs', default: false },
                { key: 'replyToMentions', type: 'toggle', label: 'Reply to Mentions', default: true },
                { key: 'replyToKeywords', type: 'tag-input', label: 'Keywords', default: [] }
            ]
        },
        youtube: {
            goals: [
                { key: 'subscribers', type: 'slider', label: 'Subscriber Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'watchTime', type: 'slider', label: 'Watch Time', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.35 },
                { key: 'engagement', type: 'slider', label: 'Engagement (Likes/Comments)', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'clicks', type: 'slider', label: 'Click-Through Rate', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.15 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Upload Frequency', options: [
                        { value: 'low', label: 'Low (1-2/week)' },
                        { value: 'medium', label: 'Medium (3-4/week)' },
                        { value: 'high', label: 'High (Daily)' },
                        { value: 'aggressive', label: 'Aggressive (Multiple/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.longForm', type: 'slider', label: 'Long-Form Videos (8+ min)', min: 0, max: 100, default: 60 },
                { key: 'formatMix.shorts', type: 'slider', label: 'YouTube Shorts', min: 0, max: 100, default: 40 },
                { key: 'videoLength', type: 'slider', label: 'Target Video Length (min)', min: 5, max: 60, step: 5, default: 15 },
                { key: 'seoOptimization', type: 'toggle', label: 'SEO Optimization', default: true }
            ],
            creator_text: [
                {
                    key: 'titleStyle', type: 'select', label: 'Title Style', options: [
                        { value: 'descriptive', label: 'Descriptive' },
                        { value: 'clickbait', label: 'Clickbait' },
                        { value: 'keyword_rich', label: 'Keyword-Rich' }
                    ], default: 'descriptive'
                },
                {
                    key: 'thumbnailStyle', type: 'select', label: 'Thumbnail Style', options: [
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'bold_text', label: 'Bold Text Overlay' },
                        { value: 'face_focus', label: 'Face Focus' }
                    ], default: 'bold_text'
                },
                {
                    key: 'descriptionLength', type: 'select', label: 'Description Length', options: [
                        { value: 'short', label: 'Short (1-2 paragraphs)' },
                        { value: 'medium', label: 'Medium (3-5 paragraphs)' },
                        { value: 'long', label: 'Long (Full SEO)' }
                    ], default: 'medium'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Comment Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low (Top Comments)' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High (All Comments)' }
                    ], default: 'medium'
                },
                { key: 'pinTopComment', type: 'toggle', label: 'Auto-Pin Top Comment', default: true },
                { key: 'communityPosts', type: 'toggle', label: 'Enable Community Posts', default: true }
            ]
        },
        linkedin: {
            goals: [
                { key: 'connections', type: 'slider', label: 'Connection Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.35 },
                { key: 'impressions', type: 'slider', label: 'Impressions', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'leads', type: 'slider', label: 'Lead Generation', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.15 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (2-3/week)' },
                        { value: 'medium', label: 'Medium (1/day)' },
                        { value: 'high', label: 'High (2/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 40 },
                { key: 'formatMix.article', type: 'slider', label: 'LinkedIn Articles', min: 0, max: 100, default: 20 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 30 },
                { key: 'formatMix.videoPost', type: 'slider', label: 'Video Posts', min: 0, max: 100, default: 10 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'professional', label: 'Professional' },
                        { value: 'thought_leader', label: 'Thought Leader' },
                        { value: 'conversational', label: 'Conversational' },
                        { value: 'inspirational', label: 'Inspirational' }
                    ], default: 'professional'
                },
                { key: 'hashtagCount', type: 'slider', label: 'Hashtags', min: 0, max: 5, step: 1, default: 3 },
                { key: 'includeCallToAction', type: 'toggle', label: 'Include CTA', default: true }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'low'
                },
                { key: 'connectionRequests', type: 'toggle', label: 'Auto-Accept Connections', default: false },
                { key: 'endorseSkills', type: 'toggle', label: 'Auto-Endorse Skills', default: false }
            ]
        },
        tiktok: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'views', type: 'slider', label: 'Video Views', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'shares', type: 'slider', label: 'Shares', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1/day)' },
                        { value: 'medium', label: 'Medium (2-3/day)' },
                        { value: 'high', label: 'High (4-5/day)' },
                        { value: 'aggressive', label: 'Aggressive (6+/day)' }
                    ], default: 'medium'
                },
                {
                    key: 'videoLength', type: 'select', label: 'Video Length', options: [
                        { value: 'short', label: 'Short (15-30s)' },
                        { value: 'medium', label: 'Medium (30-60s)' },
                        { value: 'long', label: 'Long (1-3min)' }
                    ], default: 'medium'
                },
                { key: 'trendParticipation', type: 'slider', label: 'Trend Participation', min: 0, max: 100, default: 70 },
                { key: 'originalContent', type: 'slider', label: 'Original Content', min: 0, max: 100, default: 30 }
            ],
            creator_text: [
                {
                    key: 'captionStyle', type: 'select', label: 'Caption Style', options: [
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'engaging', label: 'Engaging' },
                        { value: 'storytelling', label: 'Storytelling' }
                    ], default: 'engaging'
                },
                { key: 'hashtagCount', type: 'slider', label: 'Hashtags', min: 0, max: 10, step: 1, default: 5 },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'heavy', label: 'Heavy' }
                    ], default: 'moderate'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Comment Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'medium'
                },
                { key: 'duetEnabled', type: 'toggle', label: 'Enable Duets', default: true },
                { key: 'stitchEnabled', type: 'toggle', label: 'Enable Stitch', default: true }
            ]
        },
        facebook: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Page Followers', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.35 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'conversions', type: 'slider', label: 'Conversions', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.15 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1/day)' },
                        { value: 'medium', label: 'Medium (2-3/day)' },
                        { value: 'high', label: 'High (4+/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 30 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 40 },
                { key: 'formatMix.videoPost', type: 'slider', label: 'Video Posts', min: 0, max: 100, default: 20 },
                { key: 'formatMix.story', type: 'slider', label: 'Stories', min: 0, max: 100, default: 10 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'friendly', label: 'Friendly' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'casual', label: 'Casual' },
                        { value: 'promotional', label: 'Promotional' }
                    ], default: 'friendly'
                },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'heavy', label: 'Heavy' }
                    ], default: 'moderate'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'medium'
                },
                { key: 'messengerAutoReply', type: 'toggle', label: 'Messenger Auto-Reply', default: false }
            ]
        },
        pinterest: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'saves', type: 'slider', label: 'Pin Saves', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'clicks', type: 'slider', label: 'Outbound Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'impressions', type: 'slider', label: 'Impressions', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Pin Frequency', options: [
                        { value: 'low', label: 'Low (5-10/day)' },
                        { value: 'medium', label: 'Medium (10-20/day)' },
                        { value: 'high', label: 'High (20-30/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.standardPin', type: 'slider', label: 'Standard Pins', min: 0, max: 100, default: 60 },
                { key: 'formatMix.videoPin', type: 'slider', label: 'Video Pins', min: 0, max: 100, default: 20 },
                { key: 'formatMix.ideaPin', type: 'slider', label: 'Idea Pins', min: 0, max: 100, default: 20 }
            ],
            creator_text: [
                {
                    key: 'titleStyle', type: 'select', label: 'Pin Title Style', options: [
                        { value: 'descriptive', label: 'Descriptive' },
                        { value: 'keyword_rich', label: 'Keyword-Rich' },
                        { value: 'actionable', label: 'Actionable' }
                    ], default: 'keyword_rich'
                },
                {
                    key: 'descriptionLength', type: 'select', label: 'Description Length', options: [
                        { value: 'short', label: 'Short' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'long', label: 'Long (SEO Optimized)' }
                    ], default: 'long'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Comment Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' }
                    ], default: 'low'
                }
            ]
        },
        reddit: {
            goals: [
                { key: 'karma', type: 'slider', label: 'Karma Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Engagement (Comments/Upvotes)', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'clicks', type: 'slider', label: 'Link Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1-2/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5+/day)' }
                    ], default: 'low'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 50 },
                { key: 'formatMix.linkPost', type: 'slider', label: 'Link Posts', min: 0, max: 100, default: 30 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 20 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'casual', label: 'Casual' },
                        { value: 'informative', label: 'Informative' },
                        { value: 'humorous', label: 'Humorous' },
                        { value: 'serious', label: 'Serious' }
                    ], default: 'casual'
                },
                {
                    key: 'titleStyle', type: 'select', label: 'Title Style', options: [
                        { value: 'question', label: 'Question-Based' },
                        { value: 'statement', label: 'Statement' },
                        { value: 'clickbait', label: 'Engaging/Clickbait' }
                    ], default: 'question'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Comment Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'medium'
                },
                { key: 'subredditEngagement', type: 'toggle', label: 'Cross-Subreddit Engagement', default: true }
            ]
        },
        medium: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.25 },
                { key: 'reads', type: 'slider', label: 'Article Reads', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'claps', type: 'slider', label: 'Claps', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'readTime', type: 'slider', label: 'Read Time', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.15 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Publishing Frequency', options: [
                        { value: 'low', label: 'Low (1-2/week)' },
                        { value: 'medium', label: 'Medium (3-4/week)' },
                        { value: 'high', label: 'High (Daily)' }
                    ], default: 'low'
                },
                {
                    key: 'articleLength', type: 'select', label: 'Article Length', options: [
                        { value: 'short', label: 'Short (3-5 min read)' },
                        { value: 'medium', label: 'Medium (5-10 min read)' },
                        { value: 'long', label: 'Long (10+ min read)' }
                    ], default: 'medium'
                }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Writing Tone', options: [
                        { value: 'professional', label: 'Professional' },
                        { value: 'conversational', label: 'Conversational' },
                        { value: 'academic', label: 'Academic' },
                        { value: 'storytelling', label: 'Storytelling' }
                    ], default: 'conversational'
                },
                { key: 'includeImages', type: 'toggle', label: 'Include Images', default: true },
                { key: 'seoOptimization', type: 'toggle', label: 'SEO Optimization', default: true }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Comment Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' }
                    ], default: 'low'
                },
                { key: 'highlightComments', type: 'toggle', label: 'Auto-Highlight Comments', default: false }
            ]
        },
        threads: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'shares', type: 'slider', label: 'Shares', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1-3/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5-10/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 60 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 30 },
                { key: 'formatMix.videoPost', type: 'slider', label: 'Video Posts', min: 0, max: 100, default: 10 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'casual', label: 'Casual' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'witty', label: 'Witty' },
                        { value: 'thoughtful', label: 'Thoughtful' }
                    ], default: 'casual'
                },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'moderate', label: 'Moderate' }
                    ], default: 'minimal'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                    ], default: 'medium'
                },
                { key: 'replyToMentions', type: 'toggle', label: 'Reply to Mentions', default: true }
            ]
        },
        bluesky: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'clicks', type: 'slider', label: 'Link Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1-3/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5-10/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 70 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 20 },
                { key: 'formatMix.thread', type: 'slider', label: 'Threads', min: 0, max: 100, default: 10 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'casual', label: 'Casual' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'thoughtful', label: 'Thoughtful' },
                        { value: 'humorous', label: 'Humorous' }
                    ], default: 'thoughtful'
                },
                { key: 'contentWarnings', type: 'toggle', label: 'Use Content Warnings', default: false }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' }
                    ], default: 'low'
                },
                { key: 'replyToMentions', type: 'toggle', label: 'Reply to Mentions', default: true }
            ]
        },
        mastodon: {
            goals: [
                { key: 'followers', type: 'slider', label: 'Follower Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Engagement (Boosts/Favs)', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'reach', type: 'slider', label: 'Reach', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'clicks', type: 'slider', label: 'Link Clicks', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Posting Frequency', options: [
                        { value: 'low', label: 'Low (1-3/day)' },
                        { value: 'medium', label: 'Medium (3-5/day)' },
                        { value: 'high', label: 'High (5-10/day)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.textPost', type: 'slider', label: 'Text Posts', min: 0, max: 100, default: 70 },
                { key: 'formatMix.imagePost', type: 'slider', label: 'Image Posts', min: 0, max: 100, default: 20 },
                { key: 'formatMix.thread', type: 'slider', label: 'Threads', min: 0, max: 100, default: 10 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'casual', label: 'Casual' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'activist', label: 'Activist' },
                        { value: 'community_focused', label: 'Community-Focused' }
                    ], default: 'community_focused'
                },
                { key: 'contentWarnings', type: 'toggle', label: 'Use Content Warnings (CW)', default: true },
                { key: 'altTextRequired', type: 'toggle', label: 'Require Alt Text for Images', default: true }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' }
                    ], default: 'low'
                },
                { key: 'replyToMentions', type: 'toggle', label: 'Reply to Mentions', default: true },
                { key: 'crossInstanceEngagement', type: 'toggle', label: 'Cross-Instance Engagement', default: true }
            ]
        },
        discord: {
            goals: [
                { key: 'members', type: 'slider', label: 'Member Growth', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.30 },
                { key: 'engagement', type: 'slider', label: 'Message Engagement', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.40 },
                { key: 'retention', type: 'slider', label: 'Member Retention', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.20 },
                { key: 'activity', type: 'slider', label: 'Daily Active Users', min: 0, max: 1, step: 0.05, isPercent: true, default: 0.10 }
            ],
            planner: [
                {
                    key: 'postFrequency', type: 'select', label: 'Message Frequency', options: [
                        { value: 'low', label: 'Low (Occasional)' },
                        { value: 'medium', label: 'Medium (Regular)' },
                        { value: 'high', label: 'High (Very Active)' }
                    ], default: 'medium'
                },
                { key: 'formatMix.announcement', type: 'slider', label: 'Announcements', min: 0, max: 100, default: 30 },
                { key: 'formatMix.discussion', type: 'slider', label: 'Discussions', min: 0, max: 100, default: 50 },
                { key: 'formatMix.event', type: 'slider', label: 'Events', min: 0, max: 100, default: 20 }
            ],
            creator_text: [
                {
                    key: 'tonePreset', type: 'select', label: 'Tone', options: [
                        { value: 'casual', label: 'Casual' },
                        { value: 'friendly', label: 'Friendly' },
                        { value: 'professional', label: 'Professional' },
                        { value: 'gaming', label: 'Gaming/Meme' }
                    ], default: 'friendly'
                },
                {
                    key: 'emojiUsage', type: 'select', label: 'Emoji/Emote Usage', options: [
                        { value: 'none', label: 'None' },
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'heavy', label: 'Heavy' }
                    ], default: 'moderate'
                }
            ],
            engagement: [
                {
                    key: 'autoReplyLevel', type: 'select', label: 'Auto-Reply Level', options: [
                        { value: 'off', label: 'Off' },
                        { value: 'low', label: 'Low (Mentions Only)' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High (Active Participation)' }
                    ], default: 'medium'
                },
                { key: 'welcomeNewMembers', type: 'toggle', label: 'Welcome New Members', default: true },
                { key: 'moderationAssist', type: 'toggle', label: 'Moderation Assistance', default: false }
            ]
        }
    };

    // Initialize ConfigResolver
    try {
        configResolver = new ConfigResolver(db, projectId);
    } catch (e) {
        console.error("Failed to init ConfigResolver:", e);
    }

    // Panel Event Listeners
    const configOverlay = document.getElementById('config-overlay');
    const configPanel = document.getElementById('config-panel');
    const configClose = document.getElementById('config-close');
    const configSave = document.getElementById('config-save');
    const configReset = document.getElementById('config-reset-all');

    if (configClose) configClose.addEventListener('click', closeConfigPanel);
    if (configOverlay) configOverlay.addEventListener('click', closeConfigPanel);
    if (configSave) configSave.addEventListener('click', saveConfigChanges);
    if (configReset) configReset.addEventListener('click', resetAllConfig);

    // Tab Switching
    document.querySelectorAll('.config-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.config-section').forEach(s => s.classList.remove('active'));

            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            const section = document.getElementById(`config-section-${tabName}`);
            if (section) section.classList.add('active');
        });
    });

    window.openChannelConfig = async function (instanceId) {
        if (!configResolver) return alert("Config System not initialized");

        currentConfigInstanceId = instanceId;
        currentOverrides = {}; // Reset pending overrides

        // Show loading state
        document.getElementById('config-content').innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading configuration...</div>';

        configOverlay.classList.add('active');
        configPanel.classList.add('active');

        try {
            // Get Instance Details
            const instanceDoc = await db.collection("projectAgentTeamInstances").doc(instanceId).get();
            const instance = instanceDoc.data();

            // Update Header
            document.getElementById('config-channel-name').textContent = instance.name;
            document.getElementById('config-channel-icon').innerHTML = getChannelIconById(instance.channelId);
            document.getElementById('config-template-name').textContent = `Template: ${instance.templateId || 'Custom'}`;
            document.getElementById('config-profile-name').textContent = `Runtime Profile: ${instance.configProfileId || 'Default'}`;

            // Determine platform from channelId
            const channelId = instance.channelId.toLowerCase();
            currentPlatform = 'x'; // Default

            // Platform detection based on channelId
            if (channelId.includes('instagram')) currentPlatform = 'instagram';
            else if (channelId.includes('youtube')) currentPlatform = 'youtube';
            else if (channelId.includes('linkedin')) currentPlatform = 'linkedin';
            else if (channelId.includes('tiktok')) currentPlatform = 'tiktok';
            else if (channelId.includes('facebook')) currentPlatform = 'facebook';
            else if (channelId.includes('pinterest')) currentPlatform = 'pinterest';
            else if (channelId.includes('reddit')) currentPlatform = 'reddit';
            else if (channelId.includes('medium')) currentPlatform = 'medium';
            else if (channelId.includes('threads')) currentPlatform = 'threads';
            else if (channelId.includes('bluesky')) currentPlatform = 'bluesky';
            else if (channelId.includes('mastodon')) currentPlatform = 'mastodon';
            else if (channelId.includes('discord')) currentPlatform = 'discord';


            // Load Effective Configs for all engines
            const [goals, planner, creator, engagement] = await Promise.all([
                configResolver.getEffectiveConfig(instanceId, 'goals'),
                configResolver.getEffectiveConfig(instanceId, 'planner'),
                configResolver.getEffectiveConfig(instanceId, 'creator_text'),
                configResolver.getEffectiveConfig(instanceId, 'engagement')
            ]);

            currentConfigData = { goals, planner, creator_text: creator, engagement };

            renderConfigUI();

        } catch (error) {
            console.error("Error opening config:", error);
            document.getElementById('config-content').innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">Error: ${error.message}</div>`;
        }
    };

    function closeConfigPanel() {
        configOverlay.classList.remove('active');
        configPanel.classList.remove('active');
    }

    function renderConfigUI() {
        const container = document.getElementById('config-content');
        container.innerHTML = '';

        const schema = CONFIG_SCHEMAS[currentPlatform] || CONFIG_SCHEMAS['x'];

        // 1. Goals Tab
        const goalsSection = createSection('goals', true);
        goalsSection.innerHTML = renderSchemaTab('goals', schema.goals, currentConfigData.goals);
        container.appendChild(goalsSection);

        // 2. Planner Tab
        const plannerSection = createSection('planner', false);
        plannerSection.innerHTML = renderSchemaTab('planner', schema.planner, currentConfigData.planner);
        container.appendChild(plannerSection);

        // 3. Creator Text Tab
        const creatorSection = createSection('creator_text', false);
        creatorSection.innerHTML = renderSchemaTab('creator_text', schema.creator_text, currentConfigData.creator_text);
        container.appendChild(creatorSection);

        // 4. Engagement Tab
        const engagementSection = createSection('engagement', false);
        engagementSection.innerHTML = renderSchemaTab('engagement', schema.engagement, currentConfigData.engagement);
        container.appendChild(engagementSection);

        // 5. Advanced Tab (Still manual for now as it's optional/generic)
        const advancedSection = createSection('advanced', false);
        advancedSection.innerHTML = renderAdvancedTab(currentConfigData.advanced || {});
        container.appendChild(advancedSection);

        // Re-attach listeners for inputs
        attachInputListeners();
    }

    function createSection(id, isActive) {
        const div = document.createElement('div');
        div.id = `config-section-${id}`;
        div.className = `config-section ${isActive ? 'active' : ''}`;
        return div;
    }

    // --- Render Helpers ---

    function renderSchemaTab(engine, fields, config) {
        if (!fields) return '<div style="padding: 20px; color: rgba(255,255,255,0.5);">No configuration available for this section.</div>';

        return fields.map(field => {
            const value = getDeepValue(config, field.key) ?? field.default;

            // Group logic could be added here if schema supports groups
            // For now, wrap each field in a div or render directly

            let fieldHtml = '';
            switch (field.type) {
                case 'slider':
                    fieldHtml = renderSlider(engine, field.key, field.label, value, field.min, field.max, field.step, field.isPercent);
                    break;
                case 'select':
                    fieldHtml = renderSelect(engine, field.key, field.label, field.options, value);
                    break;
                case 'multi-select':
                    fieldHtml = renderMultiSelect(engine, field.key, field.options, value, field.label);
                    break;
                case 'toggle':
                    fieldHtml = renderToggle(engine, field.key, field.label, value);
                    break;
                case 'tag-input':
                    fieldHtml = `
                        <div class="config-group">
                            <label class="config-label">${field.label}</label>
                            ${renderTagInput(engine, field.key, value)}
                        </div>`;
                    break;
                default:
                    fieldHtml = `<div>Unknown field type: ${field.type}</div>`;
            }
            return fieldHtml;
        }).join('');
    }

    function renderSelect(engine, key, label, options, currentValue) {
        const optionsHtml = options.map(opt =>
            `<option value="${opt.value}" ${opt.value === currentValue ? 'selected' : ''}>${opt.label}</option>`
        ).join('');

        return `
            <div class="config-group">
                <label class="config-label">${label}</label>
                <select class="config-select" data-engine="${engine}" data-key="${key}">
                    ${optionsHtml}
                </select>
            </div>
        `;
    }

    function renderSlider(engine, key, label, value, min, max, step = 1, isPercent = false) {
        const displayValue = isPercent ? `${Math.round(value * 100)}%` : value;
        return `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-size: 12px; color: rgba(255,255,255,0.7);">${label}</span>
                    <span class="config-value" id="val-${engine}-${key.replace('.', '-')}">${displayValue}</span>
                </div>
                <div class="config-slider-container">
                    <input type="range" class="config-slider" 
                        data-engine="${engine}" data-key="${key}"
                        min="${min}" max="${max}" step="${step}" value="${value}"
                        oninput="document.getElementById('val-${engine}-${key.replace('.', '-')}').textContent = ${isPercent} ? Math.round(this.value * 100) + '%' : this.value">
                </div>
            </div>
        `;
    }

    function renderAdvancedTab(config) {
        return `
            <div class="config-group">
                <label class="config-label">Optimization</label>
                ${renderToggle('advanced', 'seoOptimization', 'SEO Optimization', config.seoOptimization !== false)}
                ${renderToggle('advanced', 'linkPreviewOptimization', 'Rich Link Previews', config.linkPreviewOptimization !== false)}
            </div>

            <div class="config-group">
                <label class="config-label">Structure Strategy</label>
                <div style="margin-bottom: 12px;">
                    <label class="config-label" style="font-size: 12px;">Thread Structure</label>
                    <select class="config-select" data-engine="advanced" data-key="threadStructure">
                        <option value="linear" ${config.threadStructure === 'linear' ? 'selected' : ''}>Linear (Standard)</option>
                        <option value="branching" ${config.threadStructure === 'branching' ? 'selected' : ''}>Branching (Complex)</option>
                    </select>
                </div>
                <div>
                    <label class="config-label" style="font-size: 12px;">Retweet Strategy</label>
                    <select class="config-select" data-engine="advanced" data-key="retweetStrategy">
                        <option value="off" ${config.retweetStrategy === 'off' ? 'selected' : ''}>Off</option>
                        <option value="selective" ${config.retweetStrategy === 'selective' ? 'selected' : ''}>Selective (High Performers)</option>
                        <option value="aggressive" ${config.retweetStrategy === 'aggressive' ? 'selected' : ''}>Aggressive</option>
                    </select>
                </div>
            </div>
        `;
    }

    function renderMultiSelect(engine, key, options, selectedValues) {
        const items = options.map(opt => {
            const isChecked = selectedValues.includes(opt.value);
            return `
                <label class="config-checkbox-item">
                    <input type="checkbox" class="config-multi-checkbox" 
                        data-engine="${engine}" data-key="${key}" value="${opt.value}"
                        ${isChecked ? 'checked' : ''}>
                    ${opt.label}
                </label>
            `;
        }).join('');

        return `<div class="config-multiselect-container">${items}</div>`;
    }

    function renderToggle(engine, key, label, isChecked) {
        return `
            <div class="config-toggle-container">
                <span class="config-toggle-label">${label}</span>
                <label class="config-toggle">
                    <input type="checkbox" class="config-toggle-input" 
                        data-engine="${engine}" data-key="${key}"
                        ${isChecked ? 'checked' : ''}>
                    <span class="config-toggle-slider"></span>
                </label>
            </div>
        `;
    }

    function renderTagInput(engine, key, tags) {
        const tagItems = tags.map(tag => `
            <span class="config-tag">
                ${tag}
                <span class="config-tag-remove" data-tag="${tag}" data-engine="${engine}" data-key="${key}">&times;</span>
            </span>
        `).join('');

        return `
            <div class="config-tag-container" id="tags-${engine}-${key}">
                ${tagItems}
                <input type="text" class="config-tag-input" 
                    data-engine="${engine}" data-key="${key}" 
                    placeholder="Add keyword...">
            </div>
        `;
    }

    function attachInputListeners() {
        // 1. Sliders & Selects
        document.querySelectorAll('.config-slider, .config-select').forEach(input => {
            input.addEventListener('change', (e) => {
                updateConfigValue(e.target.dataset.engine, e.target.dataset.key, e.target.value, e.target.type);
            });
        });

        // 2. Toggles (Single Checkbox)
        document.querySelectorAll('.config-toggle-input').forEach(input => {
            input.addEventListener('change', (e) => {
                updateConfigValue(e.target.dataset.engine, e.target.dataset.key, e.target.checked);
            });
        });

        // 3. Multi-Select (Checkbox Group)
        document.querySelectorAll('.config-multi-checkbox').forEach(input => {
            input.addEventListener('change', (e) => {
                const engine = e.target.dataset.engine;
                const key = e.target.dataset.key;
                const value = e.target.value;

                // Get current array (from overrides or currentConfigData)
                let currentArray = getDeepValue(currentOverrides, engine, key);
                if (currentArray === undefined) {
                    currentArray = getDeepValue(currentConfigData, engine, key) || [];
                    // Clone it to avoid mutating original
                    currentArray = [...currentArray];
                }

                if (e.target.checked) {
                    if (!currentArray.includes(value)) currentArray.push(value);
                } else {
                    currentArray = currentArray.filter(v => v !== value);
                }

                updateConfigValue(engine, key, currentArray);
            });
        });

        // 4. Tag Inputs
        document.querySelectorAll('.config-tag-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const tag = e.target.value.trim();
                    if (!tag) return;

                    const engine = e.target.dataset.engine;
                    const key = e.target.dataset.key;

                    let currentTags = getDeepValue(currentOverrides, engine, key);
                    if (currentTags === undefined) {
                        currentTags = getDeepValue(currentConfigData, engine, key) || [];
                        currentTags = [...currentTags];
                    }

                    if (!currentTags.includes(tag)) {
                        currentTags.push(tag);
                        updateConfigValue(engine, key, currentTags);

                        // Re-render tags part only
                        const container = document.getElementById(`tags-${engine}-${key}`);
                        // Insert before input
                        const span = document.createElement('span');
                        span.className = 'config-tag';
                        span.innerHTML = `${tag} <span class="config-tag-remove" data-tag="${tag}" data-engine="${engine}" data-key="${key}">&times;</span>`;
                        container.insertBefore(span, input);

                        // Re-attach remove listener for new tag
                        span.querySelector('.config-tag-remove').addEventListener('click', handleTagRemove);
                    }
                    e.target.value = '';
                }
            });
        });

        // Tag Remove Listeners
        document.querySelectorAll('.config-tag-remove').forEach(btn => {
            btn.addEventListener('click', handleTagRemove);
        });
    }

    function handleTagRemove(e) {
        const engine = e.target.dataset.engine;
        const key = e.target.dataset.key;
        const tagToRemove = e.target.dataset.tag;

        let currentTags = getDeepValue(currentOverrides, engine, key);
        if (currentTags === undefined) {
            currentTags = getDeepValue(currentConfigData, engine, key) || [];
            currentTags = [...currentTags];
        }

        currentTags = currentTags.filter(t => t !== tagToRemove);
        updateConfigValue(engine, key, currentTags);

        // Remove from DOM
        e.target.parentElement.remove();
    }

    function updateConfigValue(engine, key, value, type) {
        // Convert types if needed
        if (type === 'range') {
            value = parseFloat(value);
        }

        // Handle nested keys (e.g. formatMix.shortTweet)
        if (!currentOverrides[engine]) currentOverrides[engine] = {};

        if (key.includes('.')) {
            const [parent, child] = key.split('.');
            if (!currentOverrides[engine][parent]) {
                // Initialize with current config value if exists, or empty obj
                const existingParent = currentConfigData[engine]?.[parent] || {};
                currentOverrides[engine][parent] = { ...existingParent };
            }
            currentOverrides[engine][parent][child] = value;
        } else {
            currentOverrides[engine][key] = value;
        }

        console.log('Config changed:', currentOverrides);
    }

    function getDeepValue(obj, engine, key) {
        if (!obj || !obj[engine]) return undefined;
        if (key.includes('.')) {
            const [parent, child] = key.split('.');
            return obj[engine][parent]?.[child];
        }
        return obj[engine][key];
    }

    async function saveConfigChanges() {
        if (!currentConfigInstanceId) return;

        const btn = document.getElementById('config-save');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            // Save overrides using ConfigResolver
            await configResolver.saveChannelConfig(
                currentConfigInstanceId,
                currentOverrides,
                currentUser.uid
            );

            alert('✅ Configuration saved successfully!');
            closeConfigPanel();

        } catch (error) {
            console.error("Error saving config:", error);
            alert(`Error saving: ${error.message}`);
        } finally {
            btn.textContent = 'Save Changes';
            btn.disabled = false;
        }
    }

    async function resetAllConfig() {
        if (!confirm("Are you sure you want to reset all overrides to default?")) return;

        try {
            await configResolver.resetAllOverrides(currentConfigInstanceId);
            alert('✅ Configuration reset to defaults!');
            closeConfigPanel();
        } catch (error) {
            console.error("Error resetting config:", error);
            alert(`Error resetting: ${error.message}`);
        }
    }

    window.deactivateTeam = async function (instanceId) {
        if (!confirm("Are you sure you want to stop this team?")) return;
        try {
            await db.collection("projectAgentTeamInstances").doc(instanceId).update({ status: 'inactive' });
            loadAgentSwarm(new URLSearchParams(window.location.search).get('id'));
        } catch (error) {
            console.error("Error stopping team:", error);
            alert("Error stopping team.");
        }
    };

});

// --- Agent Team Detail Panel Logic ---

let selectedInstanceId = null;
let selectedSubAgentId = null;
let selectedRunId = null;

window.viewTeamDetails = async function (instanceId) {
    selectedInstanceId = instanceId;
    const panel = document.getElementById('agent-detail-panel');
    if (!panel) {
        return;
    }

    try {
        // Get current project ID from URL or global state
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id') || window.currentProjectId || 'default_project';

        // Scroll to panel
        panel.style.display = 'grid';
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Render Panel Structure
        await renderDetailPanel(instanceId, projectId);

        // Load real data using View History module
        if (typeof openViewHistory === 'function') {
            openViewHistory(projectId, instanceId);
        } else {
            console.error('[View History] openViewHistory function not found');
        }
    } catch (error) {
        console.error("Error rendering detail panel:", error);
    }
};

// Alias for onclick handler in HTML
window.openAgentDetail = function (instanceId) {
    console.log('[AgentSwarm] openAgentDetail called', { instanceId });
    window.viewTeamDetails(instanceId);
};

async function renderDetailPanel(instanceId, projectId) {
    const panel = document.getElementById('agent-detail-panel');

    // Create panel structure with proper container IDs
    panel.innerHTML = `
        <div id="col-sub-agents" class="detail-column">
            <div class="column-header">
                <div class="column-title">Assigned Agent Team</div>
            </div>
            <div class="column-content">
                <!-- Channel Connections Section -->
                <div id="channel-connections-container" style="margin-bottom: 24px; display: none;">
                    <div class="sub-agent-list-header">Channel Connections</div>
                    <div id="channel-connections-list" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Populated by View History module -->
                    </div>
                </div>

                <div id="sub-agent-list">
                    <div class="loading-state">Loading sub-agents...</div>
                </div>
            </div>
        </div>
        <div id="col-recent-runs" class="detail-column">
            <div class="column-header">
                <div class="column-title">Recent Runs</div>
            </div>
            <div class="column-content">
                <div id="runs-list">
                    <div class="loading-state">Loading runs...</div>
                </div>
            </div>
        </div>
        <div id="col-generated-content" class="detail-column">
            <div class="column-header">
                <div class="column-title">Generated Content</div>
            </div>
            <div class="column-content">
                <div id="content-list">
                    <div class="loading-state">Loading content...</div>
                </div>
            </div>
        </div>
    `;
}

function renderSubAgentsColumn(data) {
    const panel = document.getElementById('agent-detail-panel');

    // Check if columns exist, if not create them
    if (!document.getElementById('col-sub-agents')) {
        panel.innerHTML = `
            <div id="col-sub-agents" class="detail-column"></div>
            <div id="col-recent-runs" class="detail-column"></div>
            <div id="col-generated-content" class="detail-column"></div>
        `;
    }

    const col = document.getElementById('col-sub-agents');
    if (col) {
        col.innerHTML = `
            <div class="column-header">
                <div class="column-title">Assigned Agent Team</div>
            </div>
            <div class="column-content">
                <div class="team-info-card">
                    <div class="team-name-large">${data.teamName}</div>
                    <div class="team-desc">${data.teamDesc}</div>
                </div>

                <div class="sub-agent-list-header">Active Sub-Agents</div>
                <div id="sub-agent-list">
                    ${data.subAgents.map(agent => renderSubAgentCard(agent)).join('')}
                </div>
            </div>
        `;
    } else {
        console.error("Failed to create sub-agents column");
    }
}

function renderSubAgentCard(agent) {
    return `
            <div class="sub-agent-card ${selectedSubAgentId === agent.id ? 'selected' : ''}" 
                 onclick="selectSubAgent('${agent.id}')" id="sa-card-${agent.id}">
                <div class="sub-agent-header">
                    <div class="sub-agent-name">${agent.name}</div>
                    <div class="sr-badge">${agent.successRate}% SR</div>
                </div>
                <div class="sub-agent-role">${agent.role}</div>
                <div class="sub-agent-meta">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    Last active ${agent.lastActive}
                </div>
            </div>
        `;
}

window.selectSubAgent = function (subAgentId) {
    selectedSubAgentId = subAgentId;

    // Update UI selection
    document.querySelectorAll('.sub-agent-card').forEach(el => el.classList.remove('selected'));
    const card = document.getElementById(`sa-card-${subAgentId}`);
    if (card) card.classList.add('selected');

    // Filter Runs
    // In real app, fetch runs for this sub-agent
    // Here we use the global mock data (stored in window for simplicity or re-generated)
    const data = window.currentMockData;
    const runs = data.runs.filter(r => r.subAgentId === subAgentId);

    renderRecentRunsColumn(runs);

    // Select first run if available
    if (runs.length > 0) {
        selectRun(runs[0].id);
    } else {
        renderGeneratedContentColumn([]);
    }
};

function renderRecentRunsColumn(runs) {
    const html = `
            <div class="column-header">
                <div class="column-title">Recent Runs</div>
                <a href="#" class="column-action">View All</a>
            </div>
            <div class="column-content">
                <div class="filter-pills">
                    <div class="filter-pill active">All Status</div>
                    <div class="filter-pill">Running</div>
                    <div class="filter-pill">Failed</div>
                </div>
                <div id="run-list">
                    ${runs.map(run => renderRunCard(run)).join('')}
                </div>
            </div>
        `;
    document.getElementById('col-recent-runs').innerHTML = html;
}

function renderRunCard(run) {
    return `
            <div class="run-card ${selectedRunId === run.id ? 'selected' : ''}" 
                 onclick="selectRun('${run.id}')" id="run-card-${run.id}">
                <div class="run-header">
                    <div class="run-status status-${run.status.toLowerCase()}">${run.status}</div>
                    <div class="run-id">#${run.id}</div>
                </div>
                <div class="run-prompt">${run.prompt}</div>
                <div class="run-footer">
                    <div style="display:flex;align-items:center;gap:4px;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                        ${run.subAgentName}
                    </div>
                    <div>${run.time}</div>
                </div>
            </div>
        `;
}

window.selectRun = function (runId) {
    selectedRunId = runId;

    // Update UI selection
    document.querySelectorAll('.run-card').forEach(el => el.classList.remove('selected'));
    const card = document.getElementById(`run-card-${runId}`);
    if (card) card.classList.add('selected');

    // Filter Content
    const data = window.currentMockData;
    const content = data.content.filter(c => c.runId === runId);

    renderGeneratedContentColumn(content);
};

function renderGeneratedContentColumn(content) {
    const html = `
            <div class="column-header">
                <div class="column-title">Generated Content</div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div class="column-content">
                ${content.length > 0 ? content.map(c => renderContentCard(c)).join('') : '<div style="text-align:center;color:rgba(255,255,255,0.4);margin-top:20px;">No content generated.</div>'}
            </div>
        `;
    document.getElementById('col-generated-content').innerHTML = html;
}

function renderContentCard(content) {
    return `
            <div class="content-card">
                <div class="content-thumb">
                    <img src="${content.image}" alt="${content.title}" onerror="this.style.display='none';this.parentNode.innerHTML='<div style=\\'color:rgba(255,255,255,0.2);\\'>No Image</div>'">
                    <div class="content-type-badge">Image Post</div>
                    <div class="content-status-badge content-status-${content.status.toLowerCase()}">${content.status}</div>
                </div>
                <div class="content-body">
                    <div class="content-title">${content.title}</div>
                    <div class="content-caption">${content.caption}</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:12px;text-align:right;">${content.timeAgo}</div>
                    <div class="content-actions">
                        <button class="btn-content-action" onclick="alert('Copied to clipboard!')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Copy
                        </button>
                        <button class="btn-content-action btn-content-primary" onclick="window.open('${content.url || '#'}', '_blank')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            Schedule
                        </button>
                    </div>
                </div>
            </div>
        `;
}

// --- Mock Data Generator ---
function generateMockDetailData(instanceId) {
    const data = {
        teamName: "Visual Storyteller V2",
        teamDesc: "Generates lifestyle imagery and engaging captions for daily posts.",
        subAgents: [
            { id: 'sa1', name: 'TrendHunter', role: 'Researcher', successRate: 98, lastActive: '10m ago' },
            { id: 'sa2', name: 'PixelPerfect', role: 'Image Generator', successRate: 92, lastActive: '15m ago' },
            { id: 'sa3', name: 'CopyMaster', role: 'Copywriter', successRate: 99, lastActive: '5m ago' },
            { id: 'sa4', name: 'SchedBot', role: 'Scheduler', successRate: 100, lastActive: '2m ago' }
        ],
        runs: [
            { id: '980504', status: 'SUCCESS', prompt: 'Create a vibrant post about spicy tteokbokki for the weekend crowd.', subAgentId: 'sa1', subAgentName: 'PixelPerfect', time: '15:46:20' },
            { id: '088219', status: 'SUCCESS', prompt: 'Generate 5 hashtags for the Kimchi stew post.', subAgentId: 'sa1', subAgentName: 'CopyMaster', time: '14:20:10' },
            { id: '112233', status: 'FAILED', prompt: 'Analyze top 10 trends in K-Food.', subAgentId: 'sa1', subAgentName: 'TrendHunter', time: '12:05:00' },
            { id: '445566', status: 'RUNNING', prompt: 'Generating image for Bibimbap special.', subAgentId: 'sa2', subAgentName: 'PixelPerfect', time: 'Now' },
            { id: '778899', status: 'SUCCESS', prompt: 'Drafting caption for Bulgogi launch.', subAgentId: 'sa3', subAgentName: 'CopyMaster', time: 'Yesterday' }
        ],
        content: [
            { runId: '980504', title: 'Spicy Weekend', caption: 'Weekend plans? solved. 🌶️🧀 Dive into the spicy goodness of Cheese Tteokbokki! #KFood', status: 'Scheduled', timeAgo: '10 mins ago', image: 'https://images.unsplash.com/photo-1583563420875-19747530d4c9?auto=format&fit=crop&q=80&w=600', url: '#' },
            { runId: '445566', title: 'Bibimbap Special', caption: 'Healthy, colorful, and delicious. What is your favorite topping?', status: 'Draft', timeAgo: '2 hours ago', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&q=80&w=600', url: '#' },
            { runId: '778899', title: 'Bulgogi Launch', caption: 'Experience the authentic taste of Korean BBQ at home. Our new Bulgogi kit is here! 🔥🥩 #KoreanBBQ #Bulgogi', status: 'Success', timeAgo: 'Yesterday', image: 'https://placehold.co/600x400/16e0bd/000000?text=Bulgogi+Launch', url: '#' }
        ]
    };

    // Store globally for filtering
    window.currentMockData = data;
    return data;
}
