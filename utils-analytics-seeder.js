import { db } from './firebase-config.js';
import {
    collection,
    doc,
    setDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

/**
 * Analytics Seeder
 * Generates 30 days of realistic dummy data for the dashboard.
 */
export const AnalyticsSeeder = {

    async seedInitialData(projectId) {
        if (!projectId) return;

        console.log(`Starting seeding for project: ${projectId}`);
        const batch = writeBatch(db);

        // 1. Generate Daily Analytics (Past 30 Days)
        const categories = this.generateDailyData(30);

        categories.forEach(item => {
            const docRef = doc(db, 'projects', projectId, 'analytics', item.date);
            batch.set(docRef, item);
        });

        // 2. Generate Top Content (5 Items)
        const contentItems = this.generateContentData(projectId);
        contentItems.forEach(item => {
            const docRef = doc(db, 'projects', projectId, 'content_performance', item.contentId);
            batch.set(docRef, item);
        });

        // Commit all
        await batch.commit();
        console.log("Seeding complete.");
    },

    generateDailyData(days) {
        const data = [];
        const today = new Date();

        // Base values
        let followers = 12000;

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Random daily growth
            const dailyFollowers = Math.floor(Math.random() * 20) + 5;
            followers += dailyFollowers;

            // Random Metrics
            const reach = 2000 + Math.floor(Math.random() * 1000);
            const engagement = 150 + Math.floor(Math.random() * 50);

            data.push({
                date: dateStr,
                totalReach: reach,
                totalEngagement: engagement,
                followers: followers,
                platforms: {
                    instagram: { reach: Math.floor(reach * 0.6), engagement: Math.floor(engagement * 0.7) },
                    twitter: { reach: Math.floor(reach * 0.2), engagement: Math.floor(engagement * 0.2) },
                    linkedin: { reach: Math.floor(reach * 0.2), engagement: Math.floor(engagement * 0.1) }
                },
                insights: (i === 0) ? [ // Only latest day needs insights for now
                    { type: 'best_time', value: '화요일 오전 9시', confidence: 0.85 },
                    { type: 'hashtag', value: '#클린뷰티', confidence: 0.92 }
                ] : []
            });
        }
        return data;
    },

    generateContentData(projectId) {
        return [
            {
                contentId: 'seed_c_1',
                projectId,
                title: "클린뷰티 캠페인 런칭",
                emoji: "🔥",
                platform: "instagram",
                content: { caption: "...", mediaUrls: [] },
                performance: { reach: 45230, engagementRate: 8.2, trend: 'up' },
                createdAt: new Date().toISOString()
            },
            {
                contentId: 'seed_c_2',
                projectId,
                title: "여름 스킨케어 가이드 5선",
                emoji: "📸",
                platform: "instagram",
                content: { caption: "...", mediaUrls: [] },
                performance: { reach: 32150, engagementRate: 6.8, trend: 'up' },
                createdAt: new Date().toISOString()
            },
            {
                contentId: 'seed_c_3',
                projectId,
                title: "고객 리얼 후기 모음",
                emoji: "💬",
                platform: "twitter",
                content: { caption: "...", mediaUrls: [] },
                performance: { reach: 28400, engagementRate: 5.4, trend: 'stable' },
                createdAt: new Date().toISOString()
            }
        ];
    }
};
