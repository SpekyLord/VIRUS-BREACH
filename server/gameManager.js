import {
  GAME_PHASES,
  DIFFICULTY,
  TIMER_DURATIONS,
  VIRUS_ROSTER,
  MAX_TEAMS,
  MIN_TEAMS_TO_START,
  MAX_ANSWER_LENGTH,
  ROOM_CODE_LENGTH,
} from './constants.js';
import * as Events from '../shared/events.js';
import * as AI from './aiService.js';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const VALID_TRANSITIONS = {
  [GAME_PHASES.LOBBY]: [GAME_PHASES.INTRO, GAME_PHASES.GAME_OVER],
  [GAME_PHASES.INTRO]: [GAME_PHASES.SCENARIO, GAME_PHASES.GAME_OVER],
  [GAME_PHASES.SCENARIO]: [GAME_PHASES.REVEAL, GAME_PHASES.GAME_OVER],
  [GAME_PHASES.REVEAL]: [GAME_PHASES.OUTCOMES, GAME_PHASES.GAME_OVER],
  [GAME_PHASES.OUTCOMES]: [GAME_PHASES.WINNER, GAME_PHASES.GAME_OVER],
  [GAME_PHASES.WINNER]: [GAME_PHASES.SCENARIO, GAME_PHASES.GAME_OVER],
  [GAME_PHASES.GAME_OVER]: [],
};

const OUTCOME_REVEAL_DELAY_MS = 2000;

export class GameManager {
  constructor(io) {
    this.io = io;
    this.games = new Map();       // roomCode -> gameState
    this.socketToRoom = new Map(); // socketId -> roomCode
    this.timers = new Map();       // roomCode -> setTimeout id
  }

  // ─── Room Management ────────────────────────────────────────

  createGame(hostSocketId, config = {}) {
    const roomCode = this._generateRoomCode();
    const teams = VIRUS_ROSTER.slice(0, MAX_TEAMS).map((virus, i) => ({
      id: `team-${i}`,
      name: virus.name,
      virusName: virus.name,
      virusColor: virus.color,
      playerId: null,
      playerName: null,
      points: 0,
      connected: false,
    }));

    const game = {
      roomCode,
      hostSocketId,
      phase: GAME_PHASES.LOBBY,
      config: {
        timerDuration: config.timerDuration || TIMER_DURATIONS.DEFAULT,
        numRounds: config.numRounds || 5,
      },
      teams,
      players: {},
      currentRound: this._freshRound(),
      roundHistory: [],
      previousScenarioTopics: [],
    };

    this.games.set(roomCode, game);
    this.socketToRoom.set(hostSocketId, roomCode);
    console.log(`Game created: ${roomCode}`);
    // Note: State update will be emitted by the caller after socket joins room
    return roomCode;
  }

