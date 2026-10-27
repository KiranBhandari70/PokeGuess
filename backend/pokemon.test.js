import test from 'node:test';
import assert from 'node:assert/strict';
import { clearPokemonCache, getPokemon, PokemonApiError } from './pokemon.js';

test('PokéAPI HTTP failures become a controlled upstream error', async () => {
  const originalFetch = globalThis.fetch;
  clearPokemonCache();
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  try {
    await assert.rejects(getPokemon(25), (error) => error instanceof PokemonApiError && error.status === 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PokéAPI network failures become a controlled availability error', async () => {
  const originalFetch = globalThis.fetch;
  clearPokemonCache();
  globalThis.fetch = async () => { throw new TypeError('network unavailable'); };
  try {
    await assert.rejects(getPokemon(26), (error) => error instanceof PokemonApiError && error.status === 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

