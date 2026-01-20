/**
 * ZYNK Persona Engine - Orchestrator Module Index
 * 
 * Orchestrator는 라우팅/정책판정/트리거 발화 승인/에이전트 호출을 담당
 */

// 승인 게이트 (핵심)
export {
    orchestratorApproveTrigger,
    evaluateProactivePolicy,
    enqueueApprovedTrigger,
    default as ApprovalGate
} from './approvalGate.js';

// 트리거 로깅 유틸리티
export {
    logTriggerEvent,
    getTriggerLogs
} from './triggerLogger.js';
