import type { ActivePiece, Board, GameStatus, TetrominoType } from "../game/types";

export type GamePhase = GameStatus;

export interface TetrisGameExtras {
  score?: number;
  level?: number;
  lines?: number;
  garbage?: number;
  incomingGarbage?: number;
  attack?: number;
  opponentBoard?: Board;
  lockDelayMs?: number;
  dasMs?: number;
  arrMs?: number;
}

export interface TetrisGameState {
  board: Board;
  current: ActivePiece | null;
  nextPieces: TetrominoType[];
  holdPiece: TetrominoType | null;
  canHold: boolean;
  combo: number;
  backToBack: boolean;
  phase: GamePhase;
  extras?: TetrisGameExtras;
}

export function emptyExtras(): TetrisGameExtras {
  return {};
}
