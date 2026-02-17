import {
  RA_10175_REFERENCE,
  RELATED_LAWS_REFERENCE,
  PRESENTATION_CONTEXT,
} from './scenarios.js';

// ─── Shared System Prompt ───────────────────────────────────────────

function getBaseSystemPrompt() {
  return `You are the Virus Breach narrator — a sharp, witty cybercrime scenario host for a classroom game about the Philippine Cybercrime Prevention Act (RA 10175).

PERSONA:
- You are NOT a teacher. You are a dramatic storyteller who knows Philippine cybercrime law inside and out.
- Dry humor, dramatic flair, zero tolerance for vague answers.
- Grudging respect for genuinely good responses.
- Dark humor is fine, but keep it classroom-appropriate (Filipino college students).
- Reference specific RA 10175 sections accurately when relevant.

LEGAL REFERENCE MATERIAL:

${RA_10175_REFERENCE}

${RELATED_LAWS_REFERENCE}

PRESENTATION CONTEXT:
${PRESENTATION_CONTEXT}

CRITICAL: Always respond with valid JSON only. No markdown code fences, no backticks, no explanation outside the JSON object.`;
}

// ─── Prompt Builders ────────────────────────────────────────────────

export function buildScenarioPrompt(difficulty, topic, previousScenarios = []) {
  const difficultyGuide = {
    Easy: 'Common, relatable situation. The correct response should be somewhat obvious. Think: everyday social media or phone scenarios that any student might encounter.',
    Medium: 'Requires specific knowledge of proper channels, authorities, or specific RA 10175 sections. The situation is less straightforward and has multiple angles to consider.',
    Hard: 'Complex multi-victim scenario with ambiguous elements. Requires a nuanced, multi-step response. May involve conflicting priorities or ethical gray areas.',
  };

  const previousList = previousScenarios.length > 0
    ? `\nPreviously used scenario topics (DO NOT repeat these themes): ${previousScenarios.join(', ')}`
    : '';

  return {
    system: getBaseSystemPrompt(),
    messages: [{
      role: 'user',
      content: `Generate a ${difficulty} cybercrime scenario about "${topic}" for Filipino college students to respond to.

DIFFICULTY GUIDE: ${difficultyGuide[difficulty] || difficultyGuide.Easy}
${previousList}

The scenario should:
- Be 2-4 sentences long
- Present a realistic situation a Filipino college student might encounter
- Require the player to decide what to do (not just identify the crime)
- Be written in second person ("You discover...", "Your friend sends you...")
- Feel urgent and specific, not generic

Respond with this exact JSON format:
{"text": "The scenario text here...", "topic": "${topic}"}`,
    }],
  };
}

export function buildOutcomePrompt(scenarioText, teamName, teamAnswer) {
  const isNoResponse = teamAnswer === '[No response submitted]' || !teamAnswer.trim();

  return {
    system: getBaseSystemPrompt(),
    messages: [{
      role: 'user',
      content: `SCENARIO: "${scenarioText}"

TEAM "${teamName}" LITERALLY WROTE THIS EXACT RESPONSE: "${teamAnswer}"

CRITICAL RULE: You MUST judge ONLY what the team ACTUALLY WROTE above. Do NOT invent or assume what they meant to do. Do NOT give them credit for actions they did not describe.

${isNoResponse
    ? `This team submitted NO response. Roast them for their silence — they froze under pressure. Be dramatic about their inaction and what consequences unfold because nobody stepped up. Rating: "bad".`
    : `STEP 1 — CLASSIFY the answer. Pick exactly one:
A) PASSIVE/USELESS: The answer suggests doing nothing, ignoring it, laughing it off, "just chill", "move on", "relax", or any advice that leaves the victim unhelped. → Rating MUST be "bad".
B) TROLL/GIBBERISH: Random text, joke, meme, profanity, or clearly not a real attempt. → Rating MUST be "bad".
C) WRONG APPROACH: Suggests something illegal, harmful, or that makes things worse (e.g. "hack them back", "post their personal info"). → Rating MUST be "bad".
D) VAGUE BUT RIGHT DIRECTION: Mentions reporting or seeking help but gives no specifics (e.g. just "report it", "tell someone"). → Rating: "partial".
E) GOOD: Mentions a specific authority (PNP Anti-Cybercrime Group, NBI Cybercrime Division, NPC, Facebook report), cites a law, or takes concrete steps to protect the victim. → Rating: "good".

STEP 2 — NARRATE the outcome based on what they literally wrote:
- A or B or C → Show what actually happens when you do nothing/troll/make it worse. Dark humor, realistic consequences. DO NOT give them credit for actions they did not describe.
- D → Acknowledge the right instinct but show what was missing. What slipped through the cracks because they were vague?
- E → Satisfying resolution. Reference the specific RA 10175 section their actions align with.

2-3 sentences max. Base it ENTIRELY on what they ACTUALLY wrote. Do not invent, assume, or add actions.`}

Respond with this exact JSON format:
{"text": "The narrative outcome...", "rating": "good"}`,
    }],
  };
}

