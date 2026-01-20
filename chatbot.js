// ========================================
// ZYNK AI Helpdesk Chatbot
// ========================================

const CHATBOT = {
    // Config
    DAILY_LIMIT: 50,

    // State
    isOpen: false,
    messages: [],
    usageCount: 0,
    isLoading: false,
    lang: 'ko', // detected language

    // Localization strings
    i18n: {
        ko: {
            subtitle: 'AI 헬프데스크',
            placeholder: 'ZYNK에 대해 물어보세요...',
            welcome: `안녕하세요! 저는 ZYNK 헬프데스크 AI입니다.

ZYNK 사용에 관한 질문이 있으시면 편하게 물어보세요!

- 기능 사용법
- 문제 해결
- 팁과 가이드`,
            rateLimitExceeded: (limit) => `일일 질문 횟수(${limit}회)를 초과했습니다.\n내일 다시 이용해 주세요!`,
            error: (msg) => `오류가 발생했습니다: ${msg}\n잠시 후 다시 시도해 주세요.`,
            loginRequired: '로그인이 필요합니다. 다시 로그인해 주세요.',
            unavailable: (msg) => `${msg}`
        },
        en: {
            subtitle: 'AI Helpdesk',
            placeholder: 'Ask about ZYNK...',
            welcome: `Hello! I'm the ZYNK Helpdesk AI.

Feel free to ask me anything about using ZYNK!

- How to use features
- Troubleshooting
- Tips and guides`,
            rateLimitExceeded: (limit) => `Daily question limit (${limit}) exceeded.\nPlease try again tomorrow!`,
            error: (msg) => `An error occurred: ${msg}\nPlease try again later.`,
            loginRequired: 'Login required. Please log in again.',
            unavailable: (msg) => `${msg}`
        }
    },

    // DOM Elements
    elements: {},

    // Initialize
    async init() {
        console.log('[Chatbot] Initializing...');
        this.detectLanguage();
        this.cacheElements();
        await this.loadConfig(); // Load config from Firestore
        this.loadUsage();
        this.bindEvents();
        this.applyLocalization();
        this.addWelcomeMessage();
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
                }
            }
        } catch (error) {
            console.warn('[Chatbot] Failed to load config:', error);
            // Use default values
        }
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

    addWelcomeMessage() {
        const t = this.i18n[this.lang];
        this.addMessage('bot', t.welcome);
    },

    addMessage(type, content) {
        const message = { type, content, time: new Date() };
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
    },

    renderMessage(message) {
        const container = this.elements.messagesContainer;
        if (!container) return;

        const avatar = message.type === 'bot' ? 'bot' : 'user';

        const messageEl = document.createElement('div');
        messageEl.className = `chatbot-message ${message.type}`;
        messageEl.innerHTML = `
            <div class="chatbot-message-avatar">
                ${message.type === 'bot' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'}
            </div>
            <div class="chatbot-message-content">${this.formatContent(message.content)}</div>
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
            <div class="chatbot-message-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>
            </div>
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
            const response = await this.callAI(question);
            this.hideTyping();
            this.addMessage('bot', response);

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

                return result.data.answer;
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
            return `**Market Pulse**는 ZYNK의 첫 번째 단계입니다!

- **역할**: 시장 트렌드와 경쟁사 동향을 실시간으로 모니터링
- **기능**: 트렌딩 키워드, 센티먼트 분석, 경쟁사 비교
- **위치**: 사이드바 -> Market Pulse

더 궁금한 점이 있으시면 물어보세요!`;
        }

        if (q.includes('brand brain') || q.includes('브랜드브레인')) {
            return `**Brand Brain**은 ZYNK의 두 번째 단계입니다!

- **역할**: 브랜드 전략과 톤앤매너 설정
- **기능**: Brand Voice 정의, 키워드 전략, 콘텐츠 가이드라인
- **위치**: 사이드바 -> Brand Brain

여기서 설정한 내용이 콘텐츠 생성 시 자동 반영됩니다!`;
        }

        if (q.includes('studio') || q.includes('스튜디오')) {
            return `**Hive Mind Studio**는 ZYNK의 세 번째 단계입니다!

- **역할**: AI 에이전트 팀을 활용한 콘텐츠 생성
- **기능**: 워크플로우 실행, DAG 파이프라인, 실시간 프리뷰
- **위치**: 사이드바 -> Studio

12개 전문 에이전트가 협력하여 콘텐츠를 만들어요!`;
        }

        if (q.includes('filter') || q.includes('필터')) {
            return `**The Filter**는 ZYNK의 네 번째 단계입니다!

- **역할**: 콘텐츠 품질 검증 및 브랜드 일관성 확인
- **기능**: Quality Scorecard, AI 교정 제안, 성과 예측
- **위치**: 사이드바 -> The Filter

발행 전 최종 관문 역할을 합니다!`;
        }

        if (q.includes('growth') || q.includes('그로스')) {
            return `**The Growth**는 ZYNK의 다섯 번째 단계입니다!

- **역할**: ROI 측정 및 성과 분석
- **기능**: ROI 대시보드, 성과 리포트, AI 학습 인사이트
- **위치**: 사이드바 -> The Growth

성과 데이터가 다시 Brand Brain에 반영되어 지속적으로 개선됩니다!`;
        }

        // Non-ZYNK questions
        if (q.includes('수학') || q.includes('계산') || q.includes('+') || q.includes('-') || q.includes('*') || q.includes('/')) {
            return `죄송합니다. 저는 ZYNK 사용에 관한 질문만 도와드릴 수 있습니다.

ZYNK 기능이나 사용법에 대해 궁금한 점이 있으시면 말씀해 주세요!`;
        }

        if (q.includes('번역') || q.includes('영어로') || q.includes('한국어로')) {
            return `죄송합니다. 번역 기능은 제공하지 않습니다.

저는 ZYNK 플랫폼 사용에 관한 질문에만 답변드릴 수 있습니다.`;
        }

        // Default ZYNK response
        return `좋은 질문이시네요!

ZYNK는 5단계 파이프라인으로 콘텐츠 마케팅을 자동화합니다:

1. Market Pulse - 시장 트렌드 분석
2. Brand Brain - 브랜드 전략 설정
3. Studio - AI 콘텐츠 생성
4. The Filter - 품질 검증
5. The Growth - 성과 측정

어떤 기능에 대해 더 알고 싶으신가요?`;
    },

    // Usage tracking (localStorage for demo)
    loadUsage() {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('zynk_chatbot_usage');

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
        localStorage.setItem('zynk_chatbot_usage', JSON.stringify({
            date: today,
            count: this.usageCount
        }));
    },

    updateUsageBadge() {
        if (this.elements.usageBadge) {
            this.elements.usageBadge.textContent = `${this.usageCount}/${this.DAILY_LIMIT}`;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => CHATBOT.init());
