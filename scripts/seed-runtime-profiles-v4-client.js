(async function seedRuntimeProfilesV4() {
    console.log("🚀 Starting Runtime Profile Seeding (v4.0 Client-Side)...");

    if (typeof db === 'undefined') {
        console.error("❌ 'db' (Firestore) is not defined. Run this on an Admin page where Firebase is initialized.");
        return;
    }

    const profiles = [
        {
            id: 'rtp_planner_default_v1',
            runtime_profile_id: 'rtp_planner_default_v1',
            name: 'Standard Planner (Logical)',
            description: 'Optimized for logical reasoning, project planning, and structured output. Uses low temperature for consistency.',
            role_type: 'strategist',
            language: 'english',
            status: 'active',
            version_number: 1,
            capabilities: { chat: true, vision: false, embedding: false, image_generation: false },
            models: {
                balanced: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.3, max_tokens: 4000 },
                creative: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.7, max_tokens: 4000 },
                precise: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.1, max_tokens: 4000 }
            }
        },
        {
            id: 'rtp_creator_text_v1',
            runtime_profile_id: 'rtp_creator_text_v1',
            name: 'Creative Writer (Expressive)',
            description: 'Optimized for content creation, copywriting, and storytelling. Higher temperature for diverse vocabulary.',
            role_type: 'creator_text',
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
            id: 'rtp_developer_v1',
            runtime_profile_id: 'rtp_developer_v1',
            name: 'Code Master (Technical)',
            description: 'Specialized for code generation, debugging, and technical documentation. Precise mode is extremely strict.',
            role_type: 'developer',
            language: 'english',
            status: 'active',
            version_number: 1,
            capabilities: { chat: true, vision: false, embedding: false, image_generation: false },
            models: {
                balanced: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.2, max_tokens: 8000 },
                creative: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.5, max_tokens: 8000 },
                precise: { provider: 'openai', model_id: 'gpt-4o', temperature: 0.0, max_tokens: 8000 }
            }
        },
        {
            id: 'rtp_support_basic_v1',
            runtime_profile_id: 'rtp_support_basic_v1',
            name: 'Fast Support (Economy)',
            description: 'High speed, low cost profile for simple Q&A, summarization, and basic assistance.',
            role_type: 'assistant',
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
            id: 'rtp_creator_image_v1',
            runtime_profile_id: 'rtp_creator_image_v1',
            name: 'Visual Artist (DALL-E 3)',
            description: 'Dedicated profile for image generation tasks.',
            role_type: 'creator_image',
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
            // Use set with merge to avoid overwriting existing
            batch.set(ref, {
                ...p,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });

        await batch.commit();
        console.log(`✅ Successfully seeded/updated ${profiles.length} profiles.`);
        alert(`✅ Seeded ${profiles.length} Runtime Profiles successfully!`);
        // Force refresh if on profile page
        if (window.initRuntimeProfiles) {
            window.initRuntimeProfiles();
        }
    } catch (e) {
        console.error("Seeding failed", e);
        alert(`❌ Seeding failed: ${e.message}`);
    }

})();
