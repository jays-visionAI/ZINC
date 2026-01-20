/**
 * ZYNK Persona Engine - Agent Roles (표준 명칭)
 * 
 * 모든 코드/DB/UI에서 이 enum 값만 사용합니다.
 * 별칭(Router, Critic, Executor 등)은 문서에만 남기고 코드에서는 사용 금지.
 * 
 * @description
 * - ORCHESTRATOR: 라우팅/정책판정/트리거 발화 승인/에이전트 호출 (별칭: Router)
 * - INQUISITOR: Slot Filling(정보 공백 탐지) + 역질문 생성 (별칭: Critic Agent, 기획자 AI)
 * - MANAGER: 실제 산출물 생성(문서/요약/전략/콘텐츠) (별칭: Executor)
 * - PROFILER: 사용자 선호/관계/루틴 학습 및 persona_profile 업데이트(비동기)
 * - WATCHDOG: 외부/내부 이벤트 감지 → "트리거 후보 이벤트" 생성만 (발화 금지)
 */

export const AgentRole = Object.freeze({
    ORCHESTRATOR: 'orchestrator',
    INQUISITOR: 'inquisitor',
    MANAGER: 'manager',
    PROFILER: 'profiler',
    WATCHDOG: 'watchdog'
});

/**
 * Agent 역할별 설명 (UI 라벨 및 로깅용)
 */
export const AgentRoleLabels = Object.freeze({
    [AgentRole.ORCHESTRATOR]: {
        ko: '오케스트레이터',
        en: 'Orchestrator',
        description: '라우팅/정책판정/트리거 발화 승인/에이전트 호출'
    },
    [AgentRole.INQUISITOR]: {
        ko: '인퀴지터',
        en: 'Inquisitor',
        description: 'Slot Filling(정보 공백 탐지) + 역질문 생성'
    },
    [AgentRole.MANAGER]: {
        ko: '매니저',
        en: 'Manager',
        description: '실제 산출물 생성(문서/요약/전략/콘텐츠)'
    },
    [AgentRole.PROFILER]: {
        ko: '프로파일러',
        en: 'Profiler',
        description: '사용자 선호/관계/루틴 학습 및 프로필 업데이트'
    },
    [AgentRole.WATCHDOG]: {
        ko: '워치독',
        en: 'Watchdog',
        description: '외부/내부 이벤트 감지 (발화 금지, 트리거 후보 생성만)'
    }
});

/**
 * Phase 2+ 확장용 Agent (MVP에서는 훅만 심고 비활성)
 */
export const ExtendedAgentRole = Object.freeze({
    VERIFIER: 'verifier',       // 팩트/출처 대조
    TOOLSMITH: 'toolsmith',     // OAuth/재시도/포맷 변환
    SIMULATOR: 'simulator',     // 타겟 독자 페르소나로 사전 반려 루프
    GRAPH_WEAVER: 'graph_weaver' // 관계 추론 강화 (GraphRAG)
});

export default AgentRole;
