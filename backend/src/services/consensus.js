// backend/src/services/consensus.js
const store = require('./store');
const { recordScoreEvent } = require('./scoring');

// ── Config ────────────────────────────────────────────────
const CFG = {
  minValidators:      () => parseInt(process.env.MIN_VALIDATORS       || '3'),
  maxValidators:      () => parseInt(process.env.MAX_VALIDATORS       || '7'),
  threshold:          () => parseFloat(process.env.CONSENSUS_THRESHOLD || '0.6'),
  earlyConsensus:     () => process.env.EARLY_CONSENSUS !== 'false',
  expiryHours:        () => parseInt(process.env.TASK_EXPIRY_HOURS    || '48'),
  pointsCorrect:      () => parseInt(process.env.REWARD_POINTS_CORRECT       || '10'),
  pointsParticipation:() => parseInt(process.env.REWARD_POINTS_PARTICIPATION || '2'),
  pointsBonus:        () => parseInt(process.env.REWARD_POINTS_BONUS         || '5'),
  minResponseMs:      () => parseInt(process.env.MIN_RESPONSE_TIME_MS        || '1500'),
};

/**
 * Calculate weight for a user based on their history.
 * New users: weight 1.0
 * Experienced validators: weight up to 2.0
 */
function getUserWeight(userId) {
  const user = store.users[userId];
  if (!user) return 1.0;

  const responses = user.responseCount || 0;
  const score     = user.score         || 0;

  // Base weight from response count (max bonus: +0.5)
  const experienceBonus = Math.min(responses / 100, 0.5);

  // Accuracy bonus — score per response (max bonus: +0.5)
  const avgScore = responses > 0 ? score / responses : 0;
  const accuracyBonus = Math.min(avgScore / 20, 0.5);

  const weight = parseFloat((1.0 + experienceBonus + accuracyBonus).toFixed(3));
  return weight;
}

/**
 * Core consensus calculation.
 * Returns consensus object or null if not enough data.
 */
function calculateConsensus(taskId) {
  const responses = store.responses[taskId] || [];
  const min = CFG.minValidators();
  const max = CFG.maxValidators();
  const threshold = CFG.threshold();

  if (responses.length < min) return null;

  // Tally weighted votes
  const tally = { correct: 0, incorrect: 0 };
  const weights = {};

  responses.forEach((r) => {
    const w = getUserWeight(r.userId);
    weights[r.userId] = w;
    tally[r.answer] = (tally[r.answer] || 0) + w;
  });

  const totalWeight = tally.correct + tally.incorrect;
  const correctRatio  = tally.correct   / totalWeight;
  const incorrectRatio = tally.incorrect / totalWeight;

  const leadingResult = correctRatio >= incorrectRatio ? 'correct' : 'incorrect';
  const leadingRatio  = Math.max(correctRatio, incorrectRatio);

  // Check if consensus threshold is met
  const thresholdMet = leadingRatio >= threshold;

  // Check early consensus: can remaining votes possibly flip result?
  let earlyConsensus = false;
  if (CFG.earlyConsensus() && responses.length < max) {
    const remaining     = max - responses.length;
    const maxRemaining  = remaining * 2.0; // max possible weight for remaining
    const losingWeight  = Math.min(tally.correct, tally.incorrect);
    const leadingWeight = Math.max(tally.correct, tally.incorrect);
    // Early consensus if even all remaining votes can't flip majority
    earlyConsensus = (losingWeight + maxRemaining) < leadingWeight;
  }

  const shouldResolve = thresholdMet || earlyConsensus || responses.length >= max;
  if (!shouldResolve) return null;

  return {
    taskId,
    result:       leadingResult,
    confidence:   parseFloat(leadingRatio.toFixed(4)),
    weightedVotes: {
      correct:   parseFloat(tally.correct.toFixed(3)),
      incorrect: parseFloat(tally.incorrect.toFixed(3)),
    },
    rawVotes: {
      correct:   responses.filter(r => r.answer === 'correct').length,
      incorrect: responses.filter(r => r.answer === 'incorrect').length,
    },
    totalVotes:     responses.length,
    totalWeight:    parseFloat(totalWeight.toFixed(3)),
    validatorWeights: weights,
    thresholdUsed:  threshold,
    earlyConsensus,
    resolvedAt:     new Date().toISOString(),
    method: earlyConsensus ? 'early_majority' :
            responses.length >= max ? 'max_validators' : 'threshold',
  };
}

/**
 * Run consensus on a task. Stores result and updates task status.
 */
