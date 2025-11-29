// utils-runtime-profile.js
// Core utilities for ZYNK Runtime Profile v2.0 (3-Axis Model)

(function () {
    'use strict';

    // --- Constants ---

    const ROLE_TYPES = [
        'planner', 'writer_short', 'writer_long', 'writer_script',
        'engagement', 'research', 'image_instagram', 'image_youtube',
        'embedding', 'utility'
    ];

    const LANGUAGES = [
        'en', 'ko', 'ja', 'zh', 'es', 'fr', 'de', 'th', 'it', 'pt', 'ru', 'ar', 'global'
    ];

    const TIERS = ['economy', 'balanced', 'premium'];

    // --- Helper Functions ---

    /**
     * Converts full tier name to 3-letter code.
     * @param {string} tier - 'economy' | 'balanced' | 'premium'
     * @returns {string} - 'eco' | 'bal' | 'pro'
     */
    function getTierCode(tier) {
        switch (tier) {
            case 'economy': return 'eco';
            case 'balanced': return 'bal';
            case 'premium': return 'pro';
            default: return 'bal'; // Default to balanced
        }
    }

    /**
     * Builds the standard Runtime Profile ID.
     * Format: rtp_{roleType}_{language}_{tierCode}_v1
     * @param {string} roleType 
     * @param {string} language 
     * @param {string} tier 
     * @returns {string}
     */
    function buildRuntimeProfileId(roleType, language, tier) {
        if (!roleType || !language || !tier) {
            console.error('[RuntimeProfile] Missing arguments for ID generation:', { roleType, language, tier });
            return null;
        }
        const tierCode = getTierCode(tier);
        return `rtp_${roleType}_${language}_${tierCode}_v1`;
    }

    /**
     * Generates the initial catalog of Runtime Profiles.
     * @returns {Array} List of RuntimeProfile objects
     */
    function generateInitialCatalog() {
        const catalog = [];
        const timestamp = firebase.firestore.Timestamp.now();

        // 1. Writer - Short Form (12 Languages x Balanced)
        LANGUAGES.filter(l => l !== 'global').forEach(lang => {
            catalog.push({
                id: buildRuntimeProfileId('writer_short', lang, 'balanced'),
                name: `Writer – Short Form (${lang.toUpperCase()}, Balanced)`,
                role_type: 'writer_short',
                language: lang,
                tier: 'balanced',
                provider: 'openai',
                model_id: 'gpt-4o-mini',
                capabilities: { chat: true, vision: false, image_generation: false, embedding: false },
                cost_hint: { tier: 'balanced' },
                status: 'active',
                version: '2.0.0',
                created_at: timestamp,
                updated_at: timestamp
            });
        });

        // 2. Engagement (12 Languages x Economy)
        LANGUAGES.filter(l => l !== 'global').forEach(lang => {
            catalog.push({
                id: buildRuntimeProfileId('engagement', lang, 'economy'),
                name: `Engagement Bot (${lang.toUpperCase()}, Economy)`,
                role_type: 'engagement',
                language: lang,
                tier: 'economy',
                provider: 'openai',
                model_id: 'gpt-3.5-turbo',
                capabilities: { chat: true, vision: false, image_generation: false, embedding: false },
                cost_hint: { tier: 'economy' },
                status: 'active',
                version: '2.0.0',
                created_at: timestamp,
                updated_at: timestamp
            });
        });

        // 3. Global Profiles (Planner, Research)
        const globals = [
            { role: 'planner', tier: 'premium', model: 'gpt-4o' },
            { role: 'planner', tier: 'balanced', model: 'gpt-4o-mini' },
            { role: 'research', tier: 'balanced', model: 'gpt-4o-mini' }
        ];

        globals.forEach(g => {
            catalog.push({
                id: buildRuntimeProfileId(g.role, 'global', g.tier),
                name: `${g.role.charAt(0).toUpperCase() + g.role.slice(1)} (Global, ${g.tier.charAt(0).toUpperCase() + g.tier.slice(1)})`,
                role_type: g.role,
                language: 'global',
                tier: g.tier,
                provider: 'openai',
                model_id: g.model,
                capabilities: { chat: true, vision: false, image_generation: false, embedding: false },
                cost_hint: { tier: g.tier },
                status: 'active',
                version: '2.0.0',
                created_at: timestamp,
                updated_at: timestamp
            });
        });

        return catalog;
    }

    // Expose to window
    window.RuntimeProfileUtils = {
        ROLE_TYPES,
        LANGUAGES,
        TIERS,
        getTierCode,
        buildRuntimeProfileId,
        generateInitialCatalog
    };

    console.log('[RuntimeProfileUtils] Loaded v2.0 utilities');

})();
