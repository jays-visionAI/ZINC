const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'zinc-c790f'
    });
}

const db = admin.firestore();

async function checkWorkflow() {
    const workflowId = 'dn0sDJv9EQsM3NicleSL';
    console.log(`Checking workflow: ${workflowId}`);

    try {
        const doc = await db.collection('workflows').doc(workflowId).get();
        if (!doc.exists) {
            console.log('Workflow not found');
            return;
        }

        const data = doc.data();
        console.log('Workflow Name:', data.name);

        const nodes = data.nodes || [];
        const targetNode = nodes.find(n => n.data && n.data.name === '집단지성 (시장 키워드)');

        if (targetNode) {
            console.log('Target Node Found:');
            console.log(JSON.stringify(targetNode, null, 2));
        } else {
            console.log('Target Node "집단지성 (시장 키워드)" not found in workflow nodes.');
            console.log('All node names:', nodes.map(n => n.data?.name).join(', '));
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

checkWorkflow();
