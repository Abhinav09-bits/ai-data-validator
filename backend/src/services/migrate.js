// backend/src/services/migrate.js
const { query } = require('./db');

const migrations = [

  // ── 1. USERS (no dependencies) ──────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    score           INTEGER DEFAULT 0,
    reputation      INTEGER DEFAULT 100,
    streak          INTEGER DEFAULT 0,
    best_streak     INTEGER DEFAULT 0,
    correct_votes   INTEGER DEFAULT 0,
    incorrect_votes INTEGER DEFAULT 0,
    bonus_points    INTEGER DEFAULT 0,
    response_count  INTEGER DEFAULT 0,
    wallet_address  VARCHAR(255),
    wallet_data     JSONB,
    github_id       VARCHAR(100),
    github_username VARCHAR(100),
    avatar_url      VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── 2. DATASETS (no dependencies) ───────────────────────
  `CREATE TABLE IF NOT EXISTS datasets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    task_count  INTEGER DEFAULT 0,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── 3. TASKS (depends on datasets) ──────────────────────
  `CREATE TABLE IF NOT EXISTS tasks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id       UUID REFERENCES datasets(id) ON DELETE CASCADE,
    dataset_name     VARCHAR(255),
    content          TEXT NOT NULL,
    original_label   VARCHAR(50),
    status           VARCHAR(20) DEFAULT 'pending',
    consensus_result VARCHAR(20),
    resolved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── 4. RESPONSES (depends on tasks + users) ─────────────
  `CREATE TABLE IF NOT EXISTS responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    answer          VARCHAR(20) NOT NULL,
    weight          NUMERIC(5,3) DEFAULT 1.0,
    rewarded        INTEGER DEFAULT 0,
    reward_reason   VARCHAR(50),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id)
  )`,

  // ── 5. CONSENSUS (depends on tasks) ─────────────────────
  `CREATE TABLE IF NOT EXISTS consensus (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id            UUID REFERENCES tasks(id) ON DELETE CASCADE UNIQUE,
    result             VARCHAR(20) NOT NULL,
    confidence         NUMERIC(6,4),
    weighted_correct   NUMERIC(8,3),
    weighted_incorrect NUMERIC(8,3),
    raw_correct        INTEGER,
    raw_incorrect      INTEGER,
    total_votes        INTEGER,
    total_weight       NUMERIC(8,3),
    threshold_used     NUMERIC(4,3),
    early_consensus    BOOLEAN DEFAULT FALSE,
    method             VARCHAR(30),
    resolved_at        TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── 6. SCORE HISTORY (depends on tasks + users) ─────────
  `CREATE TABLE IF NOT EXISTS score_history (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id          UUID REFERENCES tasks(id) ON DELETE SET NULL,
    answer           VARCHAR(20),
    consensus_result VARCHAR(20),
    is_correct       BOOLEAN,
    base_points      INTEGER DEFAULT 0,
    bonus_points     INTEGER DEFAULT 0,
    total_points     INTEGER DEFAULT 0,
    streak           INTEGER DEFAULT 0,
    streak_label     VARCHAR(50),
    reputation       INTEGER DEFAULT 100,
    created_at       TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── 7. CORE INDEXES ──────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_dataset_id   ON tasks(dataset_id)`,
  `CREATE INDEX IF NOT EXISTS idx_responses_task_id  ON responses(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_responses_user_id  ON responses(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_score_history_user ON score_history(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_score        ON users(score DESC)`,

  // ── 8. WALLETS (depends on users) ────────────────────────
  `CREATE TABLE IF NOT EXISTS wallets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    address         VARCHAR(255) NOT NULL UNIQUE,
    encrypted_data  TEXT,
    chain           VARCHAR(50) DEFAULT 'polygon-amoy',
    chain_id        INTEGER DEFAULT 80002,
    created_at      TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ── 9. TRANSACTIONS (depends on users) ───────────────────
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

  // ── 10. WALLET + TRANSACTION INDEXES ─────────────────────
  `CREATE INDEX IF NOT EXISTS idx_wallets_user_id     ON wallets(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`,

  // ── 11. AGENT DECISIONS (depends on tasks) ───────────────
  // MUST come after tasks table
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

  // ── 12. TIP QUEUE (depends on users + tasks) ─────────────
  // MUST come after users and tasks tables
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

  // ── 13. AGENT INDEXES ─────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_agent_decisions_task ON agent_decisions(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tip_queue_status     ON tip_queue(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tip_queue_user       ON tip_queue(user_id)`,

];

async function runMigrations() {
  console.log('  Running database migrations...');
  for (const sql of migrations) {
    await query(sql);
  }
  console.log('  ✓ All migrations complete');
}

module.exports = { runMigrations };