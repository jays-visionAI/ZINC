// ZYIC AGENT OS - PRD 5.1 Phase 1 Collection Initialization
// Seeds engineConfigs, runtimeProfiles, and placeholder documents for new collections.

(async function initPhase1Collections() {
    console.log("🚀 ZYIC AGENT OS - PRD 5.1 Phase 1 Collection Initialization");
    console.log("==========================================================\n");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found. Make sure Firebase is initialized.");
        return;
    }

    const projectId = "default_project"; // TODO: Get from context
    const orgId = "default_org";
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    const adminId = firebase.auth().currentUser?.uid || "system";

    // 1. Define Canonical Engine Types (PRD 5.1)
    const ENGINE_TYPES = [
        'manager', 'planner', 'research',
        'creator_text', 'creator_image', 'creator_video',
        'engagement', 'evaluator', 'kpi',
        'seo_watcher', 'event_router'
    ];

    // 2. Create engineConfigs
    console.log("📦 Step 1: Seeding engineConfigs...");
    const configBatch = db.batch();

    for (const type of ENGINE_TYPES) {
        const configRef = db.collection(`projects/${projectId}/engineConfigs`).doc(type);

        // Basic config structure based on PRD 5.1
        const configData = {
            orgId: orgId,
            projectId: projectId,
            engineType: type,
            engineVersion: "delta+1",
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: adminId,
            // Add specific defaults based on type (simplified for init)
            ...(type === 'planner' && {
                defaultFrequencies: { x: "daily", instagram: "3_per_week" },
                exploreExploitRatio: { exploit: 0.8, explore: 0.2 }
            }),
            ...(type === 'creator_text' && {
                platformModes: { x: { maxLength: 260 }, linkedin: { maxLength: 3000 } },
                languagePreferences: { primary: "en" }
            }),
            ...(type === 'manager' && {
                automationLevel: "balanced",
                approvalRules: { requireHumanForHighRisk: true }
            })
        };

        configBatch.set(configRef, configData, { merge: true });
    }
    await configBatch.commit();
    console.log(`   ✅ Created/Updated ${ENGINE_TYPES.length} engine configs.\n`);

    // 3. Create Default Runtime Profile
    console.log("📦 Step 2: Seeding runtimeProfiles...");
    const profileId = "rp_default";
    const profileRef = db.collection(`projects/${projectId}/runtimeProfiles`).doc(profileId);

    await profileRef.set({
        orgId: orgId,
        projectId: projectId,
        runtimeProfileId: profileId,
        name: "Default Balanced Mode",
        description: "Standard balanced operation mode",
        engineOverrides: {
            manager: { automationLevel: "balanced" }
        },
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
    });
    console.log(`   ✅ Created runtime profile: ${profileId}\n`);

    // 4. Initialize other collections with placeholder docs (to ensure they exist in Console)
    console.log("📦 Step 3: Initializing other collections...");

    const collections = [
        'tasks', 'campaigns', 'contentBriefs', 'contents',
        'learnings', 'kpiSnapshots', 'engagementLogs', 'videoSpecs'
    ];

    const initBatch = db.batch();

    for (const col of collections) {
        const docRef = db.collection(`projects/${projectId}/${col}`).doc('_init_placeholder');
        initBatch.set(docRef, {
            _description: "Placeholder to initialize collection",
            createdAt: timestamp
        });
    }

    await initBatch.commit();
    console.log(`   ✅ Initialized ${collections.length} collections with placeholders.\n`);

    // 5. Behaviour Pack (Mock Loader Setup)
    // In Phase 1, we might just use a static JSON or a specific collection.
    // Let's create a placeholder behaviourPack in Firestore for testing.
    console.log("📦 Step 4: Seeding mock Behaviour Pack...");
    const packId = "bp_creator_text_v1";
    await db.collection(`behaviourPacks`).doc(packId).set({
        packId: packId,
        engineType: "creator_text",
        platforms: ["x", "linkedin"],
        version: "1.0.0",
        payload: {
            tone_guidelines: "Professional yet approachable",
            templates: ["Hook - Value - CTA"]
        },
        createdAt: timestamp,
        updatedAt: timestamp
    });
    console.log(`   ✅ Created mock behaviour pack: ${packId}\n`);

    console.log("==========================================================");
    console.log("✨ PRD 5.1 Phase 1 Collections Initialized Successfully!");
    console.log("==========================================================\n");

    alert("✅ Phase 1 Collections Initialized! Check Console for details.");

})();
