// Language translations
const translations = {
    en: {
        // Navigation
        'nav.features': 'Features',
        'nav.platforms': 'Platforms',
        'nav.pricing': 'Pricing',
        'nav.getStarted': 'Get Started',
        'nav.langCode': 'EN',

        // Hero Section
        'hero.badge': 'AI-Powered Automation',
        'hero.title1': 'Experience the Future of',
        'hero.title2': 'Social Media Marketing',
        'hero.description1': 'AI agents automatically create and publish content 24/7.',
        'hero.description2': 'Stop wasting time on manual tasks.',
        'hero.cta.start': 'Start for Free',
        'hero.cta.demo': 'Watch Demo',
        'hero.stats.users': 'Active Users',
        'hero.stats.content': 'Content Created',
        'hero.stats.platforms': 'Supported Platforms',

        // Floating Cards
        'card.agent.title': 'AI Agent Active',
        'card.agent.subtitle': 'Creating content...',
        'card.engagement.title': 'Engagement',
        'card.engagement.subtitle': '+245% this week',
        'card.posted.title': 'Posted',
        'card.posted.subtitle': '12 new posts',

        // Features Section
        'features.title1': 'Automate Your Marketing',
        'features.title2': 'with Powerful AI Features',
        'features.description': 'Automate everything from content creation to publishing with cutting-edge AI technology',

        'feature.content.title': 'AI Content Generation',
        'feature.content.description': 'GPT-4 powered AI automatically generates high-quality content that matches your brand tone',

        'feature.scheduling.title': 'Smart Scheduling',
        'feature.scheduling.description': 'AI analyzes optimal posting times and automatically schedules your content',

        'feature.image.title': 'Image Generation',
        'feature.image.description': 'Automatically generate unique images for your content with DALL-E 3',

        'feature.analytics.title': 'Real-time Analytics',
        'feature.analytics.description': 'View performance across all platforms in one dashboard in real-time',

        'feature.automation.title': '24/7 Automation',
        'feature.automation.description': 'AI agents work tirelessly for your brand',

        'feature.multiplatform.title': 'Multi-Platform',
        'feature.multiplatform.description': 'Support for all major platforms including Instagram, Twitter, Facebook, LinkedIn, and more',

        // Platforms Section
        'platforms.title1': 'Manage All Major Platforms',
        'platforms.title2': 'in One Place',

        // CTA Section
        'cta.title': 'Get Started Now',
        'cta.description1': 'Experience the power of AI agents with a free trial.',
        'cta.description2': 'Start instantly without a credit card.',
        'cta.start': 'Start for Free',
        'cta.contact': 'Contact Sales',

        // Footer
        'footer.tagline': 'AI-Powered Social Media Automation',
        'footer.product': 'Product',
        'footer.product.features': 'Features',
        'footer.product.platforms': 'Platforms',
        'footer.product.pricing': 'Pricing',
        'footer.company': 'Company',
        'footer.company.about': 'About Us',
        'footer.company.blog': 'Blog',
        'footer.company.careers': 'Careers',
        'footer.support': 'Support',
        'footer.support.help': 'Customer Support',
        'footer.support.docs': 'Documentation',
        'footer.support.contact': 'Contact',
        'footer.copyright': '2024 ZYNK. All rights reserved.',
        'footer.privacy': 'Privacy Policy',
        'footer.terms': 'Terms of Service',

        // Command Center
        'dashboard.title': 'Command Center',
        'dashboard.subtitle': 'High-level oversight of all managed client hives.',
        'dashboard.section1': '1. Client Hive Overview',
        'dashboard.section2': '2. Portfolio Overview',
        'dashboard.section3': '3. Global Action Center',
        'dashboard.totalProjects': 'Total Projects',
        'dashboard.totalAgents': 'Total Agents',
        'dashboard.pendingApprovals': 'Portfolio Pending Approvals',
        'dashboard.noActions': 'No pending global actions.',
        'dashboard.addNew': 'Add New Project',

        // Chat Suggestions
        'chat.suggestion.differentiators': 'What are the key differentiators?',
        'chat.suggestion.audience': 'Who is the target audience?',
        'chat.suggestion.voice': 'Summarize brand voice',

        // Market Pulse
        'market.title': 'Market Pulse',
        'market.refresh': 'Refresh',
        'market.lastUpdated': 'Last updated:',
        'market.justNow': 'Just now',
        'market.trends.title': 'Live Trends',
        'market.trends.setup': 'Setup Keywords',
        'market.trends.empty': 'Please set core keywords ✨',
        'market.heatmap.title': 'Sentiment Heatmap (Last 7 Days)',
        'market.brand.title': 'Brand Reputation',
        'market.brand.score': 'Reputation Score',
        'market.brand.mentions': 'mentions this week',
        'market.brand.vsLastWeek': 'vs last week',
        'market.sentiment.title': 'Sentiment Breakdown',
        'market.sentiment.positive': 'Positive',
        'market.sentiment.neutral': 'Neutral',
        'market.sentiment.negative': 'Negative',
        'market.mentions.recent': 'Recent Mentions',
        'market.mentions.viewAll': 'View All Mentions',
        'market.lab.title': 'Intelligence Lab',
        'market.lab.subtitle': 'High-performance research agent orchestrator',
        'market.lab.targetLabel': 'Target Domain/Topic',
        'market.lab.focusLabel': 'Research Focus',
        'market.lab.targetPlaceholder': 'e.g., reddit.com/r/SkincareAddiction',
        'market.lab.focusPlaceholder': 'e.g., Analysis of consumer sentiment and pain points',
        'market.lab.deploy': 'START DISCOVERY MISSION',
        'market.lab.previous': 'Previous Investigations',
        'market.lab.empty.title': 'No research history',
        'market.lab.empty.desc': 'Dispatch an agent to start your first market survey.',
        'market.missions.title': 'AI Missions',
        'market.missions.empty.title': 'No active AI missions',
        'market.missions.empty.desc': 'AI will suggest strategic missions based on research results after agent deployment.',
        'market.radar.title': 'Competitor Radar',
        'market.radar.suggest': 'AI: Suggest Competitors',
        'market.radar.add': 'Add',
        'market.radar.empty.title': 'No competitors found',
        'market.radar.empty.desc': 'Analyze the market competition through research missions. Detected patterns will appear here.',
        'market.status.offline': 'OFFLINE',
        'market.status.ready': 'READY',
        'market.chip.reddit': 'Reddit',
        'market.chip.x': 'X (Twitter)',
        'market.chip.competitor': 'Competitor Site',
        'market.chip.competitorGaps': 'Competitor Gaps',
        'market.credits': 'Credits'
    },
    ko: {
        // Navigation
        'nav.features': '기능',
        'nav.platforms': '플랫폼',
        'nav.pricing': '가격',
        'nav.getStarted': '시작하기',
        'nav.langCode': 'KO',

        // Hero Section
        'hero.badge': 'AI 기반 자동화',
        'hero.title1': '소셜미디어 마케팅의',
        'hero.title2': '미래를 경험하세요',
        'hero.description1': 'AI 에이전트가 24/7 자동으로 콘텐츠를 제작하고 게시합니다.',
        'hero.description2': '더 이상 수동 작업에 시간을 낭비하지 마세요.',
        'hero.cta.start': '무료로 시작하기',
        'hero.cta.demo': '데모 보기',
        'hero.stats.users': '활성 사용자',
        'hero.stats.content': '생성된 콘텐츠',
        'hero.stats.platforms': '지원 채널',

        // Floating Cards
        'card.agent.title': 'AI 에이전트 활성',
        'card.agent.subtitle': '콘텐츠 생성 중...',
        'card.engagement.title': '참여도',
        'card.engagement.subtitle': '이번 주 +245%',
        'card.posted.title': '게시됨',
        'card.posted.subtitle': '12개 새 게시물',

        // Features Section
        'features.title1': '강력한 AI 기능으로',
        'features.title2': '마케팅을 자동화하세요',
        'features.description': '최첨단 AI 기술로 콘텐츠 제작부터 게시까지 모든 과정을 자동화합니다',

        'feature.content.title': 'AI 콘텐츠 생성',
        'feature.content.description': 'GPT-4 기반 AI가 브랜드 톤에 맞는 고품질 콘텐츠를 자동으로 생성합니다',

        'feature.scheduling.title': '스마트 스케줄링',
        'feature.scheduling.description': '최적의 게시 시간을 AI가 분석하여 자동으로 콘텐츠를 예약합니다',

        'feature.image.title': '이미지 생성',
        'feature.image.description': 'DALL-E 3로 콘텐츠에 맞는 독창적인 이미지를 자동 생성합니다',

        'feature.analytics.title': '실시간 분석',
        'feature.analytics.description': '모든 플랫폼의 성과를 하나의 대시보드에서 실시간으로 확인하세요',

        'feature.automation.title': '24/7 자동화',
        'feature.automation.description': 'AI 에이전트가 쉬지 않고 브랜드를 위해 일합니다',

        'feature.multiplatform.title': '멀티 플랫폼',
        'feature.multiplatform.description': 'Instagram, Twitter, Facebook, LinkedIn 등 모든 주요 플랫폼 지원',

        // Platforms Section
        'platforms.title1': '모든 주요 플랫폼을',
        'platforms.title2': '한 곳에서 관리',

        // CTA Section
        'cta.title': '지금 바로 시작하세요',
        'cta.description1': '무료 체험으로 AI 에이전트의 강력함을 경험해보세요.',
        'cta.description2': '신용카드 없이 즉시 시작할 수 있습니다.',
        'cta.start': '무료로 시작하기',
        'cta.contact': '영업팀 문의',

        // Footer
        'footer.tagline': 'AI 기반 소셜미디어 자동화',
        'footer.product': '제품',
        'footer.product.features': '기능',
        'footer.product.platforms': '플랫폼',
        'footer.product.pricing': '가격',
        'footer.company': '회사',
        'footer.company.about': '회사 소개',
        'footer.company.blog': '블로그',
        'footer.company.careers': '채용',
        'footer.support': '지원',
        'footer.support.help': '고객 지원',
        'footer.support.docs': '문서',
        'footer.support.contact': '문의하기',
        'footer.copyright': '2024 ZYNK. All rights reserved.',
        'footer.privacy': '개인정보처리방침',
        'footer.terms': '이용약관',

        // Command Center
        'dashboard.title': '커맨드 센터',
        'dashboard.subtitle': '모든 클라이언트 하이브를 한눈에 관리하세요.',
        'dashboard.section1': '1. 클라이언트 하이브 개요',
        'dashboard.section2': '2. 포트폴리오 개요',
        'dashboard.section3': '3. 글로벌 액션 센터',
        'dashboard.totalProjects': '총 프로젝트',
        'dashboard.totalAgents': '총 에이전트',
        'dashboard.pendingApprovals': '승인 대기 중',
        'dashboard.noActions': '대기 중인 글로벌 작업이 없습니다.',
        'dashboard.addNew': '새 프로젝트 추가',

        // Chat Suggestions
        'chat.suggestion.differentiators': '주요 차별화 포인트는 무엇인가요?',
        'chat.suggestion.audience': '타겟 고객은 누구인가요?',
        'chat.suggestion.voice': '브랜드 보이스 요약해줘',

        // Market Pulse
        'market.title': '마켓 펄스',
        'market.refresh': '새로고침',
        'market.lastUpdated': '최근 업데이트:',
        'market.justNow': '방금 전',
        'market.trends.title': '라이브 트렌드',
        'market.trends.setup': '키워드 설정',
        'market.trends.empty': '핵심 키워드를 설정해 주세요 ✨',
        'market.heatmap.title': '감정 히트맵 (최근 7일)',
        'market.brand.title': '브랜드 평판',
        'market.brand.score': '평판 지수',
        'market.brand.mentions': '이번 주 언급 횟수',
        'market.brand.vsLastWeek': '지난주 대비',
        'market.sentiment.title': '감정 분석 통계',
        'market.sentiment.positive': '긍정',
        'market.sentiment.neutral': '중립',
        'market.sentiment.negative': '부정',
        'market.mentions.recent': '최근 언급',
        'market.mentions.viewAll': '전체 보기',
        'market.lab.title': '인텔리전스 랩',
        'market.lab.subtitle': '고성능 리서치 에이전트 오케스트레이터',
        'market.lab.targetLabel': '타겟 도메인/토픽',
        'market.lab.focusLabel': '리서치 포커스',
        'market.lab.targetPlaceholder': '예: reddit.com/r/SkincareAddiction',
        'market.lab.focusPlaceholder': '예: 소비자 감정 및 페인 포인트 분석',
        'market.lab.deploy': '디스커버리 미션 시작',
        'market.lab.previous': '이전 리서치 기록',
        'market.lab.empty.title': '리서치 기록이 없습니다',
        'market.lab.empty.desc': '에이전트를 파견하여 첫 번째 시장 조사를 시작해 보세요.',
        'market.missions.title': 'AI 미션',
        'market.missions.empty.title': '활성화된 AI 미션이 없습니다',
        'market.missions.empty.desc': '에이전트 파견 후 리서치 결과에 따라 AI가 맞춤형 전략 미션을 제안합니다.',
        'market.radar.title': '경쟁사 레이더',
        'market.radar.suggest': 'AI 경쟁사 추천',
        'market.radar.add': '추가',
        'market.radar.empty.title': '발견된 경쟁사가 없습니다',
        'market.radar.empty.desc': '리서치 미션을 통해 시장의 경쟁 구도를 분석해 보세요. 발견된 패턴이 이곳에 표시됩니다.',
        'market.status.offline': '오프라인',
        'market.status.ready': '준비됨',
        'market.chip.reddit': '레딧',
        'market.chip.x': 'X (트위터)',
        'market.chip.competitor': '경쟁사 사이트',
        'market.chip.competitorGaps': '경쟁사 약점',
        'market.credits': '보유 크레딧'
    }
};

