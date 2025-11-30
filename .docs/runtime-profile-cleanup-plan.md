# Runtime Profile Cleanup Plan

**Version**: 1.0.0  
**Date**: 2025-11-30  
**Purpose**: 정답표 (Master Reference) for Runtime Profile Reorganization

---

## 📋 Overview

이 문서는 ZYNK의 Runtime Profile 구조를 v2 Rule 기반으로 정리하기 위한 **정답표(Master Reference)**입니다.

**소스:**
- `runtimeProfileRules` 컬렉션 (Firestore)
- `.docs/runtime-profile-catalog-v2.0.md`
- `scripts/init-runtime-profile-rules.js`

**목적:**
- 기존 `runtimeProfiles` 컬렉션의 중복/불일치 데이터를 정리
- Rule 기반 동적 생성 시스템으로 전환
- 12개 엔진타입 × 언어 × 티어 조합을 명확히 정의

---

## 🎯 Rule-Based Profile Matrix

### 1. Engine Types (12개)

| # | Engine Type | Role Family | Description |
|---|---|---|---|
| 1 | `planner` | Strategy | 전략적 콘텐츠 기획 및 스케줄링 |
| 2 | `research` | Intelligence | 시장 분석 및 트렌드 조사 |
| 3 | `creator_text` | Creation | 텍스트 콘텐츠 생성 |
| 4 | `creator_image` | Creation | 이미지 생성 및 디자인 |
| 5 | `creator_video` | Creation | 비디오 스크립트 및 스토리보드 |
| 6 | `engagement` | Conversation | 댓글 및 상호작용 관리 |
| 7 | `compliance` | Governance | 팩트 체크 및 안전성 검증 |
| 8 | `evaluator` | Governance | 품질 평가 및 점수 산정 |
| 9 | `manager` | Strategy | 최종 승인 및 의사결정 |
| 10 | `kpi` | Intelligence | 성과 최적화 및 분석 |
| 11 | `seo_watcher` | Intelligence | SEO 정책 모니터링 |
| 12 | `knowledge_curator` | Memory | 브랜드 메모리 및 지식 관리 |

### 2. Tiers (3개)

| Tier Code | Full Name | Use Case | Typical Model |
|---|---|---|---|
| `creative` | Creative | 창의적 생성, 높은 다양성 | GPT-4 Turbo (temp: 0.8-1.0) |
| `balanced` | Balanced | 균형잡힌 품질/비용 | GPT-4 / GPT-4o-mini (temp: 0.5-0.7) |
| `precise` | Precise | 정확성 우선, 낮은 변동성 | GPT-4 (temp: 0.1-0.3) |

### 3. Languages (13개)

| Code | Language | Priority |
|---|---|---|
| `global` | Language Agnostic | High |
| `en` | English | High |
| `ko` | Korean | High |
| `ja` | Japanese | Medium |
| `zh` | Chinese | Medium |
| `es` | Spanish | Medium |
| `fr` | French | Low |
| `de` | German | Low |
| `th` | Thai | Low |
| `it` | Italian | Low |
| `pt` | Portuguese | Low |
| `ru` | Russian | Low |
| `ar` | Arabic | Low |

---

## 📊 Master Reference Table

### Rule ID Format
`rule_{engine_type}_v1`

### Profile ID Format (Catalog v2.0)
`rtp_{roleType}_{languageCode}_{tierCode}_v1`

### Complete Rule Matrix

