(async function seedRuntimeProfilesV7() {
    console.log("🚀 Starting Runtime Profile Seeding (v7.0 Router Abstraction)...");

    if (typeof db === 'undefined') {
        console.error("❌ 'db' undefined.");
        return;
    }

    const profiles = [
        {
            id: 'rtp_reasoning_v1',
            runtime_profile_id: 'rtp_reasoning_v1',
            name: 'High Reasoning (Router Managed)',
            description: 'Top-tier logic capability managed by LLM Router.',
            language: 'english',
            status: 'active',
            // Abstract Configuration
            provider: 'llm_router',
            model_id: 'reasoning_optimized', // Maps to GPT-4o in Code
            capabilities: { chat: true }
        },
        {
            id: 'rtp_content_writing_v1',
            runtime_profile_id: 'rtp_content_writing_v1',
            name: 'Creative Writing (Router Managed)',
            description: 'Creative generation capability managed by LLM Router.',
            language: 'english',
            status: 'active',
            provider: 'llm_router',
            model_id: 'creative_optimized', // Maps to GPT-4o in Code
            capabilities: { chat: true }
        },
        {
            id: 'rtp_technical_v1',
            runtime_profile_id: 'rtp_technical_v1',
            name: 'Technical Strict (Router Managed)',
            description: 'Technical capability managed by LLM Router.',
            language: 'english',
            status: 'active',
            provider: 'llm_router',
            model_id: 'technical_optimized', // Maps to GPT-4o in Code
            capabilities: { chat: true }
        },
        {
            id: 'rtp_fast_v1',
            runtime_profile_id: 'rtp_fast_v1',
            name: 'Economy Fast (Router Managed)',
            description: 'Fast response capability managed by LLM Router.',
            language: 'english',
            status: 'active',
            provider: 'llm_router',
            model_id: 'speed_optimized', // Maps to GPT-4o-mini in Code
            capabilities: { chat: true }
        },
        {
            id: 'rtp_visual_v1',
            runtime_profile_id: 'rtp_visual_v1',
            name: 'Visual Generation (Router Managed)',
            description: 'Image capability managed by LLM Router.',
            language: 'english',
            status: 'active',
            provider: 'llm_router',
            model_id: 'image_optimized', // Maps to DALL-E 3 in Code
            capabilities: { image_generation: true }
        }
    ];

    try {
        const batch = db.batch();
        profiles.forEach(p => {
            const ref = db.collection('runtimeProfileRules').doc(p.id);
            batch.set(ref, {
                ...p,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        console.log(`✅ Successfully seeded ${profiles.length} Router-Abstracted profiles.`);
        alert(`✅ Seeded ${profiles.length} Router-Managed Profiles!`);

        if (window.initRuntimeProfiles) window.initRuntimeProfiles();
    } catch (e) {
        console.error("Seeding failed", e);
        alert(`❌ Seeding failed: ${e.message}`);
    }

})();
