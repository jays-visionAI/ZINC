# ZYNK Agent Team Data Architecture

**Version**: 1.0  
**Last Updated**: 2025-11-29  
**Status**: Approved

---

## Overview

This document defines the data model for **Agent Team Instances** in ZYNK Mission Control. An Agent Team Instance represents a deployed AI agent team assigned to a specific channel (Instagram, X, YouTube, etc.).

### Key Principles

1. **Lightweight Documents**: The main `AgentTeamInstance` document contains only essential metadata and cached summaries. Heavy data (runs, content) lives in separate collections.
2. **UI-First Design**: Fields are structured to minimize read operations when rendering the Mission Control UI.
3. **Firestore Native**: Designed for Firestore's document model with consideration for the 1MB document size limit.

---

## Data Model

### TypeScript Interface

```typescript
/**
 * Represents a deployed instance of an Agent Team on a specific channel.
 * Firestore Path: /projects/{projectId}/agent_teams/{agentTeamId}
 */
export interface AgentTeamInstance {
  // --- Identity & Relations ---
  id: string;                // e.g., "vanguard_x_123"
  projectId: string;         // Link to parent Project
  channelProfileId: string;  // Link to Channel Profile (e.g., "instagram_official")
  channelPlatform: 'x' | 'linkedin' | 'instagram' | 'tiktok' | 'youtube'; // For icon/variant rendering
  
  // --- Logic Configuration (The "Brain") ---
  templateId: string;        // The original Team Template ID used
  behaviourPackId: string;   // Link to Behaviour Pack (defines base logic)
  ruleProfileId?: string;    // Link to Rule Profile (optional overrides)
  
  // --- Display Info (Card Header) ---
  name: string;              // e.g., "Vanguard"
  variantLabel: string;      // e.g., "X" (Displayed in brackets)
  roleLabel: string;         // e.g., "Trend Setter"
  description: string;       // Shown in Detail Panel header
  avatarUrl?: string;        // Optional override for team icon

  // --- Status & State ---
  status: 'active' | 'cooldown' | 'paused' | 'error' | 'deploying';
  alertLevel: 'none' | 'info' | 'warning' | 'critical';
  alertMessage?: string;     // Tooltip for the alert icon
  
  // --- Active Directive (The "Current Focus") ---
  activeDirective: {
    state: 'autonomous' | 'assisted' | 'manual';
    summary: string;         // "Scanning ecosystem for engagement..."
    lastUpdated: string;     // ISO Timestamp
  };

  // --- Metrics (Progress Bars) ---
  metrics: {
    dailyActions: {
      current: number;       // 8
      max: number;           // 15
      resetAt: string;       // ISO Timestamp (when quota resets)
    };
    neuralSync: number;      // 0-100 (e.g., 91)
    successRate: number;     // 0-100
    totalRuns: number;
    lastRunAt?: string;      // ISO Timestamp
  };

  // --- Sub-Agents (Composition) ---
  // We store a summary here for quick rendering of the "Assigned Agent Team" list
  // without needing to fetch the full sub-agent collection immediately.
  subAgents: Array<{
    id: string;              // Link to /sub_agents/{id}
    role: string;            // e.g., "Planner", "Creator"
    name: string;            // e.g., "Strategist (LI)"
    engineType: string;      // e.g., "planner_engine_v1"
    status: 'active' | 'idle' | 'error';
  }>;

  // --- Configuration Overrides ---
  // Stores instance-specific settings from the "Configure" slide-in panel
  config: Record<string, any>; 

  // --- System Metadata ---
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}
```

---

## Firestore Document Example

**Collection Path**: `/projects/{projectId}/agent_teams/{agentTeamId}`

