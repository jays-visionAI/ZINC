/**
 * ZYNK Persona Engine - Constants Index
 * 
 * Studio 챗봇에서 사용하는 표준 용어/상수/enum 모음
 * 
 * @note 이 모듈은 Studio 챗봇 레이어 전용입니다.
 *       Firebase User 컬렉션 관련 작업은 별도 스키마(Chunk 1)에서 처리합니다.
 */

// Agent 역할 정의
export {
    AgentRole,
    AgentRoleLabels,
    ExtendedAgentRole,
    default as DefaultAgentRole
} from './agentRoles.js';

// Proactive Trigger 타입 정의 (7종만 허용)
export {
    TriggerType,
    TriggerCategory,
    TriggerMeta,
    Phase1Triggers,
    Phase2Triggers,
    isValidTriggerType,
    default as DefaultTriggerType
} from './triggerTypes.js';

// Proactive 정책 (쿨다운/레이트 리밋)
export {
    ProactivePolicyDefaults,
    DefaultTriggerSettings,
    TriggerStatus,
    SuppressedReason,
    BroadcastSeverity,
    MessageDisplayType,
    createDefaultProactiveSettings,
    checkApprovalGate,
    default as DefaultProactivePolicy
} from './proactivePolicy.js';
