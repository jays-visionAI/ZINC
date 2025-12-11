/**
 * Default UI Configuration
 * This file contains the hardcoded default values for the UI (Sidebar, Headers, etc.)
 * These values are used if no overrides are found in the database.
 */

(function () {
    console.log('[UI Config] Initializing Default Configuration...');

    const DEFAULT_UI_CONFIG = {
        // -------------------------------------------------------------------------
        // Sidebar Configuration (Command Center & Admin)
        // -------------------------------------------------------------------------
        sidebar: [
            // WORKSPACE Section
            {
                id: 'command_center',
                label: 'Command Center',
                icon: 'layout-dashboard', // Uses internal mapping or SVG content
                link: '/command-center.html',
                section: 'WORKSPACE',
                order: 10
            },

            // 5-STAGE PIPELINE Section
            {
                id: 'market_pulse',
                label: 'Market Pulse',
                icon: 'activity',
                link: '/marketPulse.html',
                section: '5-STAGE PIPELINE',
                order: 20
            },
            {
                id: 'brand_brain',
                label: 'Brand Brain',
                icon: 'brain',
                link: '/brand-brain.html',
                section: '5-STAGE PIPELINE',
                order: 30
            },
            {
                id: 'knowledge_hub',
                label: 'Knowledge Hub',
                icon: 'folder',
                link: '/knowledgeHub.html',
                section: '5-STAGE PIPELINE',
                order: 35
            },
            {
                id: 'studio',
                label: 'Studio',
                icon: 'grid',
                link: '/studio/',
                section: '5-STAGE PIPELINE',
                order: 40
            },
            {
                id: 'the_growth',
                label: 'The Growth',
                icon: 'trending-up',
                link: '/theGrowth.html',
                section: '5-STAGE PIPELINE',
                order: 60
            },

            // SETTINGS Section
            {
                id: 'settings',
                label: 'Settings',
                icon: 'settings',
                link: '/user-settings.html',
                section: 'SETTINGS',
                order: 99
            }
        ],

        // -------------------------------------------------------------------------
        // Page Header Configuration
        // -------------------------------------------------------------------------
        headers: {
            // Brand Brain Page
            brand_brain: {
                title: 'Brand Brain',
                subtitle: 'Strategic Intelligence Hub',
                icon_type: 'gradient_box',
                icon_preset: 'brain', // Defines which internal icon to use
                gradient_from: '#4F46E5', // indigo-600
                gradient_to: '#7C3AED',   // purple-600
                title_size: '20px',
                subtitle_size: '10px',
                version: null
            },

            // Studio Page
            studio: {
                title: 'Studio',
                subtitle: 'AI Content Orchestration',
                icon_type: 'gradient_box',
                icon_preset: 'hexagon',
                gradient_from: '#10B981', // emerald-500
                gradient_to: '#00FFA3',   // cyan-accent
                title_size: '20px',
                subtitle_size: '10px',
                version: 'v0.98'
            },

            // Knowledge Hub Page
            knowledge_hub: {
                title: 'Knowledge Hub',
                subtitle: 'Brand Intelligence Center',
                icon_type: 'gradient_box',
                icon_preset: 'folder',
                gradient_from: '#4F46E5', // indigo-600 (or similar blue/purple)
                gradient_to: '#9333EA',   // purple-600
                title_size: '20px',
                subtitle_size: '10px',
                version: null
            },

            // Market Pulse Page
            market_pulse: {
                title: 'Market Pulse',
                subtitle: 'Real-time Intelligence',
                icon_type: 'gradient_box',
                icon_preset: 'activity',
                gradient_from: '#3B82F6',
                gradient_to: '#2563EB',
                title_size: '20px',
                subtitle_size: '10px',
                version: null
            },

            // The Growth Page
            the_growth: {
                title: 'The Growth',
                subtitle: 'ROI & Learning',
                icon_type: 'gradient_box',
                icon_preset: 'trending-up',
                gradient_from: '#10B981', // emerald-500
                gradient_to: '#34D399',   // emerald-400
                title_size: '20px',
                subtitle_size: '10px',
                version: null
            }
        },

        // -------------------------------------------------------------------------
        // Global Style Constants
        // -------------------------------------------------------------------------
        styles: {
            sidebar_width: '260px',
            header_height: '64px',
            font_family: 'Inter, sans-serif'
        }
    };

    /**
     * Valid SVG Icon Presets (Fallback if not overriding with custom SVG string)
     */
    // Default Icon Presets (Lucide Compatible Paths)
    const ICON_PRESETS = {
        'layout-dashboard': '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
        'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
        'brain': '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>',
        'grid': '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
        'settings': '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
        'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>',
        'folder': '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>',
        'hexagon': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>',
        'users': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
        'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line>',
        'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
        'bell': '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path>',
        'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
        'search': '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
        'home': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
        'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
        'pie-chart': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>',
        'layers': '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
        'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
        'credit-card': '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
        'rocket': '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.45-.15.8-.3 1.1-.5l-2.5-2.5c-.2.3-.55.65-1.1.5z"></path><path d="m12 15-3-3a22 22 0 0 1 2-5.25A22 22 0 0 1 15 12a22 22 0 0 1-5 2z"></path><path d="M9 13c1.5 1.26 2 5 2 5s3.74-.5 5-2c.45-.15.8-.3 1.1-.5l-2.5-2.5c-.2.3-.55.65-1.1.5z"></path>'
    };

    // Assign to window
    if (typeof window !== 'undefined') {
        window.DEFAULT_UI_CONFIG = DEFAULT_UI_CONFIG;
        window.ICON_PRESETS = ICON_PRESETS;
    }

})();
