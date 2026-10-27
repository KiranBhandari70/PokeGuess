import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Leaderboard from './Leaderboard.jsx';

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
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
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    api('/api/auth/me').then(({ user: current }) => setUser(current)).catch(() => {});
  }, []);

  async function startRound() {
    setBusy(true);
    setNotice('Loading a Pokémon…');
    setFeedback(null);
    setSelected('');
    try {
      const game = await api('/api/game/start', { method: 'POST', body: JSON.stringify({ difficulty }) });
      setRound({ ...game, score: 0, streak: 0 });
      setNotice('');
    } catch (error) { setNotice(`${error.message}. Please retry.`); }
    finally { setBusy(false); }
  }

  async function loadHistory() {
    try {
      const data = await api('/api/history');
      setHistory(data.results);
      setBestScore(data.bestScore);
      setHistoryOpen(true);
    } catch (error) { setNotice(error.message); }
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!round || !selected || feedback || busy) return;
    setBusy(true);
    try {
      const result = await api(`/api/game/${round.gameId}/answer`, {
        method: 'POST', body: JSON.stringify({ answer: selected, round: round.round }),
      });
      setFeedback(result);
      setRound((current) => ({ ...current, score: result.score, streak: result.streak, nextQuestion: result.nextQuestion, nextQuestionError: result.nextQuestionError }));
      if (result.completed && result.resultSaved && user) await loadHistory();
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function retrySave() {
    setBusy(true);
    try {
      await api(`/api/game/${round.gameId}/save`, { method: 'POST', body: '{}' });
      setFeedback((current) => ({ ...current, savePending: false, resultSaved: true }));
      setNotice('Your result was saved.');
      if (user) await loadHistory();
    } catch (error) { setNotice(`Your score is safe. ${error.message} Try saving again.`); }
    finally { setBusy(false); }
  }

  function nextRound() {
    if (!round?.nextQuestion) return startRound();
    setRound((current) => ({ ...current, ...current.nextQuestion, nextQuestion: null }));
    setSelected('');
    setFeedback(null);
    setNotice('');
  }

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const route = authMode === 'login' ? 'login' : 'register';
      const { user: current } = await api(`/api/auth/${route}`, { method: 'POST', body: JSON.stringify(credentials) });
      setUser(current);
      setCredentials({ username: '', password: '' });
      setNotice(`Welcome, ${current.username}!`);
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST', body: '{}' });
      setUser(null);
      setHistory([]);
      setHistoryOpen(false);
      setNotice('Signed out successfully.');
    } catch (error) { setNotice(error.message); }
  }

  return <main>
    <header className="identity">
      <span className="eyebrow">VIRTUAL TRAINER ID</span>
      {user ? <div className="signed-in"><strong>{user.avatar} {user.username}</strong><span>Level {user.level}</span><button type="button" className="link-button" onClick={loadHistory}>History</button><button type="button" className="link-button" onClick={logout}>Log out</button></div> :
        <form className="auth-form" onSubmit={submitAuth}>
          <input aria-label="Username" autoComplete="username" minLength="3" maxLength="20" placeholder="Username" value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} required />
          <input aria-label="Password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} type="password" minLength="8" placeholder="Password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} required />
          <button className="small-primary" disabled={busy}>{authMode === 'login' ? 'Log in' : 'Register'}</button>
          <button type="button" className="link-button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Create account' : 'Back to login'}</button>
        </form>}
    </header>
    <span className="eyebrow">POKÉGUESS · DAY 8</span>
    <h1>Who's that <em>Pokémon?</em></h1>
    <p>Study the silhouette, choose an answer, and keep your streak alive.</p>
    <label className="difficulty">DIFFICULTY
      <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} disabled={Boolean(round && !feedback)}>
        <option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option>
      </select>
    </label>
    {!round ? <button className="primary" onClick={startRound} disabled={busy}>{busy ? 'Loading…' : 'Start a 10-round game'} <span>→</span></button> : <>
      <div className="game-top"><span>ROUND {round.round} / {round.rounds}</span><span>🔥 {round.streak} streak</span><b>{round.score} PTS</b></div>
      <div className="progress"><span style={{ width: `${(round.round - 1) / round.rounds * 100}%` }} /></div>
      <section className="question" aria-label="Pokémon silhouette">
        <img className={feedback?.correct ? 'pokemon-image revealed' : 'pokemon-image'} src={round.image} alt={feedback ? feedback.answer : 'Mystery Pokémon silhouette'} />
        <span className="caption">{feedback ? (feedback.correct ? 'Correct! Nice catch.' : `It was ${feedback.answer}.`) : 'WHO’S THAT POKÉMON?'}</span>
      </section>
      <form onSubmit={submitAnswer}><div className="answers">
        {round.options.map((name) => <button key={name} type="button" className={selected === name ? 'answer selected' : 'answer'} onClick={() => !feedback && setSelected(name)} disabled={Boolean(feedback) || busy}>{name}</button>)}
      </div>{!feedback ? <button className="primary" type="submit" disabled={!selected || busy}>{busy ? 'Checking…' : 'Submit answer'} <span>→</span></button> : feedback.savePending ? <button className="primary" type="button" onClick={retrySave} disabled={busy}>{busy ? 'Saving…' : 'Retry saving score'} <span>↻</span></button> : <button className="primary" type="button" onClick={nextRound} disabled={busy}>{feedback.completed ? 'New game' : round.nextQuestion ? 'Next Pokémon' : 'Start a new game'} <span>→</span></button>}</form>
    </>}
    {historyOpen && user && <section className="history"><h2>Recent games <small>Personal best: {bestScore} PTS</small></h2>{history.length ? history.map((item) => <p key={item._id}>{item.correct}/{item.rounds} correct · {item.difficulty} · {item.score} PTS</p>) : <p>No saved games yet.</p>}</section>}
    <Leaderboard />
    {notice && <output aria-live="polite">{notice}</output>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