```json
{
  "id": "vanguard_x_instance_01",
  "projectId": "project_alpha",
  "channelProfileId": "channel_x_main",
  "channelPlatform": "x",
  
  "templateId": "team_template_vanguard",
  "behaviourPackId": "bp_trend_setter_v1",
  "ruleProfileId": "rp_strict_safety",

  "name": "Vanguard",
  "variantLabel": "X",
  "roleLabel": "Trend Setter",
  "description": "Autonomous trend monitoring and engagement team for X (Twitter).",

  "status": "active",
  "alertLevel": "warning",
  "alertMessage": "Rate limit approaching",

  "activeDirective": {
    "state": "autonomous",
    "summary": "Autonomous mode active. Scanning ecosystem for engagement opportunities.",
    "lastUpdated": "2025-11-29T04:00:00Z"
  },

  "metrics": {
    "dailyActions": {
      "current": 8,
      "max": 15,
      "resetAt": "2025-11-30T00:00:00Z"
    },
    "neuralSync": 91,
    "successRate": 98.5,
    "totalRuns": 142,
    "lastRunAt": "2025-11-29T03:45:00Z"
  },

  "subAgents": [
    {
      "id": "sa_planner_01",
      "role": "Planner",
      "name": "Strategist",
      "engineType": "planner_engine",
      "status": "active"
    },
    {
      "id": "sa_creator_01",
      "role": "Creator",
      "name": "CopyMaster",
      "engineType": "creator_text_engine",
      "status": "active"
    }
  ],

  "config": {
    "postFrequency": "high",
    "tone": "professional",
    "maxDailyPosts": 15
  },

  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2025-11-29T04:00:00Z",
  "createdBy": "user_123",
  "version": 1
}
```

---

## UI Mapping

This section explains how each field maps to the Mission Control UI components.

### 1. Agent Swarm Card (Main Grid)

**Location**: Mission Control → Agent Swarm section

| UI Element | Field(s) | Notes |
|------------|----------|-------|
| Icon | `channelPlatform` | Maps to platform icon (X logo, Instagram logo, etc.) |
| Title | `name` + `variantLabel` | Displayed as "Vanguard (X)" |
| Alert Badge (!) | `alertLevel` | Shows red '!' if 'warning' or 'critical' |
| Status Badge | `status` | Green "ACTIVE", Blue "COOLDOWN", etc. |
| Role Label | `roleLabel` | "Trend Setter" shown below name |
| Active Directive Icon | `activeDirective.state` | Lightning bolt for 'autonomous' |
| Active Directive Text | `activeDirective.summary` | Full directive description |
| Daily Actions Bar | `metrics.dailyActions.current` / `max` | "8/15" with progress bar |
| Neural Sync Bar | `metrics.neuralSync` | "91%" with gradient bar |
| View History Button | `id` | Opens Detail Panel for this team |
| Settings Button | `id` | Opens Configuration Panel |

### 2. Detail Panel - Left Column (Assigned Agent Team)

**Location**: Detail Panel → Left Column

| UI Element | Field(s) | Notes |
|------------|----------|-------|
| Team Name (Large) | `name` | "Vanguard" |
| Description | `description` | Full team description |
| Sub-Agent Cards | `subAgents[]` | Iterates through array |
| Sub-Agent Name | `subAgents[i].name` | "Strategist", "CopyMaster" |
| Sub-Agent Role | `subAgents[i].role` | "Planner", "Creator" |
| Sub-Agent Status | `subAgents[i].status` | Badge color |
| Engine Type Badge | `subAgents[i].engineType` | For icon/badge rendering |

### 3. Detail Panel - Middle Column (Recent Runs)

**Location**: Detail Panel → Middle Column

**Data Source**: Separate collection `/agent_runs`

Query:
```javascript
db.collection('agent_runs')
  .where('agentTeamId', '==', agentTeamInstance.id)
  .orderBy('createdAt', 'desc')
  .limit(10)
```

**Why Separate?**
- Runs can be numerous (100s-1000s per team)
- Keeping them in the main document would exceed Firestore's 1MB limit
- Allows efficient pagination and filtering

### 4. Detail Panel - Right Column (Generated Content)

**Location**: Detail Panel → Right Column

**Data Source**: Separate collection `/generated_content`

Query:
```javascript
db.collection('generated_content')
  .where('agentTeamId', '==', agentTeamInstance.id)
  .orderBy('createdAt', 'desc')
  .limit(20)
```

**Why Separate?**
- Content includes images, text, metadata
- Can grow very large
- Needs independent lifecycle (archiving, deletion)

---

## Related Collections

### Agent Runs
**Path**: `/agent_runs/{runId}`

```typescript
interface AgentRun {
  id: string;
  agentTeamId: string;      // Link back to AgentTeamInstance
  subAgentId: string;       // Which sub-agent executed this
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;        // milliseconds
  outputIds: string[];      // Links to generated_content
  error?: string;
  metadata: Record<string, any>;
}
```

### Generated Content
**Path**: `/generated_content/{contentId}`

