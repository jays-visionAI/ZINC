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
            // Relaxed check: At least one channel must be ready
            const isReady = channelContexts.some(ctx => ctx.status === 'ready');
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
        const { provider, credentialId } = channelConfig;

        // If channelConfig has a specific credentialId, use it
        let credential = null;

        if (credentialId) {
            // Get the specific credential by ID
            credential = await this.getCredentialById(credentialId);

            // Verify it belongs to the user and matches the provider (case-insensitive)
            if (credential && (credential.userId !== userId || credential.provider.toLowerCase() !== provider.toLowerCase())) {
                console.warn(`Credential ${credentialId} mismatch: expected userId=${userId}, provider=${provider}`);
                credential = null;
            }
        }

        // Fallback: find any credential for this provider
        if (!credential) {
            // Try exact match first, then lowercase
            credential = await this.getCredentialForProvider(userId, provider);
            if (!credential && provider !== provider.toLowerCase()) {
                credential = await this.getCredentialForProvider(userId, provider.toLowerCase());
            }
        }

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
     * Get credential by ID
     * @param {string} credentialId - Credential document ID
     * @returns {Promise<Object|null>} Credential document or null
     */
    static async getCredentialById(credentialId) {
        const db = firebase.firestore();

        try {
            const doc = await db.collection('userApiCredentials').doc(credentialId).get();

            if (!doc.exists) return null;

            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error(`Error fetching credential ${credentialId}:`, error);
            return null;
        }
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
     * @param {Object} instance 
     * @returns {Array} List of enabled channel configurations
     */
    static getEnabledChannels(instance) {
        // Use ChannelOrchestrator to handle legacy data structure if available
        let channels = [];

        if (typeof ChannelOrchestrator !== 'undefined') {
            channels = ChannelOrchestrator.normalizeAgentTeamChannels(instance);
        } else {
            // Fallback if orchestrator not loaded
            channels = instance.channels || [];
        }

        return channels.filter(ch => ch.enabled !== false);
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

        // Create maps for quick lookup (by ID and by provider)
        const credentialByIdMap = new Map();
        const credentialByProviderMap = new Map();

        allCredentials.forEach(cred => {
            credentialByIdMap.set(cred.id, cred);
            credentialByProviderMap.set(cred.provider, cred);
        });

        // Prepare contexts for all instances
        const contexts = await Promise.all(
            instanceIds.map(async (id) => {
                try {
                    const instance = await this.getAgentTeamInstance(id);
                    const enabledChannels = this.getEnabledChannels(instance);

                    const channelContexts = enabledChannels.map(ch => {
                        // Try to get credential by ID first, then by provider
                        let credential = null;

                        if (ch.credentialId) {
                            credential = credentialByIdMap.get(ch.credentialId);

                            // Verify it matches the provider
                            if (credential && credential.provider !== ch.provider) {
                                console.warn(`Credential ${ch.credentialId} provider mismatch`);
                                credential = null;
                            }
                        }

                        // Fallback to provider lookup
                        if (!credential) {
                            credential = credentialByProviderMap.get(ch.provider);
                        }

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

                    // Relaxed readiness check: If AT LEAST ONE channel is ready, the agent is ready.
                    // This handles cases where multiple channels are defined but only one is used.
                    const isReady = channelContexts.some(ctx => ctx.status === 'ready');

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

    // ============================================================
    // AGENT REGISTRY INTEGRATION (Agent-OS Phase 1)
    // ============================================================

    /**
     * Get the production version configuration for an agent from the Registry
     * @param {string} agentId - Agent ID from the Registry (e.g., 'DSN-NRV-DSGN')
     * @returns {Promise<Object|null>} Production version config or null
     */
    static async getProductionVersion(agentId) {
        const db = firebase.firestore();

        try {
            // 1. Get the agent registry entry to find the production version
            const registryDoc = await db.collection('agentRegistry').doc(agentId).get();

            if (!registryDoc.exists) {
                console.warn(`[AgentRuntimeService] Agent ${agentId} not found in Registry`);
                return null;
            }

            const registryData = registryDoc.data();
            const prodVersion = registryData.currentProductionVersion?.replace('v', '') || '1.0.0';

            // 2. Query for the production version
            const versionsSnap = await db.collection('agentVersions')
                .where('agentId', '==', agentId)
                .where('isProduction', '==', true)
                .limit(1)
                .get();

            if (versionsSnap.empty) {
                // Fallback: try to find by version string
                const fallbackSnap = await db.collection('agentVersions')
                    .where('agentId', '==', agentId)
                    .where('version', '==', prodVersion)
                    .limit(1)
                    .get();

                if (fallbackSnap.empty) {
                    console.warn(`[AgentRuntimeService] No production version found for ${agentId}`);
                    return null;
                }

                return { id: fallbackSnap.docs[0].id, ...fallbackSnap.docs[0].data() };
            }

            return { id: versionsSnap.docs[0].id, ...versionsSnap.docs[0].data() };
        } catch (error) {
            console.error(`[AgentRuntimeService] Error loading production version for ${agentId}:`, error);
            return null;
        }
    }

    /**
     * Get full agent configuration including registry info and production version
     * @param {string} agentId - Agent ID
     * @returns {Promise<Object|null>} Full agent config
     */
    static async getAgentConfig(agentId) {
        const db = firebase.firestore();

        try {
            const registryDoc = await db.collection('agentRegistry').doc(agentId).get();
            if (!registryDoc.exists) return null;

            const registryData = { id: registryDoc.id, ...registryDoc.data() };
            const productionVersion = await this.getProductionVersion(agentId);

            return {
                registry: registryData,
                productionVersion: productionVersion,
                systemPrompt: productionVersion?.systemPrompt || null,
                procedures: productionVersion?.procedures || [],
                config: productionVersion?.config || { model: 'gpt-4o', temperature: 0.7 },
                sourceFiles: registryData.sourceFiles || []
            };
        } catch (error) {
            console.error(`[AgentRuntimeService] Error loading agent config for ${agentId}:`, error);
            return null;
        }
    }

    /**
     * Resolve the system prompt for an agent, with fallback chain
     * Priority: Registry Production Version > SubAgent Override > Default
     */
    static async resolveAgentPrompt(registryAgentId, subAgentPrompt = null, roleType = 'unknown') {
        let source = 'default';
        let prompt = this.getDefaultPromptForRole(roleType);
        let config = { model: 'gpt-4o', temperature: 0.7 };
        let procedures = [];

        if (registryAgentId) {
            const agentConfig = await this.getAgentConfig(registryAgentId);
            if (agentConfig && agentConfig.systemPrompt) {
                prompt = agentConfig.systemPrompt;
                config = agentConfig.config;
                procedures = agentConfig.procedures;
                source = 'registry';
                console.log(`[AgentRuntimeService] ✅ Loaded prompt from Registry: ${registryAgentId}`);
            }
        }

        if (source === 'default' && subAgentPrompt) {
            prompt = subAgentPrompt;
            source = 'subagent';
        }

        return { prompt, config, procedures, source, registryAgentId, resolved: true };
    }

    /**
     * Get default prompt for a role type (fallback)
     */
    static getDefaultPromptForRole(roleType) {
        const defaults = {
            'planner': 'You are a content planner. Analyze the requirements and create a structured plan.',
            'creator_text': 'You are a content writer. Create engaging content based on the provided brief.',
            'creator_image': 'You are an image prompt engineer. Generate detailed prompts for image generation.',
            'reviewer': 'You are a content reviewer. Evaluate the content for quality and brand alignment.',
            'manager': 'You are a project manager. Coordinate the workflow and ensure deliverables meet requirements.',
            'unknown': 'You are an AI assistant. Help complete the assigned task.'
        };
        return defaults[roleType.toLowerCase()] || defaults['unknown'];
    }

    /**
     * List all agents in the Registry (for Admin UI)
     */
    static async listRegistryAgents(category = null) {
        const db = firebase.firestore();
        try {
            let query = db.collection('agentRegistry');
            if (category) query = query.where('category', '==', category);
            const snapshot = await query.orderBy('name').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('[AgentRuntimeService] Error listing registry agents:', error);
            return [];
        }
    }
}

// Export to global scope
window.AgentRuntimeService = AgentRuntimeService;

