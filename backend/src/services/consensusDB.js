// backend/src/services/consensusDB.js
const repo = require('./repository');
const { runTipAgent } = require('./agent');
const { getTier, getNextTier } = require('./scoring');

const CFG = {
  min:       () => parseInt(process.env.MIN_VALIDATORS        || '3'),
  max:       () => parseInt(process.env.MAX_VALIDATORS        || '7'),
  threshold: () => parseFloat(process.env.CONSENSUS_THRESHOLD || '0.6'),
  pCorrect:  () => parseInt(process.env.REWARD_POINTS_CORRECT       || '10'),
  pPart:     () => parseInt(process.env.REWARD_POINTS_PARTICIPATION  || '2'),
  pBonus:    () => parseInt(process.env.REWARD_POINTS_BONUS          || '5'),
};

function getUserWeight(user) {
  if (!user) return 1.0;
  const exp = Math.min((user.response_count || 0) / 100, 0.5);
  const avg = (user.response_count || 0) > 0
    ? (user.score || 0) / user.response_count : 0;
  const acc = Math.min(avg / 20, 0.5);
  return parseFloat((1.0 + exp + acc).toFixed(3));
}

async function runConsensusDB(taskId) {
  const responses = await repo.getResponsesByTask(taskId);
  const min       = CFG.min();
  const max       = CFG.max();
  const threshold = CFG.threshold();

  if (responses.length < min) return { consensus: null, awarded: [] };

  // Weighted tally
  const tally = { correct: 0, incorrect: 0 };
  responses.forEach(r => {
    tally[r.answer] = (tally[r.answer] || 0) + parseFloat(r.weight || 1);
  });

  const total          = tally.correct + tally.incorrect;
  const correctRatio   = tally.correct  / total;
  const incorrectRatio = tally.incorrect / total;
  const leadingResult  = correctRatio >= incorrectRatio ? 'correct' : 'incorrect';
  const leadingRatio   = Math.max(correctRatio, incorrectRatio);

  // Early consensus check
  const remaining      = max - responses.length;
  const maxRemWeight   = remaining * 2.0;
  const losingWeight   = Math.min(tally.correct, tally.incorrect);
  const leadWeight     = Math.max(tally.correct, tally.incorrect);
  const earlyConsensus = remaining > 0 && (losingWeight + maxRemWeight) < leadWeight;

  const thresholdMet  = leadingRatio >= threshold;
  const shouldResolve = thresholdMet || earlyConsensus || responses.length >= max;
  if (!shouldResolve) return { consensus: null, awarded: [] };

  const consensusData = {
    taskId,
    result:        leadingResult,
    confidence:    parseFloat(leadingRatio.toFixed(4)),
    weightedVotes: {
      correct:   parseFloat(tally.correct.toFixed(3)),
      incorrect: parseFloat(tally.incorrect.toFixed(3)),
    },
    rawVotes: {
      correct:   responses.filter(r => r.answer === 'correct').length,
      incorrect: responses.filter(r => r.answer === 'incorrect').length,
    },
    totalVotes:    responses.length,
    totalWeight:   parseFloat(total.toFixed(3)),
    thresholdUsed: threshold,
    earlyConsensus,
    method: earlyConsensus ? 'early_majority'
          : responses.length >= max ? 'max_validators' : 'threshold',
    resolvedAt: new Date().toISOString(),
  };

  // Save consensus + update task status
  await repo.saveConsensus(consensusData);
  await repo.updateTask(taskId, {
    status:           'resolved',
    consensus_result: leadingResult,
    resolved_at:      new Date().toISOString(),
  });

  // Award points to validators
  const awarded = await awardPointsDB(taskId, consensusData, responses);

  // 🤖 Fire autonomous tip agent (non-blocking — does not delay response)
  const freshResponses = await repo.getResponsesByTask(taskId);
  setImmediate(async () => {
    try {
      console.log('\n  🤖 TipAgent: Firing for task', taskId);
      const result = await runTipAgent(taskId, consensusData, freshResponses);
      console.log('  🤖 TipAgent: Completed:', result ? result.decision?.action : 'null result');
    } catch (err) {
      console.error('  🤖 TipAgent FATAL:', err.message);
      console.error(err.stack);
    }
  });

  return { consensus: consensusData, awarded };
}

async function awardPointsDB(taskId, consensus, responses) {
  const isHighConf    = consensus.confidence >= 0.8;
  const correctAnswer = consensus.result;
  const awarded       = [];

  const STREAK_MILESTONES = [3, 5, 10, 20];
  const STREAK_BONUSES    = { 3: 5, 5: 10, 10: 25, 20: 50 };

  for (const response of responses) {
    const user = await repo.getUserById(response.user_id);
    if (!user) continue;

    const isCorrect = response.answer === correctAnswer;
    let basePoints  = isCorrect
      ? CFG.pCorrect() + (isHighConf ? CFG.pBonus() : 0)
      : CFG.pPart();
    const reason    = isCorrect
      ? (isHighConf ? 'majority_correct_bonus' : 'majority_correct')
      : 'participation';

    // Streak tracking
    let streak      = user.streak      || 0;
    let bestStreak  = user.best_streak || 0;
    let bonusPts    = 0;
    let streakLabel = null;

    if (isCorrect) {
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      if (STREAK_MILESTONES.includes(streak)) {
        bonusPts    = STREAK_BONUSES[streak];
        streakLabel = `${streak}-streak`;
      }
    } else {
      streak = 0;
    }

    const reputation = Math.min(1000, Math.max(0,
      (user.reputation || 100) + (isCorrect ? 2 : -1)
    ));

    const totalPoints = basePoints + bonusPts;

    // Update user stats in DB
    await repo.updateUser(user.id, {
      score:           (user.score          || 0) + totalPoints,
      streak,
      best_streak:     bestStreak,
      reputation,
      correct_votes:   (user.correct_votes  || 0) + (isCorrect ? 1 : 0),
      incorrect_votes: (user.incorrect_votes || 0) + (isCorrect ? 0 : 1),
      bonus_points:    (user.bonus_points    || 0) + bonusPts,
    });

    // Update response record
    await repo.updateResponse(taskId, user.id, {
      rewarded:      totalPoints,
      reward_reason: reason,
    });

    // Log to score history
    await repo.addScoreHistory({
      userId:          user.id,
      taskId,
      answer:          response.answer,
      consensusResult: correctAnswer,
      isCorrect,
      basePoints,
      bonusPoints:     bonusPts,
      totalPoints,
      streak,
      streakLabel,
      reputation,
    });

    awarded.push({
      userId:      user.id,
      name:        user.name,
      points:      totalPoints,
      basePoints,
      bonusPoints: bonusPts,
      streak,
      streakLabel,
      reason,
    });
  }

  return awarded;
}

module.exports = { runConsensusDB, getUserWeight };