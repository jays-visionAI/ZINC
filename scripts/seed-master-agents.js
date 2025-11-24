// Seed Script: Create initial master agents library
// Run this once in browser console or as a Cloud Function

(async function seedMasterAgents() {
    console.log("🌱 Starting master agents seed...");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found. Make sure Firebase is initialized.");
        return;
    }

    const masterAgents = [
        {
            id: "instagram_content_ai",
            name: "Instagram Content Agent",
            description: "AI agent specialized in creating engaging Instagram posts, stories, and reels with trending hashtags and optimal posting times.",
            category: "Social Media",
            status: "active"
        },
        {
            id: "twitter_engagement_ai",
            name: "Twitter/X Engagement Agent",
            description: "AI agent for Twitter/X content creation, thread management, and community engagement with real-time trend analysis.",
            category: "Social Media",
            status: "active"
        },
        {
            id: "linkedin_professional_ai",
            name: "LinkedIn Professional Agent",
            description: "AI agent focused on professional content creation, thought leadership posts, and B2B engagement on LinkedIn.",
            category: "Social Media",
            status: "active"
        },
        {
            id: "crypto_market_analyst",
            name: "Crypto Market Analyst",
            description: "AI agent that analyzes cryptocurrency markets, tracks trends, and generates market insights and trading signals.",
            category: "Analytics",
            status: "active"
        },
        {
            id: "trend_researcher_ai",
            name: "Trend Research Agent",
            description: "AI agent that monitors social media trends, viral content, and emerging topics across multiple platforms.",
            category: "Analytics",
            status: "active"
        },
        {
            id: "content_writer_ai",
            name: "Content Writer Agent",
            description: "AI agent for long-form content creation including blog posts, articles, and newsletters with SEO optimization.",
            category: "Content Creation",
            status: "active"
        },
        {
            id: "video_script_ai",
            name: "Video Script Agent",
            description: "AI agent specialized in creating engaging video scripts for YouTube, TikTok, and Instagram Reels.",
            category: "Content Creation",
            status: "developing"
        },
        {
            id: "community_manager_ai",
            name: "Community Manager Agent",
            description: "AI agent for managing community interactions, responding to comments, and fostering engagement.",
            category: "Community",
            status: "developing"
        }
    ];

    try {
        // Check if agents already exist
        const existingSnapshot = await db.collection("agents").limit(1).get();

        if (!existingSnapshot.empty) {
            const confirm = window.confirm(
                `⚠️  Agents collection already has data.\n\nDo you want to add ${masterAgents.length} more agents?\n\n(Click Cancel to skip seeding)`
            );

            if (!confirm) {
                console.log("ℹ️  Seeding cancelled by user");
                return;
            }
        }

        const batch = db.batch();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        masterAgents.forEach(agent => {
            const docRef = db.collection("agents").doc(agent.id);
            batch.set(docRef, {
                name: agent.name,
                description: agent.description,
                category: agent.category,
                status: agent.status,
                totalInstances: 0,
                createdAt: timestamp,
                updatedAt: timestamp
            });

            console.log(`✅ Queued: ${agent.name}`);
        });

        await batch.commit();
        console.log(`✨ Successfully seeded ${masterAgents.length} master agents!`);

        alert(`✅ Seeded ${masterAgents.length} master agents successfully!`);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        alert(`❌ Seeding failed: ${error.message}`);
    }
})();
