/**
 * ZINC Firebase Cloud Functions
 * Handles secure API calls to LLM providers (OpenAI, etc.)
 */

const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Admin SDK with explicit project config
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'zinc-c790f'
});

const db = admin.firestore();

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
 * Execute a single sub-agent
 * Called from the frontend AgentExecutionService
 */
exports.executeSubAgent = functions.https.onCall(async (data, context) => {
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

        // Call OpenAI
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model: model || 'gpt-4',
            messages: messages,
            temperature: temperature || 0.7,
            max_tokens: 2000
        });

        const output = response.choices[0]?.message?.content || '';

        // Log execution to Firestore (optional)
        await db.collection('projects').doc(projectId)
            .collection('agentRuns').doc(runId)
            .collection('subAgentLogs').add({
                subAgentId,
                status: 'completed',
                output,
                model: response.model,
                usage: response.usage,
                executedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        return {
            success: true,
            output,
            usage: response.usage,
            model: response.model
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
 * Post content to Twitter/X
 * This function posts approved content to the user's X account
 */
exports.postToTwitter = functions.https.onCall(async (data, context) => {
    // Normalize data payload
    const payload = (data && data.data) ? data.data : data;
    const { projectId, contentId, tweetText, userId } = payload;

    if (!projectId || !contentId || !tweetText) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: projectId, contentId, tweetText');
    }

    console.log(`[postToTwitter] Posting content ${contentId} for project ${projectId}`);

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

        // 3. Post tweet
        const tweet = await client.v2.tweet(tweetText);

        console.log(`[postToTwitter] Tweet posted successfully: ${tweet.data.id}`);

        // 4. Update content status in Firestore
        await db.collection('projects').doc(projectId)
            .collection('generatedContents').doc(contentId)
            .update({
                status: 'published',
                published_at: admin.firestore.FieldValue.serverTimestamp(),
                tweet_id: tweet.data.id,
                tweet_url: `https://twitter.com/user/status/${tweet.data.id}`
            });

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
                    executeScheduledRun(doc.id, team.project_id, schedule)
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

