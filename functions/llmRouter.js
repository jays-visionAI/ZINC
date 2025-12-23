/**
 * LLM Router Module - PRD 11.6
 * 
 * Unified routing for all LLM calls with:
 * - Feature-based model selection
 * - Booster tier support
 * - Credit calculation and logging
 * - Dynamic Global Defaults (Admin configurable)
 */

const admin = require('firebase-admin');

// Hardcoded fallback models (if DB config missing)
// Hardcoded fallback models (if DB config missing)
const FALLBACK_DEFAULTS = {
    default: { provider: 'openai', model: 'gpt-4o', creditMultiplier: 1.0 },
    boost: { provider: 'openai', model: 'gpt-4o', creditMultiplier: 1.5 }
};

/**
 * LLM Router Class
 * Handles intelligent routing of LLM requests based on feature policies
 */
class LLMRouter {
    constructor(db) {
        // console.log('!!! LLMRouter Initialized with ROUTER ABSTRACTION v3.0 !!!');
        this.db = db;
        this.policyCache = new Map();
        this.modelCache = new Map();
        this.globalDefaults = null; // Cache for global defaults
        this.cacheTime = 0;
        this.CACHE_DURATION = 1000; // 1 second cache (Hotfix for immediate config updates)
    }

    /**
     * Main routing function
     * @param {Object} options - Routing options
     * @param {string} options.feature - Feature ID (e.g., 'studio.content_gen')
     * @param {string} options.qualityTier - 'DEFAULT' or 'BOOST'
     * @param {Array} options.messages - OpenAI-format messages
     * @param {number} options.temperature - Temperature for generation
     * @param {string} options.userId - User ID for logging
     * @param {string} options.projectId - Project ID for context
     * @param {Object} options.callLLM - Reference to callLLM function
     * @returns {Promise<Object>} - LLM result with routing metadata
     */
    async route(options) {
        const {
            feature,
            engineType,
            runtimeProfileId, // v4.0: Direct Profile ID (Source of Truth)
            qualityTier = 'DEFAULT',
            messages,
            temperature = 0.7,
            userId,
            projectId,
            callLLM,
            provider: explicitProvider, // Optional overrides
            model: explicitModel
        } = options;

        console.log(`[LLMRouter] Routing request: feature=${feature}, engineType=${engineType}, profileId=${runtimeProfileId}, tier=${qualityTier}`);

        // 1. Get configuration
        // Priority: Runtime Profile ID > Engine Type Match > Feature Policy
        let policy = null;
        let globalDefaults = null;

        if (runtimeProfileId) {
            console.log(`[LLMRouter] Resolving by ID: ${runtimeProfileId}`);
            [policy, globalDefaults] = await Promise.all([
                this.getRuntimeRuleById(runtimeProfileId),
                this.getGlobalDefaults()
            ]);
        } else if (engineType) {
            console.log(`[LLMRouter] Resolving by Engine Type: ${engineType}`);
            [policy, globalDefaults] = await Promise.all([
                this.getRuntimeRule(engineType),
                this.getGlobalDefaults()
            ]);
        } else {
            console.log(`[LLMRouter] Resolving by Feature Policy: ${feature}`);
            [policy, globalDefaults] = await Promise.all([
                this.getFeaturePolicy(feature),
                this.getGlobalDefaults()
            ]);
        }

        // 2. Resolve Configuration (New Router Logic)
        const config = await this.resolveLLMConfig(explicitProvider, explicitModel, policy, qualityTier, globalDefaults, projectId, temperature);
        const { provider, model, creditMultiplier = 1.0 } = config;

        console.log(`[LLMRouter] Selected: provider=${provider}, model=${model}, creditMultiplier=${creditMultiplier}`);

        // 3. Call the LLM
        const startTime = Date.now();
        // Use the resolved config values
        const result = await callLLM(provider, model, messages, config.temperature); // Use config.temperature (Router decided)
        const latencyMs = Date.now() - startTime;

        // 4. Calculate credit cost
        const creditCost = await this.calculateCreditCost(model, result.usage, creditMultiplier);

        // 5. Log usage
        await this.logUsage({
            userId,
            projectId,
            feature: runtimeProfileId ? `profile:${runtimeProfileId}` : (engineType ? `engine:${engineType}` : feature),
            qualityTier,
            provider,
            model,
            usage: result.usage,
            creditCost,
            latencyMs
        });

        // 6. Check if BOOST was requested but premium model not available
        let warning = null;
        if (qualityTier === 'BOOST') {
            const premiumModels = ['gpt-5', 'gpt-5.2', 'gpt-5-turbo', 'o1-preview', 'claude-3-opus', 'nano-banana-pro', 'gemini-1.5-pro'];
            if (!premiumModels.includes(model) && !model.includes('gpt-4')) {
                warning = '⚠️ BOOST 모드: 상위 버전 LLM이 아직 지원되지 않아 가용한 최상위 모델로 처리됩니다.';
            }
        }

        // 7. Return enriched result
        const finalModel = model || result.model || 'Unknown';

        return {
            ...result,
            model: finalModel,
            warning,
            routing: {
                feature,
                engineType,
                runtimeProfileId,
                provider,
                model: finalModel,
                creditMultiplier,
                creditCost
            }
        };
    }

