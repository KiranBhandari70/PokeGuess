# PokéGuess

A Pokémon silhouette guessing game built with React, Node.js, Express, and MongoDB.

## Checkpoint 2 — distributed architecture

The browser client and Express API run as separate applications. The React client uses HTTP and JSON to call the API health endpoint. Development is served by Vite, which proxies `/api` requests to Express.

The following checkpoints will be added as separate commits: PokéAPI integration, playable rounds, scoring, virtual identity, MongoDB persistence, history/leaderboard, tests, and assessment evidence.
