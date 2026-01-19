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
            'https://thingproxy.freeboard.io/fetch/'
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

        // Standard Google News time filters in RSS: qdr:y (year), qdr:m (month), qdr:w (week), qdr:d (day)
        let qdr = 'qdr:y';
        if (when === '7d' || when === '1w') qdr = 'qdr:w';
        else if (when === '1d' || when === '24h') qdr = 'qdr:d';
        else if (when === '1m') qdr = 'qdr:m';

        // Encoding query separately from tbs
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
            maxResults = 50,
            when = '1y'
        } = options;

        const rssUrl = this.buildRssUrl(query, language, country, when);
        console.log(`[GoogleNews] Fetching: ${rssUrl}`);

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

                // Basic XML validation
                if (!xmlText || xmlText.trim().length < 100) {
                    console.warn(`[GoogleNews] Proxy ${proxyIndex} returned empty or invalid response`);
                    continue;
                }

                const articles = this.parseRss(xmlText, maxResults);

                if (articles.length > 0) {
                    this.currentProxyIndex = proxyIndex; // Remember working proxy
                    console.log(`[GoogleNews] ✅ Fetched ${articles.length} articles via proxy ${proxyIndex}`);
                    return articles;
                }
            } catch (error) {
                console.warn(`[GoogleNews] Proxy ${proxyIndex} error:`, error.message);
            }
        }

        // All proxies failed, return mock data
        console.warn('[GoogleNews] All proxies failed, returning fallback metadata.');
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
        } catch (error) {
            console.error('[GoogleNews] Parse error:', error);
            return [];
        }
    }

    /**
     * Get mock data for fallback
     */
    getMockData(query) {
        const now = new Date();
        const timestamp = now.getTime();
        const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(query)}`;
        return [
            {
                id: `mock-gnews-1-${query}-${timestamp}`,
                title: `Strategic Pulse: ${query} Market Resonance`,
                description: `Signals detected for ${query} across global digital channels. Synthesizing insights...`,
                content: `AI detected emerging resonance for ${query}...`,
                url: `${searchUrl}&ts=1-${timestamp}`,
                imageUrl: null,
                publishedAt: now.toISOString(),
                source: { name: 'ZYNK Network', region: 'GLOBAL', provider: 'google-news' },
                headline: `Strategic Pulse: ${query} Market Resonance`,
                snippet: `Latent market signals detected for "${query}".`,
                isMock: true
            },
            {
                id: `mock-gnews-2-${query}-${timestamp}`,
                title: `${query} Adoption Analysis`,
                description: `Analyzing adoption patterns and market sentiment for ${query}.`,
                content: `Detailed adoption analysis for ${query}...`,
                url: `${searchUrl}&ts=2-${timestamp}`,
                imageUrl: null,
                publishedAt: now.toISOString(),
                source: { name: 'Market Intelligence', region: 'GLOBAL', provider: 'google-news' },
                headline: `${query} Adoption Analysis`,
                snippet: `Predictive models show increasing interest in ${query}.`,
                isMock: true
            },
            {
                id: `mock-gnews-3-${query}-${timestamp}`,
                title: `Future Outlook: ${query} Ecosystem`,
                description: `Projected growth and risk factors for the ${query} sector in 2026.`,
                content: `Ecosystem deep-dive...`,
                url: `${searchUrl}&ts=3-${timestamp}`,
                imageUrl: null,
                publishedAt: now.toISOString(),
                source: { name: 'Strategic Forecast', region: 'GLOBAL', provider: 'google-news' },
                headline: `Future Outlook: ${query} Ecosystem`,
                snippet: `Long-term strategic importance of ${query} remains high.`,
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
