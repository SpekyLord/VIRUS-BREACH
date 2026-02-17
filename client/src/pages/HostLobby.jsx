import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../socket';
import QRCode from '../components/QRCode';
import TeamCard from '../components/TeamCard';
import {
  HOST_CREATE_GAME,
  HOST_ASSIGN_TEAM,
  HOST_START_GAME,
  GAME_STATE_UPDATE,
} from '../../../shared/events';

export default function HostLobby() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [joinURL, setJoinURL] = useState('');
  const socketRef = useRef(null);
  const createdRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Listen for game state updates
    const handleStateUpdate = (state) => {
      setGameState(state);
    };

    socket.on(GAME_STATE_UPDATE, handleStateUpdate);

    // Create game - only once
    const createGame = () => {
      if (!createdRef.current) {
        createdRef.current = true;
        socket.emit(HOST_CREATE_GAME);
      }
    };

    if (socket.connected) {
      createGame();
    } else {
      socket.on('connect', createGame);
    }

    return () => {
      socket.off(GAME_STATE_UPDATE, handleStateUpdate);
      socket.off('connect', createGame);
    };
  }, []);

  useEffect(() => {
    if (gameState?.roomCode) {
      const url = `${window.location.origin}/play?room=${gameState.roomCode}`;
      setJoinURL(url);
    }
  }, [gameState?.roomCode]);

  // Navigate to game when started
  useEffect(() => {
    if (gameState && gameState.phase !== 'LOBBY') {
      navigate('/host/game', { state: { initialGameState: gameState } });
    }
  }, [gameState?.phase, navigate]);

  const handleAssignTeam = (playerSocketId, teamId) => {
    socketRef.current?.emit(HOST_ASSIGN_TEAM, { playerSocketId, teamId });
  };

  const handleStartGame = () => {
    socketRef.current?.emit(HOST_START_GAME);
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-cyber-green text-xl">Initializing lobby...</div>
      </div>
    );
  }

  const teamsWithPlayers = gameState.teams.filter(t =>
    t.players.some(p => p.role === 'typist')
  );
  const canStart = teamsWithPlayers.length >= 2;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-cyber-green mb-2">
            HOST LOBBY
          </h1>
          <div className="text-cyber-cyan text-2xl font-mono">
            Room Code: {gameState.roomCode}
          </div>
        </div>

        {/* QR Code + Join URL */}
        <div className="flex justify-center mb-8">
          <div className="text-center">
            <QRCode url={joinURL} size={240} />
            <div className="mt-4 text-cyber-text text-sm">
              <div className="mb-1">Players scan to join:</div>
              <code className="cyber-input px-3 py-2 inline-block text-cyber-cyan">
                {joinURL}
              </code>
            </div>
          </div>
        </div>

        {/* Two-column layout: Teams | Waiting Players */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Left: Team Cards (3x2 grid) */}
          <div>
            <h2 className="text-2xl font-display font-bold text-cyber-cyan mb-4">
              Teams
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {gameState.teams.map(team => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          </div>

          {/* Right: Unassigned Players */}
          <div>
            <h2 className="text-2xl font-display font-bold text-cyber-cyan mb-4">
              Waiting Players ({gameState.waitingPlayers?.length || 0})
            </h2>
            {gameState.waitingPlayers?.length === 0 ? (
              <div className="cyber-card p-6 text-center text-cyber-text-dim italic">
                No players waiting. Share the QR code!
              </div>
            ) : (
              <div className="space-y-3">
                {gameState.waitingPlayers.map(player => (
                  <div key={player.socketId} className="cyber-card p-3 flex items-center justify-between">
                    <span className="text-cyber-text font-medium">{player.name}</span>
                    <select
                      className="cyber-input text-sm px-3 py-1 cursor-pointer"
                      onChange={(e) => handleAssignTeam(player.socketId, e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>Assign to team...</option>
                      {gameState.teams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.virus.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Start Game Button */}
        <div className="flex justify-center">
          <button
            onClick={handleStartGame}
            disabled={!canStart}
            className={`
              px-8 py-4 text-xl font-display font-bold
              ${canStart
                ? 'cyber-btn-primary'
                : 'bg-cyber-bg-card text-cyber-text-dim cursor-not-allowed'
              }
            `}
          >
            {canStart
              ? `START GAME (${teamsWithPlayers.length} teams ready)`
              : 'Need at least 2 teams to start'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
