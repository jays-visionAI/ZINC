# ZYNK Documentation Index

**Last Updated**: 2025-11-29

---

## Schema Documentation (v1.1)

### Core References

1. **[Firestore Schema v1.1](./firestore-schema.md)** 📘
   - Complete database schema reference
   - All collections and subcollections
   - TypeScript interfaces
   - Example documents
   - Relationships diagram
   - **Start here for schema overview**

2. **[Mission Control Data Contract](./mission-control-data-contract.md)** 📋
   - Exact data requirements per UI panel
   - Query patterns and filters
   - Real-time listener examples
   - Required Firestore indexes
   - **Start here for frontend implementation**

3. **[Schema v1.1 Summary](./schema-v1.1-summary.md)** 📊
   - Quick overview of v1.1 changes
   - Implementation checklist
   - Migration timeline
   - **Start here for implementation planning**

### Detailed Design Documents

4. **[Schema Refinement v1.1](./schema-refinement-v1.1.md)** 🔧
   - `ProjectAgentTeamInstance` changes
   - Before/After comparison
   - Migration strategies
   - Update patterns
   - **For understanding team instance changes**

5. **[SubAgentInstance Design](./subagent-instance-design.md)** 🎯
   - Subcollection architecture
   - Initialization flow
   - Configuration resolution
   - UI mapping
   - **For understanding sub-agent structure**

6. **[AgentRun & Content Design](./agentrun-content-design.md)** 📊
   - Execution history tracking
   - Generated content storage
   - Engagement metrics
   - Lifecycle management
   - **For understanding runs and outputs**

7. **[Data Architecture - Agent Team](./data-architecture-agent-team.md)** 🏗️
   - Original architecture vision
   - Conceptual model
   - Design decisions
   - **For understanding overall architecture**

### Implementation Guides

8. **[SubAgentInstance Implementation Guide](./subagent-implementation-guide.md)** 💻
   - Code examples
   - Common queries
   - Helper functions
   - Testing examples
   - **For developers implementing features**

9. **[AgentRun & Content Implementation](./agentrun-content-implementation.md)** 💻
   - Execution tracking code
   - Content creation examples
   - Approval workflow
   - Engagement updates
   - **For implementing runs and content**

10. **[Mission Control View History Spec](./mission-control-view-history-spec.md)** 🎯
    - Complete implementation specification
    - Firestore schema for runs and content
    - Quota management logic
    - UI panel synchronization
    - **Ready-to-implement specification**

11. **[Mission Control View History Checklist](./mission-control-view-history-checklist.md)** ✅
    - Implementation progress tracker
    - Integration steps
    - Backend logic examples
    - Testing checklist
    - **For tracking implementation progress**

12. **[Mission Control Data Guide](./mission-control-data-guide.md)** 🛠️
    - Troubleshooting "No Data" issues
    - How to generate test data
    - Verification steps

---

## Quick Navigation

### I want to...

#### Understand the Schema
→ Start with [Firestore Schema v1.1](./firestore-schema.md)

#### Implement Mission Control UI
→ Read [Mission Control Data Contract](./mission-control-data-contract.md)  
→ Then [AgentRun & Content Implementation](./agentrun-content-implementation.md)

#### Implement Team Deployment
→ Read [Schema v1.1 Summary](./schema-v1.1-summary.md)  
→ Then [SubAgentInstance Implementation Guide](./subagent-implementation-guide.md)

#### Understand Design Decisions
→ Read [Data Architecture - Agent Team](./data-architecture-agent-team.md)  
→ Then [SubAgentInstance Design](./subagent-instance-design.md)

#### Migrate Existing Data
→ Read [Schema Refinement v1.1](./schema-refinement-v1.1.md)  
→ Then [Schema v1.1 Summary](./schema-v1.1-summary.md) (Migration section)

