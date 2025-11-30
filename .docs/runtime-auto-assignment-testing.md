# Runtime Profile Auto-Assignment Testing Guide

**Version**: 1.0.0  
**Date**: 2025-11-30  
**Status**: Ready for Testing

---

## 🎯 Overview

This guide walks you through testing the new **Runtime Profile Auto-Assignment** system in the Agent Team Creation Wizard.

**What Changed:**
- ❌ **Old**: Manual selection of Runtime Profiles from dropdown
- ✅ **New**: Automatic assignment based on `runtimeProfileRules` collection

---

## 📋 Prerequisites

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

**Or via Firebase Console:**
1. Go to https://console.firebase.google.com/
2. Select project "zinc-c790f"
3. Firestore Database → Rules tab
4. Copy content from `firestore.rules` and publish

### 2. Seed Runtime Profile Rules
1. Open: `http://localhost:8000/seed-runtime-rules.html`
2. Login as **Admin**
3. Click "Seed Runtime Profile Rules"
4. Verify: "Successfully created 12 runtime profile rules"

### 3. Verify Rules in Firestore
Open Firebase Console → Firestore Database → `runtimeProfileRules` collection

**Expected: 12 documents**
- `rpr_planner_global_v1`
- `rpr_research_global_v1`
- `rpr_creator_text_global_v1`
- `rpr_creator_image_global_v1`
- `rpr_creator_video_global_v1`
- `rpr_engagement_global_v1`
- `rpr_compliance_global_v1`
- `rpr_evaluator_global_v1`
- `rpr_manager_global_v1`
- `rpr_kpi_global_v1`
- `rpr_seo_watcher_global_v1`
- `rpr_knowledge_curator_global_v1`

---

## 🧪 Test Cases

### Test 1: Create Agent Team with Auto-Assignment

**Steps:**
1. Open: `http://localhost:8000/admin.html#agentteams`
2. Click "+ Create Agent Template"
3. **Step 1: Basic Info**
   - Name: "Test Auto-Assignment Team"
   - Description: "Testing automatic runtime config resolution"
   - Status: Active
   - Click "Next Step"

4. **Step 2: Role Selection**
   - Select at least 3 roles:
     - ✅ Planner
     - ✅ Creator.Text
     - ✅ Research
   - Click "Next Step"

5. **Step 3: Runtime Configuration (Auto-Assigned)**
   - ✅ **Verify**: No dropdown selectors visible
   - ✅ **Verify**: Info banner shows: "Configurations are resolved from runtimeProfileRules collection"
   - ✅ **Verify**: Each role shows auto-assigned config:
     ```
     Provider: openai
     Model: gpt-4 / gpt-4-turbo
     Tier: balanced / creative / precise
     Language: global
     Temperature: 0.X
     Max Tokens: XXXX
     Rule: rpr_XXX_global_v1
     ```
   - ✅ **Verify**: No error messages
   - Click "Next Step"

6. **Step 4: Review & Create**
   - ✅ **Verify**: All roles listed
   - Click "Create Template"

7. **Verify in Firestore**
   - Open: Firestore → `agentSetTemplates` collection
   - Find the newly created template
   - ✅ **Verify**: Each role has `runtime_config` object:
     ```javascript
     {
       provider: "openai",
       model_id: "gpt-4",
       temperature: 0.7,
       max_tokens: 2000,
       runtime_rule_id: "rpr_planner_global_v1",
       resolved_language: "global",
       resolved_tier: "balanced"
     }
     ```

**Expected Result:** ✅ Template created successfully with auto-assigned runtime configs

---

### Test 2: Browser Console Testing

**Steps:**
1. Open: `http://localhost:8000/admin.html#agentteams`
2. Open Browser Console (F12)
3. Run test commands:

```javascript
// Test 1: Resolve single config
await resolveRuntimeConfig({
  role_type: 'planner',
  language: 'global',
  tier: 'balanced'
});
// Expected: Returns config object with provider, model_id, etc.

// Test 2: Resolve with language fallback
await resolveRuntimeConfig({
  role_type: 'creator_text',
  language: 'ko',  // Not exists, should fallback to 'global'
  tier: 'creative'
});
// Expected: resolved_language = 'global'

// Test 3: Resolve with tier fallback
await resolveRuntimeConfig({
  role_type: 'engagement',
  tier: 'premium'  // Not exists, should fallback to 'balanced'
});
// Expected: resolved_tier = 'balanced'

// Test 4: Get all rules
await getAllRuntimeRules();
// Expected: Array of 12 rules

// Test 5: Get available tiers
await getAvailableTiers('planner', 'global');
// Expected: ['creative', 'balanced', 'precise']
```

**Expected Result:** ✅ All commands return expected values without errors

---

### Test 3: Interactive Resolver Tester

**Steps:**
1. Open: `http://localhost:8000/test-runtime-resolver.html`
2. **Test Different Combinations:**
   - Role Type: `planner`, Language: `global`, Tier: `balanced`
   - Click "Resolve Config"
   - ✅ **Verify**: Shows resolved config in result panel
   
