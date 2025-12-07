# 📋 Generated Content Preview - 상세 설계서

> **Version**: 1.0.0  
> **Created**: 2024-12-07  
> **Author**: AI Agent System  

---

## 🎯 목표

Generated Content 패널을 **소셜 미디어 플랫폼별 미리보기**로 개선하여, 콘텐츠가 실제 게시될 때의 모습을 사전에 확인하고 승인/거부할 수 있도록 합니다.

---

## ⚠️ 개발 범위 정의

### 변경되는 영역
| 영역 | 작업 내용 |
|------|---------|
| **좌측 (Assigned Sub-Agents)** | 사이즈만 축소 (CSS만 변경) |
| **중앙 (Recent Runs)** | 사이즈만 축소 (CSS만 변경) |
| **우측 (Generated Content)** | ✅ **본격 개발** - 플랫폼별 미리보기 프레임 + 액션 패널 |

### 콘텐츠 유형별 미리보기 스타일
| 콘텐츠 유형 | 미리보기 스타일 | 비고 |
|------------|----------------|------|
| **X/Twitter 게시물** | X 스타일 프레임 | 🆕 새로 개발 |
| **Instagram 게시물** | Instagram 스타일 프레임 | 🆕 새로 개발 |
| **Facebook 게시물** | Facebook 스타일 프레임 | 🆕 새로 개발 |
| **LinkedIn 게시물** | LinkedIn 스타일 프레임 | 🆕 새로 개발 |
| **전략/기획 문서** | ✅ **기존 포맷 유지** | 변경 없음 |
| **시장조사 리포트** | ✅ **기존 포맷 유지** | 변경 없음 |
| **Meta/Internal 콘텐츠** | ✅ **기존 포맷 유지** | 변경 없음 |
| **기타 비-소셜 콘텐츠** | 블로그 스타일 프레임 | Fallback |

### 플랫폼 구분 로직
```javascript
function shouldUsePlatformPreview(content) {
    // 소셜 미디어 플랫폼만 새로운 프레임 적용
    const socialPlatforms = ['x', 'twitter', 'instagram', 'facebook', 'linkedin'];
    
    // Meta/Internal 콘텐츠는 기존 포맷
    if (content.is_meta || content.content_type === 'meta') {
        return false;
    }
    
    // 전략/기획/시장조사 등은 기존 포맷
    const nonSocialRoles = ['planner', 'research', 'evaluator', 'compliance'];
    if (nonSocialRoles.includes(content.sub_agent_role_type)) {
        return false;
    }
    
    return socialPlatforms.includes(content.platform?.toLowerCase());
}
```

---

## 📐 1. 레이아웃 구조 변경

### 1.1 현재 레이아웃
```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Assigned       │ │ Recent Runs    │ │ Generated      │
│ Sub-Agents     │ │                │ │ Content        │
│                │ │                │ │                │
│    (33.3%)     │ │    (33.3%)     │ │    (33.3%)     │
└────────────────┘ └────────────────┘ └────────────────┘
```

### 1.2 개선된 레이아웃
```
┌────────────┐ ┌────────────┐ ┌────────────────────────────────┐
│ Assigned   │ │ Recent     │ │ Generated Content              │
│ Sub-Agents │ │ Runs       │ │ (Platform Preview)             │
│            │ │            │ │                                │
│   (22%)    │ │   (22%)    │ │           (56%)                │
└────────────┘ └────────────┘ └────────────────────────────────┘
```

### 1.3 CSS 변경사항

```css
/* 기존 */
#agent-detail-panel {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
}

/* 개선 */
#agent-detail-panel {
    display: grid;
    grid-template-columns: 220px 220px 1fr;  /* 고정폭 + 유동폭 */
    gap: 16px;
    min-width: 800px;
}

/* 또는 비율 기반 */
#agent-detail-panel {
    display: grid;
    grid-template-columns: 22% 22% 56%;
    gap: 16px;
}
```

---

## 🎨 2. 플랫폼별 미리보기 프레임 디자인

### 2.1 X (Twitter) 스타일 프레임

