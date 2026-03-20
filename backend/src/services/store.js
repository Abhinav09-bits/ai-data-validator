// backend/src/services/store.js
const store = {
  datasets:  {},  // datasetId → dataset
  tasks:     {},  // taskId    → task
  responses: {},  // taskId    → [response]
  users:     {},  // userId    → user
  consensus: {},  // taskId    → consensus result
  scoreHistory: {},// userId  → [score event]
};

module.exports = store;