# Virus Breach — Product Requirements Document

**Version:** 1.0
**Date:** February 17, 2026
**Status:** Draft — Awaiting scenario resource content

---

## 1. Product Summary

**Virus Breach** is a real-time multiplayer web game designed for a classroom presentation on the Cybercrime Prevention Act of 2012 (RA 10175). An AI narrator generates cybercrime scenarios, evaluates team responses, narrates realistic consequences, and crowns winners — combining education with competitive gameplay in a Jackbox-style format.

**Core value prop:** Students don't just hear about cybercrime law — they apply it under pressure, and the AI shows them exactly what happens when they get it right or wrong.

---

## 2. Goals & Success Criteria

| Goal | Success Metric |
|------|---------------|
| Engagement | Every team submits an answer every round (no idle teams) |
| Learning | Teams reference specific laws/channels by round 3+ |
| Fun | Laughter/reactions during AI outcome reveals and virus taunts |
| Reliability | Zero crashes during a 10-minute live session |
| Setup speed | Host can start a game with 3-6 teams in under 2 minutes |

---

## 3. User Roles

### 3.1 Host (Presenters)
- **Device:** Laptop connected to projector
- **Responsibilities:** Create game, manage teams, control game flow (start, next round, end)
- **Sees:** Full dashboard — all team responses, AI outcomes, scoreboard, game controls

### 3.2 Typist (1 per team)
- **Device:** Personal phone (mobile browser)
- **Responsibilities:** Join via QR/link, type and submit team's answer
- **Sees:** Scenario text, text input field, countdown timer, round results

### 3.3 Teammates (Everyone else)
- **Device:** None
- **Responsibilities:** Discuss scenarios out loud, help the typist decide what to type
- **Sees:** Projector screen only

---

## 4. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend** | React 18 + Vite + Tailwind CSS 3 | Fast HMR, utility-first CSS, great ecosystem |
| **Backend** | Node.js + Express + Socket.IO | Real-time bidirectional WebSocket communication |
| **AI Engine** | Anthropic Claude API (`claude-sonnet-4-20250514`) | Fast inference for live gameplay; strong narrative ability |
| **Structure** | Monorepo (`/client`, `/server`, `/shared`) | Single deploy, shared event constants |
| **Deployment** | Railway or Render (single service) | Express serves API + built React static files |

---

## 5. Game Flow — Detailed Specification

### Phase 1: Lobby

**Host screen:**
- Large QR code + join URL displayed prominently
- List of connected players (name + status)
- Team assignment controls (drag-drop or dropdown)
- Team virus name display (TROJAN, WORM, RANSOMWARE, etc.)
- "Start Game" button (enabled when ≥2 teams have ≥1 typist)

**Player screen:**
- Name input field
- "Join" button
- After joining: "Waiting for host to start..." with team assignment display

**Technical:**
- Host creates a game session → gets a 4-character room code
- QR code encodes `{BASE_URL}/play?room={CODE}`
- Player connects via Socket.IO, sends `player:join` with name
- Host assigns players to teams via `host:assign-team`
- Server validates: one typist per team maximum

### Phase 2: Game Start

**Host screen:**
- Cinematic intro: each team's virus introduces itself with a taunt
- Example: TROJAN says "Let's see how you handle the real world."
- Brief 5-second dramatic pause, then auto-transitions to first scenario

**Player screen:**
- "Game starting..." animation
- Team virus name and avatar shown

**Technical:**
- Host sends `host:start-game`
- Server generates intro taunts via AI (or uses pre-written ones for speed)
- Server emits `game:virus-taunt` with intro messages
- After intro display, server auto-triggers first scenario

### Phase 3: Scenario Active

**Host screen:**
- Scenario number and difficulty badge (Easy / Medium / Hard)
- Scenario text (large, readable from back of room)
- Countdown timer (circular, prominent)
- Team submission status: ✅ submitted / ⌨️ typing... / ⏳ waiting
- No team answers visible yet

**Player screen:**
- Scenario text (scrollable if long)
- Large textarea for answer input
- Character/word indicator
- Countdown timer (synced with host)
- "Submit" button (disabled after submission)
- After submit: "Answer submitted. Waiting for other teams..."

