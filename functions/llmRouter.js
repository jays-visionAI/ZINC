/**
 * LLM Router Module - PRD 11.6
 * 
 * Unified routing for all LLM calls with:
 * - Feature-based model selection
 * - Booster tier support
 * - Credit calculation and logging
 */

const admin = require('firebase-admin');

// Default models if policy not found
const DEFAULT_MODELS = {
    default: { provider: 'openai', model: 'gpt-5', creditMultiplier: 1.0 },
    boost: { provider: 'openai', model: 'gpt-5.2', creditMultiplier: 2.5 }
};

/**
 * LLM Router Class
 * Handles intelligent routing of LLM requests based on feature policies
 */
class LLMRouter {
    constructor(db) {
        this.db = db;
        this.policyCache = new Map();
        this.modelCache = new Map();
        this.cacheTime = 0;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
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
            qualityTier = 'DEFAULT',
            messages,
            temperature = 0.7,
            userId,
            projectId,
            callLLM
        } = options;

        console.log(`[LLMRouter] Routing request: feature=${feature}, tier=${qualityTier}`);

        // 1. Get feature policy
        const policy = await this.getFeaturePolicy(feature);

        // 2. Determine provider and model from policy
        const tier = this.determineTier(policy, qualityTier);
        const { provider, model, creditMultiplier } = tier;

        console.log(`[LLMRouter] Selected: provider=${provider}, model=${model}, creditMultiplier=${creditMultiplier}`);

        // 3. Call the LLM
        const startTime = Date.now();
        const result = await callLLM(provider, model, messages, temperature);
        const latencyMs = Date.now() - startTime;

        // 4. Calculate credit cost
        const creditCost = await this.calculateCreditCost(model, result.usage, creditMultiplier);

        // 5. Log usage
        await this.logUsage({
            userId,
            projectId,
            feature,
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
            // Check if we're actually using a premium model
            const premiumModels = ['gpt-5', 'gpt-5.2', 'gpt-5-turbo', 'o1-preview', 'claude-3-opus'];
            if (!premiumModels.includes(model)) {
                warning = '⚠️ BOOST 모드: 상위 버전 LLM(GPT-5 등)이 아직 지원되지 않아 현재 최상위 모델로 처리됩니다. 향후 업데이트 예정입니다.';
                console.log(`[LLMRouter] Warning: BOOST requested but using ${model} (premium not available)`);
            }
        }

        // 7. Return enriched result
        return {
            ...result,
            warning,
            routing: {
                feature,
                qualityTier,
                provider,
                model,
                creditMultiplier,
                creditCost,
                latencyMs,
                boostAvailable: !warning
            }
        };
    }

    /**
     * Get feature policy from Firestore (with caching)
     */
    async getFeaturePolicy(feature) {
        // Check cache
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
            this.cacheTime = now;

            return policy;
        } catch (error) {
            console.error(`[LLMRouter] Error loading policy for ${feature}:`, error);
            return null;
        }
    }

    /**
     * Determine which tier to use based on policy and request
     */
    determineTier(policy, qualityTier) {
        // If no policy, use defaults
        if (!policy) {
            return qualityTier === 'BOOST' ? DEFAULT_MODELS.boost : DEFAULT_MODELS.default;
        }

        // If force tier is set, always use it (regardless of user selection)
        if (policy.forceTier && policy.forceTier.model) {
            console.log(`[LLMRouter] Force tier applied: ${policy.forceTier.model}`);
            return policy.forceTier;
        }

        let selectedTier = policy.defaultTier || DEFAULT_MODELS.default;

        if (qualityTier === 'BOOST' && policy.boostTier) {
            selectedTier = policy.boostTier;
        }

        return selectedTier;
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
            // Don't fail the request if logging fails
            console.error('[LLMRouter] Failed to log usage:', error);
        }
    }

    /**
     * Deduct credits from user balance
     * @returns {Promise<{success: boolean, remaining: number}>}
     */
    async deductCredits(userId, creditCost, metadata = {}) {
        if (!userId || creditCost <= 0) {
            return { success: true, remaining: -1 };
        }

        try {
            const userRef = this.db.collection('users').doc(userId);

            return await this.db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw new Error('User not found');
                }

                const userData = userDoc.data();
                const currentBalance = userData.creditBalance || 0;

                if (currentBalance < creditCost) {
                    throw new Error('Insufficient credits');
                }

                const newBalance = currentBalance - creditCost;

                // Update balance
                transaction.update(userRef, {
                    creditBalance: newBalance,
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });

                // Log transaction
                const transactionRef = this.db.collection('credit_transactions').doc();
                transaction.set(transactionRef, {
                    userId,
                    type: 'llm_usage',
                    cost: creditCost,
                    balanceAfter: newBalance,
                    metadata: {
                        ...metadata,
                        source: 'LLMRouter'
                    },
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
     * Clear cache (for testing or manual refresh)
     */
    clearCache() {
        this.policyCache.clear();
        this.modelCache.clear();
        this.cacheTime = 0;
        console.log('[LLMRouter] Cache cleared');
    }
}

module.exports = { LLMRouter };
