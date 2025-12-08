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
        // PRD 11.4: Redirect deprecated pages
        if (page === 'agentruns') {
            // Redirect Agent Runs to Sub-Agents Execution Logs tab
            window.location.hash = 'subagents?tab=runs';
            return;
        }
        if (page === 'kpi-management') {
            // Redirect KPI Management to Overview
            window.location.hash = 'overview';
            return;
        }

        // Handle detail pages pattern
        let actualPage = page;
        if (page.startsWith('agentteam-detail/')) {
            actualPage = 'agentteam-detail';
        } else if (page.startsWith('agentrun-detail/')) {
            actualPage = 'agentrun-detail';
        } else if (page.startsWith('project-detail/')) {
            actualPage = 'project-detail';
        }

        currentPage = actualPage;

        // Update active nav item
        document.querySelectorAll(".admin-nav-item").forEach(item => {
            const itemPage = item.dataset.page;
            const isActive = itemPage === actualPage ||
                (actualPage === 'agentteam-detail' && itemPage === 'agentteams') ||
                (actualPage === 'agentteam-detail' && itemPage === 'agentteams') ||
                (actualPage === 'agentrun-detail' && itemPage === 'agentruns') || // Keep parent active
                (actualPage === 'project-detail' && itemPage === 'projects');
            item.classList.toggle("active", isActive);
        });

        // Update page title
        const titles = {
            overview: "Overview",
            projects: "Project Management",
            'project-detail': "Project Details",
            'agentteam-detail': "Agent Team Detail",
            'agentrun-detail': "Task Execution Detail",
            users: "User Management",
            agentteams: "Agent Team Template",
            agentruns: "Agent Execution Logs",
            subagents: "Sub-Agent Management",
            'channel-profiles': "Channel Profile Management",
            'runtime-profiles': 'Runtime Profile Management',
            'runtime-performance': 'Runtime Performance & Analytics',
            'kpi-management': 'KPI Management',
            performance: "Performance & KPI",
            industries: "Industry Master",
            documents: "Documentation",
            subscriptions: "Subscription Management",
            chatbot: "AI Chatbot Settings",
            settings: "Settings"
        };
        document.getElementById("admin-page-title").textContent = titles[actualPage] || "Admin";

        // Load page content with actualPage
        await loadPageContent(actualPage);
    }

    async function loadPageContent(page) {
        const contentArea = document.getElementById("admin-content");
        contentArea.innerHTML = '<div class="admin-loading">Loading...</div>';

        try {
            // Cache busting for development
            const timestamp = Date.now();
            const response = await fetch(`admin-${page}.html?v=${timestamp}`);
            console.log(`Loading page: admin-${page}.html`);
            if (response.ok) {
                const html = await response.text();
                contentArea.innerHTML = html;

                // Initialize page-specific scripts
                // Convert page name to init function name (e.g., 'agentrun-detail' -> 'initAgentrunDetail')
                const initFuncName = `init${page.split('-').map(word => capitalize(word)).join('')}`;
                console.log(`Looking for ${initFuncName}, exists: ${typeof window[initFuncName]}`);
                if (window[initFuncName]) {
                    console.log(`Calling ${initFuncName} directly`);
                    window[initFuncName](currentUser);
                } else {
                    // Load external script
                    console.log(`Loading script for ${page}`);
                    loadPageScript(page, () => {
                        const funcName = `init${page.split('-').map(word => capitalize(word)).join('')}`;
                        console.log(`Script loaded, calling ${funcName}`);
                        if (window[funcName]) {
                            window[funcName](currentUser);
                        }
                    });
                }
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

    function loadPageScript(page, callback) {
        // Remove old script if exists
        const oldScript = document.querySelector(`script[data-page="${page}"]`);
        if (oldScript) oldScript.remove();

        // Try to load new script with cache busting
        const script = document.createElement("script");
        script.src = `admin-${page}.js?v=${Date.now()}`;
        script.dataset.page = page;
        script.onload = () => {
            console.log(`Script loaded for ${page}`);
            if (callback) callback();
        };
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
