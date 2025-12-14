/**
 * ZINC Firebase Cloud Functions
 * Handles secure API calls to LLM providers (OpenAI, etc.)
 */

const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest, onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const corsMiddleware = require('cors')({ origin: true });

// Allowed origins for CORS - using true to allow all for now
const ALLOWED_ORIGINS = true;

// Initialize Admin SDK with explicit project config
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'zinc-c790f'
});

const db = admin.firestore();

// ZYNK Core Modules (Instances)
const { StrategyPlanner } = require('./zyncCore/cognitiveRouter');
const { AdversarialLoop } = require('./zyncCore/theArena');
const { FeedbackLoop } = require('./zyncCore/feedbackLoop');

// LLM SDKs
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');

// PRD 11.6 - LLM Router
const { LLMRouter } = require('./llmRouter');
const llmRouter = new LLMRouter(db);

/**
 * Call OpenAI Chat Completions API
 * This function securely proxies requests to OpenAI from the frontend
 */
exports.callOpenAI = functions.https.onCall(async (data, context) => {
    // Check authentication - [DISABLED for Testing]
    // if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    // }

    // Normalize data payload (handle potential nesting)
    const payload = (data && data.data) ? data.data : data;
    const { provider, model, messages, temperature, maxTokens } = payload;

    if (!messages || !Array.isArray(messages)) {
        throw new functions.https.HttpsError('invalid-argument', 'Messages array is required');
    }

    try {
        // Get API key from systemLLMProviders
        const apiKey = await getSystemApiKey(provider || 'openai');

        if (!apiKey) {
            throw new functions.https.HttpsError('failed-precondition', 'API key not configured for provider: ' + provider);
        }

        // Dynamic import for OpenAI (ES Module)
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: model || 'gpt-4',
            messages: messages,
            temperature: temperature || 0.7,
            max_tokens: maxTokens || 2000
        });

        return {
            success: true,
            content: response.choices[0]?.message?.content || '',
            usage: response.usage,
            model: response.model
        };

    } catch (error) {
        console.error('[callOpenAI] Error:', error.message);

        if (error.code === 'insufficient_quota') {
            throw new functions.https.HttpsError('resource-exhausted', 'OpenAI API quota exceeded');
        }

        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Test LLM Provider Connection
 * Tests if the stored API key is valid for a given provider
 */
exports.testLLMProviderConnection = functions.https.onCall(async (data, context) => {
    // Handle nested data structure (v2 compatibility)
    const payload = (data && data.data) ? data.data : data;
    const { providerId, providerType } = payload || {};

    console.log('[testLLMProviderConnection] Parsed:', providerId, providerType);

    if (!providerId || !providerType) {
        throw new functions.https.HttpsError('invalid-argument', 'providerId and providerType are required');
    }

    try {
        // Get the provider's API key from Firestore
        const providerDoc = await admin.firestore().collection('systemLLMProviders').doc(providerId).get();

        if (!providerDoc.exists) {
            return { success: false, error: 'Provider not found' };
        }

        const providerData = providerDoc.data();
        const apiKey = getApiKeyFromData(providerData);

        if (!apiKey) {
            return { success: false, error: 'No API key configured' };
        }

        // Test the connection based on provider type
        let testResult;

        switch (providerType.toLowerCase()) {
            case 'openai':
                testResult = await testOpenAIConnectionQuick(apiKey);
                break;
            case 'gemini':
                testResult = await testGeminiConnectionQuick(apiKey);
                break;
            case 'anthropic':
                testResult = await testAnthropicConnectionQuick(apiKey);
                break;
            default:
                return { success: false, error: `Unknown provider type: ${providerType}` };
        }

        return testResult;

    } catch (error) {
        console.error('[testLLMProviderConnection] Error:', error);
        return { success: false, error: error.message };
    }
});

async function testOpenAIConnectionQuick(apiKey) {
    try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });
        await openai.models.list();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function testGeminiConnectionQuick(apiKey) {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        // Just verify we can create the model - don't make actual call
        return { success: !!model };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function testAnthropicConnectionQuick(apiKey) {
    try {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey });
        // Check if client is created successfully
        return { success: !!client };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Execute a single sub-agent
 * Called from the frontend AgentExecutionService
 */
exports.executeSubAgent = onCall({
    cors: true,
    timeoutSeconds: 300,
    memory: '1GiB'
}, async (request) => {
    const data = request.data;
    // Check authentication - [DISABLED for Testing]
    // if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    // }

    // Normalize data payload
    const payload = (data && data.data) ? data.data : data;

    const {
        projectId,
        teamId,
        runId,
        subAgentId,
        systemPrompt,
        taskPrompt,
        previousOutputs,
        provider,
        model,
        temperature
    } = payload;

    if (!projectId || !teamId || !subAgentId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    try {
        // Get API key
        const apiKey = await getSystemApiKey(provider || 'openai');

        if (!apiKey) {
            throw new functions.https.HttpsError('failed-precondition', 'API key not configured');
        }

        // Build messages
        const messages = [
            { role: 'system', content: systemPrompt || 'You are a helpful assistant.' }
        ];

        // Add previous outputs as context
        if (previousOutputs && Array.isArray(previousOutputs)) {
            previousOutputs.forEach(output => {
                messages.push({
                    role: 'assistant',
                    content: `[Previous Agent Output - ${output.role}]:\n${output.content}`
                });
            });
        }

        // Add the task prompt
        messages.push({ role: 'user', content: taskPrompt || 'Please generate content.' });

        // Call LLM based on provider
        const llmResult = await callLLM(provider || 'openai', model, messages, temperature);
        const output = llmResult.content;

        // Log execution to Firestore (optional)
        await db.collection('projects').doc(projectId)
            .collection('agentRuns').doc(runId)
            .collection('subAgentLogs').add({
                subAgentId,
                status: 'completed',
                output,
                provider: provider || 'openai',
                model: llmResult.model,
                usage: llmResult.usage,
                executedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        return {
            success: true,
            output,
            usage: llmResult.usage,
            model: llmResult.model
        };

    } catch (error) {
        console.error('[executeSubAgent] Error:', error.message);

        // Log error
        if (runId && projectId) {
            await db.collection('projects').doc(projectId)
                .collection('agentRuns').doc(runId)
                .collection('subAgentLogs').add({
                    subAgentId,
                    status: 'failed',
                    error: error.message,
                    executedAt: admin.firestore.FieldValue.serverTimestamp()
                });
        }

        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * PRD 11.6 - Route LLM Request
 * Intelligent routing based on feature policies with Booster support
 */
exports.routeLLM = functions.https.onCall(async (data, context) => {
    const payload = (data && data.data) ? data.data : data;

    const {
        feature,
        qualityTier = 'DEFAULT',
        systemPrompt,
        userPrompt,
        messages: rawMessages,
        temperature = 0.7,
        projectId,
        metadata = {}
    } = payload;

    // Get user ID from auth context
    const userId = context.auth?.uid;

    if (!feature) {
        throw new functions.https.HttpsError('invalid-argument', 'Feature ID is required');
    }

    if (!rawMessages && !userPrompt) {
        throw new functions.https.HttpsError('invalid-argument', 'Either messages or userPrompt is required');
    }

    console.log(`[routeLLM] Request: feature=${feature}, tier=${qualityTier}, userId=${userId}`);

    // Build messages array (Move outside try-catch for scope access)
    let messages = rawMessages;
    if (!messages) {
        messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: userPrompt });
    }

    try {
        // Route through LLMRouter
        const result = await llmRouter.route({
            feature,
            qualityTier: qualityTier.toUpperCase(),
            messages,
            temperature,
            userId,
            projectId,
            callLLM  // Pass the existing callLLM function
        });

        // Optionally deduct credits (if userId is provided)
        let creditResult = null;
        if (userId && result.routing.creditCost > 0) {
            try {
                creditResult = await llmRouter.deductCredits(userId, result.routing.creditCost, {
                    feature,
                    qualityTier,
                    model: result.routing.model,
                    projectId
                });
            } catch (creditError) {
                console.warn('[routeLLM] Credit deduction failed:', creditError.message);
                // Continue without failing - credit can be deducted later
            }
        }

        return {
            success: true,
            content: result.content,
            model: result.model,
            usage: result.usage,
            routing: result.routing,
            credits: creditResult
        };

    } catch (error) {
        console.error('[routeLLM] ❌ Primary Generation Error:', error.message);

        // AUTO-FAILOVER: Retry with OpenAI if primary fails (e.g. Gemini 404/429/500)
        const isRetryable = error.message.includes('404') ||
            error.message.includes('429') ||
            error.message.includes('500') ||
            error.message.includes('400') ||
            error.message.includes('not found') ||
            error.message.includes('fetch failed') ||
            error.message.includes('Unsupported value');

        if (isRetryable) {
            console.warn('[routeLLM] ⚠️ Initiating Auto-Failover to OpenAI...');

            try {
                // Determine fallback model based on Quality Tier
                // BOOST -> gemini-3.0-pro (Premium) or openai gpt-4o
                // DEFAULT -> gemini-2.0-flash-exp (Standard/Speed)
                // User requested to prioritize Gemini/Banana ecosystem.

                const fallbackProvider = 'google';
                const fallbackModel = (qualityTier === 'BOOST') ? 'gemini-3.0-pro' : 'gemini-2.0-flash-exp';

                // Retry Generation
                let fallbackTemp = temperature;
                // Temperature adjustments for specific models if needed

                const fallbackResult = await callLLM(fallbackProvider, fallbackModel, messages, fallbackTemp);

                console.log(`[routeLLM] ✅ Auto-Failover Success using ${fallbackModel}`);

                return {
                    success: true,
                    content: fallbackResult.content,
                    model: fallbackModel,
                    usage: { total_tokens: 0 }, // Usage info simplified
                    routing: {
                        provider: fallbackProvider,
                        model: fallbackModel,
                        tier: qualityTier,
                        failover: true,
                        originalError: error.message
                    },
                    credits: null // Skip credit deduction for fallback to avoid double billing issues
                };

            } catch (fallbackError) {
                console.error('[routeLLM] ❌ Auto-Failover Failed:', fallbackError.message);
                // Throw original error + fallback error
                throw new functions.https.HttpsError('internal', `Generation Failed. Primary: ${error.message}. Fallback: ${fallbackError.message}`);
            }
        }

        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Helper: Get API key from systemLLMProviders
 */
async function getSystemApiKey(provider) {
    try {
        console.log(`[getSystemApiKey] Looking for provider: ${provider}`);

        // 1. Query by provider only (remove strict status filter)
        const snapshot = await db.collection('systemLLMProviders')
            .where('provider', '==', provider)
            .get();

        if (snapshot.empty) {
            console.warn(`[getSystemApiKey] No provider found for: ${provider}`);
            return null;
        }

        console.log(`[getSystemApiKey] Found ${snapshot.size} docs for ${provider}`);

        // 2. Find first active document (handle both 'status' and 'isActive')
        // Admin UI uses status='active', Legacy might use isActive=true
        const activeDoc = snapshot.docs.find(doc => {
            const d = doc.data();
            return d.status === 'active' || d.isActive === true;
        });

        if (!activeDoc) {
            console.warn(`[getSystemApiKey] Found docs but none are active for: ${provider}`);
            // Fallback: If only one doc exists and it has a key, try using it even if status is weird (Emergency fallback)
            if (snapshot.size === 1) {
                console.log(`[getSystemApiKey] Trying fallback with single existing doc`);
                return getApiKeyFromData(snapshot.docs[0].data());
            }
            return null;
        }

        // 3. Extract API Key
        const key = getApiKeyFromData(activeDoc.data());

        if (!key) {
            console.warn(`[getSystemApiKey] Active doc found but no API key present`);
        }

        return key;

    } catch (error) {
        console.error('[getSystemApiKey] Error:', error);
        return null;
    }
}

function getApiKeyFromData(data) {
    // Check all possible locations
    if (data.apiKey) return data.apiKey;
    if (data.credentialRef) {
        return data.credentialRef.apiKeyEncrypted || data.credentialRef.apiKey || null;
    }
    return null;
}

/**
 * Unified LLM Call Function
 * Supports: OpenAI, Gemini, Anthropic (Claude)
 */
async function callLLM(provider, model, messages, temperature = 0.7) {
    const apiKey = await getSystemApiKey(provider);

    if (!apiKey) {
        throw new Error(`API key not configured for provider: ${provider}`);
    }

    console.log(`[callLLM] Calling ${provider} with model ${model}`);

    switch (provider.toLowerCase()) {
        case 'openai':
            return await callOpenAIInternal(apiKey, model || 'gpt-4o-mini', messages, temperature);

        case 'gemini':
        case 'google':
        case 'banana':      // Nano Banana
        case 'nano':        // Nano
        case 'nano-banana': // explicit
            return await callGeminiInternal(apiKey, model || 'gemini-3.0-pro', messages, temperature);

        case 'anthropic':
        case 'claude':
            return await callClaudeInternal(apiKey, model || 'claude-3-5-sonnet-20241022', messages, temperature);

        default:
            // Fallback to OpenAI
            console.warn(`[callLLM] Unknown provider ${provider}, falling back to OpenAI`);
            return await callOpenAIInternal(apiKey, model || 'gpt-4o-mini', messages, temperature);
    }
}

/**
 * OpenAI Internal Call
 */
async function callOpenAIInternal(apiKey, model, messages, temperature) {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_completion_tokens: 4000
    });

    return {
        content: response.choices[0]?.message?.content || '',
        model: response.model,
        usage: response.usage,
        provider: 'openai'
    };
}

/**
 * Gemini Internal Call
 */
async function callGeminiInternal(apiKey, model, messages, temperature) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    // Convert OpenAI message format to Gemini format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    // Build conversation history
    const history = [];
    for (let i = 0; i < userMessages.length - 1; i++) {
        const msg = userMessages[i];
        history.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        });
    }

    // Get the last user message
    const lastMessage = userMessages[userMessages.length - 1];
    const prompt = systemMessage ? `${systemMessage}\n\n${lastMessage.content}` : lastMessage.content;

    const config = {
        maxOutputTokens: 4000
    };

    // Special handling for models that enforce default temperature (e.g. Gemini 3.0 Preview, Thinking models)
    // Error observed: "temperature does not support 0.7 with this model. Only the default (1) value is supported."
    const isRestrictedModel = model.includes('gemini-3') || model.includes('thinking');
    if (!isRestrictedModel && temperature != null) {
        config.temperature = temperature;
    }

    const chat = geminiModel.startChat({
        history,
        generationConfig: config
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;

    return {
        content: response.text(),
        model,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, // Gemini doesn't return token counts in same way
        provider: 'gemini'
    };
}

/**
 * Claude (Anthropic) Internal Call
 */
async function callClaudeInternal(apiKey, model, messages, temperature) {
    const anthropic = new Anthropic({ apiKey });

    // Convert OpenAI format to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const anthropicMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        }));

    const response = await anthropic.messages.create({
        model,
        max_tokens: 4000,
        system: systemMessage,
        messages: anthropicMessages
    });

    return {
        content: response.content[0]?.text || '',
        model: response.model,
        usage: {
            prompt_tokens: response.usage?.input_tokens || 0,
            completion_tokens: response.usage?.output_tokens || 0,
            total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        },
        provider: 'anthropic'
    };
}

/**
 * Test Connection endpoint (HTTP)
 * Used for health checks
 */
exports.healthCheck = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        res.json({
            status: 'ok',
            service: 'ZINC Functions',
            timestamp: new Date().toISOString()
        });
    });
});

/**
 * Test X (Twitter) API connection and fetch account info
 * Returns username/handle if successful
 * Using v2 onRequest with cors option for automatic CORS handling
 */
exports.testXConnection = onRequest({ cors: true }, async (req, res) => {
    try {
        const payload = req.body.data || req.body;
        const { apiKey, apiSecret, accessToken, accessTokenSecret } = payload;

        if (!apiKey || !accessToken) {
            res.status(400).json({
                error: { message: 'Missing required credentials' }
            });
            return;
        }

        const { TwitterApi } = require('twitter-api-v2');
        const client = new TwitterApi({
            appKey: apiKey,
            appSecret: apiSecret || '',
            accessToken: accessToken,
            accessSecret: accessTokenSecret || ''
        });

        // Get current user info
        const me = await client.v2.me({
            'user.fields': ['username', 'name', 'profile_image_url', 'description']
        });

        console.log('[testXConnection] Successfully connected:', me.data);

        res.status(200).json({
            data: {
                success: true,
                message: `Connected as @${me.data.username}`,
                accountInfo: {
                    id: me.data.id,
                    username: me.data.username,
                    name: me.data.name,
                    handle: `@${me.data.username}`,
                    profileImageUrl: me.data.profile_image_url,
                    description: me.data.description
                }
            }
        });

    } catch (error) {
        console.error('[testXConnection] Error:', error);

        let message = 'Connection failed';
        if (error.code === 401 || error.message?.includes('401')) {
            message = 'Invalid credentials - please check your API keys';
        } else if (error.code === 403 || error.message?.includes('403')) {
            message = 'Access forbidden - check app permissions in Twitter Developer Portal';
        } else if (error.message) {
            message = error.message;
        }

        res.status(500).json({
            error: { message }
        });
    }
});

/**
 * Post content to Twitter/X
 * This function posts approved content to the user's X account
 */
exports.postToTwitter = functions.https.onCall(async (data, context) => {
    // Normalize data payload
    const payload = (data && data.data) ? data.data : data;
    const { projectId, contentId, tweetText, userId, imageUrl } = payload;

    if (!projectId || !contentId || !tweetText) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: projectId, contentId, tweetText');
    }

    console.log(`[postToTwitter] Posting content ${contentId} for project ${projectId}`);
    console.log(`[postToTwitter] Has image: ${!!imageUrl}`);

    try {
        // 1. Get X API credentials from user's channel credentials
        const credentials = await getXCredentials(userId || context.auth?.uid, projectId);

        if (!credentials) {
            throw new functions.https.HttpsError('failed-precondition', 'X (Twitter) API credentials not configured. Please add X channel in Settings.');
        }

        // 2. Initialize Twitter client
        const { TwitterApi } = require('twitter-api-v2');
        const client = new TwitterApi({
            appKey: credentials.api_key,
            appSecret: credentials.api_secret,
            accessToken: credentials.access_token,
            accessSecret: credentials.access_token_secret
        });

        let tweet;

        // 3. Upload image if provided
        if (imageUrl) {
            try {
                console.log('[postToTwitter] Downloading image from:', imageUrl);

                // Download image
                const axios = require('axios');
                const imageResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                const imageBuffer = Buffer.from(imageResponse.data);

                console.log('[postToTwitter] Image downloaded, size:', imageBuffer.length);

                // Upload to Twitter
                const mediaId = await client.v1.uploadMedia(imageBuffer, { mimeType: 'image/png' });
                console.log('[postToTwitter] Image uploaded to Twitter, mediaId:', mediaId);

                // Post tweet with media
                tweet = await client.v2.tweet(tweetText, { media: { media_ids: [mediaId] } });
            } catch (imageError) {
                console.error('[postToTwitter] Image upload failed, posting without image:', imageError.message);
                // Fallback to text-only tweet
                tweet = await client.v2.tweet(tweetText);
            }
        } else {
            // Post text-only tweet
            tweet = await client.v2.tweet(tweetText);
        }

        console.log(`[postToTwitter] Tweet posted successfully: ${tweet.data.id}`);

        // 4. Update content status in Firestore (create if not exists)
        await db.collection('projects').doc(projectId)
            .collection('generatedContents').doc(contentId)
            .set({
                status: 'published',
                published_at: admin.firestore.FieldValue.serverTimestamp(),
                tweet_id: tweet.data.id,
                tweet_url: `https://twitter.com/user/status/${tweet.data.id}`,
                content: tweetText,
                imageUrl: imageUrl || null,
                projectId: projectId
            }, { merge: true });

        return {
            success: true,
            tweetId: tweet.data.id,
            tweetUrl: `https://twitter.com/user/status/${tweet.data.id}`
        };

    } catch (error) {
        console.error('[postToTwitter] Error:', error);

        // Update content with error status
        if (projectId && contentId) {
            try {
                await db.collection('projects').doc(projectId)
                    .collection('generatedContents').doc(contentId)
                    .update({
                        status: 'failed',
                        publish_error: error.message,
                        last_attempt: admin.firestore.FieldValue.serverTimestamp()
                    });
            } catch (updateError) {
                console.error('[postToTwitter] Failed to update error status:', updateError);
            }
        }

        throw new functions.https.HttpsError('internal', error.message || 'Failed to post to Twitter');
    }
});

