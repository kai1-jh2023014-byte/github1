import { COLS, ROWS } from "./constants";
import { cloneBoard } from "./board";
import { pieceCells } from "./piece";
import type { ActivePiece, Board } from "./types";

export function lockPiece(board: Board, piece: ActivePiece): Board {
  const next = cloneBoard(board);
  for (const cell of pieceCells(piece)) {
    if (cell.y >= 0 && cell.y < ROWS && cell.x >= 0 && cell.x < COLS) {
      next[cell.y][cell.x] = piece.type;
    }
  }
  return next;
}

export function pieceHasCellsAboveBoard(piece: ActivePiece): boolean {
  return pieceCells(piece).some((cell) => cell.y < 0);
}

export function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = ROWS - remaining.length;
  if (cleared === 0) return { board, cleared: 0 };
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(0));
  return { board: [...empty, ...remaining], cleared };
}

export function placeAndClear(
  board: Board,
  piece: ActivePiece,
): { board: Board; cleared: number } {
  return clearLines(lockPiece(board, piece));
}
