// admin-agentteams.js
// AgentSet Template Management Page
// Refactored for Phase 2 Architecture Alignment

(function () {
    // Load template detail script
    if (!document.querySelector('script[src^="template-detail.js"]')) {
        const script = document.createElement('script');
        script.src = `template-detail.js?v=${Date.now()}`;
        document.body.appendChild(script);
    }

    let templates = [];
    let filteredTemplates = [];
    let unsubscribe = null;
    const projectId = "default_project";

    // Wizard State
    let currentStep = 1;
    let wizardData = {
        name: '',
        description: '',
        targetChannel: null, // { id, name, slug }
        roles: [],
        status: 'active',
        channelCredentials: {} // { [key]: value }
    };

    // PRD 11.2 - Channel API Field Definitions (Static Schema)
    const CHANNEL_API_FIELD_DEFS = {
        instagram: [
            { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "Meta Developer 대시보드에서 발급받은 Long-Lived Access Token" },
            { key: "page_id", label: "Page ID", type: "text", required: true, helperText: "Facebook Page ID connected to Instagram" }
        ],
        youtube: [
            { key: "api_key", label: "API Key", type: "password", required: true, helperText: "Google Cloud Console에서 발급받은 API Key" },
            { key: "channel_id", label: "Channel ID", type: "text", required: true, helperText: "YouTube Channel ID" }
        ],
        tiktok: [
            { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "TikTok Developer Access Token" },
            { key: "client_key", label: "Client Key", type: "text", required: true, helperText: "TikTok App Client Key" }
        ],
        linkedin: [
            { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "LinkedIn OAuth2 Access Token" },
            { key: "urn", label: "Organization URN", type: "text", required: true, helperText: "LinkedIn Organization URN (e.g., urn:li:organization:12345)" }
        ],
        x: [
            { key: "api_key", label: "API Key", type: "password", required: true, helperText: "X (Twitter) API Key" },
            { key: "api_secret", label: "API Secret", type: "password", required: true, helperText: "X (Twitter) API Secret" },
            { key: "access_token", label: "Access Token", type: "password", required: true, helperText: "X (Twitter) Access Token" },
            { key: "access_token_secret", label: "Access Token Secret", type: "password", required: true, helperText: "X (Twitter) Access Token Secret" }
        ],
        // Default fallback for others
        default: [
            { key: "api_key", label: "API Key", type: "password", required: true, helperText: "API Key for this channel" }
        ]
    };

    // Wizard Cache Logic
    const CACHE_KEY = `agentTeamWizard:${projectId}`;

    function saveWizardStateToCache() {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(wizardData));
    }

    function loadWizardStateFromCache() {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
    }

    // Available Runtime Profiles (for default selection)
    let runtimeProfiles = [];

    // Role Types (PRD 5.0 - Canonical snake_case values)
    const ROLE_TYPES = [
        { value: 'planner', label: '🎯 Planner', icon: '🎯', defaultName: '콘텐츠기획설계 Agent' },
        { value: 'creator_text', label: '✍️ Creator.Text', icon: '✍️', defaultName: '텍스트생성 에이전트' },
        { value: 'creator_image', label: '🎨 Creator.Image', icon: '🎨', defaultName: '이미지생성 에이전트' },
        { value: 'creator_video', label: '🎬 Creator.Video', icon: '🎬', defaultName: '비디오생성 에이전트' },
        { value: 'research', label: '🔍 Research', icon: '🔍', defaultName: '시장조사 Agent' },
        { value: 'engagement', label: '💬 Engagement', icon: '💬', defaultName: '소통/댓글 관리 Agent' },
        { value: 'compliance', label: '⚖️ Compliance', icon: '⚖️', defaultName: '심의/규정 준수 Agent' },
        { value: 'evaluator', label: '📊 Evaluator', icon: '📊', defaultName: '성과 분석 Agent' },
        { value: 'manager', label: '👔 Manager', icon: '👔', defaultName: '총괄 매니저 Agent' },
        { value: 'kpi', label: '📈 KPI', icon: '📈', defaultName: '지표 관리 Agent' },
        { value: 'seo_watcher', label: '🔎 SEO Watcher', icon: '🔎', defaultName: 'SEO 모니터링 Agent' },
        { value: 'knowledge_curator', label: '📚 Knowledge Curator', icon: '📚', defaultName: '브랜드 지식 관리 Agent' }
    ];

    window.initAgentteams = function (user) {
        console.log("Initializing Agent Team Templates Page...");

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        templates = [];
        filteredTemplates = [];

        loadTemplates();
        loadRuntimeProfiles();
        setupEventListeners();
    };

    function setupEventListeners() {
        const searchInput = document.getElementById("agentteam-search");
        const statusFilter = document.getElementById("filter-status");
        const createBtn = document.getElementById("add-agentteam-btn");
        const modalCloseBtn = document.getElementById("agentteam-modal-close");
        const modalCancelBtn = document.getElementById("agentteam-modal-cancel");
        const wizardNextBtn = document.getElementById("wizard-next");
        const wizardPrevBtn = document.getElementById("wizard-prev");
        const addRoleBtn = document.getElementById("add-role-btn");

        if (searchInput) searchInput.addEventListener("input", handleFilters);
        if (statusFilter) statusFilter.addEventListener("change", handleFilters);

        if (addRoleBtn) {
            addRoleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                addRole();
            });
        }

        // Direct binding for Create Button
        if (createBtn) {
            const newBtn = createBtn.cloneNode(true);
            createBtn.parentNode.replaceChild(newBtn, createBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openWizard();
            });
        }

        // Modal Controls
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeWizard);
        if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeWizard);

        if (wizardNextBtn) {
            wizardNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleNextStep();
            });
        }

        if (wizardPrevBtn) {
            wizardPrevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handlePrevStep();
            });
        }
    }

    // --- Wizard Logic ---

    // --- Wizard Logic ---

    function openWizard() {
        console.log("Opening Template Wizard...");

        // Try to load from cache
        const cached = loadWizardStateFromCache();
        if (cached && confirm('이전에 작성 중이던 설정이 있습니다. 이어서 진행하시겠습니까?')) {
            wizardData = cached;
            currentStep = wizardData.step || 1; // Restore step if saved, or default to 1
        } else {
            // Start fresh
            currentStep = 1;

            // Initialize with ALL roles selected by default
            const initialRoles = ROLE_TYPES.map(t => ({
                name: t.defaultName,
                type: t.value,
                is_required: true,
                default_active: true,
                defaultRuntimeProfileId: '',
                behaviourPackId: null
            }));

            wizardData = {
                name: '',
                description: '',
                targetChannel: null,
                roles: initialRoles,
                status: 'active',
                channelCredentials: {}
            };

            // Clear cache
            sessionStorage.removeItem(CACHE_KEY);
        }

        const form = document.getElementById('agentteam-form');
        const modal = document.getElementById('agentteam-modal');

        if (!form || !modal) return;

        form.reset();
        updateWizardUI();

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('open'), 10);

        renderRoleSelection();
        loadChannels();

        // Pre-load runtime profiles when wizard opens
        loadRuntimeProfiles().then(() => {
            console.log("Runtime Profiles pre-loaded:", runtimeProfiles.length);
        });
    }

    function closeWizard() {
        const modal = document.getElementById('agentteam-modal');
        modal.classList.remove('open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    function updateWizardUI() {
        // Update Header
        document.getElementById('wizard-step-num').textContent = currentStep;
        const titles = { 1: 'Basic Info', 2: 'Role Configuration', 3: 'Runtime Profile', 4: 'Review & Save' };
        document.getElementById('wizard-step-title').textContent = titles[currentStep];

        // Update Progress Bar
        const progress = (currentStep / 4) * 100;
        document.getElementById('wizard-progress').style.width = `${progress}%`;

        // Show/Hide Steps
        document.getElementById('step-1').style.display = currentStep === 1 ? 'block' : 'none';
        document.getElementById('step-2').style.display = currentStep === 2 ? 'block' : 'none';
        document.getElementById('step-3').style.display = currentStep === 3 ? 'block' : 'none';
        document.getElementById('step-4').style.display = currentStep === 4 ? 'block' : 'none';

        // Update Buttons
        const prevBtn = document.getElementById('wizard-prev');
        const nextBtn = document.getElementById('wizard-next');

        prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
        nextBtn.textContent = currentStep === 4 ? 'Create Template' : 'Next Step';
    }

    function loadRuntimeProfiles() {
        console.log("Loading Runtime Profiles...");
        return db.collection('runtimeProfiles').where('status', '==', 'active').get()
            .then(snapshot => {
                runtimeProfiles = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Map role_type to normalized engine type for compatibility
                    // The new schema uses 'role_type', legacy used 'engine_type'
                    const engineType = data.role_type || data.engine_type || data.engine || data.type || 'unknown';

                    runtimeProfiles.push({
                        id: doc.id,
                        ...data,
                        _normalized_engine_type: engineType
                    });
                });

                if (runtimeProfiles.length > 0) {
                    console.log("First Profile Data Sample:", runtimeProfiles[0]);
                }

                console.log(`Loaded ${runtimeProfiles.length} active runtime profiles.`);
                // Log unique engine types found
                const engineTypes = [...new Set(runtimeProfiles.map(p => p._normalized_engine_type))];
                console.log("Available Role Types (Normalized):", engineTypes);
            })
            .catch(err => console.error("Error loading runtime profiles:", err));
    }

    function loadChannels() {
        const selectElement = document.getElementById('channel-select');
        if (!selectElement) return;

        db.collection('channelProfiles')
            .get()
            .then(snapshot => {
                const channels = [];
                snapshot.forEach(doc => {
                    channels.push({ id: doc.id, ...doc.data() });
                });

                channels.sort((a, b) => a.name.localeCompare(b.name));

                // Clear existing options except the first one
                selectElement.innerHTML = '<option value="">-- Select a channel --</option>';

                channels.forEach(channel => {
                    const slug = channel.slug || channel.channel_type;
                    const option = document.createElement('option');
                    option.value = JSON.stringify({ id: channel.id, name: channel.name, slug: slug, icon: channel.icon || '📺' });
                    option.textContent = `${channel.icon || '📺'} ${channel.name}`;

                    // Restore selection if exists
                    if (wizardData.targetChannel?.id === channel.id) {
                        option.selected = true;
                    }

                    selectElement.appendChild(option);
                });

                // Add change event listener
                selectElement.addEventListener('change', function () {
                    if (this.value) {
                        const channelData = JSON.parse(this.value);
                        selectTargetChannel(channelData.id, channelData.name, channelData.slug, channelData.icon);
                    } else {
                        wizardData.targetChannel = null;
                        saveWizardStateToCache();
                        updateTeamNamePrefix();
                    }
                });
            })
            .catch(error => {
                console.error("Error loading channels:", error);
                selectElement.innerHTML = '<option value="">Error loading channels</option>';
            });
    }

    window.selectTargetChannel = function (id, name, slug, icon) {
        wizardData.targetChannel = { id, name, slug, icon };
        saveWizardStateToCache();
        updateTeamNamePrefix();
    };

    function updateTeamNamePrefix() {
        const teamNameInput = document.getElementById('team-name');
        if (!teamNameInput) return;

        const currentValue = teamNameInput.value;

        // Remove any existing prefix
        const withoutPrefix = currentValue.replace(/^\[.*?\]\s*/, '');

        // Add new prefix if channel is selected
        if (wizardData.targetChannel && wizardData.targetChannel.name) {
            teamNameInput.value = `[${wizardData.targetChannel.name}] ${withoutPrefix}`.trim();
        } else {
            teamNameInput.value = withoutPrefix;
        }
    }

    window.updateChannelCredential = function (key, value) {
        wizardData.channelCredentials[key] = value;
        saveWizardStateToCache();
    };

    function renderRoleSelection() {
        const list = document.getElementById('wizard-roles-list');
        if (!list) return;

        list.innerHTML = ROLE_TYPES.map((roleType, index) => {
            const roleData = wizardData.roles.find(r => r.type === roleType.value);
            const isSelected = !!roleData;

            // If selected, use stored values, otherwise use defaults
            const roleName = roleData ? roleData.name : roleType.defaultName;
            const isRequired = roleData ? roleData.is_required : true;
            const isActive = roleData ? roleData.default_active : true;

            return `
            <div class="role-item-row" style="display: grid; grid-template-columns: 40px 1.5fr 1.5fr 80px 80px; gap: 12px; align-items: center; padding: 10px 12px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div style="text-align: center;">
                    <input type="checkbox" ${isSelected ? 'checked' : ''}
                        onchange="toggleRole('${roleType.value}', this.checked)"
                        style="transform: scale(1.2); cursor: pointer;">
                </div>
                <div style="display: flex; align-items: center; gap: 8px; opacity: ${isSelected ? 1 : 0.5};">
                    <span style="font-size: 13px; color: rgba(255,255,255,0.9);">${roleType.label}</span>
                </div>
                <div>
                    <input type="text" class="admin-form-input"
                        value="${roleName}"
                        ${!isSelected ? 'disabled' : ''}
                        onchange="updateRoleData('${roleType.value}', 'name', this.value)"
                        style="padding: 4px 8px; font-size: 13px; height: 30px;">
                </div>
                <div style="text-align: center;">
                    <input type="checkbox" ${isRequired ? 'checked' : ''}
                        ${!isSelected ? 'disabled' : ''}
                        onchange="updateRoleData('${roleType.value}', 'is_required', this.checked)"
                        style="cursor: pointer;">
                </div>
                <div style="text-align: center;">
                    <input type="checkbox" ${isActive ? 'checked' : ''}
                        ${!isSelected ? 'disabled' : ''}
                        onchange="updateRoleData('${roleType.value}', 'default_active', this.checked)"
                        style="cursor: pointer;">
                </div>
            </div>
        `}).join('');
    }

    window.toggleRole = function (type, checked) {
        if (checked) {
            const roleType = ROLE_TYPES.find(t => t.value === type);
            if (roleType && !wizardData.roles.some(r => r.type === type)) {
                wizardData.roles.push({
                    name: roleType.defaultName,
                    type: roleType.value,
                    is_required: true,
                    default_active: true,
                    defaultRuntimeProfileId: '',
                    behaviourPackId: null
                });
            }
        } else {
            wizardData.roles = wizardData.roles.filter(r => r.type !== type);
        }
        renderRoleSelection(); // Re-render to update disabled states
    };

    window.updateRoleData = function (type, field, value) {
        const roleIndex = wizardData.roles.findIndex(r => r.type === type);
        if (roleIndex !== -1) {
            wizardData.roles[roleIndex][field] = value;
        }
    };

    window.toggleAllRoles = function (checked) {
        if (checked) {
            wizardData.roles = ROLE_TYPES.map(t => ({
                name: t.defaultName,
                type: t.value,
                is_required: true,
                default_active: true,
                defaultRuntimeProfileId: '',
                behaviourPackId: null
            }));
        } else {
            wizardData.roles = [];
        }
        renderRoleSelection();
    };

    async function renderRuntimeAutoAssignment() {
        const list = document.getElementById('wizard-runtime-auto-list');
        if (!list) return;

        console.log("[AgentTeamWizard] Rendering auto-assigned runtime configurations...");
        console.log("[AgentTeamWizard] Current Roles:", wizardData.roles.map(r => r.type));

        if (wizardData.roles.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No roles selected. Please go back and select roles.</div>';
            return;
        }

        // Show loading state
        list.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">🔄 Resolving runtime configurations...</div>';

        try {
            // Resolve runtime config for each role
            const resolvedRoles = await Promise.all(
                wizardData.roles.map(async (role) => {
                    try {
                        const config = await resolveRuntimeConfig({
                            role_type: role.type,
                            language: role.language || 'global',
                            tier: role.tier || 'balanced'
                        });

                        // Store resolved config in role
                        role.runtime_config = config;

                        return { role, config, success: true };
                    } catch (error) {
                        console.error(`[AgentTeamWizard] Failed to resolve config for ${role.type}:`, error);
                        return { role, error: error.message, success: false };
                    }
                })
            );

            // Render resolved configs
            list.innerHTML = resolvedRoles.map(({ role, config, error, success }) => {
                const roleType = ROLE_TYPES.find(t => t.value === role.type);

                if (!success) {
                    return `
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">${roleType?.icon || '🤖'}</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #fff;">${role.name}</div>
                                <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${roleType?.label}</div>
                            </div>
                        </div>
                        <div style="margin-top: 12px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px;">
                            <div style="color: #ef4444; font-size: 12px;">❌ Resolution Failed: ${error}</div>
                        </div>
                    </div>
                    `;
                }

                return `
                <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border: 1px solid rgba(96, 165, 250, 0.2);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                        <span style="font-size: 20px;">${roleType?.icon || '🤖'}</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #fff;">${role.name}</div>
                            <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${roleType?.label}</div>
                        </div>
                        ${role.is_required ? '<span style="font-size: 10px; background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 2px 6px; border-radius: 4px;">Required</span>' : ''}
                    </div>

                    <div style="background: rgba(15, 23, 42, 0.6); padding: 12px; border-radius: 6px; border: 1px solid rgba(96, 165, 250, 0.1);">
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; font-size: 13px;">
                            <div style="color: rgba(255,255,255,0.5);">Provider:</div>
                            <div style="color: #60a5fa; font-weight: 500;">${config.provider}</div>

                            <div style="color: rgba(255,255,255,0.5);">Model:</div>
                            <div style="color: #fbbf24; font-weight: 500;">${config.model_id}</div>

                            <div style="color: rgba(255,255,255,0.5);">Tier:</div>
                            <div style="color: #22c55e;">${config.resolved_tier}</div>

                            <div style="color: rgba(255,255,255,0.5);">Language:</div>
                            <div style="color: rgba(255,255,255,0.7);">${config.resolved_language}</div>

                            <div style="color: rgba(255,255,255,0.5);">Temperature:</div>
                            <div style="color: rgba(255,255,255,0.7);">${config.temperature}</div>

                            ${config.max_tokens ? `
                            <div style="color: rgba(255,255,255,0.5);">Max Tokens:</div>
                            <div style="color: rgba(255,255,255,0.7);">${config.max_tokens}</div>
                            ` : ''}
                        </div>

                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05);">
                            <div style="font-size: 11px; color: rgba(255,255,255,0.4);">
                                Rule: <code style="color: #60a5fa;">${config.runtime_rule_id}</code>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');

            console.log("[AgentTeamWizard] ✅ All runtime configurations resolved successfully");

        } catch (error) {
            console.error("[AgentTeamWizard] Error resolving runtime configs:", error);
            list.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    ❌ Error resolving runtime configurations: ${error.message}
                </div>
            `;
        }
    }

    function handleNextStep() {
        if (currentStep === 1) {
            // Basic Info Validation
            if (!wizardData.targetChannel) {
                alert('채널을 선택해 주세요.');
                return;
            }

            let teamName = document.getElementById('team-name').value.trim();

            // If team name is empty or only has the prefix, use default name
            if (!teamName || teamName === `[${wizardData.targetChannel.name}]`) {
                teamName = `[${wizardData.targetChannel.name}] Team`;
            }

            // Ensure the team name has the channel prefix
            if (!teamName.startsWith(`[${wizardData.targetChannel.name}]`)) {
                teamName = `[${wizardData.targetChannel.name}] ${teamName}`;
            }

            wizardData.name = teamName;
            wizardData.description = document.getElementById('team-description').value;
            wizardData.status = document.getElementById('team-status').value;

            currentStep++;
            wizardData.step = currentStep;
            saveWizardStateToCache();
            updateWizardUI();
        } else if (currentStep === 2) {
            // Role Selection Validation
            if (wizardData.roles.length === 0) {
                alert('Please select at least one role');
                return;
            }
            // Auto-assign runtime configurations for selected roles
            currentStep++;
            wizardData.step = currentStep;
            saveWizardStateToCache();
            updateWizardUI();
            // Render auto-assigned configs (async)
            renderRuntimeAutoAssignment();
            return;
        } else if (currentStep === 3) {
            renderStep4();
            currentStep++;
            wizardData.step = currentStep;
            saveWizardStateToCache();
            updateWizardUI();
        } else if (currentStep === 4) {
            createTemplate();
        }
    }

    function handlePrevStep() {
        if (currentStep > 1) {
            currentStep--;
            wizardData.step = currentStep;
            saveWizardStateToCache();
            updateWizardUI();
        }
    }

    function renderStep4() {
        document.getElementById('review-name').textContent = wizardData.name;
        document.getElementById('review-desc').textContent = wizardData.description || 'No description';
        document.getElementById('review-count').textContent = wizardData.roles.length;

        // Update channel info display
        if (wizardData.targetChannel) {
            document.getElementById('selected-channel-icon').textContent = wizardData.targetChannel.icon || '📺';
            document.getElementById('selected-channel-title').textContent = `${wizardData.targetChannel.name} API Settings`;
            document.getElementById('selected-channel-name').textContent = `Channel: ${wizardData.targetChannel.slug}`;
        }

        // Render API Fields
        const apiForm = document.getElementById('channel-api-form');
        if (wizardData.targetChannel) {
            const slug = wizardData.targetChannel.slug;
            const fieldDefs = CHANNEL_API_FIELD_DEFS[slug] || CHANNEL_API_FIELD_DEFS['default'];

            apiForm.innerHTML = fieldDefs.map(def => {
                const value = wizardData.channelCredentials[def.key] || '';
                return `
                <div class="admin-form-group">
                    <label class="admin-form-label">${def.label} ${def.required ? '<span style="color: #ef4444;">*</span>' : ''}</label>
                    <input type="${def.type}" class="admin-form-input" 
                        value="${value}"
                        onchange="updateChannelCredential('${def.key}', this.value)"
                        placeholder="${def.helperText}"
                    >
                    <small style="color: rgba(255,255,255,0.5);">${def.helperText}</small>
                </div>
                `;
            }).join('');
        } else {
            apiForm.innerHTML = '<div style="color: #ef4444;">No channel selected.</div>';
        }

        const list = document.getElementById('review-agents-list');
        list.innerHTML = wizardData.roles.map(role => {
            const typeObj = ROLE_TYPES.find(t => t.value === role.type);
            return `
            <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 4px; align-items: center;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">${typeObj?.icon || '🤖'}</span>
                    <div>
                        <span style="font-weight: 600; display: block; color: #fff;">${role.name}</span>
                        <span style="font-size: 12px; color: rgba(255,255,255,0.5);">${typeObj?.label}</span>
                    </div>
                </div>
                <div style="text-align: right;">
                     <div style="font-size: 12px; color: #16e0bd; margin-bottom: 2px;" title="Runtime Profile ID">
                        ${role.defaultRuntimeProfileId || '<span style="color: rgba(255,255,255,0.3);">No Profile</span>'}
                    </div>
                    <div style="font-size: 11px; display: flex; gap: 8px; justify-content: flex-end;">
                        ${role.is_required ? '<span style="color: #f87171;">Required</span>' : '<span style="color: rgba(255,255,255,0.3);">Optional</span>'}
                        <span style="color: rgba(255,255,255,0.2);">|</span>
                        ${role.default_active ? '<span style="color: #22c55e;">Active</span>' : '<span style="color: rgba(255,255,255,0.3);">Inactive</span>'}
                    </div>
                </div>
            </div>
        `}).join('');
    }

    async function createTemplate() {
        // Validate API Credentials
        if (wizardData.targetChannel) {
            const slug = wizardData.targetChannel.slug;
            const fieldDefs = CHANNEL_API_FIELD_DEFS[slug] || CHANNEL_API_FIELD_DEFS['default'];

            for (const def of fieldDefs) {
                if (def.required && !wizardData.channelCredentials[def.key]) {
                    alert(`Please enter ${def.label} in Channel API Settings.`);
                    return;
                }
            }
        }

        const btn = document.getElementById('wizard-next');
        try {
            btn.disabled = true;
            btn.textContent = 'Saving Template...';

            // Stub for saving credentials
            console.log("[Stub] Will save channel credentials in future versions", {
                userId: firebase.auth().currentUser?.uid,
                slug: wizardData.targetChannel?.slug,
                credentialsKeys: Object.keys(wizardData.channelCredentials)
            });

            const timestamp = Date.now();
            const templateId = `agst_${timestamp}`; // Agent Set Template ID

            const templateData = {
                id: templateId,
                name: wizardData.name,
                description: wizardData.description,
                status: wizardData.status,
                version: '1.0.0',
                channelProfileId: wizardData.targetChannel?.id,
                channelType: wizardData.targetChannel?.slug,
                channelName: wizardData.targetChannel?.name,
                roles: wizardData.roles,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: firebase.auth().currentUser?.uid || 'system'
            };

            // Save to agentSetTemplates collection (Root Level or Project Level)
            // Using root level `agentSetTemplates` as these are reusable definitions
            await db.collection('agentSetTemplates').doc(templateId).set(templateData);

            alert('✅ Template created successfully!');
            sessionStorage.removeItem(CACHE_KEY); // Clear cache on success
            closeWizard();
        } catch (error) {
            console.error('Error creating template:', error);
            alert(`Error: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Template';
        }
    }


    // --- List Logic (Templates) ---

    function loadTemplates() {
        const tbody = document.getElementById("agentteams-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading templates...</td></tr>';

        // Listen to agentSetTemplates collection
        unsubscribe = db.collection('agentSetTemplates')
            .onSnapshot((snapshot) => {
                if (!document.getElementById("agentteams-table-body")) {
                    if (unsubscribe) unsubscribe();
                    return;
                }

                templates = [];
                snapshot.forEach(doc => {
                    templates.push({ id: doc.id, ...doc.data() });
                });

                templates.sort((a, b) => {
                    if (!a.updated_at) return 1;
                    if (!b.updated_at) return -1;
                    return b.updated_at.seconds - a.updated_at.seconds;
                });

                filteredTemplates = [...templates];
                handleFilters();
            }, (error) => {
                console.error("Error loading templates:", error);
                if (document.getElementById("agentteams-table-body")) {
                    document.getElementById("agentteams-table-body").innerHTML =
                        `<tr><td colspan="7" style="text-align: center; color: #ef4444;">Error: ${error.message}</td></tr>`;
                }
            });
    }

    function handleFilters() {
        const searchInput = document.getElementById("agentteam-search");
        const statusFilter = document.getElementById("filter-status");

        if (!searchInput || !statusFilter) return;

        const searchTerm = searchInput.value.toLowerCase();
        const selectedStatus = statusFilter.value;

        filteredTemplates = templates.filter(tpl => {
            const matchesSearch = tpl.id?.toLowerCase().includes(searchTerm) ||
                tpl.name?.toLowerCase().includes(searchTerm);
            const matchesStatus = selectedStatus === 'all' || tpl.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById("agentteams-table-body");
        if (!tbody) return;

        if (filteredTemplates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No templates found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredTemplates.map(tpl => {
            const roleCount = tpl.roles ? tpl.roles.length : 0;

            return `
            <tr style="cursor: pointer;" onclick="window.viewTemplateDetail('${tpl.id}')">
                <td>
                    <strong style="font-size: 14px;">${tpl.name}</strong>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;">
                        ID: ${tpl.id}
                    </div>
                </td>
                <td>
                    <span style="background: rgba(22, 224, 189, 0.2); padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                        v${tpl.version}
                    </span>
                </td>
                <td>
                    <span style="font-size: 13px; font-weight: 600;">
                        ${roleCount}
                    </span>
                </td>

                <td>${getStatusBadge(tpl.status || 'active')}</td>
                <td>${formatDate(tpl.updated_at)}</td>
                <td onclick="event.stopPropagation();">
                    <div style="display: flex; gap: 8px;">
                        <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.viewTemplateDetail('${tpl.id}'); return false;" 
                                class="admin-btn-secondary">
                            View
                        </button>
                        <button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.deleteTemplate('${tpl.id}'); return false;" 
                                class="admin-btn-secondary" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: rgba(239, 68, 68, 0.4);">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }

    function getStatusBadge(status) {
        const badges = {
            active: '<span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✅ Active</span>',
            draft: '<span style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">📝 Draft</span>',
            deprecated: '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">❌ Deprecated</span>'
        };
        return badges[status] || status;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatChannelType(channelType) {
        if (!channelType) return 'General';
        return channelType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    window.viewTemplateDetail = function (id) {
        // Call the template detail view function from template-detail.js
        if (typeof openTemplateDetail === 'function') {
            openTemplateDetail(id);
        } else {
            console.error('openTemplateDetail function not found. Make sure template-detail.js is loaded.');
            alert('Template detail view is not available.');
        }
    };

    window.deleteTemplate = async function (id) {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await db.collection('agentSetTemplates').doc(id).delete();
            alert('✅ Template deleted');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

})();
