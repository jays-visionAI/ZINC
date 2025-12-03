// template-detail.js - Agent Team Template Detail View

(function () {
    // Check if already initialized
    if (window.templateDetailInitialized) return;
    window.templateDetailInitialized = true;

    // Use global db variable from firebase-config.js

    let currentTemplateId = null;
    let availableSubAgents = [];
    let currentUserRole = null;

    // Engine type icons mapping
    const ENGINE_ICONS = {
        planner: '🎯',
        creator_text: '✍️',
        creator_image: '🎨',
        creator_video: '🎬',
        engagement: '💬',
        compliance: '⚖️',
        evaluator: '📊',
        manager: '👔',
        kpi: '📈'
    };

    // Role type labels
    const ROLE_TYPE_LABELS = {
        planner: 'Planner',
        creator_text: 'Creator.Text',
        creator_image: 'Creator.Image',
        creator_video: 'Creator.Video',
        engagement: 'Engagement',
        compliance: 'Compliance',
        evaluator: 'Evaluator',
        manager: 'Manager',
        kpi: 'KPI'
    };

    // Channel type icons
    const CHANNEL_ICONS = {
        'multi-channel': '📱',
        'instagram': '📷',
        'x': '𝕏',
        'linkedin': '💼',
        'youtube': '▶️',
        'tiktok': '🎵',
        'blog': '📝'
    };

    /**
     * Open template detail modal
     * @param {string} templateId - Agent set template ID
     */
    async function openTemplateDetail(templateId) {
        currentTemplateId = templateId;

        // Check admin role
        if (!currentUserRole) {
            const user = firebase.auth().currentUser;
            if (user) {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        currentUserRole = userDoc.data().role;
                    }
                } catch (e) {
                    console.error("Error fetching user role:", e);
                }
            }
        }

        try {
            // Show modal
            const modal = document.getElementById('template-detail-modal');
            modal.classList.add('open');
            modal.style.display = 'flex';

            // Load template data
            await loadTemplateData(templateId);

        } catch (error) {
            console.error('Error opening template detail:', error);
            alert('Failed to load template details');
            closeTemplateDetail();
        }
    }

    /**
     * Load template data from Firestore
     * @param {string} templateId - Template ID
     */
    async function loadTemplateData(templateId) {
        try {
            // Fetch template document
            const templateDoc = await db.collection('agentSetTemplates').doc(templateId).get();

            if (!templateDoc.exists) {
                throw new Error('Template not found');
            }

            const template = templateDoc.data();

            // Helper for safe DOM update
            const setText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            };

            // Populate header
            setText('template-detail-title', template.name || 'Untitled Template');
            setText('template-detail-id', `ID: ${template.id}`);

            const statusBadge = document.getElementById('template-detail-status');
            if (statusBadge) {
                statusBadge.textContent = formatStatus(template.status);
                statusBadge.className = `badge ${getStatusBadgeClass(template.status)}`;
            }

            setText('template-detail-version', template.version || 'v1.0.0');

            // Populate template information
            setText('detail-name', template.name || 'Untitled');
            setText('detail-description', template.description || 'No description provided');
            setText('detail-version-text', template.version || 'v1.0.0');
            setText('detail-status-text', formatStatus(template.status));

            // Update status indicator
            const statusIndicator = document.querySelector('.status-indicator');
            statusIndicator.className = `status-indicator ${getStatusClass(template.status)}`;

            // Format dates
            setText('detail-created', formatDate(template.created_at));
            setText('detail-updated', formatDate(template.updated_at));

            // Get creator name (you might need to fetch from users collection)
            setText('detail-created-by', template.created_by || 'System');

            // Load roles
            await loadRoles(template.roles || []);

            // Load deployment stats
            await loadDeploymentStats(templateId);

        } catch (error) {
            console.error('Error loading template data:', error);
            throw error;
        }
    }

    /**
     * Load and render roles
     * @param {Array} roles - Array of role objects
     */
    async function loadRoles(roles) {
        const rolesList = document.getElementById('roles-list');
        document.getElementById('role-count').textContent = `(${roles.length})`;

        if (roles.length === 0) {
            rolesList.innerHTML = '<p class="text-muted">No sub-agents defined</p>';
            return;
        }

        rolesList.innerHTML = '';

        for (const role of roles) {
            const roleCard = document.createElement('div');
            roleCard.className = 'role-card sub-agent-card';

            const icon = ENGINE_ICONS[role.type] || '🤖';
            const typeLabel = ROLE_TYPE_LABELS[role.type] || role.type;

            // Mock metrics
            const mockLikes = Math.floor(Math.random() * 500) + 50;
            const mockRating = (4.0 + Math.random() * 1.0).toFixed(1);

            const deleteButton = currentUserRole === 'admin' ? `
                <button class="btn-remove-subagent" onclick="removeSubAgent('${role.name}')" title="Remove Sub-Agent">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            ` : '';

            // Resolve Runtime Config
            let runtimeSummaryHtml = '<span class="runtime-loading">Resolving runtime...</span>';
            let runtimeTooltip = '';

            try {
                if (typeof RuntimeResolver !== 'undefined' && typeof RuntimeResolver.resolveRuntimeConfig === 'function') {
                    // Use role properties or defaults
                    const config = await RuntimeResolver.resolveRuntimeConfig({
                        role_type: role.type,
                        language: role.language || 'global',
                        tier: role.tier || 'balanced'
                    });

                    const tierClass = config.resolved_tier === 'creative' ? 'text-purple' :
                        config.resolved_tier === 'precise' ? 'text-green' : 'text-blue';

                    // Format: Provider · Model · Tier · Language
                    const summaryText = `${config.provider} · ${config.model_id} · <span class="${tierClass}">${config.resolved_tier}</span> · ${config.resolved_language.toUpperCase()}`;

                    runtimeSummaryHtml = `
                        <div class="runtime-summary">
                            <span class="runtime-indicator">●</span>
                            <span class="runtime-text">${summaryText}</span>
                        </div>
                    `;

                    // Tooltip content
                    runtimeTooltip = `
                        <div class="runtime-tooltip-content">
                            <div><strong>Engine:</strong> ${role.type}</div>
                            <div><strong>Rule ID:</strong> ${config.runtime_rule_id}</div>
                            <div><strong>Provider:</strong> ${config.provider}</div>
                            <div><strong>Model:</strong> ${config.model_id}</div>
                            <div><strong>Tier:</strong> ${config.resolved_tier}</div>
                            <div><strong>Temp:</strong> ${config.temperature}</div>
                        </div>
                    `;
                } else {
                    runtimeSummaryHtml = '<span class="runtime-error">Runtime resolver not loaded</span>';
                }
            } catch (e) {
                console.error("Runtime resolution error:", e);
                runtimeSummaryHtml = '<span class="runtime-error">Runtime not configured</span>';
                runtimeTooltip = `<div class="runtime-tooltip-content">Error: ${e.message}</div>`;
            }

            roleCard.innerHTML = `
                <div class="sub-agent-header">
                    <div class="sub-agent-main">
                        <span class="role-icon">${icon}</span>
                        <div class="sub-agent-info">
                            <h4 class="role-name">${role.name}</h4>
                            <span class="role-type-badge">${typeLabel}</span>
                        </div>
                    </div>
                    <div class="sub-agent-toggle" style="display: flex; align-items: center; gap: 12px;">
                        <label class="switch">
                            <input type="checkbox" checked title="Toggle Active Status" onchange="toggleSubAgent(this)">
                            <span class="slider round"></span>
                        </label>
                        ${deleteButton}
                    </div>
                </div>
                
                <div class="sub-agent-runtime-section">
                    ${runtimeSummaryHtml}
                    <div class="runtime-info-icon">
                        ℹ️
                        <div class="runtime-tooltip">${runtimeTooltip}</div>
                    </div>
                </div>

                <div class="sub-agent-metrics">
                    <div class="metric-item" title="Total Likes">
                        <span class="metric-icon">❤️</span>
                        <span class="metric-value">${mockLikes}</span>
                    </div>
                    <div class="metric-divider"></div>
                    <div class="metric-item" title="Rating">
                        <span class="metric-icon">⭐</span>
                        <span class="metric-value">${mockRating} / 5</span>
                    </div>
                </div>
            `;

            rolesList.appendChild(roleCard);
        }
    }

    /**
     * Load deployment statistics
     * @param {string} templateId - Template ID
     */
    async function loadDeploymentStats(templateId) {
        try {
            // Query all deployments using this template
            const deploymentsSnapshot = await db
                .collection('projectAgentTeamInstances')
                .where('templateId', '==', templateId)
                .get();

            const deployments = [];
            deploymentsSnapshot.forEach(doc => {
                deployments.push({ id: doc.id, ...doc.data() });
            });

            // Calculate stats
            const activeDeployments = deployments.filter(d => d.status === 'active').length;
            const totalDeployments = deployments.length;

            document.getElementById('active-deployments').textContent = activeDeployments;
            document.getElementById('total-deployments').textContent = totalDeployments;

            // Show recent deployments (last 5)
            renderRecentDeployments(deployments.slice(0, 5));

        } catch (error) {
            console.error('Error loading deployment stats:', error);
            document.getElementById('active-deployments').textContent = '0';
            document.getElementById('total-deployments').textContent = '0';
        }
    }

    /**
     * Render recent deployments list
     * @param {Array} deployments - Array of deployment objects
     */
    function renderRecentDeployments(deployments) {
        const container = document.getElementById('recent-deployments');

        if (deployments.length === 0) {
            container.innerHTML = '<p class="text-muted">No deployments yet</p>';
            return;
        }

        container.innerHTML = '';

        deployments.forEach(deployment => {
            const item = document.createElement('div');
            item.className = 'deployment-item';

            const statusClass = deployment.status === 'active' ? 'status-active' :
                deployment.status === 'paused' ? 'status-paused' : 'status-inactive';

            item.innerHTML = `
                <div class="deployment-info">
                    <span class="deployment-name">${deployment.name}</span>
                    <span class="deployment-status ${statusClass}">${formatStatus(deployment.status)}</span>
                </div>
                <span class="deployment-time">${formatRelativeTime(deployment.deployedAt)}</span>
            `;

            container.appendChild(item);
        });
    }

    /**
     * Close template detail modal
     */
    function closeTemplateDetail() {
        const modal = document.getElementById('template-detail-modal');
        modal.classList.remove('open');
        modal.style.display = 'none';
        currentTemplateId = null;
    }

    /**
     * Edit template
     */
    function editCurrentTemplate() {
        if (!currentTemplateId) return;

        // Close detail modal
        closeTemplateDetail();

        // Open edit modal (you'll need to implement this)
        console.log('Edit template:', currentTemplateId);
        alert('Edit functionality coming soon!');
    }

    /**
     * Duplicate template
     */
    async function duplicateCurrentTemplate() {
        if (!currentTemplateId) return;

        if (!confirm('Create a copy of this template?')) return;

        try {
            // Fetch original template
            const templateDoc = await db.collection('agentSetTemplates').doc(currentTemplateId).get();
            const template = templateDoc.data();

            // Create new template with copied data
            const newTemplateId = `agst_${Date.now()}`;
            const newTemplate = {
                ...template,
                id: newTemplateId,
                name: `${template.name} (Copy)`,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: firebase.auth().currentUser?.uid || 'system'
            };

            await db.collection('agentSetTemplates').doc(newTemplateId).set(newTemplate);

            alert('Template duplicated successfully!');
            closeTemplateDetail();

            // Reload the list (you'll need to implement this)
            if (typeof loadTemplates === 'function') {
                loadTemplates();
            }

        } catch (error) {
            console.error('Error duplicating template:', error);
            alert('Failed to duplicate template');
        }
    }

    /**
     * Delete template
     */
    async function deleteCurrentTemplate() {
        if (!currentTemplateId) return;

        if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) return;

        try {
            // Check if template is being used
            const deploymentsSnapshot = await db
                .collection('projectAgentTeamInstances')
                .where('templateId', '==', currentTemplateId)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (!deploymentsSnapshot.empty) {
                alert('Cannot delete template: It is currently being used by active deployments.');
                return;
            }

            // Delete template
            await db.collection('agentSetTemplates').doc(currentTemplateId).delete();

            alert('Template deleted successfully!');
            closeTemplateDetail();

            // Reload the list
            if (typeof loadTemplates === 'function') {
                loadTemplates();
            }

        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete template');
        }
    }

    /**
     * View all deployments
     */
    function viewAllDeployments() {
        if (!currentTemplateId) return;

        // Navigate to deployments page with filter
        console.log('View all deployments for:', currentTemplateId);
        alert('Deployments view coming soon!');
    }

    // Helper functions

    function formatStatus(status) {
        if (!status) return 'Unknown';
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'active': return 'badge-success';
            case 'draft': return 'badge-warning';
            case 'deprecated': return 'badge-danger';
            default: return 'badge-secondary';
        }
    }

    function getStatusClass(status) {
        switch (status) {
            case 'active': return 'status-active';
            case 'paused': return 'status-paused';
            case 'inactive': return 'status-inactive';
            default: return 'status-inactive';
        }
    }

    function formatChannelType(channelType) {
        if (!channelType) return 'Unknown';
        return channelType.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatRelativeTime(timestamp) {
        if (!timestamp) return 'N/A';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        const weeks = Math.floor(diff / 604800000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        if (weeks < 4) return `${weeks}w ago`;
        return formatDate(timestamp);
    }

    /**
     * Toggle sub-agent active status
     * @param {HTMLInputElement} checkbox - The toggle checkbox
     */
    function toggleSubAgent(checkbox) {
        const isActive = checkbox.checked;
        const roleCard = checkbox.closest('.sub-agent-card');
        const roleName = roleCard.querySelector('.role-name').textContent;

        console.log(`Sub-agent "${roleName}" toggled to ${isActive ? 'Active' : 'Inactive'}`);

        if (!isActive) {
            roleCard.style.opacity = '0.6';
        } else {
            roleCard.style.opacity = '1';
        }
    }

    /**
     * Open Add Sub-Agent Modal
     */
    async function openAddSubAgentModal() {
        const modal = document.getElementById('add-subagent-modal');
        modal.style.display = 'flex';

        // Fetch sub-agents if not loaded
        if (availableSubAgents.length === 0) {
            try {
                const snapshot = await db.collection('subAgentTemplates').where('status', '==', 'active').get();
                availableSubAgents = [];
                snapshot.forEach(doc => availableSubAgents.push({ id: doc.id, ...doc.data() }));

                // If no templates found, use mock data for demo
                if (availableSubAgents.length === 0) {
                    availableSubAgents = [
                        { id: 'sa_planner', name: 'Planner', type: 'planner', description: 'Strategic planning agent' },
                        { id: 'sa_writer', name: 'Copywriter', type: 'creator_text', description: 'Content generation agent' },
                        { id: 'sa_designer', name: 'Designer', type: 'creator_image', description: 'Image generation agent' },
                        { id: 'sa_scheduler', name: 'Scheduler', type: 'manager', description: 'Schedule management agent' },
                        { id: 'sa_analyst', name: 'Analyst', type: 'evaluator', description: 'Performance analysis agent' }
                    ];
                }
            } catch (error) {
                console.error("Error loading sub-agents:", error);
                // Fallback mock
                availableSubAgents = [
                    { id: 'sa_planner', name: 'Planner', type: 'planner', description: 'Strategic planning agent' },
                    { id: 'sa_writer', name: 'Copywriter', type: 'creator_text', description: 'Content generation agent' }
                ];
            }
        }

        renderAvailableSubAgents();
    }

    function closeAddSubAgentModal() {
        document.getElementById('add-subagent-modal').style.display = 'none';
    }

    function renderAvailableSubAgents() {
        const list = document.getElementById('available-subagents-list');
        const searchTerm = document.getElementById('subagent-search').value.toLowerCase();

        // Get current roles to filter out
        const currentRoleNames = Array.from(document.querySelectorAll('.role-name')).map(el => el.textContent);

        const filtered = availableSubAgents.filter(sa =>
            !currentRoleNames.includes(sa.name) &&
            (sa.name.toLowerCase().includes(searchTerm) || sa.type.toLowerCase().includes(searchTerm))
        );

        if (filtered.length === 0) {
            list.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No available sub-agents found.</p>';
            return;
        }

        list.innerHTML = filtered.map(sa => `
            <div class="available-subagent-item" onclick="addSubAgent('${sa.id}')">
                <div class="available-subagent-info">
                    <h4>${sa.name}</h4>
                    <p>${ROLE_TYPE_LABELS[sa.type] || sa.type}</p>
                </div>
                <button class="btn-sm btn-primary">Add</button>
            </div>
        `).join('');
    }

    window.filterSubAgents = renderAvailableSubAgents;

    window.addSubAgent = async function (subAgentId) {
        const subAgent = availableSubAgents.find(sa => sa.id === subAgentId);
        if (!subAgent) return;

        if (!currentTemplateId) return;

        try {
            // Add to Firestore
            const templateRef = db.collection('agentSetTemplates').doc(currentTemplateId);
            const newRole = {
                name: subAgent.name,
                type: subAgent.type,
                defaultTemplateId: subAgent.id
            };

            await templateRef.update({
                roles: firebase.firestore.FieldValue.arrayUnion(newRole)
            });

            // Reload data
            await loadTemplateData(currentTemplateId);
            closeAddSubAgentModal();

        } catch (error) {
            console.error("Error adding sub-agent:", error);
            alert("Failed to add sub-agent");
        }
    };

    window.removeSubAgent = async function (roleName) {
        if (currentUserRole !== 'admin') {
            alert("Permission denied: Only admins can remove sub-agents.");
            return;
        }

        if (!confirm(`Remove "${roleName}" from this team?`)) return;

        try {
            const templateRef = db.collection('agentSetTemplates').doc(currentTemplateId);
            const doc = await templateRef.get();
            const roles = doc.data().roles || [];
            const roleToRemove = roles.find(r => r.name === roleName);

            if (roleToRemove) {
                await templateRef.update({
                    roles: firebase.firestore.FieldValue.arrayRemove(roleToRemove)
                });
                await loadTemplateData(currentTemplateId);
            }
        } catch (error) {
            console.error("Error removing sub-agent:", error);
            alert("Failed to remove sub-agent");
        }
    };

    // Make function globally accessible
    window.openTemplateDetail = openTemplateDetail;
    window.closeTemplateDetail = closeTemplateDetail;
    window.editCurrentTemplate = editCurrentTemplate;
    window.duplicateCurrentTemplate = duplicateCurrentTemplate;
    window.deleteCurrentTemplate = deleteCurrentTemplate;
    window.toggleSubAgent = toggleSubAgent;
    window.openAddSubAgentModal = openAddSubAgentModal;
    window.closeAddSubAgentModal = closeAddSubAgentModal;
})();
