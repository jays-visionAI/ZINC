
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
window.handleOpenSettings = function (event, teamId) {
    event.stopPropagation();

    // Call existing settings function if available
    if (typeof openAgentSettings === 'function') {
        openAgentSettings(teamId);
    } else if (typeof openTeamSettings === 'function') {
        openTeamSettings(teamId);
    } else {
        console.log('Open settings for team:', teamId);
        alert('Settings modal coming soon!');
    }
};
