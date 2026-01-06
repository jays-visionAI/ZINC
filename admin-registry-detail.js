// admin-registry-detail.js
// Agent Registry Detail Page (Manages Versions of a Single Agent Class)

(function () {
    let currentAgentId = null;
    let currentAgent = null;
    let agentVersions = [];
    let compareMode = false;
    let selectedVersions = [];

    // Initialize
    window.initRegistryDetail = function (user) {
        console.log("Initializing Agent Registry Detail Page...");

        // Extract Agent ID from hash: #registry-detail/AGENT_ID
        const hash = window.location.hash;
        const match = hash.match(/registry-detail\/(.+)/);

        if (!match) {
            console.error("No Agent ID in URL");
            return;
        }

        currentAgentId = match[1];
        console.log("Extracted Agent ID:", currentAgentId);
        loadAgentDetail();
    };

    async function loadAgentDetail() {
        console.log("Starting loadAgentDetail for ID:", currentAgentId);
        try {
            // 1. Load Agent Master Record
            const agentDoc = await db.collection('agentRegistry').doc(currentAgentId).get();

            if (!agentDoc.exists) {
                console.error("Agent document does not exist!");
                alert('Agent not found');
                window.location.hash = 'registry';
                return;
            }

            currentAgent = { id: agentDoc.id, ...agentDoc.data() };
            console.log("Current Agent Data:", currentAgent);

            // 2. Load Versions
            const versionsSnapshot = await db.collection('agentVersions')
                .where('agentId', '==', currentAgentId)
                .orderBy('createdAt', 'desc')
                .get();

            agentVersions = [];
            versionsSnapshot.forEach(doc => {
                agentVersions.push({ id: doc.id, ...doc.data() });
            });

            // Sort versions semantically just in case
            agentVersions.sort((a, b) => compareVersions(b.version, a.version));

            renderAgentDetail();
            renderVersions();

            // Automatically show Agent Logic on load
            const autoLoadLogic = () => {
                // Stop retry loop if we are no longer on the registry-detail page
                if (!window.location.hash.includes('registry-detail')) return;

                const selector = document.getElementById('source-file-selector');
                const prodVer = agentVersions.find(v => v.isProduction) || agentVersions[0];

                if (typeof openSourceViewer === 'function' && selector && prodVer) {
                    console.log("[AutoLoad] Starting initial view rendering...");
                    openSourceViewer();
                    selector.value = 'blueprint';
                    loadSourceFile();

                    // Visualization
                    if (typeof visualizeProcedure === 'function') {
                        visualizeProcedure(prodVer.id);
                    }
                } else if (!prodVer) {
                    setTimeout(autoLoadLogic, 100);
                }
            };
            autoLoadLogic();
        } catch (error) {
            console.error("Error loading agent:", error);
            alert(`Error: ${error.message}`);
        }
    }

    function renderAgentDetail() {
        const nameEl = document.getElementById('agent-name');
        const versionEl = document.getElementById('agent-version');
        const statusEl = document.getElementById('agent-status');
        const descEl = document.getElementById('agent-description');
        const idEl = document.getElementById('agent-id');
        const createdEl = document.getElementById('agent-created');
        const updatedEl = document.getElementById('agent-updated');

        if (!nameEl) {
            // Stop retry loop if we are no longer on the registry-detail page
            if (!window.location.hash.includes('registry-detail')) {
                console.log('[RegistryDetail] Stopped retry loop as page changed.');
                return;
            }
            console.error('[RegistryDetail] Required DOM elements not found, retrying in 100ms...');
            setTimeout(renderAgentDetail, 100);
            return;
        }

        nameEl.textContent = currentAgent.name;
        if (versionEl) versionEl.textContent = `v${currentAgent.currentProductionVersion || '0.0.0'}`;
        if (statusEl) statusEl.innerHTML = getStatusBadge(currentAgent.status || 'active');
        if (descEl) descEl.textContent = currentAgent.description || 'No description';
        if (idEl) idEl.textContent = currentAgent.id;
        if (createdEl) createdEl.textContent = formatDate(currentAgent.createdAt);
        if (updatedEl) updatedEl.textContent = "Category: " + (currentAgent.category || 'Uncategorized');

        // Populate source file selector based on agent's sourceFiles
        populateSourceFileSelector(currentAgent.sourceFiles || []);
    }

    // Populate source file dropdown dynamically
    function populateSourceFileSelector(sourceFiles) {
        const selector = document.getElementById('source-file-selector');
        if (!selector) return;

        // Clear existing options
        selector.innerHTML = '';

        // Always add Blueprint option first
        selector.innerHTML = `
            <option value="">불러올 정보를 선택하세요...</option>
            <option value="blueprint" style="font-weight: bold;">📜 에이전트 설계 데이터 (JSON)</option>
            <optgroup label="시스템 실행 엔진 (System)">
        `;

        if (sourceFiles.length > 0) {
            // Display exactly the source files defined for this agent as per the Registry design
            sourceFiles.forEach((filePath) => {
                const fileName = filePath.split('/').pop();
                const description = getSourceFileDescription(filePath);
                selector.innerHTML += `<option value="${filePath}">${fileName} ${description ? `(${description})` : ''}</option>`;
            });
        } else {
            // Fallback only if absolutely empty, but label it clearly as missing definition
            selector.innerHTML += `<option value="services/agent-execution-service.js">agent-execution-service.js (시스템 공통 엔진 - 기본값)</option>`;
        }

        selector.innerHTML += `</optgroup>`;
    }

    // Get human-readable description for known source files
    function getSourceFileDescription(filePath) {
        const descriptions = {
            'services/agent-execution-service.js': 'Execution Engine',
            'services/agent-runtime-service.js': 'Runtime Resolver',
            'studio.js': 'Studio UI Integration',
            'knowledgeHub.js': 'Knowledge Hub Integration',
            'scripts/pitchDeckAgent.js': 'Pitch Deck Logic',
            'scripts/llm-router.js': 'Model Router',
            'scripts/orchestrator-phase1.js': 'Orchestrator',
            'functions/generateImage.js': 'Image Generation',
            'utils-runtime-resolver.js': 'Profile Resolver'
        };
        return descriptions[filePath] || '';
    }

    function renderVersions() {
        const grid = document.getElementById('versions-grid');
        grid.innerHTML = '';

        if (agentVersions.length === 0) {
            grid.innerHTML = '<div style="color: #666; padding: 20px;">No versions found.</div>';
            return;
        }

        grid.innerHTML = agentVersions.map(ver => {
            const isProd = ver.isProduction || ver.status === 'production';
            const statusColor = isProd ? '#22c55e' : (ver.status === 'draft' ? '#fbbf24' : '#94a3b8');
            const statusLabel = isProd ? 'PRODUCTION' : (ver.status || 'DRAFT').toUpperCase();

            return `
            <div id="ver-card-${ver.id}" style="background: rgba(255, 255, 255, 0.05); border: 1px solid ${isProd ? '#22c55e' : 'rgba(255,255,255,0.1)'}; padding: 20px; border-radius: 8px; margin-bottom: 12px; position: relative; transition: all 0.3s ease;">
                ${compareMode ? `
                <div style="position: absolute; left: -40px; top: 50%; transform: translateY(-50%);">
                    <input type="checkbox" style="width: 20px; height: 20px; cursor: pointer;" 
                           onchange="toggleVersionSelection('${ver.id}')" ${selectedVersions.includes(ver.id) ? 'checked' : ''}>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1; cursor: pointer;" onclick="visualizeProcedure('${ver.id}')">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 18px; font-weight: 700; color: #fff;">
                                v${ver.version}
                            </span>
                             <span style="background: rgba(${isProd ? '34, 197, 94' : '148, 163, 184'}, 0.2); color: ${statusColor}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                                ${statusLabel}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 8px;">
                            ${ver.changelog || 'No changelog provided.'}
                        </div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.4);">
                            Model: <span style="color: #a78bfa;">${ver.config?.model || 'N/A'}</span> &bull; Temp: ${ver.config?.temperature || 'N/A'}
                        </div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px;">
                            ID: ${ver.id} &bull; ${formatDate(ver.createdAt)}
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; flex-direction: column;">
                        <button type="button" class="btn-edit" 
                                onclick="event.stopPropagation(); renderVersionDetail('${ver.id}')"
                                style="background: rgba(78, 205, 196, 0.2); color: #4ecdc4; border: 1px solid rgba(78, 205, 196, 0.4); padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                            <i class="fas fa-eye"></i> 로직 보기 / 편집
                        </button>
                        <button type="button" class="btn-download" 
                                onclick="event.stopPropagation(); downloadVersionLogic('${ver.id}')"
                                style="background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                            <i class="fas fa-download"></i> 다운로드 (JSON)
                        </button>
                        <button type="button" class="btn-edit-actual" onclick="event.stopPropagation(); openPromptEditor('${ver.id}')"
                                style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-edit"></i> Edit Prompt
                        </button>
                         ${!isProd ? `
                        <button type="button" class="btn-activate" onclick="event.stopPropagation(); promoteToProduction('${ver.id}', '${ver.version}')"
                                style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
                            ✅ Activate
                        </button>` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // --- Actions ---

    window.renderVersionDetail = function (versionId) {
        const version = agentVersions.find(v => v.id === versionId);
        if (!version) return;

        console.log(`[VersionDetail] Viewing version ${version.version}`);

        // 1. Update Logic Viewer
        const selector = document.getElementById('source-file-selector');
        if (selector) {
            selector.value = 'blueprint';

            // Generate config view for THIS specific version
            const code = generateBlueprint(currentAgent, version);
            document.getElementById('source-file-name').textContent = `${currentAgent.id}.config.v${version.version}.json`;

            const lines = code.split('\n');
            let html = '';
            lines.forEach((line, i) => {
                html += `<div style="display: flex; min-width: min-content;"><span style="display: inline-block; min-width: 50px; color: #484f58; text-align: right; padding-right: 16px; user-select: none; border-right: 1px solid #30363d; margin-right: 16px;">${i + 1}</span><span style="color: #c9d1d9; white-space: pre;">${escapeHtml(line) || ' '}</span></div>`;
            });
            document.getElementById('source-code-content').innerHTML = html;
            document.getElementById('source-line-count').textContent = `${lines.length} lines`;
        }

        // 2. Update Flow Canvas
        if (typeof visualizeProcedure === 'function') {
            visualizeProcedure(versionId);
        }

        // 3. Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.downloadVersionLogic = function (versionId) {
        const version = agentVersions.find(v => v.id === versionId);
        if (!version) return;

        const exportData = {
            agentId: currentAgent.id,
            name: currentAgent.name,
            version: version.version,
            description: currentAgent.description,
            timestamp: new Date().toISOString(),
            logic: {
                systemPrompt: version.systemPrompt,
                procedures: version.procedures,
                config: version.config
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentAgent.id.toLowerCase()}-v${version.version}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    window.openSourceViewer = function () {
        const section = document.getElementById('source-code-section');
        if (section) section.style.display = 'block';
    };

    // Activate (Promote) a draft version to production
    window.promoteToProduction = async function (versionId, versionStr) {
        if (!confirm(`v${versionStr}을(를) Production으로 활성화하시겠습니까?\n\n이 작업은 즉시 적용되며 모든 사용자에게 영향을 미칩니다.`)) return;

        try {
            const batch = db.batch();

            // 1. Demote current production versions
            const prodVersions = agentVersions.filter(v => v.isProduction);
            prodVersions.forEach(pv => {
                const pvRef = db.collection('agentVersions').doc(pv.id);
                batch.update(pvRef, {
                    isProduction: false,
                    status: 'archived',
                    archivedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            // 2. Update Registry Pointer
            const regRef = db.collection('agentRegistry').doc(currentAgentId);
            batch.update(regRef, {
                currentProductionVersion: versionStr,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 3. Mark this version as production
            const verRef = db.collection('agentVersions').doc(versionId);
            batch.update(verRef, {
                isProduction: true,
                status: 'production',
                promotedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();
            alert(`✅ v${versionStr}이(가) 활성화되었습니다!`);
            loadAgentDetail();
        } catch (e) {
            console.error(e);
            alert('활성화 중 오류 발생: ' + e.message);
        }
    };

    // Current editing state
    let editingProcedures = [];

    window.openPromptEditor = function (sourceVersionId) {
        const version = agentVersions.find(v => v.id === sourceVersionId);
        if (!version) return;

        const modal = document.getElementById('edit-version-modal');
        document.getElementById('edit-modal-title').textContent = `Edit: ${currentAgent.name}`;
        document.getElementById('edit-modal-subtitle').textContent = `Forking from v${version.version}`;
        document.getElementById('edit-source-id').value = sourceVersionId;

        // Auto-increment version suggestion
        const parts = version.version.split('.').map(Number);
        parts[2] = (parts[2] || 0) + 1; // Bump patch
        document.getElementById('edit-next-version').value = parts.join('.');

        // Populate prompt
        document.getElementById('edit-prompt').value = version.systemPrompt || '';

        // Populate config
        document.getElementById('edit-model').value = version.config?.model || 'gpt-4o';
        document.getElementById('edit-temperature').value = version.config?.temperature || 0.7;
        document.getElementById('edit-max-tokens').value = version.config?.maxTokens || 4096;
        document.getElementById('edit-changelog').value = '';

        // Populate procedures
        editingProcedures = JSON.parse(JSON.stringify(version.procedures || []));
        renderProceduresEditor();

        // Reset to first tab
        switchEditTab('prompt');

        modal.style.display = 'flex';
        void modal.offsetWidth;
        modal.classList.add('open');
    };

    window.closeEditModal = function () {
        const modal = document.getElementById('edit-version-modal');
        modal.classList.remove('open');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
        editingProcedures = [];
    };

    // Edit Tab Switching
    window.switchEditTab = function (tabName) {
        // Update tab buttons
        document.querySelectorAll('.edit-tab').forEach(tab => {
            tab.style.color = 'rgba(255,255,255,0.6)';
            tab.style.borderBottomColor = 'transparent';
            tab.style.fontWeight = '400';
        });
        const activeTab = document.getElementById(`edit-tab-${tabName}`);
        if (activeTab) {
            activeTab.style.color = '#fff';
            activeTab.style.borderBottomColor = '#4ecdc4';
            activeTab.style.fontWeight = '600';
        }

        // Show/hide content
        document.querySelectorAll('.edit-content').forEach(content => {
            content.style.display = 'none';
        });
        const activeContent = document.getElementById(`edit-content-${tabName}`);
        if (activeContent) {
            activeContent.style.display = tabName === 'prompt' ? 'flex' : 'block';
        }
    };

    // Procedures Editor
    function renderProceduresEditor() {
        const container = document.getElementById('procedures-editor');
        if (!container) return;

        if (editingProcedures.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.4); background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <p>No procedures defined.</p>
                    <button class="admin-btn-secondary" onclick="addProcedureStep()">+ Add First Step</button>
                </div>
            `;
            return;
        }

        container.innerHTML = editingProcedures.map((proc, i) => `
            <div class="procedure-step" style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border-left: 4px solid ${proc.color || '#64748b'};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-weight: 600; color: #4ecdc4;">Step ${i + 1}</span>
                    <div style="display: flex; gap: 4px;">
                        ${i > 0 ? `<button class="admin-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="moveProcedureStep(${i}, -1)">↑</button>` : ''}
                        ${i < editingProcedures.length - 1 ? `<button class="admin-btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="moveProcedureStep(${i}, 1)">↓</button>` : ''}
                        <button class="admin-btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #f85149;" onclick="removeProcedureStep(${i})">✕</button>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="font-size: 11px; color: rgba(255,255,255,0.5);">Action Code</label>
                        <input type="text" class="admin-form-input" value="${proc.action || ''}" 
                            onchange="updateProcedure(${i}, 'action', this.value)"
                            style="font-size: 12px;" placeholder="e.g. analyze_data">
                    </div>
                    <div>
                        <label style="font-size: 11px; color: rgba(255,255,255,0.5);">Label</label>
                        <input type="text" class="admin-form-input" value="${proc.label || ''}"
                            onchange="updateProcedure(${i}, 'label', this.value)"
                            style="font-size: 12px;" placeholder="e.g. Analyze Data">
                    </div>
                </div>
                <div style="margin-top: 12px;">
                    <label style="font-size: 11px; color: rgba(255,255,255,0.5);">Description</label>
                    <input type="text" class="admin-form-input" value="${proc.description || ''}"
                        onchange="updateProcedure(${i}, 'description', this.value)"
                        style="font-size: 12px;" placeholder="Brief description of this step">
                </div>
                <div style="margin-top: 12px;">
                    <label style="font-size: 11px; color: rgba(255,255,255,0.5);">Color</label>
                    <input type="color" value="${proc.color || '#64748b'}"
                        onchange="updateProcedure(${i}, 'color', this.value)"
                        style="width: 50px; height: 30px; border: none; cursor: pointer;">
                </div>
            </div>
        `).join('');
    }

    window.addProcedureStep = function () {
        editingProcedures.push({
            step: editingProcedures.length + 1,
            action: 'new_action',
            label: 'New Step',
            description: '',
            color: '#64748b'
        });
        renderProceduresEditor();
    };

    window.removeProcedureStep = function (index) {
        if (confirm('Remove this step?')) {
            editingProcedures.splice(index, 1);
            // Re-number steps
            editingProcedures.forEach((p, i) => p.step = i + 1);
            renderProceduresEditor();
        }
    };

    window.moveProcedureStep = function (index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= editingProcedures.length) return;

        const temp = editingProcedures[index];
        editingProcedures[index] = editingProcedures[newIndex];
        editingProcedures[newIndex] = temp;

        // Re-number
        editingProcedures.forEach((p, i) => p.step = i + 1);
        renderProceduresEditor();
    };

    window.updateProcedure = function (index, field, value) {
        if (editingProcedures[index]) {
            editingProcedures[index][field] = value;
        }
    };

    // --- AI Assist Functions ---
    let aiSuggestion = null;

    window.openAiAssist = function () {
        document.getElementById('ai-current-agent').textContent = `${currentAgent.name} (v${document.getElementById('edit-next-version').value})`;
        document.getElementById('ai-modification-request').value = '';
        document.getElementById('ai-response-area').style.display = 'none';
        document.getElementById('ai-apply-btn').style.display = 'none';
        document.getElementById('ai-generate-btn').style.display = 'block';
        aiSuggestion = null;

        document.getElementById('ai-assist-modal').style.display = 'flex';
    };

    window.closeAiAssist = function () {
        document.getElementById('ai-assist-modal').style.display = 'none';
    };

    window.generateAiSuggestion = async function () {
        const request = document.getElementById('ai-modification-request').value.trim();
        if (!request) {
            alert('Please describe what changes you want to make.');
            return;
        }

        const modifyPrompt = document.getElementById('ai-modify-prompt').checked;
        const modifyProcedures = document.getElementById('ai-modify-procedures').checked;

        if (!modifyPrompt && !modifyProcedures) {
            alert('Please select at least one item to modify.');
            return;
        }

        const btn = document.getElementById('ai-generate-btn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;

        // Build context for AI
        const currentPrompt = document.getElementById('edit-prompt').value;
        const currentProceduresText = editingProcedures.map((p, i) =>
            `${i + 1}. ${p.label} (${p.action}): ${p.description}`
        ).join('\n');

        const systemMessage = `You are an AI Agent Designer. Help modify an AI agent's configuration based on the user's request.

Current Agent: ${currentAgent.name}
Category: ${currentAgent.category}
Description: ${currentAgent.description}

${modifyPrompt ? `Current System Prompt:
"""
${currentPrompt}
"""` : ''}

${modifyProcedures ? `Current Procedures:
${currentProceduresText || '(None)'}` : ''}

The user wants to make the following changes:
"${request}"

Provide your suggestions in this EXACT format:
${modifyPrompt ? `
=== SYSTEM PROMPT ===
[Your improved system prompt here]
` : ''}
${modifyProcedures ? `
=== PROCEDURES ===
1. [Action Code]: [Label] - [Description]
2. [Action Code]: [Label] - [Description]
...
` : ''}

Be specific and maintain the agent's core purpose while applying the requested changes.`;

        try {
            const response = await firebase.functions().httpsCallable('generateLLMResponse')({
                provider: 'openai',
                model: 'gpt-4o',
                systemPrompt: systemMessage,
                userMessage: `Please modify the agent based on this request: ${request}`,
                temperature: 0.7,
                source: 'agent_ai_assist'
            });

            if (response.data.success) {
                document.getElementById('ai-response-content').textContent = response.data.response;
                document.getElementById('ai-response-area').style.display = 'block';
                document.getElementById('ai-response-status').textContent = '✓ Generated successfully';
                document.getElementById('ai-apply-btn').style.display = 'block';

                // Store the suggestion for applying later
                aiSuggestion = {
                    raw: response.data.response,
                    modifyPrompt,
                    modifyProcedures
                };
            } else {
                throw new Error(response.data.error || 'Generation failed');
            }
        } catch (error) {
            console.error('AI generation error:', error);
            document.getElementById('ai-response-content').textContent = `Error: ${error.message}`;
            document.getElementById('ai-response-area').style.display = 'block';
            document.getElementById('ai-response-status').textContent = '✗ Failed';
            document.getElementById('ai-response-status').style.color = '#f85149';
        } finally {
            btn.innerHTML = '✨ Generate Suggestion';
            btn.disabled = false;
        }
    };

    window.applyAiSuggestion = function () {
        if (!aiSuggestion) return;

        const raw = aiSuggestion.raw;

        // Parse SYSTEM PROMPT section
        if (aiSuggestion.modifyPrompt) {
            const promptMatch = raw.match(/=== SYSTEM PROMPT ===([\s\S]*?)(?:=== PROCEDURES ===|$)/);
            if (promptMatch && promptMatch[1]) {
                const newPrompt = promptMatch[1].trim();
                document.getElementById('edit-prompt').value = newPrompt;
            }
        }

        // Parse PROCEDURES section
        if (aiSuggestion.modifyProcedures) {
            const procMatch = raw.match(/=== PROCEDURES ===([\s\S]*?)$/);
            if (procMatch && procMatch[1]) {
                const lines = procMatch[1].trim().split('\n').filter(l => l.trim());
                const newProcedures = [];

                lines.forEach((line, i) => {
                    // Parse: "1. action_code: Label - Description"
                    const match = line.match(/^\d+\.\s*\[?(\w+)\]?:\s*\[?([^\]-]+)\]?\s*-\s*(.+)$/);
                    if (match) {
                        newProcedures.push({
                            step: i + 1,
                            action: match[1].trim(),
                            label: match[2].trim(),
                            description: match[3].trim(),
                            color: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e'][i % 5]
                        });
                    }
                });

                if (newProcedures.length > 0) {
                    editingProcedures = newProcedures;
                    renderProceduresEditor();
                }
            }
        }

        closeAiAssist();
        alert('✅ AI suggestions applied! Review and modify as needed, then save.');
    };

    window.previewChanges = function () {
        // For now, just switch to prompt tab to show current state
        switchEditTab('prompt');
        alert('Preview: Check each tab to review your changes before saving.');
    };


    window.saveNewVersion = async function () {
        const nextVersion = document.getElementById('edit-next-version').value.trim();
        const changelog = document.getElementById('edit-changelog').value.trim();
        const prompt = document.getElementById('edit-prompt').value;
        const model = document.getElementById('edit-model').value;
        const temp = parseFloat(document.getElementById('edit-temperature').value);
        const maxTokens = parseInt(document.getElementById('edit-max-tokens')?.value) || 4096;

        if (!nextVersion) return alert("Version number is required");
        // Changelog is optional - auto-generate if empty
        const finalChangelog = changelog || `Updated to v${nextVersion}`;

        // Check if version exists (Quick check locally)
        if (agentVersions.find(v => v.version === nextVersion)) {
            if (!confirm(`Version v${nextVersion} already exists in the list (loaded). Create duplicate entry?`)) return;
        }

        const newDocId = `${currentAgentId}-v${nextVersion.replace(/\./g, '-')}`;

        try {
            const verRef = db.collection('agentVersions').doc(newDocId);
            await verRef.set({
                agentId: currentAgentId,
                version: nextVersion,
                isProduction: false, // Default to draft
                status: 'draft',
                config: {
                    model: model,
                    temperature: temp,
                    maxTokens: maxTokens
                },
                systemPrompt: prompt,
                procedures: editingProcedures, // Save procedures
                changelog: finalChangelog,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                ancestorId: document.getElementById('edit-source-id').value
            });

            alert(`✅ Draft v${nextVersion} saved with ${editingProcedures.length} procedures!`);
            closeEditModal();
            loadAgentDetail();

        } catch (e) {
            console.error(e);
            alert("Error saving version: " + e.message);
        }
    };

    // Helper Functions
    function getStatusBadge(status) {
        const badges = {
            active: '<span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✅ Active</span>',
            inactive: '<span style="background: rgba(148, 163, 184, 0.2); color: #94a3b8; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">⏸️ Inactive</span>',
            deprecated: '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">❌ Deprecated</span>'
        };
        return badges[status] || status;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // ═══════════════════════════════════════════════════════════════
    // 📥 BLUEPRINT DOWNLOAD
    // ═══════════════════════════════════════════════════════════════

    window.downloadBlueprint = function () {
        const prodVersion = agentVersions.find(v => v.isProduction) || agentVersions[0];
        if (!prodVersion) {
            alert('No version data available for blueprint generation.');
            return;
        }

        const blueprint = generateBlueprintForDownload(currentAgent, prodVersion);
        const filename = `${currentAgent.id.toLowerCase()}.blueprint.js`;

        // Create and download file
        const blob = new Blob([blueprint], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert(`✅ Downloaded: ${filename}`);
    };

    function generateBlueprintForDownload(agent, version) {
        const timestamp = new Date().toISOString();
        const procedures = version.procedures || [];
        const config = version.config || { model: 'deepseek-reasoner', temperature: 0.7 };
        const sourceFiles = agent.sourceFiles || [];

        return `/**
 * ═══════════════════════════════════════════════════════════════
 *  🤖 AGENT BLUEPRINT: ${agent.name}
 * ═══════════════════════════════════════════════════════════════
 * 
 *  ID:          ${agent.id}
 *  Version:     v${version.version || '1.0.0'} ${version.isProduction ? '(PRODUCTION)' : '(Draft)'}
 *  Category:    ${agent.category || 'Uncategorized'}
 *  Status:      ${agent.status || 'active'}
 *  
 *  Generated:   ${timestamp}
 *  
 *  ⚠️  This is a READ-ONLY blueprint exported from Agent Registry.
 *      Import this file to replicate the agent in another environment.
 * ═══════════════════════════════════════════════════════════════
 */

const AGENT_ID = "${agent.id}";
const AGENT_NAME = "${agent.name}";
const AGENT_CATEGORY = "${agent.category || 'Uncategorized'}";
const AGENT_VERSION = "${version.version || '1.0.0'}";

const EXECUTION_CONFIG = {
    model: "${config.model || 'deepseek-reasoner'}",
    temperature: ${config.temperature || 0.7},
    maxTokens: ${config.maxTokens || 4096},
    provider: "${config.provider || 'auto'}"
};

const SYSTEM_PROMPT = \`
${(version.systemPrompt || '(No prompt defined)').replace(/`/g, '\\`')}
\`;

const PROCEDURES = ${JSON.stringify(procedures, null, 4)};

const SOURCE_FILES = ${JSON.stringify(sourceFiles, null, 4)};

module.exports = {
    AGENT_ID,
    AGENT_NAME,
    AGENT_CATEGORY,
    AGENT_VERSION,
    EXECUTION_CONFIG,
    SYSTEM_PROMPT,
    PROCEDURES,
    SOURCE_FILES
};
`;
    }

    // ═══════════════════════════════════════════════════════════════
    // 📋 CLONE AGENT
    // ═══════════════════════════════════════════════════════════════

    window.openCloneModal = function () {
        const prodVersion = agentVersions.find(v => v.isProduction) || agentVersions[0];

        document.getElementById('clone-source-info').textContent = `${currentAgent.name} (v${prodVersion?.version || '?'})`;
        document.getElementById('clone-new-id').value = currentAgent.id + '-CLONE';
        document.getElementById('clone-new-name').value = currentAgent.name + ' (Clone)';
        document.getElementById('clone-category').value = currentAgent.category || 'Intelligence';
        document.getElementById('clone-description').value = currentAgent.description || '';

        document.getElementById('clone-agent-modal').style.display = 'flex';
    };

    window.closeCloneModal = function () {
        document.getElementById('clone-agent-modal').style.display = 'none';
    };

    window.executeClone = async function () {
        const newId = document.getElementById('clone-new-id').value.trim().toUpperCase();
        const newName = document.getElementById('clone-new-name').value.trim();
        const category = document.getElementById('clone-category').value;
        const description = document.getElementById('clone-description').value.trim();

        if (!newId) return alert('Agent ID is required');
        if (!newName) return alert('Agent Name is required');
        if (!/^[A-Z]+-[A-Z0-9-]+$/.test(newId)) return alert('Agent ID must be in format PREFIX-NAME (uppercase)');

        const prodVersion = agentVersions.find(v => v.isProduction) || agentVersions[0];

        try {
            const batch = db.batch();
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();

            // 1. Create new agent in Registry
            const regRef = db.collection('agentRegistry').doc(newId);
            batch.set(regRef, {
                id: newId,
                name: newName,
                category: category,
                description: description,
                status: 'active',
                currentProductionVersion: '1.0.0',
                sourceFiles: currentAgent.sourceFiles || [],
                clonedFrom: currentAgent.id,
                createdAt: timestamp,
                updatedAt: timestamp
            });

            // 2. Create initial version with cloned prompt/procedures
            const verRef = db.collection('agentVersions').doc(`${newId}-v1-0-0`);
            batch.set(verRef, {
                agentId: newId,
                version: '1.0.0',
                isProduction: true,
                status: 'production',
                config: prodVersion?.config || { model: 'deepseek-reasoner', temperature: 0.7 },
                systemPrompt: prodVersion?.systemPrompt || '',
                procedures: prodVersion?.procedures || [],
                changelog: `Cloned from ${currentAgent.id} v${prodVersion?.version || '?'}`,
                createdAt: timestamp
            });

            await batch.commit();

            alert(`✅ Successfully cloned!\n\nNew Agent: ${newName}\nID: ${newId}`);
            closeCloneModal();

            // Navigate to new agent
            window.location.hash = `registry-detail/${newId}`;

        } catch (error) {
            console.error('Clone error:', error);
            alert('Error cloning agent: ' + error.message);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // ⏪ VERSION ROLLBACK
    // ═══════════════════════════════════════════════════════════════

    window.rollbackToVersion = async function (versionId) {
        const version = agentVersions.find(v => v.id === versionId);
        if (!version) return alert('Version not found');

        if (version.isProduction) {
            return alert('This version is already in production.');
        }

        if (!confirm(`Rollback to v${version.version}?\n\nThis will make v${version.version} the production version.`)) {
            return;
        }

        try {
            const batch = db.batch();

            // 1. Demote current production versions
            const prodVersions = agentVersions.filter(v => v.isProduction);
            prodVersions.forEach(pv => {
                const pvRef = db.collection('agentVersions').doc(pv.id);
                batch.update(pvRef, {
                    isProduction: false,
                    status: 'archived',
                    archivedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            // 2. Promote selected version
            const verRef = db.collection('agentVersions').doc(versionId);
            batch.update(verRef, {
                isProduction: true,
                status: 'production',
                promotedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 3. Update registry
            const regRef = db.collection('agentRegistry').doc(currentAgentId);
            batch.update(regRef, {
                currentProductionVersion: version.version,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();

            alert(`✅ Rolled back to v${version.version}!`);
            loadAgentDetail();

        } catch (error) {
            console.error('Rollback error:', error);
            alert('Error during rollback: ' + error.message);
        }
    };

    // --- SCM & Visualization Action ---

    window.initCompareMode = function () {
        compareMode = !compareMode;
        selectedVersions = [];
        const btn = document.getElementById('compare-versions-btn');
        btn.textContent = compareMode ? 'Cancel Diff Mode' : 'Multi-Version Diff';
        btn.className = compareMode ? 'admin-btn-primary' : 'admin-btn-secondary';

        // Add padding to grid for checkboxes
        const grid = document.getElementById('versions-grid');
        grid.style.marginLeft = compareMode ? '40px' : '0px';

        renderVersions();
    };

    window.toggleVersionSelection = function (versionId) {
        const idx = selectedVersions.indexOf(versionId);
        if (idx > -1) {
            selectedVersions.splice(idx, 1);
        } else {
            if (selectedVersions.length >= 2) {
                alert("You can only compare up to 2 versions at once.");
                renderVersions(); // Re-render to uncheck
                return;
            }
            selectedVersions.push(versionId);
        }

        if (selectedVersions.length === 2) {
            openDiffViewer();
        }
    };

    window.openDiffViewer = function () {
        const vA = agentVersions.find(v => v.id === selectedVersions[0]);
        const vB = agentVersions.find(v => v.id === selectedVersions[1]);

        if (!vA || !vB) return;

        // Sort by version order for consistent left/right (Old/New)
        const sorted = [vA, vB].sort((a, b) => compareVersions(a.version, b.version));
        const oldVer = sorted[0];
        const newVer = sorted[1];

        // Update headers
        document.getElementById('diff-left-header').innerHTML = `<i class="fas fa-minus-circle"></i> v${oldVer.version} (Old)`;
        document.getElementById('diff-right-header').innerHTML = `<i class="fas fa-plus-circle"></i> v${newVer.version} (New)`;
        document.getElementById('diff-version-labels').textContent = `v${oldVer.version} ↔ v${newVer.version}`;

        // Parse and compare prompts line by line
        const oldLines = (oldVer.systemPrompt || '').split('\n');
        const newLines = (newVer.systemPrompt || '').split('\n');

        // Simple diff algorithm
        const { leftHtml, rightHtml, additions, deletions } = generateLineDiff(oldLines, newLines);

        document.getElementById('diff-left-content').innerHTML = leftHtml;
        document.getElementById('diff-right-content').innerHTML = rightHtml;
        document.getElementById('diff-additions').textContent = `+${additions} additions`;
        document.getElementById('diff-deletions').textContent = `-${deletions} deletions`;

        document.getElementById('diff-viewer-modal').style.display = 'flex';
        compareMode = false; // Reset mode
        selectedVersions = [];
        document.getElementById('compare-versions-btn').textContent = 'Multi-Version Diff';
        document.getElementById('compare-versions-btn').className = 'admin-btn-secondary';
        document.getElementById('versions-grid').style.marginLeft = '0px';
        renderVersions();
    };

    // Generate line-by-line diff with highlighting
    function generateLineDiff(oldLines, newLines) {
        let leftHtml = '';
        let rightHtml = '';
        let additions = 0;
        let deletions = 0;
        const maxLines = Math.max(oldLines.length, newLines.length);

        for (let i = 0; i < maxLines; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];
            const lineNum = i + 1;

            const lineNumStyle = 'display: inline-block; width: 40px; color: #484f58; text-align: right; padding-right: 12px; user-select: none;';

            if (oldLine === undefined) {
                // Addition (only in new)
                leftHtml += `<div style="background: #161b22; padding: 2px 12px;"><span style="${lineNumStyle}"></span><span style="color: #484f58;">~</span></div>`;
                rightHtml += `<div style="background: rgba(46, 160, 67, 0.15); padding: 2px 12px;"><span style="${lineNumStyle}">${lineNum}</span><span style="color: #3fb950;">+ </span><span style="color: #adbac7;">${escapeHtml(newLine)}</span></div>`;
                additions++;
            } else if (newLine === undefined) {
                // Deletion (only in old)
                leftHtml += `<div style="background: rgba(248, 81, 73, 0.15); padding: 2px 12px;"><span style="${lineNumStyle}">${lineNum}</span><span style="color: #f85149;">- </span><span style="color: #adbac7;">${escapeHtml(oldLine)}</span></div>`;
                rightHtml += `<div style="background: #161b22; padding: 2px 12px;"><span style="${lineNumStyle}"></span><span style="color: #484f58;">~</span></div>`;
                deletions++;
            } else if (oldLine !== newLine) {
                // Modified line
                leftHtml += `<div style="background: rgba(248, 81, 73, 0.1); padding: 2px 12px;"><span style="${lineNumStyle}">${lineNum}</span><span style="color: #f85149;">- </span><span style="color: #f0883e;">${escapeHtml(oldLine)}</span></div>`;
                rightHtml += `<div style="background: rgba(46, 160, 67, 0.1); padding: 2px 12px;"><span style="${lineNumStyle}">${lineNum}</span><span style="color: #3fb950;">+ </span><span style="color: #7ee787;">${escapeHtml(newLine)}</span></div>`;
                additions++;
                deletions++;
            } else {
                // Unchanged
                leftHtml += `<div style="padding: 2px 12px;"><span style="${lineNumStyle}">${lineNum}</span><span style="color: #484f58;">  </span><span style="color: #8b949e;">${escapeHtml(oldLine)}</span></div>`;
                rightHtml += `<div style="padding: 2px 12px;"><span style="${lineNumStyle}">${lineNum}</span><span style="color: #484f58;">  </span><span style="color: #8b949e;">${escapeHtml(newLine)}</span></div>`;
            }
        }

        return { leftHtml, rightHtml, additions, deletions };
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.closeDiffModal = function () {
        document.getElementById('diff-viewer-modal').style.display = 'none';
    };

    window.visualizeProcedure = function (versionId) {
        const ver = agentVersions.find(v => v.id === versionId);
        if (!ver) return;

        const canvas = document.getElementById('narrative-canvas');
        canvas.innerHTML = '';
        canvas.style.background = '#0f172a';
        canvas.style.flexDirection = 'column';
        canvas.style.padding = '20px';
        canvas.style.justifyContent = 'start';
        canvas.style.alignItems = 'center';

        // Use real procedures from Firestore, with fallback message
        let steps = ver.procedures || [];

        // Critical Fallback: If procedures are missing, show a "Tuning needed" state 
        // with a direct button to auto-generate them from the prompt.
        if (steps.length === 0) {
            canvas.innerHTML = `
                <div style="text-align: center; padding: 60px 40px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                    <i class="fas fa-search-nodes" style="font-size: 48px; color: #4ecdc4; margin-bottom: 20px; opacity: 0.5;"></i>
                    <p style="color: #fff; font-size: 16px; font-weight: 600; margin-bottom: 8px;">시각화된 실행 절차가 정의되지 않았습니다.</p>
                    <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;">
                        에이전트의 프롬프트를 분석하여 예상 동작 절차를 자동으로 시각화하고 튜닝을 시작할 수 있습니다.
                    </p>
                    <button class="admin-btn-primary" onclick="openPromptEditor('${ver.id}')" style="background: #4ecdc4; color: #000; font-weight: 700;">
                        <i class="fas fa-magic"></i> 프롬프트 기반 절차 자동 튜닝 시작
                    </button>
                </div>
            `;
            return;
        }

        let html = `<div style="display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%; max-width: 500px;">
            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px;">
                <span style="font-size: 14px; color: #4ecdc4; font-weight: 600;">Execution Flow for v${ver.version}</span>
                <span style="font-size: 12px; color: rgba(255,255,255,0.4);">${steps.length} steps</span>
            </div>
        `;

        steps.forEach((step, i) => {
            const stepNum = step.step || step.id || (i + 1);
            const action = step.action || 'unknown_action';
            const label = step.label || 'Unnamed Step';
            const description = step.description || '';
            const color = step.color || '#64748b';

            html += `
                <div style="display: flex; flex-direction: column; align-items: center; position: relative; width: 100%;">
                    <div style="background: rgba(255,255,255,0.03); border-left: 4px solid ${color}; padding: 16px 20px; border-radius: 8px; width: 100%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s ease;" 
                         onmouseover="this.style.background='rgba(255,255,255,0.06)'" 
                         onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <span style="background: ${color}; color: #fff; min-width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">${stepNum}</span>
                            <span style="font-size: 15px; font-weight: 600; color: #fff;">${label}</span>
                        </div>
                        ${description ? `<p style="margin: 0 0 0 38px; font-size: 12px; color: rgba(255,255,255,0.5);">${description}</p>` : ''}
                        <div style="margin: 8px 0 0 38px; display: inline-block;">
                            <code style="background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px; font-size: 11px; color: #a78bfa;">${action}</code>
                        </div>
                    </div>
                    ${i < steps.length - 1 ? `
                        <div style="display: flex; flex-direction: column; align-items: center; margin: 4px 0;">
                            <div style="width: 2px; height: 16px; background: linear-gradient(to bottom, ${color}, ${steps[i + 1]?.color || '#64748b'});"></div>
                            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${steps[i + 1]?.color || '#64748b'};"></div>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';
        canvas.innerHTML = html;

        // Highlight selected version card
        agentVersions.forEach(v => {
            const card = document.getElementById(`ver-card-${v.id}`);
            if (card) {
                card.style.background = (v.id === versionId) ? 'rgba(78, 205, 196, 0.1)' : 'rgba(255, 255, 255, 0.05)';
                card.style.borderColor = (v.id === versionId) ? '#4ecdc4' : (v.isProduction ? '#22c55e' : 'rgba(255,255,255,0.1)');
            }
        });
    };

    function compareVersions(v1, v2) {
        if (!v1 || !v2) return 0;
        const parts1 = v1.toString().split('.').map(Number);
        const parts2 = v2.toString().split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            if (parts1[i] > parts2[i]) return 1;
            if (parts1[i] < parts2[i]) return -1;
        }
        return 0;
    }

    // --- Source Code Viewer Functions ---

    window.openSourceCodeViewer = function () {
        document.getElementById('source-code-section').style.display = 'block';
        // Scroll to it
        document.getElementById('source-code-section').scrollIntoView({ behavior: 'smooth' });
    };

    window.closeSourceCodeViewer = function () {
        document.getElementById('source-code-section').style.display = 'none';
    };

    window.loadSourceFile = async function () {
        const selector = document.getElementById('source-file-selector');
        const filePath = selector.value;

        if (!filePath) {
            document.getElementById('source-file-name').textContent = 'No file selected';
            document.getElementById('source-code-content').innerHTML = '<code style="color: rgba(255,255,255,0.4);">Select a source file from the dropdown above to view the agent\'s execution logic.</code>';
            return;
        }

        // Special case: Blueprint generation
        if (filePath === 'blueprint') {
            showBlueprint();
            return;
        }

        document.getElementById('source-file-name').textContent = filePath;
        document.getElementById('source-code-content').innerHTML = '<code style="color: #4ecdc4;">데이터 읽는 중...</code>';

        try {
            const response = await fetch('/' + filePath);
            if (!response.ok) throw new Error('File not found');

            const code = await response.text();
            const lines = code.split('\n');

            document.getElementById('source-line-count').textContent = `${lines.length} lines`;

            // Render with line numbers
            let html = '';
            lines.forEach((line, i) => {
                const lineNum = i + 1;
                const escapedLine = escapeHtml(line);
                html += `<div style="display: flex; min-width: min-content;"><span style="display: inline-block; min-width: 50px; color: #484f58; text-align: right; padding-right: 16px; user-select: none; border-right: 1px solid #30363d; margin-right: 16px;">${lineNum}</span><span style="color: #c9d1d9; white-space: pre;">${escapedLine || ' '}</span></div>`;
            });

            document.getElementById('source-code-content').innerHTML = html;

        } catch (error) {
            console.error('Failed to load source file:', error);
            document.getElementById('source-code-content').innerHTML = `<code style="color: #f85149;">Error loading file: ${error.message}</code>`;
        }
    };

    // --- Agent Blueprint Generation ---

    window.showBlueprint = function () {
        // Get production version for this agent
        const prodVersion = agentVersions.find(v => v.isProduction) || agentVersions[0];
        if (!prodVersion) {
            document.getElementById('source-code-content').innerHTML = '<code style="color: #f85149;">No version data available to generate blueprint.</code>';
            return;
        }

        const blueprint = generateBlueprint(currentAgent, prodVersion);

        document.getElementById('source-file-name').textContent = `${currentAgent.id}.config.json (Auto-generated)`;
        document.getElementById('source-line-count').textContent = `${blueprint.split('\n').length} lines`;

        // Render with syntax highlighting
        const lines = blueprint.split('\n');
        let html = '';
        lines.forEach((line, i) => {
            const lineNum = i + 1;
            const highlightedLine = highlightBlueprintSyntax(line);
            html += `<div style="display: flex; min-width: min-content;"><span style="display: inline-block; min-width: 50px; color: #484f58; text-align: right; padding-right: 16px; user-select: none; border-right: 1px solid #30363d; margin-right: 16px;">${lineNum}</span><span style="color: #c9d1d9; white-space: pre;">${highlightedLine || ' '}</span></div>`;
        });

        document.getElementById('source-code-content').innerHTML = html;
    };

    function generateBlueprint(agent, version) {
        const timestamp = new Date().toISOString();
        const procedures = version.procedures || [];
        const config = version.config || { model: 'deepseek-reasoner', temperature: 0.7 };

        let blueprint = `/**
 * ═══════════════════════════════════════════════════════════════
 *  🤖 AGENT BLUEPRINT: ${agent.name}
 * ═══════════════════════════════════════════════════════════════
 * 
 *  ID:          ${agent.id}
 *  Version:     v${version.version || '1.0.0'} ${version.isProduction ? '(PRODUCTION)' : '(Draft)'}
 *  Category:    ${agent.category || 'Uncategorized'}
 *  Status:      ${agent.status || 'active'}
 *  
 *  Generated:   ${timestamp}
 *  
 *  ⚠️  This is a READ-ONLY blueprint generated from Registry data.
 *      To modify, edit via Admin UI > Agent Registry > Manage Versions
 * ═══════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────
// 📋 AGENT METADATA
// ─────────────────────────────────────────────────────────────────

const AGENT_ID = "${agent.id}";
const AGENT_NAME = "${agent.name}";
const AGENT_CATEGORY = "${agent.category || 'Uncategorized'}";
const AGENT_VERSION = "${version.version || '1.0.0'}";

// ─────────────────────────────────────────────────────────────────
// ⚙️ EXECUTION CONFIG
// ─────────────────────────────────────────────────────────────────

const EXECUTION_CONFIG = {
    model: "${config.model || 'deepseek-reasoner'}",
    temperature: ${config.temperature || 0.7},
    maxTokens: ${config.maxTokens || 4096},
    provider: "${config.provider || 'auto'}"
};

// ─────────────────────────────────────────────────────────────────
// 🧠 SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = \`
${(version.systemPrompt || '(No prompt defined)').replace(/`/g, '\\`')}
\`;

`;

        // Add Procedures section
        if (procedures.length > 0) {
            blueprint += `// ─────────────────────────────────────────────────────────────────
// 🔄 EXECUTION PROCEDURES (${procedures.length} steps)
// ─────────────────────────────────────────────────────────────────

const PROCEDURES = [
`;
            procedures.forEach((proc, i) => {
                blueprint += `    {
        step: ${proc.step || i + 1},
        action: "${proc.action || 'unknown'}",
        label: "${proc.label || 'Unnamed Step'}",
        description: "${proc.description || ''}"
    }${i < procedures.length - 1 ? ',' : ''}
`;
            });
            blueprint += `];

`;
        }

        // Add source files reference
        const sourceFiles = agent.sourceFiles || [];
        if (sourceFiles.length > 0) {
            blueprint += `// ─────────────────────────────────────────────────────────────────
// 📂 LINKED SOURCE FILES
// ─────────────────────────────────────────────────────────────────

const SOURCE_FILES = [
${sourceFiles.map(f => `    "${f}"`).join(',\n')}
];

`;
        }

        // Add execution hint
        blueprint += `// ─────────────────────────────────────────────────────────────────
// 🚀 EXECUTION ENTRY POINT
// ─────────────────────────────────────────────────────────────────

/**
 * This agent is executed by the AgentExecutionService.
 * 
 * Call Flow:
 * 1. AgentRuntimeService.resolveAgentPrompt("${agent.id}")
 * 2. AgentExecutionService._executeSubAgent(subAgent, context)
 * 3. LLM call with SYSTEM_PROMPT + user context
 * 
 * To test this agent:
 * - Go to Admin > Agent Playground
 * - Select "${agent.name}"
 * - Enter test input and run
 */

module.exports = {
    AGENT_ID,
    AGENT_NAME,
    EXECUTION_CONFIG,
    SYSTEM_PROMPT,
    PROCEDURES: ${procedures.length > 0 ? 'PROCEDURES' : '[]'},
    SOURCE_FILES: ${sourceFiles.length > 0 ? 'SOURCE_FILES' : '[]'}
};
`;

        return blueprint;
    }

    // Simple syntax highlighting for blueprint
    function highlightBlueprintSyntax(line) {
        let highlighted = escapeHtml(line);

        // Comments (green)
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/**')) {
            return `<span style="color: #7ee787;">${highlighted}</span>`;
        }

        // Keywords (purple)
        highlighted = highlighted.replace(/\b(const|let|var|function|module|exports|return|if|else)\b/g, '<span style="color: #d2a8ff;">$1</span>');

        // Strings (orange)
        highlighted = highlighted.replace(/"([^"]*)"/g, '<span style="color: #ffa657;">"$1"</span>');
        highlighted = highlighted.replace(/`([^`]*)`/g, '<span style="color: #ffa657;">`$1`</span>');

        // Numbers (cyan)
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span style="color: #79c0ff;">$1</span>');

        // Property names (light blue)
        highlighted = highlighted.replace(/(\w+):/g, '<span style="color: #79c0ff;">$1</span>:');

        return highlighted;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔄 AGENT STATUS TOGGLE (Activate/Deactivate)
    // ═══════════════════════════════════════════════════════════════
    window.toggleAgentStatus = async function () {
        if (!currentAgent) return;

        const currentStatus = currentAgent.status || 'active';
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const actionText = newStatus === 'active' ? '활성화' : '비활성화';

        if (!confirm(`이 에이전트를 ${actionText}하시겠습니까?\n\n에이전트: ${currentAgent.name}\n새 상태: ${newStatus.toUpperCase()}`)) {
            return;
        }

        try {
            await db.collection('agentRegistry').doc(currentAgentId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update local state
            currentAgent.status = newStatus;

            // Update UI
            const statusEl = document.getElementById('agent-status');
            if (statusEl) statusEl.innerHTML = getStatusBadge(newStatus);

            updateToggleButton(newStatus);

            alert(`✅ 에이전트가 ${actionText}되었습니다.`);
        } catch (error) {
            console.error('Error toggling status:', error);
            alert('상태 변경 실패: ' + error.message);
        }
    };

    function updateToggleButton(status) {
        const btn = document.getElementById('btn-toggle-status');
        const textSpan = document.getElementById('toggle-status-text');
        if (!btn || !textSpan) return;

        if (status === 'active') {
            textSpan.textContent = 'Deactivate';
            btn.style.background = 'rgba(245, 158, 11, 0.1)';
            btn.style.borderColor = 'rgba(245, 158, 11, 0.3)';
            btn.style.color = '#f59e0b';
        } else {
            textSpan.textContent = 'Activate';
            btn.style.background = 'rgba(34, 197, 94, 0.1)';
            btn.style.borderColor = 'rgba(34, 197, 94, 0.3)';
            btn.style.color = '#22c55e';
        }
    }

    // Initialize toggle button state when agent loads
    const originalRenderAgentDetail = renderAgentDetail;
    renderAgentDetail = function () {
        originalRenderAgentDetail();
        if (currentAgent) {
            updateToggleButton(currentAgent.status || 'active');
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // 🗑️ DELETE AGENT
    // ═══════════════════════════════════════════════════════════════
    window.confirmDeleteAgent = async function () {
        if (!currentAgent) return;

        const confirmText = prompt(
            `⚠️ 경고: 이 작업은 되돌릴 수 없습니다!\n\n` +
            `에이전트 "${currentAgent.name}"와 모든 버전 기록이 영구적으로 삭제됩니다.\n\n` +
            `삭제를 확인하려면 에이전트 ID를 정확히 입력하세요:\n${currentAgent.id}`
        );

        if (confirmText !== currentAgent.id) {
            if (confirmText !== null) {
                alert('ID가 일치하지 않습니다. 삭제가 취소되었습니다.');
            }
            return;
        }

        try {
            const batch = db.batch();

            // 1. Delete all versions
            const versionsSnapshot = await db.collection('agentVersions')
                .where('agentId', '==', currentAgentId)
                .get();

            versionsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 2. Delete the agent registry entry
            batch.delete(db.collection('agentRegistry').doc(currentAgentId));

            await batch.commit();

            alert(`✅ 에이전트 "${currentAgent.name}"가 삭제되었습니다.`);

            // Redirect to registry list
            window.location.hash = 'registry';
        } catch (error) {
            console.error('Error deleting agent:', error);
            alert('삭제 실패: ' + error.message);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // ✏️ RENAME AGENT
    // ═══════════════════════════════════════════════════════════════
    window.openRenameModal = function () {
        if (!currentAgent) return;

        document.getElementById('rename-agent-name').value = currentAgent.name || '';
        document.getElementById('rename-agent-description').value = currentAgent.description || '';

        const modal = document.getElementById('rename-agent-modal');
        modal.style.display = 'flex';
        void modal.offsetWidth;
        modal.classList.add('open');

        // Focus on name input
        setTimeout(() => {
            document.getElementById('rename-agent-name').focus();
            document.getElementById('rename-agent-name').select();
        }, 100);
    };

    window.closeRenameModal = function () {
        const modal = document.getElementById('rename-agent-modal');
        modal.classList.remove('open');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    };

    window.saveAgentRename = async function () {
        const newName = document.getElementById('rename-agent-name').value.trim();
        const newDescription = document.getElementById('rename-agent-description').value.trim();

        if (!newName) {
            alert('에이전트 이름을 입력해주세요.');
            return;
        }

        try {
            await db.collection('agentRegistry').doc(currentAgentId).update({
                name: newName,
                description: newDescription,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update local state
            currentAgent.name = newName;
            currentAgent.description = newDescription;

            // Update UI
            document.getElementById('agent-name').textContent = newName;
            document.getElementById('agent-description').textContent = newDescription;

            closeRenameModal();
            alert(`✅ 에이전트 정보가 수정되었습니다.\n\n새 이름: ${newName}`);
        } catch (error) {
            console.error('Error renaming agent:', error);
            alert('저장 실패: ' + error.message);
        }
    };

})();

