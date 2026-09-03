export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export type Cell = 0 | TetrominoType;

export type Board = Cell[][];

export interface Point {
  x: number;
  y: number;
}

export interface ActivePiece {
  id: number;
  type: TetrominoType;
  rotation: number;
  x: number;
  y: number;
}

export type GameStatus = "ready" | "playing" | "paused" | "gameover";

export type GameAction =
  | "left"
  | "right"
  | "rotateCW"
  | "rotateCCW"
  | "softDrop"
  | "hardDrop";

export interface GameSnapshot {
  board: Board;
  current: ActivePiece | null;
  next: TetrominoType | null;
  score: number;
  level: number;
  lines: number;
  status: GameStatus;
  ghost: ActivePiece | null;
}

export const TETROMINO_TYPES: TetrominoType[] = [
  "I",
  "O",
  "T",
  "S",
  "Z",
  "J",
  "L",
];
