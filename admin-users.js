// admin-users.js

(function () {
    let users = [];
    let filteredUsers = [];

    window.initUsers = function (currentUser) {
        console.log("Initializing Users Page...");

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

    async function loadUsers() {
        const tbody = document.querySelector('.admin-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading users...</td></tr>';

        try {
            // Fetch all user documents from Firestore
            const usersSnapshot = await db.collection("users").get();
            const firestoreUsers = {};

            usersSnapshot.forEach(doc => {
                firestoreUsers[doc.id] = doc.data();
            });

            // Get current authenticated user to check if admin
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ef4444;">Not authenticated</td></tr>';
                return;
            }

            // Note: Firebase Client SDK doesn't provide listUsers()
            // We can only show users that have Firestore documents
            // To show ALL authenticated users, you would need Firebase Admin SDK (server-side)

            users = [];

            for (const [uid, userData] of Object.entries(firestoreUsers)) {
                // Count projects for this user
                try {
                    const projectsSnapshot = await db.collection("projects")
                        .where("userId", "==", uid)
                        .where("isDraft", "==", false)
                        .get();

                    users.push({
                        id: uid,
                        email: userData.email || "No email",
                        displayName: userData.displayName || "Anonymous",
                        photoURL: userData.photoURL,
                        tier: userData.tier || (userData.role === 'admin' ? 'admin' : 'free'),
                        role: userData.role,
                        createdAt: userData.createdAt,
                        projectCount: projectsSnapshot.size
                    });
                } catch (error) {
                    console.error(`Error counting projects for user ${uid}:`, error);
                    users.push({
                        id: uid,
                        email: userData.email || "No email",
                        displayName: userData.displayName || "Anonymous",
                        photoURL: userData.photoURL,
                        tier: userData.tier || (userData.role === 'admin' ? 'admin' : 'free'),
                        role: userData.role,
                        createdAt: userData.createdAt,
                        projectCount: 0
                    });
                }
            }

            // Sort by creation date (newest first)
            users.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });

            filteredUsers = [...users];
            handleFilters();

        } catch (error) {
            console.error("Error loading users:", error);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444;">Error loading users: ${error.message}</td></tr>`;
        }
    }

    function handleFilters() {
        const tierFilter = document.querySelector('.admin-form-input');
        if (!tierFilter) return;

        const tierValue = tierFilter.value;

        filteredUsers = users.filter(u => {
            const matchesTier = !tierValue || u.tier === tierValue;
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
            const tier = u.tier || 'free';
            let tierClass = 'admin-status-active';
            if (tier === 'admin') tierClass = 'admin-status-inactive';

            tr.innerHTML = `
                <td>${u.email}</td>
                <td>${u.displayName}</td>
                <td><span class="admin-status-badge ${tierClass}">${tier.toUpperCase()}</span></td>
                <td>${u.projectCount}</td>
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
