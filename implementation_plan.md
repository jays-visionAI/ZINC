# ZYNK Development Roadmap: Specialized Agents & Creative Engine

## Overview
This document outlines the ZYNK creative content generation architecture, including the "Layered-Gen" approach for business templates and the specialized agentic workflow system.

---

## 🎯 Core Architecture: Layered-Gen (텍스트/이미지 분리 생성)

### The Problem with Traditional AI Image Generation
- AI가 이미지 안에 텍스트를 렌더링하면 품질이 불안정함
- 결과물 수정이 불가능 (이미지 재생성 필요)
- 검색 엔진이 이미지 내 텍스트를 인식하지 못함

### ZYNK's Solution: Layered-Gen Architecture
```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: AI Image Generation (Imagen 3.0)                   │
│  → "글자 없는" 순수 배경 이미지만 생성                          │
│  → 예: 제품 사진, 추상적 그라데이션, 풍경 등                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Web Rendering Engine (HTML + CSS)                  │
│  → LLM이 Knowledge Hub 컨텍스트 기반으로 텍스트 콘텐츠 생성     │
│  → CSS로 배경 이미지 위에 텍스트를 완벽하게 배치                 │
│  → 폰트, 색상, 크기 100% 제어 가능                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Export                                             │
│  → PDF, Slides, Image 등 다양한 포맷으로 내보내기              │
└─────────────────────────────────────────────────────────────┘
```

### Benefits
| 항목 | 기존 방식 (텍스트 in 이미지) | ZYNK Layered-Gen |
|------|---------------------------|------------------|
| **품질** | 오타 발생, 폰트 왜곡 | 0% 오류, 완벽한 폰트 |
| **수정** | 이미지 재생성 필요 | 0.1초 만에 텍스트 수정 |
| **SEO** | 검색 불가 | 실제 HTML, 검색엔진 인식 |
| **다국어** | 재생성 필요 | CSS만 변경하면 완료 |

---

## 📋 Business Templates (Promo → Templates 리브랜딩)

### Supported Template Types
| 템플릿 | 용도 | 배경 이미지 스타일 |
|--------|------|-------------------|
| **이벤트 포스터** | 행사 홍보 | 테마에 맞는 추상/사진 배경 |
| **초청장 (Invitation)** | 공식 초대 | 우아한 장식 배경 |
| **소셜 미디어 배너** | SNS 홍보 | 브랜드 톤 배경 |
| **명함/카드** | 연락처 공유 | 미니멀 배경 |
| **제품 공지** | 신제품 발표 | 제품 관련 배경 |
| **뉴스레터 헤더** | 이메일 헤더 | 계절/테마 배경 |

### Template Generation Flow
1. **사용자 입력**: 템플릿 타입 선택 + 프로모션 대상 + 캠페인 메시지
2. **LLM (GPT-4o)**: 컨텍스트 분석 → 텍스트 콘텐츠 생성 → HTML 레이아웃 구성
3. **Imagen 3.0**: 템플릿에 맞는 배경 이미지 1장 생성
4. **결합**: CSS `background-image`로 배경 배치, 텍스트 오버레이
5. **내보내기**: PDF(HQ), Slides, 직접 다운로드

---

## Phase 1: Foundation - Correct Models & Branding

### 1.1 Image Generation Engine
*   **Primary Model:** `imagen-3.0-generate-001` (Vertex AI)
*   **Upgrade Path:** `imagen-4.0-generate-001` (향후 텍스트 렌더링 필요 시)
*   **Usage:** 배경 이미지 전용, 텍스트 렌더링 시도하지 않음

### 1.2 ZYNK Watermark System
*   **Method:** CSS Overlay (Lightweight & High Quality)
*   **Logic:** Fixed position `div` with high z-index
*   **Benefit:** Visible on screen & PDF exports

### 1.3 Storage Architecture
*   **Image Upload:** Firebase Storage with Signed URLs
*   **Bucket Policy:** Uniform Bucket-Level Access (makePublic 불가)
*   **Solution:** `getSignedUrl()` with long expiration

---

## Phase 2: Specialized Agents

### 2.1 Agent Segregation
| Agent | 파일 | 역할 |
|-------|------|------|
| Universal Creator | `universal_creator.js` | 범용 문서 생성 |
| Pitch Deck Agent | `pitchDeckAgent.js` | 투자 발표자료 특화 |
| Template Agent | (신규) | Layered-Gen 비즈니스 템플릿 |

### 2.2 Press Release Optimization
- **Persona:** "Pure News Wire Editor" (디자인 요소 배제)
- **Layout:** 단일 컬럼, 흑백, Serif 폰트
- **Flow:** 헤드라인 → 날짜 → 본문 → 보일러플레이트

---

## Phase 3: Observability & Workflow

### 3.1 DAG Integration
- "Create Pitch Deck" → `DAGExecutor` 연동
- "Publication" 단계 정의

### 3.2 Visual Monitoring
- Admin Dashboard에서 생성 진행 상황 실시간 표시
- 단계별 로그: Planning → Drawing → Coding

---

## Technical Notes

### Firestore Snapshot Listener (Creative Projects)
```javascript
// 상태 변경 감지를 위한 변수 관리
let prevCurrentStatus = null;  // 이전 상태 저장
const oldProjects = [...creativeProjects];  // 스냅샷 비교용
```

### Storage Upload (Uniform Bucket-Level Access)
```javascript
// makePublic() 대신 Signed URL 사용
const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '01-01-2030'
});
```

---

## Changelog
- **2026-01-01**: Layered-Gen 아키텍처 문서화, Promo Images → Templates 리브랜딩 계획
- **2026-01-01**: Storage Signed URL 전환, 실시간 상태 감지 버그 수정
- **2025-12**: 초기 로드맵 작성