```
[Rule] role_type=planner, language=GLOBAL, tier=creative → gpt-4-turbo (temp: 0.9, max: 3000)
[Rule] role_type=planner, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.7, max: 2000)
[Rule] role_type=planner, language=GLOBAL, tier=precise → gpt-4 (temp: 0.3, max: 2000)
[Rule] role_type=planner, language=ja, tier=balanced → claude-3-sonnet-20240229 (override)

[Rule] role_type=research, language=GLOBAL, tier=creative → gpt-4-turbo (temp: 0.8, max: 4000)
[Rule] role_type=research, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.6, max: 3000)
[Rule] role_type=research, language=GLOBAL, tier=precise → gpt-4 (temp: 0.2, max: 3000)

[Rule] role_type=creator_text, language=GLOBAL, tier=creative → gpt-4-turbo (temp: 1.0, max: 2000)
[Rule] role_type=creator_text, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.8, max: 1500)
[Rule] role_type=creator_text, language=GLOBAL, tier=precise → gpt-4 (temp: 0.5, max: 1500)

[Rule] role_type=creator_image, language=GLOBAL, tier=creative → dall-e-3 (temp: 0.9, max: 1000)
[Rule] role_type=creator_image, language=GLOBAL, tier=balanced → dall-e-3 (temp: 0.7, max: 1000)
[Rule] role_type=creator_image, language=GLOBAL, tier=precise → dall-e-3 (temp: 0.5, max: 1000)

[Rule] role_type=creator_video, language=GLOBAL, tier=creative → gpt-4-turbo (temp: 0.9, max: 3000)
[Rule] role_type=creator_video, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.7, max: 2500)
[Rule] role_type=creator_video, language=GLOBAL, tier=precise → gpt-4 (temp: 0.5, max: 2500)

[Rule] role_type=engagement, language=GLOBAL, tier=creative → gpt-4-turbo (temp: 0.8, max: 500)
[Rule] role_type=engagement, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.7, max: 300)
[Rule] role_type=engagement, language=GLOBAL, tier=precise → gpt-4 (temp: 0.5, max: 300)

[Rule] role_type=compliance, language=GLOBAL, tier=creative → gpt-4 (temp: 0.3, max: 2000)
[Rule] role_type=compliance, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.2, max: 2000)
[Rule] role_type=compliance, language=GLOBAL, tier=precise → gpt-4 (temp: 0.1, max: 2000)

[Rule] role_type=evaluator, language=GLOBAL, tier=creative → gpt-4 (temp: 0.5, max: 2000)
[Rule] role_type=evaluator, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.3, max: 1500)
[Rule] role_type=evaluator, language=GLOBAL, tier=precise → gpt-4 (temp: 0.1, max: 1500)

[Rule] role_type=manager, language=GLOBAL, tier=creative → gpt-4 (temp: 0.6, max: 1500)
[Rule] role_type=manager, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.4, max: 1000)
[Rule] role_type=manager, language=GLOBAL, tier=precise → gpt-4 (temp: 0.2, max: 1000)

[Rule] role_type=kpi, language=GLOBAL, tier=creative → gpt-4 (temp: 0.5, max: 2500)
[Rule] role_type=kpi, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.3, max: 2000)
[Rule] role_type=kpi, language=GLOBAL, tier=precise → gpt-4 (temp: 0.1, max: 2000)

[Rule] role_type=seo_watcher, language=GLOBAL, tier=creative → gpt-4 (temp: 0.4, max: 2000)
[Rule] role_type=seo_watcher, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.3, max: 1500)
[Rule] role_type=seo_watcher, language=GLOBAL, tier=precise → gpt-4 (temp: 0.2, max: 1500)

[Rule] role_type=knowledge_curator, language=GLOBAL, tier=creative → gpt-4-turbo (temp: 0.6, max: 4000)
[Rule] role_type=knowledge_curator, language=GLOBAL, tier=balanced → gpt-4 (temp: 0.5, max: 3000)
[Rule] role_type=knowledge_curator, language=GLOBAL, tier=precise → gpt-4 (temp: 0.3, max: 3000)
[Rule] role_type=knowledge_curator, language=zh, tier=balanced → gpt-4-turbo (override)
```

---

## 🔢 Statistics

### Current Rule-Based System
- **Total Rules**: 12 (one per engine type)
- **Tiers per Rule**: 3 (creative, balanced, precise)
- **Base Configurations**: 36 (12 × 3)
- **Language Overrides**: 2 (planner/ja, knowledge_curator/zh)
- **Total Effective Combinations**: 38

