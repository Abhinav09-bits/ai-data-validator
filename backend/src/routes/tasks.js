// backend/src/routes/tasks.js
const express = require('express');
const router  = express.Router();
const repo    = require('../services/repository');
const { runConsensusDB, getConsensusStatsDB } = require('../services/consensusDB');
const { getUserWeight } = require('../services/consensusDB');

router.get('/stats', async (req, res) => {
  try {
    res.json(await repo.getConsensusStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/next', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required.' });

    const user = await repo.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const task = await repo.getNextTaskForUser(userId);
    if (!task) return res.json({ task: null, message: 'No more tasks available.' });

    const count = await repo.countResponsesByTask(task.id);
    res.json({
      task,
      responseCount:    count,
      validatorsNeeded: Math.max(0, parseInt(process.env.MIN_VALIDATORS || '3') - count),
      userWeight:       getUserWeight(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, datasetId, limit = 50, offset = 0 } = req.query;
    const tasks = await repo.getTasks({ status, datasetId,
      limit: Number(limit), offset: Number(offset) });
    res.json({ tasks, count: tasks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await repo.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const responses = await repo.getResponsesByTask(req.params.id);
    const consensus = await repo.getConsensusByTask(req.params.id);
    res.json({ task, responseCount: responses.length, voterBreakdown: responses, consensus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/respond', async (req, res) => {
  try {
    const { userId, answer } = req.body;
    const taskId = req.params.id;

    if (!userId || !answer) {
      return res.status(400).json({ error: 'userId and answer required.' });
    }
    if (!['correct', 'incorrect'].includes(answer)) {
      return res.status(400).json({ error: 'answer must be correct or incorrect.' });
    }

    const [task, user] = await Promise.all([
      repo.getTaskById(taskId),
      repo.getUserById(userId),
    ]);

    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (task.status === 'resolved' || task.status === 'expired') {
      return res.status(409).json({ error: 'Task already resolved.' });
    }

    const existing = await repo.getResponseByTaskAndUser(taskId, userId);
    if (existing) {
      return res.status(409).json({ error: 'You already responded to this task.' });
    }

    const weight = getUserWeight(user);
    await repo.createResponse(taskId, userId, answer, weight);
    await repo.updateUser(userId, {
      response_count: (user.response_count || 0) + 1,
    });

    const { consensus, awarded } = await runConsensusDB(taskId);
    const count = await repo.countResponsesByTask(taskId);

    res.json({
      message:          'Response recorded.',
      taskId,
      answer,
      weight,
      responseCount:    count,
      consensusReached: !!consensus,
      consensus:        consensus || null,
      awarded:          awarded.length ? awarded : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/consensus', async (req, res) => {
  try {
    const consensus = await repo.getConsensusByTask(req.params.id);
    if (!consensus) {
      const count = await repo.countResponsesByTask(req.params.id);
      return res.json({
        resolved:      false,
        responseCount: count,
        needed: Math.max(0, parseInt(process.env.MIN_VALIDATORS || '3') - count),
      });
    }
    res.json({ resolved: true, consensus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;