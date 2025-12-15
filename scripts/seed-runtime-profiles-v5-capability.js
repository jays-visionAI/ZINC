(async function seedRuntimeProfilesV5() {
    console.log("🚀 Starting Runtime Profile Seeding (v5.0 Capability-Based)...");

    if (typeof db === 'undefined') {
        console.error("❌ 'db' undefined.");
        return;
    }

    const profiles = [
        {
            id: 'rtp_reasoning_v1',
            runtime_profile_id: 'rtp_reasoning_v1',
            name: 'High Reasoning (Logical)',
            description: 'System profile optimized for complex logic, planning, and structured reasoning. Low temperature.',
            // role_type REMOVED
            language: 'english',
            status: 'active',
            version_number: 1,
            capabilities: { chat: true, vision: false, embedding: false, image_generation: false },
            models: {
                balanced: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.3, max_tokens: 4000 },
                creative: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.6, max_tokens: 4000 },
                precise: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.1, max_tokens: 4000 }
            }
        },
        {
            id: 'rtp_content_writing_v1',
            runtime_profile_id: 'rtp_content_writing_v1',
            name: 'Creative Writing (Expressive)',
            description: 'System profile optimized for fluid, engaging, and diverse text generation. High temperature.',
            language: 'english',
            status: 'active',
            version_number: 1,
            capabilities: { chat: true, vision: false, embedding: false, image_generation: false },
            models: {
                balanced: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.8, max_tokens: 4000 },
                creative: { provider: 'openai', model_id: 'gpt-4o', temperature: 1.0, max_tokens: 8000 },
                precise: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.5, max_tokens: 4000 }
            }
        },
        {
            id: 'rtp_technical_v1',
            runtime_profile_id: 'rtp_technical_v1',
            name: 'Technical Execution (Strict)',
            description: 'System profile optimized for code generation, JSON output, and strict adherence to specs.',
            language: 'english',
            status: 'active',
            version_number: 1,
            capabilities: { chat: true, vision: false, embedding: false, image_generation: false },
            models: {
                balanced: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.2, max_tokens: 8000 },
                creative: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.4, max_tokens: 8000 },
                precise: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.0, max_tokens: 8000 }
            }
        },
        {
            id: 'rtp_fast_v1',
            runtime_profile_id: 'rtp_fast_v1',
            name: 'Fast Response (Economy)',
            description: 'Economy profile optimized for speed and cost-efficiency. Good for simple tasks.',
            language: 'english',
            status: 'active',
            version_number: 1,
            capabilities: { chat: true, vision: false, embedding: false, image_generation: false },
            models: {
                balanced: { provider: 'openai', model_id: 'gpt-4o-mini', temperature: 0.5, max_tokens: 2000 },
                creative: { provider: 'openai', model_id: 'gpt-4o-mini', temperature: 0.8, max_tokens: 2000 },
                precise: { provider: 'openai', model_id: 'gpt-4o-mini', temperature: 0.2, max_tokens: 2000 }
            }
        },
        {
            id: 'rtp_visual_v1',
            runtime_profile_id: 'rtp_visual_v1',
            name: 'Visual Generation (DALL-E)',
            description: 'Dedicated profile for image generation capabilities.',
            language: 'english',
            status: 'active',
            version_number: 1,
            capabilities: { chat: true, vision: true, embedding: false, image_generation: true },
            models: {
                balanced: { provider: 'openai', model_id: 'dall-e-3', temperature: 0.7, max_tokens: 1000 },
                creative: { provider: 'openai', model_id: 'dall-e-3', temperature: 1.0, max_tokens: 1000 },
                precise: { provider: 'openai', model_id: 'dall-e-3', temperature: 0.5, max_tokens: 1000 }
            }
        }
    ];

    try {
        const batch = db.batch();
        profiles.forEach(p => {
            const ref = db.collection('runtimeProfileRules').doc(p.id);
            batch.set(ref, {
                ...p,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });

        // Optional: Clean up old role-based profiles if needed
        // For now, we leave them as legacy or delete manually.

        await batch.commit();
        console.log(`✅ Successfully seeded ${profiles.length} capability profiles.`);
        alert(`✅ Seeded ${profiles.length} Capability-Based Runtime Profiles!`);

        if (window.initRuntimeProfiles) window.initRuntimeProfiles();
    } catch (e) {
        console.error("Seeding failed", e);
        alert(`❌ Seeding failed: ${e.message}`);
    }

})();
