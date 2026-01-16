/**
 * Setup NewsAPI Key in Firestore
 * Run: node scripts/setup-newsapi.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json';
    try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'zinc-c790f'
        });
    } catch (e) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'zinc-c790f'
        });
    }
}

const db = admin.firestore();

async function setupNewsAPI() {
    const apiKey = process.argv[2] || '18969b7ab764d0cba28771e0a22a39a';

    console.log('Setting up NewsAPI key in Firestore...');

    try {
        await db.collection('systemLLMProviders').doc('newsapi').set({
            provider: 'newsapi',
            name: 'NewsAPI',
            apiKey: apiKey,
            status: 'active',
            description: 'News API for trending keyword analysis',
            dailyLimit: 100,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('✅ NewsAPI key saved successfully!');
        console.log('   Collection: systemLLMProviders');
        console.log('   Document: newsapi');
        console.log('   Status: active');

    } catch (error) {
        console.error('❌ Failed to save NewsAPI key:', error.message);
    }

    process.exit(0);
}

setupNewsAPI();
