import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSocket } from '../socket';
import { PLAYER_JOIN, GAME_STATE_UPDATE, ERROR } from '../../../shared/events';

export default function PlayerJoin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('room');

  const [roomCodeInput, setRoomCodeInput] = useState(roomCode || '');
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [showRoomCodeEntry, setShowRoomCodeEntry] = useState(!roomCode);
  const [roomNotFound, setRoomNotFound] = useState(false);

  const socketRef = useRef(null);
  const joinedRef = useRef(false); // Prevent double-join from React Strict Mode

  // Update showRoomCodeEntry when roomCode changes
  useEffect(() => {
    if (roomCode) {
      setShowRoomCodeEntry(false);
    }
  }, [roomCode]);

  useEffect(() => {
    // If no room code in URL, show room code entry form
    if (!roomCode) {
      setShowRoomCodeEntry(true);
      return;
    }

    const socket = getSocket();
    socketRef.current = socket;

    const handleStateUpdate = (state) => {
      setGameState(state);
      setRoomNotFound(false); // Room exists if we got state
    };

    const handleError = (errorData) => {
      if (errorData?.message?.includes('Room not found') || errorData?.message?.includes('Room not found')) {
        setRoomNotFound(true);
        setError('Room not found. Please check the code and try again.');
        setHasJoined(false);
        joinedRef.current = false;
      } else {
        setError(errorData?.message || 'An error occurred');
      }
    };

    socket.on(GAME_STATE_UPDATE, handleStateUpdate);
    socket.on(ERROR, handleError);

    return () => {
      socket.off(GAME_STATE_UPDATE, handleStateUpdate);
      socket.off(ERROR, handleError);
    };
  }, [roomCode, navigate]);

  // Navigate to game when it starts
  useEffect(() => {
    if (gameState && gameState.phase !== 'LOBBY') {
      navigate('/play/game', { state: { initialGameState: gameState } });
    }
  }, [gameState?.phase, navigate]);

  const handleRoomCodeSubmit = (e) => {
    e.preventDefault();

    if (!roomCodeInput.trim()) {
      setError('Please enter a room code');
      return;
    }

    const code = roomCodeInput.trim().toUpperCase();
    setError('');
    navigate(`/play?room=${code}`);
  };

  const handleGoBack = () => {
    setRoomNotFound(false);
    setShowRoomCodeEntry(true);
    setError('');
    setPlayerName('');
    navigate('/play');
  };

  const handleJoin = (e) => {
    e.preventDefault();

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (playerName.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }

    if (joinedRef.current) return; // Already joined
    joinedRef.current = true;

    setError('');
    setHasJoined(true);

    socketRef.current?.emit(PLAYER_JOIN, {
      roomCode,
      playerName: playerName.trim(),
    });
  };

  const myTeam = gameState?.teams?.find(t => t.id === gameState.myTeamId);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-cyber-green mb-2">
            VIRUS BREACH
          </h1>
          {roomCode && (
            <div className="text-cyber-cyan font-mono text-sm sm:text-base">
              Room: {roomCode}
            </div>
          )}
        </div>

        {/* Room Not Found Error */}
        {roomNotFound && (
          <div className="cyber-card p-6 text-center space-y-4 mb-6">
            <div className="text-red-400 text-xl font-display font-bold">
              ⚠ ROOM NOT FOUND
            </div>
            <div className="text-cyber-text text-sm">
              {error || 'The room code you entered does not exist.'}
            </div>
            <button
              onClick={handleGoBack}
              className="cyber-btn-primary w-full py-3 text-base font-display font-bold"
            >
              GO BACK
            </button>
          </div>
        )}

        {/* Room Code Entry - Show if no room code in URL */}
        {showRoomCodeEntry && !roomNotFound && (
          <form onSubmit={handleRoomCodeSubmit} className="cyber-card p-6 space-y-4">
            <div>
              <label className="block text-cyber-text text-sm font-medium mb-2">
                Enter Room Code
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={4}
                className="cyber-input w-full px-4 py-3 text-base text-center font-mono tracking-widest"
                placeholder="ABCD"
                autoFocus
              />
              {error && (
                <div className="text-red-400 text-sm mt-2">{error}</div>
              )}
            </div>

            <button
              type="submit"
              className="cyber-btn-green w-full py-4 text-lg font-display font-bold"
            >
              CONTINUE
            </button>
          </form>
        )}

        {/* Join Form - Show if not joined yet */}
        {!showRoomCodeEntry && !hasJoined && !roomNotFound && (
          <form onSubmit={handleJoin} className="cyber-card p-6 space-y-4">
            <div>
              <label className="block text-cyber-text text-sm font-medium mb-2">
                Enter Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                className="cyber-input w-full px-4 py-3 text-base"
                placeholder="Your name..."
                autoFocus
              />
              {error && (
                <div className="text-red-400 text-sm mt-2">{error}</div>
              )}
            </div>

            <button
              type="submit"
              className="cyber-btn-green w-full py-4 text-lg font-display font-bold"
            >
              JOIN GAME
            </button>
          </form>
        )}

        {/* Waiting State - Show after join */}
        {!showRoomCodeEntry && hasJoined && !roomNotFound && (
          <div className="cyber-card p-6 text-center space-y-4">
            <div className="text-cyber-green text-xl sm:text-2xl font-display font-bold">
              {playerName}
            </div>

            {!myTeam ? (
              // Waiting for team assignment
              <>
                <div className="text-cyber-text">
                  Waiting for host to assign you to a team...
                </div>
                <div className="flex justify-center">
                  <div className="animate-pulse text-cyber-cyan text-3xl">▸</div>
                </div>
              </>
            ) : (
              // Assigned to team
              <>
                <div className="text-cyber-text text-sm mb-2">
                  Assigned to team:
                </div>
                <div
                  className="text-2xl sm:text-3xl font-display font-bold py-3 px-4 border-2 rounded"
                  style={{
                    color: myTeam.virusColor || '#00ff41',
                    borderColor: myTeam.virusColor || '#00ff41',
                  }}
                >
                  {myTeam.virusName || myTeam.name}
                </div>
                <div className="text-cyber-text text-sm mt-4">
                  Waiting for game to start...
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="text-center text-cyber-text-dim text-xs mt-6">
          {showRoomCodeEntry
            ? 'Get the room code from your host or scan the QR code'
            : 'Keep this page open during the game'
          }
        </div>
      </div>
    </div>
  );
}
