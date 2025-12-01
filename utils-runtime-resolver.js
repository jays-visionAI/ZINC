/**
 * utils-runtime-resolver.js
 * 
 * Runtime configuration resolver for Agent Team instances.
 * Resolves runtime configs from runtimeProfileRules based on role_type, language, and tier.
 */

const RuntimeResolver = {
    /**
     * Resolves runtime configuration for a given role_type, language, and tier.
     * @param {Object} params - Resolution parameters
     * @param {string} params.role_type - Engine type (planner, creator_text, etc.)
     * @param {string} params.language - Language code (default: 'global')
     * @param {string} params.tier - Tier (balanced, creative, precise)
     * @returns {Promise<Object>} RuntimeSnapshot object
     */
    resolveRuntimeConfig: async function ({ role_type, language = 'global', tier = 'balanced' }) {
        try {
            // Query runtimeProfileRules for matching rule
            const rulesSnapshot = await db.collection('runtimeProfileRules')
                .where('engine_type', '==', role_type)
                .where('language', '==', language)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (rulesSnapshot.empty) {
                console.warn(`[RuntimeResolver] No active rule found for ${role_type}/${language}, falling back to defaults`);
                return this.getDefaultConfig(role_type, tier);
            }

            const ruleDoc = rulesSnapshot.docs[0];
            const rule = ruleDoc.data();

            // Extract tier configuration
            const tierConfig = rule.tiers?.[tier];

            if (!tierConfig) {
                console.warn(`[RuntimeResolver] Tier '${tier}' not found in rule ${ruleDoc.id}, using balanced`);
                const fallbackTier = rule.tiers?.balanced || rule.tiers?.creative || rule.tiers?.precise;
                if (!fallbackTier) {
                    return this.getDefaultConfig(role_type, tier);
                }
                return this.buildRuntimeSnapshot(ruleDoc.id, 'balanced', language, fallbackTier);
            }

            return this.buildRuntimeSnapshot(ruleDoc.id, tier, language, tierConfig);

        } catch (error) {
            console.error('[RuntimeResolver] Error resolving runtime config:', error);
            return this.getDefaultConfig(role_type, tier);
        }
    },

    /**
     * Builds a RuntimeSnapshot object from tier configuration
     * @private
     */
    buildRuntimeSnapshot: function (ruleId, tier, language, tierConfig) {
        return {
            rule_id: ruleId,
            tier: tier,
            language: language,
            provider: tierConfig.provider || 'openai',
            model_id: tierConfig.model_id || 'gpt-4o-mini',
            max_tokens: tierConfig.max_tokens || 2000,
            temperature: tierConfig.temperature || 0.7,
            top_p: tierConfig.top_p || 1.0,
            cost_hint: tierConfig.cost_hint || 'standard'
        };
    },

    /**
     * Returns default fallback configuration
     * @private
     */
    getDefaultConfig: function (role_type, tier) {
        console.warn(`[RuntimeResolver] Using hardcoded default for ${role_type}/${tier}`);
        return {
            rule_id: 'default_fallback',
            tier: tier,
            language: 'global',
            provider: 'openai',
            model_id: 'gpt-4o-mini',
            max_tokens: 2000,
            temperature: 0.7,
            top_p: 1.0,
            cost_hint: 'standard'
        };
    },

    /**
     * Formats runtime config for display in UI
     * @param {Object} runtimeSnapshot - RuntimeSnapshot object
     * @returns {string} Formatted string for display
     */
    formatRuntimeDisplay: function (runtimeSnapshot) {
        if (!runtimeSnapshot) return 'Not configured';

        return `${runtimeSnapshot.provider} / ${runtimeSnapshot.model_id} (${runtimeSnapshot.tier})`;
    },

    /**
     * Gets a human-readable label for tier
     * @param {string} tier - Tier name
     * @returns {string} Display label
     */
    getTierLabel: function (tier) {
        const labels = {
            balanced: 'Balanced',
            creative: 'Creative',
            precise: 'Precise'
        };
        return labels[tier] || tier;
    },

    /**
     * Gets a human-readable label for language
     * @param {string} language - Language code
     * @returns {string} Display label
     */
    getLanguageLabel: function (language) {
        const labels = {
            global: 'Global',
            en: 'English',
            ko: 'Korean',
            ja: 'Japanese',
            zh: 'Chinese'
        };
        return labels[language] || language.toUpperCase();
    }
};

// Export for module usage if needed, or attach to window for vanilla JS
if (typeof window !== 'undefined') {
    window.RuntimeResolver = RuntimeResolver;
}
