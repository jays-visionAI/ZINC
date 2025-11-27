// scripts/seed-phase2-data.js
// Seeds initial data for Phase 2: RuntimeProfiles, SubAgentTemplates, AgentSetTemplates

(async function seedPhase2Data() {
    console.log("🌱 Starting Phase 2 Data Seeding...");
    const projectId = "default_project";

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found.");
        return;
    }

    const batch = db.batch();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // ==========================================
    // 1. Runtime Profiles
    // ==========================================
    const runtimeProfiles = [
        {
            id: "rtp_chat_balanced_v1",
            name: "Balanced Chat Model v1",
            description: "Balanced performance and cost for general tasks",
            provider: "openai",
            model_id: "gpt-4o-mini",
            capabilities: { chat: true, vision: false, image_generation: false, embedding: false },
            cost_hint: { tier: "medium" },
            tags: ["chat_balanced", "chat_main"],
            status: "active",
            version: "1.0.0"
        },
        {
            id: "rtp_chat_cheap_v1",
            name: "Economy Chat Model v1",
            description: "Low cost model for high volume tasks",
            provider: "openai",
            model_id: "gpt-3.5-turbo",
            capabilities: { chat: true, vision: false, image_generation: false, embedding: false },
            cost_hint: { tier: "cheap" },
            tags: ["chat_cheap"],
            status: "active",
            version: "1.0.0"
        },
        {
            id: "rtp_chat_premium_v1",
            name: "Premium Chat Model v1",
            description: "High intelligence model for complex reasoning",
            provider: "openai",
            model_id: "gpt-4o",
            capabilities: { chat: true, vision: true, image_generation: false, embedding: false },
            cost_hint: { tier: "expensive" },
            tags: ["chat_premium"],
            status: "active",
            version: "1.0.0"
        },
        {
            id: "rtp_embed_fast_v1",
            name: "Fast Embedding v1",
            description: "Fast text embedding model",
            provider: "openai",
            model_id: "text-embedding-3-small",
            capabilities: { chat: false, vision: false, image_generation: false, embedding: true },
            cost_hint: { tier: "cheap" },
            tags: ["embed_fast"],
            status: "active",
            version: "1.0.0"
        }
    ];

    runtimeProfiles.forEach(profile => {
        const ref = db.collection(`projects/${projectId}/runtimeProfiles`).doc(profile.id);
        batch.set(ref, { ...profile, created_at: timestamp, updated_at: timestamp });
    });

    // ==========================================
    // 2. SubAgent Templates
    // ==========================================
    const subAgentTemplates = [
        {
            id: "sa_tpl_planner_general",
            role: "planner",
            name: "General Planner Template",
            channel_type: "general",
            version: "1.0.0",
            system_prompt_template: "You are a strategic planner. Your goal is to plan content for {target_audience}.",
            default_runtime_profiles: {
                chat_main: "rtp_chat_premium_v1" // Planner needs intelligence
            },
            allowed_runtime_profile_tags: {
                chat_main: ["chat_balanced", "chat_premium"]
            },
            config_schema: {
                type: "object",
                properties: {
                    tone: { type: "string", default: "professional" }
                }
            },
            status: "active"
        },
        {
            id: "sa_tpl_twitter_creator",
            role: "creator",
            name: "Twitter Creator Template",
            channel_type: "twitter",
            version: "1.0.0",
            system_prompt_template: "You are a Twitter content creator. Create engaging tweets for {target_audience}.",
            default_runtime_profiles: {
                chat_main: "rtp_chat_balanced_v1"
            },
            allowed_runtime_profile_tags: {
                chat_main: ["chat_balanced", "chat_cheap", "chat_premium"]
            },
            config_schema: {
                type: "object",
                properties: {
                    max_length: { type: "number", default: 280 },
                    use_hashtags: { type: "boolean", default: true }
                }
            },
            status: "active"
        },
        {
            id: "sa_tpl_instagram_creator",
            role: "creator",
            name: "Instagram Creator Template",
            channel_type: "instagram",
            version: "1.0.0",
            system_prompt_template: "You are an Instagram content creator. Create visual descriptions and captions.",
            default_runtime_profiles: {
                chat_main: "rtp_chat_balanced_v1"
            },
            allowed_runtime_profile_tags: {
                chat_main: ["chat_balanced", "chat_premium"]
            },
            config_schema: {
                type: "object",
                properties: {
                    image_style: { type: "string", default: "photorealistic" }
                }
            },
            status: "active"
        },
        {
            id: "sa_tpl_manager_general",
            role: "manager",
            name: "General Manager Template",
            channel_type: "general",
            version: "1.0.0",
            system_prompt_template: "You are a content manager. Review the content and provide feedback.",
            default_runtime_profiles: {
                chat_main: "rtp_chat_balanced_v1"
            },
            allowed_runtime_profile_tags: {
                chat_main: ["chat_balanced", "chat_premium"]
            },
            config_schema: {
                type: "object",
                properties: {
                    strictness: { type: "string", enum: ["low", "medium", "high"], default: "medium" }
                }
            },
            status: "active"
        }
    ];

    subAgentTemplates.forEach(tpl => {
        const ref = db.collection(`subAgentTemplates`).doc(tpl.id);
        batch.set(ref, { ...tpl, created_at: timestamp, updated_at: timestamp });
    });

    // ==========================================
    // 3. AgentSet Templates
    // ==========================================
    const agentSetTemplates = [
        {
            id: "agst_marketing_general",
            name: "General Marketing Team Template",
            version: "1.0.0",
            roles: {
                planner: "sa_tpl_planner_general",
                creator: "sa_tpl_twitter_creator", // Default to twitter for now
                manager: "sa_tpl_manager_general"
            },
            description: "Standard team for social media marketing",
            status: "active"
        }
    ];

    agentSetTemplates.forEach(tpl => {
        const ref = db.collection(`agentSetTemplates`).doc(tpl.id);
        batch.set(ref, { ...tpl, created_at: timestamp, updated_at: timestamp });
    });

    try {
        await batch.commit();
        console.log("✅ Phase 2 Data Seeded Successfully!");
        console.log(`   - ${runtimeProfiles.length} Runtime Profiles`);
        console.log(`   - ${subAgentTemplates.length} SubAgent Templates`);
        console.log(`   - ${agentSetTemplates.length} AgentSet Templates`);
        alert("✅ Phase 2 Data Seeded Successfully!");
    } catch (error) {
        console.error("❌ Error seeding Phase 2 data:", error);
        alert(`Error seeding data: ${error.message}`);
    }

})();
