// frontend/src/components/Navbar.jsx
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export default function Navbar() {
  const { user, logout } = useUser();
  const location = useLocation();

  const navLink = (to, label) => (
    <Link
      to={to}
      style={{
        color: location.pathname === to ? 'var(--green)' : 'var(--text-dim)',
        textDecoration: 'none',
        fontSize: '0.8rem',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.05em',
        padding: '4px 0',
        borderBottom: location.pathname === to ? '1px solid var(--green)' : '1px solid transparent',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </Link>
  );

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      background: 'rgba(8,12,16,0.95)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--green)',
            display: 'inline-block',
            animation: 'pulse-green 2s infinite',
          }} />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1rem',
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}>
            DataValidator<span style={{ color: 'var(--green)' }}>.ai</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {navLink('/', '~/home')}
          {user && navLink('/validate', '~/validate')}
          {user && navLink('/profile', '~/profile')}
          {navLink('/leaderboard', '~/scores')}
          {navLink('/consensus', '~/consensus')}
          {navLink('/agent', '~/agent')}
          {user && navLink('/upload', '~/upload')}
          {user && navLink('/wallet', '~/wallet')}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--green)',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(57,255,133,0.08)',
                border: '1px solid var(--green-dim)',
                padding: '3px 10px',
                borderRadius: 4,
              }}>
                {user.name} · {user.score ?? 0}pts
              </span>
              <button onClick={logout} style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                padding: '3px 10px',
                borderRadius: 4,
                transition: 'all 0.2s',
              }}
              onMouseOver={e => e.target.style.borderColor = 'var(--red)'}
              onMouseOut={e => e.target.style.borderColor = 'var(--border)'}
              >
                logout
              </button>
            </div>
          ) : (
            <Link to="/login" style={{
              background: 'var(--green)',
              color: 'var(--bg)',
              textDecoration: 'none',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '5px 14px',
              borderRadius: 4,
              letterSpacing: '0.04em',
            }}>
              connect →
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}