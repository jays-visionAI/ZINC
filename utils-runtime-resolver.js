// utils-runtime-resolver.js
// Runtime Profile Rule Resolver
// Resolves runtime configuration based on role_type, language, and tier

/**
 * Resolves runtime configuration from runtimeProfileRules
 * 
 * @param {Object} meta - Metadata for resolution
 * @param {string} meta.role_type - Engine type (planner, creator_text, etc.)
 * @param {string} [meta.language='global'] - Language code (ko, en, global, etc.)
 * @param {string} [meta.tier='balanced'] - Tier (creative, balanced, precise)
 * 
 * @returns {Promise<Object>} Resolved runtime configuration
 * @returns {string} return.provider - LLM provider (openai, anthropic, etc.)
 * @returns {string} return.model_id - Model identifier
 * @returns {number} return.temperature - Temperature setting
 * @returns {number} [return.top_p] - Top-p sampling parameter
 * @returns {number} [return.max_tokens] - Maximum tokens
 * @returns {string} return.runtime_rule_id - Source rule document ID
 * @returns {string} return.resolved_language - Actual language used (after fallback)
 * @returns {string} return.resolved_tier - Actual tier used (after fallback)
 */
async function resolveRuntimeConfig(meta) {
    // Step 1: Input normalization
    const role = meta.role_type;
    const lang = (meta.language || 'global').toLowerCase();
    const tier = meta.tier || 'balanced';

    if (!role) {
        throw new Error('role_type is required');
    }

    console.log(`[RuntimeResolver] Resolving: role=${role}, lang=${lang}, tier=${tier}`);

    try {
        const db = firebase.firestore();

        // Step 2: Rule search with fallback
        let rule = null;
        let resolvedLanguage = lang;

        // 2.1: Try exact match (engine_type + language)
        if (lang !== 'global') {
            console.log(`[RuntimeResolver] Searching for: engine_type=${role}, language=${lang}`);
            const exactSnapshot = await db.collection('runtimeProfileRules')
                .where('engine_type', '==', role)
                .where('language', '==', lang)
                .where('is_active', '==', true)
                .limit(1)
                .get();

            if (!exactSnapshot.empty) {
                rule = { id: exactSnapshot.docs[0].id, ...exactSnapshot.docs[0].data() };
                console.log(`[RuntimeResolver] ✓ Found exact match: ${rule.id}`);
            }
        }

        // 2.2: Fallback to global language
        if (!rule) {
            console.log(`[RuntimeResolver] Falling back to: engine_type=${role}, language=global`);
            const globalSnapshot = await db.collection('runtimeProfileRules')
                .where('engine_type', '==', role)
                .where('language', '==', 'global')
                .where('is_active', '==', true)
                .limit(1)
                .get();

            if (!globalSnapshot.empty) {
                rule = { id: globalSnapshot.docs[0].id, ...globalSnapshot.docs[0].data() };
                resolvedLanguage = 'global';
                console.log(`[RuntimeResolver] ✓ Found global fallback: ${rule.id}`);
            }
        }

        // 2.3: No rule found
        if (!rule) {
            throw new Error(`No runtime profile rule found for role_type: ${role}`);
        }

        // Step 3: Tier selection with fallback
        let tierConfig = null;
        let resolvedTier = tier;

        // 3.1: Try requested tier
        if (rule.tiers && rule.tiers[tier]) {
            tierConfig = rule.tiers[tier];
            console.log(`[RuntimeResolver] ✓ Using requested tier: ${tier}`);
        }
        // 3.2: Fallback order: balanced → creative → precise
        else {
            const fallbackOrder = ['balanced', 'creative', 'precise'];
            console.log(`[RuntimeResolver] ⚠️  Tier '${tier}' not found, trying fallback...`);

            for (const fallbackTier of fallbackOrder) {
                if (rule.tiers && rule.tiers[fallbackTier]) {
                    tierConfig = rule.tiers[fallbackTier];
                    resolvedTier = fallbackTier;
                    console.log(`[RuntimeResolver] ✓ Using fallback tier: ${fallbackTier}`);
                    break;
                }
            }
        }

        // 3.3: No tier config found
        if (!tierConfig) {
            throw new Error(`No tier configuration found in rule: ${rule.id}`);
        }

        // Step 4: Build return object
        const config = {
            provider: tierConfig.provider,
            model_id: tierConfig.model_id,
            temperature: tierConfig.temperature,
            runtime_rule_id: rule.id,
            resolved_language: resolvedLanguage,
            resolved_tier: resolvedTier
        };

        // Optional fields
        if (tierConfig.top_p !== undefined) {
            config.top_p = tierConfig.top_p;
        }
        if (tierConfig.max_tokens !== undefined) {
            config.max_tokens = tierConfig.max_tokens;
        }

        console.log(`[RuntimeResolver] ✅ Resolved config:`, config);
        return config;

    } catch (error) {
        console.error(`[RuntimeResolver] ❌ Error:`, error);
        throw error;
    }
}

