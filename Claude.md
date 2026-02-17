# CLAUDE.md — Virus Breach

## Project Overview

**Virus Breach** is a real-time multiplayer classroom game for a Cybercrime Prevention Act (RA 10175) presentation. An AI narrator throws cybercrime scenarios at student teams. Teams discuss and submit responses. The AI plays out realistic consequences for each answer, picks winners, and roasts the losers through team "virus" mascots.

Think: **Death by AI meets Jackbox Games meets cybercrime law education.**

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite + Tailwind CSS 3 | Fast dev, great DX, utility-first styling |
| Backend | Node.js + Express + Socket.IO | Real-time bidirectional sync between host & players |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) | Scenario generation, consequence narration, winner selection, virus taunts |
| Deployment | Single server (Railway / Render) | Express serves both the API + built React static files |

### Monorepo Structure

```
virus-breach/
├── CLAUDE.md              # You are here
├── package.json           # Root scripts (dev, build, start)
├── client/                # React + Vite frontend
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── socket.js           # Socket.IO client singleton
│       ├── pages/
│       │   ├── HostLobby.jsx       # QR code, team management
│       │   ├── HostGame.jsx        # Scenario display, responses, AI outcomes
│       │   ├── HostScoreboard.jsx  # Final scores + AI summary
│       │   ├── PlayerJoin.jsx      # Name entry, waiting room
│       │   ├── PlayerGame.jsx      # Scenario text, input, submit, timer
│       │   └── PlayerResults.jsx   # Round results on phone
│       ├── components/
│       │   ├── Timer.jsx
│       │   ├── TeamCard.jsx
│       │   ├── ScenarioCard.jsx
│       │   ├── OutcomeCard.jsx
│       │   ├── VirusTaunt.jsx
│       │   ├── QRCode.jsx
│       │   ├── MatrixRain.jsx      # Background effect
│       │   └── TypewriterText.jsx  # AI text reveal animation
│       └── hooks/
│           ├── useSocket.js
│           ├── useTimer.js
│           └── useGameState.js
├── server/
│   ├── package.json
│   ├── index.js               # Express + Socket.IO entry point
│   ├── gameManager.js         # Core game state machine
│   ├── aiService.js           # Claude API integration
│   ├── prompts.js             # All AI prompt templates
│   ├── scenarios.js           # Scenario bank + difficulty tiers
│   └── constants.js           # Timer durations, max teams, etc.
└── shared/
    └── events.js              # Socket event name constants (used by both)
```

---

## Architecture Notes

### Game State Machine (server/gameManager.js)

The game is a state machine. All state lives on the server. Clients are dumb renderers.

```
LOBBY → GAME_START → SCENARIO_ACTIVE → ALL_SUBMITTED → AI_PROCESSING → SHOWING_OUTCOMES → SHOWING_WINNER → (next round or) GAME_OVER
```

- State transitions are triggered by host actions or automatic events (timer expiry, all teams submitted).
- The server emits the full relevant game state slice to clients on every transition.
- Host and players receive different event payloads (host sees all answers, players only see their own until reveal).

### Socket.IO Events

**Client → Server:**
- `host:create-game` — Host creates a new game session
- `player:join` — Typist joins with name
- `host:assign-team` — Host assigns player to a team
- `host:start-game` — Transitions from lobby to game
- `host:next-scenario` — Triggers next scenario
- `host:end-game` — Ends game early, shows scoreboard
- `player:submit-answer` — Typist submits team's answer
- `player:typing` — Typing indicator (debounced)

**Server → Client:**
- `game:state-update` — Full state sync (on join/reconnect)
- `game:scenario` — New scenario + timer start
- `game:team-submitted` — A team submitted (shows checkmark on host)
- `game:typing-indicator` — A team is typing
- `game:times-up` — Timer expired
- `game:outcomes` — AI-generated outcomes for all teams
- `game:winner` — Round winner(s) announced
- `game:virus-taunt` — Virus commentary between rounds
- `game:scoreboard` — Updated scores
- `game:over` — Final results + AI summary

### AI Integration (server/aiService.js)

All AI calls go through a single service. Use `claude-sonnet-4-20250514` for speed (responses need to feel snappy during gameplay).

**Key AI functions:**
1. `generateScenario(difficulty, topic, previousScenarios)` — Generate a cybercrime scenario. Must avoid repeating themes.
2. `generateOutcome(scenario, teamAnswer)` — Play out consequences for one team's answer. 2-3 sentences, narrator tone, reference RA 10175 sections when relevant.
3. `pickWinners(scenario, allOutcomes)` — Compare all teams, pick best 1-2, explain why.
4. `generateVirusTaunts(teams, roundResults)` — Each team's virus comments on performance.
5. `generateGameSummary(allRoundResults)` — End-of-game roast/summary per team.

