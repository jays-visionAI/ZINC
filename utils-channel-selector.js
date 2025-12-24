/**
 * ZYNK Utils - Channel Selector
 * Reusable component for selecting target channels (Wizard, Project Card, etc.)
 */

// 13 Supported Channels with SVGs
const CHANNEL_ICONS = {
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29.07 29.07 0 0 0 1 11.75a29.07 29.07 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29.07 29.07 0 0 0 .46-5.33 29.07 29.07 0 0 0-.46-5.33zM9.75 15.02l5.75-3.27-5.75-3.27v6.54z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5v4a9 9 0 0 1-9-9v12z"></path></svg>',
    threads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10c0-5.5-4.5-10-10-10z"></path><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path></svg>',
    pinterest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.14 9.41 7.62 11.17-.07-.94-.14-2.12.03-3.03.16-.85 1.05-4.44 1.05-4.44s-.27-.53-.27-1.32c0-1.23.72-2.16 1.62-2.16.76 0 1.13.57 1.13 1.25 0 .76-.49 1.91-.74 2.96-.21.89.44 1.62 1.32 1.62 1.58 0 2.65-2.03 2.65-4.42 0-1.82-1.23-3.18-3.41-3.18-2.49 0-4.04 1.85-4.04 3.93 0 .71.21 1.21.54 1.6.08.1.09.14.06.26-.06.24-.2.83-.26.96-.04.14-.17.19-.31.14-1.12-.46-1.63-1.69-1.63-3.09 0-2.3 1.93-5.06 5.8-5.06 3.09 0 5.12 2.24 5.12 4.67 0 3.19-1.77 5.58-4.4 5.58-.88 0-1.71-.48-1.99-.99l-.54 2.05c-.17.63-.49 1.26-.74 1.68 1.01.29 2.08.45 3.18.45 6.63 0 12-5.37 12-12S18.63 0 12 0z"/></svg>',
    reddit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.25a1.25 1.25 0 0 1-1.25 1.25 1.25 1.25 0 0 1-1.25-1.25c0-.689.561-1.25 1.25-1.25zM12 18a5 5 0 0 1-5-5c0-2.761 2.239-5 5-5s5 2.239 5 5-2.239 5-5 5z"/></svg>',
    naver_blog: '<svg viewBox="0 0 24 24" fill="#03C75A"><path d="M16.14 6.13V18H13.43L8.851 11.53V18H5.859V6.13H8.571L13.149 12.6V6.13H16.14Z"/></svg>',
    naver_smart_store: '<svg viewBox="0 0 24 24" fill="#03C75A"><path d="M16.14 6.13V18H13.43L8.851 11.53V18H5.859V6.13H8.571L13.149 12.6V6.13H16.14Z"/></svg>',
    naver_map: '<svg viewBox="0 0 24 24" fill="#03C75A"><path d="M16.14 6.13V18H13.43L8.851 11.53V18H5.859V6.13H8.571L13.149 12.6V6.13H16.14Z"/></svg>',
    coupang: '<svg viewBox="0 0 24 24" fill="#E61E2A"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"></path></svg>',
    tmap: '<svg viewBox="0 0 24 24" fill="#1A73E8"><path d="M21 16.5c0 .38-.21.71-.53.88l-7.97 4.44c-.31.17-.69.17-1 0L3.53 17.38c-.32-.17-.53-.5-.53-.88V7.5c0-.38.21-.71.53-.88l7.97-4.44c.31-.17.69-.17 1 0l7.97 4.44c.32.17.53.5.53.88v9z"></path></svg>',
    kakao_navi: '<svg viewBox="0 0 24 24" fill="#FEE500"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15l-4-4h8l-4 4z"></path></svg>',
    kakao_map: '<svg viewBox="0 0 24 24" fill="#FEE500"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-2v2h-2v-2H9v-2h2V9h2v2h2v2z"></path></svg>',
    snapchat: '<svg viewBox="0 0 24 24" fill="#FFFC00"><path d="M12 2c-4.97 0-9 4.03-9 9 0 4.17 2.84 7.67 6.69 8.69.12.03.25.04.31.06l.31.02.31-.02c.06-.02.19-.03.31-.06.31-.08.6-.18.88-.31l.24-.13.24.13c.28.13.57.23.88.31.12.03.25.04.31.06l.31.02.31-.02c.06-.02.19-.03.31-.06.31-.08.6-.18.88-.31l.24-.13.24.13c.28.13.57.23.88.31.12.03.25.04.31.06l.31.02.31-.02c.06-.02.19-.03.31-.06 3.85-1.02 6.69-4.52 6.69-8.69 0-4.97-4.03-9-9-9z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-2.395-9.13-4.883-14.867a.07.07 0 0 0-.032-.027zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="#0088cc"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.54-1.06-.7.53-1.09 1.14-1.71.16-.16 2.94-2.7 2.99-2.85.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.91 1.21-5.39 3.56-.51.34-.98.51-1.39.5-.45 0-1.32-.26-1.96-.46-.78-.24-1.4-.37-1.35-.78.03-.21.32-.43.88-.66 3.44-1.5 5.74-2.48 6.9-2.96 3.29-1.37 3.97-1.61 4.42-1.61.1 0 .32.02.47.14.12.1.15.23.16.34 0 .09.01.27 0 .29z"/></svg>',
    medium: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="4"></circle><ellipse cx="14" cy="12" rx="2.5" ry="4"></ellipse><ellipse cx="20" cy="12" rx="1.5" ry="4"></ellipse></svg>'
};

