/**
 * LLM Router Service - PRD 11.6
 * Frontend service for calling LLM with feature-based routing and Booster support
 */

(function () {
    console.log('[LLMRouterService] Initializing...');

    /**
     * Safe Firebase accessor - waits for Firebase to be ready
     */
    function getFirebase() {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            return firebase;
        }
        return null;
    }

    function getFirestore() {
        const fb = getFirebase();
        if (fb && fb.firestore) {
            return fb.firestore();
        }
        return null;
    }

    function getFunctions() {
        const fb = getFirebase();
        if (fb && fb.functions) {
            return fb.functions();
        }
        return null;
    }

    const LLMRouterService = {
        /**
         * Call LLM through the router
         * @param {Object} options
         * @param {string} options.feature - Feature ID (e.g., 'studio.content_gen')
         * @param {string} options.qualityTier - 'DEFAULT' or 'BOOST'
         * @param {string} options.systemPrompt - System prompt
         * @param {string} options.userPrompt - User prompt
         * @param {Array} options.messages - Optional: Full messages array (overrides prompts)
         * @param {number} options.temperature - Temperature (default: 0.7)
         * @param {string} options.projectId - Optional project ID
         * @returns {Promise<Object>} - Result with content and routing info
         */
        async call(options) {
            const {
                feature,
                qualityTier = 'DEFAULT',
                systemPrompt,
                userPrompt,
                messages,
                temperature = 0.7,
                projectId
            } = options;

            if (!feature) {
                throw new Error('Feature ID is required');
            }

            if (!messages && !userPrompt) {
                throw new Error('Either messages or userPrompt is required');
            }

            const functions = getFunctions();
            if (!functions) {
                throw new Error('Firebase Functions not initialized. Please wait for Firebase to load.');
            }

            console.log(`[LLMRouterService] Calling: feature=${feature}, tier=${qualityTier}`);

            try {
                const routeLLM = functions.httpsCallable('routeLLM');

                const result = await routeLLM({
                    feature,
                    qualityTier,
                    systemPrompt,
                    userPrompt,
                    messages,
                    images: options.images, // Support vision input
                    temperature,
                    projectId,
                    localTime: new Date().toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                });

                console.log('[LLMRouterService] Result:', {
                    model: result.data.model,
                    routing: result.data.routing
                });

                return result.data;
            } catch (error) {
                console.error('[LLMRouterService] Error:', error);
                throw error;
            }
        },

        /**
         * Quick content generation with boost option
         */
        async generateContent(feature, prompt, options = {}) {
            return this.call({
                feature,
                userPrompt: prompt,
                qualityTier: options.boost ? 'BOOST' : 'DEFAULT',
                systemPrompt: options.systemPrompt,
                temperature: options.temperature,
                projectId: options.projectId
            });
        },

        /**
         * Get available features and their policies
         */
        async getFeaturePolicies() {
            const db = getFirestore();
            if (!db) {
                console.warn('[LLMRouterService] Firestore not ready');
                return [];
            }

            try {
                const snapshot = await db.collection('featurePolicies')
                    .where('isActive', '==', true)
                    .get();

                const policies = [];
                snapshot.forEach(doc => {
                    policies.push({ id: doc.id, ...doc.data() });
                });

                return policies;
            } catch (error) {
                console.error('[LLMRouterService] Error fetching policies:', error);
                return [];
            }
        },

        /**
         * Get model info with costs
         */
        async getModelInfo(modelId) {
            const db = getFirestore();
            if (!db) {
                console.warn('[LLMRouterService] Firestore not ready');
                return null;
            }

            try {
                const doc = await db.collection('systemLLMModels').doc(modelId).get();

                if (!doc.exists) return null;
                return { id: doc.id, ...doc.data() };
            } catch (error) {
                console.error('[LLMRouterService] Error fetching model:', error);
                return null;
            }
        },

        /**
         * Estimate credit cost for a request
         */
        async estimateCost(feature, qualityTier = 'DEFAULT', estimatedTokens = 1000) {
            const db = getFirestore();
            if (!db) {
                console.warn('[LLMRouterService] Firestore not ready');
                return { estimated: 0, error: 'Firestore not ready' };
            }

            try {
                // Get policy
                const policyDoc = await db.collection('featurePolicies').doc(feature).get();
                if (!policyDoc.exists) {
                    return { estimated: 0, tier: 'unknown' };
                }

                const policy = policyDoc.data();
                const tier = qualityTier === 'BOOST' ? policy.boostTier : policy.defaultTier;

                if (!tier) {
                    return { estimated: 0, tier: 'default' };
                }

                // Get model info
                const modelDoc = await db.collection('systemLLMModels').doc(tier.model).get();
                const model = modelDoc.exists ? modelDoc.data() : { creditPer1kTokens: 1.0 };

                // Calculate
                const baseCost = (estimatedTokens / 1000) * model.creditPer1kTokens;
                const finalCost = Math.ceil(baseCost * tier.creditMultiplier);

                return {
                    estimated: finalCost,
                    model: tier.model,
                    provider: tier.provider,
                    multiplier: tier.creditMultiplier,
                    tier: qualityTier
                };
            } catch (error) {
                console.error('[LLMRouterService] Error estimating cost:', error);
                return { estimated: 0, error: error.message };
            }
        }
    };

    // Export globally
    window.LLMRouterService = LLMRouterService;

    console.log('[LLMRouterService] Ready');
})();