3. **Test Fallback:**
   - Role Type: `creator_text`, Language: `ko`, Tier: `creative`
   - Click "Resolve Config"
   - ✅ **Verify**: `resolved_language` = `global` (fallback)

4. **Test Get All Rules:**
   - Click "Get All Rules"
   - ✅ **Verify**: Shows 12 rules with details

5. **Test Get Available Tiers:**
   - Role Type: `planner`, Language: `global`
   - Click "Get Available Tiers"
   - ✅ **Verify**: Shows `['creative', 'balanced', 'precise']`

**Expected Result:** ✅ All tests pass, UI shows correct data

---

### Test 4: Error Handling

**Test 4.1: Invalid Role Type**
```javascript
await resolveRuntimeConfig({
  role_type: 'invalid_role'
});
// Expected: Error: "No runtime profile rule found for role_type: invalid_role"
```

**Test 4.2: Missing runtimeProfileRules**
1. Temporarily delete all rules from Firestore
2. Try to create Agent Team
3. ✅ **Verify**: Step 3 shows error message for each role
4. Re-seed rules using `seed-runtime-rules.html`

**Expected Result:** ✅ Appropriate error messages displayed

---

## 🔍 Verification Checklist

### UI Verification
- [ ] Step 3 shows "Runtime Configuration (Auto-Assigned)" title
- [ ] Info banner explains auto-assignment
- [ ] No dropdown selectors visible
- [ ] Each role shows config card with:
  - [ ] Provider
  - [ ] Model
  - [ ] Tier
  - [ ] Language
  - [ ] Temperature
  - [ ] Max Tokens (if applicable)
  - [ ] Rule ID
- [ ] Loading state shows while resolving
- [ ] Error states display appropriately

### Data Verification
- [ ] `runtimeProfileRules` collection has 12 documents
- [ ] Each rule has `tiers` object with 3 tiers
- [ ] Created templates have `runtime_config` in each role
- [ ] No references to old `runtimeProfiles` collection in wizard

### Functionality Verification
- [ ] Resolver functions available in browser console
- [ ] Language fallback works (ko → global)
- [ ] Tier fallback works (premium → balanced)
- [ ] Batch resolution works for multiple roles
- [ ] Error handling works for invalid inputs

---

## 🐛 Common Issues & Solutions

### Issue 1: "Missing or insufficient permissions"
**Solution:** Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```

### Issue 2: "No runtime profile rule found"
**Solution:** Seed the rules
1. Open `http://localhost:8000/seed-runtime-rules.html`
2. Click "Seed Runtime Profile Rules"

### Issue 3: "resolveRuntimeConfig is not defined"
**Solution:** Verify `utils-runtime-resolver.js` is loaded
- Check browser console for script errors
- Verify `admin.html` includes the script

### Issue 4: Step 3 shows old dropdown UI
**Solution:** Hard refresh the page
- Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Clear browser cache

---

## 📊 Success Criteria

✅ **All tests pass if:**
1. 12 runtime profile rules exist in Firestore
2. Agent Team wizard Step 3 shows auto-assigned configs
3. No manual dropdown selection required
4. Created templates have `runtime_config` in Firestore
5. Browser console tests return expected values
6. Error handling works correctly
7. Fallback logic works (language → global, tier → balanced)

---

## 🚀 Next Steps After Testing

### If All Tests Pass:
1. ✅ Mark this feature as complete
2. ✅ Update documentation
3. ✅ Deploy to production
4. ✅ Monitor for issues

### If Tests Fail:
1. ❌ Document the failure
2. ❌ Check browser console for errors
3. ❌ Verify Firestore rules are deployed
4. ❌ Verify rules are seeded correctly
5. ❌ Report issues with screenshots

---

## 📝 Test Results Template

```
Test Date: ___________
Tester: ___________
Environment: Local / Staging / Production

Test 1: Create Agent Team
- Step 1: ✅ / ❌
- Step 2: ✅ / ❌
- Step 3: ✅ / ❌
- Step 4: ✅ / ❌
- Firestore Verification: ✅ / ❌

Test 2: Browser Console
- Test 1: ✅ / ❌
- Test 2: ✅ / ❌
- Test 3: ✅ / ❌
- Test 4: ✅ / ❌
- Test 5: ✅ / ❌

Test 3: Interactive Tester
- Basic Resolution: ✅ / ❌
- Fallback Logic: ✅ / ❌
- Get All Rules: ✅ / ❌
- Get Available Tiers: ✅ / ❌

Test 4: Error Handling
- Invalid Role Type: ✅ / ❌
- Missing Rules: ✅ / ❌

Overall Result: ✅ PASS / ❌ FAIL
Notes: ___________
```

---

## 🔗 Related Documents

- [Runtime Profile Cleanup Plan](./runtime-profile-cleanup-plan.md)
- [Runtime Resolver Implementation](./runtime-resolver-implementation.md)
- [Runtime Profile Catalog v2.0](./runtime-profile-catalog-v2.0.md)
