export const TIMER_DURATIONS = {
  SHORT: 30,
  MEDIUM: 45,
  DEFAULT: 60,
  LONG: 90,
};

export const MAX_TEAMS = 6;
export const MIN_TEAMS_TO_START = 2;
export const MAX_TEAM_NAME_LENGTH = 20;
export const MAX_ANSWER_LENGTH = 500;
export const ROOM_CODE_LENGTH = 4;
export const AI_REVEAL_SPEED_MS = 30; // ms per character for typewriter

export const VIRUS_ROSTER = [
  { name: 'TROJAN', color: '#ff0040' },
  { name: 'WORM', color: '#00ff41' },
  { name: 'RANSOMWARE', color: '#ff6600' },
  { name: 'SPYWARE', color: '#00d4ff' },
  { name: 'MALWARE', color: '#bf00ff' },
  { name: 'BOTNET', color: '#ffdd00' },
];

export const GAME_PHASES = {
  LOBBY: 'LOBBY',
  INTRO: 'INTRO',
  SCENARIO: 'SCENARIO',
  REVEAL: 'REVEAL',
  OUTCOMES: 'OUTCOMES',
  WINNER: 'WINNER',
  GAME_OVER: 'GAME_OVER',
};

export const DIFFICULTY = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};