    /**
     * Get API Key securely (from System Settings or Env)
     */
    async getApiKey(provider, projectId) {
        // Validation for security
        try {
            const doc = await this.db.collection('systemLLMProviders').doc(provider).get();
            if (doc.exists && doc.data().apiKey) {
                return doc.data().apiKey;
            }
        } catch (e) {
            console.warn(`[LLMRouter] Failed to fetch API key for ${provider}`, e);
        }
        return null;
    }

    /**
     * Get Runtime Rule directly by ID (v4.0)
     */
    async getRuntimeRuleById(id) {
        const cacheKey = `rule_id:${id}`;
        const now = Date.now();

        if (this.policyCache.has(cacheKey) && (now - this.cacheTime < this.CACHE_DURATION)) {
            return this.policyCache.get(cacheKey);
        }

        try {
            const doc = await this.db.collection('runtimeProfileRules').doc(id).get();
            if (!doc.exists) {
                console.warn(`[LLMRouter] No rule found for ID: ${id}, using defaults`);
                return null;
            }
            const rule = doc.data();
            this.policyCache.set(cacheKey, rule);
            return rule;
        } catch (error) {
            console.error(`[LLMRouter] Error loading rule ${id}:`, error);
            return null;
        }
    }

    /**
     * Get Runtime Rule from Firestore based on Engine Type
     */
    async getRuntimeRule(engineType) {
        const cacheKey = `rule:${engineType}`;
        const now = Date.now();

        if (this.policyCache.has(cacheKey) && (now - this.cacheTime < this.CACHE_DURATION)) {
            return this.policyCache.get(cacheKey);
        }

        try {
            const snapshot = await this.db.collection('runtimeProfileRules')
                .where('engine_type', '==', engineType)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (snapshot.empty) {
                console.warn(`[LLMRouter] No active rule found for engine: ${engineType}, using defaults`);
                return null;
            }

            const rule = snapshot.docs[0].data();
            // Normalize for legacy support if needed
            const normalizedPolicy = {
                defaultTier: rule.tiers?.balanced || rule.models?.balanced,
                boostTier: rule.tiers?.creative || rule.models?.creative,
                forceTier: null,
                ...rule // Keep all props including provider/model_id
            };

            this.policyCache.set(cacheKey, normalizedPolicy);
            return normalizedPolicy;

        } catch (error) {
            console.error(`[LLMRouter] Error loading rule for ${engineType}:`, error);
            return null;
        }
    }

    /**
     * Get features policy from Firestore (with caching)
     */
    async getFeaturePolicy(feature) {
        const now = Date.now();
        if (this.policyCache.has(feature) && (now - this.cacheTime < this.CACHE_DURATION)) {
            return this.policyCache.get(feature);
        }

        try {
            const doc = await this.db.collection('featurePolicies').doc(feature).get();
            if (!doc.exists) {
                console.warn(`[LLMRouter] Policy not found for feature: ${feature}, using defaults`);
                return null;
            }
            const policy = doc.data();
            this.policyCache.set(feature, policy);
            return policy;
        } catch (error) {
            console.error(`[LLMRouter] Error loading policy for ${feature}:`, error);
            return null;
        }
    }