#### Write Code
→ Jump to [Mission Control Data Contract](./mission-control-data-contract.md)  
→ Or [Implementation Guides](#implementation-guides)

---

## Document Relationships

```
📘 Firestore Schema v1.1 (Main Reference)
    ├── 📋 Schema v1.1 Summary (Quick Start)
    ├── 🔧 Schema Refinement v1.1 (Team Instance Details)
    │   └── 🏗️ Data Architecture (Original Vision)
    └── 🎯 SubAgentInstance Design (Subcollection Details)
        └── 💻 Implementation Guide (Code Examples)
```

---

## Collections Overview

| Collection | Purpose | Documentation |
|------------|---------|---------------|
| `projects` | Client workspaces | [Schema](./firestore-schema.md#collection-projects) |
| `users` | User accounts | [Schema](./firestore-schema.md#collection-users) |
| `industries` | Industry categories | [Schema](./firestore-schema.md#collection-industries) |
| `subAgentTemplates` | Sub-agent definitions | [Schema](./firestore-schema.md#collection-subagenttemplate) |
| `agentSetTemplates` | Team templates | [Schema](./firestore-schema.md#collection-agentsettemplates) |
| `projectAgentTeamInstances` | Deployed teams | [Schema](./firestore-schema.md#collection-projectagentteaminstances) |
| `channelProfiles` | Social channels | [Schema](./firestore-schema.md#collection-channelprofiles) |
| `subAgentChannelAdapters` | Channel overrides | [Schema](./firestore-schema.md#collection-subagentchanneladapters) |

### Subcollections

| Path | Purpose | Documentation |
|------|---------|---------------|
| `projects/{id}/runtimeProfiles` | LLM configs | [Schema](./firestore-schema.md#subcollection-projectsprojectidruntimeprofiles) |
| `projectAgentTeamInstances/{id}/subAgents` | Sub-agent instances | [Design](./subagent-instance-design.md) |
| `projects/{id}/agentRuns` | Execution history | [Design](./agentrun-content-design.md) |
| `projects/{id}/generatedContents` | Generated outputs | [Design](./agentrun-content-design.md) |

---

## Key Concepts

### Agent Team Deployment Flow

1. User selects `channelProfile` + `agentSetTemplate`
2. System creates `projectAgentTeamInstances` document
3. System creates `subAgents` subcollection from template roles
4. System resolves channel adapters
5. UI displays in Mission Control

**Docs**: [SubAgentInstance Design](./subagent-instance-design.md#initialization-flow)

### Configuration Resolution

Template → Channel Adapter → Instance Override

**Docs**: [SubAgentInstance Design](./subagent-instance-design.md#configuration-resolution)

### Mission Control UI

- **Agent Swarm**: `projectAgentTeamInstances` (cards)
- **Active Sub-Agents**: `subAgents` subcollection (list)
- **Recent Runs**: `agent_runs` (future)
- **Generated Content**: `generated_content` (future)

**Docs**: [Schema v1.1 Summary](./schema-v1.1-summary.md#mission-control-ui-mapping)

---

## Version History

| Version | Date | Key Changes | Docs |
|---------|------|-------------|------|
| 1.0 | 2025-11-28 | Initial schema | [Schema v1.0](./firestore-schema.md) |
| 1.1 | 2025-11-29 | Mission Control fields + SubAgentInstance | [Summary](./schema-v1.1-summary.md) |

---

## Future Collections (Planned)

The following collections are **designed but not yet implemented**:

- `agent_runs` - Execution history
- `generated_content` - Outputs (text, images, videos)
- `tasks` - Task queue
- `campaigns` - Marketing campaigns
- `contentBriefs` - Content briefs
- `learnings` - Agent learnings
- `behaviourPacks` - Behavior definitions (Phase 1)
- `ruleProfiles` - RULE profiles (Phase 1)

**Docs**: [Firestore Schema v1.1](./firestore-schema.md#missing-collections-future-implementation)

---

## External References

- **ZYNK Agent OS PRD 5.0**: `../task.md`
- **Project Codebase**: `/Users/sangjaeseo/Antigravity/ZINC/`

---

## Contributing

When updating documentation:

1. Update the relevant doc file
2. Update version number if schema changes
3. Update this index if adding new docs
4. Cross-reference related documents

---

## Support

- **Schema Questions**: Check [Firestore Schema v1.1](./firestore-schema.md)
- **Implementation Help**: See [Implementation Guide](./subagent-implementation-guide.md)
- **Design Rationale**: Read [Design Documents](#detailed-design-documents)

---

**Maintained By**: Data Architecture Team  
**Location**: `/Users/sangjaeseo/Antigravity/ZINC/.docs/`
