# ZYNK Firestore Database Schema Documentation

**Version**: 1.1 (Complete)  
**Last Updated**: 2025-11-29  
**Status**: Production Ready - All Mission Control Layers Implemented

---

## Overview

This document provides a complete structural overview of the ZYNK Firestore database schema. It focuses on **collections, fields, types, and relationships** without business logic details.

---

## Top-Level Collections

The following are the main collections in the Firestore database:

1. **`projects`** - Client projects/workspaces
2. **`users`** - User accounts and profiles
3. **`industries`** - Industry categories for projects
4. **`agents`** - Legacy agent definitions (deprecated)
5. **`subAgentTemplates`** - Sub-agent template definitions
6. **`agentSetTemplates`** - Agent team template definitions
7. **`projectAgentTeamInstances`** - Deployed agent team instances
8. **`channelProfiles`** - Social media channel configurations
9. **`subAgentChannelAdapters`** - Channel-specific sub-agent overrides

### Subcollections

- **`projects/{projectId}/runtimeProfiles`** - LLM runtime configurations per project
- **`projects/{projectId}/subAgents`** - Sub-agent instances (deprecated structure)
- **`projects/{projectId}/agents`** - Legacy agent instances
- **`projects/{projectId}/agentRuns`** - Agent execution history (v1.1)
- **`projects/{projectId}/generatedContents`** - Generated outputs (v1.1)
- **`projectAgentTeamInstances/{teamId}/subAgents`** - Sub-agent instances per team (v1.1)

---

## Collection Schemas

### Collection: `projects`

**Purpose**: Stores client project/workspace information.

#### TypeScript Interface

```typescript
interface Project {
  id: string;                    // Auto-generated or custom ID
  name: string;                  // Project name
  description?: string;          // Project description
  industry?: string;             // Industry category ID
  status: 'active' | 'archived' | 'draft';
  createdAt: Timestamp;          // Firestore Timestamp
  updatedAt: Timestamp;
  createdBy: string;             // User ID
  members?: string[];            // Array of user IDs with access
  admins?: string[];             // Array of admin user IDs
}
```

#### Example Document

```json
{
  "id": "proj_abc123",
  "name": "Acme Corp Marketing",
  "description": "Social media marketing campaign",
  "industry": "technology",
  "status": "active",
  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2025-11-28T15:30:00Z",
  "createdBy": "user_xyz789",
  "members": ["user_xyz789", "user_def456"],
  "admins": ["user_xyz789"]
}
```

#### Relationships
- Referenced by: `projectAgentTeamInstances.projectId`
- Contains subcollections: `runtimeProfiles`, `subAgents` (legacy)

---

### Collection: `subAgentTemplates`

**Purpose**: Defines reusable sub-agent templates with system prompts and configurations.

#### TypeScript Interface

```typescript
interface SubAgentTemplate {
  id: string;                    // Template ID (e.g., "tpl_planner_v1_0_0")
  type: string;                  // Engine type: 'planner' | 'creator_text' | 'creator_image' | 'engagement' | etc.
  version: string;               // Semantic version (e.g., "1.0.0")
  status: 'active' | 'draft' | 'deprecated';
  system_prompt: string;         // System prompt template
  runtime_profile_id?: string;   // Link to runtime profile
  
  // Model Configuration
  model_provider: {
    llmText: {
      provider: string;          // 'openai' | 'anthropic' | etc.
      model: string;             // Model ID (e.g., "gpt-4")
      enabled: boolean;
    };
    llmImage?: {
      enabled: boolean;
    };
    embeddings?: {
  
  // Runtime Configuration
  // v2.0 Fields (3-Axis Model)
  role_type: string;             // e.g., 'writer_short', 'planner'
  primary_language: string;      // e.g., 'ko', 'en'
  preferred_tier?: 'economy' | 'balanced' | 'premium';
  runtime_profile_id?: string;   // Link to runtime profile (e.g., "rtp_writer_short_ko_bal_v1")

  // Existing Fields
  config: {
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  model_provider?: {             // Override provider settings (optional)
    provider: string;
    model: string;
  };
  
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string;
}
```

#### Example Document

```json
{
  "id": "tpl_planner_v1_0_0",
  "type": "planner",
  "version": "1.0.0",
  "status": "active",
  "system_prompt": "You are a strategic content planner. Analyze trends and create content calendars.",
  "runtime_profile_id": "rtp_chat_premium_v1",
  "model_provider": {
    "llmText": {
      "provider": "openai",
      "model": "gpt-4",
      "enabled": true
    },
    "llmImage": {
      "enabled": false
    },
    "embeddings": {
      "provider": "openai",
      "model": "text-embedding-ada-002"
    }
  },
  "config": {
    "temperature": 0.7,
    "maxTokens": 2000
  },
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-28T15:30:00Z",
  "created_by": "system"
}
```

#### Relationships
- Referenced by: `agentSetTemplates.roles[].defaultTemplateId`
- Has related: `subAgentChannelAdapters` (via `subAgentTemplateId`)

