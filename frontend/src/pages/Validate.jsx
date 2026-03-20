// frontend/src/pages/Validate.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getNextTask, submitResponse, getUser } from '../api';
import ScoreCard from '../components/ScoreCard';
import toast from 'react-hot-toast';

export default function Validate() {
  const { user, updateScore } = useUser();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [lastConsensus, setLastConsensus] = useState(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, total: 0 });
  const [prevScore, setPrevScore] = useState(user?.score ?? 0);
  const taskRef = useRef(null);

  const fetchTask = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLastConsensus(null);
    try {
      const res = await getNextTask(user.id);
      setTask(res.data.task || null);
      taskRef.current = res.data.task || null;
    } catch {
      toast.error('Failed to fetch task — is the backend running?');
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchTask();
  }, []);   // eslint-disable-line

  const handleAnswer = async (answer) => {
    if (!task || submitting) return;
    setSubmitting(answer);

    try {
      const res = await submitResponse(task.id, user.id, answer);
      const { consensusReached, consensus } = res.data;

      // Update session stats
      setSessionStats(prev => ({
        correct: prev.correct + (answer === 'correct' ? 1 : 0),
        incorrect: prev.incorrect + (answer === 'incorrect' ? 1 : 0),
        total: prev.total + 1,
      }));

      // Sync score from server
      const userRes = await getUser(user.id);
      const newScore = userRes.data.user.score;
      setPrevScore(user.score ?? 0);
      updateScore(newScore);

      if (consensusReached) {
        setLastConsensus(consensus);
        const won = consensus.result === answer;
        toast(
          won ? `✓ You were right! +10 pts` : `✗ Minority vote. +2 pts`,
          { icon: won ? '🏆' : '📝', duration: 3000 }
        );
      } else {
        const needed = parseInt(import.meta.env.VITE_MIN_VALIDATORS || '3');
        const current = res.data.responseCount || 1;
        toast(`Vote recorded (${current}/${needed} validators)`, { icon: '📝' });
      }

      setTimeout(fetchTask, 1400);
    } catch (err) {
      const msg = err.response?.data?.error || 'Submission failed';
      if (msg.includes('already responded')) {
        toast.error('Already voted on this task');
        setTimeout(fetchTask, 600);
      } else if (msg.includes('resolved')) {
        toast('Task already resolved', { icon: 'ℹ️' });
        setTimeout(fetchTask, 600);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(null);
    }
  };

  if (!user) return null;

  const accuracy = sessionStats.total > 0
    ? Math.round((sessionStats.correct / sessionStats.total) * 100)
    : null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px' }}>

      {/* Header Row */}
      <div className="fade-up" style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <p style={{ color: 'var(--green)', fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: 4 }}>
            $ validate --user {user.name}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em',
          }}>
            Validation Terminal
          </h1>
        </div>
        <ScoreCard score={user.score ?? 0} prevScore={prevScore} />
      </div>

      {/* Session Stats Bar */}
      <div className="fade-up" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1, marginBottom: 24,
        border: '1px solid var(--border)', borderRadius: 6,
        overflow: 'hidden', background: 'var(--border)',
      }}>
        {[
          ['TOTAL', sessionStats.total],
          ['CORRECT', sessionStats.correct, 'var(--green)'],
          ['INCORRECT', sessionStats.incorrect, 'var(--red)'],
          ['ACCURACY', accuracy !== null ? accuracy + '%' : '—', 'var(--yellow)'],
        ].map(([label, val, color]) => (
          <div key={label} style={{
            background: 'var(--bg2)', padding: '10px 16px', textAlign: 'center',
          }}>
            <div style={{
              fontSize: '1.1rem', fontWeight: 700,
              color: color || 'var(--text)', fontFamily: 'var(--font-mono)',
            }}>{val}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: 2 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Task Area */}
      {loading ? (
        <TaskSkeleton />
      ) : !task ? (
        <EmptyState />
      ) : (
        <TaskCard
          key={task.id}
          task={task}
          onAnswer={handleAnswer}
          submitting={submitting}
          lastConsensus={lastConsensus}
        />
      )}

      {/* Tip */}
      <div style={{
        marginTop: 20, padding: '12px 16px',
        border: '1px solid var(--border)', borderRadius: 6,
        background: 'var(--bg2)', fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.8,
      }}>
        <span style={{ color: 'var(--yellow)' }}>rewards</span>
        {' '}· majority vote = <span style={{ color: 'var(--green)' }}>+10 pts</span>
        {' '}· participation = <span style={{ color: 'var(--green)' }}>+2 pts</span>
        {' '}· min 3 validators per task
        {' '}· points → USDT via Tether WDK
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function TaskCard({ task, onAnswer, submitting, lastConsensus }) {
  return (
    <div className="fade-up" style={{
      border: '1px solid var(--border)',
      background: 'var(--bg2)',
      borderRadius: 8, overflow: 'hidden',
    }}>
      {/* Meta bar */}
      <div style={{
        padding: '9px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--bg3)',
      }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          task/{task.id.slice(0, 8)}···
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: '0.68rem', color: 'var(--yellow)',
            background: 'rgba(255,211,42,0.08)',
            border: '1px solid rgba(255,211,42,0.25)',
            padding: '2px 8px', borderRadius: 3,
          }}>
            {task.datasetName}
          </span>
          <span style={{
            fontSize: '0.68rem', color: 'var(--text-dim)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            padding: '2px 8px', borderRadius: 3,
          }}>
            {task.status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 28px' }}>
        <p style={{
          fontSize: '0.68rem', color: 'var(--text-dim)',
          letterSpacing: '0.12em', marginBottom: 14,
        }}>
          IS THIS DATA ENTRY CORRECT?
        </p>

        <div style={{
          fontSize: '1rem', lineHeight: 1.75, color: 'var(--text)',
          borderLeft: '3px solid var(--green)', paddingLeft: 18,
          marginBottom: 32, fontFamily: 'var(--font-mono)',
        }}>
          {task.content}
        </div>

        {/* Answer buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <AnswerButton
            label="✓  CORRECT"
            answer="correct"
            submitting={submitting}
            onClick={() => onAnswer('correct')}
            activeColor="var(--green)"
            activeBg="rgba(57,255,133,0.12)"
            borderColor="var(--green-dim)"
          />
          <AnswerButton
            label="✗  INCORRECT"
            answer="incorrect"
            submitting={submitting}
            onClick={() => onAnswer('incorrect')}
            activeColor="var(--red)"
            activeBg="rgba(255,71,87,0.12)"
            borderColor="var(--red-dim)"
          />
        </div>
      </div>

      {/* Consensus result */}
      {lastConsensus && (
        <div className="slide-in" style={{
          padding: '12px 28px', borderTop: '1px solid var(--border)',
          background: lastConsensus.result === 'correct'
            ? 'rgba(57,255,133,0.05)' : 'rgba(255,71,87,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>consensus → </span>
            <strong style={{
              color: lastConsensus.result === 'correct' ? 'var(--green)' : 'var(--red)',
            }}>
              {lastConsensus.result}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            <span>✓ {lastConsensus.votes.correct}</span>
            <span>✗ {lastConsensus.votes.incorrect}</span>
            <span style={{ color: 'var(--yellow)' }}>
              {Math.round(lastConsensus.confidence * 100)}% confidence
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function AnswerButton({ label, answer, submitting, onClick, activeColor, activeBg, borderColor }) {
  const isActive = submitting === answer;
  const isDisabled = !!submitting;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={{
        padding: '15px',
        background: isActive ? activeBg : 'transparent',
        border: `1px solid ${isActive ? activeColor : borderColor}`,
        color: activeColor,
        borderRadius: 6,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700, fontSize: '0.85rem',
        letterSpacing: '0.08em',
        transition: 'all 0.15s',
        opacity: isDisabled && !isActive ? 0.5 : 1,
      }}
      onMouseOver={e => { if (!isDisabled) e.currentTarget.style.background = activeBg; }}
      onMouseOut={e => { if (!isDisabled && !isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      {isActive ? 'submitting...' : label}
    </button>
  );
}

function TaskSkeleton() {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 8,
      background: 'var(--bg2)', padding: 40, textAlign: 'center',
      color: 'var(--text-dim)', fontSize: '0.85rem',
    }}>
      <span style={{ animation: 'blink 1s infinite', display: 'inline-block', marginRight: 8 }}>█</span>
      fetching next task...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="fade-up" style={{
      border: '1px solid var(--green-dim)',
      background: 'rgba(57,255,133,0.03)',
      borderRadius: 8, padding: '48px 32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>✓</div>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.3rem', fontWeight: 700,
        color: 'var(--green)', marginBottom: 8,
      }}>
        Queue empty
      </p>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginBottom: 24 }}>
        You've validated everything available. Upload more data or wait for new tasks.
      </p>
      <a href="/upload" style={{
        color: 'var(--green)', fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem', textDecoration: 'none',
        border: '1px solid var(--green-dim)',
        padding: '8px 20px', borderRadius: 4,
      }}>
        upload dataset →
      </a>
    </div>
  );
}