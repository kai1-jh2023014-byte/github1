import { COLS, ROWS } from "./constants";
import type { Board, Cell } from "./types";

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function columnHeights(board: Board): number[] {
  const heights = Array<number>(COLS).fill(0);
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (board[y][x] !== 0) {
        heights[x] = ROWS - y;
        break;
      }
    }
  }
  return heights;
}

export function occupiedCount(board: Board): number {
  let count = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] !== 0) count += 1;
    }
  }
  return count;
}
