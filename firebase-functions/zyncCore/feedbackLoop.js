const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * ZYNK Core: Feedback Loop & Data Asset Manager
 * Handles Execution Logging (Cost/Latency) and Taste Matrix (User Preferences)
 */

class FeedbackLoop {
    constructor() {
        this.logsCollection = db.collection('execution_logs');
        this.tasteCollection = db.collection('taste_matrix');
    }

    /**
     * Log the details of an AI execution
     * @param {object} logData 
     */
    async logExecution(logData) {
        try {
            const { userId, taskType, inputs, mode, modelConfig, output, latencyMs, status } = logData;

            // Calculate estimated cost (very rough approximation)
            // In a real app, we'd count tokens properly.
            // Eco: ~$0.01, Pro: ~$0.10
            let estimatedCostUSD = 0;
            if (mode === 'eco') estimatedCostUSD = 0.001;
            if (mode === 'balanced') estimatedCostUSD = 0.01;
            if (mode === 'pro') estimatedCostUSD = 0.05;

            await this.logsCollection.add({
                userId: userId || 'anonymous',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                taskType,
                mode,
                model: modelConfig?.model || 'unknown',
                latencyMs,
                status,
                estimatedCostUSD,
                // We might perform RAG on 'inputs' later, but for logs we keep it raw or summarized
                inputSummary: JSON.stringify(inputs).substring(0, 500),
                outputLength: output ? output.length : 0
            });

            console.log(`[FeedbackLoop] Logged execution for user ${userId}. Cost: $${estimatedCostUSD}`);

        } catch (error) {
            console.error('[FeedbackLoop] Error logging execution:', error);
            // Non-blocking error - don't fail the user request just because logging failed
        }
    }

    /**
     * Update User's Taste Matrix based on their choices or explicit feedback
     * @param {string} userId 
     * @param {object} feedbackData { preferredTone, riskTolerance, decision: 'disruptor' | 'purist' }
     */
    async updateTaste(userId, feedbackData) {
        if (!userId) return;

        const userTasteRef = this.tasteCollection.doc(userId);

        try {
            await db.runTransaction(async (t) => {
                const doc = await t.get(userTasteRef);
                let data = doc.exists ? doc.data() : {
                    historyCount: 0,
                    tones: {}, // Histogram of preferred tones
                    riskProfile: 0.5 // 0.0 (Safe) -> 1.0 (Risky)
                };

                // Update Stats
                data.historyCount += 1;

                if (feedbackData.decision) {
                    // If user picked 'Disruptor' (Riskier), nudge risk profile up
                    if (feedbackData.decision === 'disruptor') {
                        data.riskProfile = Math.min(1.0, data.riskProfile + 0.05);
                    } else if (feedbackData.decision === 'purist') {
                        data.riskProfile = Math.max(0.0, data.riskProfile - 0.05);
                    }
                }

                if (feedbackData.preferredTone) {
                    const tone = feedbackData.preferredTone;
                    data.tones[tone] = (data.tones[tone] || 0) + 1;
                }

                t.set(userTasteRef, data, { merge: true });
            });
            console.log(`[FeedbackLoop] Updated Taste Matrix for ${userId}`);

        } catch (error) {
            console.error('[FeedbackLoop] Error updating taste:', error);
        }
    }

    /**
     * Retrieve current user profile for StrategyPlanner
     */
    async getUserProfile(userId) {
        if (!userId) return null;
        const doc = await this.tasteCollection.doc(userId).get();
        return doc.exists ? doc.data() : null;
    }
}

module.exports = { FeedbackLoop: new FeedbackLoop() };
