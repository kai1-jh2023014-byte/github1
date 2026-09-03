import { columnHeights } from "../game/board";
import { generateMovesWithSpins } from "../ai/moveGenerator";
import { detectTSpin } from "../core/mechanics/tspin";
import type { Board } from "../game/types";

export interface WellInfo {
  col: number;
  depth: number;
}

export function deepestWell(board: Board): WellInfo {
  const heights = columnHeights(board);
  let best: WellInfo = { col: 9, depth: 0 };
  for (let x = 0; x < 10; x++) {
    const left = x === 0 ? 20 : heights[x - 1];
    const right = x === 9 ? 20 : heights[x + 1];
    const depth = Math.min(left, right) - heights[x];
    if (depth > best.depth) best = { col: x, depth };
  }
  return best;
}

export function tSpinReadyCount(board: Board): { full: number; mini: number } {
  let full = 0;
  let mini = 0;
  for (const move of generateMovesWithSpins(board, "T")) {
    const kind = detectTSpin(board, move.piece, Boolean(move.placement.spinPre));
    if (kind === "full") full += 1;
    if (kind === "mini") mini += 1;
  }
  return { full, mini };
}

export function filledWellColumn(
  before: Board,
  after: Board,
  well: WellInfo,
): boolean {
  if (well.depth < 3) return false;
  const heightsBefore = columnHeights(before);
  const heightsAfter = columnHeights(after);
  return heightsAfter[well.col] > heightsBefore[well.col];
}

export function boardSketch(board: Board, rows = 8): string {
  const lines: string[] = [];
  for (let y = 20 - rows; y < 20; y++) {
    let row = "";
    for (let x = 0; x < 10; x++) row += board[y][x] ? "#" : ".";
    lines.push(row);
  }
  return lines.join("\n");
}
