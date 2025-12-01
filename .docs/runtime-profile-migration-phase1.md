# Runtime Profile Migration - Phase 1

## Overview
Phase 1 focuses on transitioning from the `runtimeProfiles` collection to a rule-based system using `runtimeProfileRules` with runtime snapshots stored in agent team instances.

## Completed Tasks

### 1. Firestore Rules Update ✅
- **Removed**: `runtimeProfiles` collection rules (lines 115-119)
- **Kept**: `runtimeProfileRules` as Admin-only (read/write)
- **Result**: Users can no longer directly access `runtimeProfiles`, but can read runtime configs from their agent team instances

### 2. Data Model Changes

#### runtimeProfileRules Collection (Admin-only)
**Path**: `/runtimeProfileRules/{ruleId}`

**Schema**:
```typescript
interface RuntimeProfileRule {
  id: string; // e.g., "rpr_planner_global_v1"
  engine_type: EngineType; // planner, research, creator_text, etc.
  language: string; // "global", "en", "ko", etc.
  tiers: {
    balanced: TierConfig;
    creative: TierConfig;
    precise: TierConfig;
  };
  status: "active" | "deprecated";
  version: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TierConfig {
  model_id: string; // e.g., "gpt-4o-mini"
  max_tokens: number;
  temperature: number;
  top_p: number;
  cost_hint: string; // "low", "standard", "high"
  provider?: string; // "openai", "anthropic", etc.
}

type EngineType = 
  | "planner"
  | "research"
  | "creator_text"
  | "creator_image"
  | "creator_video"
  | "engagement"
  | "compliance"
  | "evaluator"
  | "manager"
  | "kpi"
  | "seo_watcher"
  | "knowledge_curator";
```

#### projectAgentTeamInstances/subAgents (User-readable)
**Path**: `/projectAgentTeamInstances/{instanceId}/subAgents/{subAgentId}`

**New Fields**:
```typescript
interface SubAgentInstance {
  // ... existing fields ...
  role_type: EngineType; // e.g., "planner", "creator_text"
  
  // Runtime Configuration Snapshot
  runtime_base: RuntimeSnapshot; // Resolved from runtimeProfileRules
  runtime_override: RuntimeSnapshot | null; // User customizations (future)
  effective_runtime: RuntimeSnapshot; // Merged result (currently = runtime_base)
}

interface RuntimeSnapshot {
  rule_id: string; // Reference to runtimeProfileRules document
  tier: "balanced" | "creative" | "precise";
  language: string;
  provider: string;
  model_id: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  cost_hint: string;
}
```

### 3. Data Flow

**Old Flow** (Deprecated):
```
User → runtimeProfiles → Read config directly
```

**New Flow** (Phase 1):
```
Admin → runtimeProfileRules (manage rules)
       ↓
RuntimeResolver (resolve rules based on role_type, language, tier)
       ↓
runtime_base snapshot (stored in subAgent instance)
       ↓
User → Read effective_runtime from their agent instances
```

**Future Flow** (Phase 2+):
```
runtime_base + runtime_override → effective_runtime
(Allows per-plan customization)
```

### 4. Security Model

| Collection | Admin | User |
|:---|:---|:---|
| `runtimeProfileRules` | Read/Write | ❌ No Access |
| `projectAgentTeamInstances` | Read/Write | Read Only |
| `projectAgentTeamInstances/subAgents` | Read/Write | Read Only |

**Rationale**:
- Rules are system configuration → Admin-only
- Users need to see what runtime config their agents use → Read from instances
- Users cannot modify rules or instances directly → Prevents tampering

### 5. Migration Status

#### Completed
- ✅ Firestore Rules updated
- ✅ Schema documentation created
- ✅ Security model defined

#### Pending (Future Phases)
- ⏳ RuntimeResolver implementation
- ⏳ Automatic snapshot creation during team deployment
- ⏳ Admin UI migration from `runtimeProfiles` to `runtimeProfileRules`
- ⏳ Firestore data migration script
- ⏳ `runtime_override` UI for premium plans

### 6. Legacy Code

The following files still reference `runtimeProfiles` and will be migrated in future phases:

**Admin Pages** (to be converted to use `runtimeProfileRules`):
- `admin-runtime-profiles.js` (lines 157, 419, 477, 499, 502, 545, 573, 597)
- `admin-agentteams.js` (lines 29, 152, 190, 192, 199, 206, 207, 210, 212)
- `admin-subagents.js` (lines 545, 546)

**Scripts** (legacy/migration tools):
- `migrate-runtime-profiles.js`
- `scripts/init-phase1-collections.js`
- `scripts/config-resolver.js`
- `scripts/seed-phase2-data.js`
- `scripts/llm-router.js`
- `check_profiles.js`

**Action**: These will be updated when RuntimeResolver is implemented.

### 7. Testing Checklist

- [ ] Verify `runtimeProfileRules` collection exists with sample data
- [ ] Confirm Admin can read/write `runtimeProfileRules`
- [ ] Confirm Users cannot access `runtimeProfileRules` (should get permission denied)
- [ ] Verify Users can read `projectAgentTeamInstances` and `subAgents`
- [ ] Test that `runtime_base` field can be read by users from their instances

## Next Steps (Phase 2)

1. Implement `RuntimeResolver` utility
2. Update `deployTeam` function to create `runtime_base` snapshots
3. Create Admin migration tool to convert `runtimeProfiles` → `runtimeProfileRules`
4. Add UI for viewing `effective_runtime` in Mission Control
5. Implement `runtime_override` for premium plan users
