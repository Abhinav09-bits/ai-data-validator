// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const { runMigrations } = require('./services/migrate');
const cron                = require('node-cron');
const { processTipQueue } = require('./services/agent');


const app  = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


app.get('/health', async (req, res) => {
  const { query } = require('./services/db');
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/api/datasets', require('./routes/datasets'));
app.use('/api/tasks',    require('./routes/tasks'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/stats',    require('./routes/stats'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/agent', require('./routes/agent'));

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.', details: err.message });
});

async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log('\n  AI Data Validator — Backend Ready (PostgreSQL)');
      console.log(`  http://localhost:${PORT}\n`);
    });
    // 🤖 Tip queue processor — runs every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  try {
    await processTipQueue();
  } catch (err) {
    console.error('Cron tip error:', err.message);
  }
});
console.log('  🤖 TipAgent cron started (every 30s)\n');
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

start();