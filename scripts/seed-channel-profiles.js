// Seed 13 Channel Profiles for ZYNK Agent OS
// Run this script once to initialize all channel profiles

(async function seedChannelProfiles() {
    console.log("🌐 Seeding 13 Channel Profiles...");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found.");
        return;
    }

    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const channelProfiles = [
        {
            id: 'instagram',
            name: 'Instagram',
            contentTypes: ['image', 'short_video', 'carousel', 'story'],
            lengthRules: {
                caption: { min: 50, max: 2200, optimal: 150 },
                hashtags: { min: 5, max: 30, optimal: 11 }
            },
            interactionStyle: {
                tone: 'visual_centric',
                emojiUsage: 'high',
                hashtagStrategy: 'mix_popular_niche'
            },
            seoRules: {
                altTextRequired: true,
                keywordDensity: 0.02
            },
            kpiWeights: {
                saves: 0.3,
                engagement: 0.25,
                reach: 0.2,
                shares: 0.15,
                comments: 0.1
            },
            postingSchedule: {
                optimal: ['10:00', '14:00', '19:00'],
                frequency: '1-2 per day'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'linkedin',
            name: 'LinkedIn',
            contentTypes: ['short_text', 'long_text', 'image', 'document'],
            lengthRules: {
                post: { min: 100, max: 3000, optimal: 1300 },
                headline: { max: 220 }
            },
            interactionStyle: {
                tone: 'professional',
                emojiUsage: 'minimal',
                hashtagStrategy: 'industry_specific'
            },
            seoRules: {
                keywordDensity: 0.03,
                profileOptimization: true
            },
            kpiWeights: {
                engagement: 0.3,
                clicks: 0.25,
                impressions: 0.2,
                shares: 0.15,
                comments: 0.1
            },
            postingSchedule: {
                optimal: ['08:00', '12:00', '17:00'],
                frequency: '2-3 per week'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'medium',
            name: 'Medium',
            contentTypes: ['long_text'],
            lengthRules: {
                article: { min: 500, max: 10000, optimal: 1500 },
                title: { min: 30, max: 100, optimal: 60 }
            },
            interactionStyle: {
                tone: 'professional',
                emojiUsage: 'none',
                hashtagStrategy: 'topic_tags'
            },
            seoRules: {
                keywordDensity: 0.015,
                metaDescription: true,
                internalLinking: true
            },
            kpiWeights: {
                claps: 0.3,
                reads: 0.25,
                readTime: 0.2,
                highlights: 0.15,
                responses: 0.1
            },
            postingSchedule: {
                optimal: ['09:00', '13:00'],
                frequency: '1-2 per week'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'x',
            name: 'X (Twitter)',
            contentTypes: ['short_text', 'thread', 'image', 'video'],
            lengthRules: {
                tweet: { max: 280, optimal: 260 },
                thread: { tweetsMin: 3, tweetsMax: 25 }
            },
            interactionStyle: {
                tone: 'conversational',
                emojiUsage: 'moderate',
                hashtagStrategy: 'trending_relevant'
            },
            seoRules: {
                keywordDensity: 0.025
            },
            kpiWeights: {
                retweets: 0.3,
                replies: 0.25,
                likes: 0.2,
                impressions: 0.15,
                clicks: 0.1
            },
            postingSchedule: {
                optimal: ['09:00', '12:00', '18:00', '21:00'],
                frequency: '3-5 per day'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'youtube',
            name: 'YouTube',
            contentTypes: ['long_video', 'short_video'],
            lengthRules: {
                title: { min: 30, max: 100, optimal: 60 },
                description: { min: 200, max: 5000, optimal: 500 },
                shorts: { maxSeconds: 60 }
            },
            interactionStyle: {
                tone: 'informative',
                emojiUsage: 'moderate',
                hashtagStrategy: 'seo_focused'
            },
            seoRules: {
                keywordDensity: 0.03,
                thumbnailOptimization: true,
                closedCaptions: true
            },
            kpiWeights: {
                subscribers: 0.3,
                watchTime: 0.25,
                views: 0.2,
                likes: 0.15,
                comments: 0.1
            },
            postingSchedule: {
                optimal: ['14:00', '18:00'],
                frequency: '2-3 per week'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'facebook',
            name: 'Facebook',
            contentTypes: ['image', 'video', 'text', 'link'],
            lengthRules: {
                post: { min: 40, max: 63206, optimal: 250 },
                headline: { max: 255 }
            },
            interactionStyle: {
                tone: 'friendly',
                emojiUsage: 'high',
                hashtagStrategy: 'minimal'
            },
            seoRules: {
                keywordDensity: 0.02
            },
            kpiWeights: {
                engagement: 0.3,
                shares: 0.25,
                reach: 0.2,
                reactions: 0.15,
                comments: 0.1
            },
            postingSchedule: {
                optimal: ['13:00', '15:00', '19:00'],
                frequency: '1-2 per day'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'tiktok',
            name: 'TikTok',
            contentTypes: ['short_video'],
            lengthRules: {
                video: { minSeconds: 15, maxSeconds: 180, optimalSeconds: 30 },
                caption: { max: 2200, optimal: 150 },
                hashtags: { min: 3, max: 10, optimal: 5 }
            },
            interactionStyle: {
                tone: 'entertaining',
                emojiUsage: 'high',
                hashtagStrategy: 'trending_viral'
            },
            seoRules: {
                keywordDensity: 0.025,
                soundOptimization: true
            },
            kpiWeights: {
                views: 0.3,
                shares: 0.25,
                likes: 0.2,
                comments: 0.15,
                completionRate: 0.1
            },
            postingSchedule: {
                optimal: ['11:00', '16:00', '20:00'],
                frequency: '1-3 per day'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'pinterest',
            name: 'Pinterest',
            contentTypes: ['image', 'video'],
            lengthRules: {
                title: { min: 40, max: 100, optimal: 60 },
                description: { min: 100, max: 500, optimal: 200 }
            },
            interactionStyle: {
                tone: 'inspirational',
                emojiUsage: 'moderate',
                hashtagStrategy: 'descriptive_seo'
            },
            seoRules: {
                keywordDensity: 0.04,
                altTextRequired: true,
                richPins: true
            },
            kpiWeights: {
                saves: 0.35,
                clicks: 0.25,
                impressions: 0.2,
                closeups: 0.15,
                engagement: 0.05
            },
            postingSchedule: {
                optimal: ['20:00', '21:00'],
                frequency: '5-10 per day'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'reddit',
            name: 'Reddit',
            contentTypes: ['text', 'link', 'image', 'video'],
            lengthRules: {
                title: { min: 20, max: 300, optimal: 100 },
                post: { min: 100, max: 40000, optimal: 500 }
            },
            interactionStyle: {
                tone: 'authentic',
                emojiUsage: 'minimal',
                hashtagStrategy: 'none'
            },
            seoRules: {
                keywordDensity: 0.02,
                subredditRules: true
            },
            kpiWeights: {
                upvotes: 0.35,
                comments: 0.3,
                awards: 0.2,
                shares: 0.1,
                crossposts: 0.05
            },
            postingSchedule: {
                optimal: ['09:00', '12:00', '18:00'],
                frequency: '1-2 per week per subreddit'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'threads',
            name: 'Threads',
            contentTypes: ['short_text', 'image'],
            lengthRules: {
                post: { max: 500, optimal: 280 }
            },
            interactionStyle: {
                tone: 'conversational',
                emojiUsage: 'moderate',
                hashtagStrategy: 'minimal'
            },
            seoRules: {
                keywordDensity: 0.02
            },
            kpiWeights: {
                replies: 0.3,
                likes: 0.25,
                reposts: 0.2,
                quotes: 0.15,
                reach: 0.1
            },
            postingSchedule: {
                optimal: ['10:00', '14:00', '19:00'],
                frequency: '2-4 per day'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'snapchat',
            name: 'Snapchat',
            contentTypes: ['short_video', 'image', 'story'],
            lengthRules: {
                snap: { maxSeconds: 60 },
                story: { maxSeconds: 180 }
            },
            interactionStyle: {
                tone: 'casual',
                emojiUsage: 'very_high',
                hashtagStrategy: 'none'
            },
            seoRules: {},
            kpiWeights: {
                views: 0.35,
                screenshots: 0.25,
                replies: 0.2,
                shares: 0.15,
                storyCompletion: 0.05
            },
            postingSchedule: {
                optimal: ['12:00', '17:00', '21:00'],
                frequency: '3-5 per day'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'discord',
            name: 'Discord',
            contentTypes: ['text', 'image', 'video', 'link'],
            lengthRules: {
                message: { max: 2000, optimal: 500 },
                embed: { titleMax: 256, descriptionMax: 4096 }
            },
            interactionStyle: {
                tone: 'community_focused',
                emojiUsage: 'high',
                hashtagStrategy: 'none'
            },
            seoRules: {},
            kpiWeights: {
                reactions: 0.3,
                replies: 0.3,
                mentions: 0.2,
                activeMembers: 0.15,
                messageFrequency: 0.05
            },
            postingSchedule: {
                optimal: ['continuous'],
                frequency: 'real-time engagement'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        },
        {
            id: 'telegram',
            name: 'Telegram',
            contentTypes: ['text', 'image', 'video', 'document'],
            lengthRules: {
                message: { max: 4096, optimal: 500 },
                caption: { max: 1024 }
            },
            interactionStyle: {
                tone: 'informative',
                emojiUsage: 'moderate',
                hashtagStrategy: 'channel_specific'
            },
            seoRules: {},
            kpiWeights: {
                views: 0.35,
                forwards: 0.25,
                reactions: 0.2,
                replies: 0.15,
                channelGrowth: 0.05
            },
            postingSchedule: {
                optimal: ['09:00', '13:00', '18:00'],
                frequency: '1-3 per day'
            },
            version: '1.0.0',
            createdAt: timestamp,
            updatedAt: timestamp
        }
    ];

    try {
        const batch = db.batch();

        channelProfiles.forEach(profile => {
            const docRef = db.collection('channelProfiles').doc(profile.id);
            batch.set(docRef, profile);
            console.log(`  ✅ Queued: ${profile.name}`);
        });

        await batch.commit();
        console.log(`\n✨ Successfully created ${channelProfiles.length} channel profiles!`);
        alert(`✅ ${channelProfiles.length} channel profiles created successfully!`);

    } catch (error) {
        console.error("❌ Error creating profiles:", error);
        alert(`Error: ${error.message}`);
    }
})();
