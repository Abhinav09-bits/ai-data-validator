// frontend/src/pages/Upload.jsx
import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { uploadDataset } from '../api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SAMPLE = JSON.stringify([
  { "content": "The sky is blue on a clear day.", "label": "correct" },
  { "content": "Water boils at 50°C at sea level.", "label": "incorrect" },
  { "content": "Paris is the capital of France.", "label": "correct" }
], null, 2);

export default function Upload() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [raw, setRaw] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState('');

  const handleUpload = async () => {
    if (!name.trim()) return toast.error('Dataset name required');
    let items;
    try {
      items = JSON.parse(raw);
      if (!Array.isArray(items)) throw new Error('Must be a JSON array');
      setParseError('');
    } catch (e) {
      setParseError(e.message);
      return;
    }
    setLoading(true);
    try {
      const res = await uploadDataset(name.trim(), items);
      toast.success(`${res.data.tasksGenerated} tasks generated!`);
      navigate('/validate');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) { navigate('/login'); return null; }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--green)', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: 4 }}>
          $ upload --dataset
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Upload Dataset
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: 8 }}>
          Paste a JSON array of items. Each item needs a <code style={{ color: 'var(--green)' }}>content</code> field.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
            DATASET NAME
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Medical Labels v1"
            style={{
              width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem', padding: '10px 14px', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
            JSON PAYLOAD
          </label>
          <textarea
            value={raw}
            onChange={e => { setRaw(e.target.value); setParseError(''); }}
            rows={14}
            style={{
              width: '100%', background: 'var(--bg2)', border: `1px solid ${parseError ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem', padding: '14px', outline: 'none', resize: 'vertical', lineHeight: 1.6,
            }}
          />
          {parseError && <p style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: 4 }}>JSON error: {parseError}</p>}
        </div>

        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            background: loading ? 'var(--green-dim)' : 'var(--green)',
            color: 'var(--bg)', border: 'none', borderRadius: 4,
            padding: '13px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)',
            fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.06em',
          }}
        >
          {loading ? 'uploading...' : 'UPLOAD & GENERATE TASKS →'}
        </button>
      </div>
    </div>
  );
}