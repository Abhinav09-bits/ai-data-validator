// backend/src/services/wdk.js
const { ethers } = require('ethers');
const repo = require('./repository');

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

function getProvider() {
  const rpcUrl  = process.env.WDK_RPC_URL || 'https://rpc-amoy.polygon.technology';
  const chainId = parseInt(process.env.WDK_CHAIN_ID || '80002');
  const network = new ethers.Network('matic-amoy', chainId);
  return new ethers.JsonRpcProvider(rpcUrl, network, { staticNetwork: network });
}

function getPlatformWallet() {
  const mnemonic = process.env.PLATFORM_MNEMONIC;
  if (!mnemonic || mnemonic.includes('your-twelve')) {
    throw new Error('PLATFORM_MNEMONIC not set in .env');
  }
  const provider = getProvider();
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/0");
  return wallet.connect(provider);
}

function getUSDTContract(signerOrProvider) {
  const address = process.env.USDT_CONTRACT_ADDRESS || '0x856536D116E28f4c64E182fE91e8fAb6a0a3985';
  return new ethers.Contract(address, ERC20_ABI, signerOrProvider);
}

async function createUserWallet(userId) {
  const existing = await repo.getWalletByUser(userId);
  if (existing) {
    return { address: existing.address, chain: existing.chain, chainId: existing.chain_id, isNew: false };
  }
  const { query } = require('./db');
  const countRes = await query('SELECT COUNT(*) as count FROM wallets');
  const index = parseInt(countRes.rows[0].count);
  const mnemonic = process.env.PLATFORM_MNEMONIC;
  if (!mnemonic || mnemonic.includes('your-twelve')) {
    throw new Error('PLATFORM_MNEMONIC not set.');
  }
  const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${index}`);
  const address = masterNode.address;
  const encryptedData = JSON.stringify({ derivationPath: `m/44'/60'/0'/0/${index}`, index });
  await repo.saveWallet(userId, address, encryptedData, process.env.WDK_NETWORK || 'polygon-amoy');
  console.log(`  WDK: Created wallet for user ${userId} -> ${address}`);
  return { address, chain: process.env.WDK_NETWORK || 'polygon-amoy', chainId: parseInt(process.env.WDK_CHAIN_ID || '80002'), isNew: true };
}

async function getWalletInfo(userId) {
  const wallet = await repo.getWalletByUser(userId);
  if (!wallet) return null;
  try {
    const provider = getProvider();
    const usdt = getUSDTContract(provider);
    const [balanceRaw, decimals, maticBalance] = await Promise.all([
      usdt.balanceOf(wallet.address),
      usdt.decimals(),
      provider.getBalance(wallet.address),
    ]);
    return {
      address: wallet.address,
      chain: wallet.chain,
      chainId: wallet.chain_id,
      usdtBalance: parseFloat(ethers.formatUnits(balanceRaw, decimals)).toFixed(6),
      maticBalance: parseFloat(ethers.formatEther(maticBalance)).toFixed(6),
      explorerUrl: `https://amoy.polygonscan.com/address/${wallet.address}`,
      createdAt: wallet.created_at,
    };
  } catch (err) {
    console.warn('  WDK: Could not fetch live balance:', err.message);
    return {
      address: wallet.address,
      chain: wallet.chain,
      chainId: wallet.chain_id,
      usdtBalance: 'unavailable',
      maticBalance: 'unavailable',
      explorerUrl: `https://amoy.polygonscan.com/address/${wallet.address}`,
      error: 'RPC unavailable - wallet exists on blockchain',
    };
  }
}

async function sendUSDTTip(userId, amountUsdt) {
  const wallet = await repo.getWalletByUser(userId);
  if (!wallet) throw new Error('User has no wallet.');
  const amount = parseFloat(amountUsdt);
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid USDT amount.');
  const txRecord = await repo.createTransaction({
    userId, walletAddress: wallet.address, txType: 'usdt_tip',
    amountUsdt: amount, status: 'pending', metadata: { triggeredBy: 'consensus_reward' },
  });
  try {
    const platformWallet = getPlatformWallet();
    const usdt = getUSDTContract(platformWallet);
    const decimals = await usdt.decimals();
    const amountInUnits = ethers.parseUnits(amount.toFixed(6), decimals);
    console.log(`  WDK: Sending ${amount} USDT to ${wallet.address}...`);
    const tx = await usdt.transfer(wallet.address, amountInUnits);
    console.log(`  WDK: TX submitted -> ${tx.hash}`);
    const receipt = await tx.wait(1);
    console.log(`  WDK: TX confirmed in block ${receipt.blockNumber}`);
    await repo.updateTransaction(txRecord.id, {
      tx_hash: tx.hash, status: 'confirmed',
      metadata: JSON.stringify({ triggeredBy: 'consensus_reward', blockNumber: receipt.blockNumber }),
    });
    return { success: true, txHash: tx.hash, amount, recipient: wallet.address, blockNumber: receipt.blockNumber, explorerUrl: `https://amoy.polygonscan.com/tx/${tx.hash}` };
  } catch (err) {
    await repo.updateTransaction(txRecord.id, { status: 'failed', error_message: err.message });
    throw err;
  }
}

function pointsToUSDT(points) {
  const rate = parseFloat(process.env.POINTS_TO_USDT_RATE || '0.001');
  return parseFloat((points * rate).toFixed(6));
}

function qualifiesForPayout(userScore) {
  const min = parseInt(process.env.MIN_POINTS_FOR_PAYOUT || '50');
  return userScore >= min;
}

async function getPlatformInfo() {
  try {
    const wallet = getPlatformWallet();
    const provider = getProvider();
    const usdt = getUSDTContract(provider);
    const [usdtRaw, decimals, maticRaw] = await Promise.all([
      usdt.balanceOf(wallet.address),
      usdt.decimals(),
      provider.getBalance(wallet.address),
    ]);
    return {
      address: wallet.address,
      usdtBalance: parseFloat(ethers.formatUnits(usdtRaw, decimals)).toFixed(6),
      maticBalance: parseFloat(ethers.formatEther(maticRaw)).toFixed(6),
      network: process.env.WDK_NETWORK || 'polygon-amoy',
      explorerUrl: `https://amoy.polygonscan.com/address/${wallet.address}`,
    };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { createUserWallet, getWalletInfo, sendUSDTTip, pointsToUSDT, qualifiesForPayout, getPlatformInfo };
