// frontend/src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { registerUser } from '../api';
import toast from 'react-hot-toast';

export default function Login() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error('Name must be at least 2 characters');
    setLoading(true);
    try {
      const res = await registerUser(name.trim());
      login(res.data.user);
      toast.success(`Welcome, ${res.data.user.name}!`);
      navigate('/validate');
    } catch (err) {
      toast.error('Registration failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div className="fade-up" style={{
        width: '100%',
        maxWidth: 420,
        border: '1px solid var(--border)',
        background: 'var(--bg2)',
        borderRadius: 8,
        padding: 40,
      }}>
        {/* Terminal header */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 28,
        }}>
          {['var(--red)', 'var(--yellow)', 'var(--green)'].map((c, i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'block' }} />
          ))}
        </div>

        <p style={{ color: 'var(--green)', fontSize: '0.75rem', marginBottom: 8, letterSpacing: '0.1em' }}>
          $ ./connect --new-user
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.8rem',
          fontWeight: 800,
          marginBottom: 8,
          letterSpacing: '-0.03em',
        }}>
          Enter the grid
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: 32, lineHeight: 1.6 }}>
          Register your handle to start validating data and earning rewards.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6, letterSpacing: '0.08em' }}>
            YOUR HANDLE
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. alice_42"
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              padding: '10px 14px',
              outline: 'none',
              marginBottom: 20,
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? 'var(--green-dim)' : 'var(--green)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 4,
              padding: '12px',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.06em',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'connecting...' : 'CONNECT →'}
          </button>
        </form>
      </div>
    </div>
  );
}