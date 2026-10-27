import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [status, setStatus] = useState('Checking backend…');
  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((body) => setStatus(`${body.service}: ${body.status}`))
      .catch(() => setStatus('Backend unavailable'));
  }, []);

  return <main>
    <span className="eyebrow">POKÉGUESS · DAY 2</span>
    <h1>Who's that <em>Pokémon?</em></h1>
    <p>React and Express are running as separate applications.</p>
    <output aria-live="polite">{status}</output>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
