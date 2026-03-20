// backend/src/routes/users.js
const express = require('express');
const router  = express.Router();
const repo    = require('../services/repository');
const { getTier, getNextTier, TIERS } = require('../services/scoring');

function buildProfile(user, history = []) {
  const tier     = getTier(user.score || 0);
  const nextTier = getNextTier(user.score || 0);
  const total    = (user.correct_votes || 0) + (user.incorrect_votes || 0);
  const accuracy = total > 0
    ? parseFloat((user.correct_votes / total).toFixed(4)) : 0;

  return {
    id:             user.id,
    name:           user.name,
    score:          user.score          || 0,
    reputation:     user.reputation     || 100,
    streak:         user.streak         || 0,
    bestStreak:     user.best_streak    || 0,
    correctVotes:   user.correct_votes  || 0,
    incorrectVotes: user.incorrect_votes|| 0,
    bonusPoints:    user.bonus_points   || 0,
    responseCount:  user.response_count || 0,
    walletAddress:  user.wallet_address || null,
    accuracy,
    tier,
    nextTier,
    recentHistory:  history,
    createdAt:      user.created_at,
    lastActiveAt:   user.last_active_at,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }
    const user    = await repo.createUser(name.trim());
    const profile = buildProfile(user);
    res.status(201).json({ message: 'User registered.', user: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tiers', (req, res) => {
  res.json({ tiers: TIERS });
});

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50');
    const users = await repo.getLeaderboard(limit);
    const leaderboard = users.map((u, idx) => ({
      ...buildProfile(u),
      rank: idx + 1,
    }));
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await repo.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const history = await repo.getScoreHistory(user.id, 10);
    res.json({ user: buildProfile(user, history) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const limit   = parseInt(req.query.limit || '20');
    const history = await repo.getScoreHistory(req.params.id, limit);
    res.json({ userId: req.params.id, history, total: history.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;