```typescript
interface GeneratedContent {
  id: string;
  agentTeamId: string;      // Link back to AgentTeamInstance
  runId: string;            // Link to the run that created this
  type: 'text' | 'image' | 'video';
  status: 'draft' | 'pending_approval' | 'approved' | 'published';
  content: string;          // Text content or URL
  metadata: {
    platform: string;
    scheduledFor?: string;
    publishedAt?: string;
    engagement?: {
      likes: number;
      shares: number;
      comments: number;
    };
  };
  createdAt: string;
  approvedBy?: string;
}
```

---

## Key Design Decisions

### 1. Why `subAgents` Array Instead of Just IDs?

**Decision**: Store a snapshot of sub-agent metadata in the team document.

**Rationale**:
- **Performance**: Rendering the "Assigned Agent Team" list requires name, role, status for each sub-agent
- **Without snapshot**: Would need 3-4 separate Firestore reads
- **With snapshot**: Single read gets all data needed
- **Trade-off**: Slight denormalization, but acceptable since sub-agent metadata rarely changes

**Update Strategy**: When a sub-agent's name/status changes, update both:
1. The sub-agent document
2. The corresponding entry in `AgentTeamInstance.subAgents[]`

### 2. Why Separate Collections for Runs and Content?

**Decision**: Store runs and content in separate collections, not as sub-collections.

**Rationale**:
- **Document Size**: Firestore has a 1MB limit per document
- **Query Flexibility**: Easier to query across all runs/content globally
- **Scalability**: Can archive old runs without affecting team documents
- **Performance**: Pagination works better with top-level collections

### 3. Why `config` as Generic Object?

**Decision**: Use `Record<string, any>` instead of a strict interface.

**Rationale**:
- **Flexibility**: Different channels have different configuration options
- **Evolution**: New config fields can be added without schema migration
- **Channel-Specific**: Instagram needs different settings than YouTube
- **Validation**: Validation happens at the application layer using schema definitions

---

## Migration Notes

### From Current Implementation

The current codebase uses `projectAgentTeamInstances` collection with a simpler structure. Migration steps:

1. **Add New Fields**:
   - `behaviourPackId` (required)
   - `ruleProfileId` (optional)
   - `subAgents[]` array with metadata
   - `config` object

2. **Rename Fields**:
   - `channelId` → `channelProfileId`
   - `platform` → `channelPlatform`

3. **Restructure Metrics**:
   - Group daily actions into `metrics.dailyActions` object
   - Add `resetAt` timestamp

4. **Data Population**:
   - For existing instances, populate `subAgents[]` by reading from sub-agent documents
   - Set default `behaviourPackId` based on team template
   - Initialize empty `config` objects

---

## Indexing Strategy

### Recommended Firestore Indexes

```javascript
// Composite index for fetching active teams by project
{
  collection: 'agent_teams',
  fields: [
    { fieldPath: 'projectId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'updatedAt', order: 'DESCENDING' }
  ]
}

// For filtering by channel
{
  collection: 'agent_teams',
  fields: [
    { fieldPath: 'projectId', order: 'ASCENDING' },
    { fieldPath: 'channelPlatform', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' }
  ]
}
```

---

## Future Enhancements

### Planned Features

1. **Team Versioning**: Track configuration changes over time
2. **Performance Analytics**: Add more detailed metrics (response time, token usage)
3. **A/B Testing**: Support for running multiple variants of the same team
4. **Scheduling**: Add fields for scheduled activation/deactivation
5. **Cost Tracking**: Monitor API costs per team

### Schema Evolution

When adding new fields:
- Make them **optional** to avoid breaking existing documents
- Provide **default values** in the application layer
- Document the change in this file with version number
- Consider backward compatibility for at least 2 versions

---

## Validation Rules

### Firestore Security Rules (Example)

```javascript
match /projects/{projectId}/agent_teams/{teamId} {
  allow read: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.members;
  
  allow create: if request.auth != null && 
    request.resource.data.keys().hasAll(['name', 'channelProfileId', 'status', 'projectId']) &&
    request.resource.data.projectId == projectId;
  
  allow update: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.members;
  
  allow delete: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.admins;
}
```

---

## References

- [ZYNK Agent OS PRD 5.0](../task.md)
- [Channel Configuration System](../implementation_plan.md)
- [Firestore Data Model Best Practices](https://firebase.google.com/docs/firestore/data-model)

---

**Document Owner**: Data Architecture Team  
**Review Cycle**: Quarterly or on major feature releases
