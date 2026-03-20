// backend/src/services/agent.js
const repo = require('./repository');
const wdk  = require('./wdk');

let aiClient = null;

async function callAI(prompt) {
  const Groq = require('groq-sdk');
  if (!aiClient) aiClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await aiClient.chat.completions.create({
    messages:    [{ role: 'user', content: prompt }],
    model:       process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_tokens:  800,
  });
  return completion.choices[0]?.message?.content || '';
}

async function analyzeConsensusAndDecide(taskId, consensusData, validators) {
  if (process.env.AI_AGENT_ENABLED !== 'true') {
    return fallbackDecision(taskId, consensusData, validators);
  }
  try {
    const prompt   = buildAgentPrompt(taskId, consensusData, validators);
    const response = await callAI(prompt);
    const decision = parseAIDecision(response, validators);
    await repo.saveAgentDecision({
      taskId, agentName: 'GroqLlamaAgent',
      decision: decision.action, reasoning: decision.reasoning,
      confidence: consensusData.confidence,
      usersAffected: decision.tips.length,
      totalUsdt: decision.tips.reduce((s,t) => s+(t.amount||0), 0),
      metadata: { model: process.env.AI_MODEL, provider: 'groq', consensusMethod: consensusData.method },
    });
    console.log('  ?? TipAgent: GroqLlamaAgent decision saved');
    return decision;
  } catch (err) {
    console.error('  Agent: AI failed, using fallback:', err.message.slice(0,100));
    aiClient = null;
    const decision = fallbackDecision(taskId, consensusData, validators);
    try {
      await repo.saveAgentDecision({
        taskId, agentName: 'FallbackAgent',
        decision: decision.action,
        reasoning: decision.reasoning + ' [rule-based fallback]',
        confidence: consensusData.confidence,
        usersAffected: decision.tips.length,
        totalUsdt: decision.tips.reduce((s,t) => s+(t.amount||0), 0),
        metadata: { fallback: true, error: err.message.slice(0,100) },
      });
      console.log('  ?? TipAgent: Fallback decision saved');
    } catch (dbErr) {
      console.error('  Agent: Failed to save fallback:', dbErr.message);
    }
    return decision;
  }
}

function buildAgentPrompt(taskId, consensus, validators) {
  const summary = validators.map(v => ({
    name: v.name, answer: v.answer,
    isCorrect: v.answer === consensus.result,
    streak: v.streak||0, reputation: v.reputation||100, hasWallet: v.hasWallet,
  }));
  return `You are an autonomous payment agent for a data validation platform.
Consensus reached. Decide USDT tips for validators.

CONSENSUS: result=${consensus.result}, confidence=${(consensus.confidence*100).toFixed(1)}%, method=${consensus.method}

VALIDATORS:
${JSON.stringify(summary, null, 2)}

RULES:
- isCorrect=true: 0.010 USDT base
- isCorrect=false: 0.002 USDT participation  
- confidence>85%: add 0.005 bonus
- streak>=3: add 0.005 bonus
- Only tip hasWallet=true users
- Max 0.05 USDT per user

Respond ONLY with JSON, no markdown:
{"action":"tip","reasoning":"one sentence","tips":[{"userId":"id","amount":0.010,"reason":"majority_correct"}]}`;
}

