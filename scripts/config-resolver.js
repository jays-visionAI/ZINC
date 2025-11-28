// ConfigResolver - 3-Layer Configuration Merge System
// Merges Behaviour Pack → Runtime Profile → Channel Agent Config

class ConfigResolver {
    constructor(db, projectId) {
        this.db = db;
        this.projectId = projectId;

        // White-listed override keys per engine type
        this.ALLOWED_OVERRIDES = {
            planner: [
                'postFrequency', 'formatMix', 'experimentIntensity',
                'avgThreadLength', 'threadRatio'
            ],
            creator_text: [
                'tonePreset', 'hookStyle', 'emojiUsage',
                'hashtagCount', 'ctaIntensity'
            ],
            engagement: [
                'autoReplyLevel', 'dailyReplyCap', 'replyToMentions',
                'replyToKeywords', 'escalationTriggers'
            ],
            goals: [
                'followers', 'engagement', 'clicks', 'impressions'
            ]
        };
    }

    /**
     * Get effective configuration by merging 3 layers
     * @param {string} instanceId - Channel agent instance ID
     * @param {string} engineType - Engine type (planner, creator_text, etc.)
     * @returns {Object} Merged configuration
     */
    async getEffectiveConfig(instanceId, engineType) {
        try {
            // Get instance info to find channel
            const instanceDoc = await this.db
                .collection(`projects/${this.projectId}/agentTeamInstances`)
                .doc(instanceId)
                .get();

            if (!instanceDoc.exists) {
                throw new Error(`Instance not found: ${instanceId}`);
            }

            const instance = instanceDoc.data();
            const channelId = instance.channelId || this._extractChannelFromInstance(instance);

            // Layer 1: Load Behaviour Pack
            const behaviourPack = await this._loadBehaviourPack(channelId, engineType);

            // Layer 2: Load Runtime Profile
            const runtimeProfile = await this._loadRuntimeProfile();
            const runtimeOverrides = runtimeProfile?.engineOverrides?.[engineType] || {};

            // Layer 3: Load Channel Agent Config
            const channelConfig = await this._loadChannelConfig(instanceId);
            const userOverrides = channelConfig?.overrides?.[engineType] || {};

            // Validate and filter user overrides
            const validatedOverrides = this._validateOverrides(engineType, userOverrides);

            // Merge layers (deep merge with priority: user > runtime > pack)
            const merged = this._deepMerge(
                behaviourPack,
                runtimeOverrides,
                validatedOverrides
            );

            console.log(`✅ ConfigResolver: Merged config for ${engineType}`, {
                instanceId,
                layers: {
                    behaviourPack: Object.keys(behaviourPack).length,
                    runtime: Object.keys(runtimeOverrides).length,
                    user: Object.keys(validatedOverrides).length
                }
            });

            return merged;

        } catch (error) {
            console.error(`❌ ConfigResolver error for ${instanceId}/${engineType}:`, error);
            throw error;
        }
    }

    /**
     * Load Behaviour Pack (Layer 1)
     */
    async _loadBehaviourPack(channelId, engineType) {
        try {
            // Try to load channel-specific behaviour pack
            const packId = `bp_${engineType}_${channelId}_v1`;
            const packDoc = await this.db
                .collection('behaviourPacks')
                .doc(packId)
                .get();

            if (packDoc.exists) {
                const pack = packDoc.data();
                return pack.defaults || pack.payload || {};
            }

            // Fallback to generic engine pack
            const genericPackDoc = await this.db
                .collection('behaviourPacks')
                .doc(`bp_${engineType}_v1`)
                .get();

            if (genericPackDoc.exists) {
                return genericPackDoc.data().defaults || {};
            }

            console.warn(`⚠️ No behaviour pack found for ${channelId}/${engineType}, using empty defaults`);
            return {};

        } catch (error) {
            console.warn(`⚠️ Error loading behaviour pack:`, error);
            return {};
        }
    }

    /**
     * Load Runtime Profile (Layer 2)
     */
    async _loadRuntimeProfile() {
        try {
            // Get active runtime profile for this project
            const profilesSnapshot = await this.db
                .collection(`projects/${this.projectId}/runtimeProfiles`)
                .where('isActive', '==', true)
                .limit(1)
                .get();

            if (profilesSnapshot.empty) {
                return null;
            }

            return profilesSnapshot.docs[0].data();

        } catch (error) {
            console.warn(`⚠️ Error loading runtime profile:`, error);
            return null;
        }
    }

