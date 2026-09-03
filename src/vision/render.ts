import { CELL_SIZE, COLS, ROWS } from "../game/constants";
import { pieceCells } from "../game/piece";
import type { ActivePiece, Board } from "../game/types";
import { BOARD_BG, hexToRgb } from "./colors";
import { TETROMINO_COLORS } from "../game/tetrominoes";

export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export const FRAME_WIDTH = COLS * CELL_SIZE;
export const FRAME_HEIGHT = ROWS * CELL_SIZE;

export function createBuffer(width = FRAME_WIDTH, height = FRAME_HEIGHT): PixelBuffer {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function renderFrame(
  board: Board,
  current: ActivePiece | null = null,
  ghost: ActivePiece | null = null,
): PixelBuffer {
  const buffer = createBuffer();
  fillRect(buffer, 0, 0, buffer.width, buffer.height, BOARD_BG, 1);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      strokeRect(
        buffer,
        x * CELL_SIZE,
        y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
        [90, 140, 255],
        0.08,
      );
    }
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = board[y][x];
      if (cell) drawCell(buffer, x, y, hexToRgb(TETROMINO_COLORS[cell]), 1, false);
    }
  }

  if (ghost && current) {
    for (const cell of pieceCells(ghost)) {
      if (cell.y < 0) continue;
      drawCell(buffer, cell.x, cell.y, hexToRgb(TETROMINO_COLORS[current.type]), 0.18, true);
    }
  }

  if (current) {
    for (const cell of pieceCells(current)) {
      if (cell.y < 0) continue;
      drawCell(buffer, cell.x, cell.y, hexToRgb(TETROMINO_COLORS[current.type]), 1, false);
    }
  }

  return buffer;
}

export function drawCell(
  buffer: PixelBuffer,
  x: number,
  y: number,
  color: [number, number, number],
  alpha: number,
  outline: boolean,
): void {
  const pad = 2;
  const px = x * CELL_SIZE + pad;
  const py = y * CELL_SIZE + pad;
  const size = CELL_SIZE - pad * 2;
  if (outline) {
    strokeRect(buffer, px, py, size, size, color, alpha);
    return;
  }
  fillRect(buffer, px, py, size, size, color, alpha);
  fillRect(buffer, px + 3, py + 3, size * 0.45, 7, [255, 255, 255], alpha * 0.28);
  fillRect(buffer, px + 4, py + size - 9, size - 8, 5, [0, 0, 0], alpha * 0.22);
}

export function imageDataToBuffer(image: {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}): PixelBuffer {
  return { width: image.width, height: image.height, data: image.data };
}

function fillRect(
  buffer: PixelBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  color: [number, number, number],
  alpha: number,
): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(buffer.width, Math.ceil(x + w));
  const y1 = Math.min(buffer.height, Math.ceil(y + h));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      blendPixel(buffer, px, py, color, alpha);
    }
  }
}

function strokeRect(
  buffer: PixelBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  color: [number, number, number],
  alpha: number,
): void {
  fillRect(buffer, x, y, w, 1, color, alpha);
  fillRect(buffer, x, y + h - 1, w, 1, color, alpha);
  fillRect(buffer, x, y, 1, h, color, alpha);
  fillRect(buffer, x + w - 1, y, 1, h, color, alpha);
}

function blendPixel(
  buffer: PixelBuffer,
  x: number,
  y: number,
  color: [number, number, number],
  alpha: number,
): void {
  const i = (y * buffer.width + x) * 4;
  const inv = 1 - alpha;
  buffer.data[i] = color[0] * alpha + buffer.data[i] * inv;
  buffer.data[i + 1] = color[1] * alpha + buffer.data[i + 1] * inv;
  buffer.data[i + 2] = color[2] * alpha + buffer.data[i + 2] * inv;
  buffer.data[i + 3] = 255;
}
