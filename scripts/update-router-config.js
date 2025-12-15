// 🚀 Router Configuration Script (Dynamic Model Selection)
// Run this in your Browser Console to update the LLM mappings.

(async function updateRouterConfig() {
    console.log("⚙️ Configuring LLM Router...");

    // 1. Define your Model Logic Here
    // The Router will look up these tags to decide which model to use.
    // You can switch providers (openai, google, anthropic) instantly.

    const tagMappings = {
        // --- TEXT / REASONING (BOOST FALLBACK) ---
        'reasoning_optimized': {
            provider: 'google',
            model: 'gemini-3.0-pro'
        },
        'technical_optimized': {
            provider: 'google',
            model: 'gemini-3.0-pro'
        },

        // --- CREATIVE / WRITING ---
        'creative_optimized': {
            provider: 'google',
            model: 'gemini-3.0-pro' // Switched to Gemini
        },

        // --- SPEED / COST ---
        'speed_optimized': {
            provider: 'google',
            model: 'gemini-3.0-flash' // Upgraded to 3.0 Flash
        },

        // --- IMAGE ---
        'image_optimized': {
            provider: 'google',
            model: 'imagen-3' // Use Imagen 3
        }
    };

    // 2. FUTURE MODEL PRESETS (Ready to Copy-Paste)
    /*
    const FUTURE_MAPPINGS = {
        'reasoning_optimized': { provider: 'openai', model: 'gpt-5.2' },       // The Beast
        'creative_optimized':  { provider: 'google', model: 'gemini-3.0-pro' }, // Nano Banana Pro
        'technical_optimized': { provider: 'anthropic', model: 'claude-4-opus' }
    };
    */


    // 3. Define Global Defaults (The "Boost" vs "Default" tiers)
    // This matches what the Admin UI saves to 'defaultModels'
    const defaultModels = {
        text: {
            default: { provider: 'google', model: 'gemini-2.0-flash-exp', creditMultiplier: 1.0 }, // Flash tier (2.0 Flash Exp for speed/quality balance)
            boost: { provider: 'google', model: 'gemini-2.0-flash-exp', creditMultiplier: 3.0 } // Boost -> 2.0 Flash Exp (Best Available)
        },
        image: {
            default: { provider: 'google', model: 'imagen-3', creditMultiplier: 1.0 },
            boost: { provider: 'google', model: 'imagen-3-fast', creditMultiplier: 2.0 }
        },
        video: {
            default: { provider: 'runway', model: 'gen-2', creditMultiplier: 1.0 },
            boost: { provider: 'runway', model: 'gen-3-alpha', creditMultiplier: 5.0 }
        },
        // Backward Compatibility
        default: { provider: 'google', model: 'gemini-2.0-flash-exp' },
        boost: { provider: 'google', model: 'gemini-2.0-flash-exp' }
    };

    try {
        await db.collection('systemSettings').doc('llmConfig').set({
            tagMappings: tagMappings,
            defaultModels: defaultModels, // <--- CRITICAL UPDATE: Syncs with dag-executor.js
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log("✅ Router Configuration (Tags & Defaults) Updated!");
        console.log("Current Mappings:", tagMappings);
        console.log("Current Defaults:", defaultModels);
        alert("✅ Router Configuration Updated successfully!");
    } catch (error) {
        console.error("❌ Failed to update config:", error);
        alert("❌ Error: " + error.message);
    }
})();
