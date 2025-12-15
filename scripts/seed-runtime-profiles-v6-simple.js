(async function seedRuntimeProfilesV6() {
    console.log("🚀 Starting Runtime Profile Seeding (v6.0 Simplified)...");

    if (typeof db === 'undefined') {
        console.error("❌ 'db' undefined.");
        return;
    }

    const profiles = [
        {
            id: 'rtp_reasoning_v1',
            runtime_profile_id: 'rtp_reasoning_v1',
            name: 'High Reasoning (GPT-4o)',
            description: 'Top-tier logic and reasoning capability.',
            language: 'english',
            status: 'active',
            // Simplified Base Config
            provider: 'openai',
            model_id: 'gpt-4o',
            capabilities: { chat: true }
        },
        {
            id: 'rtp_content_writing_v1',
            runtime_profile_id: 'rtp_content_writing_v1',
            name: 'Creative Writing (GPT-4o)',
            description: 'Top-tier creative generation capability.',
            language: 'english',
            status: 'active',
            provider: 'openai',
            model_id: 'gpt-4o',
            capabilities: { chat: true }
        },
        {
            id: 'rtp_technical_v1',
            runtime_profile_id: 'rtp_technical_v1',
            name: 'Technical Strict (GPT-4o)',
            description: 'High precision technical capability.',
            language: 'english',
            status: 'active',
            provider: 'openai',
            model_id: 'gpt-4o',
            capabilities: { chat: true }
        },
        {
            id: 'rtp_fast_v1',
            runtime_profile_id: 'rtp_fast_v1',
            name: 'Economy Fast (GPT-4o-mini)',
            description: 'Cost-effective fast response capability.',
            language: 'english',
            status: 'active',
            provider: 'openai',
            model_id: 'gpt-4o-mini',
            capabilities: { chat: true }
        },
        {
            id: 'rtp_visual_v1',
            runtime_profile_id: 'rtp_visual_v1',
            name: 'Visual Generation (DALL-E 3)',
            description: 'Image generation capability.',
            language: 'english',
            status: 'active',
            provider: 'openai',
            model_id: 'dall-e-3',
            capabilities: { image_generation: true }
        }
    ];

    try {
        const batch = db.batch();
        profiles.forEach(p => {
            const ref = db.collection('runtimeProfileRules').doc(p.id);
            // Overwrite existing complex structure with simpler one
            batch.set(ref, {
                ...p,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            }); // usage of Set without merge to clear old 'models' field if possible, or just overwrite core fields. 
            // Better to use update if we want to keep stats, but here we want schema change.
            // Let's use set(..., {merge: true}) but explicitly set 'models' to delete field? 
            // Firestore doesn't easily delete fields in merge. 
            // For now, simpler new fields will take precedence in our new UI/Router code.
        });

        await batch.commit();
        console.log(`✅ Successfully seeded ${profiles.length} simplified profiles.`);
        alert(`✅ Seeded ${profiles.length} Simplified Runtime Profiles!`);

        if (window.initRuntimeProfiles) window.initRuntimeProfiles();
    } catch (e) {
        console.error("Seeding failed", e);
        alert(`❌ Seeding failed: ${e.message}`);
    }

})();
