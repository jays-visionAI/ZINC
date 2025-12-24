/**
 * utils-channel-profiles.js
 * 
 * Helper functions for fetching and managing Channel Profiles.
 * Used in Deploy Wizard Step 4 and potentially other areas.
 */

const ChannelProfilesUtils = {
    cache: null,

    /**
     * Loads all available (active) channel profiles from Firestore.
     * @returns {Promise<Array>} Array of channel profile objects
     */
    loadAvailableChannels: async function (forceRefresh = false) {
        if (this.cache && !forceRefresh) return this.cache;

        try {
            const db = firebase.firestore();
            const snapshot = await db.collection('channelProfiles')
                .where('status', '==', 'active')
                .get();

            const channels = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                channels.push({
                    id: doc.id,
                    ...data,
                    key: data.key || doc.id // Ensure key exists
                });
            });

            // Client-side sort by order or name
            channels.sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order;
                }
                return (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '');
            });

            this.cache = channels;
            return channels;
        } catch (error) {
            console.error("Error loading available channels:", error);
            return []; // Return empty array on error
        }
    }
};

// Export for module usage if needed, or attach to window for vanilla JS
if (typeof window !== 'undefined') {
    window.ChannelProfilesUtils = ChannelProfilesUtils;
}
