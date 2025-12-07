// scripts/migrate-content-category.js
// Migrates existing generatedContents to add content_category field

(async function migrateContentCategory() {
    console.log('🔄 Starting content_category migration...');

    if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') {
        console.error('❌ Firebase not loaded. Run this script in the browser console on the app.');
        return;
    }

    const db = firebase.firestore();
    const projectId = 'default_project';

    try {
        // Get all generatedContents
        const snapshot = await db.collection('projects')
            .doc(projectId)
            .collection('generatedContents')
            .get();

        console.log(`📊 Found ${snapshot.size} documents to migrate`);

        let updated = 0;
        let skipped = 0;

        const batch = db.batch();
        let batchCount = 0;
        const MAX_BATCH = 500;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Skip if already has content_category
            if (data.content_category) {
                skipped++;
                continue;
            }

            // Determine content_category based on existing fields
            let contentCategory = 'publishable';
            let executionStage = null;

            if (data.is_meta || data.content_type === 'meta') {
                contentCategory = 'work_log';
            }

            // Infer execution_stage from sub_agent_role
            const role = (data.sub_agent_role || '').toLowerCase();
            if (role.includes('planner') || role.includes('기획') || role.includes('research') || role.includes('조사')) {
                executionStage = 'planning';
            } else if (role.includes('creator') || role.includes('생성') || role.includes('text') || role.includes('image')) {
                executionStage = 'creation';
            } else if (role.includes('review') || role.includes('심의') || role.includes('manager') || role.includes('매니저') || role.includes('compliance')) {
                executionStage = 'review';
            }

            // Update document
            batch.update(doc.ref, {
                content_category: contentCategory,
                execution_stage: executionStage
            });

            updated++;
            batchCount++;

            // Commit batch if approaching limit
            if (batchCount >= MAX_BATCH) {
                await batch.commit();
                console.log(`✅ Committed batch of ${batchCount} updates`);
                batchCount = 0;
            }
        }

        // Commit remaining
        if (batchCount > 0) {
            await batch.commit();
            console.log(`✅ Committed final batch of ${batchCount} updates`);
        }

        console.log('');
        console.log('='.repeat(50));
        console.log('🎉 Migration Complete!');
        console.log(`   ✅ Updated: ${updated} documents`);
        console.log(`   ⏩ Skipped: ${skipped} documents (already migrated)`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
})();
