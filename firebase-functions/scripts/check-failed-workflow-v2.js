const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'zinc-c790f'
    });
}

const db = admin.firestore();

async function checkWorkflow() {
    const workflowId = 'dn0sDJv9EQsM3NicleSL';
    console.log(`[DEBUG] Checking workflow: ${workflowId}`);

    try {
        const docRef = db.collection('workflows').doc(workflowId);
        console.log(`[DEBUG] Document Reference: ${docRef.path}`);

        const doc = await docRef.get();
        console.log(`[DEBUG] Exists: ${doc.exists}`);

        if (!doc.exists) {
            console.log('[DEBUG] Workflow not found in "workflows" collection.');
            // Try another common collection if applicable
            return;
        }

        const data = doc.data();
        console.log('[DEBUG] Workflow Name:', data.name);

        const nodes = data.nodes || [];
        console.log(`[DEBUG] Total nodes: ${nodes.length}`);

        const targetNode = nodes.find(n => n.data && n.data.name === '집단지성 (시장 키워드)');

        if (targetNode) {
            console.log('[DEBUG] Target Node Found:');
            console.log(JSON.stringify(targetNode, null, 2));
        } else {
            console.log('[DEBUG] Target Node "집단지성 (시장 키워드)" not found in workflow nodes.');
            console.log('[DEBUG] Node names found:', nodes.map(n => n.data?.name || n.id).join(', '));

            // Search for any firestore read nodes
            const fsReadNodes = nodes.filter(n => n.type === 'firestore' && n.data?.operation === 'read');
            console.log(`[DEBUG] Firestore Read nodes count: ${fsReadNodes.length}`);
            fsReadNodes.forEach(n => {
                console.log(`[DEBUG] FS Read Node: ${n.data?.name || n.id}, Config:`, JSON.stringify(n.data));
            });
        }
    } catch (e) {
        console.error('[DEBUG] Error:', e);
    }
}

checkWorkflow();
