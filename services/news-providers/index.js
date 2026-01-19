/**
 * News Provider Registry
 * Extensible architecture for multi-region news sources
 * 
 * Supported Regions:
 * - GLOBAL: Google News (Free RSS - 65+ countries)
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
     * Map target markets to region codes with language/country config
     * Supports all major Google News regions
     */
    static mapMarketsToRegions(targetMarkets) {
        const mapping = {
            // Asia Pacific
            'korea': 'KR', 'korean': 'KR', 'kr': 'KR', '한국': 'KR', 'south korea': 'KR',
            'japan': 'JP', 'japanese': 'JP', 'jp': 'JP', '일본': 'JP',
            'china': 'CN', 'chinese': 'CN', 'cn': 'CN', '중국': 'CN', '中国': 'CN',
            'taiwan': 'TW', 'tw': 'TW', '대만': 'TW', '台灣': 'TW',
            'hong kong': 'HK', 'hongkong': 'HK', 'hk': 'HK', '홍콩': 'HK', '香港': 'HK',
            'singapore': 'SG', 'sg': 'SG', '싱가포르': 'SG',
            'malaysia': 'MY', 'my': 'MY', '말레이시아': 'MY',
            'thailand': 'TH', 'thai': 'TH', 'th': 'TH', '태국': 'TH', 'ประเทศไทย': 'TH',
            'vietnam': 'VN', 'vietnamese': 'VN', 'vn': 'VN', '베트남': 'VN', 'việt nam': 'VN',
            'indonesia': 'ID', 'indonesian': 'ID', 'id': 'ID', '인도네시아': 'ID',
            'philippines': 'PH', 'ph': 'PH', '필리핀': 'PH',
            'india': 'IN', 'indian': 'IN', 'in': 'IN', '인도': 'IN', 'भारत': 'IN',
            'australia': 'AU', 'australian': 'AU', 'au': 'AU', '호주': 'AU',
            'new zealand': 'NZ', 'newzealand': 'NZ', 'nz': 'NZ', '뉴질랜드': 'NZ',

            // Europe
            'uk': 'GB', 'united kingdom': 'GB', 'gb': 'GB', 'britain': 'GB', 'england': 'GB', '영국': 'GB',
            'germany': 'DE', 'german': 'DE', 'de': 'DE', '독일': 'DE', 'deutschland': 'DE',
            'france': 'FR', 'french': 'FR', 'fr': 'FR', '프랑스': 'FR',
            'spain': 'ES', 'spanish': 'ES', 'es': 'ES', '스페인': 'ES', 'españa': 'ES',
            'italy': 'IT', 'italian': 'IT', 'it': 'IT', '이탈리아': 'IT', 'italia': 'IT',
            'netherlands': 'NL', 'dutch': 'NL', 'nl': 'NL', '네덜란드': 'NL', 'holland': 'NL',
            'belgium': 'BE', 'be': 'BE', '벨기에': 'BE',
            'switzerland': 'CH', 'swiss': 'CH', 'ch': 'CH', '스위스': 'CH',
            'austria': 'AT', 'at': 'AT', '오스트리아': 'AT',
            'sweden': 'SE', 'swedish': 'SE', 'se': 'SE', '스웨덴': 'SE',
            'norway': 'NO', 'norwegian': 'NO', 'no': 'NO', '노르웨이': 'NO',
            'denmark': 'DK', 'danish': 'DK', 'dk': 'DK', '덴마크': 'DK',
            'finland': 'FI', 'finnish': 'FI', 'fi': 'FI', '핀란드': 'FI',
            'poland': 'PL', 'polish': 'PL', 'pl': 'PL', '폴란드': 'PL',
            'russia': 'RU', 'russian': 'RU', 'ru': 'RU', '러시아': 'RU', 'россия': 'RU',
            'ukraine': 'UA', 'ukrainian': 'UA', 'ua': 'UA', '우크라이나': 'UA',
            'portugal': 'PT', 'portuguese': 'PT', 'pt': 'PT', '포르투갈': 'PT',
            'greece': 'GR', 'greek': 'GR', 'gr': 'GR', '그리스': 'GR',
            'turkey': 'TR', 'turkish': 'TR', 'tr': 'TR', '터키': 'TR', 'türkiye': 'TR',
            'ireland': 'IE', 'irish': 'IE', 'ie': 'IE', '아일랜드': 'IE',

            // Americas
            'usa': 'US', 'us': 'US', 'united states': 'US', 'america': 'US', '미국': 'US',
            'canada': 'CA', 'canadian': 'CA', 'ca': 'CA', '캐나다': 'CA',
            'mexico': 'MX', 'mexican': 'MX', 'mx': 'MX', '멕시코': 'MX', 'méxico': 'MX',
            'brazil': 'BR', 'brazilian': 'BR', 'br': 'BR', '브라질': 'BR', 'brasil': 'BR',
            'argentina': 'AR', 'ar': 'AR', '아르헨티나': 'AR',
            'chile': 'CL', 'cl': 'CL', '칠레': 'CL',
            'colombia': 'CO', 'co': 'CO', '콜롬비아': 'CO',
            'peru': 'PE', 'pe': 'PE', '페루': 'PE',

            // Middle East & Africa
            'israel': 'IL', 'israeli': 'IL', 'il': 'IL', '이스라엘': 'IL',
            'uae': 'AE', 'united arab emirates': 'AE', 'ae': 'AE', 'dubai': 'AE', '아랍에미리트': 'AE',
            'saudi arabia': 'SA', 'saudi': 'SA', 'sa': 'SA', '사우디아라비아': 'SA',
            'egypt': 'EG', 'egyptian': 'EG', 'eg': 'EG', '이집트': 'EG',
            'south africa': 'ZA', 'za': 'ZA', '남아프리카': 'ZA',
            'nigeria': 'NG', 'ng': 'NG', '나이지리아': 'NG',
            'kenya': 'KE', 'ke': 'KE', '케냐': 'KE',

            // Global/Default
            'global': 'GLOBAL', 'international': 'GLOBAL', 'worldwide': 'GLOBAL', 'world': 'GLOBAL'
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

    /**
     * Get language and country config for a region
     * Complete mapping for all supported countries
     */
    static getRegionConfig(region) {
        const configs = {
            // Asia Pacific
            'KR': { language: 'ko', country: 'KR', name: '한국' },
            'JP': { language: 'ja', country: 'JP', name: '日本' },
            'CN': { language: 'zh-CN', country: 'CN', name: '中国' },
            'TW': { language: 'zh-TW', country: 'TW', name: '台灣' },
            'HK': { language: 'zh-HK', country: 'HK', name: '香港' },
            'SG': { language: 'en', country: 'SG', name: 'Singapore' },
            'MY': { language: 'en', country: 'MY', name: 'Malaysia' },
            'TH': { language: 'th', country: 'TH', name: 'ประเทศไทย' },
            'VN': { language: 'vi', country: 'VN', name: 'Việt Nam' },
            'ID': { language: 'id', country: 'ID', name: 'Indonesia' },
            'PH': { language: 'en', country: 'PH', name: 'Philippines' },
            'IN': { language: 'en', country: 'IN', name: 'India' },
            'AU': { language: 'en', country: 'AU', name: 'Australia' },
            'NZ': { language: 'en', country: 'NZ', name: 'New Zealand' },

            // Europe
            'GB': { language: 'en', country: 'GB', name: 'United Kingdom' },
            'DE': { language: 'de', country: 'DE', name: 'Deutschland' },
            'FR': { language: 'fr', country: 'FR', name: 'France' },
            'ES': { language: 'es', country: 'ES', name: 'España' },
            'IT': { language: 'it', country: 'IT', name: 'Italia' },
            'NL': { language: 'nl', country: 'NL', name: 'Nederland' },
            'BE': { language: 'nl', country: 'BE', name: 'België' },
            'CH': { language: 'de', country: 'CH', name: 'Schweiz' },
            'AT': { language: 'de', country: 'AT', name: 'Österreich' },
            'SE': { language: 'sv', country: 'SE', name: 'Sverige' },
            'NO': { language: 'no', country: 'NO', name: 'Norge' },
            'DK': { language: 'da', country: 'DK', name: 'Danmark' },
            'FI': { language: 'fi', country: 'FI', name: 'Suomi' },
            'PL': { language: 'pl', country: 'PL', name: 'Polska' },
            'RU': { language: 'ru', country: 'RU', name: 'Россия' },
            'UA': { language: 'uk', country: 'UA', name: 'Україна' },
            'PT': { language: 'pt-PT', country: 'PT', name: 'Portugal' },
            'GR': { language: 'el', country: 'GR', name: 'Ελλάδα' },
            'TR': { language: 'tr', country: 'TR', name: 'Türkiye' },
            'IE': { language: 'en', country: 'IE', name: 'Ireland' },

            // Americas
            'US': { language: 'en', country: 'US', name: 'United States' },
            'CA': { language: 'en', country: 'CA', name: 'Canada' },
            'MX': { language: 'es', country: 'MX', name: 'México' },
            'BR': { language: 'pt-BR', country: 'BR', name: 'Brasil' },
            'AR': { language: 'es', country: 'AR', name: 'Argentina' },
            'CL': { language: 'es', country: 'CL', name: 'Chile' },
            'CO': { language: 'es', country: 'CO', name: 'Colombia' },
            'PE': { language: 'es', country: 'PE', name: 'Perú' },

            // Middle East & Africa
            'IL': { language: 'he', country: 'IL', name: 'ישראל' },
            'AE': { language: 'ar', country: 'AE', name: 'الإمارات' },
            'SA': { language: 'ar', country: 'SA', name: 'السعودية' },
            'EG': { language: 'ar', country: 'EG', name: 'مصر' },
            'ZA': { language: 'en', country: 'ZA', name: 'South Africa' },
            'NG': { language: 'en', country: 'NG', name: 'Nigeria' },
            'KE': { language: 'en', country: 'KE', name: 'Kenya' },

            // Default
            'GLOBAL': { language: 'en', country: 'US', name: 'Global' }
        };
        return configs[region] || configs['GLOBAL'];
    }

    /**
     * Fetch news with auto-detection from project target markets
     * @param {string} query - Search query
     * @param {object} projectData - Project data with targetAudience or targetMarket
     * @param {object} options - Additional options
     */
    async fetchNewsForProject(query, projectData, options = {}) {
        // --- STEP 0: Contextual Anchoring (Industry Awareness) ---
        const industry = projectData?.industry || projectData?.coreIdentity?.industry || '';
        const isBlockchain = industry.toLowerCase().includes('blockchain') ||
            industry.toLowerCase().includes('web3') ||
            industry.toLowerCase().includes('crypto');

        let enhancedQuery = query;
        let negativeKeywords = [];
        let industryAnchors = [];

        if (isBlockchain) {
            // RELAXED: Using OR instead of AND to increase recall, while still prioritizing industry context
            enhancedQuery = `"${query}" (Blockchain OR Web3 OR Crypto OR Web3.0)`;
            negativeKeywords = ['surgery', 'clinical trial', 'patient care']; // Only extremely specific medical terms
            industryAnchors = ['blockchain', 'web3', 'crypto', 'token', 'ledger', 'decentralized', 'on-chain', 'mainnet', 'testnet', 'finance', 'tech', 'digital', 'network'];
        }

        console.log(`[NewsRegistry] Context Anchoring Applied: "${enhancedQuery}" (Industry: ${industry || 'General'})`);

        // Extract target markets from project data
        let targetMarkets = [];

        if (projectData?.targetMarkets) {
            targetMarkets = Array.isArray(projectData.targetMarkets)
                ? projectData.targetMarkets
                : [projectData.targetMarkets];
        } else if (projectData?.targetAudience) {
            // Try to extract region hints from target audience text
            const audience = projectData.targetAudience.toLowerCase();
            if (audience.includes('korea') || audience.includes('한국')) targetMarkets.push('KR');
            if (audience.includes('japan') || audience.includes('일본')) targetMarkets.push('JP');
            if (audience.includes('singapore') || audience.includes('싱가포르')) targetMarkets.push('SG');
            if (audience.includes('malaysia') || audience.includes('말레이시아')) targetMarkets.push('MY');
            if (audience.includes('thailand') || audience.includes('태국')) targetMarkets.push('TH');
            if (audience.includes('vietnam') || audience.includes('베트남')) targetMarkets.push('VN');
            if (audience.includes('indonesia') || audience.includes('인도네시아')) targetMarkets.push('ID');
            if (audience.includes('china') || audience.includes('중국')) targetMarkets.push('CN');
            if (audience.includes('taiwan') || audience.includes('대만')) targetMarkets.push('TW');
            if (audience.includes('india') || audience.includes('인도')) targetMarkets.push('IN');
            if (audience.includes('australia') || audience.includes('호주')) targetMarkets.push('AU');
            if (audience.includes('uk') || audience.includes('영국') || audience.includes('united kingdom')) targetMarkets.push('GB');
            if (audience.includes('germany') || audience.includes('독일')) targetMarkets.push('DE');
            if (audience.includes('france') || audience.includes('프랑스')) targetMarkets.push('FR');
            if (audience.includes('brazil') || audience.includes('브라질')) targetMarkets.push('BR');
        }

        // Default to GLOBAL if no specific markets
        if (targetMarkets.length === 0) {
            targetMarkets = ['GLOBAL'];
        }

        const regions = NewsProviderRegistry.mapMarketsToRegions(targetMarkets);
        console.log(`[NewsRegistry] Auto-detected regions: ${regions.join(', ')} from target markets`);

        // Fetch news for each region
        const allArticles = [];
        const provider = this.getProvider('GLOBAL'); // Use GoogleNews provider

        for (const region of regions) {
            const config = NewsProviderRegistry.getRegionConfig(region);
            try {
                const articles = await provider.fetch(enhancedQuery, {
                    ...options,
                    language: config.language,
                    country: config.country
                });

                if (articles && articles.length > 0) {
                    allArticles.push(...articles);
                    console.log(`[NewsRegistry] Fetched ${articles.length} articles for ${config.name} (${region})`);
                }
            } catch (error) {
                console.warn(`[NewsRegistry] Failed to fetch for ${region}:`, error.message);
            }
        }

        // Fallback to GLOBAL if no articles found in specified regions
        if (allArticles.length === 0 && !regions.includes('GLOBAL')) {
            console.log(`[NewsRegistry] No articles found in ${regions.join(', ')}. Falling back to GLOBAL...`);
            const globalConfig = NewsProviderRegistry.getRegionConfig('GLOBAL');
            try {
                const globalArticles = await provider.fetch(enhancedQuery, {
                    ...options,
                    language: globalConfig.language,
                    country: globalConfig.country
                });
                allArticles.push(...globalArticles);
            } catch (error) {
                console.warn('[NewsRegistry] Global fallback failed:', error.message);
            }
        }

        // --- STEP 3: Post-Filtering & Relevancy Scoring ---
        const filteredArticles = allArticles.filter(art => {
            const titleMatch = (art.title || art.headline || '').toLowerCase();
            const snippetMatch = (art.snippet || art.description || '').toLowerCase();
            const content = `${titleMatch} ${snippetMatch}`;

            // 1. Hard Exclusion (Negative Keywords)
            if (negativeKeywords.some(neg => content.includes(neg))) {
                console.log(`[NewsRegistry] Dropped irrelevant article (Negative Kw hit): ${art.title.substring(0, 30)}...`);
                return false;
            }

            // 2. Weak Context Check (Softened)
            if (industryAnchors.length > 0) {
                const hasIndustryContext = industryAnchors.some(anchor => content.includes(anchor));
                const hasQueryInTitle = titleMatch.includes(query.toLowerCase());

                // Allow if either industry context is present OR the query is explicitly in the title
                if (!hasIndustryContext && !hasQueryInTitle) {
                    return false;
                }
            }

            return true;
        });

        console.log(`[NewsRegistry] Filtering complete: ${allArticles.length} -> ${filteredArticles.length} articles`);

        return {
            success: filteredArticles.length > 0,
            articles: filteredArticles,
            regions: regions,
            totalCount: filteredArticles.length
        };
    }
}

// Global singleton instance
window.NewsProviderRegistry = new NewsProviderRegistry();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NewsProviderRegistry };
}
