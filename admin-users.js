// admin-users.js

(function () {
    let users = [];
    let filteredUsers = [];
    let unsubscribeUsers = null;

    window.initUsers = function (currentUser) {
        console.log("Initializing Users Page...");

        // Cleanup previous listener if exists
        if (unsubscribeUsers) {
            unsubscribeUsers();
            unsubscribeUsers = null;
        }

        // Reset state
        users = [];
        filteredUsers = [];

        loadUsers();
        setupEventListeners();
    };

    function setupEventListeners() {
        const tierFilter = document.querySelector('.admin-form-input');
        if (tierFilter) {
            tierFilter.addEventListener('change', handleFilters);
        }
    }

    function loadUsers() {
        const tbody = document.querySelector('.admin-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading users...</td></tr>';

        // Load all users from Firestore
        unsubscribeUsers = db.collection("users")
            .onSnapshot(async (snapshot) => {
                // Check if we are still on the users page
                if (!document.querySelector('.admin-table tbody')) {
                    if (unsubscribeUsers) unsubscribeUsers();
                    return;
                }

                users = [];

                // Collect all user data
                for (const doc of snapshot.docs) {
                    const userData = { id: doc.id, ...doc.data() };

                    // Count projects for this user
                    try {
                        const projectsSnapshot = await db.collection("projects")
                            .where("userId", "==", doc.id)
                            .where("isDraft", "==", false)
                            .get();
                        userData.projectCount = projectsSnapshot.size;
                    } catch (error) {
                        console.error(`Error counting projects for user ${doc.id}:`, error);
                        userData.projectCount = 0;
                    }

                    users.push(userData);
                }

                filteredUsers = [...users];
                handleFilters();
            }, (error) => {
                console.error("Error loading users:", error);
                if (document.querySelector('.admin-table tbody')) {
                    document.querySelector('.admin-table tbody').innerHTML =
                        `<tr><td colspan="6" style="text-align: center; color: #ef4444;">Error loading users: ${error.message}</td></tr>`;
                }
            });
    }

    function handleFilters() {
        const tierFilter = document.querySelector('.admin-form-input');
        if (!tierFilter) return;

        const tierValue = tierFilter.value;

        filteredUsers = users.filter(u => {
            const matchesTier = !tierValue || (u.tier || 'free') === tierValue;
            return matchesTier;
        });

        renderUsersTable();
    }

    function renderUsersTable() {
        const tbody = document.querySelector('.admin-table tbody');
        if (!tbody) return;

        tbody.innerHTML = "";

        if (filteredUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No users found</td></tr>';
            return;
        }

        filteredUsers.forEach(u => {
            const tr = document.createElement("tr");

            // Format date
            const joinedDate = u.createdAt
                ? new Date(u.createdAt.seconds * 1000).toLocaleDateString()
                : "-";

            // Tier badge
            const tier = u.tier || u.role === 'admin' ? 'admin' : 'free';
            let tierClass = 'admin-status-active';
            if (tier === 'pro') tierClass = 'admin-status-active';
            if (tier === 'enterprise') tierClass = 'admin-status-active';
            if (tier === 'admin') tierClass = 'admin-status-inactive';

            tr.innerHTML = `
                <td>${u.email || "No email"}</td>
                <td>${u.displayName || "Anonymous"}</td>
                <td><span class="admin-status-badge ${tierClass}">${tier.toUpperCase()}</span></td>
                <td>${u.projectCount || 0}</td>
                <td>${joinedDate}</td>
                <td>
                    <button class="admin-btn-secondary" onclick="viewUserDetail('${u.id}')">View</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Expose global function for button click
    window.viewUserDetail = (id) => {
        console.log("View user:", id);
        alert("User Detail Page coming soon!");
    };

    // Run immediately on first load
    window.initUsers();

})();
