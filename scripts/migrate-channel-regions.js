/**
 * Migration Script: Add 'region' field to channelProfiles
 * 
 * This script updates existing channelProfiles documents in Firestore
 * adding a 'region' field (GLOBAL or KR) to enable localized filtering.
 */

(async function migrateChannelRegions() {
    console.log("🚀 Starting Channel Profiles Region Migration...");

    if (typeof db === 'undefined' && typeof firebase !== 'undefined') {
        const db = firebase.firestore();
    }

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found. Please run this in the ZINC Console.");
        return;
    }

    const krChannelIds = [
        "naver", "naver_blog", "naver_smartstore", "naver_searchad", "naver_map", "naver_navi",
        "kakaotalk", "kakao_map", "kakao_navi",
        "coupang", "11st", "gmarket", "ssg", "baemin", "yogiyo", "tmap"
    ];

    try {
        const snapshot = await db.collection('channelProfiles').get();
        const batch = db.batch();
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const channelId = doc.id;
            const region = krChannelIds.includes(channelId) ? "KR" : "GLOBAL";

            console.log(`📝 Updating ${channelId}: region -> ${region}`);
            batch.update(doc.ref, {
                region: region,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            count++;
        });

        if (count > 0) {
            await batch.commit();
            console.log(`✨ Migration complete! Updated ${count} channels.`);
        } else {
            console.log("ℹ️ No channels found to update.");
        }
    } catch (error) {
        console.error("❌ Migration failed:", error);
    }
})();
