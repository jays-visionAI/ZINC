# ProjectAgentTeamInstance Schema Refinement Summary

**Date**: 2025-11-29  
**Version**: Schema v1.1  
**Status**: Approved

---

## Overview

This document summarizes the refinement of the `ProjectAgentTeamInstance` schema to support the Mission Control "Agent Swarm" UI requirements.

---

## Changes Made

### 1. Added Mission Control Fields

#### `active_directive` Object
**Purpose**: Powers the "ACTIVE DIRECTIVE" section on agent cards.

```typescript
active_directive?: {
  title: string;               // e.g., "ACTIVE DIRECTIVE"
  summary: string;             // e.g., "Autonomous mode active. Scanning ecosystem..."
  updated_at: Timestamp;       // When directive was last updated
}
```

**UI Usage:**
- Displayed prominently on each agent card
- Shows current team mode and focus
- Updated when team behavior changes

#### `metrics` Object
**Purpose**: Powers progress bars and statistics on agent cards.

```typescript
metrics?: {
  daily_actions_completed: number;  // Current daily action count
  daily_actions_quota: number;      // Daily action limit
  neural_sync_score: number;        // 0–100 performance score
  last_run_at?: Timestamp | null;   // Last execution time
  success_rate: number;             // 0–100 success percentage
  total_runs: number;               // Historical run count
}
```

**UI Usage:**
- **Daily Actions**: Progress bar showing "8/15"
- **Neural Sync**: Gradient progress bar showing "91%"
- **Last Run**: Relative time display (e.g., "2 hours ago")
- **Success Rate**: Tooltip or detail view
- **Total Runs**: Historical context

#### `tags` Array
**Purpose**: Categorization and search functionality.

```typescript
tags?: string[];  // e.g., ["instagram", "content-creation", "autonomous"]
```

**Usage:**
- Filtering in Mission Control
- Search optimization
- Analytics grouping

#### System Timestamps
**Purpose**: Track creation and modification times.

```typescript
created_at?: Timestamp;
updated_at?: Timestamp;
```

---

## Schema Comparison

### Before (v1.0)
```typescript
interface ProjectAgentTeamInstance {
  id: string;
  projectId: string;
  channelId: string;
  templateId: string;
  name: string;
  status: 'active' | 'inactive' | 'paused' | 'error';
  deployedAt: Timestamp;
  deployedBy: string;
  configProfileId?: string;
  engineVersionSet?: string;
  channel?: string;
  ruleProfileId?: string | null;
  platform?: 'x' | 'linkedin' | 'instagram' | 'tiktok' | 'youtube';
}
```

### After (v1.1)
```typescript
export type AgentTeamStatus = 'active' | 'inactive' | 'paused' | 'error';

interface ProjectAgentTeamInstance {
  // Identity & Relations (unchanged)
  id: string;
  projectId: string;
  channelId: string;
  templateId: string;
  name: string;
  status: AgentTeamStatus;
  
  // Deployment Info (unchanged)
  deployedAt: Timestamp;
  deployedBy: string;
  configProfileId?: string;
  engineVersionSet?: string;
  channel?: string;
  ruleProfileId?: string | null;
  platform?: 'x' | 'linkedin' | 'instagram' | 'tiktok' | 'youtube';
  
  // NEW: Mission Control Fields
  active_directive?: {
    title: string;
    summary: string;
    updated_at: Timestamp;
  };
  
  metrics?: {
    daily_actions_completed: number;
    daily_actions_quota: number;
    neural_sync_score: number;
    last_run_at?: Timestamp | null;
    success_rate: number;
    total_runs: number;
  };
  
  tags?: string[];
  created_at?: Timestamp;
  updated_at?: Timestamp;
}
```

---

## Migration Strategy

### Backward Compatibility
✅ **All new fields are optional** - Existing documents remain valid.

### For Existing Instances

**Option 1: Lazy Migration (Recommended)**
- New fields populate on first update
- No immediate migration required
- UI handles missing fields gracefully

**Option 2: Batch Migration**
```javascript
// Example migration script
const instances = await db.collection('projectAgentTeamInstances').get();

const batch = db.batch();
instances.forEach(doc => {
  const ref = db.collection('projectAgentTeamInstances').doc(doc.id);
  batch.update(ref, {
    active_directive: {
      title: 'ACTIVE DIRECTIVE',
      summary: 'Team deployed. Awaiting first run.',
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    },
    metrics: {
      daily_actions_completed: 0,
      daily_actions_quota: 15,
      neural_sync_score: 0,
      last_run_at: null,
      success_rate: 0,
      total_runs: 0
    },
    tags: [],
    created_at: doc.data().deployedAt || firebase.firestore.FieldValue.serverTimestamp(),
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  });
});

await batch.commit();
```

---

## Update Patterns

### When to Update Each Field

#### `active_directive`
**Trigger Events:**
- Team mode change (autonomous ↔ assisted ↔ manual)
- New instructions received
- Behavior pack update
- Manual override

**Update Frequency:** On-demand (event-driven)

