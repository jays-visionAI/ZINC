# SubAgentInstance Implementation Guide

**Quick Reference for Developers**  
**Version**: 1.1  
**Date**: 2025-11-29

---

## Quick Start

### 1. Deploy Team with Sub-Agents

```javascript
/**
 * Deploy an agent team and create sub-agent instances
 * @param {string} projectId - Project ID
 * @param {string} channelId - Channel profile ID
 * @param {string} templateId - Agent set template ID
 * @param {Object} currentUser - Firebase auth user
 */
async function deployAgentTeam(projectId, channelId, templateId, currentUser) {
  // 1. Create team instance
  const teamInstanceId = `team_${Date.now()}`;
  const teamRef = db.collection('projectAgentTeamInstances').doc(teamInstanceId);
  
  await teamRef.set({
    id: teamInstanceId,
    projectId: projectId,
    channelId: channelId,
    templateId: templateId,
    name: `${channelName} Team`,
    status: 'active',
    deployedAt: firebase.firestore.FieldValue.serverTimestamp(),
    deployedBy: currentUser.uid,
    platform: channelPlatform, // e.g., 'instagram'
    
    // Mission Control fields
    active_directive: {
      title: 'ACTIVE DIRECTIVE',
      summary: 'Team deployed. Initializing agents...',
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
    tags: [channelPlatform, 'new-deployment'],
    created_at: firebase.firestore.FieldValue.serverTimestamp(),
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  // 2. Fetch template
  const templateDoc = await db.collection('agentSetTemplates').doc(templateId).get();
  const template = templateDoc.data();
  
  // 3. Create sub-agents
  const batch = db.batch();
  
  template.roles.forEach((role, index) => {
    const subAgentId = `sa_${role.type}_${String(index).padStart(3, '0')}`;
    const subAgentRef = teamRef.collection('subAgents').doc(subAgentId);
    
    batch.set(subAgentRef, {
      id: subAgentId,
      project_id: projectId,
      team_instance_id: teamInstanceId,
      template_id: role.defaultTemplateId,
      
      role_name: role.name,
      role_type: role.type,
      display_order: index,
      description: `${role.name} - ${role.type} engine`,
      
      status: 'active',
      autonomy_mode: 'autonomous',
      
      metrics: {
        last_active_at: null,
        success_rate: 0,
        total_runs: 0,
        avg_latency_ms: 0,
        avg_tokens_per_run: 0
      },
      
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      created_by: currentUser.uid
    });
  });
  
  await batch.commit();
  
  return teamInstanceId;
}
```

---

### 2. Load Sub-Agents for Mission Control

```javascript
/**
 * Load sub-agents for a team instance
 * @param {string} teamInstanceId - Team instance ID
 * @returns {Promise<Array>} Array of sub-agent instances
 */
async function loadSubAgents(teamInstanceId) {
  const snapshot = await db
    .collection('projectAgentTeamInstances')
    .doc(teamInstanceId)
    .collection('subAgents')
    .orderBy('display_order', 'asc')
    .get();
  
  const subAgents = [];
  snapshot.forEach(doc => {
    subAgents.push({ id: doc.id, ...doc.data() });
  });
  
  return subAgents;
}
```

---

### 3. Render Sub-Agent Cards

```javascript
/**
 * Render sub-agent cards in Mission Control
 * @param {Array} subAgents - Array of sub-agent instances
 */
function renderSubAgentCards(subAgents) {
  const container = document.getElementById('sub-agents-list');
  
  const html = subAgents.map(agent => `
    <div class="sub-agent-card" data-id="${agent.id}">
      <div class="sub-agent-header">
        <span class="role-icon">${getEngineIcon(agent.role_type)}</span>
        <div class="sub-agent-info">
          <h4>${agent.role_name}</h4>
          <span class="role-badge">${formatRoleType(agent.role_type)}</span>
        </div>
        <span class="status-dot ${agent.status}"></span>
      </div>
      
      <div class="sub-agent-metrics">
        <div class="metric">
          <span class="metric-label">Success Rate</span>
          <span class="metric-value">${agent.metrics.success_rate.toFixed(1)}% SR</span>
        </div>
        <div class="metric">
          <span class="metric-label">Last Active</span>
          <span class="metric-value">${formatLastActive(agent.metrics.last_active_at)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Total Runs</span>
          <span class="metric-value">${agent.metrics.total_runs}</span>
        </div>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = html;
}

