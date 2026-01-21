const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Master Agents Data (Same as script)
const MASTER_AGENTS = [
    {
        id: 'STG-GEN',
        name: 'General Strategist',
        category: 'Strategy',
        description: 'Analyzes knowledge sources and creates content strategies.',
        isActive: true,
        currentProductionVersion: 'v1.0.0',
        versions: [
            {
                version: 'v1.0.0',
                provider: 'deepseek',
                model: 'deepseek-chat',
                systemPrompt: `You are a Senior Content Strategist.\nYour goal is to analyze the provided Knowledge Source and extract key insights, themes, and messaging points relevant to the user's intent.\nAlways prioritize the source material over general knowledge.\nOutput structured strategies that can be used by specific channel writers.`,
                changelog: 'Initial Master Class Release'
            }
        ]
    },
    {
        id: 'WRT-LINKEDIN',
        name: 'LinkedIn Professional Writer',
        category: 'Writer',
        description: 'Creates professional, engaging LinkedIn posts.',
        isActive: true,
        currentProductionVersion: 'v1.0.0',
        versions: [
            {
                version: 'v1.0.0',
                provider: 'deepseek',
                model: 'deepseek-chat',
                systemPrompt: `You are a LinkedIn Top Voice and expert copywriter.\nCreate engaging, professional content optimized for LinkedIn.\n- Hook: Start with a strong, attention-grabbing first line.\n- Structure: Use short paragraphs and emojis sparingly but effectively.\n- Value: Focus on professional insights, industry trends, or business lessons.\n- Call to Action: End with a question or engagement prompt.\n- Tone: Professional, insightful, yet accessible.`,
                changelog: 'Initial Master Class Release'
            }
        ]
    },
    {
        id: 'WRT-INSTA',
        name: 'Instagram Social Writer',
        category: 'Writer',
        description: 'Creates visual-centric, trendy Instagram captions.',
        isActive: true,
        currentProductionVersion: 'v1.0.0',
        versions: [
            {
                version: 'v1.0.0',
                provider: 'deepseek',
                model: 'deepseek-chat',
                systemPrompt: `You are an Instagram Social Media Manager.\nCreate captions that drive engagement and complement visual content.\n- Opening: Catchy and relevant to the visual.\n- Body: Conversational, friendly, and authentic.\n- Hashtags: Include 15-20 relevant, high-traffic hashtags at the bottom.\n- Formatting: Use line breaks for readability.\n- Tone: Trendy, energetic, and visual-first.`,
                changelog: 'Initial Master Class Release'
            }
        ]
    },
    {
        id: 'WRT-SEO-BLOG',
        name: 'SEO Blog Writer',
        category: 'Writer',
        description: 'Writes structured, optimize long-form blog posts.',
        isActive: true,
        currentProductionVersion: 'v1.0.0',
        versions: [
            {
                version: 'v1.0.0',
                provider: 'deepseek',
                model: 'deepseek-chat',
                systemPrompt: `You are an SEO Content Specialist.\nWrite comprehensive, structured blog posts.\n- Structure: Use H1, H2, H3 tags properly.\n- Keywords: Naturally integrate relevant keywords.\n- Value: Provide actionable and in-depth information.\n- Length: Ensure sufficient depth (1000+ words unless specified otherwise).\n- Tone: Authoritative, educational, and clear.`,
                changelog: 'Initial Master Class Release'
            }
        ]
    },
    {
        id: 'DSN-PHOTO',
        name: 'Photorealistic Imagery',
        category: 'Designer',
        description: 'Generates prompts for high-quality photorealistic images.',
        isActive: true,
        currentProductionVersion: 'v1.0.0',
        versions: [
            {
                version: 'v1.0.0',
                provider: 'google',
                model: 'imagen-3.0-generate-001',
                systemPrompt: `You are an AI Art Director specializing in Photorealism.\nCreate detailed image prompts for Imagen 3 / Midjourney.\nFocus on: Lighting (Cinematic, Natural), Camera Angles, Textures, and Composition.\nDo NOT include text in the image description unless necessary (e.g., signage).\nOutput ONLY the prompt.`,
                changelog: 'Initial Master Class Release'
            }
        ]
    }
];

exports.seedMasterAgents = onCall({
    cors: true,
    timeoutSeconds: 300
}, async (request) => {
    // Check auth (Optional for admin seeding, but good practice)
    if (!request.auth || !request.auth.token.admin) {
        // Allow for now for easier testing, or require admin
        // throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }

    const db = admin.firestore();
    console.log('🌱 Starting Master Class Agent Seeding via Cloud Function...');

    let stats = { updated: 0, versions: 0 };

    try {
        const batch = db.batch();

        for (const agent of MASTER_AGENTS) {
            const registryRef = db.collection('agentRegistry').doc(agent.id);
            const { versions, ...registryData } = agent;

            batch.set(registryRef, {
                ...registryData,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            stats.updated++;

            for (const version of versions) {
                const versionId = `${agent.id}_${version.version.replace(/\./g, '_')}`;
                const versionRef = db.collection('agentVersions').doc(versionId);

                batch.set(versionRef, {
                    agentId: agent.id,
                    ...version,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                stats.versions++;
            }
        }

        await batch.commit();
        console.log('🎉 Seeding Complete!', stats);
        return { success: true, stats };
    } catch (error) {
        console.error('Seeding failed:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
