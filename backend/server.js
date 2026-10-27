import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { getQuestion, PokemonApiError } from './pokemon.js';
import { GAME_ROUNDS, scoreAnswer } from './game-logic.js';
import { User, Result } from './models.js';
import { persistGameResult } from './result-service.js';

const app = express();
const events = new EventEmitter();
const games = new Map();
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pokeguess';
const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'local-development-secret-change-me');
const sessionStore = process.env.NODE_ENV === 'test'
  ? new session.MemoryStore()
  : MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: 'sessions' });

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'https://raw.githubusercontent.com'], connectSrc: ["'self'"], fontSrc: ["'self'"],
  } },
}));
app.use(express.json({ limit: '16kb' }));
app.use(session({
  name: 'pokeguess.sid',
  secret: SESSION_SECRET || 'missing-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 7 },
  store: sessionStore,
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const requireDb = (_req, res, next) => mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: 'Database is not connected' });
const requireAuth = (req, res, next) => req.session.userId ? next() : res.status(401).json({ error: 'Please sign in first' });

events.on('ACHIEVEMENT_UNLOCKED', ({ userId, achievement }) => {
  User.updateOne({ _id: userId }, { $addToSet: { achievements: achievement } })
    .catch((error) => console.error('Could not save achievement:', error.message));
});

app.get('/api/health', (_req, res) => res.json({
  status: 'ok', service: 'pokeguess-api',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
}));

app.get('/api/meta', (_req, res) => res.json({ rounds: GAME_ROUNDS, difficulties: ['easy', 'normal', 'hard'] }));

app.post('/api/auth/register', authLimiter, requireDb, async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username must be 3–20 letters, numbers or underscores' });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8–72 characters' });
    if (await User.exists({ username: username.toLowerCase() })) return res.status(409).json({ error: 'That username is already taken' });
    const user = await User.create({ username: username.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) });
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = user.id;
      req.session.save((saveError) => saveError ? next(saveError) : res.status(201).json({ user: publicUser(user) }));
    });
  } catch (error) { if (error.code === 11000) return res.status(409).json({ error: 'That username is already taken' }); next(error); }
});

app.post('/api/auth/login', authLimiter, requireDb, async (req, res, next) => {
  try {
    const user = await User.findOne({ username: String(req.body?.username || '').trim().toLowerCase() });
    if (!user || !await bcrypt.compare(String(req.body?.password || ''), user.passwordHash)) return res.status(401).json({ error: 'Username or password is incorrect' });
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.userId = user.id;
      req.session.save((saveError) => saveError ? next(saveError) : res.json({ user: publicUser(user) }));
    });
  } catch (error) { next(error); }
});

