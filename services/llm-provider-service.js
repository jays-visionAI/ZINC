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
            // Placeholder for Gemini REST API test
            // Note: Gemini often uses query param ?key=API_KEY
            const startTime = Date.now();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Ping" }] }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            return {
                success: true,
                message: `Connected to Gemini (${model})`,
                latency: Date.now() - startTime
            };
        }
    }

    // Export singleton
    window.LLMProviderService = new LLMProviderService();

})();