---

### Collection: `subAgentChannelAdapters`

**Purpose**: Channel-specific overrides for sub-agent templates (e.g., Instagram-specific prompts).

#### TypeScript Interface

```typescript
interface SubAgentChannelAdapter {
  id: string;                    // Auto-generated
  subAgentTemplateId: string;    // Link to SubAgentTemplate
  channelId: string;             // Channel identifier ('instagram', 'x', 'youtube', etc.)
  promptOverrides: string;       // Channel-specific prompt additions/overrides
  enabled: boolean;              // Whether this adapter is active
  updatedAt: Timestamp;
}
```

#### Example Document

```json
{
  "id": "adapter_abc123",
  "subAgentTemplateId": "tpl_creator_text_v1_0_0",
  "channelId": "instagram",
  "promptOverrides": "Focus on visual storytelling. Keep captions under 2200 characters. Use 5-10 relevant hashtags.",
  "enabled": true,
  "updatedAt": "2025-11-28T15:30:00Z"
}
```

#### Relationships
- Links to: `subAgentTemplates` via `subAgentTemplateId`

---

### Collection: `agentSetTemplates`

**Purpose**: Defines agent team templates (collections of roles).

#### TypeScript Interface

```typescript
interface AgentSetTemplate {
  id: string;                    // Template ID (e.g., "agst_17642383884805")
  name: string;                  // Template name
  description?: string;          // Template description
  version: string;               // Semantic version
  status: 'active' | 'draft' | 'deprecated';
  channel_type: 'multi-channel' | 'instagram' | 'x' | 'youtube' | string;
  
  // Roles Definition
  roles: Array<{
    name: string;                // Role name (e.g., "Strategist")
    type: string;                // Engine type: 'planner' | 'creator_text' | etc.
    defaultTemplateId?: string;  // Link to SubAgentTemplate
    behaviourPackId?: string;    // Phase 1: Link to Behaviour Pack (future)
  }>;
  
  // Metadata
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string;
}
```

#### Example Document

```json
{
  "id": "agst_17642383884805",
  "name": "Instagram Content Team",
  "description": "Full-stack Instagram content creation team",
  "version": "1.0.0",
  "status": "active",
  "channel_type": "instagram",
  "roles": [
    {
      "name": "Strategist",
      "type": "planner",
      "defaultTemplateId": "tpl_planner_v1_0_0",
      "behaviourPackId": null
    },
    {
      "name": "Content Creator",
      "type": "creator_text",
      "defaultTemplateId": "tpl_creator_text_v1_0_0",
      "behaviourPackId": null
    },
    {
      "name": "Visual Designer",
      "type": "creator_image",
      "defaultTemplateId": "tpl_creator_image_v1_0_0",
      "behaviourPackId": null
    }
  ],
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-28T15:30:00Z",
  "created_by": "user_xyz789"
}
```

#### Relationships
- Referenced by: `projectAgentTeamInstances.templateId`
- References: `subAgentTemplates` via `roles[].defaultTemplateId`

---

### Collection: `projectAgentTeamInstances`

**Purpose**: Deployed instances of agent teams for specific projects and channels. This collection powers the Mission Control "Agent Swarm" UI cards.

#### TypeScript Interface

```typescript
export type AgentTeamStatus = 'active' | 'inactive' | 'paused' | 'error';

interface ProjectAgentTeamInstance {
  // --- Identity & Relations ---
  id: string;                    // Instance ID (e.g., "team_1732345678901")
  projectId: string;             // Link to Project
  channelId: string;             // Link to ChannelProfile
  templateId: string;            // Link to AgentSetTemplate
  name: string;                  // Instance name (e.g., "Instagram Official Team")
  status: AgentTeamStatus;       // Team status
  
  // --- Deployment Info ---
  deployedAt: Timestamp;         // When this team was deployed
  deployedBy: string;            // User ID who deployed
  
  // --- Phase 0/1 Metadata (PRD 5.0) ---
  configProfileId?: string;      // Configuration profile ID
  engineVersionSet?: string;     // Engine version set
  channel?: string;              // Deployment channel ('stable' | 'beta')
  ruleProfileId?: string | null; // Phase 1: RULE Profile ID
  
  // --- Platform Info (for UI rendering) ---
  platform?: 'x' | 'linkedin' | 'instagram' | 'tiktok' | 'youtube';
  
  // --- Mission Control: Active Directive ---
  // Displayed in the "ACTIVE DIRECTIVE" section of the agent card
  active_directive?: {
    title: string;               // e.g., "ACTIVE DIRECTIVE"
    summary: string;             // e.g., "Autonomous mode active. Scanning ecosystem..."
    updated_at: Timestamp;       // When directive was last updated
  };
  
  // --- Mission Control: Metrics ---
  // Powers the progress bars and stats on the agent card
  metrics?: {
    daily_actions_completed: number;  // e.g., 8
    daily_actions_quota: number;      // e.g., 15
    neural_sync_score: number;        // 0–100 (e.g., 91)
    last_run_at?: Timestamp | null;   // ISO timestamp of last execution
    success_rate: number;             // 0–100 (overall run success rate)
    total_runs: number;               // Total number of runs executed
  };
  
  // --- Quota Management ---
  quota_mode?: 'team_only' | 'team_and_subagent';  // How quotas are enforced
  
  // --- Categorization & Search ---
  tags?: string[];               // Optional tags for filtering/search
  
  // --- System Metadata ---
  created_at?: Timestamp;        // Creation timestamp
  updated_at?: Timestamp;        // Last update timestamp
}
```

