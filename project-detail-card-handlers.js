
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
