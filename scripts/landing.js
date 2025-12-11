// scripts/landing.js
// Handles dynamic loading of landing page content

(function () {
    console.log("🚀 Landing page script loaded");

    const db = firebase.firestore();

    async function loadChannels() {
        const grid = document.getElementById('compatible-channels-grid');
        if (!grid) return;

        try {
            console.log("📡 Fetching channel profiles...");
            const snapshot = await db.collection('channelProfiles')
                .where('status', '==', 'active')
                .orderBy('order', 'asc')
                .get();

            if (snapshot.empty) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No channels found.</p>';
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const p = doc.data();
                const iconContent = p.icon && p.icon.trim().startsWith('<svg')
                    ? p.icon
                    : (p.icon || '🌐'); // Fallback

                // Use the ID as a class for legacy CSS styling (background colors)
                // If the icon is a "Full SVG" (uploaded via admin), it might have its own background,
                // but keeping the class ensures legacy compatibility.
                const cssClass = p.key || p.id;

                html += `
                <div class="platform-card">
                    <div class="platform-icon ${cssClass}">
                        ${iconContent}
                    </div>
                    <h3>${p.displayName || p.name}</h3>
                </div>`;
            });

            grid.innerHTML = html;
            console.log(`✅ Loaded ${snapshot.size} channels.`);

        } catch (error) {
            console.error("❌ Error loading channels:", error);
            grid.innerHTML = `<p style="color:red; grid-column: 1/-1; text-align:center;">Failed to load channels: ${error.message}</p>`;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadChannels);
    } else {
        loadChannels();
    }

})();
