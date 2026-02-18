import Groq from 'groq-sdk';
import {
  buildScenarioPrompt,
  buildOutcomePrompt,
  buildPickWinnerPrompt,
  buildVirusTauntPrompt,
  buildGameSummaryPrompt,
} from './prompts.js';
import { pickTopic } from './scenarios.js';

// ─── Config ─────────────────────────────────────────────────────────

const MODEL = 'llama-3.1-8b-instant';
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.8;

let client = null;
let clientInitialized = false;

function getClient() {
  if (!clientInitialized) {
    clientInitialized = true;
    try {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error('GROQ_API_KEY not found in environment');
      client = new Groq({ apiKey });
      console.log('[AI] Groq client initialized successfully');
    } catch (err) {
      console.warn('[AI] Groq SDK init failed:', err.message);
      client = null;
    }
  }
  return client;
}

// ─── Internal Helpers ───────────────────────────────────────────────

async function _callGroq(system, messages, maxTokens = DEFAULT_MAX_TOKENS) {
  const groqClient = getClient();
  if (!groqClient) throw new Error('Groq client not initialized');

  const t0 = Date.now();
  const response = await groqClient.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      ...messages,
    ],
    max_tokens: maxTokens,
    temperature: DEFAULT_TEMPERATURE,
  });

  const elapsed = Date.now() - t0;
  const content = response.choices[0].message.content;
  console.log(`[AI] Groq responded in ${elapsed}ms (${content.length} chars)`);
  return content;
}

function _parseJSON(text) {
  // Attempt 1: direct parse
  try { return JSON.parse(text); } catch { /* continue */ }

  // Attempt 2: strip markdown code fences
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // Attempt 3: fix invalid escape sequences (e.g. \' or \: that llama outputs)
  const sanitized = cleaned.replace(/\\([^"\\\/bfnrtu])/g, '$1');
  return JSON.parse(sanitized);
}

async function _withRetry(fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    console.error('[AI] Call failed, retrying once:', err.message);
    try {
      return await fn();
    } catch (retryErr) {
      console.error('[AI] Retry also failed, using fallback:', retryErr.message);
      return fallback;
    }
  }
}

// ─── Exported AI Functions ──────────────────────────────────────────

export async function generateScenario(difficulty, previousTopics = []) {
  const topic = pickTopic(previousTopics);
  console.log(`[AI] generateScenario: difficulty=${difficulty}, topic="${topic}"`);

  return _withRetry(async () => {
    const { system, messages } = buildScenarioPrompt(difficulty, topic, previousTopics);
    const raw = await _callGroq(system, messages);
    const parsed = _parseJSON(raw);
    return {
      text: parsed.text,
      difficulty,
      topic: parsed.topic || topic,
    };
  }, {
    text: "Your classmate's social media account was just hacked and is now posting suspicious links to everyone in your university group chat. Several students have already clicked the links and are reporting strange activity on their accounts. What do you do?",
    difficulty,
    topic,
  });
}

export async function generateOutcome(scenarioText, teamName, teamAnswer) {
  console.log(`[AI] generateOutcome: team="${teamName}", answer="${teamAnswer.slice(0, 60)}"`);
  return _withRetry(async () => {
    const { system, messages } = buildOutcomePrompt(scenarioText, teamName, teamAnswer);
    const raw = await _callGroq(system, messages);
    const parsed = _parseJSON(raw);
    return {
      text: parsed.text,
      rating: ['good', 'partial', 'bad'].includes(parsed.rating) ? parsed.rating : 'partial',
    };
  }, {
    text: `The narrator pauses dramatically... but the connection to the AI was lost. The host will have to judge ${teamName}'s response manually this time.`,
    rating: 'partial',
  });
}

export async function pickWinners(scenarioText, teamOutcomes) {
  console.log(`[AI] pickWinners: ${teamOutcomes.length} teams — ratings: ${teamOutcomes.map(t => `${t.teamName}=${t.rating}`).join(', ')}`);
  return _withRetry(async () => {
    const { system, messages } = buildPickWinnerPrompt(scenarioText, teamOutcomes);
    const raw = await _callGroq(system, messages);
    const parsed = _parseJSON(raw);

    const validIds = teamOutcomes.map(t => t.teamId);
    const winners = (parsed.winnerTeamIds || []).filter(id => validIds.includes(id));

    return {
      winnerTeamIds: winners,
      reasoning: parsed.reasoning || 'The AI has spoken.',
    };
  }, {
    winnerTeamIds: [],
    reasoning: 'The AI could not determine a winner this round — the host decides.',
  });
}

export async function generateVirusTaunts(teams, winnerIds, roundNumber) {
  console.log(`[AI] generateVirusTaunts: round=${roundNumber}, winners=[${winnerIds.join(', ')}]`);
  return _withRetry(async () => {
    const { system, messages } = buildVirusTauntPrompt(teams, winnerIds, roundNumber);
    const raw = await _callGroq(system, messages);
    const parsed = _parseJSON(raw);
    return parsed;
  }, {
    ...Object.fromEntries(teams.map(t => [
      t.teamId,
      winnerIds.includes(t.teamId)
        ? `${t.virusName}: "Not bad... for a human."`
        : `${t.virusName}: "I've seen better. Much better."`,
    ])),
  });
}

export async function generateGameSummary(teams, roundHistory) {
  console.log(`[AI] generateGameSummary: ${teams.length} teams, ${roundHistory.length} rounds played`);

  const hardcodedFallback = Object.fromEntries(teams.map(t => [
    t.teamId,
    {
      summary: `${t.virusName} survived the breach with ${t.points} points. The AI narrator has no further comment at this time.`,
      rating: t.points >= 3 ? 'Digital Fortress' : t.points >= 1 ? 'Needs a Firewall' : 'Walking Vulnerability',
    },
  ]));

  return _withRetry(async () => {
    const { system, messages } = buildGameSummaryPrompt(teams, roundHistory);
    const raw = await _callGroq(system, messages, 1000);
    const parsed = _parseJSON(raw);

    // Validate that all expected team IDs are keys in the parsed result.
    // The LLM sometimes uses virus names or other keys instead of team IDs.
    const missingIds = teams.filter(t => !parsed[t.teamId]);
    if (missingIds.length > 0) {
      console.warn(`[AI] generateGameSummary: missing keys ${missingIds.map(t => t.teamId).join(', ')} — remapping by position`);
      const parsedValues = Object.values(parsed);
      missingIds.forEach((t, i) => {
        parsed[t.teamId] = parsedValues[i] || hardcodedFallback[t.teamId];
      });
    }

    return parsed;
  }, hardcodedFallback);
}
