/**
 * Brand Score Service
 * Calculates Brand Health Score and Knowledge Score based on project data
 */

class BrandScoreService {
    constructor() {
        this.weights = {
            brandHealth: {
                identity: 30,
                strategy: 25,
                knowledge: 25,
                update: 10,
                quality: 10
            },
            knowledge: {
                count: 30,
                quality: 25,
                diversity: 20,
                recency: 15,
                aiUsage: 10
            }
        };
    }

    /**
     * Calculate all scores for a project
     * @param {Object} project - Project data from Firestore
     * @param {Object} brandBrain - Brand Brain data (persona, tone, etc.)
     * @param {Array} knowledgeSources - Array of knowledge source objects
     * @returns {Object} Calculated scores and breakdown
     */
    calculateAllScores(project, brandBrain, knowledgeSources = []) {
        const brandHealth = this.calculateBrandHealthScore(project, brandBrain, knowledgeSources);
        const knowledge = this.calculateKnowledgeScore(knowledgeSources);

        return {
            brandHealth,
            knowledge,
            totalScore: Math.round((brandHealth.total + knowledge.total) / 2),
            tier: this.determineTier(brandHealth.total)
        };
    }

    /**
     * Calculate Brand Health Score (0-100)
     */
    calculateBrandHealthScore(project, brandBrain, sources) {
        let scores = {
            identity: 0,
            strategy: 0,
            knowledge: 0,
            update: 0,
            quality: 0,
            total: 0
        };

        // 1. Core Identity (Max 30)
        if (project.name) scores.identity += 10;
        if (project.industry) scores.identity += 5;
        if (project.description && project.description.length >= 100) scores.identity += 10;
        else if (project.description) scores.identity += 5;
        if (project.targetAudience) scores.identity += 5;

        // 2. Strategy (Max 25)
        if (brandBrain.persona) scores.strategy += 8;
        if (brandBrain.tone !== undefined) scores.strategy += 5;

        const doCount = Array.isArray(brandBrain.doList) ? brandBrain.doList.length : 0;
        const dontCount = Array.isArray(brandBrain.dontList) ? brandBrain.dontList.length : 0;
        if (doCount >= 3 && dontCount >= 3) scores.strategy += 7;
        else if (doCount > 0 || dontCount > 0) scores.strategy += 3;

        const keywordCount = Array.isArray(brandBrain.keywords) ? brandBrain.keywords.length : 0;
        if (keywordCount >= 5) scores.strategy += 5;
        else if (keywordCount > 0) scores.strategy += 2;

        // 3. Knowledge Base (Max 25)
        const sourceCount = sources.length;
        if (sourceCount >= 1) scores.knowledge += 5;
        if (sourceCount >= 3) scores.knowledge += 10;
        if (sourceCount >= 5) scores.knowledge += 5;

        // AI Summary check (mock implementation for now, assuming if source exists it might have summary)
        const hasAiSummary = sources.some(s => s.summary && s.summary.length > 0);
        if (hasAiSummary) scores.knowledge += 5;

        // 4. Update Frequency (Max 10)
        // Using updatedAt or createdAt
        const lastUpdate = project.updatedAt ? new Date(project.updatedAt.toDate()) : new Date();
        const daysSinceUpdate = (new Date() - lastUpdate) / (1000 * 60 * 60 * 24);

        if (daysSinceUpdate < 7) scores.update += 10;
        else if (daysSinceUpdate < 30) scores.update += 5;

        // 5. Quality Metrics (Max 10) - Needs generatedContents count, mocking for now or 0
        // TODO: Pass content stats
        scores.quality += 5; // Default base score for now

        // Total
        scores.total = Object.values(scores).reduce((a, b) => a + b, 0);

        // Clamp to 100 (though logic shouldn't exceed)
        scores.total = Math.min(100, scores.total);

        return scores;
    }

    /**
     * Calculate Knowledge Score (0-100)
     */
    calculateKnowledgeScore(sources) {
        let scores = {
            count: 0,
            quality: 0,
            diversity: 0,
            recency: 0,
            aiUsage: 0,
            total: 0
        };

        const count = sources.length;

        // 1. Doc Count (Max 30)
        if (count >= 5) scores.count = 30;
        else if (count >= 3) scores.count = 20;
        else if (count >= 1) scores.count = 10;

        // 2. Quality (Length based) (Max 25)
        if (count > 0) {
            let avgLength = sources.reduce((sum, s) => sum + (s.content ? s.content.length : 0), 0) / count;
            if (avgLength > 3000) scores.quality = 25;
            else if (avgLength > 1000) scores.quality = 15;
            else scores.quality = 5;
        }

        // 3. Diversity (Types) (Max 20)
        const types = new Set(sources.map(s => s.type));
        if (types.size >= 3) scores.diversity = 20;
        else if (types.size >= 2) scores.diversity = 12;
        else if (types.size >= 1) scores.diversity = 5;

        // 4. Recency (Max 15)
        if (count > 0) {
            // Find most recent source
            // Assuming sources have createdAt. If not, use current date for mock
            const recentDate = sources.reduce((latest, s) => {
                const date = s.createdAt ? new Date(s.createdAt.toDate()) : new Date(0);
                return date > latest ? date : latest;
            }, new Date(0));

            const daysSince = (new Date() - recentDate) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) scores.recency = 15;
            else if (daysSince < 30) scores.recency = 8;
            else scores.recency = 3;
        }

        // 5. AI Usage (Max 10)
        if (count > 0) {
            const aiSummaryCount = sources.filter(s => s.summary).length;
            const ratio = aiSummaryCount / count;
            if (ratio >= 0.8) scores.aiUsage = 10;
            else if (ratio >= 0.5) scores.aiUsage = 5;
        }

        scores.total = Object.values(scores).reduce((a, b) => a + b, 0);
        scores.total = Math.min(100, scores.total);

        return scores;
    }

    determineTier(score) {
        if (score >= 81) return 'MASTER';
        if (score >= 51) return 'PRO';
        if (score >= 31) return 'STANDARD';
        return 'BASIC';
    }
}

// Export as global for now (no module system in vanilla JS frontend yet)
window.BrandScoreService = BrandScoreService;