#### Example Document

```json
{
  "id": "team_1732345678901",
  "projectId": "proj_abc123",
  "channelId": "channel_instagram_official",
  "templateId": "agst_17642383884805",
  "name": "Instagram Official Team",
  "status": "active",
  
  "deployedAt": "2025-11-28T10:00:00Z",
  "deployedBy": "user_xyz789",
  
  "configProfileId": "default",
  "engineVersionSet": "v1.0.0",
  "channel": "stable",
  "ruleProfileId": null,
  "platform": "instagram",
  
  "active_directive": {
    "title": "ACTIVE DIRECTIVE",
    "summary": "Autonomous mode active. Scanning ecosystem for engagement opportunities.",
    "updated_at": "2025-11-29T04:00:00Z"
  },
  
  "metrics": {
    "daily_actions_completed": 8,
    "daily_actions_quota": 15,
    "neural_sync_score": 91,
    "last_run_at": "2025-11-29T03:45:00Z",
    "success_rate": 98.5,
    "total_runs": 142
  },
  
  "tags": ["instagram", "content-creation", "autonomous"],
  
  "created_at": "2025-11-28T10:00:00Z",
  "updated_at": "2025-11-29T04:00:00Z"
}
```

#### UI Mapping (Mission Control)

**Agent Swarm Card Components:**

| UI Element | Field(s) | Description |
|------------|----------|-------------|
| **Card Title** | `name` | Team name displayed at top |
| **Platform Icon** | `platform` | Determines which social media icon to show |
| **Status Badge** | `status` | "ACTIVE" (green), "PAUSED" (yellow), etc. |
| **Active Directive Title** | `active_directive.title` | Section header (usually "ACTIVE DIRECTIVE") |
| **Active Directive Summary** | `active_directive.summary` | Current team focus/mode description |
| **Daily Actions Progress** | `metrics.daily_actions_completed` / `metrics.daily_actions_quota` | "8/15" with progress bar |
| **Neural Sync Progress** | `metrics.neural_sync_score` | "91%" with gradient progress bar |
| **Last Run Time** | `metrics.last_run_at` | Displayed in relative format (e.g., "2 hours ago") |
| **Success Rate** | `metrics.success_rate` | Shown in tooltips or detail view |
| **Total Runs** | `metrics.total_runs` | Historical execution count |

#### Relationships
- Links to: `projects` via `projectId`
- Links to: `channelProfiles` via `channelId`
- Links to: `agentSetTemplates` via `templateId`
- Referenced by: `agent_runs.agentTeamId` (future)
- Referenced by: `generated_content.agentTeamId` (future)

#### Update Strategy

**Metrics Updates:**
- `metrics.daily_actions_*`: Updated after each agent execution
- `metrics.neural_sync_score`: Recalculated periodically (e.g., every hour)
- `metrics.last_run_at`: Updated on every run completion
- `metrics.success_rate`: Recalculated based on recent run history
- `metrics.total_runs`: Incremented on each run

**Active Directive Updates:**
- Updated when team mode changes (autonomous ↔ assisted ↔ manual)
- Updated when team receives new instructions
- `updated_at` timestamp tracks last directive change

---

### Collection: `channelProfiles`

**Purpose**: Social media channel configurations and credentials.

#### TypeScript Interface

