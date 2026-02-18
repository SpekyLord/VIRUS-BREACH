import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSocket } from '../socket';
import { useSpeech } from '../hooks/useSpeech';
import ScenarioCard from '../components/ScenarioCard';
import Timer from '../components/Timer';
import OutcomeCard from '../components/OutcomeCard';
import VirusTaunt from '../components/VirusTaunt';
import {
  GAME_STATE_UPDATE,
  GAME_SCENARIO,
  GAME_TEAM_SUBMITTED,
  GAME_TYPING_INDICATOR,
  GAME_TIMES_UP,
  GAME_ALL_ANSWERS,
  GAME_OUTCOME,
  GAME_WINNER,
  GAME_VIRUS_TAUNT,
  GAME_SCOREBOARD,
  GAME_OVER,
  HOST_NEXT_SCENARIO,
  HOST_PROCESS_ANSWERS,
  HOST_REVEAL_WINNER,
  HOST_END_GAME,
  HOST_REQUEST_STATE,
} from '../../../shared/events';

export default function HostGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialState = location.state?.initialGameState || null;

  const [gameState, setGameState] = useState(initialState);
  const [scenario, setScenario] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [typingTeams, setTypingTeams] = useState(new Set());
  const [allAnswers, setAllAnswers] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [shownOutcomeCount, setShownOutcomeCount] = useState(0);
  const [winner, setWinner] = useState(null);
  const [taunts, setTaunts] = useState({});

  const socketRef = useRef(null);
  const stateReceivedRef = useRef(initialState !== null); // True if we got initial state

  const { speak, cancel, muted, toggleMute } = useSpeech();

  // Save room code to sessionStorage when we get valid state
  useEffect(() => {
    if (gameState?.roomCode) {
      sessionStorage.setItem('hostRoomCode', gameState.roomCode);
    }
  }, [gameState?.roomCode]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Get saved room code for recovery (if any)
    const savedRoomCode = sessionStorage.getItem('hostRoomCode');

    // Auto-request state on reconnect OR initial connect
    const handleReconnect = () => {
      if (savedRoomCode && !stateReceivedRef.current) {
        console.log('[HostGame] Requesting state for room:', savedRoomCode);
        socket.emit(HOST_REQUEST_STATE, { roomCode: savedRoomCode });
      }
    };

    // If socket is already connected, try recovery immediately
    if (socket.connected) {
      handleReconnect();
    }

    // Also listen for future connect events
    socket.on('connect', handleReconnect);

    const handleStateUpdate = (state) => {
      setGameState(state);
      stateReceivedRef.current = true;
    };

    const handleScenario = (data) => {
      setScenario(data);
      setSubmissions({});
      setTypingTeams(new Set());
      setAllAnswers([]);
      setOutcomes([]);
      setShownOutcomeCount(0);
      setWinner(null);
      setTaunts({});
    };

    const handleTeamSubmitted = ({ teamId }) => {
      setSubmissions(prev => ({ ...prev, [teamId]: true }));
      setTypingTeams(prev => {
        const next = new Set(prev);
        next.delete(teamId);
        return next;
      });
    };

    const handleTyping = ({ teamId }) => {
      setTypingTeams(prev => new Set(prev).add(teamId));
      setTimeout(() => {
        setTypingTeams(prev => {
          const next = new Set(prev);
          next.delete(teamId);
          return next;
        });
      }, 2000);
    };

    const handleTimesUp = () => {
      // Timer expired, just visual feedback
    };

    const handleAllAnswers = ({ answers }) => {
      setAllAnswers(answers || []);
    };

    const handleOutcome = ({ teamId, teamName, outcome }) => {
      setOutcomes(prev => [...prev, { teamId, teamName, outcome }]);
    };

    const handleWinner = ({ winnerTeamIds, reasoning }) => {
      setWinner({ winnerTeamIds, reasoning });
    };

    const handleTaunts = ({ taunts }) => {
      setTaunts(taunts);
    };

    const handleScoreboard = () => {
      // Scoreboard updated, just visual feedback
    };

    const handleGameOver = (data) => {
      navigate('/host/scoreboard', { state: { gameOverData: data } });
    };

    // Fallback: if no state received, navigate back to lobby
    // Give more time (5s) if recovering from sessionStorage, otherwise 3s
    const timeoutDuration = savedRoomCode ? 5000 : 3000;

    const timeoutId = setTimeout(() => {
      if (!stateReceivedRef.current) {
        console.warn('[HostGame] No state received, navigating back to lobby');
        navigate('/host');
      }
    }, timeoutDuration);

    socket.on(GAME_STATE_UPDATE, handleStateUpdate);
    socket.on(GAME_SCENARIO, handleScenario);
    socket.on(GAME_TEAM_SUBMITTED, handleTeamSubmitted);
    socket.on(GAME_TYPING_INDICATOR, handleTyping);
    socket.on(GAME_TIMES_UP, handleTimesUp);
    socket.on(GAME_ALL_ANSWERS, handleAllAnswers);
    socket.on(GAME_OUTCOME, handleOutcome);
    socket.on(GAME_WINNER, handleWinner);
    socket.on(GAME_VIRUS_TAUNT, handleTaunts);
    socket.on(GAME_SCOREBOARD, handleScoreboard);
    socket.on(GAME_OVER, handleGameOver);

    return () => {
      clearTimeout(timeoutId);
      socket.off('connect', handleReconnect);
      socket.off(GAME_STATE_UPDATE, handleStateUpdate);
      socket.off(GAME_SCENARIO, handleScenario);
      socket.off(GAME_TEAM_SUBMITTED, handleTeamSubmitted);
      socket.off(GAME_TYPING_INDICATOR, handleTyping);
      socket.off(GAME_TIMES_UP, handleTimesUp);
      socket.off(GAME_ALL_ANSWERS, handleAllAnswers);
      socket.off(GAME_OUTCOME, handleOutcome);
      socket.off(GAME_WINNER, handleWinner);
      socket.off(GAME_VIRUS_TAUNT, handleTaunts);
      socket.off(GAME_SCOREBOARD, handleScoreboard);
      socket.off(GAME_OVER, handleGameOver);
    };
  }, [navigate]);

  // Auto-reveal the first outcome as soon as it arrives
  useEffect(() => {
    if (outcomes.length > 0 && shownOutcomeCount === 0) {
      setShownOutcomeCount(1);
    }
  }, [outcomes.length, shownOutcomeCount]);

  // Navigate to scoreboard when game ends (fallback if GAME_OVER event was missed)
  useEffect(() => {
    if (gameState?.phase === 'GAME_OVER') {
      navigate('/host/scoreboard', { state: { gameState } });
    }
  }, [gameState?.phase, navigate]);

  // Speak scenario text the moment it arrives (syncs with typewriter on screen)
  useEffect(() => {
    if (scenario?.text) speak(scenario.text);
  }, [scenario?.text]);

  // Speak each outcome as the host reveals it (cancels previous speech automatically)
  useEffect(() => {
    if (shownOutcomeCount > 0 && outcomes[shownOutcomeCount - 1]) {
      const { teamName, outcome } = outcomes[shownOutcomeCount - 1];
      speak(`${teamName}. ${outcome.text}`);
    }
  }, [shownOutcomeCount]);

  // Speak winner announcement — only once phase is actually WINNER
  useEffect(() => {
    if (!winner || gameState?.phase !== 'WINNER') return;
    if (winner.winnerTeamIds.length === 0) {
      speak('No winner this round.');
    } else {
      const names = winner.winnerTeamIds
        .map(id => gameState?.teams?.find(t => t.id === id)?.virus?.name || id)
        .join(' and ');
      speak(`Round winner: ${names}!`);
    }
  }, [winner, gameState?.phase]);

  const handleStartScenario = () => {
    socketRef.current?.emit(HOST_NEXT_SCENARIO);
  };

  const handleNextScenario = () => {
    socketRef.current?.emit(HOST_NEXT_SCENARIO);
  };

  const handleProcessAnswers = () => {
    socketRef.current?.emit(HOST_PROCESS_ANSWERS);
  };

  const handleEndGame = () => {
    socketRef.current?.emit(HOST_END_GAME);
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-cyber-green text-xl">Loading game...</div>
      </div>
    );
  }

  const phase = gameState.phase;
  const assignedTeams = gameState.teams?.filter(t => t.players && t.players.length > 0) || [];
  const nextRoundNumber = (gameState.currentRound?.number || 0) + 1;

  // Narrator mute toggle — fixed bottom-right, visible on all phases
  const narratorBtn = (
    <button
      onClick={toggleMute}
      className="fixed bottom-4 right-4 z-50 bg-cyber-bg-card border border-gray-600 hover:border-cyber-cyan px-3 py-2 text-xs font-mono transition-colors rounded"
    >
      {muted ? '🔇 MUTED' : '🔊 NARRATOR'}
    </button>
  );

  // INTRO phase - Ready for next round
  if (phase === 'INTRO') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 animate-fade-in">
        {narratorBtn}
        <div className="text-center">
          <h1 className="text-5xl font-display font-bold text-cyber-green mb-8">
            READY FOR ROUND {nextRoundNumber}?
          </h1>
          <button
            onClick={handleStartScenario}
            className="cyber-btn-green px-12 py-6 text-2xl font-display font-bold"
          >
            START SCENARIO
          </button>
        </div>
      </div>
    );
  }

  // SCENARIO phase - Active gameplay
  if (phase === 'SCENARIO') {
    return (
      <div className="min-h-screen p-8 animate-fade-in">
        {narratorBtn}
        <div className="max-w-7xl mx-auto">
          {/* Top: Scenario + Timer */}
          <div className="grid grid-cols-[1fr_auto] gap-8 mb-8">
            <ScenarioCard
              text={scenario?.text || ''}
              difficulty={scenario?.difficulty || 'MEDIUM'}
              roundNumber={scenario?.scenarioId || nextRoundNumber}
            />
            <Timer
              timerEndsAt={scenario?.timerEndsAt}
              timerDuration={scenario?.timerDuration || 60}
              size={140}
            />
          </div>

          {/* Team Submission Status */}
          <div className="grid grid-cols-3 gap-4">
            {assignedTeams.map(team => (
              <div key={team.id} className="cyber-card p-4">
                <div className="flex items-center justify-between">
                  <span
                    className="font-display font-bold"
                    style={{ color: team.virus.color }}
                  >
                    {team.virus.name}
                  </span>
                  {submissions[team.id] ? (
                    <span className="text-cyber-green text-2xl">✓</span>
                  ) : typingTeams.has(team.id) ? (
                    <span className="text-cyber-cyan animate-pulse">⋯</span>
                  ) : (
                    <span className="text-cyber-text-dim">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // REVEAL phase - Show all answers, host controls when to process
  if (phase === 'REVEAL') {
    return (
      <div className="min-h-screen p-8 animate-fade-in">
        {narratorBtn}
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-display font-bold text-cyber-cyan text-center mb-2">
            TIME'S UP — ALL ANSWERS IN
          </h1>
          <p className="text-cyber-text-dim text-center font-mono mb-8">
            Review the answers below, then click Continue when ready.
          </p>

          {/* Team answers */}
          <div className="grid gap-4 mb-10">
            {allAnswers.map(({ teamId, teamName, answer }) => {
              const team = gameState.teams.find(t => t.id === teamId);
              return (
                <div key={teamId} className="cyber-card p-5">
                  <div
                    className="font-display font-bold text-lg mb-2"
                    style={{ color: team?.virus?.color || '#00ff41' }}
                  >
                    {team?.virus?.name || teamName}
                  </div>
                  <p className="font-mono text-cyber-text">{answer}</p>
                </div>
              );
            })}
            {allAnswers.length === 0 && (
              <div className="text-center text-cyber-text-dim font-mono py-8">
                Collecting answers...
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleProcessAnswers}
              className="cyber-btn-green px-12 py-5 text-2xl font-display font-bold"
            >
              CONTINUE — LET AI JUDGE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // OUTCOMES phase - show outcomes one at a time, host clicks through them
  if (phase === 'OUTCOMES') {
    const shownOutcomes = outcomes.slice(0, shownOutcomeCount);
    const hasNextQueued = shownOutcomeCount < outcomes.length;
    const allArrived = outcomes.length >= assignedTeams.length;
    const allShown = shownOutcomeCount >= outcomes.length && outcomes.length > 0;

    return (
      <div className="min-h-screen p-8 animate-fade-in">
        {narratorBtn}
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-display font-bold text-cyber-green text-center mb-8">
            CONSEQUENCES
          </h1>

          {/* Show revealed outcomes */}
          <div className="space-y-4 mb-8">
            {shownOutcomes.map(({ teamId, teamName, outcome }) => {
              const team = gameState.teams.find(t => t.id === teamId);
              return (
                <OutcomeCard
                  key={teamId}
                  teamName={team?.virus?.name || teamName}
                  teamColor={team?.virus?.color || '#00ff41'}
                  outcomeText={outcome.text}
                  rating={outcome.rating}
                />
              );
            })}
            {shownOutcomes.length === 0 && (
              <div className="text-center text-cyber-cyan font-mono animate-pulse py-8">
                Generating outcomes...
              </div>
            )}
          </div>

          {/* Action button area */}
          <div className="flex justify-center">
            {hasNextQueued ? (
              <button
                onClick={() => setShownOutcomeCount(c => c + 1)}
                className="cyber-btn-green px-12 py-5 text-2xl font-display font-bold"
              >
                NEXT OUTCOME ({shownOutcomeCount}/{outcomes.length})
              </button>
            ) : allShown && allArrived ? (
              <button
                onClick={() => { cancel(); socketRef.current?.emit(HOST_REVEAL_WINNER); }}
                className="cyber-btn-green px-12 py-5 text-2xl font-display font-bold"
              >
                CONTINUE TO RESULTS
              </button>
            ) : allShown && !allArrived ? (
              <div className="text-cyber-cyan font-mono animate-pulse text-lg">
                Generating next outcome...
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // WINNER phase - Winner announcement + taunts + scoreboard
  if (phase === 'WINNER') {
    return (
      <div className="min-h-screen p-8 animate-fade-in">
        {narratorBtn}
        <div className="max-w-6xl mx-auto">
          {/* Winner announcement */}
          {winner && (
            <>
              {winner.winnerTeamIds.length === 0 ? (
                <div className="cyber-card p-6 text-center border-2 border-yellow-400 mb-8">
                  <h1 className="text-3xl font-display font-bold text-yellow-400 mb-2">
                    NO WINNER THIS ROUND
                  </h1>
                  <p className="text-cyber-text font-mono">
                    {winner.reasoning}
                  </p>
                </div>
              ) : (
                <div className="text-center mb-8">
                  <h1 className="text-5xl font-display font-bold text-cyber-green mb-4">
                    ROUND WINNER{winner.winnerTeamIds.length > 1 ? 'S' : ''}
                  </h1>
                  <div className="flex justify-center gap-6 mb-4">
                    {winner.winnerTeamIds.map(teamId => {
                      const team = gameState.teams.find(t => t.id === teamId);
                      const color = team?.virus?.color || '#00ff41';
                      return (
                        <div
                          key={teamId}
                          className="px-8 py-4 border-4 rounded-lg font-display text-3xl font-bold animate-winner-glow"
                          style={{
                            color,
                            borderColor: color,
                            '--glow-color': color,
                          }}
                        >
                          {team?.virus?.name || teamId}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-cyber-text font-mono text-lg italic">
                    {winner.reasoning}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Virus Taunts */}
          {Object.keys(taunts).length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-cyber-cyan mb-4 text-center">
                VIRUS COMMENTARY
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(taunts).map(([teamId, tauntText]) => {
                  const team = gameState.teams.find(t => t.id === teamId);
                  return (
                    <VirusTaunt
                      key={teamId}
                      teamName={team?.virus?.name || teamId}
                      teamColor={team?.virus?.color || '#00ff41'}
                      tauntText={tauntText}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Scoreboard */}
          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-cyber-cyan mb-4 text-center">
              SCOREBOARD
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {gameState.teams
                .filter(t => t.players && t.players.length > 0)
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map(team => (
                  <div key={team.id} className="cyber-card p-4 text-center">
                    <div
                      className="font-display font-bold text-xl mb-2"
                      style={{ color: team.virus.color }}
                    >
                      {team.virus.name}
                    </div>
                    <div className="text-4xl font-display font-bold text-cyber-green">
                      {team.score || 0}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleNextScenario}
              className="cyber-btn-green px-8 py-4 text-xl font-display font-bold"
            >
              NEXT SCENARIO
            </button>
            <button
              onClick={handleEndGame}
              className="cyber-btn-red px-8 py-4 text-xl font-display font-bold"
            >
              END GAME
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unknown phases
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-cyber-cyan text-xl">
        Unknown game phase: {phase}
      </div>
    </div>
  );
}
