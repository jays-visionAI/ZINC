/**
 * ZYNK Persona Engine - Proactive Trigger Types (표준 명칭)
 * 
 * 선제 발화(Proactive)는 오직 이 7가지 트리거만 허용됩니다.
 * 그 외의 선제 발화는 절대 금지입니다.
 * 
 * @description 7가지 Proactive Trigger 카테고리
 * 
 * [A. Smart Context]
 * - TASK_RECOVERY: 미완료 작업 복구 제안
 * - ASYNC_COMPLETION: 비동기 작업 완료 알림
 * - STRATEGIC_INSIGHT: 전략적 인사이트 제안
 * 
 * [B. Monitoring & Schedule]
 * - MARKET_SIGNAL: 시장/경쟁사 변화 감지
 * - USER_SCHEDULER: 사용자 일정 기반 알림
 * 
 * [C. System & Lifecycle]
 * - LIFECYCLE_CRM: 온보딩/리텐션 CRM
 * - ADMIN_BROADCAST: 운영자 공지/점검/긴급
 */

export const TriggerType = Object.freeze({
    // A. Smart Context
    TASK_RECOVERY: 'task_recovery',
    ASYNC_COMPLETION: 'async_completion',
    STRATEGIC_INSIGHT: 'strategic_insight',

    // B. Monitoring & Schedule
    MARKET_SIGNAL: 'market_signal',
    USER_SCHEDULER: 'user_scheduler',

    // C. System & Lifecycle
    LIFECYCLE_CRM: 'lifecycle_crm',
    ADMIN_BROADCAST: 'admin_broadcast'
});

/**
 * Trigger 카테고리 분류
 */
export const TriggerCategory = Object.freeze({
    SMART_CONTEXT: 'smart_context',
    MONITORING_SCHEDULE: 'monitoring_schedule',
    SYSTEM_LIFECYCLE: 'system_lifecycle'
});

/**
 * 각 Trigger의 메타데이터 (UI 라벨, 카테고리, 설명, Phase 우선순위)
 */
export const TriggerMeta = Object.freeze({
    [TriggerType.TASK_RECOVERY]: {
        category: TriggerCategory.SMART_CONTEXT,
        phase: 1, // MVP Phase 1 우선 구현
        ko: '미완료 작업 복구',
        en: 'Task Recovery',
        description: 'Draft_Saved && Completed=false 상태로 세션 이탈 후 재접속 시',
        cooldownMinutes: 1440, // 동일 draft로 24시간 내 1회만
        maxPerDay: 3
    },
    [TriggerType.ASYNC_COMPLETION]: {
        category: TriggerCategory.SMART_CONTEXT,
        phase: 1, // MVP Phase 1 우선 구현
        ko: '비동기 작업 완료',
        en: 'Async Completion',
        description: 'Job_Queue 작업 Finished 전환 시',
        cooldownMinutes: 0, // 즉시 알림 (작업별 1회)
        maxPerDay: 10
    },
    [TriggerType.STRATEGIC_INSIGHT]: {
        category: TriggerCategory.SMART_CONTEXT,
        phase: 2, // Phase 2에서 구현
        ko: '전략적 인사이트',
        en: 'Strategic Insight',
        description: '뉴스/팩트와 프로젝트 키워드 매칭 + Impact High',
        cooldownMinutes: 240, // 4시간 쿨다운
        maxPerDay: 3
    },
    [TriggerType.MARKET_SIGNAL]: {
        category: TriggerCategory.MONITORING_SCHEDULE,
        phase: 2, // Phase 2에서 구현
        ko: '시장 시그널 감지',
        en: 'Market Signal Detector',
        description: '감시 대상의 DOM/API 수치 변동 감지',
        cooldownMinutes: 60, // 동일 URL/지표는 1시간 쿨다운
        maxPerDay: 5
    },
    [TriggerType.USER_SCHEDULER]: {
        category: TriggerCategory.MONITORING_SCHEDULE,
        phase: 1, // MVP Phase 1 우선 구현
        ko: '일정 알림',
        en: 'User Scheduler',
        description: '캘린더/투두 기반 시간 도래 (예: 10분 전)',
        cooldownMinutes: 30,
        maxPerDay: 10
    },
    [TriggerType.LIFECYCLE_CRM]: {
        category: TriggerCategory.SYSTEM_LIFECYCLE,
        phase: 1, // MVP Phase 1 우선 구현
        ko: '라이프사이클 CRM',
        en: 'Lifecycle CRM',
        description: 'D+1/D+7/D+30 등 온보딩/리텐션',
        cooldownMinutes: 1440, // 일 1회
        maxPerDay: 1
    },
    [TriggerType.ADMIN_BROADCAST]: {
        category: TriggerCategory.SYSTEM_LIFECYCLE,
        phase: 1, // MVP Phase 1 우선 구현
        ko: '운영자 공지',
        en: 'Admin Broadcast',
        description: '운영자 공지/점검/약관/긴급',
        cooldownMinutes: 0, // 긴급 시 제한 없음
        maxPerDay: null // 무제한 (운영자 재량)
    }
});

/**
 * Phase 1 MVP에서 우선 구현할 트리거 목록
 */
export const Phase1Triggers = Object.freeze([
    TriggerType.TASK_RECOVERY,
    TriggerType.ASYNC_COMPLETION,
    TriggerType.USER_SCHEDULER,
    TriggerType.LIFECYCLE_CRM,
    TriggerType.ADMIN_BROADCAST
]);

/**
 * Phase 2에서 구현할 트리거 목록
 */
export const Phase2Triggers = Object.freeze([
    TriggerType.STRATEGIC_INSIGHT,
    TriggerType.MARKET_SIGNAL
]);

/**
 * 유효한 TriggerType인지 검증
 * @param {string} type 
 * @returns {boolean}
 */
export function isValidTriggerType(type) {
    return Object.values(TriggerType).includes(type);
}

export default TriggerType;
