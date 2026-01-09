// Language translations
const translations = {
    en: {
        // Navigation
        'nav.commandCenter': 'Command Center',
        'nav.marketPulse': 'Market Pulse',
        'nav.brandBrain': 'Brand Brain',
        'nav.knowledgeHub': 'Knowledge Hub',
        'nav.studio': 'Studio',
        'nav.theGrowth': 'The Growth',
        'nav.settings': 'Settings',
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
        'market.credits': 'Credits',

        // Quick Briefing (Competitor Radar)
        'market.qb.title': 'Quick Briefing',
        'market.qb.subtitle': 'Please enter the following information to find more accurate competitors.',
        'market.qb.industry': 'Industry/Category',
        'market.qb.industryPlaceholder': 'Select...',
        'market.qb.industryCustomPlaceholder': 'Enter your industry category',
        'market.qb.audience': 'Primary Target Audience',
        'market.qb.audiencePlaceholder': 'e.g., 30-40 year old startup founders, B2B enterprise decision makers',
        'market.qb.usp': 'Key Differentiators (USP)',
        'market.qb.uspPlaceholder': 'e.g., AI-powered real-time analytics, lowest fees in the industry',
        'market.qb.knownCompetitors': 'Known Competitors',
        'market.qb.knownCompetitorsOptional': '(Optional)',
        'market.qb.knownCompetitorsHint': 'Adding competitors you know helps AI analyze more accurately.',
        'market.qb.competitorInputPlaceholder': 'Enter competitor name or URL',
        'market.qb.add': 'Add',
        'market.qb.noCompetitorsAdded': 'No competitors added yet',
        'market.qb.cancel': 'Cancel',
        'market.qb.saveAndScan': 'Save & Find Competitors',
        'market.qb.saving': 'Saving...',
        'market.qb.required': '*',
        'market.qb.validationIndustry': 'Please select an industry/category.',
        'market.qb.validationAudience': 'Please enter your target audience.',
        'market.qb.analysisCancelled': 'Competitor analysis cancelled.',
        'market.qb.retry': 'Retry',

        // Industry Categories
        'market.industry.saas_software': 'SaaS / Software',
        'market.industry.fintech_finance': 'Fintech / Finance',
        'market.industry.blockchain_crypto': 'Blockchain / Crypto',
        'market.industry.ecommerce_retail': 'E-commerce / Retail',
        'market.industry.healthcare_bio': 'Healthcare / Bio',
        'market.industry.ai_ml': 'AI / Machine Learning',
        'market.industry.education_edtech': 'Education / EdTech',
        'market.industry.media_content': 'Media / Content',
        'market.industry.logistics_mobility': 'Logistics / Mobility',
        'market.industry.gaming_entertainment': 'Gaming / Entertainment',
        'market.industry.real_estate': 'Real Estate / PropTech',
        'market.industry.food_beverage': 'F&B / FoodTech',
        'market.industry.travel_hospitality': 'Travel / Hospitality',
        'market.industry.hr_recruiting': 'HR / Recruiting',
        'market.industry.marketing_adtech': 'Marketing / AdTech',
        'market.industry.other': 'Other (Enter manually)',

        // Knowledge Hub - Score Tooltips
        'score.quantity.tooltip': '5 points per source (max 8 sources = 40 points)',
        'score.diversity.tooltip': 'Google Drive (+10), Web Link (+10), Note (+10)',
        'score.recency.tooltip': 'Less than 7 days: +20 pts, 14 days: +10 pts, older: +5 pts',
        'score.integration.tooltip': 'Connect Google Drive to earn +10 points',

        // Studio
        'studio.welcome.title': "Hello! I'm your AI Orchestrator.",
        'studio.welcome.subtitle': 'Select a context history or type a goal to start.',
        'studio.input.placeholder': 'Describe your goal or drop files here...',
        'studio.welcome.directTitle': 'Create from Scratch',
        'studio.welcome.directSubtitle': 'No pre-existing context? No problem. Describe your content goal below, and our AI agents will handle the research, writing, and scheduling based on your project\'s brand identity.',
        'studio.input.directPlaceholder': 'e.g., Write 3 promotional tweets for our new organic skincare line launching next Monday...',
        'studio.button.generateFromScratch': 'Generate from Scratch',
        'studio.log.projectLoaded': '{{name}} project has been loaded.',
        'studio.log.noProjectsFound': 'No projects found',
        'studio.log.noValidProjectsFound': 'No valid projects found',
        'studio.log.planLoadedFromKnowledgeHub': '📄 Loaded plan from Knowledge Hub',
        'studio.log.planName': '📝 Plan: {{planName}}',
        'studio.log.loadedSourceContext': 'Loaded Source Context',
        'studio.log.autoLoadingTeam': '🤖 Auto-loading team: {{teamId}}',
        'studio.log.failedToLoadProjects': '❌ Failed to load projects',
        'studio.button.startWithSelectedContext': 'Start with Selected Context',
        'studio.log.projectContextLoaded': '📄 Loaded project context',
        'studio.log.projectDeselected': '📁 Project deselected',
        'studio.log.selectProjectAndTeam': 'Please select a Project and Agent Team first.',
        'studio.log.processingAttachments': '📎 Processing attachments...',
        'studio.log.aiOrchestratorFailed': '❌ AI Orchestrator failed to respond.',
        'studio.log.extractedContext': '🧠 Extracted Context: {{name}}',
        'studio.log.suggestedMarketResearch': '🔍 Suggested Market Research: "{{query}}"',
        'studio.log.marketResearch': 'Market Research',
        'studio.log.clickToPerformResearch': 'Click to perform research for "{{query}}"',
        'studio.log.researchInsightsAddedToBrief': '✅ Research insights added to Target Brief',
        'studio.button.regenerateRefine': 'Regenerate / Refine',
        'studio.log.switchedToAgentEngineMode': '🔄 Switched to Agent Engine Mode',
        'studio.log.switchedToSocialMediaMode': '🔄 Switched to Social Media Mode',
        'studio.log.orchestrator': 'Orchestrator',
        'studio.log.coreTeam': 'Core Team',
        'studio.log.coreTeamAutoLoaded': '🧠 Core Team auto-loaded: {{teamName}}',
        'studio.log.autoSelectedTeam': '🤖 Auto-selected team: {{teamName}}',
        'studio.log.foundAgentTeams': '🤖 Found {{count}} agent team(s)',
        'studio.log.noAccessToProject': '⛔ No access to this project',
        'studio.log.failedToLoadAgentTeams': '❌ Failed to load agent teams',
        'studio.label.targetChannels': 'Target Channels',
        'studio.log.atLeastOneChannel': '⚠️ At least one channel must be selected',
        'studio.log.targetChannels': '🎯 Target channels: {{channels}}',
        'studio.stats.channelsSelected': '{{count}} channel(s) selected',
        'studio.preview.selectChannelsToPreview': 'Select channels to preview',
        'studio.preview.waitingForContent': 'Waiting for {{channelName}} content...',
        'studio.preview.brand': 'Brand',
        'studio.preview.justNow': 'Just Now',
        'studio.preview.postImage': 'Post image',
        'studio.preview.cameraEmoji': '📷',
        'studio.preview.companyPage': 'Company Page',
        'studio.preview.like': 'Like',
        'studio.preview.comment': 'Comment',
        'studio.preview.repost': 'Repost',
        'studio.preview.send': 'Send',
        'studio.preview.playButton': '▶',
        'studio.preview.videoTitle': 'Video Title',
        'studio.preview.channel': 'Channel',
        'studio.preview.views': 'views',
        'studio.preview.naverBlog': 'Naver Blog',
        'studio.preview.blogPostTitle': 'Blog Post Title',
        'studio.preview.contentNotGeneratedYet': 'Content not generated yet...',
        'studio.preview.allChannelPreviews': 'All Channel Previews',
        'studio.preview.avatar': 'Avatar',
        'studio.preview.yourBrand': 'Your Brand',
        'studio.preview.generatedContentWillAppearHere': 'Generated content for channel will appear here...',
        'studio.preview.multiChannelVisualContextPending': 'Multi-channel visual context pending',
        'studio.promptInsight.title': 'Prompt Insight',
        'studio.promptInsight.systemPrompt': 'System Prompt',
        'studio.promptInsight.userMessage': 'User Message',
        'studio.promptInsight.aiResponse': 'AI Response',
        'studio.promptInsight.copyAll': 'Copy All',
        'studio.promptInsight.agent': 'AGENT',
        'studio.promptInsight.unknownAgent': 'Unknown Agent',
        'studio.promptInsight.notAvailable': 'N/A',
        'studio.log.promptsCopied': '📋 Prompts copied to clipboard',
        'studio.promptInsight.noSystemPrompt': 'No system prompt available',
        'studio.promptInsight.noUserMessage': 'No user message available',
        'studio.promptInsight.noResponseYet': 'No response yet',
        'studio.log.teamNotFound': 'Team not found',
        'studio.log.channelSetTo': '📺 Channel set to: {{channelName}}',
        'studio.log.profileUpdatedFromAccount': '👤 Profile updated from connected account: {{handle}}',
        'studio.log.errorLoadingChannel': 'Error loading channel',
        'studio.log.selectAgentTeamToSeeChannel': 'Select Agent Team to see channel',
        'studio.log.noAgentsInTeam': 'No agents found in this team.',
        'studio.stats.agentsCount': '{{selected}}/{{total}} agents',
        'studio.log.boosterModeActivated': '🚀 Booster Mode ACTIVATED: Max Performance',
        'studio.log.boosterModeDeactivated': 'Booster Mode Deactivated: Standard routing',
        'studio.alert.selectProjectAndTeam': 'Please select a Project and Agent Team first.',
        'studio.log.startingExecutionPipeline': '🚀 Starting Agent Execution Pipeline...',
        'studio.log.newContentReceived': '✨ New content received for {{channel}}',
        'studio.log.error': '❌ Error: {{message}}',
        'studio.button.resume': 'Resume',
        'studio.button.pause': 'Pause',
        'studio.alert.confirmStopExecution': 'Are you sure you want to stop the execution?',
        'studio.log.retryingLastFailedAgent': '🔄 Retrying last failed agent...',
        'studio.log.executionCompleted': '✅ Execution completed!',
        'studio.footer.progress': 'Phase {{phase}}/4 • Agent {{agent}}/{{totalAgents}}',
        'studio.preview.profile': 'Profile',
        'studio.log.startingWorkflowExecutionDemo': 'Starting workflow execution demo...',
        'studio.brief.title': 'Target Brief',
        'studio.brief.placeholder': 'Your finalized content strategy will appear here. AI will use this as the ultimate reference.',
        'studio.brief.synced': 'Synced',
        'studio.brief.charCount': '{{count}} characters',
        'studio.brief.clearConfirm': 'Are you sure you want to clear the target brief?',
        'studio.brief.cleared': 'Brief cleared.',
        'studio.sourceContext.directInput': 'Direct Input (Start from scratch)',
        'studio.sourceContext.mergeContext': 'Merge with current brief',
        'studio.sourceContext.removeContext': 'Remove from history',
        'studio.sourceContext.untitledPlan': 'Untitled Plan',
        'studio.log.agentStarted': 'Agent {{agentId}} started',
        'studio.log.agentCompleted': 'Agent {{agentId}} completed',
        'studio.log.workflowExecutionCompleted': 'Workflow execution completed!',
        'studio.status.draftReady': 'Draft Ready',
        'studio.preview.vision': 'vision',
        'studio.seo.excellent': 'Excellent',
        'studio.seo.good': 'Good',
        'studio.seo.fair': 'Fair',
        'studio.seo.needsWork': 'Needs Work',
        'studio.seo.waiting': 'Waiting',
        'studio.compliance.status': 'Status',
        'studio.compliance.passed': 'Passed',
        'studio.compliance.issuesFound': 'Issues Found',
        'studio.compliance.waiting': 'Waiting',
        'studio.log.noContentToEdit': '⚠️ No content to edit yet. Wait for content generation.',
        'studio.button.done': 'Done',
        'studio.log.editModeEnabled': '✏️ Edit mode enabled - Click on content to edit',
        'studio.button.edit': 'Edit',
        'studio.log.changesSaved': '✅ Changes saved',
        'studio.alert.confirmDiscardContent': 'Are you sure you want to discard this content?',
        'studio.log.contentDiscarded': '❌ Content discarded',
        'studio.preview.contentDiscarded': 'Content discarded. Click Regenerate to create new content.',
        'studio.log.regeneratingWithFeedback': '🔄 Regenerating with: "{{feedback}}"',
        'studio.log.regeneratingContent': '🔄 Regenerating content...',
        'studio.log.systemErrorDagExecutor': '❌ System Error: DAG Executor not initialized',
        'studio.log.editModeNotAvailable': '⚠️ Edit mode not available in this version',
        'studio.log.exportingContent': '📤 Exporting content...',
        'studio.log.exportComplete': '✅ Export complete (simulated)',
        'studio.log.contentApproved': '✅ Content approved and ready for publishing',
        'studio.button.publishing': 'Publishing...',
        'studio.preview.yourGeneratedTweet': 'Your generated tweet will appear here...',
        'studio.button.approve': 'Approve',
        'studio.log.postingToX': '📤 Posting to X (Twitter)...',
        'studio.log.postedToX': '✅ Posted to X! Tweet ID: {{tweetId}}',
        'studio.button.published': 'Published!',
        'studio.log.failedToPost': '❌ Failed to post: {{message}}',
        'studio.button.retry': 'Retry',
        'studio.agentReport.unknownModel': 'Unknown Model',
        'studio.agentReport.reused': 'REUSED',
        'studio.agentReport.mock': 'MOCK',
        'studio.agentReport.view': 'VIEW',
        'studio.agentReport.report': 'REPORT',
        'studio.agentReport.tokens': 'tokens',
        'studio.agentReport.projectContextInjected': 'Project Context Injected',
        'studio.agentReport.brandPersonaActive': 'Brand Persona Active',
        'studio.agentReport.reference': 'Reference',
        'studio.agentReport.knowledgeBaseAccessed': 'Knowledge Base Accessed',
        'studio.agentReport.usedPreviousContext': 'Used Previous Context ({{steps}} steps)',
        'studio.log.noProjectActive': '⚠️ No project active. Please select a project at the top.',
        'studio.settings.loading': 'Loading...',
        'studio.settings.loadingConfiguration': 'Loading configuration...',
        'studio.log.failedToLoadSettings': '❌ Failed to load settings: {{message}}',
        'studio.settings.noSubAgentsFound': 'No sub-agents found.',
        'studio.settings.placeholder.researcher': 'e.g., Search for latest tech news from reliable sources like TechCrunch and The Verge. Focus on AI developments...',
        'studio.settings.placeholder.writer': 'e.g., Write in a professional yet engaging tone. Use emojis sparingly. Avoid jargon...',
        'studio.settings.placeholder.planner': 'e.g., Create a content plan that balances educational posts with promotional content. Schedule posts for optimal times...',
        'studio.settings.placeholder.reviewer': 'e.g., Check for grammatical errors and ensure the tone matches our brand voice. Verify all facts...',
        'studio.settings.placeholder.default': 'e.g., define the specific tasks and behavioral guidelines for this agent...',
        'studio.settings.agent': 'Agent',
        'studio.settings.defaultModel': 'Default Model',
        'studio.settings.behaviorInstructions': 'Behavior Instructions (System Prompt)',
        'studio.settings.defineAgentBehavior': 'Define how this agent should act, its personality, and specific rules to follow.',
        'studio.button.saving': 'Saving...',
        'studio.log.settingsSaved': '✅ Settings saved successfully!',
        'studio.status.approved': 'Approved',
        'studio.log.contentApprovedForChannel': '✨ Content for {{channelName}} approved!',
        'studio.log.failedToLoadContentPlans': '❌ Failed to load content plans',
        'studio.sourceContext.directInput': 'Direct Input (Scratch)',
        'studio.alert.confirmDeleteContext': 'Context 목록에서 삭제하시겠습니까?',
        'settings.button.saveLanguage': 'Save Language Settings',
        'studio.log.switchedToDirectInput': 'Switched to direct input mode',
        'studio.log.actionTriggered': 'Action triggered: {{type}}',
        'studio.log.voiceLanguageSet': 'Language set to {{lang}}',
        'studio.log.contextLoaded': 'Context loaded: {{name}}',
        'studio.log.maxAttachments': 'Maximum {{count}} attachments allowed.',
        'studio.log.recordingStarted': 'Recording ({{lang}})...',
        'studio.log.recordingStopped': 'Recording stopped',
        'studio.log.noSpeechDetected': 'No speech detected, recognition stopped.',
        'studio.log.micAccessDenied': 'Microphone access denied.',
        'studio.log.voiceNotSupported': 'Voice input not supported.',
        'studio.log.addedFile': 'Added: {{name}}',
    },
    ko: {
        // Navigation
        'nav.commandCenter': '커맨드 센터',
        'nav.marketPulse': '마켓 펄스',
        'nav.brandBrain': '브랜드 브레인',
        'nav.knowledgeHub': '나리지 허브',
        'nav.studio': '스튜디오',
        'nav.theGrowth': '더 그로스',
        'nav.settings': '설정',
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

        // Settings
        'settings.apiKey.link': 'API 키를 얻는 방법?',

        // Studio
        'studio.welcome.title': '안녕하세요! 저는 AI 오케스트레이터입니다.',
        'studio.welcome.subtitle': '컨텍스트 기록을 선택하거나 목표를 입력하여 시작하세요.',
        'studio.input.placeholder': '목표를 설명하거나 파일을 여기에 드롭하세요...',
        'studio.welcome.directTitle': '아이디어만 있으면 충분합니다!',
        'studio.welcome.directSubtitle': '사전 데이터가 없어도 괜찮습니다. 작성하고 싶은 주제나 목표를 아래에 입력해 주세요. 에이전트 팀이 프로젝트의 브랜드 보이스에 맞춰 리서치부터 포스팅 초안까지 완성합니다.',
        'studio.input.directPlaceholder': '예: 다음 주 월요일에 출시하는 유기농 스킨케어 라인 홍보용 트윗 3개 써줘...',
        'studio.button.generateFromScratch': '처음부터 생성하기',
        'studio.log.projectLoaded': '{{name}} 프로젝트가 로드되었습니다.',
        'studio.log.noProjectsFound': '프로젝트를 찾을 수 없습니다',
        'studio.log.noValidProjectsFound': '유효한 프로젝트를 찾을 수 없습니다',
        'studio.log.planLoadedFromKnowledgeHub': '📄 나리지 허브에서 플랜을 로드했습니다',
        'studio.log.planName': '📝 플랜: {{planName}}',
        'studio.log.loadedSourceContext': '소스 컨텍스트 로드됨',
        'studio.log.autoLoadingTeam': '🤖 팀 자동 로딩 중: {{teamId}}',
        'studio.log.failedToLoadProjects': '❌ 프로젝트 로드 실패',
        'studio.button.startWithSelectedContext': '선택한 컨텍스트로 시작',
        'studio.log.projectContextLoaded': '📄 프로젝트 컨텍스트 로드됨',
        'studio.log.projectDeselected': '📁 프로젝트 선택 해제됨',
        'studio.log.selectProjectAndTeam': '먼저 프로젝트와 에이전트 팀을 선택해주세요.',
        'studio.log.processingAttachments': '📎 첨부 파일 처리 중...',
        'studio.log.aiOrchestratorFailed': '❌ AI 오케스트레이터가 응답하지 않습니다.',
        'studio.log.extractedContext': '🧠 컨텍스트 추출됨: {{name}}',
        'studio.log.suggestedMarketResearch': '🔍 시장 조사 제안: "{{query}}"',
        'studio.log.marketResearch': '시장 조사',
        'studio.log.clickToPerformResearch': '"{{query}}"에 대한 리서치를 수행하려면 클릭하세요',
        'studio.log.researchInsightsAddedToBrief': '✅ 리서치 인사이트가 타겟 브리프에 추가되었습니다.',
        'studio.button.regenerateRefine': '재생성 / 수정',
        'studio.log.switchedToAgentEngineMode': '🔄 에이전트 엔진 모드로 전환되었습니다',
        'studio.log.switchedToSocialMediaMode': '🔄 소셜 미디어 모드로 전환되었습니다',
        'studio.log.orchestrator': '오케스트레이터',
        'studio.log.coreTeam': '코어 팀',
        'studio.log.coreTeamAutoLoaded': '🧠 코어 팀 자동 로드됨: {{teamName}}',
        'studio.log.autoSelectedTeam': '🤖 자동 선택된 팀: {{teamName}}',
        'studio.log.foundAgentTeams': '🤖 {{count}}개의 에이전트 팀을 찾았습니다',
        'studio.log.noAccessToProject': '⛔ 이 프로젝트에 대한 접근 권한이 없습니다',
        'studio.log.failedToLoadAgentTeams': '❌ 에이전트 팀 로드 실패',
        'studio.label.targetChannels': '대상 채널',
        'studio.log.atLeastOneChannel': '⚠️ 최소 하나의 채널을 선택해야 합니다',
        'studio.log.targetChannels': '🎯 대상 채널: {{channels}}',
        'studio.stats.channelsSelected': '{{count}}개 채널 선택됨',
        'studio.preview.selectChannelsToPreview': '미리보기할 채널을 선택하세요',
        'studio.preview.waitingForContent': '{{channelName}} 콘텐츠 대기 중...',
        'studio.preview.brand': '브랜드',
        'studio.preview.justNow': '방금 전',
        'studio.preview.postImage': '게시물 이미지',
        'studio.preview.cameraEmoji': '📷',
        'studio.preview.companyPage': '기업 페이지',
        'studio.preview.like': '좋아요',
        'studio.preview.comment': '댓글',
        'studio.preview.repost': '공유',
        'studio.preview.send': '보내기',
        'studio.preview.playButton': '▶',
        'studio.preview.videoTitle': '비디오 제목',
        'studio.preview.channel': '채널',
        'studio.preview.views': '조회수',
        'studio.preview.naverBlog': '네이버 블로그',
        'studio.preview.blogPostTitle': '블로그 포스트 제목',
        'studio.preview.contentNotGeneratedYet': '콘텐츠가 아직 생성되지 않았습니다...',
        'studio.preview.allChannelPreviews': '모든 채널 미리보기',
        'studio.preview.avatar': '아바타',
        'studio.preview.yourBrand': '나의 브랜드',
        'studio.preview.generatedContentWillAppearHere': '생성된 콘텐츠가 여기에 표시됩니다...',
        'studio.preview.multiChannelVisualContextPending': '멀티 채널 비주얼 컨텍스트 대기 중',
        'studio.promptInsight.title': '프롬프트 인사이트',
        'studio.promptInsight.systemPrompt': '시스템 프롬프트',
        'studio.promptInsight.userMessage': '사용자 메시지',
        'studio.promptInsight.aiResponse': 'AI 응답',
        'studio.promptInsight.copyAll': '전체 복사',
        'studio.promptInsight.agent': '에이전트',
        'studio.promptInsight.unknownAgent': '알 수 없는 에이전트',
        'studio.promptInsight.notAvailable': '해당 없음',
        'studio.log.promptsCopied': '📋 프롬프트가 클립보드에 복사되었습니다',
        'studio.promptInsight.noSystemPrompt': '사용 가능한 시스템 프롬프트가 없습니다',
        'studio.promptInsight.noUserMessage': '사용 가능한 사용자 메시지가 없습니다',
        'studio.promptInsight.noResponseYet': '아직 응답이 없습니다',
        'studio.log.teamNotFound': '팀을 찾을 수 없습니다',
        'studio.log.channelSetTo': '📺 채널 설정됨: {{channelName}}',
        'studio.log.profileUpdatedFromAccount': '👤 연결된 계정에서 프로필 업데이트됨: {{handle}}',
        'studio.log.errorLoadingChannel': '채널 로드 오류',
        'studio.log.selectAgentTeamToSeeChannel': '채널을 보려면 에이전트 팀을 선택하세요',
        'studio.log.noAgentsInTeam': '이 팀에서 에이전트를 찾을 수 없습니다.',
        'studio.stats.agentsCount': '{{selected}}/{{total}} 에이전트',
        'studio.log.boosterModeActivated': '🚀 부스터 모드 활성화됨: 최대 성능',
        'studio.log.boosterModeDeactivated': '부스터 모드 비활성화됨: 표준 라우팅',
        'studio.alert.selectProjectAndTeam': '먼저 프로젝트와 에이전트 팀을 선택해주세요.',
        'studio.log.startingExecutionPipeline': '🚀 에이전트 실행 파이프라인 시작 중...',
        'studio.log.newContentReceived': '✨ {{channel}}에 대한 새로운 콘텐츠 수신됨',
        'studio.log.error': '❌ 오류: {{message}}',
        'studio.button.resume': '재개',
        'studio.button.pause': '일시정지',
        'studio.alert.confirmStopExecution': '실행을 중지하시겠습니까?',
        'studio.log.retryingLastFailedAgent': '🔄 마지막 실패 에이전트 재시도 중...',
        'studio.log.executionCompleted': '✅ 실행 완료!',
        'studio.footer.progress': '단계 {{phase}}/4 • 에이전트 {{agent}}/{{totalAgents}}',
        'studio.preview.profile': '프로필',
        'studio.log.startingWorkflowExecutionDemo': '워크플로우 실행 데모 시작 중...',
        'studio.brief.title': '최종 타겟 브리프',
        'studio.brief.placeholder': '최종 확정된 콘텐츠 전략이 여기에 표시됩니다. AI 에이전트는 이 내용을 최종 참조 데이터로 사용합니다.',
        'studio.brief.synced': '동기화됨',
        'studio.brief.charCount': '{{count}} 자',
        'studio.brief.clearConfirm': '현재 브리프 내용을 모두 삭제하시겠습니까?',
        'studio.brief.cleared': '브리프가 초기화되었습니다.',
        'studio.sourceContext.directInput': '직접 입력 (처음부터 시작)',
        'studio.sourceContext.mergeContext': '현재 브리프에 병합',
        'studio.sourceContext.removeContext': '기록에서 삭제',
        'studio.sourceContext.untitledPlan': '제목 없는 플랜',
        'studio.log.agentStarted': '에이전트 {{agentId}} 시작됨',
        'studio.log.agentCompleted': '에이전트 {{agentId}} 완료됨',
        'studio.log.workflowExecutionCompleted': '워크플로우 실행 완료!',
        'studio.status.draftReady': '초안 준비됨',
        'studio.preview.vision': '비전',
        'studio.seo.excellent': '최상',
        'studio.seo.good': '좋음',
        'studio.seo.fair': '보통',
        'studio.seo.needsWork': '개선 필요',
        'studio.seo.waiting': '대기 중',
        'studio.compliance.status': '상태',
        'studio.compliance.passed': '통과',
        'studio.compliance.issuesFound': '이슈 발견',
        'studio.compliance.waiting': '대기 중',
        'studio.log.noContentToEdit': '⚠️ 아직 편집할 콘텐츠가 없습니다. 콘텐츠 생성을 기다려주세요.',
        'studio.button.done': '완료',
        'studio.log.editModeEnabled': '✏️ 편집 모드 활성화됨 - 콘텐츠를 클릭하여 편집하세요',
        'studio.button.edit': '편집',
        'studio.log.changesSaved': '✅ 변경사항 저장됨',
        'studio.alert.confirmDiscardContent': '이 콘텐츠를 삭제하시겠습니까?',
        'studio.log.contentDiscarded': '❌ 콘텐츠 삭제됨',
        'studio.preview.contentDiscarded': '콘텐츠가 삭제되었습니다. 다시 생성을 클릭하여 새 콘텐츠를 만드세요.',
        'studio.log.regeneratingWithFeedback': '🔄 피드백 반영하여 재생성 중: "{{feedback}}"',
        'studio.log.regeneratingContent': '🔄 콘텐츠 재생성 중...',
        'studio.log.systemErrorDagExecutor': '❌ 시스템 오류: DAG Executor가 초기화되지 않았습니다',
        'studio.log.editModeNotAvailable': '⚠️ 이 버전에서는 편집 모드를 사용할 수 없습니다',
        'studio.log.exportingContent': '📤 콘텐츠 내보내는 중...',
        'studio.log.exportComplete': '✅ 내보내기 완료 (시뮬레이션)',
        'studio.log.contentApproved': '✅ 콘텐츠 승인됨 및 게시 준비 완료',
        'studio.button.publishing': '게시 중...',
        'studio.preview.yourGeneratedTweet': '생성된 트윗이 여기에 표시됩니다...',
        'studio.button.approve': '승인',
        'studio.log.postingToX': '📤 X (트위터)에 게시 중...',
        'studio.log.postedToX': '✅ X에 게시됨! 트윗 ID: {{tweetId}}',
        'studio.button.published': '게시됨!',
        'studio.log.failedToPost': '❌ 게시 실패: {{message}}',
        'studio.button.retry': '재시도',
        'studio.agentReport.unknownModel': '알 수 없는 모델',
        'studio.agentReport.reused': '재사용됨',
        'studio.agentReport.mock': '목업',
        'studio.agentReport.view': '조회',
        'studio.agentReport.report': '리포트',
        'studio.agentReport.tokens': '토큰',
        'studio.agentReport.projectContextInjected': '프로젝트 컨텍스트 주입됨',
        'studio.agentReport.brandPersonaActive': '브랜드 페르소나 활성',
        'studio.agentReport.reference': '참조',
        'studio.agentReport.knowledgeBaseAccessed': '나리지 베이스 접근됨',
        'studio.agentReport.usedPreviousContext': '이전 컨텍스트 사용 ({{steps}} 단계)',
        'studio.log.noProjectActive': '⚠️ 활성화된 프로젝트가 없습니다. 상단에서 프로젝트를 선택해주세요.',
        'studio.settings.loading': '로딩 중...',
        'studio.settings.loadingConfiguration': '설정 로딩 중...',
        'studio.log.failedToLoadSettings': '❌ 설정 로드 실패: {{message}}',
        'studio.settings.noSubAgentsFound': '서브 에이전트를 찾을 수 없습니다.',
        'studio.settings.placeholder.researcher': '예: TechCrunch나 The Verge와 같은 신뢰할 수 있는 소스에서 최신 기술 뉴스를 검색하세요. AI 발전에 집중하세요...',
        'studio.settings.placeholder.writer': '예: 전문적이면서도 매력적인 톤으로 작성하세요. 이모지는 절제해서 사용하고 전문 용어는 피해 주세요...',
        'studio.settings.placeholder.planner': '예: 교육용 포스트와 홍보용 콘텐츠의 균형을 맞춘 콘텐츠 플랜을 작성하세요. 최적의 시간에 포스트를 예약하세요...',
        'studio.settings.placeholder.reviewer': '예: 문법 오류를 확인하고 톤이 브랜드 보이스와 일치하는지 확인하세요. 모든 사실 관계를 검증하세요...',
        'studio.settings.placeholder.default': '예: 이 에이전트의 구체적인 작업과 행동 지침을 정의하세요...',
        'studio.settings.agent': '에이전트',
        'studio.settings.defaultModel': '기본 모델',
        'studio.settings.behaviorInstructions': '행동 지침 (시스템 프롬프트)',
        'studio.settings.defineAgentBehavior': '이 에이전트가 어떻게 행동해야 하는지, 성격과 따를 구체적인 규칙을 정의하세요.',
        'studio.button.saving': '저장 중...',
        'studio.log.settingsSaved': '✅ 설정이 성공적으로 저장되었습니다!',
        'studio.status.approved': '승인됨',
        'studio.log.contentApprovedForChannel': '✨ {{channelName}}용 콘텐츠가 승인되었습니다!',
        'studio.log.failedToLoadContentPlans': '❌ 콘텐츠 플랜 로드 실패',
        'studio.sourceContext.directInput': '직접 입력 (처음부터)',

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
        'market.credits': '보유 크레딧',

        // Quick Briefing (Competitor Radar)
        'market.qb.title': 'Quick Briefing',
        'market.qb.subtitle': '더 정확한 경쟁사를 찾기 위해 아래 정보를 입력해주세요.',
        'market.qb.industry': '산업/카테고리',
        'market.qb.industryPlaceholder': '선택하세요...',
        'market.qb.industryCustomPlaceholder': '산업 카테고리를 직접 입력하세요',
        'market.qb.audience': '주요 타겟 고객',
        'market.qb.audiencePlaceholder': '예: 30-40대 스타트업 창업자, B2B 기업 의사결정자',
        'market.qb.usp': '핵심 차별점 (USP)',
        'market.qb.uspPlaceholder': '예: AI 기반 실시간 분석, 업계 최저 수수료',
        'market.qb.knownCompetitors': '이미 알고 있는 경쟁사',
        'market.qb.knownCompetitorsOptional': '(선택)',
        'market.qb.knownCompetitorsHint': '직접 경쟁사를 추가하면 AI가 더 정확하게 분석합니다.',
        'market.qb.competitorInputPlaceholder': '경쟁사 이름 또는 URL 입력',
        'market.qb.add': '추가',
        'market.qb.noCompetitorsAdded': '추가된 경쟁사가 없습니다',
        'market.qb.cancel': '취소',
        'market.qb.saveAndScan': '저장 후 경쟁사 찾기',
        'market.qb.saving': '저장 중...',
        'market.qb.required': '*',
        'market.qb.validationIndustry': '산업/카테고리를 선택해주세요.',
        'market.qb.validationAudience': '타겟 고객을 입력해주세요.',
        'market.qb.analysisCancelled': '경쟁사 분석이 취소되었습니다.',
        'market.qb.retry': '다시 시도',

        // Industry Categories
        'market.industry.saas_software': 'SaaS / 소프트웨어',
        'market.industry.fintech_finance': '핀테크 / 금융',
        'market.industry.blockchain_crypto': '블록체인 / 크립토',
        'market.industry.ecommerce_retail': '이커머스 / 리테일',
        'market.industry.healthcare_bio': '헬스케어 / 바이오',
        'market.industry.ai_ml': 'AI / 머신러닝',
        'market.industry.education_edtech': '교육 / 에듀테크',
        'market.industry.media_content': '미디어 / 콘텐츠',
        'market.industry.logistics_mobility': '물류 / 모빌리티',
        'market.industry.gaming_entertainment': '게임 / 엔터테인먼트',
        'market.industry.real_estate': '부동산 / 프롭테크',
        'market.industry.food_beverage': 'F&B / 푸드테크',
        'market.industry.travel_hospitality': '여행 / 호스피탈리티',
        'market.industry.hr_recruiting': 'HR / 채용',
        'market.industry.marketing_adtech': '마케팅 / 애드테크',
        'market.industry.other': '기타 (직접 입력)',

        // Knowledge Hub - Score Tooltips
        'score.quantity.tooltip': '소스 1개당 5점 (최대 8개 = 40점)',
        'score.diversity.tooltip': 'Google Drive (+10), 웹 링크 (+10), 노트 (+10)',
        'score.recency.tooltip': '7일 미만: +20점, 14일 미만: +10점, 이후: +5점',
        'score.integration.tooltip': 'Google Drive 연결 시 +10점',
        'settings.button.saveLanguage': '언어 설정 저장',
        'studio.log.addedFile': '추가됨: {{name}}',
    }
};

