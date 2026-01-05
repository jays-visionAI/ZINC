// admin-vision-test.js

(function () {
    window.initVisionTest = function (user) {
        console.log("Initializing Vision Test Page...");
    };

    window.runAestheticAnalysis = async function () {
        const urlInput = document.getElementById('vision-url');
        const url = urlInput.value.trim();

        if (!url) return alert("Please enter a valid URL");

        // UI State
        const loading = document.getElementById('vision-loading');
        const result = document.getElementById('vision-result');
        const btn = document.querySelector('button[onclick="runAestheticAnalysis()"]');

        loading.style.display = 'block';
        result.style.display = 'none';
        btn.disabled = true;
        btn.textContent = "Analyzing...";

        try {
            console.log("Calling analyzeAesthetic for:", url);
            const analyzeFn = firebase.functions().httpsCallable('analyzeAesthetic');
            const response = await analyzeFn({
                url: url,
                targetAudience: "Tech-savvy users",
                designGoals: "Modern, Dashboard, Dark Mode"
            });

            const data = response.data;
            console.log("Vision Result:", data);

            if (!data.success) throw new Error(data.error || "Unknown error");

            renderVisionResult(data.analysis);

        } catch (error) {
            console.error(error);
            alert("Analysis Failed: " + error.message);
        } finally {
            loading.style.display = 'none';
            result.style.display = 'block';
            btn.disabled = false;
            btn.textContent = "👁️ Analyze";
        }
    };

    function renderVisionResult(analysis) {
        // Score Animation
        const scoreEl = document.getElementById('vision-score');
        let score = 0;
        const targetScore = analysis.aesthetic_score || 0;
        const timer = setInterval(() => {
            if (score >= targetScore) clearInterval(timer);
            else {
                score++;
                scoreEl.textContent = score;
                // Color Code
                if (score < 50) scoreEl.style.color = '#ef4444';
                else if (score < 80) scoreEl.style.color = '#fbbf24';
                else scoreEl.style.color = '#22c55e';
            }
        }, 20);

        document.getElementById('vision-impression').textContent = analysis.overall_impression || "No impression provided.";
        document.getElementById('vision-palette').textContent = analysis.color_palette_analysis || "-";
        document.getElementById('vision-typo').textContent = analysis.typography_analysis || "-";

        // Lists
        const issuesList = document.getElementById('vision-issues');
        issuesList.innerHTML = (analysis.key_issues || []).map(i => `<li>${i}</li>`).join('');

        const recsList = document.getElementById('vision-recs');
        recsList.innerHTML = (analysis.actionable_recommendations || []).map(r => `<li>${r}</li>`).join('');
    }
})();
