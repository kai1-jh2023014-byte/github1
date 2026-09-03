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
  | "hardDrop"
  | "hold";

export interface GameSnapshot {
  board: Board;
  current: ActivePiece | null;
  next: TetrominoType | null;
  nextQueue: TetrominoType[];
  hold: TetrominoType | null;
  canHold: boolean;
  combo: number;
  backToBack: boolean;
  score: number;
  level: number;
  lines: number;
  status: GameStatus;
  ghost: ActivePiece | null;
  stats: {
    holds: number;
    tSpins: number;
    tSpinMinis: number;
    maxCombo: number;
    b2bClears: number;
    perfectClears: number;
    tetrises: number;
  };
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
