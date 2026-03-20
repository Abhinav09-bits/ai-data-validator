// frontend/src/components/ScoreCard.jsx
import { useEffect, useState } from 'react';

export default function ScoreCard({ score, prevScore }) {
  const [flash, setFlash] = useState(false);
  const diff = score - (prevScore ?? score);

  useEffect(() => {
    if (diff > 0) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1000);
      return () => clearTimeout(t);
    }
  }, [score]);

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 14px',
      borderRadius: 6,
      border: `1px solid ${flash ? 'var(--green)' : 'var(--green-dim)'}`,
      background: flash ? 'rgba(57,255,133,0.12)' : 'rgba(57,255,133,0.06)',
      transition: 'all 0.3s ease',
    }}>
      <span style={{
        color: 'var(--green)',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: '0.9rem',
      }}>
        {score} pts
      </span>
      {diff > 0 && (
        <span style={{
          color: 'var(--green)',
          fontSize: '0.72rem',
          animation: 'fadeUp 0.4s ease both',
        }}>
          +{diff}
        </span>
      )}
    </div>
  );
}