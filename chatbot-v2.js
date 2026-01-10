// ========================================
// ZYNK AI Helpdesk Chatbot
// Global Version with Page Context, Voice, and Draggable FAB
// ========================================

const CHATBOT = {
    // Config
    DAILY_LIMIT: 50,
    FAB_STORAGE_KEY: 'zynk_chatbot_fab_position',
    USAGE_STORAGE_KEY: 'zynk_chatbot_usage',

    // State
    isOpen: false,
    messages: [],
    usageCount: 0,
    isLoading: false,
    lang: 'ko', // detected language
    isDragging: false,

    // Page Context
    currentPage: null,
    pageContext: null,

    // Voice settings
    voiceEnabled: false,
    voiceInputEnabled: false,
    voiceOutputEnabled: false,
    isListening: false,
    recognition: null,

    // Localization strings
    i18n: {
        ko: {
            subtitle: 'AI 헬프데스크',
            placeholder: 'ZYNK에 대해 물어보세요...',
            welcome: `안녕하세요! 저는 ZYNK 헬프데스크 AI입니다. 🐝

ZYNK 사용에 관한 질문이 있으시면 편하게 물어보세요!

🔹 기능 사용법
🔹 문제 해결
🔹 팁과 가이드`,
            rateLimitExceeded: (limit) => `⚠️ 일일 질문 횟수(${limit}회)를 초과했습니다.\n내일 다시 이용해 주세요!`,
            error: (msg) => `❌ 오류가 발생했습니다: ${msg}\n잠시 후 다시 시도해 주세요.`,
            loginRequired: '❌ 로그인이 필요합니다. 다시 로그인해 주세요.',
            unavailable: (msg) => `⚠️ ${msg}`,
            listening: '🎤 말씀하세요...',
            voiceNotSupported: '음성 인식이 지원되지 않는 브라우저입니다.'
        },
        en: {
            subtitle: 'AI Helpdesk',
            placeholder: 'Ask about ZYNK...',
            welcome: `Hello! I'm the ZYNK Helpdesk AI. 🐝

Feel free to ask me anything about using ZYNK!

🔹 How to use features
🔹 Troubleshooting
🔹 Tips and guides`,
            rateLimitExceeded: (limit) => `⚠️ Daily question limit (${limit}) exceeded.\nPlease try again tomorrow!`,
            error: (msg) => `❌ An error occurred: ${msg}\nPlease try again later.`,
            loginRequired: '❌ Login required. Please log in again.',
            unavailable: (msg) => `⚠️ ${msg}`,
            listening: '🎤 Listening...',
            voiceNotSupported: 'Voice recognition is not supported in this browser.'
        }
    },

    // DOM Elements
    elements: {},

    // Initialize
    async init() {
        console.log('[Chatbot] Initializing Global Chatbot...');

        // Detect current page
        this.detectCurrentPage();

        this.detectLanguage();
        this.cacheElements();

        await this.loadConfig(); // Load config from Firestore
        await this.loadPageContext(); // Load page-specific context

        this.loadUsage();
        this.bindEvents();
        this.setupDraggableFAB(); // Draggable FAB feature
        this.restoreFABPosition(); // Restore saved position
        this.setupVoice(); // Voice input/output

        this.applyLocalization();
        this.addWelcomeMessage();

        console.log(`[Chatbot] Initialized for page: ${this.currentPage}`);
    },

    // Detect current page from URL
    detectCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');

        // Map filename to page ID
        const pageMap = {
            'command-center': 'command-center',
            'project-detail': 'project-detail',
            'brand-brain': 'brand-brain',
            'knowledgeHub': 'knowledge-hub',
            'marketPulse': 'market-pulse',
            'strategyWarRoom': 'strategy-war-room',
            'theFilter': 'the-filter',
            'theGrowth': 'the-growth',
            'studio': 'studio'
        };

        this.currentPage = pageMap[filename] || filename;
        console.log(`[Chatbot] Detected page: ${this.currentPage}`);
    },

    async loadConfig() {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const db = firebase.firestore();
                const doc = await db.collection('chatbotConfig').doc('default').get();

                if (doc.exists) {
                    const config = doc.data();
                    console.log('[Chatbot] Config loaded from Firestore:', config);

                    // Override welcome message if configured
                    if (config.welcomeMessage) {
                        this.i18n.ko.welcome = config.welcomeMessage;
                        this.i18n.en.welcome = config.welcomeMessage;
                    }

                    // Override daily limit if configured
                    if (config.dailyLimit) {
                        this.DAILY_LIMIT = config.dailyLimit;
                    }

                    // Voice settings
                    this.voiceEnabled = config.voiceEnabled ?? false;
                    this.voiceInputEnabled = config.voiceInputEnabled ?? false;
                    this.voiceOutputEnabled = config.voiceOutputEnabled ?? false;
                }
            }
        } catch (error) {
            console.warn('[Chatbot] Failed to load config:', error);
            // Use default values
        }
    },

    // Load page-specific context from Firestore
    async loadPageContext() {
        if (!this.currentPage) return;

        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const db = firebase.firestore();
                const doc = await db.collection('chatbotPageContext').doc(this.currentPage).get();

                if (doc.exists) {
                    this.pageContext = doc.data();
                    console.log('[Chatbot] Page context loaded:', this.pageContext.name);
                } else {
                    console.log('[Chatbot] No page context found for:', this.currentPage);
                }
            }
        } catch (error) {
            console.warn('[Chatbot] Failed to load page context:', error);
        }
    },

    // Get page context prompt for AI
    getPageContextPrompt() {
        if (!this.pageContext) return '';

        const ctx = this.pageContext;
        const langKey = this.lang;

        let prompt = `\n\n## 현재 페이지 컨텍스트\n`;
        prompt += `사용자는 현재 "${ctx.name?.[langKey] || ctx.pageId}" 페이지에 있습니다.\n`;
        prompt += `이 페이지 설명: ${ctx.description?.[langKey] || ''}\n\n`;

        if (ctx.tips && ctx.tips.length > 0) {
            prompt += `### 이 페이지의 주요 기능 및 팁:\n`;
            ctx.tips.forEach((tip, i) => {
                prompt += `${i + 1}. ${tip[langKey] || tip.en || ''}\n`;
            });
        }

        return prompt;
    },

    detectLanguage() {
        // Detect browser language
        const browserLang = navigator.language || navigator.userLanguage || 'ko';
        this.lang = browserLang.toLowerCase().startsWith('ko') ? 'ko' : 'en';
        console.log(`[Chatbot] Detected language: ${this.lang}`);
    },

    applyLocalization() {
        const t = this.i18n[this.lang];

        // Update subtitle
        const subtitleEl = document.querySelector('.chatbot-header-info small');
        if (subtitleEl) {
            subtitleEl.textContent = t.subtitle;
        }

        // Update placeholder
        if (this.elements.input) {
            this.elements.input.placeholder = t.placeholder;
        }
    },

    cacheElements() {
        this.elements = {
            fab: document.getElementById('chatbot-fab'),
            panel: document.getElementById('chatbot-panel'),
            closeBtn: document.getElementById('chatbot-close'),
            messagesContainer: document.getElementById('chatbot-messages'),
            input: document.getElementById('chatbot-input'),
            sendBtn: document.getElementById('chatbot-send'),
            usageBadge: document.getElementById('chatbot-usage')
        };
    },

    bindEvents() {
        // FAB click
        this.elements.fab?.addEventListener('click', () => this.toggle());

        // Close button
        this.elements.closeBtn?.addEventListener('click', () => this.close());

        // Send button
        this.elements.sendBtn?.addEventListener('click', () => this.sendMessage());

        // Enter key (with Korean composition check)
        this.elements.input?.addEventListener('keydown', (e) => {
            // Skip if composing (Korean, Japanese, Chinese input)
            if (e.isComposing || e.keyCode === 229) return;

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isOpen &&
                !this.elements.panel?.contains(e.target) &&
                !this.elements.fab?.contains(e.target)) {
                this.close();
            }
        });

        // Add resize handle to panel
        this.setupResizeHandle();
    },

    setupResizeHandle() {
        const panel = this.elements.panel;
        if (!panel) return;

        // Create resize handle element
        const handle = document.createElement('div');
        handle.className = 'chatbot-resize-handle';
        panel.insertBefore(handle, panel.firstChild);

        let startY = 0;
        let startHeight = 0;

        const onMouseMove = (e) => {
            const delta = startY - e.clientY;
            const newHeight = Math.min(
                Math.max(startHeight + delta, 300), // min-height
                window.innerHeight - 150 // max-height
            );
            panel.style.height = newHeight + 'px';
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            panel.style.transition = 'opacity 0.3s, transform 0.3s';
        };

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startY = e.clientY;
            startHeight = panel.offsetHeight;
            panel.style.transition = 'none'; // Disable transition during drag
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Touch support for mobile
        handle.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startY = touch.clientY;
            startHeight = panel.offsetHeight;
            panel.style.transition = 'none';
        }, { passive: true });

        handle.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const delta = startY - touch.clientY;
            const newHeight = Math.min(
                Math.max(startHeight + delta, 300),
                window.innerHeight - 150
            );
            panel.style.height = newHeight + 'px';
        }, { passive: true });

        handle.addEventListener('touchend', () => {
            panel.style.transition = 'opacity 0.3s, transform 0.3s';
        });
    },

    toggle() {
        this.isOpen ? this.close() : this.open();
    },

    open() {
        this.isOpen = true;
        this.elements.panel?.classList.add('open');
        this.elements.fab?.classList.add('hidden');
        this.elements.input?.focus();
    },

    close() {
        this.isOpen = false;
        this.elements.panel?.classList.remove('open');
        this.elements.fab?.classList.remove('hidden');
    },

    // ============================================
    // CHAT HISTORY PERSISTENCE (localStorage)
    // ============================================

    HISTORY_STORAGE_KEY: 'zynk_chatbot_history',
    HISTORY_MAX_MESSAGES: 50, // Keep last 50 messages
    HISTORY_EXPIRY_HOURS: 24, // Auto-delete after 24 hours
    lastVisitedPage: null,

    loadChatHistory() {
        try {
            const stored = localStorage.getItem(this.HISTORY_STORAGE_KEY);
            if (!stored) return false;

            const data = JSON.parse(stored);

            // Check if expired (24 hours)
            const expiry = data.timestamp + (this.HISTORY_EXPIRY_HOURS * 60 * 60 * 1000);
            if (Date.now() > expiry) {
                console.log('[Chatbot] History expired, clearing...');
                this.clearChatHistory();
                return false;
            }

            // Restore messages
            this.messages = data.messages || [];
            this.lastVisitedPage = data.lastPage || null;

            // Render saved messages
            this.messages.forEach(msg => this.renderMessage(msg, false));
            this.scrollToBottom();

            console.log(`[Chatbot] Restored ${this.messages.length} messages from history`);
            return true;
        } catch (error) {
            console.warn('[Chatbot] Failed to load history:', error);
            return false;
        }
    },

    saveChatHistory() {
        try {
            // Limit to last N messages
            const messagesToSave = this.messages.slice(-this.HISTORY_MAX_MESSAGES);

            const data = {
                messages: messagesToSave,
                lastPage: this.currentPage,
                timestamp: Date.now()
            };

            localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.warn('[Chatbot] Failed to save history:', error);
        }
    },

    clearChatHistory() {
        localStorage.removeItem(this.HISTORY_STORAGE_KEY);
        this.messages = [];
        if (this.elements.messagesContainer) {
            this.elements.messagesContainer.innerHTML = '';
        }
    },

    // ============================================
    // WELCOME & PAGE INTRO MESSAGES
    // ============================================

    addWelcomeMessage() {
        // Try to load existing chat history
        const historyLoaded = this.loadChatHistory();

        if (!historyLoaded) {
            // No history - show welcome message
            const t = this.i18n[this.lang];
            this.addMessage('bot', t.welcome, false); // Don't save welcome to history
        }

        // Add page intro if entering a new page
        this.addPageIntroMessage();
    },

    addPageIntroMessage() {
        // Skip if same page as before
        if (this.lastVisitedPage === this.currentPage) {
            return;
        }

        // Get page context
        if (!this.pageContext) {
            return;
        }

        const ctx = this.pageContext;
        const langKey = this.lang;
        const pageName = ctx.name?.[langKey] || ctx.name?.en || this.currentPage;
        const pageDesc = ctx.description?.[langKey] || ctx.description?.en || '';

        // Build intro message
        let introMsg = this.lang === 'ko'
            ? `📍 **${pageName}** 페이지에 오셨습니다!\n\n${pageDesc}`
            : `📍 You are now on the **${pageName}** page!\n\n${pageDesc}`;

        // Add tips if available
        if (ctx.tips && ctx.tips.length > 0) {
            introMsg += this.lang === 'ko' ? '\n\n💡 **주요 기능:**\n' : '\n\n💡 **Key features:**\n';
            ctx.tips.slice(0, 3).forEach((tip, i) => {
                const tipText = tip[langKey] || tip.en || '';
                introMsg += `${i + 1}. ${tipText}\n`;
            });
        }

        // Add as system message (different styling, don't save to history to avoid clutter)
        this.addMessage('system', introMsg, false);

        // Update last visited page
        this.lastVisitedPage = this.currentPage;
    },

    addMessage(type, content, saveToHistory = true, model = null, provider = null) {
        const message = { type, content, time: new Date().toISOString(), model, provider };
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();

        // Save to localStorage (except for initial welcome)
        if (saveToHistory) {
            this.saveChatHistory();
        }
    },

    renderMessage(message) {
        const container = this.elements.messagesContainer;
        if (!container) return;

        let avatar;
        if (message.type === 'bot') {
            avatar = '🤖';
        } else if (message.type === 'system') {
            avatar = '💡';
        } else {
            avatar = '👤';
        }

        const messageEl = document.createElement('div');
        messageEl.className = `chatbot-message ${message.type}`;

        // Show model meta only for bot messages
        const metaHtml = (message.type === 'bot') ?
            `<div class="chatbot-meta" style="font-size: 10px; opacity: 0.6; margin-top: 6px; text-align: right; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
                🐝 ZYNK AI Intelligence
             </div>` : '';

        // Custom style for system avatar
        const avatarStyle = message.type === 'system' ? 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);' : '';

        messageEl.innerHTML = `
            <div class="chatbot-message-avatar" style="${avatarStyle}">${avatar}</div>
            <div class="chatbot-message-content">
                ${this.formatContent(message.content)}
                ${metaHtml}
            </div>
        `;

        container.appendChild(messageEl);
    },

    formatContent(content) {
        // Convert newlines to <br> and basic formatting
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code style="background: rgba(99,102,241,0.2); padding: 2px 6px; border-radius: 4px;">$1</code>');
    },

    showTyping() {
        const container = this.elements.messagesContainer;
        if (!container) return;

        const typingEl = document.createElement('div');
        typingEl.id = 'chatbot-typing';
        typingEl.className = 'chatbot-message bot';
        typingEl.innerHTML = `
            <div class="chatbot-message-avatar">🤖</div>
            <div class="chatbot-typing">
                <div class="chatbot-typing-dot"></div>
                <div class="chatbot-typing-dot"></div>
                <div class="chatbot-typing-dot"></div>
            </div>
        `;
        container.appendChild(typingEl);
        this.scrollToBottom();
    },

    hideTyping() {
        document.getElementById('chatbot-typing')?.remove();
    },

    scrollToBottom() {
        const container = this.elements.messagesContainer;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    },

    async sendMessage() {
        const input = this.elements.input;
        const question = input?.value.trim();

        if (!question || this.isLoading) return;

        // Check rate limit
        if (this.usageCount >= this.DAILY_LIMIT) {
            const t = this.i18n[this.lang];
            this.addMessage('bot', t.rateLimitExceeded(this.DAILY_LIMIT));
            return;
        }

        // Clear input
        input.value = '';

        // Add user message
        this.addMessage('user', question);

        // Show typing
        this.isLoading = true;
        this.showTyping();

        try {
            // Call Firebase function
            // Call Firebase function
            const responseObj = await this.callAI(question);
            this.hideTyping();

            if (typeof responseObj === 'object' && responseObj.answer) {
                this.addMessage('bot', responseObj.answer, true, responseObj.model, responseObj.provider);
            } else {
                this.addMessage('bot', responseObj);
            }

            // Update usage
            this.usageCount++;
            this.updateUsageBadge();
            this.saveUsage();

        } catch (error) {
            this.hideTyping();
            const t = this.i18n[this.lang];
            this.addMessage('bot', t.error(error.message));
        } finally {
            this.isLoading = false;
        }
    },

    async callAI(question) {
        console.log('[Chatbot] callAI called, checking Firebase...');

        // Check if Firebase functions are available
        if (typeof firebase !== 'undefined' && firebase.functions) {
            console.log('[Chatbot] Firebase functions available');

            // Check auth state
            const user = firebase.auth().currentUser;
            console.log('[Chatbot] Current user:', user ? user.email : 'NOT LOGGED IN');

            if (!user) {
                const t = this.i18n[this.lang];
                return t.loginRequired;
            }

            console.log('[Chatbot] Calling askZynkBot...');
            console.log('[Chatbot] Question value:', question, 'Type:', typeof question);
            try {
                const askZynkBot = firebase.functions().httpsCallable('askZynkBot');
                const result = await askZynkBot({ question: question, language: this.lang });
                console.log('[Chatbot] askZynkBot success:', result);

                // Update usage from server response
                if (result.data.usage) {
                    this.usageCount = result.data.usage.count;
                    this.DAILY_LIMIT = result.data.usage.limit;
                    this.updateUsageBadge();
                }

                return {
                    answer: result.data.answer,
                    model: result.data.model,
                    provider: result.data.provider
                };
            } catch (error) {
                console.error('[Chatbot] Firebase function error:', error);
                console.error('[Chatbot] Error code:', error.code);
                console.error('[Chatbot] Error message:', error.message);

                // Handle specific error codes (Firebase uses 'functions/code' format)
                const t = this.i18n[this.lang];
                const errorCode = error.code || '';

                if (errorCode.includes('resource-exhausted')) {
                    return t.unavailable(error.message);
                }
                if (errorCode.includes('unauthenticated')) {
                    return t.loginRequired;
                }
                if (errorCode.includes('unavailable')) {
                    return t.unavailable(error.message);
                }
                if (errorCode.includes('failed-precondition')) {
                    // AI service not configured - fall back to mock
                    console.warn('[Chatbot] AI service not configured, using mock response');
                    return this.getMockResponse(question);
                }

                // Fall back to mock response
                console.warn('[Chatbot] Unknown error, falling back to mock response');
                return this.getMockResponse(question);
            }
        }

        // Fallback: Mock response for demo
        console.warn('[Chatbot] Firebase not available, using mock response');
        return this.getMockResponse(question);
    },

    getMockResponse(question) {
        const q = question.toLowerCase();

        // ZYNK related questions
        if (q.includes('market pulse') || q.includes('마켓펄스')) {
            return `**Market Pulse**는 ZYNK의 첫 번째 단계입니다! 👁️

🔹 **역할**: 시장 트렌드와 경쟁사 동향을 실시간으로 모니터링
🔹 **기능**: 트렌딩 키워드, 센티먼트 분석, 경쟁사 비교
🔹 **위치**: 사이드바 → Market Pulse

더 궁금한 점이 있으시면 물어보세요! 🐝`;
        }

        if (q.includes('brand brain') || q.includes('브랜드브레인')) {
            return `**Brand Brain**은 ZYNK의 두 번째 단계입니다! 🧠

🔹 **역할**: 브랜드 전략과 톤앤매너 설정
🔹 **기능**: Brand Voice 정의, 키워드 전략, 콘텐츠 가이드라인
🔹 **위치**: 사이드바 → Brand Brain

여기서 설정한 내용이 콘텐츠 생성 시 자동 반영됩니다!`;
        }

        if (q.includes('studio') || q.includes('스튜디오')) {
            return `**Hive Mind Studio**는 ZYNK의 세 번째 단계입니다! ✋

🔹 **역할**: AI 에이전트 팀을 활용한 콘텐츠 생성
🔹 **기능**: 워크플로우 실행, DAG 파이프라인, 실시간 프리뷰
🔹 **위치**: 사이드바 → Studio

12개 전문 에이전트가 협력하여 콘텐츠를 만들어요!`;
        }

        if (q.includes('filter') || q.includes('필터')) {
            return `**The Filter**는 ZYNK의 네 번째 단계입니다! 🔍

🔹 **역할**: 콘텐츠 품질 검증 및 브랜드 일관성 확인
🔹 **기능**: Quality Scorecard, AI 교정 제안, 성과 예측
🔹 **위치**: 사이드바 → The Filter

발행 전 최종 관문 역할을 합니다!`;
        }

        if (q.includes('growth') || q.includes('그로스')) {
            return `**The Growth**는 ZYNK의 다섯 번째 단계입니다! 🌱

🔹 **역할**: ROI 측정 및 성과 분석
🔹 **기능**: ROI 대시보드, 성과 리포트, AI 학습 인사이트
🔹 **위치**: 사이드바 → The Growth

성과 데이터가 다시 Brand Brain에 반영되어 지속적으로 개선됩니다!`;
        }

        // Non-ZYNK questions
        if (q.includes('수학') || q.includes('계산') || q.includes('+') || q.includes('-') || q.includes('*') || q.includes('/')) {
            return `죄송합니다. 저는 ZYNK 사용에 관한 질문만 도와드릴 수 있습니다. 🐝

ZYNK 기능이나 사용법에 대해 궁금한 점이 있으시면 말씀해 주세요!`;
        }

        if (q.includes('번역') || q.includes('영어로') || q.includes('한국어로')) {
            return `죄송합니다. 번역 기능은 제공하지 않습니다. 🐝

저는 ZYNK 플랫폼 사용에 관한 질문에만 답변드릴 수 있습니다.`;
        }

        // Default ZYNK response
        return `좋은 질문이시네요! 🐝

ZYNK는 5단계 파이프라인으로 콘텐츠 마케팅을 자동화합니다:

1️⃣ **Market Pulse** - 시장 트렌드 분석
2️⃣ **Brand Brain** - 브랜드 전략 설정
3️⃣ **Studio** - AI 콘텐츠 생성
4️⃣ **The Filter** - 품질 검증
5️⃣ **The Growth** - 성과 측정

어떤 기능에 대해 더 알고 싶으신가요?`;
    },

    // Usage tracking (localStorage for demo)
    loadUsage() {
        const today = new Date().toDateString();
        const stored = localStorage.getItem(this.USAGE_STORAGE_KEY);

        if (stored) {
            const data = JSON.parse(stored);
            if (data.date === today) {
                this.usageCount = data.count;
            } else {
                this.usageCount = 0;
            }
        }

        this.updateUsageBadge();
    },

    saveUsage() {
        const today = new Date().toDateString();
        localStorage.setItem(this.USAGE_STORAGE_KEY, JSON.stringify({
            date: today,
            count: this.usageCount
        }));
    },

    updateUsageBadge() {
        if (this.elements.usageBadge) {
            this.elements.usageBadge.textContent = `${this.usageCount}/${this.DAILY_LIMIT}`;
        }
    },

    // ============================================
    // DRAGGABLE FAB FEATURE
    // ============================================

    setupDraggableFAB() {
        const fab = this.elements.fab;
        if (!fab) return;

        let offsetX = 0, offsetY = 0;
        let startX = 0, startY = 0;
        let hasMoved = false;

        const onMouseDown = (e) => {
            if (e.button !== 0) return; // Only left click
            e.preventDefault();

            this.isDragging = false;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;

            const rect = fab.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);

            // Start dragging only after moving 5px
            if (dx > 5 || dy > 5) {
                this.isDragging = true;
                hasMoved = true;
            }

            if (this.isDragging) {
                let x = e.clientX - offsetX;
                let y = e.clientY - offsetY;

                // Keep within viewport
                const fabRect = fab.getBoundingClientRect();
                x = Math.max(0, Math.min(x, window.innerWidth - fabRect.width));
                y = Math.max(0, Math.min(y, window.innerHeight - fabRect.height));

                fab.style.left = x + 'px';
                fab.style.top = y + 'px';
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
            }
        };

        const onMouseUp = (e) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            if (hasMoved) {
                this.saveFABPosition();
            }

            // Delay resetting isDragging to prevent click from firing
            setTimeout(() => {
                this.isDragging = false;
            }, 50);
        };

        // Double-click to reset position
        fab.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.resetFABPosition();
        });

        fab.addEventListener('mousedown', onMouseDown);

        // Touch support for mobile
        fab.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;

            const rect = fab.getBoundingClientRect();
            offsetX = touch.clientX - rect.left;
            offsetY = touch.clientY - rect.top;
            hasMoved = false;
        }, { passive: true });

        fab.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - startX);
            const dy = Math.abs(touch.clientY - startY);

            if (dx > 5 || dy > 5) {
                this.isDragging = true;
                hasMoved = true;
            }

            if (this.isDragging) {
                let x = touch.clientX - offsetX;
                let y = touch.clientY - offsetY;

                const fabRect = fab.getBoundingClientRect();
                x = Math.max(0, Math.min(x, window.innerWidth - fabRect.width));
                y = Math.max(0, Math.min(y, window.innerHeight - fabRect.height));

                fab.style.left = x + 'px';
                fab.style.top = y + 'px';
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
            }
        }, { passive: true });

        fab.addEventListener('touchend', () => {
            if (hasMoved) {
                this.saveFABPosition();
            }
            setTimeout(() => {
                this.isDragging = false;
            }, 50);
        });

        // Add drag cursor style
        fab.style.cursor = 'grab';
    },

    saveFABPosition() {
        const fab = this.elements.fab;
        if (!fab) return;

        const rect = fab.getBoundingClientRect();
        localStorage.setItem(this.FAB_STORAGE_KEY, JSON.stringify({
            x: rect.left,
            y: rect.top
        }));
        console.log('[Chatbot] FAB position saved:', rect.left, rect.top);
    },

    restoreFABPosition() {
        const fab = this.elements.fab;
        if (!fab) return;

        const stored = localStorage.getItem(this.FAB_STORAGE_KEY);
        if (stored) {
            const pos = JSON.parse(stored);

            // Validate position is within viewport
            const fabSize = 60; // Approximate FAB size
            if (pos.x >= 0 && pos.x <= window.innerWidth - fabSize &&
                pos.y >= 0 && pos.y <= window.innerHeight - fabSize) {
                fab.style.left = pos.x + 'px';
                fab.style.top = pos.y + 'px';
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
                console.log('[Chatbot] FAB position restored:', pos.x, pos.y);
            }
        }
    },

    resetFABPosition() {
        const fab = this.elements.fab;
        if (!fab) return;

        // Reset to default (bottom-right)
        fab.style.left = 'auto';
        fab.style.top = 'auto';
        fab.style.right = '24px';
        fab.style.bottom = '24px';

        localStorage.removeItem(this.FAB_STORAGE_KEY);
        console.log('[Chatbot] FAB position reset');
    },

    // ============================================
    // VOICE FEATURES (STT & TTS)
    // ============================================

    setupVoice() {
        // Check for Web Speech API support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition && this.voiceInputEnabled) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = this.lang === 'ko' ? 'ko-KR' : 'en-US';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('[Chatbot] Voice input:', transcript);

                if (this.elements.input) {
                    this.elements.input.value = transcript;
                }
                this.sendMessage();
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateVoiceButton();
            };

            this.recognition.onerror = (event) => {
                console.error('[Chatbot] Speech recognition error:', event.error);
                this.isListening = false;
                this.updateVoiceButton();
            };

            // Add voice button to input area
            this.addVoiceButton();
        }

        // Check for TTS support
        if ('speechSynthesis' in window && this.voiceOutputEnabled) {
            console.log('[Chatbot] TTS enabled');
        }
    },

    addVoiceButton() {
        const inputArea = document.querySelector('.chatbot-input-area');
        if (!inputArea || document.getElementById('chatbot-voice-btn')) return;

        const voiceBtn = document.createElement('button');
        voiceBtn.id = 'chatbot-voice-btn';
        voiceBtn.className = 'chatbot-voice-btn';
        voiceBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
        `;
        voiceBtn.title = this.lang === 'ko' ? '음성으로 말하기' : 'Speak';
        voiceBtn.addEventListener('click', () => this.toggleVoiceInput());

        // Insert before send button
        const sendBtn = this.elements.sendBtn;
        if (sendBtn) {
            sendBtn.parentNode.insertBefore(voiceBtn, sendBtn);
        }

        this.elements.voiceBtn = voiceBtn;
    },

    toggleVoiceInput() {
        if (!this.recognition) {
            alert(this.i18n[this.lang].voiceNotSupported);
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        } else {
            this.recognition.start();
            this.isListening = true;

            // Show listening indicator
            if (this.elements.input) {
                this.elements.input.placeholder = this.i18n[this.lang].listening;
            }
        }

        this.updateVoiceButton();
    },

    updateVoiceButton() {
        const btn = this.elements.voiceBtn;
        if (!btn) return;

        if (this.isListening) {
            btn.classList.add('listening');
            btn.style.background = '#ef4444';
        } else {
            btn.classList.remove('listening');
            btn.style.background = '';

            // Restore placeholder
            if (this.elements.input) {
                this.elements.input.placeholder = this.i18n[this.lang].placeholder;
            }
        }
    },

    speakText(text) {
        if (!this.voiceOutputEnabled || !('speechSynthesis' in window)) return;

        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.lang === 'ko' ? 'ko-KR' : 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        speechSynthesis.speak(utterance);
    },

    // Add speaker button to bot messages
    addSpeakerButton(messageEl, text) {
        if (!this.voiceOutputEnabled) return;

        const speakerBtn = document.createElement('button');
        speakerBtn.className = 'chatbot-speaker-btn';
        speakerBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
        `;
        speakerBtn.title = this.lang === 'ko' ? '읽어주기' : 'Read aloud';
        speakerBtn.addEventListener('click', () => this.speakText(text));

        messageEl.appendChild(speakerBtn);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => CHATBOT.init());