  _generateRoomCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
      }
    } while (this.games.has(code));
    return code;
  }

  _freshRound() {
    return {
      number: 0,
      scenario: null,
      answers: {},
      outcomes: {},
      winners: [],
      taunts: {},
      timerEndsAt: null,
    };
  }

  // ─── Player Management ──────────────────────────────────────

  playerJoin(socketId, roomCode, playerName) {
    const game = this.games.get(roomCode?.toUpperCase());
    if (!game) throw new Error('Room not found');
    if (game.phase !== GAME_PHASES.LOBBY) throw new Error('Game already in progress');
    if (!playerName?.trim()) throw new Error('Name is required');

    const name = playerName.trim().slice(0, 20);
    game.players[socketId] = { name, teamId: null, connected: true };
    this.socketToRoom.set(socketId, game.roomCode);
    this._emitStateUpdate(game.roomCode);
  }

  assignTeam(hostSocketId, playerId, teamIndex) {
    const game = this._getGameByHost(hostSocketId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GAME_PHASES.LOBBY) throw new Error('Can only assign teams in lobby');
    if (!game.players[playerId]) throw new Error('Player not found');
    if (teamIndex < 0 || teamIndex >= MAX_TEAMS) throw new Error('Invalid team index');

    const team = game.teams[teamIndex];

    // Unassign player from any current team
    const player = game.players[playerId];
    if (player.teamId !== null) {
      const oldTeam = game.teams.find(t => t.id === player.teamId);
      if (oldTeam && oldTeam.playerId === playerId) {
        oldTeam.playerId = null;
        oldTeam.playerName = null;
        oldTeam.connected = false;
      }
    }

    // If target team already has a typist, unassign them
    if (team.playerId && team.playerId !== playerId) {
      const oldPlayer = game.players[team.playerId];
      if (oldPlayer) oldPlayer.teamId = null;
    }

    // Assign
    team.playerId = playerId;
    team.playerName = game.players[playerId].name;
    team.connected = true;
    game.players[playerId].teamId = team.id;

    this._emitStateUpdate(game.roomCode);
  }

  handleDisconnect(socketId) {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return;

    const game = this.games.get(roomCode);
    if (!game) return;

    // Host disconnect
    if (game.hostSocketId === socketId) {
      game.hostSocketId = null;
      console.log(`Host disconnected from room ${roomCode}`);
    }

    // Player disconnect
    const player = game.players[socketId];
    if (player) {
      player.connected = false;
      if (player.teamId) {
        const team = game.teams.find(t => t.id === player.teamId);
        if (team) team.connected = false;
      }
    }

    this.socketToRoom.delete(socketId);
    this._emitStateUpdate(roomCode);
  }

  // ─── Game Flow ──────────────────────────────────────────────

  startGame(hostSocketId) {
    const game = this._getGameByHost(hostSocketId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GAME_PHASES.LOBBY) throw new Error('Game already started');

    const assignedTeams = game.teams.filter(t => t.playerId);
    if (assignedTeams.length < MIN_TEAMS_TO_START) {
      throw new Error(`Need at least ${MIN_TEAMS_TO_START} teams with players`);
    }

    this._transition(game.roomCode, GAME_PHASES.INTRO);
    this._emitStateUpdate(game.roomCode);
  }

  async nextScenario(hostSocketId) {
    const game = this._getGameByHost(hostSocketId);
    if (!game) throw new Error('Game not found');

    const { phase } = game;
    if (phase !== GAME_PHASES.INTRO && phase !== GAME_PHASES.WINNER) {
      throw new Error('Cannot start scenario from current phase');
    }

    // Archive previous round if exists
    if (game.currentRound.number > 0) {
      game.roundHistory.push({ ...game.currentRound });
    }

    // New round
    game.currentRound = this._freshRound();
    game.currentRound.number = game.roundHistory.length + 1;

    const difficulty = this._getDifficulty(game.currentRound.number);
    const scenario = await AI.generateScenario(difficulty, game.previousScenarioTopics);
    game.currentRound.scenario = scenario;
    game.previousScenarioTopics.push(scenario.topic);

    this._transition(game.roomCode, GAME_PHASES.SCENARIO);
    this._startTimer(game.roomCode);

    // Emit scenario to all
    this.io.to(game.roomCode).emit(Events.GAME_SCENARIO, {
      scenarioId: game.currentRound.number,
      text: scenario.text,
      difficulty: scenario.difficulty,
      timerDuration: game.config.timerDuration,
      timerEndsAt: game.currentRound.timerEndsAt,
    });

    this._emitStateUpdate(game.roomCode);
  }

  async endGame(hostSocketId) {
    const game = this._getGameByHost(hostSocketId);
    if (!game) throw new Error('Game not found');

    this._clearTimer(game.roomCode);

    // Archive current round if in progress
    if (game.currentRound.number > 0) {
      game.roundHistory.push({ ...game.currentRound });
    }

    this._transition(game.roomCode, GAME_PHASES.GAME_OVER);

    const finalScores = game.teams
      .filter(t => t.playerId)
      .map(t => ({ teamId: t.id, name: t.name, virusName: t.virusName, points: t.points }))
      .sort((a, b) => b.points - a.points);

    // AI-generated game summary
    const teamsForSummary = game.teams
      .filter(t => t.playerId)
      .map(t => ({
        teamId: t.id,
        virusName: t.virusName,
        points: t.points,
      }));
    const summaries = await AI.generateGameSummary(teamsForSummary, game.roundHistory);

    this.io.to(game.roomCode).emit(Events.GAME_OVER, {
      finalScores,
      summaries,
      roundHistory: game.roundHistory,
    });

    this._emitStateUpdate(game.roomCode);
  }

  // ─── Answer Collection ──────────────────────────────────────

  submitAnswer(socketId, answer) {
    const game = this._getGameByPlayer(socketId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GAME_PHASES.SCENARIO) throw new Error('Not accepting answers');

    const player = game.players[socketId];
    if (!player?.teamId) throw new Error('Not assigned to a team');

    const teamId = player.teamId;
    if (game.currentRound.answers[teamId] !== undefined) {
      throw new Error('Already submitted');
    }

    const trimmed = (answer || '').trim().slice(0, MAX_ANSWER_LENGTH);
    game.currentRound.answers[teamId] = trimmed || '[No response submitted]';

    // Notify host that this team submitted
    if (game.hostSocketId) {
      this.io.to(game.hostSocketId).emit(Events.GAME_TEAM_SUBMITTED, { teamId });
    }

    // Check if all assigned teams have submitted
    const assignedTeams = game.teams.filter(t => t.playerId);
    const allSubmitted = assignedTeams.every(
      t => game.currentRound.answers[t.id] !== undefined
    );

    if (allSubmitted) {
      this._allAnswersIn(game.roomCode);
    }
  }

  handleTyping(socketId) {
    const game = this._getGameByPlayer(socketId);
    if (!game) return;

    const player = game.players[socketId];
    if (!player?.teamId) return;

    if (game.hostSocketId) {
      this.io.to(game.hostSocketId).emit(Events.GAME_TYPING_INDICATOR, {
        teamId: player.teamId,
      });
    }
  }

  // ─── Timer ──────────────────────────────────────────────────

  _startTimer(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return;

    const durationMs = game.config.timerDuration * 1000;
    game.currentRound.timerEndsAt = Date.now() + durationMs;

    const timerId = setTimeout(() => {
      this._onTimerExpiry(roomCode);
    }, durationMs);

    this.timers.set(roomCode, timerId);
  }

  _clearTimer(roomCode) {
    const timerId = this.timers.get(roomCode);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(roomCode);
    }
  }

  _onTimerExpiry(roomCode) {
    const game = this.games.get(roomCode);
    if (!game || game.phase !== GAME_PHASES.SCENARIO) return;

    this.timers.delete(roomCode);

    // Auto-submit for teams that haven't answered
    const assignedTeams = game.teams.filter(t => t.playerId);
    for (const team of assignedTeams) {
      if (game.currentRound.answers[team.id] === undefined) {
        game.currentRound.answers[team.id] = '[No response submitted]';
      }
    }

    this.io.to(roomCode).emit(Events.GAME_TIMES_UP, {});
    this._allAnswersIn(roomCode);
  }

  // ─── Internal Flow ──────────────────────────────────────────

  async _allAnswersIn(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return;

    this._clearTimer(roomCode);
    this._transition(roomCode, GAME_PHASES.REVEAL);

    // Send all answers to host
    const answers = game.teams
      .filter(t => t.playerId)
      .map(t => ({
        teamId: t.id,
        teamName: t.name,
        answer: game.currentRound.answers[t.id] || '[No response submitted]',
      }));

    if (game.hostSocketId) {
      this.io.to(game.hostSocketId).emit(Events.GAME_ALL_ANSWERS, { answers });
    }

    this._emitStateUpdate(roomCode);
    // Host must click "Process Answers" to continue — see processAnswers()
  }

  async processAnswers(hostSocketId) {
    const game = this._getGameByHost(hostSocketId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GAME_PHASES.REVEAL) throw new Error('Not in REVEAL phase');
    await this._processOutcomes(game.roomCode);
  }

  async _processOutcomes(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return;

    this._transition(roomCode, GAME_PHASES.OUTCOMES);
    this._emitStateUpdate(roomCode);

    const assignedTeams = game.teams.filter(t => t.playerId);

    for (const team of assignedTeams) {
      const answer = game.currentRound.answers[team.id] || '[No response submitted]';
      const outcome = await AI.generateOutcome(
        game.currentRound.scenario.text,
        team.name,
        answer
      );
      game.currentRound.outcomes[team.id] = outcome;

      this.io.to(roomCode).emit(Events.GAME_OUTCOME, {
        teamId: team.id,
        teamName: team.name,
        outcome,
      });

      await new Promise(resolve => setTimeout(resolve, OUTCOME_REVEAL_DELAY_MS));
    }

    await this._pickWinner(roomCode);
  }

  async _pickWinner(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) return;

    this._transition(roomCode, GAME_PHASES.WINNER);

    const assignedTeams = game.teams.filter(t => t.playerId);

    // Build team outcomes data for AI
    const teamOutcomes = assignedTeams.map(t => ({
      teamId: t.id,
      teamName: t.name,
      answer: game.currentRound.answers[t.id] || '[No response submitted]',
      outcomeText: game.currentRound.outcomes[t.id]?.text || '',
      rating: game.currentRound.outcomes[t.id]?.rating || 'partial',
    }));

    // AI picks winners
    const { winnerTeamIds, reasoning } = await AI.pickWinners(
      game.currentRound.scenario.text,
      teamOutcomes
    );

    game.currentRound.winners = winnerTeamIds;

    // Award points
    for (const winnerId of winnerTeamIds) {
      const team = game.teams.find(t => t.id === winnerId);
      if (team) team.points += 1;
    }

    this.io.to(roomCode).emit(Events.GAME_WINNER, {
      winnerTeamIds,
      reasoning,
    });

    // Emit scoreboard
    const scores = game.teams
      .filter(t => t.playerId)
      .map(t => ({ teamId: t.id, name: t.name, points: t.points }));
    this.io.to(roomCode).emit(Events.GAME_SCOREBOARD, { scores });

    // AI-generated taunts
    const teamsForTaunts = assignedTeams.map(t => ({
      teamId: t.id,
      virusName: t.virusName,
      answer: game.currentRound.answers[t.id] || '',
    }));

    const taunts = await AI.generateVirusTaunts(
      teamsForTaunts,
      winnerTeamIds,
      game.currentRound.number
    );
    game.currentRound.taunts = taunts;
    this.io.to(roomCode).emit(Events.GAME_VIRUS_TAUNT, { taunts });

    this._emitStateUpdate(roomCode);
  }

  // ─── Phase Transition ───────────────────────────────────────

  _transition(roomCode, newPhase) {
    const game = this.games.get(roomCode);
    if (!game) throw new Error('Game not found');

    const allowed = VALID_TRANSITIONS[game.phase];
    if (!allowed || !allowed.includes(newPhase)) {
      throw new Error(`Invalid transition: ${game.phase} → ${newPhase}`);
    }

    game.phase = newPhase;
  }

  // ─── State Emission ─────────────────────────────────────────

  _getHostState(game) {
    // Transform teams to match client expectations
    const teams = game.teams.map(team => {
      // Find players assigned to this team (only connected players)
      const teamPlayers = Object.entries(game.players)
        .filter(([_, player]) => player.teamId === team.id && player.connected)
        .map(([socketId, player]) => ({
          socketId,
          name: player.name,
          role: 'typist', // All players are typists in this version
        }));

      return {
        id: team.id,
        virus: {
          name: team.virusName,
          color: team.virusColor,
        },
        players: teamPlayers,
        score: team.points,
      };
    });

    // Find unassigned players (waiting to be assigned, only connected)
    const waitingPlayers = Object.entries(game.players)
      .filter(([_, player]) => !player.teamId && player.connected)
      .map(([socketId, player]) => ({
        socketId,
        name: player.name,
        role: 'typist',
      }));

    return {
      roomCode: game.roomCode,
      phase: game.phase,
      config: game.config,
      teams,
      waitingPlayers,
      currentRound: game.currentRound,
      roundHistory: game.roundHistory,
    };
  }

  _getPlayerState(game, socketId) {
    const player = game.players[socketId];
    const teamId = player?.teamId;

    // Filter answers: player only sees their own team's answer before REVEAL
    let visibleAnswers = {};
    if (game.phase === GAME_PHASES.REVEAL || game.phase === GAME_PHASES.OUTCOMES ||
        game.phase === GAME_PHASES.WINNER || game.phase === GAME_PHASES.GAME_OVER) {
      visibleAnswers = game.currentRound.answers;
    } else if (teamId && game.currentRound.answers[teamId] !== undefined) {
      visibleAnswers = { [teamId]: game.currentRound.answers[teamId] };
    }

    return {
      roomCode: game.roomCode,
      phase: game.phase,
      config: game.config,
      teams: game.teams.map(t => ({
        id: t.id,
        name: t.name,
        virusName: t.virusName,
        virusColor: t.virusColor,
        points: t.points,
        hasPlayer: !!t.playerId,
      })),
      myTeamId: teamId,
      myName: player?.name,
      currentRound: {
        number: game.currentRound.number,
        scenario: game.currentRound.scenario,
        answers: visibleAnswers,
        outcomes: game.currentRound.outcomes,
        winners: game.currentRound.winners,
        taunts: game.currentRound.taunts,
        timerEndsAt: game.currentRound.timerEndsAt,
      },
    };
  }

  _emitStateUpdate(roomCode) {
    const game = this.games.get(roomCode);
    if (!game) {
      console.log(`[GameManager] _emitStateUpdate: No game found for room ${roomCode}`);
      return;
    }

    // Send full state to host via the room (since socket.join(roomCode) was called in index.js)
    const hostState = this._getHostState(game);
    this.io.to(roomCode).emit(Events.GAME_STATE_UPDATE, hostState);

    // Send filtered state to each player
    for (const [socketId, player] of Object.entries(game.players)) {
      if (player.connected) {
        const playerState = this._getPlayerState(game, socketId);
        this.io.to(socketId).emit(Events.GAME_STATE_UPDATE, playerState);
      }
    }
  }

  // ─── Lookup Helpers ─────────────────────────────────────────

  _getGameByHost(hostSocketId) {
    for (const game of this.games.values()) {
      if (game.hostSocketId === hostSocketId) return game;
    }
    return null;
  }

  _getGameByPlayer(socketId) {
    const roomCode = this.socketToRoom.get(socketId);
    return roomCode ? this.games.get(roomCode) : null;
  }

  _getDifficulty(roundNumber) {
    if (roundNumber <= 2) return DIFFICULTY.EASY;
    if (roundNumber <= 4) return DIFFICULTY.MEDIUM;
    return DIFFICULTY.HARD;
  }

}
