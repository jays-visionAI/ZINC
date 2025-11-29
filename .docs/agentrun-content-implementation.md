# AgentRun & GeneratedContent Implementation Guide

**Quick Reference for Developers**  
**Version**: 1.1  
**Date**: 2025-11-29

---

## Quick Start

### 1. Execute Agent and Create Run

```javascript
/**
 * Execute a sub-agent and track the run
 * @param {string} projectId - Project ID
 * @param {string} teamInstanceId - Team instance ID
 * @param {string} subAgentId - Sub-agent instance ID
 * @param {string} prompt - Task description
 * @returns {Promise<Object>} Run result with output IDs
 */
async function executeAgentWithTracking(projectId, teamInstanceId, subAgentId, prompt) {
  const startTime = Date.now();
  const runId = `run_${startTime}`;
  
  // 1. Create AgentRun document
  const runRef = db
    .collection('projects')
    .doc(projectId)
    .collection('agentRuns')
    .doc(runId);
  
  await runRef.set({
    id: runId,
    project_id: projectId,
    team_instance_id: teamInstanceId,
    sub_agent_instance_id: subAgentId,
    status: 'running',
    task_type: 'create_text', // or 'create_image', 'plan', etc.
    prompt: prompt,
    started_at: firebase.firestore.FieldValue.serverTimestamp(),
    output_ids: [],
    created_at: firebase.firestore.FieldValue.serverTimestamp(),
    created_by: 'system'
  });
  
  try {
    // 2. Resolve sub-agent configuration
    const config = await resolveSubAgentConfig(teamInstanceId, subAgentId);
    
    // 3. Execute agent
    const result = await callLLM(config, prompt);
    
    // 4. Create GeneratedContent
    const contentId = `content_${Date.now()}`;
    await createGeneratedContent(projectId, teamInstanceId, runId, result);
    
    // 5. Update AgentRun as success
    const duration = Date.now() - startTime;
    await runRef.update({
      status: 'success',
      completed_at: firebase.firestore.FieldValue.serverTimestamp(),
      duration_ms: duration,
      output_ids: [contentId],
      metrics: {
        tokens_used: result.tokens,
        latency_ms: result.latency,
        cost_usd: calculateCost(result.tokens, config.runtime_profile_id)
      }
    });
    
    // 6. Update sub-agent metrics
    await updateSubAgentMetrics(teamInstanceId, subAgentId, {
      success: true,
      latency_ms: result.latency,
      tokens: result.tokens
    });
    
    return {
      runId,
      contentId,
      success: true
    };
    
  } catch (error) {
    // Update AgentRun as failed
    await runRef.update({
      status: 'failed',
      completed_at: firebase.firestore.FieldValue.serverTimestamp(),
      duration_ms: Date.now() - startTime,
      error_message: error.message
    });
    
    // Update sub-agent metrics
    await updateSubAgentMetrics(teamInstanceId, subAgentId, {
      success: false,
      latency_ms: Date.now() - startTime
    });
    
    throw error;
  }
}
```

---

### 2. Create Generated Content

```javascript
/**
 * Create a generated content document
 * @param {string} projectId - Project ID
 * @param {string} teamInstanceId - Team instance ID
 * @param {string} runId - Agent run ID
 * @param {Object} result - LLM result
 * @returns {Promise<string>} Content ID
 */
async function createGeneratedContent(projectId, teamInstanceId, runId, result) {
  const contentId = `content_${Date.now()}`;
  
  // Get team instance to determine platform
  const teamDoc = await db
    .collection('projectAgentTeamInstances')
    .doc(teamInstanceId)
    .get();
  const team = teamDoc.data();
  
  const contentRef = db
    .collection('projects')
    .doc(projectId)
    .collection('generatedContents')
    .doc(contentId);
  
  await contentRef.set({
    id: contentId,
    project_id: projectId,
    team_instance_id: teamInstanceId,
    run_id: runId,
    
    type: result.type || 'text', // 'text', 'image', 'video', 'carousel'
    platform: team.platform,
    
    title: result.title,
    body: result.text,
    media_urls: result.media_urls || [],
    thumbnail_url: result.thumbnail_url,
    
    status: 'draft', // Start as draft
    
    metadata: {
      hashtags: extractHashtags(result.text),
      mentions: extractMentions(result.text),
      word_count: result.text ? result.text.split(' ').length : 0,
      character_count: result.text ? result.text.length : 0
    },
    
    created_at: firebase.firestore.FieldValue.serverTimestamp(),
    updated_at: firebase.firestore.FieldValue.serverTimestamp(),
    created_by: 'system'
  });
  
  return contentId;
}

// Helper functions
function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#\w+/g);
  return matches || [];
}

function extractMentions(text) {
  if (!text) return [];
  const matches = text.match(/@\w+/g);
  return matches || [];
}
```