// Helper functions
function getEngineIcon(roleType) {
  const icons = {
    planner: '🎯',
    creator_text: '✍️',
    creator_image: '🎨',
    creator_video: '🎬',
    engagement: '💬',
    compliance: '⚖️',
    evaluator: '📊',
    manager: '👔',
    kpi: '📈'
  };
  return icons[roleType] || '🤖';
}

function formatRoleType(roleType) {
  const labels = {
    planner: 'Planner',
    creator_text: 'Creator.Text',
    creator_image: 'Creator.Image',
    creator_video: 'Creator.Video',
    engagement: 'Engagement',
    compliance: 'Compliance',
    evaluator: 'Evaluator',
    manager: 'Manager',
    kpi: 'KPI'
  };
  return labels[roleType] || roleType;
}

function formatLastActive(timestamp) {
  if (!timestamp) return 'Never';
  
  const now = Date.now();
  const then = timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime();
  const diff = now - then;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
```

---

### 4. Update Sub-Agent Metrics After Run

```javascript
/**
 * Update sub-agent metrics after execution
 * @param {string} teamInstanceId - Team instance ID
 * @param {string} subAgentId - Sub-agent ID
 * @param {Object} runResult - Execution result
 */
async function updateSubAgentMetrics(teamInstanceId, subAgentId, runResult) {
  const subAgentRef = db
    .collection('projectAgentTeamInstances')
    .doc(teamInstanceId)
    .collection('subAgents')
    .doc(subAgentId);
  
  // Fetch current metrics to calculate averages
  const doc = await subAgentRef.get();
  const current = doc.data();
  const currentMetrics = current.metrics || {};
  
  // Calculate new averages
  const newTotalRuns = (currentMetrics.total_runs || 0) + 1;
  const newAvgLatency = calculateNewAverage(
    currentMetrics.avg_latency_ms || 0,
    runResult.latency_ms,
    currentMetrics.total_runs || 0
  );
  const newAvgTokens = calculateNewAverage(
    currentMetrics.avg_tokens_per_run || 0,
    runResult.tokens_used,
    currentMetrics.total_runs || 0
  );
  
  // Calculate success rate (last 100 runs)
  const successRate = await calculateSuccessRate(teamInstanceId, subAgentId);
  
  await subAgentRef.update({
    'metrics.last_active_at': firebase.firestore.FieldValue.serverTimestamp(),
    'metrics.total_runs': firebase.firestore.FieldValue.increment(1),
    'metrics.success_rate': successRate,
    'metrics.avg_latency_ms': newAvgLatency,
    'metrics.avg_tokens_per_run': newAvgTokens,
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function calculateNewAverage(currentAvg, newValue, count) {
  return ((currentAvg * count) + newValue) / (count + 1);
}

async function calculateSuccessRate(teamInstanceId, subAgentId) {
  // This would query the agent_runs collection (future implementation)
  // For now, return a placeholder
  return 98.5;
}
```

---

### 5. Apply Runtime Overrides

```javascript
/**
 * Apply runtime configuration overrides to a sub-agent
 * @param {string} teamInstanceId - Team instance ID
 * @param {string} subAgentId - Sub-agent ID
 * @param {Object} overrides - Configuration overrides
 */
async function applyRuntimeOverrides(teamInstanceId, subAgentId, overrides) {
  const subAgentRef = db
    .collection('projectAgentTeamInstances')
    .doc(teamInstanceId)
    .collection('subAgents')
    .doc(subAgentId);
  
  const updateData = {
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  if (overrides.temperature !== undefined) {
    updateData['runtime_overrides.temperature'] = overrides.temperature;
  }
  if (overrides.max_tokens !== undefined) {
    updateData['runtime_overrides.max_tokens'] = overrides.max_tokens;
  }
  if (overrides.system_prompt_append !== undefined) {
    updateData['runtime_overrides.system_prompt_append'] = overrides.system_prompt_append;
  }
  if (overrides.runtime_profile_id !== undefined) {
    updateData['runtime_overrides.runtime_profile_id'] = overrides.runtime_profile_id;
  }
  
  await subAgentRef.update(updateData);
}
```

---

### 6. Resolve Sub-Agent Configuration

```javascript
/**
 * Resolve final configuration for a sub-agent
 * Merges template → adapter → instance overrides
 * @param {string} teamInstanceId - Team instance ID
 * @param {string} subAgentId - Sub-agent ID
 * @returns {Promise<Object>} Resolved configuration
 */
async function resolveSubAgentConfig(teamInstanceId, subAgentId) {
  // 1. Get sub-agent instance
  const instanceDoc = await db
    .collection('projectAgentTeamInstances')
    .doc(teamInstanceId)
    .collection('subAgents')
    .doc(subAgentId)
    .get();
  
  const instance = instanceDoc.data();
  
  // 2. Get template
  const templateDoc = await db
    .collection('subAgentTemplates')
    .doc(instance.template_id)
    .get();
  
  const template = templateDoc.data();
  
  // 3. Get channel adapter (if exists)
  let adapter = null;
  if (instance.channel_adapter_id) {
    const adapterDoc = await db
      .collection('subAgentChannelAdapters')
      .doc(instance.channel_adapter_id)
      .get();
    adapter = adapterDoc.data();
  }
  
  // 4. Merge configurations
  const config = {
    system_prompt: template.system_prompt,
    runtime_profile_id: template.runtime_profile_id,
    temperature: template.config.temperature,
    maxTokens: template.config.maxTokens
  };
  
  // Apply adapter overrides
  if (adapter && adapter.promptOverrides) {
    config.system_prompt += '\n\n' + adapter.promptOverrides;
  }
  
  // Apply instance overrides
  if (instance.runtime_overrides) {
    if (instance.runtime_overrides.runtime_profile_id) {
      config.runtime_profile_id = instance.runtime_overrides.runtime_profile_id;
    }
    if (instance.runtime_overrides.temperature !== undefined) {
      config.temperature = instance.runtime_overrides.temperature;
    }
    if (instance.runtime_overrides.max_tokens !== undefined) {
      config.maxTokens = instance.runtime_overrides.max_tokens;
    }
    if (instance.runtime_overrides.system_prompt_append) {
      config.system_prompt += '\n\n' + instance.runtime_overrides.system_prompt_append;
    }
  }
  
  return config;
}
```

---

## Common Queries

### Get All Sub-Agents for a Project

```javascript
const subAgents = await db
  .collectionGroup('subAgents')
  .where('project_id', '==', projectId)
  .where('status', '==', 'active')
  .get();
```

### Get Sub-Agents by Role Type

```javascript
const planners = await db
  .collection('projectAgentTeamInstances')
  .doc(teamInstanceId)
  .collection('subAgents')
  .where('role_type', '==', 'planner')
  .get();
```

### Get Most Active Sub-Agent

```javascript
const mostActive = await db
  .collection('projectAgentTeamInstances')
  .doc(teamInstanceId)
  .collection('subAgents')
  .orderBy('metrics.total_runs', 'desc')
  .limit(1)
  .get();
```

---

## Error Handling

```javascript
async function safeLoadSubAgents(teamInstanceId) {
  try {
    const subAgents = await loadSubAgents(teamInstanceId);
    return subAgents;
  } catch (error) {
    console.error('Error loading sub-agents:', error);
    
    // Return empty array with error flag
    return {
      error: true,
      message: error.message,
      subAgents: []
    };
  }
}
```

---

## Testing

### Unit Test Example

```javascript
describe('SubAgentInstance', () => {
  it('should create sub-agents on team deployment', async () => {
    const teamId = await deployAgentTeam(
      'test_project',
      'test_channel',
      'test_template',
      mockUser
    );
    
    const subAgents = await loadSubAgents(teamId);
    
    expect(subAgents).toHaveLength(3); // Assuming template has 3 roles
    expect(subAgents[0].role_type).toBe('planner');
    expect(subAgents[0].status).toBe('active');
    expect(subAgents[0].metrics.total_runs).toBe(0);
  });
  
  it('should update metrics after run', async () => {
    await updateSubAgentMetrics(teamId, subAgentId, {
      latency_ms: 1500,
      tokens_used: 1200,
      success: true
    });
    
    const doc = await db
      .collection('projectAgentTeamInstances')
      .doc(teamId)
      .collection('subAgents')
      .doc(subAgentId)
      .get();
    
    const metrics = doc.data().metrics;
    expect(metrics.total_runs).toBe(1);
    expect(metrics.avg_latency_ms).toBe(1500);
  });
});
```

---

## References

- [SubAgentInstance Design](./subagent-instance-design.md)
- [Firestore Schema v1.1](./firestore-schema.md)
- [Schema Refinement v1.1](./schema-refinement-v1.1.md)

---

**Last Updated**: 2025-11-29  
**Maintained By**: Data Architecture Team
