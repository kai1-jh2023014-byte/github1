import { TETROMINO_COLORS } from "../game/tetrominoes";
import type { TetrominoType } from "../game/types";

export const BOARD_BG: [number, number, number] = [7, 11, 20];

export const PIECE_RGB: Record<TetrominoType, [number, number, number]> = {
  I: hexToRgb(TETROMINO_COLORS.I),
  O: hexToRgb(TETROMINO_COLORS.O),
  T: hexToRgb(TETROMINO_COLORS.T),
  S: hexToRgb(TETROMINO_COLORS.S),
  Z: hexToRgb(TETROMINO_COLORS.Z),
  J: hexToRgb(TETROMINO_COLORS.J),
  L: hexToRgb(TETROMINO_COLORS.L),
};

export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function colorDistance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
