import type { ActivePiece, Board, GameStatus, TetrominoType } from "../game/types";

export type GamePhase = GameStatus;

export interface TetrisGameExtras {
  score?: number;
  level?: number;
  lines?: number;
  garbage?: number;
  incomingGarbage?: number;
  combo?: number;
  backToBack?: boolean;
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
  phase: GamePhase;
  extras?: TetrisGameExtras;
}

export function emptyExtras(): TetrisGameExtras {
  return {};
}
