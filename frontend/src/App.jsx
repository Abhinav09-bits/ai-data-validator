// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from './context/UserContext';
import Navbar from './components/Navbar';
import StatusBar from './components/StatusBar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Validate from './pages/Validate';
import Leaderboard from './pages/Leaderboard';
import Upload from './pages/Upload';
import ConsensusStats from './pages/ConsensusStats';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import AgentDashboard from './pages/AgentDashboard';

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/validate"
            element={
              <ProtectedRoute>
                <Validate />
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={
  <ProtectedRoute><Profile /></ProtectedRoute>

} />
<Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route path="/consensus" element={<ConsensusStats />} />
          <Route path="/agent" element={<AgentDashboard />} />
          <Route
            path="*"
            element={
              <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  404 — route not found
                </p>
              </div>
            }
          />
        </Routes>
        <StatusBar />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0d1117',
              color: '#e6edf3',
              border: '1px solid #21262d',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.8rem',
            },
          }}
        />
      </BrowserRouter>
    </UserProvider>
  );
}