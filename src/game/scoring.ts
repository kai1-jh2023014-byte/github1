import { HARD_DROP_POINTS, LINE_SCORES, LINES_PER_LEVEL, SOFT_DROP_POINTS } from "./constants";

export function levelFromLines(totalLines: number): number {
  return Math.floor(totalLines / LINES_PER_LEVEL) + 1;
}

export function lineClearScore(cleared: number, level: number): number {
  const base = LINE_SCORES[cleared] ?? 0;
  return base * level;
}

export function softDropScore(cells: number): number {
  return cells * SOFT_DROP_POINTS;
}

export function hardDropScore(cells: number): number {
  return cells * HARD_DROP_POINTS;
}
