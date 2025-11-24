// admin-projects.js

(function () {
    let projects = [];
    let filteredProjects = [];
    let industries = [];
    let unsubscribeProjects = null;

    window.initProjects = function (user) {
        console.log("Initializing Projects Page...");

        // Cleanup previous listener if exists
        if (unsubscribeProjects) {
            unsubscribeProjects();
            unsubscribeProjects = null;
        }

        // Reset state
        projects = [];
        filteredProjects = [];
        industries = [];

        loadIndustries();
        loadProjects();
        setupEventListeners();
    };

    function setupEventListeners() {
        const searchInput = document.getElementById("project-search");
        const statusFilter = document.getElementById("filter-status");
        const industryFilter = document.getElementById("filter-industry");
        const sortSelect = document.getElementById("sort-projects");

        if (searchInput) searchInput.addEventListener("input", handleFilters);
        if (statusFilter) statusFilter.addEventListener("change", handleFilters);
        if (industryFilter) industryFilter.addEventListener("change", handleFilters);
        if (sortSelect) sortSelect.addEventListener("change", handleFilters);
    }

    async function loadIndustries() {
        try {
            const snapshot = await db.collection("industries").where("isActive", "==", true).get();
            industries = [];
            snapshot.forEach(doc => {
                industries.push({ id: doc.id, ...doc.data() });
            });

            // Sort by order
            industries.sort((a, b) => (a.order || 0) - (b.order || 0));

            populateIndustryFilter();
        } catch (error) {
            console.error("Error loading industries:", error);
        }
    }

    function populateIndustryFilter() {
        const select = document.getElementById("filter-industry");
        if (!select) return;

        // Keep the first "All Industries" option
        select.innerHTML = '<option value="all">All Industries</option>';

        industries.forEach(ind => {
            const option = document.createElement("option");
            option.value = ind.key;
            option.textContent = ind.labelEn; // Default to English for admin
            select.appendChild(option);
        });
    }

    function loadProjects() {
        const tbody = document.getElementById("projects-table-body");
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Loading projects...</td></tr>';

        unsubscribeProjects = db.collection("projects")
            .orderBy("createdAt", "desc")
            .limit(50) // Initial limit
            .onSnapshot((snapshot) => {
                // Check if we are still on the projects page
                if (!document.getElementById("projects-table-body")) {
                    if (unsubscribeProjects) unsubscribeProjects();
                    return;
                }

                projects = [];
                snapshot.forEach(doc => {
                    projects.push({ id: doc.id, ...doc.data() });
                });

                filteredProjects = [...projects];

                // Initial filter application (in case filters were set before load)
                handleFilters();
            }, (error) => {
                console.error("Error loading projects:", error);
                if (document.getElementById("projects-table-body")) {
                    document.getElementById("projects-table-body").innerHTML = `<tr><td colspan="9" style="text-align: center; color: #ef4444;">Error loading projects: ${error.message}</td></tr>`;
                }
            });
    }

    function handleFilters() {
        const searchInput = document.getElementById("project-search");
        const statusFilter = document.getElementById("filter-status");
        const industryFilter = document.getElementById("filter-industry");
        const sortSelect = document.getElementById("sort-projects");

        if (!searchInput || !statusFilter || !industryFilter || !sortSelect) return;

        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;
        const industryValue = industryFilter.value;
        const sortValue = sortSelect.value;

        filteredProjects = projects.filter(p => {
            const matchesSearch = (p.projectName || "").toLowerCase().includes(searchTerm) ||
                (p.industry || "").toLowerCase().includes(searchTerm);
            const matchesStatus = statusValue === "all" || p.status === statusValue;
            const matchesIndustry = industryValue === "all" || p.industry === industryValue;

            return matchesSearch && matchesStatus && matchesIndustry;
        });

        // Sort
        filteredProjects.sort((a, b) => {
            switch (sortValue) {
                case "newest":
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                case "oldest":
                    return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                case "growth_desc":
                    return (b.followerGrowth30d || 0) - (a.followerGrowth30d || 0);
                case "engagement_desc":
                    return (b.engagementRate || 0) - (a.engagementRate || 0);
                case "agents_desc":
                    return (b.totalAgents || 0) - (a.totalAgents || 0);
                default:
                    return 0;
            }
        });

        renderProjectsTable();
    }

    function renderProjectsTable() {
        const tbody = document.getElementById("projects-table-body");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (filteredProjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No projects found</td></tr>';
            return;
        }

        filteredProjects.forEach(p => {
            const tr = document.createElement("tr");

            // Status Badge Style
            let statusClass = "admin-status-active";
            if (p.status === "Attention") statusClass = "admin-status-inactive"; // Warning color
            if (p.status === "Paused") statusClass = "admin-status-inactive";
            if (p.status === "Cool-down") statusClass = "admin-status-inactive"; // Or specific color if needed
            if (p.status === "Stopped") statusClass = "admin-status-inactive";

            // Date formatting
            const date = p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : "-";

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: #fff;">${p.projectName || "Untitled"}</div>
                    <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5);">${p.websiteUrl || ""}</div>
                </td>
                <td>${p.userId ? p.userId.substring(0, 8) + "..." : "Unknown"}</td>
                <td>${p.industry || "-"}</td>
                <td><span class="admin-status-badge ${statusClass}">${p.status || "Normal"}</span></td>
                <td>${p.totalAgents || 0}</td>
                <td>
                    <span style="color: ${(p.followerGrowth30d || 0) >= 0 ? 'var(--color-success)' : '#ef4444'}">
                        ${(p.followerGrowth30d || 0) >= 0 ? '+' : ''}${p.followerGrowth30d || 0}%
                    </span>
                </td>
                <td>${p.engagementRate || 0}%</td>
                <td>${date}</td>
                <td>
                    <button class="admin-btn-secondary" onclick="viewProjectDetail('${p.id}')">View</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Expose global function for button click
    window.viewProjectDetail = (id) => {
        console.log("Navigating to project detail:", id);
        window.location.hash = `#project-detail/${id}`;
        // The admin.js routing will handle loading the detail page
    };

    // Run immediately on first load
    window.initProjects();

})();
