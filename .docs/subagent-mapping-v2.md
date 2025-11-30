# Sub-Agent Template V2 Mapping Plan

This document outlines the plan to migrate existing Sub-Agent Templates to the V2 schema, introducing Role Families and Brand Brain metadata.

## 1. Schema Changes Overview

| Field | V1 (Legacy) | V2 (New) | Notes |
| :--- | :--- | :--- | :--- |
| **Engine Type** | `type` or `role` | `engineTypeId` | Standardized to 12 types |
| **Family** | N/A | `family` | 6 Role Families |
| **Display Name** | `name` | `displayName` | |
| **Runtime Rule** | `runtime_profile_id` | `roleTypeForRuntime` | Dynamic resolution metadata |
| **Language** | `primary_language` | `primaryLanguage` | |
| **Tier** | `preferred_tier` | `preferredTier` | |
| **Brand Brain** | N/A | `requiresBrandBrain` | Default: `false` |
| **Context Mode** | N/A | `brandContextMode` | Default: `none` |

## 2. Role Family Mapping Logic

| Engine Type (`engineTypeId`) | Role Family (`family`) |
| :--- | :--- |
| `planner`, `manager` | **strategy** |
| `creator_text`, `creator_image`, `creator_video` | **creation** |
| `engagement` | **conversation** |
| `compliance`, `evaluator`, `seo_watcher` | **governance** |
| `kpi`, `research` | **intelligence** |
| `knowledge_curator` | **memory** |

## 3. Existing Data Migration Plan

Based on the current snapshot of `subAgentTemplates`:

### 1. General Manager Template (`sa_tpl_manager_general`)
- **Current**: `role: "manager"`, `role_type: "writer_short"`
- **V2 Mapping**:
  - `engineTypeId`: `manager`
  - `family`: `strategy`
  - `roleTypeForRuntime`: `manager` (Correcting from `writer_short`)
  - `requiresBrandBrain`: `true` (Managers usually need context)
  - `brandContextMode`: `light`

### 2. General Planner Template (`sa_tpl_planner_general`)
- **Current**: `role: "planner"`, `role_type: "planner"`
- **V2 Mapping**:
  - `engineTypeId`: `planner`
  - `family`: `strategy`
  - `roleTypeForRuntime`: `strategist`
  - `requiresBrandBrain`: `true`
  - `brandContextMode`: `full`

### 3. Twitter Creator Template (`sa_tpl_twitter_creator`)
- **Current**: `role: "creator"`, `channel_type: "twitter"`
- **V2 Mapping**:
  - `engineTypeId`: `creator_text`
  - `family`: `creation`
  - `roleTypeForRuntime`: `creator`
  - `requiresBrandBrain`: `false` (Usually just follows prompt)
  - `brandContextMode`: `none`

### 4. Planner v1 (`tpl_Planner_v1_0_0`)
- **Current**: `type: "Planner"`
- **V2 Mapping**:
  - `engineTypeId`: `planner`
  - `family`: `strategy`
  - `roleTypeForRuntime`: `strategist`
  - `requiresBrandBrain`: `true`
  - `brandContextMode`: `light`

## 4. Migration Strategy
- **Phase 1**: Update Admin UI to support new fields (Step 1).
- **Phase 2**: Manually update or run a script to apply V2 fields to existing documents (Future Step).
- **Fallback**: If V2 fields are missing, the system should fall back to V1 fields (`type`, `role`) to determine behavior.
