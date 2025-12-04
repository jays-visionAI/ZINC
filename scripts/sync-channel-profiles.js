/**
 * Sync Channel Profiles Script
 * 
 * This script synchronizes the 'channelProfiles' collection in Firestore
 * to match exactly the 13 desired channels:
 * Instagram, X, Facebook, LinkedIn, YouTube, TikTok, Discord, Naver, Reddit, KakaoTalk, Line, Telegram, WhatsApp.
 * 
 * Usage:
 * 1. Open ZINC Admin Console (e.g., Channel Profile Management page).
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
            // Use set with merge: true to preserve other fields if they exist, 
            // but ensure core fields are set.
            // Actually, for a clean sync, we might want to overwrite or ensure defaults.
            // Let's use set({ ... }, { merge: true })

            batch.set(docRef, {
                name: channel.name,
                contentTypes: channel.contentTypes,
                interactionStyle: channel.interactionStyle,
                version: channel.version,
                updatedAt: timestamp,
                // Ensure these exist if creating new
                lengthRules: {},
                seoRules: {},
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
