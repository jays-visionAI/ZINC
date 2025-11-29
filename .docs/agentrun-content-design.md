# AgentRun & GeneratedContent Collections Design

**Version**: 1.1  
**Date**: 2025-11-29  
**Status**: Design Approved

---

## Overview

This document defines the **execution and output layer** for ZYNK Mission Control:
- **AgentRun**: Tracks agent execution history (CENTER panel: "Recent Runs")
- **GeneratedContent**: Stores generated outputs (RIGHT panel: "Generated Content")

Both collections are **project-scoped** for efficient querying and security.

---

## Collection Paths

```
projects/{projectId}/agentRuns/{runId}
projects/{projectId}/generatedContents/{contentId}
```

**Rationale for Project-Scoping:**
- ✅ Efficient project-level queries
- ✅ Simpler security rules (project membership)
- ✅ Natural data isolation
- ✅ Easier cleanup when project is deleted

---

## Collection: `agentRuns`

**Purpose**: Track execution history of agent tasks. Powers the "Recent Runs" panel in Mission Control.

**Path**: `projects/{projectId}/agentRuns/{runId}`

### TypeScript Interface

```typescript
export type AgentRunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

interface AgentRun {
  // --- Identity & Relations ---
  id: string;                    // Document ID (e.g., "run_1732345678901")
  project_id: string;            // Parent project ID
  team_instance_id: string;      // Link to projectAgentTeamInstances
  sub_agent_instance_id: string; // Link to SubAgentInstance
  
  // --- Execution Info ---
  status: AgentRunStatus;
  task_type: string;             // 'plan' | 'create_text' | 'create_image' | 'engage' | etc.
  prompt: string;                // Short description for UI (e.g., "Create Instagram post about...")
  
  // --- Timing ---
  started_at: Timestamp;
  completed_at?: Timestamp | null;
  duration_ms?: number;          // Calculated: completed_at - started_at
  
  // --- Results ---
  output_ids: string[];          // Links to GeneratedContent documents
  error_message?: string;        // Error details if status === 'failed'
  
  // --- Performance Metrics ---
  metrics?: {
    tokens_used?: number;        // Total tokens consumed
    latency_ms?: number;         // Response time from LLM
    cost_usd?: number;           // Estimated cost
  };
  
  // --- Context & Metadata ---
  metadata?: {
    campaign_id?: string;        // Future: Link to campaign
    task_id?: string;            // Future: Link to task
    runtime_profile_id?: string; // Which runtime profile was used
    temperature?: number;        // Config used for this run
    max_tokens?: number;
    [key: string]: any;          // Extensible for future fields
  };
  
  // --- System Metadata ---
  created_at: Timestamp;
  created_by?: string;           // User ID (if manually triggered) or 'system'
}
```

### Example Document

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
  
  "output_ids": ["content_abc123", "content_abc124"],
  
  "metrics": {
    "tokens_used": 1250,
    "latency_ms": 2800,
    "cost_usd": 0.0025
  },
  
  "metadata": {
    "runtime_profile_id": "rtp_chat_balanced_v1",
    "temperature": 0.8,
    "max_tokens": 2000
  },
  
  "created_at": "2025-11-29T04:30:00Z",
  "created_by": "system"
}
```

### UI Mapping (Mission Control - Recent Runs)

**Query:**
```javascript
const runs = await db
  .collection('projects')
  .doc(projectId)
  .collection('agentRuns')
  .where('team_instance_id', '==', teamInstanceId)
  .orderBy('started_at', 'desc')
  .limit(20)
  .get();
```

**Card Rendering:**

| UI Element | Field(s) | Example |
|------------|----------|---------|
| **Status Badge** | `status` | Green "SUCCESS", Red "FAILED" |
| **Task Description** | `prompt` | "Create Instagram caption..." |
| **Sub-Agent Name** | `sub_agent_instance_id` → resolve to name | "CopyMaster" |
| **Duration** | `duration_ms` | "3.2s" |
| **Timestamp** | `started_at` | "2 hours ago" |
| **Output Count** | `output_ids.length` | "2 outputs" |

---

## Collection: `generatedContents`

**Purpose**: Store generated outputs (text, images, videos). Powers the "Generated Content" panel in Mission Control.

**Path**: `projects/{projectId}/generatedContents/{contentId}`

### TypeScript Interface

```typescript
export type GeneratedContentStatus = 
  | 'draft'              // Created but not reviewed
  | 'pending_approval'   // Awaiting human review
  | 'approved'           // Approved for publishing
  | 'scheduled'          // Scheduled for future publish
  | 'published'          // Live on platform
  | 'rejected'           // Rejected by reviewer
  | 'archived';          // Archived/deleted

