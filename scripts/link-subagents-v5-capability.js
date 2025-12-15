(async function linkSubAgentsToCapabilities() {
    console.log("🔗 Starting Sub-Agent <> Capability Profile Linking...");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' missing.");
        return;
    }

    // MAP: Role -> Capability Profile
    const MAPPING = {
        // High Reasoning / Logic
        'strategist': 'rtp_reasoning_v1',
        'planner': 'rtp_reasoning_v1',
        'analyst': 'rtp_reasoning_v1',
        'researcher': 'rtp_reasoning_v1',

        // Creative Writing
        'creator_text': 'rtp_content_writing_v1',
        'writer': 'rtp_content_writing_v1',
        'copywriter': 'rtp_content_writing_v1',
        'social_media': 'rtp_content_writing_v1',

        // Visual
        'creator_image': 'rtp_visual_v1',
        'designer': 'rtp_visual_v1',

        // Technical
        'developer': 'rtp_technical_v1',
        'engineer': 'rtp_technical_v1',

        // Fast/Simple
        'assistant': 'rtp_fast_v1',
        'support': 'rtp_fast_v1'
    };

    const FALLBACK_PROFILE = 'rtp_fast_v1';

    try {
        const snapshot = await db.collection('subAgentTemplates').get();
        if (snapshot.empty) {
            console.log("No sub-agent templates found.");
            return;
        }

        const batch = db.batch();
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const role = data.roleTypeForRuntime || data.role_type || data.id.split('_')[0] || 'assistant';

            // Find capability profile
            let profileId = MAPPING[role];

            // Heuristic fallback
            if (!profileId) {
                if (data.id.includes('plan') || role.includes('plan')) profileId = 'rtp_reasoning_v1';
                else if (data.id.includes('write') || role.includes('write')) profileId = 'rtp_content_writing_v1';
                else if (data.id.includes('dev') || role.includes('dev')) profileId = 'rtp_technical_v1';
                else profileId = FALLBACK_PROFILE;
            }

            console.log(`Linking ${data.name} (${role}) -> ${profileId}`);

            batch.update(doc.ref, {
                runtime_profile_id: profileId,
                runtimeProfileId: profileId,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            count++;
        });

        await batch.commit();
        console.log(`✅ Successfully linked ${count} agents to Capability Profiles.`);
        alert(`✅ Architecture Updated: ${count} Agents received new Capability Profiles!`);

    } catch (e) {
        console.error("Linking failed", e);
        alert(`❌ Linking failed: ${e.message}`);
    }

})();
