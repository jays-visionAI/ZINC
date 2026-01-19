/**
 * Competitor Intelligence Module
 * Handles scheduled competitor tracking updates and analysis
 */

const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall } = require('firebase-functions/v2/https');

const db = admin.firestore();

/**
 * Scheduled Competitor Tracking Update
 * Runs daily at 6 AM UTC to re-analyze tracked competitors
 */
exports.scheduledCompetitorUpdate = onSchedule({
    schedule: "every day 06:00",
    timeZone: "Asia/Seoul",
    memory: "1GiB",
    timeoutSeconds: 300
}, async (event) => {
    console.log('[CompetitorIntel] Starting scheduled competitor tracking update...');

    try {
        // Find all projects with active competitor tracking
        const projectsSnapshot = await db.collection('projects').get();

        let updatedCount = 0;
        let errorCount = 0;

        for (const projectDoc of projectsSnapshot.docs) {
            try {
                const trackingDoc = await projectDoc.ref
                    .collection('competitorTracking')
                    .doc('current')
                    .get();

                if (!trackingDoc.exists || trackingDoc.data().status !== 'active') {
                    continue;
                }

                const trackingData = trackingDoc.data();
                const rivals = trackingData.rivals || [];

                if (rivals.length === 0) continue;

                console.log(`[CompetitorIntel] Updating tracking for project: ${projectDoc.id}`);

                // Simulate metric changes (in production, this would call AI for re-analysis)
                const updatedRivals = rivals.map(rival => {
                    // Generate small random changes to simulate market dynamics
                    const changeRange = 5; // +/- 5% max change

                    return {
                        ...rival,
                        uspOverlap: clampValue(rival.uspOverlap + randomChange(changeRange)),
                        audienceProximity: clampValue(rival.audienceProximity + randomChange(changeRange)),
                        marketPresence: clampValue(rival.marketPresence + randomChange(changeRange)),
                        growthMomentum: clampValue(rival.growthMomentum + randomChange(changeRange)),
                        matchScore: calculateMatchScore({
                            uspOverlap: rival.uspOverlap,
                            audienceProximity: rival.audienceProximity,
                            marketPresence: rival.marketPresence,
                            growthMomentum: rival.growthMomentum
                        }),
                        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                    };
                });

                // Check for significant changes (alerts)
                const alerts = detectSignificantChanges(rivals, updatedRivals);

                // Save updated tracking data
                await trackingDoc.ref.update({
                    rivals: updatedRivals,
                    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    alerts: alerts.length > 0 ? alerts : admin.firestore.FieldValue.delete()
                });

                // Save snapshot for historical tracking
                await trackingDoc.ref.collection('snapshots').add({
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    rivals: updatedRivals,
                    type: 'scheduled_update'
                });

                updatedCount++;
                console.log(`[CompetitorIntel] Successfully updated project ${projectDoc.id}`);

            } catch (projectError) {
                console.error(`[CompetitorIntel] Error updating project ${projectDoc.id}:`, projectError);
                errorCount++;
            }
        }

        console.log(`[CompetitorIntel] Scheduled update complete. Updated: ${updatedCount}, Errors: ${errorCount}`);

    } catch (error) {
        console.error('[CompetitorIntel] Scheduled update failed:', error);
        throw error;
    }
});

/**
 * Get Competitor Tracking History
 * Returns historical snapshots for trend visualization
 */
exports.getCompetitorHistory = onCall({
    region: 'asia-northeast3',
    memory: '256MiB',
    timeoutSeconds: 60
}, async (request) => {
    const { projectId, limit = 30 } = request.data || {};

    if (!projectId) {
        throw new Error('Project ID is required');
    }

    try {
        const snapshotsQuery = await db
            .collection('projects')
            .doc(projectId)
            .collection('competitorTracking')
            .doc('current')
            .collection('snapshots')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        const snapshots = [];
        snapshotsQuery.forEach(doc => {
            const data = doc.data();
            snapshots.push({
                id: doc.id,
                timestamp: data.timestamp?.toDate?.() || null,
                rivals: data.rivals,
                type: data.type || 'manual'
            });
        });

        // Reverse to get chronological order
        snapshots.reverse();

        return {
            success: true,
            snapshots,
            count: snapshots.length
        };

    } catch (error) {
        console.error('[CompetitorIntel] Error fetching history:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

/**
 * Get Active Alerts
 * Returns any active competitor alerts for a project
 */
exports.getCompetitorAlerts = onCall({
    region: 'asia-northeast3',
    memory: '256MiB'
}, async (request) => {
    const { projectId } = request.data || {};

    if (!projectId) {
        throw new Error('Project ID is required');
    }

    try {
        const trackingDoc = await db
            .collection('projects')
            .doc(projectId)
            .collection('competitorTracking')
            .doc('current')
            .get();

        if (!trackingDoc.exists) {
            return { success: true, alerts: [] };
        }

        const data = trackingDoc.data();
        return {
            success: true,
            alerts: data.alerts || [],
            lastUpdated: data.lastUpdatedAt?.toDate?.() || null
        };

    } catch (error) {
        console.error('[CompetitorIntel] Error fetching alerts:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ========== UTILITY FUNCTIONS ==========

function randomChange(range) {
    return Math.floor(Math.random() * (range * 2 + 1)) - range;
}

function clampValue(value) {
    return Math.min(100, Math.max(0, Math.round(value)));
}

function calculateMatchScore(metrics) {
    return Math.round(
        (metrics.uspOverlap * 0.35) +
        (metrics.audienceProximity * 0.30) +
        (metrics.marketPresence * 0.20) +
        (metrics.growthMomentum * 0.15)
    );
}

function detectSignificantChanges(oldRivals, newRivals) {
    const alerts = [];
    const THRESHOLD = 10; // 10% change is significant

    newRivals.forEach((newRival, index) => {
        const oldRival = oldRivals[index];
        if (!oldRival) return;

        // Check each metric for significant changes
        const metrics = ['uspOverlap', 'audienceProximity', 'marketPresence', 'growthMomentum'];

        metrics.forEach(metric => {
            const change = newRival[metric] - oldRival[metric];
            if (Math.abs(change) >= THRESHOLD) {
                alerts.push({
                    rivalName: newRival.name,
                    metric: metric,
                    previousValue: oldRival[metric],
                    newValue: newRival[metric],
                    change: change,
                    direction: change > 0 ? 'increase' : 'decrease',
                    timestamp: new Date().toISOString(),
                    severity: Math.abs(change) >= 15 ? 'high' : 'medium'
                });
            }
        });
    });

    return alerts;
}

module.exports = exports;
