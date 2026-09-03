export const COLS = 10;
export const ROWS = 20;
export const CELL_SIZE = 30;
export const NEXT_QUEUE_SIZE = 5;

export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
export const TSPIN_SCORES = [400, 800, 1200, 1600] as const;
export const TSPIN_MINI_SCORES = [100, 200, 400, 500] as const;
export const COMBO_POINTS = 50;
export const PERFECT_CLEAR_POINTS = 2000;
export const B2B_MULTIPLIER = 1.5;
export const LINES_PER_LEVEL = 10;
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;

export function dropIntervalMs(level: number): number {
  return Math.max(80, Math.round(800 * Math.pow(0.82, Math.max(0, level - 1))));
}
