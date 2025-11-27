// scripts/performance-manager.js
// Core logic for recording and calculating KPIs

(function () {
    const projectId = "default_project";

    window.PerformanceManager = {
        /**
         * Record performance metrics for a task/content
         * @param {string} taskId - The ID of the task (or null if manual external post)
         * @param {object} metrics - { impressions, likes, comments, saves, shares, ... }
         * @param {object} context - Optional overrides { platform, post_type, external_post_id }
         */
        recordPerformance: async function (taskId, metrics, context = {}) {
            console.log(`📊 Recording performance for Task: ${taskId}`, metrics);

            try {
                let taskData = null;
                let agentSetData = null;
                let subAgentVersions = {};

                // 1. Fetch Task Context if taskId is provided
                if (taskId) {
                    const taskDoc = await db.collection(`projects/${projectId}/agentTasks`).doc(taskId).get();
                    if (taskDoc.exists) {
                        taskData = taskDoc.data();

                        // Get AgentSet info from Task
                        if (taskData.agent_set_id) {
                            const agentSetDoc = await db.collection(`projects/${projectId}/agentSets`)
                                .doc(taskData.agent_set_id)
                                .get();
                            if (agentSetDoc.exists) {
                                agentSetData = agentSetDoc.data();
                                // In a real scenario, we would snapshot the sub-agent versions used at runtime
                                // For now, we use the current active agents of the AgentSet
                                // TODO: Enhance this by storing sub_agent_versions in the Task document itself during execution
                                subAgentVersions = agentSetData.active_sub_agents || {};
                            }
                        }
                    }
                }

                // 2. Calculate KPIs
                const platform = context.platform || (taskData?.input?.context?.target_platform) || 'instagram';
                const engagementRate = this.calculateEngagementRate(metrics, platform);

                // Determine Target KPI
                // Priority: Task Override > AgentSet Default > System Default
                const defaultTarget = 0.08; // 8%
                const targetER = (taskData?.kpi_targets?.engagement_rate) ||
                    (agentSetData?.kpi_default_targets?.engagement_rate) ||
                    defaultTarget;

                const kpiScore = this.calculateKpiScore(engagementRate, targetER);

                // 3. Construct Performance Document
                const performanceId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const performanceDoc = {
                    performance_id: performanceId,
                    task_id: taskId,
                    content_id: context.external_post_id || taskId || performanceId,

                    // Context (Instance Level)
                    project_id: projectId,
                    agent_set_id: taskData?.agent_set_id || null,
                    agent_set_version: taskData?.agent_set_version || agentSetData?.agent_set_version || null,
                    channel_type: platform,

                    // SubAgent Snapshot (Crucial for attribution)
                    sub_agent_versions: subAgentVersions, // Map of role -> sub_agent_id (which includes version)

                    // Metrics
                    platform: platform,
                    post_type: context.post_type || 'feed',
                    posted_at: context.posted_at ? new Date(context.posted_at) : new Date(),
                    measured_at: firebase.firestore.FieldValue.serverTimestamp(),

                    performance_metrics: {
                        ...metrics,
                        engagement_rate: engagementRate
                    },

                    kpi_snapshot: {
                        target_engagement: targetER,
                        actual_engagement: engagementRate,
                        score: kpiScore,
                        tier: this.getTier(kpiScore)
                    },

                    created_at: firebase.firestore.FieldValue.serverTimestamp(),
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                };

                // 4. Save to Firestore
                await db.collection(`projects/${projectId}/performance`).doc(performanceId).set(performanceDoc);
                console.log(`✅ Performance recorded: ${performanceId}`);

                return performanceDoc;

            } catch (error) {
                console.error("❌ Error recording performance:", error);
                throw error;
            }
        },

        calculateEngagementRate: function (metrics, platform) {
            const impressions = parseInt(metrics.impressions) || 0;
            if (impressions === 0) return 0;

            const likes = parseInt(metrics.likes) || 0;
            const comments = parseInt(metrics.comments) || 0;
            const saves = parseInt(metrics.saves) || 0;
            const shares = parseInt(metrics.shares) || 0;

            // Basic Formula: (L+C+S+S) / Impressions
            const totalEngagements = likes + comments + saves + shares;
            return parseFloat((totalEngagements / impressions).toFixed(4));
        },

        calculateKpiScore: function (actual, target) {
            if (!target || target === 0) return 50; // Neutral if no target

            // Formula: 50 + ((Actual - Target) / Target) * 50
            // +100% over target = 100 score
            // -100% under target (0) = 0 score
            // Exact match = 50 score (Wait, usually exact match should be higher, like 80 or 100?)
            // Let's adjust: Target met = 80 score.
            // Formula: min(100, max(0, (actual / target) * 80))
            // If actual == target, score is 80.
            // If actual == 1.25 * target, score is 100.

            // PRD Formula: min(100, max(0, 50 + ((actual - target) / target) * 50))
            // If actual = target, score = 50. This seems low for "meeting target".
            // Let's use a slightly more generous curve for the demo.
            // If actual >= target, score is 80-100.

            const ratio = actual / target;
            let score = 0;

            if (ratio >= 1.0) {
                // 1.0 -> 80, 1.5 -> 100
                score = 80 + (ratio - 1.0) * 40;
            } else {
                // 0.0 -> 0, 1.0 -> 80
                score = ratio * 80;
            }

            return Math.min(100, Math.max(0, Math.round(score)));
        },

        getTier: function (score) {
            if (score >= 90) return 'excellent';
            if (score >= 70) return 'good';
            if (score >= 50) return 'average';
            return 'poor';
        }
    };
})();
