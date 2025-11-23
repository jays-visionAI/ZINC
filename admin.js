// admin.js - Shared admin panel logic

document.addEventListener("DOMContentLoaded", async () => {
    let currentUser = null;
    let currentPage = "overview";

    // 🔹 Auth Check & Role Verification
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            console.log("No user logged in, redirecting to index.html");
            window.location.href = "index.html";
            return;
        }

        console.log("User logged in:", user.email, "UID:", user.uid);
        currentUser = user;

        // Check admin role
        try {
            console.log("Checking admin role in Firestore...");
            const userDoc = await db.collection("users").doc(user.uid).get();

            if (!userDoc.exists) {
                console.error("User document does not exist in Firestore!");
                console.log("Creating user document. Please set role='admin' manually.");

                // Create user document if it doesn't exist
                await db.collection("users").doc(user.uid).set({
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                alert(`User document created for ${user.email}.\n\nTo grant admin access:\n1. Open Firebase Console\n2. Go to Firestore Database\n3. Find users/${user.uid}\n4. Add field: role = "admin" (string)\n5. Refresh this page`);
                window.location.href = "command-center.html";
                return;
            }

            const userData = userDoc.data();
            console.log("User data:", userData);

            if (!userData.role) {
                console.error("User document exists but 'role' field is missing!");
                alert(`Admin access not granted.\n\nYour account: ${user.email}\n\nTo grant admin access:\n1. Open Firebase Console\n2. Go to Firestore Database\n3. Find users/${user.uid}\n4. Add field: role = "admin" (string)\n5. Refresh this page`);
                window.location.href = "command-center.html";
                return;
            }

            if (userData.role !== "admin") {
                console.error("User role is:", userData.role, "(expected: 'admin')");
                alert(`Access denied. Admin privileges required.\n\nYour role: ${userData.role}\nRequired role: admin`);
                window.location.href = "command-center.html";
                return;
            }

            console.log("✅ Admin access granted!");

            // Render user profile
            renderUserProfile(user, userData);

            // Initialize page routing
            initRouting();
        } catch (error) {
            console.error("Error checking admin role:", error);
            alert(`Error accessing admin panel:\n\n${error.message}\n\nPlease check:\n1. Firebase is initialized\n2. Firestore rules allow reading users collection\n3. Your account has role='admin' in Firestore`);
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
