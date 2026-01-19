const admin = require('firebase-admin');

// Initialize Firebase Admin (Default Creds)
if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (e) {
        console.error('Failed to init admin:', e);
    }
}

// Require AFTER init to prevent "No App" error in dependent modules
const { LLMRouter } = require('../firebase-functions/llmRouter');

// Initialize Firebase Admin (Default Creds)
if (!admin.apps.length) {
    try {
        admin.initializeApp({ projectId: 'zinc-c790f' });
        console.log('✅ Firebase Admin Init with zinc-c790f');
    } catch (e) {
        console.error('Failed to init admin:', e);
    }
}

const db = admin.firestore();

async function verify() {
    console.log('🔍 Verifying Registry Fetch...');
    const router = new LLMRouter(db);

    // Test fetching General Strategist
    const agentId = 'STG-GEN';
    console.log(`fetching agent: ${agentId}...`);

    try {
        const config = await router.getAgentPromptById(agentId);

        if (config) {
            console.log('✅ Fetch Success!');
            console.log('System Prompt:', config.systemPrompt.substring(0, 50) + '...');
            console.log('Model:', config.config?.model);
        } else {
            console.error('❌ Fetch Failed: specific agent not found (or inactive).');
        }

    } catch (error) {
        console.error('❌ Error during fetch:', error);
    }
}

verify();
