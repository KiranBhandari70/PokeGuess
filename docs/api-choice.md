# Day 3 — PokéAPI choice

PokéAPI was selected because it provides a public JSON REST API with a broad Pokémon catalogue suitable for a silhouette quiz. The backend requests Pokémon records over HTTPS and reduces them to the fields the game needs. The browser receives an image and answer choices; the internal answer ID stays on the server.

The integration uses a five-second timeout, a one-hour process-local cache, and controlled HTTP errors. Remaining limitations include dependence on upstream availability and schema, plus a cache that is not shared between API instances. Review current service guidance before public deployment: [PokéAPI](https://pokeapi.co/).
