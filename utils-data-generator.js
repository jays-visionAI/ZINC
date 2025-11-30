// utils-data-generator.js
// Utility to generate test data for Mission Control View History
// Usage: window.generateTestData('PROJECT_ID', 'TEAM_ID')

(function () {
    'use strict';

    window.generateTestData = async function (projectId, teamId) {
        console.log(`[Data Generator] Starting for Project: ${projectId}, Team: ${teamId}`);

        if (!projectId || !teamId) {
            console.error('Usage: generateTestData(projectId, teamId)');
            return;
        }

        try {
            // 1. Check & Create Sub-Agents
            await ensureSubAgents(projectId, teamId);

            // 2. Create Dummy Runs & Content
            await createDummyRunAndContent(projectId, teamId);

            console.log('[Data Generator] ✅ All done! Refresh the page or click View History again.');
            alert('Test data generated successfully!');
        } catch (error) {
            console.error('[Data Generator] Error:', error);
            alert(`Error: ${error.message}`);
        }
    };

    async function ensureSubAgents(projectId, teamId) {
        const subAgentsRef = db.collection('projectAgentTeamInstances').doc(teamId).collection('subAgents');
        const snapshot = await subAgentsRef.get();

        if (!snapshot.empty) {
            console.log(`[Data Generator] Found ${snapshot.size} existing sub-agents. Skipping creation.`);
            return;
        }

        console.log('[Data Generator] No sub-agents found. Creating defaults...');

        // Define default roles
        const roles = [
            { type: 'planner', name: 'Strategic Planner', icon: '🎯' },
            { type: 'creator_text', name: 'Copywriter', icon: '✍️' },
            { type: 'creator_image', name: 'Visual Artist', icon: '🎨' },
            { type: 'engagement', name: 'Community Manager', icon: '💬' }
        ];

        const batch = db.batch();

        roles.forEach((role, index) => {
            const id = `sa_${Date.now()}_${index}`;
            const docRef = subAgentsRef.doc(id);

            batch.set(docRef, {
                id: id,
                project_id: projectId,
                team_instance_id: teamId,
                role_name: role.name,
                role_type: role.type,
                template_id: 'tpl_default_gen',
                display_order: index,
                status: 'active',
                likes_count: Math.floor(Math.random() * 50),
                rating_avg: (4 + Math.random()).toFixed(1) * 1,
                rating_count: Math.floor(Math.random() * 20),
                metrics: {
                    success_rate: 90 + Math.floor(Math.random() * 10),
                    total_runs: Math.floor(Math.random() * 100),
                    daily_actions_completed: Math.floor(Math.random() * 5),
                    daily_actions_quota: 10,
                    last_active_at: firebase.firestore.Timestamp.now()
                },
                created_at: firebase.firestore.Timestamp.now(),
                updated_at: firebase.firestore.Timestamp.now()
            });
        });

        await batch.commit();
        console.log(`[Data Generator] Created ${roles.length} sub-agents.`);
    }

    async function createDummyRunAndContent(projectId, teamId) {
        // Get a sub-agent to link to
        const subAgentsRef = db.collection('projectAgentTeamInstances').doc(teamId).collection('subAgents');
        const snapshot = await subAgentsRef.limit(1).get();

        if (snapshot.empty) {
            throw new Error('No sub-agents found even after creation step.');
        }

        const subAgent = snapshot.docs[0].data();
        const runId = `run_${Date.now()}`;
        const contentId = `content_${Date.now()}`;

        console.log('[Data Generator] Creating dummy run and content...');

        const batch = db.batch();

        // 1. Create AgentRun
        const runRef = db.collection('projects').doc(projectId).collection('agentRuns').doc(runId);
        batch.set(runRef, {
            id: runId,
            project_id: projectId,
            team_instance_id: teamId,
            sub_agent_instance_id: subAgent.id,
            sub_agent_role_name: subAgent.role_name,
            status: 'success',
            task_prompt: 'Generate a viral post about AI trends',
            started_at: firebase.firestore.Timestamp.now(),
            completed_at: firebase.firestore.Timestamp.now(),
            duration_ms: 2500,
            generated_content_ids: [contentId],
            created_at: firebase.firestore.Timestamp.now(),

            // TODO(Phase 2): Link to Workflow Execution
            // workflowTemplateId: 'wf_tpl_001',
            // workflowStepId: 'step_001',
            // teamInstanceId: teamId
        });

        // 2. Create GeneratedContent
        const contentRef = db.collection('projects').doc(projectId).collection('generatedContents').doc(contentId);
        batch.set(contentRef, {
            id: contentId,
            project_id: projectId,
            team_instance_id: teamId,
            sub_agent_instance_id: subAgent.id,
            run_id: runId,
            type: 'text',
            platform: 'twitter', // or 'x'
            title: 'AI Trends 2025',
            preview_text: 'AI is evolving faster than ever! Here are the top 5 trends to watch in 2025... #AI #TechTrends',
            preview_image_url: 'https://via.placeholder.com/400x200?text=AI+Trends',
            status: 'published',
            external_post_url: 'https://twitter.com/example/status/123456789',
            created_at: firebase.firestore.Timestamp.now(),
            updated_at: firebase.firestore.Timestamp.now(),

            // TODO(Phase 2): Link to Workflow Execution
            // workflowTemplateId: 'wf_tpl_001',
            // workflowStepId: 'step_001',
            // teamInstanceId: teamId,
            // channelId: 'ch_instagram_main'
        });

        await batch.commit();
        console.log('[Data Generator] Created dummy run and content.');
    }

    // Generate Channel Profiles
    window.generateChannelProfiles = async function () {
        console.log('[Data Generator] Creating channel profiles...');

        const channels = [
            { id: 'ch_discord', platform: 'Discord', contentTypes: ['text', 'image', 'video', 'link'], tone: 'community_focused', kpiFocus: 'reactions, messages/frequency...' },
            { id: 'ch_facebook', platform: 'Facebook', contentTypes: ['image', 'video', 'text', 'link'], tone: 'friendly', kpiFocus: 'shares, engagement...' },
            { id: 'ch_instagram', platform: 'Instagram', contentTypes: ['image', 'short-video', 'carousel', 'story'], tone: 'visual_centric', kpiFocus: 'shares, reach...' },
            { id: 'ch_linkedin', platform: 'LinkedIn', contentTypes: ['short-text', 'long-text', 'image', 'document'], tone: 'professional', kpiFocus: 'clicks, impressions...' },
            { id: 'ch_medium', platform: 'Medium', contentTypes: ['long-text'], tone: 'professional', kpiFocus: 'reads, highlights...' },
            { id: 'ch_pinterest', platform: 'Pinterest', contentTypes: ['image', 'video'], tone: 'inspirational', kpiFocus: 'clicks, impressions...' },
            { id: 'ch_reddit', platform: 'Reddit', contentTypes: ['text', 'link', 'image', 'video'], tone: 'authentic', kpiFocus: 'awards, upvotes...' },
            { id: 'ch_snapchat', platform: 'Snapchat', contentTypes: ['short-video', 'image', 'story'], tone: 'casual', kpiFocus: 'screenshots, shares...' },
            { id: 'ch_telegram', platform: 'Telegram', contentTypes: ['text', 'image', 'video', 'document'], tone: 'informative', kpiFocus: 'replies, reactions...' },
            { id: 'ch_threads', platform: 'Threads', contentTypes: ['short-text', 'image'], tone: 'conversational', kpiFocus: 'likes, reach...' },
            { id: 'ch_tiktok', platform: 'TikTok', contentTypes: ['short-video'], tone: 'entertaining', kpiFocus: 'likes, views...' },
            { id: 'ch_x', platform: 'X (Twitter)', contentTypes: ['short-text', 'thread', 'image', 'video'], tone: 'conversational', kpiFocus: 'replies, retweets...' },
            { id: 'ch_youtube', platform: 'YouTube', contentTypes: ['long-video', 'short-video'], tone: 'informative', kpiFocus: 'watch-time, subscribers...' }
        ];

        const batch = db.batch();

        channels.forEach(channel => {
            const docRef = db.collection('channelProfiles').doc(channel.id);
            batch.set(docRef, {
                id: channel.id,
                name: channel.platform,
                platform: channel.platform.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, ''),
                contentTypes: channel.contentTypes,
                interactionTone: channel.tone,
                kpiFocus: channel.kpiFocus,
                status: 'active',
                version: 'v1.0.0',
                lastUpdated: firebase.firestore.Timestamp.now(),
                createdAt: firebase.firestore.Timestamp.now()
            });
        });

        await batch.commit();
        console.log(`[Data Generator] ✅ Created ${channels.length} channel profiles.`);
        alert(`Created ${channels.length} channel profiles successfully!`);
    };

    console.log('[Data Generator] Module loaded. Use window.generateTestData(projectId, teamId) to populate data.');
    console.log('[Data Generator] Use window.generateChannelProfiles() to create channel profiles.');

})();
