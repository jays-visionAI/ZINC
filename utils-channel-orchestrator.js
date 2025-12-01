/**
 * utils-channel-orchestrator.js
 * 
 * PRD 11.0 Phase 3: Channel Orchestrator v2 (Light)
 * Helper functions for normalizing channel data and computing statuses.
 */

const ChannelOrchestrator = {
    /**
     * Computes the status of a single channel configuration.
     * 
     * Status Definitions:
     * - ready: Has apiCredentialId and no error message.
     * - missing_key: Missing apiCredentialId.
     * - error: Has lastErrorMessage.
     * 
     * @param {Object} channelObj - The channel configuration object
     * @returns {string} "ready" | "missing_key" | "error"
     */
    computeChannelStatus: function (channelObj) {
        if (channelObj.lastErrorMessage) {
            return 'error';
        }
        if (!channelObj.credentialId) { // Note: using credentialId based on Phase 2 implementation
            return 'missing_key';
        }
        return 'ready';
    },

    /**
     * Normalizes the channels array of an Agent Team Instance.
     * Ensures all fields exist and updates status based on logic.
     * 
     * @param {Object} agentTeamDoc - The projectAgentTeamInstance document data
     * @returns {Array} Normalized channels array
     */
    normalizeAgentTeamChannels: function (agentTeamDoc) {
        if (!agentTeamDoc.channels || !Array.isArray(agentTeamDoc.channels)) {
            // Fallback for legacy data (Phase 1/2 early data)
            if (agentTeamDoc.channelId && agentTeamDoc.channelId !== 'none') {
                return [{
                    provider: agentTeamDoc.channelId, // Legacy mapping
                    credentialId: null, // Legacy didn't have creds linked this way usually
                    status: 'missing_key',
                    updatedAt: agentTeamDoc.updated_at || agentTeamDoc.deployedAt || null
                }];
            }
            return [];
        }

        return agentTeamDoc.channels.map(ch => {
            // Ensure basic fields
            const normalized = {
                provider: ch.provider || 'unknown',
                credentialId: ch.credentialId || null,
                workflowTemplateId: ch.workflowTemplateId || null,
                lastErrorMessage: ch.lastErrorMessage || null,
                updatedAt: ch.updatedAt || null,
                enabled: ch.enabled !== undefined ? ch.enabled : true
            };

            // Re-compute status to ensure consistency
            normalized.status = this.computeChannelStatus(normalized);

            return normalized;
        });
    },

    /**
     * Determines if the entire Agent Team is "Ready" or "Needs Setup".
     * 
     * Condition for Ready:
     * - Team status is 'active'
     * - At least one channel exists
     * - All enabled channels are 'ready'
     * 
     * @param {Object} agentTeamDoc 
     * @returns {string} "Ready" | "Needs Setup"
     */
    computeTeamReadiness: function (agentTeamDoc) {
        if (agentTeamDoc.status !== 'active') return 'Needs Setup';

        const channels = this.normalizeAgentTeamChannels(agentTeamDoc);
        if (channels.length === 0) return 'Needs Setup';

        const enabledChannels = channels.filter(ch => ch.enabled);
        if (enabledChannels.length === 0) return 'Needs Setup';

        const allReady = enabledChannels.every(ch => ch.status === 'ready');
        return allReady ? 'Ready' : 'Needs Setup';
    }
};

// Export for module usage if needed, or attach to window for vanilla JS
if (typeof window !== 'undefined') {
    window.ChannelOrchestrator = ChannelOrchestrator;
}
