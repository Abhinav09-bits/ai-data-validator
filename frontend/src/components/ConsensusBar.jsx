// frontend/src/components/ConsensusBar.jsx

export default function ConsensusBar({ consensus }) {
  if (!consensus) return null;

  const { result, confidence, rawVotes, weightedVotes, method, totalVotes } = consensus;
  const correctPct  = totalVotes > 0 ? Math.round((rawVotes.correct  / totalVotes) * 100) : 0;
  const incorrectPct = 100 - correctPct;

  const methodLabels = {
    threshold:       'threshold met',
    early_majority:  'early majority',
    max_validators:  'max validators reached',
    expired:         'task expired',
  };

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8, overflow: 'hidden',
      background: 'var(--bg2)',
      animation: 'fadeUp 0.4s ease both',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          CONSENSUS REACHED
        </span>
        <span style={{
          fontSize: '0.68rem',
          color: 'var(--yellow)',
          background: 'rgba(255,211,42,0.08)',
          border: '1px solid rgba(255,211,42,0.2)',
          padding: '2px 8px', borderRadius: 3,
        }}>
          {methodLabels[method] || method}
        </span>
      </div>

      <div style={{ padding: '18px' }}>
        {/* Result */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 14,
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>RESULT  </span>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem', fontWeight: 800,
              color: result === 'correct' ? 'var(--green)' : 'var(--red)',
              letterSpacing: '-0.02em',
            }}>
              {result.toUpperCase()}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>CONFIDENCE  </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontWeight: 700,
              color: confidence >= 0.8 ? 'var(--green)' :
                     confidence >= 0.6 ? 'var(--yellow)' : 'var(--red)',
              fontSize: '1rem',
            }}>
              {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>

        {/* Vote bar */}
        <div style={{
          height: 8, borderRadius: 4, overflow: 'hidden',
          background: 'var(--bg)', marginBottom: 10,
          display: 'flex',
        }}>
          <div style={{
            width: `${correctPct}%`,
            background: 'var(--green)',
            transition: 'width 0.6s ease',
          }} />
          <div style={{
            width: `${incorrectPct}%`,
            background: 'var(--red)',
            transition: 'width 0.6s ease',
          }} />
        </div>

        {/* Vote counts */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '0.72rem',
        }}>
          <span style={{ color: 'var(--green)' }}>
            ✓ {rawVotes.correct} votes ({weightedVotes?.correct?.toFixed(1)} weighted)
          </span>
          <span style={{ color: 'var(--text-dim)' }}>
            {totalVotes} total
          </span>
          <span style={{ color: 'var(--red)' }}>
            ✗ {rawVotes.incorrect} votes ({weightedVotes?.incorrect?.toFixed(1)} weighted)
          </span>
        </div>
      </div>
    </div>
  );
}