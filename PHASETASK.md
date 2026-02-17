# Virus Breach — Phase Task Checklist

> Implementation tracker. Check off tasks as they're completed.

---

## Phase 1: Project Scaffolding & Monorepo Setup ✅
> Get the dev environment running with hot reload on both client and server.

- [x] Initialize root `package.json` with workspace scripts (`dev`, `build`, `start`, `install:all`)
- [x] Scaffold **server/** — `package.json`, Express + Socket.IO entry point (`index.js`), basic health route
- [x] Scaffold **client/** — Vite + React 18 + Tailwind CSS 3, `vite.config.js` with proxy to server
- [x] Scaffold **shared/** — `events.js` with all Socket.IO event name constants
- [x] Create `.env.example` with required env vars
- [x] Create `.gitignore`
- [x] Verify `npm run dev` starts both client (5173) and server (3000) concurrently

**Files:**
`package.json` · `.env.example` · `.gitignore` · `server/package.json` · `server/index.js` · `server/constants.js` · `client/package.json` · `client/vite.config.js` · `client/tailwind.config.js` · `client/postcss.config.js` · `client/index.html` · `client/src/main.jsx` · `client/src/App.jsx` · `client/src/index.css` · `shared/events.js`

---

## Phase 2: Game State Machine & Core Server Logic ✅
> Server-side game engine — the brain of the game.

- [x] Build `server/gameManager.js` — full state machine (LOBBY → INTRO → SCENARIO → REVEAL → OUTCOMES → WINNER → GAME_OVER)
- [x] Implement room creation (4-char code), team management, player join/assign
- [x] Implement round flow: start scenario, collect answers, timer expiry/auto-submit
- [x] Implement scoring (1 point per round win, ties both score)
- [x] Wire all Socket.IO events (client→server and server→client) in `server/index.js`
- [x] Update `server/constants.js` as needed
- [x] Test — server starts cleanly, all events wired

**Files:** `server/gameManager.js` · `server/index.js` · `server/constants.js` · `shared/events.js`

---

## Phase 3: AI Service Integration ✅
> AI powers scenario generation, outcome narration, winner picking, and taunts.

- [x] Build `server/aiService.js` — all 5 AI functions with error handling & retry
  - `generateScenario(difficulty, previousTopics)` — returns `{ text, difficulty, topic }`
  - `generateOutcome(scenarioText, teamName, teamAnswer)` — returns `{ text, rating }`
  - `pickWinners(scenarioText, teamOutcomes)` — returns `{ winnerTeamIds[], reasoning }`
  - `generateVirusTaunts(teams, winnerIds, roundNumber)` — returns `{ [teamId]: tauntString }`
  - `generateGameSummary(teams, roundHistory)` — returns `{ [teamId]: { summary, rating } }`
- [x] Build `server/prompts.js` — all prompt templates with system prompt, RA 10175 reference injection
- [x] Build `server/scenarios.js` — topic pool, RA 10175 reference, `PRESENTATION_CONTEXT` placeholder
- [x] Wire AI calls into gameManager state transitions
- [x] Add fallback handling: graceful degradation if API fails
- [x] Make `server/index.js` handlers async — `HOST_NEXT_SCENARIO` and `HOST_END_GAME` now properly await
- [x] **AI provider: Groq SDK** (`groq-sdk`, model: `llama-3.1-8b-instant`) — free, no geographic restrictions
  - Migrated from Anthropic → Gemini → Groq (Gemini had Philippines geographic restriction on free tier)
  - Uses `GROQ_API_KEY` in `.env`

**Files Created:** `server/aiService.js` · `server/prompts.js` · `server/scenarios.js`
**Files Modified:** `server/gameManager.js` · `server/index.js` · `server/package.json` (groq-sdk)

---

## Phase 4: Client Foundation — Routing, Socket, Theme ✅
> Base client infrastructure: routing, socket connection, global styles, shared components.

- [x] Set up React Router — `/host`, `/play`, `/host/game`, `/play/game`, `/play/results` routes
- [x] Build `client/src/socket.js` — Socket.IO client singleton with reconnection
- [x] Build `client/src/hooks/useSocket.js` — event listener hook
- [x] Build `client/src/hooks/useGameState.js` — game state management hook
- [x] Build `client/src/hooks/useTimer.js` — countdown timer hook (synced to server timestamp, dynamic duration)
- [x] Apply cyber-noir theme in `index.css`
- [x] Build `client/src/components/MatrixRain.jsx` — CSS-only matrix background effect
- [x] Update `client/src/App.jsx` — MatrixRain as global background

**Files Created:** `client/src/socket.js` · `client/src/hooks/useSocket.js` · `client/src/hooks/useGameState.js` · `client/src/hooks/useTimer.js` · `client/src/components/MatrixRain.jsx`
**Files Modified:** `client/src/App.jsx`

---

## Phase 5: Host UI — Lobby ✅
> Host can create a game, see QR code, manage teams.

- [x] Build `HostLobby.jsx` — create game, display QR code + join URL, player list, team assignment
- [x] Build `QRCode.jsx` — QR code generation (`qrcode.react`)
- [x] Build `TeamCard.jsx` — team display card with virus name/color and player roster
- [x] Implement `host:create-game` flow, show room code
- [x] Team assignment UI (dropdown to assign players to teams)
- [x] "Start Game" button (enabled when ≥2 teams have ≥1 typist)

**Files Created:** `client/src/pages/HostLobby.jsx` · `client/src/components/QRCode.jsx` · `client/src/components/TeamCard.jsx`
**Files Modified:** `client/src/App.jsx`

---

## Phase 6: Player UI — Join & Waiting ✅
> Players can scan QR, enter name, join, and see their team assignment.

- [x] Build `PlayerJoin.jsx` — room code entry + name input, join button
- [x] Room validation with error handling ("⚠ ROOM NOT FOUND")
- [x] Post-join waiting state with team assignment display
- [x] Mobile-first styling — large inputs, big buttons, minimal chrome
- [x] Player disconnect handling (server marks `connected: false`)
- [x] **Bug fix:** Team name/color display used wrong field names (`virusName`/`virusColor` not `virus.name`/`virus.color` — player state vs host state shape difference)
- [x] Navigation passes `initialGameState` to `/play/game` to avoid race condition

**Files Created:** `client/src/pages/PlayerJoin.jsx`
**Files Modified:** `client/src/App.jsx`

---

## Phase 7: Host UI — Game Phase (Scenarios & Outcomes) ✅
> The main gameplay loop on the projector.

- [x] Build `HostGame.jsx` — full phase-based game screen
- [x] Build `ScenarioCard.jsx` — scenario text + difficulty badge (EASY/MEDIUM/HARD)
- [x] Build `Timer.jsx` — circular SVG countdown (green → yellow → red → pulse)
- [x] Build `OutcomeCard.jsx` — per-team outcome with TypewriterText + rating badge
- [x] Build `TypewriterText.jsx` — character-by-character AI text reveal (30ms/char)
- [x] Build `VirusTaunt.jsx` — team-colored taunt speech bubble with typewriter effect
- [x] Fix `useTimer` hook to accept dynamic duration parameter
- [x] Add slide-in-left animation to index.css
- [x] REVEAL phase — shows all team answers, host clicks "CONTINUE — LET AI JUDGE" to process
  - Added `HOST_PROCESS_ANSWERS` event to `shared/events.js`
  - `processAnswers()` method in `gameManager.js`
  - Server holds at REVEAL until host clicks Continue
- [x] OUTCOMES phase — one outcome at a time with "NEXT OUTCOME (N/M)" button
  - First outcome auto-reveals on arrival
  - "NEXT OUTCOME" button shows next queued outcome
  - "Generating next outcome..." shown while AI is still working
  - "CONTINUE TO RESULTS" button appears only after all outcomes shown
- [x] WINNER phase — winner announcement + cross-team virus taunts + scoreboard + controls
- [x] Host controls: "NEXT SCENARIO" and "END GAME" buttons in WINNER phase

**Files Created:** `client/src/pages/HostGame.jsx` · `client/src/components/ScenarioCard.jsx` · `client/src/components/Timer.jsx` · `client/src/components/OutcomeCard.jsx` · `client/src/components/TypewriterText.jsx` · `client/src/components/VirusTaunt.jsx`
**Files Modified:** `client/src/App.jsx` · `client/src/hooks/useTimer.js` · `client/src/index.css` · `shared/events.js` · `server/gameManager.js` · `server/index.js`

---

## Phase 8: Player UI — Game Phase ✅
> Players see scenarios, type answers, submit, and see results on their phones.

- [x] Build `PlayerGame.jsx` — scenario text, textarea, submit button, timer, post-submit waiting
  - INTRO phase: "Waiting for host to start scenario..." with round number
  - SCENARIO phase: scenario text + circular Timer (size 72) + textarea (max 500 chars) + submit button
  - Debounced `PLAYER_TYPING` indicator (500ms)
  - Disables input + shows "ANSWER SUBMITTED ✓" after submit
  - Shows "TIME'S UP!" badge when timer expires
  - Falls back to `gameState.currentRound` for scenario data if `GAME_SCENARIO` event was missed
  - Seeded from `location.state.initialGameState` to prevent "Connecting..." flash on navigation
- [x] Build `PlayerResults.jsx` — round results on player's phone
  - REVEAL phase: "The AI is judging..." loading screen
  - OUTCOMES phase: own team highlighted (full opacity + colored border), others dimmed (60%)
  - WINNER phase: win/loss status, own team's virus taunt, full scoreboard sorted by points
  - Seeded from `location.state.initialGameState` to prevent blank screen on navigation
- [x] Wire routes `/play/game` and `/play/results` in `App.jsx`
- [x] **Bug fix:** Players showed "Connecting..." after round 1 — race condition where `GAME_STATE_UPDATE` was consumed by `PlayerResults` before `PlayerGame` mounted
  - Fixed by passing `gameState` via `navigate(..., { state: { initialGameState: gameState } })` at every navigation boundary (PlayerResults → PlayerGame, PlayerJoin → PlayerGame, PlayerGame → PlayerResults)

**Files Created:** `client/src/pages/PlayerGame.jsx` · `client/src/pages/PlayerResults.jsx`
**Files Modified:** `client/src/App.jsx` · `client/src/pages/PlayerJoin.jsx` · `client/src/pages/PlayerResults.jsx`

---

## AI Prompt Improvements ✅ (post-Phase 8 fixes)

- [x] **Virus taunts — cross-team direction fix** (`server/prompts.js`)
  - Each virus now taunts THE OTHER TEAM (not its own team)
  - WINNING virus → mocks losing team(s) by name
  - LOSING virus → grudgingly reacts to winner, makes excuses/promises revenge
  - JSON key = the SPEAKING virus's team ID
- [x] **Outcome hallucination fix v1** (`server/prompts.js`)
  - Added "LITERALLY WROTE THIS EXACT RESPONSE" + "Do NOT invent or assume"
  - Explicit gibberish/joke detection → auto-rated "bad" and roasted
- [x] **Outcome hallucination fix v2** (`server/prompts.js`)
  - Rewrote evaluation logic as STEP 1 / STEP 2 structure to force classification before narration
  - STEP 1: explicitly classify answer into A (passive/useless) → B (troll) → C (wrong) → D (vague) → E (good)
  - "Just chill and laugh", "ignore it", casual dismissal → class A → mandatory `"bad"` rating
  - Model must classify BEFORE generating narrative, preventing charitable misinterpretation

---

## Phase 9: Scoreboard & Game Over ✅
> Final scores, AI summaries, and team ratings.

- [x] Build `HostScoreboard.jsx` — final rankings, AI-generated per-team summaries, cybersecurity ratings
  - Teams sorted by points (highest first) with rank labels (1ST, 2ND, 3RD, #4...)
  - Champion badge + subtle glow on 1st place team
  - AI roast summary shown in italic per team
  - Cybersecurity rating badge (color-coded): "Digital Fortress" → "Script Kiddie"
  - Graceful fallback when no summaries (force-ended game): "Game ended before AI could roast this team"
  - "No game data" fallback for direct URL navigation
  - "PLAY AGAIN" button returns to `/host`
- [x] Wire `/host/scoreboard` route in `App.jsx`
- [x] Fix `HostGame.jsx` fallback navigate to pass `gameState` (was navigating with no state)
  - Normal path: `GAME_OVER` event → `handleGameOver(data)` → scoreboard with full AI data
  - Fallback path: `gameState.phase === 'GAME_OVER'` useEffect → scoreboard with team scores (no summaries)

**Files Created:** `client/src/pages/HostScoreboard.jsx`
**Files Modified:** `client/src/App.jsx` · `client/src/pages/HostGame.jsx`

---

## Phase 10: Polish & Edge Cases ⬜
> Make it production-ready and resilient.

- [ ] Reconnection handling — client re-requests state on reconnect, re-renders correct phase
- [ ] Host page refresh recovery (currently navigates back to lobby after 3s timeout)
- [ ] Animations: winner celebration glow, submission checkmark fade-in, phase transitions
- [ ] Error fallbacks displayed to host if AI completely fails

---

## Phase 11: Production Build & Deployment ⬜
> Ship it.

- [ ] Configure Express to serve `client/dist/` in production
- [ ] Verify `npm run build` + `npm start` works end-to-end
- [ ] Test full game flow: create → join → play → score → game over
- [ ] Deploy to Railway or Render
- [ ] Test on actual phone + projector setup

---

## Verification Checkpoints
| Phase | How to verify |
|-------|--------------|
| 1 | `npm run dev` → client on :5173, server on :3000 |
| 2 | Socket client test — create game, join, submit, advance rounds |
| 3 | AI generates scenario, outcomes, winners (needs GROQ_API_KEY) |
| 4–8 | Browser test — `/host` on desktop, `/play?room=XXXX` on phone |
| 9 | End Game → scoreboard shows AI summaries and ratings |
| 10 | Disconnect/reconnect, timer edge cases |
| 11 | Full production deploy, end-to-end classroom simulation |
