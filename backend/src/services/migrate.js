// backend/src/services/migrate.js
const { query } = require('./db');

const migrations = [
  // ── Users table
  // Add to migrations array in migrate.js
// Add to migrations array
`CREATE TABLE IF NOT EXISTS agent_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
  agent_name      VARCHAR(100) DEFAULT 'TipAgent',
  decision        VARCHAR(50),
  reasoning       TEXT,
  confidence      NUMERIC(6,4),
  users_affected  INTEGER DEFAULT 0,
  total_usdt      NUMERIC(18,6) DEFAULT 0,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)`,

`CREATE TABLE IF NOT EXISTS tip_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
  amount_usdt     NUMERIC(18,6),
  reason          VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'queued',
  attempts        INTEGER DEFAULT 0,
  tx_hash         VARCHAR(255),
  error_message   TEXT,
  scheduled_at    TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)`,

`CREATE INDEX IF NOT EXISTS idx_agent_decisions_task ON agent_decisions(task_id)`,
`CREATE INDEX IF NOT EXISTS idx_tip_queue_status     ON tip_queue(status)`,
`CREATE INDEX IF NOT EXISTS idx_tip_queue_user       ON tip_queue(user_id)`,
`CREATE TABLE IF NOT EXISTS wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  address         VARCHAR(255) NOT NULL UNIQUE,
  encrypted_data  TEXT,
  chain           VARCHAR(50) DEFAULT 'polygon-amoy',
  chain_id        INTEGER DEFAULT 80002,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)`,

`CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  wallet_address  VARCHAR(255),
  tx_hash         VARCHAR(255),
  tx_type         VARCHAR(50),
  amount_usdt     NUMERIC(18,6),
  points_redeemed INTEGER DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending',
  error_message   TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
)`,

`CREATE INDEX IF NOT EXISTS idx_wallets_user_id     ON wallets(user_id)`,
`CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions(user_id)`,
`CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`,
];

async function runMigrations() {
  console.log('  Running database migrations...');
  for (const sql of migrations) {
    await query(sql);
  }
  console.log('  ✓ All migrations complete');
}

module.exports = { runMigrations };