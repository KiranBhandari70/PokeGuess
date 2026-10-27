import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
const [{ app }, { Result }] = await Promise.all([import('./server.js'), import('./models.js')]);
const originalReadyState = mongoose.connection.readyState;
const originalAggregate = Result.aggregate;
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mongoose.connection.readyState = originalReadyState;
  Result.aggregate = originalAggregate;
});

test('leaderboard returns ranked public summaries from aggregate rows', async () => {
  mongoose.connection.readyState = 1;
  Result.aggregate = async (pipeline) => {
    assert.equal(pipeline.some((stage) => stage.$limit === 10), true);
    return [
      { username: 'top-trainer', bestScore: 940, games: 4 },
      { username: 'runner-up', bestScore: 720, games: 2 },
    ];
  };

  const response = await fetch(`${baseUrl}/api/leaderboard`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    leaderboard: [
      { rank: 1, username: 'top-trainer', bestScore: 940, games: 4 },
      { rank: 2, username: 'runner-up', bestScore: 720, games: 2 },
    ],
  });
});
