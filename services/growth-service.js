import { db } from '../firebase-config.js';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

/**
 * Service for managing Analytics/Growth data in Firestore.
 */
export const GrowthService = {

    /**
     * Fetch daily analytics metrics for a date range.
     * @param {string} projectId 
     * @param {number} days - Number of days to look back
     * @returns {Promise<Array>}
     */
    async getDailyMetrics(projectId, days = 7) {
        if (!projectId) return [];

        try {
            const analyticsRef = collection(db, 'projects', projectId, 'analytics');
            // Logic: Get last N documents ordered by date
            const q = query(
                analyticsRef,
                orderBy('date', 'desc'),
                limit(days)
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Return chronologically (oldest to newest) for charts
            return data.reverse();
        } catch (error) {
            console.error("GrowthService: Error fetching metrics", error);
            return [];
        }
    },

    /**
     * Fetch Top Performing Content.
     * @param {string} projectId 
     * @param {number} limitCount 
     * @returns {Promise<Array>}
     */
    async getTopContent(projectId, limitCount = 5) {
        if (!projectId) return [];

        try {
            // Note: In a real app, we might query 'content_performance' collection.
            // For this phase, we'll checking a subcollection or specific type of analytic doc.
            // Let's assume we have a collection 'content_performance' as planned.
            const contentRef = collection(db, 'projects', projectId, 'content_performance');
            const q = query(
                contentRef,
                orderBy('performance.reach', 'desc'), // Sort by Reach for now
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            // If collection doesn't exist yet, return empty
            console.warn("GrowthService: Content performance collection might be empty or missing index.", error);
            return [];
        }
    },

    /**
     * Check if data exists, if not, runs the seeder (via callback or internal logic).
     * @param {string} projectId 
     * @param {Function} seederFn - Dependency injection of seeder to avoid circular import if possible
     */
    async ensureDataExists(projectId, seederFn) {
        const data = await this.getDailyMetrics(projectId, 1);
        if (data.length === 0 && seederFn) {
            console.log("GrowthService: No data found. Running Seeder...");
            await seederFn(projectId);
            return true; // Data created
        }
        return false; // Data already existed
    }
};
