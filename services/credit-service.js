
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

    // --- Dynamic Cost Management ---

    // Cache for cost configuration
    _costCache: null,
    _cacheTime: 0,
    CACHE_DURATION: 300000, // 5 minutes

    /**
     * Get the credit cost for a specific action.
     * Fetches from Firestore with caching.
     */
    async getCost(actionId) {
        // Return cached if valid
        const now = Date.now();
        if (this._costCache && (now - this._cacheTime < this.CACHE_DURATION)) {
            if (this._costCache.has(actionId)) {
                return this._costCache.get(actionId);
            }
        }

        // Fetch from Firestore
        const db = firebase.firestore();
        try {
            // Check specific action doc
            const doc = await db.collection('system_credit_costs').doc(actionId).get();
            if (doc.exists) {
                const cost = doc.data().cost;
                // Init cache if needed
                if (!this._costCache) this._costCache = new Map();
                this._costCache.set(actionId, cost);
                this._cacheTime = now;
                return cost;
            }

            // Fetch ALL if cache empty/expired (optimization)
            if (!this._costCache) {
                await this.refreshCosts();
                if (this._costCache.has(actionId)) return this._costCache.get(actionId);
            }

            console.warn(`[CreditService] Cost not defined for '${actionId}'. Using default 0.`);
            return 0;

        } catch (error) {
            console.error(`[CreditService] Error fetching cost for ${actionId}:`, error);
            return 0; // Fail safe
        }
    },

    /**
     * Force refresh the cost cache.
     */
    async refreshCosts() {
        const db = firebase.firestore();
        const snapshot = await db.collection('system_credit_costs').get();
        this._costCache = new Map();
        snapshot.forEach(doc => {
            this._costCache.set(doc.id, doc.data().cost);
        });
        this._cacheTime = Date.now();
        console.log(`[CreditService] Costs refreshed. Loaded ${this._costCache.size} actions.`);
    },

    /**
     * Check if user has sufficient credits.
     * @returns {Promise<boolean>}
     */
    async hasSufficientBalance(userId, actionId) {
        const cost = await this.getCost(actionId);
        if (cost === 0) return true;

        const balance = await this.getBalance(userId);
        return balance >= cost;
    },

    /**
     * Deduct credits for an action.
     * Uses atomic transaction.
     * @returns {Promise<{success: boolean, remaining: number, cost: number}>}
     */
    async deductCredits(userId, actionId, metadata = {}) {
        const db = firebase.firestore();
        const cost = await this.getCost(actionId);

        if (cost === 0) {
            return { success: true, remaining: await this.getBalance(userId), cost: 0 };
        }

        try {
            return await db.runTransaction(async (transaction) => {
                const userRef = db.collection('users').doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) throw new Error("User not found");

                const currentBalance = userDoc.data().creditBalance || 0;

                if (currentBalance < cost) {
                    throw new Error("Insufficient credits");
                }

                const newBalance = currentBalance - cost;

                // 1. Update Balance
                transaction.update(userRef, {
                    creditBalance: newBalance,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                });

                // 2. Log Transaction
                const transactionRef = db.collection('credit_transactions').doc();
                transaction.set(transactionRef, {
                    userId: userId,
                    type: 'usage',
                    actionId: actionId,
                    cost: cost,
                    balanceAfter: newBalance,
                    metadata: metadata, // Action specific details (e.g. project name)
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });

                return { success: true, remaining: newBalance, cost: cost };
            });

        } catch (error) {
            console.error(`[CreditService] Deduction failed (${actionId}):`, error);
            throw error; // Propagate to UI to show "Low Balance" modal
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