```typescript
interface ChannelProfile {
  id: string;                    // Channel ID (e.g., "channel_instagram_official")
  name: string;                  // Display name
  platform: 'x' | 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'blog';
  status: 'active' | 'inactive' | 'pending';
  
  // Authentication (encrypted/secured)
  credentials?: {
    accessToken?: string;        // OAuth access token (encrypted)
    refreshToken?: string;       // OAuth refresh token (encrypted)
    expiresAt?: Timestamp;       // Token expiration
  };
  
  // Channel Metadata
  handle?: string;               // @username or handle
  profileUrl?: string;           // Profile URL
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

#### Example Document

```json
{
  "id": "channel_instagram_official",
  "name": "Acme Corp Official Instagram",
  "platform": "instagram",
  "status": "active",
  "credentials": {
    "accessToken": "***",
    "refreshToken": "***",
    "expiresAt": "2025-12-28T10:00:00Z"
  },
  "handle": "@acmecorp",
  "profileUrl": "https://instagram.com/acmecorp",
  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2025-11-28T15:30:00Z",
  "createdBy": "user_xyz789"
}
```

#### Relationships
- Referenced by: `projectAgentTeamInstances.channelId`

---

### Collection: `users`

**Purpose**: User accounts and authentication data.

#### TypeScript Interface

```typescript
interface User {
  id: string;                    // Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
}
```

#### Example Document

```json
{
  "id": "user_xyz789",
  "email": "john@example.com",
  "displayName": "John Doe",
  "photoURL": "https://example.com/photo.jpg",
  "role": "admin",
  "createdAt": "2025-10-01T10:00:00Z",
  "lastLoginAt": "2025-11-28T09:00:00Z"
}
```

---

### Collection: `industries`

**Purpose**: Industry categories for project classification.

#### TypeScript Interface

```typescript
interface Industry {
  id: string;                    // Industry key (e.g., "technology")
  name: string;                  // Display name
  description?: string;
  icon?: string;                 // Emoji or icon identifier
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Example Document

```json
{
  "id": "technology",
  "name": "Technology",
  "description": "Software, hardware, and tech services",
  "icon": "💻",
  "isActive": true,
  "createdAt": "2025-10-01T10:00:00Z",
  "updatedAt": "2025-11-01T10:00:00Z"
}
```

---

## Subcollections

### Subcollection: `projects/{projectId}/runtimeProfiles`

**Purpose**: LLM runtime configurations (model, provider, cost tier) per project.

#### TypeScript Interface

```typescript
interface RuntimeProfile {
  id: string;                    // e.g., "rtp_writer_short_ko_bal_v1"
  name: string;                  // e.g., "Writer – Short Form (KO, Balanced)"
  description?: string;
  
  // v2.0 Fields (3-Axis Metadata)
  role_type: string;             // 'writer_short' | 'writer_long' | 'planner' | ...
  language: string;              // 'ko' | 'en' | 'global' ...
  tier: 'economy' | 'balanced' | 'premium';
  
  provider: string;              // 'openai' | 'anthropic' | 'google'
  model_id: string;              // 'gpt-4o-mini', 'claude-3-5-sonnet', etc.
  
  capabilities: {
    chat: boolean;
    vision: boolean;
    image_generation: boolean;
    embedding: boolean;
  };
  
  cost_hint: {
    tier: 'economy' | 'balanced' | 'premium';
    input_cost_per_1k?: number;
    output_cost_per_1k?: number;
  };
  
  tags?: string[];               // ['channel:short_social', 'lang:ko', ...]
  status: 'active' | 'inactive' | 'deprecated';
  version: string;               // e.g., "2.0.0"
  
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

#### Example Document

```json
{
  "id": "rtp_chat_balanced_v1",
  "runtime_profile_id": "rtp_chat_balanced_v1",
  "name": "Balanced Chat Model v1",
  "description": "Balanced performance and cost for general tasks",
  "provider": "openai",
  "model_id": "gpt-4o-mini",
  "capabilities": {
    "chat": true,
    "vision": false,
    "image_generation": false,
    "embedding": false
  },
  "cost_hint": {
    "tier": "medium"
  },
  "tags": ["chat_balanced", "chat_main"],
  "status": "active",
  "version": "1.0.0",
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-28T15:30:00Z"
}
```

#### Relationships
- Referenced by: `subAgentTemplates.runtime_profile_id`

---

### Subcollection: `projectAgentTeamInstances/{teamId}/subAgents`

**Purpose**: Sub-agent instances that comprise a deployed agent team. Powers the "Active Sub-Agents" column in Mission Control.

**Path**: `projectAgentTeamInstances/{teamId}/subAgents/{subAgentId}`

#### TypeScript Interface

```typescript
export type SubAgentInstanceStatus = 'active' | 'paused' | 'disabled' | 'error';
export type AutonomyMode = 'autonomous' | 'assisted' | 'manual';

interface SubAgentInstance {
  // --- Identity & Relations ---
  id: string;                    // Document ID (e.g., "sa_planner_001")
  project_id: string;            // Same as parent team's projectId
  team_instance_id: string;      // Parent projectAgentTeamInstances.id
  template_id: string;           // Link to subAgentTemplates.id
  
  // --- Role Definition ---
  role_name: string;             // Display name (e.g., "TrendHunter")
  role_type: string;             // Engine type: 'planner' | 'creator_text' | etc.
  display_order: number;         // Order in UI list (0-based)
  description?: string;          // Optional role description
  
  // --- Channel Adaptation ---
  channel_adapter_id?: string;   // Link to subAgentChannelAdapters (if applicable)
  
  // --- Status & Mode ---
  status: SubAgentInstanceStatus;
  autonomy_mode?: AutonomyMode;  // Current operating mode
  
  // --- Engagement (Mission Control / Admin UI) ---
  likes_count: number;           // Total likes received
  rating_avg: number;            // Average rating (0.0–5.0)
  rating_count: number;          // Number of ratings
  