---

### 3. Load Recent Runs for Mission Control

```javascript
/**
 * Load recent runs for a team instance
 * @param {string} projectId - Project ID
 * @param {string} teamInstanceId - Team instance ID
 * @param {number} limit - Number of runs to fetch
 * @returns {Promise<Array>} Array of runs
 */
async function loadRecentRuns(projectId, teamInstanceId, limit = 20) {
  const snapshot = await db
    .collection('projects')
    .doc(projectId)
    .collection('agentRuns')
    .where('team_instance_id', '==', teamInstanceId)
    .orderBy('started_at', 'desc')
    .limit(limit)
    .get();
  
  const runs = [];
  snapshot.forEach(doc => {
    runs.push({ id: doc.id, ...doc.data() });
  });
  
  return runs;
}

/**
 * Render recent runs in Mission Control
 * @param {Array} runs - Array of run documents
 */
function renderRecentRuns(runs) {
  const container = document.getElementById('recent-runs-list');
  
  const html = runs.map(run => `
    <div class="run-card ${run.status}" data-id="${run.id}">
      <div class="run-header">
        <span class="status-badge ${run.status}">
          ${run.status.toUpperCase()}
        </span>
        <span class="run-duration">
          ${formatDuration(run.duration_ms)}
        </span>
      </div>
      
      <div class="run-content">
        <p class="run-prompt">${run.prompt}</p>
        <div class="run-meta">
          <span class="run-time">${formatRelativeTime(run.started_at)}</span>
          ${run.output_ids.length > 0 ? 
            `<span class="run-outputs">${run.output_ids.length} output(s)</span>` : 
            ''}
        </div>
      </div>
      
      ${run.error_message ? 
        `<div class="run-error">${run.error_message}</div>` : 
        ''}
    </div>
  `).join('');
  
  container.innerHTML = html || '<p class="empty-state">No recent runs</p>';
}

function formatDuration(ms) {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
```

---

### 4. Load Generated Content for Mission Control

```javascript
/**
 * Load generated content for a team instance
 * @param {string} projectId - Project ID
 * @param {string} teamInstanceId - Team instance ID
 * @param {number} limit - Number of items to fetch
 * @returns {Promise<Array>} Array of content
 */
async function loadGeneratedContent(projectId, teamInstanceId, limit = 20) {
  const snapshot = await db
    .collection('projects')
    .doc(projectId)
    .collection('generatedContents')
    .where('team_instance_id', '==', teamInstanceId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get();
  
  const contents = [];
  snapshot.forEach(doc => {
    contents.push({ id: doc.id, ...doc.data() });
  });
  
  return contents;
}

/**
 * Render generated content in Mission Control
 * @param {Array} contents - Array of content documents
 */
function renderGeneratedContent(contents) {
  const container = document.getElementById('generated-content-list');
  
  const html = contents.map(content => `
    <div class="content-card" data-id="${content.id}">
      ${content.thumbnail_url ? 
        `<img src="${content.thumbnail_url}" alt="${content.title}" class="content-thumbnail">` : 
        ''}
      
      <div class="content-header">
        <h4 class="content-title">${content.title || 'Untitled'}</h4>
        <span class="status-badge ${content.status}">
          ${formatStatus(content.status)}
        </span>
      </div>
      
      <p class="content-body">${truncate(content.body, 100)}</p>
      
      <div class="content-meta">
        <span class="platform-icon">${getPlatformIcon(content.platform)}</span>
        <span class="content-time">${formatRelativeTime(content.created_at)}</span>
        ${content.engagement ? 
          `<span class="engagement">
            ${content.engagement.likes} ❤️ ${content.engagement.comments} 💬
          </span>` : 
          ''}
      </div>
      
      <div class="content-actions">
        <button onclick="viewContent('${content.id}')" class="btn-secondary">View</button>
        ${content.status === 'draft' ? 
          `<button onclick="approveContent('${content.id}')" class="btn-primary">Approve</button>` : 
          ''}
      </div>
    </div>
  `).join('');
  
  container.innerHTML = html || '<p class="empty-state">No content generated yet</p>';
}

function formatStatus(status) {
  const labels = {
    draft: 'Draft',
    pending_approval: 'Pending',
    approved: 'Approved',
    scheduled: 'Scheduled',
    published: 'Published',
    rejected: 'Rejected'
  };
  return labels[status] || status;
}

function getPlatformIcon(platform) {
  const icons = {
    instagram: '📷',
    x: '𝕏',
    linkedin: '💼',
    tiktok: '🎵',
    youtube: '▶️',
    blog: '📝'
  };
  return icons[platform] || '📱';
}

function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
```