export type ContentType = 'text' | 'image' | 'video' | 'carousel' | 'story';

interface GeneratedContent {
  // --- Identity & Relations ---
  id: string;                    // Document ID (e.g., "content_abc123")
  project_id: string;            // Parent project ID
  team_instance_id: string;      // Link to projectAgentTeamInstances
  run_id: string;                // Link to AgentRun that created this
  sub_agent_instance_id?: string; // Optional: Which sub-agent created this
  
  // --- Content Type & Platform ---
  type: ContentType;
  platform: 'instagram' | 'x' | 'linkedin' | 'tiktok' | 'youtube' | 'blog';
  
  // --- Content Data ---
  title?: string;                // Post title / headline
  body?: string;                 // Caption / copy / article text
  media_urls?: string[];         // URLs to images/videos (Cloud Storage)
  thumbnail_url?: string;        // Preview image URL
  
  // --- Status & Publishing ---
  status: GeneratedContentStatus;
  scheduled_for?: Timestamp | null;
  published_at?: Timestamp | null;
  external_post_url?: string;    // Link to live post (e.g., Instagram URL)
  
  // --- Engagement Metrics ---
  engagement?: {
    likes: number;
    shares: number;
    comments: number;
    views?: number;
    reach?: number;
    last_updated_at?: Timestamp; // When metrics were last fetched
  };
  
  // --- Approval Workflow ---
  approval?: {
    reviewed_by?: string;        // User ID
    reviewed_at?: Timestamp;
    feedback?: string;           // Reviewer comments
  };
  
  // --- Metadata ---
  metadata?: {
    campaign_id?: string;        // Future: Link to campaign
    hashtags?: string[];         // Extracted hashtags
    mentions?: string[];         // @mentions
    word_count?: number;
    character_count?: number;
    [key: string]: any;
  };
  
  // --- System Metadata ---
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: string;           // User ID or 'system'
}
```

### Example Document

```json
{
  "id": "content_abc123",
  "project_id": "proj_abc123",
  "team_instance_id": "team_1732345678901",
  "run_id": "run_1732345678901",
  "sub_agent_instance_id": "sa_creator_text_001",
  
  "type": "text",
  "platform": "instagram",
  
  "title": "Weekend Brunch Vibes",
  "body": "Spice up your weekend with our signature brunch menu! 🍳☕\n\nFresh ingredients, bold flavors, and the perfect ambiance to start your day right.\n\n#BrunchGoals #WeekendVibes #FoodieLife",
  "media_urls": [
    "gs://zynk-media/proj_abc123/brunch_photo_1.jpg"
  ],
  "thumbnail_url": "https://storage.googleapis.com/zynk-media/proj_abc123/brunch_photo_1_thumb.jpg",
  
  "status": "published",
  "scheduled_for": null,
  "published_at": "2025-11-29T10:00:00Z",
  "external_post_url": "https://instagram.com/p/abc123",
  
  "engagement": {
    "likes": 342,
    "shares": 12,
    "comments": 28,
    "views": 5420,
    "reach": 8200,
    "last_updated_at": "2025-11-29T16:00:00Z"
  },
  
  "approval": {
    "reviewed_by": "user_xyz789",
    "reviewed_at": "2025-11-29T09:45:00Z",
    "feedback": "Great caption! Approved for 10am publish."
  },
  
  "metadata": {
    "hashtags": ["#BrunchGoals", "#WeekendVibes", "#FoodieLife"],
    "word_count": 24,
    "character_count": 187
  },
  
  "created_at": "2025-11-29T04:30:03Z",
  "updated_at": "2025-11-29T16:00:00Z",
  "created_by": "system"
}
```

### UI Mapping (Mission Control - Generated Content)

**Query:**
```javascript
const contents = await db
  .collection('projects')
  .doc(projectId)
  .collection('generatedContents')
  .where('team_instance_id', '==', teamInstanceId)
  .orderBy('created_at', 'desc')
  .limit(20)
  .get();