/**
 * Batch resolve multiple runtime configurations
 * Useful for resolving entire agent teams
 * 
 * @param {Array<Object>} metaArray - Array of metadata objects
 * @returns {Promise<Array<Object>>} Array of resolved configurations
 */
async function batchResolveRuntimeConfig(metaArray) {
    console.log(`[RuntimeResolver] Batch resolving ${metaArray.length} configs...`);

    const promises = metaArray.map(meta => resolveRuntimeConfig(meta));
    const results = await Promise.all(promises);

    console.log(`[RuntimeResolver] ✅ Batch resolved ${results.length} configs`);
    return results;
}

/**
 * Get all available runtime profile rules
 * Useful for admin UI and debugging
 * 
 * @returns {Promise<Array<Object>>} Array of all active rules
 */
async function getAllRuntimeRules() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('runtimeProfileRules')
            .where('is_active', '==', true)
            .get();

        const rules = [];
        snapshot.forEach(doc => {
            rules.push({ id: doc.id, ...doc.data() });
        });

        console.log(`[RuntimeResolver] Found ${rules.length} active rules`);
        return rules;

    } catch (error) {
        console.error(`[RuntimeResolver] Error fetching rules:`, error);
        throw error;
    }
}

/**
 * Get available tiers for a specific role and language
 * 
 * @param {string} role_type - Engine type
 * @param {string} [language='global'] - Language code
 * @returns {Promise<Array<string>>} Array of available tier names
 */
async function getAvailableTiers(role_type, language = 'global') {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('runtimeProfileRules')
            .where('engine_type', '==', role_type)
            .where('language', '==', language)
            .where('is_active', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Fallback to global
            const globalSnapshot = await db.collection('runtimeProfileRules')
                .where('engine_type', '==', role_type)
                .where('language', '==', 'global')
                .where('is_active', '==', true)
                .limit(1)
                .get();

            if (globalSnapshot.empty) {
                return [];
            }

            const rule = globalSnapshot.docs[0].data();
            return Object.keys(rule.tiers || {});
        }

        const rule = snapshot.docs[0].data();
        return Object.keys(rule.tiers || {});

    } catch (error) {
        console.error(`[RuntimeResolver] Error fetching tiers:`, error);
        return [];
    }
}

/**
 * Validate if a runtime configuration is valid
 * 
 * @param {Object} meta - Metadata to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateRuntimeConfig(meta) {
    try {
        const config = await resolveRuntimeConfig(meta);
        return {
            valid: true,
            config: config,
            warnings: []
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message,
            warnings: []
        };
    }
}

// Export for global access (browser console debugging)
if (typeof window !== 'undefined') {
    window.resolveRuntimeConfig = resolveRuntimeConfig;
    window.batchResolveRuntimeConfig = batchResolveRuntimeConfig;
    window.getAllRuntimeRules = getAllRuntimeRules;
    window.getAvailableTiers = getAvailableTiers;
    window.validateRuntimeConfig = validateRuntimeConfig;

    console.log('[RuntimeResolver] ✅ Utilities loaded and exposed to window');
    console.log('[RuntimeResolver] Available functions:');
    console.log('  - resolveRuntimeConfig(meta)');
    console.log('  - batchResolveRuntimeConfig(metaArray)');
    console.log('  - getAllRuntimeRules()');
    console.log('  - getAvailableTiers(role_type, language)');
    console.log('  - validateRuntimeConfig(meta)');
    console.log('');
    console.log('Example usage:');
    console.log('  await resolveRuntimeConfig({ role_type: "planner", language: "ko", tier: "balanced" })');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        resolveRuntimeConfig,
        batchResolveRuntimeConfig,
        getAllRuntimeRules,
        getAvailableTiers,
        validateRuntimeConfig
    };
}
