// backend/src/services/repository.js
// All database operations in one place
const { query, getClient } = require('./db');

// ════════════════════════════════════════
// USERS
// ════════════════════════════════════════

async function createUser(name) {
  const res = await query(
    `INSERT INTO users (name) VALUES ($1) RETURNING *`,
    [name]
  );
  return res.rows[0];
}

async function getUserById(id) {
  const res = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return res.rows[0] || null;
}

async function updateUser(id, fields) {
  const keys   = Object.keys(fields);
  const values = Object.values(fields);
  const sets   = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const res = await query(
    `UPDATE users SET ${sets}, last_active_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0] || null;
}

async function getLeaderboard(limit = 50) {
  const res = await query(
    `SELECT id, name, score, reputation, streak, best_streak,
            correct_votes, incorrect_votes, bonus_points,
            response_count, wallet_address, created_at, last_active_at
     FROM users
     ORDER BY score DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

// ════════════════════════════════════════
// DATASETS
// ════════════════════════════════════════

async function createDataset(name, createdBy = null) {
  const res = await query(
    `INSERT INTO datasets (name, created_by) VALUES ($1, $2) RETURNING *`,
    [name, createdBy]
  );
  return res.rows[0];
}

async function updateDatasetTaskCount(datasetId) {
  await query(
    `UPDATE datasets SET task_count = (
       SELECT COUNT(*) FROM tasks WHERE dataset_id = $1
     ) WHERE id = $1`,
    [datasetId]
  );
}

async function getAllDatasets() {
  const res = await query(
    `SELECT * FROM datasets ORDER BY created_at DESC`
  );
  return res.rows;
}

async function getDatasetById(id) {
  const res = await query(`SELECT * FROM datasets WHERE id = $1`, [id]);
  return res.rows[0] || null;
}

// ════════════════════════════════════════
// TASKS
// ════════════════════════════════════════

async function createTask(datasetId, datasetName, content, originalLabel) {
  const res = await query(
    `INSERT INTO tasks (dataset_id, dataset_name, content, original_label)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [datasetId, datasetName, content, originalLabel || null]
  );
  return res.rows[0];
}

async function getTaskById(id) {
  const res = await query(`SELECT * FROM tasks WHERE id = $1`, [id]);
  return res.rows[0] || null;
}

async function getTasks(filters = {}) {
  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters.datasetId) {
    conditions.push(`dataset_id = $${idx++}`);
    values.push(filters.datasetId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit  = filters.limit  || 50;
  const offset = filters.offset || 0;

  const res = await query(
    `SELECT * FROM tasks ${where}
     ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END, created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset]
  );
  return res.rows;
}

async function getNextTaskForUser(userId) {
  const res = await query(
    `SELECT t.* FROM tasks t
     WHERE t.status = 'pending'
       AND t.id NOT IN (
         SELECT task_id FROM responses WHERE user_id = $1
       )
     ORDER BY t.created_at ASC
     LIMIT 1`,
    [userId]
  );
  return res.rows[0] || null;
}

async function updateTask(id, fields) {
  const keys   = Object.keys(fields);
  const values = Object.values(fields);
  const sets   = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const res = await query(
    `UPDATE tasks SET ${sets} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0] || null;
}

// ════════════════════════════════════════
// RESPONSES
// ════════════════════════════════════════

async function createResponse(taskId, userId, answer, weight) {
  const res = await query(
    `INSERT INTO responses (task_id, user_id, answer, weight)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [taskId, userId, answer, weight]
  );
  return res.rows[0];
}

async function getResponsesByTask(taskId) {
  const res = await query(
    `SELECT r.*, u.name as user_name
     FROM responses r
     JOIN users u ON u.id = r.user_id
     WHERE r.task_id = $1
     ORDER BY r.created_at ASC`,
    [taskId]
  );
  return res.rows;
}

async function getResponseByTaskAndUser(taskId, userId) {
  const res = await query(
    `SELECT * FROM responses WHERE task_id = $1 AND user_id = $2`,
    [taskId, userId]
  );
  return res.rows[0] || null;
}

async function updateResponse(taskId, userId, fields) {
  const keys   = Object.keys(fields);
  const values = Object.values(fields);
  const sets   = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
  await query(
    `UPDATE responses SET ${sets} WHERE task_id = $1 AND user_id = $2`,
    [taskId, userId, ...values]
  );
}

async function countResponsesByTask(taskId) {
  const res = await query(
    `SELECT COUNT(*) as count FROM responses WHERE task_id = $1`,
    [taskId]
  );
  return parseInt(res.rows[0].count);
}

// ════════════════════════════════════════
// CONSENSUS
// ════════════════════════════════════════

async function saveConsensus(data) {
  const res = await query(
    `INSERT INTO consensus
       (task_id, result, confidence, weighted_correct, weighted_incorrect,
        raw_correct, raw_incorrect, total_votes, total_weight,
        threshold_used, early_consensus, method)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (task_id) DO UPDATE SET
       result = EXCLUDED.result,
       confidence = EXCLUDED.confidence
     RETURNING *`,
    [
      data.taskId, data.result, data.confidence,
      data.weightedVotes?.correct, data.weightedVotes?.incorrect,
      data.rawVotes?.correct, data.rawVotes?.incorrect,
      data.totalVotes, data.totalWeight,
      data.thresholdUsed, data.earlyConsensus, data.method,
    ]
  );
  return res.rows[0];
}

async function getConsensusByTask(taskId) {
  const res = await query(
    `SELECT * FROM consensus WHERE task_id = $1`,
    [taskId]
  );
  return res.rows[0] || null;
}

async function getConsensusStats() {
  const res = await query(
    `SELECT
       COUNT(*)::int                                        AS total,
       COALESCE(AVG(confidence), 0)                        AS avg_confidence,
       COUNT(*) FILTER (WHERE result = 'correct')::int     AS correct_count,
       COUNT(*) FILTER (WHERE result = 'incorrect')::int   AS incorrect_count,
       COUNT(*) FILTER (WHERE method = 'threshold')::int       AS method_threshold,
       COUNT(*) FILTER (WHERE method = 'early_majority')::int  AS method_early,
       COUNT(*) FILTER (WHERE method = 'max_validators')::int  AS method_max,
       COUNT(*) FILTER (WHERE method = 'expired')::int         AS method_expired
     FROM consensus`
  );
  const r = res.rows[0];
  return {
    total:         r.total,
    avgConfidence: parseFloat((r.avg_confidence || 0).toFixed(4)),
    distribution:  { correct: r.correct_count, incorrect: r.incorrect_count },
    methods: {
      threshold:      r.method_threshold,
      early_majority: r.method_early,
      max_validators: r.method_max,
      expired:        r.method_expired,
    },
    threshold:    parseFloat(process.env.CONSENSUS_THRESHOLD || '0.6'),
    minValidators: parseInt(process.env.MIN_VALIDATORS || '3'),
  };
}

// ════════════════════════════════════════
// SCORE HISTORY
// ════════════════════════════════════════

async function addScoreHistory(data) {
  const res = await query(
    `INSERT INTO score_history
       (user_id, task_id, answer, consensus_result, is_correct,
        base_points, bonus_points, total_points, streak, streak_label, reputation)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      data.userId, data.taskId, data.answer, data.consensusResult,
      data.isCorrect, data.basePoints, data.bonusPoints, data.totalPoints,
      data.streak, data.streakLabel, data.reputation,
    ]
  );
  return res.rows[0];
}

async function getScoreHistory(userId, limit = 20) {
  const res = await query(
    `SELECT * FROM score_history
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

// ════════════════════════════════════════
// STATS
// ════════════════════════════════════════

async function getSystemStats() {
  const res = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM datasets)                          AS total_datasets,
      (SELECT COUNT(*)::int FROM tasks)                             AS total_tasks,
      (SELECT COUNT(*)::int FROM tasks WHERE status='pending')      AS pending_tasks,
      (SELECT COUNT(*)::int FROM tasks WHERE status='resolved')     AS resolved_tasks,
      (SELECT COUNT(*)::int FROM tasks WHERE status='expired')      AS expired_tasks,
      (SELECT COUNT(*)::int FROM users)                             AS total_users,
      (SELECT COUNT(*)::int FROM responses)                         AS total_responses,
      (SELECT COALESCE(SUM(score),0)::int FROM users)               AS total_points_awarded
  `);
  return res.rows[0];
}




// ════════════════════════════════════════
// WALLETS
// ════════════════════════════════════════

async function saveWallet(userId, address, encryptedData, chain) {
  const res = await query(
    `INSERT INTO wallets (user_id, address, encrypted_data, chain)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       address = EXCLUDED.address,
       encrypted_data = EXCLUDED.encrypted_data
     RETURNING *`,
    [userId, address, encryptedData, chain || 'polygon-amoy']
  );
  // Also update user's wallet_address field
  await query(
    `UPDATE users SET wallet_address = $1 WHERE id = $2`,
    [address, userId]
  );
  return res.rows[0];
}

async function getWalletByUser(userId) {
  const res = await query(
    `SELECT * FROM wallets WHERE user_id = $1`,
    [userId]
  );
  return res.rows[0] || null;
}

async function getWalletByAddress(address) {
  const res = await query(
    `SELECT w.*, u.name, u.score FROM wallets w
     JOIN users u ON u.id = w.user_id
     WHERE w.address = $1`,
    [address]
  );
  return res.rows[0] || null;
}

// ════════════════════════════════════════
// TRANSACTIONS
// ════════════════════════════════════════

async function createTransaction(data) {
  const res = await query(
    `INSERT INTO transactions
       (user_id, wallet_address, tx_type, amount_usdt, points_redeemed, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      data.userId, data.walletAddress, data.txType,
      data.amountUsdt, data.pointsRedeemed || 0,
      data.status || 'pending',
      JSON.stringify(data.metadata || {}),
    ]
  );
  return res.rows[0];
}

async function updateTransaction(id, fields) {
  const keys   = Object.keys(fields);
  const values = Object.values(fields);
  const sets   = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const res = await query(
    `UPDATE transactions SET ${sets} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return res.rows[0];
}

async function getTransactionsByUser(userId, limit = 20) {
  const res = await query(
    `SELECT * FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

async function getPendingTransactions() {
  const res = await query(
    `SELECT t.*, w.encrypted_data
     FROM transactions t
     JOIN wallets w ON w.user_id = t.user_id
     WHERE t.status = 'pending'
     ORDER BY t.created_at ASC`
  );
  return res.rows;
}
// ════════════════════════════════════════
// TIP QUEUE
// ════════════════════════════════════════

async function addToTipQueue(userId, taskId, amountUsdt, reason) {
  const res = await query(
    `INSERT INTO tip_queue (user_id, task_id, amount_usdt, reason)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, taskId, amountUsdt, reason]
  );
  return res.rows[0];
}

async function getQueuedTips(limit = 10) {
  const res = await query(
    `SELECT tq.*, u.name as user_name, u.wallet_address
     FROM tip_queue tq
     JOIN users u ON u.id = tq.user_id
     WHERE tq.status = 'queued'
       AND tq.attempts < 3
       AND u.wallet_address IS NOT NULL
     ORDER BY tq.created_at ASC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

async function updateTipQueue(id, fields) {
  const keys   = Object.keys(fields);
  const values = Object.values(fields);
  const sets   = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  await query(
    `UPDATE tip_queue SET ${sets} WHERE id = $1`,
    [id, ...values]
  );
}

async function getTipQueueStats() {
  const res = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status='queued')::int     AS queued,
      COUNT(*) FILTER (WHERE status='sent')::int       AS sent,
      COUNT(*) FILTER (WHERE status='failed')::int     AS failed,
      COALESCE(SUM(amount_usdt) FILTER (WHERE status='sent'), 0) AS total_usdt_sent
    FROM tip_queue
  `);
  return res.rows[0];
}

// ════════════════════════════════════════
// AGENT DECISIONS
// ════════════════════════════════════════

async function saveAgentDecision(data) {
  const res = await query(
    `INSERT INTO agent_decisions
       (task_id, agent_name, decision, reasoning, confidence,
        users_affected, total_usdt, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      data.taskId, data.agentName || 'TipAgent',
      data.decision, data.reasoning, data.confidence,
      data.usersAffected || 0, data.totalUsdt || 0,
      JSON.stringify(data.metadata || {}),
    ]
  );
  return res.rows[0];
}

async function getAgentDecisions(limit = 20) {
  const res = await query(
    `SELECT * FROM agent_decisions
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return res.rows;
}
module.exports = {
  createUser, getUserById, updateUser, getLeaderboard,
  createDataset, updateDatasetTaskCount, getAllDatasets, getDatasetById,
  createTask, getTaskById, getTasks, getNextTaskForUser, updateTask,
  createResponse, getResponsesByTask, getResponseByTaskAndUser,
  updateResponse, countResponsesByTask,
  saveConsensus, getConsensusByTask, getConsensusStats,
  addScoreHistory, getScoreHistory,
  getSystemStats,saveWallet, getWalletByUser, getWalletByAddress,
  createTransaction, updateTransaction,
  getTransactionsByUser, getPendingTransactions,
  addToTipQueue, getQueuedTips, updateTipQueue, getTipQueueStats,
  saveAgentDecision, getAgentDecisions,
};