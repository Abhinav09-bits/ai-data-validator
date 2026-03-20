// frontend/src/pages/ConsensusStats.jsx
import { getStats } from '../api';
import { usePolling } from '../hooks/useApi';

export default function ConsensusStats() {
  const { data, loading } = usePolling(getStats, [], 6000);

  const cs = data?.consensus;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--green)', fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: 4 }}>
          $ cat consensus_stats.json
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
        }}>
          Consensus Engine
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: 6 }}>
          Live stats from the weighted voting system
        </p>
      </div>

      {loading || !cs ? (
        <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          <span style={{ animation: 'blink 1s infinite', display: 'inline-block', marginRight: 8 }}>█</span>
          loading...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Top metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 1, border: '1px solid var(--border)', borderRadius: 8,
            overflow: 'hidden', background: 'var(--border)',
          }}>
            {[
              ['RESOLVED', cs.total, 'var(--green)'],
              ['AVG CONFIDENCE', `${Math.round(cs.avgConfidence * 100)}%`,
                cs.avgConfidence >= 0.8 ? 'var(--green)' :
                cs.avgConfidence >= 0.6 ? 'var(--yellow)' : 'var(--red)'],
              ['MIN VALIDATORS', cs.minValidators, 'var(--text)'],
              ['THRESHOLD', `${Math.round(cs.threshold * 100)}%`, 'var(--yellow)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: 'var(--bg2)', padding: '22px 16px', textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem', fontWeight: 800,
                  color, letterSpacing: '-0.03em',
                }}>
                  {val}
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.62rem', letterSpacing: '0.12em', marginTop: 4 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Result distribution */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg2)', padding: 24,
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 16 }}>
              RESULT DISTRIBUTION
            </p>
            {cs.total === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>No resolved tasks yet.</p>
            ) : (
              <>
                {[
                  ['correct',   cs.distribution.correct   || 0, 'var(--green)'],
                  ['incorrect', cs.distribution.incorrect || 0, 'var(--red)'],
                ].map(([label, count, color]) => {
                  const pct = cs.total > 0 ? Math.round((count / cs.total) * 100) : 0;
                  return (
                    <div key={label} style={{ marginBottom: 12 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        marginBottom: 5, fontSize: '0.78rem',
                      }}>
                        <span style={{ color }}>{label}</span>
                        <span style={{ color: 'var(--text-dim)' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{
                        height: 6, background: 'var(--bg)',
                        borderRadius: 3, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: color, borderRadius: 3,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Resolution methods */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg2)', padding: 24,
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 16 }}>
              RESOLUTION METHODS
            </p>
            {Object.keys(cs.methods).length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>No data yet.</p>
            ) : (
              Object.entries(cs.methods).map(([method, count]) => (
                <div key={method} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '0.82rem',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--yellow)' }}>
                    {method}
                  </span>
                  <span style={{ color: 'var(--text-dim)' }}>
                    {count} task{count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Config */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg2)', padding: 24,
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 16 }}>
              ENGINE CONFIG
            </p>
            {[
              ['MIN_VALIDATORS',    cs.minValidators],
              ['CONSENSUS_THRESHOLD', `${cs.threshold * 100}%`],
              ['WEIGHTING',         'experience + accuracy'],
              ['EARLY_CONSENSUS',   'enabled'],
              ['EXPIRY',            `${process.env.VITE_TASK_EXPIRY_HOURS || 48}h`],
            ].map(([key, val]) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--border)',
                fontSize: '0.78rem',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{key}</span>
                <span style={{ color: 'var(--green)' }}>{val}</span>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}