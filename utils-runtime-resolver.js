// utils-runtime-resolver.js
// Runtime Profile Dynamic Resolution System
// Resolves LLM configuration based on Sub-Agent metadata

(function () {
    'use strict';

    /**
     * Resolve runtime configuration for a Sub-Agent
     * @param {Object} subAgentTemplate - Sub-Agent template data
     * @returns {Promise<Object>} Resolved runtime configuration
     */
    window.resolveRuntimeConfig = async function (subAgentTemplate) {
        const {
            type,              // Engine type (e.g., "planner")
            role_type,         // Role type (e.g., "strategist")
            primary_language,  // Language (e.g., "ko")
            preferred_tier     // Tier (e.g., "balanced")
        } = subAgentTemplate;

        // Validate required fields
        if (!type) {
            throw new Error('Sub-Agent template missing "type" field');
        }

        const tier = preferred_tier || 'balanced';
        const language = primary_language || 'en';

        // 1. Fetch Runtime Profile Rule for this engine type
        const rulesSnapshot = await db.collection('runtimeProfileRules')
            .where('engine_type', '==', type)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (rulesSnapshot.empty) {
            console.warn(`No runtime rule found for engine type: ${type}, using fallback`);
            return getFallbackConfig(type, tier, language);
        }

        const rule = rulesSnapshot.docs[0].data();

        // 2. Get base model configuration for the tier
        let modelConfig = rule.models?.[tier];

        if (!modelConfig) {
            console.warn(`No model config for tier: ${tier}, using balanced`);
            modelConfig = rule.models?.balanced || rule.models?.creative || {};
        }

        // 3. Apply language-specific overrides if available
        if (rule.language_overrides?.[language]?.[tier]) {
            const override = rule.language_overrides[language][tier];
            modelConfig = { ...modelConfig, ...override };
        }

        // 4. Merge with Sub-Agent specific config
        const finalConfig = {
            provider: modelConfig.provider || 'openai',
            model_id: modelConfig.model_id || 'gpt-4',
            temperature: subAgentTemplate.config?.temperature ?? modelConfig.temperature ?? 0.7,
            max_tokens: subAgentTemplate.config?.maxTokens ?? modelConfig.max_tokens ?? 2000,
            top_p: modelConfig.top_p ?? 1.0,
            frequency_penalty: modelConfig.frequency_penalty ?? 0,
            presence_penalty: modelConfig.presence_penalty ?? 0,

            // Metadata
            language: language,
            role_type: role_type || 'general',
            tier: tier,
            engine_type: type,

            // Rule metadata
            rule_id: rulesSnapshot.docs[0].id,
            resolved_at: new Date().toISOString()
        };

        console.log(`[Runtime Resolver] Resolved config for ${type} (${language}, ${tier}):`, finalConfig);
        return finalConfig;
    };

    /**
     * Fallback configuration when no rule is found
     */
    function getFallbackConfig(engineType, tier, language) {
        console.warn(`Using fallback config for ${engineType}`);

        const tierConfigs = {
            creative: { temperature: 0.9, model_id: 'gpt-4-turbo' },
            balanced: { temperature: 0.7, model_id: 'gpt-4' },
            precise: { temperature: 0.3, model_id: 'gpt-4' }
        };

        const config = tierConfigs[tier] || tierConfigs.balanced;

        return {
            provider: 'openai',
            model_id: config.model_id,
            temperature: config.temperature,
            max_tokens: 2000,
            language: language,
            tier: tier,
            engine_type: engineType,
            is_fallback: true
        };
    }

    /**
     * Get available tiers for UI
     */
    window.getAvailableTiers = function () {
        return [
            { value: 'creative', label: 'Creative', description: 'High creativity, exploratory' },
            { value: 'balanced', label: 'Balanced', description: 'Balanced creativity and accuracy' },
            { value: 'precise', label: 'Precise', description: 'High accuracy, factual' }
        ];
    };

    /**
     * Get available languages for UI
     */
    window.getAvailableLanguages = function () {
        return [
            { value: 'en', label: 'English', flag: '🇺🇸' },
            { value: 'ko', label: '한국어', flag: '🇰🇷' },
            { value: 'ja', label: '日本語', flag: '🇯🇵' },
            { value: 'zh', label: '中文', flag: '🇨🇳' },
            { value: 'es', label: 'Español', flag: '🇪🇸' },
            { value: 'fr', label: 'Français', flag: '🇫🇷' },
            { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
            { value: 'pt', label: 'Português', flag: '🇵🇹' },
            { value: 'ar', label: 'العربية', flag: '🇸🇦' },
            { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
            { value: 'ru', label: 'Русский', flag: '🇷🇺' },
            { value: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' }
        ];
    };

    /**
     * Get available role types for UI
     */
    window.getAvailableRoleTypes = function () {
        return [
            { value: 'strategist', label: 'Strategist', description: 'Strategic planning and analysis' },
            { value: 'analyst', label: 'Analyst', description: 'Data analysis and insights' },
            { value: 'creator', label: 'Creator', description: 'Content creation' },
            { value: 'curator', label: 'Curator', description: 'Content curation and organization' },
            { value: 'moderator', label: 'Moderator', description: 'Content moderation' },
            { value: 'optimizer', label: 'Optimizer', description: 'Performance optimization' }
        ];
    };

    console.log('[Runtime Resolver] Module loaded');
})();
