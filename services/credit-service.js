
// services/credit-service.js
// Handles credit balance, top-ups, and bonus calculations.

window.CreditService = {
    /**
     * Top up a user's credit balance based on a purchased pack.
     * Applies bonus rates defined in the user's subscription plan.
     * @param {string} userId - The user's ID.
     * @param {string} packId - The ID of the top-up pack (e.g., 'pack_1000').
     */
    async topUpCredits(userId, packId) {
        const db = firebase.firestore();

        try {
            // 1. Fetch required data (User, Plan, Pack)
            const userRef = db.collection('users').doc(userId);
            const packRef = db.collection('system_topup_packs').doc(packId);

            const [userDoc, packDoc] = await Promise.all([
                userRef.get(),
                packRef.get()
            ]);

            if (!userDoc.exists) throw new Error("User not found");
            if (!packDoc.exists) throw new Error("Pack not found");

            const userData = userDoc.data();
            const packData = packDoc.data();

            // Default to 'starter' if no tier set
            const userTier = userData.subscriptionTier || 'starter';

            // 2. Fetch Plan to get Bonus Rate
            const planDoc = await db.collection('system_pricing_plans').doc(userTier).get();
            const planData = planDoc.exists ? planDoc.data() : { bonusRate: 0 };
            const bonusRate = planData.bonusRate || 0;

            // 3. Calculate Final Credits
            const baseCredits = packData.baseCredits;
            const bonusCredits = Math.floor(baseCredits * bonusRate);
            const totalCredits = baseCredits + bonusCredits;

            console.log(`[CreditService] TopUp: ${baseCredits} + ${bonusCredits} (Bonus ${bonusRate * 100}%) = ${totalCredits}`);

            // 4. Transaction to safely update balance
            await db.runTransaction(async (transaction) => {
                const freshUserDoc = await transaction.get(userRef);
                const currentBalance = freshUserDoc.data().creditBalance || 0;
                const newBalance = currentBalance + totalCredits;

                transaction.update(userRef, {
                    creditBalance: newBalance,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Optional: Create Transaction Record
                const transactionRef = db.collection('credit_transactions').doc();
                transaction.set(transactionRef, {
                    userId: userId,
                    type: 'topup',
                    packId: packId,
                    amountPaid: packData.price,
                    creditsAdded: totalCredits,
                    bonusApplied: bonusCredits,
                    planAtTime: userTier,
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            return { success: true, newCredits: totalCredits, bonus: bonusCredits };

        } catch (error) {
            console.error("TopUp Failed:", error);
            throw error;
        }
    },

    /**
     * Get user's current credit balance.
     */
    async getBalance(userId) {
        const db = firebase.firestore();
        const doc = await db.collection('users').doc(userId).get();
        return doc.exists ? (doc.data().creditBalance || 0) : 0;
    }
};