/**
 * Helper: Get X (Twitter) credentials for a user/project
 */
async function getXCredentials(userId, projectId) {
    try {
        // First, try to get from project's channel connections
        if (projectId) {
            const projectDoc = await db.collection('projects').doc(projectId).get();
            if (projectDoc.exists) {
                const projectData = projectDoc.data();
                // Check if project has linked channel credentials
                if (projectData.channelCredentialId) {
                    const credDoc = await db.collection('userApiCredentials').doc(projectData.channelCredentialId).get();
                    if (credDoc.exists) {
                        return extractXCredentials(credDoc.data());
                    }
                }
            }
        }

        // Fallback: Get from user's API credentials
        if (userId) {
            const snapshot = await db.collection('userApiCredentials')
                .where('userId', '==', userId)
                .where('provider', '==', 'x')
                .limit(1)
                .get();

            if (!snapshot.empty) {
                return extractXCredentials(snapshot.docs[0].data());
            }
        }

        // Last resort: Get any X credential (for testing)
        const anyX = await db.collection('userApiCredentials')
            .where('provider', '==', 'x')
            .limit(1)
            .get();

        if (!anyX.empty) {
            console.warn('[getXCredentials] Using fallback X credentials (not user-specific)');
            return extractXCredentials(anyX.docs[0].data());
        }

        return null;
    } catch (error) {
        console.error('[getXCredentials] Error:', error);
        return null;
    }
}

function extractXCredentials(data) {
    // Handle nested credentials object
    if (data.credentials) {
        const creds = data.credentials;
        return {
            api_key: creds.apiKey || creds.api_key,
            api_secret: creds.apiSecret || creds.api_secret,
            access_token: creds.accessToken || creds.access_token,
            access_token_secret: creds.accessTokenSecret || creds.access_token_secret
        };
    }
    // Direct fields (support both naming conventions)
    return {
        api_key: data.apiKey || data.api_key,
        api_secret: data.apiSecret || data.api_secret,
        access_token: data.accessToken || data.access_token,
        access_token_secret: data.accessTokenSecret || data.access_token_secret
    };
}

// ============================================
// SCHEDULED AGENT EXECUTION
// ============================================

/**
 * Scheduled function that runs every 15 minutes
 * Checks for agent teams that need to run based on their schedule settings
 */
exports.checkScheduledAgents = onSchedule({
    schedule: 'every 15 minutes',
    timeZone: 'UTC',
    retryCount: 0
}, async (event) => {
    console.log('[checkScheduledAgents] Starting scheduled check...');

    try {
        // Get all teams with active schedules
        const teamsSnap = await db.collection('projectAgentTeamInstances')
            .where('schedule.enabled', '==', true)
            .where('status', '==', 'active')
            .get();

        if (teamsSnap.empty) {
            console.log('[checkScheduledAgents] No teams with active schedules found');
            return null;
        }

        console.log(`[checkScheduledAgents] Found ${teamsSnap.size} teams with active schedules`);

        const now = new Date();
        const executionPromises = [];

        for (const doc of teamsSnap.docs) {
            const team = doc.data();
            const schedule = team.schedule;

            // Check if it's time to run
            const shouldRun = await checkShouldRunNow(doc.id, schedule, now);

            if (shouldRun) {
                console.log(`[checkScheduledAgents] Team ${doc.id} should run now`);
                executionPromises.push(
                    executeScheduledRun(doc.id, team.projectId, schedule)
                );
            }
        }

        // Execute all scheduled runs in parallel
        if (executionPromises.length > 0) {
            const results = await Promise.allSettled(executionPromises);
            console.log(`[checkScheduledAgents] Executed ${results.length} scheduled runs`);

            // Log results
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    console.log(`[checkScheduledAgents] Run ${index + 1}: Success`);
                } else {
                    console.error(`[checkScheduledAgents] Run ${index + 1}: Failed -`, result.reason);
                }
            });
        }

        return null;

    } catch (error) {
        console.error('[checkScheduledAgents] Error:', error);
        return null;
    }
});

/**
 * Check if a team should run now based on schedule settings
 */
async function checkShouldRunNow(teamId, schedule, now) {
    const timezone = schedule.timezone || 'UTC';
    const startTime = schedule.start_time || '09:00';
    const endTime = schedule.end_time || '18:00';
    const frequency = schedule.frequency || 'daily';
    const quantity = schedule.quantity || 1;

    // Convert current time to the team's timezone
    const teamLocalTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentHour = teamLocalTime.getHours();
    const currentMinute = teamLocalTime.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Parse start and end times
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Check if current time is within the schedule window
    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        console.log(`[checkShouldRunNow] Team ${teamId}: Outside time window (${currentTimeStr} not in ${startTime}-${endTime})`);
        return false;
    }

    // Check frequency
    const dayOfWeek = teamLocalTime.getDay(); // 0 = Sunday

    if (frequency === 'weekly' && dayOfWeek !== 1) {
        // Only run on Mondays for weekly
        console.log(`[checkShouldRunNow] Team ${teamId}: Weekly schedule, today is not Monday`);
        return false;
    }

    // Check daily run count
    const today = teamLocalTime.toISOString().split('T')[0];
    const runsToday = await getDailyRunCount(teamId, today);

    if (runsToday >= quantity) {
        console.log(`[checkShouldRunNow] Team ${teamId}: Already ran ${runsToday}/${quantity} times today`);
        return false;
    }

    // Calculate if it's time for the next run based on quantity
    // Distribute runs evenly across the time window
    const windowMinutes = endMinutes - startMinutes;
    const intervalMinutes = Math.floor(windowMinutes / quantity);
    const expectedRunTimes = [];

    for (let i = 0; i < quantity; i++) {
        const runMinutes = startMinutes + (intervalMinutes * i) + Math.floor(intervalMinutes / 2);
        expectedRunTimes.push(runMinutes);
    }

    // Check if current time is close to any expected run time (within 15 min window)
    const isNearExpectedTime = expectedRunTimes.some(expectedMin => {
        return Math.abs(currentMinutes - expectedMin) <= 7; // 7 minute tolerance (since we run every 15 min)
    });

    if (!isNearExpectedTime) {
        console.log(`[checkShouldRunNow] Team ${teamId}: Not near expected run times`);
        return false;
    }

    return true;
}

/**
 * Get the count of runs for a team today
 */
async function getDailyRunCount(teamId, dateStr) {
    try {
        // Query runs from agentRuns collection for this team today
        const runsSnap = await db.collectionGroup('agentRuns')
            .where('team_instance_id', '==', teamId)
            .where('triggered_by', '==', 'schedule')
            .get();

        // Filter by date (client-side since Firestore can't do date range on string dates easily)
        const todayRuns = runsSnap.docs.filter(doc => {
            const data = doc.data();
            if (data.started_at) {
                const runDate = data.started_at.toDate().toISOString().split('T')[0];
                return runDate === dateStr;
            }
            return false;
        });

        return todayRuns.length;
    } catch (error) {
        console.error('[getDailyRunCount] Error:', error);
        return 0;
    }
}

/**
 * Execute a scheduled agent run
 */