    /**
     * Load Channel Agent Config (Layer 3)
     */
    async _loadChannelConfig(instanceId) {
        try {
            const configDoc = await this.db
                .collection(`projects/${this.projectId}/channelAgentConfigs`)
                .doc(instanceId)
                .get();

            if (!configDoc.exists) {
                return null;
            }

            return configDoc.data();

        } catch (error) {
            console.warn(`⚠️ Error loading channel config:`, error);
            return null;
        }
    }

    /**
     * Validate overrides against white-list
     */
    _validateOverrides(engineType, overrides) {
        const allowedKeys = this.ALLOWED_OVERRIDES[engineType] || [];
        const validated = {};

        Object.keys(overrides).forEach(key => {
            if (allowedKeys.includes(key)) {
                validated[key] = overrides[key];
            } else {
                console.warn(`⚠️ Ignoring non-whitelisted override: ${engineType}.${key}`);
            }
        });

        return validated;
    }

    /**
     * Deep merge multiple objects (right-most has highest priority)
     */
    _deepMerge(...objects) {
        const result = {};

        objects.forEach(obj => {
            if (!obj || typeof obj !== 'object') return;

            Object.keys(obj).forEach(key => {
                if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    // Recursively merge nested objects
                    result[key] = this._deepMerge(result[key] || {}, obj[key]);
                } else {
                    // Overwrite arrays and primitives
                    result[key] = obj[key];
                }
            });
        });

        return result;
    }

    /**
     * Extract channel ID from instance data
     */
    _extractChannelFromInstance(instance) {
        // Try to extract from various possible fields
        if (instance.channelId) return instance.channelId;
        if (instance.channel) return instance.channel;
        if (instance.platform) return instance.platform;

        // Default fallback
        return 'x';
    }

    /**
     * Save channel config overrides
     * @param {string} instanceId - Channel agent instance ID
     * @param {Object} overrides - Overrides object { engineType: { key: value } }
     */
    async saveChannelConfig(instanceId, overrides, userId = 'system') {
        try {
            // Validate all overrides
            const validatedOverrides = {};

            Object.keys(overrides).forEach(engineType => {
                validatedOverrides[engineType] = this._validateOverrides(
                    engineType,
                    overrides[engineType]
                );
            });

            const configRef = this.db
                .collection(`projects/${this.projectId}/channelAgentConfigs`)
                .doc(instanceId);

            const configData = {
                projectId: this.projectId,
                instanceId: instanceId,
                overrides: validatedOverrides,
                lastEditedBy: userId,
                lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Check if document exists
            const existing = await configRef.get();

            if (existing.exists) {
                await configRef.update(configData);
            } else {
                configData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await configRef.set(configData);
            }

            console.log(`✅ Saved channel config for ${instanceId}`);
            return configData;

        } catch (error) {
            console.error(`❌ Error saving channel config:`, error);
            throw error;
        }
    }

    /**
     * Reset specific override (remove from config)
     */
    async resetOverride(instanceId, engineType, fieldKey) {
        try {
            const configRef = this.db
                .collection(`projects/${this.projectId}/channelAgentConfigs`)
                .doc(instanceId);

            await configRef.update({
                [`overrides.${engineType}.${fieldKey}`]: firebase.firestore.FieldValue.delete(),
                lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Reset override: ${engineType}.${fieldKey}`);

        } catch (error) {
            console.error(`❌ Error resetting override:`, error);
            throw error;
        }
    }

    /**
     * Reset all overrides for an instance
     */
    async resetAllOverrides(instanceId) {
        try {
            const configRef = this.db
                .collection(`projects/${this.projectId}/channelAgentConfigs`)
                .doc(instanceId);

            await configRef.update({
                overrides: {},
                lastEditedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Reset all overrides for ${instanceId}`);

        } catch (error) {
            console.error(`❌ Error resetting all overrides:`, error);
            throw error;
        }
    }
}

// Export for browser context
if (typeof window !== 'undefined') {
    window.ConfigResolver = ConfigResolver;
}
