// backend/src/routes/stats.js
const express = require('express');
const router  = express.Router();
const repo    = require('../services/repository');

router.get('/', async (req, res) => {
  try {
    const [stats, consensus, leaderboard] = await Promise.all([
  repo.getSystemStats(),
  repo.getConsensusStats().catch(() => ({
    total: 0, avgConfidence: 0,
    distribution: { correct: 0, incorrect: 0 },
    methods: {}, threshold: 0.6, minValidators: 3,
  })),
  repo.getLeaderboard(1),
]);

    const top = leaderboard[0] || null;
    res.json({
      totalDatasets:      stats.total_datasets,
      totalTasks:         stats.total_tasks,
      pendingTasks:       stats.pending_tasks,
      resolvedTasks:      stats.resolved_tasks,
      expiredTasks:       stats.expired_tasks,
      totalUsers:         stats.total_users,
      totalResponses:     stats.total_responses,
      totalPointsAwarded: stats.total_points_awarded,
      consensus,
      topValidator: top
        ? { name: top.name, score: top.score, responses: top.response_count }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;