async function executeScheduledRun(teamId, projectId, schedule) {
    console.log(`[executeScheduledRun] Starting run for team ${teamId}`);

    try {
        // 1. Get team data
        const teamDoc = await db.collection('projectAgentTeamInstances').doc(teamId).get();
        if (!teamDoc.exists) {
            throw new Error('Team not found');
        }

        const team = teamDoc.data();

        // 2. Create run record
        const runRef = await db.collection('projects')
            .doc(projectId)
            .collection('agentRuns')
            .add({
                team_instance_id: teamId,
                team_name: team.name || 'Agent Team',
                status: 'running',
                started_at: admin.firestore.FieldValue.serverTimestamp(),
                triggered_by: 'schedule',
                schedule_info: {
                    frequency: schedule.frequency,
                    timezone: schedule.timezone,
                    quantity: schedule.quantity
                },
                steps_completed: []
            });

        console.log(`[executeScheduledRun] Created run ${runRef.id} for team ${teamId}`);

        // 3. Get sub-agents
        const subAgentsSnap = await db.collection('projectAgentTeamInstances')
            .doc(teamId)
            .collection('subAgents')
            .orderBy('display_order', 'asc')
            .get();

        if (subAgentsSnap.empty) {
            throw new Error('No sub-agents found');
        }

        const subAgents = [];
        subAgentsSnap.forEach(doc => subAgents.push({ id: doc.id, ...doc.data() }));

        // 4. Execute sub-agents sequentially
        const results = [];

        for (const subAgent of subAgents) {
            const result = await executeSubAgentInternal(subAgent, {
                projectId,
                teamDirective: team.active_directive?.summary || team.activeDirective,
                previousResults: results
            });

            results.push({
                subAgentId: subAgent.id,
                subAgentRole: subAgent.role_name || subAgent.role_type,
                ...result
            });

            // Mark step completed
            await db.collection('projects').doc(projectId)
                .collection('agentRuns').doc(runRef.id)
                .update({
                    steps_completed: admin.firestore.FieldValue.arrayUnion(subAgent.id)
                });
        }

        // 5. Save generated content
        const contentIds = await saveScheduledContent(projectId, runRef.id, teamId, results);

        // 6. Mark run as completed
        await db.collection('projects').doc(projectId)
            .collection('agentRuns').doc(runRef.id)
            .update({
                status: 'completed',
                completed_at: admin.firestore.FieldValue.serverTimestamp(),
                generated_content_ids: contentIds
            });

        console.log(`[executeScheduledRun] Completed run ${runRef.id} successfully`);

        // 7. Update team's last_run timestamp
        await db.collection('projectAgentTeamInstances').doc(teamId).update({
            last_scheduled_run: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, runId: runRef.id, contentIds };

    } catch (error) {
        console.error(`[executeScheduledRun] Error for team ${teamId}:`, error);
        throw error;
    }
}

/**
 * Internal sub-agent execution (similar to executeSubAgent but for internal use)
 */
async function executeSubAgentInternal(subAgent, context) {
    try {
        // Get API key
        const apiKey = await getSystemApiKey('openai');

        if (!apiKey) {
            throw new Error('API key not configured');
        }

        // Build messages
        const messages = [
            { role: 'system', content: subAgent.system_prompt || 'You are a helpful assistant.' }
        ];

        // Add previous outputs
        if (context.previousResults && context.previousResults.length > 0) {
            context.previousResults.forEach(result => {
                messages.push({
                    role: 'assistant',
                    content: `[Previous Agent Output - ${result.subAgentRole}]:\n${result.output}`
                });
            });
        }

        // Add task prompt
        const taskPrompt = context.teamDirective || 'Generate content based on your role.';
        messages.push({ role: 'user', content: taskPrompt });

        // Call OpenAI
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: subAgent.model_id || 'gpt-4',
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
        });

        return {
            success: true,
            output: response.choices[0]?.message?.content || '',
            input: {
                systemPrompt: subAgent.system_prompt,
                taskPrompt: taskPrompt
            }
        };

    } catch (error) {
        console.error('[executeSubAgentInternal] Error:', error);
        return {
            success: false,
            output: '',
            error: error.message
        };
    }
}

/**
 * Save generated content from scheduled run
 */
async function saveScheduledContent(projectId, runId, teamId, results) {
    const contentIds = [];

    for (const result of results) {
        const roleType = (result.subAgentRole || '').toLowerCase();
        const isMetaContent = roleType.includes('planner') ||
            roleType.includes('research') ||
            roleType.includes('review') ||
            roleType.includes('manager');

        const contentDoc = await db.collection('projects')
            .doc(projectId)
            .collection('generatedContents')
            .add({
                run_id: runId,
                team_instance_id: teamId,
                sub_agent_id: result.subAgentId,
                sub_agent_role: result.subAgentRole,
                content_type: isMetaContent ? 'meta' : 'text',
                content_category: isMetaContent ? 'work_log' : 'publishable',
                is_meta: isMetaContent,
                platform: isMetaContent ? 'internal' : 'X',
                status: isMetaContent ? 'complete' : 'pending',
                title: result.subAgentRole,
                preview_text: (result.output || '').substring(0, 280),
                content_text: result.output || '',
                triggered_by: 'schedule',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            });

        contentIds.push(contentDoc.id);
    }

    return contentIds;
}

// ============================================
// ZYNK AI HELPDESK CHATBOT
// ============================================



/**
 * askZynkBot - AI Helpdesk Chatbot using Gemini API
 * Features:
 * - Firestore-based rate limiting
 * - Dynamic system prompt from chatbotConfig
 * - ZYNK-focused responses only
 */
exports.askZynkBot = onCall({ cors: true }, async (request) => {
    console.log('[askZynkBot] Function invoked (v2)');

    // Unpack request
    const data = request.data;
    const auth = request.auth;

    try {
        // 1. Get user ID (authenticated or anonymous)
        let userId;
        let isAuthenticated = false;

        if (auth && auth.uid) {
            userId = auth.uid;
            isAuthenticated = true;
        } else {
            // Use clientId from data for anonymous users, or generate one
            userId = data.clientId || 'anonymous_' + Date.now();
            console.log('[askZynkBot] Unauthenticated user, using clientId:', userId);
        }

        const question = data.question;
        const language = data.language || 'ko'; // default to Korean

        if (!question || typeof question !== 'string') {
            console.warn('[askZynkBot] Invalid argument: question is missing', { dataKeys: Object.keys(data), data });
            throw new functions.https.HttpsError('invalid-argument', 'Question is required');
        }

        console.log(`[askZynkBot] User ${userId} (auth:${isAuthenticated}, ${language}) asked: ${question.substring(0, 50)}...`);

        // 2. Load chatbot config from Firestore
        console.log('[askZynkBot] Loading config...');
        const configDoc = await db.collection('chatbotConfig').doc('default').get();
        const config = configDoc.exists ? configDoc.data() : {};

        const dailyLimit = config.dailyLimit || 50;
        let systemPrompt = config.systemPrompt || getDefaultSystemPrompt();
        const status = config.status || 'active';

        // Add language instruction to system prompt
        const langInstruction = language === 'en'
            ? '\n\n## IMPORTANT: Respond in English only.'
            : '\n\n## 중요: 한국어로만 답변하세요.';
        systemPrompt += langInstruction;

        // Check if chatbot is disabled
        if (status === 'disabled') {
            throw new functions.https.HttpsError('unavailable', '챗봇이 현재 비활성화되어 있습니다.');
        }

        if (status === 'maintenance') {
            throw new functions.https.HttpsError('unavailable', '챗봇이 점검 중입니다. 잠시 후 다시 시도해 주세요.');
        }

        // 3. Check rate limit
        console.log('[askZynkBot] Checking rate limit...');
        const today = new Date().toISOString().split('T')[0];
        const usageRef = db.collection('chatbotUsage').doc(`${userId}_${today}`);
        const usageDoc = await usageRef.get();
        const currentCount = usageDoc.exists ? usageDoc.data().count : 0;

        if (currentCount >= dailyLimit) {
            throw new functions.https.HttpsError(
                'resource-exhausted',
                `일일 질문 횟수(${dailyLimit}회)를 초과했습니다. 내일 다시 이용해 주세요.`
            );
        }

        // 4. Get OpenAI API key
        console.log('[askZynkBot] Getting OpenAI API key...');
        const openaiApiKey = await getOpenAIApiKey();

        if (!openaiApiKey) {
            console.error('[askZynkBot] OpenAI API key not found');
            throw new functions.https.HttpsError('failed-precondition', 'AI Service (OpenAI) is not configured.');
        }

        // 5. Call OpenAI API
        console.log('[askZynkBot] Calling OpenAI API (Model: gpt-4o)...');
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: openaiApiKey });

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: question }
        ];

        let answer = "";
        let usedModel = "gpt-4o";

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
                max_tokens: 1000
            });
            answer = completion.choices[0].message.content;
            console.log(`[askZynkBot] Success with model: ${usedModel}`);

        } catch (err) {
            console.warn(`[askZynkBot] Failed with gpt-4o, trying gpt-3.5-turbo fallback:`, err.message);
            try {
                usedModel = "gpt-3.5-turbo";
                const fallbackCompletion = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: messages,
                    max_tokens: 1000
                });
                answer = fallbackCompletion.choices[0].message.content;
                console.log(`[askZynkBot] Success with model: ${usedModel}`);
            } catch (fallbackErr) {
                console.error('[askZynkBot] All OpenAI models failed:', fallbackErr);
                throw new functions.https.HttpsError('internal', 'AI generation failed.');
            }
        }

        // 6. Update usage stats
        try {
            await db.collection('system_stats').doc('chatbot_usage').set({
                total_queries: admin.firestore.FieldValue.increment(1),
                last_query_at: admin.firestore.FieldValue.serverTimestamp(),
                last_provider: 'openai',
                last_model: usedModel
            }, { merge: true });
        } catch (statsErr) {
            console.error('[askZynkBot] Error updating stats:', statsErr);
        }

        // 7. Update user-specific usage count
        await usageRef.set({
            userId,
            count: currentCount + 1,
            date: today,
            lastUsed: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`[askZynkBot] Successfully responded to user ${userId} (${currentCount + 1}/${dailyLimit})`);

        return {
            answer,
            usage: {
                count: currentCount + 1,
                limit: dailyLimit
            }
        };

    } catch (error) {
        console.error('[askZynkBot] Error caught:', error);

        // Re-throw HttpsErrors as-is
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        // Convert unknown errors to internal
        throw new functions.https.HttpsError('internal', error.message || 'An unexpected error occurred');
    }
});

// Helper: Get OpenAI API Key from Firestore
async function getOpenAIApiKey() {
    console.log('[getOpenAIApiKey] Fetching openai key from systemLLMProviders...');
    const snapshot = await db.collection('systemLLMProviders').where('provider', '==', 'openai').get();

    if (snapshot.empty) {
        console.warn('[getOpenAIApiKey] No providers found in systemLLMProviders for openai');
        return process.env.OPENAI_API_KEY || null;
    }

    // Prefer first active provider
    const docs = snapshot.docs.map(doc => doc.data());
    const activeProvider = docs.find(p => p.status === 'active') || docs[0];

    return getApiKeyFromData(activeProvider);
}

/**
 * Default system prompt for ZYNK chatbot
 */
function getDefaultSystemPrompt() {
    return `당신은 ZYNK 헬프데스크 AI입니다.

## 역할
- ZYNK 플랫폼 사용법 안내
- 5단계 파이프라인 설명 (Market Pulse, Brand Brain, Studio, The Filter, The Growth)
- 문제 해결 및 트러블슈팅

## 5단계 파이프라인 설명
1. Market Pulse: 시장 트렌드와 경쟁사 동향을 실시간으로 모니터링합니다.
2. Brand Brain: 브랜드 전략과 톤앤매너를 설정합니다.
3. Studio: 12개 AI 에이전트가 협력하여 콘텐츠를 생성합니다.
4. The Filter: 콘텐츠 품질을 검증하고 브랜드 일관성을 확인합니다.
5. The Growth: ROI를 측정하고 성과를 분석합니다.

## 제한사항
ZYNK와 관련된 질문에만 답변하세요.
다음과 같은 요청은 정중히 거절하세요:
- 수학 문제 풀이
- 번역 요청
- 뉴스/기사 검색
- 코드 작성
- 기타 ZYNK와 무관한 모든 요청

## 거절 응답 예시
"죄송합니다. 저는 ZYNK 사용에 관한 질문만 도와드릴 수 있습니다. ZYNK 기능이나 사용법에 대해 궁금한 점이 있으시면 말씀해 주세요! 🐝"

## 너의 성격
- 친근하고 도움이 되는 태도
- 이모지 적절히 사용
- 간결하고 명확한 답변
- 한국어로 답변`;
}


/**
 * ============================================================
 * BRAND BRAIN SYNC - Phase 3: Scheduled Daily Sync
 * ============================================================
 * This function runs daily to sync Brand Brain data to all Agent Teams
 * 
 * Schedule: Every day at 09:00 AM (KST = UTC+9, so 00:00 UTC)
 * Region: asia-northeast3 (Seoul)
 */
