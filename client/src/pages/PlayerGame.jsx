import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSocket } from '../socket';
import Timer from '../components/Timer';
import {
  GAME_STATE_UPDATE,
  GAME_SCENARIO,
  GAME_TIMES_UP,
  PLAYER_SUBMIT_ANSWER,
  PLAYER_TYPING,
  PLAYER_REJOIN,
} from '../../../shared/events';

export default function PlayerGame() {
  const navigate = useNavigate();
  const location = useLocation();

  // Seed with state passed from PlayerResults or PlayerJoin to avoid "Connecting..." flash
  const [gameState, setGameState] = useState(location.state?.initialGameState || null);
  const [scenario, setScenario] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [timesUp, setTimesUp] = useState(false);

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const playerNameRef = useRef(location.state?.playerName);

  // Save playerName and roomCode to sessionStorage when we get valid state
  useEffect(() => {
    if (gameState?.roomCode && playerNameRef.current) {
      sessionStorage.setItem('playerRoomCode', gameState.roomCode);
      sessionStorage.setItem('playerName', playerNameRef.current);
    }
  }, [gameState?.roomCode]);

  // Restore playerName from sessionStorage if not in location.state
  useEffect(() => {
    if (!playerNameRef.current) {
      const savedPlayerName = sessionStorage.getItem('playerName');
      if (savedPlayerName) {
        playerNameRef.current = savedPlayerName;
      }
    }
  }, []);

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
        console.log('[PlayerGame] Rejoining as:', playerName, 'in room:', roomCode);
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

    const handleScenario = (data) => {
      setScenario(data);
      setAnswer('');
      setSubmitted(false);
      setTimesUp(false);
    };

    const handleTimesUp = () => {
      setTimesUp(true);
    };

    socket.on(GAME_STATE_UPDATE, handleStateUpdate);
    socket.on(GAME_SCENARIO, handleScenario);
    socket.on(GAME_TIMES_UP, handleTimesUp);

    return () => {
      socket.off('connect', handleReconnect);
      socket.off(GAME_STATE_UPDATE, handleStateUpdate);
      socket.off(GAME_SCENARIO, handleScenario);
      socket.off(GAME_TIMES_UP, handleTimesUp);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [navigate, gameState?.roomCode]);

  // Navigate to results when round ends
  useEffect(() => {
    if (!gameState) return;
    const { phase } = gameState;
    if (phase === 'REVEAL' || phase === 'OUTCOMES' || phase === 'WINNER' || phase === 'GAME_OVER') {
      navigate('/play/results', { state: { initialGameState: gameState } });
    }
  }, [gameState?.phase, navigate]);

  const handleTyping = (e) => {
    setAnswer(e.target.value);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit(PLAYER_TYPING);
    }, 500);
  };

  const handleSubmit = () => {
    if (!answer.trim() || submitted || timesUp) return;
    setSubmitted(true);
    socketRef.current?.emit(PLAYER_SUBMIT_ANSWER, { answer: answer.trim() });
  };

  // Loading state — only show if truly no state at all
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-cyber-green font-mono animate-pulse">Connecting...</div>
      </div>
    );
  }

  const phase = gameState.phase;

  // INTRO phase — waiting for host to start scenario
  if (phase === 'INTRO' || phase === 'LOBBY') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-display font-bold text-cyber-green mb-4 text-center">
          ROUND {gameState.currentRound?.number || '?'}
        </h1>
        <div className="cyber-card p-6 text-center max-w-sm w-full">
          <p className="text-cyber-cyan font-mono animate-pulse mb-4">
            Waiting for host to start scenario...
          </p>
          <div className="flex justify-center gap-2 text-cyber-green text-2xl">
            <span className="animate-pulse" style={{ animationDelay: '0ms' }}>▸</span>
            <span className="animate-pulse" style={{ animationDelay: '200ms' }}>▸</span>
            <span className="animate-pulse" style={{ animationDelay: '400ms' }}>▸</span>
          </div>
        </div>
      </div>
    );
  }

  // SCENARIO phase — active gameplay
  if (phase === 'SCENARIO') {
    // Fall back to gameState.currentRound if GAME_SCENARIO event was missed (e.g. mid-navigation)
    const scenarioText = scenario?.text || gameState.currentRound?.scenario?.text;
    const timerEndsAt = scenario?.timerEndsAt || gameState.currentRound?.timerEndsAt;
    const timerDuration = scenario?.timerDuration || gameState.config?.timerDuration || 60;
    const roundNumber = scenario?.scenarioId || gameState.currentRound?.number;

    return (
      <div className="min-h-screen flex flex-col p-4 max-w-sm mx-auto w-full">
        {/* Timer + round row */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-cyber-cyan font-display font-bold text-lg">
            ROUND {roundNumber}
          </div>
          {timerEndsAt && (
            <Timer
              timerEndsAt={timerEndsAt}
              timerDuration={timerDuration}
              size={72}
            />
          )}
        </div>

        {/* Scenario text */}
        <div className="cyber-card p-4 mb-4">
          <p className="text-cyber-text font-mono text-base leading-relaxed">
            {scenarioText || 'Loading scenario...'}
          </p>
        </div>

        {/* Answer area */}
        {!submitted ? (
          <div className="space-y-3 mt-auto">
            {timesUp && (
              <div className="text-center text-red-400 font-display font-bold text-lg">
                TIME'S UP!
              </div>
            )}
            <textarea
              value={answer}
              onChange={handleTyping}
              disabled={timesUp}
              placeholder={timesUp ? "Time's up! Submitting..." : "Type your team's response here..."}
              className="cyber-input w-full p-3 text-base min-h-[120px] resize-none"
              maxLength={500}
            />
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || timesUp}
              className="cyber-btn-green w-full py-4 text-xl font-display font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              SUBMIT ANSWER
            </button>
            <div className="text-right text-cyber-text-dim text-xs font-mono">
              {answer.length}/500
            </div>
          </div>
        ) : (
          <div className="mt-auto cyber-card p-6 text-center">
            <div className="text-cyber-green text-5xl mb-3">✓</div>
            <div className="text-cyber-green font-display font-bold text-xl mb-2">
              ANSWER SUBMITTED
            </div>
            <div className="text-cyber-text-dim font-mono text-sm">
              Waiting for other teams...
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback — should navigate away quickly via useEffect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-cyber-cyan font-mono animate-pulse">Loading results...</div>
    </div>
  );
}
