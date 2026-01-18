/**
 * NewsAPI Provider (Global)
 * https://newsapi.org/
 * 
 * Covers 65+ countries with English-language news
 * Best for: Global/International market targeting
 * 
 * Note: API key should be stored in Firestore and fetched securely,
 * or restricted by domain in NewsAPI dashboard
 */

class NewsAPIProvider {
    constructor() {
        this.baseUrl = 'https://newsapi.org/v2';
        this.apiKey = null;
        this.name = 'NewsAPI';
        this.region = 'GLOBAL';
    }

    /**
     * Set API key (fetched from Firestore or config)
     */
    setApiKey(key) {
        this.apiKey = key;
    }

    /**
     * Get API key from Firestore systemSettings/apiKeys
     */
    async getApiKey() {
        if (this.apiKey) return this.apiKey;

        try {
            const db = firebase.firestore();

            // Read from systemSettings/apiKeys (correct location for external service keys)
            const settingsDoc = await db.collection('systemSettings').doc('apiKeys').get();
            if (settingsDoc.exists && settingsDoc.data().newsapi) {
                this.apiKey = settingsDoc.data().newsapi;
                console.log('[NewsAPI] API key loaded from systemSettings/apiKeys');
                return this.apiKey;
            }

            console.warn('[NewsAPI] API Key not found in systemSettings/apiKeys');
            return null;
        } catch (error) {
            console.error('[NewsAPI] Error fetching API key:', error.message);
            return null;
        }
    }

    /**
     * Fetch news articles
     * @param {string} query - Search query
     * @param {object} options - Additional options
     */
    async fetch(query, options = {}) {
        const apiKey = await this.getApiKey();

        if (!apiKey) {
            console.warn('[NewsAPI] No API key available, returning mock data');
            return this.getMockData(query);
        }

        const {
            language = 'en',
            sortBy = 'publishedAt',
            pageSize = 10,
            from = null // Date string YYYY-MM-DD
        } = options;

        // Build URL
        const params = new URLSearchParams({
            q: query,
            language,
            sortBy,
            pageSize: pageSize.toString(),
            apiKey
        });

        if (from) {
            params.append('from', from);
        }

        try {
            const response = await fetch(`${this.baseUrl}/everything?${params}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            // Transform to standard format
            return this.transformArticles(data.articles || []);

        } catch (error) {
            console.error('[NewsAPI] Fetch error:', error);

            // Return mock data on error (graceful degradation)
            if (options.fallbackToMock !== false) {
                console.log('[NewsAPI] Falling back to mock data');
                return this.getMockData(query);
            }

            throw error;
        }
    }

    /**
     * Transform NewsAPI response to standard format
     */
    transformArticles(articles) {
        return articles.map((article, index) => ({
            id: `newsapi-${Date.now()}-${index}`,
            title: article.title,
            description: article.description,
            content: article.content,
            url: article.url,
            imageUrl: article.urlToImage,
            publishedAt: article.publishedAt,
            source: {
                name: article.source?.name || 'NewsAPI',
                region: 'GLOBAL',
                provider: 'newsapi'
            },
            // Metadata for AI analysis
            headline: article.title,
            snippet: article.description || article.content?.substring(0, 200)
        }));
    }

    /**
     * Get mock data for development/fallback
     */
    getMockData(query) {
        const now = new Date().toISOString();
        return [
            {
                id: `mock-newsapi-1`,
                title: `Latest developments in ${query} - Global Analysis`,
                description: `Comprehensive coverage of ${query} trends from global markets. This is simulated data for demonstration.`,
                content: `Full article content about ${query} would appear here...`,
                url: '#',
                imageUrl: null,
                publishedAt: now,
                source: { name: 'ZYNK Mock News', region: 'GLOBAL', provider: 'newsapi' },
                headline: `Latest developments in ${query} - Global Analysis`,
                snippet: `Comprehensive coverage of ${query} trends from global markets.`,
                isMock: true
            },
            {
                id: `mock-newsapi-2`,
                title: `${query} Market Update: Key Insights`,
                description: `Market analysts weigh in on the latest ${query} movements and predictions.`,
                content: `Detailed analysis of ${query} market trends...`,
                url: '#',
                imageUrl: null,
                publishedAt: now,
                source: { name: 'ZYNK Mock News', region: 'GLOBAL', provider: 'newsapi' },
                headline: `${query} Market Update: Key Insights`,
                snippet: `Market analysts weigh in on the latest ${query} movements.`,
                isMock: true
            }
        ];
    }

    /**
     * Get top headlines by country
     */
    async getTopHeadlines(country = 'us', category = null) {
        const apiKey = await this.getApiKey();

        if (!apiKey) {
            return this.getMockData('top headlines');
        }

        const params = new URLSearchParams({
            country,
            apiKey
        });

        if (category) {
            params.append('category', category);
        }

        try {
            const response = await fetch(`${this.baseUrl}/top-headlines?${params}`);
            const data = await response.json();
            return this.transformArticles(data.articles || []);
        } catch (error) {
            console.error('[NewsAPI] Top headlines error:', error);
            return this.getMockData('headlines');
        }
    }
}

// Register with global registry
if (window.NewsProviderRegistry) {
    window.NewsProviderRegistry.register('GLOBAL', new NewsAPIProvider());
    console.log('[NewsAPI] Provider registered as GLOBAL');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NewsAPIProvider };
}
