# Day 5 — scoring verification

Verified 27 October 2026 with Node's built-in test runner: **5 passed, 0 failed**.

- Normal base reward and consecutive-streak bonus are calculated on the backend.
- Streak bonus is capped after four bonuses.
- Wrong answers award no points and reset the active streak.
- Easy and hard use their configured base rewards.
- The tenth answer completes the challenge; a completed game rejects more answers.
- Duplicate in-flight round state is rejected.

The HTTP route also requires the expected round number, so a stale replay receives HTTP 409 before score changes. Active games are still memory-backed at this checkpoint; the next steps add account identity and persistence.