---

### 5. Approve and Schedule Content

```javascript
/**
 * Approve content for publishing
 * @param {string} projectId - Project ID
 * @param {string} contentId - Content ID
 * @param {string} userId - User ID
 * @param {string} feedback - Optional feedback
 */
async function approveContent(projectId, contentId, userId, feedback = '') {
  const contentRef = db
    .collection('projects')
    .doc(projectId)
    .collection('generatedContents')
    .doc(contentId);
  
  await contentRef.update({
    status: 'approved',
    'approval.reviewed_by': userId,
    'approval.reviewed_at': firebase.firestore.FieldValue.serverTimestamp(),
    'approval.feedback': feedback,
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Schedule content for future publishing
 * @param {string} projectId - Project ID
 * @param {string} contentId - Content ID
 * @param {Date} scheduledTime - When to publish
 */
async function scheduleContent(projectId, contentId, scheduledTime) {
  const contentRef = db
    .collection('projects')
    .doc(projectId)
    .collection('generatedContents')
    .doc(contentId);
  
  await contentRef.update({
    status: 'scheduled',
    scheduled_for: firebase.firestore.Timestamp.fromDate(scheduledTime),
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Publish content to platform
 * @param {string} projectId - Project ID
 * @param {string} contentId - Content ID
 * @param {string} externalUrl - URL of published post
 */
async function publishContent(projectId, contentId, externalUrl) {
  const contentRef = db
    .collection('projects')
    .doc(projectId)
    .collection('generatedContents')
    .doc(contentId);
  
  await contentRef.update({
    status: 'published',
    published_at: firebase.firestore.FieldValue.serverTimestamp(),
    external_post_url: externalUrl,
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  });
}
```

---

### 6. Update Engagement Metrics

```javascript
/**
 * Update engagement metrics for published content
 * @param {string} projectId - Project ID
 * @param {string} contentId - Content ID
 * @param {Object} engagement - Engagement data
 */
async function updateEngagementMetrics(projectId, contentId, engagement) {
  const contentRef = db
    .collection('projects')
    .doc(projectId)
    .collection('generatedContents')
    .doc(contentId);
  
  await contentRef.update({
    'engagement.likes': engagement.likes || 0,
    'engagement.shares': engagement.shares || 0,
    'engagement.comments': engagement.comments || 0,
    'engagement.views': engagement.views || 0,
    'engagement.reach': engagement.reach || 0,
    'engagement.last_updated_at': firebase.firestore.FieldValue.serverTimestamp(),
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Fetch engagement from platform API (example)
 * @param {string} platform - Platform name
 * @param {string} postUrl - Post URL
 * @returns {Promise<Object>} Engagement data
 */
async function fetchEngagementFromPlatform(platform, postUrl) {
  // This would call the actual platform API
  // Example for Instagram:
  if (platform === 'instagram') {
    const postId = extractInstagramPostId(postUrl);
    const response = await fetch(`https://graph.instagram.com/${postId}?fields=like_count,comments_count&access_token=${ACCESS_TOKEN}`);
    const data = await response.json();
    
    return {
      likes: data.like_count,
      comments: data.comments_count,
      shares: 0, // Instagram doesn't provide this
      views: 0,
      reach: 0
    };
  }
  
  // Add other platforms...
  return { likes: 0, shares: 0, comments: 0 };
}
```

---

## Common Queries

### Get All Runs for a Project

```javascript
const runs = await db
  .collection('projects')
  .doc(projectId)
  .collection('agentRuns')
  .orderBy('started_at', 'desc')
  .get();
