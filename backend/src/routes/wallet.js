// backend/src/routes/wallet.js
const express = require('express');
const router  = express.Router();
const repo    = require('../services/repository');
const wdk     = require('../services/wdk');

/**
 * POST /api/wallet/create
 * Create a non-custodial wallet for a user
 * Body: { userId }
 */
router.post('/create', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required.' });

    const user = await repo.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const wallet = await wdk.createUserWallet(userId);

    res.status(201).json({
      message: wallet.isNew
        ? 'Wallet created successfully via Tether WDK.'
        : 'Wallet already exists.',
      wallet,
      userId,
      userName: user.name,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/wallet/:userId
 * Get wallet info + live USDT balance
 */
router.get('/:userId', async (req, res) => {
  try {
    const info = await wdk.getWalletInfo(req.params.userId);
    if (!info) {
      return res.status(404).json({
        error: 'No wallet found. Create one first.',
        hint:  'POST /api/wallet/create with { userId }',
      });
    }

    const txs = await repo.getTransactionsByUser(req.params.userId, 10);

    res.json({
      wallet:       info,
      transactions: txs,
      pointsToUSDTRate: parseFloat(process.env.POINTS_TO_USDT_RATE || '0.001'),
      minPointsForPayout: parseInt(process.env.MIN_POINTS_FOR_PAYOUT || '50'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/wallet/redeem
 * Redeem points for USDT — triggers autonomous tip
 * Body: { userId }
 */
router.post('/redeem', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required.' });

    const user = await repo.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Check wallet exists
    const wallet = await repo.getWalletByUser(userId);
    if (!wallet) {
      return res.status(400).json({
        error: 'No wallet found.',
        hint:  'Create a wallet first via POST /api/wallet/create',
      });
    }

    // Check minimum points
    if (!wdk.qualifiesForPayout(user.score)) {
      const min = parseInt(process.env.MIN_POINTS_FOR_PAYOUT || '50');
      return res.status(400).json({
        error:          `Need at least ${min} points to redeem.`,
        currentScore:   user.score,
        pointsNeeded:   min - user.score,
      });
    }

    const amountUsdt = wdk.pointsToUSDT(user.score);

    // Send USDT via WDK
    const result = await wdk.sendUSDTTip(userId, amountUsdt);

    // Deduct redeemed points
    await repo.updateUser(userId, { score: 0 });

    res.json({
      message:      'USDT sent successfully via Tether WDK!',
      pointsRedeemed: user.score,
      usdtSent:     amountUsdt,
      txHash:       result.txHash,
      recipient:    result.recipient,
      explorerUrl:  result.explorerUrl,
      blockNumber:  result.blockNumber,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/wallet/platform/info
 * Get platform wallet info (for demo/judges)
 */
router.get('/platform/info', async (req, res) => {
  try {
    const info = await wdk.getPlatformInfo();
    res.json({ platform: info });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/wallet/:userId/transactions
 * Get transaction history for a user
 */
router.get('/:userId/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20');
    const txs   = await repo.getTransactionsByUser(req.params.userId, limit);
    res.json({ transactions: txs, count: txs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;