# Real Life Quest｜A3-1 Tasks QA Report v1.0

- Overall: **PASS**
- Blocking errors: **0**
- Integration advisories: **5**
- Automated checks: **44/44 PASS**

## Scope

- `02_DATA/reality_tasks_120.json`
- `02_DATA/exercise_task_cards_30.json`
- `02_DATA/chore_task_cards_30.json`
- `02_DATA/TASKCARD_EXERCISE_CHORE_SPEC.json`

## Blocking data integrity result

No blocking data defects were found. The three canonical task files can be used by Stage 3 without rewriting their records.

## Key counts

| Dataset | Count | ID range | Parent confirmation | Screen mode |
|---|---:|---|---|---|
| General reality tasks | 120 | T001–T120 | 50 true / 70 false | 100 offscreen / 20 onscreen_short |
| Home exercise | 30 | EX001–EX030 | 30/30 true | 30/30 offscreen |
| Home chores | 30 | CH001–CH030 | 30/30 true | 30/30 offscreen |

## General task category distribution

| Category | Count |
|---|---:|
| `english` | 10 |
| `reading_story` | 10 |
| `math_process` | 10 |
| `writing` | 10 |
| `focus` | 10 |
| `life` | 10 |
| `cooperation` | 10 |
| `exercise` | 10 |
| `creativity` | 10 |
| `exploration` | 10 |
| `persistence` | 10 |
| `self_management` | 10 |

## Automated checks

| Check | Result |
|---|---|
| `general_count_120` | PASS |
| `exercise_count_30` | PASS |
| `chore_count_30` | PASS |
| `general_id_sequence` | PASS |
| `exercise_id_sequence` | PASS |
| `chore_id_sequence` | PASS |
| `global_id_unique` | PASS |
| `global_name_unique` | PASS |
| `general_required_fields` | PASS |
| `exercise_required_fields` | PASS |
| `chore_required_fields` | PASS |
| `all_required_text_nonempty` | PASS |
| `difficulty_star_format` | PASS |
| `exp_positive_supported_range` | PASS |
| `five_ability_mapping_exact` | PASS |
| `ability_exp_values_1_or_2` | PASS |
| `boolean_fields_valid` | PASS |
| `screen_mode_valid` | PASS |
| `general_categories_exact_12` | PASS |
| `general_10_per_category` | PASS |
| `general_screen_mode_consistency` | PASS |
| `math_no_in_app_question_generation` | PASS |
| `exercise_category_exact` | PASS |
| `exercise_task_type_exact` | PASS |
| `exercise_offscreen_all` | PASS |
| `exercise_parent_confirmation_all` | PASS |
| `exercise_repeatable_all` | PASS |
| `exercise_exactly_3_tips` | PASS |
| `exercise_safety_note_present` | PASS |
| `exercise_image_display_complete` | PASS |
| `chore_category_exact` | PASS |
| `chore_task_type_exact` | PASS |
| `chore_offscreen_all` | PASS |
| `chore_parent_confirmation_all` | PASS |
| `chore_repeatable_all` | PASS |
| `chore_exactly_3_tips` | PASS |
| `chore_safety_note_present` | PASS |
| `chore_image_display_complete` | PASS |
| `exercise_safety_note_core_terms` | PASS |
| `chore_safety_note_core_terms` | PASS |
| `general_parent_confirmation_expected_groups` | PASS |
| `general_difficulty_exp_coherence` | PASS |
| `exercise_difficulty_exp_coherence` | PASS |
| `chore_difficulty_exp_coherence` | PASS |

## Integration advisories (not canonical-data errors)

### ADV-01｜Preserve canonical categories; add UI filter aliases instead of rewriting JSON
Canonical categories include reading_story, math_process, writing, self_management and dedicated exercise_home/chores_home. UI tabs use broader labels. Preserve source values and normalize only in the repository/filter layer.

Known safe UI aliases:

```json
{
  "reading": [
    "reading_story"
  ],
  "english": [
    "english"
  ],
  "exercise": [
    "exercise",
    "exercise_home"
  ],
  "chores": [
    "chores_home"
  ],
  "life": [
    "life"
  ],
  "hidden": [],
  "all": [
    "*"
  ]
}
```

writing/math_process/focus/cooperation/creativity/exploration/persistence/self_management should remain visible under All unless a separate product mapping is explicitly approved.

### ADV-02｜repeatable=true must not mean unlimited same-day EXP farming
All 180 cards are repeatable. 12 general tasks award >=6 EXP and are especially sensitive. Stage 3 should use idempotent transaction IDs and a repeat policy/cooldown keyed by task/date/session as appropriate.

High-value repeatable task IDs: T020, T028, T040, T046, T059, T070, T080, T090, T100, T109, T110, T120

### ADV-03｜General Boss-named tasks are not the formal six Boss entities
Several Txxx tasks use “Boss” in their display name. Keep them as ordinary/challenge task records; do not merge them with B01-B06 boss progress/reward state.

### ADV-04｜No static hidden-task records are present in these three task files
The UI includes a Hidden tab, but these canonical task files contain no hidden category records. Do not fabricate hidden tasks during Stage 3; an empty state or later content source is safer.

### ADV-05｜Chore safetyNote is intentionally generic across all 30 cards
All 30 chore cards satisfy the required generic safety rule and require parent confirmation. If task-specific safety copy is later added for dishes/glass/trash/bathroom/window areas, add it as an augmentation without removing the canonical baseline note.

Watch list: CH008, CH009, CH010, CH019, CH020, CH022, CH023, CH024

## Stage 3 implementation guardrails

1. Treat the JSON records as canonical content; do not rename categories in-place just to match UI labels.
2. Implement category aliases in the repository/filter layer.
3. Keep `Txxx` Boss-named tasks separate from formal `B01`–`B06` Boss state.
4. Interpret `repeatable=true` as re-eligible content, not permission for unlimited reward transactions.
5. Preserve `requiresParentConfirmation=true` on all dedicated exercise/chore cards.
6. Do not create math questions in-app; the ten `math_process` cards already describe process/external-paper tasks only.
7. Do not fabricate hidden quests merely because a Hidden tab exists.

## Conclusion

**A3-1 PASS.** Stage 3 may consume these files as-is, subject to the integration guardrails above. No canonical JSON replacement is included in this handoff.
