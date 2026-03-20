// frontend/src/pages/Leaderboard.jsx
import { getLeaderboard } from '../api';
import { usePolling } from '../hooks/useApi';

export default function Leaderboard() {
  const { data, loading } = usePolling(getLeaderboard, [], 8000);
  const board = data?.leaderboard || [];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--green)', fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: 4 }}>
          $ cat leaderboard.json
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
        }}>
          Validator Scores
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 6 }}>
          Live rankings · refreshes every 8s
        </p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          <span style={{ animation: 'blink 1s infinite', display: 'inline-block', marginRight: 8 }}>█</span>
          loading...
        </p>
      ) : board.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          No validators yet. Be the first!
        </p>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 90px 80px 70px 80px',
            padding: '10px 20px',
            background: 'var(--bg3)',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em',
          }}>
            <span>RANK</span>
            <span>HANDLE</span>
            <span>TIER</span>
            <span>ACCURACY</span>
            <span>STREAK</span>
            <span style={{ textAlign: 'right' }}>SCORE</span>
          </div>

          {board.map((u, idx) => (
            <div key={u.id} className="slide-in" style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr 90px 80px 70px 80px',
              padding: '13px 20px',
              borderBottom: idx < board.length - 1 ? '1px solid var(--border)' : 'none',
              background: idx === 0 ? 'rgba(57,255,133,0.03)' : 'var(--bg2)',
              alignItems: 'center',
              animationDelay: `${idx * 0.04}s`,
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseOut={e => e.currentTarget.style.background =
              idx === 0 ? 'rgba(57,255,133,0.03)' : 'var(--bg2)'}
            >
              <span style={{
                fontSize: '0.85rem', fontWeight: 700,
                color: idx === 0 ? 'var(--yellow)' : 'var(--text-dim)',
              }}>
                #{u.rank}
              </span>

              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
                  {idx === 0 && '★ '}{u.name}
                </span>
                {u.walletAddress && (
                  <span style={{
                    marginLeft: 8, fontSize: '0.65rem',
                    color: 'var(--green)', opacity: 0.7,
                  }}>
                    ◈
                  </span>
                )}
              </div>

              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: u.tier?.color || 'var(--text-dim)',
              }}>
                {u.tier?.badge} {u.tier?.name}
              </span>

              <span style={{
                fontSize: '0.8rem',
                color: u.accuracy >= 0.7 ? 'var(--green)' :
                       u.accuracy >= 0.5 ? 'var(--yellow)' : 'var(--red)',
              }}>
                {Math.round((u.accuracy || 0) * 100)}%
              </span>

              <span style={{
                fontSize: '0.8rem',
                color: u.streak > 0 ? 'var(--yellow)' : 'var(--text-dim)',
              }}>
                {u.streak > 0 ? `🔥${u.streak}` : '—'}
              </span>

              <span style={{
                textAlign: 'right', fontWeight: 700,
                color: idx === 0 ? 'var(--green)' : 'var(--text)',
                fontSize: '0.9rem',
              }}>
                {u.score}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tier legend */}
      <div style={{
        marginTop: 24, padding: '16px 20px',
        border: '1px solid var(--border)', borderRadius: 8,
        background: 'var(--bg2)',
      }}>
        <p style={{
          fontSize: '0.65rem', color: 'var(--text-dim)',
          letterSpacing: '0.1em', marginBottom: 12,
        }}>
          VALIDATOR TIERS
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { name: 'Novice',    minScore: 0,    badge: '⬡', color: '#7d8590' },
            { name: 'Validator', minScore: 50,   badge: '◈', color: '#58a6ff' },
            { name: 'Analyst',   minScore: 200,  badge: '◆', color: '#3fb950' },
            { name: 'Expert',    minScore: 500,  badge: '★', color: '#d29922' },
            { name: 'Master',    minScore: 1000, badge: '✦', color: '#f78166' },
            { name: 'Legend',    minScore: 2500, badge: '❋', color: '#39ff85' },
          ].map(tier => (
            <div key={tier.name} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 4,
              border: `1px solid ${tier.color}33`,
              background: `${tier.color}0d`,
            }}>
              <span style={{ color: tier.color, fontSize: '0.78rem', fontWeight: 700 }}>
                {tier.badge}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {tier.name}
              </span>
              <span style={{ fontSize: '0.65rem', color: tier.color }}>
                {tier.minScore}+
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}