function parseAIDecision(response, validators) {
  try {
    const clean = response.replace(/\`\`\`json/gi,'').replace(/\`\`\`/g,'').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.action || !Array.isArray(parsed.tips)) throw new Error('Invalid structure');
    parsed.tips = parsed.tips
      .map(t => ({...t, amount: Math.min(parseFloat(t.amount)||0, 0.05)}))
      .filter(t => t.amount >= 0.001);
    return parsed;
  } catch (err) {
    console.error('  Agent: Parse failed:', err.message);
    return fallbackDecision(null, {confidence:0.6,result:'unknown'}, validators);
  }
}

function fallbackDecision(taskId, consensus, validators) {
  const rate = parseFloat(process.env.POINTS_TO_USDT_RATE||'0.001');
  const isHighConf = (consensus.confidence||0) >= 0.85;
  const tips = (validators||[])
    .filter(v => v.walletAddress || v.hasWallet)
    .map(v => {
      const isCorrect = v.answer === consensus.result;
      let points = isCorrect ? 10 : 2;
      if (isCorrect && isHighConf) points += 5;
      const streak = v.streak||0;
      if (isCorrect && streak>=10) points+=25;
      else if (isCorrect && streak>=5) points+=10;
      else if (isCorrect && streak>=3) points+=5;
      return { userId: v.userId||v.user_id, amount: parseFloat((points*rate).toFixed(6)), reason: isCorrect?'majority_correct':'participation' };
    })
    .filter(t => t.amount >= 0.001);
  return { action: tips.length>0?'tip':'skip', reasoning: 'Rule-based: reward majority validators proportionally', tips };
}

async function executeTipDecision(taskId, decision) {
  if (decision.action==='skip'||!decision.tips.length) { console.log('  Agent: skip'); return []; }
  const queued = [];
  for (const tip of decision.tips) {
    try {
      const entry = await repo.addToTipQueue(tip.userId, taskId, tip.amount, tip.reason);
      queued.push(entry);
      console.log(`  Agent: Queued ${tip.amount} USDT for ${tip.userId}`);
    } catch (err) { console.error(`  Agent: Queue failed for ${tip.userId}:`, err.message); }
  }
  return queued;
}

async function processTipQueue() {
  if (process.env.AUTO_TIP_ENABLED !== 'true') return;
  const tips = await repo.getQueuedTips(5);
  if (!tips.length) return;
  console.log(`  Agent: Processing ${tips.length} tips...`);
  for (const tip of tips) {
    await repo.updateTipQueue(tip.id, { status:'processing', attempts:(tip.attempts||0)+1 });
    try {
      const result = await wdk.sendUSDTTip(tip.user_id, tip.amount_usdt);
      await repo.updateTipQueue(tip.id, { status:'sent', tx_hash:result.txHash, processed_at:new Date().toISOString() });
      console.log(`  Agent: ? Sent ${tip.amount_usdt} USDT ? ${tip.user_name} (${result.txHash})`);
    } catch (err) {
      const attempts = (tip.attempts||0)+1;
      await repo.updateTipQueue(tip.id, { status:attempts>=3?'failed':'queued', error_message:err.message });
      console.error(`  Agent: ? Failed for ${tip.user_name}:`, err.message.slice(0,80));
    }
  }
}

async function runTipAgent(taskId, consensusData, responses) {
  if (process.env.AUTO_TIP_ENABLED !== 'true') { console.log('  ?? AUTO_TIP_ENABLED not true'); return null; }
  if (!process.env.PLATFORM_MNEMONIC||process.env.PLATFORM_MNEMONIC.includes('your-twelve')) { console.log('  ?? MNEMONIC not set'); return null; }
  console.log(`\n  ?? TipAgent: Starting for task ${taskId}`);
  try {
    const validators = await Promise.all(responses.map(async (r) => {
      try {
        const user   = await repo.getUserById(r.user_id);
        const wallet = await repo.getWalletByUser(r.user_id);
        console.log(`  ?? TipAgent: User ${user?.name} hasWallet=${!!wallet}`);
        return { userId:r.user_id, user_id:r.user_id, name:user?.name||'unknown', answer:r.answer, weight:r.weight, streak:user?.streak||0, reputation:user?.reputation||100, responseCount:user?.response_count||0, score:user?.score||0, walletAddress:wallet?.address||null, hasWallet:!!wallet };
      } catch(err) { console.error('  ?? enrich error:', err.message); return null; }
    }));
    const valid = validators.filter(Boolean);
    console.log(`  ?? TipAgent: ${valid.length} valid validators`);
    const decision = await analyzeConsensusAndDecide(taskId, consensusData, valid);
    console.log(`  ?? TipAgent: Decision=${decision.action} — "${decision.reasoning}"`);
    const queued = await executeTipDecision(taskId, decision);
    console.log(`  ?? TipAgent: ${queued.length} tips queued`);
    setTimeout(() => processTipQueue(), 2000);
    return { decision, queued };
  } catch (err) {
    console.error('  ?? TipAgent FATAL:', err.message);
    console.error(err.stack);
    return null;
  }
}

module.exports = { runTipAgent, processTipQueue, analyzeConsensusAndDecide, fallbackDecision };
