/**
 * ZYNK Persona Engine - Firestore Schema Definitions
 * 
 * MVP 필수 10종 컬렉션 스키마 정의
 * Studio 챗봇의 Proactive 기능을 위한 데이터 구조
 * 
 * @note Graph DB 미사용. 관계는 persona_profile.relations_graph(JSON)로 저장.
 */

import { TriggerType } from '../constants/triggerTypes.js';
import { TriggerStatus, SuppressedReason, BroadcastSeverity } from '../constants/proactivePolicy.js';
import { AgentRole } from '../constants/agentRoles.js';

/**
 * 1. users/{userId}
 * 사용자 기본 정보 + Proactive 설정
 */
export const UserSchema = {
    // 기본 정보
    created_at: 'timestamp',        // 가입일
    plan: 'string',                 // free | pro | enterprise
    locale: 'string',               // ko | en | ...
    timezone: 'string',             // Asia/Seoul | ...

    // Proactive 설정 (ZYNK 선제 발화 관련)
    proactive_settings: {
        silent_mode: 'boolean',     // true = 모든 선제 발화 차단
        enabled_triggers: {
            // TriggerType별 활성화 여부
            task_recovery: 'boolean',
            async_completion: 'boolean',
            strategic_insight: 'boolean',
            market_signal: 'boolean',
            user_scheduler: 'boolean',
            lifecycle_crm: 'boolean',
            admin_broadcast: 'boolean'
        },
        cooldown: {
            global_minutes: 'number',           // 전역 최소 간격
            per_trigger_minutes: {
                // TriggerType별 쿨다운
                task_recovery: 'number',
                async_completion: 'number',
                // ... 나머지 동일
            }
        },
        rate_limit: {
            max_per_hour: 'number',
            max_per_day: 'number'
        }
    }
};

/**
 * 2. users/{userId}/persona_profile/current_state
 * 사용자 페르소나 프로필 (학습된 선호도)
 */
export const PersonaProfileSchema = {
    // 정체성
    identity: {
        role: 'string',             // ceo | marketer | developer | ...
        industry: 'string',         // tech | finance | retail | ...
        company_size: 'string',     // startup | smb | enterprise
        experience_years: 'number'
    },

    // 선호도 (Profiler가 학습)
    preferences: {
        tone: 'string',             // formal | casual | friendly
        brevity_score: 'number',    // 1-10 (간결함 선호도)
        data_vs_story: 'number',    // 1-10 (데이터 vs 스토리 선호)
        critique_level: 'string',   // soft | balanced | direct
        vocabulary_overrides: {
            // 사용자가 선호/금지하는 단어
            preferred: ['array', 'string'],
            avoided: ['array', 'string']
        }
    },

    // 관계 그래프 (Graph DB 대신 JSON으로 저장)
    relations_graph: {
        // stakeholders, collaborators, clients 등
        nodes: ['array', 'object'],
        edges: ['array', 'object']
    },

    // 루틴 (정기적 행동 패턴)
    routines: {
        friday_report: 'boolean',
        weekly_summary_day: 'number',   // 0-6 (일-토)
        preferred_work_hours: {
            start: 'string',            // HH:mm
            end: 'string'
        }
    },

    // 정보 공백 (Inquisitor가 채울 슬롯)
    knowledge_gaps: ['array', 'string'],

    // 메타데이터
    updated_at: 'timestamp',
    version: 'number'
};

/**
 * 3. users/{userId}/memories/{memoryId}
 * 사용자 기억 (벡터 임베딩 포함)
 */
export const MemorySchema = {
    content: 'string',              // 원본 텍스트
    embedding: ['array', 'number'], // 벡터 임베딩 (1536차원 등)
    tags: ['array', 'string'],      // 분류 태그
    source_ref: 'string',           // 출처 (sessionId, draftId 등)
    source_type: 'string',          // session | draft | external
    importance: 'number',           // 1-10 중요도
    created_at: 'timestamp',
    expires_at: 'timestamp'         // null = 영구 보존
};

/**
 * 4. users/{userId}/sessions/{sessionId}
 * 채팅 세션
 */
export const SessionSchema = {
    status: 'string',               // active | closed
    started_at: 'timestamp',
    last_active_at: 'timestamp',
    closed_at: 'timestamp',

    // 세션 컨텍스트
    context: {
        project_id: 'string',       // 연관된 프로젝트
        intent: 'string',           // 초기 의도
        active_draft_id: 'string'   // 작업 중인 초안
    },

    // 통계
    stats: {
        message_count: 'number',
        token_usage: 'number',
        duration_seconds: 'number'
    }
};

/**
 * 5. users/{userId}/sessions/{sessionId}/messages/{messageId}
 * 세션 내 개별 메시지
 */
export const MessageSchema = {
    role: 'string',                 // user | assistant | system
    text: 'string',                 // 메시지 내용
    agent_id: 'string',             // orchestrator | inquisitor | manager | ...

    // 메타데이터
    metadata: {
        tokens: 'number',           // 토큰 사용량
        latency_ms: 'number',       // 응답 지연
        cost_usd: 'number',         // 비용
        citations: ['array', 'object'], // 출처/참조
        slot_fills: 'object'        // Inquisitor가 채운 슬롯
    },

    // Proactive 메시지인 경우
    proactive: {
        is_proactive: 'boolean',
        trigger_id: 'string',       // 연관된 trigger 문서 ID
        trigger_type: 'string'      // TriggerType
    },

    created_at: 'timestamp'
};

