const admin = require('firebase-admin');

// Set Emulator Host (Default Port 8080)
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({ projectId: 'zinc-c790f' });

const db = admin.firestore();

async function configureGemini() {
    console.log('🚀 Configuring Gemini Routing Policies...');

    try {
        // 1. Global Defaults -> Google
        await db.collection('systemSettings').doc('llmConfig').set({
            defaultModels: {
                default: { provider: 'google', model: 'gemini-2.0-flash-exp', creditMultiplier: 1.0 },
                boost: { provider: 'google', model: 'gemini-3.0-pro', creditMultiplier: 2.0 }
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('   ✓ Global Defaults set to Gemini');

        // 2. Feature Policy -> Google
        await db.collection('featurePolicies').doc('agent_execution').set({
            defaultTier: { provider: 'google', model: 'gemini-2.0-flash-exp' },
            boostTier: { provider: 'google', model: 'gemini-3.0-pro' },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('   ✓ Agent Execution Policy set to Gemini');

        // 3. Ensure System Provider Doc exists (even if key is placeholder)
        // This ensures the router finds a provider doc, even if key is invalid
        await db.collection('systemLLMProviders').doc('google_default').set({
            provider: 'google',
            status: 'active', // Important for router
            apiKey: 'PLACEHOLDER_KEY_FOR_TESTING',
            label: 'Gemini Default',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('   ✓ Gemini Provider Doc created (Placeholder Key)');

        console.log('\n✅ Configuration Complete! Router will now route to Gemini.');
        console.log('   (Note: Actual generation will fail without a valid API Key, triggering Fallback or Mock)');

    } catch (error) {
        console.error('❌ Error configuring Gemini:', error);
    }
}

configureGemini();
