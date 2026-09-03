import { CELL_SIZE, COLS, ROWS } from "../game/constants";
import { createBoard } from "../game/board";
import type { Board, Cell, TetrominoType } from "../game/types";
import { TETROMINO_TYPES } from "../game/types";
import { BOARD_BG, PIECE_RGB, colorDistance } from "../vision/colors";
import { splitActivePiece } from "../vision/detect";
import type { PixelBuffer } from "../vision/render";
import type { TetrisGameState } from "../core/state";
import type { Confidence } from "./types";

export interface FrameDetection {
  state: TetrisGameState;
  confidence: Confidence;
  origin: { x: number; y: number; cell: number };
}

export function detectNativeBoard(buffer: PixelBuffer): FrameDetection | null {
  if (buffer.width === COLS * CELL_SIZE && buffer.height === ROWS * CELL_SIZE) {
    return detectAt(buffer, 0, 0, CELL_SIZE);
  }
  const located = locateGrid(buffer);
  if (!located) {
    return {
      state: {
        board: createBoard(),
        current: null,
        nextPieces: [],
        holdPiece: null,
        canHold: false,
        combo: 0,
        backToBack: false,
        phase: "playing",
      },
      confidence: { board: 0, current: 0, next: 0, hold: 0, action: 0 },
      origin: { x: 0, y: 0, cell: CELL_SIZE },
    };
  }
  return detectAt(buffer, located.x, located.y, located.cell);
}

function detectAt(
  buffer: PixelBuffer,
  originX: number,
  originY: number,
  cell: number,
): FrameDetection {
  const visible = createBoard();
  let confident = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const { cell: value, conf } = classifyCell(buffer, originX, originY, cell, x, y);
      visible[y][x] = value;
      confident += conf;
    }
  }
  const split = splitActivePiece(visible);
  const boardConf = confident / (ROWS * COLS);
  const currentConf = split.current ? Math.min(1, boardConf + 0.05) : boardConf * 0.5;
  return {
    origin: { x: originX, y: originY, cell },
    confidence: {
      board: boardConf,
      current: currentConf,
      next: 0,
      hold: 0,
      action: 0,
    },
    state: {
      board: split.board,
      current: split.current,
      nextPieces: [],
      holdPiece: null,
      canHold: split.current !== null,
      combo: 0,
      backToBack: false,
      phase: "playing",
    },
  };
}

function classifyCell(
  buffer: PixelBuffer,
  originX: number,
  originY: number,
  cell: number,
  col: number,
  row: number,
): { cell: Cell; conf: number } {
  const rgb = sample(buffer, originX + (col + 0.5) * cell, originY + (row + 0.62) * cell);
  const bg = colorDistance(rgb, BOARD_BG);
  if (bg < 28) return { cell: 0, conf: Math.max(0, 1 - bg / 28) };
  let best: TetrominoType = "I";
  let bestDist = Infinity;
  for (const type of TETROMINO_TYPES) {
    const dist = colorDistance(rgb, PIECE_RGB[type]);
    if (dist < bestDist) {
      bestDist = dist;
      best = type;
    }
  }
  if (bestDist >= 90) return { cell: 0, conf: 0.2 };
  return { cell: best, conf: Math.max(0.4, 1 - bestDist / 90) };
}

function sample(buffer: PixelBuffer, cx: number, cy: number): [number, number, number] {
  const x = Math.max(0, Math.min(buffer.width - 1, Math.floor(cx)));
  const y = Math.max(0, Math.min(buffer.height - 1, Math.floor(cy)));
  const i = (y * buffer.width + x) * 4;
  return [buffer.data[i], buffer.data[i + 1], buffer.data[i + 2]];
}

function locateGrid(
  buffer: PixelBuffer,
): { x: number; y: number; cell: number } | null {
  let best: { x: number; y: number; cell: number; score: number } | null = null;
  for (let cell = 12; cell <= 36; cell += 2) {
    const w = cell * COLS;
    const h = cell * ROWS;
    if (w + 8 > buffer.width || h + 8 > buffer.height) continue;
    const maxX = buffer.width - w;
    const maxY = buffer.height - h;
    const step = Math.max(4, Math.floor(cell / 2));
    for (let y = 0; y <= maxY; y += step) {
      for (let x = 0; x <= maxX; x += step) {
        const score = gridScore(buffer, x, y, cell);
        if (!best || score > best.score) best = { x, y, cell, score };
      }
    }
  }
  if (!best || best.score < 0.15) return null;
  return { x: best.x, y: best.y, cell: best.cell };
}

function gridScore(buffer: PixelBuffer, x: number, y: number, cell: number): number {
  let filled = 0;
  let empty = 0;
  for (let row = 0; row < ROWS; row += 2) {
    for (let col = 0; col < COLS; col += 2) {
      const rgb = sample(buffer, x + (col + 0.5) * cell, y + (row + 0.6) * cell);
      if (colorDistance(rgb, BOARD_BG) < 36) empty += 1;
      else filled += 1;
    }
  }
  const total = filled + empty;
  if (total === 0) return 0;
  return filled / total;
}

export function occupancyKey(board: Board): string {
  let key = "";
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) key += board[y][x] ? "1" : "0";
  }
  return key;
}
