# Runtime Profile v2.0 Execution Flow

This document outlines how the **Runtime Profile v2.0** system integrates with the Mission Control execution logic. It describes the flow from Sub-Agent creation to LLM client configuration.

## 1. Sub-Agent Creation (Deployment)

When a Team is deployed via Mission Control (`project-detail.js`):

1.  **Template Lookup**: The deployment logic retrieves the `SubAgentTemplate` associated with each role in the team.
2.  **Profile Link**: It extracts the `runtime_profile_id` from the template.
3.  **Instance Creation**: A new `SubAgentInstance` is created in `projectAgentTeamInstances/{teamId}/subAgents`.
4.  **Data Propagation**: The `runtime_profile_id` is stored directly on the `SubAgentInstance` document.

**Firestore Path**: `projectAgentTeamInstances/{teamId}/subAgents/{agentId}`

```json
{
  "id": "agent_...",
  "role_type": "writer_short",
  "template_id": "tpl_writer_short_v1",
  "runtime_profile_id": "rtp_writer_short_en_balanced_v1",
  "status": "active",
  ...
}
```

## 2. Execution Request (Mission Control)

When Mission Control triggers an action for a Sub-Agent:

1.  **Context Retrieval**: The execution engine (Cloud Function or Backend Service) receives the `agentId`.
2.  **Instance Lookup**: It fetches the `SubAgentInstance` document.
3.  **Profile Resolution**: It reads the `runtime_profile_id` from the instance.
    *   *Fallback*: If `runtime_profile_id` is missing, it falls back to a default profile based on `role_type` (e.g., `rtp_{roleType}_en_balanced_v1`).

## 3. LLM Client Configuration

Using the resolved `runtime_profile_id`, the engine fetches the **Runtime Profile** definition from the `runtimeProfiles` collection.

**Firestore Path**: `runtimeProfiles/{runtimeProfileId}`

```json
{
  "id": "rtp_writer_short_en_balanced_v1",
  "provider": "openai",
  "model_id": "gpt-4o-mini",
  "capabilities": { ... },
  "cost_hint": { "tier": "balanced" }
}
```

The engine then configures the LLM client:

*   **Provider**: Sets the API client (e.g., OpenAI, Anthropic, Google).
*   **Model**: Sets the specific model ID (e.g., `gpt-4o-mini`).
*   **Parameters**: Applies any profile-specific parameters (temperature, max tokens) if defined in the profile or overrides from the template config.

## 4. Execution & Logging

1.  **Execution**: The LLM call is made.
2.  **Cost Tracking**: The `cost_hint` from the profile is used to tag the usage log for cost analysis.
3.  **History**: The execution result is stored in `agentExecutionHistory`, referencing the `runtime_profile_id` used.

## 5. Updates & Versioning

*   **Profile Updates**: If a Runtime Profile is updated (e.g., changing the underlying model for "Balanced" tier), all Sub-Agents using that profile ID automatically inherit the change on their next run.
*   **Overrides**: If a specific Sub-Agent needs a different profile, the `runtime_profile_id` on its Instance document can be updated directly (via Admin UI or API).
