// Client → Server events
export const HOST_CREATE_GAME = 'host:create-game';
export const HOST_REQUEST_STATE = 'host:request-state';
export const HOST_ASSIGN_TEAM = 'host:assign-team';
export const HOST_START_GAME = 'host:start-game';
export const HOST_NEXT_SCENARIO = 'host:next-scenario';
export const HOST_PROCESS_ANSWERS = 'host:process-answers';
export const HOST_REVEAL_WINNER = 'host:reveal-winner';
export const HOST_END_GAME = 'host:end-game';

export const PLAYER_JOIN = 'player:join';
export const PLAYER_REJOIN = 'player:rejoin';
export const PLAYER_SUBMIT_ANSWER = 'player:submit-answer';
export const PLAYER_TYPING = 'player:typing';

// Server → Client events
export const GAME_STATE_UPDATE = 'game:state-update';
export const GAME_SCENARIO = 'game:scenario';
export const GAME_TEAM_SUBMITTED = 'game:team-submitted';
export const GAME_TYPING_INDICATOR = 'game:typing-indicator';
export const GAME_TIMES_UP = 'game:times-up';
export const GAME_ALL_ANSWERS = 'game:all-answers';
export const GAME_OUTCOME = 'game:outcome';
export const GAME_WINNER = 'game:winner';
export const GAME_VIRUS_TAUNT = 'game:virus-taunt';
export const GAME_SCOREBOARD = 'game:scoreboard';
export const GAME_OVER = 'game:over';

// Error events
export const ERROR = 'game:error';
