/**
 * Mock AI Engine for The Filter.
 * Performs heuristic-based analysis on content.
 */
export const AIFilterEngine = {

    /**
     * Analyze content and return score breakdown and suggestions.
     * @param {string} text - The content caption/body
     * @param {Array} hashtags - List of hashtags
     * @param {string} platform - Target platform
     */
    analyze(text, hashtags = [], platform = 'instagram') {
        const result = {
            breakdown: [],
            suggestions: [],
            totalScore: 0
        };

        const checks = {
            brandVoice: this.checkBrandVoice(text),
            grammar: this.checkGrammar(text),
            seo: this.checkSEO(text, hashtags),
            compliance: this.checkCompliance(text)
        };

        // 1. Compile Breakdown
        result.breakdown = [
            { id: 'brandVoice', label: 'Brand Voice', ...checks.brandVoice },
            { id: 'grammar', label: 'Grammar & Spelling', ...checks.grammar },
            { id: 'seo', label: 'SEO Optimization', ...checks.seo },
            { id: 'compliance', label: 'Compliance', ...checks.compliance }
        ];

        // 2. Calculate Total Score (Average for now)
        const total = result.breakdown.reduce((sum, item) => sum + item.score, 0);
        result.totalScore = Math.round(total / 4);

        // 3. Compile Suggestions (Flatten suggestions from checks)
        result.suggestions = [
            ...checks.brandVoice.suggestions,
            ...checks.grammar.suggestions,
            ...checks.seo.suggestions,
            ...checks.compliance.suggestions
        ];

        return result;
    },

    // --- Heuristic Checks ---

    checkBrandVoice(text) {
        // Mock Rule: Must sound friendly (check for emojis or soft endings)
        const hasEmoji = /\p{Emoji}/u.test(text);
        const score = hasEmoji ? 100 : 80;
        const suggestions = [];

        if (!hasEmoji) {
            suggestions.push({
                id: 'sug_voice_1',
                type: 'Engagement',
                priority: 'low',
                title: 'Tone Adjustment',
                description: 'The tone feels a bit dry. Consider adding an emoji to make it friendlier.',
                currentValue: 'No emoji',
                suggestedValue: 'Add 🌿 or ✨',
                isApplied: false
            });
        }

        return {
            score,
            status: score >= 90 ? 'pass' : 'warning',
            detail: score >= 90 ? 'Brand Brain 전략과 일치' : '친근한 톤 보완 필요',
            suggestions
        };
    },

    checkGrammar(text) {
        // Mock Rule: Check for double spaces or very long sentences
        const hasDoubleSpace = text.includes('  ');
        const score = hasDoubleSpace ? 90 : 100;
        const suggestions = [];

        if (hasDoubleSpace) {
            suggestions.push({
                id: 'sug_grammar_1',
                type: 'Grammar',
                priority: 'low',
                title: 'Fix Spacing',
                description: 'Found double spaces. Clean text format is important.',
                currentValue: '  ',
                suggestedValue: ' ',
                isApplied: false
            });
        }

        return {
            score,
            status: 'pass',
            detail: '맞춤법/문법 오류 없음',
            suggestions
        };
    },

    checkSEO(text, hashtags) {
        // Mock Rule: Need at least 3 hashtags
        const count = hashtags.length;
        let score = 100;
        const suggestions = [];

        if (count < 3) {
            score = 70;
            suggestions.push({
                id: 'sug_seo_1',
                type: 'SEO',
                priority: 'medium',
                title: '해시태그 추가 제안',
                description: '해시태그가 부족합니다. 트렌딩 키워드를 추가하여 도달률을 높이세요.',
                currentValue: `${count} tags`,
                suggestedValue: 'Add #수분폭탄',
                isApplied: false
            });
        }

        return {
            score,
            status: score >= 90 ? 'pass' : 'warning',
            detail: score >= 90 ? '키워드 최적화됨' : '해시태그 보완 필요',
            suggestions
        };
    },

    checkCompliance(text) {
        // Mock Rule: Forbidden words
        const forbidden = ['최고', '1위', '무조건']; // exaggerated claims
        const found = forbidden.filter(w => text.includes(w));

        if (found.length > 0) {
            return {
                score: 50,
                status: 'warning',
                detail: `금지어 감지: ${found.join(', ')}`,
                suggestions: [{
                    id: 'sug_comp_1',
                    type: 'Compliance',
                    priority: 'high',
                    title: 'Remove Exaggerated Claims',
                    description: 'Avoid absolute terms like "1위" or "무조건" to comply with ad laws.',
                    currentValue: found[0],
                    suggestedValue: 'Remove or rephrase',
                    isApplied: false
                }]
            };
        }

        return {
            score: 100,
            status: 'pass',
            detail: '금지어/법적 이슈 없음',
            suggestions: []
        };
    }
};
