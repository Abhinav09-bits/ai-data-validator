// frontend/src/pages/AgentDashboard.jsx
import { useState } from 'react';
import axios from 'axios';
import { usePolling } from '../hooks/useApi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const fetchAgentStatus    = () => axios.get(`${API}/api/agent/status`);
const fetchAgentDecisions = () => axios.get(`${API}/api/agent/decisions`);
const fetchAgentQueue     = () => axios.get(`${API}/api/agent/queue`);

export default function AgentDashboard() {
  const [processing, setProcessing] = useState(false);

  const { data: statusData }    = usePolling(fetchAgentStatus,    [], 10000);
  const { data: decisionsData, refetch: refetchDecisions } =
                                  usePolling(fetchAgentDecisions, [], 8000);
  const { data: queueData,     refetch: refetchQueue } =
                                  usePolling(fetchAgentQueue,     [], 8000);

  const status    = statusData?.data;
  const decisions = decisionsData?.data?.decisions || [];
  const queue     = queueData?.data;

  const triggerProcess = async () => {
    setProcessing(true);
    try {
      await axios.post(`${API}/api/agent/process`);
      toast.success('Tip queue processed!');
      refetchQueue();
      refetchDecisions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--green)', fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: 4 }}>
          $ ./tip-agent --status
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
        }}>
          AI Tip Agent
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 6 }}>
          Autonomous USDT tipping powered by{' '}
          <span style={{ color: 'var(--green)' }}>Gemini AI</span>
          {' '}+ Tether WDK
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Agent status */}
        {status && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 1, border: '1px solid var(--border)', borderRadius: 8,
            overflow: 'hidden', background: 'var(--border)',
          }}>
            {[
              ['AI AGENT',    status.agentEnabled   ? 'ONLINE' : 'OFF',   status.agentEnabled   ? 'var(--green)' : 'var(--red)'],
              ['AUTO TIP',    status.autoTipEnabled ? 'ACTIVE' : 'OFF',   status.autoTipEnabled ? 'var(--green)' : 'var(--red)'],
              ['MODEL',       status.model?.split('-').slice(-1)[0] || '—', 'var(--yellow)'],
              ['NETWORK',     status.network || '—',                        'var(--text)'],
              ['WALLET',      status.walletReady ? 'READY' : 'NOT SET',    status.walletReady ? 'var(--green)' : 'var(--red)'],
              ['MIN CONF',    `${Math.round((status.minConfidence||0)*100)}%`, 'var(--text)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: 'var(--bg2)', padding: '18px 14px', textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
                  fontWeight: 700, color,
                }}>
                  {val}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: 4 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Queue stats + trigger */}
        {queue && (
          <div style={{
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg2)', padding: '20px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12,
            }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                TIP QUEUE
              </p>
              <button
                onClick={triggerProcess}
                disabled={processing}
                style={{
                  background: processing ? 'var(--green-dim)' : 'var(--green)',
                  color: 'var(--bg)', border: 'none', borderRadius: 4,
                  padding: '6px 16px', fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)', fontWeight: 700,
                  cursor: processing ? 'not-allowed' : 'pointer',
                }}
              >
                {processing ? 'processing...' : '▶ PROCESS NOW'}
              </button>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12,
            }}>
              {[
                ['QUEUED',    queue.stats?.queued     || 0, 'var(--yellow)'],
                ['SENT',      queue.stats?.sent       || 0, 'var(--green)'],
                ['FAILED',    queue.stats?.failed     || 0, 'var(--red)'],
                ['TOTAL USDT',parseFloat(queue.stats?.total_usdt_sent || 0).toFixed(4), 'var(--green)'],
              ].map(([label, val, color]) => (
                <div key={label} style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
                    {val}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: 4 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Pending tips */}
            {queue.queued?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
                  PENDING TIPS
                </p>
                {queue.queued.map((tip, idx) => (
                  <div key={tip.id} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: idx < queue.queued.length - 1 ? '1px solid var(--border)' : 'none',
                    fontSize: '0.78rem',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                      {tip.user_name}
                    </span>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                      {tip.amount_usdt} USDT
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Decision log */}
        <div style={{
          border: '1px solid var(--border)', borderRadius: 8,
          background: 'var(--bg2)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg3)',
            fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em',
          }}>
            AI AGENT DECISION LOG
          </div>

          {decisions.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
              No decisions yet. Complete a validation task to trigger the agent.
            </div>
          ) : (
            decisions.map((d, idx) => (
              <div key={d.id} className="slide-in" style={{
                padding: '16px 20px',
                borderBottom: idx < decisions.length - 1 ? '1px solid var(--border)' : 'none',
                animationDelay: `${idx * 0.04}s`,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700,
                      color: d.decision === 'tip' ? 'var(--green)' : 'var(--yellow)',
                      background: d.decision === 'tip'
                        ? 'rgba(57,255,133,0.1)' : 'rgba(255,211,42,0.1)',
                      border: `1px solid ${d.decision === 'tip' ? 'var(--green-dim)' : 'rgba(255,211,42,0.3)'}`,
                      padding: '2px 8px', borderRadius: 3, letterSpacing: '0.08em',
                    }}>
                      {d.decision?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {d.agent_name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    <span>
                      users: <span style={{ color: 'var(--text)' }}>{d.users_affected}</span>
                    </span>
                    <span>
                      total: <span style={{ color: 'var(--green)' }}>{parseFloat(d.total_usdt || 0).toFixed(4)} USDT</span>
                    </span>
                    <span>
                      conf: <span style={{ color: 'var(--yellow)' }}>
                        {Math.round((d.confidence || 0) * 100)}%
                      </span>
                    </span>
                  </div>
                </div>

                {/* AI Reasoning */}
                <p style={{
                  fontSize: '0.78rem', color: 'var(--text)',
                  fontStyle: 'italic', lineHeight: 1.5,
                  borderLeft: '2px solid var(--green-dim)',
                  paddingLeft: 10,
                }}>
                  "{d.reasoning}"
                </p>

                <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  task/{d.task_id?.slice(0, 8)} ·{' '}
                  {new Date(d.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}