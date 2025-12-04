# ZYNK User Manual

## Table of Contents
1. [API Connection Setup](#1-api-connection-setup)
2. [Agent Team Instance Deployment](#2-agent-team-instance-deployment)

---

## 1. API Connection Setup

### Overview
Before using social media channels (X, Instagram, YouTube, etc.), you must first register API credentials.

### 1.1 Adding an API Connection

#### Step 1: Access Settings Menu
1. Click **Settings** in the left sidebar
2. Select the **Connections** tab
3. Click the **+ Add Channel** button in the top right

#### Step 2: Enter Channel Information

**Required Fields:**

1. **Channel*** (Select Channel)
   - Choose the social media platform to use
   - Examples: X (Twitter), Instagram, YouTube, etc.

2. **Project*** (Select Project)
   - Choose the project that will use this API
   - Dropdown shows your created projects
   - Create a project first if none exist

3. **Agent Team** (Optional)
   - Select an agent team to connect immediately
   - Can be connected later, so this is optional
   - Only shows agent teams using the selected channel in this project

4. **Detailed Name*** (Descriptive Name)
   - A name to identify this API connection
   - Examples: "VisionChain Official X Account", "Marketing Instagram"

5. **API Credentials**
   - Required fields appear automatically based on selected channel
   - Examples: API Key, API Secret, Access Token, etc.

#### Step 3: Test Connection and Save

1. Click **Test Connection** button (Recommended)
   - Verifies API credentials are correct
   - Success: ✅ "Connection successful" message
   - Failure: ❌ Check error message and correct information

2. Click **Save Connection** button
   - Saves API connection information
   - Automatically connects to selected Agent Team if chosen

### 1.2 Checking API Connection Status

View the following information in the Connections tab table:

| Column | Description |
|--------|-------------|
| **Channel** | Social media platform (X, Instagram, etc.) |
| **Account** | Your entered Detailed Name |
| **Agent Team** | Connected agent team status<br>● (Green) = Connected<br>○ (Gray) = Not connected |
| **Status** | API connection status<br>✓ Connected = Normal<br>⚠ Not tested = Unverified |
| **Last Tested** | Last test time |
| **Actions** | Edit / Delete buttons |

### 1.3 Editing an API Connection

1. Click **Edit** button for the connection to modify
2. Update information
3. Click **Save Connection**

### 1.4 Deleting an API Connection

1. Click **Delete** button for the connection to remove
2. Click **Confirm** in the confirmation message

⚠️ **Warning**: Deletion may cause agent teams using this API to stop working.

---

## 2. Agent Team Instance Deployment

### Overview
An agent team instance is a group of AI agents that perform actual tasks. Deploy an agent team to a project to start automation.

### 2.1 Creating an Agent Team Instance

#### Step 1: Start Deploy Wizard

1. Access **Command Center** menu
2. Click **+ Deploy New Agent** button on project card
3. Deploy Wizard starts (3 steps)

#### Step 2: Step 1 - Basic Info & Credentials

**Required Fields:**

1. **Select Channel***
   - Choose the social media channel for the agent team
   - Examples: X (Twitter), Instagram, etc.

2. **API Credential**
   - Select API connection registered in Settings
   - Dropdown shows only this project's APIs for the selected channel
   
   **Scenarios:**
   
   - ✅ **If API exists**: 
     - Select from dropdown
     - ✓ (Green check) = Connection tested
     - ⚠ (Warning) = Connection not verified
   
   - ❌ **If no API exists**:
     - "No credential available" message appears
     - Click **Go to Settings** to register API first
     - Or click **Continue Anyway** to connect later

3. **Team Name***
   - Enter agent team name
   - Examples: "[X] Marketing Team", "[Instagram] Content Creation Team"

4. **Description** (Optional)
   - Describe the agent team's role

Click **Next Step** button

#### Step 3: Step 2 - Select Template

1. Choose an agent team template
   - Each template includes pre-configured sub-agents
   - Click template card to select

2. Click **Next Step** button

#### Step 4: Step 3 - Final Review

1. Review settings:
   - Channel information
   - API connection status
   - Template information
   - Sub-agent list

2. Click **Create Agent Team** button

3. Creation complete!
   - Agent team card appears in Command Center
   - Status: ACTIVE

### 2.2 Checking Agent Team Status

View the following information on agent team cards in Command Center:

```
┌─────────────────────────────────────┐
│ [X] VisionChain Marketing Team  ⚠️ 1│
│                                     │
│ Autonomous Agent Team               │
│                                     │
│ ⚡ ACTIVE DIRECTIVE:                │
│ System initialized. Waiting for     │
│ task assignment.                    │
│                                     │
│ Daily Actions: 0/15                 │
│ Total Runs: 0                       │
│                                     │
│ [View History] [⚙️]                 │
└─────────────────────────────────────┘
```

**Status Indicators:**
- ⚠️ Number = Items requiring attention (e.g., API not connected)
- ACTIVE = Active status
- Daily Actions = Number of tasks performed today

### 2.3 Viewing Agent Team Details

1. Click **View History** button on agent team card
2. Detail panel appears at bottom

**Left: Assigned Sub-Agents**

```
Channel Connections
├─ X (Twitter)  ● Ready
   [Check Connection]

Sub-agent List:
├─ Content Planning Agent  100% SR
│  planner
│  Last active: No activity yet
│  🤖 Not configured
│
├─ Text Generation Agent  100% SR
│  creator_text
│  Last active: No activity yet
│  🤖 Not configured
```

**Channel Connections Section:**
- ● (Green) = API connected, working normally
- ⚠️ Missing Key = API not connected
- **Check Connection** button:
  - Click to check API connection status in real-time
  - ✓ Connected = Normal
  - ✗ Failed = Error

**Right: Recent Runs**
- Shows recent execution history
- View success/failure status of each run

### 2.4 Checking and Reconnecting API

#### Method 1: Check from View History

1. Agent team card → Click **View History**
2. Check Channel Connections section
3. Click **Check Connection** button
   - "Checking..." appears
   - Result shown after 2 seconds:
     - ✓ Connected (Green) = Success
     - ✗ Failed (Red) = Failure

#### Method 2: Reconnect from Settings

1. Go to **Settings** → **Connections**
2. Check connection status in Agent Team column
   - ● (Green) = Connected
   - ○ (Gray) = Not connected
3. If not connected:
   - Click **Edit** button
   - Select team to connect in **Agent Team** dropdown
   - Click **Save Connection**

### 2.5 Changing Agent Team Settings

1. Click **⚙️** (Settings) button on agent team card
2. Modify in settings modal:
   - Team name
   - Description
   - Other settings
3. Click **Save**

---

## Frequently Asked Questions (FAQ)

### Q1: Should I register API first or create agent team first?

**A**: Both methods work.

**Recommended Order (Beginners):**
1. Register API first in Settings → Connections
2. API automatically selected when creating agent team in Deploy Wizard

**Alternative (Advanced Users):**
1. Create agent team first in Deploy Wizard (without API)
2. Select agent team when registering API in Settings → Connections

### Q2: Can one API be used by multiple agent teams?

**A**: Yes, it's possible. The same X account can be shared by multiple agent teams (Marketing, Support, etc.).

Multiple teams shown in Agent Team column in Settings → Connections table:
```
● Marketing Team
● Support Team
```

### Q3: What happens if agent team has no API connected?

**A**: Agent team is created but cannot perform actual tasks.

- ⚠️ Warning shown on agent team card
- "⚠️ Missing Key" shown in Channel Connections
- Starts working automatically after connecting API in Settings

### Q4: Is API connection testing mandatory?

**A**: Not mandatory but **strongly recommended**.

- Without Test Connection, Status shows "⚠ Not tested"
- May cause errors during actual use
- Changes to "✓ Connected" after successful test for safe usage

### Q5: I selected the wrong project. How do I fix it?

**A**: You can modify in Settings → Connections.

1. Click **Edit** button for the API connection
2. Select correct project in **Project** dropdown
3. **Agent Team** dropdown automatically updates
4. Click **Save Connection**

### Q6: What does "Already has credential" warning mean?

**A**: The agent team is already using a different API.

- One agent team can use only one API per channel
- Select existing API to replace
- Select different agent team to add new API

### Q7: When should I use the Check Connection button?

**A**: Use in these situations:

1. **Regular Check**: Periodically verify API connection status
2. **When Error Occurs**: When agent team isn't working
3. **After API Change**: After modifying API information in Settings
4. **Restart**: When you want to refresh API connection

---

## Troubleshooting

### Issue 1: "No credential available" message appears

**Cause**: No API registered for selected channel.

**Solution**:
1. Click **Go to Settings** button
2. Settings → Connections → Add Channel
3. Register API for that channel
4. Return to Deploy Wizard and continue

### Issue 2: "✗ Failed" shown when checking connection

**Cause**: API credentials are incorrect or expired.

**Solution**:
1. Go to Settings → Connections
2. Click **Edit** button for the API
3. Verify and correct API Key, Secret, etc.
4. Click **Test Connection** to verify
5. Click **Save Connection**

### Issue 3: Agent Team dropdown is empty

**Cause**: No agent teams using that channel in selected project.

**Solution**:
- **Option 1**: Select "-- None (add later)" and save for now
- **Option 2**: Create agent team in Deploy Wizard first, then try again

### Issue 4: Agent team is not working

**Check:**
1. ✅ Verify API is connected (● Green)
2. ✅ Verify "✓ Connected" shown when checking connection
3. ✅ Verify agent team status is ACTIVE
4. ✅ Verify sub-agents are in configured state

**Solution**:
- View History → Click Check Connection
- If failed, reconfigure API in Settings

---

## Additional Help

For more information:
- 📧 Support: support@zynk.ai
- 📚 Documentation: docs.zynk.ai
- 💬 Community: community.zynk.ai

---

**Last Updated**: 2025-12-05  
**Version**: 1.0
