const firebase = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!firebase.apps.length) {
    firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount)
    });
}

const db = firebase.firestore();

async function checkProfiles() {
    try {
        const snapshot = await db.collection('runtimeProfiles').get();
        console.log('Total Profiles:', snapshot.size);
        snapshot.forEach(doc => {
            console.log(`ID: ${doc.id}, Engine: ${doc.data().engine_type}, Status: ${doc.data().status}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

checkProfiles();
