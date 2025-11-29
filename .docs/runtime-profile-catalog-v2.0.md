# Runtime Profile Catalog v2.0

**Version**: 2.0.0
**Date**: 2025-11-29
**Status**: Initial Definition

---

## Naming Convention
`rtp_{roleType}_{languageCode}_{tierCode}_v1`

- **roleType**: `writer_short`, `writer_long`, `engagement`, `planner`, etc.
- **languageCode**: `en`, `ko`, `ja`, `zh`, `es`, `fr`, `de`, `th`, `it`, `pt`, `ru`, `ar`, `global`
- **tierCode**: `eco` (Economy), `bal` (Balanced), `pro` (Premium)

---

## Initial Catalog

### 1. Writer – Short Form (SNS Captions)
**Role**: `writer_short`
**Tier**: `balanced`
**Model**: `gpt-4o-mini`

| Language | ID | Name |
|---|---|---|
| English | `rtp_writer_short_en_bal_v1` | Writer – Short Form (EN, Balanced) |
| Korean | `rtp_writer_short_ko_bal_v1` | Writer – Short Form (KO, Balanced) |
| Japanese | `rtp_writer_short_ja_bal_v1` | Writer – Short Form (JA, Balanced) |
| Chinese | `rtp_writer_short_zh_bal_v1` | Writer – Short Form (ZH, Balanced) |
| Spanish | `rtp_writer_short_es_bal_v1` | Writer – Short Form (ES, Balanced) |
| French | `rtp_writer_short_fr_bal_v1` | Writer – Short Form (FR, Balanced) |
| German | `rtp_writer_short_de_bal_v1` | Writer – Short Form (DE, Balanced) |
| Thai | `rtp_writer_short_th_bal_v1` | Writer – Short Form (TH, Balanced) |
| Italian | `rtp_writer_short_it_bal_v1` | Writer – Short Form (IT, Balanced) |
| Portuguese | `rtp_writer_short_pt_bal_v1` | Writer – Short Form (PT, Balanced) |
| Russian | `rtp_writer_short_ru_bal_v1` | Writer – Short Form (RU, Balanced) |
| Arabic | `rtp_writer_short_ar_bal_v1` | Writer – Short Form (AR, Balanced) |

### 2. Engagement Bot (Replies/DMs)
**Role**: `engagement`
**Tier**: `economy`
**Model**: `gpt-3.5-turbo`

| Language | ID | Name |
|---|---|---|
| English | `rtp_engagement_en_eco_v1` | Engagement Bot (EN, Economy) |
| Korean | `rtp_engagement_ko_eco_v1` | Engagement Bot (KO, Economy) |
| ... | ... | ... |
*(All 12 languages supported)*

### 3. Global Profiles (Language Agnostic)

| Role | Tier | ID | Model |
|---|---|---|---|
| Planner | Premium | `rtp_planner_global_pro_v1` | `gpt-4o` |
| Planner | Balanced | `rtp_planner_global_bal_v1` | `gpt-4o-mini` |
| Research | Balanced | `rtp_research_global_bal_v1` | `gpt-4o-mini` |

---

## Future Expansion
- **Image Generation**: `rtp_image_instagram_post_v1` (DALL-E 3)
- **Script Writer**: `rtp_writer_script_{lang}_bal_v1`
