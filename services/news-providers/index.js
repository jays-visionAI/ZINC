/**
 * News Provider Registry
 * Extensible architecture for multi-region news sources
 * 
 * Supported Regions:
 * - GLOBAL: NewsAPI (65+ countries)
 * - KR: Naver News (Korea)
 * - JP: Yahoo Japan News (Japan)
 * - SG: Channel NewsAsia (Singapore)
 * - TH: Bangkok Post (Thailand)
 */

class NewsProviderRegistry {
    constructor() {
        this.providers = {};
        this.cache = new Map();
        this.cacheExpiry = 6 * 60 * 60 * 1000; // 6 hours
    }

    /**
     * Register a news provider
     * @param {string} region - Region code (GLOBAL, KR, JP, SG, TH)
     * @param {object} provider - Provider instance with fetch() method
     */
    register(region, provider) {
        this.providers[region] = provider;
        console.log(`[NewsRegistry] Registered provider: ${region}`);
    }

    /**
     * Get all registered providers
     */
    getProviders() {
        return this.providers;
    }

    /**
     * Get provider by region
     */
    getProvider(region) {
        return this.providers[region] || this.providers['GLOBAL'];
    }

    /**
     * Fetch news from specified regions
     * @param {string} query - Search query
     * @param {string[]} regions - Array of region codes
     * @param {object} options - Additional options
     */
    async fetchNews(query, regions = ['GLOBAL'], options = {}) {
        const results = [];
        const errors = [];

        for (const region of regions) {
            const provider = this.providers[region];
            if (!provider) {
                console.warn(`[NewsRegistry] Provider not found for region: ${region}`);
                continue;
            }

            // Check cache first
            const cacheKey = `${region}:${query}:${JSON.stringify(options)}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log(`[NewsRegistry] Cache hit for ${region}:${query}`);
                results.push(...cached);
                continue;
            }

            try {
                const news = await provider.fetch(query, options);
                this.setCache(cacheKey, news);
                results.push(...news);
            } catch (error) {
                console.error(`[NewsRegistry] Error fetching from ${region}:`, error.message);
                errors.push({ region, error: error.message });
            }
        }

        return {
            success: results.length > 0 || errors.length === 0,
            articles: results,
            errors: errors,
            totalCount: results.length
        };
    }

    /**
     * Get cached data if not expired
     */
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > this.cacheExpiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Set cache entry
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[NewsRegistry] Cache cleared');
    }

    /**
     * Map target markets to region codes
     */
    static mapMarketsToRegions(targetMarkets) {
        const mapping = {
            'korea': 'KR',
            'korean': 'KR',
            'kr': 'KR',
            '한국': 'KR',
            'japan': 'JP',
            'japanese': 'JP',
            'jp': 'JP',
            '일본': 'JP',
            'singapore': 'SG',
            'sg': 'SG',
            '싱가포르': 'SG',
            'thailand': 'TH',
            'thai': 'TH',
            'th': 'TH',
            '태국': 'TH',
            'global': 'GLOBAL',
            'international': 'GLOBAL',
            'worldwide': 'GLOBAL'
        };

        if (!targetMarkets || targetMarkets.length === 0) {
            return ['GLOBAL'];
        }

        const regions = new Set();
        targetMarkets.forEach(market => {
            const normalized = market.toLowerCase().trim();
            const region = mapping[normalized] || 'GLOBAL';
            regions.add(region);
        });

        return Array.from(regions);
    }
}

// Global singleton instance
window.NewsProviderRegistry = new NewsProviderRegistry();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NewsProviderRegistry };
}
