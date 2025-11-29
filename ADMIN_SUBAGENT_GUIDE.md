# Admin UI - SubAgent Management Quick Start

## 🎯 SubAgent 관리 페이지 사용 가이드

Phase 1.5 버전 관리 시스템과 연동된 Admin UI가 완성되었습니다.

---

## 🚀 Step 1: Admin 페이지 접속

1. **웹사이트 열기**
   ```
   http://localhost:8000/admin.html
   ```

2. **로그인** (Firebase Authentication)

3. **좌측 사이드바에서 "Sub-Agents" 클릭**

---

## 📋 Step 2: SubAgent 목록 확인

페이지가 열리면:

- ✅ 12개 SubAgent 타입 지원 (Planner, Research, Creator, Evaluator, Manager, KPI, SEO Watcher, Knowledge Curator 등)
- 버전별로 정렬 (같은 Type은 버전 내림차순)
- 필터링 가능:
  - Type (Planner, Creator, Manager 등)
  - Status (Active, Testing, Deprecated, Experimental)
  - 검색 (ID로 검색)

**예상 화면**:
```
Type        | Sub-Agent ID      | Version | Status  | Model      | Created    | Actions
------------|-------------------|---------|---------|------------|------------|----------
🎯 Planner  | planner_v1_1_0   | v1.1.0  | Active  | gpt-4      | Nov 25     | 📜✏️🔄🗑️
🎯 Planner  | planner_v1_0_0   | v1.0.0  | Deprecated | gpt-4   | Nov 25     | 📜✏️🔄🗑️
✍️ Creator  | creator_v1_0_0   | v1.0.0  | Active  | gpt-4      | Nov 25     | 📜✏️🔄🗑️
...
```

---

## 🧪 Step 3: 버전 관리 테스트

### Test A: Version History 보기

1. **Planner 행의 📜 버튼 클릭**
2. 모달이 열리며 모든 버전 표시:
   ```
   v1.1.0 - Active
   "Enhanced system prompt with detailed instructions"
   Created: Nov 25, 2025
   
   v1.0.0 - Deprecated
   "Initial version - Phase 1"
   Created: Nov 25, 2025
   ```

---

### Test B: 새 SubAgent 생성

1. **"Add New Sub-Agent" 버튼 클릭**

2. **폼 작성**:
   - Agent Type: `evaluator` 선택
   - Status: `testing` 선택
   - System Prompt: 
     ```
     You are an expert content evaluator.
     Analyze content quality, SEO compliance, and brand alignment.
     Provide detailed feedback and quality scores.
     ```
   - LLM Model: `gpt-4` 선택
   - Temperature: `0.3` (분석용이라 낮게)
   - Max Tokens: `2000`
   - Change Log: `Initial version for content evaluation`

3. **Save Sub-Agent 클릭**

4. **결과 확인**:
   - ✅ 테이블에 `evaluator_v1_0_0` 추가됨
   - Firebase Console 확인: `/projects/default_project/subAgents/evaluator_v1_0_0`

---

### Test C: SubAgent 버전 업데이트

1. **Creator 행의 ✏️ (Edit) 버튼 클릭**

2. **System Prompt 수정**:
   ```
   You are an expert content creator for social media.
   
   Your role:
   - Create engaging, platform-optimized content
   - Maintain brand voice and tone
   - Include relevant hashtags and CTAs
   - Optimize for maximum engagement
   
   Output format: Full post text with metadata
   ```

3. **Change Log 입력** (필수):
   ```
   Added CTA and hashtag guidelines
   ```

4. **Save Sub-Agent 클릭**

5. **결과 확인**:
   - ✅ `creator_v1_1_0` 생성됨
   - ✅ `creator_v1_0_0`은 `deprecated`로 변경
   - ✅ Version History에 기록됨

---

### Test D: 빠른 버전 업데이트

1. **Manager 행의 🔄 (Update Version) 버튼 클릭**

2. **Change description 입력**:
   ```
   Improved decision-making logic
   ```

3. **결과**:
   - ✅ `manager_v1_1_0` 즉시 생성 (기존 설정 복사)

---

### Test E: SubAgent Deprecate

1. **실험용 Agent 행의 🗑️ (Delete) 버튼 클릭**

2. **확인 팝업**: "Are you sure?"

3. **결과**:
   - Agent가 삭제되지 않고 `status: deprecated`로 변경됨
   - 테이블에서 필터로 숨김 가능

---

## 🔄 Step 4: AgentSet에 적용 (Coming Soon)

AgentSet 관리 페이지에서:
- Team 구성 보기
- SubAgent 교체 (자동 버전 증가)
- History 추적

---

## ✅ 성공 기준

- [x] Admin 페이지 접속 성공
- [x] SubAgent 목록 표시
- [x] 필터링 및 검색 작동
- [x] 새 SubAgent 생성
- [x] 버전 업데이트 (Edit 또는 Quick Update)
- [x] Version History 조회
- [x] Firebase에 데이터 저장 확인

---

## 🎨 UI 특징

### 테이블 컬럼

| 컬럼 | 설명 |
|------|------|
| Type | Agent 타입 아이콘 + 이름 |
| Sub-Agent ID | 고유 ID (코드 스타일) |
| Version | 버전 번호 (강조 표시) |
| Status | 상태 배지 (색상 구분) |
| Model Provider | 사용 중인 LLM |
| Created | 생성 날짜 |
| Actions | 4가지 액션 버튼 |

### 액션 버튼

- 📜 **Version History**: 모든 버전 조회
- ✏️ **Edit**: 수정 (새 버전 생성)
- 🔄 **Quick Update**: 빠른 버전 증가
- 🗑️ **Deprecate**: 상태 변경

### 필터

- **Type 필터**: 12가지 Agent 타입
- **Status 필터**: Active, Testing, Deprecated, Experimental
- **검색**: ID 또는 Type 이름

---

## 🐛 Troubleshooting

### 문제: "Permission denied"

**해결**:
```javascript
// Firebase Console → Firestore → Rules
// 이미 테스트 모드로 설정되어 있어야 함
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 문제: "Function not found"

**해결**: `version-management.js`가 로드되었는지 확인
- Admin.html 하단에 `<script src="scripts/version-management.js"></script>` 있는지 확인
- 브라우저 콘솔에서 `typeof updateSubAgentVersion` 입력 → `"function"` 반환되어야 함

### 문제: SubAgent가 표시되지 않음

**해결**: Phase 1 초기화 먼저 실행
- `test-version-management.html` 열기
- "Test 1" 버튼 클릭하여 SubAgent 생성 확인

---

## 🚀 다음 단계

1. **AgentSet 관리 페이지 개발** (`admin-agentsets.html`)
2. **Task 실행 UI** (Command Center 통합)
3. **KPI Dashboard** (성능 추적)

테스트를 시작하세요! 🎉
