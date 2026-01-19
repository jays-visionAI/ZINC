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
            'https://corsproxy.io/?',
            'https://thingproxy.freeboard.io/fetch/',
            'https://www.google.com/search?q=' // Dummy fallback to see if we can at least reach google
        ];
        this.currentProxyIndex = 0;
    }

    /**
     * Build Google News RSS URL
     * @param {string} query - Search query
     * @param {string} language - Language code (en, ko, ja, etc.)
     * @param {string} country - Country code (US, KR, JP, etc.)
     * @param {string} when - Time filter (e.g., '1y', '7d', '1h')
     */
    buildRssUrl(query, language = 'en', country = 'US', when = '1y') {
        const hl = language.toLowerCase();
        const gl = country.toUpperCase();
        const ceid = `${gl}:${hl}`;

        // Standard Google News time filters: h (hour), d (day), w (week), m (month), y (year)
        const timeCode = when ? when.replace('1', '').replace('7', '') : 'y';
        const qdr = when ? `qdr:${when.replace('1', '').replace('7', 'w')}` : 'qdr:y';

        // Prefer the 'tbs' parameter for RSS time filtering as it's more reliable than '+when:' in the query
        return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}&tbs=${qdr}`;
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
            maxResults = 25,
            when = '1y'
        } = options;

        const rssUrl = this.buildRssUrl(query, language, country, when);
        console.log(`[GoogleNews] Fetching: ${rssUrl}`);

        // Try each CORS proxy until one works
        for (let i = 0; i < this.corsProxies.length; i++) {
            const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
            const proxy = this.corsProxies[proxyIndex];

            // Skip dummy proxy
            if (proxy.includes('google.com/search')) continue;

            try {
                const fetchUrl = proxy + encodeURIComponent(rssUrl);
                const response = await fetch(fetchUrl);

                if (!response.ok) {
                    console.warn(`[GoogleNews] Proxy ${proxyIndex} (${proxy}) failed with status ${response.status}`);
                    continue;
                }

                const xmlText = await response.text();

                // Safety check for empty or non-XML responses
                if (!xmlText || xmlText.length < 100) {
                    console.warn(`[GoogleNews] Proxy ${proxyIndex} returned empty or too short response`);
                    continue;
                }

                const articles = this.parseRss(xmlText, maxResults);

                if (articles.length > 0) {
                    this.currentProxyIndex = proxyIndex; // Remember working proxy
                    console.log(`[GoogleNews] ✅ Fetched ${articles.length} articles via proxy ${proxyIndex}`);
                    return articles;
                } else {
                    console.log(`[GoogleNews] Proxy ${proxyIndex} returned 0 articles (Parsed XML but no items)`);
                }
            } catch (error) {
                console.warn(`[GoogleNews] Proxy ${proxyIndex} error:`, error.message);
            }
        }

        // All proxies failed, return mock data
        console.warn('[GoogleNews] All proxies failed or returned 0 results. Providing fallback signals.');
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
                // Try treating as HTML if XML parsing fails (some proxies might return HTML-wrapped XML)
                const htmlDoc = parser.parseFromString(xmlText, 'text/html');
                const items = htmlDoc.querySelectorAll('item');
                if (items.length > 0) return this.extractItems(items, maxResults);

                console.error('[GoogleNews] XML parse error');
                return [];
            }

            const items = xmlDoc.querySelectorAll('item');
            return this.extractItems(items, maxResults);
        } catch (error) {
            console.error('[GoogleNews] Parse error:', error);
            return [];
        }
    }

    /**
     * Internal helper to extract content from item nodes
     */
    extractItems(items, maxResults) {
        const articles = [];
        const limit = Math.min(items.length, maxResults);

        for (let i = 0; i < limit; i++) {
            const item = items[i];

            // Use more robust selectors
            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || item.getAttribute('link') || '';
            const pubDate = item.querySelector('pubDate')?.textContent || item.querySelector('pubdate')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const source = item.querySelector('source')?.textContent || 'Google News';

            // Clean HTML from description
            const cleanDescription = description.replace(/<[^>]*>/g, '').trim();

            articles.push({
                id: `gnews-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                title: title,
                description: cleanDescription,
                content: cleanDescription,
                url: link,
                imageUrl: null,
                publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                source: {
                    name: source,
                    region: 'GLOBAL',
                    provider: 'google-news'
                },
                headline: title,
                snippet: cleanDescription.substring(0, 240)
            });
        }
        return articles;
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