  // --- Runtime Configuration Overrides ---
  runtime_overrides?: {
    runtime_profile_id?: string;      // Override template's runtime_profile_id
    temperature?: number;             // Override config.temperature
    max_tokens?: number;              // Override config.maxTokens
    system_prompt_append?: string;    // Additional prompt instructions
  };
  
  // --- Metrics (Mission Control UI) ---
  metrics?: {
    // Quota Management
    daily_actions_completed: number;    // Tasks completed today
    daily_actions_quota: number;        // Daily task limit
    
    // Performance
    last_active_at?: Timestamp | null;  // Last execution time
    success_rate: number;               // 0–100 (e.g., 98)
    total_runs: number;                 // Total executions
    avg_latency_ms?: number;            // Average response time
    avg_tokens_per_run?: number;        // Average token usage
  };
  
  // --- System Metadata ---
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: string;           // User ID who created this instance
}
```

#### Example Document

```json
{
  "id": "sa_planner_001",
  "project_id": "proj_abc123",
  "team_instance_id": "team_1732345678901",
  "template_id": "tpl_planner_v1_0_0",
  
  "role_name": "TrendHunter",
  "role_type": "planner",
  "display_order": 0,
  "description": "Strategic content planner focused on trend analysis",
  
  "channel_adapter_id": "adapter_instagram_planner",
  
  "status": "active",
  "autonomy_mode": "autonomous",
  
  "runtime_overrides": {
    "runtime_profile_id": "rtp_chat_premium_v1",
    "temperature": 0.8,
    "max_tokens": 3000,
    "system_prompt_append": "Focus on Instagram Reels trends."
  },
  
  "metrics": {
    "last_active_at": "2025-11-29T04:30:00Z",
    "success_rate": 98.5,
    "total_runs": 247,
    "avg_latency_ms": 1850,
    "avg_tokens_per_run": 1200,
    "total_likes": 201,
    "rating_average": 4.8,
    "rating_count": 45
  },
  
  "created_at": "2025-11-28T10:00:00Z",
  "updated_at": "2025-11-29T04:30:00Z",
  "created_by": "user_xyz789"
}
```

#### UI Mapping (Mission Control - Active Sub-Agents)

| UI Element | Field(s) | Description |
|------------|----------|-------------|
| **Name** | `role_name` | "TrendHunter" |
| **Role Badge** | `role_type` | "Planner" with icon 🎯 |
| **Status Dot** | `status` | Green for "active" |
| **Success Rate** | `metrics.success_rate` | "98% SR" |
| **Last Active** | `metrics.last_active_at` | "Last active 10m ago" |
| **Total Runs** | `metrics.total_runs` | "247 runs" |

#### Relationships
- Parent: `projectAgentTeamInstances` (via `team_instance_id`)
- Links to: `subAgentTemplates` (via `template_id`)
- Links to: `subAgentChannelAdapters` (via `channel_adapter_id`)
- Links to: `projects/{projectId}/runtimeProfiles` (via `runtime_overrides.runtime_profile_id`)

#### Initialization
Created automatically when a team is deployed. See [SubAgentInstance Design](./subagent-instance-design.md) for detailed initialization flow.

---

### Subcollection: `projects/{projectId}/agentRuns`

**Purpose**: Track agent execution history. Powers the "Recent Runs" panel in Mission Control.

**Path**: `projects/{projectId}/agentRuns/{runId}`

#### TypeScript Interface

```typescript
export type AgentRunStatus = 
  | 'pending' 
  | 'running' 
  | 'success' 
  | 'failed' 
  | 'cancelled'
  | 'blocked_quota';  // Quota exceeded - execution blocked

interface AgentRun {
  // --- Identity & Relations ---
  id: string;                    // Document ID (e.g., "run_1732345678901")
  project_id: string;            // Parent project ID
  team_instance_id: string;      // Link to projectAgentTeamInstances
  sub_agent_instance_id: string; // Link to SubAgentInstance
  sub_agent_role_name: string;   // UI display name (e.g., "TrendHunter")
  
  // --- Execution Info ---
  status: AgentRunStatus;
  task_type: string;             // 'plan' | 'create_text' | 'create_image' | 'engage'
  task_prompt: string;           // Task description for UI (e.g., "Create vibrant post about spicy tteokbokki...")
  output_summary?: string;       // Result summary (if available)
  
  // --- Timing ---
  started_at: Timestamp;
  completed_at?: Timestamp | null;
  duration_ms?: number;          // Calculated duration
  
  // --- Results ---
  generated_content_ids: string[];  // Links to GeneratedContent documents
  error_message?: string;           // Error details if failed
  
  // --- Quota Management (for blocked_quota status) ---
  quota_snapshot?: {
    team_daily_actions_completed: number;
    team_daily_actions_quota: number;
    subagent_daily_actions_completed?: number;
    subagent_daily_actions_quota?: number;
  };
  block_reason?: 'team_quota_exceeded' | 'subagent_quota_exceeded' | null;
  
