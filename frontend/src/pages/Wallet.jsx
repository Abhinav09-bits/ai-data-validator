// frontend/src/pages/Wallet.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Wallet() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();

  const [wallet,       setWallet]       = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [creating,     setCreating]     = useState(false);
  const [redeeming,    setRedeeming]    = useState(false);
  const [platform,     setPlatform]     = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchWallet();
    fetchPlatform();
  }, []); // eslint-disable-line

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API}/api/wallet/${user.id}`);
      setWallet(res.data.wallet);
      setTransactions(res.data.transactions || []);
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error('Failed to load wallet');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatform = async () => {
    try {
      const res = await axios.get(`${API}/api/wallet/platform/info`);
      setPlatform(res.data.platform);
    } catch {}
  };

  const createWallet = async () => {
    setCreating(true);
    try {
      const res = await axios.post(`${API}/api/wallet/create`, { userId: user.id });
      setWallet(res.data.wallet);
      toast.success('Wallet created via Tether WDK!');
      fetchWallet();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create wallet');
    } finally {
      setCreating(false);
    }
  };

  const redeemPoints = async () => {
    if (!wallet) return toast.error('Create a wallet first');
    const min = 50;
    if ((user.score || 0) < min) {
      return toast.error(`Need at least ${min} points to redeem`);
    }
    setRedeeming(true);
    try {
      const res = await axios.post(`${API}/api/wallet/redeem`, { userId: user.id });
      toast.success(`${res.data.usdtSent} USDT sent! TX: ${res.data.txHash?.slice(0, 10)}...`);
      updateUser({ score: 0 });
      fetchWallet();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Redemption failed');
    } finally {
      setRedeeming(false);
    }
  };

  if (!user) return null;

  const rate    = 0.001;
  const minPts  = 50;
  const usdtEst = ((user.score || 0) * rate).toFixed(4);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--green)', fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: 4 }}>
          $ tether-wdk --wallet
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
        }}>
          USDT Wallet
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 6 }}>
          Non-custodial wallet powered by{' '}
          <span style={{ color: 'var(--green)' }}>Tether WDK</span>
          {' '}on Polygon Amoy testnet
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          <span style={{ animation: 'blink 1s infinite', display: 'inline-block', marginRight: 8 }}>█</span>
          connecting to blockchain...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Points → USDT converter */}
          <div style={{
            border: '1px solid var(--green-dim)',
            borderRadius: 8, background: 'rgba(57,255,133,0.04)',
            padding: '24px',
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 16 }}>
              YOUR REWARDS
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-display)' }}>
                  {user.score || 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>POINTS</div>
              </div>
              <div style={{ fontSize: '1.5rem', color: 'var(--text-dim)' }}>→</div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--yellow)', fontFamily: 'var(--font-display)' }}>
                  {usdtEst}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>USDT</div>
              </div>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 12 }}>
              Rate: 1 pt = {rate} USDT · Min payout: {minPts} pts
            </p>
          </div>

          {/* Wallet card */}
          {!wallet ? (
            <div style={{
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg2)', padding: '32px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>⬡</div>
              <p style={{
                fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                fontWeight: 700, marginBottom: 8,
              }}>
                No wallet yet
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: 20 }}>
                Create a non-custodial EVM wallet via Tether WDK to receive USDT rewards.
              </p>
              <button
                onClick={createWallet}
                disabled={creating}
                style={{
                  background: creating ? 'var(--green-dim)' : 'var(--green)',
                  color: 'var(--bg)', border: 'none', borderRadius: 4,
                  padding: '12px 28px', fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)', fontWeight: 700,
                  cursor: creating ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.06em',
                }}
              >
                {creating ? 'creating wallet...' : '⬡ CREATE WALLET VIA WDK'}
              </button>
            </div>
          ) : (
            <div style={{
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg2)', overflow: 'hidden',
            }}>
              {/* Wallet header */}
              <div style={{
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg3)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                  WALLET — {wallet.chain?.toUpperCase()}
                </span>
                {/* FIX 1: Added missing opening <a tag */}
                <a
                  href={wallet.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.7rem', color: 'var(--green)', textDecoration: 'none' }}
                >
                  view on explorer ↗
                </a>
              </div>

              <div style={{ padding: '20px' }}>
                {/* Address */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
                    ADDRESS
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
                    color: 'var(--green)', wordBreak: 'break-all',
                    background: 'var(--bg)', padding: '10px 14px',
                    borderRadius: 4, border: '1px solid var(--border)',
                  }}>
                    {wallet.address}
                  </p>
                </div>

                {/* Balances */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
                }}>
                  {[
                    ['USDT BALANCE',  wallet.usdtBalance,  'var(--green)'],
                    ['MATIC BALANCE', wallet.maticBalance, 'var(--yellow)'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '14px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
                        {val}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: 4 }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Redeem button */}
                <button
                  onClick={redeemPoints}
                  disabled={redeeming || (user.score || 0) < minPts}
                  style={{
                    width: '100%',
                    background: (user.score || 0) >= minPts
                      ? (redeeming ? 'var(--green-dim)' : 'var(--green)')
                      : 'var(--bg3)',
                    color: (user.score || 0) >= minPts ? 'var(--bg)' : 'var(--text-dim)',
                    border: `1px solid ${(user.score || 0) >= minPts ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius: 4, padding: '13px',
                    fontSize: '0.85rem', fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: (user.score || 0) >= minPts && !redeeming ? 'pointer' : 'not-allowed',
                    letterSpacing: '0.06em',
                  }}
                >
                  {redeeming
                    ? 'sending USDT via WDK...'
                    : (user.score || 0) >= minPts
                      ? `REDEEM ${user.score} pts → ${usdtEst} USDT`
                      : `Need ${minPts - (user.score || 0)} more pts to redeem`
                  }
                </button>
              </div>
            </div>
          )}

          {/* Platform wallet info */}
          {platform && !platform.error && (
            <div style={{
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg2)', padding: '20px',
            }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 12 }}>
                PLATFORM WALLET (TETHER WDK)
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 4 }}>ADDRESS</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text)' }}>
                    {platform.address?.slice(0, 20)}...
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 4 }}>USDT</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--green)' }}>
                    {platform.usdtBalance}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 4 }}>NETWORK</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--yellow)' }}>
                    {platform.network}
                  </p>
                </div>
                {/* FIX 2: Added missing opening <a tag */}
                <a
                  href={platform.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.72rem', color: 'var(--green)', textDecoration: 'none', alignSelf: 'flex-end' }}
                >
                  explorer ↗
                </a>
              </div>
            </div>
          )}

          {/* Transaction history */}
          {transactions.length > 0 && (
            <div style={{
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg2)', overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg3)',
                fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em',
              }}>
                TRANSACTION HISTORY
              </div>
              {transactions.map((tx, idx) => (
                <div key={tx.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 20px',
                  borderBottom: idx < transactions.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                      {tx.tx_type === 'usdt_tip' ? 'USDT Reward' : tx.tx_type}
                    </p>
                    {tx.tx_hash && (
                      /* FIX 3: Added missing opening <a tag */
                      <a
                        href={`https://amoy.polygonscan.com/tx/${tx.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.68rem', color: 'var(--green)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}
                      >
                        {tx.tx_hash.slice(0, 18)}... ↗
                      </a>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, color: 'var(--green)', fontSize: '0.88rem' }}>
                      +{tx.amount_usdt} USDT
                    </p>
                    <p style={{
                      fontSize: '0.68rem',
                      color: tx.status === 'confirmed' ? 'var(--green)' :
                             tx.status === 'failed'    ? 'var(--red)'   : 'var(--yellow)',
                    }}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}