// migrate-runtime-profiles.js
// Migration Script for ZYNK Runtime Profile v2.0
// 1. Populates runtimeProfiles collection with initial catalog
// 2. Migrates subAgentTemplates to include role/language/tier and link to profiles

(function () {
    'use strict';

    // Ensure utilities are loaded
    if (typeof window.RuntimeProfileUtils === 'undefined') {
        console.error('RuntimeProfileUtils not found. Please include utils-runtime-profile.js first.');
        return;
    }

    const { buildRuntimeProfileId, generateInitialCatalog } = window.RuntimeProfileUtils;

    window.migrateRuntimeProfiles = async function () {
        console.log('[Migration] Starting Runtime Profile v2.0 Migration...');
        const log = [];

        try {
            // --- Step 1: Populate Runtime Profiles ---
            console.log('[Migration] Step 1: Populating Runtime Profiles...');
            const catalog = generateInitialCatalog();
            const batchSize = 500;
            let batch = db.batch();
            let count = 0;

            for (const profile of catalog) {
                const ref = db.collection('runtimeProfiles').doc(profile.id);
                batch.set(ref, profile, { merge: true });
                count++;

                if (count % batchSize === 0) {
                    await batch.commit();
                    batch = db.batch();
                    console.log(`[Migration] Committed ${count} profiles...`);
                }
            }
            await batch.commit();
            console.log(`[Migration] Step 1 Complete. ${count} profiles created/updated.`);
            log.push(`[Success] Populated ${count} Runtime Profiles.`);


            // --- Step 2: Migrate Sub-Agent Templates ---
            console.log('[Migration] Step 2: Migrating Sub-Agent Templates...');
            const templatesSnapshot = await db.collection('subAgentTemplates').get();

            if (templatesSnapshot.empty) {
                console.log('[Migration] No Sub-Agent Templates found.');
                log.push('[Info] No Sub-Agent Templates to migrate.');
            } else {
                let updatedCount = 0;
                let skippedCount = 0;

                // Process in chunks to avoid batch limits
                const chunks = [];
                let currentChunk = db.batch();
                let chunkCounter = 0;

                for (const doc of templatesSnapshot.docs) {
                    const data = doc.data();

                    // Skip if already migrated (has runtime_profile_id)
                    if (data.runtime_profile_id && data.role_type && data.primary_language) {
                        skippedCount++;
                        continue;
                    }

                    // Determine Role/Language/Tier based on existing data or defaults
                    // Heuristic mapping based on template ID or type
                    let roleType = 'writer_short'; // Default
                    let language = 'en';           // Default
                    let tier = 'balanced';         // Default

                    // Attempt to infer from ID (e.g., "tpl_planner_v1")
                    if (data.id.includes('planner')) roleType = 'planner';
                    else if (data.id.includes('engagement')) { roleType = 'engagement'; tier = 'economy'; }
                    else if (data.id.includes('image')) roleType = 'image_instagram';
                    else if (data.id.includes('research')) roleType = 'research';

                    // Attempt to infer language (if stored in config or system prompt, otherwise default to 'en')
                    // For v1 migration, we assume 'en' unless specified otherwise manually later.

                    const profileId = buildRuntimeProfileId(roleType, language, tier);

                    currentChunk.update(doc.ref, {
                        role_type: roleType,
                        primary_language: language,
                        preferred_tier: tier,
                        runtime_profile_id: profileId,
                        updated_at: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    updatedCount++;
                    chunkCounter++;

                    if (chunkCounter >= 400) {
                        chunks.push(currentChunk);
                        currentChunk = db.batch();
                        chunkCounter = 0;
                    }
                }

                if (chunkCounter > 0) chunks.push(currentChunk);

                // Commit all chunks
                for (const chunk of chunks) {
                    await chunk.commit();
                }

                console.log(`[Migration] Step 2 Complete. Updated ${updatedCount}, Skipped ${skippedCount}.`);
                log.push(`[Success] Migrated ${updatedCount} Sub-Agent Templates. Skipped ${skippedCount}.`);
            }

            // --- Finalize ---
            console.log('[Migration] ✅ Migration Completed Successfully!');
            alert('Migration Complete! Check console for details.');
            return log;

        } catch (error) {
            console.error('[Migration] Error:', error);
            alert(`Migration Failed: ${error.message}`);
            log.push(`[Error] ${error.message}`);
            return log;
        }
    };

    console.log('[Migration] Module loaded. Run window.migrateRuntimeProfiles() to start.');

})();
