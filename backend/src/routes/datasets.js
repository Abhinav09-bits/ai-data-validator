// backend/src/routes/datasets.js
const express = require('express');
const router  = express.Router();
const repo    = require('../services/repository');

router.post('/', async (req, res) => {
  try {
    const { name, items } = req.body;
    if (!name || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Provide name and non-empty items array.' });
    }

    const dataset = await repo.createDataset(name.trim());

    // Create all tasks
    const taskPromises = items.map((item, idx) =>
      repo.createTask(
        dataset.id,
        name.trim(),
        item.content,
        item.label || null
      )
    );
    await Promise.all(taskPromises);
    await repo.updateDatasetTaskCount(dataset.id);

    res.status(201).json({
      message:        'Dataset uploaded and tasks generated.',
      datasetId:      dataset.id,
      name:           dataset.name,
      tasksGenerated: items.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const datasets = await repo.getAllDatasets();
    res.json({ datasets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const dataset = await repo.getDatasetById(req.params.id);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found.' });
    res.json({ dataset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;