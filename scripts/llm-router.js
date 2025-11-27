// llm-router.js
// LLM Provider Abstraction Layer
// Supports: Mock, OpenAI, Anthropic, Google (extensible)

(function () {
    const projectId = "default_project";

    /**
     * Main Router Function
     * @param {string} runtimeProfileId - RuntimeProfile ID (e.g., "rtp_chat_balanced_v1")
     * @param {object} payload - { systemPrompt, userPrompt, temperature, maxTokens, jsonMode }
     * @returns {Promise<object>} - { text, parsedJson, usage, latencyMs, provider, model }
     */
    window.callLLM = async function (runtimeProfileId, payload) {
        const startTime = Date.now();

        try {
            // 1. Load RuntimeProfile
            const profile = await loadRuntimeProfile(runtimeProfileId);
            if (!profile) {
                throw new Error(`RuntimeProfile not found: ${runtimeProfileId}`);
            }

            // 2. Route to appropriate provider
            let result;
            switch (profile.provider) {
                case 'mock':
                    result = await callMockProvider(profile, payload);
                    break;
                case 'openai':
                    result = await callOpenAIProvider(profile, payload);
                    break;
                case 'anthropic':
                    result = await callAnthropicProvider(profile, payload);
                    break;
                case 'google':
                    result = await callGoogleProvider(profile, payload);
                    break;
                default:
                    throw new Error(`Unknown provider: ${profile.provider}`);
            }

            const latencyMs = Date.now() - startTime;

            // 3. Parse JSON if requested
            let parsedJson = null;
            if (payload.jsonMode && result.text) {
                try {
                    parsedJson = JSON.parse(result.text);
                } catch (e) {
                    console.warn('JSON parsing failed:', e);
                }
            }

            return {
                text: result.text,
                parsedJson: parsedJson,
                usage: result.usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                latencyMs: latencyMs,
                provider: profile.provider,
                model: profile.model_id,
                runtimeProfileId: runtimeProfileId
            };

        } catch (error) {
            console.error('LLM call failed:', error);
            throw error;
        }
    };

    /**
     * Load RuntimeProfile from Firestore
     */
    async function loadRuntimeProfile(profileId) {
        try {
            const doc = await db.collection(`projects/${projectId}/runtimeProfiles`).doc(profileId).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('Error loading RuntimeProfile:', error);
            return null;
        }
    }

    // ============================================
    // MOCK PROVIDER (for testing without API keys)
    // ============================================
    async function callMockProvider(profile, payload) {
        console.log('[Mock Provider] Simulating LLM call...');

        // Simulate network delay
        await sleep(800 + Math.random() * 400); // 800-1200ms

        const role = extractRoleFromPrompt(payload.userPrompt);
        const mockResponses = {
            planner: {
                goal: "Create engaging weekend cafe content",
                target_audience: "25-35 year olds",
                tone: "casual and friendly",
                content_outline: ["Hook", "Cafe description", "Call to action", "Hashtags"]
            },
            creator: {
                title: "주말엔 이 카페 어때요? ☕",
                caption: "오늘은 성수동의 조용한 카페 한 곳을 소개할게요. 창가 자리에 앉아 따뜻한 라떼 한 잔과 함께 여유로운 시간을 보내기 딱 좋은 곳이에요.",
                hashtags: ["#성수카페", "#주말데이트", "#카페추천", "#서울카페"],
                call_to_action: "이번 주말 한 번 들러보세요!"
            },
            manager: {
                decision: "PASS",
                release_ready: true,
                comments: "Content quality is good. Tone matches brand guidelines."
            }
        };

        const response = mockResponses[role] || { message: "Mock response generated" };
        const text = JSON.stringify(response, null, 2);

        return {
            text: text,
            usage: {
                inputTokens: Math.floor((payload.systemPrompt?.length || 0) / 4 + (payload.userPrompt?.length || 0) / 4),
                outputTokens: Math.floor(text.length / 4),
                totalTokens: 0
            }
        };
    }

    function extractRoleFromPrompt(prompt) {
        const lower = prompt.toLowerCase();
        if (lower.includes('planner') || lower.includes('plan')) return 'planner';
        if (lower.includes('creator') || lower.includes('create')) return 'creator';
        if (lower.includes('manager') || lower.includes('approve')) return 'manager';
        return 'creator'; // default
    }

    // ============================================
    // OPENAI PROVIDER (requires API key)
    // ============================================
    async function callOpenAIProvider(profile, payload) {
        console.log('[OpenAI Provider] Calling API...');

        // Check for API key
        const apiKey = getAPIKey('openai');
        if (!apiKey) {
            throw new Error('OpenAI API key not configured. Please set it in settings.');
        }

        const messages = [
            { role: 'system', content: payload.systemPrompt },
            { role: 'user', content: payload.userPrompt }
        ];

        const requestBody = {
            model: profile.model_id || 'gpt-4o-mini',
            messages: messages,
            temperature: payload.temperature || 0.7,
            max_tokens: payload.maxTokens || 1000
        };

        if (payload.jsonMode) {
            requestBody.response_format = { type: 'json_object' };
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();

            return {
                text: data.choices[0].message.content,
                usage: {
                    inputTokens: data.usage.prompt_tokens,
                    outputTokens: data.usage.completion_tokens,
                    totalTokens: data.usage.total_tokens
                }
            };
        } catch (error) {
            console.error('OpenAI API call failed:', error);
            throw error;
        }
    }

    // ============================================
    // ANTHROPIC PROVIDER (requires API key)
    // ============================================
    async function callAnthropicProvider(profile, payload) {
        console.log('[Anthropic Provider] Calling API...');

        const apiKey = getAPIKey('anthropic');
        if (!apiKey) {
            throw new Error('Anthropic API key not configured.');
        }

        const requestBody = {
            model: profile.model_id || 'claude-3-5-sonnet-20241022',
            max_tokens: payload.maxTokens || 1024,
            temperature: payload.temperature || 0.7,
            system: payload.systemPrompt,
            messages: [
                { role: 'user', content: payload.userPrompt }
            ]
        };

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();

            return {
                text: data.content[0].text,
                usage: {
                    inputTokens: data.usage.input_tokens,
                    outputTokens: data.usage.output_tokens,
                    totalTokens: data.usage.input_tokens + data.usage.output_tokens
                }
            };
        } catch (error) {
            console.error('Anthropic API call failed:', error);
            throw error;
        }
    }

    // ============================================
    // GOOGLE PROVIDER (Gemini - stub for now)
    // ============================================
    async function callGoogleProvider(profile, payload) {
        console.log('[Google Provider] Not yet implemented, using mock...');
        return await callMockProvider(profile, payload);
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get API Key from localStorage or environment
     * In production, this should come from secure backend
     */
    function getAPIKey(provider) {
        // For now, check localStorage (INSECURE - for demo only)
        const key = localStorage.getItem(`${provider}_api_key`);
        if (key) return key;

        // TODO: In production, fetch from secure backend
        console.warn(`No API key found for ${provider}. Using mock mode.`);
        return null;
    }

    /**
     * Set API Key (for testing)
     */
    window.setAPIKey = function (provider, key) {
        localStorage.setItem(`${provider}_api_key`, key);
        console.log(`API key set for ${provider}`);
    };

})();
