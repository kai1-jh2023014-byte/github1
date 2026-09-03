import { columnHeights } from "../game/board";
import { COLS, ROWS } from "../game/constants";
import { pieceCells } from "../game/piece";
import { placeAndClear } from "../game/lineClear";
import type { Board, TetrominoType } from "../game/types";
import { generateMoves } from "./moveGenerator";
import { DEFAULT_WEIGHTS } from "./weights";

export interface TetrisWell {
  col: number;
  depth: number;
}

/**
 * A 1-wide well with solid walls, no holes in the well column.
 * Depth is capped in scoring — deeper is not automatically better.
 */
export function findTetrisWell(board: Board, heights?: number[]): TetrisWell | null {
  const h = heights ?? columnHeights(board);
  let best: TetrisWell | null = null;
  for (let x = 0; x < COLS; x++) {
    const left = x === 0 ? ROWS : h[x - 1]!;
    const right = x === COLS - 1 ? ROWS : h[x + 1]!;
    if (left <= h[x]! || right <= h[x]!) continue;
    const depth = Math.min(left, right) - h[x]!;
    if (depth < 3) continue;
    if (columnHasHole(board, x, h[x]!)) continue;
    if (isTwoWide(h, x)) continue;
    if (!best || depth > best.depth) best = { col: x, depth };
  }
  return best;
}

function isTwoWide(heights: number[], x: number): boolean {
  const h = heights[x]!;
  if (x > 0 && Math.abs(heights[x - 1]! - h) <= 1) {
    const outer = x === 1 ? ROWS : heights[x - 2]!;
    if (outer >= h + 3) return true;
  }
  if (x < COLS - 1 && Math.abs(heights[x + 1]! - h) <= 1) {
    const outer = x === COLS - 2 ? ROWS : heights[x + 2]!;
    if (outer >= h + 3) return true;
  }
  return false;
}

function columnHasHole(board: Board, x: number, height: number): boolean {
  if (height === 0) return false;
  const top = ROWS - height;
  for (let y = top + 1; y < ROWS; y++) {
    if (board[y]![x] === 0) return true;
  }
  return false;
}

export function pieceCanOccupyColumn(board: Board, type: TetrominoType, col: number): boolean {
  for (const move of generateMoves(board, type)) {
    if (pieceCells(move.piece).some((cell) => cell.x === col && cell.y >= 0)) return true;
  }
  return false;
}

export function canITetris(board: Board): boolean {
  for (const move of generateMoves(board, "I")) {
    if (placeAndClear(board, move.piece).cleared === 4) return true;
  }
  return false;
}

/**
 * Leaf bonus for a usable tetris well and I availability.
 * Partially offsets the existing wells *penalty* for a qualifying 1-wide well
 * so Beam does not fill it for a single. Depth past 6 is not rewarded more.
 */
export function wellReservationFromWell(
  well: TetrisWell | null,
  heights: number[],
  hold: TetrominoType | null,
  nextCurrent: TetrominoType | null,
  nextQueue: TetrominoType[],
): number {
  if (!well) return 0;
  const maxHeight = heights.reduce((max, h) => Math.max(max, h), 0);

  const triangular = (well.depth * (well.depth + 1)) / 2;
  // Offset 60% of the wells penalty for this column only.
  const offset = -DEFAULT_WEIGHTS.wells * triangular * 0.6;

  let shape = 0;
  if (well.depth === 3) shape = 0.12;
  else if (well.depth === 4) shape = 0.32;
  else if (well.depth === 5) shape = 0.38;
  else if (well.depth === 6) shape = 0.3;
  else if (well.depth === 7 || well.depth === 8) shape = 0.16;
  else shape = 0.05;

  if (maxHeight >= 16) shape *= 0.2;
  else if (maxHeight >= 14) shape *= 0.45;
  else if (maxHeight <= 4) shape *= 0.35;

  let iValue = 0;
  if (well.depth >= 4) {
    if (hold === "I") iValue = 0.42;
    else if (nextCurrent === "I") iValue = 0.22;
    else if (nextQueue[0] === "I" || nextQueue[1] === "I") iValue = 0.12;
  }

  return offset + shape + iValue;
}

export function wellReservationScore(
  board: Board,
  hold: TetrominoType | null,
  nextCurrent: TetrominoType | null,
  nextQueue: TetrominoType[],
): number {
  const heights = columnHeights(board);
  return wellReservationFromWell(findTetrisWell(board, heights), heights, hold, nextCurrent, nextQueue);
}

/** Covered adjacent empties — not just |h[i]-h[i+1]|. */
export function overhangCount(board: Board): number {
  let count = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y]![x] === 0) continue;
      for (const dx of [-1, 1]) {
        const nx = x + dx;
        if (nx < 0 || nx >= COLS) continue;
        if (board[y]![nx] !== 0) continue;
        const covered = y === 0 || board[y - 1]![nx] !== 0;
        if (covered) count += 1;
      }
    }
  }
  return count;
}

export function overhangScore(board: Board): number {
  return overhangCount(board) * -0.14;
}
