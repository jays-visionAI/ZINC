const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSystemSettings() {
    console.log('--- Checking System Settings ---');
    try {
        const doc = await db.collection('systemSettings').doc('llmConfig').get();
        if (doc.exists) {
            console.log('Found systemSettings/llmConfig:');
            console.log(JSON.stringify(doc.data(), null, 2));

            const data = doc.data();
            const defaults = data.defaultModels || {};

            if (defaults.default?.model === 'gemini-3.0-pro' || defaults.default?.model === 'gemini-3-pro-preview') {
                console.log('⚠️ DETECTED BAD FALLBACK MODEL IN DB!');
                console.log('Fixing it now...');
                await db.collection('systemSettings').doc('llmConfig').set({
                    defaultModels: {
                        default: { provider: 'deepseek', model: 'deepseek-chat', creditMultiplier: 1.0 },
                        boost: { provider: 'deepseek', model: 'deepseek-reasoner', creditMultiplier: 1.5 }
                    }
                }, { merge: true });
                console.log('✅ Updated systemSettings/llmConfig to use deepseek');
            } else {
                console.log('✅ System settings look OK (not using broken gemini model)');
            }

        } else {
            console.log('❌ systemSettings/llmConfig does not exist.');
        }
    } catch (error) {
        console.error('Error reading settings:', error);
    }
    console.log('--- Check Complete ---');
}

checkSystemSettings();
