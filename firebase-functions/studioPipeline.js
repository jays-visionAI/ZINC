const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { LLMRouter } = require("./llmRouter");

/**
 * Studio Pipeline V2
 * Channel-Centric Content Generation
 * 
 * Workflow:
 * 1. Analyze Source (Strategy)
 * 2. Generate Content per Channel (Parallel)
 */
exports.executeStudioPipeline = onCall({
    cors: true,
    timeoutSeconds: 300,
    memory: '1GiB'
}, async (request) => {
    const data = request.data;
    const {
        sourceContext,  // Text from Knowledge Hub
        userInstruction,
        selectedChannels, // Array of strings: ['linkedin', 'instagram', ...]
        projectId
    } = data;

    if (!sourceContext || !selectedChannels || !selectedChannels.length || !projectId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    const db = admin.firestore();
    const llmRouter = new LLMRouter(db);
    const userId = request.auth?.uid;

    console.log(`[StudioPipeline] Starting execution for Project: ${projectId}`);
    console.log(`[StudioPipeline] Channels: ${selectedChannels.join(', ')}`);

    try {
        // Step 1: Strategy Analysis
        // Fetch General Strategist Agent
        console.log('[StudioPipeline] Fetching Strategy Agent...');
        const strategyAgent = await llmRouter.getAgentPromptById('STG-GEN');

        if (!strategyAgent) {
            throw new Error('Strategy Agent (STG-GEN) not found in Registry');
        }

        console.log('[StudioPipeline] Running Strategy Analysis...');
        const strategyResult = await llmRouter.route({
            feature: 'studio_strategy',
            agent: strategyAgent, // Pass full agent config if supported, or manually construct messages
            messages: [
                { role: 'system', content: strategyAgent.systemPrompt },
                { role: 'user', content: `Analyze this source and extract key insights:\n\n${sourceContext}\n\nUser Focus: ${userInstruction || 'General'}` }
            ],
            qualityTier: 'DEFAULT',
            userId,
            projectId
        });

        const strategyOutput = strategyResult.content;
        console.log('[StudioPipeline] Strategy Generated');

        // Step 2: Parallel Channel Execution
        const tasks = selectedChannels.map(async (channel) => {
            const agentId = `WRT-${channel.toUpperCase().replace('LINKEDIN', 'LINKEDIN').replace('INSTAGRAM', 'INSTA').replace('BLOG', 'SEO-BLOG')}`;
            // Mappings:
            // linkedin -> WRT-LINKEDIN
            // instagram -> WRT-INSTA
            // blog -> WRT-SEO-BLOG
            // x -> WRT-LINKEDIN (fallback to short form?) - Need WRT-X?

            // Handle mapping more robustly
            let targetAgentId = `WRT-${channel.toUpperCase()}`;
            if (channel === 'linkedin') targetAgentId = 'WRT-LINKEDIN';
            if (channel === 'instagram') targetAgentId = 'WRT-INSTA';
            if (channel === 'blog') targetAgentId = 'WRT-SEO-BLOG';
            if (channel === 'x') targetAgentId = 'WRT-LINKEDIN'; // Termporary reuse or need new agent

            console.log(`[StudioPipeline] Fetching Agent: ${targetAgentId} for ${channel}`);
            const writerAgent = await llmRouter.getAgentPromptById(targetAgentId);

            if (!writerAgent) {
                console.warn(`[StudioPipeline] Agent ${targetAgentId} not found, skipping ${channel}`);
                return { channel, error: 'Agent not found' };
            }

            console.log(`[StudioPipeline] Generating for ${channel}...`);
            const writerResult = await llmRouter.route({
                feature: `studio_content_${channel}`,
                messages: [
                    { role: 'system', content: writerAgent.systemPrompt },
                    { role: 'user', content: `Based on this strategy:\n${strategyOutput}\n\nCreate content for ${channel}.\nUser Instruction: ${userInstruction || 'None'}` }
                ],
                qualityTier: 'DEFAULT',
                userId,
                projectId
            });

            return {
                channel,
                agentId: targetAgentId,
                content: writerResult.content,
                model: writerResult.model
            };
        });

        const results = await Promise.all(tasks);

        // Log run
        // ...

        return {
            success: true,
            strategy: strategyOutput,
            results
        };

    } catch (error) {
        console.error('[StudioPipeline] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