app.post('/api/auth/logout', (req, res, next) => req.session.destroy((error) => {
  if (error) return next(error);
  res.clearCookie('pokeguess.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ ok: true });
}));

app.get('/api/auth/me', requireDb, async (req, res, next) => {
  try {
    if (!req.session.userId) return res.json({ user: null });
    const user = await User.findById(req.session.userId);
    if (!user) { req.session.destroy(() => {}); return res.json({ user: null }); }
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post('/api/game/start', async (req, res, next) => {
  try {
    const difficulty = ['easy', 'normal', 'hard'].includes(req.body?.difficulty) ? req.body.difficulty : 'normal';
    const question = await getQuestion(difficulty);
    const game = {
      id: randomUUID(), userId: req.session.userId || null, round: 0, rounds: GAME_ROUNDS, score: 0, correct: 0, streak: 0, bestStreak: 0,
      difficulty, answers: new Set(), completed: false, question,
    };
    games.set(game.id, game);
    events.emit('POKEMON_LOADED', { gameId: game.id, difficulty });
    res.status(201).json({
      gameId: game.id, round: 1, rounds: GAME_ROUNDS, difficulty,
      image: question.image, options: question.options.map(({ name }) => name),
    });
  } catch (error) { events.emit('POKEMON_LOAD_FAILED', { message: error.message }); next(error); }
});

app.post('/api/game/:gameId/answer', async (req, res, next) => {
  const game = games.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found or expired' });
  if (game.userId && game.userId !== req.session.userId) return res.status(403).json({ error: 'This game belongs to another player' });
  if (Number(req.body?.round) !== game.round + 1) return res.status(409).json({ error: 'This answer was already submitted or the round has changed' });
  const answer = String(req.body?.answer || '').trim().toLowerCase();
  if (!answer) return res.status(400).json({ error: 'Choose an answer first' });
  const selected = game.question.options.find(({ name }) => name === answer);
  if (!selected) return res.status(400).json({ error: 'Choose one of the displayed options' });
  const answerName = game.question.options.find(({ id }) => id === game.question.answerId).name;
  const outcome = scoreAnswer(game, selected.id);
  if (outcome.error) return res.status(outcome.status).json({ error: outcome.error });
  const payload = { ...outcome, answer: answerName };
  events.emit(outcome.correct ? 'CORRECT_GUESS' : 'WRONG_GUESS', { gameId: game.id, ...payload });

  if (!outcome.completed) {
    try {
      game.question = await getQuestion(game.difficulty);
      res.json({ ...payload, nextQuestion: { image: game.question.image, options: game.question.options.map(({ name }) => name), round: game.round + 1 } });
    } catch {
      payload.nextQuestionError = 'Your answer was saved, but the next Pokémon could not load. Start a new game to continue.';
      res.json(payload);
    }
    return;
  }

  events.emit('GAME_COMPLETED', { gameId: game.id, userId: game.userId, score: game.score });
  if (game.userId) {
    try {
      await persistGameResult(game, { User, Result });
      payload.resultSaved = true;
      const achievement = game.correct === GAME_ROUNDS ? 'perfect_game' : game.bestStreak >= 5 ? 'hot_streak' : null;
      if (achievement) events.emit('ACHIEVEMENT_UNLOCKED', { userId: game.userId, achievement });
    } catch { payload.savePending = true; }
  }
  res.json(payload);
});

app.post('/api/game/:gameId/save', requireAuth, requireDb, async (req, res, next) => {
  const game = games.get(req.params.gameId);
  if (!game || !game.completed) return res.status(404).json({ error: 'Completed game not found' });
  if (game.userId !== req.session.userId) return res.status(403).json({ error: 'This game belongs to another player' });
  try { res.json(await persistGameResult(game, { User, Result })); }
  catch (error) { next(error); }
});

app.get('/api/history', requireAuth, requireDb, async (req, res, next) => {
  try {
    const results = await Result.find({ user: req.session.userId }).sort({ createdAt: -1 }).limit(20).lean();
    const best = await Result.findOne({ user: req.session.userId }).sort({ score: -1 }).lean();
    res.json({ results, bestScore: best?.score || 0 });
  } catch (error) { next(error); }
});

app.get('/api/leaderboard', requireDb, async (_req, res, next) => {
  try {
    const rows = await Result.aggregate([
      { $group: { _id: '$user', username: { $first: '$username' }, bestScore: { $max: '$score' }, games: { $sum: 1 }, totalScore: { $sum: '$score' } } },
      { $sort: { bestScore: -1, totalScore: -1 } }, { $limit: 10 },
    ]);
    res.json({ leaderboard: rows.map((row, index) => ({ rank: index + 1, username: row.username, bestScore: row.bestScore, games: row.games })) });
  } catch (error) { next(error); }
});

function publicUser(user) {
  return { id: user.id, username: user.username, avatar: user.avatar, experience: user.experience, level: Math.floor(user.experience / 500) + 1, achievements: user.achievements };
}

app.use((error, _req, res, _next) => {
  const status = error.status || (error instanceof PokemonApiError ? error.status : 500);
  res.status(status).json({ error: status >= 500 && status !== 502 ? 'Something went wrong. Please try again.' : error.message });
});

if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET must be configured in production');
  mongoose.connect(MONGODB_URI).then(() => {
    app.listen(PORT, () => console.log(`PokéGuess API ready on http://localhost:${PORT}`));
  }).catch((error) => { console.error('Could not connect to MongoDB:', error.message); process.exitCode = 1; });
}

export { app, events, games, sessionStore };
