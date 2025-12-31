
export enum BingoFormat {
  B75 = '75',
  B90 = '90'
}

export enum GameStatus {
  LOBBY = 'lobby',
  PLAYING = 'playing',
  PAUSED = 'paused',
  FINISHED = 'finished'
}

export enum WinType {
  LINE = 'line',
  DOUBLE_LINE = 'double_line',
  COLUMN = 'column',
  DIAGONAL = 'diagonal',
  CORNERS = 'corners',
  FULL_HOUSE = 'full_house'
}

export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  cards: BingoCardData[];
}

export interface BingoCardData {
  id: string;
  numbers: (number | null)[];  // Flat array for Firestore compatibility
  marked: boolean[];           // Flat array
  format: BingoFormat;
  isWinner: boolean;
  winTypes: WinType[];
  almostBingo: boolean; // "Falta 1"
}

export interface GameSettings {
  format: BingoFormat;
  maxCardsPerPlayer: number;
  winConditions: WinType[];
  autoMark: boolean;
  ballInterval: number; // 0 for manual
}

export interface GameState {
  code: string;
  status: GameStatus;
  settings: GameSettings;
  drawnNumbers: number[];
  players: Player[];
  lastDrawn: number | null;
  winners: { playerId: string; username: string; cardId: string; winType: WinType }[];
}