  // --- Performance Metrics ---
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  };
  
  // --- Context & Metadata ---
  metadata?: {
    campaign_id?: string;        // Future: Link to campaign
    task_id?: string;            // Future: Link to task
    runtime_profile_id?: string;
    temperature?: number;
    max_tokens?: number;
    [key: string]: any;
  };
  
  // --- System Metadata ---
  created_at: Timestamp;
  created_by?: string;           // User ID or 'system'
}
```

#### Example Document

```json
{
  "id": "run_1732345678901",
  "project_id": "proj_abc123",
  "team_instance_id": "team_1732345678901",
  "sub_agent_instance_id": "sa_creator_text_001",
  
  "status": "success",
  "task_type": "create_text",
  "prompt": "Create Instagram caption for weekend brunch promotion",
  
  "started_at": "2025-11-29T04:30:00Z",
  "completed_at": "2025-11-29T04:30:03Z",
  "duration_ms": 3200,
  
  "output_ids": ["content_abc123"],
  
  "metrics": {
    "tokens_used": 1250,
    "latency_ms": 2800,
    "cost_usd": 0.0025
  },
  
  "created_at": "2025-11-29T04:30:00Z",
  "created_by": "system"
}
```

#### UI Mapping (Mission Control - Recent Runs)

| UI Element | Field(s) | Description |
|------------|----------|-------------|
| **Status Badge** | `status` | "SUCCESS" (green), "FAILED" (red) |
| **Task Description** | `prompt` | "Create Instagram caption..." |
| **Duration** | `duration_ms` | "3.2s" |
| **Timestamp** | `started_at` | "2 hours ago" |
| **Output Count** | `output_ids.length` | "1 output" |

#### Relationships
- Parent: `projects` (via `project_id`)
- Links to: `projectAgentTeamInstances` (via `team_instance_id`)
- Links to: `SubAgentInstance` (via `sub_agent_instance_id`)
- Links to: `generatedContents` (via `output_ids`)

---

### Subcollection: `projects/{projectId}/generatedContents`

**Purpose**: Store generated outputs (text, images, videos). Powers the "Generated Content" panel in Mission Control.

**Path**: `projects/{projectId}/generatedContents/{contentId}`

#### TypeScript Interface

```typescript
export type GeneratedContentStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'scheduled' 
  | 'publishing'
  | 'published' 
  | 'failed';

export type ContentType = 'text' | 'image' | 'video' | 'carousel';

interface GeneratedContent {
  // --- Identity & Relations ---
  id: string;                    // Document ID (e.g., "content_abc123")
  project_id: string;            // Parent project ID
  team_instance_id: string;      // Link to projectAgentTeamInstances
  run_id: string;                // Link to AgentRun
  sub_agent_instance_id: string; // Which Sub-Agent created this
  
  // --- Content Type & Platform ---
  type: ContentType;
  platform: string;              // 'instagram' | 'x' | 'youtube' | 'blog' | etc.
  channel_profile_id: string;    // Link to channelProfiles
  
  // --- Content Data ---
  title?: string;                // Card title
  preview_text?: string;         // Caption / body summary
  preview_image_url?: string;    // Thumbnail / preview image
  media_urls?: string[];         // URLs to images/videos (deprecated, use preview_image_url)
  
  // --- Status & Publishing ---
  status: GeneratedContentStatus;
  scheduled_for?: Timestamp | null;
  published_at?: Timestamp | null;
  
  // --- External Platform Links ---
  external_post_url?: string | null;  // Link to live post (e.g., Instagram post URL)
  external_post_id?: string | null;   // Platform internal ID (for API integration)
  
  // --- Engagement Metrics ---
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  
  // --- Approval Workflow ---
  approval?: {
    reviewed_by?: string;
    reviewed_at?: Timestamp;
    feedback?: string;
  };
  
  // --- Metadata ---
  metadata?: {
    campaign_id?: string;
    hashtags?: string[];
    mentions?: string[];
    word_count?: number;
    [key: string]: any;
  };
  
