/**
 * CLI Upload Script: Synchronize Agent Blueprints (Source Code) to Firestore
 */
let admin;
try {
    admin = require('firebase-admin');
} catch (e) {
    try {
        admin = require('../firebase-functions/node_modules/firebase-admin');
    } catch (e2) {
        console.error("❌ Could not find 'firebase-admin' module.");
        process.exit(1);
    }
}

const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with ADC
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "zinc-c790f"
    });
}

const db = admin.firestore();

async function uploadBlueprints() {
    console.log("📂 Loading blueprints from source code...");
    const filePath = path.join(__dirname, '../agents/blueprints/standard-agents.json');

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Blueprint file not found: ${filePath}`);
        process.exit(1);
    }

    const blueprints = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const batch = db.batch();
    const ts = admin.firestore.FieldValue.serverTimestamp();

    for (const agent of blueprints) {
        console.log(`🚀 Processing: ${agent.name} (${agent.id})`);

        // 1. Update Registry entry
        const registryRef = db.collection('agentRegistry').doc(agent.id);
        batch.set(registryRef, {
            id: agent.id,
            name: agent.name,
            category: agent.category,
            description: agent.description,
            status: 'active',
            currentProductionVersion: '1.0.0',
            sourceFiles: ['services/agent-execution-service.js'],
            updatedAt: ts
        }, { merge: true });

        // 2. Create Production Version (v1.0.0)
        const versionId = `${agent.id}-v1-0-0`;
        const versionRef = db.collection('agentVersions').doc(versionId);
        batch.set(versionRef, {
            agentId: agent.id,
            version: '1.0.0',
            status: 'production',
            isProduction: true,
            systemPrompt: agent.systemPrompt,
            config: agent.config,
            procedures: agent.procedures,
            changelog: "Imported from source-code blueprints (Standard Agent Profiles)",
            createdAt: ts
        }, { merge: true });
    }

    try {
        await batch.commit();
        console.log("✨ All 12 blueprints successfully uploaded to Agent Registry!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Upload failed:", e);
        process.exit(1);
    }
}

uploadBlueprints();