// 1. Label Mapping for pretty display
const CHANNEL_LABELS = {
    x: 'X',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    threads: 'Threads',
    pinterest: 'Pinterest',
    reddit: 'Reddit',
    naver_blog: 'Naver Blog',
    naver_smart_store: 'N smartstore',
    naver_map: 'N Map',
    coupang: 'Coupang',
    tmap: 'T-Map',
    kakao_navi: 'Kakao Navi',
    kakao_map: 'Kakao Map',
    snapchat: 'Snapchat',
    discord: 'Discord',
    telegram: 'Telegram',
    medium: 'Medium'
};

/**
 * Render Channel Selector
 * @param {string} containerId - Container element ID
 * @param {string[]} selectedChannels - Array of selected channel keys
 * @param {function} onChange - Callback (channelKey, isSelected, updatedList) => {}
 * @param {object} options - Optional configuration { customChannels: [] }
 */
async function renderChannelSelector(containerId, selectedChannels = [], onChange, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container #${containerId} not found`);
        return;
    }

    // Load channels from Firestore if not provided
    let channels = options.customChannels;
    if (!channels) {
        if (window.ChannelProfilesUtils) {
            channels = await window.ChannelProfilesUtils.loadAvailableChannels();
        } else {
            // Fallback to minimal list if util is missing
            channels = Object.keys(CHANNEL_ICONS).map(key => ({
                key: key,
                displayName: CHANNEL_LABELS[key] || key,
                icon: CHANNEL_ICONS[key]
            }));
        }
    }

    // Styles
    const styleId = 'channel-selector-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .channel-selector-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
                gap: 12px;
                padding: 4px;
            }
            .channel-option {
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 10px;
                cursor: pointer;
                transition: all 0.2s;
                user-select: none;
            }
            .channel-option:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .channel-option.selected {
                background: rgba(34, 197, 94, 0.15);
                border-color: #22c55e;
            }
            .channel-option-icon {
                width: 20px;
                height: 20px;
                color: rgba(255,255,255,0.6);
                transition: all 0.3s;
                filter: grayscale(100%) opacity(0.5);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .channel-option-icon svg, .channel-option-icon img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .channel-option.selected .channel-option-icon {
                color: #22c55e !important;
                filter: grayscale(0%) opacity(1);
            }
            .channel-name {
                font-size: 13px;
                color: rgba(255,255,255,0.4);
                font-weight: 500;
                transition: color 0.3s;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .channel-option.selected .channel-name {
                color: #fff;
            }
        `;
        document.head.appendChild(style);
    }

    // Render Grid
    container.className = 'channel-selector-grid';
    container.innerHTML = channels.map(ch => {
        const key = ch.key || ch.id;
        const isSelected = selectedChannels.includes(key);
        const iconContent = (ch.icon && ch.icon.trim().startsWith('<svg')) ? ch.icon : (getChannelIcon(key));
        const displayName = ch.displayName || ch.name || key;

        return `
            <div class="channel-option ${isSelected ? 'selected' : ''}" data-channel="${key}">
                <div class="channel-option-icon">${iconContent}</div>
                <div class="channel-name">${displayName}</div>
            </div>
        `;
    }).join('');

    // Event Listeners
    container.querySelectorAll('.channel-option').forEach(el => {
        el.addEventListener('click', () => {
            const channel = el.dataset.channel;
            el.classList.toggle('selected');

            const isSelected = el.classList.contains('selected');
            let updatedList = [];

            // Re-read from DOM to ensure sync
            container.querySelectorAll('.channel-option.selected').forEach(sel => {
                updatedList.push(sel.dataset.channel);
            });

            if (onChange) onChange(channel, isSelected, updatedList);
        });
    });
}

/**
 * Get SVG Icon for a channel (Fallback)
 * @param {string} channelKey 
 * @returns {string} SVG HTML
 */
function getChannelIcon(channelKey) {
    return CHANNEL_ICONS[channelKey] || CHANNEL_ICONS['medium']; // fallback
}

// Export to window
window.ChannelSelector = {
    render: renderChannelSelector,
    getIcon: getChannelIcon,
    ICONS: CHANNEL_ICONS
};