```

**Card Rendering:**

| UI Element | Field(s) | Example |
|------------|----------|---------|
| **Thumbnail** | `thumbnail_url` or `media_urls[0]` | Image preview |
| **Title** | `title` | "Weekend Brunch Vibes" |
| **Status Badge** | `status` | "PUBLISHED" (green) |
| **Platform Icon** | `platform` | Instagram logo |
| **Engagement** | `engagement.likes`, `engagement.comments` | "342 ❤️ 28 💬" |
| **Timestamp** | `published_at` or `created_at` | "2 hours ago" |
| **Type Badge** | `type` | "Text", "Image", "Video" |

---

## Relationships

```
projects/{projectId}
  ├─ agentRuns
  │    ├─ → projectAgentTeamInstances (via team_instance_id)
  │    ├─ → SubAgentInstance (via sub_agent_instance_id)
  │    └─ → generatedContents (via output_ids)
  │
  └─ generatedContents
       ├─ → projectAgentTeamInstances (via team_instance_id)
       ├─ → agentRuns (via run_id)
       └─ → SubAgentInstance (via sub_agent_instance_id)
```

---

## Data Flow

### 1. Agent Execution

```javascript
// 1. Create AgentRun
const runId = `run_${Date.now()}`;
await db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).set({
  id: runId,
  project_id: projectId,
  team_instance_id: teamInstanceId,
  sub_agent_instance_id: subAgentId,
  status: 'running',
  task_type: 'create_text',
  prompt: 'Create Instagram caption...',
  started_at: firebase.firestore.FieldValue.serverTimestamp(),
  output_ids: [],
  created_at: firebase.firestore.FieldValue.serverTimestamp()
});

// 2. Execute agent logic
const result = await executeAgent(subAgentId, prompt);

// 3. Create GeneratedContent
const contentId = `content_${Date.now()}`;
await db.collection('projects').doc(projectId).collection('generatedContents').doc(contentId).set({
  id: contentId,
  project_id: projectId,
  team_instance_id: teamInstanceId,
  run_id: runId,
  type: 'text',
  platform: 'instagram',
  body: result.text,
  status: 'draft',
  created_at: firebase.firestore.FieldValue.serverTimestamp(),
  updated_at: firebase.firestore.FieldValue.serverTimestamp()
});

// 4. Update AgentRun with output
await db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).update({
  status: 'success',
  completed_at: firebase.firestore.FieldValue.serverTimestamp(),
  duration_ms: Date.now() - startTime,
  output_ids: [contentId]
});

// 5. Update SubAgentInstance metrics
await updateSubAgentMetrics(teamInstanceId, subAgentId, {
  success: true,
  latency_ms: result.latency
});
```

---

## Indexing Recommendations

### AgentRuns Indexes

```javascript
// For Recent Runs panel (by team)
{
  collection: 'agentRuns',
  collectionGroup: false,
  fields: [
    { fieldPath: 'project_id', order: 'ASCENDING' },
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'started_at', order: 'DESCENDING' }
  ]
}

// For filtering by status
{
  collection: 'agentRuns',
  collectionGroup: false,
  fields: [
    { fieldPath: 'project_id', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'started_at', order: 'DESCENDING' }
  ]
}

// For sub-agent performance tracking
{
  collection: 'agentRuns',
  collectionGroup: false,
  fields: [
    { fieldPath: 'project_id', order: 'ASCENDING' },
    { fieldPath: 'sub_agent_instance_id', order: 'ASCENDING' },
    { fieldPath: 'started_at', order: 'DESCENDING' }
  ]
}
```

### GeneratedContents Indexes

```javascript
// For Generated Content panel (by team)
{
  collection: 'generatedContents',
  collectionGroup: false,
  fields: [
    { fieldPath: 'project_id', order: 'ASCENDING' },
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'created_at', order: 'DESCENDING' }
  ]
}

// For filtering by status
{
  collection: 'generatedContents',
  collectionGroup: false,
  fields: [
    { fieldPath: 'project_id', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'created_at', order: 'DESCENDING' }
  ]
}

