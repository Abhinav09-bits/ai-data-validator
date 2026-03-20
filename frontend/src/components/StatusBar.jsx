// frontend/src/components/StatusBar.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function StatusBar() {
  const [status, setStatus] = useState('checking'); // checking | online | offline

  useEffect(() => {
    const check = async () => {
      try {
        await axios.get(
          (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/health',
          { timeout: 3000 }
        );
        setStatus('online');
      } catch {
        setStatus('offline');
      }
    };
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);

  if (status === 'online') return null; // Hide when everything is fine

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      zIndex: 999,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 14px',
      borderRadius: 6,
      border: `1px solid ${status === 'offline' ? 'var(--red-dim)' : 'var(--border)'}`,
      background: 'var(--bg2)',
      fontSize: '0.72rem',
      fontFamily: 'var(--font-mono)',
      color: status === 'offline' ? 'var(--red)' : 'var(--text-dim)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: status === 'offline' ? 'var(--red)' : 'var(--text-dim)',
        display: 'inline-block',
        animation: status === 'checking' ? 'blink 1s infinite' : 'none',
      }} />
      {status === 'checking' ? 'connecting to backend...' : '⚠ backend offline — start with: npm run dev'}
    </div>
  );
}