    /**
     * Get Global Defaults from Firestore
     */
    async getGlobalDefaults() {
        const now = Date.now();
        if (this.globalDefaults && (now - this.cacheTime < this.CACHE_DURATION)) {
            return this.globalDefaults;
        }

        try {
            const doc = await this.db.collection('systemSettings').doc('llmConfig').get();
            let defaults = FALLBACK_DEFAULTS;

            if (doc.exists) {
                // Merge DB data with Fallbacks to ensure structure exists
                defaults = { ...FALLBACK_DEFAULTS, ...doc.data() };
                console.log('[LLMRouter] Loaded Global Defaults from DB:', JSON.stringify(defaults));
            } else {
                console.warn('[LLMRouter] Global defaults not found in DB, using hardcoded fallback.');
            }

            this.globalDefaults = defaults;
            this.cacheTime = now;
            return defaults;

        } catch (error) {
            console.error('[LLMRouter] Error loading global defaults:', error);
            return FALLBACK_DEFAULTS;
        }
    }

    /**
     * Determine final config (provider/model/params)
     */
    async resolveLLMConfig(explicitProvider, explicitModel, policy, qualityTier, globalDefaults, projectId, temperature) {

        // A. Resolve Abstract "LLM Router" Provider
        let resolvedProvider = explicitProvider || policy?.provider || globalDefaults?.provider || 'openai';
        let resolvedModel = explicitModel || policy?.model_id || globalDefaults?.model || 'gpt-4o';

        if (resolvedProvider === 'llm_router') {
            const abstractTag = resolvedModel;
            console.log(`[LLMRouter] resolving abstract model: ${abstractTag}`);

            // Dynamic Lookup from Global Defaults (Firestore)
            // Expects structure: { reasoning_optimized: { provider: '...', model: '...' }, ... }
            const tagMapping = globalDefaults?.tagMappings?.[abstractTag];

            if (tagMapping && tagMapping.provider && tagMapping.model) {
                resolvedProvider = tagMapping.provider;
                resolvedModel = tagMapping.model;
                console.log(`[LLMRouter] Mapped '${abstractTag}' -> ${resolvedProvider}/${resolvedModel}`);
            } else {
                // FALLBACKS (If DB config is missing)
                console.warn(`[LLMRouter] No mapping found for '${abstractTag}', using hardcoded fallback.`);
                switch (abstractTag) {
                    case 'reasoning_optimized':
                        resolvedProvider = 'openai';
                        resolvedModel = 'gpt-4o';
                        break;
                    case 'image_optimized':
                        resolvedProvider = 'openai';
                        resolvedModel = 'dall-e-3';
                        break;
                    case 'speed_optimized':
                        resolvedProvider = 'openai';
                        resolvedModel = 'gpt-4o-mini';
                        break;
                    default:
                        resolvedProvider = 'openai';
                        resolvedModel = 'gpt-4o';
                }
            }
        }

        // B. Dynamic Parameter Logic (Tier Handling)
        let selectedTemp = temperature;
        let selectedMaxTokens = 2000;

        if (qualityTier) {
            switch (qualityTier.toUpperCase()) { // Case insensitive
                case 'BOOST':
                case 'ULTRA':
                    console.log('[LLMRouter] 🚀 BOOST MODE ACTIVATED');

                    // 1. Try Root BOOST config (Script) OR Admin UI structure (defaultModels.boost)
                    const boostConfig = globalDefaults?.boost || globalDefaults?.defaultModels?.boost;

                    if (boostConfig) {
                        resolvedProvider = boostConfig.provider;
                        resolvedModel = boostConfig.model;
                        console.log(`[LLMRouter] Boost overrides model to: ${resolvedProvider}/${resolvedModel}`);
                    } else if (globalDefaults?.tagMappings?.reasoning_optimized) {
                        // 2. Fallback: Use 'reasoning_optimized'
                        const map = globalDefaults.tagMappings.reasoning_optimized;
                        resolvedProvider = map.provider;
                        resolvedModel = map.model;
                        console.log(`[LLMRouter] Boost missing, falling back to reasoning_optimized: ${resolvedProvider}/${resolvedModel}`);
                    } else {
                        // Hardcoded Fallback
                        resolvedProvider = 'openai';
                        resolvedModel = 'gpt-4o';
                        console.warn('[LLMRouter] Boost and Tag defaults missing, falling back to GPT-4o');
                    }

                    // Boost Params
                    selectedTemp = 0.7; // Slightly higher for creativity
                    selectedMaxTokens = 4000;
                    break;
                case 'CREATIVE':
                    selectedTemp = 0.9;
                    selectedMaxTokens = 4000;
                    break;
                case 'PRECISE':
                    selectedTemp = 0.1;
                    selectedMaxTokens = 4000;
                    break;
                case 'BALANCED':
                default:
                    selectedTemp = 0.7;
                    selectedMaxTokens = 2000;
                    break;
            }
        }

        // C. Construct Final Config
        const config = {
            provider: resolvedProvider,
            model: resolvedModel,
            temperature: selectedTemp,
            maxTokens: selectedMaxTokens,
            apiKey: await this.getApiKey(resolvedProvider, projectId),
            creditMultiplier: 1.0, // Default to 1.0, could implement dynamic multipliers later
            systemPrompt: null
        };

        console.log(`[LLMRouter] Resolved Config: ${config.provider}/${config.model} (Abstract: ${policy?.model_id}) (Temp: ${config.temperature})`);
        return config;
    }

