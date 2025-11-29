# Mission Control View History - Implementation Checklist

**Date**: 2025-11-29  
**Status**: Ready for Integration

---

## ✅ Completed Tasks

### 1. Firestore Schema Updates

- [x] **`projectAgentTeamInstances`** - Added `quota_mode` field
- [x] **`SubAgentInstance`** - Added quota fields to metrics:
  - `metrics.daily_actions_completed`
  - `metrics.daily_actions_quota`
- [x] **`SubAgentInstance`** - Added engagement fields at root level:
  - `likes_count`
  - `rating_avg`
  - `rating_count`
- [x] **`AgentRun`** - Added quota management fields:
  - `status: 'blocked_quota'`
  - `quota_snapshot`
  - `block_reason`
  - `sub_agent_role_name`
  - `task_prompt`
  - `output_summary`
  - `generated_content_ids`
  - `token_usage`
- [x] **`GeneratedContent`** - Added platform integration fields:
  - `channel_profile_id`
  - `external_post_id`
  - `preview_text`
  - `preview_image_url`
  - `status: 'publishing' | 'failed'`

### 2. Composite Indexes Created

- [x] **Index 1**: `agentRuns` by team
  ```javascript
  {
    collection: 'projects/{projectId}/agentRuns',
    fields: [
      { fieldPath: 'team_instance_id', order: 'ASCENDING' },
      { fieldPath: 'started_at', order: 'DESCENDING' }
    ]
  }
  ```

- [x] **Index 2**: `generatedContents` by team
  ```javascript
  {
    collection: 'projects/{projectId}/generatedContents',
    fields: [
      { fieldPath: 'team_instance_id', order: 'ASCENDING' },
      { fieldPath: 'created_at', order: 'DESCENDING' }
    ]
  }
  ```

- [x] **Index 3**: `generatedContents` by run
  ```javascript
  {
    collection: 'projects/{projectId}/generatedContents',
    fields: [
      { fieldPath: 'run_id', order: 'ASCENDING' },
      { fieldPath: 'created_at', order: 'DESCENDING' }
    ]
  }
  ```

### 3. Frontend Implementation

- [x] **JavaScript Module**: `mission-control-view-history.js`
  - `openViewHistory(projectId, teamId)` - Main entry point
  - `closeViewHistory()` - Cleanup function
  - `selectRun(runId)` - Filter content by run
  - Real-time Firestore listeners for all 3 panels
  - Proper cleanup on unmount

---

## 🔧 Next Steps for Integration

### Step 1: Add Indexes to Firestore

Run the following commands in Firebase Console or use the Firebase CLI:

```bash
# Navigate to Firestore > Indexes > Composite
# Add the 3 indexes listed above
```

Or use `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "agentRuns",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "team_instance_id", "order": "ASCENDING" },
        { "fieldPath": "started_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "generatedContents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "team_instance_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "generatedContents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "run_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Step 2: Update Mission Control HTML

Add the required container elements:

```html
<!-- Left Panel: Assigned Agent Team -->
<div id="assigned-agent-team-panel">
  <h3>Assigned Agent Team</h3>
  <div id="assigned-agent-team-list"></div>
</div>

<!-- Center Panel: Recent Runs -->
<div id="recent-runs-panel">
  <h3>Recent Runs</h3>
  <div id="recent-runs-list"></div>
</div>

<!-- Right Panel: Generated Content -->
<div id="generated-content-panel">
  <h3>Generated Content</h3>
  <div id="generated-content-list"></div>
</div>
```

### Step 3: Add Script to Mission Control Page

```html
<script src="mission-control-view-history.js"></script>
```

### Step 4: Wire Up View History Button

In your Agent Swarm card template:

```html
<button class="view-history-btn" 
        onclick="openViewHistory('${projectId}', '${teamId}')">
  View History
</button>
```

### Step 5: Add CSS Styles

Create styles for the new components:

```css
/* Sub-Agent Cards */
.sub-agent-card {
  padding: 16px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  margin-bottom: 12px;
}

.sub-agent-card.status-active {
  border-left: 3px solid #16e0bd;
}

.sub-agent-card.status-inactive {
  opacity: 0.6;
}

