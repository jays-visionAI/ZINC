// admin-overview.js

(function () {
    window.initOverview = function (user) {
        console.log("Initializing Overview Page...");
        loadUserStats();
        loadAgentStats();
        // Sales stats are placeholders for now
    };

    async function loadUserStats() {
        try {
            const usersSnapshot = await db.collection("users").get();
            const totalUsers = usersSnapshot.size;

            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            let daily = 0;
            let weekly = 0;
            let monthly = 0;

            usersSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.createdAt) {
                    const createdAt = data.createdAt.toDate();
                    if (createdAt > oneDayAgo) daily++;
                    if (createdAt > oneWeekAgo) weekly++;
                    if (createdAt > oneMonthAgo) monthly++;
                }
            });

            updateStat("stats-users-total", totalUsers);
            updateStat("stats-users-daily", daily);
            updateStat("stats-users-weekly", weekly);
            updateStat("stats-users-monthly", monthly);

        } catch (error) {
            console.error("Error loading user stats:", error);
        }
    }

    async function loadAgentStats() {
        try {
            // Count Master Agents
            const agentsSnapshot = await db.collection("agents").get();
            const totalMasterAgents = agentsSnapshot.size;

            updateStat("stats-agents-total", totalMasterAgents);

            // Count Active Clones (Projects with active agents)
            // This is a bit expensive, so we might want to optimize later
            // For now, we'll just count total projects as a proxy or fetch projects
            const projectsSnapshot = await db.collection("projects").get();
            let activeClones = 0;

            projectsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.status === "Normal" || data.status === "Attention") {
                    activeClones++;
                }
            });

            updateStat("stats-agents-clones", activeClones);

        } catch (error) {
            console.error("Error loading agent stats:", error);
        }
    }

    function updateStat(id, value) {
        const element = document.getElementById(id);
        if (element) {
            // Animate number
            animateValue(element, 0, value, 1000);
        }
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Run immediately
    window.initOverview();

})();
