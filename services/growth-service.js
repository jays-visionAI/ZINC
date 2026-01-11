/**
 * Service for managing Analytics/Growth data in Firestore.
 */
export const GrowthService = {
    // Helper to get db instance
    get db() {
        return window.firebase ? window.firebase.firestore() : null;
    },

    /**
     * Fetch daily analytics metrics for a date range.
     * @param {string} projectId 
     * @param {number} days - Number of days to look back
     * @returns {Promise<Array>}
     */
    async getDailyMetrics(projectId, days = 7) {
        if (!projectId) return [];

        try {
            const analyticsRef = this.db.collection('projects').doc(projectId).collection('analytics');
            // Logic: Get last N documents ordered by date
            const q = analyticsRef.orderBy('date', 'desc').limit(days);

            const snapshot = await q.get();
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
            const contentRef = this.db.collection('projects').doc(projectId).collection('content_performance');
            const q = contentRef.orderBy('performance.reach', 'desc').limit(limitCount);

            const snapshot = await q.get();
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
