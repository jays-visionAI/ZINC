import { Trend } from './types';

export const MOCK_TRENDS: Trend[] = [
    {
        id: '1',
        name: 'Generative Video AI',
        velocity: 18.5,
        volume: 34200,
        sentiment: 0.65,
        confidence: 0.88,
        history: [120, 150, 180, 240, 300, 280, 342],
        summary: 'Rising interest due to new model releases (Sora, Veo) reducing barrier to entry for creators.',
        drivers: [
            'Release of open-source video models',
            'Integration into social media creation tools',
            'Viral "AI vs Reality" comparisons'
        ],
        evidence: [
            {
                id: 'e1',
                title: 'The State of AI Video Generation 2024',
                publisher: 'TechCrunch',
                date: '2d ago',
                snippet: 'New benchmarks show 3x improvement in temporal consistency.',
                url: '#'
            },
            {
                id: 'e2',
                title: 'Creator Economy Report Q3',
                publisher: 'Bloomberg',
                date: '5h ago',
                snippet: '22% of creators have adopted AI video tools in workflow.',
                url: '#'
            },
            {
                id: 'e3',
                title: 'Video synthesis analysis',
                publisher: 'Arxiv.org',
                date: '1d ago',
                snippet: 'Paper discussing latent diffusion models in video.',
                url: '#'
            }
        ]
    },
    {
        id: '2',
        name: 'Sustainable Packaging',
        velocity: 12.1,
        volume: 89000,
        sentiment: 0.45,
        confidence: 0.92,
        history: [800, 810, 820, 850, 870, 880, 890],
        summary: 'Consumer demand shifting towards biodegradable alternatives enforced by EU regulations.',
        drivers: ['EU Green Deal compliance deadlines', 'Plastic tax implementation', 'Viral "eco-unboxing" trends'],
        evidence: [
            { id: 'e4', title: 'Global Packaging Outlook', publisher: 'McKinsey', date: '3d ago', snippet: 'Shift to paper-based alternatives accelerates.', url: '#' },
            { id: 'e5', title: 'Consumer Sentiment Survey', publisher: 'NielsenIQ', date: '1w ago', snippet: '78% willing to pay premium for green packaging.', url: '#' }
        ]
    },
    {
        id: '3',
        name: 'Quantum Security',
        velocity: 45.2,
        volume: 12500,
        sentiment: 0.1,
        confidence: 0.65,
        history: [40, 45, 80, 70, 90, 110, 125],
        summary: 'Urgent discussions around post-quantum cryptography standards following NIST announcements.',
        drivers: ['NIST standardization of algorithms', 'Banking sector mandates', 'Nation-state cyber threats'],
        evidence: [
            { id: 'e6', title: 'NIST Finalizes PQ Standards', publisher: 'NIST.gov', date: '4d ago', snippet: 'Three algorithms selected for immediate adoption.', url: '#' },
            { id: 'e6b', title: 'Banking on Quantum', publisher: 'Finance Weekly', date: '1d ago', snippet: 'Major banks upgrading encryption protocols.', url: '#' },
            { id: 'e6c', title: 'Cyber Threat Report', publisher: 'FireEye', date: '2d ago', snippet: 'Harvest now, decrypt later attacks increasing.', url: '#' }
        ]
    },
    {
        id: '4',
        name: 'Remote Work Tax',
        velocity: -5.4,
        volume: 56000,
        sentiment: -0.3,
        confidence: 0.81,
        history: [600, 590, 580, 570, 560, 565, 560],
        summary: 'Controversy surrounding new cross-border taxation laws for digital nomads.',
        drivers: ['Double taxation treaties', 'Digital nomad visa expirations', 'Corporate RTO mandates'],
        evidence: [
            { id: 'e7', title: 'The End of Tax-Free Nomadism?', publisher: 'The Economist', date: '1d ago', snippet: 'Countries closing loopholes for remote workers.', url: '#' },
            { id: 'e8', title: 'Remote Work Legal Brief', publisher: 'LegalZoom', date: '5h ago', snippet: 'Compliance checklist for 2025.', url: '#' },
            { id: 'e9', title: 'Worker Sentiment Poll', publisher: 'Gallup', date: '2d ago', snippet: 'Frustration grows over complex tax filings.', url: '#' }
        ]
    },
    {
        id: '5',
        name: 'Sodium-Ion Batteries',
        velocity: 8.7,
        volume: 21000,
        sentiment: 0.8,
        confidence: 0.72,
        history: [180, 185, 190, 200, 205, 208, 210],
        summary: 'Emerging as a cheaper, safer alternative to Lithium-Ion for grid storage.',
        drivers: ['Lithium shortage fears', 'Cost reduction targets', 'EV market diversification'],
        evidence: [
            { id: 'e10', title: 'Battery Tech Review', publisher: 'IEEE Spectrum', date: '6d ago', snippet: 'Sodium density approaching LFP levels.', url: '#' },
            { id: 'e11', title: 'CATL Production Update', publisher: 'Reuters', date: '2d ago', snippet: 'Mass production begins for budget EVs.', url: '#' },
            { id: 'e12', title: 'Energy Storage Futures', publisher: 'BloombergNEF', date: '1d ago', snippet: 'Grid scale adoption predicted by 2026.', url: '#' }
        ]
    },
    {
        id: '6',
        name: 'Micro-SaaS Acquisition',
        velocity: 22.0,
        volume: 15400,
        sentiment: 0.5,
        confidence: 0.55,
        history: [100, 110, 120, 130, 145, 150, 154],
        summary: 'Private equity moving downstream to acquire profitable solopreneur projects.',
        drivers: ['Market consolidation', 'Search for yield', 'AI-assisted coding reducing maintenance costs'],
        evidence: [
            { id: 'e13', title: 'MicroConf Report', publisher: 'IndieHackers', date: '2d ago', snippet: 'Multiples for <$100k ARR businesses increasing.', url: '#' }
        ]
    }
];