  // --- System Metadata ---
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: string;
}
```

#### Example Document

```json
{
  "id": "content_abc123",
  "project_id": "proj_abc123",
  "team_instance_id": "team_1732345678901",
  "run_id": "run_1732345678901",
  
  "type": "text",
  "platform": "instagram",
  
  "title": "Weekend Brunch Vibes",
  "body": "Spice up your weekend with our signature brunch menu! 🍳☕\n\n#BrunchGoals #WeekendVibes",
  "thumbnail_url": "https://storage.googleapis.com/zynk-media/brunch_thumb.jpg",
  
  "status": "published",
  "published_at": "2025-11-29T10:00:00Z",
  "external_post_url": "https://instagram.com/p/abc123",
  
  "engagement": {
    "likes": 342,
    "shares": 12,
    "comments": 28,
    "views": 5420,
    "last_updated_at": "2025-11-29T16:00:00Z"
  },
  
  "created_at": "2025-11-29T04:30:03Z",
  "updated_at": "2025-11-29T16:00:00Z"
}
```

#### UI Mapping (Mission Control - Generated Content)

| UI Element | Field(s) | Description |
|------------|----------|-------------|
| **Thumbnail** | `thumbnail_url` or `media_urls[0]` | Image preview |
| **Title** | `title` | "Weekend Brunch Vibes" |
| **Status Badge** | `status` | "PUBLISHED" (green) |
| **Platform Icon** | `platform` | Instagram logo |
| **Engagement** | `engagement.likes`, `engagement.comments` | "342 ❤️ 28 💬" |
| **Timestamp** | `published_at` or `created_at` | "2 hours ago" |

#### Relationships
- Parent: `projects` (via `project_id`)
- Links to: `projectAgentTeamInstances` (via `team_instance_id`)
- Links to: `agentRuns` (via `run_id`)
- Links to: `SubAgentInstance` (via `sub_agent_instance_id`)

#### Lifecycle
See [AgentRun & Content Design](./agentrun-content-design.md) for retention policies and engagement tracking.

---

## Relationships Diagram

```
projects
  ├─ projectAgentTeamInstances (via projectId)
  │    ├─ subAgents (subcollection) ← v1.1
  │    │    ├─ subAgentTemplates (via template_id)
  │    │    └─ subAgentChannelAdapters (via channel_adapter_id)
  │    ├─ agentSetTemplates (via templateId)
  │    │    └─ subAgentTemplates (via roles[].defaultTemplateId)
  │    │         └─ subAgentChannelAdapters (via subAgentTemplateId)
  │    └─ channelProfiles (via channelId)
  │
  ├─ agentRuns (subcollection) ← v1.1
  │    ├─ projectAgentTeamInstances (via team_instance_id)
  │    ├─ SubAgentInstance (via sub_agent_instance_id)
  │    └─ generatedContents (via output_ids)
  │
  ├─ generatedContents (subcollection) ← v1.1
  │    ├─ projectAgentTeamInstances (via team_instance_id)
  │    ├─ agentRuns (via run_id)
  │    └─ SubAgentInstance (via sub_agent_instance_id)
  │
  └─ runtimeProfiles (subcollection)
       └─ subAgentTemplates (via runtime_profile_id)

users
  └─ projects (via createdBy, members, admins)

industries
  └─ projects (via industry)
```

---

## Data Flow: Agent Team Deployment

1. **User selects** a `channelProfile` (e.g., Instagram Official)
2. **User selects** an `agentSetTemplate` (e.g., "Instagram Content Team")
3. **System creates** a `projectAgentTeamInstance`:
   - Links to `project`, `channel`, and `template`
   - Stores deployment metadata
4. **System resolves** sub-agents:
   - For each `role` in the template
   - Fetches the `subAgentTemplate` (via `defaultTemplateId`)
   - Applies `subAgentChannelAdapter` overrides if they exist
   - Uses `runtimeProfile` for LLM configuration

---

## Missing Collections (Future Implementation)

Based on the PRD and architecture docs, the following collections are **planned but not yet implemented**:

### 1. `agent_runs` (or `agentRuns`)
**Purpose**: Track execution history of agent tasks.

```typescript
interface AgentRun {
  id: string;
  agentTeamId: string;           // Link to projectAgentTeamInstances
  subAgentId: string;            // Which sub-agent executed
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number;             // milliseconds
  outputIds: string[];           // Links to generated_content
  error?: string;
  metadata: Record<string, any>;
}
```

### 2. `generated_content` (or `contents`)
**Purpose**: Store generated outputs (text, images, videos).

```typescript
interface GeneratedContent {
  id: string;
  agentTeamId: string;           // Link to projectAgentTeamInstances
  runId: string;                 // Link to agent_runs
  type: 'text' | 'image' | 'video';
  status: 'draft' | 'pending_approval' | 'approved' | 'published';
  content: string;               // Text content or URL
  metadata: {
    platform: string;
    scheduledFor?: Timestamp;
    publishedAt?: Timestamp;
    engagement?: {
      likes: number;
      shares: number;
      comments: number;
    };
  };
  createdAt: Timestamp;
  approvedBy?: string;
}
```

### 3. `tasks` (or `campaignTasks`)
**Purpose**: Task queue for agent execution.

```typescript
interface Task {
  id: string;
  agentTeamId: string;
  type: 'plan' | 'create' | 'publish' | 'engage';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: number;
  scheduledFor?: Timestamp;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
```

### 4. `campaigns`
**Purpose**: Marketing campaigns that group multiple tasks.

```typescript
interface Campaign {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: Timestamp;
  endDate?: Timestamp;
  goals: Record<string, any>;
}
```

### 5. `contentBriefs`
**Purpose**: Content briefs created by Planner agents.

```typescript
interface ContentBrief {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  targetAudience: string;
  keywords: string[];
  tone: string;
  createdBy: string;             // Sub-agent ID
  createdAt: Timestamp;
}
```

### 6. `learnings` (or `agentLearnings`)
**Purpose**: Store agent learnings and optimizations.

```typescript
interface Learning {
  id: string;
  agentTeamId: string;
  type: 'success_pattern' | 'failure_pattern' | 'optimization';
  description: string;
  context: Record<string, any>;
  appliedAt?: Timestamp;
  createdAt: Timestamp;
}
```

### 7. `behaviourPacks`
**Purpose**: Behavior pack definitions (Phase 1).

```typescript
interface BehaviourPack {
  id: string;
  name: string;
  platform: string;
  channel: string;
  engineType: string;
  rules: Record<string, any>;
  version: string;
  status: 'active' | 'deprecated';
}
```

### 8. `ruleProfiles`
**Purpose**: RULE profile definitions (Phase 1).

```typescript
interface RuleProfile {
  id: string;
  name: string;
  platform: string;
  type: string;
  rules: Record<string, any>;
  version: string;
  status: 'active' | 'deprecated';
}
```

### 9. `channelAgentConfigs`
**Purpose**: Instance-specific configuration overrides (Phase 1).

```typescript
interface ChannelAgentConfig {
  id: string;                    // Same as projectAgentTeamInstance ID
  instanceId: string;
  overrides: Record<string, any>;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## Indexing Recommendations

### Composite Indexes

```javascript
// For fetching active teams by project
{
  collection: 'projectAgentTeamInstances',
  fields: [
    { fieldPath: 'projectId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'deployedAt', order: 'DESCENDING' }
  ]
}

// For filtering sub-agent templates
{
  collection: 'subAgentTemplates',
  fields: [
    { fieldPath: 'type', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'version', order: 'DESCENDING' }
  ]
}

// For channel profile lookups
{
  collection: 'channelProfiles',
```
   collection: 'channelProfiles',
   fields: [
     { fieldPath: 'platform', order: 'ASCENDING' },
     { fieldPath: 'status', order: 'ASCENDING' }
   ]
 }

// ===== Mission Control View History Indexes =====

// For Recent Runs panel - filtering by team
{
  collection: 'projects/{projectId}/agentRuns',
  fields: [
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'started_at', order: 'DESCENDING' }
  ]
}

