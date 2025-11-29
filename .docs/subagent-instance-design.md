# SubAgentInstance Subcollection Design

**Version**: 1.1  
**Date**: 2025-11-29  
**Status**: Design Approved

---

## Overview

This document defines the `SubAgentInstance` subcollection structure for `projectAgentTeamInstances`. Each deployed agent team contains multiple sub-agent instances that power the "Active Sub-Agents" column in Mission Control.

---

## Collection Path

```
projectAgentTeamInstances/{teamId}/subAgents/{subAgentId}
```

**Example:**
```
projectAgentTeamInstances/team_1732345678901/subAgents/sa_planner_001
```

---

## TypeScript Interface

```typescript
export type SubAgentInstanceStatus = 'active' | 'paused' | 'disabled' | 'error';
export type AutonomyMode = 'autonomous' | 'assisted' | 'manual';

/**
 * Represents a deployed sub-agent instance within an agent team.
 * Path: projectAgentTeamInstances/{teamId}/subAgents/{subAgentId}
 */
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
  
  // --- Runtime Configuration Overrides ---
  // These override the template defaults for this specific instance
  runtime_overrides?: {
    runtime_profile_id?: string;      // Override template's runtime_profile_id
    temperature?: number;             // Override config.temperature
    max_tokens?: number;              // Override config.maxTokens
    system_prompt_append?: string;    // Additional prompt instructions
  };
  
  // --- Metrics (Mission Control UI) ---
  metrics?: {
    last_active_at?: Timestamp | null;  // Last execution time
    success_rate: number;               // 0–100 (e.g., 98)
    total_runs: number;                 // Total executions
    avg_latency_ms?: number;            // Average response time
    avg_tokens_per_run?: number;        // Average token usage
    
    // Engagement
    total_likes: number;                // Cumulative likes
    rating_average: number;             // 0.0–5.0
    rating_count: number;               // Number of ratings
  };
  
  // --- System Metadata ---
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by?: string;           // User ID who created this instance
}
```

---

## Example Document

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

---

## Initialization Flow

### When a Team is Deployed

**Trigger:** User deploys an `agentSetTemplate` to a `channelProfile`

**Steps:**

1. **Create `projectAgentTeamInstances` document**
   ```javascript
   const teamInstanceId = `team_${Date.now()}`;
   await db.collection('projectAgentTeamInstances').doc(teamInstanceId).set({
     id: teamInstanceId,
     projectId: projectId,
     channelId: channelId,
     templateId: templateId,
     // ... other fields
   });
   ```

2. **Fetch the `agentSetTemplate`**
   ```javascript
   const templateDoc = await db.collection('agentSetTemplates').doc(templateId).get();
   const template = templateDoc.data();
   const roles = template.roles; // Array of role definitions
   ```

3. **For each role, create a `SubAgentInstance`**
   ```javascript
   const batch = db.batch();
   
   roles.forEach((role, index) => {
     const subAgentId = `sa_${role.type}_${String(index).padStart(3, '0')}`;
     const subAgentRef = db
       .collection('projectAgentTeamInstances')
       .doc(teamInstanceId)
       .collection('subAgents')
       .doc(subAgentId);
     
     batch.set(subAgentRef, {
       id: subAgentId,
       project_id: projectId,
       team_instance_id: teamInstanceId,
       template_id: role.defaultTemplateId,
       
       role_name: role.name,
       role_type: role.type,
       display_order: index,
       description: `${role.name} - ${role.type} engine`,
       
       channel_adapter_id: null, // Resolved later if needed
       
       status: 'active',
       autonomy_mode: 'autonomous',
       
       runtime_overrides: {},
       
       metrics: {
         last_active_at: null,
         success_rate: 0,
         total_runs: 0,
         avg_latency_ms: 0,
         avg_tokens_per_run: 0,
         total_likes: 0,
         rating_average: 0,
         rating_count: 0
       },
       
       created_at: firebase.firestore.FieldValue.serverTimestamp(),
       updated_at: firebase.firestore.FieldValue.serverTimestamp(),
       created_by: currentUser.uid
     });
   });
   
   await batch.commit();
   ```

