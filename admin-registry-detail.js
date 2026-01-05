// admin-registry-detail.js
// Agent Registry Detail Page (Manages Versions of a Single Agent Class)

(function () {
    let currentAgentId = null;
    let currentAgent = null;
    let agentVersions = [];

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
        } catch (error) {
            console.error("Error loading agent:", error);
            alert(`Error: ${error.message}`);
        }
    }

    function renderAgentDetail() {
        document.getElementById('agent-name').textContent = currentAgent.name;
        document.getElementById('agent-version').textContent = `v${currentAgent.currentProductionVersion || '0.0.0'}`;
        document.getElementById('agent-status').innerHTML = getStatusBadge(currentAgent.status || 'active');
        document.getElementById('agent-description').textContent = currentAgent.description || 'No description';
        document.getElementById('agent-id').textContent = currentAgent.id;
        document.getElementById('agent-created').textContent = formatDate(currentAgent.createdAt);
        document.getElementById('agent-updated').textContent = "Category: " + (currentAgent.category || 'Uncategorized');
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
            <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid ${isProd ? '#22c55e' : 'rgba(255,255,255,0.1)'}; padding: 20px; border-radius: 8px; margin-bottom: 12px; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
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
                    <div style="display: flex; gap: 8px; flex-direction: column;">
                        <button type="button" class="btn-edit" onclick="openPromptEditor('${ver.id}')"
                                style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                            View / Fork
                        </button>
                         ${!isProd ? `
                        <button type="button" class="btn-promote" onclick="promoteToProduction('${ver.id}', '${ver.version}')"
                                style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                            🚀 Promote
                        </button>` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // --- Actions ---

    window.promoteToProduction = async function (versionId, versionStr) {
        if (!confirm(`Are you sure you want to promote v${versionStr} to PRODUCTION? \n\nThis will instantly affect all users relying on the 'Production' tag.`)) return;

        try {
            const batch = db.batch();

            // 1. Update Registry Pointer
            const regRef = db.collection('agentRegistry').doc(currentAgentId);
            batch.update(regRef, {
                currentProductionVersion: versionStr,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Mark this version as production
            const verRef = db.collection('agentVersions').doc(versionId);
            batch.update(verRef, {
                isProduction: true,
                status: 'production',
                promotedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();
            alert(`✅ v${versionStr} is now Live!`);
            loadAgentDetail();
        } catch (e) {
            console.error(e);
            alert('Error promoting: ' + e.message);
        }
    };

    window.openPromptEditor = function (sourceVersionId) {
        const version = agentVersions.find(v => v.id === sourceVersionId);
        if (!version) return;

        const modal = document.getElementById('edit-version-modal');
        document.getElementById('edit-modal-title').textContent = `Forking v${version.version}`;
        document.getElementById('edit-source-id').value = sourceVersionId;

        // Auto-increment version suggestion
        const parts = version.version.split('.').map(Number);
        parts[2] = (parts[2] || 0) + 1; // Bump patch
        document.getElementById('edit-next-version').value = parts.join('.');

        document.getElementById('edit-prompt').value = version.systemPrompt || '';
        document.getElementById('edit-model').value = version.config?.model || 'gpt-4o';
        document.getElementById('edit-temperature').value = version.config?.temperature || 0.7;
        document.getElementById('edit-changelog').value = '';

        modal.style.display = 'flex';
        void modal.offsetWidth;
        modal.classList.add('open');
    };

    window.closeEditModal = function () {
        const modal = document.getElementById('edit-version-modal');
        modal.classList.remove('open');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    };

    window.saveNewVersion = async function () {
        const nextVersion = document.getElementById('edit-next-version').value.trim();
        const changelog = document.getElementById('edit-changelog').value.trim();
        const prompt = document.getElementById('edit-prompt').value;
        const model = document.getElementById('edit-model').value;
        const temp = parseFloat(document.getElementById('edit-temperature').value);

        if (!nextVersion) return alert("Version number is required");
        if (!changelog) return alert("Changelog is required");

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
                config: { model: model, temperature: temp },
                systemPrompt: prompt,
                changelog: changelog,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                ancestorId: document.getElementById('edit-source-id').value
            });

            alert(`✅ Draft v${nextVersion} saved!`);
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
            deprecated: '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">❌ Deprecated</span>'
        };
        return badges[status] || status;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

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

})();
