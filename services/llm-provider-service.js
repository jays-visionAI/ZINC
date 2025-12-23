// services/llm-provider-service.js
// Service for managing System LLM Providers and testing connections

(function () {
    console.log("[LLMProviderService] Initializing...");

    class LLMProviderService {
        constructor() {
            this.collectionName = 'systemLLMProviders';
            this.db = firebase.firestore();
        }

        /**
         * Get all providers
         * @returns {Promise<Array>} List of providers
         */
        async getProviders() {
            try {
                // Removed orderBy to avoid index requirements
                const snapshot = await this.db.collection(this.collectionName).get();

                const providers = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                console.log(`[LLMProviderService] Found ${providers.length} providers`);
                return providers;
            } catch (error) {
                console.error("[LLMProviderService] Error fetching providers:", error);
                throw error;
            }
        }

        /**
         * Save or Update a provider
         * @param {string} id - Doc ID (optional for create)
         * @param {object} data - Provider data
         */
        async saveProvider(id, data) {
            try {
                const timestamp = firebase.firestore.FieldValue.serverTimestamp();
                const payload = {
                    ...data,
                    updatedAt: timestamp
                };

                if (!id) {
                    // Create
                    payload.createdAt = timestamp;
                    const docRef = await this.db.collection(this.collectionName).add(payload);
                    return docRef.id;
                } else {
                    // Update
                    await this.db.collection(this.collectionName).doc(id).update(payload);
                    return id;
                }
            } catch (error) {
                console.error("[LLMProviderService] Error saving provider:", error);
                throw error;
            }
        }

        /**
         * Delete a provider
         * @param {string} id 
         */
        async deleteProvider(id) {
            try {
                await this.db.collection(this.collectionName).doc(id).delete();
            } catch (error) {
                console.error("[LLMProviderService] Error deleting provider:", error);
                throw error;
            }
        }

        /**
         * Test connection to the provider
         * @param {object} config - { provider, apiKey, baseUrl, model }
         * @returns {Promise<object>} - { success: boolean, message: string, latency: number }
         */
        async testConnection(config) {
            const startTime = Date.now();
            const { provider, apiKey, baseUrl, model } = config;

            console.log(`[LLMProviderService] Testing connection to ${provider}...`);

            try {
                if (provider === 'openai') {
                    return await this._testOpenAI(apiKey, model);
                } else if (provider === 'anthropic') {
                    return await this._testAnthropic(apiKey, model);
                } else if (provider === 'gemini') {
                    return await this._testGemini(apiKey, model);
                } else if (provider === 'deepseek') {
                    return await this._testDeepSeek(apiKey, model);
                } else {
                    throw new Error(`Provider '${provider}' testing not implemented yet.`);
                }
            } catch (error) {
                console.error(`[LLMProviderService] Connection test failed:`, error);
                return {
                    success: false,
                    message: error.message || "Unknown error",
                    latency: Date.now() - startTime
                };
            }
        }

        // --- Internal Test Implementations ---

        async _testOpenAI(apiKey, model = 'gpt-4o-mini') {
            const startTime = Date.now();
            try {
                const testFn = firebase.functions().httpsCallable('testLLMProviderConnection');
                const result = await testFn({
                    providerType: 'openai',
                    apiKey: apiKey
                });
                const response = result.data;
                if (!response.success) throw new Error(response.error || 'Connection check failed');

                return {
                    success: true,
                    message: `Connected to OpenAI`,
                    latency: Date.now() - startTime
                };
            } catch (error) {
                console.error("[LLMProviderService] OpenAI test failed:", error);
                return { success: false, message: error.message, latency: Date.now() - startTime };
            }
        }

        async _testAnthropic(apiKey, model = 'claude-3-haiku-20240307') {
            const startTime = Date.now();
            try {
                const testFn = firebase.functions().httpsCallable('testLLMProviderConnection');
                const result = await testFn({
                    providerType: 'anthropic',
                    apiKey: apiKey
                });
                const response = result.data;
                if (!response.success) throw new Error(response.error || 'Connection check failed');

                return {
                    success: true,
                    message: `Connected to Anthropic`,
                    latency: Date.now() - startTime
                };
            } catch (error) {
                console.error("[LLMProviderService] Anthropic test failed:", error);
                return { success: false, message: error.message, latency: Date.now() - startTime };
            }
        }

        async _testGemini(apiKey, model = 'gemini-pro') {
            const startTime = Date.now();
            try {
                const testFn = firebase.functions().httpsCallable('testLLMProviderConnection');
                const result = await testFn({
                    providerType: 'gemini',
                    apiKey: apiKey
                });
                const response = result.data;
                if (!response.success) throw new Error(response.error || 'Connection check failed');

                return {
                    success: true,
                    message: `Connected to Gemini`,
                    latency: Date.now() - startTime
                };
            } catch (error) {
                console.error("[LLMProviderService] Gemini test failed:", error);
                return { success: false, message: error.message, latency: Date.now() - startTime };
            }
        }

        async _testDeepSeek(apiKey, model = 'deepseek-chat') {
            const startTime = Date.now();
            try {
                console.log('[LLMProviderService] Testing DeepSeek via Cloud Function (CORS bypass)...');

                // Use Cloud Function to verify connection server-side
                const testFn = firebase.functions().httpsCallable('testLLMProviderConnection');
                const result = await testFn({
                    providerType: 'deepseek',
                    apiKey: apiKey
                });

                const response = result.data; // Callable result payload

                if (!response.success) {
                    throw new Error(response.error || 'Connection check failed');
                }

                return {
                    success: true,
                    message: `Connected to DeepSeek (verified by server)`,
                    latency: Date.now() - startTime
                };
            } catch (error) {
                console.error("[LLMProviderService] DeepSeek test failed:", error);
                // Return failure instead of throwing to prevent UI crash
                return {
                    success: false,
                    message: error.message || "DeepSeek Connection Failed",
                    latency: Date.now() - startTime
                };
            }
        }
    }

    // Export singleton
    window.LLMProviderService = new LLMProviderService();

})();
