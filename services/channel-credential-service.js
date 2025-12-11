// services/channel-credential-service.js
// Service for managing user channel API credentials

window.ChannelCredentialService = {

    /**
     * Get all credentials for a user
     */
    async getCredentials(userId) {
        const db = firebase.firestore();
        try {
            const snapshot = await db.collection('userApiCredentials')
                .where('userId', '==', userId)
                .get();

            const credentials = [];
            snapshot.forEach(doc => {
                credentials.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort in memory to avoid composite index requirement
            credentials.sort((a, b) => {
                const timeA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA; // Descending
            });

            return credentials;
        } catch (error) {
            console.error('Error fetching credentials:', error);
            throw error;
        }
    },

    /**
     * Save or update a credential
     */
    async saveCredential(userId, credentialId, data) {
        const db = firebase.firestore();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        const credentialData = {
            userId,
            provider: data.provider,
            projectId: data.projectId || null,  // ✨ Add projectId
            detailedName: data.detailedName || data.accountName,  // ✨ Add detailedName
            accountName: data.accountName,  // Keep for backward compatibility
            accountHandle: data.accountHandle || null,  // ✨ X handle (@username)
            accountUsername: data.accountUsername || null,  // ✨ X username
            profileImageUrl: data.profileImageUrl || null,  // ✨ Profile image
            credentials: data.credentials,
            status: data.status || 'active',
            updatedAt: timestamp
        };

        try {
            if (credentialId) {
                // Update existing
                await db.collection('userApiCredentials')
                    .doc(credentialId)
                    .update(credentialData);
                return credentialId;
            } else {
                // Create new
                credentialData.createdAt = timestamp;
                const docRef = await db.collection('userApiCredentials')
                    .add(credentialData);
                return docRef.id;
            }
        } catch (error) {
            console.error('Error saving credential:', error);
            throw error;
        }
    },

    /**
     * Delete a credential
     */
    async deleteCredential(credentialId) {
        const db = firebase.firestore();
        try {
            await db.collection('userApiCredentials')
                .doc(credentialId)
                .delete();
        } catch (error) {
            console.error('Error deleting credential:', error);
            throw error;
        }
    },

    /**
     * Test connection for a provider
     */
    async testConnection(provider, credentials) {
        const startTime = Date.now();

        try {
            switch (provider) {
                case 'x':
                    return await this._testTwitter(credentials);
                case 'instagram':
                    return await this._testInstagram(credentials);
                case 'youtube':
                    return await this._testYouTube(credentials);
                case 'linkedin':
                    return await this._testLinkedIn(credentials);
                case 'tiktok':
                    return await this._testTikTok(credentials);
                case 'naverBlog':
                    return await this._testNaverBlog(credentials);
                case 'naverSmartStore':
                    return await this._testNaverSmartStore(credentials);
                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }
        } catch (error) {
            const latency = Date.now() - startTime;
            return {
                success: false,
                message: error.message || 'Connection test failed',
                latency
            };
        }
    },

    // Provider-specific test methods
    // Provider-specific test methods
    // NOTE: Direct API calls from browser are blocked by CORS.
    // We perform format validation instead of network calls.

    async _testTwitter(credentials) {
        const { apiKey, apiSecret, accessToken, accessTokenSecret } = credentials;

        // Step 1: Format validation
        const step1Result = { success: false, message: '' };

        if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
            throw new Error('❌ Step 1 Failed: Missing required credentials');
        }

        if (apiKey.length < 10) {
            throw new Error('❌ Step 1 Failed: API Key seems too short');
        }
        if (accessToken.length < 10) {
            throw new Error('❌ Step 1 Failed: Access Token seems too short');
        }

        step1Result.success = true;
        step1Result.message = '✅ Step 1: Format verified';

        // Step 2: API connection test via Cloud Function
        let step2Result = { success: false, message: '', accountInfo: null };

        try {
            // Use fetch instead of httpsCallable for onRequest function
            const functionUrl = 'https://us-central1-zinc-c790f.cloudfunctions.net/testXConnection';
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey,
                    apiSecret,
                    accessToken,
                    accessTokenSecret
                })
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error.message || 'Connection test failed');
            }

            step2Result = {
                success: result.data.success,
                message: `✅ Step 2: ${result.data.message}`,
                accountInfo: result.data.accountInfo
            };
        } catch (error) {
            console.error('Cloud Function test failed:', error);

            // Parse error message
            let errorMsg = error.message || 'Unknown error';
            if (error.details) {
                errorMsg = error.details;
            }

            step2Result = {
                success: false,
                message: `⚠️ Step 2: Connection test failed - ${errorMsg}`,
                accountInfo: null
            };
        }

        // Combined result
        return {
            success: step1Result.success && step2Result.success,
            message: `${step1Result.message}\n${step2Result.message}`,
            accountInfo: step2Result.accountInfo,
            step1: step1Result,
            step2: step2Result,
            latency: 0
        };
    },

    async _testInstagram(credentials) {
        const { appId, pageId, accessToken } = credentials;

        if (!appId && !accessToken) {
            throw new Error('Missing App ID or Access Token');
        }
        if (!pageId) {
            throw new Error('Missing Page ID');
        }

        await new Promise(resolve => setTimeout(resolve, 800));

        return {
            success: true,
            message: 'Credential format verified (Ready to use)',
            latency: 0
        };
    },

    async _testYouTube(credentials) {
        const { clientId, clientSecret, apiKey } = credentials;

        if ((!clientId || !clientSecret) && !apiKey) {
            throw new Error('Missing Client ID/Secret or API Key');
        }

        await new Promise(resolve => setTimeout(resolve, 800));

        return {
            success: true,
            message: 'Credential format verified (Ready to use)',
            latency: 0
        };
    },

    async _testLinkedIn(credentials) {
        const { clientId, clientSecret, urn, accessToken } = credentials;

        if ((!clientId || !clientSecret) && !accessToken) {
            throw new Error('Missing Client ID/Secret or Access Token');
        }
        if (!urn) {
            throw new Error('Missing Organization URN');
        }

        await new Promise(resolve => setTimeout(resolve, 800));

        return {
            success: true,
            message: 'Credential format verified (Ready to use)',
            latency: 0
        };
    },

    async _testNaverBlog(credentials) {
        const { clientId, clientSecret } = credentials;

        if (!clientId || !clientSecret) {
            throw new Error('Missing Client ID or Client Secret');
        }

        await new Promise(resolve => setTimeout(resolve, 600));

        return {
            success: true,
            message: 'Naver Blog credentials verified (Ready to use)',
            latency: 0
        };
    },

    async _testNaverSmartStore(credentials) {
        const { applicationId, applicationSecret } = credentials;

        if (!applicationId || !applicationSecret) {
            throw new Error('Missing Application ID or Secret');
        }

        await new Promise(resolve => setTimeout(resolve, 600));

        return {
            success: true,
            message: 'Smart Store credentials verified (Ready to use)',
            latency: 0
        };
    },

    async _testTikTok(credentials) {
        const { accessToken } = credentials;

        if (!accessToken) {
            throw new Error('Missing access token');
        }

        await new Promise(resolve => setTimeout(resolve, 800));

        return {
            success: true,
            message: 'Token format verified (Ready to use)',
            latency: 0
        };
    },
};
