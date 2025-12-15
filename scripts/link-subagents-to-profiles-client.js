(async function linkSubAgentsToProfiles() {
    console.log("🔗 Starting Sub-Agent <> Profile Linking...");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' missing.");
        return;
    }

    const MAPPING = {
        'strategist': 'rtp_planner_default_v1',
        'planner': 'rtp_planner_default_v1',

        'creator_text': 'rtp_creator_text_v1',
        'writer': 'rtp_creator_text_v1',
        'copywriter': 'rtp_creator_text_v1',

        'creator_image': 'rtp_creator_image_v1',
        'designer': 'rtp_creator_image_v1',

        'developer': 'rtp_developer_v1',
        'engineer': 'rtp_developer_v1',

        'assistant': 'rtp_support_basic_v1',
        'researcher': 'rtp_planner_default_v1', // Researchers need logic
        'analyst': 'rtp_planner_default_v1'
    };

    const FALLBACK_PROFILE = 'rtp_support_basic_v1';

    try {
        const snapshot = await db.collection('subAgentTemplates').get();
        if (snapshot.empty) {
            console.log("No sub-agent templates found.");
            alert("No sub-agents found to link.");
            return;
        }

        const batch = db.batch();
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            // Determine role to map
            const role = data.roleTypeForRuntime || data.role_type || data.id.split('_')[0] || 'assistant';

            // Find profile
            let profileId = MAPPING[role] || MAPPING[Object.keys(MAPPING).find(k => role.includes(k))];

            if (!profileId) {
                // Heuristics based on ID or Name
                if (data.id.includes('plan') || data.name.includes('Plan')) profileId = 'rtp_planner_default_v1';
                else if (data.id.includes('write') || data.name.includes('Write')) profileId = 'rtp_creator_text_v1';
                else if (data.id.includes('image') || data.id.includes('design')) profileId = 'rtp_creator_image_v1';
                else profileId = FALLBACK_PROFILE;
            }

            console.log(`Linking ${data.name} (${role}) -> ${profileId}`);

            batch.update(doc.ref, {
                runtime_profile_id: profileId,
                runtimeProfileId: profileId, // Legacy compat
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            count++;
        });

        await batch.commit();
        console.log(`✅ Successfully linked ${count} agents.`);
        alert(`✅ Automatically assigned Runtime Profiles to ${count} Sub-Agents based on their roles!`);

    } catch (e) {
        console.error("Linking failed", e);
        alert(`❌ Linking failed: ${e.message}`);
    }

})();
