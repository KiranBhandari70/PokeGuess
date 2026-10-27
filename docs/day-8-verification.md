# Day 8 — History and leaderboard verification

## Access control

- A guest request to `GET /api/history` receives HTTP 401.
- After signing in, `GET /api/history?userId=someone-else` still queries results only for the authenticated session's user ID. The API does not trust a caller-supplied identity.
- `GET /api/leaderboard` is public and returns ranked summaries aggregated from persisted results. The response exposes usernames, best scores, and game counts, not private history records.

## Verification run

Command: `npm test`

Actual outcome: 15 tests passed, 0 failed. This includes guest-history denial, forged-userId isolation, leaderboard ranking/shape, scoring and duplicate-round rejection, game API behavior, and result-service idempotency tests.

Command: `npm run build`

Actual outcome: Vite production build completed successfully.

## Persistence test boundary

MongoDB is not running in this local environment. Result persistence and the leaderboard aggregation route were verified with controlled model stubs; a live MongoDB integration run remains to be performed in an environment with MongoDB configured. The Day 7 tutor demonstration and feedback are student-owned evidence and should be added after that checkpoint.