/**
 * 6. users/{userId}/drafts/{draftId}
 * 작업 초안 (Task Recovery 트리거용)
 */
export const DraftSchema = {
    type: 'string',                 // doc | slide | email | proposal | report
    title: 'string',
    content: 'string',              // 초안 내용 (JSON 또는 텍스트)

    status: 'string',               // saved | submitted | completed
    completed: 'boolean',           // 완료 여부 (Task Recovery 판단용)

    linked_session_id: 'string',    // 생성된 세션
    linked_job_id: 'string',        // 연관된 비동기 작업

    // 슬롯 상태 (Inquisitor용)
    slots: {
        task_type: 'string',
        audience: 'string',
        deadline: 'timestamp',
        channel: 'string',
        tone: 'string',
        success_metric: 'string'
    },
    slots_filled: 'boolean',

    created_at: 'timestamp',
    updated_at: 'timestamp'
};

/**
 * 7. users/{userId}/jobs/{jobId}
 * 비동기 작업 (Async Completion 트리거용)
 */
export const JobSchema = {
    type: 'string',                 // research | analysis | docgen | image_gen | ...
    status: 'string',               // queued | running | finished | failed

    // 요청 정보
    request: {
        prompt: 'string',
        parameters: 'object',
        source_session_id: 'string'
    },

    // 결과
    result_ref: 'string',           // 결과 저장 위치 (Storage URL 등)
    result_preview: 'string',       // 미리보기 텍스트
    error_message: 'string',        // 실패 시 오류 메시지

    // 진행률
    progress: 'number',             // 0-100

    // 타임스탬프
    created_at: 'timestamp',
    started_at: 'timestamp',
    finished_at: 'timestamp'
};

/**
 * 8. users/{userId}/triggers/{triggerId}
 * Proactive 트리거 기록 (핵심!)
 * 
 * Watchdog가 감지 → Orchestrator가 승인 → 발송/차단 결정
 */
export const TriggerSchema = {
    trigger_type: 'string',         // TriggerType enum (7종만 허용)

    // 트리거 페이로드 (유형별 상이)
    payload: {
        // TASK_RECOVERY: { draft_id, draft_title }
        // ASYNC_COMPLETION: { job_id, job_type, success }
        // STRATEGIC_INSIGHT: { matched_news_id, impact_score, keywords }
        // MARKET_SIGNAL: { monitor_id, change_type, old_value, new_value }
        // USER_SCHEDULER: { event_id, event_title, minutes_until }
        // LIFECYCLE_CRM: { milestone, days_since_signup }
        // ADMIN_BROADCAST: { broadcast_id, severity }
    },

    // 상태 흐름: detected → approved/suppressed → sent
    status: 'string',               // detected | approved | sent | suppressed
    suppressed_reason: 'string',    // SuppressedReason enum

    // 발송된 메시지 정보
    message: {
        title: 'string',
        body: 'string',
        cta: ['array', 'object']    // { label, action }
    },

    // 타임스탬프
    detected_at: 'timestamp',
    approved_at: 'timestamp',
    sent_at: 'timestamp',

    // 사용자 반응
    user_response: {
        clicked: 'boolean',
        dismissed: 'boolean',
        responded_at: 'timestamp'
    }
};

/**
 * 9. users/{userId}/monitors/{monitorId}
 * 감시 대상 설정 (Market Signal / Strategic Insight용)
 */
export const MonitorSchema = {
    kind: 'string',                 // competitor_dom | api_metric | news_keyword
    enabled: 'boolean',

    // 감시 대상
    target: {
        url: 'string',              // competitor_dom
        api_endpoint: 'string',     // api_metric
        keyword_set: ['array', 'string'], // news_keyword
        selector: 'string'          // DOM selector (competitor_dom)
    },

    // 임계값
    thresholds: {
        change_percent: 'number',   // 변화율 기준
        absolute_value: 'number'    // 절대값 기준
    },

    // 마지막 체크
    last_checked_at: 'timestamp',
    last_value: 'string',

    // 알림 설정
    notify_on_change: 'boolean',
    cooldown_minutes: 'number',

    created_at: 'timestamp',
    updated_at: 'timestamp'
};

/**
 * 10. admin/broadcasts/{broadcastId}
 * 운영자 공지 (Admin Broadcast 트리거용)
 */
export const BroadcastSchema = {
    // 대상
    scope: 'string',                // all | segment | userIds
    target_segment: 'string',       // scope=segment일 때 세그먼트 조건
    target_user_ids: ['array', 'string'], // scope=userIds일 때 사용자 목록

    // 메시지
    message_template: {
        title: 'string',
        body: 'string',
        cta: ['array', 'object']
    },

    // 중요도
    severity: 'string',             // info | warning | critical
    display_type: 'string',         // chat | banner | both

    // 스케줄
    schedule_at: 'timestamp',       // null = 즉시 발송
    expires_at: 'timestamp',        // 배너 만료 시간

    // 상태
    status: 'string',               // draft | scheduled | sent | cancelled

    // 감사 로그
    audit: {
        created_by: 'string',       // admin userId
        created_at: 'timestamp',
        sent_by: 'string',
        sent_at: 'timestamp',
        recipient_count: 'number'
    }
};

export default {
    UserSchema,
    PersonaProfileSchema,
    MemorySchema,
    SessionSchema,
    MessageSchema,
    DraftSchema,
    JobSchema,
    TriggerSchema,
    MonitorSchema,
    BroadcastSchema
};
