# ZYNK Schema v1.1 - Complete Summary

**Date**: 2025-11-29  
**Status**: Approved & Ready for Implementation

---

## Overview

This document summarizes all schema changes and additions for ZYNK Mission Control v1.1.

---

## What Changed

### 1. ProjectAgentTeamInstance (Enhanced)

**Collection**: `projectAgentTeamInstances`

**New Fields Added:**
- `active_directive` - Powers "ACTIVE DIRECTIVE" UI section
- `metrics` - Powers progress bars and statistics
- `tags` - Categorization and search
- `created_at` / `updated_at` - Timestamps

**Purpose**: Support Mission Control "Agent Swarm" card UI

**Documentation**: 
- [Schema Refinement v1.1](./schema-refinement-v1.1.md)
- [Firestore Schema v1.1](./firestore-schema.md#collection-projectagentteaminstances)

---

### 2. SubAgentInstance (New Subcollection)

**Path**: `projectAgentTeamInstances/{teamId}/subAgents/{subAgentId}`

**Key Fields:**
- `role_name`, `role_type` - Identity
- `template_id` - Link to subAgentTemplates
- `channel_adapter_id` - Channel-specific overrides
- `runtime_overrides` - Instance-level configuration
- `metrics` - Performance tracking
- `status`, `autonomy_mode` - State management

**Purpose**: Support Mission Control "Active Sub-Agents" column

**Documentation**:
- [SubAgentInstance Design](./subagent-instance-design.md)
- [Implementation Guide](./subagent-implementation-guide.md)
- [Firestore Schema v1.1](./firestore-schema.md#subcollection-projectagentteaminstancessubagents)

---

## File Structure

```
.docs/
├── firestore-schema.md (v1.1)           # Main schema reference
├── schema-refinement-v1.1.md            # ProjectAgentTeamInstance changes
├── subagent-instance-design.md          # SubAgentInstance design doc
├── subagent-implementation-guide.md     # Developer quick reference
└── data-architecture-agent-team.md      # Original architecture doc
```

---

## Mission Control UI Mapping

### Agent Swarm Cards (Top Section)

**Data Source**: `projectAgentTeamInstances`

| UI Component | Field |
|--------------|-------|
| Team Name | `name` |
| Platform Icon | `platform` |
| Status Badge | `status` |
| Active Directive | `active_directive.summary` |
| Daily Actions Bar | `metrics.daily_actions_completed` / `metrics.daily_actions_quota` |
| Neural Sync Bar | `metrics.neural_sync_score` |

### Active Sub-Agents (Left Column)

**Data Source**: `projectAgentTeamInstances/{teamId}/subAgents`

| UI Component | Field |
|--------------|-------|
| Agent Name | `role_name` |
| Role Badge | `role_type` |
| Success Rate | `metrics.success_rate` |
| Last Active | `metrics.last_active_at` |
| Total Runs | `metrics.total_runs` |

---

## Implementation Checklist

### Backend

- [ ] Update Firestore Security Rules
  - [ ] Add rules for `subAgents` subcollection
  - [ ] Update `projectAgentTeamInstances` rules for new fields
  
- [ ] Create Firestore Indexes
  - [ ] `projectAgentTeamInstances` by `projectId`, `status`, `updated_at`
  - [ ] `subAgents` by `team_instance_id`, `display_order`
  - [ ] Collection group query for `subAgents` by `project_id`
  
- [ ] Implement Team Deployment Flow
  - [ ] Create `projectAgentTeamInstances` with new fields
  - [ ] Create `subAgents` subcollection from template
  - [ ] Resolve channel adapters
  
- [ ] Implement Metrics Update Logic
  - [ ] Update team metrics after runs
  - [ ] Update sub-agent metrics after runs
  - [ ] Implement success rate calculation
  - [ ] Implement daily quota reset (Cloud Function)

### Frontend

- [ ] Update Mission Control UI
  - [ ] Render Agent Swarm cards with new fields
  - [ ] Render Active Sub-Agents list
  - [ ] Handle missing/null metrics gracefully
  - [ ] Format timestamps (relative time)
  
- [ ] Implement Real-time Updates
  - [ ] Listen to `projectAgentTeamInstances` changes
  - [ ] Listen to `subAgents` changes
  - [ ] Update UI on metric changes
  
- [ ] Add Configuration UI
  - [ ] Edit active directive
  - [ ] Apply runtime overrides to sub-agents
  - [ ] Change autonomy mode

### Testing

- [ ] Unit Tests
  - [ ] Schema validation
  - [ ] Configuration resolution
  - [ ] Metric calculations
  
- [ ] Integration Tests
  - [ ] Team deployment with sub-agents
  - [ ] Metrics updates
  - [ ] Query performance
  
- [ ] UI Tests
  - [ ] Card rendering
  - [ ] Real-time updates
  - [ ] Error states

### Migration

- [ ] Existing Teams
  - [ ] Add new fields to existing `projectAgentTeamInstances`
  - [ ] Create `subAgents` subcollection for existing teams
  - [ ] Backfill metrics with default values
  
- [ ] Data Validation
  - [ ] Verify all teams have sub-agents
  - [ ] Verify metrics are updating correctly
  - [ ] Check for orphaned documents

---

## Quick Start Code

### Deploy a Team

```javascript
const teamId = await deployAgentTeam(
  projectId,
  channelId,
  templateId,
  currentUser
);
```

### Load Sub-Agents

```javascript
const subAgents = await loadSubAgents(teamId);
renderSubAgentCards(subAgents);
```

### Update Metrics

```javascript
await updateSubAgentMetrics(teamId, subAgentId, runResult);
```

See [Implementation Guide](./subagent-implementation-guide.md) for complete code examples.

---

## Database Queries

### Get Active Teams for Project

```javascript
const teams = await db
  .collection('projectAgentTeamInstances')
  .where('projectId', '==', projectId)
  .where('status', '==', 'active')
  .orderBy('updated_at', 'desc')
  .get();
```

### Get Sub-Agents for Team

```javascript
const subAgents = await db
  .collection('projectAgentTeamInstances')
  .doc(teamId)
  .collection('subAgents')
  .orderBy('display_order', 'asc')
  .get();
```

### Get All Active Sub-Agents in Project

```javascript
const allSubAgents = await db
  .collectionGroup('subAgents')
  .where('project_id', '==', projectId)
  .where('status', '==', 'active')
  .get();
```

---

## Performance Considerations

### Read Optimization
- ✅ All card data in single document (no joins)
- ✅ Sub-agents in subcollection (efficient querying)
- ✅ Indexed queries for fast filtering/sorting

### Write Optimization
- ✅ Field-level updates (not full document replacement)
- ✅ Batch writes for sub-agent creation
- ✅ `FieldValue.increment()` for counters

### Caching Strategy
- Cache team list per project (5-minute TTL)
- Cache sub-agents per team (5-minute TTL)
- Real-time listeners for active teams only

---

## Security

### Firestore Rules

```javascript
// Team instances
match /projectAgentTeamInstances/{teamId} {
  allow read: if isProjectMember(resource.data.projectId);
  allow write: if isProjectMember(request.resource.data.projectId);
}

// Sub-agents
match /projectAgentTeamInstances/{teamId}/subAgents/{subAgentId} {
  allow read: if isProjectMember(getTeamProjectId(teamId));
  allow write: if isProjectMember(getTeamProjectId(teamId));
}
```

---

## Migration Timeline

### Phase 1: Schema Update (Week 1)
- [ ] Deploy Firestore indexes
- [ ] Update security rules
- [ ] Deploy backend code

### Phase 2: Data Migration (Week 1-2)
- [ ] Backfill existing teams with new fields
- [ ] Create sub-agents for existing teams
- [ ] Validate data integrity

### Phase 3: UI Update (Week 2-3)
- [ ] Update Mission Control UI
- [ ] Test with real data
- [ ] Deploy to production

### Phase 4: Monitoring (Week 3-4)
- [ ] Monitor query performance
- [ ] Track metric update frequency
- [ ] Optimize as needed

---

## Rollback Plan

If issues arise:

1. **UI Rollback**: Revert to v1.0 UI (ignore new fields)
2. **Data Rollback**: New fields are optional, no data loss
3. **Full Rollback**: Remove indexes, revert security rules

**Risk**: Low - All changes are backward compatible

---

## Support & Questions

- **Schema Questions**: See [Firestore Schema v1.1](./firestore-schema.md)
- **Implementation Help**: See [Implementation Guide](./subagent-implementation-guide.md)
- **Design Rationale**: See [SubAgentInstance Design](./subagent-instance-design.md)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-28 | Initial schema |
| 1.1 | 2025-11-29 | Added Mission Control fields + SubAgentInstance subcollection |

---

**Next Steps**: Begin implementation with Phase 1 (Schema Update)

**Document Owner**: Data Architecture Team  
**Last Updated**: 2025-11-29
