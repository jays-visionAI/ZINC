# Runtime Resolver Implementation Guide

**Version**: 1.0.0  
**Date**: 2025-11-30  
**Status**: Implemented

---

## 📋 Overview

Runtime Resolver는 `runtimeProfileRules` 컬렉션에서 Rule을 읽어 실제 실행에 사용할 LLM 설정을 동적으로 생성하는 유틸리티입니다.

---

## 🎯 Core Function

### `resolveRuntimeConfig(meta)`

**입력:**
```javascript
{
  role_type: string,      // Required: planner, creator_text, etc.
  language?: string,      // Optional: ko, en, global (default: 'global')
  tier?: string          // Optional: creative, balanced, precise (default: 'balanced')
}
```

**출력:**
```javascript
{
  provider: string,           // 'openai', 'anthropic', etc.
  model_id: string,          // 'gpt-4', 'claude-3-sonnet', etc.
  temperature: number,       // 0.0 - 1.0
  top_p?: number,           // Optional
  max_tokens?: number,      // Optional
  runtime_rule_id: string,  // Source rule document ID
  resolved_language: string, // Actual language used (after fallback)
  resolved_tier: string     // Actual tier used (after fallback)
}
```

---

## 🔍 Resolution Logic

### 1. Input Normalization
```javascript
role = meta.role_type
lang = (meta.language || 'global').toLowerCase()
tier = meta.tier || 'balanced'
```

### 2. Rule Search (with Fallback)

**Priority Order:**
1. **Exact Match**: `engine_type = role AND language = lang`
2. **Global Fallback**: `engine_type = role AND language = 'global'`
3. **Error**: No rule found

**Example:**
```javascript
// Request: role_type='planner', language='ko'
// 1. Search: planner + ko → Not found
// 2. Search: planner + global → Found! ✓
```

### 3. Tier Selection (with Fallback)

**Priority Order:**
1. **Requested Tier**: Use `rule.tiers[tier]` if exists
2. **Fallback Order**: `balanced` → `creative` → `precise`
3. **Error**: No tier configuration found

**Example:**
```javascript
// Request: tier='premium' (not exists)
// 1. Try: premium → Not found
// 2. Try: balanced → Found! ✓
```

---

## 🚀 Usage Examples

### Basic Usage
```javascript
const config = await resolveRuntimeConfig({
  role_type: 'planner',
  language: 'ko',
  tier: 'balanced'
});

console.log(config);
// {
//   provider: 'openai',
//   model_id: 'gpt-4',
//   temperature: 0.7,
//   max_tokens: 2000,
//   runtime_rule_id: 'rpr_planner_global_v1',
//   resolved_language: 'global',
//   resolved_tier: 'balanced'
// }
```

### With Defaults
```javascript
// Only role_type is required
const config = await resolveRuntimeConfig({
  role_type: 'creator_text'
});
// Uses: language='global', tier='balanced'
```

### Batch Resolution
```javascript
const configs = await batchResolveRuntimeConfig([
  { role_type: 'planner', tier: 'creative' },
  { role_type: 'creator_text', tier: 'balanced' },
  { role_type: 'evaluator', tier: 'precise' }
]);
```

### Get Available Tiers
```javascript
const tiers = await getAvailableTiers('planner', 'global');
// ['creative', 'balanced', 'precise']
```

### Get All Rules
```javascript
const rules = await getAllRuntimeRules();
// Array of all active rules
```

---

## 🧪 Testing

### Interactive Tester
Open `test-runtime-resolver.html` in your browser:
```
http://localhost:8000/test-runtime-resolver.html
```

**Features:**
- Test different role/language/tier combinations
- View all available rules
- Check available tiers for specific roles
- Real-time console output

### Browser Console Testing
```javascript
// The resolver is exposed to window for debugging
await resolveRuntimeConfig({
  role_type: 'planner',
  language: 'ko',
  tier: 'balanced'
});

// Get all rules
await getAllRuntimeRules();

// Check available tiers
await getAvailableTiers('creator_text', 'global');
```

---

## 📊 Resolution Examples

### Example 1: Exact Match
```javascript
// Input
{ role_type: 'planner', language: 'global', tier: 'balanced' }

// Resolution Path
1. Search: planner + global → Found ✓
2. Tier: balanced → Found ✓

// Output
{
  provider: 'openai',
  model_id: 'gpt-4',
  temperature: 0.7,
  max_tokens: 2000,
  runtime_rule_id: 'rpr_planner_global_v1',
  resolved_language: 'global',
  resolved_tier: 'balanced'
}
```

### Example 2: Language Fallback
```javascript
// Input
{ role_type: 'creator_text', language: 'ko', tier: 'creative' }

// Resolution Path
1. Search: creator_text + ko → Not found
2. Search: creator_text + global → Found ✓
3. Tier: creative → Found ✓

// Output
{
  provider: 'openai',
  model_id: 'gpt-4-turbo',
  temperature: 1.0,
  max_tokens: 2000,
  runtime_rule_id: 'rpr_creator_text_global_v1',
  resolved_language: 'global',  // ← Fallback
  resolved_tier: 'creative'
}
```