function runConsensus(taskId) {
  const consensus = calculateConsensus(taskId);
  if (!consensus) return null;

  store.consensus[taskId] = consensus;
  if (store.tasks[taskId]) {
    store.tasks[taskId].status          = 'resolved';
    store.tasks[taskId].consensusResult = consensus.result;
    store.tasks[taskId].resolvedAt      = consensus.resolvedAt;
  }

  return consensus;
}

/**
 * Award points based on consensus result.
 * Majority voters + bonus for high-confidence rounds.
 */
function awardPoints(taskId) {
  const consensus = store.consensus[taskId];
  if (!consensus) return [];

  const responses     = store.responses[taskId] || [];
  const correctAnswer = consensus.result;
  const isHighConf    = consensus.confidence >= 0.8;
  const awarded       = [];

  responses.forEach((response) => {
    const user = store.users[response.userId];
    if (!user) return;

    let basePoints = 0;
    let reason     = '';

    if (response.answer === correctAnswer) {
      basePoints = CFG.pointsCorrect();
      if (isHighConf) basePoints += CFG.pointsBonus();
      reason = isHighConf ? 'majority_correct_bonus' : 'majority_correct';
    } else {
      basePoints = CFG.pointsParticipation();
      reason     = 'participation';
    }

    // Apply base points
    user.score = (user.score || 0) + basePoints;
    response.rewarded     = basePoints;
    response.rewardReason = reason;

    // Record scoring event (handles streak + reputation)
    const event = recordScoreEvent(
      response.userId,
      taskId,
      response.answer,
      correctAnswer,
      basePoints
    );

    awarded.push({
      userId:       response.userId,
      name:         user.name,
      points:       basePoints + (event?.bonusPoints || 0),
      basePoints,
      bonusPoints:  event?.bonusPoints  || 0,
      streak:       event?.streak       || 0,
      streakLabel:  event?.streakLabel  || null,
      reason,
    });
  });

  return awarded;
}

/**
 * Expire tasks that have been pending too long.
 * Force-resolves with whatever votes exist (min 1).
 */
function expireStaleTask(taskId) {
  const task      = store.tasks[taskId];
  const responses = store.responses[taskId] || [];

  if (!task || task.status !== 'pending') return null;

  const createdAt = new Date(task.createdAt);
  const hoursOld  = (Date.now() - createdAt.getTime()) / 3600000;

  if (hoursOld < CFG.expiryHours()) return null;
  if (responses.length === 0) {
    task.status = 'expired';
    return { expired: true, taskId };
  }

  // Force resolve with current votes
  const tally = { correct: 0, incorrect: 0 };
  responses.forEach(r => tally[r.answer]++);
  const result = tally.correct >= tally.incorrect ? 'correct' : 'incorrect';

  const consensus = {
    taskId,
    result,
    confidence:   parseFloat((Math.max(tally.correct, tally.incorrect) / responses.length).toFixed(4)),
    weightedVotes: tally,
    rawVotes:      tally,
    totalVotes:    responses.length,
    resolvedAt:    new Date().toISOString(),
    method:        'expired',
  };

  store.consensus[taskId] = consensus;
  task.status          = 'expired';
  task.consensusResult = result;

  awardPoints(taskId);
  return consensus;
}

/**
 * Run expiry check across all pending tasks.
 * Call this on a schedule (Phase 11 adds the cron job).
 */
function runExpiryCheck() {
  const pending = Object.values(store.tasks).filter(t => t.status === 'pending');
  const results = pending.map(t => expireStaleTask(t.id)).filter(Boolean);
  return results;
}

/**
 * Get consensus statistics across all resolved tasks.
 */
function getConsensusStats() {
  const resolved = Object.values(store.consensus);
  if (resolved.length === 0) {
    return { total: 0, avgConfidence: 0, methods: {}, distribution: {} };
  }

  const methods = {};
  let totalConfidence = 0;
  const distribution = { correct: 0, incorrect: 0 };

  resolved.forEach(c => {
    methods[c.method] = (methods[c.method] || 0) + 1;
    totalConfidence  += c.confidence;
    distribution[c.result]++;
  });

  return {
    total:          resolved.length,
    avgConfidence:  parseFloat((totalConfidence / resolved.length).toFixed(4)),
    methods,
    distribution,
    threshold:      CFG.threshold(),
    minValidators:  CFG.minValidators(),
  };
}

module.exports = {
  runConsensus,
  awardPoints,
  runExpiryCheck,
  getConsensusStats,
  getUserWeight,
  calculateConsensus,
};