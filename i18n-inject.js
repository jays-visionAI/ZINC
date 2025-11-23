// Auto-inject data-i18n attributes on page load
document.addEventListener('DOMContentLoaded', () => {
    // Define selectors and their corresponding i18n keys
    const i18nMappings = [
        // Hero Section
        { selector: '.hero-badge span:last-child', key: 'hero.badge' },
        { selector: '.hero-title', key: 'hero.title', html: true, ko: '소셜미디어 마케팅의<br/><span class="gradient-text">미래를 경험하세요</span>', en: 'Experience the Future of<br/><span class="gradient-text">Social Media Marketing</span>' },
        { selector: '.hero-description', key: 'hero.description', html: true, ko: 'AI 에이전트가 24/7 자동으로 콘텐츠를 제작하고 게시합니다.<br/>더 이상 수동 작업에 시간을 낭비하지 마세요.', en: 'AI agents automatically create and publish content 24/7.<br/>Stop wasting time on manual tasks.' },

        // Hero CTA
        { selector: '.hero-cta .btn-hero', key: 'hero.cta.start' },
        { selector: '.hero-cta .btn-secondary', key: 'hero.cta.demo' },

        // Hero Stats
        { selector: '.stat-item:nth-child(1) .stat-label', key: 'hero.stats.users' },
        { selector: '.stat-item:nth-child(3) .stat-label', key: 'hero.stats.content' },
        { selector: '.stat-item:nth-child(5) .stat-label', key: 'hero.stats.uptime' },

        // Floating Cards
        { selector: '.card-1 .card-title', key: 'card.agent.title' },
        { selector: '.card-1 .card-subtitle', key: 'card.agent.subtitle' },
        { selector: '.card-2 .card-title', key: 'card.engagement.title' },
        { selector: '.card-2 .card-subtitle', key: 'card.engagement.subtitle' },
        { selector: '.card-3 .card-title', key: 'card.posted.title' },
        { selector: '.card-3 .card-subtitle', key: 'card.posted.subtitle' },

        // Features Section
        { selector: '#features .section-title', key: 'features.title', html: true, ko: '강력한 AI 기능으로<br/><span class="gradient-text">마케팅을 자동화하세요</span>', en: 'Automate Your Marketing<br/><span class="gradient-text">with Powerful AI Features</span>' },
        { selector: '#features .section-description', key: 'features.description' },

        // Feature Cards
        { selector: '.feature-card:nth-child(1) .feature-title', key: 'feature.content.title' },
        { selector: '.feature-card:nth-child(1) .feature-description', key: 'feature.content.description' },
        { selector: '.feature-card:nth-child(2) .feature-title', key: 'feature.scheduling.title' },
        { selector: '.feature-card:nth-child(2) .feature-description', key: 'feature.scheduling.description' },
        { selector: '.feature-card:nth-child(3) .feature-title', key: 'feature.image.title' },
        { selector: '.feature-card:nth-child(3) .feature-description', key: 'feature.image.description' },
        { selector: '.feature-card:nth-child(4) .feature-title', key: 'feature.analytics.title' },
        { selector: '.feature-card:nth-child(4) .feature-description', key: 'feature.analytics.description' },
        { selector: '.feature-card:nth-child(5) .feature-title', key: 'feature.automation.title' },
        { selector: '.feature-card:nth-child(5) .feature-description', key: 'feature.automation.description' },
        { selector: '.feature-card:nth-child(6) .feature-title', key: 'feature.multiplatform.title' },
        { selector: '.feature-card:nth-child(6) .feature-description', key: 'feature.multiplatform.description' },

        // Platforms Section
        { selector: '#platforms .section-title', key: 'platforms.title', html: true, ko: '모든 주요 플랫폼을<br/><span class="gradient-text">한 곳에서 관리</span>', en: 'Manage All Major Platforms<br/><span class="gradient-text">in One Place</span>' },

        // CTA Section
        { selector: '.cta-title', key: 'cta.title' },
        { selector: '.cta-description', key: 'cta.description', html: true, ko: '무료 체험으로 AI 에이전트의 강력함을 경험해보세요.<br/>신용카드 없이 즉시 시작할 수 있습니다.', en: 'Experience the power of AI agents with a free trial.<br/>Start instantly without a credit card.' },
        { selector: '.cta-buttons .btn-hero', key: 'cta.start' },
        { selector: '.cta-buttons .btn-secondary', key: 'cta.contact' },

        // Footer
        { selector: '.footer-tagline', key: 'footer.tagline' },
        { selector: '.footer-column:nth-child(1) h4', key: 'footer.product' },
        { selector: '.footer-column:nth-child(1) a:nth-child(2)', key: 'footer.product.features' },
        { selector: '.footer-column:nth-child(1) a:nth-child(3)', key: 'footer.product.platforms' },
        { selector: '.footer-column:nth-child(1) a:nth-child(4)', key: 'footer.product.pricing' },
        { selector: '.footer-column:nth-child(2) h4', key: 'footer.company' },
        { selector: '.footer-column:nth-child(2) a:nth-child(2)', key: 'footer.company.about' },
        { selector: '.footer-column:nth-child(2) a:nth-child(3)', key: 'footer.company.blog' },
        { selector: '.footer-column:nth-child(2) a:nth-child(4)', key: 'footer.company.careers' },
        { selector: '.footer-column:nth-child(3) h4', key: 'footer.support' },
        { selector: '.footer-column:nth-child(3) a:nth-child(2)', key: 'footer.support.help' },
        { selector: '.footer-column:nth-child(3) a:nth-child(3)', key: 'footer.support.docs' },
        { selector: '.footer-column:nth-child(3) a:nth-child(4)', key: 'footer.support.contact' },
        { selector: '.footer-bottom p', key: 'footer.copyright' },
        { selector: '.footer-legal a:nth-child(1)', key: 'footer.privacy' },
        { selector: '.footer-legal a:nth-child(2)', key: 'footer.terms' }
    ];

    // Inject data-i18n attributes and set initial content
    i18nMappings.forEach(mapping => {
        const element = document.querySelector(mapping.selector);
        if (element) {
            element.setAttribute('data-i18n', mapping.key);

            // If HTML content is specified, handle it separately
            if (mapping.html) {
                element.setAttribute('data-i18n-html', 'true');
                element.setAttribute('data-i18n-ko', mapping.ko);
                element.setAttribute('data-i18n-en', mapping.en);
            }
        }
    });
});
