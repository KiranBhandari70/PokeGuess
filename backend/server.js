import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'pokeguess-api' }));

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`PokéGuess API ready on http://localhost:${PORT}`));
}

export { app };