exports.scheduledBrandSync = onSchedule({
    schedule: 'every day 00:00',
    timeZone: 'Asia/Seoul',
    region: 'asia-northeast3'
}, async (event) => {
    console.log('[scheduledBrandSync] Starting daily Brand Brain sync...');

    const stats = {
        projectsProcessed: 0,
        teamsUpdated: 0,
        errors: 0,
        startTime: Date.now()
    };

    try {
        // 1. Get all users with Brand Brain data
        const brandBrainUsersSnapshot = await db.collection('brandBrain').get();
        console.log(`[scheduledBrandSync] Found ${brandBrainUsersSnapshot.size} users with Brand Brain data`);

        for (const userDoc of brandBrainUsersSnapshot.docs) {
            const userId = userDoc.id;

            try {
                // 2. Get all projects for this user
                const projectsSnapshot = await db.collection('brandBrain')
                    .doc(userId)
                    .collection('projects')
                    .get();

                for (const projectDoc of projectsSnapshot.docs) {
                    const projectId = projectDoc.id;
                    const brandBrainData = projectDoc.data();

                    // Check if auto-sync is enabled (default: true if not set)
                    const autoSyncEnabled = brandBrainData.syncStatus?.autoSyncEnabled !== false;

                    if (!autoSyncEnabled) {
                        console.log(`[scheduledBrandSync] Skipping project ${projectId} - auto-sync disabled`);
                        continue;
                    }

                    // 3. Build brand context
                    const brandContext = buildBrandContextFromData(brandBrainData);

                    // 4. Find all Agent Teams for this project
                    let teamsSnapshot = await db.collection('projectAgentTeamInstances')
                        .where('projectId', '==', projectId)
                        .get();

                    // Fallback to agentTeams collection
                    if (teamsSnapshot.empty) {
                        teamsSnapshot = await db.collection('agentTeams')
                            .where('projectId', '==', projectId)
                            .get();
                    }

                    if (teamsSnapshot.empty) {
                        console.log(`[scheduledBrandSync] No teams for project ${projectId}`);
                        continue;
                    }

                    // 5. Batch update all teams
                    const batch = db.batch();
                    const syncTimestamp = admin.firestore.FieldValue.serverTimestamp();
                    const syncVersion = (brandBrainData.syncStatus?.syncVersion || 0) + 1;

                    teamsSnapshot.forEach(teamDoc => {
                        batch.update(teamDoc.ref, {
                            brandContext: {
                                syncedAt: syncTimestamp,
                                syncVersion: syncVersion,
                                syncedBy: 'scheduled_sync',
                                data: brandContext
                            }
                        });
                        stats.teamsUpdated++;
                    });

                    await batch.commit();

                    // 6. Update Brand Brain sync status
                    await projectDoc.ref.update({
                        'syncStatus.lastSynced': syncTimestamp,
                        'syncStatus.syncVersion': syncVersion,
                        'syncStatus.lastSyncedTeamCount': teamsSnapshot.size,
                        'syncStatus.lastAutoSync': syncTimestamp
                    });

                    stats.projectsProcessed++;
                    console.log(`[scheduledBrandSync] Synced project ${projectId} to ${teamsSnapshot.size} teams`);
                }
            } catch (userError) {
                console.error(`[scheduledBrandSync] Error processing user ${userId}:`, userError);
                stats.errors++;
            }
        }

        // 7. Log sync completion
        const duration = Date.now() - stats.startTime;
        console.log(`[scheduledBrandSync] ✅ Complete!`, {
            ...stats,
            durationMs: duration
        });

        // Optional: Save sync log
        await db.collection('systemLogs').add({
            type: 'brand_brain_sync',
            trigger: 'scheduled',
            stats: stats,
            durationMs: duration,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

    } catch (error) {
        console.error('[scheduledBrandSync] ❌ Fatal error:', error);

        // Log error
        await db.collection('systemLogs').add({
            type: 'brand_brain_sync',
            trigger: 'scheduled',
            status: 'failed',
            error: error.message,
            failedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});

/**
 * Manual Brand Brain Sync (callable function)
 * Allows admins to trigger sync manually from Admin UI
 */
exports.triggerBrandSync = onCall({ cors: true }, async (request) => {
    const { projectId, userId } = request.data || {};

    console.log('[triggerBrandSync] Manual sync triggered', { projectId, userId });

    if (!projectId) {
        return { success: false, error: 'projectId is required' };
    }

    try {
        // Get Brand Brain data
        const brandBrainRef = db.collection('brandBrain').doc(userId).collection('projects').doc(projectId);
        const brandBrainDoc = await brandBrainRef.get();

        if (!brandBrainDoc.exists) {
            return { success: false, error: 'Brand Brain data not found' };
        }

        const brandBrainData = brandBrainDoc.data();
        const brandContext = buildBrandContextFromData(brandBrainData);

        // Find Agent Teams
        let teamsSnapshot = await db.collection('projectAgentTeamInstances')
            .where('projectId', '==', projectId)
            .get();

        if (teamsSnapshot.empty) {
            teamsSnapshot = await db.collection('agentTeams')
                .where('projectId', '==', projectId)
                .get();
        }

        if (teamsSnapshot.empty) {
            return { success: false, error: 'No Agent Teams found for this project' };
        }

        // Batch update
        const batch = db.batch();
        const syncTimestamp = admin.firestore.FieldValue.serverTimestamp();
        const syncVersion = (brandBrainData.syncStatus?.syncVersion || 0) + 1;

        teamsSnapshot.forEach(teamDoc => {
            batch.update(teamDoc.ref, {
                brandContext: {
                    syncedAt: syncTimestamp,
                    syncVersion: syncVersion,
                    syncedBy: userId || 'manual_trigger',
                    data: brandContext
                }
            });
        });

        await batch.commit();

        // Update sync status
        await brandBrainRef.update({
            'syncStatus.lastSynced': syncTimestamp,
            'syncStatus.syncVersion': syncVersion,
            'syncStatus.lastSyncedTeamCount': teamsSnapshot.size
        });

        console.log(`[triggerBrandSync] ✅ Synced ${teamsSnapshot.size} teams`);
        return {
            success: true,
            teamsUpdated: teamsSnapshot.size,
            syncVersion: syncVersion
        };

    } catch (error) {
        console.error('[triggerBrandSync] Error:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Helper: Build brand context from Brand Brain data (server-side version)
 */
function buildBrandContextFromData(data) {
    const ci = data.coreIdentity || {};
    const st = data.strategy || {};
    const bv = st.brandVoice || {};
    const cf = st.currentFocus || {};

    return {
        // Core Identity
        brandName: ci.projectName || '',
        mission: ci.description || '',
        industry: ci.industry || '',
        targetAudience: ci.targetAudience || '',
        website: ci.website || '',

        // Brand Voice
        voiceTone: bv.personality || [],
        writingStyle: bv.writingStyle || '',
        toneIntensity: st.toneIntensity || 0.5,

        // Content Rules
        dos: bv.dos || [],
        donts: bv.donts || [],

        // Focus
        currentFocus: cf.topic || '',
        keywords: cf.keywords || [],

        // Platform Priority
        platformPriority: st.platformPriority || []
    };
}

// ============================================================
// KNOWLEDGE HUB: Source Analysis Functions
// ============================================================

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Analyze a knowledge source
 * Extracts text from various source types and generates AI summary
 */
exports.analyzeKnowledgeSource = functions.https.onCall(async (data, context) => {
    const { projectId, sourceId } = data;

    if (!projectId || !sourceId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing projectId or sourceId');
    }

    console.log(`[analyzeKnowledgeSource] Analyzing source ${sourceId} for project ${projectId}`);

    try {
        // Get source document
        const sourceRef = db.collection('projects').doc(projectId)
            .collection('knowledgeSources').doc(sourceId);
        const sourceDoc = await sourceRef.get();

        if (!sourceDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Source not found');
        }

        const source = sourceDoc.data();

        // Update status to analyzing
        await sourceRef.update({
            status: 'analyzing',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        let extractedText = '';

        // Extract text based on source type
        switch (source.sourceType) {
            case 'link':
                extractedText = await extractTextFromUrl(source.link?.url);
                break;
            case 'note':
                extractedText = source.note?.content || '';
                break;
            case 'google_drive':
                extractedText = await extractTextFromDrive(source.googleDrive);
                break;
            default:
                extractedText = source.description || '';
        }

        if (!extractedText || extractedText.length < 10) {
            await sourceRef.update({
                status: 'failed',
                analysis: { error: 'Could not extract text from source' },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            throw new functions.https.HttpsError('failed-precondition', 'No text could be extracted');
        }

        // Generate AI analysis
        const analysis = await generateSourceAnalysis(extractedText, source.title);

        // Update source with analysis
        await sourceRef.update({
            status: 'completed',
            analysis: {
                ...analysis,
                extractedTextLength: extractedText.length,
                analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
                aiModel: 'gpt-4-turbo'
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[analyzeKnowledgeSource] Completed analysis for source ${sourceId}`);

        return {
            success: true,
            analysis: analysis
        };

    } catch (error) {
        console.error('[analyzeKnowledgeSource] Error:', error);

        // Update status to failed
        await db.collection('projects').doc(projectId)
            .collection('knowledgeSources').doc(sourceId)
            .update({
                status: 'failed',
                analysis: { error: error.message },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Extract text from URL
 */
async function extractTextFromUrl(url) {
    if (!url) return '';

    try {
        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ZYNK/1.0; +https://zynk.ai)'
            }
        });

        const $ = cheerio.load(response.data);

        // Remove script, style, nav, footer
        $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();

        // Extract main content
        const mainContent = $('main, article, .content, .post, #content').text() ||
            $('body').text();

        // Clean up whitespace
        const cleanText = mainContent
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim()
            .substring(0, 50000); // Limit to 50k chars

        // Also extract metadata
        const title = $('title').text() || '';
        const description = $('meta[name="description"]').attr('content') || '';

        return `Title: ${title}\nDescription: ${description}\n\n${cleanText}`;

    } catch (error) {
        console.error('[extractTextFromUrl] Error:', error.message);
        return '';
    }
}

/**
 * Extract text from Google Drive file
 * Note: Requires Google Drive API access token
 */
async function extractTextFromDrive(driveInfo) {
    if (!driveInfo || !driveInfo.fileId) return '';

    // For now, return placeholder - actual implementation requires
    // OAuth token from user's session or service account with access
    console.log(`[extractTextFromDrive] Would extract from file: ${driveInfo.fileId}`);

    // TODO: Implement actual Drive extraction
    // This would require:
    // 1. Service account with domain-wide delegation, or
    // 2. Passing user's access token from frontend
    return `[Google Drive file: ${driveInfo.fileName}]\n\nFile extraction requires additional setup. Please use Links or Notes for now.`;
}

/**
 * Generate AI analysis of extracted text
 */
async function generateSourceAnalysis(text, sourceTitle) {
    try {
        const apiKey = await getSystemApiKey('openai');

        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });

        const prompt = `Analyze the following document and extract key information for brand strategy purposes.

Document Title: ${sourceTitle || 'Untitled'}

Document Content:
${text.substring(0, 15000)}

Please provide the analysis in this JSON format:
{
    "summary": "A 2-3 sentence summary of the document",
    "keyInsights": ["insight1", "insight2", "insight3"],
    "extractedEntities": {
        "companyName": "if mentioned",
        "products": ["product1", "product2"],
        "values": ["value1", "value2"],
        "targetAudience": "if mentioned"
    },
    "tags": ["tag1", "tag2", "tag3"],
    "relevanceScore": 0.0-1.0
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                { role: 'system', content: 'You are a brand strategist analyzing documents for marketing insights. Always respond with valid JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);

    } catch (error) {
        console.error('[generateSourceAnalysis] Error:', error);
        return {
            summary: 'Analysis failed',
            keyInsights: [],
            extractedEntities: {},
            tags: [],
            error: error.message
        };
    }
}

/**
 * Firestore trigger: Auto-analyze new sources
 * Using firebase-functions v2
 */
exports.onKnowledgeSourceCreated = onDocumentCreated(
    'projects/{projectId}/knowledgeSources/{sourceId}',
    async (event) => {
        const snap = event.data;
        if (!snap) return null;

        const { projectId, sourceId } = event.params;
        const source = snap.data();

        // Skip if already analyzed or if it's a note (notes are immediately complete)
        if (source.status === 'completed' || source.sourceType === 'note') {
            return null;
        }

        console.log(`[onKnowledgeSourceCreated] Auto-analyzing source ${sourceId}`);

        try {
            // Update status to analyzing
            await snap.ref.update({
                status: 'analyzing',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            let extractedText = '';

            // Extract text based on source type
            switch (source.sourceType) {
                case 'link':
                    extractedText = await extractTextFromUrl(source.link?.url);
                    break;
                case 'google_drive':
                    extractedText = await extractTextFromDrive(source.googleDrive);
                    break;
                default:
                    extractedText = source.description || '';
            }

            if (!extractedText || extractedText.length < 10) {
                await snap.ref.update({
                    status: 'failed',
                    analysis: { error: 'Could not extract text from source' },
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return null;
            }

            // Generate AI analysis
            const analysis = await generateSourceAnalysis(extractedText, source.title);

            // Update source with analysis
            await snap.ref.update({
                status: 'completed',
                analysis: {
                    ...analysis,
                    extractedTextLength: extractedText.length,
                    analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
                    aiModel: 'gpt-4-turbo'
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`[onKnowledgeSourceCreated] Completed analysis for source ${sourceId}`);
            return { success: true };

        } catch (error) {
            console.error('[onKnowledgeSourceCreated] Error:', error);
            await snap.ref.update({
                status: 'failed',
                analysis: { error: error.message },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return null;
        }
    }
);

/**
 * Generate document summary for Knowledge Hub chat
 */
exports.generateKnowledgeSummary = onCall(
    {
        cors: ALLOWED_ORIGINS,
        region: 'us-central1'
    },
    async (request) => {
        const { projectId, targetLanguage = 'en' } = request.data;

        if (!projectId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing projectId');
        }

        // Language name mapping for AI prompt
        const languageNames = {
            'ko': 'Korean',
            'en': 'English',
            'ja': 'Japanese',
            'zh': 'Chinese',
            'es': 'Spanish'
        };
        const outputLanguage = languageNames[targetLanguage] || 'English';

        try {
            // Get all active sources (including pending ones for Drive files)
            const sourcesSnap = await db.collection('projects').doc(projectId)
                .collection('knowledgeSources')
                .where('isActive', '==', true)
                .get();

            if (sourcesSnap.empty) {
                return {
                    success: true,
                    summary: targetLanguage === 'ko' ? '활성화된 소스가 없습니다. 소스를 추가해주세요.' : 'No active sources available for summary.',
                    suggestedQuestions: []
                };
            }

            // Collect all summaries, insights, and source content
            const allInsights = [];
            const allEntities = {
                companyName: null,
                products: [],
                values: [],
                targetAudience: null
            };
            const sourceNames = [];

            sourcesSnap.forEach(doc => {
                const source = doc.data();

                // Add source title
                if (source.title) {
                    sourceNames.push(source.title);
                }

                // Add note content directly
                if (source.sourceType === 'note' && source.note?.content) {
                    allInsights.push(`[Note: ${source.title}] ${source.note.content}`);
                }

                // Add link URL for context
                if (source.sourceType === 'link' && source.link?.url) {
                    allInsights.push(`[Link: ${source.title}] URL: ${source.link.url}`);
                }

                // Add Google Drive file info
                if (source.sourceType === 'google_drive' && source.googleDrive) {
                    allInsights.push(`[Document: ${source.googleDrive.fileName}]`);
                }

                // Add analysis data if available
                if (source.analysis) {
                    if (source.analysis.summary) {
                        allInsights.push(source.analysis.summary);
                    }
                    if (source.analysis.keyInsights) {
                        allInsights.push(...source.analysis.keyInsights);
                    }
                    if (source.analysis.extractedEntities) {
                        const entities = source.analysis.extractedEntities;
                        if (entities.companyName) allEntities.companyName = entities.companyName;
                        if (entities.products) allEntities.products.push(...entities.products);
                        if (entities.values) allEntities.values.push(...entities.values);
                        if (entities.targetAudience) allEntities.targetAudience = entities.targetAudience;
                    }
                }
            });

            // Generate combined summary
            const apiKey = await getSystemApiKey('openai');
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey });

            const combinedText = allInsights.join('\n- ');

            const response = await openai.chat.completions.create({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a brand strategist creating a concise summary for a client. Be professional and insightful. IMPORTANT: Respond entirely in ${outputLanguage}.`
                    },
                    {
                        role: 'user',
                        content: `Based on these insights from uploaded documents, create:
1. A 2-3 paragraph executive summary of the brand/company
2. 5 suggested questions the user might want to ask about their brand

IMPORTANT: Write your response entirely in ${outputLanguage}.

Insights:
- ${combinedText}

Company: ${allEntities.companyName || 'Unknown'}
Products: ${allEntities.products.slice(0, 5).join(', ') || 'Not specified'}
Values: ${allEntities.values.slice(0, 5).join(', ') || 'Not specified'}
Target: ${allEntities.targetAudience || 'Not specified'}

Respond in JSON format (with ${outputLanguage} content):
{
    "summary": "executive summary here in ${outputLanguage}",
    "suggestedQuestions": ["question1 in ${outputLanguage}", "question2 in ${outputLanguage}", ...]
}`
                    }
                ],
                temperature: 0.5,
                max_tokens: 1000,
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(response.choices[0]?.message?.content || '{}');

            // Save summary to Firestore for persistence
            const summaryData = {
                summary: result.summary || '',
                suggestedQuestions: result.suggestedQuestions || [],
                targetLanguage: targetLanguage,
                sourceCount: sourcesSnap.size,
                sourceNames: sourceNames.slice(0, 10),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('projects').doc(projectId)
                .collection('knowledgeSummaries')
                .doc('latest')
                .set(summaryData, { merge: true });

            return {
                success: true,
                summary: result.summary || 'Summary generated.',
                suggestedQuestions: result.suggestedQuestions || [],
                sourceCount: sourcesSnap.size
            };

        } catch (error) {
            console.error('[generateKnowledgeSummary] Error:', error);
            throw new functions.https.HttpsError('internal', error.message);
        }
    });

/**
 * Answer questions based on knowledge sources (RAG-style)
 */
exports.askKnowledgeHub = onCall(
    {
        cors: ALLOWED_ORIGINS,
        region: 'us-central1'
    },
    async (request) => {
        const { projectId, question, targetLanguage = 'en' } = request.data;

        if (!projectId || !question) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing projectId or question');
        }

        // Language name mapping for AI prompt
        const languageNames = {
            'ko': 'Korean',
            'en': 'English',
            'ja': 'Japanese',
            'zh': 'Chinese',
            'es': 'Spanish'
        };
        const outputLanguage = languageNames[targetLanguage] || 'English';

        try {
            // Get all active sources
            const sourcesSnap = await db.collection('projects').doc(projectId)
                .collection('knowledgeSources')
                .where('isActive', '==', true)
                .get();  // Removed status filter to include pending Drive files

            if (sourcesSnap.empty) {
                const noSourceMsg = targetLanguage === 'ko'
                    ? '사용 가능한 소스가 없습니다. 먼저 소스를 추가해주세요.'
                    : 'No sources available. Please add and activate some sources first.';
                return {
                    success: true,
                    answer: noSourceMsg,
                    sources: []
                };
            }

            // Build context from sources
            let context = '';
            const sourceRefs = [];

            sourcesSnap.forEach(doc => {
                const source = doc.data();
                context += `\n\n--- Source: ${source.title} ---\n`;

                if (source.analysis) {
                    context += `Summary: ${source.analysis.summary || ''}\n`;
                    context += `Key Insights: ${(source.analysis.keyInsights || []).join(', ')}\n`;
                }

                // Include note content
                if (source.sourceType === 'note' && source.content) {
                    context += `Content: ${source.content}\n`;
                }

                // Include URL for links
                if (source.sourceType === 'link' && source.url) {
                    context += `URL: ${source.url}\n`;
                }

                sourceRefs.push({
                    id: doc.id,
                    title: source.title,
                    type: source.sourceType
                });
            });

            // Generate answer
            const apiKey = await getSystemApiKey('openai');
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey });

            const response = await openai.chat.completions.create({
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful brand strategist assistant. Answer questions based ONLY on the provided context from the user's documents. If the answer is not in the context, say so. Always cite which source you're referencing. IMPORTANT: Respond ONLY in ${outputLanguage}.`
                    },
                    {
                        role: 'user',
                        content: `Context from user's documents:${context}\n\n---\n\nQuestion: ${question}\n\nPlease answer in ${outputLanguage}.`
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });

            const answer = response.choices[0]?.message?.content || 'Unable to generate answer.';

            return {
                success: true,
                answer,
                sources: sourceRefs.map(s => s.title)
            };

        } catch (error) {
            console.error('[askKnowledgeHub] Error:', error);
            throw new functions.https.HttpsError('internal', error.message);
        }
    });

// ============================================================
// KNOWLEDGE HUB: Content Plan Generation
// ============================================================

/**
 * Plan type configurations
 */
const PLAN_CONFIGS = {
    // Strategic Plans
    campaign_brief: {
        name: 'Campaign Brief',
        category: 'strategic',
        credits: 10,
        prompt: `Create a comprehensive marketing campaign brief including:
1. Campaign Overview (objective, theme, duration)
2. Target Audience (demographics, psychographics, pain points)
3. Key Messages (primary message, supporting points)
4. Channel Strategy (which platforms, why)
5. Content Pillars (3-5 themes)
6. KPIs and Success Metrics
7. Timeline and Milestones
8. Budget Allocation Recommendations`
    },
    content_calendar: {
        name: 'Content Calendar',
        category: 'strategic',
        credits: 10,
        prompt: `Create a 4-week content calendar including:
1. Weekly themes aligned with brand values
2. Daily post ideas for each platform (Instagram, X, LinkedIn)
3. Content types (carousel, video, story, article)
4. Optimal posting times
5. Hashtag suggestions
6. Call-to-action for each post

Format as a structured weekly plan with specific content ideas.`
    },
    channel_strategy: {
        name: 'Channel Strategy',
        category: 'strategic',
        credits: 10,
        prompt: `Develop a channel-specific strategy covering:

For each major platform (Instagram, X/Twitter, LinkedIn, TikTok, YouTube):
1. Platform Fit Score (1-10) and rationale
2. Content Format Recommendations
3. Posting Frequency
4. Tone and Voice Adjustments
5. Engagement Tactics
6. Key Metrics to Track

Include prioritization recommendations based on target audience.`
    },
    // Quick Actions
    social_post_ideas: {
        name: 'Social Post Ideas',
        category: 'quick_action',
        credits: 1,
        prompt: `Generate 10 creative social media post ideas including:
1. Hook/Opening line
2. Main content/message
3. Call-to-action
4. Suggested visual (photo/video/carousel)
5. Recommended platform
6. Relevant hashtags (3-5)

Make each post unique and engaging, aligned with brand voice.`
    },
    trend_response: {
        name: 'Trend Response',
        category: 'quick_action',
        credits: 1,
        prompt: `Create 5 trend-responsive content pieces that:
1. Connect current trends to the brand
2. Feel authentic, not forced
3. Are time-sensitive and actionable
4. Include specific copy suggestions
5. Suggest visual treatments

Consider viral formats, memes, trending topics that align with brand values.`
    },
    ad_copy: {
        name: 'Ad Copy Variants',
        category: 'quick_action',
        credits: 1,
        prompt: `Create 10 ad copy variations including:

For each variation:
1. Headline (max 40 chars)
2. Primary Text (max 125 chars)
3. Description (max 30 chars)
4. Call-to-Action button suggestion
5. Target emotion/appeal

Include variations for: awareness, consideration, and conversion stages.`
    },
    // Knowledge Outputs
    brand_mind_map: {
        name: 'Brand Mind Map',
        category: 'knowledge',
        credits: 5,
        prompt: `Create a comprehensive brand mind map structure with:

Central Node: Brand Name
├── Core Values (3-5 values)
├── Products/Services (with key features)
├── Target Audience
│   ├── Demographics
│   └── Psychographics
├── Brand Personality Traits
├── Competitive Advantages
├── Key Messages
└── Visual Identity Elements

Provide as a nested hierarchical structure.`
    },
    competitor_analysis: {
        name: 'Competitor Analysis',
        category: 'knowledge',
        credits: 5,
        prompt: `Based on the brand information, create a competitor analysis framework:

1. Identify 3-5 likely competitors in this space
2. For each competitor:
   - Positioning statement
   - Strengths
   - Weaknesses
   - Content strategy observations
3. Competitive opportunity gaps
4. Differentiation recommendations
5. Strategic recommendations

Note: Analysis is based on industry knowledge, not real-time data.`
    },
    visual_moodboard: {
        name: 'Visual Moodboard',
        category: 'knowledge',
        credits: 5,
        prompt: `Create a visual moodboard brief including:

1. Color Palette (5 colors with hex codes)
2. Typography Recommendations
   - Heading font style
   - Body font style
3. Photography Style
   - Lighting
   - Composition
   - Subject matter
4. Graphic Elements
   - Shapes
   - Patterns
   - Icons style
5. Overall Aesthetic Keywords (5-7 words)
6. Inspiration References (describe types of images)
7. Do's and Don'ts for visual content`
    },
    // Create Now
    product_brochure: {
        name: 'Product Brochure',
        category: 'create_now',
        credits: 20,
        prompt: `Create content for a product brochure including:

1. Cover headline and tagline
2. Product/Service overview (100 words)
3. Key features (5-7 bullet points)
4. Benefits section (3 main benefits with descriptions)
5. Social proof suggestions
6. Call-to-action
7. Contact information format

Structure for a professional, visually appealing brochure.`
    },
    one_pager: {
        name: '1-Pager PDF',
        category: 'create_now',
        credits: 15,
        prompt: `Create a one-pager executive summary including:

1. Headline and tagline
2. Company/Brand overview (50 words)
3. Problem statement
4. Solution overview
5. Key differentiators (3-4 points)
6. Target market
7. Traction/Social proof
8. Call-to-action

Format for a single-page professional document.`
    },
    campaign_cards: {
        name: 'Campaign Cards',
        category: 'create_now',
        credits: 5,
        prompt: `Create 5 campaign cards, each including:

1. Campaign Title (catchy, memorable)
2. Campaign Theme
3. Target Audience
4. Duration (suggested)
5. Key Message
6. Action Plan (5 steps)
7. Success Metrics

Make each campaign distinct and actionable.`
    }
};

/**
 * Generate a content plan
 */
exports.generateContentPlan = functions.https.onCall(async (data, context) => {
    const { projectId, planType, options = {} } = data;

    if (!projectId || !planType) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing projectId or planType');
    }

    const planConfig = PLAN_CONFIGS[planType];
    if (!planConfig) {
        throw new functions.https.HttpsError('invalid-argument', `Unknown plan type: ${planType}`);
    }

    console.log(`[generateContentPlan] Generating ${planType} for project ${projectId}`);

    try {
        // Get foundational data
        const foundationalRef = db.collection('projects').doc(projectId)
            .collection('foundationalData').doc('latest');
        const foundationalDoc = await foundationalRef.get();

        // Get active sources for context
        const sourcesSnap = await db.collection('projects').doc(projectId)
            .collection('knowledgeSources')
            .where('isActive', '==', true)
            .where('status', '==', 'completed')
            .get();

        // Build context
        let brandContext = '';

        if (foundationalDoc.exists) {
            const fd = foundationalDoc.data();
            brandContext += `Company: ${fd.brandProfile?.companyName || 'Unknown'}\n`;
            brandContext += `Industry: ${fd.brandProfile?.industry || 'Unknown'}\n`;
            brandContext += `Mission: ${fd.brandProfile?.mission || ''}\n`;
            brandContext += `Values: ${(fd.brandProfile?.coreValues || []).join(', ')}\n`;
            brandContext += `Target Audience: ${JSON.stringify(fd.targetAudience?.primary || {})}\n`;
            brandContext += `Brand Voice: ${(fd.brandVoice?.personality || []).join(', ')}\n`;
        }

        // Add source insights
        let sourceInsights = '';
        sourcesSnap.forEach(doc => {
            const source = doc.data();
            if (source.analysis?.summary) {
                sourceInsights += `\n- ${source.title}: ${source.analysis.summary}`;
            }
        });

        if (sourceInsights) {
            brandContext += `\n\nSource Insights:${sourceInsights}`;
        }

        // Generate plan with AI
        const apiKey = await getSystemApiKey('openai');
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });

        const systemPrompt = `You are an expert brand strategist and content marketing specialist. 
Create professional, actionable content plans based on the provided brand context.
Be specific and practical. Output should be well-structured and ready to implement.`;

        const userPrompt = `Brand Context:
${brandContext}

${options.additionalContext ? `Additional Context: ${options.additionalContext}` : ''}

Task: ${planConfig.prompt}

Respond in JSON format:
{
    "title": "Plan title",
    "content": { ... structured content based on plan type ... },
    "summary": "Brief 1-2 sentence summary of the plan"
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 3000,
            response_format: { type: "json_object" }
        });

        const generatedContent = JSON.parse(response.choices[0]?.message?.content || '{}');

        // Save to Firestore
        const planData = {
            type: planType,
            category: planConfig.category,
            title: generatedContent.title || `${planConfig.name} - ${new Date().toLocaleDateString()}`,
            content: generatedContent.content || generatedContent,
            summary: generatedContent.summary || '',
            status: 'draft',
            credits: planConfig.credits,
            basedOnSources: sourcesSnap.docs.map(d => d.id),
            generationParams: options,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const planRef = await db.collection('projects').doc(projectId)
            .collection('contentPlans').add(planData);

        console.log(`[generateContentPlan] Created plan ${planRef.id}`);

        return {
            success: true,
            planId: planRef.id,
            plan: planData
        };

    } catch (error) {
        console.error('[generateContentPlan] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get saved content plans
 */
exports.getContentPlans = functions.https.onCall(async (data, context) => {
    const { projectId, status, category, limit = 20 } = data;

    if (!projectId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing projectId');
    }

    try {
        let query = db.collection('projects').doc(projectId)
            .collection('contentPlans')
            .orderBy('createdAt', 'desc')
            .limit(limit);

        if (status) {
            query = query.where('status', '==', status);
        }
        if (category) {
            query = query.where('category', '==', category);
        }

        const snapshot = await query.get();
        const plans = [];

        snapshot.forEach(doc => {
            plans.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
            });
        });

        return {
            success: true,
            plans,
            count: plans.length
        };

    } catch (error) {
        console.error('[getContentPlans] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================================
// MULTI-PROVIDER IMAGE GENERATION SYSTEM
// ============================================================

/**
 * Image provider configurations
 */
const IMAGE_PROVIDERS = {
    dalle: {
        name: 'DALL-E 3',
        costPerImage: 0.04,
        maxResolution: '1792x1024',
        supportsText: true,
        provider: 'openai'
    },
    stability: {
        name: 'Stability AI (SDXL)',
        costPerImage: 0.003,
        maxResolution: '1024x1024',
        supportsText: false,
        provider: 'stability'
    },
    flux: {
        name: 'Flux Pro (Replicate)',
        costPerImage: 0.003,
        maxResolution: '1024x1024',
        supportsText: true,
        provider: 'replicate'
    },
    ideogram: {
        name: 'Ideogram',
        costPerImage: 0.05,
        maxResolution: '1024x1024',
        supportsText: true,
        provider: 'ideogram'
    },
    imagen: {
        name: 'Google Imagen 3',
        costPerImage: 0.03,
        maxResolution: '2048x2048',
        supportsText: true,
        provider: 'google'
    }
};

/**
 * Generate image using selected provider
 */
exports.generateImage = functions.https.onCall(async (data, context) => {
    const {
        prompt,
        provider = 'flux', // Default to Flux (cheapest quality option)
        size = '1024x1024',
        style = 'vivid',
        projectId,
        purpose = 'promotional' // promotional, brochure, social, etc.
    } = data;

    if (!prompt) {
        throw new functions.https.HttpsError('invalid-argument', 'Prompt is required');
    }

    const providerConfig = IMAGE_PROVIDERS[provider];
    if (!providerConfig) {
        throw new functions.https.HttpsError('invalid-argument', `Unknown provider: ${provider}`);
    }

    console.log(`[generateImage] Using ${providerConfig.name} for: "${prompt.substring(0, 50)}..."`);

    try {
        let imageUrl;
        let metadata = {};

        switch (provider) {
            case 'dalle':
                imageUrl = await generateWithDALLE(prompt, size, style);
                break;
            case 'stability':
                imageUrl = await generateWithStability(prompt, size);
                break;
            case 'flux':
                imageUrl = await generateWithFlux(prompt, size);
                break;
            case 'ideogram':
                imageUrl = await generateWithIdeogram(prompt, size);
                break;
            case 'imagen':
                imageUrl = await generateWithImagen(prompt, size);
                break;
            default:
                throw new Error(`Provider ${provider} not implemented`);
        }

        // Save to Firestore if projectId provided
        if (projectId) {
            const imageDoc = await db.collection('projects').doc(projectId)
                .collection('generatedImages').add({
                    prompt,
                    provider,
                    providerName: providerConfig.name,
                    imageUrl,
                    size,
                    purpose,
                    cost: providerConfig.costPerImage,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            metadata.imageId = imageDoc.id;
        }

        return {
            success: true,
            imageUrl,
            provider: providerConfig.name,
            cost: providerConfig.costPerImage,
            ...metadata
        };

    } catch (error) {
        console.error(`[generateImage] Error with ${provider}:`, error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * DALL-E 3 (OpenAI)
 */
async function generateWithDALLE(prompt, size, style) {
    const apiKey = await getSystemApiKey('openai');
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });

    const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: size || '1024x1024',
        style: style || 'vivid',
        quality: 'standard'
    });

    return response.data[0].url;
}

/**
 * Stability AI (SDXL)
 */
async function generateWithStability(prompt, size) {
    const apiKey = await getImageApiKey('stability');
    if (!apiKey) throw new Error('Stability AI API key not configured');

    const response = await axios.post(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
            text_prompts: [{ text: prompt, weight: 1 }],
            cfg_scale: 7,
            height: parseInt(size.split('x')[1]) || 1024,
            width: parseInt(size.split('x')[0]) || 1024,
            samples: 1,
            steps: 30
        },
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }
    );

    // Stability returns base64, we need to upload to storage
    const base64Image = response.data.artifacts[0].base64;
    return await uploadBase64ToStorage(base64Image, 'stability');
}

/**
 * Flux Pro (via Replicate)
 */
async function generateWithFlux(prompt, size) {
    const apiKey = await getImageApiKey('replicate');
    if (!apiKey) throw new Error('Replicate API key not configured');

    // Start prediction
    const startResponse = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
            version: 'black-forest-labs/flux-pro',
            input: {
                prompt,
                width: parseInt(size.split('x')[0]) || 1024,
                height: parseInt(size.split('x')[1]) || 1024,
                num_outputs: 1
            }
        },
        {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            }
        }
    );

    // Poll for completion
    let prediction = startResponse.data;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const pollResponse = await axios.get(prediction.urls.get, {
            headers: { 'Authorization': `Token ${apiKey}` }
        });
        prediction = pollResponse.data;
    }

    if (prediction.status === 'failed') {
        throw new Error(prediction.error || 'Flux generation failed');
    }

    return prediction.output[0];
}

/**
 * Ideogram
 */
async function generateWithIdeogram(prompt, size) {
    const apiKey = await getImageApiKey('ideogram');
    if (!apiKey) throw new Error('Ideogram API key not configured');

    const response = await axios.post(
        'https://api.ideogram.ai/generate',
        {
            image_request: {
                prompt,
                aspect_ratio: 'ASPECT_1_1',
                model: 'V_2',
                magic_prompt_option: 'AUTO'
            }
        },
        {
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.data.data[0].url;
}

/**
 * Google Imagen 3 (Vertex AI)
 */
async function generateWithImagen(prompt, size) {
    // Google Imagen requires Vertex AI setup
    // For now, return placeholder - needs service account configuration
    console.log('[generateWithImagen] Not yet implemented - requires Vertex AI setup');
    throw new Error('Google Imagen not yet configured. Please use another provider.');
}

/**
 * Helper: Get image provider API key
 */
async function getImageApiKey(provider) {
    try {
        const doc = await db.collection('systemSettings').doc('imageProviders').get();
        if (!doc.exists) return null;
        return doc.data()[provider]?.apiKey || null;
    } catch (error) {
        console.error(`[getImageApiKey] Error getting ${provider} key:`, error);
        return null;
    }
}

/**
 * Helper: Upload base64 image to Firebase Storage
 */
async function uploadBase64ToStorage(base64Data, provider) {
    const bucket = admin.storage().bucket();
    const fileName = `generated-images/${provider}/${Date.now()}.png`;
    const file = bucket.file(fileName);

    const buffer = Buffer.from(base64Data, 'base64');
    await file.save(buffer, {
        metadata: { contentType: 'image/png' }
    });

    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}

/**
 * Get available image providers and their status
 */
exports.getImageProviders = functions.https.onCall(async (data, context) => {
    try {
        const doc = await db.collection('systemSettings').doc('imageProviders').get();
        const settings = doc.exists ? doc.data() : {};

        const providers = Object.entries(IMAGE_PROVIDERS).map(([key, config]) => ({
            id: key,
            name: config.name,
            costPerImage: config.costPerImage,
            maxResolution: config.maxResolution,
            supportsText: config.supportsText,
            isConfigured: !!(settings[key]?.apiKey),
            isEnabled: settings[key]?.enabled !== false
        }));

        return {
            success: true,
            providers,
            defaultProvider: settings.defaultProvider || 'flux'
        };

    } catch (error) {
        console.error('[getImageProviders] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Admin: Configure image provider
 */
exports.configureImageProvider = functions.https.onCall(async (data, context) => {
    const { provider, apiKey, enabled = true, setAsDefault = false } = data;

    if (!provider || !IMAGE_PROVIDERS[provider]) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid provider');
    }

    try {
        const updateData = {
            [`${provider}.apiKey`]: apiKey,
            [`${provider}.enabled`]: enabled,
            [`${provider}.updatedAt`]: admin.firestore.FieldValue.serverTimestamp()
        };

        if (setAsDefault) {
            updateData.defaultProvider = provider;
        }

        await db.collection('systemSettings').doc('imageProviders').set(updateData, { merge: true });

        return {
            success: true,
            message: `${IMAGE_PROVIDERS[provider].name} configured successfully`
        };

    } catch (error) {
        console.error('[configureImageProvider] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Smart provider selection based on use case
 */
exports.generateSmartImage = functions.https.onCall(async (data, context) => {
    const { prompt, purpose = 'general', projectId } = data;

    if (!prompt) {
        throw new functions.https.HttpsError('invalid-argument', 'Prompt is required');
    }

    // Get provider settings
    const doc = await db.collection('systemSettings').doc('imageProviders').get();
    const settings = doc.exists ? doc.data() : {};

    // Smart provider selection based on purpose
    let selectedProvider;

    // Check if prompt contains text requirements
    const hasTextRequirement = /logo|text|banner|title|headline|caption/i.test(prompt);

    if (hasTextRequirement && settings.ideogram?.apiKey && settings.ideogram?.enabled !== false) {
        // Use Ideogram for text-heavy images
        selectedProvider = 'ideogram';
    } else if (settings.flux?.apiKey && settings.flux?.enabled !== false) {
        // Default to Flux for best quality/price
        selectedProvider = 'flux';
    } else if (settings.stability?.apiKey && settings.stability?.enabled !== false) {
        // Fallback to Stability
        selectedProvider = 'stability';
    } else if (settings.dalle?.apiKey || true) {
        // Ultimate fallback to DALL-E (uses OpenAI key)
        selectedProvider = 'dalle';
    }

    console.log(`[generateSmartImage] Selected ${selectedProvider} for purpose: ${purpose}`);

    // Call the main generate function
    return exports.generateImage.run({
        prompt,
        provider: selectedProvider,
        projectId,
        purpose
    }, context);
});

// ============================================================
// CREDITS & BILLING SYSTEM
// ============================================================

/**
 * Plan configurations
 */
const PLAN_TIERS = {
    free: {
        name: 'Free',
        monthlyCredits: 50,
        dailyLimit: 10,
        features: ['basic_chat', 'link_sources', 'note_sources'],
        price: 0
    },
    starter: {
        name: 'Starter',
        monthlyCredits: 500,
        dailyLimit: 100,
        features: ['basic_chat', 'link_sources', 'note_sources', 'drive_sources', 'content_plans', 'image_gen'],
        price: 19
    },
    pro: {
        name: 'Pro',
        monthlyCredits: 2000,
        dailyLimit: 500,
        features: ['basic_chat', 'link_sources', 'note_sources', 'drive_sources', 'content_plans', 'image_gen', 'scheduling', 'analytics', 'priority_support'],
        price: 49
    },
    enterprise: {
        name: 'Enterprise',
        monthlyCredits: 10000,
        dailyLimit: 2000,
        features: ['basic_chat', 'link_sources', 'note_sources', 'drive_sources', 'content_plans', 'image_gen', 'scheduling', 'analytics', 'priority_support', 'custom_agents', 'api_access', 'white_label'],
        price: 199
    }
};

/**
 * Credit costs for different operations
 */
const CREDIT_COSTS = {
    chat_message: 1,
    generate_summary: 2,
    content_plan_quick: 1,
    content_plan_strategy: 10,
    content_plan_knowledge: 5,
    content_plan_create: 15,
    image_flux: 1,
    image_stability: 1,
    image_dalle: 5,
    image_ideogram: 6,
    source_analysis: 1
};

/**
 * Get user credits and usage
 */
exports.getUserCredits = onCall(
    {
        cors: ALLOWED_ORIGINS,
        region: 'us-central1'
    },
    async (request) => {
        if (!request.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
        }

        const userId = request.auth.uid;

        try {
            // Get user document
            const userDoc = await db.collection('users').doc(userId).get();

            if (!userDoc.exists) {
                // Create default user record
                const defaultData = {
                    plan: 'free',
                    credits: PLAN_TIERS.free.monthlyCredits,
                    creditsUsedToday: 0,
                    creditsUsedThisMonth: 0,
                    lastCreditReset: admin.firestore.FieldValue.serverTimestamp(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };
                await db.collection('users').doc(userId).set(defaultData);

                return {
                    success: true,
                    plan: 'free',
                    planDetails: PLAN_TIERS.free,
                    credits: PLAN_TIERS.free.monthlyCredits,
                    creditsUsedToday: 0,
                    creditsUsedThisMonth: 0,
                    dailyLimit: PLAN_TIERS.free.dailyLimit
                };
            }

            const userData = userDoc.data();
            const plan = userData.plan || 'free';
            const planDetails = PLAN_TIERS[plan] || PLAN_TIERS.free;

            // Check if daily reset needed
            const lastReset = userData.lastDailyReset?.toDate() || new Date(0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let creditsUsedToday = userData.creditsUsedToday || 0;
            if (lastReset < today) {
                // Reset daily usage
                creditsUsedToday = 0;
                await db.collection('users').doc(userId).update({
                    creditsUsedToday: 0,
                    lastDailyReset: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return {
                success: true,
                plan,
                planDetails,
                credits: userData.credits || 0,
                creditsUsedToday,
                creditsUsedThisMonth: userData.creditsUsedThisMonth || 0,
                dailyLimit: planDetails.dailyLimit
            };

        } catch (error) {
            console.error('[getUserCredits] Error:', error);
            throw new functions.https.HttpsError('internal', error.message);
        }
    });

/**
 * Deduct credits for an operation
 */
exports.deductCredits = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { operation, amount } = data;
    const userId = context.auth.uid;

    // Calculate cost
    const cost = amount || CREDIT_COSTS[operation] || 1;

    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new Error('User not found');
        }

        const userData = userDoc.data();
        const plan = userData.plan || 'free';
        const planDetails = PLAN_TIERS[plan];

        // Check credits
        if ((userData.credits || 0) < cost) {
            return {
                success: false,
                error: 'insufficient_credits',
                message: 'Not enough credits',
                required: cost,
                available: userData.credits || 0
            };
        }

        // Check daily limit
        const creditsUsedToday = userData.creditsUsedToday || 0;
        if (creditsUsedToday + cost > planDetails.dailyLimit) {
            return {
                success: false,
                error: 'daily_limit_exceeded',
                message: 'Daily credit limit reached',
                dailyLimit: planDetails.dailyLimit,
                usedToday: creditsUsedToday
            };
        }

        // Deduct credits
        await userRef.update({
            credits: admin.firestore.FieldValue.increment(-cost),
            creditsUsedToday: admin.firestore.FieldValue.increment(cost),
            creditsUsedThisMonth: admin.firestore.FieldValue.increment(cost)
        });

        // Log usage
        await db.collection('users').doc(userId).collection('creditHistory').add({
            operation,
            cost,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            remainingCredits: (userData.credits || 0) - cost
        });

        return {
            success: true,
            deducted: cost,
            remaining: (userData.credits || 0) - cost
        };

    } catch (error) {
        console.error('[deductCredits] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Check if user has feature access
 */
exports.checkFeatureAccess = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { feature } = data;
    const userId = context.auth.uid;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const plan = userDoc.exists ? (userDoc.data().plan || 'free') : 'free';
        const planDetails = PLAN_TIERS[plan];

        const hasAccess = planDetails.features.includes(feature);

        return {
            success: true,
            hasAccess,
            plan,
            requiredPlan: getMinimumPlanForFeature(feature)
        };

    } catch (error) {
        console.error('[checkFeatureAccess] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

function getMinimumPlanForFeature(feature) {
    for (const [planId, plan] of Object.entries(PLAN_TIERS)) {
        if (plan.features.includes(feature)) {
            return planId;
        }
    }
    return 'enterprise';
}

/**
 * Get usage analytics
 */
exports.getUsageAnalytics = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = context.auth.uid;
    const { period = '30d' } = data;

    try {
        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        switch (period) {
            case '7d': startDate.setDate(now.getDate() - 7); break;
            case '30d': startDate.setDate(now.getDate() - 30); break;
            case '90d': startDate.setDate(now.getDate() - 90); break;
            default: startDate.setDate(now.getDate() - 30);
        }

        // Get credit history
        const historySnapshot = await db.collection('users').doc(userId)
            .collection('creditHistory')
            .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
            .orderBy('timestamp', 'desc')
            .get();

        const history = [];
        const usageByOperation = {};
        let totalUsed = 0;

        historySnapshot.forEach(doc => {
            const data = doc.data();
            history.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate()?.toISOString()
            });

            const op = data.operation || 'unknown';
            usageByOperation[op] = (usageByOperation[op] || 0) + (data.cost || 0);
            totalUsed += data.cost || 0;
        });

        // Get user info
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() || {};

        return {
            success: true,
            period,
            totalUsed,
            usageByOperation,
            recentHistory: history.slice(0, 20),
            currentCredits: userData.credits || 0,
            plan: userData.plan || 'free'
        };

    } catch (error) {
        console.error('[getUsageAnalytics] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Add credits (admin or purchase)
 */
exports.addCredits = functions.https.onCall(async (data, context) => {
    const { userId, amount, reason } = data;

    // For now, allow self-adding for testing (in production, restrict to admin)
    const targetUserId = userId || context.auth?.uid;

    if (!targetUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID required');
    }

    try {
        await db.collection('users').doc(targetUserId).update({
            credits: admin.firestore.FieldValue.increment(amount)
        });

        // Log
        await db.collection('users').doc(targetUserId).collection('creditHistory').add({
            operation: 'credit_added',
            amount,
            reason: reason || 'manual_add',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            added: amount,
            message: `Added ${amount} credits`
        };

    } catch (error) {
        console.error('[addCredits] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get plan details
 */
exports.getPlanDetails = functions.https.onCall(async (data, context) => {
    return {
        success: true,
        plans: PLAN_TIERS,
        creditCosts: CREDIT_COSTS
    };
});

// ============================================================
// STRIPE PAYMENT INTEGRATION
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Stripe Price IDs (set these in Firebase config or environment)
const STRIPE_PRICES = {
    starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
    starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly',
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
    enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
    enterprise_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly'
};

/**
 * Create Stripe Checkout Session for subscription
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { priceId, planId, billingPeriod = 'monthly' } = data;
    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;

    try {
        // Get or create Stripe customer
        let customerId;
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() || {};

        if (userData.stripeCustomerId) {
            customerId = userData.stripeCustomerId;
        } else {
            // Create new Stripe customer
            const customer = await stripe.customers.create({
                email: userEmail,
                metadata: {
                    firebaseUID: userId
                }
            });
            customerId = customer.id;

            // Save customer ID to Firestore
            await db.collection('users').doc(userId).update({
                stripeCustomerId: customerId
            });
        }

        // Get the correct price ID
        const stripePriceId = priceId || STRIPE_PRICES[`${planId}_${billingPeriod}`];

        if (!stripePriceId || stripePriceId.startsWith('price_')) {
            // Return placeholder for test mode
            console.log('[Stripe] Test mode - no real price IDs configured');
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price: stripePriceId,
                quantity: 1
            }],
            mode: 'subscription',
            success_url: `${data.successUrl || 'https://yourapp.com/settings'}?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: data.cancelUrl || 'https://yourapp.com/settings?canceled=true',
            metadata: {
                firebaseUID: userId,
                planId: planId
            },
            subscription_data: {
                metadata: {
                    firebaseUID: userId,
                    planId: planId
                }
            },
            allow_promotion_codes: true
        });

        return {
            success: true,
            sessionId: session.id,
            url: session.url
        };

    } catch (error) {
        console.error('[createCheckoutSession] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Create Stripe Customer Portal session
 */
exports.createCustomerPortal = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = context.auth.uid;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (!userData?.stripeCustomerId) {
            throw new Error('No Stripe customer found');
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: userData.stripeCustomerId,
            return_url: data.returnUrl || 'https://yourapp.com/settings'
        });

        return {
            success: true,
            url: session.url
        };

    } catch (error) {
        console.error('[createCustomerPortal] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Stripe Webhook Handler
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
        console.error('[stripeWebhook] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutComplete(event.data.object);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionCanceled(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            default:
                console.log(`[stripeWebhook] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('[stripeWebhook] Handler error:', error);
        res.status(500).send('Webhook handler failed');
    }
});

/**
 * Handle checkout completion
 */
async function handleCheckoutComplete(session) {
    const userId = session.metadata?.firebaseUID;
    const planId = session.metadata?.planId;

    if (!userId) {
        console.error('[handleCheckoutComplete] No user ID in metadata');
        return;
    }

    console.log(`[handleCheckoutComplete] User ${userId} completed checkout for ${planId}`);

    // Update user plan
    const planCredits = PLAN_TIERS[planId]?.monthlyCredits || 50;

    await db.collection('users').doc(userId).update({
        plan: planId,
        credits: planCredits,
        creditsUsedThisMonth: 0,
        subscriptionStatus: 'active',
        subscriptionId: session.subscription,
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[handleCheckoutComplete] Updated user ${userId} to ${planId} plan with ${planCredits} credits`);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription) {
    const userId = subscription.metadata?.firebaseUID;

    if (!userId) {
        // Try to find user by customer ID
        const customerId = subscription.customer;
        const usersSnapshot = await db.collection('users')
            .where('stripeCustomerId', '==', customerId)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.error('[handleSubscriptionUpdate] No user found for customer:', customerId);
            return;
        }

        const userDoc = usersSnapshot.docs[0];
        const planId = subscription.metadata?.planId || determinePlanFromPrice(subscription.items.data[0]?.price?.id);

        await userDoc.ref.update({
            subscriptionStatus: subscription.status,
            subscriptionId: subscription.id,
            plan: planId,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        });

        return;
    }

    const planId = subscription.metadata?.planId || 'pro';

    await db.collection('users').doc(userId).update({
        subscriptionStatus: subscription.status,
        subscriptionId: subscription.id,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    });
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(subscription) {
    const customerId = subscription.customer;

    const usersSnapshot = await db.collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.error('[handleSubscriptionCanceled] No user found');
        return;
    }

    const userDoc = usersSnapshot.docs[0];

    // Downgrade to free plan
    await userDoc.ref.update({
        plan: 'free',
        credits: PLAN_TIERS.free.monthlyCredits,
        subscriptionStatus: 'canceled',
        subscriptionId: null
    });

    console.log(`[handleSubscriptionCanceled] Downgraded user to free plan`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
    const customerId = invoice.customer;

    const usersSnapshot = await db.collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) return;

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const planCredits = PLAN_TIERS[userData.plan]?.monthlyCredits || 50;

    // Reset monthly credits
    await userDoc.ref.update({
        credits: planCredits,
        creditsUsedThisMonth: 0,
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[handlePaymentSucceeded] Reset credits for user to ${planCredits}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
    const customerId = invoice.customer;

    const usersSnapshot = await db.collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

    if (usersSnapshot.empty) return;

    const userDoc = usersSnapshot.docs[0];

    await userDoc.ref.update({
        subscriptionStatus: 'past_due'
    });

    console.log(`[handlePaymentFailed] Marked subscription as past_due`);
}

/**
 * Determine plan from Stripe price ID
 */
function determinePlanFromPrice(priceId) {
    if (!priceId) return 'free';

    for (const [key, value] of Object.entries(STRIPE_PRICES)) {
        if (value === priceId) {
            return key.split('_')[0]; // Extract plan name (starter, pro, enterprise)
        }
    }
    return 'pro'; // Default
}

/**
 * Get user subscription status
 */
exports.getSubscriptionStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = context.auth.uid;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() || {};

        return {
            success: true,
            plan: userData.plan || 'free',
            subscriptionStatus: userData.subscriptionStatus || 'none',
            currentPeriodEnd: userData.currentPeriodEnd?.toDate?.()?.toISOString() || null,
            hasActiveSubscription: ['active', 'trialing'].includes(userData.subscriptionStatus)
        };

    } catch (error) {
        console.error('[getSubscriptionStatus] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Cancel subscription
 */
exports.cancelSubscription = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = context.auth.uid;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (!userData?.subscriptionId) {
            throw new Error('No active subscription');
        }

        // Cancel at period end (user keeps access until end of billing period)
        await stripe.subscriptions.update(userData.subscriptionId, {
            cancel_at_period_end: true
        });

        await db.collection('users').doc(userId).update({
            subscriptionStatus: 'canceling'
        });

        return {
            success: true,
            message: 'Subscription will be canceled at the end of the billing period'
        };

    } catch (error) {
        console.error('[cancelSubscription] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Generate Content Plan for Knowledge Hub
 * Creates various types of content plans based on brand sources
 */
exports.generateContentPlan = onCall({ cors: ALLOWED_ORIGINS }, async (request) => {
    const { projectId, planType, targetLanguage, additionalInstructions } = request.data;

    if (!projectId || !planType) {
        return { success: false, error: 'Missing required parameters' };
    }

    try {
        // Get knowledge sources
        const sourcesSnap = await db.collection('projects').doc(projectId)
            .collection('knowledgeSources')
            .where('isActive', '==', true)
            .limit(10)
            .get();

        // Build context from sources
        let sourceContext = '';
        sourcesSnap.forEach(doc => {
            const source = doc.data();
            if (source.content || source.summary) {
                sourceContext += `\n\n### ${source.title || 'Source'}\n`;
                sourceContext += source.summary || source.content?.substring(0, 2000) || '';
            }
        });

        // Language mapping
        const languageMap = {
            'ko': 'Korean',
            'en': 'English',
            'ja': 'Japanese',
            'zh': 'Chinese',
            'es': 'Spanish'
        };
        const language = languageMap[targetLanguage] || 'Korean';

        // Plan type prompts
        const planPrompts = {
            // Strategic Plans
            campaign_brief: `Create a comprehensive marketing campaign brief including:
- Campaign Objectives (SMART goals)
- Target Audience Definition
- Key Messages & Value Propositions
- Channel Strategy
- Timeline & Milestones
- Success Metrics & KPIs
- Budget Considerations`,

            content_calendar: `Create a monthly content calendar including:
- Week-by-week content themes
- Daily posting schedule by platform
- Content types (blog, social, video, etc.)
- Key dates and events to leverage
- Content pillars and topics
- Engagement tactics`,

            channel_strategy: `Develop a platform-specific strategy including:
- Platform prioritization and rationale
- Content format recommendations per platform
- Posting frequency guidelines
- Audience engagement tactics
- Platform-specific best practices
- Cross-promotion strategies`,

            brand_positioning: `Create a brand positioning document including:
- Brand Mission & Vision
- Unique Value Proposition
- Competitive Positioning Map
- Brand Personality & Voice
- Key Differentiators
- Target Market Segments`,

            messaging_framework: `Develop a messaging framework including:
- Core Brand Message
- Key Message Pillars (3-5)
- Audience-specific messaging
- Proof points and evidence
- Call-to-action library
- Tone and voice guidelines`,

            // Quick Actions
            social_post_ideas: `Generate 10 social media post ideas including:
- Hook/Opening line
- Main message
- Call to action
- Suggested hashtags
- Recommended platform`,

            ad_copy: `Create 5 ad copy variations including:
- Headline options
- Body copy
- Call to action
- Emotional appeal variant
- Value proposition variant`,

            trend_response: `Identify current trends and create:
- 3 trend opportunities
- Content response for each trend
- Timing recommendations
- Risk assessment`,

            action_items: `Create a prioritized action list including:
- High priority items (this week)
- Medium priority (this month)
- Backlog items
- Resource requirements
- Expected outcomes`,

            // Knowledge
            brand_mind_map: `Create a comprehensive hierarchical brand mind map.
IMPORTANT: Return ONLY a valid JSON object wrapped in \`\`\`json\`\`\`.
Structure:
{
  "name": "Brand Name",
  "children": [
    {
      "name": "Category (e.g. Core Values)",
      "children": [
        {
          "name": "Concept",
          "description": "Brief explanation",
          "sourceReference": {
            "title": "Exact Source Document Title",
            "snippet": "Relevant text excerpt from source (approx 200 chars)..."
          }
        }
      ]
    }
  ]
}
Ensure deep coverage: Core Identity, Products, Target Audience, Values, Channels.
Do not include any text outside the JSON block.`,

            competitor_analysis: `Conduct competitive analysis:
- Top 3-5 competitors identified
- Strengths and weaknesses
- Positioning comparison
- Content strategy analysis
- Opportunity gaps`,

            audience_persona: `Create detailed audience personas:
- Demographics
- Psychographics
- Pain points
- Goals and motivations
- Content preferences
- Buying journey`,

            key_messages_bank: `Build a key messages repository:
- Primary brand message
- Product/service messages
- Audience-specific messages
- FAQ responses
- Objection handlers`,

            // Create Now
            product_brochure: `Create brochure content structure:
- Headline and tagline
- Product overview (100 words)
- Key features (5-7 bullets)
- Benefits section
- Testimonial/social proof area
- Call to action`,

            one_pager: `Create executive summary content:
- Company/product headline
- Problem statement
- Solution overview
- Key differentiators
- Proof points
- Contact/next steps`,

            pitch_deck: `Outline pitch deck structure:
- Title slide content
- Problem slide
- Solution slide
- Market opportunity
- Business model
- Team highlights
- Ask/call to action`,

            email_template: `Create email template sets:
- Welcome email
- Follow-up email
- Promotional email
- Newsletter template
- Re-engagement email`,

            press_release: `Draft press release:
- Headline and subhead
- Opening paragraph (who, what, when, where, why)
- Body content
- Quote from spokesperson
- Boilerplate
- Media contact info`
        };

        const planPrompt = planPrompts[planType] || planPrompts.social_post_ideas;

        // Build the full prompt
        const systemPrompt = `You are an expert marketing strategist and content creator. 
Based on the provided brand information, create high-quality, actionable content.
Respond ONLY in ${language}. Be specific, practical, and professional.`;

        const userPrompt = `Based on the following brand information:

${sourceContext}

${planPrompt}

${additionalInstructions ? `Additional requirements: ${additionalInstructions}` : ''}

${planType === 'brand_mind_map'
                ? 'ENSURE OUTPUT IS VALID JSON ONLY. No markdown conversational text.'
                : 'Create a comprehensive, well-structured output. Use markdown formatting with headers, bullet points, and clear sections.'}`;

        // Get OpenAI API key from Firestore
        const apiKey = await getSystemApiKey('openai');
        if (!apiKey) {
            throw new Error('OpenAI API key not configured. Please set it in Admin Settings > LLM Providers.');
        }

        // Call OpenAI
        const { OpenAI } = require('openai');
        const openai = new OpenAI({
            apiKey: apiKey
        });

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        const content = completion.choices[0]?.message?.content || '';

        return {
            success: true,
            content: content,
            planType: planType,
            language: targetLanguage
        };

    } catch (error) {
        console.error('[generateContentPlan] Error:', error);
        return { success: false, error: error.message };
    }
});

exports.generateCreativeContent = onCall({ cors: true }, async (request) => {
    // 1. Auth Check - moved inside try to ensure valid logging if needed, but keeping simple return for now
    if (!request.auth) {
        return { success: false, error: 'Unauthenticated' };
    }

    try {
        const { type, inputs = {}, projectContext, targetLanguage = 'English', mode = 'balanced' } = request.data || {};
        const { topic, tone, format, audience, slideCount, ratio, style, negativePrompt } = inputs;
        const startTime = Date.now();

        console.log(`[generateCreativeContent] Starting: ${type}, Mode: ${mode}`);

        // 2. Get OpenAI Key (for both Router and Arena)
        const apiKey = await getSystemApiKey('openai');
        if (!apiKey) throw new Error('OpenAI API key not configured');

        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey });

        // Helper: Model Agnostic Execution
        const executeLLM = async (messages, config) => {
            const completion = await openai.chat.completions.create({
                model: config.model || 'gpt-4o',
                messages: messages,
                temperature: config.temperature || 0.7
            });
            return completion.choices[0].message.content;
        };

        // 3. Handle Image Generation (Bypass Arena for now, logic kept simple)
        // 3. Handle Image Generation (Smart Route for Text)
        if (type === 'promo_images') {
            console.log('[generateCreativeContent] Image gen requested. Routing...');

            // Check for text requirements to prioritize Ideogram
            const hasTextRequirement = /logo|text|banner|title|headline|caption|font|typography/i.test(topic + ' ' + style);

            // Get available providers
            const providersDoc = await db.collection('systemSettings').doc('imageProviders').get();
            const providers = providersDoc.exists ? providersDoc.data() : {};

            // Priority: Ideogram (if text) > Flux (Performance) > DALL-E (Fallback)
            let selectedProvider = 'dalle';

            if (hasTextRequirement && providers.ideogram?.apiKey && providers.ideogram?.enabled !== false) {
                selectedProvider = 'ideogram';
            } else if (providers.flux?.apiKey && providers.flux?.enabled !== false) {
                selectedProvider = 'flux';
            } else if (providers.ideogram?.apiKey && providers.ideogram?.enabled !== false) {
                // Even if no text, Ideogram is often better for "Promo" than DALL-E
                selectedProvider = 'ideogram';
            }

            console.log(`[generateCreativeContent] Selected Provider: ${selectedProvider} (Text Req: ${hasTextRequirement})`);

            // Use Smart Image Logic
            // Note: We duplicate logic slightly to avoid cloud function self-invocation latency/complexity
            if (selectedProvider === 'ideogram') {
                try {
                    const ideogramResult = await generateWithIdeogram(
                        topic + ' ' + style + (projectContext ? ` Context: ${projectContext.substring(0, 200)}` : ''),
                        await getImageApiKey('ideogram')
                    );
                    return { success: true, type: 'image', data: [ideogramResult] };
                } catch (err) { console.error('Ideogram failed', err); /* Fallback */ }
            }

            // Fallback to Nanobananana (Flux)
            if (selectedProvider === 'flux' || selectedProvider === 'dalle') { // Attempt Flux first if selected or fallback for Ideogram
                try {
                    const bananaResult = await callNanobananana({
                        prompt: topic + ' ' + style,
                        negative_prompt: negativePrompt || 'text, blurry, low quality',
                        width: 1024,
                        height: 1024,
                        num_inference_steps: 30
                    });
                    if (bananaResult && bananaResult.length > 0) {
                        return { success: true, type: 'image', data: bananaResult };
                    }
                } catch (bananaError) {
                    console.warn('Flux failed, falling back to DALL-E');
                }
            }

            const imagePrompt = `High quality, professional promotional image. Topic: ${topic}. Style: ${style}. Context: ${projectContext}. Negative prompt: ${negativePrompt || 'text, blurry, low quality'}.`;

            try {
                const response = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: imagePrompt,
                    n: 1, // DALL-E 3 supports 1 per request
                    size: "1024x1024",
                    quality: "standard",
                    response_format: "url"
                });

                return {
                    success: true,
                    type: 'image',
                    data: [response.data[0].url] // Return array for grid
                };
            } catch (imgError) {
                console.error('Image Gen Error:', imgError);
                return { success: false, error: 'Image generation failed: ' + imgError.message };
            }
        }

        // 4. ZYNK Core Routing (Text Generation)
        // Plan the strategy
        const plan = StrategyPlanner.plan({ mode, taskType: type });
        console.log(`[ZYNK Core] Strategy Planned: ${plan.mode} (Arena: ${plan.useArena})`);

        let resultData = '';
        let debugLogs = '';

        // Formulate Base Prompt
        let systemPrompt = `You are an expert creative content generator. Create content in ${targetLanguage}. Return ONLY valid HTML code inside a div. No markdown fences.`;
        let userPrompt = `Context: ${projectContext}\nTopic: ${topic}\nTone: ${tone}\nTarget Audience: ${audience}\n`;

        // Type-specific additions
        if (type === 'product_brochure') {
            userPrompt += `Create a specialized Product Brochure in ${format} layout. Structure HTML for A4. Use Tailwind CSS. Sections: Cover, Problem, Solution, Key Features.`;
        } else if (type === 'one_pager') {
            userPrompt += `Create a high-density One-Pager Executive Summary. Sections: Challenge, Approach, Roadmap, Metrics.`;
        } else if (type === 'pitch_deck') {
            userPrompt += `Create content for a ${slideCount} slide Pitch Deck. Return HTML grid of cards.`;
        } else if (type === 'email_template') {
            userPrompt += `Create a professional Email Template for ${inputs.emailType}. Include Subject, Body, Signature.`;
        } else if (type === 'press_release') {
            userPrompt += `Create a formal Press Release for ${inputs.announcementType}. Format: FOR IMMEDIATE RELEASE, Dateline, Body, Quote, Boilerplate.`;
        }

        if (plan.useArena) {
            // === ADVERSARIAL MODE ===
            const arena = new AdversarialLoop(executeLLM);
            const arenaResult = await arena.run(
                userPrompt, // Task
                projectContext || "No context provided",
                { rounds: plan.rounds, models: { pro: plan.modelConfig, balanced: plan.modelConfig } }
            );

            // The Arena returns pure text/markdown, we might need to wrap it in HTML if the prompt didn't enforce it perfectly.
            // But 'The Judge' usually standardizes it.
            resultData = arenaResult.finalOutput;
            debugLogs = arenaResult.logs;

        } else {
            // === FAST PATH (Eco/Simple) ===
            const completion = await openai.chat.completions.create({
                model: plan.modelConfig.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: plan.modelConfig.temperature
            });
            resultData = completion.choices[0].message.content;
            debugLogs = "Fast Path Execution (No Debate)";
        }

        const endTime = Date.now();
        const latencyMs = endTime - startTime;

        // 5. Log Execution (Async)
        await FeedbackLoop.logExecution({
            userId: request.auth.uid,
            taskType: type,
            inputs: inputs,
            mode: plan.mode,
            modelConfig: plan.modelConfig,
            output: resultData,
            latencyMs: latencyMs,
            status: 'success'
        });

        return {
            success: true,
            type: 'html',
            content: resultData,
            meta: {
                mode: plan.mode,
                logs: debugLogs,
                drafts: null // Drafts from Arena are captured in debugLogs if needed
            }
        };

    } catch (error) {
        console.error('[generateCreativeContent] Error:', error);

        // Log Failure
        try {
            await FeedbackLoop.logExecution({
                userId: request.auth ? request.auth.uid : 'anonymous',
                taskType: type,
                inputs: inputs,
                mode: mode || 'balanced',
                latencyMs: 0,
                status: 'error: ' + error.message
            });
        } catch (logErr) { console.error('Log failed', logErr); }

        return { success: false, error: error.message };
    }
});

// Helper for Nanobananana (Flux)
async function callNanobananana(params) {
    const apiKey = await getSystemApiKey('banana');
    if (!apiKey) return null; // Skip if no key configured

    // Fetch config for Model ID and URL if needed (optional, or hardcode)
    // Assume we use a known FLUX endpoint on Banana.dev or similar
    // Since "Nanobananana" might be a custom name, I'll use a generic fetch structure

    // For now, assuming direct HTTP request to a specific endpoint
    // User needs to provide: API Key, and maybe Model ID in the future.
    // We will trust the key has access to the model.

    const ENDPOINT = "https://api.banana.dev/start/v4/"; // Standard Banana V4
    const MODEL_KEY = "flux-dev"; // Placeholder, user might need to change this via config

    const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            apiKey: apiKey,
            modelKey: MODEL_KEY,
            modelInputs: params
        })
    });

    const result = await response.json();

    // Banana returns a callID usually, then we might need to poll or if it's sync...
    // Flux is often heavy, so usually async. But let's assume they might have a synchronous wrapper or we poll.
    // For simplicity in this iteration: Check if direct result or need polling.
    // If it's the standard async Banana pattern, we need a poll loop.

    if (result.callID) {
        // Poll for result
        return await pollBananaResult(result.callID, apiKey);
    } else if (result.modelOutputs) {
        // Direct result (unlikely for Flux but possible)
        return result.modelOutputs.map(out => out.image_url || out.image).filter(Boolean);
    }

    return null;
}

async function pollBananaResult(callID, apiKey) {
    const CHECK_URL = "https://api.banana.dev/check/v4/";
    const MAX_RETRIES = 60; // 1 minute roughly

    for (let i = 0; i < MAX_RETRIES; i++) {
        await new Promise(r => setTimeout(r, 1000));

        const response = await fetch(CHECK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: apiKey,
                callID: callID
            })
        });

        const data = await response.json();
        if (data.message === "success") {
            // Found it
            // Parse output. Flux usually returns base64 or a URL depending on handler code.
            // Let's assume standard array of outputs.
            return data.modelOutputs?.map(out => out.image_url || out.image_base64 || out.image).filter(Boolean);
        } else if (data.message === "failed") {
            throw new Error("Banana Model Run Failed");
        }
        // else "running" or "queued" -> continue
    }
    throw new Error("Timeout waiting for Banana");
}

/**
 * Submit User Feedback for ZYNK Core
 * Updates the Taste Matrix
 */
exports.submitFeedback = onCall({ cors: true }, async (request) => {
    // 1. Verify Auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { projectId, rating, mode, planType, feedbackText } = request.data;
    const userId = request.auth.uid;

    try {
        // Construct feedback data for Taste Matrix
        const feedbackData = {
            decision: null, // 'disruptor' | 'purist' (implied by content choice, but here we just have rating)
            mode: mode,
            rating: rating, // 'good' | 'bad'
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        // Heuristic: If they liked 'Pro' (Arena) output, maybe they are risk tolerant?
        // If they liked 'Eco', maybe they value speed/efficiency?
        // For now, valid 'decision' updating requires explicit choice UI (Expert Mode).
        // Here we just log the rating.

        await FeedbackLoop.updateTaste(userId, feedbackData);

        return { success: true };

    } catch (error) {
        console.error('[submitFeedback] Error:', error);
        return { success: false, error: error.message };
    }
});
