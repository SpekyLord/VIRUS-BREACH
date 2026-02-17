import { useState, useCallback } from 'react';
import { useSocketEvent } from './useSocket';
import { GAME_STATE_UPDATE } from '../../../shared/events';

export function useGameState() {
  const [gameState, setGameState] = useState(null);

  const handleStateUpdate = useCallback((state) => {
    console.log('[useGameState] Received GAME_STATE_UPDATE:', state);
    setGameState(state);
  }, []);

  useSocketEvent(GAME_STATE_UPDATE, handleStateUpdate);
  return gameState;
}
