const admin = require('firebase-admin');

// Initialize Firebase Admin (Default Creds)
if (!admin.apps.length) {
    try {
        admin.initializeApp({ projectId: 'zinc-c790f' });
    } catch (e) {
        console.error('Failed to init admin:', e);
    }
}

const db = admin.firestore();

async function inspect() {
    console.log('🔍 Inspecting Firestore Data for STG-GEN...');
    try {
        const doc = await db.collection('agentRegistry').doc('STG-GEN').get();
        console.log('Registry Exists:', doc.exists);
        if (doc.exists) {
            console.log('Registry Data:', JSON.stringify(doc.data(), null, 2));
        } else {
            console.log('❌ Registry Document MISSING');
        }

        const versions = await db.collection('agentVersions').where('agentId', '==', 'STG-GEN').get();
        console.log('Versions Found:', versions.size);
        versions.forEach(v => {
            console.log('Version ID:', v.id);
            console.log('Version Data:', JSON.stringify(v.data(), null, 2));
        });

    } catch (error) {
        console.error('❌ Error during inspection:', error);
    }
}

inspect();
