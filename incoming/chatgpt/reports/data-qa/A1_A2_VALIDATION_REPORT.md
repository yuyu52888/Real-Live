# Real Life Quest Content Validation Report

**Status: PASS**

- Checks: 24
- Passed: 24
- Errors: 0
- Warnings: 0

## Checks
- PASS — `core300.count` count=300
- PASS — `core300.spellingTargets` count=180
- PASS — `core300.uniqueIds` unique=300
- PASS — `core300.uniqueWords` unique=300
- PASS — `stories.count` count=30
- PASS — `stories.fourQuestions` 
- PASS — `tasks.general.count` count=120
- PASS — `tasks.exercise.count` count=30
- PASS — `tasks.chore.count` count=30
- PASS — `tasks.all.uniqueIds` total=180
- PASS — `bosses.count` count=6
- PASS — `rewards.levelThresholds` 
- PASS — `rewards.cosmeticsNoStats` 
- PASS — `fixture.valid.mock_expansion_300.json` 
- PASS — `fixture.valid.mock_expansion_200.json` 
- PASS — `fixture.valid.valid_minimal_pack_2.json` 
- PASS — `fixture.invalid.invalid_duplicate_word_id.json` expected=VOCAB_DUPLICATE_WORD_ID; got=['VOCAB_DUPLICATE_WORD_ID']
- PASS — `fixture.invalid.invalid_missing_word.json` expected=VOCAB_REQUIRED_FIELD; got=['VOCAB_REQUIRED_FIELD']
- PASS — `fixture.invalid.invalid_pack_id_mismatch.json` expected=VOCAB_PACK_ID_MISMATCH; got=['VOCAB_PACK_ID_MISMATCH']
- PASS — `fixture.invalid.invalid_duplicate_existing_pack_id.json` expected=VOCAB_PACK_ID_CONFLICT; got=['VOCAB_PACK_ID_CONFLICT']
- PASS — `fixture.invalid.invalid_example_pair.json` expected=VOCAB_EXAMPLE_PAIR; got=['VOCAB_EXAMPLE_PAIR']
- PASS — `fixture.invalid.invalid_review_schedule.json` expected=VOCAB_REVIEW_SCHEDULE; got=['VOCAB_REVIEW_SCHEDULE']
- PASS — `fixture.invalid.invalid_schema_version.json` expected=VOCAB_SCHEMA_VERSION; got=['VOCAB_SCHEMA_VERSION']
- PASS — `fixture.invalid.invalid_malformed_json.json` expected=JSON_PARSE_ERROR; got=['JSON_PARSE_ERROR']

## Issues
- None
