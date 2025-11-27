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
                        lastLogin: userData.lastLogin,
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
                        lastLogin: userData.lastLogin,
                        projectCount: 0
                    });
                }
            }

            // Sort by last login (most recent first)
            users.sort((a, b) => {
                const timeA = a.lastLogin?.seconds || a.createdAt?.seconds || 0;
                const timeB = b.lastLogin?.seconds || b.createdAt?.seconds || 0;
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
            let tierClass = 'admin-status-normal';
            if (tier === 'admin') tierClass = 'admin-status-cooldown';
            if (tier === 'pro') tierClass = 'admin-status-attention';

            tr.innerHTML = `
                <td>${u.email}</td>
                <td>${u.displayName}</td>
                <td><span class="admin-status-badge ${tierClass}">${tier.toUpperCase()}</span></td>
                <td>${u.projectCount}</td>
                <td>${joinedDate}</td>
                <td>
                    <button class="admin-btn-secondary" onclick="viewUserDetail('${u.id}')">View</button>
                    ${u.role !== 'admin' ? `<button class="admin-btn-secondary" style="background: #ef4444; margin-left: 8px;" onclick="deleteUser('${u.id}', '${u.email}')">Delete</button>` : ''}
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

    // Delete user function
    window.deleteUser = async (uid, email) => {
        if (!confirm(`정말로 이 유저를 삭제하시겠습니까?\n\nEmail: ${email}\n\n⚠️ 이 작업은 되돌릴 수 없습니다.\n- Firestore 유저 문서 삭제\n- 유저의 모든 프로젝트 삭제\n- 유저의 모든 파일 삭제\n\n참고: Firebase Authentication 계정은 서버측에서만 삭제 가능합니다.`)) {
            return;
        }

        try {
            const tbody = document.querySelector('.admin-table tbody');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Deleting user...</td></tr>';

            // 1. Delete all user's projects
            const projectsSnapshot = await db.collection("projects")
                .where("userId", "==", uid)
                .get();

            const deletePromises = [];

            projectsSnapshot.forEach(doc => {
                deletePromises.push(doc.ref.delete());
            });

            await Promise.all(deletePromises);
            console.log(`Deleted ${projectsSnapshot.size} projects`);

            // 2. Delete user document
            await db.collection("users").doc(uid).delete();
            console.log('User document deleted');

            // 3. Note about Authentication
            alert(`유저 데이터가 삭제되었습니다.\n\n⚠️ Firebase Authentication 계정은 유지됩니다.\n완전한 삭제를 위해서는 Firebase Console에서 수동으로 삭제하거나, Cloud Functions를 사용해야 합니다.\n\nAuthentication > Users 탭에서 ${email}을 검색하여 삭제하세요.`);

            // Reload users
            loadUsers();

        } catch (error) {
            console.error("Error deleting user:", error);
            alert(`유저 삭제 실패: ${error.message}`);
            loadUsers();
        }
    };

})();