**Technical:**
- Server calls `aiService.generateScenario(difficulty, topic, previousScenarios)`
- Scenario emitted via `game:scenario` to all clients
- Server starts countdown (configurable: 45s / 60s / 90s)
- Player typing triggers debounced `player:typing` events → host sees typing indicator
- Player submits via `player:submit-answer` → server stores, emits `game:team-submitted`
- When all teams submit OR timer expires → transition to next phase
- If timer expires, any team that hasn't submitted gets their current draft auto-submitted (or "No answer" if empty)

### Phase 4: Response Reveal

**Host screen:**
- All team answers displayed side-by-side in cards
- Team name + virus icon + their answer text
- Brief pause (3-5 seconds) for class to read, then auto-transition to outcomes

**Player screen:**
- "All answers in. AI is judging..."

**Technical:**
- Server emits all answers to host only (players don't see other answers yet)
- Timed transition to outcome phase

### Phase 5: AI Outcome Narration

**Host screen:**
- One team at a time, dramatically revealed:
  - Team name + their answer (condensed)
  - AI outcome text with typewriter animation (2-3 sentences)
  - Tone indicator (✅ good / ⚠️ partial / ❌ bad)
- Host clicks "Next Team" or outcomes auto-advance on a timer (8-10 seconds each)

**Player screen:**
- Shows their own team's outcome when it's revealed
- Win/loss indicator

**Technical:**
- Server calls `aiService.generateOutcome(scenario, teamAnswer)` for each team sequentially
- Each outcome emitted individually via `game:outcomes` with team ID
- Sequential emission creates dramatic pacing
- AI prompt includes: scenario context, team's answer, RA 10175 reference material, instruction to narrate consequences

### Phase 6: Winner Announcement

**Host screen:**
- Winning team(s) highlighted with celebration effect
- AI's reasoning for why they won (1 sentence)
- Updated scoreboard flash
- Virus taunts for each team (winners get respect, losers get roasted)

**Player screen:**
- "🏆 Your team won this round!" or "Better luck next round..."
- Current score

**Technical:**
- Server calls `aiService.pickWinners(scenario, allOutcomes)`
- Server calls `aiService.generateVirusTaunts(teams, roundResults)`
- Points awarded (1 point per round win; ties = both get a point)
- Emits `game:winner` + `game:virus-taunt` + `game:scoreboard`

### Phase 7: Next Round / Game Over

**If more rounds:**
- Host clicks "Next Scenario" → back to Phase 3
- Difficulty escalates based on round number

**If game over (host clicks "End Game" or all planned rounds complete):**

**Host screen:**
- Final scoreboard with rankings
- AI-generated summary/roast for each team (2-3 sentences about their overall performance)
- "Cybersecurity rating" per team (e.g., "Digital Fortress" / "Walking Vulnerability" / "Needs a Firewall")

**Technical:**
- Server calls `aiService.generateGameSummary(allRoundResults)`
- Emits `game:over` with final data

---

## 6. AI Specification

### 6.1 Model & Configuration

- **Model:** `claude-sonnet-4-20250514`
- **Temperature:** 0.8 (creative but not unhinged)
- **Max tokens per call:** ~500 (keep responses punchy)

### 6.2 System Prompt Foundation

The AI operates as a sharp, witty cybercrime scenario narrator. It is NOT a teacher — it's a storyteller who happens to know Philippine cybercrime law inside and out. Key personality traits: dry humor, dramatic flair, zero tolerance for vague answers, grudging respect for good ones.

### 6.3 AI Functions

| Function | Input | Output | Tone |
|----------|-------|--------|------|
| `generateScenario` | difficulty tier, topic, previous scenarios | Scenario text (2-4 sentences, relatable to Filipino students) | Neutral, clear, slightly ominous |
| `generateOutcome` | scenario, team answer | Consequence narration (2-3 sentences) | Narrator — dramatic, realistic |
| `pickWinners` | scenario, all outcomes | Winner team ID(s) + reasoning | Analytical but brief |
| `generateVirusTaunts` | teams, round results | Per-team virus comment (1-2 sentences) | Snarky, funny, classroom-appropriate |
| `generateGameSummary` | all round results | Per-team summary + rating | Roast-style but ultimately encouraging |

### 6.4 Scenario Content Injection

The AI system prompt will include a `PRESENTATION_CONTEXT` block containing extracted content from the team's actual Cybercrime Prevention Act presentation. This ensures scenarios directly reference what students just learned. *(Pending: user to provide presentation resources.)*

### 6.5 Evaluation Criteria for Winner Selection

The AI picks winners based on (in priority order):
1. **Specificity** — names concrete actions, not vague generalities
2. **Legal awareness** — references correct law (RA 10175 section) or proper authority (PNP Anti-Cybercrime Group, NBI Cybercrime Division, NPC)
3. **Victim protection** — prioritizes warning/protecting affected parties
4. **Practicality** — steps that would actually work in the real world
5. **Completeness** — addresses multiple angles of the problem

---

## 7. UI/UX Specification

### 7.1 Design Language: Cyber-Noir Terminal

| Property | Value |
|----------|-------|
| Background | `#0a0a0f` (near-black) |
| Primary accent | `#00ff41` (terminal green) |
| Secondary accent | `#00d4ff` (electric cyan) |
| Danger/urgency | `#ff0040` (neon red) |
| Surface cards | `rgba(0, 255, 65, 0.05)` with `border: 1px solid rgba(0, 255, 65, 0.2)` |
| Header font | `"Orbitron"` or `"Rajdhani"` (Google Fonts) |
| Body/terminal font | `"JetBrains Mono"` or `"Fira Code"` (Google Fonts) |
| Background effect | Subtle matrix code rain (CSS animation, performant) |

### 7.2 Host Screen (Projector — 1920×1080)

**Design priorities:**
- Readable from 10+ meters away
- Minimum 28px body text, 48px+ headers
- High contrast (light text on dark background)
- No scrolling — everything fits in one viewport per phase
- Dramatic transitions between phases (fade/slide)

### 7.3 Player Screen (Mobile — 375px+)

**Design priorities:**
- Thumb-friendly — large tap targets (min 48px)
- Single column, no horizontal scroll
- Textarea takes up most of the screen during answer phase
- Timer always visible (sticky top or bottom)
- Minimal chrome — the phone is just an input device
- Works on any modern mobile browser (Chrome, Safari, Samsung Internet)

### 7.4 Key Animations

| Element | Animation | Purpose |
|---------|-----------|---------|
| AI outcome text | Typewriter effect (character by character) | Builds suspense during reveals |
| Timer (< 10s) | Pulsing red glow + shake | Creates urgency |
| Winner announcement | Green glow burst + scale up | Celebration moment |
| Matrix rain background | Slow falling characters (CSS only) | Atmosphere |
| Virus taunt | Slide-in from side with glitch effect | Personality |
| Team submission | Checkmark fade-in | Status feedback |

---

## 8. Real-Time Communication

### 8.1 Socket.IO Events

**Client → Server:**

| Event | Payload | Sender |
|-------|---------|--------|
| `host:create-game` | `{ timerDuration, numRounds }` | Host |
| `player:join` | `{ name, roomCode }` | Player |
| `host:assign-team` | `{ playerId, teamId }` | Host |
| `host:start-game` | `{}` | Host |
| `host:next-scenario` | `{}` | Host |
| `host:end-game` | `{}` | Host |
| `player:submit-answer` | `{ answer }` | Player |
| `player:typing` | `{}` | Player (debounced 500ms) |

**Server → Client:**

| Event | Payload | Recipients |
|-------|---------|-----------|
| `game:state-update` | Full game state | Requesting client (on connect/reconnect) |
| `game:scenario` | `{ scenarioId, text, difficulty, timerDuration }` | All |
| `game:team-submitted` | `{ teamId }` | Host only |
| `game:typing-indicator` | `{ teamId }` | Host only |
| `game:times-up` | `{}` | All |
| `game:all-answers` | `{ answers: [{ teamId, answer }] }` | Host only |
| `game:outcome` | `{ teamId, outcome, rating }` | All |
| `game:winner` | `{ winnerTeamIds, reasoning }` | All |
| `game:virus-taunt` | `{ taunts: [{ teamId, message }] }` | All |
| `game:scoreboard` | `{ scores: [{ teamId, points }] }` | All |
| `game:over` | `{ finalScores, summaries, ratings }` | All |

### 8.2 Reconnection Handling

- Socket.IO auto-reconnects on disconnect
- On reconnect, client sends `game:state-update` request
- Server responds with current full game state
- Client re-renders to correct phase

---

## 9. Game Configuration

| Setting | Default | Range | Set By |
|---------|---------|-------|--------|
| Timer per round | 60s | 30s / 45s / 60s / 90s | Host (lobby) |
| Number of rounds | 5 | 3–8 | Host (lobby) |
| Max teams | 6 | 2–6 | System |
| Max team name length | 20 chars | — | System |
| Max answer length | 500 chars | — | System |
| AI outcome reveal speed | 30ms/char | — | System |

---

## 10. Scenario Difficulty Progression

| Round | Difficulty | Description |
|-------|-----------|-------------|
| 1–2 | 🟢 Easy | Common, relatable situations. Obvious correct response exists. |
| 3–4 | 🟡 Medium | Requires knowledge of specific laws, proper reporting channels. |
| 5+ | 🔴 Hard | Multi-victim, ambiguous, requires nuanced multi-step response. |

**Topic pool** (mapped to presentation segments):
- Cyberbullying & online harassment
- Identity theft & fake accounts
- Illegal access & hacking
- Cyber libel & defamation
- Data privacy violations
- Online scams & phishing
- Prevention & bystander response

---

## 11. Data Model

### Game State (in-memory, server-side)

```
GameState {
  roomCode: string              // 4-char alphanumeric
  phase: enum                   // LOBBY | INTRO | SCENARIO | REVEAL | OUTCOMES | WINNER | GAME_OVER
  config: {
    timerDuration: number
    numRounds: number
  }
  teams: [{
    id: string
    name: string                // e.g., "Team 1"
    virusName: string           // e.g., "TROJAN"
    virusColor: string          // hex color
    playerId: string            // socket ID of typist
    playerName: string
    points: number
  }]
  currentRound: {
    number: number
    scenario: { text, difficulty, topic }
    answers: { [teamId]: string }
    outcomes: { [teamId]: { text, rating } }
    winners: string[]           // team IDs
    taunts: { [teamId]: string }
    timerEndsAt: timestamp
  }
  roundHistory: [...]           // past rounds for summary
  previousScenarioTopics: []    // avoid repetition
}
```

---

## 12. Error Handling & Edge Cases

| Scenario | Handling |
|----------|---------|
| Player disconnects mid-round | Answer preserved if already typing; host can reassign |
| AI API timeout / error | Show fallback message: "The AI is thinking harder than usual..." Retry once. If fail, host can skip to next round. |
| All teams submit identical answers | AI acknowledges similarity, picks the one with best phrasing/detail |
| Team submits blank/gibberish | AI roasts them: "That's not even an answer." 0 points, move on. |
| Only 1 team remaining | Game still works — AI evaluates solo answer on its own merit |
| Host refreshes page | Reconnects via room code, receives full state |
| Timer expires, no submissions | Auto-submit whatever is in the text field (or "No response" if empty) |

---

## 13. Deployment & Access

### Production Build

```bash
npm run build        # Builds React app → client/dist/
npm start            # Express serves client/dist/ + API + Socket.IO
```

### Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...     # Required
PORT=3000                         # Default 3000
NODE_ENV=production               # production in deploy
```

### Access

- **Host:** Opens `{DEPLOYED_URL}/host` on laptop
- **Players:** Scan QR or navigate to `{DEPLOYED_URL}/play?room={CODE}` on phone
- QR code encodes the player join URL

---

## 14. Time Flexibility Modes

| Mode | Rounds | Timer | Taunts | Est. Duration |
|------|--------|-------|--------|---------------|
| Quick | 3 | 45s | Skip | 5–8 min |
| Standard | 4–5 | 60s | Full | 10–12 min |
| Extended | 6–8 | 60s | Full + harder scenarios | 15–20 min |

Host selects mode in lobby. Can always end early and show final scoreboard.

---

## 15. Optional Extras (Post-MVP)

- 🔊 Sound effects (countdown tick, reveal drum roll, victory fanfare)
- 🌧️ Matrix code rain background on projector
- 🗳️ Audience vote — class votes on best answer before AI reveals
- ⚡ Plot twist rounds — AI adds a complication mid-scenario
- 📊 Post-game cybersecurity rating per team
- 📱 Spectator mode — non-typist students can watch on their own phones

---

## 16. Open Items

- [ ] **Presentation resources** — Need the actual Cybercrime Prevention Act presentation content to populate `PRESENTATION_CONTEXT` for AI scenario generation
- [ ] **Team virus names & personalities** — Finalize the roster (TROJAN, WORM, RANSOMWARE, SPYWARE, MALWARE, BOTNET?)
- [ ] **Deployment platform** — Confirm Railway vs Render vs other
- [ ] **Domain/URL** — Custom domain or platform default?
- [ ] **API key budget** — Estimate Claude API costs for a full game session (~20-30 API calls)
