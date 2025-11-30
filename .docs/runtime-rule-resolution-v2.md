# Runtime Rule Resolution V2

This document describes the dynamic resolution logic for determining the LLM configuration for a Sub-Agent execution.

## Overview

The `resolveRuntimeConfig` function combines metadata from the **Sub-Agent Template** and **Sub-Agent Instance** with predefined **Runtime Profile Rules** to produce the final configuration (model, temperature, etc.).

## Resolution Logic

1.  **Input**:
    *   `SubAgentTemplate`: Contains `engineTypeId`, `roleTypeForRuntime`, `primaryLanguage`, `preferredTier`.
    *   `SubAgentInstance` (Optional): Contains `runtimeRuleOverrideId`.

2.  **Rule Selection**:
    *   **Priority 1 (Instance Override)**: If `SubAgentInstance.runtimeRuleOverrideId` is present, fetch that specific `RuntimeProfileRule`.
    *   **Priority 2 (Engine Default)**: If no override, query `runtimeProfileRules` where `engine_type` matches `SubAgentTemplate.engineTypeId`.

3.  **Configuration Merge**:
    *   **Base Config**: Get model config from the Rule for the requested `preferredTier` (e.g., 'balanced').
    *   **Language Override**: If the Rule has an override for `primaryLanguage` + `preferredTier`, merge it.
    *   **Template Config**: Merge specific settings from `SubAgentTemplate.config` (e.g., temperature) if they exist.

4.  **Output**:
    *   Final LLM Configuration object.

## Examples

### Scenario 1: Standard Execution (Korean Planner)

*   **Template**:
    *   `engineTypeId`: `planner`
    *   `primaryLanguage`: `ko`
    *   `preferredTier`: `balanced`
*   **Instance**: No override.
*   **Rule (`rule_planner`)**:
    *   `models.balanced`: `{ model_id: "gpt-4", temperature: 0.7 }`
    *   `language_overrides.ko.balanced`: `{ system_prompt_append: "한국어 문화적 맥락 고려" }`
*   **Result**:
    *   `model_id`: `gpt-4`
    *   `temperature`: `0.7`
    *   `language`: `ko`
    *   `system_prompt_append`: "한국어 문화적 맥락 고려"

### Scenario 2: Instance Override (Force Creative Mode)

*   **Template**: `creator_text` (Tier: Balanced)
*   **Instance**: `runtimeRuleOverrideId`: `rule_creative_chaos_v1`
*   **Rule (`rule_creative_chaos_v1`)**:
    *   `models.balanced`: `{ model_id: "claude-3-opus", temperature: 0.9 }`
*   **Result**:
    *   `model_id`: `claude-3-opus`
    *   `temperature`: `0.9`
    *   `resolution_source`: `instance_override`

## Usage

```javascript
// In your execution logic:
const config = await resolveRuntimeConfig(template, instance);
console.log(`Using model: ${config.model_id}`);
```
