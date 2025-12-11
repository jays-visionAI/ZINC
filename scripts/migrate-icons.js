// scripts/migrate-icons.js
// Run this in the Browser Console on the Admin Page to populate icons

(async function migrateIcons() {
    const db = firebase.firestore();
    console.log("🚀 Starting Icon Migration...");

    const icons = {
        "instagram": `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="#0a0a0f" /><circle cx="17.5" cy="6.5" r="1.5" fill="#0a0a0f" /></svg>`,
        "x": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>`,
        "facebook": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>`,
        "linkedin": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" /></svg>`,
        "youtube": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#0a0a0f" /></svg>`,
        "tiktok": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>`,
        "discord": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>`,
        "naver_smartstore": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" fill="white" /><text x="12" y="22" font-family="Inter, sans-serif" font-size="5" fill="white" text-anchor="middle" style="display:none;">Smart Store</text></svg>`,
        "naver_searchad": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" fill="white" /></svg>`,
        "naver_map": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm-1 9.5h-1.5v-4h1.5l1.5 2.25V7.5h1.5v4h-1.5L11 9.25v2.25z" fill="white"/></svg>`,
        "naver_navi": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" fill="white" /></svg>`,
        "kakaotalk": `<svg viewBox="0 0 24 24" fill="#3A1D1D"><path d="M12 3c-5.523 0-10 3.477-10 7.75 0 2.76 1.879 5.2 4.717 6.55-.133.493-.473 1.777-.544 2.057-.087.337.123.332.259.243.109-.071 1.745-1.185 2.45-1.665.378.056.766.085 1.158.085 5.523 0 10-3.477 10-7.75C22 6.477 17.523 3 12 3z" /></svg>`,
        "kakao_map": `<svg viewBox="0 0 24 24" fill="#3A1D1D"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>`,
        "kakao_navi": `<svg viewBox="0 0 120 60" fill="none"><circle cx="35" cy="30" r="24" fill="#3A1D1D"/><path d="M28 36L42 30L28 24V36Z" fill="#FEE500" transform="rotate(-45 35 30) translate(-2 -2)"/> <text x="65" y="38" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#3A1D1D">Navi</text></svg>`,
        "tmap": `<svg viewBox="0 0 24 24" fill="none"><defs><linearGradient id="tmapGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#FF0072;" /><stop offset="100%" style="stop-color:#00C7B1;" /></linearGradient></defs><path d="M4 4h16v6h-5v10h-6V10H4V4z" fill="url(#tmapGradient)" /></svg>`,
        "coupang": `<svg viewBox="0 0 100 24" fill="none"><text x="50" y="18" font-family="Arial, sans-serif" font-weight="900" font-size="24" text-anchor="middle"><tspan fill="#5D2C1D">cou</tspan><tspan fill="#FF6B00">p</tspan><tspan fill="#FFC900">a</tspan><tspan fill="#00AAFF">n</tspan><tspan fill="#88DDFF">g</tspan></text></svg>`,
        "11st": `<svg viewBox="0 0 24 24" fill="#ED1C24"><text x="12" y="17" font-family="Arial, sans-serif" font-weight="900" font-size="16" text-anchor="middle">11st</text></svg>`,
        "gmarket": `<svg viewBox="0 0 24 24" fill="white"><path d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8c3.08 0 5.76-1.74 7.07-4.32l-1.84-.78C16.38 16.73 14.37 18 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c2.37 0 4.38 1.27 5.23 3.1l1.84-.78C17.76 5.74 15.08 4 12 4z"/><path d="M12 9.5a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 5 0h-2.5v-2.5z" fill="#232C66"/><text x="12" y="21" font-family="Arial, sans-serif" font-weight="bold" font-size="4.5" text-anchor="middle">Gmarket</text></svg>`,
        "ssg": `<svg viewBox="0 0 24 24" fill="#333"><text x="12" y="16" font-family="Arial, sans-serif" font-weight="900" font-size="10" text-anchor="middle">SSG.COM</text></svg>`,
        "baemin": `<svg viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>`,
        "yogiyo": `<svg viewBox="0 0 100 100" fill="white"><circle cx="20" cy="50" r="18" stroke="white" stroke-width="3" fill="none"/><text x="20" y="58" font-family="Arial, sans-serif" font-weight="bold" font-size="20" text-anchor="middle">요</text><circle cx="50" cy="50" r="18" fill="#FFC900"/><text x="50" y="58" font-family="Arial, sans-serif" font-weight="bold" font-size="20" text-anchor="middle" fill="white">기</text><circle cx="80" cy="50" r="18" stroke="white" stroke-width="3" fill="none"/><text x="80" y="58" font-family="Arial, sans-serif" font-weight="bold" font-size="20" text-anchor="middle">요</text></svg>`,
        "pinterest": `<svg viewBox="0 0 24 24" fill="white"><path d="M12 0C5.372 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.65 0-5.789 2.738-5.789 5.563 0 1.103.425 2.286.953 2.922.105.126.12.238.089.431-.096.402-.312 1.254-.355 1.428-.056.241-.19.292-.439.176-1.638-.763-2.66-3.158-2.66-5.077 0-4.136 3.003-7.931 8.663-7.931 4.546 0 8.085 3.242 8.085 7.568 0 4.516-2.847 8.148-6.797 8.148-1.327 0-2.574-.69-3.001-1.503 0 0-.658 2.502-.818 3.111-.295 1.135-1.092 2.55-1.632 3.418C8.941 23.864 10.435 24 12 24c6.627 0 12-5.372 12-12S16.627 0 12 0z" /></svg>`,
        "whatsapp": `<svg viewBox="0 0 24 24" fill="white"><path d="M12.012 2c-5.507 0-9.99 4.482-9.99 9.99 0 1.794.475 3.483 1.309 4.965l-1.328 4.887 4.992-1.309c1.458.8 3.12 1.257 4.896 1.257 5.508 0 9.991-4.482 9.991-9.99 0-5.508-4.483-9.99-9.991-9.99z" /><path d="M17.507 14.307l-2.022-1.011c-.557-.279-.893-.207-1.229.208l-1.554 1.944c-.336.417-.672.463-1.127.279a14.7 14.7 0 0 1-4.406-2.731 14.7 14.7 0 0 1-2.946-3.666c-.237-.417-.119-.719.168-1.006l.758-1c.237-.308.316-.514.474-.821.158-.309.079-.576-.04-.822l-1.817-4.376c-.475-1.144-.948-1-1.305-1.025l-1.107-.02c-.396 0-1.028.148-1.581.758C5.06 6.327 3 8.303 3 12.338c0 4.035 2.946 7.831 4.544 10.231 2.906 4.364 8.794 5.394 11.235 4.979 1.454-.247 3.321-1.74 3.964-3.479.643-1.738.544-3.143.435-3.321-.109-.178-.396-.287-.852-.515z" fill="#25D366" /></svg>`
    };

    const batch = db.batch();
    let count = 0;

    for (const [id, svg] of Object.entries(icons)) {
        const ref = db.collection('channelProfiles').doc(id);
        batch.update(ref, { icon: svg });
        console.log(`✅ Queued update for: ${id}`);
        count++;
    }

    if (count > 0) {
        await batch.commit();
        console.log(`✨ Successfully updated ${count} channel icons!`);
        alert("Success! All default icons have been migrated to Firestore.");
    }
})();
