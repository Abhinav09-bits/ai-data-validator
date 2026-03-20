# 🤖 AI-Powered Human Data Validation & Reward System

> Built for the Tether WDK Hackathon — Autonomous data validation with AI-driven USDT rewards

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://postgresql.org)
[![Tether WDK](https://img.shields.io/badge/Tether-WDK-green.svg)](https://docs.wallet.tether.io)

---

## 🎯 What is This?

A web application where users validate data entries (correct/incorrect), and an **autonomous AI agent** rewards them with **USDT** based on accuracy using a consensus mechanism — all powered by **Tether WDK** for non-custodial wallet management.

### The Autonomous Agent Loop

```
User validates data
      ↓
Consensus engine resolves task (weighted voting, min 3 validators)
      ↓
Groq LLaMA3 AI Agent analyzes performance
      ↓
Agent autonomously calculates USDT reward
      ↓
Tether WDK sends USDT to user's non-custodial wallet
      ↓
Transaction recorded on Polygon Amoy
```

---

## ✨ Core Features

| Feature | Description |
|---|---|
| 📤 Dataset Upload | Upload JSON datasets that auto-generate validation tasks |
| ✅ Task Validation | Users mark entries as correct/incorrect |
| ⚖️ Consensus Engine | Weighted voting — min 3 validators, majority wins |
| 🤖 AI Agent | Groq LLaMA3 decides tip amounts with reasoning |
| 💰 USDT Rewards | Autonomous tipping via Tether WDK on Polygon Amoy |
| 🏆 Reputation System | 6 validator tiers — Novice → Legend |
| 🔥 Streak Bonuses | Consecutive correct votes earn bonus points |
| 🛡️ Anti-cheat | Duplicate detection, response time validation |
| 📊 Live Dashboard | Real-time stats, leaderboard, agent decision log |

---

## 🏗️ Architecture

```
┌─────────────────┐     REST API      ┌──────────────────────┐
│   React + Vite  │ ◄────────────►   │   Node.js + Express  │
│   Frontend      │                   │   Backend            │
└─────────────────┘                   └──────────┬───────────┘
                                                  │
                              ┌───────────────────┼───────────────────┐
                              │                   │                   │
                    ┌─────────▼──────┐  ┌─────────▼──────┐  ┌───────▼────────┐
                    │  PostgreSQL    │  │   Groq AI      │  │  Tether WDK    │
                    │  Database      │  │   LLaMA3       │  │  Polygon Amoy  │
                    └────────────────┘  └────────────────┘  └────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite, React Router, Axios |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL 16 |
| **AI Agent** | Groq API (LLaMA3-70b) |
| **Blockchain** | Polygon Amoy Testnet (EVM) |
| **Wallet** | Tether WDK — non-custodial HD wallets |
| **Scheduling** | node-cron (tip queue processor) |

---

## 🔗 Tether WDK Integration

This project uses **Tether WDK** (`@tetherto/wdk-wallet-evm`) for:

- ✅ **Non-custodial wallet creation** — Each user gets a unique BIP-44 HD wallet
- ✅ **Deterministic address derivation** — `m/44'/60'/0'/0/{index}` path per user
- ✅ **USDT balance reading** — Live balance from Polygon Amoy
- ✅ **Autonomous USDT transfers** — Agent-triggered payments after consensus
- ✅ **Transaction tracking** — Full tx history with Polygonscan links

```javascript
// Example: Creating a non-custodial wallet via WDK
const masterNode = ethers.HDNodeWallet.fromPhrase(
  mnemonic, undefined, `m/44'/60'/0'/0/${index}`
);
// Each user gets a unique, deterministic address
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-data-validator.git
cd ai-data-validator
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/datavalidator

# Consensus
MIN_VALIDATORS=3
MAX_VALIDATORS=7
CONSENSUS_THRESHOLD=0.6
EARLY_CONSENSUS=true
TASK_EXPIRY_HOURS=48

# Rewards
REWARD_POINTS_CORRECT=10
REWARD_POINTS_PARTICIPATION=2
REWARD_POINTS_BONUS=5
MIN_RESPONSE_TIME_MS=1500

# WDK / Blockchain
WDK_NETWORK=polygon-amoy
WDK_RPC_URL=https://rpc-amoy.polygon.technology
WDK_CHAIN_ID=80002
USDT_CONTRACT_ADDRESS=0x856536D116E28f4c64E182fE91e8fAb6a0a3985

# Generate with: node -e "const {ethers}=require('ethers');const w=ethers.Wallet.createRandom();console.log(w.mnemonic.phrase)"
PLATFORM_MNEMONIC=your-twelve-word-mnemonic-phrase-here

# AI Agent
GROQ_API_KEY=your-groq-api-key
AI_PROVIDER=groq
AI_MODEL=llama-3.3-70b-versatile
AI_AGENT_ENABLED=true

# Tipping
AUTO_TIP_ENABLED=true
MIN_POINTS_FOR_PAYOUT=50
POINTS_TO_USDT_RATE=0.001
```

### 3. Create Database

```bash
psql -U postgres -c "CREATE DATABASE datavalidator;"
```

### 4. Start Backend

```bash
npm run dev
```

Migrations run automatically on startup. ✅

### 5. Setup Frontend

```bash
cd ../frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_MIN_VALIDATORS=3
```

### 6. Start Frontend

```bash
npm run dev
```

Open **http://localhost:5173** 🎉

---

## 📡 API Reference

### Users
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users/register` | Register new user |
| GET | `/api/users` | Leaderboard |
| GET | `/api/users/:id` | User profile + tier |
| GET | `/api/users/:id/history` | Score history |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | List tasks |
| GET | `/api/tasks/next?userId=x` | Next task for user |
| POST | `/api/tasks/:id/respond` | Submit validation |
| GET | `/api/tasks/:id/consensus` | Consensus result |
| GET | `/api/tasks/stats` | Engine stats |

### Datasets
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/datasets` | Upload dataset |
| GET | `/api/datasets` | List datasets |

### Wallet (Tether WDK)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/wallet/create` | Create WDK wallet |
| GET | `/api/wallet/:userId` | Wallet + balance |
| POST | `/api/wallet/redeem` | Redeem points → USDT |
| GET | `/api/wallet/platform/info` | Platform wallet info |

### AI Agent
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/agent/decisions` | AI decision log |
| GET | `/api/agent/queue` | Tip queue status |
| POST | `/api/agent/process` | Process tip queue |
| GET | `/api/agent/status` | Agent config |

---

## 🧪 Dataset Format

Upload any JSON array with a `content` field:

```json
[
  { "content": "The Earth orbits the Sun.", "label": "correct" },
  { "content": "Water boils at 50°C at sea level.", "label": "incorrect" },
  { "content": "Paris is the capital of France.", "label": "correct" }
]
```

---

## 🏆 Validator Tiers

| Tier | Min Score | Badge |
|---|---|---|
| Novice | 0 | ⬡ |
| Validator | 50 | ◈ |
| Analyst | 200 | ◆ |
| Expert | 500 | ★ |
| Master | 1000 | ✦ |
| Legend | 2500 | ❋ |

---

## 🤖 AI Agent Logic

The autonomous agent uses **Groq LLaMA3-70b** to:

1. Analyze consensus result and confidence score
2. Evaluate each validator's accuracy, streak, and reputation  
3. Calculate USDT tip amounts based on performance
4. Provide human-readable reasoning for each decision
5. Queue tips for automatic processing via Tether WDK

```json
{
  "agent_name": "GroqLlamaAgent",
  "decision": "tip",
  "reasoning": "Two validators correctly identified the data entry with 67% confidence. Majority voters receive base reward; minority voter receives participation reward.",
  "users_affected": 3,
  "total_usdt": 0.022
}
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `PLATFORM_MNEMONIC` | ✅ | HD wallet seed phrase |
| `GROQ_API_KEY` | ✅ | Groq AI API key |
| `WDK_RPC_URL` | ✅ | Polygon Amoy RPC endpoint |
| `USDT_CONTRACT_ADDRESS` | ✅ | USDT token contract on Amoy |
| `MIN_VALIDATORS` | ✅ | Min validators per task (default: 3) |
| `CONSENSUS_THRESHOLD` | ✅ | Min confidence to resolve (default: 0.6) |
| `POINTS_TO_USDT_RATE` | ✅ | Conversion rate (default: 0.001) |

---

## 📁 Project Structure

```
ai-data-validator/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── users.js        # User management
│   │   │   ├── tasks.js        # Task validation
│   │   │   ├── datasets.js     # Dataset upload
│   │   │   ├── wallet.js       # Tether WDK integration
│   │   │   ├── agent.js        # AI agent endpoints
│   │   │   └── stats.js        # System statistics
│   │   └── services/
│   │       ├── wdk.js          # Tether WDK wallet service
│   │       ├── agent.js        # AI autonomous agent
│   │       ├── consensusDB.js  # Consensus engine
│   │       ├── scoring.js      # Reputation & tiers
│   │       ├── repository.js   # Database operations
│   │       ├── migrate.js      # DB migrations
│   │       └── db.js           # PostgreSQL connection
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Validate.jsx    # Main validation UI
│   │   │   ├── Wallet.jsx      # WDK wallet UI
│   │   │   ├── AgentDashboard.jsx
│   │   │   ├── Leaderboard.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Upload.jsx
│   │   │   └── ConsensusStats.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── StatusBar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── UserContext.jsx
│   │   ├── hooks/
│   │   │   └── useApi.js
│   │   └── api/
│   │       └── index.js
│   └── package.json
├── LICENSE
└── README.md
```

---

## 🌐 Third-Party Services

| Service | Purpose | Free Tier |
|---|---|---|
| [Groq](https://console.groq.com) | AI agent (LLaMA3) | ✅ Free |
| [Polygon Amoy](https://amoy.polygonscan.com) | Testnet blockchain | ✅ Free |
| [Tether WDK](https://docs.wallet.tether.io) | Wallet management | ✅ Free |
| [PostgreSQL](https://postgresql.org) | Database | ✅ Free |

---

## 📝 License

This project is licensed under the **Apache License 2.0** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Tether WDK](https://docs.wallet.tether.io) — Wallet Development Kit
- [Groq](https://groq.com) — Ultra-fast AI inference
- [Polygon](https://polygon.technology) — EVM blockchain

---

*Built with ❤️ for the Tether WDK Hackathon*