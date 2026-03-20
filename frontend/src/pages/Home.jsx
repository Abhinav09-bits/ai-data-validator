// frontend/src/pages/Home.jsx
import { Link } from 'react-router-dom';
import { getStats } from '../api';
import { usePolling } from '../hooks/useApi';
import { useUser } from '../context/UserContext';

export default function Home() {
  const { user } = useUser();
  // Auto-refresh stats every 8 seconds
  const { data: stats } = usePolling(getStats, [], 8000);

  const features = [
    ['01', 'Upload Dataset', 'Push JSON arrays into the validation pipeline. Any text-based data works.'],
    ['02', 'Validate Entries', 'Review data entries one by one. Mark correct or incorrect.'],
    ['03', 'Consensus Engine', 'Minimum 3 validators per task. Majority wins. Confidence tracked.'],
    ['04', 'Earn USDT', 'Points convert to USDT automatically via Tether WDK on Base/Polygon.'],
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>

      {/* Hero */}
      <div className="fade-up" style={{ marginBottom: 72 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 12px', borderRadius: 4,
          border: '1px solid var(--green-dim)',
          background: 'rgba(57,255,133,0.06)',
          marginBottom: 24,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--green)', display: 'inline-block',
            animation: 'pulse-green 2s infinite',
          }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--green)', letterSpacing: '0.1em' }}>
            LIVE SYSTEM
          </span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.2rem, 6vw, 4.2rem)',
          fontWeight: 800, lineHeight: 1.05,
          letterSpacing: '-0.04em', marginBottom: 20,
        }}>
          Human-powered<br />
          <span style={{ color: 'var(--green)' }}>data validation</span><br />
          <span style={{ color: 'var(--text-dim)', fontSize: '70%' }}>with on-chain rewards</span>
        </h1>

        <p style={{
          color: 'var(--text-dim)', fontSize: '0.95rem',
          maxWidth: 480, lineHeight: 1.75, marginBottom: 32,
        }}>
          Validate datasets, reach consensus with other validators,
          and earn <strong style={{ color: 'var(--text)' }}>USDT automatically</strong> via Tether WDK.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to={user ? '/validate' : '/login'} style={{
            background: 'var(--green)', color: 'var(--bg)',
            textDecoration: 'none', padding: '12px 28px', borderRadius: 4,
            fontWeight: 700, fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem', letterSpacing: '0.06em',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            {user ? 'CONTINUE VALIDATING →' : 'START VALIDATING →'}
          </Link>
          <Link to="/leaderboard" style={{
            background: 'transparent', color: 'var(--text)',
            textDecoration: 'none', padding: '12px 28px', borderRadius: 4,
            fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
            border: '1px solid var(--border)', transition: 'border-color 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--text-dim)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            VIEW SCORES
          </Link>
        </div>
      </div>

      {/* Live Stats Grid */}
      <div className="fade-up" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 1, marginBottom: 72,
        border: '1px solid var(--border)', borderRadius: 8,
        overflow: 'hidden', background: 'var(--border)',
      }}>
        {[
          ['DATASETS', stats?.totalDatasets ?? '—'],
          ['TASKS', stats?.totalTasks ?? '—'],
          ['RESOLVED', stats?.resolvedTasks ?? '—'],
          ['VALIDATORS', stats?.totalUsers ?? '—'],
          ['RESPONSES', stats?.totalResponses ?? '—'],
          ['POINTS OUT', stats?.totalPointsAwarded ?? '—'],
        ].map(([label, val]) => (
          <div key={label} style={{
            background: 'var(--bg2)', padding: '22px 16px', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem', fontWeight: 800,
              color: 'var(--green)', letterSpacing: '-0.03em',
              transition: 'all 0.3s',
            }}>
              {val}
            </div>
            <div style={{
              color: 'var(--text-dim)', fontSize: '0.62rem',
              letterSpacing: '0.12em', marginTop: 4,
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="fade-up">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        }}>
          <div style={{
            height: 1, flex: 1, background: 'var(--border)',
          }} />
          <span style={{
            fontSize: '0.68rem', color: 'var(--text-dim)',
            letterSpacing: '0.15em', whiteSpace: 'nowrap',
          }}>
            HOW IT WORKS
          </span>
          <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
        }}>
          {features.map(([num, title, desc], i) => (
            <div key={num} style={{
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '22px 20px', background: 'var(--bg2)',
              transition: 'border-color 0.2s, transform 0.2s',
              cursor: 'default',
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'var(--green-dim)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{
                color: 'var(--green)', fontSize: '0.65rem',
                letterSpacing: '0.12em', marginBottom: 10,
              }}>
                {num}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700, fontSize: '1rem', marginBottom: 8,
              }}>
                {title}
              </div>
              <div style={{
                color: 'var(--text-dim)', fontSize: '0.78rem', lineHeight: 1.65,
              }}>
                {desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack Footer */}
      <div style={{
        marginTop: 60, paddingTop: 24,
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 16, flexWrap: 'wrap',
        fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.08em',
      }}>
        {['React + Vite', 'Node.js + Express', 'Consensus Engine', 'Tether WDK', 'Base / Polygon', 'Apache 2.0'].map(t => (
          <span key={t} style={{
            padding: '3px 10px', border: '1px solid var(--border)',
            borderRadius: 3, background: 'var(--bg2)',
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}