# Day 3 — API verification

Verified 27 October 2026 against the live PokéAPI endpoint from the Node.js runtime.

- `getPokemon(25)` returned Pokémon ID `25`, name `pikachu`, an artwork URL, and type `electric`.
- `getQuestion('easy')` returned an artwork URL, four choices, and an internal answer ID matching one choice.
- The public question route maps the result to only the image and option names; it does not include the answer ID.

**Result:** both live data checks passed. Timeout and upstream-error branches are implemented but were not forced during this live check; they remain covered by the controlled error handling path and should be exercised with mocked failures in the system test phase.