```
┌─────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────┐  │
│ │  ┌──┐  Profile Name            · 2h                │  │
│ │  │🖼│  @username                                   │  │
│ │  └──┘                                              │  │
│ │                                                    │  │
│ │  🚀 Introducing Vision Chain X!                   │  │
│ │                                                    │  │
│ │  The revolutionary cross-chain payment solution   │  │
│ │  that seamlessly bridges blockchain ecosystems.   │  │
│ │                                                    │  │
│ │  ✨ Key Features:                                 │  │
│ │  • Instant cross-chain transfers                  │  │
│ │  • Zero slippage guaranteed                       │  │
│ │  • 100+ blockchains supported                     │  │
│ │                                                    │  │
│ │  #VisionChain #DeFi #Web3                         │  │
│ │                                                    │  │
│ │  ┌────────────────────────────────────────────┐   │  │
│ │  │                                            │   │  │
│ │  │         [Attached Image Preview]           │   │  │
│ │  │                                            │   │  │
│ │  └────────────────────────────────────────────┘   │  │
│ │                                                    │  │
│ │  💬 0    🔄 0    ❤️ 0    📊 0    📤              │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │  📋 Copy    │   📅 Schedule   │   ✓ Approve     │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Instagram 스타일 프레임

```
┌─────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────┐  │
│ │  ┌──┐  username                    · · ·          │  │
│ │  │🖼│  Location                                    │  │
│ │  └──┘                                              │  │
│ │  ┌────────────────────────────────────────────┐   │  │
│ │  │                                            │   │  │
│ │  │                                            │   │  │
│ │  │         [Square Image Preview]             │   │  │
│ │  │              (1:1 ratio)                   │   │  │
│ │  │                                            │   │  │
│ │  │                                            │   │  │
│ │  └────────────────────────────────────────────┘   │  │
│ │                                                    │  │
│ │  ❤️  💬  📤  🔖                                  │  │
│ │                                                    │  │
│ │  123 likes                                         │  │
│ │  username 🚀 Discover the future of payments...   │  │
│ │  more                                              │  │
│ │                                                    │  │
│ │  View all 5 comments                               │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  📋 Copy    │   📅 Schedule   │   ✓ Approve     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Facebook 스타일 프레임

```
┌─────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────┐  │
│ │  ┌──┐  Page Name                                  │  │
│ │  │🖼│  2h · 🌐                                    │  │
│ │  └──┘                                              │  │
│ │                                                    │  │
│ │  🚀 Exciting news! We're launching Vision Chain X │  │
│ │  - the revolutionary cross-chain payment          │  │
│ │  solution that's changing the game!               │  │
│ │                                                    │  │
│ │  ┌────────────────────────────────────────────┐   │  │
│ │  │                                            │   │  │
│ │  │      [Image Preview - Landscape]           │   │  │
│ │  │                                            │   │  │
│ │  └────────────────────────────────────────────┘   │  │
│ │                                                    │  │
│ │  👍 12   💬 3 Comments   ↗️ 5 Shares              │  │
│ │  ─────────────────────────────────────────────    │  │
│ │  👍 Like    💬 Comment    ↗️ Share                │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  📋 Copy    │   📅 Schedule   │   ✓ Approve     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.4 블로그/기본 스타일 프레임 (Fallback)

```
┌─────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────┐  │
│ │  📝 Blog Post Preview                     PENDING  │  │
│ ├────────────────────────────────────────────────────┤  │
│ │                                                    │  │
│ │  ┌────────────────────────────────────────────┐   │  │
│ │  │                                            │   │  │
│ │  │         [Featured Image]                   │   │  │
│ │  │                                            │   │  │
│ │  └────────────────────────────────────────────┘   │  │
│ │                                                    │  │
│ │  # Vision Chain X: The Future of Payments         │  │
│ │                                                    │  │
│ │  In the rapidly evolving blockchain landscape,    │  │
│ │  cross-chain interoperability remains one of the  │  │
│ │  biggest challenges. Today, we're excited to      │  │
│ │  introduce Vision Chain X...                      │  │
│ │                                                    │  │
│ │  ## Key Features                                   │  │
│ │  - Instant cross-chain transfers                  │  │
│ │  - Zero slippage guaranteed                       │  │
│ │                                                    │  │
│ │  _Read more..._                                   │  │
│ │                                                    │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  📋 Copy    │   📅 Schedule   │   ✓ Approve     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ 3. 데이터베이스 스키마 개선

### 3.1 generatedContents 컬렉션 확장

```javascript
// projects/{projectId}/generatedContents/{contentId}
{
    // 기존 필드
    id: string,
    run_id: string,
    team_instance_id: string,
    sub_agent_id: string,
    created_at: timestamp,
    status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'published',
    
    // 📌 추가 필드
    
    // 타겟 플랫폼 정보
    platform: 'x' | 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'other',
    channel_id: string,  // 연결된 채널 ID
    
    // 콘텐츠 상세
    content: {
        text: string,                    // 본문 텍스트
        formatted_text: string,          // 마크다운/HTML 형식
        hashtags: string[],              // 해시태그 배열
        mentions: string[],              // 멘션 배열
        media: [
            {
                type: 'image' | 'video' | 'carousel',
                url: string,
                thumbnail_url: string,
                alt_text: string,
                dimensions: { width: number, height: number }
            }
        ],
        link_preview: {
            url: string,
            title: string,
            description: string,
            image_url: string
        }
    },
    
    // 플랫폼별 메타데이터
    platform_specific: {
        // X (Twitter) 전용
        x: {
            char_count: number,
            is_thread: boolean,
            thread_count: number
        },
        // Instagram 전용
        instagram: {
            aspect_ratio: string,  // '1:1', '4:5', '16:9'
            carousel_count: number,
            location_tag: string
        },
        // Facebook 전용
        facebook: {
            post_type: 'status' | 'photo' | 'video' | 'link',
            audience: 'public' | 'friends' | 'private'
        }
    },
    
    // 프로필 정보 (미리보기용)
    author_profile: {
        display_name: string,
        username: string,
        avatar_url: string,
        verified: boolean
    },
    
    // 스케줄링 정보
    scheduled_at: timestamp | null,
    published_at: timestamp | null,
    
    // 승인 정보
    approved_by: string | null,
    approved_at: timestamp | null,
    rejection_reason: string | null
}
```

