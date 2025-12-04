/**
 * Agent Runtime Service
 * 
 * Manages the execution context for Agent Team Instances by:
 * - Validating channel configurations
 * - Resolving user API credentials
 * - Determining runtime readiness
 */

class AgentRuntimeService {
    /**
     * Prepare execution context for an agent team instance
     * @param {string} agentTeamInstanceId - ID of the agent team instance
     * @param {string} userId - User ID who owns the credentials
     * @returns {Promise<Object>} Execution context with readiness status
     */
    static async prepareExecutionContext(agentTeamInstanceId, userId) {
        try {
            // 1. Get Agent Team Instance
            const instance = await this.getAgentTeamInstance(agentTeamInstanceId);

            // 2. Extract enabled channels
            const enabledChannels = this.getEnabledChannels(instance);

            // 3. Build context for each channel
            const channelContexts = await Promise.all(
                enabledChannels.map(ch => this.buildChannelContext(ch, userId))
            );

            // 4. Determine overall readiness
            const isReady = channelContexts.length > 0 && channelContexts.every(ctx => ctx.status === 'ready');
            const errors = channelContexts.filter(ctx => ctx.status !== 'ready');

            return {
                instance,
                channels: channelContexts,
                isReady,
                errors,
                readyAt: isReady ? new Date() : null,
                summary: this.generateSummary(channelContexts, isReady)
            };
        } catch (error) {
            console.error('Error preparing execution context:', error);
            return {
                instance: null,
                channels: [],
                isReady: false,
                errors: [{ error: error.message }],
                readyAt: null,
                summary: 'Failed to prepare execution context'
            };
        }
    }

    /**
     * Build execution context for a specific channel
     * @param {Object} channelConfig - Channel configuration from instance
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Channel context with status
     */
    static async buildChannelContext(channelConfig, userId) {
        const { provider } = channelConfig;

        // Get credential for this provider
        const credential = await this.getCredentialForProvider(userId, provider);

        if (!credential) {
            return {
                provider,
                status: 'missing_credential',
                error: 'No API credential configured',
                actionRequired: 'Add credential in Settings > Connections',
                severity: 'error'
            };
        }

        if (credential.status !== 'connected' && credential.status !== 'active') {
            return {
                provider,
                status: 'credential_error',
                error: `Credential status: ${credential.status}`,
                actionRequired: 'Test connection in Settings > Connections',
                credentialId: credential.id,
                severity: 'warning'
            };
        }

        // Success: Ready to execute
        return {
            provider,
            status: 'ready',
            credentialId: credential.id,
            accountName: credential.accountName,
            lastTested: credential.lastTestedAt,
            severity: 'success'
        };
    }

    /**
     * Get user's credential for a specific provider
     * @param {string} userId - User ID
     * @param {string} provider - Channel provider (e.g., 'x', 'instagram')
     * @returns {Promise<Object|null>} Credential document or null
     */
    static async getCredentialForProvider(userId, provider) {
        const db = firebase.firestore();

        const snapshot = await db.collection('userApiCredentials')
            .where('userId', '==', userId)
            .where('provider', '==', provider)
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        return {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
        };
    }

    /**
     * Get all credentials for a user (for caching)
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of credential documents
     */
    static async getAllUserCredentials(userId) {
        const db = firebase.firestore();

        const snapshot = await db.collection('userApiCredentials')
            .where('userId', '==', userId)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    /**
     * Extract enabled channels from instance
     * @param {Object} instance - Agent team instance document
     * @returns {Array} Array of enabled channel configs
     */
    static getEnabledChannels(instance) {
        const bindings = instance.channelBindings || {};

        return Object.entries(bindings)
            .filter(([_, config]) => config && config.enabled)
            .map(([provider, config]) => ({
                provider,
                ...config
            }));
    }

    /**
     * Get agent team instance document
     * @param {string} id - Instance ID
     * @returns {Promise<Object>} Instance document
     */
    static async getAgentTeamInstance(id) {
        const db = firebase.firestore();

        const doc = await db.collection('projectAgentTeamInstances').doc(id).get();

        if (!doc.exists) {
            throw new Error('Agent team instance not found');
        }

        return {
            id: doc.id,
            ...doc.data()
        };
    }

    /**
     * Generate human-readable summary
     * @param {Array} channelContexts - Array of channel contexts
     * @param {boolean} isReady - Overall readiness
     * @returns {string} Summary message
     */
    static generateSummary(channelContexts, isReady) {
        if (channelContexts.length === 0) {
            return 'No channels configured';
        }

        if (isReady) {
            return `All ${channelContexts.length} channel(s) ready`;
        }

        const errorCount = channelContexts.filter(ctx => ctx.status !== 'ready').length;
        return `${errorCount} of ${channelContexts.length} channel(s) need attention`;
    }

    /**
     * Batch prepare contexts for multiple instances (optimization)
     * @param {Array} instanceIds - Array of instance IDs
     * @param {string} userId - User ID
     * @returns {Promise<Map>} Map of instanceId -> context
     */
    static async batchPrepareContexts(instanceIds, userId) {
        // Get all user credentials once (optimization)
        const allCredentials = await this.getAllUserCredentials(userId);

        // Create a map for quick lookup
        const credentialMap = new Map();
        allCredentials.forEach(cred => {
            credentialMap.set(cred.provider, cred);
        });

        // Prepare contexts for all instances
        const contexts = await Promise.all(
            instanceIds.map(async (id) => {
                try {
                    const instance = await this.getAgentTeamInstance(id);
                    const enabledChannels = this.getEnabledChannels(instance);

                    const channelContexts = enabledChannels.map(ch => {
                        const credential = credentialMap.get(ch.provider);

                        if (!credential) {
                            return {
                                provider: ch.provider,
                                status: 'missing_credential',
                                error: 'No API credential configured',
                                severity: 'error'
                            };
                        }

                        if (credential.status !== 'connected' && credential.status !== 'active') {
                            return {
                                provider: ch.provider,
                                status: 'credential_error',
                                error: `Credential status: ${credential.status}`,
                                credentialId: credential.id,
                                severity: 'warning'
                            };
                        }

                        return {
                            provider: ch.provider,
                            status: 'ready',
                            credentialId: credential.id,
                            accountName: credential.accountName,
                            severity: 'success'
                        };
                    });

                    const isReady = channelContexts.length > 0 && channelContexts.every(ctx => ctx.status === 'ready');

                    return [id, {
                        instance,
                        channels: channelContexts,
                        isReady,
                        errors: channelContexts.filter(ctx => ctx.status !== 'ready')
                    }];
                } catch (error) {
                    return [id, {
                        instance: null,
                        channels: [],
                        isReady: false,
                        errors: [{ error: error.message }]
                    }];
                }
            })
        );

        return new Map(contexts);
    }
}

// Export to global scope
window.AgentRuntimeService = AgentRuntimeService;
