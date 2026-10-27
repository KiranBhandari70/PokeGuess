# Day 10 — Git and GitHub workflow evidence

## Repository evidence

- GitHub Issue [#1](https://github.com/KiranBhandari70/PokeGuess/issues/1) tracks this checkpoint.
- This document is being developed on `feature/day-10-git-evidence` and submitted through a pull request before merge.
- Recent history shows small, purpose-named commits such as `test: cover PokéAPI timeout handling`, `docs: record Day 9 expected and actual test results`, and `fix: expose game metadata endpoint`. The sequence makes the API failure check, assessment evidence, and CI-discovered repair independently traceable.
- The workflow runs `npm ci`, `npm test`, and `npm run build` on pushes and pull requests.

## Modular design and maintainability

- `backend/server.js` owns HTTP routing, session checks, and coordination.
- `backend/pokemon.js` isolates third-party API access, caching, and failure handling.
- `backend/game-logic.js` owns round progression and score rules.
- `backend/result-service.js` isolates idempotent result persistence and experience awards.
- `backend/models.js` defines MongoDB user and result records.
- `src/main.jsx` owns the React player flow and communicates with the backend through JSON endpoints.

This separation lets a change to scoring, API handling, persistence, or presentation be reviewed and tested near its responsibility. The files still share runtime contracts, so route or schema changes need integration checks.

## Single branch and feature branch trade-offs

A single-branch workflow keeps the history linear and can suit a small solo project with short changes. It also reduces branch-management overhead. Its trade-off is that unfinished work and unrelated changes can reach the shared branch together, and reviewers cannot compare a proposed change against a stable base before it lands.

Short-lived feature branches isolate work and give a pull request a focused diff, discussion, and CI result before merge. This is useful for assessment evidence and collaborative review. The trade-offs are merge conflicts, branch drift, and more coordination; long-lived branches make those costs worse. For this project, small branches with an early pull request are a better fit than either a permanent branch per feature or committing all work directly to `main`.

## Evidence completion

Pull request [#2](https://github.com/KiranBhandari70/PokeGuess/pull/2) passed CI and was merged into `main` at `439c96e`. The pre-release [tag `v0.9.0-day10`](https://github.com/KiranBhandari70/PokeGuess/releases/tag/v0.9.0-day10) points to that reviewed merge commit. The merge closed issue [#1](https://github.com/KiranBhandari70/PokeGuess/issues/1). A GitHub Projects board is still to be added; organize its cards into Todo, In Progress, In Review, and Done. MongoDB is the selected database per the student's stack preference, while the brief names PostgreSQL for Day 7; explain this as a deliberate stack adaptation and confirm the MongoDB deployment evidence.
