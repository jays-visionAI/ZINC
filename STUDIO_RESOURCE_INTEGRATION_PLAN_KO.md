# 스튜디오 리소스 통합 및 시각화 계획서 (수정됨)

본 문서는 스튜디오 워크플로우에 핵심 데이터 리소스(프로젝트 컨텍스트, 브랜드 브레인, 지식 베이스, 이전 출력물)를 통합하고, 그 사용 현황을 **"Review Report" 모달 내 D3.js 시각화**를 통해 보여주는 구현 계획을 기술합니다.

## 1. 목표 (Objective)
관련성 높은 컨텍스트를 동적으로 주입하여 콘텐츠 품질을 높이고, 사용자가 "Review" 버튼을 통해 리소스 참조 현황(어떤 데이터가 사용되었는지)을 투명하게 확인할 수 있도록 합니다.

## 2. 4대 핵심 리소스 (The 4 Pillars)
1.  **프로젝트 컨텍스트 (Project Context)**: 프로젝트 기본 정보.
2.  **브랜드 브레인 (Brand Brain)**: 브랜드 페르소나 및 톤앤매너.
3.  **지식 베이스 (Knowledge Base)**: 사용자 업로드 문서 (Firestore/Knowledge Hub).
4.  **이전 단계 출력물 (Previous Step Output)**: 컨텍스트 체이닝 결과.

---

## 3. 백엔드 구현 전략 (`functions/index.js`)

### 3.1 데이터 조회 로직 (Data Fetching)
`executeSubAgent` 함수를 수정하여 LLM 호출 전 병렬로 데이터를 조회합니다.

-   **병렬 조회**: `Promise.all`로 프로젝트, 브랜드, 지식 데이터 동시 조회.
-   **지식 검색**: 현재 프로젝트에 연결된 활성 문서를 찾아 텍스트를 로드합니다.

### 3.2 프롬프트 엔지니어링 (컨텍스트 주입)
조회된 데이터를 구조화하여 시스템 프롬프트에 주입합니다.

```text
# SYSTEM CONTEXT ...
# PROJECT CONTEXT ...
# BRAND PROFILE ...
# KNOWLEDGE BASE ...
# WORKFLOW CONTEXT ...
```

### 3.3 응답 메타데이터 (Response Metadata)
생성 결과와 함께 **리소스 참조 메타데이터**를 반환합니다.

```javascript
metadata: {
    model: "gpt-4-turbo",
    resources: { ... },
    weights: { project: 20, brand: 30, knowledge: 40, history: 10 } // 기여도(가중치)
}
```

---

## 4. 프론트엔드 시각화 (`studio/studio.js`, `report-visualizer.js`)

### 4.1 "Review" 버튼 통합
-   **트리거**: 에이전트 실행이 완료되면 노드 위에 **"Review"** 버튼(아이콘)을 표시합니다.
-   **액션**: 버튼 클릭 시 **"Agent Report Modal"**이 열립니다.

### 4.2 리포트 시각화 (Modal + D3.js)
-   **참조 코드**: `knowledgeHub.js` (약 5480라인)의 D3.js 구현 방식을 따릅니다.
-   **시각화 로직 (모달 내부)**:
    -   **라이브러리**: D3.js (Force Layout 또는 Tree Layout 활용).
    -   **구조**:
        -   **중심 노드**: 생성된 결과물 (Agent Result).
        -   **주변 노드**: 4대 리소스 (위성처럼 배치).
    -   **애니메이션**:
        -   모달이 열리면 주변 리소스 노드들이 중심 노드로 빨려 들어가거나 연결되는 애니메이션 재생.
        -   연결 선의 굵기는 `metadata.weights`(기여도)에 비례.
    -   **인터랙션**: 리소스 노드에 마우스를 올리면 상세 정보(예: "참조 문서: 기획안_v2.pdf") 표시.

### 4.3 리포트 모달 UI 구성
-   **헤더**: 에이전트 이름, 성공 여부, 사용된 모델 명시.
-   **바디**: D3.js 시각화 캔버스.
-   **푸터**: 상세 참조 목록 (아코디언 형태).

---

## 5. 개발 단계 (Development Steps)

### Step 1: 백엔드 데이터 연동
1.  `functions/index.js` 수정: 데이터 조회 및 프롬프트 주입 로직 추가.
2.  메타데이터(가중치 포함) 반환 로직 구현.

### Step 2: 프론트엔드 UI ("Review" 버튼)
1.  `studio/dag-executor.js`: 메타데이터 저장 처리.
2.  `studio/studio.js`: 완료된 노드에 버튼 렌더링 로직 추가.
3.  HTML 모달 구조 생성.

### Step 3: D3.js 시각화 구현
1.  `studio/report-visualizer.js` 파일 생성.
2.  `knowledgeHub.js`의 D3 로직을 이식하여 리소스-결과 관계 그래프 구현.
3.  애니메이션 효과 적용.

## 6. 예상 소요 시간
-   백엔드: 2-3시간
-   프론트엔드 (D3 시각화 포함): 3-4시간
-   **총 예상 시간**: ~1일