### 3.2 채널 프로필 조회 로직

```javascript
// Channel Connection에서 프로필 정보 가져오기
async function getChannelProfile(channelId) {
    const channelDoc = await db.collection('channels').doc(channelId).get();
    const channel = channelDoc.data();
    
    return {
        display_name: channel.profile_name || channel.name,
        username: channel.username || channel.handle,
        avatar_url: channel.avatar_url || channel.profile_image,
        platform: channel.platform,
        verified: channel.verified || false
    };
}
```

---

## 🔧 4. 컴포넌트 구조

### 4.1 파일 구조

```
ZINC/
├── components/
│   └── content-preview/
│       ├── content-preview.js           # 메인 미리보기 컴포넌트
│       ├── content-preview.css          # 스타일
│       ├── platforms/
│       │   ├── x-preview.js             # X (Twitter) 프레임
│       │   ├── instagram-preview.js     # Instagram 프레임
│       │   ├── facebook-preview.js      # Facebook 프레임
│       │   ├── linkedin-preview.js      # LinkedIn 프레임
│       │   └── blog-preview.js          # 블로그/기본 프레임
│       └── actions/
│           └── content-actions.js       # Copy/Schedule/Approve 패널
```

### 4.2 컴포넌트 인터페이스

```javascript
// content-preview.js

/**
 * 플랫폼별 미리보기 렌더링
 * @param {Object} content - generatedContents 문서 데이터
 * @returns {string} HTML 문자열
 */
function renderContentPreview(content) {
    const platform = content.platform || detectPlatform(content.channel_id);
    
    switch (platform) {
        case 'x':
            return renderXPreview(content);
        case 'instagram':
            return renderInstagramPreview(content);
        case 'facebook':
            return renderFacebookPreview(content);
        case 'linkedin':
            return renderLinkedInPreview(content);
        default:
            return renderBlogPreview(content);
    }
}

/**
 * 관리 패널 렌더링
 */
function renderActionPanel(content) {
    return `
        <div class="content-action-panel">
            <button class="action-btn action-copy" onclick="copyContent('${content.id}')">
                📋 Copy
            </button>
            <button class="action-btn action-schedule" onclick="scheduleContent('${content.id}')">
                📅 Schedule
            </button>
            <button class="action-btn action-approve ${content.status === 'approved' ? 'approved' : ''}" 
                    onclick="approveContent('${content.id}')">
                ✓ Approve
            </button>
        </div>
    `;
}
```

---

## 🎨 5. CSS 스타일 가이드

### 5.1 공통 프레임 스타일

```css
/* 콘텐츠 카드 컨테이너 */
.content-preview-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 16px;
}

/* 플랫폼 프레임 */
.platform-frame {
    padding: 16px;
    background: #15202b;  /* X Dark Theme */
    border-radius: 8px;
}

.platform-frame.instagram {
    background: linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D);
    padding: 2px;
}

.platform-frame.instagram .frame-inner {
    background: #000;
    border-radius: 6px;
}

.platform-frame.facebook {
    background: #18191a;
}

/* 관리 패널 */
.content-action-panel {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.3);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.action-btn {
    flex: 1;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.action-copy {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #fff;
}

.action-schedule {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
}

.action-approve {
    background: rgba(22, 224, 189, 0.15);
    border: 1px solid rgba(22, 224, 189, 0.3);
    color: #16e0bd;
}

.action-approve.approved {
    background: #16e0bd;
    color: #000;
}
```

### 5.2 X (Twitter) 스타일

```css
.x-preview {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #e7e9ea;
}

.x-preview .author {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
}

.x-preview .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
}

.x-preview .name {
    font-weight: 700;
    font-size: 15px;
}

.x-preview .username {
    color: #71767b;
    font-size: 15px;
}

.x-preview .post-text {
    font-size: 15px;
    line-height: 1.4;
    white-space: pre-wrap;
    margin-bottom: 12px;
}

.x-preview .post-image {
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 12px;
}

.x-preview .post-image img {
    width: 100%;
    display: block;
}

.x-preview .interactions {
    display: flex;
    justify-content: space-between;
    color: #71767b;
    font-size: 13px;
    padding-top: 12px;
}
```

