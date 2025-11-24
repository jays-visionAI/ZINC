// Seed Script: Create initial industries
// Run this once in browser console or as a Cloud Function

(async function seedIndustries() {
    console.log("🏭 Starting industries seed...");

    if (typeof db === 'undefined') {
        console.error("❌ Firestore 'db' not found. Make sure Firebase is initialized.");
        return;
    }

    const industries = [
        { key: "tech_saas", labelEn: "Technology & SaaS", labelKo: "IT 및 SaaS", order: 1, allowCustomInput: false },
        { key: "ecommerce", labelEn: "E-commerce & Retail", labelKo: "이커머스 및 리테일", order: 2, allowCustomInput: false },
        { key: "finance_fintech", labelEn: "Finance & Fintech", labelKo: "금융 및 핀테크", order: 3, allowCustomInput: false },
        { key: "health_wellness", labelEn: "Health & Wellness", labelKo: "건강 및 웰니스", order: 4, allowCustomInput: false },
        { key: "education", labelEn: "Education & EdTech", labelKo: "교육 및 에듀테크", order: 5, allowCustomInput: false },
        { key: "entertainment", labelEn: "Entertainment & Media", labelKo: "엔터테인먼트 및 미디어", order: 6, allowCustomInput: false },
        { key: "real_estate", labelEn: "Real Estate", labelKo: "부동산", order: 7, allowCustomInput: false },
        { key: "travel_hospitality", labelEn: "Travel & Hospitality", labelKo: "여행 및 숙박", order: 8, allowCustomInput: false },
        { key: "fashion_beauty", labelEn: "Fashion & Beauty", labelKo: "패션 및 뷰티", order: 9, allowCustomInput: false },
        { key: "food_beverage", labelEn: "Food & Beverage", labelKo: "식음료 (F&B)", order: 10, allowCustomInput: false },
        { key: "blockchain_crypto", labelEn: "Blockchain & Crypto", labelKo: "블록체인 및 크립토", order: 11, allowCustomInput: false },
        { key: "other", labelEn: "Other (Please specify)", labelKo: "기타 (직접 입력)", order: 99, allowCustomInput: true }
    ];

    try {
        // Check if industries already exist
        const existingSnapshot = await db.collection("industries").limit(1).get();

        if (!existingSnapshot.empty) {
            const confirm = window.confirm(
                `⚠️  Industries collection already has data.\n\nDo you want to add ${industries.length} industries?\n\n(Click Cancel to skip seeding)`
            );

            if (!confirm) {
                console.log("ℹ️  Seeding cancelled by user");
                return;
            }
        }

        const batch = db.batch();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        industries.forEach(ind => {
            // Use key as doc ID for easier reference
            const docRef = db.collection("industries").doc(ind.key);
            batch.set(docRef, {
                key: ind.key,
                labelEn: ind.labelEn,
                labelKo: ind.labelKo,
                order: ind.order,
                allowCustomInput: ind.allowCustomInput,
                isActive: true,
                createdAt: timestamp,
                updatedAt: timestamp
            });

            console.log(`✅ Queued: ${ind.labelEn}`);
        });

        await batch.commit();
        console.log(`✨ Successfully seeded ${industries.length} industries!`);

        alert(`✅ Seeded ${industries.length} industries successfully!`);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        alert(`❌ Seeding failed: ${error.message}`);
    }
})();
