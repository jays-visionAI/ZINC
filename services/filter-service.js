/**
 * Service for managing Content Filter data in Firestore.
 * Collection: projects/{projectId}/content_filter/{contentId}
 */
export const FilterService = {
    // Helper to get db instance
    get db() {
        return window.firebase ? window.firebase.firestore() : null;
    },

    get serverTimestamp() {
        return window.firebase ? window.firebase.firestore.FieldValue.serverTimestamp() : null;
    },

    /**
     * Fetch filter item by ID.
     * If not found, it might need to be imported from Studio (not implemented here yet).
     * @param {string} projectId 
     * @param {string} contentId 
     * @returns {Promise<Object|null>}
     */
    async getContent(projectId, contentId) {
        if (!projectId || !contentId) {
            console.error("FilterService: Missing projectId or contentId");
            return null;
        }

        try {
            const docSnap = await this.db.collection('projects').doc(projectId).collection('content_filter').doc(contentId).get();

            if (docSnap.exists) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                console.warn(`FilterService: Content ${contentId} not found in project ${projectId}`);
                return null;
            }
        } catch (error) {
            console.error("FilterService: Error fetching content", error);
            throw error;
        }
    },

    /**
     * Save or update filter content.
     * @param {string} projectId 
     * @param {string} contentId 
     * @param {Object} data - Partial or full data to save
     */
    async saveContent(projectId, contentId, data) {
        if (!projectId || !contentId) return;

        try {
            const docRef = this.db.collection('projects').doc(projectId).collection('content_filter').doc(contentId);

            // Add timestamps
            const payload = {
                ...data,
                updatedAt: this.serverTimestamp
            };

            await docRef.set(payload, { merge: true });
            console.log(`FilterService: Saved content ${contentId}`);
            return true;
        } catch (error) {
            console.error("FilterService: Error saving content", error);
            throw error;
        }
    },

    /**
     * Create a demo/draft item for testing if it doesn't exist.
     */
    async createDemoDraft(projectId, id = 'demo_draft_001') {
        const demoId = id;
        const demoData = {
            contentId: demoId,
            projectId: projectId,
            source: 'manual',
            platform: 'instagram',
            status: 'draft',
            content: {
                caption: "여름철 피부 고민, #클린뷰티 로 시작하세요!\n\n무더운 날씨에 지친 피부를 위한 클린뷰티 솔루션. 자연 유래 성분으로 순하게, 지구도 함께 지켜요.",
                hashtags: ["#클린뷰티"],
                mediaUrls: []
            },
            evaluation: {
                totalScore: 0,
                breakdown: null
            },
            suggestions: [],
            createdAt: this.serverTimestamp,
            updatedAt: this.serverTimestamp
        };

        await this.saveContent(projectId, demoId, demoData);
        return demoId;
    }
};
