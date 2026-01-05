const admin = require('firebase-admin');

// Initialize Firebase Admin (Default Creds)
if (!admin.apps.length) {
    try {
        admin.initializeApp();
        console.log('✅ Firebase Admin Initialized (Default Creds)');
    } catch (e) {
        console.error('❌ Failed to initialize Firebase Admin:', e.message);
        // Fallback for emulator if needed, or specific project ID if known
        // admin.initializeApp({ projectId: 'your-project-id' }); 
    }
}

const db = admin.firestore();

const MASTER_AGENTS = [
    // 1. General Strategist
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
                provider: 'openai',
                model: 'gpt-4o',
                systemPrompt: `You are a Senior Content Strategist.
Your goal is to analyze the provided Knowledge Source and extract key insights, themes, and messaging points relevant to the user's intent.
Always prioritize the source material over general knowledge.
Output structured strategies that can be used by specific channel writers.`,
                changelog: 'Initial Master Class Release'
            }
        ]
    },
    // 2. LinkedIn Writer
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
                provider: 'openai',
                model: 'gpt-4o',
                systemPrompt: `You are a LinkedIn Top Voice and expert copywriter.
Create engaging, professional content optimized for LinkedIn.
- Hook: Start with a strong, attention-grabbing first line.
- Structure: Use short paragraphs and emojis sparingly but effectively.
- Value: Focus on professional insights, industry trends, or business lessons.
- Call to Action: End with a question or engagement prompt.
- Tone: Professional, insightful, yet accessible.`,
                changelog: 'Initial Master Class Release'
            }
        ]
    },
    // 3. Instagram Writer
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
                provider: 'openai',
                model: 'gpt-4o',
                systemPrompt: `You are an Instagram Social Media Manager.
Create captions that drive engagement and complement visual content.
- Opening: Catchy and relevant to the visual.
- Body: Conversational, friendly, and authentic.
- Hashtags: Include 15-20 relevant, high-traffic hashtags at the bottom.
- Formatting: Use line breaks for readability.
- Tone: Trendy, energetic, and visual-first.`,
                changelog: 'Initial Master Class Release'
            }
        ]
    },
    // 4. SEO Blog Writer
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
                provider: 'openai',
                model: 'gpt-4o',
                systemPrompt: `You are an SEO Content Specialist.
Write comprehensive, structured blog posts.
- Structure: Use H1, H2, H3 tags properly.
- Keywords: Naturally integrate relevant keywords.
- Value: Provide actionable and in-depth information.
- Length: Ensure sufficient depth (1000+ words unless specified otherwise).
- Tone: Authoritative, educational, and clear.`,
                changelog: 'Initial Master Class Release'
            }
        ]
    },
    // 5. Visual Designer (Photo)
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
                provider: 'google', // Vertex AI / Imagen
                model: 'imagen-3.0-generate-001',
                systemPrompt: `You are an AI Art Director specializing in Photorealism.
Create detailed image prompts for Imagen 3 / Midjourney.
Focus on: Lighting (Cinematic, Natural), Camera Angles, Textures, and Composition.
Do NOT include text in the image description unless necessary (e.g., signage).
Output ONLY the prompt.`,
                changelog: 'Initial Master Class Release'
            }
        ]
    }
];

async function seedAgents() {
    console.log('🌱 Starting Master Class Agent Seeding...');

    for (const agent of MASTER_AGENTS) {
        // 1. Create/Update Agent Registry
        const registryRef = db.collection('agentRegistry').doc(agent.id);
        const { versions, ...registryData } = agent;

        await registryRef.set({
            ...registryData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`✅ Agent Registry: ${agent.name} (${agent.id})`);

        // 2. Create Versions
        for (const version of versions) {
            const versionId = `${agent.id}_${version.version.replace(/\./g, '_')}`;
            const versionRef = db.collection('agentVersions').doc(versionId);

            await versionRef.set({
                agentId: agent.id,
                ...version,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`   - Version ${version.version} created`);
        }
    }

    console.log('🎉 Seeding Complete!');
}

seedAgents().catch(console.error);