#### `metrics.daily_actions_*`
**Trigger Events:**
- After each agent execution
- Daily quota reset (midnight UTC)

**Update Frequency:** Per execution + daily reset

#### `metrics.neural_sync_score`
**Trigger Events:**
- Periodic recalculation (e.g., hourly)
- Based on recent performance metrics

**Update Frequency:** Hourly or on-demand

#### `metrics.last_run_at`
**Trigger Events:**
- On run completion

**Update Frequency:** Per execution

#### `metrics.success_rate`
**Trigger Events:**
- Recalculated after each run
- Based on last N runs (e.g., 100)

**Update Frequency:** Per execution

#### `metrics.total_runs`
**Trigger Events:**
- Incremented on each run start

**Update Frequency:** Per execution

#### `updated_at`
**Trigger Events:**
- Any field modification

**Update Frequency:** On every update

---

## Example Update Operations

### Update After Agent Run
```javascript
await db.collection('projectAgentTeamInstances').doc(instanceId).update({
  'metrics.daily_actions_completed': firebase.firestore.FieldValue.increment(1),
  'metrics.total_runs': firebase.firestore.FieldValue.increment(1),
  'metrics.last_run_at': firebase.firestore.FieldValue.serverTimestamp(),
  'metrics.success_rate': calculateSuccessRate(recentRuns), // Custom function
  updated_at: firebase.firestore.FieldValue.serverTimestamp()
});
```

### Update Active Directive
```javascript
await db.collection('projectAgentTeamInstances').doc(instanceId).update({
  active_directive: {
    title: 'ACTIVE DIRECTIVE',
    summary: 'Switched to manual mode. Awaiting user instructions.',
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  },
  updated_at: firebase.firestore.FieldValue.serverTimestamp()
});
```

### Daily Quota Reset
```javascript
// Run via Cloud Function at midnight UTC
await db.collection('projectAgentTeamInstances')
  .where('status', '==', 'active')
  .get()
  .then(snapshot => {
    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        'metrics.daily_actions_completed': 0,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    return batch.commit();
  });
```

---

## UI Integration Checklist

### Mission Control Agent Card
- [x] Display team name (`name`)
- [x] Show platform icon (`platform`)
- [x] Render status badge (`status`)
- [x] Display active directive (`active_directive.summary`)
- [x] Show daily actions progress bar (`metrics.daily_actions_*`)
- [x] Show neural sync progress bar (`metrics.neural_sync_score`)
- [x] Display last run time (`metrics.last_run_at`)
- [x] Show success rate in tooltip (`metrics.success_rate`)
- [x] Display total runs (`metrics.total_runs`)

### Graceful Degradation
If fields are missing:
- **`active_directive`**: Show "No directive set"
- **`metrics`**: Show "0/0" or "N/A"
- **`tags`**: Empty array
- **`created_at`**: Fall back to `deployedAt`

---

## Performance Considerations

### Read Optimization
- All Mission Control card data in single document
- No additional queries needed for card rendering
- Efficient for dashboard with many teams

### Write Optimization
- Use field-level updates (not full document replacement)
- Batch updates when possible
- Use `FieldValue.increment()` for counters

### Index Recommendations
```javascript
// For filtering by status and sorting by update time
{
  collection: 'projectAgentTeamInstances',
  fields: [
    { fieldPath: 'projectId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'updated_at', order: 'DESCENDING' }
  ]
}

// For tag-based filtering
{
  collection: 'projectAgentTeamInstances',
  fields: [
    { fieldPath: 'projectId', order: 'ASCENDING' },
    { fieldPath: 'tags', arrayContains: true },
    { fieldPath: 'status', order: 'ASCENDING' }
  ]
}
```

---

## Security Rules Update

```javascript
match /projectAgentTeamInstances/{instanceId} {
  allow read: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.members;
  
  allow create: if request.auth != null &&
    request.resource.data.keys().hasAll(['id', 'projectId', 'channelId', 'templateId', 'name', 'status']);
  
  allow update: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.members &&
    // Prevent modification of core identity fields
    request.resource.data.id == resource.data.id &&
    request.resource.data.projectId == resource.data.projectId &&
    request.resource.data.channelId == resource.data.channelId;
  
  allow delete: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.admins;
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Validate schema with all required fields
- [ ] Validate schema with optional fields missing
- [ ] Test metric calculations (success_rate, neural_sync_score)
- [ ] Test timestamp handling

### Integration Tests
- [ ] Create instance with new schema
- [ ] Update metrics after run
- [ ] Update active directive
- [ ] Query by tags
- [ ] Filter by status and sort by updated_at

### UI Tests
- [ ] Render card with complete data
- [ ] Render card with missing optional fields
- [ ] Progress bars display correctly
- [ ] Timestamps format correctly (relative time)

---

## References

- [Firestore Schema Documentation v1.1](./firestore-schema.md)
- [Data Architecture - Agent Team](./data-architecture-agent-team.md)
- [ZYNK Agent OS PRD 5.0](../task.md)

---

**Document Owner**: Data Architecture Team  
**Approved By**: Backend Team, Frontend Team  
**Review Date**: 2025-11-29
