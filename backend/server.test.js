import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { app, games, sessionStore } = await import('./server.js');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (sessionStore.close) await sessionStore.close();
});

test('health endpoint returns a JSON service status over HTTP', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'pokeguess-api', database: 'disconnected' });
});

test('game metadata exposes the shared round and difficulty contract', async () => {
  const response = await fetch(`${baseUrl}/api/meta`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { rounds: 10, difficulties: ['easy', 'normal', 'hard'] });
});

test('unknown game IDs cannot submit answers', async () => {
  const response = await fetch(`${baseUrl}/api/game/not-a-game/answer`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answer: 'pikachu', round: 1 }),
  });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'Game not found or expired');
});

test('a replayed round number returns HTTP 409 without changing its score', async () => {
  const gameId = 'stale-round-test';
  const game = { id: gameId, userId: null, round: 1, score: 100, answers: new Set([0]), completed: false, question: { options: [{ id: 25, name: 'pikachu' }], answerId: 25 } };
  games.set(gameId, game);
  try {
    const response = await fetch(`${baseUrl}/api/game/${gameId}/answer`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answer: 'pikachu', round: 1 }),
    });
    assert.equal(response.status, 409);
    assert.equal(game.score, 100);
  } finally { games.delete(gameId); }
});

test('database-backed registration fails clearly when MongoDB is disconnected', async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'trainer', password: 'secure-password' }),
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'Database is not connected');
});

