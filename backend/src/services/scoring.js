// backend/src/services/scoring.js
const store = require('./store');

// ── Tier Definitions ─────────────────────────────────────────
const TIERS = [
  { name: 'Novice',    minScore: 0,    badge: '⬡', color: '#7d8590' },
  { name: 'Validator', minScore: 50,   badge: '◈', color: '#58a6ff' },
  { name: 'Analyst',   minScore: 200,  badge: '◆', color: '#3fb950' },
  { name: 'Expert',    minScore: 500,  badge: '★', color: '#d29922' },
  { name: 'Master',    minScore: 1000, badge: '✦', color: '#f78166' },
  { name: 'Legend',    minScore: 2500, badge: '❋', color: '#39ff85' },
];

// ── Streak Bonuses ────────────────────────────────────────────
const STREAK_BONUSES = [
  { streak: 3,  bonus: 5,  label: '3-streak' },
  { streak: 5,  bonus: 10, label: '5-streak' },
  { streak: 10, bonus: 25, label: '10-streak' },
  { streak: 20, bonus: 50, label: '20-streak' },
];

/**
 * Get tier for a given score
 */
function getTier(score) {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (score >= t.minScore) tier = t;
  }
  return tier;
}

/**
 * Get next tier info for progress bar
 */
function getNextTier(score) {
  for (let i = 0; i < TIERS.length; i++) {
    if (score < TIERS[i].minScore) {
      return {
        tier: TIERS[i],
        pointsNeeded: TIERS[i].minScore - score,
        progress: i > 0
          ? ((score - TIERS[i - 1].minScore) /
             (TIERS[i].minScore - TIERS[i - 1].minScore))
          : 0,
      };
    }
  }
  return null; // Already at max tier
}

/**
 * Get streak bonus for current streak count
 */
function getStreakBonus(streak) {
  let bonus = 0;
  let label = null;
  for (const s of STREAK_BONUSES) {
    if (streak >= s.streak) { bonus = s.bonus; label = s.label; }
  }
  return { bonus, label };
}

/**
 * Initialize a new user's scoring profile
 */
function initUserScoring(userId) {
  if (!store.scoreHistory[userId]) {
    store.scoreHistory[userId] = [];
  }
  const user = store.users[userId];
  if (user) {
    user.streak          = user.streak          ?? 0;
    user.bestStreak      = user.bestStreak       ?? 0;
    user.reputation      = user.reputation       ?? 100;
    user.correctVotes    = user.correctVotes     ?? 0;
    user.incorrectVotes  = user.incorrectVotes   ?? 0;
    user.bonusPoints     = user.bonusPoints      ?? 0;
    user.lastActiveAt    = user.lastActiveAt     ?? new Date().toISOString();
  }
}

/**
 * Record a score event and update user stats after a consensus.
 */
function recordScoreEvent(userId, taskId, answer, consensusResult, basePoints) {
  initUserScoring(userId);

  const user = store.users[userId];
  if (!user) return null;

  const isCorrect = answer === consensusResult;

  // ── Update streak
  if (isCorrect) {
    user.streak      = (user.streak || 0) + 1;
    user.bestStreak  = Math.max(user.bestStreak || 0, user.streak);
    user.correctVotes++;
  } else {
    user.streak = 0;
    user.incorrectVotes++;
  }

  // ── Streak bonus
  const { bonus: streakBonus, label: streakLabel } = getStreakBonus(user.streak);
  let totalPoints = basePoints;
  let bonusAwarded = 0;

  if (isCorrect && streakBonus > 0) {
    // Only award streak bonus at exact milestone streaks
    const milestones = STREAK_BONUSES.map(s => s.streak);
    if (milestones.includes(user.streak)) {
      totalPoints  += streakBonus;
      bonusAwarded  = streakBonus;
      user.bonusPoints = (user.bonusPoints || 0) + streakBonus;
    }
  }

  // ── Reputation update
  if (isCorrect) {
    user.reputation = Math.min(1000, (user.reputation || 100) + 2);
  } else {
    user.reputation = Math.max(0, (user.reputation || 100) - 1);
  }

  // ── Apply total points to score
  user.score = (user.score || 0) + totalPoints - basePoints; // base already added by consensus
  if (bonusAwarded > 0) user.score += bonusAwarded;

  user.lastActiveAt = new Date().toISOString();

  // ── Log score event
  const event = {
    taskId,
    answer,
    consensusResult,
    isCorrect,
    basePoints,
    bonusPoints:  bonusAwarded,
    totalPoints:  basePoints + bonusAwarded,
    streak:       user.streak,
    streakLabel:  streakBonus > 0 ? streakLabel : null,
    reputation:   user.reputation,
    timestamp:    new Date().toISOString(),
  };

  store.scoreHistory[userId].push(event);

  // Keep last 100 events per user
  if (store.scoreHistory[userId].length > 100) {
    store.scoreHistory[userId].shift();
  }

  return event;
}

/**
 * Get full scoring profile for a user
 */
function getUserProfile(userId) {
  initUserScoring(userId);
  const user = store.users[userId];
  if (!user) return null;

  const tier     = getTier(user.score || 0);
  const nextTier = getNextTier(user.score || 0);
  const history  = store.scoreHistory[userId] || [];

  const totalVotes   = (user.correctVotes || 0) + (user.incorrectVotes || 0);
  const accuracy     = totalVotes > 0
    ? parseFloat(((user.correctVotes || 0) / totalVotes).toFixed(4))
    : 0;

  return {
    id:             user.id,
    name:           user.name,
    score:          user.score          || 0,
    reputation:     user.reputation     || 100,
    streak:         user.streak         || 0,
    bestStreak:     user.bestStreak     || 0,
    correctVotes:   user.correctVotes   || 0,
    incorrectVotes: user.incorrectVotes || 0,
    bonusPoints:    user.bonusPoints    || 0,
    responseCount:  user.responseCount  || 0,
    accuracy,
    tier,
    nextTier,
    recentHistory: history.slice(-10).reverse(),
    walletAddress:  user.walletAddress  || null,
    lastActiveAt:   user.lastActiveAt,
    createdAt:      user.createdAt,
  };
}

/**
 * Get global leaderboard with tier info
 */
function getLeaderboard(limit = 50) {
  return Object.values(store.users)
    .map(u => {
      initUserScoring(u.id);
      const tier     = getTier(u.score || 0);
      const totalV   = (u.correctVotes || 0) + (u.incorrectVotes || 0);
      const accuracy = totalV > 0
        ? parseFloat(((u.correctVotes || 0) / totalV).toFixed(4))
        : 0;
      return {
        id:            u.id,
        name:          u.name,
        score:         u.score          || 0,
        reputation:    u.reputation     || 100,
        streak:        u.streak         || 0,
        responseCount: u.responseCount  || 0,
        accuracy,
        tier,
        walletAddress: u.walletAddress  || null,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((u, idx) => ({ ...u, rank: idx + 1 }));
}

module.exports = {
  getTier,
  getNextTier,
  getStreakBonus,
  initUserScoring,
  recordScoreEvent,
  getUserProfile,
  getLeaderboard,
  TIERS,
};