/* Run Cards */
.run-card {
  padding: 16px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.run-card:hover {
  background: rgba(255,255,255,0.08);
}

.run-card.selected {
  border: 2px solid #16e0bd;
}

.status-success {
  color: #10b981;
}

.status-failed {
  color: #ef4444;
}

.status-blocked {
  color: #f59e0b;
}

/* Content Cards */
.content-card {
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.content-image img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.btn-view-external {
  background: #16e0bd;
  color: #0a0e27;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.not-published {
  color: rgba(255,255,255,0.5);
  font-size: 13px;
}
```

---

## 🚀 Backend Implementation (executeAgentTask)

### Quota Check & Run Recording Logic

```javascript
async function executeAgentTask(projectId, teamId, subAgentId, taskPrompt, payload) {
  const runId = `run_${Date.now()}`;
  
  try {
    // 1. Fetch quota data
    const teamDoc = await db.collection('projectAgentTeamInstances').doc(teamId).get();
    const subAgentDoc = await db.collection('projectAgentTeamInstances')
      .doc(teamId)
      .collection('subAgents')
      .doc(subAgentId)
      .get();
    
    const teamData = teamDoc.data();
    const subAgentData = subAgentDoc.data();
    
    const teamQuota = teamData.metrics?.daily_actions_quota || 15;
    const teamCompleted = teamData.metrics?.daily_actions_completed || 0;
    const subAgentQuota = subAgentData.metrics?.daily_actions_quota || 10;
    const subAgentCompleted = subAgentData.metrics?.daily_actions_completed || 0;
    
    // 2. Check quota
    if (teamCompleted >= teamQuota) {
      // Create blocked run
      await db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).set({
        id: runId,
        project_id: projectId,
        team_instance_id: teamId,
        sub_agent_instance_id: subAgentId,
        sub_agent_role_name: subAgentData.role_name,
        status: 'blocked_quota',
        task_prompt: taskPrompt,
        started_at: firebase.firestore.FieldValue.serverTimestamp(),
        generated_content_ids: [],
        quota_snapshot: {
          team_daily_actions_completed: teamCompleted,
          team_daily_actions_quota: teamQuota,
          subagent_daily_actions_completed: subAgentCompleted,
          subagent_daily_actions_quota: subAgentQuota
        },
        block_reason: 'team_quota_exceeded',
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      throw new Error('Team quota exceeded');
    }
    
    if (subAgentCompleted >= subAgentQuota) {
      // Create blocked run
      await db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).set({
        id: runId,
        project_id: projectId,
        team_instance_id: teamId,
        sub_agent_instance_id: subAgentId,
        sub_agent_role_name: subAgentData.role_name,
        status: 'blocked_quota',
        task_prompt: taskPrompt,
        started_at: firebase.firestore.FieldValue.serverTimestamp(),
        generated_content_ids: [],
        quota_snapshot: {
          team_daily_actions_completed: teamCompleted,
          team_daily_actions_quota: teamQuota,
          subagent_daily_actions_completed: subAgentCompleted,
          subagent_daily_actions_quota: subAgentQuota
        },
        block_reason: 'subagent_quota_exceeded',
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      throw new Error('Sub-agent quota exceeded');
    }
    
    // 3. Create running status
    const startTime = Date.now();
    await db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).set({
      id: runId,
      project_id: projectId,
      team_instance_id: teamId,
      sub_agent_instance_id: subAgentId,
      sub_agent_role_name: subAgentData.role_name,
      status: 'running',
      task_prompt: taskPrompt,
      started_at: firebase.firestore.FieldValue.serverTimestamp(),
      generated_content_ids: [],
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // 4. Execute LLM/Agent
    const result = await executeLLM(payload);
    
    // 5. Create GeneratedContent
    const contentId = `content_${Date.now()}`;
    await db.collection('projects').doc(projectId).collection('generatedContents').doc(contentId).set({
      id: contentId,
      project_id: projectId,
      team_instance_id: teamId,
      sub_agent_instance_id: subAgentId,
      run_id: runId,
      type: 'text',
      platform: teamData.platform || 'instagram',
      channel_profile_id: teamData.channelId,
      title: result.title,
      preview_text: result.text,
      preview_image_url: result.imageUrl,
      status: 'draft',
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // 6. Update run to success
    const endTime = Date.now();
    await db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).update({
      status: 'success',
      completed_at: firebase.firestore.FieldValue.serverTimestamp(),
      duration_ms: endTime - startTime,
      generated_content_ids: [contentId],
      output_summary: result.summary,
      token_usage: {
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        cost_usd: result.cost
      }
    });
    
    // 7. Update metrics
    await db.collection('projectAgentTeamInstances').doc(teamId).update({
      'metrics.daily_actions_completed': firebase.firestore.FieldValue.increment(1),
      'metrics.total_runs': firebase.firestore.FieldValue.increment(1),
      'metrics.last_run_at': firebase.firestore.FieldValue.serverTimestamp()
    });
    
    await db.collection('projectAgentTeamInstances')
      .doc(teamId)
      .collection('subAgents')
      .doc(subAgentId)
      .update({
        'metrics.daily_actions_completed': firebase.firestore.FieldValue.increment(1),
        'metrics.total_runs': firebase.firestore.FieldValue.increment(1),
        'metrics.last_active_at': firebase.firestore.FieldValue.serverTimestamp()
      });
    
    return { success: true, runId, contentId };
    
  } catch (error) {
    // Update run to failed
    await db.collection('projects').doc(projectId).collection('agentRuns').doc(runId).update({
      status: 'failed',
      completed_at: firebase.firestore.FieldValue.serverTimestamp(),
      error_message: error.message
    });
    
    throw error;
  }
}
```

---

## 📋 Testing Checklist

- [ ] Create test data in Firestore
  - [ ] Add sample `AgentRun` documents
  - [ ] Add sample `GeneratedContent` documents
  - [ ] Ensure `team_instance_id` and `run_id` links are correct
- [ ] Test View History button click
  - [ ] Verify all 3 panels load
  - [ ] Check Firestore queries in console
- [ ] Test run selection
  - [ ] Click a run card
  - [ ] Verify Generated Content panel filters correctly
- [ ] Test quota blocking
  - [ ] Set quota to 0
  - [ ] Trigger task execution
  - [ ] Verify `blocked_quota` run appears
- [ ] Test external links
  - [ ] Add `external_post_url` to content
  - [ ] Verify "View on Platform" button works

---

## 📚 Documentation

- [x] Updated `firestore-schema.md`
- [x] Created `mission-control-view-history-spec.md`
- [x] Updated `README.md` index
- [x] Created implementation checklist (this file)

---

**Status**: ✅ Ready for Integration  
**Next Action**: Add Firestore indexes and integrate JavaScript module