// For Generated Content panel - filtering by team
{
  collection: 'projects/{projectId}/generatedContents',
  fields: [
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'created_at', order: 'DESCENDING' }
  ]
}

// For Generated Content panel - filtering by run
{
  collection: 'projects/{projectId}/generatedContents',
  fields: [
    { fieldPath: 'run_id', order: 'ASCENDING' },
    { fieldPath: 'created_at', order: 'DESCENDING' }
  ]
}

---

## Security Considerations

### Sensitive Fields

The following fields contain sensitive data and should be encrypted or access-controlled:

- `channelProfiles.credentials.accessToken` - **Encrypt at rest**
- `channelProfiles.credentials.refreshToken` - **Encrypt at rest**
- Any API keys or secrets - **Never store in plain text**

### Firestore Security Rules (Example)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Projects: Read if member, Write if admin
    match /projects/{projectId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.members;
      allow write: if request.auth != null && 
        request.auth.uid in resource.data.admins;
    }
    
    // Agent Team Instances: Read if project member
    match /projectAgentTeamInstances/{instanceId} {
      allow read: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.members;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.admins;
    }
    
    // Templates: Read-only for all authenticated users
    match /subAgentTemplates/{templateId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    match /agentSetTemplates/{templateId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

---

## Migration Notes

### From Legacy `agents` Collection

The old `agents` collection is **deprecated**. New implementations should use:
- `subAgentTemplates` for template definitions
- `projectAgentTeamInstances` for deployed instances

### Field Naming Conventions

- **Timestamps**: Use `created_at`, `updated_at` (snake_case) for consistency
- **IDs**: Use `id` field + document ID (redundant but explicit)
- **References**: Use `{entity}Id` format (e.g., `projectId`, `templateId`)

---

## Document Owner

**Data Architecture Team**  
**Review Cycle**: Quarterly or on major schema changes

---

## Appendix: Collection Summary Table

| Collection | Purpose | Key Fields | Relationships |
|------------|---------|------------|---------------|
| `projects` | Client workspaces | `id`, `name`, `status` | Parent of instances |
| `subAgentTemplates` | Sub-agent definitions | `type`, `system_prompt`, `version` | Used by team templates |
| `agentSetTemplates` | Team templates | `roles[]`, `channel_type` | Used by instances |
| `projectAgentTeamInstances` | Deployed teams | `projectId`, `channelId`, `templateId` | Links all entities |
| `channelProfiles` | Social channels | `platform`, `credentials` | Used by instances |
| `subAgentChannelAdapters` | Channel overrides | `channelId`, `promptOverrides` | Extends templates |
| `users` | User accounts | `email`, `role` | Owns projects |
| `industries` | Categories | `name`, `icon` | Categorizes projects |

---

**End of Document**
