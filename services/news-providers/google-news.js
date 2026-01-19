/**
 * Google News RSS Provider (Global)
 * Free, no API key required
 * 
 * Uses Google News RSS feed with CORS proxy
 * Best for: Global/International news without API key restrictions
 */

class GoogleNewsProvider {
    constructor() {
        this.name = 'Google News';
        this.region = 'GLOBAL';
        // CORS proxy options (try in order if one fails)
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?'
        ];
        this.currentProxyIndex = 0;
    }

    /**
     * Build Google News RSS URL
     * @param {string} query - Search query
     * @param {string} language - Language code (en, ko, ja, etc.)
     * @param {string} country - Country code (US, KR, JP, etc.)
     */
    buildRssUrl(query, language = 'en', country = 'US') {
        const encodedQuery = encodeURIComponent(query);
        const hl = language.toLowerCase();
        const gl = country.toUpperCase();
        const ceid = `${gl}:${hl}`;

        return `https://news.google.com/rss/search?q=${encodedQuery}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    }

    /**
     * Fetch news articles
     * @param {string} query - Search query
     * @param {object} options - Additional options
     */
    async fetch(query, options = {}) {
        const {
            language = 'en',
            country = 'US',
            maxResults = 10
        } = options;

        const rssUrl = this.buildRssUrl(query, language, country);

        // Try each CORS proxy until one works
        for (let i = 0; i < this.corsProxies.length; i++) {
            const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
            const proxy = this.corsProxies[proxyIndex];

            try {
                const response = await fetch(proxy + encodeURIComponent(rssUrl));

                if (!response.ok) {
                    console.warn(`[GoogleNews] Proxy ${proxyIndex} failed with status ${response.status}`);
                    continue;
                }

                const xmlText = await response.text();
                const articles = this.parseRss(xmlText, maxResults);

                if (articles.length > 0) {
                    this.currentProxyIndex = proxyIndex; // Remember working proxy
                    console.log(`[GoogleNews] Fetched ${articles.length} articles via proxy ${proxyIndex}`);
                    return articles;
                }
            } catch (error) {
                console.warn(`[GoogleNews] Proxy ${proxyIndex} error:`, error.message);
            }
        }

        // All proxies failed, return mock data
        console.warn('[GoogleNews] All proxies failed, returning mock data');
        return this.getMockData(query);
    }

    /**
     * Parse RSS XML to articles
     */
    parseRss(xmlText, maxResults) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            // Check for parse errors
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                console.error('[GoogleNews] XML parse error');
                return [];
            }

            const items = xmlDoc.querySelectorAll('item');
            const articles = [];

            for (let i = 0; i < Math.min(items.length, maxResults); i++) {
                const item = items[i];

                const title = item.querySelector('title')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';
                const source = item.querySelector('source')?.textContent || 'Google News';

                // Clean HTML from description
                const cleanDescription = description.replace(/<[^>]*>/g, '').trim();

                articles.push({
                    id: `gnews-${Date.now()}-${i}`,
                    title: title,
                    description: cleanDescription,
                    content: cleanDescription,
                    url: link,
                    imageUrl: null, // Google News RSS doesn't include images
                    publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                    source: {
                        name: source,
                        region: 'GLOBAL',
                        provider: 'google-news'
                    },
                    headline: title,
                    snippet: cleanDescription.substring(0, 200)
                });
            }

            return articles;
        } catch (error) {
            console.error('[GoogleNews] Parse error:', error);
            return [];
        }
    }

    /**
     * Get mock data for fallback
     */
    getMockData(query) {
        const now = new Date().toISOString();
        const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(query)}`;
        return [
            {
                id: `mock-gnews-1`,
                title: `Latest ${query} News - Global Coverage`,
                description: `Comprehensive coverage of ${query} from global news sources. This is demonstration data.`,
                content: `Full article about ${query}...`,
                url: searchUrl,
                imageUrl: null,
                publishedAt: now,
                source: { name: 'ZYNK News (Demo)', region: 'GLOBAL', provider: 'google-news' },
                headline: `Latest ${query} News - Global Coverage`,
                snippet: `Comprehensive coverage of ${query} from global news sources.`,
                isMock: true
            },
            {
                id: `mock-gnews-2`,
                title: `${query} Market Analysis & Trends`,
                description: `In-depth analysis of ${query} market movements and future predictions.`,
                content: `Detailed analysis of ${query}...`,
                url: searchUrl,
                imageUrl: null,
                publishedAt: now,
                source: { name: 'ZYNK News (Demo)', region: 'GLOBAL', provider: 'google-news' },
                headline: `${query} Market Analysis & Trends`,
                snippet: `In-depth analysis of ${query} market movements.`,
                isMock: true
            }
        ];
    }

    /**
     * Get top headlines for a country
     */
    async getTopHeadlines(country = 'US', language = 'en') {
        // Use general news query for top headlines
        return this.fetch('', { country, language, maxResults: 10 });
    }
}

// Register with global registry (replace NewsAPI as default GLOBAL provider)
if (window.NewsProviderRegistry) {
    window.NewsProviderRegistry.register('GLOBAL', new GoogleNewsProvider());
    console.log('[GoogleNews] Provider registered as GLOBAL (replacing NewsAPI)');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GoogleNewsProvider };
}