// Get current language from localStorage or default to Korean
let currentLang = localStorage.getItem('zynk-language') || 'ko';

// Function to translate the page
function translatePage(lang) {
    if (!lang) lang = currentLang;
    currentLang = lang;
    localStorage.setItem('zynk-language', lang);

    // Update all elements with data-i18n or data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n], [data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n');

        // Check if element has HTML content
        if (element.hasAttribute('data-i18n-html')) {
            const htmlContent = element.getAttribute(`data-i18n-${lang}`);
            if (htmlContent) {
                element.innerHTML = htmlContent;
            }
        } else if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }

        // Check for placeholder translation
        const placeholderKey = element.getAttribute('data-i18n-placeholder');
        if (placeholderKey && translations[lang] && translations[lang][placeholderKey]) {
            element.setAttribute('placeholder', translations[lang][placeholderKey]);
        }
    });

    // Update HTML lang attribute
    document.documentElement.lang = lang === 'ko' ? 'ko' : 'en';

    // Update language toggle button
    updateLanguageToggle();

    // Notify other scripts that language has changed
    window.dispatchEvent(new CustomEvent('zynk-lang-changed', { detail: { lang } }));
}

// Function to update language toggle button
function updateLanguageToggle() {
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.textContent = currentLang === 'ko' ? 'EN' : 'KO';
        langToggle.setAttribute('aria-label', currentLang === 'ko' ? 'Switch to English' : '한국어로 전환');
    }
}

// Function to toggle language
function toggleLanguage() {
    const newLang = currentLang === 'ko' ? 'en' : 'ko';
    translatePage(newLang);
}

// Helper function to get a translation by key
function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || key;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    translatePage(currentLang);

    // Add click event to language toggle button
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
    }
});
