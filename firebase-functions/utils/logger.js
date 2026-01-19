const admin = require('firebase-admin');

/**
 * ZINC Agent Logger
 * Handles dual-layer logging:
 * 1. Summary Metrics -> Firestore (for Dashboard Charts)
 * 2. Detailed Execution Logs -> Cloud Storage (for Debugging/Audit)
 */

const db = admin.firestore();
const storage = admin.storage();

// Name of the GCS bucket for logs. 
// If null, uses the default Firebase Storage bucket.
// You can customize this if you have a separate bucket for logs.
const LOG_BUCKET_NAME = null;

/**
 * Log Agent Execution
 * @param {Object} params
 * @param {string} params.agentId - The ID of the agent (e.g., 'universal_creator')
 * @param {string} params.runId - Unique ID for this execution
 * @param {string} params.projectId - Project ID context
 * @param {Object} params.metrics - Summary metrics (cost, duration, tokens, success)
 * @param {Object} params.details - Full execution details (prompts, responses, tool calls)
 */
exports.logAgentExecution = async ({ agentId, runId, projectId, metrics, details }) => {
    try {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // 1. Write Detailed Log to GCS (JSON File)
        const bucket = LOG_BUCKET_NAME ? storage.bucket(LOG_BUCKET_NAME) : storage.bucket();
        const filePath = `logs/${agentId}/${dateStr}/${runId}.json`;
        const file = bucket.file(filePath);

        const logContent = JSON.stringify({
            agentId,
            runId,
            projectId,
            timestamp: new Date().toISOString(),
            metrics,
            details
        }, null, 2);

        await file.save(logContent, {
            contentType: 'application/json',
            resumable: false
        });

        // 2. Write Summary to Firestore (for Dashboard)
        // Collection: agentRuns
        await db.collection('agentRuns').doc(runId).set({
            agentId,
            projectId,
            runId,
            createdAt: timestamp,
            status: metrics.success ? 'success' : 'failure',
            cost: metrics.cost || 0,
            tokens: metrics.tokens || 0,
            durationMs: metrics.durationMs || 0,
            logPath: filePath // Link to full GCS log
        });

        console.log(`[Logger] Logged execution for ${agentId}:${runId} (Cost: $${metrics.cost})`);

    } catch (error) {
        console.error(`[Logger] Failed to log execution for ${agentId}:${runId}`, error);
        // Don't throw, logging failure shouldn't crash the agent
    }
};

/**
 * Calculate Cost based on Model (Simplified)
 * @param {string} model - e.g. 'gpt-4o'
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number} cost in USD
 */
exports.calculateCost = (model, inputTokens, outputTokens) => {
    // Pricing table (approximate, current as of early 2025)
    // Prices are per 1K tokens
    const pricing = {
        'gpt-4o': { in: 0.0025, out: 0.01 },
        'gpt-3.5-turbo': { in: 0.0005, out: 0.0015 },
        'gemini-1.5-pro': { in: 0.00125, out: 0.00375 }, // example
        'gemini-2.0-flash-vision': { in: 0.0001, out: 0.0004 }, // example
    };

    const rates = pricing[model] || pricing['gpt-3.5-turbo']; // Default fallback
    const cost = (inputTokens / 1000 * rates.in) + (outputTokens / 1000 * rates.out);
    return parseFloat(cost.toFixed(6));
};
