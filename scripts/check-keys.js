const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json'); // Adjust path if needed, or use default creds

// We'll try to use application default credentials if service account not found
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'zinc-c790f'
        });
    } catch (e) {
        console.log('Using default init...');
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function checkKeys() {
    console.log('Checking API Keys in Firestore...');

    const providers = ['newsapi', 'deepseek', 'openai'];
    const results = {};

    for (const p of providers) {
        // Check systemLLMProviders
        let doc = await db.collection('systemLLMProviders').doc(p).get();
        if (doc.exists) {
            results[p] = { source: 'systemLLMProviders', exists: true, length: doc.data().apiKey ? doc.data().apiKey.length : 0 };
            continue;
        }

        // Check systemSettings (fallback)
        doc = await db.collection('systemSettings').doc(p).get();
        if (doc.exists) {
            results[p] = { source: 'systemSettings', exists: true, length: doc.data().apiKey ? doc.data().apiKey.length : 0 };
            continue;
        }

        results[p] = { exists: false };
    }

    console.table(results);
}

checkKeys().catch(console.error);
