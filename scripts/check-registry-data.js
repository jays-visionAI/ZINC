// scripts/check-registry-data.js
// Quick check of existing Agent Registry data

const admin = require('../functions/node_modules/firebase-admin');

if (admin.apps.length === 0) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'zinc-c790f'
        });
    } catch (e) {
        console.error('Failed to initialize Firebase:', e.message);
        process.exit(1);
    }
}

const db = admin.firestore();

async function check() {
    console.log('=== Agent Registry Check ===\n');

    const registrySnap = await db.collection('agentRegistry').get();
    console.log('Total agents in Registry:', registrySnap.size);

    if (registrySnap.size > 0) {
        console.log('\nExisting agents:');
        registrySnap.forEach(doc => {
            const data = doc.data();
            const hasProcedures = data.sourceFiles ? '✓' : '✗';
            console.log(`  - ${doc.id}: ${data.name} (${data.category || 'N/A'}) [sourceFiles: ${hasProcedures}]`);
        });
    } else {
        console.log('\n⚠️  No agents found in Registry. Run seed script to populate.');
    }

    console.log('\n=== Agent Versions Check ===\n');

    const versionsSnap = await db.collection('agentVersions').get();
    console.log('Total versions:', versionsSnap.size);

    if (versionsSnap.size > 0) {
        const versionsByAgent = {};
        let procedureCount = 0;

        versionsSnap.forEach(doc => {
            const data = doc.data();
            if (!versionsByAgent[data.agentId]) versionsByAgent[data.agentId] = [];
            const prodLabel = data.isProduction ? ' (PROD)' : '';
            const procCount = data.procedures?.length || 0;
            if (procCount > 0) procedureCount++;
            versionsByAgent[data.agentId].push(`v${data.version}${prodLabel} [${procCount} procs]`);
        });

        console.log(`Versions with procedures: ${procedureCount}/${versionsSnap.size}\n`);

        Object.entries(versionsByAgent).forEach(([agentId, versions]) => {
            console.log(`  - ${agentId}: ${versions.join(', ')}`);
        });
    }

    console.log('\n=== Recommendation ===\n');

    if (registrySnap.size === 0) {
        console.log('👉 Run: node scripts/seed-agent-registry.js');
    } else {
        const hasNewAgents = !registrySnap.docs.some(d => d.id === 'STU-ORCHESTRATOR');
        if (hasNewAgents) {
            console.log('👉 New agents available. Run: node scripts/seed-agent-registry.js');
            console.log('   This will add: STU-ORCHESTRATOR, STU-CREATOR-TEXT, STU-CREATOR-IMAGE, GRW-MANAGER, GRW-REASONER');
        } else {
            console.log('✅ Registry is up to date.');
        }
    }

    process.exit(0);
}

check().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
