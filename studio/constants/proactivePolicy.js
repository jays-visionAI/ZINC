/**
 * ZYNK Persona Engine - Proactive Policy (쿨다운/레이트리밋 기본값)
 * 
 * 선제 발화 정책을 정의합니다.
 * - Silent Mode: 모든 선제 발화 차단
 * - 트리거별 On/Off: 개별 트리거 활성화/비활성화
 * - 쿨다운: 동일 트리거의 재발화 간격
 * - 레이트 리밋: 일일/시간당 최대 발화 횟수
 */

import { TriggerType, TriggerMeta } from './triggerTypes.js';

/**
 * 전역 Proactive 정책 기본값
 */
export const ProactivePolicyDefaults = Object.freeze({
    // 전역 설정
    silentMode: false,                    // false = 선제 발화 허용
    globalCooldownMinutes: 5,             // 모든 트리거에 적용되는 최소 간격

    // 전역 레이트 리밋
    rateLimit: {
        maxPerHour: 5,                    // 시간당 최대 선제 발화 수
        maxPerDay: 15                     // 일일 최대 선제 발화 수
    },

    // 중복 방지 (Deduplication)
    deduplication: {
        enabled: true,
        windowMinutes: 60                 // 동일 내용 중복 체크 시간 범위
    }
});

/**
 * 트리거별 기본 활성화 상태
 * 신규 사용자의 초기 설정값
 */
export const DefaultTriggerSettings = Object.freeze({
    [TriggerType.TASK_RECOVERY]: {
        enabled: true,
        cooldownMinutes: TriggerMeta[TriggerType.TASK_RECOVERY].cooldownMinutes
    },
    [TriggerType.ASYNC_COMPLETION]: {
        enabled: true,
        cooldownMinutes: TriggerMeta[TriggerType.ASYNC_COMPLETION].cooldownMinutes
    },
    [TriggerType.STRATEGIC_INSIGHT]: {
        enabled: true,
        cooldownMinutes: TriggerMeta[TriggerType.STRATEGIC_INSIGHT].cooldownMinutes
    },
    [TriggerType.MARKET_SIGNAL]: {
        enabled: true,
        cooldownMinutes: TriggerMeta[TriggerType.MARKET_SIGNAL].cooldownMinutes
    },
    [TriggerType.USER_SCHEDULER]: {
        enabled: true,
        cooldownMinutes: TriggerMeta[TriggerType.USER_SCHEDULER].cooldownMinutes
    },
    [TriggerType.LIFECYCLE_CRM]: {
        enabled: true,
        cooldownMinutes: TriggerMeta[TriggerType.LIFECYCLE_CRM].cooldownMinutes
    },
    [TriggerType.ADMIN_BROADCAST]: {
        enabled: true, // 항상 활성화 권장 (운영자 공지)
        cooldownMinutes: TriggerMeta[TriggerType.ADMIN_BROADCAST].cooldownMinutes
    }
});

/**
 * 트리거 상태 enum
 */
export const TriggerStatus = Object.freeze({
    DETECTED: 'detected',       // Watchdog가 감지함
    APPROVED: 'approved',       // Orchestrator가 승인함
    SENT: 'sent',               // 사용자에게 발송됨
    SUPPRESSED: 'suppressed'    // 발송 차단됨
});

/**
 * 트리거 차단 사유 enum
 */
export const SuppressedReason = Object.freeze({
    SILENT_MODE: 'silent_mode',           // 전역 Silent Mode 활성화
    TRIGGER_DISABLED: 'trigger_disabled', // 해당 트리거 비활성화
    COOLDOWN: 'cooldown',                 // 쿨다운 미충족
    RATE_LIMIT: 'rate_limit',             // 레이트 리밋 초과
    DUPLICATE: 'duplicate',               // 중복 메시지
    USER_OPTED_OUT: 'user_opted_out'      // 사용자가 해당 유형 수신 거부
});

/**
 * Proactive Message 심각도 (Admin Broadcast용)
 */
export const BroadcastSeverity = Object.freeze({
    INFO: 'info',           // 일반 정보
    WARNING: 'warning',     // 주의 필요
    CRITICAL: 'critical'    // 긴급/중요
});

/**
 * Proactive Message 표시 방식
 */
export const MessageDisplayType = Object.freeze({
    CHAT: 'chat',           // 채팅 메시지로 표시
    BANNER: 'banner',       // 상단 배너로 표시
    BOTH: 'both'            // 채팅 + 배너 동시 표시
});

/**
 * 신규 사용자의 기본 proactive_settings 생성
 * Firestore users/{userId} 문서에 저장되는 형태
 */
export function createDefaultProactiveSettings() {
    const enabledTriggers = {};
    Object.entries(DefaultTriggerSettings).forEach(([triggerType, settings]) => {
        enabledTriggers[triggerType] = settings.enabled;
    });

    return {
        silent_mode: ProactivePolicyDefaults.silentMode,
        enabled_triggers: enabledTriggers,
        cooldown: {
            global_minutes: ProactivePolicyDefaults.globalCooldownMinutes,
            per_trigger_minutes: Object.fromEntries(
                Object.entries(DefaultTriggerSettings).map(([type, settings]) => [
                    type,
                    settings.cooldownMinutes
                ])
            )
        },
        rate_limit: {
            max_per_hour: ProactivePolicyDefaults.rateLimit.maxPerHour,
            max_per_day: ProactivePolicyDefaults.rateLimit.maxPerDay
        }
    };
}

/**
 * Orchestrator 승인 게이트 체크용 유틸리티
 * 
 * @param {Object} userSettings - 사용자의 proactive_settings
 * @param {string} triggerType - 체크할 트리거 타입
 * @param {Object} recentTriggers - 최근 발송된 트리거 정보
 * @returns {{ approved: boolean, reason?: string }}
 */
export function checkApprovalGate(userSettings, triggerType, recentTriggers = {}) {
    // 1. Silent Mode 체크
    if (userSettings.silent_mode) {
        return { approved: false, reason: SuppressedReason.SILENT_MODE };
    }

    // 2. 트리거 활성화 여부 체크
    if (!userSettings.enabled_triggers[triggerType]) {
        return { approved: false, reason: SuppressedReason.TRIGGER_DISABLED };
    }

    // 3. 쿨다운 체크
    const lastSent = recentTriggers[triggerType]?.lastSentAt;
    if (lastSent) {
        const cooldownMs = (userSettings.cooldown?.per_trigger_minutes?.[triggerType] ||
            ProactivePolicyDefaults.globalCooldownMinutes) * 60 * 1000;
        const elapsed = Date.now() - new Date(lastSent).getTime();
        if (elapsed < cooldownMs) {
            return { approved: false, reason: SuppressedReason.COOLDOWN };
        }
    }

    // 4. 레이트 리밋 체크
    const hourCount = recentTriggers._hourCount || 0;
    const dayCount = recentTriggers._dayCount || 0;
    const maxPerHour = userSettings.rate_limit?.max_per_hour ||
        ProactivePolicyDefaults.rateLimit.maxPerHour;
    const maxPerDay = userSettings.rate_limit?.max_per_day ||
        ProactivePolicyDefaults.rateLimit.maxPerDay;

    if (hourCount >= maxPerHour || dayCount >= maxPerDay) {
        return { approved: false, reason: SuppressedReason.RATE_LIMIT };
    }

    // 모든 체크 통과
    return { approved: true };
}

export default ProactivePolicyDefaults;
