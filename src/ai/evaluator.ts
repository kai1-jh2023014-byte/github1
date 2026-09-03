import { columnHeights, occupiedCount } from "../game/board";
import { COLS, ROWS } from "../game/constants";
import type { Board, TetrominoType } from "../game/types";
import type { EvalFeatures, EvalWeights } from "./types";
import type { MechanicsWeights } from "./weights";

export function computeFeatures(board: Board, linesCleared: number): EvalFeatures {
  const heights = columnHeights(board);
  const aggregateHeight = heights.reduce((sum, h) => sum + h, 0);
  const maxHeight = heights.reduce((max, h) => Math.max(max, h), 0);
  let bumpiness = 0;
  for (let x = 0; x < COLS - 1; x++) {
    bumpiness += Math.abs(heights[x] - heights[x + 1]);
  }

  return {
    linesCleared,
    holes: countHoles(board, heights),
    aggregateHeight,
    bumpiness,
    maxHeight,
    wells: wellScore(heights),
    density: stackDensity(board, maxHeight),
    rowTransitions: rowTransitions(board),
    colTransitions: colTransitions(board),
  };
}

export function scoreFeatures(features: EvalFeatures, weights: EvalWeights): number {
  return (
    features.linesCleared * weights.linesCleared +
    features.holes * weights.holes +
    features.aggregateHeight * weights.aggregateHeight +
    features.bumpiness * weights.bumpiness +
    features.maxHeight * weights.maxHeight +
    features.wells * weights.wells +
    features.density * weights.density +
    features.rowTransitions * weights.rowTransitions +
    features.colTransitions * weights.colTransitions
  );
}

export function evaluateBoard(
  board: Board,
  linesCleared: number,
  weights: EvalWeights,
): { score: number; features: EvalFeatures } {
  const features = computeFeatures(board, linesCleared);
  return { score: scoreFeatures(features, weights), features };
}

export function mechanicsScore(input: {
  tSpin: "none" | "mini" | "full";
  linesCleared: number;
  comboAfter: number;
  backToBackAfter: boolean;
  perfectClear: boolean;
  holdType: TetrominoType | null;
  weights: MechanicsWeights;
}): number {
  const w = input.weights;
  let extra = 0;
  if (input.tSpin === "full") extra += w.tSpin * (1 + input.linesCleared);
  if (input.tSpin === "mini") extra += w.tSpinMini;
  extra += w.combo * input.comboAfter;
  extra += w.backToBack * (input.backToBackAfter ? 1 : 0);
  extra += w.perfectClear * (input.perfectClear ? 1 : 0);
  extra += w.holdI * (input.holdType === "I" ? 1 : 0);
  return extra;
}

function countHoles(board: Board, heights: number[]): number {
  let holes = 0;
  for (let x = 0; x < COLS; x++) {
    if (heights[x] === 0) continue;
    const top = ROWS - heights[x];
    for (let y = top + 1; y < ROWS; y++) {
      if (board[y][x] === 0) holes += 1;
    }
  }
  return holes;
}

function wellScore(heights: number[]): number {
  let total = 0;
  for (let x = 0; x < COLS; x++) {
    const left = x === 0 ? ROWS : heights[x - 1];
    const right = x === COLS - 1 ? ROWS : heights[x + 1];
    const depth = Math.min(left, right) - heights[x];
    if (depth > 0) total += (depth * (depth + 1)) / 2;
  }
  return total;
}

function stackDensity(board: Board, maxHeight: number): number {
  if (maxHeight === 0) return 1;
  const occupied = occupiedCount(board);
  return occupied / (COLS * maxHeight);
}

function rowTransitions(board: Board): number {
  let transitions = 0;
  for (let y = 0; y < ROWS; y++) {
    let prevFilled = true;
    for (let x = 0; x < COLS; x++) {
      const filled = board[y][x] !== 0;
      if (filled !== prevFilled) transitions += 1;
      prevFilled = filled;
    }
    if (!prevFilled) transitions += 1;
  }
  return transitions;
}

function colTransitions(board: Board): number {
  let transitions = 0;
  for (let x = 0; x < COLS; x++) {
    let prevFilled = false;
    for (let y = 0; y < ROWS; y++) {
      const filled = board[y][x] !== 0;
      if (filled !== prevFilled) transitions += 1;
      prevFilled = filled;
    }
    if (!prevFilled) transitions += 1;
  }
  return transitions;
}
