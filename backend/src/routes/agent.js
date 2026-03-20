// backend/src/routes/agent.js
const express = require('express');
const router  = express.Router();
const repo    = require('../services/repository');
const { processTipQueue } = require('../services/agent');

/**
 * GET /api/agent/decisions
 * Get recent AI agent decisions — for judges to see reasoning
 */
router.get('/decisions', async (req, res) => {
  try {
    const limit     = parseInt(req.query.limit || '20');
    const decisions = await repo.getAgentDecisions(limit);
    res.json({ decisions, count: decisions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/agent/queue
 * Get tip queue status
 */
router.get('/queue', async (req, res) => {
  try {
    const [stats, queued] = await Promise.all([
      repo.getTipQueueStats(),
      repo.getQueuedTips(20),
    ]);
    res.json({ stats, queued });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/agent/process
 * Manually trigger tip queue processing (for demo)
 */
router.post('/process', async (req, res) => {
  try {
    await processTipQueue();
    const stats = await repo.getTipQueueStats();
    res.json({ message: 'Tip queue processed.', stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/agent/status
 * Agent health + config
 */
router.get('/status', (req, res) => {
  res.json({
    agentEnabled:    process.env.AI_AGENT_ENABLED === 'true',
    autoTipEnabled:  process.env.AUTO_TIP_ENABLED === 'true',
    model:           process.env.AI_MODEL || 'gemini-1.5-flash',
    minConfidence:   parseFloat(process.env.MIN_CONFIDENCE_FOR_TIP || '0.6'),
    bonusConfidence: parseFloat(process.env.BONUS_TIP_CONFIDENCE   || '0.85'),
    pointsToUsdt:    parseFloat(process.env.POINTS_TO_USDT_RATE    || '0.001'),
    network:         process.env.WDK_NETWORK || 'polygon-amoy',
    walletReady:     !!(process.env.PLATFORM_MNEMONIC &&
                       !process.env.PLATFORM_MNEMONIC.includes('your-twelve')),
  });
});

module.exports = router;