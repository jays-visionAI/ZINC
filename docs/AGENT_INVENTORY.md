# ZYNK Agent Inventory & Consolidation Plan

## 📊 Registry Agents (Agent-OS Managed)

| ID | Name | Category | Status | Procedures |
|----|------|----------|--------|------------|
| `INT-MKT-SCOUT` | Market Scout | Intelligence | ✅ Active | 3 steps |
| `INT-KB-RAG` | Knowledge Agent (RAG) | Intelligence | ✅ Active | 4 steps |
| `DSN-NRV-DSGN` | Narrative Designer | Design | ✅ Active | 4 steps |
| `DSN-VIS-DIR` | Visual Director | Design | ✅ Active | 3 steps |
| `DSN-STR-ARCH` | Structure Architect | Design | ✅ Active | 3 steps |
| `QA-VIS-QC` | Aesthetic Critic (Vision) | QA | ✅ Active | 4 steps |
| `QA-REV-HND` | Revision Handler | QA | ✅ Active | 3 steps |
| `STG-DECK-MSTR` | Pitch Deck Strategist | Strategy | ✅ Active | 4 steps |
| `STG-ONE-PAGER` | One Pager Strategist | Strategy | ✅ Active | 3 steps |
| `STU-ORCHESTRATOR` | Studio Orchestrator | Studio | ✅ Active | 5 steps |
| `STU-CREATOR-TEXT` | Text Creator | Studio | ✅ Active | 4 steps |
| `STU-CREATOR-IMAGE` | Image Creator | Studio | ✅ Active | 4 steps |
| `GRW-MANAGER` | Growth Manager | Growth | ✅ Active | 3 steps |
| `GRW-REASONER` | Strategy Reasoner | Growth | ✅ Active | 4 steps |

**Total: 14 Registry Agents**

---

## 🔍 Legacy Agents (Source Code Hardcoded)

These agents exist in source code but are NOT yet migrated to the Agent Registry:

| Source File | Agent Name | Role | Consolidation Status |
|-------------|------------|------|---------------------|
| `studio.js` | Content Planner | Planning | 🔶 Migrate to `STU-ORCHESTRATOR` |
| `studio.js` | Text Writer | Creation | 🔶 Migrate to `STU-CREATOR-TEXT` |
| `studio.js` | Image Prompter | Creation | 🔶 Migrate to `STU-CREATOR-IMAGE` |
| `knowledgeHub.js` | Depth Analyzer | Analysis | 🔶 Migrate to `INT-KB-RAG` |
| `knowledgeHub.js` | Pattern Agent | Analysis | 🔶 Merge into `INT-MKT-SCOUT` |
| `marketPulse.js` | Trend Analyzer | Intelligence | 🔶 Merge into `INT-MKT-SCOUT` |
| `marketPulse.js` | Strategy Agent | Strategy | 🔶 Merge into `GRW-REASONER` |
| `functions/dag-executor.js` | Planner | Pipeline | ⚪ Keep as Engine (procedural) |
| `functions/dag-executor.js` | Manager | Pipeline | ⚪ Keep as Engine (procedural) |

---

## 📋 Consolidation Action Plan

### Phase 1: SubAgent Registry Link ✅ (Completed)
- [x] Add `registry_agent_id` field to SubAgent schema
- [x] Update `agent-execution-service.js` to resolve prompts from Registry
- [x] Update `agent-runtime-service.js` with Registry integration methods

### Phase 2: UI Migration (Next)
- [ ] Update SubAgent creation form to allow selecting Registry Agent
- [ ] Add "Link to Registry" option for existing SubAgents
- [ ] Show Registry source indicator in Agent Team detail page

### Phase 3: Legacy Prompt Migration
- [ ] Export existing hardcoded prompts from source files
- [ ] Create Registry versions for each legacy agent
- [ ] Test with production data
- [ ] Deprecate hardcoded prompts

### Phase 4: Agent Consolidation
- [ ] Merge overlapping agents (e.g., Trend Analyzer + Market Scout)
- [ ] Update all references to use consolidated agents
- [ ] Archive deprecated agent entries

---

## 🔗 Registry-Execution Integration

### How SubAgents Connect to Registry

```
SubAgent Document
┌────────────────────────────────────────┐
│ id: "subagent-123"                     │
│ role_type: "creator_text"              │
│ role_name: "Content Writer"            │
│ registry_agent_id: "STU-CREATOR-TEXT"  │  ← Links to Registry
│ system_prompt: null                     │  ← Will use Registry prompt
└────────────────────────────────────────┘
         │
         ▼
Agent Registry
┌────────────────────────────────────────┐
│ id: "STU-CREATOR-TEXT"                 │
│ name: "Text Creator"                   │
│ category: "Studio"                     │
└────────────────────────────────────────┘
         │
         ▼
Agent Versions (Production)
┌────────────────────────────────────────┐
│ agentId: "STU-CREATOR-TEXT"            │
│ version: "1.0.0"                       │
│ isProduction: true                     │
│ systemPrompt: "You are a content..."   │
│ procedures: [...]                      │
│ config: { model: "gpt-4o", temp: 0.7 } │
└────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

- [ ] Run `scripts/seed-agent-registry.js` to populate Registry with new agents
- [ ] Verify all 14 agents appear in Admin > Agent Registry
- [ ] Click each agent and verify procedures display in Narrative Canvas
- [ ] Test version comparison (Multi-Version Diff)
- [ ] Test Source Code Viewer
- [ ] Create a SubAgent with `registry_agent_id` set
- [ ] Verify execution uses Registry prompt (check console logs for "🔗 Registry Integration")

---

*Last Updated: 2026-01-05*
