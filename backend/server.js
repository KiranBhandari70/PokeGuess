import 'dotenv/config';
import express from 'express';
import { getQuestion, PokemonApiError } from './pokemon.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'pokeguess-api' }));

app.get('/api/pokemon/question', async (_req, res, next) => {
  try {
    const question = await getQuestion();
    res.json({ image: question.image, options: question.options.map(({ name }) => name) });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  const status = error instanceof PokemonApiError ? error.status : 500;
  res.status(status).json({ error: error.message || 'Something went wrong. Please try again.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`PokéGuess API ready on http://localhost:${PORT}`));
}

export { app };
