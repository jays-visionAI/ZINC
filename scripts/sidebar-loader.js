/**
 * Sidebar Loader
 * Fetches active channel profiles and renders them in the sidebar.
 */

document.addEventListener("DOMContentLoaded", async () => {
    // Only run on Command Center and User Settings pages
    const currentPage = window.location.pathname;
    const isCommandCenter = currentPage.includes('command-center') || currentPage === '/' || currentPage === '/index.html';
    const isUserSettings = currentPage.includes('user-settings');

    if (!isCommandCenter && !isUserSettings) {
        console.log('Sidebar loader: Skipping on this page');
        return;
    }

    const sidebarMenu = document.querySelector('.sidebar-menu');
    if (!sidebarMenu) return;

    // Create Platform Section Container
    const platformSection = document.createElement('div');
    platformSection.className = 'sidebar-section';
    platformSection.innerHTML = `
        <div class="menu-label" style="margin-top: 24px;">PLATFORMS</div>
        <div id="sidebar-platforms-list">
            <div style="padding: 12px 20px; color: rgba(255,255,255,0.3); font-size: 13px;">Loading...</div>
        </div>
    `;
    sidebarMenu.appendChild(platformSection);

    try {
        // Check if db is initialized
        if (typeof db === 'undefined') {
            console.error("Firestore 'db' not found.");
            return;
        }

        // Fetch Channel Profiles
        const snapshot = await db.collection('channelProfiles')
            .where('status', '==', 'active')
            .get();

        const container = document.getElementById('sidebar-platforms-list');
        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = '<div style="padding: 12px 20px; color: rgba(255,255,255,0.3); font-size: 13px;">No platforms active</div>';
            return;
        }

        // Sort in-memory to avoid Firestore index requirement
        const channels = [];
        snapshot.forEach(doc => {
            channels.push({ id: doc.id, ...doc.data() });
        });

        channels.sort((a, b) => (a.order || 0) - (b.order || 0));

        channels.forEach(data => {
            const link = document.createElement('a');
            link.href = `#platform-${data.key}`; // Placeholder link
            link.className = 'menu-item';
            link.innerHTML = `
                <span style="font-size: 18px; margin-right: 12px; display: flex; align-items: center;">${data.icon || '🔗'}</span>
                ${data.displayName}
            `;
            // Optional: Add active class logic if needed
            container.appendChild(link);
        });

    } catch (error) {
        console.error("Error loading sidebar platforms:", error);
        const container = document.getElementById('sidebar-platforms-list');
        if (container) {
            container.innerHTML = '<div style="padding: 12px 20px; color: rgba(255,255,255,0.3); font-size: 13px;">Error loading platforms</div>';
        }
    }
});
