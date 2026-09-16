# Known limitations

This repository is at Stage 2.

- Onboarding state, nickname, avatar and settings persist in IndexedDB for the current origin. Parent PIN verification UI remains for Stage 8; only a salted verifier is stored.
- Runtime data packs are not yet copied or loaded.
- PWA icons, installability validation, offline caching, and backup/restore UI remain for Stage 9. Backup primitives currently support same-version JSON records and atomic merge; attachments and cross-version conversion are deferred.
- Quest, vocabulary, story, reward, boss, parent, and report logic are intentionally absent.
- Automated checks cover the shell and storage foundation, including browser reload and migration rollback; full acceptance testing remains for Stage 11.