4. **Resolve Channel Adapters (Optional)**
   ```javascript
   // For each sub-agent, check if a channel adapter exists
   const channelProfile = await db.collection('channelProfiles').doc(channelId).get();
   const platform = channelProfile.data().platform; // e.g., 'instagram'
   
   for (const role of roles) {
     const adapterSnapshot = await db.collection('subAgentChannelAdapters')
       .where('subAgentTemplateId', '==', role.defaultTemplateId)
       .where('channelId', '==', platform)
       .where('enabled', '==', true)
       .limit(1)
       .get();
     
     if (!adapterSnapshot.empty) {
       const adapterId = adapterSnapshot.docs[0].id;
       const subAgentId = `sa_${role.type}_${String(roles.indexOf(role)).padStart(3, '0')}`;
       
       await db
         .collection('projectAgentTeamInstances')
         .doc(teamInstanceId)
         .collection('subAgents')
         .doc(subAgentId)
         .update({
           channel_adapter_id: adapterId,
           updated_at: firebase.firestore.FieldValue.serverTimestamp()
         });
     }
   }
   ```

---

## UI Mapping (Mission Control)

### Active Sub-Agents Column (Left)

**Query:**
```javascript
const subAgents = await db
  .collection('projectAgentTeamInstances')
  .doc(teamInstanceId)
  .collection('subAgents')
  .orderBy('display_order', 'asc')
  .get();
```

**Card Rendering:**

| UI Element | Field(s) | Example |
|------------|----------|---------|
| **Name** | `role_name` | "TrendHunter" |
| **Role Badge** | `role_type` | "Planner" (with icon 🎯) |
| **Status Indicator** | `status` | Green dot for "active" |
| **Success Rate** | `metrics.success_rate` | "98% SR" |
| **Last Active** | `metrics.last_active_at` | "Last active 10m ago" |
| **Total Runs** | `metrics.total_runs` | "247 runs" |

**Example Card HTML:**
```html
<div class="sub-agent-card" data-id="${subAgent.id}">
  <div class="sub-agent-header">
    <span class="role-icon">${getEngineIcon(subAgent.role_type)}</span>
    <div class="sub-agent-info">
      <h4>${subAgent.role_name}</h4>
      <span class="role-badge">${subAgent.role_type}</span>
    </div>
    <span class="status-dot ${subAgent.status}"></span>
  </div>
  
  <div class="sub-agent-metrics">
    <div class="metric">
      <span class="metric-label">Success Rate</span>
      <span class="metric-value">${subAgent.metrics.success_rate}% SR</span>
    </div>
    <div class="metric">
      <span class="metric-label">Last Active</span>
      <span class="metric-value">${formatRelativeTime(subAgent.metrics.last_active_at)}</span>
    </div>
  </div>
</div>
```

---

## Configuration Resolution

When a sub-agent executes, its configuration is resolved in this order (highest priority first):

1. **Instance-level overrides** (`runtime_overrides`)
2. **Channel adapter** (via `channel_adapter_id` → `subAgentChannelAdapters`)
3. **Template defaults** (via `template_id` → `subAgentTemplates`)

### Example Resolution

**Template (`tpl_planner_v1_0_0`):**
```json
{
  "system_prompt": "You are a strategic planner.",
  "runtime_profile_id": "rtp_chat_balanced_v1",
  "config": {
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

**Channel Adapter (`adapter_instagram_planner`):**
```json
{
  "promptOverrides": "Focus on visual storytelling for Instagram."
}
```

**Instance Override:**
```json
{
  "runtime_overrides": {
    "temperature": 0.8,
    "max_tokens": 3000
  }
}
```

**Final Resolved Configuration:**
```json
{
  "system_prompt": "You are a strategic planner. Focus on visual storytelling for Instagram.",
  "runtime_profile_id": "rtp_chat_balanced_v1",
  "temperature": 0.8,        // From instance override
  "maxTokens": 3000          // From instance override
}
```

---

## Update Patterns

### After Sub-Agent Execution

```javascript
await db
  .collection('projectAgentTeamInstances')
  .doc(teamInstanceId)
  .collection('subAgents')
  .doc(subAgentId)
  .update({
    'metrics.last_active_at': firebase.firestore.FieldValue.serverTimestamp(),
    'metrics.total_runs': firebase.firestore.FieldValue.increment(1),
    'metrics.success_rate': calculateSuccessRate(recentRuns),
    'metrics.avg_latency_ms': calculateAvgLatency(recentRuns),
    'metrics.avg_tokens_per_run': calculateAvgTokens(recentRuns),
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  });
```

### Change Autonomy Mode

```javascript
await db
  .collection('projectAgentTeamInstances')
  .doc(teamInstanceId)
  .collection('subAgents')
  .doc(subAgentId)
  .update({
    autonomy_mode: 'manual',
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  });
```

### Apply Runtime Override

```javascript
await db
  .collection('projectAgentTeamInstances')
  .doc(teamInstanceId)
  .collection('subAgents')
  .doc(subAgentId)
  .update({
    'runtime_overrides.temperature': 0.9,
    'runtime_overrides.system_prompt_append': 'Be more creative.',
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  });
```

---

## Relationships

```
projectAgentTeamInstances/{teamId}
  └─ subAgents/{subAgentId}  (subcollection)
       ├─ → subAgentTemplates (via template_id)
       ├─ → subAgentChannelAdapters (via channel_adapter_id)
       └─ → projects/{projectId}/runtimeProfiles (via runtime_overrides.runtime_profile_id)
