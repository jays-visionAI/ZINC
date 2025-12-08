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
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: 'Ping' }],
                    max_tokens: 5
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            return {
                success: true,
                message: `Connected to OpenAI (${model})`,
                latency: Date.now() - startTime
            };
        }

        async _testAnthropic(apiKey, model = 'claude-3-haiku-20240307') {
            const startTime = Date.now();
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 5,
                    messages: [{ role: 'user', content: 'Ping' }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            return {
                success: true,
                message: `Connected to Anthropic (${model})`,
                latency: Date.now() - startTime
            };
        }

        async _testGemini(apiKey, model = 'gemini-pro') {
            // Enhanced Gemini Test: Use listModels to validate API Key first
            // This avoids "Model not found" errors when the key is valid but the specific model string is tricky
            const startTime = Date.now();

            // 1. Try to list models (Best validation for API Key)
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`;

            try {
                const listResponse = await fetch(listUrl);

                if (!listResponse.ok) {
                    const errorData = await listResponse.json();
                    throw new Error(errorData.error?.message || `HTTP ${listResponse.status} (ListModels failed)`);
                }

                return {
                    success: true,
                    message: `Connected to Gemini API (Valid Key)`,
                    latency: Date.now() - startTime
                };

            } catch (error) {
                // If listModels fails, we might try generation as fallback or just throw
                console.warn("[LLMProviderService] Gemini listModels failed, checking error:", error);

                // If it's a 403 or 400 with API Key issues, throw immediately
                if (error.message.includes('API key') || error.message.includes('403') || error.message.includes('400')) {
                    throw error;
                }

                // Fallback: Try generation if listModels failed for some other reason (e.g. scope)
                // But usually listModels is the open door.
                throw error;
            }
        }
    }

    // Export singleton
    window.LLMProviderService = new LLMProviderService();

})();