---

## 📊 6. 상태 관리 로직

### 6.1 콘텐츠 상태 플로우

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌───────────┐
│ PENDING  │ ──► │ APPROVED │ ──► │ SCHEDULED │ ──► │ PUBLISHED │
└──────────┘     └──────────┘     └───────────┘     └───────────┘
      │                                  │
      │          ┌──────────┐            │
      └────────► │ REJECTED │ ◄──────────┘
                 └──────────┘
```

### 6.2 액션 핸들러

```javascript
// Copy 기능
async function copyContent(contentId) {
    const content = await getContentById(contentId);
    const textToCopy = formatContentForCopy(content);
    
    await navigator.clipboard.writeText(textToCopy);
    showToast('Content copied to clipboard!');
}

// Schedule 기능
async function scheduleContent(contentId) {
    // 스케줄 모달 열기
    openScheduleModal(contentId, async (scheduledTime) => {
        await db.collection('projects').doc(projectId)
            .collection('generatedContents').doc(contentId)
            .update({
                status: 'scheduled',
                scheduled_at: scheduledTime
            });
        
        showToast('Content scheduled!');
    });
}

// Approve 기능
async function approveContent(contentId) {
    const user = firebase.auth().currentUser;
    
    await db.collection('projects').doc(projectId)
        .collection('generatedContents').doc(contentId)
        .update({
            status: 'approved',
            approved_by: user.uid,
            approved_at: firebase.firestore.FieldValue.serverTimestamp()
        });
    
    showToast('Content approved!');
    
    // UI 업데이트
    const approveBtn = document.querySelector(`#content-${contentId} .action-approve`);
    if (approveBtn) {
        approveBtn.classList.add('approved');
        approveBtn.innerHTML = '✓ Approved';
    }
}
```

---

## 📅 7. 개발 작업 계획

### Phase 1: 레이아웃 변경 (30분)
| 작업 | 파일 | 설명 |
|------|------|------|
| 그리드 비율 조정 | `admin-detail.css` | 22% / 22% / 56% 비율 적용 |
| 반응형 대응 | `admin-detail.css` | 최소 폭 설정, 모바일 스택 |

### Phase 2: 플랫폼별 프레임 구현 (2시간)
| 작업 | 파일 | 설명 |
|------|------|------|
| X 프레임 | `x-preview.js` | Twitter 스타일 미리보기 |
| Instagram 프레임 | `instagram-preview.js` | Instagram 스타일 미리보기 |
| Facebook 프레임 | `facebook-preview.js` | Facebook 스타일 미리보기 |
| 블로그 프레임 | `blog-preview.js` | 기본 HTML 미리보기 |

### Phase 3: 액션 패널 구현 (1시간)
| 작업 | 파일 | 설명 |
|------|------|------|
| Copy 기능 | `content-actions.js` | 클립보드 복사 |
| Schedule 기능 | `content-actions.js` | 스케줄 모달 + Firestore |
| Approve 기능 | `content-actions.js` | 승인 처리 + UI 업데이트 |

### Phase 4: 데이터 마이그레이션 (30분)
| 작업 | 파일 | 설명 |
|------|------|------|
| 스키마 확장 | - | 새 필드 추가된 문서 생성 |
| 기존 데이터 보완 | - | platform, author_profile 등 |

---

## ✅ 체크리스트

- [ ] **Phase 1**: 레이아웃 변경
  - [ ] 그리드 비율 22% / 22% / 56% 적용
  - [ ] 최소 폭 800px 설정
  - [ ] 모바일 반응형 (768px 이하 스택)

- [ ] **Phase 2**: 플랫폼별 프레임
  - [ ] X (Twitter) 다크 테마 프레임
  - [ ] Instagram 스타일 프레임
  - [ ] Facebook 스타일 프레임
  - [ ] 블로그/기본 마크다운 프레임
  - [ ] 플랫폼 자동 감지 로직

- [ ] **Phase 3**: 액션 패널
  - [ ] Copy 버튼 (텍스트 + 해시태그)
  - [ ] Schedule 모달
  - [ ] Approve 버튼 + 상태 업데이트

- [ ] **Phase 4**: 데이터
  - [ ] Firestore 스키마 확장
  - [ ] 채널 프로필 연동
  - [ ] 기존 데이터 마이그레이션

---

## 📎 참고 자료

- X (Twitter) Design System: https://developer.twitter.com/en/docs/twitter-for-websites
- Instagram Brand Guidelines
- Facebook Design Resources
- 기존 `renderContents()` 함수 in `mission-control-view-history.js`