### Old Profile-Based System (Deprecated)
- **Theoretical Profiles**: 468 (12 engines × 13 languages × 3 tiers)
- **Actual Needed**: ~50-100 (most combinations unused)
- **Maintenance Burden**: High (manual updates for each profile)

### Efficiency Gain
- **Storage Reduction**: 468 → 12 documents (97% reduction)
- **Maintenance**: Centralized rule updates vs. individual profile edits
- **Flexibility**: Dynamic resolution at runtime

---

## 🎯 Catalog v2.0 Naming Convention

### Priority Profiles (Initial Phase)

#### Writer – Short Form (SNS Captions)
- **Role**: `writer_short` (maps to `creator_text`)
- **Tier**: `balanced`
- **Model**: `gpt-4o-mini`
- **Languages**: All 12 languages
- **IDs**: `rtp_writer_short_{lang}_bal_v1`

#### Engagement Bot
- **Role**: `engagement`
- **Tier**: `economy` (maps to `precise`)
- **Model**: `gpt-3.5-turbo`
- **Languages**: All 12 languages
- **IDs**: `rtp_engagement_{lang}_eco_v1`

#### Global Profiles
- `rtp_planner_global_pro_v1` → GPT-4o
- `rtp_planner_global_bal_v1` → GPT-4o-mini
- `rtp_research_global_bal_v1` → GPT-4o-mini

---

## ✅ Validation Checklist

### Phase 1: Rule Verification
- [ ] Verify all 12 rules exist in `runtimeProfileRules` collection
- [ ] Confirm each rule has 3 tiers (creative, balanced, precise)
- [ ] Validate language overrides (planner/ja, knowledge_curator/zh)
- [ ] Check model IDs are current and available

### Phase 2: Profile Cleanup
- [ ] Audit existing `runtimeProfiles` collection
- [ ] Identify profiles that don't match rule structure
- [ ] Mark deprecated profiles for deletion
- [ ] Migrate valid profiles to new naming convention

### Phase 3: Code Update
- [ ] Update `utils-runtime-resolver.js` to use rules
- [ ] Modify `admin-agentteams.js` wizard to reference rules
- [ ] Update seeding scripts to generate from rules
- [ ] Add validation in profile creation UI

---

## 📝 Notes

### Tier Mapping (Catalog v2.0 ↔ Rules)
- `eco` (Economy) → `precise` (lowest temperature, most cost-effective)
- `bal` (Balanced) → `balanced` (middle ground)
- `pro` (Premium) → `creative` (highest quality, most expensive)

### Language Strategy
- **Phase 1**: Focus on `global`, `en`, `ko` (high priority)
- **Phase 2**: Add `ja`, `zh`, `es` (medium priority)
- **Phase 3**: Complete all 12 languages (low priority)

### Special Cases
- **Image Generation**: Uses DALL-E 3 across all tiers (temperature varies)
- **Video**: Currently script generation only (no actual video synthesis)
- **Engagement**: Optimized for short responses (max 300-500 tokens)

---

## 🚀 Next Steps

1. **Verify Rules in Firestore**
   ```bash
   node scripts/init-runtime-profile-rules.js
   ```

2. **Audit Current Profiles**
   - Run `debug-profiles.html` to see existing data
   - Compare against this master reference
   - Identify discrepancies

3. **Create Cleanup Script**
   - Delete profiles not matching rule structure
   - Regenerate profiles from rules
   - Validate new profiles

4. **Update Application Code**
   - Modify wizard to use rule-based selection
   - Update runtime resolver to query rules
   - Add validation for profile creation

---

**이 문서는 Runtime Profile 정리 작업의 유일한 정답표(Single Source of Truth)입니다.**

모든 프로파일 생성, 수정, 검증 작업은 이 문서를 기준으로 진행되어야 합니다.
