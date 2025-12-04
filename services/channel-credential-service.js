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
    async _testTwitter(credentials) {
        // Twitter API v2 verification
        const { apiKey, apiSecret, accessToken, accessTokenSecret } = credentials;

        if (!apiKey || !accessToken) {
            throw new Error('Missing required credentials');
        }

        // Simple verification endpoint
        const response = await fetch('https://api.twitter.com/2/users/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return {
                success: true,
                message: `Connected as @${data.data?.username || 'unknown'}`,
                latency: 0
            };
        } else {
            throw new Error(`Twitter API error: ${response.status}`);
        }
    },

    async _testInstagram(credentials) {
        const { accessToken, pageId } = credentials;

        if (!accessToken) {
            throw new Error('Missing access token');
        }

        // Instagram Graph API verification
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
        );

        if (response.ok) {
            const data = await response.json();
            return {
                success: true,
                message: 'Instagram connection verified',
                latency: 0
            };
        } else {
            throw new Error(`Instagram API error: ${response.status}`);
        }
    },

    async _testYouTube(credentials) {
        const { apiKey } = credentials;

        if (!apiKey) {
            throw new Error('Missing API key');
        }

        // YouTube Data API v3 verification
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=${apiKey}`
        );

        if (response.ok) {
            return {
                success: true,
                message: 'YouTube API key verified',
                latency: 0
            };
        } else {
            throw new Error(`YouTube API error: ${response.status}`);
        }
    },

    async _testLinkedIn(credentials) {
        const { accessToken } = credentials;

        if (!accessToken) {
            throw new Error('Missing access token');
        }

        // LinkedIn API verification
        const response = await fetch('https://api.linkedin.com/v2/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            return {
                success: true,
                message: 'LinkedIn connection verified',
                latency: 0
            };
        } else {
            throw new Error(`LinkedIn API error: ${response.status}`);
        }
    },

    async _testTikTok(credentials) {
        const { accessToken, clientKey } = credentials;

        if (!accessToken) {
            throw new Error('Missing access token');
        }

        // TikTok API verification
        const response = await fetch('https://open-api.tiktok.com/oauth/userinfo/', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            return {
                success: true,
                message: 'TikTok connection verified',
                latency: 0
            };
        } else {
            throw new Error(`TikTok API error: ${response.status}`);
        }
    }
};
