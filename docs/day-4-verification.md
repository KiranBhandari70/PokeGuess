# Day 4 — playable round verification

Verified 27 October 2026 using the local Node.js HTTP server and live PokéAPI:

- Starting a round returned an image and four answer choices.
- Submitting one displayed choice returned a boolean result and the correct Pokémon name.
- The chosen response was incorrect and the game returned the answer `cloyster` with feedback.

**Result:** round load and answer feedback passed. The browser exposes click and form-submit handlers; the server emits `POKEMON_LOAD_REQUESTED`, `POKEMON_LOADED`, `POKEMON_LOAD_FAILED`, `GUESS_SUBMITTED`, `CORRECT_GUESS`, and `WRONG_GUESS` events.
