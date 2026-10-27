import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { getQuestion, PokemonApiError } from './pokemon.js';

const app = express();
const events = new EventEmitter();
const games = new Map();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'pokeguess-api' }));

app.post('/api/game/start', async (_req, res, next) => {
  try {
    events.emit('POKEMON_LOAD_REQUESTED');
    const question = await getQuestion();
    const gameId = randomUUID();
    games.set(gameId, { question });
    events.emit('POKEMON_LOADED', { gameId });
    res.status(201).json({
      gameId,
      image: question.image,
      options: question.options.map(({ name }) => name),
    });
  } catch (error) {
    events.emit('POKEMON_LOAD_FAILED', { message: error.message });
    next(error);
  }
});

app.post('/api/game/:gameId/answer', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found or already answered' });
  const answer = String(req.body?.answer || '').trim().toLowerCase();
  if (!answer) return res.status(400).json({ error: 'Choose an answer first' });
  const selected = game.question.options.find(({ name }) => name === answer);
  if (!selected) return res.status(400).json({ error: 'Choose one of the displayed options' });
  const correct = selected.id === game.question.answerId;
  const answerName = game.question.options.find(({ id }) => id === game.question.answerId).name;
  games.delete(req.params.gameId);
  events.emit('GUESS_SUBMITTED', { gameId: req.params.gameId, answer });
  events.emit(correct ? 'CORRECT_GUESS' : 'WRONG_GUESS', { gameId: req.params.gameId });
  res.json({ correct, answer: answerName });
});

app.use((error, _req, res, _next) => {
  const status = error instanceof PokemonApiError ? error.status : 500;
  res.status(status).json({ error: error.message || 'Something went wrong. Please try again.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`PokéGuess API ready on http://localhost:${PORT}`));
}

export { app, events, games };