**Prompt guidelines:**
- System prompt establishes the AI as a sharp, witty cybercrime narrator — not a teacher.
- Outcomes should feel like a story unfolding, not a lecture.
- Good answers → satisfying resolution with legal specifics.
- Bad answers → realistic consequences with a hint of dark humor.
- Virus taunts should be funny but not mean-spirited (this is a classroom).
- Always reference RA 10175 (Cybercrime Prevention Act of 2012) sections accurately.
- Scenarios should feel relatable to Filipino college students.

### Scenario Content

Scenarios are based on the team's Cybercrime Prevention Act presentation. A `scenarios.js` file holds reference material about RA 10175 that gets injected into AI prompts as context. The AI generates scenarios dynamically but is grounded in this reference material.

**Difficulty tiers:**
- **Easy** (Rounds 1-2): Common, relatable situations. Correct response is somewhat obvious.
- **Medium** (Rounds 3-4): Requires specific knowledge of proper channels and laws.
- **Hard** (Rounds 5+): Complex multi-victim scenarios, ambiguous situations, requires nuanced response.

---

## UI/UX Design Direction

### Aesthetic: Cyber-noir hacker terminal

- **Dark theme** — Deep blacks (#0a0a0f) with neon green (#00ff41) and electric cyan (#00d4ff) accents
- **Font**: `"JetBrains Mono"` for terminal feel, `"Orbitron"` or `"Rajdhani"` for headers
- **Background**: Subtle matrix-style code rain animation (CSS only, performant)
- **Cards/panels**: Dark glassmorphism with subtle green/cyan border glow
- **Text reveal**: Typewriter animation for AI outcomes (adds drama)
- **Timer**: Circular countdown with pulsing urgency effect when < 10 seconds
- **Mobile (player)**: Clean, minimal — large text input, big submit button, easy to use on phone

### Host Screen (Projector)

- Designed for **1920x1080 projection** — large text, high contrast, readable from back of room
- No scrolling — everything fits in viewport per phase
- Dramatic transitions between phases (scenario → responses → outcomes → winner)

### Player Screen (Phone)

- Designed for **mobile-first (375px+)**
- Minimal UI — scenario text, textarea, submit button, timer
- No distractions — the discussion happens out loud, the phone is just for typing

---

## Development Commands

```bash
# Install all dependencies
npm run install:all

# Development (runs client + server concurrently)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...       # Required — Claude API key
PORT=3000                           # Server port (default 3000)
CLIENT_URL=http://localhost:5173    # For CORS in dev
NODE_ENV=development               # development | production
```

---

## Key Development Principles

1. **Server is the source of truth.** All game state lives in `gameManager.js`. Clients render what they're told.
2. **Keep it simple.** No database. Game state lives in memory. One game session at a time is fine.
3. **AI calls are async but sequential.** Generate outcomes one team at a time for dramatic reveal effect.
4. **Mobile-first for players.** The typist UI must work flawlessly on any phone browser.
5. **Projector-first for host.** Design for readability at distance. Minimum 24px body text on host screen.
6. **Graceful degradation.** If AI is slow, show loading states. If a player disconnects, let host reassign.
7. **Fun > Perfect.** This is a 10-minute classroom activity. Ship fast, make it fun, don't over-engineer.

---

## Reference: RA 10175 Key Sections

The AI should accurately reference these when generating outcomes:

- **Section 4(a)(1)** — Illegal Access
- **Section 4(a)(3)** — Data Interference
- **Section 4(a)(5)** — Misuse of Devices
- **Section 4(b)(1)** — Computer-related Forgery
- **Section 4(b)(2)** — Computer-related Fraud
- **Section 4(b)(3)** — Computer-related Identity Theft
- **Section 4(c)(1)** — Cybersex
- **Section 4(c)(2)** — Child Pornography
- **Section 4(c)(3)** — Unsolicited Commercial Communications
- **Section 4(c)(4)** — Libel (Cyber Libel)
- **Section 6** — All offenses have penalties one degree higher when committed via ICT
- **Section 5** — Aiding/abetting cybercrimes is also punishable

**Related laws the AI may reference:**
- **RA 10173** — Data Privacy Act of 2012
- **RA 9995** — Anti-Photo and Video Voyeurism Act
- **RA 9262** — Anti-Violence Against Women and Children Act (for online harassment cases)
- **RA 11313** — Safe Spaces Act (for online gender-based harassment)

---

## Prompt: Scenario Resource Injection

When the user provides their presentation content (PPT/notes), extract key facts and add them to `server/scenarios.js` as a `PRESENTATION_CONTEXT` string. This gets injected into the AI system prompt so scenarios directly reference what the class just learned.