// For pending approval queue
{
  collection: 'generatedContents',
  collectionGroup: false,
  fields: [
    { fieldPath: 'project_id', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'created_at', order: 'ASCENDING' }
  ]
}

// For scheduled content
{
  collection: 'generatedContents',
  collectionGroup: false,
  fields: [
    { fieldPath: 'project_id', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'scheduled_for', order: 'ASCENDING' }
  ]
}
```

---

## Security Rules

```javascript
// AgentRuns
match /projects/{projectId}/agentRuns/{runId} {
  allow read: if isProjectMember(projectId);
  allow create: if isProjectMember(projectId);
  allow update: if isProjectMember(projectId);
  allow delete: if isProjectAdmin(projectId);
}

// GeneratedContents
match /projects/{projectId}/generatedContents/{contentId} {
  allow read: if isProjectMember(projectId);
  allow create: if isProjectMember(projectId);
  allow update: if isProjectMember(projectId) &&
    // Prevent changing published content's core fields
    (resource.data.status != 'published' || 
     request.resource.data.diff(resource.data).affectedKeys()
       .hasOnly(['engagement', 'updated_at']));
  allow delete: if isProjectAdmin(projectId);
}

// Helper functions
function isProjectMember(projectId) {
  return request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.members;
}

function isProjectAdmin(projectId) {
  return request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.admins;
}
```

---

## Lifecycle Management

### AgentRuns Retention

**Strategy**: Keep recent runs, archive old ones

```javascript
// Cloud Function: Archive runs older than 90 days
exports.archiveOldRuns = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    const snapshot = await admin.firestore()
      .collectionGroup('agentRuns')
      .where('started_at', '<', cutoffDate)
      .limit(500)
      .get();
    
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
      // Move to archive collection or delete
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  });
```

### GeneratedContents Retention

**Strategy**: Keep all published content, archive rejected/old drafts

```javascript
// Cloud Function: Clean up old drafts
exports.cleanupOldDrafts = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const snapshot = await admin.firestore()
      .collectionGroup('generatedContents')
      .where('status', 'in', ['draft', 'rejected'])
      .where('created_at', '<', cutoffDate)
      .limit(500)
      .get();
    
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  });
```

---

## Engagement Tracking

### Update Engagement Metrics

```javascript
/**
 * Fetch and update engagement metrics for published content
 * Run via Cloud Function every hour
 */
exports.updateEngagementMetrics = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const snapshot = await admin.firestore()
      .collectionGroup('generatedContents')
      .where('status', '==', 'published')
      .where('external_post_url', '!=', null)
      .get();
    
    for (const doc of snapshot.docs) {
      const content = doc.data();
      
      // Fetch engagement from platform API
      const engagement = await fetchEngagementFromPlatform(
        content.platform,
        content.external_post_url
      );
      
      await doc.ref.update({
        'engagement.likes': engagement.likes,
        'engagement.shares': engagement.shares,
        'engagement.comments': engagement.comments,
        'engagement.views': engagement.views,
        'engagement.reach': engagement.reach,
        'engagement.last_updated_at': admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });
```

---

## Future Extensions

### Campaign Integration

```typescript
// Add to AgentRun.metadata
metadata: {
  campaign_id: string;       // Link to campaigns collection
  campaign_phase: string;    // 'awareness' | 'consideration' | 'conversion'
}

// Add to GeneratedContent.metadata
metadata: {
  campaign_id: string;
  campaign_goal: string;     // 'engagement' | 'reach' | 'conversions'
}
```

### A/B Testing

```typescript
// Add to GeneratedContent
ab_test?: {
  variant_id: string;        // 'A' | 'B' | 'C'
  test_group_id: string;     // Link to test group
  performance_score?: number; // Calculated performance
}
```

### Content Versioning

```typescript
// Add to GeneratedContent
version_history?: Array<{
  version: number;
  body: string;
  updated_at: Timestamp;
  updated_by: string;
}>;
```

---

## References

- [Firestore Schema v1.1](./firestore-schema.md)
- [SubAgentInstance Design](./subagent-instance-design.md)
- [Schema v1.1 Summary](./schema-v1.1-summary.md)

---

**Document Owner**: Data Architecture Team  
**Review Date**: 2025-11-29  
**Status**: Ready for Implementation