### Example 3: Tier Fallback
```javascript
// Input
{ role_type: 'engagement', language: 'global', tier: 'premium' }

// Resolution Path
1. Search: engagement + global → Found ✓
2. Tier: premium → Not found
3. Tier: balanced → Found ✓ (fallback)

// Output
{
  provider: 'openai',
  model_id: 'gpt-4',
  temperature: 0.7,
  max_tokens: 300,
  runtime_rule_id: 'rpr_engagement_global_v1',
  resolved_language: 'global',
  resolved_tier: 'balanced'  // ← Fallback
}
```

---

## 🔧 Integration Points

### 1. Agent Team Wizard
```javascript
// In admin-agentteams.js
async function createAgentTeam(teamData) {
  const roles = teamData.roles;
  
  for (const role of roles) {
    const runtimeConfig = await resolveRuntimeConfig({
      role_type: role.type,
      language: teamData.language || 'global',
      tier: role.tier || 'balanced'
    });
    
    role.runtime_config = runtimeConfig;
  }
  
  // Save to Firestore...
}
```

### 2. Workflow Orchestrator
```javascript
// In utils-workflow-orchestrator.js
async function executeStep(step, subAgentInstance) {
  const runtimeConfig = await resolveRuntimeConfig({
    role_type: subAgentInstance.engine_type,
    language: step.language,
    tier: step.tier
  });
  
  // Call LLM with resolved config...
}
```

### 3. Sub-Agent Execution
```javascript
// In utils-llm-executor.js
async function executeSubAgent(subAgent, context) {
  const runtimeConfig = await resolveRuntimeConfig({
    role_type: subAgent.role_type,
    language: context.language,
    tier: context.tier
  });
  
  const response = await callLLM(runtimeConfig, context.prompt);
  return response;
}
```

---

## ⚠️ Error Handling

### No Rule Found
```javascript
try {
  await resolveRuntimeConfig({ role_type: 'invalid_role' });
} catch (error) {
  // Error: No runtime profile rule found for role_type: invalid_role
}
```

### No Tier Configuration
```javascript
// If rule exists but has no tiers defined
try {
  await resolveRuntimeConfig({ role_type: 'planner' });
} catch (error) {
  // Error: No tier configuration found in rule: rpr_planner_global_v1
}
```

---

## 📈 Performance Considerations

### Caching (Future Enhancement)
```javascript
// Cache rules in memory to avoid repeated Firestore queries
const ruleCache = new Map();

async function resolveRuntimeConfigCached(meta) {
  const cacheKey = `${meta.role_type}_${meta.language}_${meta.tier}`;
  
  if (ruleCache.has(cacheKey)) {
    return ruleCache.get(cacheKey);
  }
  
  const config = await resolveRuntimeConfig(meta);
  ruleCache.set(cacheKey, config);
  return config;
}
```

### Batch Operations
- Use `batchResolveRuntimeConfig()` for multiple resolutions
- Reduces total query time through parallel execution

---

## 🎯 Next Steps

### Phase 1: Current (Completed)
- [x] Create `runtimeProfileRules` collection
- [x] Implement seeding script
- [x] Build resolver utility
- [x] Add testing tools

### Phase 2: Integration
- [ ] Update Agent Team Wizard to use resolver
- [ ] Integrate with Workflow Orchestrator
- [ ] Add UI for rule management

### Phase 3: Enhancement
- [ ] Add language-specific rules (ko, ja, zh)
- [ ] Implement rule versioning
- [ ] Add performance monitoring
- [ ] Build admin UI for rule editing

---

## 📝 API Reference

### Functions

#### `resolveRuntimeConfig(meta)`
Resolves runtime configuration from rules.

**Parameters:**
- `meta.role_type` (string, required): Engine type
- `meta.language` (string, optional): Language code (default: 'global')
- `meta.tier` (string, optional): Tier name (default: 'balanced')

**Returns:** Promise<Object> - Resolved configuration

**Throws:** Error if no rule found or invalid configuration

---

#### `batchResolveRuntimeConfig(metaArray)`
Batch resolve multiple configurations.

**Parameters:**
- `metaArray` (Array<Object>): Array of meta objects

**Returns:** Promise<Array<Object>> - Array of resolved configurations

---

#### `getAllRuntimeRules()`
Get all active runtime profile rules.

**Returns:** Promise<Array<Object>> - Array of rule objects

---

#### `getAvailableTiers(role_type, language)`
Get available tiers for a specific role and language.

**Parameters:**
- `role_type` (string): Engine type
- `language` (string, optional): Language code (default: 'global')

**Returns:** Promise<Array<string>> - Array of tier names

---

#### `validateRuntimeConfig(meta)`
Validate if a runtime configuration is valid.

**Parameters:**
- `meta` (Object): Metadata to validate

**Returns:** Promise<Object> - Validation result with `valid`, `config`, and `warnings` fields

---

## 🔗 Related Documents

- [Runtime Profile Cleanup Plan](./runtime-profile-cleanup-plan.md)
- [Runtime Profile Catalog v2.0](./runtime-profile-catalog-v2.0.md)
- [Runtime Profile Execution Flow v2.0](./runtime-profile-execution-flow-v2.0.md)