// 🌐 Language Defaults & Persistence
// 1. UI Language (Global) - Default to system language if supported, else Korean
let currentLang = localStorage.getItem('zynk-language');
if (!currentLang) {
    const sysLang = navigator.language || navigator.userLanguage;
    currentLang = sysLang.startsWith('ko') ? 'ko' : 'en';
    localStorage.setItem('zynk-language', currentLang);
}

// 2. Content Main - Default to UI language
if (!localStorage.getItem('zynk-main-language')) {
    localStorage.setItem('zynk-main-language', currentLang);
}

// 3. Content Sub - Default to English
if (!localStorage.getItem('zynk-sub-language')) {
    localStorage.setItem('zynk-sub-language', 'en');
}

// Function to translate the page
function translatePage(lang, persist = true) {
    if (!lang) lang = currentLang;
    currentLang = lang;
    if (persist) {
        localStorage.setItem('zynk-language', lang);
    }

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

    // Notify other scripts that language has changed
    window.dispatchEvent(new CustomEvent('zynk-lang-changed', { detail: { lang } }));

    // Re-render components that might have been loaded dynamically (like sidebar)
    if (window.UI && typeof window.UI.refreshUI === 'function') {
        window.UI.refreshUI();
    }
}

// Helper function to get a translation by key
function t(key, lang) {
    if (!key) return '';

    // Determine priority language
    let priorityLang = lang;
    if (!priorityLang) {
        const globalLang = localStorage.getItem('zynk-language') || 'en';
        const contentLang = localStorage.getItem('zynk-main-language');

        // Elements that should follow Content Language in Studio
        const isContentRelated = typeof key === 'string' && (
            key.startsWith('studio.log') ||
            key.startsWith('studio.welcome') ||
            key.startsWith('studio.input') ||
            key.startsWith('studio.preview') ||
            key.startsWith('studio.status') ||
            key.startsWith('studio.alert') ||
            key.startsWith('studio.promptInsight')
        );

        priorityLang = (isContentRelated && contentLang) ? contentLang : globalLang;
    }

    const l = priorityLang || currentLang;
    return (translations[l] && translations[l][key]) || (translations['en'] && translations['en'][key]) || key;
}

// Ensure globally accessible
window.t = t;
window.translations = translations;

// Global function to set language (intended for Settings)
function setAppLanguage(lang, persist = true) {
    translatePage(lang, persist);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    translatePage(currentLang);

    // Support for simple toggle button (as on Landing Page)
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            const nextLang = currentLang === 'en' ? 'ko' : 'en';
            setAppLanguage(nextLang);
        });
    }
});