```

---

## Security Rules

```javascript
match /projectAgentTeamInstances/{teamId}/subAgents/{subAgentId} {
  // Read: If user has access to parent team's project
  allow read: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(
      get(/databases/$(database)/documents/projectAgentTeamInstances/$(teamId)).data.projectId
    )).data.members;
  
  // Write: If user has access to parent team's project
  allow create, update: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(
      get(/databases/$(database)/documents/projectAgentTeamInstances/$(teamId)).data.projectId
    )).data.members;
  
  // Delete: Only admins
  allow delete: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/projects/$(
      get(/databases/$(database)/documents/projectAgentTeamInstances/$(teamId)).data.projectId
    )).data.admins;
}
```

---

## Indexing Recommendations

```javascript
// For ordering sub-agents in UI
{
  collection: 'subAgents',
  collectionGroup: false,
  fields: [
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'display_order', order: 'ASCENDING' }
  ]
}

// For filtering by status
{
  collection: 'subAgents',
  collectionGroup: false,
  fields: [
    { fieldPath: 'team_instance_id', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'display_order', order: 'ASCENDING' }
  ]
}

// For collection group queries (across all teams)
{
  collection: 'subAgents',
  collectionGroup: true,
  fields: [
    { fieldPath: 'project_id', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' }
  ]
}
```

---

## Migration Strategy

### For Existing Teams

If teams were deployed before this schema:

**Option 1: Lazy Initialization**
- Create subcollection on first access
- UI shows "Initializing..." state

**Option 2: Batch Migration**
```javascript
async function migrateTeamToSubAgents(teamInstanceId) {
  const teamDoc = await db.collection('projectAgentTeamInstances').doc(teamInstanceId).get();
  const team = teamDoc.data();
  
  // Fetch template
  const templateDoc = await db.collection('agentSetTemplates').doc(team.templateId).get();
  const template = templateDoc.data();
  
  // Create sub-agents
  const batch = db.batch();
  template.roles.forEach((role, index) => {
    const subAgentId = `sa_${role.type}_${String(index).padStart(3, '0')}`;
    const ref = db
      .collection('projectAgentTeamInstances')
      .doc(teamInstanceId)
      .collection('subAgents')
      .doc(subAgentId);
    
    batch.set(ref, {
      id: subAgentId,
      project_id: team.projectId,
      team_instance_id: teamInstanceId,
      template_id: role.defaultTemplateId,
      role_name: role.name,
      role_type: role.type,
      display_order: index,
      status: 'active',
      autonomy_mode: 'autonomous',
      metrics: {
        last_active_at: null,
        success_rate: 0,
        total_runs: 0,
        total_likes: 0,
        rating_average: 0,
        rating_count: 0
      },
      created_at: team.deployedAt || firebase.firestore.FieldValue.serverTimestamp(),
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
  
  await batch.commit();
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Validate schema with all required fields
- [ ] Validate schema with optional fields missing
- [ ] Test configuration resolution (template → adapter → override)
- [ ] Test metric calculations

### Integration Tests
- [ ] Create team with sub-agents
- [ ] Query sub-agents by team
- [ ] Update sub-agent metrics
- [ ] Apply runtime overrides
- [ ] Delete team (cascade delete sub-agents)

### UI Tests
- [ ] Render sub-agent list
- [ ] Display metrics correctly
- [ ] Show last active time (relative format)
- [ ] Handle missing metrics gracefully

---

## Performance Considerations

### Read Optimization
- **Subcollection query**: Single query per team
- **Ordering**: Use `display_order` for consistent UI
- **Limit**: Typically 3-10 sub-agents per team (small dataset)

### Write Optimization
- **Batch creation**: Use batched writes on deployment
- **Field updates**: Update only changed fields
- **Metrics**: Use `FieldValue.increment()` for counters

### Caching Strategy
- Cache sub-agent list per team (5-minute TTL)
- Invalidate on status/metric updates
- Real-time listeners for active teams

---

## References

- [Firestore Schema v1.1](./firestore-schema.md)
- [Schema Refinement v1.1](./schema-refinement-v1.1.md)
- [Data Architecture - Agent Team](./data-architecture-agent-team.md)

---

**Document Owner**: Data Architecture Team  
**Review Date**: 2025-11-29  
**Status**: Ready for Implementation