```

### Get Failed Runs

```javascript
const failedRuns = await db
  .collection('projects')
  .doc(projectId)
  .collection('agentRuns')
  .where('status', '==', 'failed')
  .orderBy('started_at', 'desc')
  .limit(10)
  .get();
```

### Get Pending Approval Content

```javascript
const pendingContent = await db
  .collection('projects')
  .doc(projectId)
  .collection('generatedContents')
  .where('status', '==', 'pending_approval')
  .orderBy('created_at', 'asc')
  .get();
```

### Get Scheduled Content

```javascript
const now = firebase.firestore.Timestamp.now();
const scheduledContent = await db
  .collection('projects')
  .doc(projectId)
  .collection('generatedContents')
  .where('status', '==', 'scheduled')
  .where('scheduled_for', '<=', now)
  .get();
```

### Get Published Content with High Engagement

```javascript
const topContent = await db
  .collection('projects')
  .doc(projectId)
  .collection('generatedContents')
  .where('status', '==', 'published')
  .orderBy('engagement.likes', 'desc')
  .limit(10)
  .get();
```

---

## Real-time Listeners

### Listen to Recent Runs

```javascript
const unsubscribe = db
  .collection('projects')
  .doc(projectId)
  .collection('agentRuns')
  .where('team_instance_id', '==', teamInstanceId)
  .orderBy('started_at', 'desc')
  .limit(20)
  .onSnapshot(snapshot => {
    const runs = [];
    snapshot.forEach(doc => {
      runs.push({ id: doc.id, ...doc.data() });
    });
    renderRecentRuns(runs);
  });
```

### Listen to Content Updates

```javascript
const unsubscribe = db
  .collection('projects')
  .doc(projectId)
  .collection('generatedContents')
  .where('team_instance_id', '==', teamInstanceId)
  .orderBy('created_at', 'desc')
  .limit(20)
  .onSnapshot(snapshot => {
    const contents = [];
    snapshot.forEach(doc => {
      contents.push({ id: doc.id, ...doc.data() });
    });
    renderGeneratedContent(contents);
  });
```

---

## Error Handling

```javascript
async function safeExecuteAgent(projectId, teamInstanceId, subAgentId, prompt) {
  try {
    const result = await executeAgentWithTracking(
      projectId,
      teamInstanceId,
      subAgentId,
      prompt
    );
    return { success: true, ...result };
  } catch (error) {
    console.error('Agent execution failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## Testing

### Unit Test Example

```javascript
describe('AgentRun & GeneratedContent', () => {
  it('should create run and content on execution', async () => {
    const result = await executeAgentWithTracking(
      'test_project',
      'test_team',
      'test_subagent',
      'Create test post'
    );
    
    expect(result.success).toBe(true);
    expect(result.runId).toBeDefined();
    expect(result.contentId).toBeDefined();
    
    // Verify run document
    const runDoc = await db
      .collection('projects')
      .doc('test_project')
      .collection('agentRuns')
      .doc(result.runId)
      .get();
    
    expect(runDoc.exists).toBe(true);
    expect(runDoc.data().status).toBe('success');
    
    // Verify content document
    const contentDoc = await db
      .collection('projects')
      .doc('test_project')
      .collection('generatedContents')
      .doc(result.contentId)
      .get();
    
    expect(contentDoc.exists).toBe(true);
    expect(contentDoc.data().status).toBe('draft');
  });
});
```

---

## References

- [AgentRun & Content Design](./agentrun-content-design.md)
- [Firestore Schema v1.1](./firestore-schema.md)
- [SubAgentInstance Implementation Guide](./subagent-implementation-guide.md)

---

**Last Updated**: 2025-11-29  
**Maintained By**: Data Architecture Team
