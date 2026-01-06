/**
 * Migration Script: Convert Standard Agent Profiles to Agent Registry
 * Run this in the Admin Browser Console
 */
(async function migrateToRegistry() {
    console.log("🚀 Starting Agent Registry Migration...");
    const db = firebase.firestore();
    const batch = db.batch();
    const ts = firebase.firestore.FieldValue.serverTimestamp();

    const oldProfiles = {
        research: {
            id: 'INT-RES-MKT',
            category: 'Intelligence',
            name: 'Market Research Specialist',
            description: 'Analyzes market trends and competitor activities.',
            systemPrompt: `You are a research specialist focused on market analysis and trend identification. Always cite sources when possible and focus on actionable insights.`,
            temp: 0.5
        },
        seo_watcher: {
            id: 'INT-SEO-WATCH',
            category: 'Intelligence',
            name: 'SEO Watcher',
            description: 'Monitors and optimizes content for search engines.',
            systemPrompt: `You are an SEO specialist monitoring and optimizing content performance. Focus on data-driven recommendations with specific action items.`,
            temp: 0.4
        },
        planner: {
            id: 'STG-PLAN-ARCH',
            category: 'Strategy',
            name: 'Strategy Planner',
            description: 'Designs content calendars and publishing schedules.',
            systemPrompt: `You are a strategic content planner responsible for campaign design. Think strategically about timing, sequencing, and audience engagement.`,
            temp: 0.6
        },
        creator_text: {
            id: 'DSN-TXT-CREATOR',
            category: 'Design',
            name: 'Text Content Creator',
            description: 'Expert writer for compelling multi-channel content.',
            systemPrompt: `You are an expert content creator specializing in compelling written content. Create content that resonates with the target audience and drives action.`,
            temp: 0.7
        },
        creator_image: {
            id: 'DSN-IMG-CREATOR',
            category: 'Design',
            name: 'Image Content Creator',
            description: 'Visual specialist creating image generation prompts.',
            systemPrompt: `You are a visual content specialist creating image prompts and concepts. Think visually and provide clear, detailed specifications.`,
            temp: 0.8
        },
        creator_video: {
            id: 'DSN-VID-CREATOR',
            category: 'Design',
            name: 'Video Script Specialist',
            description: 'Creates scripts and concepts for short-form video.',
            systemPrompt: `You are a video content specialist creating scripts and video concepts. Create engaging video content that captures attention quickly.`,
            temp: 0.7
        },
        compliance: {
            id: 'QA-COMP-VAL',
            category: 'QA',
            name: 'Compliance Evaluator',
            description: 'Ensures brand safety and regulatory adherence.',
            systemPrompt: `You are a content compliance specialist ensuring brand safety. Be thorough and document all concerns clearly.`,
            temp: 0.3
        },
        evaluator: {
            id: 'QA-QUAL-CRITIC',
            category: 'QA',
            name: 'Quality Critic',
            description: 'Scores content effectiveness and quality.',
            systemPrompt: `You are a quality evaluator scoring content effectiveness. Use objective criteria and provide specific feedback.`,
            temp: 0.4
        },
        publisher: {
            id: 'STU-PUB-MANAGER',
            category: 'Studio',
            name: 'Publishing Manager',
            description: 'Manages multi-platform content distribution.',
            systemPrompt: `You are a publishing specialist managing content distribution. Focus on maximizing reach and engagement through proper publishing.`,
            temp: 0.5
        },
        knowledge_curator: {
            id: 'INT-KB-CURATOR',
            category: 'Intelligence',
            name: 'Knowledge Curator',
            description: 'Maintains brand memory and knowledge hub.',
            systemPrompt: `You are a knowledge management specialist maintaining brand memory. Keep information organized, accurate, and accessible.`,
            temp: 0.4
        },
        manager: {
            id: 'GEN-TEAM-MGR',
            category: 'Management',
            name: 'Team Manager',
            description: 'Orchestrates agent workflows and final approvals.',
            systemPrompt: `You are a team manager coordinating agent activities. Make decisive judgments and maintain workflow efficiency.`,
            temp: 0.5
        },
        router: {
            id: 'GEN-TASK-ROUTER',
            category: 'Management',
            name: 'Task Router',
            description: 'Directs tasks to appropriate specialized agents.',
            systemPrompt: `You are a routing specialist directing tasks to appropriate agents. Make quick, accurate routing decisions.`,
            temp: 0.3
        }
    };

    try {
        for (const [key, data] of Object.entries(oldProfiles)) {
            // 1. Create Agent Registry Entry
            const registryRef = db.collection('agentRegistry').doc(data.id);
            batch.set(registryRef, {
                id: data.id,
                name: data.name,
                category: data.category,
                description: data.description,
                status: 'active',
                currentProductionVersion: '1.0.0',
                sourceFiles: ['services/agent-execution-service.js'],
                createdAt: ts,
                updatedAt: ts
            });

            // 2. Create Initial Version (v1.0.0)
            const versionId = `${data.id}-v1-0-0`;
            const versionRef = db.collection('agentVersions').doc(versionId);
            batch.set(versionRef, {
                agentId: data.id,
                version: '1.0.0',
                status: 'production',
                isProduction: true,
                systemPrompt: data.systemPrompt,
                config: {
                    model: 'deepseek-chat',
                    temperature: data.temp
                },
                procedures: [
                    { step: 1, action: 'init', label: 'Initialization', description: 'Prepare context and role' },
                    { step: 2, action: 'execute', label: 'Primary Task', description: data.description },
                    { step: 3, action: 'finalize', label: 'Output Formatting', description: 'Clean and format result' }
                ],
                changelog: 'Migrated from Standard Agent Profiles',
                createdAt: ts
            });

            console.log(`✅ Queued: ${data.name} (${data.id})`);
        }

        await batch.commit();
        console.log("✨ Migration Complete!");
        alert("✅ 12 Agents Migrated to Registry Successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
        alert("❌ Migration failed: " + e.message);
    }
})();
