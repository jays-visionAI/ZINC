const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'zinc-c790f'
    });
}

const db = admin.firestore();

async function listWorkflows() {
    try {
        const snapshot = await db.collection('workflows').get();
        console.log(`Found ${snapshot.size} workflows`);
        snapshot.forEach(doc => {
            console.log(`ID: ${doc.id}, Name: ${doc.data().name}`);
        });
    } catch (e) {
        console.error('Error:', e);
    }
}

listWorkflows();
