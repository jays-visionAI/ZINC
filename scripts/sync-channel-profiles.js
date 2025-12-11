/**
 * Sync Channel Profiles Script
 * 
 * This script synchronizes the 'channelProfiles' collection in Firestore
 * to match exactly the 13 desired channels:
 * Instagram, X, Facebook, LinkedIn, YouTube, TikTok, Discord, Naver, Reddit, KakaoTalk, Line, Telegram, WhatsApp.
 * 
 * Usage:
 * 1. Open ZINK Admin Console (e.g., Channel Profile Management page).
 * 2. Open Browser Developer Tools (F12 -> Console).
 * 3. Paste this entire script and press Enter.
 */

(async function syncChannelProfiles() {
    console.log("🔄 Starting Channel Profiles Sync...");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found. Please run this in the ZINC Admin Console.");
        return;
    }

    // 1. Define the Target 13 Channels
    const targetChannels = [
        {
            id: "instagram",
            key: "instagram",
            name: "Instagram",
            displayName: "Instagram",
            icon: "📸",
            order: 1,
            supportsApiConnection: true,
            status: "active",
            category: "social",
            contentTypes: ["image", "short_video", "carousel", "story"],
            interactionStyle: { tone: "Visual & Trendy" },
            apiCredentialConfig: {
                fields: [
                    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
                    { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'Enter Facebook Page ID', required: true, help: 'Facebook Page ID connected to Instagram' }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "x",
            key: "x",
            name: "X",
            displayName: "X (Twitter)",
            icon: "🐦",
            order: 2,
            supportsApiConnection: true,
            status: "active",
            category: "social",
            contentTypes: ["short_text", "thread", "image", "video"],
            interactionStyle: { tone: "Concise & Real-time" },
            apiCredentialConfig: {
                fields: [
                    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter API Key', required: true },
                    { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'Enter API Secret', required: false },
                    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
                    { key: 'accessTokenSecret', label: 'Access Token Secret', type: 'password', placeholder: 'Enter Token Secret', required: false }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "facebook",
            key: "facebook",
            name: "Facebook",
            displayName: "Facebook",
            icon: "📘",
            order: 3,
            supportsApiConnection: true,
            status: "active",
            category: "social",
            contentTypes: ["text", "image", "video", "link"],
            interactionStyle: { tone: "Community & Informative" },
            apiCredentialConfig: {
                fields: [
                    { key: 'accessToken', label: 'Access Token', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "linkedin",
            key: "linkedin",
            name: "LinkedIn",
            displayName: "LinkedIn",
            icon: "💼",
            order: 4,
            supportsApiConnection: true,
            status: "active",
            category: "social",
            contentTypes: ["short_text", "long_text", "image", "document"],
            interactionStyle: { tone: "Professional & Corporate" },
            apiCredentialConfig: {
                fields: [
                    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
                    { key: 'urn', label: 'Organization URN', type: 'text', placeholder: 'urn:li:organization:12345', required: false }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "youtube",
            key: "youtube",
            name: "YouTube",
            displayName: "YouTube",
            icon: "▶️",
            order: 5,
            supportsApiConnection: true,
            status: "active",
            category: "social",
            contentTypes: ["long_video", "short_video"],
            interactionStyle: { tone: "Educational & Entertaining" },
            apiCredentialConfig: {
                fields: [
                    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter YouTube API Key', required: true, help: 'From Google Cloud Console' }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "tiktok",
            key: "tiktok",
            name: "TikTok",
            displayName: "TikTok",
            icon: "🎵",
            order: 6,
            supportsApiConnection: true,
            status: "active",
            category: "social",
            contentTypes: ["short_video"],
            interactionStyle: { tone: "Creative & Viral" },
            apiCredentialConfig: {
                fields: [
                    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Enter Access Token', required: true },
                    { key: 'clientKey', label: 'Client Key', type: 'text', placeholder: 'Enter Client Key', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "discord",
            key: "discord",
            name: "Discord",
            displayName: "Discord",
            icon: "💬",
            order: 7,
            supportsApiConnection: true,
            status: "active",
            category: "community",
            contentTypes: ["text", "image", "video", "link"],
            interactionStyle: { tone: "Conversational & Community" },
            apiCredentialConfig: {
                fields: [
                    { key: 'botToken', label: 'Bot Token', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "naver",
            key: "naver_blog",
            name: "Naver",
            displayName: "Naver Blog",
            icon: "🇳",
            order: 8,
            supportsApiConnection: true,
            status: "active",
            category: "blog",
            contentTypes: ["blog_post", "image", "video", "long_text"],
            interactionStyle: { tone: "Informative & Detailed" },
            lengthRules: {
                title: { min: 5, max: 100 },
                body: { min: 300, max: 5000 }
            },
            seoRules: {
                hashtags: { max: 30, recommended: true },
                keywords: { required: true }
            },
            apiCredentialConfig: {
                fields: [
                    { key: 'clientId', label: 'Client ID', type: 'text', required: true },
                    { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "reddit",
            key: "reddit",
            name: "Reddit",
            displayName: "Reddit",
            icon: "🤖",
            order: 9,
            supportsApiConnection: true,
            status: "active",
            category: "community",
            contentTypes: ["text", "link", "image", "video"],
            interactionStyle: { tone: "Discussion & Niche" },
            apiCredentialConfig: {
                fields: [
                    { key: 'clientId', label: 'Client ID', type: 'text', required: true },
                    { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "kakaotalk",
            key: "kakaotalk",
            name: "KakaoTalk",
            displayName: "KakaoTalk",
            icon: "🟡",
            order: 10,
            supportsApiConnection: true,
            status: "active",
            category: "messenger",
            contentTypes: ["text", "image", "link", "short_text"],
            interactionStyle: { tone: "Personal & Instant" },
            lengthRules: {
                body: { min: 1, max: 1000 }
            },
            seoRules: {
                hashtags: { max: 0, recommended: false }
            },
            apiCredentialConfig: {
                fields: [
                    { key: 'apiKey', label: 'REST API Key', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "line",
            key: "line",
            name: "Line",
            displayName: "Line",
            icon: "🟢",
            order: 11,
            supportsApiConnection: true,
            status: "active",
            category: "messenger",
            contentTypes: ["text", "image", "sticker", "short_text"],
            interactionStyle: { tone: "Friendly & Expressive" },
            lengthRules: {
                body: { min: 1, max: 1000 }
            },
            seoRules: {
                hashtags: { max: 0, recommended: false }
            },
            apiCredentialConfig: {
                fields: [
                    { key: 'channelAccessToken', label: 'Channel Access Token', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "telegram",
            key: "telegram",
            name: "Telegram",
            displayName: "Telegram",
            icon: "✈️",
            order: 12,
            supportsApiConnection: true,
            status: "active",
            category: "messenger",
            contentTypes: ["text", "image", "video", "document"],
            interactionStyle: { tone: "Secure & Direct" },
            apiCredentialConfig: {
                fields: [
                    { key: 'botToken', label: 'Bot Token', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "whatsapp",
            key: "whatsapp",
            name: "WhatsApp",
            displayName: "WhatsApp",
            icon: "📞",
            order: 13,
            supportsApiConnection: true,
            status: "active",
            category: "messenger",
            contentTypes: ["text", "image", "video"],
            interactionStyle: { tone: "Direct & Personal" },
            apiCredentialConfig: {
                fields: [
                    { key: 'accessToken', label: 'Access Token', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "naver_smartstore",
            key: "naver_smartstore",
            name: "Naver Smart Store",
            displayName: "Naver Smart Store",
            icon: "🛒",
            order: 14,
            supportsApiConnection: true,
            status: "active",
            category: "commerce",
            contentTypes: ["product", "image", "description"],
            interactionStyle: { tone: "Commercial & Persuasive" },
            apiCredentialConfig: {
                fields: [
                    { key: 'apiKey', label: 'API Key', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "pinterest",
            key: "pinterest",
            name: "Pinterest",
            displayName: "Pinterest",
            icon: "📌",
            order: 14,
            supportsApiConnection: true,
            status: "active",
            category: "social",
            contentTypes: ["image", "video"],
            interactionStyle: { tone: "Visual & Inspirational" },
            apiCredentialConfig: {
                fields: [
                    { key: 'appId', label: 'App ID', type: 'text', required: true },
                    { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
                    { key: 'accessToken', label: 'Access Token', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        },
        {
            id: "coupang",
            key: "coupang",
            name: "Coupang",
            displayName: "Coupang",
            icon: "🛍️",
            order: 15,
            supportsApiConnection: true,
            status: "active",
            category: "commerce",
            contentTypes: ["product", "image", "description"],
            interactionStyle: { tone: "Commercial & Persuasive" },
            apiCredentialConfig: {
                fields: [
                    { key: 'accessKey', label: 'Access Key', type: 'text', required: true },
                    { key: 'secretKey', label: 'Secret Key', type: 'password', required: true }
                ]
            },
            version: "1.0.0"
        }
    ];

    const targetIds = new Set(targetChannels.map(c => c.id));

    try {
        // 2. Fetch Existing Profiles
        const snapshot = await db.collection('channelProfiles').get();
        const existingDocs = [];
        snapshot.forEach(doc => existingDocs.push({ id: doc.id, ...doc.data() }));

        console.log(`📊 Found ${existingDocs.length} existing profiles.`);

        const batch = db.batch();
        let operationCount = 0;

        // 3. Delete Unwanted Profiles
        existingDocs.forEach(doc => {
            if (!targetIds.has(doc.id)) {
                console.log(`🗑️ Deleting unwanted profile: ${doc.name} (${doc.id})`);
                batch.delete(db.collection('channelProfiles').doc(doc.id));
                operationCount++;
            }
        });

        // 4. Upsert Target Profiles
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        targetChannels.forEach(channel => {
            const docRef = db.collection('channelProfiles').doc(channel.id);

            batch.set(docRef, {
                key: channel.key,
                name: channel.name,
                displayName: channel.displayName,
                icon: channel.icon,
                order: channel.order,
                supportsApiConnection: channel.supportsApiConnection,
                status: channel.status,
                category: channel.category,
                contentTypes: channel.contentTypes,
                interactionStyle: channel.interactionStyle,
                apiCredentialConfig: channel.apiCredentialConfig,
                lengthRules: channel.lengthRules || {},
                seoRules: channel.seoRules || {},
                version: channel.version,
                updatedAt: timestamp,
                kpiWeights: {}
            }, { merge: true });

            console.log(`✅ Queued update/create: ${channel.name}`);
            operationCount++;
        });

        // 5. Commit Batch
        if (operationCount > 0) {
            await batch.commit();
            console.log(`✨ Sync complete! Executed ${operationCount} operations.`);
            alert(`✅ Channel Profiles Synced!\n\n- Total Channels: 13\n- Operations: ${operationCount}\n\nPlease refresh the page to see changes.`);
        } else {
            console.log("✨ All profiles are already in sync.");
            alert("✅ Profiles are already up to date.");
        }

    } catch (error) {
        console.error("❌ Sync failed:", error);
        alert(`❌ Sync failed: ${error.message}`);
    }

})();
