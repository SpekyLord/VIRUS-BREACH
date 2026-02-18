import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameManager } from './gameManager.js';
import * as Events from '../shared/events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? true : (process.env.CLIENT_URL || 'http://localhost:5173'),
    methods: ['GET', 'POST'],
  },
});

const gameManager = new GameManager(io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // ─── Host Events ────────────────────────────────────────

  socket.on(Events.HOST_CREATE_GAME, (config, callback) => {
    try {
      const roomCode = gameManager.createGame(socket.id, config);
      socket.join(roomCode);

      // Emit state update AFTER socket joins room
      gameManager._emitStateUpdate(roomCode);

      callback?.({ success: true, roomCode });
    } catch (err) {
      console.error('create-game error:', err.message);
      socket.emit(Events.ERROR, { message: err.message });
      callback?.({ success: false, error: err.message });
    }
  });

  socket.on(Events.HOST_REQUEST_STATE, ({ roomCode }) => {
    try {
      gameManager.requestState(socket.id, roomCode);
      socket.join(roomCode.toUpperCase());
    } catch (err) {
      socket.emit(Events.ERROR, { message: err.message });
    }
  });

  socket.on(Events.HOST_ASSIGN_TEAM, ({ playerSocketId, teamId }) => {
    try {
      // Convert teamId (e.g., "team-0") to teamIndex (e.g., 0)
      const teamIndex = parseInt(teamId.split('-')[1], 10);
      gameManager.assignTeam(socket.id, playerSocketId, teamIndex);
    } catch (err) {
      console.error('assign-team error:', err.message);
      socket.emit(Events.ERROR, { message: err.message });
    }
  });

  socket.on(Events.HOST_START_GAME, () => {
    try {
      gameManager.startGame(socket.id);
      console.log('Game started');
    } catch (err) {
      console.error('start-game error:', err.message);
      socket.emit(Events.ERROR, { message: err.message });
    }
  });

  socket.on(Events.HOST_NEXT_SCENARIO, async () => {
    try {
      await gameManager.nextScenario(socket.id);
    } catch (err) {
      console.error('next-scenario error:', err.message);
      socket.emit(Events.ERROR, { message: err.message });
    }
  });

  socket.on(Events.HOST_PROCESS_ANSWERS, async () => {
    try {
      await gameManager.processAnswers(socket.id);
    } catch (err) {
      console.error('process-answers error:', err.message);
      socket.emit(Events.ERROR, { message: err.message });
    }
  });

  socket.on(Events.HOST_REVEAL_WINNER, () => {
    try {
      gameManager.revealWinner(socket.id);
    } catch (err) {
      console.error('reveal-winner error:', err.message);
      socket.emit(Events.ERROR, { message: err.message });
    }
  });

  socket.on(Events.HOST_END_GAME, async () => {
    try {
      await gameManager.endGame(socket.id);
      console.log('Game ended');
    } catch (err) {
      console.error('end-game error:', err.message);
      socket.emit(Events.ERROR, { message: err.message });
    }
  });

  // ─── Player Events ──────────────────────────────────────

  socket.on(Events.PLAYER_JOIN, ({ roomCode, playerName }, callback) => {
    try {
      gameManager.playerJoin(socket.id, roomCode, playerName);
      socket.join(roomCode.toUpperCase());
      console.log(`Player "${playerName}" joined room ${roomCode}`);
      callback?.({ success: true });
    } catch (err) {
      console.error('player-join error:', err.message);
      socket.emit(Events.ERROR, { message: err.message });
      callback?.({ success: false, error: err.message });
    }
  });

  socket.on(Events.PLAYER_REJOIN, ({ roomCode, playerName }) => {
    try {
      gameManager.playerRejoin(socket.id, roomCode, playerName);
      socket.join(roomCode.toUpperCase());
    } catch (err) {
      socket.emit(Events.ERROR, { message: err.message });
    }
  });

  socket.on(Events.PLAYER_SUBMIT_ANSWER, ({ answer }) => {
    try {
      gameManager.submitAnswer(socket.id, answer);
    } catch (err) {
      console.error('submit-answer error:', err.message);
      socket.emit(Events.ERROR, { message: err.message });
    }
  });

  socket.on(Events.PLAYER_TYPING, () => {
    try {
      gameManager.handleTyping(socket.id);
    } catch {
      // Silently ignore typing errors
    }
  });

  // ─── Disconnect ─────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    gameManager.handleDisconnect(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { io };
