/**
 * utils-ui-loader.js
 * 
 * Logic to load and render dynamic UI components (Sidebar, Headers) based on configuration.
 * Supports Default Config (Code) + Firestore Overrides (DB).
 */

(function () {
    console.log('[UI Loader] Initializing...');

    // Content Languages (22)
    const CONTENT_LANGUAGES = [
        { code: 'ko', name: '한국어', flag: '🇰🇷' },
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'zh', name: '中文', flag: '🇨🇳' },
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'ar', name: 'العربية', flag: '🇸🇦' },
        { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'pt', name: 'Português', flag: '🇵🇹' },
        { code: 'ur', name: 'اردو', flag: '🇵🇰' },
        { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' },
        { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
        { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'it', name: 'Italiano', flag: '🇮🇹' },
        { code: 'th', name: 'ไทย', flag: '🇹🇭' },
        { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
        { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
        { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
        { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' }
    ];

    const UI = {
        config: null,

        /**
         * Initialize the UI Loader
         * Loads default config and merges with Firestore overrides (if available)
         */
        init: async function () {
            // 1. Load Hardcoded Defaults
            if (typeof window.DEFAULT_UI_CONFIG === 'undefined') {
                console.error('[UI Loader] DEFAULT_UI_CONFIG not found. Make sure utils-ui-config.js is loaded.');
                return;
            }
            this.config = JSON.parse(JSON.stringify(window.DEFAULT_UI_CONFIG)); // Deep copy

            // Render Default UI Immediately (Fixes Race Condition)
            this.refreshUI();

            // 2. Load Firestore Overrides (Phase 4 Implementation)
            if (typeof db !== 'undefined') {
                try {
                    console.log('[UI Loader] Fetching system settings...');
                    // 2. Fetch overrides from Firestore
                    // NOTE: Switched to 'chatbotConfig' to leverage existing public-read rules without requiring new deployment
                    const doc = await db.collection('chatbotConfig').doc('ui_layout').get();
                    if (doc.exists) {
                        const overrides = doc.data();
                        console.log('[UI Loader] Found database overrides:', overrides);

                        // Merge Custom Icons first so they are available for rendering
                        if (overrides.custom_icons) {
                            if (!window.ICON_PRESETS) window.ICON_PRESETS = {};
                            Object.assign(window.ICON_PRESETS, overrides.custom_icons);
                            console.log("[UI Loader] Loaded custom icons:", Object.keys(overrides.custom_icons));
                        }

                        // Merge Logic
                        if (overrides.sidebar_menus) {
                            // Map 'sidebar_menus' (DB) to 'sidebar' (Config)
                            this.config.sidebar = overrides.sidebar_menus;
                        }
                        if (overrides.page_headers) {
                            // Deep merge headers
                            // Map 'page_headers' (DB) to 'headers' (Config)
                            Object.keys(overrides.page_headers).forEach(key => {
                                if (this.config.headers[key]) {
                                    this.config.headers[key] = { ...this.config.headers[key], ...overrides.page_headers[key] };
                                } else {
                                    this.config.headers[key] = overrides.page_headers[key];
                                }
                            });
                        }
                        if (overrides.global_styles) {
                            this.config.styles = { ...this.config.styles, ...overrides.global_styles };
                        }

                        // Re-render UI components if they exist (to update with overrides)
                        this.refreshUI();
                    }
                } catch (e) {
                    console.error('[UI Loader] Failed to load overrides:', e);
                }
            } else {
                console.warn('[UI Loader] Firestore DB not initialized. Using defaults only.');
            }
            // Render Content Lang Selector if container exists
            if (document.getElementById('content-lang-container')) {
                this.renderContentLangSelector('content-lang-container');
            }

            console.log('[UI Loader] Final Configuration:', this.config);
        },


        /**
         * Render the Sidebar into a target container
         * @param {string} containerId - ID of the sidebar container element
         */
        renderSidebar: function (containerId) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`[UI Loader] Sidebar container '#${containerId}' not found.`);
                return;
            }

            // Safety check: Initialize config if missing (Race condition fix)
            if (!this.config) {
                if (window.DEFAULT_UI_CONFIG) {
                    this.config = JSON.parse(JSON.stringify(window.DEFAULT_UI_CONFIG));
                } else {
                    console.warn('[UI Loader] Config not ready for renderSidebar');
                    return;
                }
            }

            if (!this.config || !this.config.sidebar) {
                console.warn('[UI Loader] Config not loaded or sidebar config missing.');
                return;
            }

            // Group items by Section
            const itemsBySection = this.config.sidebar.reduce((acc, item) => {
                const section = item.section || 'Uncategorized';
                if (!acc[section]) acc[section] = [];
                acc[section].push(item);
                return acc;
            }, {});

            // Sort items by order within section
            Object.keys(itemsBySection).forEach(section => {
                itemsBySection[section].sort((a, b) => a.order - b.order);
            });

            // Defines Section Order
            const sectionOrder = ['WORKSPACE', '5-STAGE PIPELINE', 'SETTINGS'];

            let html = '';

            // Generate HTML
            sectionOrder.forEach((section, index) => {
                const items = itemsBySection[section];
                if (!items) return;

                // Section Label (Skip for first item if it's WORKSPACE, or style differently based on existing design)
                // Existing design: WORKSPACE label exists.
                // <div class="menu-label">WORKSPACE</div>

                // Add margin-top for subsequent sections
                const marginTopStyle = index > 0 ? 'style="margin-top: 1rem;"' : '';
                html += `<div class="menu-label" ${marginTopStyle}>${section}</div>`;

                items.forEach(item => {
                    const isActive = this.isCurrentPage(item.link) ? 'active' : '';
                    const iconSvg = this.getIconSvg(item.icon);
                    const translatedLabel = typeof t === 'function' ? t(item.label, 'en') : item.label;

                    html += `
                    <a href="${item.link}" class="menu-item ${isActive}">
                        ${iconSvg}
                        ${translatedLabel}
                    </a>
                    `;
                });
            });

            container.innerHTML = html;
            console.log('[UI Loader] Sidebar rendered.');
        },

        /**
         * Render the Page Header
         * @param {string} containerId - ID of the container (usually replaces existing content)
         * @param {string} pageKey - Key in config.headers (e.g., 'brand_brain')
         */
        renderHeader: function (containerId, pageKey) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Safety check: Initialize config if missing (Race condition fix)
            if (!this.config) {
                if (window.DEFAULT_UI_CONFIG) {
                    this.config = JSON.parse(JSON.stringify(window.DEFAULT_UI_CONFIG));
                } else {
                    console.warn(`[UI Loader] Config not ready for renderHeader('${pageKey}')`);
                    return;
                }
            }

            const headerConfig = this.config.headers[pageKey];
            if (!headerConfig) {
                console.warn(`[UI Loader] Header config for '${pageKey}' not found.`);
                return;
            }

            // -----------------------------------------------------------
            // DYNAMIC OVERRIDE: Apply styles from Active Sidebar Item
            // -----------------------------------------------------------
            const activeItem = this.config.sidebar.find(item => this.isCurrentPage(item.link));
            if (activeItem) {
                // If the active menu item has specific gradient settings, use them
                if (activeItem.gradient_from) headerConfig.gradient_from = activeItem.gradient_from;
                if (activeItem.gradient_to) headerConfig.gradient_to = activeItem.gradient_to;

                // Also overrides text if present on the menu item
                if (activeItem.subtitle) headerConfig.subtitle = activeItem.subtitle;
                if (activeItem.version) headerConfig.version = activeItem.version;
                if (activeItem.label) {
                    // Optionally override title? Let's use Label as Title fallback or override if user desires.
                    // The user request focused on Color. Let's stick to Color/Subtitle/Version for now to be safe.
                    // headerConfig.title = activeItem.label; 
                }
                console.log(`[UI Loader] Applied dynamic overrides from sidebar item '${activeItem.id}' to header.`);
            }

            // Determine Icon SVG
            let iconSvg = '';
            // If active item has an icon, prefer that over the header preset? 
            // The header config has 'icon_preset'. The sidebar item has 'icon' (which is a preset key).
            // Let's allow sidebar icon to override if it exists.
            const iconKey = activeItem?.icon || headerConfig.icon_preset || 'activity';

            if (window.ICON_PRESETS && window.ICON_PRESETS[iconKey]) {
                iconSvg = window.ICON_PRESETS[iconKey];
            }

            // Styles
            const titleSize = headerConfig.title_size || '20px';
            const subtitleSize = headerConfig.subtitle_size || '10px';
            const gradientFrom = headerConfig.gradient_from || '#4F46E5';
            const gradientTo = headerConfig.gradient_to || '#7C3AED';

            // -----------------------------------------------------------
            // NEW STANDARD LAYOUT: Icon + Title/Subtitle/Version
            // -----------------------------------------------------------
            // 1. Generate Gradient SVG
            const uniqueId = 'grad-' + Math.random().toString(36).substr(2, 9);
            const gradientSvg = this.generateGradientIcon(iconKey, gradientFrom, gradientTo, uniqueId);

            const html = `
            <div class="studio-brand-group" style="display: flex; align-items: start; gap: 16px;">
                <!-- Icon (No Background Box, Gradient Fill/Stroke) -->
                <div class="studio-brand-icon" style="
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    width: 48px; 
                    height: 48px;
                    padding-top: 4px;">
                    ${gradientSvg}
                </div>
                
                <!-- Text Column -->
                <div class="studio-brand-text" style="display: flex; flex-direction: column; justify-content: start;">
                    <h1 class="studio-title" style="
                        font-family: var(--font-display, 'Inter', sans-serif); 
                        font-size: ${titleSize}; 
                        font-weight: 700; 
                        color: #fff; 
                        line-height: 1.2; 
                        letter-spacing: -0.025em; 
                        margin: 0; margin-bottom: 4px;">${headerConfig.title}</h1>
                        
                    <div class="studio-subtitle-row" style="display: flex; align-items: center; gap: 8px;">
                        <span class="studio-subtitle" style="
                            font-family: var(--font-display, 'Inter', sans-serif); 
                            font-size: ${subtitleSize}; 
                            color: #94a3b8; 
                            font-weight: 500; 
                            letter-spacing: 0.05em; 
                            text-transform: uppercase;">${headerConfig.subtitle}</span>
                        ${headerConfig.version ? `<span class="studio-version" style="font-size: 10px; color: #64748b; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${headerConfig.version}</span>` : ''}
                    </div>
                </div>
            </div>
            `;

            container.innerHTML = html;
            console.log(`[UI Loader] Header for '${pageKey}' rendered (Standardized).`);
        },

        /**
         * Helper to generate SVG with injected Linear Gradient
         */
        generateGradientIcon: function (iconName, colorFrom, colorTo, idSuffix) {
            if (!window.ICON_PRESETS || !window.ICON_PRESETS[iconName]) return '';

            const innerPath = window.ICON_PRESETS[iconName];
            const gradientId = `icon-grad-${idSuffix}`;

            return `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#${gradientId})" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <defs>
                    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${colorFrom}" />
                        <stop offset="100%" stop-color="${colorTo}" />
                    </linearGradient>
                </defs>
                ${innerPath}
            </svg>
            `;
        },

        /**
         * Helper to get SVG string from preset name
         */
        getIconSvg: function (iconName) {
            if (window.ICON_PRESETS && window.ICON_PRESETS[iconName]) {
                const innerPath = window.ICON_PRESETS[iconName];
                return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${innerPath}</svg>`;
            }
            return '';
        },

        /**
         * Render Language Selector for Content
         */
        /**
         * Render Standardized Header Controls (Lang Selector + Credits)
         */
        renderHeaderControls: function (containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const lang = localStorage.getItem('zynk-main-language') || localStorage.getItem('activeContentLanguage') || 'ko';
            const selectedLang = CONTENT_LANGUAGES.find(l => l.code === lang) || CONTENT_LANGUAGES[0];

            container.innerHTML = `
                <div class="flex items-center gap-2">
                    <!-- Content Language Selector -->
                    <div id="header-lang-picker" class="flex items-center gap-3 bg-[#0f172a] border border-slate-800/60 rounded-full px-4 py-1.5 cursor-pointer hover:border-slate-500 transition-all group relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400">
                            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                        <div class="flex items-center gap-2 min-w-[80px]">
                            <span class="text-sm">${selectedLang.flag}</span>
                            <span class="text-sm font-medium text-slate-200">${selectedLang.name}</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500 transition-transform group-hover:translate-y-0.5">
                            <path d="m6 9 6 6 6-6"/>
                        </svg>

                        <!-- Hidden Select for Logic -->
                        <select id="header-content-lang-selector" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
                            ${CONTENT_LANGUAGES.map(l => `<option value="${l.code}" ${l.code === lang ? 'selected' : ''}>${l.flag} ${l.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Credit Badge -->
                    <div class="flex items-center gap-2 bg-[#0f172a] border border-red-500/20 rounded-full px-4 py-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        <span class="text-sm font-medium text-red-100/80"><span id="header-credit-count">0</span> credits</span>
                    </div>
                </div>
            `;

            // Logic: Sync with existing credit display if any
            const syncCredits = () => {
                const globalCredits = document.getElementById('credit-count') || document.getElementById('user-credits');
                const headerCredits = document.getElementById('header-credit-count');
                if (globalCredits && headerCredits) {
                    headerCredits.textContent = globalCredits.textContent;
                }
            };

            // Watch for changes in the main credit display
            const observer = new MutationObserver(syncCredits);
            const target = document.getElementById('credit-count') || document.getElementById('user-credits');
            if (target) observer.observe(target, { childList: true, characterData: true, subtree: true });
            syncCredits();

            // Logic: Handle Language Change
            const selector = document.getElementById('header-content-lang-selector');
            if (selector) {
                selector.addEventListener('change', (e) => {
                    const newLang = e.target.value;
                    localStorage.setItem('zynk-main-language', newLang);
                    localStorage.setItem('activeContentLanguage', newLang);

                    // Re-render itself to update flag/name immediately
                    this.renderHeaderControls(containerId);

                    // Dispatch global event
                    window.dispatchEvent(new CustomEvent('zynk-content-lang-changed', { detail: { lang: newLang } }));
                });
            }
        },

        /**
         * Helper to check active page
         */
        isCurrentPage: function (link) {
            if (!link) return false;
            const currentPath = window.location.pathname;

            // Normalize paths for comparison (remove leading/trailing slashes, lowercase)
            const cleanPath = currentPath.toLowerCase().replace(/^\/|\/$/g, '');
            const cleanLink = link.toLowerCase().replace(/^\/|\/$/g, '');

            // 1. Exact Match
            if (cleanPath === cleanLink) return true;

            // 2. Basename Match (e.g., 'marketPulse.html' matches '/foo/marketPulse.html')
            const pathBasename = cleanPath.split('/').pop();
            const linkBasename = cleanLink.split('/').pop();

            if (pathBasename && linkBasename && pathBasename === linkBasename) {
                return true;
            }

            // 3. Partial Match for sub-paths (careful not to overmatch)
            if (cleanPath.startsWith(cleanLink + '/')) return true;

            return false;
        },

        /**
         * Update Credit Balance display in the UI
         */
        updateCreditBalance: async function (userId) {
            if (!userId || typeof CreditService === 'undefined') return;

            try {
                const balance = await CreditService.getBalance(userId);
                // Support both legacy and new IDs
                const elements = document.querySelectorAll('#user-credits, #credit-count, #header-credit-count');
                elements.forEach(el => {
                    el.textContent = balance.toLocaleString() || '0';
                });
                console.log(`[UI Loader] Credit balance updated: ${balance}`);
                return balance;
            } catch (error) {
                console.error('[UI Loader] Failed to update credit balance:', error);
            }
        },

        refreshUI: function () {
            console.log('[UI Loader] Refreshing UI...');

            // Sidebar
            if (document.getElementById('sidebar-menu-area')) {
                this.renderSidebar('sidebar-menu-area');
            }

            // Page Headers
            const headerMap = {
                'brand-brain-header-container': 'brand_brain',
                'studio-header-container': 'studio',
                'knowledge-hub-header-container': 'knowledge_hub',
                'market-pulse-header-container': 'market_pulse',
                'the-growth-header-container': 'the_growth'
            };

            Object.keys(headerMap).forEach(containerId => {
                const container = document.getElementById(containerId);
                if (container) {
                    this.renderHeader(containerId, headerMap[containerId]);
                }
            });

            // Universal Header Controls
            if (document.getElementById('header-controls-container')) {
                this.renderHeaderControls('header-controls-container');
            } else if (document.getElementById('content-lang-container')) {
                // Backward compatibility if some page hasn't updated the ID yet
                this.renderHeaderControls('content-lang-container');
            }
        }
    };

    // Expose Global
    window.UI = UI;

    // Auto-init on load
    window.addEventListener('DOMContentLoaded', () => {
        UI.init();
    });

})();
