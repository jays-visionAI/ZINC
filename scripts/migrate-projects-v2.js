// Migration Script: Add new fields to existing projects
// Run this once in browser console or as a Cloud Function

(async function migrateProjectsV2() {
    console.log("🔄 Starting projects migration v2...");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found. Make sure Firebase is initialized.");
        return;
    }

    try {
        // Get all projects
        const snapshot = await db.collection("projects").get();
        console.log(`📊 Found ${snapshot.size} projects to migrate`);

        const batch = db.batch();
        let updateCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();

            // Check if already migrated
            if (data.status !== undefined) {
                console.log(`⏭️  Skipping ${doc.id} - already migrated`);
                return;
            }

            // Add new fields
            const updates = {
                // 5-stage status
                status: "Normal",

                // Progress tracking
                stepProgress: data.isDraft ? (data.draftStep || 1) : 3,

                // Agent count
                totalAgents: 0,

                // Cached KPIs (will be calculated by Cloud Function)
                avgFollowerGrowth30d: 0,
                avgEngagementRate: 0,
                totalContentCreated: 0,
                totalContentApproved: 0,
                avgApprovalRate: 0,
                kpiLastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };

            batch.update(doc.ref, updates);
            updateCount++;
            console.log(`✅ Queued ${doc.id} for migration`);
        });

        if (updateCount > 0) {
            await batch.commit();
            console.log(`✨ Successfully migrated ${updateCount} projects!`);
        } else {
            console.log("ℹ️  No projects needed migration");
        }

    } catch (error) {
        console.error("❌ Migration failed:", error);
    }
})();
