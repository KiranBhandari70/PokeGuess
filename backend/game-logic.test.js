import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_ROUNDS, scoreAnswer } from './game-logic.js';

function game(difficulty = 'normal') {
  return { round: 0, score: 0, correct: 0, streak: 0, bestStreak: 0, difficulty, answers: new Set(), completed: false, answerId: 25 };
}

test('correct answers award base points and bounded streak bonus', () => {
  const state = game();
  assert.equal(scoreAnswer(state, 25).score, 100);
  state.answerId = 26;
  assert.equal(scoreAnswer(state, 26).score, 225);
  for (let index = 0; index < 5; index += 1) {
    state.answerId = 30 + index;
    scoreAnswer(state, 30 + index);
  }
  assert.equal(state.score, 1150);
});

test('wrong answers add no points and reset the current streak', () => {
  const state = game();
  scoreAnswer(state, 25);
  state.answerId = 42;
  const result = scoreAnswer(state, 7);
  assert.equal(result.correct, false);
  assert.equal(result.score, 100);
  assert.equal(result.streak, 0);
});

test('difficulty changes the base reward', () => {
  assert.equal(scoreAnswer(game('easy'), 25).score, 50);
  assert.equal(scoreAnswer(game('hard'), 25).score, 150);
});

test('a ten-round challenge completes exactly on the final accepted answer', () => {
  const state = game();
  for (let round = 0; round < GAME_ROUNDS - 1; round += 1) {
    state.answerId = round;
    assert.equal(scoreAnswer(state, round).completed, false);
  }
  state.answerId = 100;
  assert.equal(scoreAnswer(state, 100).completed, true);
  assert.deepEqual(scoreAnswer(state, 100), { error: 'This game is already complete', status: 409 });
});

test('attempting to answer the same in-flight round twice is rejected', () => {
  const state = game();
  state.answers.add(state.round);
  assert.deepEqual(scoreAnswer(state, 25), { error: 'This round was already answered', status: 409 });
});
