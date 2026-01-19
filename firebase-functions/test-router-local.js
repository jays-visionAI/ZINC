// functions/test-router-local.js
// Mocking Firebase Admin to run locally without auth
const mockDb = {
    collection: (name) => ({
        doc: (id) => ({
            get: async () => {
                // Mock System Settings
                if (name === 'systemSettings') return { exists: true, data: () => ({ defaultModels: { provider: 'openai', model: 'gpt-3.5-turbo' } }) };

                // Mock System Providers (API Key)
                if (name === 'systemLLMProviders') return { exists: true, data: () => ({ apiKey: 'sk-mock-key' }) };

                // Mock Runtime Profile Rules (THE TEST DATA)
                if (name === 'runtimeProfileRules') {
                    if (id === 'rtp_reasoning_v1') {
                        return {
                            exists: true,
                            data: () => ({
                                provider: 'llm_router',
                                model_id: 'reasoning_optimized',
                                id: 'rtp_reasoning_v1'
                            })
                        };
                    }
                }

                return { exists: false };
            }
        })
    })
};

const { LLMRouter } = require('./llmRouter');

async function runTest() {
    console.log("🧪 Starting LLMRouter Local Test...");
    const router = new LLMRouter(mockDb);

    // Test Case: Profile with 'llm_router' + 'reasoning_optimized'
    console.log("\n--- Test Case 1: High Reasoning Profile ---");
    const options = {
        runtimeProfileId: 'rtp_reasoning_v1',
        qualityTier: 'creative', // Requesting Creative tier
        messages: [{ role: 'user', content: 'test' }],
        callLLM: async (p, m, msgs, t) => {
            console.log(`[Validation] callLLM INVOKED with: Provider=${p}, Model=${m}, Temp=${t}`);
            return { usage: { total_tokens: 100 }, model: m };
        }
    };

    const result = await router.route(options);

    // Assertions
    const success = (result.routing.provider === 'openai' && result.routing.model === 'gpt-4o');
    if (success) {
        console.log("✅ PASS: Correctly resolved 'reasoning_optimized' to 'gpt-4o'");
    } else {
        console.error("❌ FAIL: Expected openai/gpt-4o, got " + result.routing.provider + "/" + result.routing.model);
    }
}

runTest();
