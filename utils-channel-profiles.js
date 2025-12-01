/**
 * utils-channel-profiles.js
 * 
 * Helper functions for fetching and managing Channel Profiles.
 * Used in Deploy Wizard Step 4 and potentially other areas.
 */

const ChannelProfilesUtils = {
    /**
     * Loads all available (active) channel profiles from Firestore.
     * @returns {Promise<Array>} Array of channel profile objects
     */
    loadAvailableChannels: async function () {
        try {
            const snapshot = await db.collection('channelProfiles')
                .where('isActive', '==', true)
                // .orderBy('name', 'asc') // Requires index, skipping for now or sorting client-side
                .get();

            const channels = [];
            snapshot.forEach(doc => {
                channels.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Client-side sort by name
            channels.sort((a, b) => (a.name || a.key || '').localeCompare(b.name || b.key || ''));

            return channels;
        } catch (error) {
            console.error("Error loading available channels:", error);
            throw error;
        }
    }
};

// Export for module usage if needed, or attach to window for vanilla JS
if (typeof window !== 'undefined') {
    window.ChannelProfilesUtils = ChannelProfilesUtils;
}
