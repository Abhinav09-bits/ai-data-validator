# 🎬 Demo Guide

> This guide shows judges exactly how to experience the full autonomous payment loop.

## ⚡ Live Demo

🌐 **Frontend:** [your-app.vercel.app](https://your-app.vercel.app)  
🔧 **Backend API:** [your-api.railway.app](https://your-api.railway.app)  
📊 **Polygonscan:** [Platform Wallet](https://amoy.polygonscan.com)

---

## 🔄 The Full Autonomous Loop (5 minutes)

### Step 1 — Register & Get Wallet
1. Go to the app → click **"START VALIDATING"**
2. Enter a username → click **CONNECT**
3. Navigate to **~/wallet**
4. Click **"CREATE WALLET VIA WDK"**
5. A real Polygon Amoy address is generated instantly

### Step 2 — Upload a Dataset
1. Navigate to **~/upload**
2. Keep the sample JSON or paste your own
3. Click **"UPLOAD & GENERATE TASKS"**
4. Tasks are instantly created from your data

### Step 3 — Validate Data
1. Navigate to **~/validate**
2. Read the data entry shown
3. Click **✓ CORRECT** or **✗ INCORRECT**
4. Repeat with 2 more browser tabs (different users)
5. On the 3rd vote — **consensus fires automatically**

### Step 4 — Watch the AI Agent Fire
1. Go to **~/agent** immediately after consensus
2. See the **Groq LLaMA3 AI reasoning** appear in real-time
3. The agent decides tip amounts based on:
   - Accuracy (did you vote with majority?)
   - Streak (consecutive correct votes)
   - Reputation score
   - Confidence level of consensus

### Step 5 — USDT Reward
1. Back to **~/wallet**
2. See your points converted to USDT
3. Click **REDEEM** to trigger autonomous payment
4. Transaction hash appears with Polygonscan link

---

## 🤖 What Makes This Special

| Feature | How it works |
|---|---|
| **Non-custodial wallets** | BIP-44 HD derivation via Tether WDK — you own your keys |
| **Weighted consensus** | Experienced validators count more (up to 2x weight) |
| **AI reasoning** | LLaMA3 explains WHY it chose each tip amount |
| **Autonomous payments** | Zero human intervention — agent fires after every consensus |
| **Fraud prevention** | Response time limits, duplicate detection, reputation penalties |

---

## 🧪 Test the API Directly

```bash
# Register user
curl -X POST https://your-api.railway.app/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name": "judge_test"}'

# Check AI agent decisions
curl https://your-api.railway.app/api/agent/decisions

# Check platform wallet
curl https://your-api.railway.app/api/wallet/platform/info

# System stats
curl https://your-api.railway.app/api/stats
```

---

## 📊 Key Metrics Demonstrated

- ✅ Consensus reached in < 1 second after 3rd vote
- ✅ AI agent decision logged with full reasoning
- ✅ USDT tip queued autonomously — no human trigger
- ✅ Wallet addresses verifiable on Polygonscan
- ✅ Full transaction history in database