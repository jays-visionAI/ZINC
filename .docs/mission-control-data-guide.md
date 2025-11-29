# Mission Control Data Integration Guide

**Date**: 2025-11-29
**Status**: Implementation Complete

---

## 1. Data Architecture Updates

### Sub-Agent Instances
- **Old Path**: `projects/{projectId}/subAgents` (Deprecated)
- **New Path**: `projectAgentTeamInstances/{teamId}/subAgents`
- **Reason**: Sub-agents are strictly scoped to a team instance.

### Agent Runs & Content
- **Runs**: `projects/{projectId}/agentRuns`
- **Content**: `projects/{projectId}/generatedContents`
- **Linkage**: Both collections link back to `team_instance_id` and `sub_agent_instance_id`.

---

## 2. How to Fix "No Data" Issues

If you see "No sub-agents assigned" or empty panels in Mission Control, it's likely because the data was created with the old schema or hasn't been generated yet.

### Option A: Deploy a New Team (Recommended)
1. Go to **Mission Control**.
2. Click **Deploy New Agent**.
3. Complete the wizard.
4. The new team will automatically have the correct Sub-Agent structure.

### Option B: Backfill Existing Team
1. Open the browser console (F12).
2. Run the following command:
   ```javascript
   // Replace with your actual IDs (found in URL or Firestore)
   generateTestData('YOUR_PROJECT_ID', 'YOUR_TEAM_ID');
   ```
3. This will:
   - Create missing sub-agents in the correct path.
   - Create a dummy "Success" run.
   - Create a dummy "Published" content item.
4. Refresh the page or click "View History" again.

---

## 3. Verification Steps

1. **Assigned Agent Team Panel**
   - Should show a list of agents (e.g., "Strategic Planner", "Copywriter").
   - Status should be "Active".
   - Metrics (SR, Last Active) should be visible.

2. **Recent Runs Panel**
   - Should show at least one run.
   - Status badge should be green (SUCCESS).
   - Clicking the run should filter the right panel.

3. **Generated Content Panel**
   - Should show content cards.
   - "View on Platform" button should appear if `external_post_url` is set.

---

## 4. Troubleshooting

- **Error: Missing or insufficient permissions**
  - Check Firestore Security Rules. Ensure read/write is allowed for `projectAgentTeamInstances` subcollections.

- **Error: The query requires an index**
  - Open the link provided in the console error to create the composite index.
  - Required indexes:
    - `agentRuns`: `team_instance_id` ASC, `started_at` DESC
    - `generatedContents`: `team_instance_id` ASC, `created_at` DESC
    - `generatedContents`: `run_id` ASC, `created_at` DESC
