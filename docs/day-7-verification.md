# Day 7 — persistence verification

The result path now writes completed authenticated games to MongoDB, binds them to the session-owned user, increments experience, and exposes recent history using `req.session.userId`. A result-save retry endpoint preserves the final score if the first database write fails. Guests are not persisted.

Verified 27 October 2026 with the idempotent result-service tests: **2 passed, 0 failed**. The tests confirm one result and one experience award across repeated save attempts, and no guest persistence.

**Limit:** this workspace has no local MongoDB server, so live document/session persistence is not verified here. Run the database integration checks with the configured MongoDB service before final submission.