    /**
     * Calculate credit cost based on model and usage
     */
    async calculateCreditCost(modelId, usage, creditMultiplier) {
        if (!usage) return 0;

        // Try to get model cost from cache or Firestore
        let modelData = this.modelCache.get(modelId);
        if (!modelData) {
            try {
                const doc = await this.db.collection('systemLLMModels').doc(modelId).get();
                if (doc.exists) {
                    modelData = doc.data();
                    this.modelCache.set(modelId, modelData);
                }
            } catch (error) {
                console.error(`[LLMRouter] Error loading model ${modelId}:`, error);
            }
        }

        // Calculate base credit cost
        const baseRate = modelData?.creditPer1kTokens || 1.0;
        const totalTokens = usage.total_tokens ||
            (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);

        // Credit cost = (tokens / 1000) * baseRate * creditMultiplier
        const creditCost = Math.ceil((totalTokens / 1000) * baseRate * creditMultiplier);
        return creditCost;
    }

    /**
     * Log LLM usage to Firestore
     */
    async logUsage(data) {
        try {
            await this.db.collection('llmUsageLogs').add({
                ...data,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('[LLMRouter] Failed to log usage:', error);
        }
    }

    /**
     * Deduct credits from user balance
     */
    async deductCredits(userId, creditCost, metadata = {}) {
        if (!userId || creditCost <= 0) {
            return { success: true, remaining: -1 };
        }

        try {
            const userRef = this.db.collection('users').doc(userId);
            return await this.db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) throw new Error('User not found');

                const userData = userDoc.data();
                const currentBalance = userData.creditBalance || 0;
                if (currentBalance < creditCost) throw new Error('Insufficient credits');

                const newBalance = currentBalance - creditCost;
                transaction.update(userRef, {
                    creditBalance: newBalance,
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });

                const transactionRef = this.db.collection('credit_transactions').doc();
                transaction.set(transactionRef, {
                    userId,
                    type: 'llm_usage',
                    cost: creditCost,
                    balanceAfter: newBalance,
                    metadata: { ...metadata, source: 'LLMRouter' },
                    created_at: admin.firestore.FieldValue.serverTimestamp()
                });

                return { success: true, remaining: newBalance };
            });
        } catch (error) {
            console.error('[LLMRouter] Credit deduction failed:', error);
            throw error;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.policyCache.clear();
        this.modelCache.clear();
        this.globalDefaults = null;
        this.cacheTime = 0;
        console.log('[LLMRouter] Cache cleared');
    }
}

module.exports = { LLMRouter };
