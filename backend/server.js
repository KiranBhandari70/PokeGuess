import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { getQuestion, PokemonApiError } from './pokemon.js';
import { GAME_ROUNDS, scoreAnswer } from './game-logic.js';

const app = express();
const events = new EventEmitter();
const games = new Map();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'pokeguess-api' }));

app.post('/api/game/start', async (req, res, next) => {
  try {
    const difficulty = ['easy', 'normal', 'hard'].includes(req.body?.difficulty) ? req.body.difficulty : 'normal';
    events.emit('POKEMON_LOAD_REQUESTED', { difficulty });
    const question = await getQuestion(difficulty);
    const game = {
      id: randomUUID(), round: 0, score: 0, correct: 0, streak: 0, bestStreak: 0,
      difficulty, answers: new Set(), completed: false, question,
    };
    games.set(game.id, game);
    events.emit('POKEMON_LOADED', { gameId: game.id, difficulty });
    res.status(201).json({
      gameId: game.id, round: 1, rounds: GAME_ROUNDS, difficulty,
      image: question.image, options: question.options.map(({ name }) => name),
    });
  } catch (error) {
    events.emit('POKEMON_LOAD_FAILED', { message: error.message });
    next(error);
  }
});

app.post('/api/game/:gameId/answer', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found or expired' });
  if (Number(req.body?.round) !== game.round + 1) return res.status(409).json({ error: 'This answer was already submitted or the round has changed' });
  const answer = String(req.body?.answer || '').trim().toLowerCase();
  if (!answer) return res.status(400).json({ error: 'Choose an answer first' });
  const selected = game.question.options.find(({ name }) => name === answer);
  if (!selected) return res.status(400).json({ error: 'Choose one of the displayed options' });

  const answerName = game.question.options.find(({ id }) => id === game.question.answerId).name;
  const outcome = scoreAnswer(game, selected.id);
  if (outcome.error) return res.status(outcome.status).json({ error: outcome.error });
  const payload = { ...outcome, answer: answerName };
  events.emit('GUESS_SUBMITTED', { gameId: game.id, round: game.round, answer });
  events.emit(outcome.correct ? 'CORRECT_GUESS' : 'WRONG_GUESS', { gameId: game.id, ...payload });

  if (!outcome.completed) {
    return getQuestion(game.difficulty).then((question) => {
      game.question = question;
      events.emit('POKEMON_LOADED', { gameId: game.id, round: game.round + 1 });
      res.json({ ...payload, nextQuestion: { image: question.image, options: question.options.map(({ name }) => name), round: game.round + 1 } });
    }).catch((error) => res.json({ ...payload, nextQuestionError: error.message }));
  }

  events.emit('GAME_COMPLETED', { gameId: game.id, score: game.score });
  res.json(payload);
});

app.use((error, _req, res, _next) => {
  const status = error instanceof PokemonApiError ? error.status : 500;
  res.status(status).json({ error: error.message || 'Something went wrong. Please try again.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`PokéGuess API ready on http://localhost:${PORT}`));
}

export { app, events, games };
