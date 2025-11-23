// admin.js - Shared admin panel logic

document.addEventListener("DOMContentLoaded", async () => {
    let currentUser = null;
    let currentPage = "overview";

    // 🔹 Auth Check & Role Verification
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        currentUser = user;

        // Check admin role
        try {
            const userDoc = await db.collection("users").doc(user.uid).get();
            const userData = userDoc.data();

            if (!userData || userData.role !== "admin") {
                alert("Access denied. Admin privileges required.");
                window.location.href = "command-center.html";
                return;
            }

            // Render user profile
            renderUserProfile(user, userData);

            // Initialize page routing
            initRouting();
        } catch (error) {
            console.error("Error checking admin role:", error);
            window.location.href = "command-center.html";
        }
    });

    // 🔹 User Profile Rendering
    function renderUserProfile(user, userData) {
        const profileContainer = document.getElementById("admin-user-profile");
        if (!profileContainer) return;

        profileContainer.innerHTML = `
            <div class="admin-user-info">
                <img src="${user.photoURL || 'https://via.placeholder.com/32'}" alt="Profile" class="admin-user-avatar">
                <div>
                    <div class="admin-user-name">${user.displayName || 'Admin'}</div>
                    <div class="admin-user-role">Administrator</div>
                </div>
            </div>
        `;
    }

    // 🔹 Routing Logic
    function initRouting() {
        const navItems = document.querySelectorAll(".admin-nav-item");
        const contentArea = document.getElementById("admin-content");
        const pageTitle = document.getElementById("admin-page-title");

        // Handle navigation clicks
        navItems.forEach(item => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                navigateToPage(page);
            });
        });

        // Handle hash changes
        window.addEventListener("hashchange", () => {
            const hash = window.location.hash.slice(1) || "overview";
            navigateToPage(hash);
        });

        // Initial page load
        const initialHash = window.location.hash.slice(1) || "overview";
        navigateToPage(initialHash);
    }

    async function navigateToPage(page) {
        currentPage = page;

        // Update active nav item
        document.querySelectorAll(".admin-nav-item").forEach(item => {
            item.classList.toggle("active", item.dataset.page === page);
        });

        // Update page title
        const titles = {
            overview: "Overview",
            users: "User Management",
            agents: "Agent Management",
            industries: "Industry Master",
            subscriptions: "Subscription Management",
            settings: "Settings"
        };
        document.getElementById("admin-page-title").textContent = titles[page] || "Admin";

        // Load page content
        await loadPageContent(page);
    }

    async function loadPageContent(page) {
        const contentArea = document.getElementById("admin-content");
        contentArea.innerHTML = '<div class="admin-loading">Loading...</div>';

        try {
            const response = await fetch(`admin-${page}.html`);
            if (response.ok) {
                const html = await response.text();
                contentArea.innerHTML = html;

                // Initialize page-specific scripts
                if (window[`init${capitalize(page)}`]) {
                    window[`init${capitalize(page)}`](currentUser);
                }

                // Load external script if exists
                loadPageScript(page);
            } else {
                // Fallback for pages without dedicated HTML
                contentArea.innerHTML = `
                    <div class="admin-placeholder">
                        <h3>${capitalize(page)} Dashboard</h3>
                        <p>This feature is under development.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error(`Error loading ${page}:`, error);
            contentArea.innerHTML = `
                <div class="admin-error">
                    <p>Failed to load page. Please try again.</p>
                </div>
            `;
        }
    }

    function loadPageScript(page) {
        // Remove old script if exists
        const oldScript = document.querySelector(`script[data-page="${page}"]`);
        if (oldScript) oldScript.remove();

        // Try to load new script
        const script = document.createElement("script");
        script.src = `admin-${page}.js`;
        script.dataset.page = page;
        script.onerror = () => {
            console.log(`No script file for ${page} page`);
        };
        document.body.appendChild(script);
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // 🔹 Back to Command Center
    document.getElementById("back-to-command-center")?.addEventListener("click", () => {
        window.location.href = "command-center.html";
    });
});
