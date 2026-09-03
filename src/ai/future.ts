import { columnHeights } from "../game/board";
import { COLS, ROWS } from "../game/constants";
import type { Board } from "../game/types";
import { findTetrisWell } from "./structure";

/**
 * Experimental leaf terms. Not part of DEFAULT_WEIGHTS / 2-ply.
 * Each group is independently A/B'd in Phase 3.
 */
export interface FutureWeights {
  step1: number;
  step2: number;
  jagged: number;
  tSlot: number;
  almost9: number;
  almost8: number;
}

export const ZERO_FUTURE: FutureWeights = {
  step1: 0,
  step2: 0,
  jagged: 0,
  tSlot: 0,
  almost9: 0,
  almost8: 0,
};

export const SETUP_SMALL: FutureWeights = { ...ZERO_FUTURE, step1: 0.02, step2: 0.012, jagged: -0.04 };
export const SETUP_MEDIUM: FutureWeights = { ...ZERO_FUTURE, step1: 0.045, step2: 0.028, jagged: -0.09 };
export const SETUP_LARGE: FutureWeights = { ...ZERO_FUTURE, step1: 0.09, step2: 0.055, jagged: -0.18 };

export const TSPIN_SMALL: FutureWeights = { ...ZERO_FUTURE, tSlot: 0.06 };
export const TSPIN_MEDIUM: FutureWeights = { ...ZERO_FUTURE, tSlot: 0.14 };
export const TSPIN_LARGE: FutureWeights = { ...ZERO_FUTURE, tSlot: 0.28 };

export const CLEAR_SMALL: FutureWeights = { ...ZERO_FUTURE, almost9: 0.12, almost8: 0.04 };
export const CLEAR_MEDIUM: FutureWeights = { ...ZERO_FUTURE, almost9: 0.22, almost8: 0.07 };
export const CLEAR_LARGE: FutureWeights = { ...ZERO_FUTURE, almost9: 0.4, almost8: 0.14 };

export function mergeFutureWeights(...parts: FutureWeights[]): FutureWeights {
  const out = { ...ZERO_FUTURE };
  for (const part of parts) {
    out.step1 += part.step1;
    out.step2 += part.step2;
    out.jagged += part.jagged;
    out.tSlot += part.tSlot;
    out.almost9 += part.almost9;
    out.almost8 += part.almost8;
  }
  return out;
}

export interface FutureFeatures {
  step1: number;
  step2: number;
  jagged: number;
  tSlots: number;
  almost9: number;
  almost8: number;
}

export interface FutureActivations {
  setup: number;
  tspin: number;
  clear: number;
}

export function emptyActivations(): FutureActivations {
  return { setup: 0, tspin: 0, clear: 0 };
}

/**
 * Geometry-only future value. No move generation.
 * Tetris-well column is excluded so this does not restack well/I reservation.
 */
export function computeFutureFeatures(board: Board): FutureFeatures {
  const heights = columnHeights(board);
  const well = findTetrisWell(board);
  const wellCol = well?.col ?? -1;

  let step1 = 0;
  let step2 = 0;
  let jagged = 0;
  for (let x = 0; x < COLS - 1; x++) {
    const delta = Math.abs(heights[x]! - heights[x + 1]!);
    const wellEdge = x === wellCol || x + 1 === wellCol;
    if (delta === 1) step1 += 1;
    else if (delta === 2) step2 += 1;
    else if (delta >= 3 && !wellEdge) jagged += 1;
  }

  return {
    step1,
    step2,
    jagged,
    tSlots: countTSlots(board, heights, wellCol),
    ...countAlmostFull(board, wellCol),
  };
}

function countTSlots(board: Board, heights: number[], wellCol: number): number {
  let slots = 0;
  for (let x = 1; x <= 8; x++) {
    if (x === wellCol) continue;
    const dipLeft = heights[x - 1]! - heights[x]!;
    const dipRight = heights[x + 1]! - heights[x]!;
    if (dipLeft < 1 || dipRight < 1) continue;
    if (dipLeft > 2 || dipRight > 2) continue;
    const y = ROWS - heights[x]! - 1;
    if (y < 1 || y >= ROWS - 1) continue;
    if (board[y]![x] !== 0) continue;
    if (board[y]![x - 1] === 0 || board[y]![x + 1] === 0) continue;
    let corners = 0;
    if (occupiedOrWall(board, x - 1, y - 1)) corners += 1;
    if (occupiedOrWall(board, x + 1, y - 1)) corners += 1;
    if (occupiedOrWall(board, x - 1, y + 1)) corners += 1;
    if (occupiedOrWall(board, x + 1, y + 1)) corners += 1;
    if (corners >= 3) slots += 1;
  }
  return slots;
}

function occupiedOrWall(board: Board, x: number, y: number): boolean {
  if (x < 0 || x >= COLS || y >= ROWS) return true;
  if (y < 0) return false;
  return board[y]![x] !== 0;
}

function countAlmostFull(board: Board, wellCol: number): { almost9: number; almost8: number } {
  let almost9 = 0;
  let almost8 = 0;
  for (let y = 0; y < ROWS; y++) {
    let filled = 0;
    let emptyCol = -1;
    let empties = 0;
    for (let x = 0; x < COLS; x++) {
      if (board[y]![x] !== 0) filled += 1;
      else {
        empties += 1;
        emptyCol = x;
      }
    }
    if (filled === 9 && empties === 1) {
      if (emptyCol === wellCol) continue;
      almost9 += 1;
    } else if (filled === 8) {
      almost8 += 1;
    }
  }
  return { almost9, almost8 };
}

export function scoreFuture(
  features: FutureFeatures,
  weights: FutureWeights,
  enabled: { setup: boolean; tspin: boolean; clear: boolean },
): { score: number; activations: FutureActivations } {
  let score = 0;
  const activations = emptyActivations();
  if (enabled.setup) {
    const setup =
      weights.step1 * Math.min(6, features.step1) +
      weights.step2 * Math.min(5, features.step2) +
      weights.jagged * Math.min(4, features.jagged);
    score += setup;
    if (features.step1 >= 2 || features.jagged > 0) activations.setup = 1;
  }
  if (enabled.tspin) {
    const t = weights.tSlot * Math.min(2, features.tSlots);
    score += t;
    if (features.tSlots > 0) activations.tspin = 1;
  }
  if (enabled.clear) {
    const c = weights.almost9 * Math.min(3, features.almost9) + weights.almost8 * Math.min(4, features.almost8);
    score += c;
    if (features.almost9 > 0 || features.almost8 > 0) activations.clear = 1;
  }
  return { score, activations };
}
