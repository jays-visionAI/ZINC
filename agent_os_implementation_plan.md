# ZYNK Agent-OS & Procedural Management Implementation Plan

## 🎯 Vision: From "Forking" to "Agent-OS"
The goal is to prevent source code corruption and service inconsistency by strictly separating the **Agent's Brain (Data/Procedures)** from the **Application Engine (Source Code)**. We will implement a professional-grade versioning, observability, and procedural design system.

---

## 🛠 Phase 1: Agent Registry & Version Control (Diff View) ✅ COMPLETED
**Objective**: Enable administrators to safely change, compare, and manage agent versions without touching source code.

### 1.1 Enhanced Firestore Metadata ✅
*   **Path**: `agentRegistry/{agentId}` + `agentVersions/{versionId}`
*   **Fields**: 
    *   `systemPrompt`: (String)
    *   `config`: (Object: model, temperature)
    *   `procedures`: (Array of Step Objects with action, label, description, color)
    *   `sourceFiles`: (Array of related source file paths)
    *   `changelog`: (String)
    *   `isProduction`: (Boolean)
    *   `status`: (String: draft, production, archived)

### 1.2 UI Implementation: Code Diff View ✅
*   **Screen**: `Admin > Agent Registry > Version History`
*   **Features Implemented**:
    *   ✅ Multi-Version Diff button
    *   ✅ Side-by-side comparison with line-by-line highlighting
    *   ✅ Green highlighting for additions, Red for deletions
    *   ✅ Statistics bar showing +N additions / -N deletions

### 1.3 Source Code Viewer ✅
*   **Screen**: `Admin > Agent Registry > [Agent Detail]`
*   **Features Implemented**:
    *   ✅ "View Source Code" button in header
    *   ✅ Dropdown to select related source files
    *   ✅ Line numbers and syntax-highlighted code display

---

## 🎨 Phase 2: Narrative Design Canvas (Observability) ✅ COMPLETED
**Objective**: Visualize the agent's procedural logic structure.

### 2.1 Procedural Data Flow Visualization ✅
*   **Canvas Component**: Vertical flowchart showing procedures
    *   ✅ Step number, label, description, action code
    *   ✅ Color-coded steps with gradient connectors
    *   ✅ Hover effects for interactivity
    *   ✅ Loads real procedure data from Firestore (not mock)

### 2.2 Empty State Handling ✅
*   ✅ Graceful fallback message when no procedures defined
*   ✅ Instructions to run seed script or add via Admin UI

---

## 🔗 Phase 3: Agent Registry ↔ Execution Integration ✅ COMPLETED
**Objective**: Connect the Registry to the actual execution engine.

### 3.1 AgentRuntimeService Extensions ✅
*   **New Methods Added**:
    *   `getProductionVersion(agentId)` - Load production version from Registry
    *   `getAgentConfig(agentId)` - Get full agent configuration
    *   `resolveAgentPrompt(registryAgentId, subAgentPrompt, roleType)` - Priority-based resolution
    *   `getDefaultPromptForRole(roleType)` - Fallback prompts
    *   `listRegistryAgents(category)` - List agents for Admin UI

### 3.2 AgentExecutionService Integration ✅
*   **Modified**: `_executeSubAgent()` now:
    *   Checks for `registry_agent_id` on SubAgent
    *   Resolves prompt from Registry when available
    *   Falls back to subagent prompt or default
    *   Logs prompt source (`registry`, `subagent`, `default`)

---

## 📊 Phase 4: Agent Inventory & Consolidation ✅ STARTED
**Objective**: Document and consolidate all agents.

### 4.1 Documentation ✅
*   **Created**: `/docs/AGENT_INVENTORY.md`
*   **Contents**:
    *   14 Registry Agents listed with categories and procedure counts
    *   Legacy agents mapped to consolidation targets
    *   Action plan for migration phases

### 4.2 New Agents Added to Registry ✅
*   `STU-ORCHESTRATOR` - Studio Orchestrator
*   `STU-CREATOR-TEXT` - Text Creator
*   `STU-CREATOR-IMAGE` - Image Creator
*   `GRW-MANAGER` - Growth Manager
*   `GRW-REASONER` - Strategy Reasoner

---

## 🧪 Phase 5: Agent Playground ✅ COMPLETED
**Objective**: Test new agent designs before production deployment.

### 5.1 UI Implementation ✅
*   **Screen**: `Admin > Agent Playground`
*   **Features**:
    *   ✅ Agent list with category filtering
    *   ✅ System prompt preview from Registry
    *   ✅ Test input area with model/temperature selection
    *   ✅ Run button to execute test via Cloud Function
    *   ✅ Output display with execution time statistics

---

## 📋 Implementation Status

| Task | Status |
|------|--------|
| Firestore schema with procedures | ✅ Done |
| Code Diff View modal | ✅ Done |
| Source Code Viewer | ✅ Done |
| Narrative Design Canvas | ✅ Done |
| Registry ↔ Execution integration | ✅ Done |
| Agent Inventory documentation | ✅ Done |
| Agent Playground UI | ✅ Done |
| SubAgent ↔ Registry linking | 🔶 Ready (needs UI form update) |
| Legacy prompt migration | ⬜ Pending |
| Agent consolidation | ⬜ Pending |

---

## 🚀 Next Steps

1. **Run Seed Script**: Execute `node scripts/seed-agent-registry.js` to populate new agents
2. **Test Playground**: Navigate to `Admin > Agent Playground` and test agents
3. **SubAgent Linking**: Add UI to link SubAgents to Registry entries
4. **Legacy Migration**: Export hardcoded prompts and import to Registry

---

*Last Updated: 2026-01-05*
