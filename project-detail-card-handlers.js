
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
 * Handle view history button
 */
window.handleViewHistory = function (event, teamId) {
    event.stopPropagation();

    // Call existing detail view function if available
    if (typeof openAgentDetail === 'function') {
        openAgentDetail(teamId);
    } else if (typeof viewTeamDetails === 'function') {
        viewTeamDetails(teamId);
    } else {
        console.log('View history for team:', teamId);
        alert('History view coming soon!');
    }
};

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
        modal.style.display = 'none';
    }
};

function renderSettingsSubAgents(subAgents) {
    const list = document.getElementById('setting-subagents-list');

    if (subAgents.length === 0) {
        list.innerHTML = '<div class="empty-state">No sub-agents found.</div>';
        return;
    }

    list.innerHTML = subAgents.map(agent => `
        <div class="sub-agent-setting-card" style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <div style="font-weight: 600; color: #fff;">${agent.role_name || agent.role}</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${agent.model_id || 'Default Model'}</div>
            </div>
            
            <div class="form-group">
                <label class="form-label" style="font-size: 12px;">System Prompt (Persona & Instructions)</label>
                <textarea class="form-input sub-agent-prompt" data-id="${agent.id}" rows="4" style="font-size: 13px; font-family: monospace;">${agent.system_prompt || ''}</textarea>
            </div>
        </div>
    `).join('');
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
