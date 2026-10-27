import test from 'node:test';
import assert from 'node:assert/strict';
import { persistGameResult } from './result-service.js';

test('completed results persist once and award experience once', async () => {
  const savedResults = new Map();
  let saves = 0;
  const user = { id: 'user-1', username: 'trainer', experience: 0, async save() { saves += 1; } };
  const User = { async findById() { return user; } };
  const Result = {
    async exists({ gameId }) { return savedResults.has(gameId); },
    async create(result) {
      if (savedResults.has(result.gameId)) { const error = new Error('duplicate'); error.code = 11000; throw error; }
      savedResults.set(result.gameId, result);
    },
  };
  const game = { id: 'game-1', userId: 'user-1', score: 475, correct: 4, rounds: 10, difficulty: 'normal', bestStreak: 3 };

  assert.deepEqual(await persistGameResult(game, { User, Result }), { saved: true, alreadySaved: false });
  assert.deepEqual(await persistGameResult(game, { User, Result }), { saved: true, alreadySaved: true });
  assert.equal(savedResults.get('game-1').score, 475);
  assert.equal(user.experience, 475);
  assert.equal(saves, 1);
});

test('guest results are not persisted', async () => {
  const result = await persistGameResult({ userId: null }, { User: {}, Result: {} });
  assert.deepEqual(result, { saved: false, reason: 'guest' });
});
