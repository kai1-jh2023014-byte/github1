import { COLS, ROWS } from "../../game/constants";
import type { ActivePiece, Board } from "../../game/types";
import type { TSpinKind } from "./hold";

/**
 * Guideline-style 3-corner T-spin.
 * Mini vs full: 3 occupied corners = mini, 4 = full.
 * Kick-table exceptions (fin/neo/iso 3-corner full) are unsupported.
 */
export function detectTSpin(
  board: Board,
  piece: ActivePiece,
  lastWasRotate: boolean,
): TSpinKind {
  if (!lastWasRotate || piece.type !== "T") return "none";
  const occupied = countTCorners(board, piece);
  if (occupied >= 4) return "full";
  if (occupied === 3) return "mini";
  return "none";
}

export function countTCorners(board: Board, piece: ActivePiece): number {
  let n = 0;
  for (const point of tCorners(piece)) {
    if (isOccupiedSlot(board, point.x, point.y)) n += 1;
  }
  return n;
}

function tCorners(piece: ActivePiece): { x: number; y: number }[] {
  return [
    { x: piece.x, y: piece.y },
    { x: piece.x + 2, y: piece.y },
    { x: piece.x, y: piece.y + 2 },
    { x: piece.x + 2, y: piece.y + 2 },
  ];
}

function isOccupiedSlot(board: Board, x: number, y: number): boolean {
  if (x < 0 || x >= COLS || y >= ROWS) return true;
  if (y < 0) return false;
  return board[y][x] !== 0;
}

export type { TSpinKind };
