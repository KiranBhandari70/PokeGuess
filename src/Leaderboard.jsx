import React, { useEffect, useState } from 'react';

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/leaderboard');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Leaderboard unavailable');
      setRows(body.leaderboard || []);
    } catch (loadError) { setError(loadError.message); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(); }, []);

  return <section className="leaderboard-section" aria-labelledby="leaderboard-title">
    <div className="leaderboard-heading">
      <div><span className="eyebrow">TOP TRAINERS</span><h2 id="leaderboard-title">Hall of <em>fame</em></h2></div>
      <button type="button" className="link-button" onClick={load} disabled={busy}>Refresh</button>
    </div>
    {error ? <p className="leaderboard-error" role="status">{error}</p> : busy ? <p className="leaderboard-empty">Loading scores…</p> :
      rows.length ? <ol className="leaderboard-list">{rows.map((row) => <li key={row.username}>
        <span className="rank">{String(row.rank).padStart(2, '0')}</span>
        <strong>{row.username}</strong><span className="games-count">{row.games} games</span>
        <b className="leader-score">{row.bestScore} <small>PTS</small></b>
      </li>)}</ol> : <p className="leaderboard-empty">No trainers on the board yet. Be the first!</p>}
  </section>;
}
