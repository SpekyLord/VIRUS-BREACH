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

STEP 2 — NARRATE the outcome as a story playing out in the scenario world:
- Write as if you're a narrator describing what ACTUALLY HAPPENED as a result of their choice.
- Naturally weave in WHAT THEY DID (paraphrased, not quoted word-for-word) so the audience understands WHY this outcome unfolded. E.g. "Choosing to laugh it off, the team..." or "When they flagged it to the PNP Anti-Cybercrime Group..."
- A or B or C → Narrate the fallout of their inaction/bad move. The victim suffers, the situation escalates. Dark humor, realistic consequences.
- D → Narrate a partial win — their instinct helped but vagueness left gaps. Something slipped through.
- E → Narrate a satisfying resolution. Show the specific steps playing out. Weave in the relevant RA 10175 section naturally as part of the story.

2-3 sentences max. Cinematic consequence scene — the audience should understand what the team did AND what happened because of it.`}

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
In the reasoning field, refer to teams by their Team Name (virus name), NOT by team ID.

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

TAUNT RULES:
- Each virus speaks IN FIRST PERSON ("I", "my", "we") — NEVER refer to yourself in third person
- WINNING virus → pick ONE loser to specifically mock by name. Don't list all losers.
- LOSING virus → pick ONE winner to grudgingly address by name. Don't list all winners.
- Do NOT use your own virus name in the taunt — you ARE that virus, you wouldn't say your own name
- Keep it FUNNY and CLASSROOM-APPROPRIATE — friendly trash talk, not mean-spirited
- 1-2 sentences max. Reference their answer if it was funny/dumb.

CRITICAL: The JSON KEY is the SPEAKING virus's team ID. The taunt is directed AT a specific opponent, not at yourself.

Example for 5 teams where RANSOMWARE and SPYWARE won, TROJAN/WORM/MALWARE lost:
- RANSOMWARE (winner) picks one loser to mock: "Wow WORM, did you really think doing nothing was a plan? Bold strategy."
- SPYWARE (winner) picks one loser to mock: "TROJAN, I've seen better responses from a captcha. Try harder next round."
- TROJAN (loser) addresses one winner: "Fine, RANSOMWARE. You got lucky this time. Enjoy it while it lasts."
- WORM (loser) addresses one winner: "Good job SPYWARE, I guess. Don't expect a repeat."
- MALWARE (loser) addresses one winner: "RANSOMWARE thinks they're so smart. We'll see about that."

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
