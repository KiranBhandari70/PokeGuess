const API = 'https://pokeapi.co/api/v2';
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

export class PokemonApiError extends Error {
  constructor(message, status = 503) { super(message); this.status = status; }
}

async function fetchJson(url) {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new PokemonApiError(`PokéAPI returned HTTP ${response.status}`, 502);
    const value = await response.json();
    cache.set(url, { value, expires: Date.now() + CACHE_TTL });
    return value;
  } catch (error) {
    if (error instanceof PokemonApiError) throw error;
    throw new PokemonApiError(error.name === 'AbortError' ? 'PokéAPI request timed out' : 'PokéAPI is unavailable');
  } finally { clearTimeout(timer); }
}

export async function getPokemon(id) {
  const raw = await fetchJson(`${API}/pokemon/${id}`);
  return {
    id: raw.id,
    name: raw.name,
    image: raw.sprites.other?.['official-artwork']?.front_default || raw.sprites.front_default,
    types: raw.types.map(({ type }) => type.name),
  };
}

export async function getQuestion(difficulty = 'normal') {
  const ranges = { easy: [1, 151], normal: [1, 493], hard: [1, 1025] };
  const [min, max] = ranges[difficulty] || ranges.normal;
  const answerId = min + Math.floor(Math.random() * (max - min + 1));
  const ids = new Set([answerId]);
  while (ids.size < 4) ids.add(min + Math.floor(Math.random() * (max - min + 1)));
  const pokemon = await Promise.all([...ids].map(getPokemon));
  const answer = pokemon.find((item) => item.id === answerId);
  return {
    image: answer.image,
    options: pokemon.map(({ id, name }) => ({ id, name })),
    answerId,
  };
}

export function clearPokemonCache() { cache.clear(); }
