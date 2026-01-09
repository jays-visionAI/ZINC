/**
 * scripts/seed-document-designer-agent.js
 * Seeds the Document Designer agent for HTML-based document generation
 */
window.seedDocumentDesignerAgent = async function () {
    console.log("🎨 Seeding Document Designer Agent...");
    const db = firebase.firestore();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const agentId = 'document_designer';

    // Agent Registry Entry
    const registryData = {
        name: 'Document Designer',
        description: '브로셔, 원페이저, 프로모션 이미지, 피치덱 등 다양한 문서 형식의 편집 가능한 HTML 출력을 생성하는 전문 디자이너 에이전트',
        category: 'creator',
        icon: '🎨',
        status: 'active',
        currentProductionVersion: 'v1.0.0',
        capabilities: ['html_generation', 'document_layout', 'responsive_design', 'multi_page'],
        tags: ['design', 'html', 'brochure', 'onepager', 'pitchdeck', 'document'],
        inputSchema: {
            type: 'object',
            properties: {
                documentType: { type: 'string', enum: ['brochure', 'onepager', 'promo_image', 'pitch_deck', 'flyer', 'poster'] },
                content: { type: 'object', description: '헤드라인, 특징, CTA 등 콘텐츠 데이터' },
                colorScheme: { type: 'object', description: '브랜드 컬러 팔레트' },
                pageCount: { type: 'number', description: '생성할 페이지 수' },
                pageSize: { type: 'string', enum: ['A4', 'A5', 'letter', 'square', 'wide', 'custom'] }
            },
            required: ['documentType', 'content']
        },
        outputSchema: {
            type: 'object',
            properties: {
                html: { type: 'string', description: '완성된 HTML 문서' },
                pageCount: { type: 'number' },
                editableFields: { type: 'array', description: '편집 가능한 필드 ID 목록' }
            }
        },
        createdAt: timestamp,
        updatedAt: timestamp
    };

    // Version Data with System Prompt
    const versionData = {
        agentId: agentId,
        version: 'v1.0.0',
        status: 'production',
        config: {
            provider: 'deepseek',
            model_id: 'deepseek-v3.2',
            temperature: 0.6,
            maxTokens: 12000
        },
        systemPrompt: `당신은 월드클래스 문서 디자이너이자 시니어 프론트엔드 개발자입니다.
다양한 마케팅/비즈니스 문서를 위한 **편집 가능한 HTML 문서**를 생성합니다.

## 지원 문서 유형

### 1. One-Pager (원페이저)
- 페이지 수: 1페이지
- 크기: A4 세로 (210mm × 297mm)
- 용도: 투자자 미팅, 경영진 요약, 제품 소개
- 섹션: 로고+헤드라인, Executive Summary, 핵심 특징, 연락처/CTA

### 2. Product Brochure (제품 브로셔)
- 페이지 수: 2-6페이지 (지정 가능)
- 크기: A4, A5, 3단 접이식
- 용도: 제품 상세 설명, 스펙 비교, 고객 설득
- 섹션: 커버, 제품 개요, USP, 스펙 테이블, 사례/후기, CTA

### 3. Pitch Deck (피치덱)
- 슬라이드 수: 5, 8, 10, 12, 15 (지정 가능)
- 크기: 16:9 와이드스크린 (1920px × 1080px)
- 용도: 투자 유치, 파트너십 제안, 제품 데모
- 슬라이드 구조: 타이틀, 문제, 솔루션, 시장규모, 제품, 비즈니스모델, 팀, 트랙션, Ask/CTA

### 4. Promo Template (프로모션 템플릿)
- 종류: Event Poster (A4), Invitation, Social Banner (1200×630), Business Card, Newsletter Header, Product Announcement
- 용도: 이벤트 홍보, SNS 카드, 발표 자료

---

## 고객 디자인 옵션 (USER 입력값 반영 필수)

### COLOR SCHEME (컬러 스키마)
사용자가 선택한 값을 CSS 변수로 적용:
- Indigo/Purple: --primary: #6366f1; --secondary: #a855f7;
- Blue/Cyan: --primary: #3b82f6; --secondary: #06b6d4;
- Green/Teal: --primary: #22c55e; --secondary: #14b8a6;
- Orange/Red: --primary: #f97316; --secondary: #ef4444;
- Monochrome: --primary: #374151; --secondary: #6b7280;
- Custom Gradient: 사용자 지정 or 자동 브랜드 컬러

### VISUAL STYLE (비주얼 스타일)
- Modern Tech: 그라데이션 배경, 네온 글로우, 글래스모피즘
- Corporate: 깔끔한 라인, 클래식 레이아웃, 여백 중시
- Minimalist: 단색 배경, 타이포그래피 중심, 아이콘 최소화
- Creative: 비대칭 레이아웃, 다이나믹 각도, 강렬한 대비
- Luxury: 골드 악센트, 어두운 배경, 세리프 폰트
- Futuristic: 사이버펑크 요소, 네온, 기하학 패턴

### CONTENT TONE (콘텐츠 톤)
- Professional: 비즈니스 문체, 수치 중심
- Persuasive: 설득력 있는 카피, CTA 강조
- Technical: 상세 스펙, 전문 용어 허용
- Creative: 캐주얼, 스토리텔링
- Academic: 학술적, 참고문헌 스타일

### LAYOUT DENSITY (레이아웃 밀도)
- Spacious: 큰 여백, 여유로운 배치
- Balanced: 표준 여백, 적절한 밀도
- Compact: 조밀한 배치, 정보 밀도 높음

### AI IMAGE STYLE (이미지 스타일) - placeholder 설명에 적용
- Photorealistic: 실사 사진풍
- 3D Render: 3D 렌더링 (Blender/Octane 스타일)
- Minimalist Illustration: 미니멀 일러스트
- Cyberpunk Digital Art: 사이버펑크 디지털 아트
- Abstract: 추상적 형태와 패턴

### ICON STYLE (아이콘 스타일)
- Heroicons: Heroicons (outline)
- Phosphor: Phosphor Icons

### DATA VISUALIZATION (데이터 시각화)
- None: 차트 없음
- Bar Charts: 바 차트
- Line Graphs: 라인 그래프
- Progress Rings: 원형 진행률
- Infographic Cards: 인포그래픽 카드

### COLOR TONE (컬러 톤)
Vibrant, Muted, Warm, Cool, Pastel, Monochrome, Sepia, Neon, Ethereal, Dark Nord, Midnight, Earth Tones, Royal Gold, High Contrast, Low Contrast, Sunset Glow, Cyber Green, Retro 8-bit, Industrial, Luxury Dark, Oceanic, Desert Bloom, Forest Mist, Cinematic Teal/Orange

### LIGHTING (조명)
Natural, Studio, Dramatic, Soft, Neon

### UI EFFECTS (선택적)
- glassmorphism: true → 반투명 글래스 카드 효과
- floatingBlobs: true → 배경에 플로팅 그라데이션 블롭

---

## 출력 규칙

1. 완전한 HTML 문서 (<!DOCTYPE html> 포함)
2. 인라인 CSS 사용 (외부 스타일시트 없이 독립 실행 가능)
3. 모든 텍스트 요소에 contenteditable="true" 속성 추가
4. 각 편집 가능 요소에 data-field-id="unique_id" 부여
5. @page 및 @media print 스타일 포함 (인쇄/PDF 변환 최적화)
6. 페이지 구분: <div class="page" data-page-number="1"> 형식
7. CSS 변수 사용: --primary-color, --secondary-color, --accent-color, --text-color, --bg-color, --font-family
8. Google Fonts CDN 링크 포함 (Pretendard, Inter, Noto Sans KR)
9. 이미지 placeholder: <div class="image-placeholder" data-ai-prompt="[이미지 설명]" style="aspect-ratio: 16/9; background: linear-gradient(...)"><span>AI Image Placeholder</span></div>
10. 반응형 디자인 (@media queries 포함)
11. 아이콘: 선택된 아이콘 스타일에 맞는 SVG 인라인 삽입

---

## 입력 데이터 형식 (JSON)

documentType: one_pager | brochure | pitch_deck | promo
pageCount: 페이지 수
slideCount: 슬라이드 수 (피치덱 전용)
content: { topic, executiveSummary, usps, specifications, cta, contactInfo }
style: { visualStyle, colorScheme, colorTone, contentTone, layoutDensity, imageStyle, iconStyle, lighting, includeCharts, glassmorphism, floatingBlobs, customPrompt }

---

**중요**: 반드시 완전한 HTML 코드만 출력하세요. 
설명, 마크다운 코드블록, 주석 없이 순수 HTML만 반환합니다.
첫 줄은 반드시 <!DOCTYPE html>로 시작해야 합니다.`,
        createdAt: timestamp,
        updatedAt: timestamp
    };

    try {
        // Upsert Agent Registry
        await db.collection('agentRegistry').doc(agentId).set(registryData, { merge: true });
        console.log("✅ Agent Registry updated:", agentId);

        // Add Version (check if exists first)
        const versionQuery = await db.collection('agentVersions')
            .where('agentId', '==', agentId)
            .where('version', '==', 'v1.0.0')
            .get();

        if (versionQuery.empty) {
            await db.collection('agentVersions').add(versionData);
            console.log("✅ Agent Version created: v1.0.0");
        } else {
            await db.collection('agentVersions').doc(versionQuery.docs[0].id).update(versionData);
            console.log("✅ Agent Version updated: v1.0.0");
        }

        alert("Document Designer 에이전트가 등록되었습니다!");
        return true;
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        alert("에이전트 등록 실패: " + err.message);
        return false;
    }
};
