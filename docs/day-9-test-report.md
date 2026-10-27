# Day 9 — Test report

## Expected versus actual

| Check | Expected | Actual |
|---|---|---|
| Correct answer and streak scoring | Add the configured score and bounded streak reward | Passed |
| Incorrect answer | Award no points and reset the active streak | Passed |
| Difficulty and ten-round limit | Apply difficulty rewards and end after round 10 | Passed |
| Duplicate round submission | Reject stale/replayed round with HTTP 409 and keep score unchanged | Passed |
| Invalid login | Return HTTP 401 and do not establish a session | Passed |
| Protected history | Reject a guest with HTTP 401 | Passed |
| Forged history userId | Query only the authenticated session identity | Passed |
| PokéAPI HTTP error | Convert upstream HTTP 503 into a controlled HTTP 502 API error | Passed |
| PokéAPI network error | Return a controlled retryable HTTP 503 API error | Passed |
| PokéAPI timeout error | Return a clear retryable timeout error | Passed |
| Result persistence idempotency | Save one result and award experience once on retry | Passed with a model stub |
| Public leaderboard | Return stable rank, score, and game-count fields | Passed with an aggregation stub |
| Health, metadata, unknown game | Return expected JSON, status, and error behavior | Passed |
| Production client build | Vite emits a production bundle | Passed on Day 8 |

## Run summary

Command: `npm test`

Actual outcome after the final test addition: **19 passed, 0 failed**.

Command: `npm run build`

Actual outcome: **passed** during Day 8 verification.

## Limits and follow-up

- PokéAPI error paths were exercised with controlled fetch stubs; no outage was induced on the live service.
- Result idempotency and leaderboard aggregation were tested with model stubs. A MongoDB server is not available in this environment, so a live database persistence check remains pending.
- The repository CI workflow runs `npm ci`, `npm test`, and `npm run build` on pushes and pull requests; its GitHub Actions run should be checked after this workflow is published.
