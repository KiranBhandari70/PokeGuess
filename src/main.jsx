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
      setRound(await api('/api/game/start', { method: 'POST' }));
      setNotice('');
    } catch (error) {
      setNotice(`${error.message}. Please retry.`);
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!round || !selected || feedback || busy) return;
    setBusy(true);
    try {
      const result = await api(`/api/game/${round.gameId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer: selected }),
      });
      setFeedback(result);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  return <main>
    <span className="eyebrow">POKÉGUESS · DAY 4</span>
    <h1>Who's that <em>Pokémon?</em></h1>
    <p>Study the silhouette, choose an answer, and lock in your guess.</p>
    {!round ? <button className="primary" onClick={startRound} disabled={busy}>
      {busy ? 'Loading…' : 'Start a round'} <span>→</span>
    </button> : <>
      <section className="question" aria-label="Pokémon silhouette">
        <img className={feedback ? 'pokemon-image revealed' : 'pokemon-image'} src={round.image} alt={feedback ? feedback.answer : 'Mystery Pokémon silhouette'} />
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
        </button> : <button className="primary" type="button" onClick={startRound} disabled={busy}>
          New round <span>↻</span>
        </button>}
      </form>
    </>}
    {notice && <output aria-live="polite">{notice}</output>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
