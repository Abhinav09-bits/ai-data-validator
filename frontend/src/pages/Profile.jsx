// frontend/src/pages/Profile.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getUser } from '../api';
import { useApi } from '../hooks/useApi';

// ── Tier badge component
function TierBadge({ tier, size = 'md' }) {
  const sizes = { sm: { font: '0.7rem', pad: '2px 8px' }, md: { font: '0.82rem', pad: '4px 12px' } };
  const s = sizes[size] || sizes.md;
  return (
    <span style={{
      fontFamily:   'var(--font-mono)',
      fontSize:     s.font,
      fontWeight:   700,
      padding:      s.pad,
      borderRadius: 4,
      border:       `1px solid ${tier.color}44`,
      background:   `${tier.color}11`,
      color:        tier.color,
      letterSpacing:'0.06em',
    }}>
      {tier.badge} {tier.name}
    </span>
  );
}

// ── Progress bar to next tier
function TierProgress({ score, nextTier }) {
  if (!nextTier) return (
    <div style={{ fontSize: '0.78rem', color: 'var(--green)', marginTop: 8 }}>
      ❋ Max tier reached — Legend status
    </div>
  );

  const pct = Math.round((nextTier.progress || 0) * 100);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 6,
      }}>
        <span>Progress to <span style={{ color: nextTier.tier.color }}>{nextTier.tier.name}</span></span>
        <span>{nextTier.pointsNeeded} pts needed</span>
      </div>
      <div style={{
        height: 5, background: 'var(--bg)',
        borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, var(--green), ${nextTier.tier.color})`,
          borderRadius: 3, transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 4 }}>
        {pct}% complete
      </div>
    </div>
  );
}

// ── Stat box
function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '16px', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.6rem', fontWeight: 800,
        color: color || 'var(--text)', letterSpacing: '-0.03em',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.62rem', color: 'var(--text-dim)',
        letterSpacing: '0.1em', marginTop: 4,
      }}>
        {label}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();

  const fetchProfile = () => getUser(user?.id);
  const { data, loading, refetch } = useApi(fetchProfile, [], { immediate: !!user });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    refetch();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (data?.user) updateUser(data.user);
  }, [data]); // eslint-disable-line

  if (!user) return null;

  const profile = data?.user || user;
  const tier    = profile.tier    || { name: 'Novice', badge: '⬡', color: '#7d8590' };
  const nextTier= profile.nextTier|| null;

  const historyColors = { correct: 'var(--green)', incorrect: 'var(--red)' };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--green)', fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: 4 }}>
          $ whoami
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
          }}>
            {profile.name}
          </h1>
          <TierBadge tier={tier} />
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
          id: {profile.id}
        </p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          <span style={{ animation: 'blink 1s infinite', display: 'inline-block', marginRight: 8 }}>█</span>
          loading profile...
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tier progress */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg2)', padding: '24px',
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 12 }}>
              VALIDATOR TIER
            </p>
            <TierBadge tier={tier} size="md" />
            <TierProgress score={profile.score} nextTier={nextTier} />
          </div>

          {/* Stats grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 10,
          }}>
            <StatBox label="SCORE"        value={profile.score}         color="var(--green)" />
            <StatBox label="REPUTATION"   value={profile.reputation}    color="var(--yellow)" />
            <StatBox label="STREAK"       value={`${profile.streak}🔥`} color="var(--green)" />
            <StatBox label="BEST STREAK"  value={profile.bestStreak} />
            <StatBox label="ACCURACY"     value={`${Math.round((profile.accuracy || 0) * 100)}%`}
              color={profile.accuracy >= 0.7 ? 'var(--green)' : 'var(--yellow)'} />
            <StatBox label="TOTAL VOTES"  value={profile.responseCount} />
            <StatBox label="CORRECT"      value={profile.correctVotes}  color="var(--green)" />
            <StatBox label="BONUS PTS"    value={profile.bonusPoints}   color="var(--yellow)" />
          </div>

          {/* Wallet */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg2)', padding: '20px',
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 10 }}>
              WALLET
            </p>
            {profile.walletAddress ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--green)' }}>
                {profile.walletAddress}
              </p>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                No wallet connected yet — available in Phase 9 (Tether WDK)
              </p>
            )}
          </div>

          {/* Score history */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg2)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg3)',
              fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em',
            }}>
              RECENT ACTIVITY
            </div>

            {(!profile.recentHistory || profile.recentHistory.length === 0) ? (
              <div style={{ padding: '24px 20px', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                No activity yet. Start validating!
              </div>
            ) : (
              profile.recentHistory.map((event, idx) => (
                <div key={idx} className="slide-in" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 20px',
                  borderBottom: idx < profile.recentHistory.length - 1
                    ? '1px solid var(--border)' : 'none',
                  animationDelay: `${idx * 0.04}s`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: historyColors[event.consensusResult] || 'var(--text-dim)',
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    <div>
                      <span style={{
                        fontSize: '0.78rem',
                        color: event.isCorrect ? 'var(--green)' : 'var(--text-dim)',
                      }}>
                        {event.isCorrect ? '✓ correct vote' : '✗ minority vote'}
                      </span>
                      {event.streakLabel && (
                        <span style={{
                          marginLeft: 8, fontSize: '0.68rem',
                          color: 'var(--yellow)',
                          background: 'rgba(255,211,42,0.1)',
                          border: '1px solid rgba(255,211,42,0.2)',
                          padding: '1px 6px', borderRadius: 3,
                        }}>
                          🔥 {event.streakLabel}
                        </span>
                      )}
                      <div style={{
                        fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2,
                        fontFamily: 'var(--font-mono)',
                      }}>
                        task/{event.taskId?.slice(0, 8)} · streak {event.streak}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      color: event.totalPoints > 0 ? 'var(--green)' : 'var(--text-dim)',
                      fontWeight: 700, fontSize: '0.85rem',
                    }}>
                      +{event.totalPoints}
                    </div>
                    {event.bonusPoints > 0 && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--yellow)' }}>
                        +{event.bonusPoints} bonus
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}