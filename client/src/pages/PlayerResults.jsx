import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSocket } from '../socket';
import {
  GAME_STATE_UPDATE,
  GAME_OUTCOME,
  GAME_WINNER,
  GAME_VIRUS_TAUNT,
  PLAYER_REJOIN,
} from '../../../shared/events';

export default function PlayerResults() {
  const navigate = useNavigate();
  const location = useLocation();

  const [gameState, setGameState] = useState(location.state?.initialGameState || null);
  const [outcomes, setOutcomes] = useState([]);
  const [winner, setWinner] = useState(null);
  const [taunts, setTaunts] = useState({});

  const socketRef = useRef(null);
  const playerNameRef = useRef(
    location.state?.initialGameState?.myName || sessionStorage.getItem('playerName')
  );

  // Save playerName and roomCode to sessionStorage
  useEffect(() => {
    if (gameState?.roomCode && gameState?.myName) {
      sessionStorage.setItem('playerRoomCode', gameState.roomCode);
      sessionStorage.setItem('playerName', gameState.myName);
      playerNameRef.current = gameState.myName;
    }
  }, [gameState?.roomCode, gameState?.myName]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Auto-rejoin on reconnect or page refresh
    const handleReconnect = () => {
      let roomCode = gameState?.roomCode;
      let playerName = playerNameRef.current;

      // Try to get from sessionStorage if not in state
      if (!roomCode) {
        roomCode = sessionStorage.getItem('playerRoomCode');
      }
      if (!playerName) {
        playerName = sessionStorage.getItem('playerName');
        playerNameRef.current = playerName;
      }

      if (roomCode && playerName) {
        console.log('[PlayerResults] Rejoining as:', playerName, 'in room:', roomCode);
        socket.emit(PLAYER_REJOIN, { roomCode, playerName });
      }
    };

    // If socket is already connected, try rejoin immediately
    if (socket.connected) {
      handleReconnect();
    }

    // Also listen for future connect events
    socket.on('connect', handleReconnect);

    const handleStateUpdate = (state) => {
      setGameState(state);
    };

    const handleOutcome = ({ teamId, outcome }) => {
      setOutcomes(prev => [...prev, { teamId, outcome }]);
    };

    const handleWinner = ({ winnerTeamIds, reasoning }) => {
      setWinner({ winnerTeamIds, reasoning });
    };

    const handleTaunts = ({ taunts }) => {
      setTaunts(taunts);
    };

    socket.on(GAME_STATE_UPDATE, handleStateUpdate);
    socket.on(GAME_OUTCOME, handleOutcome);
    socket.on(GAME_WINNER, handleWinner);
    socket.on(GAME_VIRUS_TAUNT, handleTaunts);

    return () => {
      socket.off('connect', handleReconnect);
      socket.off(GAME_STATE_UPDATE, handleStateUpdate);
      socket.off(GAME_OUTCOME, handleOutcome);
      socket.off(GAME_WINNER, handleWinner);
      socket.off(GAME_VIRUS_TAUNT, handleTaunts);
    };
  }, [navigate]);

  // Navigate based on phase changes
  useEffect(() => {
    if (!gameState) return;
    const { phase } = gameState;
    if (phase === 'SCENARIO' || phase === 'INTRO') {
      // Reset for next round before navigating
      setOutcomes([]);
      setWinner(null);
      setTaunts({});
      navigate('/play/game', {
        state: {
          initialGameState: gameState,
          playerName: playerNameRef.current
        }
      });
    }
    if (phase === 'GAME_OVER') {
      navigate('/');
    }
  }, [gameState?.phase, navigate]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-cyber-green font-mono animate-pulse">Loading...</div>
      </div>
    );
  }

  const phase = gameState.phase;
  const myTeamId = gameState.myTeamId;
  const myTeam = gameState.teams?.find(t => t.id === myTeamId);
  const iWon = winner?.winnerTeamIds?.includes(myTeamId);

  // REVEAL phase — waiting for AI
  if (phase === 'REVEAL') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-display font-bold text-cyber-cyan mb-6 text-center">
          ALL ANSWERS IN
        </h2>
        <div className="cyber-card p-6 text-center max-w-sm w-full">
          <p className="text-cyber-text font-mono mb-4 animate-pulse">
            The AI is judging your responses...
          </p>
          <div className="flex justify-center gap-3 text-cyber-green text-3xl">
            <span className="animate-pulse" style={{ animationDelay: '0ms' }}>▸</span>
            <span className="animate-pulse" style={{ animationDelay: '200ms' }}>▸</span>
            <span className="animate-pulse" style={{ animationDelay: '400ms' }}>▸</span>
          </div>
        </div>
      </div>
    );
  }

  // OUTCOMES phase — watch the big screen, don't spoil it on the phone
  if (phase === 'OUTCOMES') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-display font-bold text-cyber-cyan mb-6 text-center">
          AI IS JUDGING
        </h2>
        <div className="cyber-card p-6 text-center max-w-sm w-full">
          <p className="text-cyber-green font-display font-bold text-lg mb-3">
            👀 Watch the big screen!
          </p>
          <p className="text-cyber-text-dim font-mono text-sm">
            The consequences are being revealed...
          </p>
        </div>
      </div>
    );
  }

  // WINNER phase — show winner + taunts + scores
  if (phase === 'WINNER') {
    const myTaunt = taunts[myTeamId];

    return (
      <div className="min-h-screen p-4 max-w-sm mx-auto w-full pb-8">
        {/* Win/Loss result for this player */}
        {winner && (
          <div className="text-center mb-6">
            {iWon ? (
              <div>
                <div className="text-4xl mb-2">🏆</div>
                <h2
                  className="text-2xl font-display font-bold mb-1"
                  style={{ color: myTeam?.virusColor || '#00ff41' }}
                >
                  YOUR TEAM WON!
                </h2>
                <p className="text-cyber-text-dim font-mono text-sm">
                  {winner.reasoning}
                </p>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-display font-bold text-cyber-text mb-1">
                  {winner.winnerTeamIds.length > 0 ? 'Not this round...' : 'No winner this round'}
                </h2>
                {winner.winnerTeamIds.length > 0 && (
                  <p className="text-cyber-text-dim font-mono text-sm">
                    {winner.reasoning}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Own team's virus taunt */}
        {myTaunt && myTeam && (
          <div
            className="cyber-card p-4 mb-4 border-2"
            style={{ borderColor: myTeam.virusColor || '#00ff41' }}
          >
            <div
              className="font-display font-bold text-sm mb-2"
              style={{ color: myTeam.virusColor || '#00ff41' }}
            >
              {myTeam.virusName} SAYS:
            </div>
            <p className="font-mono text-cyber-text text-sm italic">
              "{myTaunt}"
            </p>
          </div>
        )}

        {/* Scoreboard */}
        {gameState.teams && (
          <div>
            <h3 className="text-lg font-display font-bold text-cyber-cyan mb-3 text-center">
              SCOREBOARD
            </h3>
            <div className="space-y-2">
              {gameState.teams
                .filter(t => t.hasPlayer || t.players?.length > 0)
                .sort((a, b) => (b.points || b.score || 0) - (a.points || a.score || 0))
                .map((team, idx) => {
                  const isMyTeam = team.id === myTeamId;
                  const score = team.points ?? team.score ?? 0;
                  return (
                    <div
                      key={team.id}
                      className={`flex items-center justify-between p-3 rounded ${
                        isMyTeam ? 'cyber-card border' : 'bg-cyber-bg-card bg-opacity-50'
                      }`}
                      style={isMyTeam ? { borderColor: team.virusColor } : {}}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-cyber-text-dim font-mono text-sm w-4">
                          {idx + 1}.
                        </span>
                        <span
                          className={`font-display font-bold ${isMyTeam ? 'text-base' : 'text-sm'}`}
                          style={{ color: team.virusColor }}
                        >
                          {team.virusName} {isMyTeam ? '(YOU)' : ''}
                        </span>
                      </div>
                      <span
                        className={`font-display font-bold ${isMyTeam ? 'text-2xl' : 'text-xl'} text-cyber-green`}
                      >
                        {score}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <p className="text-center text-cyber-text-dim font-mono text-xs mt-6 animate-pulse">
          Waiting for next round...
        </p>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-cyber-cyan font-mono animate-pulse">Loading...</div>
    </div>
  );
}
