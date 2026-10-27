import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Could not reach the game service');
  return body;
}

function App() {
  const [round, setRound] = useState(null);
  const [difficulty, setDifficulty] = useState('normal');
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function startRound() {
    setBusy(true);
    setNotice('Loading a Pokémon…');
    setFeedback(null);
    setSelected('');
    try {
      const game = await api('/api/game/start', { method: 'POST', body: JSON.stringify({ difficulty }) });
      setRound({ ...game, score: 0, streak: 0 });
      setNotice('');
    } catch (error) {
      setNotice(`${error.message}. Please retry.`);
    } finally { setBusy(false); }
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!round || !selected || feedback || busy) return;
    setBusy(true);
    try {
      const result = await api(`/api/game/${round.gameId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer: selected, round: round.round }),
      });
      setFeedback(result);
      setRound((current) => ({ ...current, score: result.score, streak: result.streak, nextQuestion: result.nextQuestion, nextQuestionError: result.nextQuestionError }));
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  function nextRound() {
    if (!round?.nextQuestion) return startRound();
    setRound((current) => ({ ...current, ...current.nextQuestion, nextQuestion: null }));
    setSelected('');
    setFeedback(null);
    setNotice('');
  }

  return <main>
    <span className="eyebrow">POKÉGUESS · DAY 5</span>
    <h1>Who's that <em>Pokémon?</em></h1>
    <p>Study the silhouette, choose an answer, and keep your streak alive.</p>
    <label className="difficulty">DIFFICULTY
      <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} disabled={Boolean(round && !feedback)}>
        <option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option>
      </select>
    </label>
    {!round ? <button className="primary" onClick={startRound} disabled={busy}>
      {busy ? 'Loading…' : 'Start a 10-round game'} <span>→</span>
    </button> : <>
      <div className="game-top"><span>ROUND {round.round} / {round.rounds}</span><span>🔥 {round.streak} streak</span><b>{round.score} PTS</b></div>
      <div className="progress"><span style={{ width: `${(round.round - 1) / round.rounds * 100}%` }} /></div>
      <section className="question" aria-label="Pokémon silhouette">
        <img className={feedback?.correct ? 'pokemon-image revealed' : 'pokemon-image'} src={round.image} alt={feedback ? feedback.answer : 'Mystery Pokémon silhouette'} />
        <span className="caption">{feedback ? (feedback.correct ? 'Correct! Nice catch.' : `It was ${feedback.answer}.`) : 'WHO’S THAT POKÉMON?'}</span>
      </section>
      <form onSubmit={submitAnswer}>
        <div className="answers">
          {round.options.map((name) => <button key={name} type="button"
            className={selected === name ? 'answer selected' : 'answer'}
            onClick={() => !feedback && setSelected(name)}
            disabled={Boolean(feedback) || busy}>{name}</button>)}
        </div>
        {!feedback ? <button className="primary" type="submit" disabled={!selected || busy}>
          {busy ? 'Checking…' : 'Submit answer'} <span>→</span>
        </button> : <button className="primary" type="button" onClick={nextRound} disabled={busy}>
          {feedback.completed ? 'New game' : round.nextQuestion ? 'Next Pokémon' : 'Start a new game'} <span>→</span>
        </button>}
      </form>
    </>}
    {notice && <output aria-live="polite">{notice}</output>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
