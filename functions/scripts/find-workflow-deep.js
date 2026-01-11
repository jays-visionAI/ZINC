const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'zinc-c790f'
    });
}

const db = admin.firestore();

async function findWorkflow() {
    const workflowId = 'dn0sDJv9EQsM3NicleSL';
    console.log(`Searching for Workflow ID: ${workflowId}`);

    const collections = ['workflows', 'workflowDefinitions', 'systemWorkflows'];

    for (const col of collections) {
        try {
            const doc = await db.collection(col).doc(workflowId).get();
            if (doc.exists) {
                console.log(`FOUND in collection: ${col}`);
                const data = doc.data();
                console.log('Name:', data.name);
                const collectiveNode = data.nodes?.find(n => n.data?.name === 'Collective Intelligence' || n.id === 'collective_intelligence' || n.data?.name === '집단지성 (시장 키워드)');
                if (collectiveNode) {
                    console.log('Collective Intelligence Node found:', JSON.stringify(collectiveNode, null, 2));
                } else {
                    console.log('Collective Intelligence Node NOT found. Nodes:', data.nodes?.map(n => n.data?.name).join(', '));
                }
                return;
            }
        } catch (e) {
            console.log(`Error checking ${col}:`, e.message);
        }
    }

    console.log('Workflow not found in any common collections.');
}

findWorkflow();