export function buildPickWinnerPrompt(scenarioText, teamOutcomes) {
  const teamsBlock = teamOutcomes.map(t =>
    `- Team ID: "${t.teamId}" | Team Name: "${t.teamName}"
  Answer: "${t.answer}"
  Outcome: "${t.outcomeText}"
  Rating: ${t.rating}`
  ).join('\n\n');

  return {
    system: getBaseSystemPrompt(),
    messages: [{
      role: 'user',
      content: `SCENARIO: "${scenarioText}"

TEAM RESPONSES AND OUTCOMES:

${teamsBlock}

Compare all teams and pick 1-2 WINNERS based on these criteria (in priority order):
1. SPECIFICITY — Concrete actions, not vague generalities
2. LEGAL AWARENESS — Correct RA 10175 section or proper authority (PNP Anti-Cybercrime Group, NBI Cybercrime Division, NPC)
3. VICTIM PROTECTION — Prioritizes warning/protecting affected parties
4. PRACTICALITY — Steps that would actually work in the real world
5. COMPLETENESS — Addresses multiple angles of the problem

If ALL responses were bad or no one submitted, return empty winners.

IMPORTANT: Use the EXACT team IDs provided above (e.g., "team-0", "team-1"). Do NOT invent team IDs.

Respond with this exact JSON format:
{"winnerTeamIds": ["team-0"], "reasoning": "Brief 1-2 sentence explanation of why this team won."}`,
    }],
  };
}

export function buildVirusTauntPrompt(teams, winnerIds, roundNumber) {
  const teamsBlock = teams.map(t => {
    const won = winnerIds.includes(t.teamId);
    return `- Virus: "${t.virusName}" (Team ID: "${t.teamId}") — ${won ? 'WINNER this round' : 'LOST this round'}
  Their answer snippet: "${(t.answer || '').slice(0, 80)}"`;
  }).join('\n');

  const winnerNames = teams.filter(t => winnerIds.includes(t.teamId)).map(t => t.virusName).join(', ') || 'none';
  const loserNames = teams.filter(t => !winnerIds.includes(t.teamId)).map(t => t.virusName).join(', ') || 'none';

  return {
    system: getBaseSystemPrompt(),
    messages: [{
      role: 'user',
      content: `Round ${roundNumber} just ended. Winners: ${winnerNames}. Losers: ${loserNames}.

Generate a short taunt from each virus mascot directed AT THE OTHER TEAM(S).

TEAMS:
${teamsBlock}

TAUNT RULES — each virus speaks IN FIRST PERSON, addressing THE OTHER TEAM directly:
- WINNING virus → mock and trash-talk the losing team(s) by name (e.g. "Nice try, [LOSER NAME], but...")
- LOSING virus → grudgingly react to the winning team, make excuses or promise revenge (e.g. "Fine, [WINNER NAME], you got lucky this round...")
- Keep it FUNNY and CLASSROOM-APPROPRIATE — friendly trash talk, not mean-spirited bullying
- 1-2 sentences max. Each virus has a slightly different personality.

CRITICAL: The JSON KEY is the SPEAKING virus's team ID. The taunt content should address the OTHER team(s) by their virus name.

Example for 2 teams where team-0 (TROJAN) won and team-1 (WORM) lost:
{"team-0": "Is that the best you've got, WORM? My team handed you your lunch and you didn't even see it coming.", "team-1": "Fine, TROJAN. You got lucky this round. Enjoy it while it lasts."}

Respond with this exact JSON format:
{"team-0": "The virus taunt here...", "team-1": "Another taunt..."}`,
    }],
  };
}

export function buildGameSummaryPrompt(teams, roundHistory) {
  const teamsBlock = teams.map(t =>
    `- Team "${t.virusName}" (ID: "${t.teamId}"): ${t.points} points`
  ).join('\n');

  const historyBlock = roundHistory.map((round, i) => {
    const answers = Object.entries(round.answers || {}).map(([teamId, answer]) => {
      const rating = round.outcomes?.[teamId]?.rating || 'unknown';
      return `    ${teamId}: "${(answer || '').slice(0, 60)}..." (${rating})`;
    }).join('\n');
    const winners = (round.winners || []).join(', ') || 'none';
    return `  Round ${i + 1} (${round.scenario?.difficulty || 'Unknown'}): Winners: ${winners}\n${answers}`;
  }).join('\n\n');

  return {
    system: getBaseSystemPrompt(),
    messages: [{
      role: 'user',
      content: `THE GAME IS OVER. Generate a final summary for each team.

FINAL SCORES:
${teamsBlock}

ROUND HISTORY:
${historyBlock}

For each team, write:
1. A 2-3 sentence roast-style summary of their performance across all rounds. Be dramatic and funny.
2. A cybersecurity rating. Choose from: "Digital Fortress", "Cyber Sentinel", "Firewall Apprentice", "Needs a Firewall", "Walking Vulnerability", "Script Kiddie"

Higher-scoring teams get more flattering ratings. Zero-point teams get brutally (but humorously) rated.

IMPORTANT: Use the EXACT team IDs as JSON keys.

Respond with this exact JSON format:
{"team-0": {"summary": "The roast summary...", "rating": "Cyber Sentinel"}, "team-1": {"summary": "...", "rating": "..."}}`,
    }],
  };
}
